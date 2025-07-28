"use client";
import React, { useState } from 'react';
import { Send, Plus, X as CloseIcon } from 'lucide-react'; // X (閉じる) アイコンをインポート
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
    deliveryMethod: '', deliveryAddress: '', paymentMethod: '', invoiceName: '',
  });

  const createNewOrder = () => ({
    id: Date.now(),
    orderDate: '',
    orderTime: '',
    hasNetaChange: false,
    noWasabi: false,
    netaChangeDetails: '',
    netaChanges: {},
    orderItems: Object.keys(PRODUCTS).map(key => ({
      productKey: key, name: PRODUCTS[key].name, unitPrice: PRODUCTS[key].price, quantity: 0, notes: ''
    }))
  });

  const [orders, setOrders] = useState([createNewOrder()]);

  // ★★★ サイドバーの開閉状態を管理するstate ★★★
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleCustomerInfoChange = (e) => {
    const { name, value } = e.target;
    setCustomerInfo(prev => ({ ...prev, [name]: value }));
  };

  const updateOrder = (orderId, updatedFields) => {
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId ? { ...order, ...updatedFields } : order
      )
    );
  };
  
  const addOrder = () => {
    setOrders(prevOrders => [...prevOrders, createNewOrder()]);
  };
  
  const deleteOrder = (orderId) => {
    setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
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
    <div className="min-h-screen bg-gray-50 relative">
      
      {/* ★★★ サイドバー表示ロジック ★★★ */}
      {isSidebarOpen && (
        <>
          {/* オーバーレイ (背景をクリックで閉じる) */}
          <div 
            className="overlay"
            onClick={() => setIsSidebarOpen(false)}
          ></div>

          {/* サイドバー本体 */}
          <div className="sidebar">
            <div className="sidebar-header">
              <h3 className="text-xl font-semibold">店舗情報</h3>
              <button onClick={() => setIsSidebarOpen(false)} className="sidebar-close-btn">
                <CloseIcon size={24} />
              </button>
            </div>
              <SidebarInfoSection />
          </div>

        </>
      )}
      

      {/* --- メインコンテンツ --- */}
      <div className="main-container">
        <div className="main-content">
          <div className="form-container">
            <div className="form-header">
              <h1 className="form-title">注文フォーム</h1>
              
              {/* ★★★ ハンバーガーメニューボタン ★★★ */}
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
            
            <div className="order-detail-container w-full max-w-none mx-auto">
              <CustomerInfoSection formData={customerInfo} handleInputChange={handleCustomerInfoChange} />
              
              {orders.map((order, index) => (
                <SingleOrderSection
                  key={order.id}
                  order={order}
                  orderIndex={index}
                  updateOrder={updateOrder}
                  deleteOrder={deleteOrder}
                  PRODUCTS={PRODUCTS}
                  isDeletable={index > 0}
                />
              ))}

              <div className="w-full max-w-5xl">
                <button
                  type="button"
                  onClick={addOrder}
                  className="add-order-btn"
                >
                  <Plus size={20} />
                  別日・別の届け先の注文を追加する
                </button>
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
    </div>
  );
};

export default OrderForm;