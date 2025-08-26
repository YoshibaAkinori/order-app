import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import deepDiff from 'deep-diff';

const { diff } = deepDiff;
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const LOGS_TABLE_NAME = process.env.LOGS_TABLE_NAME || "OrderChangeLogs";
const CONFIG_TABLE_NAME = process.env.CONFIG_TABLE_NAME || "Configurations";

// ★ 1. データを比較用に整形する関数
const normalizeDataForDiff = (rawData, config) => {
  if (!rawData) return {};

  // DynamoDBのネイティブJSONを通常のJSオブジェクトに変換
  const normalizedData = rawData.M ? unmarshall(rawData) : rawData;
  
  // beforeDataでは customerInfo、afterDataでは customer という違いがある
  const customer = normalizedData.customerInfo || normalizedData.customer;
  const productsMaster = config?.products || {};
  const specialMenusMaster = config?.specialMenus || {};
  const rawOrders = normalizedData.orders || [];

  const cleanOrders = rawOrders.map((order, index) => {
    // ネタ変更のサマリーを生成（選択されたネタのみ）
    let netaChangesSummary = '';
    const netaChanges = order.netaChanges || {};
    
    if (Object.keys(netaChanges).length > 0) {
      const summaries = [];
      
      Object.keys(netaChanges).forEach(productKey => {
        const product = (order.orderItems || []).find(p => p.productKey === productKey);
        if (product && netaChanges[productKey]?.[0]) {
          // 選択されたネタ（trueになっているもの）のみを取得
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
      注文番号: order.orderId || `注文#${index + 1}`,
      お届け日時: `${order.deliveryDate || order.orderDate || ''} ${order.deliveryTime || order.orderTime || ''}`.trim(),
      お届け先: order.deliveryAddress || '',
      お届け方法: order.deliveryMethod || '',
      商品: (order.orderItems || [])
        .filter(item => (item.quantity || 0) > 0)
        .map(item => ({
          品名: item.name,
          数量: item.quantity,
          単価: item.unitPrice,
          備考: item.notes || ''
        })),
      特別注文: (order.sideOrders || [])
        .filter(item => (item.quantity || 0) > 0)
        .map(item => ({
          品名: specialMenusMaster[item.productKey]?.name || item.productKey,
          数量: item.quantity
        })),
      ネタ変更詳細: netaChangesSummary,
      ネタ変更有無: order.hasNetaChange || false,
      その他ネタ変更詳細: order.netaChangeDetails || ''
    };
  });

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
    注文: cleanOrders,
    受付番号: normalizedData.receptionNumber || '',
    割当番号: normalizedData.allocationNumber || '',
    選択年: normalizedData.selectedYear || ''
  };
};

// ★ 2. ネタ変更詳細文字列をパースする補助関数
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

// ★ 3. ネタ変更の差分を検出する関数（商品追加時は除外）
const detectNetaChangeDifferences = (beforeData, afterData, config) => {
  const changes = [];

  // beforeとafterの注文データを比較
  const beforeOrders = beforeData.注文 || [];
  const afterOrders = afterData.注文 || [];

  afterOrders.forEach((afterOrder, orderIndex) => {
    const beforeOrder = beforeOrders[orderIndex];
    const orderId = afterOrder.注文番号;

    // afterでネタ変更がある場合のみチェック
    if (afterOrder.ネタ変更詳細) {
      // beforeでもネタ変更があったかチェック
      const beforeNetaChanges = beforeOrder?.ネタ変更詳細 || '';
      const afterNetaChanges = afterOrder.ネタ変更詳細;

      // beforeとafterで差分があるかチェック
      if (beforeNetaChanges !== afterNetaChanges) {
        // 商品ごとの差分を詳細に分析
        const beforeItems = parseNetaChangeDetails(beforeNetaChanges);
        const afterItems = parseNetaChangeDetails(afterNetaChanges);

        const newChanges = [];
        
        // afterの各商品をチェック
        afterItems.forEach(afterItem => {
          const beforeItem = beforeItems.find(b => b.productName === afterItem.productName);
          
          // 商品が新規追加された場合はここでは処理しない（商品追加のログで処理済み）
          const beforeOrderItems = beforeOrder?.商品 || [];
          const afterOrderItems = afterOrder.商品 || [];
          const isNewProduct = !beforeOrderItems.some(item => item.品名 === afterItem.productName) &&
                              afterOrderItems.some(item => item.品名 === afterItem.productName);
          
          if (isNewProduct) {
            // 新規商品のネタ変更は商品追加ログで処理済みなのでスキップ
            return;
          }
          
          if (!beforeItem) {
            // この商品のネタ変更は新規追加（既存商品への新規ネタ変更）
            newChanges.push(`${afterItem.productName}: ${afterItem.selectedNeta.join('、')}`);
          } else {
            // 既存の商品だが、選択されたネタに差分があるかチェック
            const newNeta = afterItem.selectedNeta.filter(neta => !beforeItem.selectedNeta.includes(neta));
            if (newNeta.length > 0) {
              newChanges.push(`${afterItem.productName}: ${newNeta.join('、')} 追加`);
            }
          }
        });

        if (newChanges.length > 0) {
          changes.push(`【${orderId}】でネタ変更が行われました: 「${newChanges.join('; ')}」`);
        }
      }
    }
  });

  return changes;
};

// ★ 4. 差分を読みやすい文章に変換する関数
const formatChange = (d, before, after, config) => {
  console.log('formatChange呼び出し:', {
    kind: d.kind,
    path: d.path,
    lhs: d.lhs,
    rhs: d.rhs
  });

  if (d.kind === 'E' && d.lhs === d.rhs) {
    return null;
  }
  
  const path = d.path || [];

  // ネタ変更は別途処理するため、ここではスキップ
  if (path[0] === '注文' && path.length >= 3 && path[2] === 'ネタ変更詳細') {
    return null; // 別途detectNetaChangeDifferencesで処理
  }

  // 注文に関する変更（ネタ変更以外）
  if (path[0] === '注文' && path.length >= 2) {
    const orderIndex = path[1];
    const orderId = (after.注文?.[orderIndex]?.注文番号 || 
                    before.注文?.[orderIndex]?.注文番号) || 
                   `注文#${orderIndex + 1}`;
    const property = path[2];

    // 商品・特別注文の数量変更
    if ((property === '商品' || property === '特別注文') && path.length >= 4) {
      const itemIndex = path[3];
      const itemProperty = path[4];
      
      if (d.kind === 'E' && itemProperty === '数量') {
        const itemName = after.注文[orderIndex][property][itemIndex]?.品名 || 
                        before.注文[orderIndex][property][itemIndex]?.品名;
        return `【${orderId}】の${property}「${itemName}」の数量が ${d.lhs} から ${d.rhs} に変更されました。`;
      }
      
      if (d.kind === 'E' && itemProperty === '備考') {
        const itemName = after.注文[orderIndex][property][itemIndex]?.品名 || 
                        before.注文[orderIndex][property][itemIndex]?.品名;
        return `【${orderId}】の${property}「${itemName}」の備考が変更されました。`;
      }
    }
    
    // 商品・特別注文の追加・削除
    if ((property === '商品' || property === '特別注文') && d.kind === 'A') {
      if (d.item.kind === 'N') {
        let itemName = d.item.rhs.品名;
        
        // 商品の場合、ネタ変更があるかチェック
        if (property === '商品') {
          // この商品にネタ変更があるかチェック
          const afterOrder = after.注文[orderIndex];
          if (afterOrder && afterOrder.ネタ変更詳細) {
            const netaChangeItems = parseNetaChangeDetails(afterOrder.ネタ変更詳細);
            const netaChangeItem = netaChangeItems.find(item => item.productName === itemName);
            
            if (netaChangeItem && netaChangeItem.selectedNeta.length > 0) {
              // ネタ変更がある場合は「商品名: ネタ1抜き、ネタ2抜き」の形式に変更
              const netaWithNuki = netaChangeItem.selectedNeta.map(neta => `${neta}抜き`);
              itemName = `${itemName}: ${netaWithNuki.join('、')}`;
            }
          }
        }
        
        return `【${orderId}】に${property}「${itemName}」(数量:${d.item.rhs.数量})が追加されました。`;
      }
      if (d.item.kind === 'D') {
        return `【${orderId}】の${property}「${d.item.lhs.品名}」が削除されました。`;
      }
    }
    
    // その他の注文項目変更
    if (property && d.kind === 'E') {
      // 「ネタ変更有無」の変更は除外
      if (property === 'ネタ変更有無') {
        return null;
      }
      
      const propertyDisplayName = {
        'お届け日時': 'お届け日時',
        'お届け先': 'お届け先',
        'お届け方法': 'お届け方法'
      }[property] || property;
      
      return `【${orderId}】の「${propertyDisplayName}」が '${d.lhs || '(なし)'}' から '${d.rhs || '(なし)'}' に変更されました。`;
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
    const propertyDisplayName = {
      '受付番号': '受付番号',
      '割当番号': '割当番号'
    }[path[0]] || path[0];
    
    return `「${propertyDisplayName}」が '${d.lhs || '(なし)'}' から '${d.rhs || '(なし)'}' に変更されました。`;
  }
  
  return `未処理の変更: ${JSON.stringify({path: d.path, kind: d.kind, lhs: d.lhs, rhs: d.rhs})}`;
};

// ★ 5. キャンセルログを処理する関数
const processCancelLog = (log) => {
  const action = log.action?.S || log.action;
  const changes = [];

  if (action === 'CANCEL_SINGLE') {
    // 単一注文のキャンセル
    const canceledOrderData = log.canceledOrder;
    let co = {}; // 最終的なJSオブジェクトを格納する変数

    // DynamoDBのMap形式({ M: {...} })か、すでにJSオブジェクトかを判断
    if (canceledOrderData?.M) {
      co = unmarshall(canceledOrderData); // { M: {...} } を unmarshall
    } else if (canceledOrderData) {
      co = canceledOrderData; // すでにJSオブジェクトならそのまま使用
    }
    
    const orderId = co?.注文番号 || '不明';
    const orderContent = co?.注文内容 || 'N/A';
    const deliveryTime = co?.お届け日時 || 'N/A';
    const department = co?.部署名 || 'N/A';
    
    changes.push(`注文 [${orderId}] がキャンセルされました。`);
    changes.push(`・注文内容: ${orderContent}`);
    changes.push(`・お届け日時: ${deliveryTime}`);
    if (department !== 'N/A') {
      changes.push(`・部署名: ${department}`);
    }
    
  } else if (action === 'CANCEL_ALL') {
    // 全注文のキャンセル
    changes.push("受付全体がキャンセルされました。");
    
    const canceledOrders = log.canceledOrders?.L || log.canceledOrders || [];
    canceledOrders.forEach((orderData, index) => {
      let co = {}; // 最終的なJSオブジェクトを格納する変数

      // DynamoDBのMap形式({ M: {...} })か、すでにJSオブジェクトかを判断
      if (orderData?.M) {
        co = unmarshall(orderData); // { M: {...} } を unmarshall
      } else if (orderData) {
        co = orderData; // すでにJSオブジェクトならそのまま使用
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

// ★ 6. メインのハンドラ
export const handler = async (event) => {
  console.log('Lambda実行開始:', JSON.stringify(event));
  
  try {
    // ログデータを取得
    console.log('ログデータを取得中...');
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

        // キャンセルログの処理
        if (action.includes('CANCEL')) {
          console.log('キャンセルログを処理中...');
          const cancelLog = processCancelLog(log);
          processedLogs.push(cancelLog);
          continue; // 次のログへ
        }

        // 通常の更新ログの処理
        const afterData = log.afterData;
        const year = afterData?.M?.selectedYear?.S || afterData?.selectedYear;
        
        if (!year) {
          console.log(`ログID ${log.logId?.S || log.logId} に年情報がありません`);
          continue;
        }

        // 設定データを取得（文字列として検索）
        const { Item: config } = await docClient.send(new GetCommand({
          TableName: CONFIG_TABLE_NAME,
          Key: { configYear: year.toString() },
        }));
        
        if (!config) {
          console.log(`年 ${year} の設定データが見つかりません`);
          continue;
        }

        // データを比較用に正規化
        const cleanBefore = normalizeDataForDiff(log.beforeData, config);
        const cleanAfter = normalizeDataForDiff(log.afterData, config);
        
        console.log(`ログID ${log.logId?.S || log.logId} のデータ比較:`);
        
        // 通常の差分を計算
        const differences = diff(cleanBefore, cleanAfter) || [];
        
        // ネタ変更の差分を別途検出
        const netaChangeDifferences = detectNetaChangeDifferences(cleanBefore, cleanAfter, config);
        
        const changesText = [
          // 通常の差分をフォーマット
          ...differences
            .map(d => formatChange(d, cleanBefore, cleanAfter, config))
            .filter(Boolean),
          // ネタ変更の差分を追加
          ...netaChangeDifferences
        ];

        console.log(`有効な変更の数: ${changesText.length}`);
        console.log('有効な変更:', changesText);

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
        // 個別のログ処理エラーは続行
      }
    }
    
    // タイムスタンプでソート（新しい順）
    const sortedLogs = processedLogs.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    console.log(`${sortedLogs.length}件の変更ログを処理完了`);

    return {
      statusCode: 200,
      headers: { 
        "Access-Control-Allow-Origin": "*", 
        "Access-Control-Allow-Headers": "Content-Type",
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
      headers: { 
        "Access-Control-Allow-Origin": "*", 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({ 
        success: false,
        message: "サーバーエラーが発生しました", 
        error: error.message 
      }) 
    };
  }
};