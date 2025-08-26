import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  const receptionNumber = event.pathParameters.receptionNumber;

  if (!receptionNumber) {
    return { statusCode: 400, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: "受付番号は必須です。" }) };
  }

  try {
    // --- 1. Ordersテーブルから共通情報を取得 ---
    const { Item: orderHeader } = await docClient.send(new GetCommand({
      TableName: "Orders",
      Key: { receptionNumber: receptionNumber },
    }));

    if (!orderHeader) {
      return { statusCode: 404, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: "注文が見つかりません。" }) };
    }

    // --- 2. OrderDetailsテーブルから関連する全注文明細を取得 ---
    const { Items: orderDetails } = await docClient.send(new QueryCommand({
      TableName: "OrderDetails",
      KeyConditionExpression: "receptionNumber = :rn",
      ExpressionAttributeValues: { ":rn": receptionNumber },
    }));

    // --- 3. フロントエンドが扱いやすい形にデータを再構築 ---
    const responseData = {
      receptionNumber: orderHeader.receptionNumber,
      allocationNumber: orderHeader.allocationNumber,
      customerInfo: orderHeader.customerInfo, 
      paymentGroups: orderHeader.paymentGroups || [],
      receipts: orderHeader.receipts || [],
      orderType: orderHeader.orderType || '不明',
      orders: orderDetails.map(detail => ({
        internalId: detail.internalId, // ★★★ ここでinternalIdをレスポンスに含める ★★★
        id: detail.orderId,
        orderId: detail.orderId, 
        sequence: detail.sequence,
        orderDate: detail.deliveryDate,
        orderTime: detail.deliveryTime,
        deliveryAddress: detail.deliveryAddress,
        deliveryMethod: detail.deliveryMethod,
        isSameAddress: detail.isSameAddress,
        orderItems: detail.orderItems || [],
        sideOrders: detail.sideOrders || [],
        netaChanges: detail.netaChanges || {},
        hasNetaChange: !!(detail.netaChanges && Object.keys(detail.netaChanges).length > 0),
      })),
    };

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(responseData),
    };

  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "注文データの取得中にエラーが発生しました。" }),
    };
  }
};