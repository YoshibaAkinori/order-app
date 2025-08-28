import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, DeleteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// ★★★ ここからが変更点 ★★★
// テーブル名を動的に解決するためのヘルパー関数
const TABLE_SUFFIXES = ['A', 'B', 'C'];
const getTableSuffix = (year) => {
    const numericYear = parseInt(year, 10);
    // 2024年を基準点 'C' とする (2024 % 3 = 0 にならないため、基準年からの差分で計算)
    const startYear = 2022; 
    const index = (numericYear - startYear) % TABLE_SUFFIXES.length;
    // 基準年より前の場合など、indexが負になるケースを考慮
    const finalIndex = (index + TABLE_SUFFIXES.length) % TABLE_SUFFIXES.length;
    return TABLE_SUFFIXES[finalIndex];
};
// ★★★ 変更ここまで ★★★

// --- ユーティリティ関数 (変更なし) ---
const sanitizeData = (data) => {
  if (data === "" || data === undefined || data === null) { return null; }
  if (Array.isArray(data)) { return data.map(item => sanitizeData(item)); }
  if (typeof data === 'object' && data.constructor === Object) {
    const sanitizedObject = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        sanitizedObject[key] = sanitizeData(data[key]);
      }
    }
    return sanitizedObject;
  }
  return data;
};
const calculateOrderTotal = (order, sideMenusMaster) => {
  const mainTotal = (order.orderItems || []).reduce((total, item) => total + ((parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity) || 0)), 0);
  const sideTotal = (order.sideOrders || []).reduce((total, item) => {
    const price = sideMenusMaster[item.productKey]?.price || 0;
    return total + (price * (parseInt(item.quantity) || 0));
  }, 0);
  return mainTotal + sideTotal;
};
const calculateGrandTotal = (orders, sideMenusMaster) => {
  return orders.reduce((total, order) => total + calculateOrderTotal(order, sideMenusMaster), 0);
};

// =============================================================
// メインハンドラ
// =============================================================
export const handler = async (event) => {
  try {
    const httpMethod = event.requestContext?.http?.method || event.httpMethod;
    const path = event.requestContext?.http?.path || event.path;
    if (!path) { throw new Error("リクエストパスを特定できませんでした。"); }
    
    // ★★★ 変更点: bodyから年を取得 ★★★
    const body = event.body ? JSON.parse(event.body) : {};
    const year = body.selectedYear;

    const allCancelMatch = path.match(/^\/orders\/([^\/]+)\/cancel$/);
    if (httpMethod === 'POST' && allCancelMatch) {
      const [, receptionNumber] = allCancelMatch;
      // ★★★ handleCancelAllに年を渡す ★★★
      return await handleCancelAll(receptionNumber, year);
    }

    const updateMatch = path.match(/^\/orders\/([^\/]+)$/);
    if (httpMethod === 'PUT' && updateMatch) {
      if (!event.body) { throw new Error("更新リクエストにはbodyが必要です。"); }
      return await handleUpdateOrder(body);
    }
    
    throw new Error(`未対応のルートまたはメソッドです: ${httpMethod} ${path}`);

  } catch (error) {
    console.error("Handler Error:", error);
    return { statusCode: 500, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: "処理中にエラーが発生しました", error: error.message }) };
  }
};

// =============================================================
// 受付全体のキャンセル処理
// =============================================================
// ★★★ 引数にyearを追加 ★★★
const handleCancelAll = async (receptionNumber, year) => {
  if (!year) {
    throw new Error("キャンセル処理には年度(year)の指定が必要です。");
  }
  // ★★★ 変更点: テーブル名を動的に生成 ★★★
  const tableSuffix = getTableSuffix(year);
  const ORDERS_TABLE = `Orders-${tableSuffix}`;
  const ORDER_DETAILS_TABLE = `OrderDetails-${tableSuffix}`;
  const ORDER_LOG_TABLE = `OrderChangeLogs-${tableSuffix}`;

  const { Items: allDetails } = await docClient.send(new QueryCommand({
    TableName: ORDER_DETAILS_TABLE, KeyConditionExpression: "receptionNumber = :rn", ExpressionAttributeValues: { ":rn": receptionNumber },
  }));
  const { Item: orderHeader } = await docClient.send(new GetCommand({ TableName: ORDERS_TABLE, Key: { receptionNumber } }));

  if (allDetails && allDetails.length > 0) {
    const deletePromises = allDetails.map(item => docClient.send(new DeleteCommand({ TableName: ORDER_DETAILS_TABLE, Key: { receptionNumber: item.receptionNumber, orderId: item.orderId } })));
    await Promise.all(deletePromises);
  }

  await docClient.send(new UpdateCommand({
    TableName: ORDERS_TABLE, Key: { receptionNumber }, UpdateExpression: "SET orderStatus = :status, updatedAt = :ts", ExpressionAttributeValues: { ":status": "CANCELED", ":ts": new Date().toISOString() }
  }));
  
  const logItem = {
    logId: `${receptionNumber}-CANCEL-ALL-${new Date().toISOString()}`,
    timestamp: new Date().toISOString(),
    receptionNumber: receptionNumber,
    action: "CANCEL_ALL",
    canceledOrders: (allDetails || []).map(detail => ({
      internalId: detail.internalId,
      注文番号: detail.orderId,
      部署名: orderHeader?.customerInfo?.department || 'N/A',
      お届け日時: `${detail.deliveryDate || ''} ${detail.deliveryTime || ''}`.trim(),
      注文内容: (detail.orderItems || []).filter(item => (item.quantity || 0) > 0).map(item => `${item.name}(${item.quantity})`).join(', ')
    }))
  };
  await docClient.send(new PutCommand({ TableName: ORDER_LOG_TABLE, Item: logItem }));

  return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*"}, body: JSON.stringify({ message: "注文が正常にキャンセルされました" }) };
};

