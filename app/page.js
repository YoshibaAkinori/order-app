"use client";
import React, { useState } from 'react';
import { Send, Plus, X as CloseIcon } from 'lucide-react';
import CustomerInfoSection from '../components/CustomerInfoSection';
import SingleOrderSection from '../components/SingleOrderSection';
import SidebarInfoSection from '../components/SidebarInfoSection';
import Header from '../components/Header';
import ConfirmationModal from '../components/ConfirmationModal';

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
  const [customerInfo, setCustomerInfo] = useState({
    storeNumber: '', contactName: '', email: '', fax: '', tel: '', companyName: '', department: '',
    paymentMethod: '', invoiceName: '',
    useCombinedPayment: false,
  });
  const createNewOrder = () => ({
    id: Date.now(), orderDate: '', orderTime: '', deliveryAddress: '', deliveryMethod: '',
    hasNetaChange: false,
    netaChangeDetails: '', 
    netaChanges: {},
    sideOrders: [],
    orderItems: Object.keys(PRODUCTS).map(key => ({ productKey: key, name: PRODUCTS[key].name, unitPrice: PRODUCTS[key].price, quantity: 0, notes: '' }))
  });
  const [orders, setOrders] = useState([createNewOrder()]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPaymentOptionsOpen, setIsPaymentOptionsOpen] = useState(false);
  const [isCombinedPaymentSummaryOpen, setIsCombinedPaymentSummaryOpen] = useState(false);
  const [allocationNumber, setAllocationNumber] = useState('');
  const [receptionNumber, setReceptionNumber] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

  const handleLogin = () => setIsLoggedIn(true);
  const handleLogout = () => setIsLoggedIn(false);
  const handleReceptionNumberChange = (e) => setReceptionNumber(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase());
  const handleAllocationNumberChange = (e) => setAllocationNumber(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase());
  
  const handleCustomerInfoChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCustomerInfo(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const updateOrder = (orderId, updatedFields) => setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updatedFields } : o));
  const addOrder = () => setOrders(prev => [...prev, createNewOrder()]);
  const deleteOrder = (orderId) => setOrders(prev => prev.filter(o => o.id !== orderId));
  
  const handleSubmit = () => {
    const finalData = { customer: customerInfo, orders: orders, receptionNumber, allocationNumber };
    console.log('最終的な注文データ:', finalData);
    if (isConfirmationOpen) setIsConfirmationOpen(false);
    alert('注文を送信します（コンソール確認）');
  };

  const calculateOrderTotal = (order) => {
    const mainTotal = order.orderItems.reduce((total, item) => total + ((parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity) || 0)), 0);
    const sideTotal = (order.sideOrders || []).reduce((total, item) => {
      const price = SIDE_ORDERS_DB[item.productKey]?.price || 0;
      return total + (price * (parseInt(item.quantity) || 0));
    }, 0);
    return mainTotal + sideTotal;
  };
  const calculateGrandTotal = () => orders.reduce((total, order) => total + calculateOrderTotal(order), 0);
  
  const generateOrderNumber = (order, allocNum) => {
    if (!order.orderDate || !allocNum) return '未設定';
    const match = order.orderDate.match(/(\d{1,2})日/);
    return match && match[1] ? `${match[1].padStart(2, '0')}${allocNum}` : '日付エラー';
  };

  const handleToggleCombinedPayment = () => {
    const newOpenState = !isCombinedPaymentSummaryOpen;
    setIsCombinedPaymentSummaryOpen(newOpenState);
    setCustomerInfo(prev => ({ ...prev, useCombinedPayment: newOpenState }));
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
          .filter(item => item.quantity > 0); // 0になったらリストから削除
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

  return (
    <div className="main-container">
      {isLoggedIn && ( <Header onLogout={handleLogout} receptionNumber={receptionNumber} onReceptionChange={handleReceptionNumberChange} allocationNumber={allocationNumber} onAllocationChange={handleAllocationNumberChange} /> )}
      {isConfirmationOpen && ( <ConfirmationModal onClose={() => setIsConfirmationOpen(false)} onSubmit={handleSubmit} customerInfo={customerInfo} orders={orders} receptionNumber={receptionNumber} allocationNumber={allocationNumber} calculateOrderTotal={calculateOrderTotal} generateOrderNumber={generateOrderNumber} calculateGrandTotal={calculateGrandTotal} isPaymentOptionsOpen={isPaymentOptionsOpen} SIDE_ORDERS_DB={SIDE_ORDERS_DB} /> )}
      {isSidebarOpen && ( <> <div className="overlay" onClick={() => setIsSidebarOpen(false)}></div> <div className="sidebar"> <div className="sidebar-header"> <h3>ログイン</h3> <button onClick={() => setIsSidebarOpen(false)} className="sidebar-close-btn"> <CloseIcon size={24} /> </button> </div> <SidebarInfoSection onLogin={handleLogin} /> </div> </> )}
      <div className="main-content">
        <div className="form-container">
          <div className="form-header"> <h1 className="form-title">注文フォーム</h1> {!isLoggedIn && ( <button onClick={() => setIsSidebarOpen(true)} className="hamburger-menu-btn" title="ログイン"> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /> </svg> </button> )} </div>
          <div className="order-detail-container">
            <CustomerInfoSection formData={customerInfo} handleInputChange={handleCustomerInfoChange} />
            {orders.map((order, index) => (
                <SingleOrderSection
                  key={order.id}
                  order={order}
                  orderIndex={index}
                  updateOrder={updateOrder}
                  deleteOrder={deleteOrder}
                  PRODUCTS={PRODUCTS}
                  SIDE_ORDERS_DB={SIDE_ORDERS_DB}
                  isDeletable={index > 0}
                  orderNumberDisplay={generateOrderNumber(order, allocationNumber)}
                  addSideOrder={addSideOrder}
                  updateSideOrderQuantity={updateSideOrderQuantity}
                  removeSideOrder={removeSideOrder}
                />
            ))}
            <div className="add-order-container"> <button type="button" onClick={addOrder} className="add-order-btn"> <Plus size={20} /> 別日・別の届け先の注文を追加する </button> </div>
            <div className="payment-info-section">
              <h2 className="payment-info-title">お支払い情報</h2>
              <div className="payment-option-toggle-wrapper"> <button type="button" onClick={() => setIsPaymentOptionsOpen(!isPaymentOptionsOpen)} className={`payment-option-toggle-btn ${isPaymentOptionsOpen ? 'active' : 'inactive'}`} > {isPaymentOptionsOpen ? '✓ オプション設定' : 'オプション設定'} </button> <div className="payment-option-note"> <p>お支払い方法が以下の場合はクリックしてください</p> <p>・まとめてお支払いしたい</p> <p>・領収書を複数枚に分けたい</p> </div> </div>
              {isPaymentOptionsOpen && ( <div className="payment-options-container"> <div className="payment-option-item"> <button type="button" onClick={handleToggleCombinedPayment} className="payment-option-title-button"> ・まとめてお支払いの有無 </button> {isCombinedPaymentSummaryOpen && orders.length > 1 && ( <div className="combined-payment-summary"> <table className="summary-table"> <thead> <tr> <th>お届け日時</th> <th>注文番号</th> <th>金額</th> </tr> </thead> <tbody> {orders.map((order) => ( <tr key={order.id}> <td>{order.orderDate || '未定'} {order.orderTime}</td> <td>{generateOrderNumber(order, allocationNumber)}</td> <td className="text-right">{calculateOrderTotal(order).toLocaleString()}円</td> </tr> ))} </tbody> </table> </div> )} </div> <div className="payment-option-item"> <button type="button" className="payment-option-title-button"> ・領収書の詳細指定 </button> </div> </div> )}
              <div className="payment-info-fields-container">
                <div className="payment-info-field"> <label className="payment-info-label"> 支払い方法 <span className="required-mark">*</span> </label> <select name="paymentMethod" value={customerInfo.paymentMethod} onChange={handleCustomerInfoChange} className="payment-info-select"> <option value="">選択してください</option> <option value="現金">現金</option> <option value="銀行振込">銀行振込</option> <option value="クレジットカード">クレジットカード</option> <option value="請求書払い">請求書払い</option> </select> </div>
                <div className="payment-info-field"> <label className="payment-info-label"> 領収書・請求書の宛名 </label> <input type="text" name="invoiceName" value={customerInfo.invoiceName} onChange={handleCustomerInfoChange} className="payment-info-input" placeholder="株式会社○○○" /> </div>
              </div>
            </div>
            <div className="submit-container"> <button type="button" onClick={() => setIsConfirmationOpen(true)} className="confirm-btn"> 注文内容を確認 </button> </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default OrderForm;