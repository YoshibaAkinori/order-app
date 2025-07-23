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
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsSidebarOpen(false)}
          ></div>

          {/* サイドバー本体 */}
          <div className="fixed top-0 right-0 w-[400px] max-w-full h-full bg-white p-8 shadow-lg z-50 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">店舗情報</h3>
              <button onClick={() => setIsSidebarOpen(false)} className="p-1 rounded-full hover:bg-gray-200">
                <CloseIcon size={24} />
              </button>
            </div>
              <SidebarInfoSection />
          </div>

        </>
      )}
      
      <div className="fixed right-0 top-0 bg-red-500 w-20 h-20"></div>

      {/* --- メインコンテンツ --- */}
      <div className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex justify-between items-center mb-8">
              <h1 className="flex-1 text-3xl font-bold text-gray-800 text-center">注文フォーム</h1>
              
              {/* ★★★ ハンバーガーメニューボタン ★★★ */}
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-md hover:bg-gray-100"
                title="店舗情報を表示"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" x2="20" y1="12" y2="12" />
                  <line x1="4" x2="20" y1="6" y2="6" />
                  <line x1="4" x2="20" y1="18" y2="18" />
                </svg>
              </button>
            </div>
            
            <div className="order-detail-container w-full max-w-none mx-auto" style={{width: '75%'}}>
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
                  className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 hover:border-gray-400 transition-colors"
                >
                  <Plus size={20} />
                  別日・別の届け先の注文を追加する
                </button>
              </div>

              <div className="text-center pt-10">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
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