import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "Configurations";

export const handler = async (event) => {
  try {
    const year = event.pathParameters.year;
    const configData = JSON.parse(event.body);

    // 送られてきたデータに `configYear` が含まれていることを確認
    configData.configYear = year;

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: configData, // フロントから送られてきたオブジェクトで丸ごと上書き
    }));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Configuration updated successfully." }),
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ message: "Failed to update configuration." }) };
  }
};