import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// アルファベットのサフィックスをインクリメントするヘルパー関数 (例: Z -> AA, AZ -> BA)
const incrementSuffix = (suffix) => {
  if (!suffix) return 'A';
  const chars = suffix.split('');
  let i = chars.length - 1;
  while (i >= 0) {
    if (chars[i] === 'Z') {
      chars[i] = 'A';
      i--;
    } else {
      chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
      return chars.join('');
    }
  }
  return 'A' + chars.join('');
};

export const handler = async (event) => {
  const { allocation, floor, year } = event.queryStringParameters || {};

  if (!allocation || !floor || !year) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "割振番号・階数・年が必要です。" }),
    };
  }

  let newReceptionNumber = '';

  try {
    const configCommand = new GetCommand({
      TableName: "Configurations", // ★設定テーブル名
      Key: { configYear: year },
    });
    const { Item: config } = await docClient.send(configCommand);
    const allocationMaster = config?.allocationMaster || {};

    // ### ▼▼▼ 変更箇所 ▼▼▼ ###
    // ルールを決定する条件を反転
    let useFloorIncrementRule = false;
    // 階数が0で、かつ割振記号のaddressが「その他」で"ある"場合のみtrue
    if (
      parseInt(floor, 10) === 0 &&
      allocationMaster[allocation] &&
      allocationMaster[allocation].address === 'その他'
    ) {
      useFloorIncrementRule = true;
    }
    // ### ▲▲▲ 変更箇所 ▲▲▲ ###

    if (useFloorIncrementRule) {
      // =============================================================
      // ★例外ルール: 階数を繰り上げるロジック (floorが0で、「その他」の場合)
      // =============================================================
      let currentPrefix = `${allocation}${floor}`;
      const MAX_ITERATIONS = 20;

      for (let i = 0; i < MAX_ITERATIONS; i++) {
        const command = new ScanCommand({
          TableName: "Orders", // ★注文テーブル名
          FilterExpression: "begins_with(receptionNumber, :prefix)",
          ExpressionAttributeValues: { ":prefix": currentPrefix },
          ProjectionExpression: "receptionNumber",
        });
        const { Items } = await docClient.send(command);
        const existingSuffixes = new Set(Items.map(item => item.receptionNumber.slice(-1)));
        
        let foundAvailableSuffix = false;
        for (const char of ALPHABET) {
          if (!existingSuffixes.has(char)) {
            newReceptionNumber = `${currentPrefix}${char}`;
            foundAvailableSuffix = true;
            break;
          }
        }
        if (foundAvailableSuffix) break;

        const currentAllocation = currentPrefix.charAt(0);
        const currentFloor = parseInt(currentPrefix.substring(1), 10);
        const nextFloor = currentFloor + 1;
        currentPrefix = `${currentAllocation}${nextFloor}`;
      }
      if (!newReceptionNumber) throw new Error("受付番号が全て埋まっています。");

    } else {
      // =============================================================
      // ★基本ルール: サフィックスをAA, AB...と増やすロジック (上記以外すべて)
      // =============================================================
      const prefix = `${allocation}${floor}`;
      const command = new ScanCommand({
        TableName: "Orders", // ★注文テーブル名
        FilterExpression: "begins_with(receptionNumber, :prefix)",
        ExpressionAttributeValues: { ":prefix": prefix },
        ProjectionExpression: "receptionNumber",
      });
      const { Items } = await docClient.send(command);
      const existingSuffixes = Items.map(item => item.receptionNumber.substring(prefix.length));
      
      const sortedSuffixes = existingSuffixes.sort((a, b) => {
        if (a.length !== b.length) return a.length - b.length;
        return a.localeCompare(b);
      });
      const maxSuffix = sortedSuffixes.length > 0 ? sortedSuffixes[sortedSuffixes.length - 1] : '';
      
      const nextSuffix = incrementSuffix(maxSuffix);
      newReceptionNumber = `${prefix}${nextSuffix}`;
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ receptionNumber: newReceptionNumber }),
    };

  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: `受付番号の生成中にエラーが発生しました: ${error.message}` }),
    };
  }
};