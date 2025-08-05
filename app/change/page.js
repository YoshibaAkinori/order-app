"use client";
import React, { useState, useMemo } from 'react';
import { Search, Send, Plus, X as CloseIcon, Trash2 } from 'lucide-react';
import CustomerInfoSection from '../../components/CustomerInfoSection';
import SingleOrderSection from '../../components/SingleOrderSection';
import Header from '../../components/Header';
import ConfirmationModal from '../../components/ConfirmationModal';
import { generateEmailHtml } from '../../utils/emailGenerator';

// --- 全商品・その他注文のマスターデータ ---
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
// --- ここまでマスターデータ ---

// --- UI確認用の仮データ ---
const MOCK_DB_DATA = {
  receptionNumber: 'UK123',
  allocationNumber: 'A',
  customer: {
    contactName: 'テスト顧客', email: 'test@example.com', tel: '090-1234-5678',
    companyName: '株式会社テスト', department: '開発部', floorNumber: '3',
    paymentMethod: '請求書払い', invoiceName: '株式会社テスト宛',
    useCombinedPayment: true,
  },
  orders: [
    {
      id: 1, orderDate: '2025年12月25日', orderTime: '12:00',
      deliveryAddress: 'テスト用住所1', deliveryMethod: '出前',
      orderItems: [{ productKey: 'kei', quantity: 5 }],
      sideOrders: [{ productKey: 'side-tea', quantity: 5 }],
      netaChanges: {},
    },
    {
      id: 2, orderDate: '2025年12月26日', orderTime: '18:00',
      deliveryAddress: 'テスト用住所2', deliveryMethod: '東口受け取り',
      orderItems: [{ productKey: 'izumi', quantity: 3 }],
      sideOrders: [],
      netaChanges: {},
    }
  ],
  paymentGroups: [
    { id: 11, paymentDate: '2025年12月25日', checkedOrderIds: { 1: true }, total: 13150 }
  ],
  receipts: [
    { id: 21, documentType: '請求書', issueDate: '2025年12月25日', recipientName: '株式会社テスト宛', amount: 13150 }
  ]
};
// --- ここまで仮データ ---

