import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid'; // ★★★ uuidライブラリをインポート ★★★

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// ... sanitizeData, calculateOrderTotal, calculateGrandTotal 関数は変更なし ...
const sanitizeData = (data) => {
  if (data === "" || data === undefined || data === null) {
    return null;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }
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


export const handler = async (event) => {
  try {
    const originalData = JSON.parse(event.body);
    const finalData = sanitizeData(originalData);

    const { 
      selectedYear,
      customer, orders, receptionNumber, allocationNumber, 
      paymentGroups, receipts, orderType, globalNotes
    } = finalData;

    if (!selectedYear) {
      throw new Error("The selected year is missing from the request.");
    }
    
    // ★★★ ここから修正: 各注文に不変の internalId を付与 ★★★
    orders.forEach(order => {
      // 新規作成なので、常に新しいIDを生成して付与する
      order.internalId = uuidv4();
    });
    // ★★★ 修正ここまで ★★★

    const { Item: currentConfig } = await docClient.send(new GetCommand({
      TableName: "Configurations",
      Key: { configYear: selectedYear },
    }));

    if (!currentConfig || !currentConfig.specialMenus) {
      throw new Error(`Configuration for year ${selectedYear} or sideMenus not found.`);
    }
    const sideMenusMaster = currentConfig.specialMenus;

    const orderIdMap = {};
    orders.forEach(order => {
      orderIdMap[order.id] = order.orderId;
    });
    const transformedPaymentGroups = paymentGroups.map(group => {
      const newCheckedOrderIds = {};
      for (const tempId in group.checkedOrderIds) {
        const finalOrderId = orderIdMap[tempId];
        if (finalOrderId) { newCheckedOrderIds[finalOrderId] = true; }
      }
      return { ...group, checkedOrderIds: newCheckedOrderIds };
    });

    const grandTotal = calculateGrandTotal(orders, sideMenusMaster); 
    const orderHeaderItem = {
      receptionNumber: receptionNumber,
      allocationNumber: allocationNumber,
      orderType: orderType || '新規注文',
      customerInfo: customer,
      paymentGroups: transformedPaymentGroups,
      receipts: receipts,
      grandTotal: grandTotal,
      submittedAt: new Date().toISOString(),
      selectedYear: selectedYear,
      globalNotes: globalNotes || null,
    };
    await docClient.send(new PutCommand({ TableName: "Orders", Item: orderHeaderItem }));

    await Promise.all(orders.map(async (order, index) => {
      const orderDetailItem = {
        receptionNumber: receptionNumber,
        orderId: order.orderId,
        internalId: order.internalId, // ★★★ 追加: 生成したIDをDBに保存 ★★★
        sequence: index + 1,
        deliveryDate: order.orderDate,
        deliveryTime: order.orderTime,
        deliveryAddress: order.deliveryAddress,
        deliveryMethod: order.deliveryMethod,
        orderItems: order.orderItems,
        sideOrders: order.sideOrders,
        netaChanges: order.netaChanges,
        isSameAddress: order.isSameAddress,
        orderTotal: calculateOrderTotal(order, sideMenusMaster),
      };
      await docClient.send(new PutCommand({ TableName: "OrderDetails", Item: orderDetailItem }));
    }));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" },
      body: JSON.stringify({ message: "注文が正常に保存されました" }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "注文の保存中にエラーが発生しました", error: error.message }),
    };
  }
};