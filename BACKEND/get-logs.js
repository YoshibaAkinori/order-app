import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import deepDiff from 'deep-diff';

const { diff } = deepDiff;
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_SUFFIXES = ['A', 'B', 'C'];
const getTableSuffix = (year) => {
    const numericYear = parseInt(year, 10);
    // 2024年を基準点 'A' とする
    const startYear = 2024; 
    const index = (numericYear - startYear) % TABLE_SUFFIXES.length;
    // 基準年より前の場合など、indexが負になるケースを考慮
    const finalIndex = (index + TABLE_SUFFIXES.length) % TABLE_SUFFIXES.length;
    return TABLE_SUFFIXES[finalIndex];
};

const LOGS_TABLE_NAME = process.env.LOGS_TABLE_NAME || "OrderChangeLogs";
const CONFIG_TABLE_NAME = process.env.CONFIG_TABLE_NAME || "Configurations";

// ★ 1. データを比較用に整形する関数 (★★★ 修正版 ★★★)
const normalizeDataForDiff = (rawData, config) => {
  if (!rawData) return {};

  const normalizedData = rawData.M ? unmarshall(rawData) : rawData;
  const customer = normalizedData.customerInfo || normalizedData.customer;
  const specialMenusMaster = config?.specialMenus || {};
  const rawOrders = normalizedData.orders || [];

  // まずは各注文をクリーニング
  const cleanOrdersArray = rawOrders.map((order, index) => {
    let netaChangesSummary = '';
    const netaChanges = order.netaChanges || {};
    if (Object.keys(netaChanges).length > 0) {
      const summaries = [];
      Object.keys(netaChanges).forEach(productKey => {
        const product = (order.orderItems || []).find(p => p.productKey === productKey);
        if (product && netaChanges[productKey]?.[0]) {
          const selectedNetaObj = netaChanges[productKey][0]?.selectedNeta || {};
          const selectedNeta = Object.keys(selectedNetaObj).filter(neta => selectedNetaObj[neta] === true);
          if (selectedNeta.length > 0) {
            summaries.push(`${product.name}: ${selectedNeta.join('、')}`);
          }
        }
      });
      netaChangesSummary = summaries.join('; ');
    }

    return {
      internalId: order.internalId, // ★★★ internalIdを必ず含める ★★★
      注文番号: order.orderId || `注文#${index + 1}`,
      お届け日時: `${order.deliveryDate || order.orderDate || ''} ${order.deliveryTime || order.orderTime || ''}`.trim(),
      お届け先: order.deliveryAddress || '',
      お届け方法: order.deliveryMethod || '',
      商品: (order.orderItems || []).filter(item => (item.quantity || 0) > 0).map(item => ({ 品名: item.name, 数量: item.quantity, 単価: item.unitPrice, 備考: item.notes || '' })),
      特別注文: (order.sideOrders || []).filter(item => (item.quantity || 0) > 0).map(item => ({ 品名: specialMenusMaster[item.productKey]?.name || item.productKey, 数量: item.quantity })),
      ネタ変更詳細: netaChangesSummary,
      ネタ変更有無: order.hasNetaChange || false,
      その他ネタ変更詳細: order.netaChangeDetails || ''
    };
  });

  // ★★★ 配列を internalId をキーにしたオブジェクトに変換 ★★★
  const cleanOrdersObject = cleanOrdersArray.reduce((acc, order) => {
    if (order.internalId) {
      acc[order.internalId] = order;
    }
    return acc;
  }, {});

  return {
    顧客情報: {
      担当者名: customer?.contactName || '',
      電話番号: customer?.tel || '',
      法人名: customer?.companyName || '',
      メールアドレス: customer?.email || '',
      住所: customer?.address || '',
      階数: customer?.floorNumber || '',
      支払い方法: customer?.paymentMethod || ''
    },
    注文: cleanOrdersObject, // ★★★ オブジェクトを返す ★★★
    受付番号: normalizedData.receptionNumber || '',
    割当番号: normalizedData.allocationNumber || '',
    選択年: normalizedData.selectedYear || ''
  };
};

