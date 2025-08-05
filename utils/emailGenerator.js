// この関数は、現在のアプリの状態を受け取り、メールのHTML本文を生成して返す
export const generateEmailHtml = (props) => {
  const {
    customerInfo,
    orders,
    receptionNumber,
    allocationNumber,
    calculateOrderTotal,
    generateOrderNumber,
    calculateGrandTotal,
    isPaymentOptionsOpen,
    SIDE_ORDERS_DB,
    receipts,
    paymentGroups
  } = props;

  // アイテムの修飾子（ネタ変更など）を生成する内部関数
  const formatItemModifiers = (pattern) => {
    let modifiers = '';
    const removedItems = Object.keys(pattern.selectedNeta || {}).filter(neta => pattern.selectedNeta[neta]);
    if (removedItems.length > 0) { modifiers += ` [ ${removedItems.join('・')}抜き ]`; }
    if (pattern.wasabi === '抜き') { modifiers += ' [ ワサビ抜き ]'; }
    if (pattern.isOri) { modifiers += ' [ 折 ]'; }
    return modifiers;
  };

  // 注文アイテムのテーブル行を生成する内部関数
  const generateOrderRows = (order) => {
    let rows = '';
    // メイン商品
    order.orderItems.filter(item => item.quantity > 0).forEach(item => {
      const netaChangePatterns = order.netaChanges?.[item.productKey] || [];
      const changedQty = netaChangePatterns.reduce((sum, p) => sum + (parseInt(p.quantity, 10) || 0), 0);
      const standardQty = item.quantity - changedQty;
      
      if (standardQty > 0) {
        rows += `<tr><td>${item.name}</td><td>${item.unitPrice.toLocaleString()}円</td><td>${standardQty}</td><td style="text-align: right;">¥${(item.unitPrice * standardQty).toLocaleString()}</td></tr>`;
      }
      netaChangePatterns.forEach(pattern => {
        rows += `<tr><td>${item.name}${formatItemModifiers(pattern)}</td><td>${item.unitPrice.toLocaleString()}円</td><td>${pattern.quantity}</td><td style="text-align: right;">¥${(item.unitPrice * pattern.quantity).toLocaleString()}</td></tr>`;
      });
    });
    // その他の注文
    if ((order.sideOrders || []).length > 0) {
      rows += `<tr><td colspan="4" style="background: #f8f9fa; font-style: italic; text-align: center;">その他のご注文</td></tr>`;
      order.sideOrders.filter(item => item.quantity > 0).forEach(item => {
        rows += `<tr><td>${SIDE_ORDERS_DB[item.productKey]?.name}</td><td>${SIDE_ORDERS_DB[item.productKey]?.price.toLocaleString()}円</td><td>${item.quantity}</td><td style="text-align: right;">¥${((SIDE_ORDERS_DB[item.productKey]?.price || 0) * item.quantity).toLocaleString()}</td></tr>`;
      });
    }
    return rows;
  };

  // メール全体のHTMLを組み立てる
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: sans-serif; color: #333; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #eee; }
        .header { display: flex; justify-content: space-between; padding-bottom: 10px; border-bottom: 2px solid #000; }
        .logo { font-size: 2rem; font-weight: bold; }
        .title h1 { margin: 0; font-size: 1.5rem; }
        .title p { margin: 5px 0 0; text-align: right; }
        .section { margin-top: 20px; padding-bottom: 20px; border-bottom: 1px dashed #ccc; }
        .section-title { font-size: 1.2rem; font-weight: bold; margin-bottom: 10px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .grid-item .label { font-weight: bold; }
        .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .items-table th, .items-table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        .items-table th { background-color: #f8f9fa; }
        .items-table tfoot td { text-align: right; font-weight: bold; }
        .footer { text-align: center; margin-top: 20px; font-size: 0.8rem; color: #777; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">松栄寿し</div>
          <div class="title">
            <h1>注文確認書</h1>
            <p>受付番号: ${receptionNumber || '-----'}</p>
          </div>
        </div>
        <div class="section">
          <p>${customerInfo.companyName || ''} ${customerInfo.department || ''} ${customerInfo.contactName || ''} 様</p>
          <p>この度はご注文誠にありがとうございます。下記の内容で注文を承りました。</p>
        </div>
        ${orders.map((order, index) => `
          <div class="section">
            <h2 class="section-title">ご注文 #${index + 1} (${generateOrderNumber(order, allocationNumber)})</h2>
            <div class="grid">
              <div class="grid-item"><span class="label">お届け日時:</span> ${order.orderDate || ''} ${order.orderTime || ''}</div>
              <div class="grid-item"><span class="label">お届け先:</span> ${order.deliveryAddress || ''}</div>
            </div>
            <table class="items-table">
              <thead><tr><th>品名</th><th>単価</th><th>個数</th><th style="text-align: right;">金額</th></tr></thead>
              <tbody>${generateOrderRows(order)}</tbody>
              <tfoot><tr><td colspan="3">このご注文の合計金額</td><td style="text-align: right;">¥${calculateOrderTotal(order).toLocaleString()}</td></tr></tfoot>
            </table>
          </div>
        `).join('')}
        <div class="section">
          <h2 class="section-title">お支払い・書類情報</h2>
          <p><strong>総合計金額: ¥${calculateGrandTotal().toLocaleString()}</strong></p>
          ${(receipts || []).length > 0 ? `
            <table class="items-table">
              <thead><tr><th>種別</th><th>発行日</th><th>宛名</th><th style="text-align: right;">金額</th></tr></thead>
              <tbody>
                ${receipts.map(r => `<tr><td>${r.documentType}</td><td>${r.issueDate}</td><td>${r.recipientName}</td><td style="text-align: right;">¥${(parseInt(r.amount) || 0).toLocaleString()}</td></tr>`).join('')}
              </tbody>
            </table>
          ` : `<p>支払い方法: ${customerInfo.paymentMethod || ''}<br>領収書宛名: ${customerInfo.invoiceName || ''}</p>`}
        </div>
        <div class="footer">
          <p><strong>松栄寿し 長野駅東口店</strong></p>
          <p>〒380-0921 長野県長野市大字栗田1525番地 | TEL: (026)217-8700</p>
        </div>
      </div>
    </body>
    </html>
  `;
};