// =============================================================
// 通常の注文更新処理
// =============================================================
const handleUpdateOrder = async (data) => {
  const finalData = sanitizeData(data);
  const { 
    selectedYear, customer, orders, receptionNumber, allocationNumber, 
    paymentGroups, receipts, orderType, globalNotes
  } = finalData;

  if (!selectedYear) {
    throw new Error("更新処理には年度(selectedYear)の指定が必要です。");
  }
  // ★★★ 変更点: テーブル名を動的に生成 ★★★
  const tableSuffix = getTableSuffix(selectedYear);
  const ORDERS_TABLE = `Orders-${tableSuffix}`;
  const ORDER_DETAILS_TABLE = `OrderDetails-${tableSuffix}`;
  const ORDER_LOG_TABLE = `OrderChangeLogs-${tableSuffix}`;
  
  orders.forEach(order => {
    if (!order.internalId) {
      order.internalId = uuidv4();
    }
  });

  const { Item: oldOrderHeader } = await docClient.send(new GetCommand({ TableName: ORDERS_TABLE, Key: { receptionNumber: receptionNumber }}));
  const { Items: oldOrderDetails } = await docClient.send(new QueryCommand({ TableName: ORDER_DETAILS_TABLE, KeyConditionExpression: "receptionNumber = :rn", ExpressionAttributeValues: { ":rn": receptionNumber }}));
  const beforeData = { ...oldOrderHeader, orders: oldOrderDetails };

  const { Item: currentConfig } = await docClient.send(new GetCommand({ TableName: "Configurations", Key: { configYear: selectedYear }}));
  if (!currentConfig || !currentConfig.specialMenus) { throw new Error(`Configuration for year ${selectedYear} not found.`); }
  const sideMenusMaster = currentConfig.specialMenus;

  const activeOrdersOnly = orders.filter(o => o.orderStatus !== 'CANCELED');
  const orderIdMap = {};
  activeOrdersOnly.forEach(order => { orderIdMap[order.id] = order.orderId; });

  const transformedPaymentGroups = paymentGroups.map(group => {
    const newCheckedOrderIds = {};
    for (const tempId in group.checkedOrderIds) {
      const finalOrderId = orderIdMap[tempId];
      if (finalOrderId) { newCheckedOrderIds[finalOrderId] = true; }
    }
    return { ...group, checkedOrderIds: newCheckedOrderIds };
  });

  const timestamp = new Date().toISOString();
  const processedNewData = { ...finalData, orders: activeOrdersOnly, paymentGroups: transformedPaymentGroups };
  const logItem = {
    logId: `${receptionNumber}-${timestamp}`, timestamp, receptionNumber, beforeData, afterData: processedNewData,
  };
  await docClient.send(new PutCommand({ TableName: ORDER_LOG_TABLE, Item: logItem }));

  const grandTotal = calculateGrandTotal(activeOrdersOnly, sideMenusMaster);
  const orderHeaderItem = {
    receptionNumber, allocationNumber, customerInfo: customer, paymentGroups: transformedPaymentGroups, receipts, grandTotal,
    submittedAt: timestamp, orderType: orderType || '変更', orderStatus: 'ACTIVE', selectedYear, globalNotes: globalNotes || null,
  };
  await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: orderHeaderItem }));

  if (oldOrderDetails && oldOrderDetails.length > 0) {
    const deletePromises = oldOrderDetails.map(item => docClient.send(new DeleteCommand({ TableName: ORDER_DETAILS_TABLE, Key: { receptionNumber: item.receptionNumber, orderId: item.orderId }})));
    await Promise.all(deletePromises);
  }

  await Promise.all(activeOrdersOnly.map(async (order, index) => {
    const orderDetailItem = {
      receptionNumber,
      orderId: order.orderId,
      internalId: order.internalId,
      sequence: order.sequence || index + 1,
      deliveryDate: order.orderDate,
      deliveryTime: order.orderTime,
      deliveryAddress: order.deliveryAddress,
      deliveryMethod: order.deliveryMethod,
      isSameAddress: order.isSameAddress,
      orderItems: order.orderItems,
      sideOrders: order.sideOrders,
      netaChanges: order.netaChanges,
      orderStatus: 'ACTIVE',
      orderTotal: calculateOrderTotal(order, sideMenusMaster),
    };
    await docClient.send(new PutCommand({ TableName: ORDER_DETAILS_TABLE, Item: orderDetailItem }));
  }));

  return {
    statusCode: 200,
    headers: { "Access-control-allow-origin": "*", "access-control-allow-headers": "Content-Type" },
    body: JSON.stringify({ message: "注文が正常に更新されました" }),
  };
};