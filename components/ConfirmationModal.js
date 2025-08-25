import React from 'react';
import { X as CloseIcon, Printer } from 'lucide-react';

const ConfirmationModal = ({
  onClose,
  onSubmit,
  customerInfo,
  orders,
  receptionNumber,
  calculateOrderTotal,
  generateOrderNumber,
  SIDE_ORDERS_DB,
  receipts,
  paymentGroups,
  orderType,
  globalNotes
}) => {
  const handlePrint = () => {
    const printContent = document.getElementById('printable-area');
    if (printContent) {
      const stylesheets = Array.from(document.styleSheets).map(sheet => sheet.href).filter(href => href).map(href => `<link rel="stylesheet" href="${href}">`).join('');
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head><title>注文確認書</title>${stylesheets}<style>body{margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.confirmation-document{box-shadow:none;padding:0;}</style></head>
          <body>${printContent.innerHTML}</body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const formatItemModifiers = (pattern) => {
    let modifiers = '';
    const removedItems = Object.keys(pattern.selectedNeta || {}).filter(neta => pattern.selectedNeta[neta]);
    if (removedItems.length > 0) { modifiers += ` [ ${removedItems.join('・')}抜き ]`; }
    if (pattern.wasabi === '抜き') { modifiers += ' [ ワサビ抜き ]'; }
    if (pattern.isOri) { modifiers += ' [ 折 ]'; }
    return modifiers;
  };

  return (
    <div className="confirmation-overlay" id="confirmation-root">
      <div className="confirmation-modal">
        <div className="confirmation-header"> <h3>注文確認書 プレビュー</h3> <button onClick={onClose} className="confirmation-close-btn"> <CloseIcon size={24} /> </button> </div>
        <div className="confirmation-content">
          <div id="printable-area">
            <div className="confirmation-document compact">
              <header className="conf-doc-header"> <div className="conf-logo">松栄寿し</div> <div className="conf-doc-title"> <h1>注文確認書</h1> <p>受付番号: {receptionNumber || '-----'}</p> {/* ★ 注文の種類を表示 */}
                <p>注文の種類: {orderType || '新規注文'}</p></div> </header>
              <section className="conf-section"> <p className="conf-current-date">{new Date().toLocaleDateString('ja-JP')} 現在、以下の内容でご注文を受付けております。</p> </section>
              <section className="conf-section">
                <h2 className="conf-order-title">お客様情報</h2>
                <div className="conf-details-grid">
                  <div className="conf-grid-item"> <div className="conf-label">部署/法人名</div> <div className="conf-value">{customerInfo.companyName || '(未入力)'} {customerInfo.department}</div> </div>
                  <div className="conf-grid-item"> <div className="conf-label">ご担当者名</div> <div className="conf-value">{customerInfo.contactName || '(未入力)'} 様</div> </div>
                  <div className="conf-grid-item"> <div className="conf-label">電話番号</div> <div className="conf-value">{customerInfo.tel || '(未入力)'}</div> </div>
                  <div className="conf-grid-item"> <div className="conf-label">FAX番号</div> <div className="conf-value">{customerInfo.fax || '(未入力)'}</div> </div>
                  <div className="conf-grid-item"> <div className="conf-label">メールアドレス</div> <div className="conf-value">{customerInfo.email || '(未入力)'}</div> </div>
                </div>
              </section>
              {orders.map((order, index) => (
                <section key={order.id} className="conf-section conf-order-block">
                  <h2 className="conf-order-title">ご注文 #{index + 1} (注文番号: {generateOrderNumber(order, receptionNumber, index)})</h2>
                  <div className="conf-grid">
                    <div className="conf-grid-item"> <div className="conf-label">お届け日時</div> <div className="conf-value">{order.orderDate || '(未入力)'} {order.orderTime || ''}</div> </div>
                    <div className="conf-grid-item"> <div className="conf-label">お届け先</div> <div className="conf-value">{order.deliveryAddress || '(未入力)'}</div> </div>
                  </div>
                  <table className="conf-items-table">
                    <thead> <tr> <th>品名</th> <th>単価</th> <th>個数</th> <th>金額</th> </tr> </thead>
                    <tbody>
                      {order.orderItems.filter(item => item.quantity > 0).flatMap(item => {
                        const netaChangePatterns = order.netaChanges?.[item.productKey] || [];
                        const changedQty = netaChangePatterns.reduce((sum, p) => sum + (parseInt(p.quantity, 10) || 0), 0);
                        const standardQty = item.quantity - changedQty;
                        const rows = [];
                        if (standardQty > 0) {
                          rows.push(<tr key={item.productKey}><td>{item.name}</td><td>{item.unitPrice.toLocaleString()}円</td><td>{standardQty}</td><td>¥{(item.unitPrice * standardQty).toLocaleString()}</td></tr>);
                        }
                        netaChangePatterns.forEach(pattern => {
                          rows.push(<tr key={pattern.id}><td>{item.name}{formatItemModifiers(pattern)}</td><td>{item.unitPrice.toLocaleString()}円</td><td>{pattern.quantity}</td><td>¥{(item.unitPrice * pattern.quantity).toLocaleString()}</td></tr>);
                        });
                        return rows;
                      })}
                      {(order.sideOrders || []).filter(item => item.quantity > 0).map(item => (
                        <tr key={item.productKey} className="side-order-row">
                          <td>{SIDE_ORDERS_DB[item.productKey]?.name}</td>
                          <td>{SIDE_ORDERS_DB[item.productKey]?.price.toLocaleString()}円</td>
                          <td>{item.quantity}</td>
                          <td>¥{((SIDE_ORDERS_DB[item.productKey]?.price || 0) * item.quantity).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr><td colSpan="3">小計</td><td>¥{calculateOrderTotal(order).toLocaleString()}</td></tr>
                    </tfoot>
                  </table>
                  {/* ★★★ 個別支払い時の表示ブロックを修正 ★★★ */}
                  {(paymentGroups || []).length <= 0 && (
                    <div className="conf-per-order-payment-details">
                      <div className="conf-order-total">
                        <strong>お支払い金額</strong>
                        <span>¥{calculateOrderTotal(order).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                  </section>
              ))}

                <section className="conf-section conf-payment-details">
                  {(paymentGroups || []).map((group, index) => (
                      <div key={group.id} className="conf-payment-group">
                        <div className="conf-grid-item">
                          <div className="conf-grid-item">
                            {(() => {
                              const paymentOrder = orders.find(o => o.id === parseInt(group.paymentDate, 10));
                              const paymentOrderIndex = paymentOrder ? orders.findIndex(o => o.id === paymentOrder.id) : -1;
  
                              // 対応する注文が見つかれば注文番号を生成、なければ「未定」
                              const displayOrderNumber = (paymentOrder && paymentOrderIndex !== -1)
                              ? generateOrderNumber(paymentOrder, receptionNumber, paymentOrderIndex)
                              : '（注文未定）';

                            return (
                              <div className="conf-label">支払グループ #{index + 1} (お支払いする注文番号: {displayOrderNumber})</div>
                            );
                            })()}
                            <div className="conf-value-order">
                              対象注文: {
                              Object.keys(group.checkedOrderIds)
                                .map(orderId => {
                                  const order = orders.find(o => o.id == orderId);

                                  if (!order) return null;

                                  const orderIndex = orders.findIndex(o => o.id === order.id);

                                  return order.orderId || generateOrderNumber(order, receptionNumber, orderIndex);
                                })
                                .filter(Boolean)
                                .join(', ')
                              }
                              </div>
                            </div>
                        </div>
                        <div className="conf-grand-total">
                            <strong>合計金額</strong>
                            <span>¥ {(group.total || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                </section>

              
              {(receipts || []).length > 0 && (
                <section className="conf-section conf-receipt-details">
                  <h2 className="conf-order-title">領収書・請求書 詳細</h2>
                  <table className="conf-items-table">
                    <thead><tr><th>種別</th><th>発行日</th><th>宛名</th><th>金額</th></tr></thead>
                    {/* 変更箇所: 領収書・請求書詳細テーブルの<tbody> */}
                    <tbody>
                      {receipts.map(receipt => {
                        // 変更点①: `receipt.issueDate`（日付）ではなく `receipt.orderId` で注文を検索します。
                        // これにより、注文が一意に特定されます。
                        const correspondingOrder = receipt.orderId 
                          ? orders.find(o => o.id === parseInt(receipt.orderId, 10)) 
                           : null;
                        const correspondingOrderIndex = correspondingOrder 
                          ? orders.findIndex(o => o.id === correspondingOrder.id) 
                        : -1;

                        // 変更点②: 表示用のテキストを準備します。
                        // まずは紐づく注文の日付をデフォルトとします。
                        let displayDate = (correspondingOrder ? correspondingOrder.orderDate : receipt.issueDate) || '(未指定)';

                        // 変更点③: 注文が見つかった場合、表示用テキストを「注文番号」で上書きします。
                        if (correspondingOrder && correspondingOrderIndex !== -1) {
                          const orderNumber = generateOrderNumber(correspondingOrder, receptionNumber, correspondingOrderIndex);
                          if (orderNumber !== '---') {
                            // 添付画像のように、発行日の欄に注文番号を表示します。
                            displayDate = orderNumber;
                          }
                        }

                        return (
                          <tr key={receipt.id}>
                            <td>{receipt.documentType}</td>
                            {/* 変更点④: 最終的に生成された表示用テキストを表示します。 */}
                            <td>{displayDate}</td>
                            <td>{receipt.recipientName || '(未指定)'}</td>
                            <td>¥{(parseInt(receipt.amount, 10) || 0).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </section>
              )}
              {globalNotes && (
                <section className="conf-section conf-notes-details">
                  <h2 className="conf-order-title">備考</h2>
                  <p className="conf-notes-text">
                    {/* 改行を<br>に変換して表示 */}
                    {globalNotes.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        <br />
                      </React.Fragment>
                    ))}
                  </p>
                </section>
              )}
              <footer className="conf-footer"> <p><strong>松栄寿し 長野駅東口店</strong></p> <p>〒380-0921 長野県長野市大字栗田1525番地</p> <p>TEL: (026)217-8700 / FAX: (026)268-1718</p> </footer>
            </div>
          </div>
          <div className="confirmation-actions"> <button onClick={handlePrint} className="confirmation-print-btn"> <Printer size={16} /> 印刷する </button> <button onClick={onClose} className="confirmation-back-btn"> 修正する </button> <button onClick={onSubmit} className="confirmation-submit-btn"> この内容で送信 </button> </div>
        </div>
      </div>
    </div>
  );
};
export default ConfirmationModal;