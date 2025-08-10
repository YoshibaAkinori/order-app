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
  megumi: { name: '恵', price: 2480, neta: ['まぐろ', 'サーモン', 'えび', 'いか', 'たまご', 'きゅうり巻き'] },
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

  const initialCustomerInfo = {
    storeNumber: '', contactName: '', email: '', fax: '', tel: '', companyName: '', department: '',
    paymentMethod: '', invoiceName: '',
    useCombinedPayment: false,
    floorNumber: '',
    searchId: ''
  };

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

  const [originalOrderType, setOriginalOrderType] = useState('');

  const handleSearch = async () => {
    if (!searchId) {
      alert('受付番号または注文番号を入力してください。');
      return;
    }
    setIsLoading(true);
    setIsDataLoaded(false);

    // 入力されたIDが注文番号(6桁)か、受付番号(3桁)かを判断
    let receptionNumToSearch = searchId;
    let searchedOrderId = null; // 検索に使われた注文番号を記憶

    if (searchId.length === 6) {
      // 注文番号の場合、3~5文字目を抜き出して受付番号とする
      receptionNumToSearch = searchId.substring(2, 5);
      searchedOrderId = searchId;
      console.log(`注文番号 ${searchId} から、受付番号 ${receptionNumToSearch} を抽出しました。`);
    } else {
      console.log(`受付番号 ${searchId} で検索します...`);
    }

    try {
      // ★ あなたのAPI GatewayのURLに置き換えてください
      const apiUrl = `https://viy41bgkvd.execute-api.ap-northeast-1.amazonaws.com/orders/${receptionNumToSearch}`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '注文データの取得に失敗しました。');
      }
      const data = await response.json();
      console.log('APIから取得したデータ:', data);

      // --- 取得したデータをStateにセット ---
      setCustomerInfo(data.customer);
      setReceptionNumber(data.receptionNumber);
      setAllocationNumber(data.allocationNumber);
      setPaymentGroups(data.paymentGroups || []);
      setManualReceipts(data.receipts || []);

      // --- 注文リストを全商品とマージ & 順番を入れ替え ---
      const loadedOrders = data.orders.map((dbOrder, index) => {
        // 全商品リストをベースに、注文された商品の個数を反映
        const mergedOrderItems = Object.keys(PRODUCTS).map(productKey => {
          const masterProduct = PRODUCTS[productKey];
          // DBから読み込んだ注文アイテムの中から、同じproductKeyを持つものを探す
          const orderedItem = (dbOrder.orderItems || []).find(item => item.productKey === productKey);
          
          return {
            productKey: productKey,
            name: masterProduct.name,
            unitPrice: masterProduct.price,
            quantity: orderedItem ? orderedItem.quantity : 0, // 注文があればその個数、なければ0
          };
        });

        return { 
          ...dbOrder, 
          orderItems: mergedOrderItems,
          sequence: dbOrder.sequence || parseInt(dbOrder.id.slice(-1), 10) || index + 1
        };
      });

      if ((data.paymentGroups && data.paymentGroups.length > 0) || (data.receipts && data.receipts.length > 0)) {
        setIsPaymentOptionsOpen(true);
        if(data.paymentGroups && data.paymentGroups.length > 0) setIsCombinedPaymentSummaryOpen(true);
        if(data.receipts && data.receipts.length > 0) setIsReceiptDetailsOpen(true);
      } else {
        setIsPaymentOptionsOpen(false);
        setIsCombinedPaymentSummaryOpen(false);
        setIsReceiptDetailsOpen(false);
      }

      // もし注文番号で検索されていたら、その注文を一番上に持ってくる
      if (searchedOrderId) {
        loadedOrders.sort((a, b) => {
          const aNum = generateOrderNumber(a, data.receptionNumber, data.orders.findIndex(o => o.id === a.id));
          const bNum = generateOrderNumber(b, data.receptionNumber, data.orders.findIndex(o => o.id === b.id));
          if (aNum === searchedOrderId) return -1;
          if (bNum === searchedOrderId) return 1;
          return 0;
        });
      }

      setOrders(loadedOrders);
      setIsDataLoaded(true);
      setOriginalOrderType(data.orderType || '不明');
    } catch (error) {
      alert(`エラー: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
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
  const addPaymentGroup = () => {
    const newGroup = { id: Date.now(), paymentDate: '', checkedOrderIds: {} };
    setPaymentGroups(prev => [...prev, newGroup]);
    // 支払いグループを追加したら、領収書の詳細を自動的に開く
    setIsReceiptDetailsOpen(true); 
  };
const removePaymentGroup = (groupId) => {
    setPaymentGroups(prev => prev.filter(group => group.id !== groupId));
  };
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
  const isReceiptAutomated = paymentGroups.length > 0;
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

  React.useEffect(() => {
    // 支払いグループが1つもなければ、何もしない（手動モード）
    if (paymentGroups.length === 0) {
      // 念のため、自動生成された可能性のあるデータをクリアする
      if (manualReceipts.some(r => r.groupId)) {
        setManualReceipts([]);
      }
      return;
    }

    const newManualReceipts = paymentGroupsWithTotals.map(group => {
      // 支払い方法に基づいて書類種別を決定
      const docType = getDocumentType(customerInfo.paymentMethod) || '領収書';
      
      return {
        id: group.id, // IDをグループと一致させる
        groupId: group.id, // グループとの関連付けID
        documentType: docType,
        issueDate: group.paymentDate, // 支払日を発行日とする
        recipientName: customerInfo.invoiceName, // 宛名は顧客情報から取得
        amount: group.total, // 金額はグループの合計金額
      };
    });

    setManualReceipts(newManualReceipts);

  }, [paymentGroupsWithTotals, customerInfo.invoiceName, customerInfo.paymentMethod]);

  const uniqueOrderDates = [...new Set(orders.map(o => o.orderDate).filter(Boolean))];

  const handleUpdate = async () => {
    // ★ あなたのAPI GatewayのURLに置き換えてください
    const updateApiUrl = `https://viy41bgkvd.execute-api.ap-northeast-1.amazonaws.com/orders/${receptionNumber}`;

    const updatedData = {
      customer: customerInfo,
      orders,
      receptionNumber,
      allocationNumber,
      paymentGroups: paymentGroupsWithTotals,
      receipts: manualReceipts,
      SIDE_ORDERS_DB, // Lambda側で単価を引くために追加
      orderType: '変更',
    };
    
    console.log("更新するデータ:", updatedData);
    
    try {
      const response = await fetch(updateApiUrl, {
        method: 'PUT', // ★ 更新なのでPUTメソッドを使用
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '注文の更新に失敗しました。');
      }

      const result = await response.json();
      console.log('APIからの成功応答:', result);

      alert('注文内容を正常に更新しました。');
      setIsConfirmationOpen(false);
      resetForm();
      // ここではフォームのリセットはしない

    } catch (error) {
      console.error('注文の更新中にエラーが発生しました:', error);
      alert(`エラー: ${error.message}`);
    }
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
  
  const createNewOrder = () => ({
    id: Date.now(), orderDate: '', orderTime: '', deliveryAddress: '', deliveryMethod: '',
    hasNetaChange: false,
    netaChangeDetails: '', 
    netaChanges: {},
    sideOrders: [],
    orderItems: Object.keys(PRODUCTS).map(key => ({ productKey: key, name: PRODUCTS[key].name, unitPrice: PRODUCTS[key].price, quantity: 0, notes: '' }))
  });

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
          orderType="変更"
        />
      )}

      <div className="main-content">
        <div className="form-container">
          <div className="form-header"> <h1 className="form-title">注文変更</h1> </div>
          <div className="search-container">
            {/* ★★★ ここからが修正箇所2: placeholderの変更 ★★★ */}
            <input type="text" value={searchId} onChange={(e) => setSearchId(e.target.value.toUpperCase())} className="search-input" placeholder="受付番号 (A2A) または注文番号 (25A2A1) を入力" />
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
                                    <label htmlFor={`order-check-${group.id}-${order.id}`}> {generateOrderNumber(order, receptionNumber)} ({order.orderDate || '日付未定'}) - ¥{calculateOrderTotal(order).toLocaleString()} </label>
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