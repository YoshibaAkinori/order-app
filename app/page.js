"use client";
import React, { useState } from 'react';
import { Send, Plus, X as CloseIcon } from 'lucide-react';
import CustomerInfoSection from '../components/CustomerInfoSection';
import SingleOrderSection from '../components/SingleOrderSection';
import SidebarInfoSection from '../components/SidebarInfoSection';

const PRODUCTS = {
  kiwami: { name: '極', price: 3580, neta: ['まぐろ', 'サーモン', 'いくら', 'えび', 'いか', 'うに', 'あなご', 'たまご'] },
  takumi: { name: '匠', price: 3240, neta: ['まぐろ', 'サーモン', 'いくら', 'えび', 'いか', 'たまご', 'きゅうり巻き'] },
  kei: { name: '恵', price: 2480, neta: ['まぐろ', 'サーモン', 'えび', 'いか', 'たまご', 'きゅうり巻き'] },
  izumi: { name: '泉', price: 1890, neta: ['まぐろ', 'サーモン', 'えび', 'たまご', 'きゅうり巻き'] }
};

const OrderForm = () => {
  const [customerInfo, setCustomerInfo] = useState({
    storeNumber: '', contactName: '', email: '', fax: '', tel: '', companyName: '', department: '',
    paymentMethod: '', invoiceName: '',
    useCombinedPayment: false,
  });

  const createNewOrder = () => ({
    id: Date.now(),
    orderDate: '',
    orderTime: '',
    deliveryAddress: '',
    deliveryMethod: '',
    hasNetaChange: false,
    noWasabi: false,
    netaChangeDetails: '',
    netaChanges: {},
    orderItems: Object.keys(PRODUCTS).map(key => ({
      productKey: key, name: PRODUCTS[key].name, unitPrice: PRODUCTS[key].price, quantity: 0, notes: ''
    }))
  });

  const [orders, setOrders] = useState([createNewOrder()]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPaymentOptionsOpen, setIsPaymentOptionsOpen] = useState(false);
  const [isCombinedPaymentSummaryOpen, setIsCombinedPaymentSummaryOpen] = useState(false);
  const [allocationNumber, setAllocationNumber] = useState('');

  const handleAllocationNumberChange = (e) => {
    setAllocationNumber(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase());
  };

  const handleToggleCombinedPayment = () => {
    const newOpenState = !isCombinedPaymentSummaryOpen;
    setIsCombinedPaymentSummaryOpen(newOpenState);
    setCustomerInfo(prev => ({
      ...prev,
      useCombinedPayment: newOpenState
    }));
  };

  const calculateOrderTotal = (order) => {
    return order.orderItems.reduce((total, item) => {
      const price = parseFloat(item.unitPrice) || 0;
      const quantity = parseInt(item.quantity) || 0;
      return total + (price * quantity);
    }, 0);
  };
  
  const generateOrderNumber = (order, allocNum) => {
    if (!order.orderDate || !allocNum) {
      return '未設定';
    }
    const match = order.orderDate.match(/(\d{1,2})日/);
    if (match && match[1]) {
      const day = match[1].padStart(2, '0');
      return `${day}${allocNum}`;
    }
    return '日付エラー';
  };

  const handleCustomerInfoChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCustomerInfo(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const updateOrder = (orderId, updatedFields) => {
    setOrders(prevOrders =>
      prevOrders.map(ord =>
        ord.id === orderId ? { ...ord, ...updatedFields } : ord
      )
    );
  };

  const addOrder = () => {
    setOrders(prevOrders => [...prevOrders, createNewOrder()]);
  };

  const deleteOrder = (orderId) => {
    setOrders(prevOrders => prevOrders.filter(ord => ord.id !== orderId));
  };

  const handleSubmit = () => {
    const finalData = {
      customer: customerInfo,
      orders: orders,
    };
    console.log('最終的な注文データ:', finalData);
    alert('注文を送信します（コンソール確認）');
  };

  return (
    <div className="main-container">
      {isSidebarOpen && (
        <>
          <div className="overlay" onClick={() => setIsSidebarOpen(false)}></div>
          <div className="sidebar">
            <div className="sidebar-header">
              <h3>店舗情報</h3>
              <button onClick={() => setIsSidebarOpen(false)} className="sidebar-close-btn">
                <CloseIcon size={24} />
              </button>
            </div>
            <SidebarInfoSection
              allocationNumber={allocationNumber}
              onAllocationChange={handleAllocationNumberChange}
            />
          </div>
        </>
      )}

      <div className="main-content">
        <div className="form-container">
          <div className="form-header">
            <h1 className="form-title">注文フォーム</h1>
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="hamburger-menu-btn"
              title="店舗情報を表示"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="order-detail-container">
            <CustomerInfoSection formData={customerInfo} handleInputChange={handleCustomerInfoChange} />

            {orders.map((order, index) => {
              const orderNumberDisplay = generateOrderNumber(order, allocationNumber);
              return (
                <SingleOrderSection
                  key={order.id}
                  order={order}
                  orderIndex={index}
                  updateOrder={updateOrder}
                  deleteOrder={deleteOrder}
                  PRODUCTS={PRODUCTS}
                  isDeletable={index > 0}
                  orderNumberDisplay={orderNumberDisplay}
                />
              );
            })}

            <div className="add-order-container">
              <button
                type="button"
                onClick={addOrder}
                className="add-order-btn"
              >
                <Plus size={20} />
                別日・別の届け先の注文を追加する
              </button>
            </div>

            <div className="payment-info-section">
              <h2 className="payment-info-title">お支払い情報</h2>
              <div className="payment-info-fields-container">
                <div className="payment-info-field">
                  <label className="payment-info-label">
                    支払い方法 <span className="required-mark">*</span>
                  </label>
                  <select
                    name="paymentMethod"
                    value={customerInfo.paymentMethod}
                    onChange={handleCustomerInfoChange}
                    className="payment-info-select"
                  >
                    <option value="">選択してください</option>
                    <option value="現金">現金</option>
                    <option value="銀行振込">銀行振込</option>
                    <option value="クレジットカード">クレジットカード</option>
                    <option value="請求書払い">請求書払い</option>
                  </select>
                </div>
                <div className="payment-info-field">
                  <label className="payment-info-label">
                    領収書・請求書の宛名
                  </label>
                  <input
                    type="text"
                    name="invoiceName"
                    value={customerInfo.invoiceName}
                    onChange={handleCustomerInfoChange}
                    className="payment-info-input"
                    placeholder="株式会社○○○"
                  />
                </div>
                <div className="payment-option-toggle-wrapper">
                <button
                  type="button"
                  onClick={() => setIsPaymentOptionsOpen(!isPaymentOptionsOpen)}
                  className={`payment-option-toggle-btn ${isPaymentOptionsOpen ? 'active' : 'inactive'}`}
                >
                  {isPaymentOptionsOpen ? '✓ オプション設定' : 'オプション設定'}
                </button>
                <div className="payment-option-note">
                  <p>お支払い方法が以下の場合はクリックしてください</p>
                  <p>・まとめてお支払いしたい</p>
                  <p>・領収書を複数枚に分けたい</p>
                </div>
              </div>

              {isPaymentOptionsOpen && (
                <div className="payment-options-container">
                  <div className="payment-option-item">
                    <button
                      type="button"
                      onClick={handleToggleCombinedPayment}
                      className="payment-option-title-button"
                    >
                      ・まとめてお支払いの有無
                    </button>
                    
                    {isCombinedPaymentSummaryOpen && orders.length > 1 && (
                      <div className="combined-payment-summary">
                        <table className="summary-table">
                          <thead>
                            <tr>
                              <th>お届け日時</th>
                              <th>注文番号</th>
                              <th>金額</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.map((order, index) => (
                              <tr key={order.id}>
                                <td>{order.orderDate || '未定'} {order.orderTime}</td>
                                <td>{generateOrderNumber(order, allocationNumber)}</td>
                                <td className="text-right">{calculateOrderTotal(order).toLocaleString()}円</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="payment-option-item">
                    <p className="payment-option-item-title">・領収書の詳細指定</p>
                  </div>
                </div>
              )}
              </div>
            </div>
            
            <div className="submit-container">
              <button
                type="button"
                onClick={handleSubmit}
                className="submit-btn"
              >
                <Send size={20} />
                全注文を送信
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderForm;