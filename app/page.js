"use client";
import React, { useState, useMemo } from 'react';
import { Send, Plus, X as CloseIcon, Trash2 } from 'lucide-react';
import CustomerInfoSection from '../components/CustomerInfoSection';
import SingleOrderSection from '../components/SingleOrderSection';
import SidebarInfoSection from '../components/SidebarInfoSection';
import Header from '../components/Header';
import ConfirmationModal from '../components/ConfirmationModal';
import { generateEmailHtml } from '../utils/emailGenerator';

const PRODUCTS = {
  kiwami: { name: '極', price: 3580, neta: ['まぐろ', 'サーモン', 'いくら', 'えび', 'いか', 'うに', 'あなご', 'たまご'] },
  takumi: { name: '匠', price: 3240, neta: ['まぐろ', 'サーモン', 'いくら', 'えび', 'いか', 'たまご', 'きゅうり巻き'] },
  kei: { name: '恵', price: 2480, neta: ['まぐろ', 'サーモン', 'えび', 'いか', 'たまご', 'きゅうり巻き'] },
  izumi: { name: '泉', price: 1890, neta: ['まぐろ', 'サーモン', 'えび', 'たまご', 'きゅうり巻き'] }
};

const SIDE_ORDERS_DB = {
  'side-tuna': { name: '単品 まぐろ', price: 300 },
  'side-salmon': { name: '単品 サーモン', price: 250 },
  'side-tamago': { name: '単品 たまご', price: 150 },
  'side-tea': { name: 'お茶（ペットボトル）', price: 150 },
  'side-soup': { name: 'あら汁', price: 200 },
};

