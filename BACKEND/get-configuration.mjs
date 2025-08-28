import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "Configurations";

export const handler = async (event) => {
  try {
    const year = event.pathParameters.year; // URLから年を取得 (例: "2025")

    const { Item } = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { configYear: year },
    }));

    if (!Item) {
      return { statusCode: 404, body: JSON.stringify({ message: "Configuration not found for the year." }) };
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify(Item), // DBから取得した設定オブジェクトをそのまま返す
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ message: "Failed to get configuration." }) };
  }
};