const ChangeOrderPage = () => {
  const [searchId, setSearchId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  const [customerInfo, setCustomerInfo] = useState({});
  const [orders, setOrders] = useState([]);
  const [receptionNumber, setReceptionNumber] = useState('');
  const [allocationNumber, setAllocationNumber] = useState('');
  const [isPaymentOptionsOpen, setIsPaymentOptionsOpen] = useState(false);
  const [isCombinedPaymentSummaryOpen, setIsCombinedPaymentSummaryOpen] = useState(false);
  const [paymentGroups, setPaymentGroups] = useState([]);
  const [isReceiptDetailsOpen, setIsReceiptDetailsOpen] = useState(false);
  const [manualReceipts, setManualReceipts] = useState([]);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  
  const handleSearch = () => {
    setIsLoading(true);
    console.log(`「${searchId}」で検索します...`);
    
    setTimeout(() => {
      setCustomerInfo(MOCK_DB_DATA.customer);
      setReceptionNumber(MOCK_DB_DATA.receptionNumber);
      setAllocationNumber(MOCK_DB_DATA.allocationNumber);
      setPaymentGroups(MOCK_DB_DATA.paymentGroups);
      setManualReceipts(MOCK_DB_DATA.receipts);

      const loadedOrders = MOCK_DB_DATA.orders.map(mockOrder => {
        const mergedOrderItems = Object.keys(PRODUCTS).map(productKey => {
          const masterProduct = PRODUCTS[productKey];
          const orderedItem = mockOrder.orderItems.find(item => item.productKey === productKey);
          return {
            productKey: productKey, name: masterProduct.name, unitPrice: masterProduct.price,
            quantity: orderedItem ? orderedItem.quantity : 0,
          };
        });
        return { ...mockOrder, orderItems: mergedOrderItems };
      });
      setOrders(loadedOrders);

      if (MOCK_DB_DATA.paymentGroups.length > 0 || MOCK_DB_DATA.receipts.length > 0) {
        setIsPaymentOptionsOpen(true);
        if(MOCK_DB_DATA.paymentGroups.length > 0) setIsCombinedPaymentSummaryOpen(true);
        if(MOCK_DB_DATA.receipts.length > 0) setIsReceiptDetailsOpen(true);
      }
      
      setIsLoading(false);
      setIsDataLoaded(true);
    }, 500);
  };
  
  const handleCustomerInfoChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCustomerInfo(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };
  const updateOrder = (orderId, updatedFields) => setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updatedFields } : o));
  const addOrder = () => {
    const newOrder = {
      id: Date.now(), orderDate: '', orderTime: '', deliveryAddress: '', deliveryMethod: '',
      hasNetaChange: false, netaChangeDetails: '', netaChanges: {}, sideOrders: [],
      orderItems: Object.keys(PRODUCTS).map(key => ({ productKey: key, name: PRODUCTS[key].name, unitPrice: PRODUCTS[key].price, quantity: 0, notes: '' }))
    };
    setOrders(prev => [...prev, newOrder]);
  };
  const deleteOrder = (orderId) => setOrders(prev => prev.filter(o => o.id !== orderId));
  const calculateOrderTotal = (order) => {
    const mainTotal = (order.orderItems || []).reduce((total, item) => total + ((parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity) || 0)), 0);
    const sideTotal = (order.sideOrders || []).reduce((total, item) => {
      const price = SIDE_ORDERS_DB[item.productKey]?.price || 0;
      return total + (price * (parseInt(item.quantity) || 0));
    }, 0);
    return mainTotal + sideTotal;
  };
  const calculateGrandTotal = () => orders.reduce((total, order) => total + calculateOrderTotal(order), 0);
  const generateOrderNumber = (order, recNum, index) => {
    if (!recNum || recNum === 'エラー' || typeof index === 'undefined') { return '---'; }
    const dateMatch = order.orderDate.match(/(\d{1,2})日/);
    const day = (dateMatch && dateMatch[1]) ? dateMatch[1].padStart(2, '0') : '00';
    return `${day}${recNum}${index + 1}`;
  };
  const handleToggleCombinedPayment = () => setIsCombinedPaymentSummaryOpen(prev => !prev);
  const handleToggleReceiptDetails = () => setIsReceiptDetailsOpen(prev => !prev);
  const addPaymentGroup = () => setPaymentGroups(prev => [...prev, { id: Date.now(), paymentDate: '', checkedOrderIds: {} }]);
  const removePaymentGroup = (groupId) => setPaymentGroups(prev => prev.filter(g => g.id !== groupId));
  const updatePaymentGroup = (groupId, field, value) => setPaymentGroups(prev => prev.map(g => g.id === groupId ? { ...g, [field]: value } : g));
  const handleGroupOrderCheck = (groupId, orderId) => {
    setPaymentGroups(prevGroups => prevGroups.map(group => {
      if (group.id === groupId) {
        const newChecked = { ...group.checkedOrderIds };
        if (newChecked[orderId]) { delete newChecked[orderId]; } else { newChecked[orderId] = true; }
        return { ...group, checkedOrderIds: newChecked };
      }
      return group;
    }));
  };
  const addReceipt = () => setManualReceipts(prev => [...prev, { id: Date.now(), issueDate: '', recipientName: '', amount: '', documentType: '領収書' }]);
  const removeReceipt = (receiptId) => setManualReceipts(prev => prev.filter(r => r.id !== receiptId));
  const updateReceipt = (receiptId, field, value) => setManualReceipts(prev => prev.map(r => r.id === receiptId ? { ...r, [field]: value } : r));
  
  // ★★★ ここからが追加箇所 ★★★
  const addSideOrder = (orderId, productKey) => {
    if (!productKey) return;
    setOrders(prevOrders => prevOrders.map(order => {
      if (order.id === orderId) {
        const exists = order.sideOrders.some(item => item.productKey === productKey);
        if (exists) return order;
        const newSideOrder = { productKey, quantity: 1 };
        return { ...order, sideOrders: [...(order.sideOrders || []), newSideOrder] };
      }
      return order;
    }));
  };

  const updateSideOrderQuantity = (orderId, productKey, quantity) => {
    const finalQuantity = parseInt(String(quantity).replace(/[０-９]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xFEE0)), 10) || 0;
    setOrders(prevOrders => prevOrders.map(order => {
      if (order.id === orderId) {
        const updatedSideOrders = (order.sideOrders || [])
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
        const updatedSideOrders = (order.sideOrders || []).filter(item => item.productKey !== productKey);
        return { ...order, sideOrders: updatedSideOrders };
      }
      return order;
    }));
  };
  // ★★★ ここまでが追加箇所 ★★★

  const paymentGroupsWithTotals = useMemo(() => {
    return paymentGroups.map(group => {
      const groupTotal = orders.reduce((total, order) => {
        if (group.checkedOrderIds[order.id]) { return total + calculateOrderTotal(order); }
        return total;
      }, 0);
      return { ...group, total: groupTotal };
    });
  }, [paymentGroups, orders]);
  
  const uniqueOrderDates = [...new Set(orders.map(o => o.orderDate).filter(Boolean))];

  const handleUpdate = () => {
    const updatedData = {
      customer: customerInfo,
      orders,
      receptionNumber,
      allocationNumber,
      paymentGroups: paymentGroupsWithTotals,
      receipts: manualReceipts
    };
    console.log("更新するデータ:", updatedData);
    alert('注文内容を更新しました。（実際には更新APIを呼び出します）');
    setIsConfirmationOpen(false);
  };
  
  const getDocumentType = (paymentMethod) => {
    if (['現金', 'クレジットカード'].includes(paymentMethod)) return '領収書';
    if (['銀行振込', '請求書払い'].includes(paymentMethod)) return '請求書';
    return '';
  };

  const autoGeneratedReceipts = useMemo(() => {
    if (!isPaymentOptionsOpen) {
        if (!customerInfo.paymentMethod || !customerInfo.invoiceName) return [];
        const docType = getDocumentType(customerInfo.paymentMethod);
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

  return (
    <div className="main-container">
      <Header
        onLogout={() => {}}
        allocationNumber={allocationNumber}
        onAllocationChange={(e) => setAllocationNumber(e.target.value)}
      />
      
      {isConfirmationOpen && (
        <ConfirmationModal
          onClose={() => setIsConfirmationOpen(false)}
          onSubmit={handleUpdate}
          customerInfo={customerInfo}
          orders={orders}
          receptionNumber={receptionNumber}
          allocationNumber={allocationNumber}
          calculateOrderTotal={calculateOrderTotal}
          generateOrderNumber={generateOrderNumber}
          calculateGrandTotal={calculateGrandTotal}
          isPaymentOptionsOpen={isPaymentOptionsOpen}
          SIDE_ORDERS_DB={SIDE_ORDERS_DB}
          receipts={finalReceipts}
          paymentGroups={paymentGroupsWithTotals}
        />
      )}

      <div className="main-content">
        <div className="form-container">
          <div className="form-header"> <h1 className="form-title">注文変更</h1> </div>
          <div className="search-container">
            <input type="text" value={searchId} onChange={(e) => setSearchId(e.target.value)} className="search-input" placeholder="受付番号を入力してください" />
            <button onClick={handleSearch} className="search-button" disabled={isLoading}> <Search size={20} /> {isLoading ? '検索中...' : '検索'} </button>
          </div>
          {isDataLoaded && (
            <div className="order-detail-container">
              <CustomerInfoSection formData={customerInfo} handleInputChange={handleCustomerInfoChange} />
              {orders.map((order, index) => (
                <SingleOrderSection
                  key={order.id} order={order} orderIndex={index} updateOrder={updateOrder} deleteOrder={deleteOrder}
                  PRODUCTS={PRODUCTS} SIDE_ORDERS_DB={SIDE_ORDERS_DB} isDeletable={orders.length > 1}
                  orderNumberDisplay={generateOrderNumber(order, receptionNumber, index)}
                  calculateOrderTotal={calculateOrderTotal}
                  addSideOrder={addSideOrder}
                  updateSideOrderQuantity={updateSideOrderQuantity}
                  removeSideOrder={removeSideOrder}
                />
              ))}
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
                                <h4>支払グループ #{index + 1}</h4>
                                <button onClick={() => removePaymentGroup(group.id)} className="remove-group-btn"><Trash2 size={16} /></button>
                              </div>
                              <div className="combined-payment-field">
                                <label className="combined-payment-label">支払日</label>
                                <select value={group.paymentDate} onChange={(e) => updatePaymentGroup(group.id, 'paymentDate', e.target.value)} className="combined-payment-select">
                                  <option value="">支払日を選択</option>
                                  {uniqueOrderDates.map(date => (<option key={date} value={date}>{date}</option>))}
                                </select>
                              </div>
                              <div className="order-checklist-container">
                                <p>このグループに含める注文を選択:</p>
                                {orders.map((order, orderIndex) => (
                                  <div key={order.id} className="order-checklist-item">
                                    <input type="checkbox" id={`order-check-${group.id}-${order.id}`} checked={!!group.checkedOrderIds[order.id]} onChange={() => handleGroupOrderCheck(group.id, order.id)} />
                                    <label htmlFor={`order-check-${group.id}-${order.id}`}> {generateOrderNumber(order, receptionNumber, orderIndex)} ({order.orderDate || '日付未定'}) - ¥{calculateOrderTotal(order).toLocaleString()} </label>
                                  </div>
                                ))}
                              </div>
                              <div className="daily-payment-summary">
                                <div className="daily-payment-row total"> <strong>グループ合計金額:</strong> <span>¥{group.total.toLocaleString()}</span> </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button onClick={addPaymentGroup} className="add-group-btn"> <Plus size={16} /> 支払グループを追加 </button>
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
                                  <select className="combined-payment-select" value={receipt.documentType} onChange={(e) => updateReceipt(receipt.id, 'documentType', e.target.value)}>
                                    <option value="領収書">領収書</option> <option value="請求書">請求書</option>
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
                                  <input type="text" className="combined-payment-input" placeholder="株式会社○○○" value={receipt.recipientName} onChange={(e) => updateReceipt(receipt.id, 'recipientName', e.target.value)} />
                                </div>
                                <div className="combined-payment-field">
                                  <label className="combined-payment-label">金額</label>
                                  <input type="number" className="combined-payment-input" placeholder="0" value={receipt.amount} onChange={(e) => updateReceipt(receipt.id, 'amount', e.target.value)} />
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
                <button type="button" onClick={() => setIsConfirmationOpen(true)} className="confirm-btn">
                  この内容で更新を確認
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default ChangeOrderPage;