// ★ 2. ネタ変更詳細文字列をパースする補助関数 (変更なし)
const parseNetaChangeDetails = (detailsString) => {
  if (!detailsString) return [];
  const items = [];
  const parts = detailsString.split('; ');
  parts.forEach(part => {
    const match = part.match(/^(.+?):\s*(.+)$/);
    if (match) {
      const productName = match[1];
      const netaString = match[2];
      const selectedNeta = netaString.split('、').map(s => s.trim());
      items.push({ productName, selectedNeta });
    }
  });
  return items;
};

// ★ 3. ネタ変更の差分を検出する関数 (★★★ 修正版 ★★★)
const detectNetaChangeDifferences = (beforeData, afterData, config) => {
  const changes = [];
  const beforeOrders = beforeData.注文 || {}; // オブジェクトとして受け取る
  const afterOrders = afterData.注文 || {};   // オブジェクトとして受け取る

  // afterの各注文をループ
  for (const internalId in afterOrders) {
    if (!Object.prototype.hasOwnProperty.call(afterOrders, internalId)) continue;

    const afterOrder = afterOrders[internalId];
    const beforeOrder = beforeOrders[internalId];

    // 新規追加された注文のネタ変更は、注文追加のログで処理されるのでここではスキップ
    if (!beforeOrder) continue;

    const displayOrderId = afterOrder.注文番号; // 表示用の注文番号

    if (afterOrder.ネタ変更詳細 && afterOrder.ネタ変更詳細 !== beforeOrder.ネタ変更詳細) {
      const beforeItems = parseNetaChangeDetails(beforeOrder.ネタ変更詳細);
      const afterItems = parseNetaChangeDetails(afterOrder.ネタ変更詳細);
      const newChanges = [];
      
      afterItems.forEach(afterItem => {
        const beforeItem = beforeItems.find(b => b.productName === afterItem.productName);
        if (!beforeItem) {
          newChanges.push(`${afterItem.productName}: ${afterItem.selectedNeta.join('、')}`);
        } else {
          const newNeta = afterItem.selectedNeta.filter(neta => !beforeItem.selectedNeta.includes(neta));
          if (newNeta.length > 0) {
            newChanges.push(`${afterItem.productName}: ${newNeta.join('、')} 追加`);
          }
        }
      });

      if (newChanges.length > 0) {
        changes.push(`【${displayOrderId}】でネタ変更が行われました: 「${newChanges.join('; ')}」`);
      }
    }
  }
  return changes;
};