const OrderForm = () => {
  const initialCustomerInfo = {
    storeNumber: '', contactName: '', email: '', fax: '', tel: '', companyName: '', department: '',
    paymentMethod: '', invoiceName: '',
    useCombinedPayment: false,
    floorNumber: ''
  };

  const createNewOrder = () => ({
    id: Date.now(), orderDate: '', orderTime: '', deliveryAddress: '', deliveryMethod: '',
    hasNetaChange: false,
    netaChangeDetails: '', 
    netaChanges: {},
    sideOrders: [],
    orderItems: Object.keys(PRODUCTS).map(key => ({ productKey: key, name: PRODUCTS[key].name, unitPrice: PRODUCTS[key].price, quantity: 0, notes: '' }))
  });

  const [customerInfo, setCustomerInfo] = useState(initialCustomerInfo);
  const [orders, setOrders] = useState([createNewOrder()]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPaymentOptionsOpen, setIsPaymentOptionsOpen] = useState(false);
  const [isCombinedPaymentSummaryOpen, setIsCombinedPaymentSummaryOpen] = useState(false);
  const [allocationNumber, setAllocationNumber] = useState('');
  const [receptionNumber, setReceptionNumber] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [paymentGroups, setPaymentGroups] = useState([]);
  const [isReceiptDetailsOpen, setIsReceiptDetailsOpen] = useState(false);
  const [manualReceipts, setManualReceipts] = useState([]);

  const resetForm = () => {
    setCustomerInfo(initialCustomerInfo);
    setOrders([createNewOrder()]);
    setIsPaymentOptionsOpen(false);
    setIsCombinedPaymentSummaryOpen(false);
    setPaymentGroups([]);
    setIsReceiptDetailsOpen(false);
    setManualReceipts([]);
    setAllocationNumber('');
    setReceptionNumber('');
  };

  const handleLogin = () => setIsLoggedIn(true);
  const handleLogout = () => {
    setIsLoggedIn(false);
    setAllocationNumber('');
    setReceptionNumber('');
  };
  const handleReceptionNumberChange = (e) => setReceptionNumber(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase());
  const handleAllocationNumberChange = (e) => setAllocationNumber(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase());
  
  const handleCustomerInfoChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCustomerInfo(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const updateOrder = (orderId, updatedFields) => setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updatedFields } : o));
  const addOrder = () => setOrders(prev => [...prev, createNewOrder()]);
  const deleteOrder = (orderId) => setOrders(prev => prev.filter(o => o.id !== orderId));
  
  const calculateOrderTotal = (order) => {
    const mainTotal = order.orderItems.reduce((total, item) => total + ((parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity) || 0)), 0);
    const sideTotal = (order.sideOrders || []).reduce((total, item) => {
      const price = SIDE_ORDERS_DB[item.productKey]?.price || 0;
      return total + (price * (parseInt(item.quantity) || 0));
    }, 0);
    return mainTotal + sideTotal;
  };
  const calculateGrandTotal = () => orders.reduce((total, order) => total + calculateOrderTotal(order), 0);

  const handleToggleCombinedPayment = () => {
    const newOpenState = !isCombinedPaymentSummaryOpen;
    setIsCombinedPaymentSummaryOpen(newOpenState);
    setCustomerInfo(prev => ({ ...prev, useCombinedPayment: newOpenState }));
    if (!newOpenState) setPaymentGroups([]);
  };

  const addSideOrder = (orderId, productKey) => {
    if (!productKey) return;
    setOrders(prevOrders => prevOrders.map(order => {
      if (order.id === orderId) {
        const exists = order.sideOrders.some(item => item.productKey === productKey);
        if (exists) return order;
        const newSideOrder = { productKey, quantity: 1 };
        return { ...order, sideOrders: [...order.sideOrders, newSideOrder] };
      }
      return order;
    }));
  };

  const updateSideOrderQuantity = (orderId, productKey, quantity) => {
    const finalQuantity = parseInt(String(quantity).replace(/[０-９]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xFEE0)), 10) || 0;
    setOrders(prevOrders => prevOrders.map(order => {
      if (order.id === orderId) {
        const updatedSideOrders = order.sideOrders
          .map(item => item.productKey === productKey ? { ...item, quantity: finalQuantity } : item)
          .filter(item => item.quantity > 0);
        return { ...order, sideOrders: updatedSideOrders };
      }
      return order;
    }));
  };

  const removeSideOrder = (orderId, productKey) => {
    setOrders(prevOrders => prevOrders.map(order => {
      if (order.id === orderId) {
        const updatedSideOrders = order.sideOrders.filter(item => item.productKey !== productKey);
        return { ...order, sideOrders: updatedSideOrders };
      }
      return order;
    }));
  };
  
  const addPaymentGroup = () => {
    const newGroup = { id: Date.now(), paymentDate: '', checkedOrderIds: {} };
    setPaymentGroups(prev => [...prev, newGroup]);
  };
  const removePaymentGroup = (groupId) => {
    setPaymentGroups(prev => prev.filter(group => group.id !== groupId));
  };
  const updatePaymentGroup = (groupId, field, value) => {
    setPaymentGroups(prev => prev.map(group => group.id === groupId ? { ...group, [field]: value } : group));
  };
  const handleGroupOrderCheck = (groupId, orderId) => {
    setPaymentGroups(prevGroups => prevGroups.map(group => {
      if (group.id === groupId) {
        const newCheckedOrderIds = { ...group.checkedOrderIds };
        if (newCheckedOrderIds[orderId]) { 
          delete newCheckedOrderIds[orderId]; 
          } else { 
            newCheckedOrderIds[orderId] = true; 
          }
        return { ...group, checkedOrderIds: newCheckedOrderIds };
      }
      return group;
    }));
  };

  const handleToggleReceiptDetails = () => setIsReceiptDetailsOpen(prev => !prev);
  const addReceipt = () => {
    const newReceipt = { id: Date.now(), issueDate: '', recipientName: '', amount: '', documentType: '領収書' };
    setManualReceipts(prev => [...prev, newReceipt]);
  };
  const removeReceipt = (receiptId) => setManualReceipts(prev => prev.filter(r => r.id !== receiptId));
  const updateReceipt = (receiptId, field, value) => {
    setManualReceipts(prev => prev.map(r => r.id === receiptId ? { ...r, [field]: value } : r));
  };

  const paymentGroupsWithTotals = useMemo(() => {
    return paymentGroups.map(group => {
      const groupTotal = orders.reduce((total, order) => {
        if (group.checkedOrderIds[order.id]) { return total + calculateOrderTotal(order); }
        return total;
      }, 0);
      return { ...group, total: groupTotal };
    });
  }, [paymentGroups, orders]);

  const getDocumentType = (paymentMethod) => {
    if (['現金', 'クレジットカード'].includes(paymentMethod)) return '領収書';
    if (['銀行振込', '請求書払い'].includes(paymentMethod)) return '請求書';
    return '';
  };
  
  const autoGeneratedReceipts = useMemo(() => {
    const docType = getDocumentType(customerInfo.paymentMethod);
    if (!isPaymentOptionsOpen) {
        if (!customerInfo.paymentMethod || !customerInfo.invoiceName) return [];
        return orders.map(order => ({
            id: order.id,
            documentType: docType || '(種別未定)',
            issueDate: order.orderDate,
            recipientName: customerInfo.invoiceName,
            amount: calculateOrderTotal(order)
        }));
    }
    return [];
  }, [orders, customerInfo.paymentMethod, customerInfo.invoiceName, isPaymentOptionsOpen]);
  
  const finalReceipts = manualReceipts.length > 0 ? manualReceipts : autoGeneratedReceipts;

  const generateOrderNumber = (order, receptionNum, index) => {
    // 受付番号がまだ生成されていない場合は仮表示
    if (!receptionNum || receptionNum === 'エラー') {
      return '---';
    }
    
    // 日付部分 (2桁)
    const dateMatch = order.orderDate.match(/(\d{1,2})日/);
    const day = (dateMatch && dateMatch[1]) ? dateMatch[1].padStart(2, '0') : '00';
    
    // 注文連番 (#1 → 1)
    const orderSequence = (index + 1).toString();
    
    // 結合して返す (例: 25A2A1)
    return `${day}${receptionNum}${orderSequence}`;
  };

  const handleOpenConfirmation = async () => {
    if (!allocationNumber || !customerInfo.floorNumber) {
      alert('ヘッダーの「割振番号」と、発注者情報の「階数」を入力してください。');
      return;
    }
    try {
      const apiUrl = `https://viy41bgkvd.execute-api.ap-northeast-1.amazonaws.com/reception-number?allocation=${allocationNumber}&floor=${customerInfo.floorNumber}`;
      console.log('受付番号APIを呼び出します:', apiUrl);
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error('受付番号の取得APIからの応答が異常です');
      }
      const data = await response.json();
      setReceptionNumber(data.receptionNumber); 
      setIsConfirmationOpen(true);
    } catch (error) {
      console.error("受付番号の取得に失敗しました:", error);
      alert("受付番号の自動生成に失敗しました。管理者にお問い合わせください。");
      setReceptionNumber('エラー');
    }
  };
  
  const handleSubmit = async () => {
    // ★★★ あなたのAPI GatewayのURLをここに貼り付けてください ★★★
    const saveOrderApiUrl = 'https://viy41bgkvd.execute-api.ap-northeast-1.amazonaws.com/orders';
    const sendEmailApiUrl = 'https://<あなたのAPI GatewayのID>.execute-api.ap-northeast-1.amazonaws.com/send-email'; // メール用API（仮）
    
    if (!saveOrderApiUrl.includes('execute-api')) {
      alert('APIのURLを正しく設定してください。');
      return;
    }

    const finalData = { 
      customer: customerInfo, 
      orders, 
      receptionNumber, 
      allocationNumber, 
      paymentGroups: paymentGroupsWithTotals, 
      receipts: finalReceipts,
      SIDE_ORDERS_DB // Lambda側で単価を引くために追加
    };

    try {
      // --- DB書き込みAPIの呼び出し ---
      console.log('DB書き込みAPIを呼び出します...');
      const saveResponse = await fetch(saveOrderApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(errorData.message || 'データベースへの書き込みに失敗しました。');
      }
      console.log('DB書き込み成功:', await saveResponse.json());

      // --- メール送信APIの呼び出し ---
      if (customerInfo.email) {
        console.log('メール送信APIを呼び出します...');
        const emailHtml = generateEmailHtml({
          customerInfo, orders, receptionNumber, allocationNumber, calculateOrderTotal,
          generateOrderNumber, calculateGrandTotal, isPaymentOptionsOpen,
          SIDE_ORDERS_DB, receipts: finalReceipts, paymentGroups: paymentGroupsWithTotals
        });
        
        const emailResponse = await fetch(sendEmailApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: customerInfo.email,
            subject: '【松栄寿し】ご注文内容の確認',
            bodyHtml: emailHtml,
          }),
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          throw new Error(errorData.message || 'メールの送信に失敗しました。');
        }
        console.log('メール送信成功:', await emailResponse.json());
      }
      
      // --- 全て成功した場合の処理 ---
      if (isConfirmationOpen) setIsConfirmationOpen(false);
      alert('注文が正常に送信されました。');
      resetForm();

    } catch (error) {
      console.error('注文の送信中にエラーが発生しました:', error);
      alert(`エラー: ${error.message}`);
    }
  };

  const uniqueOrderDates = [...new Set(orders.map(o => o.orderDate).filter(Boolean))];

  return (
    <div className="main-container">
      {isLoggedIn && ( <Header onLogout={handleLogout}  allocationNumber={allocationNumber} onAllocationChange={handleAllocationNumberChange} /> )}
      {isConfirmationOpen && ( <ConfirmationModal onClose={() => setIsConfirmationOpen(false)} onSubmit={handleSubmit} customerInfo={customerInfo} orders={orders} receptionNumber={receptionNumber} allocationNumber={allocationNumber} calculateOrderTotal={calculateOrderTotal} generateOrderNumber={generateOrderNumber} calculateGrandTotal={calculateGrandTotal} isPaymentOptionsOpen={isPaymentOptionsOpen} SIDE_ORDERS_DB={SIDE_ORDERS_DB} receipts={finalReceipts} paymentGroups={paymentGroupsWithTotals} /> )}
      {isSidebarOpen && ( <> <div className="overlay" onClick={() => setIsSidebarOpen(false)}></div> <div className="sidebar"> <div className="sidebar-header"> <h3>{isLoggedIn ? '店舗情報' : 'ログイン'}</h3> <button onClick={() => setIsSidebarOpen(false)} className="sidebar-close-btn"> <CloseIcon size={24} /> </button> </div> <SidebarInfoSection isLoggedIn={isLoggedIn} onLogin={handleLogin} allocationNumber={allocationNumber} onAllocationChange={handleAllocationNumberChange} receptionNumber={receptionNumber} onReceptionChange={handleReceptionNumberChange} /> </div> </> )}
      <div className="main-content">
        <div className="form-container">
          <div className="form-header"> <h1 className="form-title">注文フォーム</h1> <button onClick={() => setIsSidebarOpen(true)} className="hamburger-menu-btn" title="ログイン/店舗情報"> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /> </svg> </button> </div>
          <div className="order-detail-container">
            <CustomerInfoSection formData={customerInfo} handleInputChange={handleCustomerInfoChange} />
            {orders.map((order, index) => {
              const orderNumberDisplay = generateOrderNumber(order, receptionNumber, index);
              return (
                <SingleOrderSection
                  key={order.id}
                  order={order}
                  orderIndex={index}
                  updateOrder={updateOrder}
                  deleteOrder={deleteOrder}
                  PRODUCTS={PRODUCTS}
                  SIDE_ORDERS_DB={SIDE_ORDERS_DB}
                  isDeletable={orders.length > 1}
                  orderNumberDisplay={orderNumberDisplay}
                  calculateOrderTotal={calculateOrderTotal}
                  addSideOrder={addSideOrder}
                  updateSideOrderQuantity={updateSideOrderQuantity}
                  removeSideOrder={removeSideOrder}
                />
              );
            })}
            <div className="add-order-container"> <button type="button" onClick={addOrder} className="add-order-btn"> <Plus size={20} /> 別日・別の届け先の注文を追加する </button> </div>
            <div className="payment-info-section">
              <h2 className="payment-info-title">お支払い・書類設定</h2>
              <div className="payment-options-container always-open">
                <div className="payment-info-fields-container">
                  <div className="payment-info-field"> <label className="payment-info-label"> 支払い方法 <span className="required-mark">*</span> </label> <select name="paymentMethod" value={customerInfo.paymentMethod} onChange={handleCustomerInfoChange} className="payment-info-select"> <option value="">選択してください</option> <option value="現金">現金</option> <option value="銀行振込">銀行振込</option> <option value="クレジットカード">クレジットカード</option> <option value="請求書払い">請求書払い</option> </select> </div>
                  <div className="payment-info-field"> <label className="payment-info-label"> 領収書・請求書の宛名（自動作成用） </label> <input type="text" name="invoiceName" value={customerInfo.invoiceName} onChange={handleCustomerInfoChange} className="payment-info-input" placeholder="株式会社○○○" /> </div>
              </div>
                <div className="payment-option-item">
                  <button type="button" onClick={handleToggleCombinedPayment} className="payment-option-title-button"> ・まとめてお支払いの有無 </button>
                  {isCombinedPaymentSummaryOpen && orders.length > 1 && (
                    <div className="combined-payment-summary">
                      <div className="payment-groups-container">
                        {paymentGroupsWithTotals.map((group, index) => (
                          <div key={group.id} className="payment-group">
                            <div className="payment-group-header">
                              <h4>支払日#{index + 1}</h4>
                              <button onClick={() => removePaymentGroup(group.id)} className="remove-group-btn"><Trash2 size={16} /></button>
                            </div>
                            <div className="combined-payment-field">
                              <label className="combined-payment-label">支払日</label>
                              <select value={group.paymentDate} onChange={(e) => updatePaymentGroup(group.id, 'paymentDate', e.target.value)} className="combined-payment-select" >
                                <option value="">支払日を選択</option>
                                {uniqueOrderDates.map(date => (<option key={date} value={date}>{date}</option>))}
                              </select>
                            </div>
                            <div className="order-checklist-container">
                              <p>この日にお支払いをする注文を選択:</p>
                              {orders.map(order => (
                                <div key={order.id} className="order-checklist-item">
                                  <input type="checkbox" id={`order-check-${group.id}-${order.id}`} checked={!!group.checkedOrderIds[order.id]} onChange={() => handleGroupOrderCheck(group.id, order.id)} />
                                  <label htmlFor={`order-check-${group.id}-${order.id}`}> {generateOrderNumber(order, receptionNumber, index)} ({order.orderDate || '日付未定'}) - ¥{calculateOrderTotal(order).toLocaleString()} </label>
                                </div>
                              ))}
                            </div>
                            <div className="daily-payment-summary">
                              <div className="daily-payment-row total">
                                <strong>合計金額:</strong>
                                <span>¥{group.total.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={addPaymentGroup} className="add-group-btn"> <Plus size={16} /> 支払日を追加 </button>
                    </div>
                  )}
                </div>
                <div className="payment-option-item">
                  <button type="button" onClick={handleToggleReceiptDetails} className="payment-option-title-button"> ・領収書・請求書の詳細指定 </button>
                  {isReceiptDetailsOpen && (
                    <div className="receipt-details-container">
                      <div className="receipt-groups-container">
                        {manualReceipts.map((receipt, index) => (
                          <div key={receipt.id} className="receipt-group">
                            <div className="receipt-group-header">
                              <h4>詳細 #{index + 1}</h4>
                              <button onClick={() => removeReceipt(receipt.id)} className="remove-group-btn"><Trash2 size={16} /></button>
                            </div>
                            <div className="receipt-input-grid">
                              <div className="combined-payment-field">
                                <label className="combined-payment-label">種別</label>
                                <select className="combined-payment-select" value={receipt.documentType} onChange={(e) => updateReceipt(receipt.id, 'documentType', e.target.value)} >
                                  <option value="領収書">領収書</option>
                                  <option value="請求書">請求書</option>
                                </select>
                              </div>
                              <div className="combined-payment-field">
                                <label className="combined-payment-label">発行日</label>
                                <select className="combined-payment-select" value={receipt.issueDate} onChange={(e) => updateReceipt(receipt.id, 'issueDate', e.target.value)}>
                                  <option value="">発行日を選択</option>
                                  {uniqueOrderDates.map(date => (<option key={date} value={date}>{date}</option>))}
                                </select>
                              </div>
                              <div className="combined-payment-field">
                                <label className="combined-payment-label">宛名</label>
                                <input type="text" className="payment-info-input" placeholder="株式会社○○○" value={receipt.recipientName} onChange={(e) => updateReceipt(receipt.id, 'recipientName', e.target.value)} />
                              </div>
                              <div className="combined-payment-field">
                                <label className="combined-payment-label">金額</label>
                                <input type="number" className="payment-info-input" placeholder="0" value={receipt.amount} onChange={(e) => updateReceipt(receipt.id, 'amount', e.target.value)} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={addReceipt} className="add-group-btn"> <Plus size={16} /> 領収書/請求書を追加 </button>
                    </div>
                  )}
                </div>
              </div>
              
            </div>
            <div className="submit-container"> 
              <button type="button" onClick={handleOpenConfirmation} className="confirm-btn"> 注文内容を確認 </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default OrderForm;