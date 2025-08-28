import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// ★★★ ここからが変更点 ★★★
// テーブル名を動的に解決するためのヘルパー関数
const TABLE_SUFFIXES = ['A', 'B', 'C'];
const getTableSuffix = (year) => {
    const numericYear = parseInt(year, 10);
    // 2024年を基準点 'C' とする
    const startYear = 2022;
    const index = (numericYear - startYear) % TABLE_SUFFIXES.length;
    // 基準年より前の場合など、indexが負になるケースを考慮
    const finalIndex = (index + TABLE_SUFFIXES.length) % TABLE_SUFFIXES.length;
    return TABLE_SUFFIXES[finalIndex];
};
// ★★★ 変更ここまで ★★★

export const handler = async (event) => {
  const receptionNumber = event.pathParameters.receptionNumber;
  
  // ★★★ 変更点: クエリパラメータから年を取得 ★★★
  const year = event.queryStringParameters?.year;

  if (!receptionNumber || !year) {
    return { statusCode: 400, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: "受付番号と年は必須です。" }) };
  }

  // ★★★ 変更点: テーブル名を動的に生成 ★★★
  const tableSuffix = getTableSuffix(year);
  const ORDERS_TABLE = `Orders-${tableSuffix}`;
  const ORDER_DETAILS_TABLE = `OrderDetails-${tableSuffix}`;

  try {
    // --- 1. Ordersテーブルから共通情報を取得 ---
    const { Item: orderHeader } = await docClient.send(new GetCommand({
      TableName: ORDERS_TABLE, // ★★★ 変更点 ★★★
      Key: { receptionNumber: receptionNumber },
    }));

    if (!orderHeader) {
      return { statusCode: 404, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: "注文が見つかりません。" }) };
    }

    // --- 2. OrderDetailsテーブルから関連する全注文明細を取得 ---
    const { Items: orderDetails } = await docClient.send(new QueryCommand({
      TableName: ORDER_DETAILS_TABLE, // ★★★ 変更点 ★★★
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
        internalId: detail.internalId,
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