// ★ 4. 差分を読みやすい文章に変換する関数 (★★★ 修正版 ★★★)
const formatChange = (d, before, after, config) => {
  if (d.kind === 'E' && d.lhs === d.rhs) return null;
  const path = d.path || [];

  // 注文に関する変更
  if (path[0] === '注文') {
    const internalId = path[1];
    
    // ★★★ ここから修正 ★★★
    // ケース2: 注文全体の削除（キャンセル）
    if (d.kind === 'D' && path.length === 2) {
      const deletedOrder = d.lhs; // 削除された注文のデータは d.lhs に入っている
      const displayOrderId = deletedOrder.注文番号;

      // 削除された注文情報から詳細なメッセージを組み立てる
      const changes = [`注文【${displayOrderId}】が削除（キャンセル）されました。`];
      
      const itemsText = (deletedOrder.商品 || [])
        .map(item => `${item.品名}(${item.数量})`)
        .join('、');
      
      if (itemsText) changes.push(`・注文内容: ${itemsText}`);
      if (deletedOrder.お届け日時) changes.push(`・お届け日時: ${deletedOrder.お届け日時}`);
      
      // 複数行のメッセージを改行(\n)で連結して返す
      return changes.join('\n');
    }
    const beforeOrder = before.注文[internalId];
    const afterOrder = after.注文[internalId];
    const displayOrderId = afterOrder?.注文番号 || beforeOrder?.注文番号;

    // ケース1: 注文全体の追加
    if (d.kind === 'N' && path.length === 2) {
      return `注文【${displayOrderId}】が追加されました。`;
    }
    // ケース2: 注文全体の削除（キャンセル）
    if (d.kind === 'D' && path.length === 2) {
      return `注文【${displayOrderId}】が削除（キャンセル）されました。`;
    }
    // ケース3: 既存注文内のプロパティ変更
    if (path.length >= 3) {
      const property = path[2];
      if (property === 'ネタ変更詳細' || property === 'ネタ変更有無') return null;
      
      // 商品・特別注文の変更
      if ((property === '商品' || property === '特別注文') && path.length >= 4) {
        const itemIndex = path[3];
        // 配列自体の追加・削除
        if (d.kind === 'A') {
          if (d.item.kind === 'N') return `【${displayOrderId}】に${property}「${d.item.rhs.品名}」(数量:${d.item.rhs.数量})が追加されました。`;
          if (d.item.kind === 'D') return `【${displayOrderId}】の${property}「${d.item.lhs.品名}」が削除されました。`;
        }
        // 項目内のプロパティ変更
        if (path.length >= 5) {
          const itemProperty = path[4];
          const itemName = afterOrder?.[property]?.[itemIndex]?.品名 || beforeOrder?.[property]?.[itemIndex]?.品名;
          if (d.kind === 'E' && itemProperty === '数量') {
            return `【${displayOrderId}】の${property}「${itemName}」の数量が ${d.lhs} から ${d.rhs} に変更されました。`;
          }
          if (d.kind === 'E' && itemProperty === '備考') {
            return `【${displayOrderId}】の${property}「${itemName}」の備考が変更されました。`;
          }
        }
      }
      
      // その他の注文項目変更 (お届け日時など)
      if (d.kind === 'E' && path.length === 3) {
        const propertyDisplayName = { 'お届け日時': 'お届け日時', 'お届け先': 'お届け先', 'お届け方法': 'お届け方法', '注文番号': '注文番号' }[property] || property;
        if(beforeOrder && afterOrder && property === '注文番号') {
          return `注文【${beforeOrder.注文番号}】の「注文番号」が '${d.lhs}' から '${d.rhs}' に変更されました。`;
        }
        return `【${displayOrderId}】の「${propertyDisplayName}」が '${d.lhs || '(なし)'}' から '${d.rhs || '(なし)'}' に変更されました。`;
      }
    }
  }

  // 顧客情報の変更
  if (path[0] === '顧客情報' && path.length >= 2) {
    const property = path[1];
    if (d.kind === 'E') {
      return `顧客情報の「${property}」が '${d.lhs || '(なし)'}' から '${d.rhs || '(なし)'}' に変更されました。`;
    }
  }

  // その他の変更
  if (path.length === 1 && d.kind === 'E') {
    const propertyDisplayName = { '受付番号': '受付番号', '割当番号': '割当番号' }[path[0]] || path[0];
    return `「${propertyDisplayName}」が '${d.lhs || '(なし)'}' から '${d.rhs || '(なし)'}' に変更されました。`;
  }
  
  // 上記のいずれにもマッチしない変更は、デバッグ用に情報を返す
  return `未処理の変更: ${JSON.stringify({path: d.path, kind: d.kind})}`;
};

