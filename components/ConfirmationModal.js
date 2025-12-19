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
  globalNotes,
  // ★★★ メール送信制御用のprops ★★★
  sendConfirmationEmail,
  setSendConfirmationEmail,
  isFinalConfirmation,
  setIsFinalConfirmation,
}) => {
  const handlePrint = () => {
    const printContent = document.getElementById('printable-area');
    if (printContent) {
      const stylesheets = Array.from(document.styleSheets).map(sheet => sheet.href).filter(href => href).map(href => `<link rel="stylesheet" href="${href}">`).join('');
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
      <html>
        <head>
          <title>注文確認書</title>
          ${stylesheets}
          <style>
            @page { size: A4; margin: 15mm; }
            body {
              margin: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .confirmation-document {
              box-shadow: none;
              padding: 0;
              max-width: 100%;
              width: 100%;
            }
          </style>
        </head>
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

  // ★★★ メール送信オプションを表示するかどうか（変更の場合かつメールアドレスがある場合のみ表示） ★★★
  const showEmailOption = orderType === '変更' && typeof setSendConfirmationEmail === 'function' && customerInfo?.email;

  return (
    <div className="confirmation-overlay" id="confirmation-root">
      <div className="confirmation-modal">
        <div className="confirmation-header"> <h3>注文確認書 プレビュー</h3> <button onClick={onClose} className="confirmation-close-btn"> <CloseIcon size={24} /> </button> </div>
        <div className="confirmation-content">
          <div id="printable-area">
            <div className="confirmation-document compact">
              <header className="conf-doc-header"> <div className="conf-logo">松栄寿し</div> <div className="conf-doc-title"> <h1>注文確認書</h1> <p>受付番号: {receptionNumber || '-----'}</p>
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
                  <h2 className="conf-order-title">ご注文 #{index + 1} (注文番号: {order.orderId || generateOrderNumber(order, receptionNumber, index)})</h2>
                  <div className="conf-grid">
                    <div className="conf-grid-item"> <div className="conf-label">お届け日時</div> <div className="conf-value">{order.orderDate || '(未入力)'} {order.orderTime || ''}</div> </div>
                    <div className="conf-grid-item"> <div className="conf-label">お届け先</div> <div className="conf-value">{order.deliveryAddress || '(未入力)'}</div> </div>
                  </div>
                  <table className="conf-items-table">
                    <thead>
                      <tr>
                        <th>品名</th>
                        <th>単価</th>
                        <th>個数</th>
                        <th>金額</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.orderItems.filter(item => item.quantity > 0).flatMap(item => {
                        const netaChangePatterns = order.netaChanges?.[item.productKey] || [];
                        const changedQty = netaChangePatterns.reduce((sum, p) => sum + (parseInt(p.quantity, 10) || 0), 0);
                        const standardQty = item.quantity - changedQty;
                        const rows = [];
                        if (standardQty > 0) {
                          rows.push(
                            <tr key={`${item.productKey}-standard`}>
                              <td>{item.name}</td>
                              <td>¥{item.unitPrice.toLocaleString()}</td>
                              <td>{standardQty}</td>
                              <td>¥{(item.unitPrice * standardQty).toLocaleString()}</td>
                            </tr>
                          );
                        }
                        netaChangePatterns.forEach((pattern, patternIndex) => {
                          rows.push(
                            <tr key={`${item.productKey}-neta-${patternIndex}`}>
                              <td>{item.name}{formatItemModifiers(pattern)}</td>
                              <td>¥{item.unitPrice.toLocaleString()}</td>
                              <td>{pattern.quantity}</td>
                              <td>¥{(item.unitPrice * pattern.quantity).toLocaleString()}</td>
                            </tr>
                          );
                        });
                        return rows;
                      })}
                      {order.sideOrders && order.sideOrders.filter(item => item.quantity > 0).map(item => {
                        const sideOrderInfo = SIDE_ORDERS_DB[item.productKey] || { name: '特別注文', price: 0 };
                        return (
                          <tr key={`side-${item.productKey}`}>
                            <td>{sideOrderInfo.name}</td>
                            <td>¥{sideOrderInfo.price.toLocaleString()}</td>
                            <td>{item.quantity}</td>
                            <td>¥{(sideOrderInfo.price * item.quantity).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="subtotal-row">
                        <td colSpan="3">小計</td>
                        <td>¥{calculateOrderTotal(order).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </section>
              ))}
              <section className="conf-section conf-grand-total">
                <div className="conf-total-row">
                  <span>総合計</span>
                  <span>¥{orders.reduce((sum, order) => sum + calculateOrderTotal(order), 0).toLocaleString()}</span>
                </div>
              </section>
              {paymentGroups && paymentGroups.length > 0 && (
                <section className="conf-section conf-payment-details">
                  <h2 className="conf-order-title">お支払い情報</h2>
                  <table className="conf-items-table">
                    <thead>
                      <tr>
                        <th>支払日#</th>
                        <th>お支払いを行う注文番号</th>
                        <th>対象注文</th>
                        <th>合計金額</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentGroups.map((group, index) => {
                        const paymentOrder = orders.find(o => o.orderId === group.paymentDate);
                        const paymentOrderIndex = paymentOrder ? orders.findIndex(o => o.orderId === paymentOrder.orderId) : -1;
                        const displayOrderNumber = (paymentOrder && paymentOrderIndex !== -1)
                          ? (paymentOrder.orderId || generateOrderNumber(paymentOrder, receptionNumber, paymentOrderIndex))
                          : '（注文未定）';
                        const targetOrderNumbers = Object.keys(group.checkedOrderIds)
                          .map(orderIdKey => {
                            const order = orders.find(o => o.orderId === orderIdKey);
                            if (!order) return null;
                            return order.orderId;
                          })
                          .filter(Boolean)
                          .join(', ');
                        return (
                          <tr key={group.id || index}>
                            <td>支払日#{index + 1}</td>
                            <td>{displayOrderNumber}</td>
                            <td>{targetOrderNumbers}</td>
                            <td>¥{(group.total || 0).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </section>
              )}
              {receipts && receipts.length > 0 && (
                <section className="conf-section conf-receipt-details">
                  <h2 className="conf-order-title">領収書・請求書 詳細</h2>
                  <table className="conf-items-table">
                    <thead>
                      <tr>
                        <th>種類</th>
                        <th>お渡し日</th>
                        <th>宛名</th>
                        <th>金額</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receipts.map(receipt => {
                        let displayDate = '(未指定)';
                        if (receipt.issueDate) {
                          const correspondingOrder = orders.find(o => o.orderId === receipt.issueDate);
                          if (correspondingOrder) {
                            const orderIndex = orders.findIndex(o => o.id === correspondingOrder.id);
                            const orderNumber = correspondingOrder.orderId || generateOrderNumber(correspondingOrder, receptionNumber, orderIndex);
                            displayDate = orderNumber !== '---' ? orderNumber : '(日付未定)';
                          } else {
                            displayDate = receipt.issueDate;
                          }
                        }

                        return (
                          <tr key={receipt.id}>
                            <td>{receipt.documentType}</td>
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

          {/* ★★★ メール送信オプション（変更の場合かつメールアドレスがある場合のみ表示） ★★★ */}
          {showEmailOption && (
            <div className="email-option-section">
              <label className="email-option-label">
                <input
                  type="checkbox"
                  checked={sendConfirmationEmail}
                  onChange={(e) => setSendConfirmationEmail(e.target.checked)}
                />
                <span>変更確認メールを送信する</span>
              </label>
              
              {/* 最終確認オプション（メール送信ONの場合のみ表示） */}
              {sendConfirmationEmail && (
                <div className="email-option-nested">
                  <label className="email-option-label email-option-label--nested">
                    <input
                      type="checkbox"
                      checked={isFinalConfirmation}
                      onChange={(e) => setIsFinalConfirmation(e.target.checked)}
                    />
                    <span>最終確認として送信する</span>
                  </label>
                  {isFinalConfirmation && (
                    <p className="email-option-info">
                      ※ 件名・本文が最終確認版になります
                    </p>
                  )}
                </div>
              )}
              
              {!sendConfirmationEmail && (
                <p className="email-option-warning">
                  ※ 確認メールは送信されません
                </p>
              )}
            </div>
          )}

          <div className="confirmation-actions"> 
            <button onClick={handlePrint} className="confirmation-print-btn"> <Printer size={16} /> 印刷する </button> 
            <button onClick={onClose} className="confirmation-back-btn"> 修正する </button> 
            <button onClick={onSubmit} className="confirmation-submit-btn"> この内容で送信 </button> 
          </div>
        </div>
      </div>
    </div>
  );
};
export default ConfirmationModal;