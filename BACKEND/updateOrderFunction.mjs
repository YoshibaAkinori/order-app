import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, DeleteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

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

    // --- ルート判別ロジック ---
    const allCancelMatch = path.match(/^\/orders\/([^\/]+)\/cancel$/);
    if (httpMethod === 'POST' && allCancelMatch) {
      const [, receptionNumber] = allCancelMatch;
      return await handleCancelAll(receptionNumber);
    }

    const updateMatch = path.match(/^\/orders\/([^\/]+)$/);
    if (httpMethod === 'PUT' && updateMatch) {
      if (!event.body) { throw new Error("更新リクエストにはbodyが必要です。"); }
      const data = JSON.parse(event.body);
      return await handleUpdateOrder(data);
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
const handleCancelAll = async (receptionNumber) => {
  // ★ 1. 削除する前に、ログに残すための注文データを全て取得
  const { Items: allDetails } = await docClient.send(new QueryCommand({
    TableName: "OrderDetails",
    KeyConditionExpression: "receptionNumber = :rn",
    ExpressionAttributeValues: { ":rn": receptionNumber },
  }));
  const { Item: orderHeader } = await docClient.send(new GetCommand({
    TableName: "Orders",
    Key: { receptionNumber },
  }));

  // 2. 関連するすべてのOrderDetailを削除
  if (allDetails && allDetails.length > 0) {
    const deletePromises = allDetails.map(item =>
      docClient.send(new DeleteCommand({
        TableName: "OrderDetails",
        Key: { receptionNumber: item.receptionNumber, orderId: item.orderId }
      }))
    );
    await Promise.all(deletePromises);
  }

  // 3. Ordersヘッダーをキャンセル済みに更新
  await docClient.send(new UpdateCommand({
    TableName: "Orders", Key: { receptionNumber },
    UpdateExpression: "SET orderStatus = :status, updatedAt = :ts",
    ExpressionAttributeValues: { ":status": "CANCELED", ":ts": new Date().toISOString() }
  }));
  
  // ★ 4. ログを作成して保存
  const logItem = {
    logId: `${receptionNumber}-CANCEL-ALL-${new Date().toISOString()}`,
    timestamp: new Date().toISOString(),
    receptionNumber: receptionNumber,
    action: "CANCEL_ALL",
    // キャンセルされた全ての注文情報を記録
    canceledOrders: (allDetails || []).map(detail => ({
      注文番号: detail.orderId,
      部署名: orderHeader?.customerInfo?.department || 'N/A',
      お届け日時: `${detail.deliveryDate || ''} ${detail.deliveryTime || ''}`.trim(),
      注文内容: (detail.orderItems || [])
        .filter(item => (item.quantity || 0) > 0)
        .map(item => `${item.name}(${item.quantity})`)
        .join(', ')
    }))
  };
  await docClient.send(new PutCommand({ TableName: "OrderChangeLogs", Item: logItem }));

  return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*"}, body: JSON.stringify({ message: "注文が正常にキャンセルされました" }) };
};

// =============================================================
// ★ 通常の注文更新処理
// =============================================================
const handleUpdateOrder = async (data) => {
  const finalData = sanitizeData(data);
  const { 
    selectedYear, customer, orders, receptionNumber, allocationNumber, 
    paymentGroups, receipts, orderType, globalNotes
  } = finalData;

  const { Item: oldOrderHeader } = await docClient.send(new GetCommand({ TableName: "Orders", Key: { receptionNumber: receptionNumber }}));
  const { Items: oldOrderDetails } = await docClient.send(new QueryCommand({ TableName: "OrderDetails", KeyConditionExpression: "receptionNumber = :rn", ExpressionAttributeValues: { ":rn": receptionNumber }}));
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
  await docClient.send(new PutCommand({ TableName: "OrderChangeLogs", Item: logItem }));

  const grandTotal = calculateGrandTotal(activeOrdersOnly, sideMenusMaster);
  const orderHeaderItem = {
    receptionNumber, allocationNumber, customerInfo: customer, paymentGroups: transformedPaymentGroups, receipts, grandTotal,
    submittedAt: timestamp, orderType: orderType || '変更', orderStatus: 'ACTIVE', selectedYear, globalNotes: globalNotes || null,
  };
  await docClient.send(new PutCommand({ TableName: "Orders", Item: orderHeaderItem }));

  if (oldOrderDetails && oldOrderDetails.length > 0) {
    const deletePromises = oldOrderDetails.map(item => docClient.send(new DeleteCommand({ TableName: "OrderDetails", Key: { receptionNumber: item.receptionNumber, orderId: item.orderId }})));
    await Promise.all(deletePromises);
  }

  await Promise.all(activeOrdersOnly.map(async (order, index) => {
    const orderDetailItem = {
      receptionNumber, orderId: order.orderId, sequence: order.sequence || index + 1,
      deliveryDate: order.orderDate, deliveryTime: order.orderTime, deliveryAddress: order.deliveryAddress,
      deliveryMethod: order.deliveryMethod, isSameAddress: order.isSameAddress, orderItems: order.orderItems,
      sideOrders: order.sideOrders, netaChanges: order.netaChanges, orderStatus: 'ACTIVE',
      orderTotal: calculateOrderTotal(order, sideMenusMaster),
    };
    await docClient.send(new PutCommand({ TableName: "OrderDetails", Item: orderDetailItem }));
  }));

  return {
    statusCode: 200,
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" },
    body: JSON.stringify({ message: "注文が正常に更新されました" }),
  };
};