// ★ 5. キャンセルログを処理する関数 (★★★ 修正版 ★★★)
const processCancelLog = (log) => {
  const action = log.action?.S || log.action;
  const changes = [];

  if (action === 'CANCEL_SINGLE') {
    const canceledOrderData = log.canceledOrder;
    let co = {};
    if (canceledOrderData?.M) {
      co = unmarshall(canceledOrderData);
    } else if (canceledOrderData) {
      co = canceledOrderData;
    }
    
    const orderId = co?.注文番号 || '不明';
    changes.push(`注文 [${orderId}] がキャンセルされました。`);
    if (co.注文内容) changes.push(`・注文内容: ${co.注文内容}`);
    if (co.お届け日時) changes.push(`・お届け日時: ${co.お届け日時}`);
    if (co.部署名) changes.push(`・部署名: ${co.部署名}`);
    
  } else if (action === 'CANCEL_ALL') {
    changes.push("受付全体がキャンセルされました。");
    const canceledOrders = log.canceledOrders?.L || log.canceledOrders || [];
    canceledOrders.forEach((orderData) => {
      let co = {};
      if (orderData?.M) {
        co = unmarshall(orderData);
      } else if (orderData) {
        co = orderData;
      }
      
      const orderId = co?.注文番号 || '不明';
      const orderContent = co?.注文内容 || 'N/A';
      changes.push(`  - 対象注文 [${orderId}]: ${orderContent}`);
    });
  }
  
  return {
    logId: log.logId?.S || log.logId,
    receptionNumber: log.receptionNumber?.S || log.receptionNumber,
    timestamp: log.timestamp?.S || log.timestamp,
    orderType: 'キャンセル',
    changes: changes,
    changesCount: changes.length,
  };
};

// ★ 6. メインのハンドラ (変更なし)
export const handler = async (event) => {
  console.log('Lambda実行開始:', JSON.stringify(event));
  
  try {
    const year = event.queryStringParameters?.year;
    if (!year) {
        return {
            statusCode: 400,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ success: false, message: "年度(year)が指定されていません。" })
        };
    }
    const tableSuffix = getTableSuffix(year);
    const LOGS_TABLE_NAME = `OrderChangeLogs-${tableSuffix}`;
    
    const logsScanResult = await docClient.send(new ScanCommand({
      TableName: LOGS_TABLE_NAME
    }));
    
    const logs = logsScanResult.Items || [];
    console.log(`${logs.length}件のログが見つかりました`);

    const processedLogs = [];
    
    for (const log of logs) {
      try {
        const action = log.action?.S || log.action || 'UPDATE';
        console.log(`処理中のログ: ${log.logId?.S || log.logId}, アクション: ${action}`);

        if (action.includes('CANCEL')) {
          const cancelLog = processCancelLog(log);
          processedLogs.push(cancelLog);
          continue;
        }

        const afterData = log.afterData;
        const year = afterData?.M?.selectedYear?.S || afterData?.selectedYear;
        if (!year) {
          console.warn(`ログID ${log.logId?.S || log.logId} に年情報がありません`);
          continue;
        }

        const { Item: config } = await docClient.send(new GetCommand({
          TableName: CONFIG_TABLE_NAME,
          Key: { configYear: year.toString() },
        }));
        
        if (!config) {
          console.warn(`年 ${year} の設定データが見つかりません`);
          continue;
        }

        const cleanBefore = normalizeDataForDiff(log.beforeData, config);
        const cleanAfter = normalizeDataForDiff(log.afterData, config);
        
        const differences = diff(cleanBefore, cleanAfter) || [];
        const netaChangeDifferences = detectNetaChangeDifferences(cleanBefore, cleanAfter, config);
        
        const changesText = [
          ...differences.map(d => formatChange(d, cleanBefore, cleanAfter, config)).filter(Boolean),
          ...netaChangeDifferences
        ];

        processedLogs.push({
          logId: log.logId?.S || log.logId,
          receptionNumber: log.receptionNumber?.S || log.receptionNumber,
          timestamp: log.timestamp?.S || log.timestamp,
          orderType: afterData?.M?.orderType?.S || afterData?.orderType || '変更',
          changes: changesText.length > 0 ? changesText : ['変更内容が検出されませんでした'],
          changesCount: changesText.length,
        });

      } catch (error) {
        console.error(`ログID ${log.logId?.S || log.logId} の処理中にエラー:`, error);
      }
    }
    
    const sortedLogs = processedLogs.sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    console.log(`${sortedLogs.length}件の変更ログを処理完了`);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        success: true,
        count: sortedLogs.length,
        logs: sortedLogs
      }),
    };
    
  } catch (error) {
    console.error("ログの取得に失敗しました:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, message: "サーバーエラーが発生しました", error: error.message })
    };
  }
};
