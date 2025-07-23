"use client";
import React, { useState } from 'react';
import { Send } from 'lucide-react';
import CustomerInfoSection from '../components/CustomerInfoSection';
import OrderItemsSection from '../components/OrderItemsSection';
import OrderOptionsSection from '../components/OrderOptionsSection';

const PRODUCTS = {
  kiwami: { name: '極', price: 3580, neta: ['まぐろ', 'サーモン', 'いくら', 'えび', 'いか', 'うに', 'あなご', 'たまご'] },
  takumi: { name: '匠', price: 3240, neta: ['まぐろ', 'サーモン', 'いくら', 'えび', 'いか', 'たまご', 'きゅうり巻き'] },
  kei: { name: '恵', price: 2480, neta: ['まぐろ', 'サーモン', 'えび', 'いか', 'たまご', 'きゅうり巻き'] },
  izumi: { name: '泉', price: 1890, neta: ['まぐろ', 'サーモン', 'えび', 'たまご', 'きゅうり巻き'] }
};

const OrderForm = () => {
  const [formData, setFormData] = useState({
  storeNumber: '',
  contactName: '',
  email: '',
  fax: '',
  tel: '',
  companyName: '',
  department: '',
  deliveryMethod: '',
  deliveryAddress: '',
  orderDate: '', // 日付用
  orderTime: '', // 時間用（追加）
  paymentMethod: '',
  invoiceName: '',
  hasNetaChange: false,
  netaChangeDetails: '',
  netaChanges: {},
  hasOtherDateOrder: false,
  otherDateOrderDetails: '',
  orderItems: Object.keys(PRODUCTS).map(key => ({
    productKey: key, name: PRODUCTS[key].name, unitPrice: PRODUCTS[key].price, quantity: 0, notes: ''
  }))
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.orderItems];
    newItems[index][field] = value;
    setFormData(prev => ({ ...prev, orderItems: newItems }));
  };

  const calculateItemTotal = (item) => {
    const price = parseFloat(item.unitPrice) || 0;
    const quantity = parseInt(item.quantity) || 0;
    return price * quantity;
  };

  const calculateTotal = () => {
    return formData.orderItems.reduce((total, item) => total + calculateItemTotal(item), 0);
  };

  const getOrderedProducts = () => {
    return formData.orderItems.filter(item => (parseInt(item.quantity) || 0) > 0);
  };

  const getTotalUsedQuantity = (productKey) => {
    const patterns = formData.netaChanges[productKey] || [];
    return patterns.reduce((total, pattern) => total + (parseInt(pattern.quantity) || 0), 0);
  };

  const getRemainingQuantity = (productKey) => {
    const product = formData.orderItems.find(item => item.productKey === productKey);
    const usedQuantity = getTotalUsedQuantity(productKey);
    return (parseInt(product.quantity) || 0) - usedQuantity;
  };

  const getMaxQuantityForPattern = (productKey, currentPatternId) => {
    const product = formData.orderItems.find(item => item.productKey === productKey);
    const patterns = formData.netaChanges[productKey] || [];
    const otherPatternsTotal = patterns
      .filter(pattern => pattern.id !== currentPatternId)
      .reduce((total, pattern) => total + (parseInt(pattern.quantity) || 0), 0);
    return (parseInt(product.quantity) || 0) - otherPatternsTotal;
  };

  const addNetaChangePattern = (productKey) => {
    if (getRemainingQuantity(productKey) <= 0) {
      alert('これ以上パターンを追加できません。注文個数の上限に達しています。');
      return;
    }
    const newPatternId = Date.now().toString();
    setFormData(prev => ({
      ...prev,
      netaChanges: {
        ...prev.netaChanges,
        [productKey]: [
          ...(prev.netaChanges[productKey] || []),
          { id: newPatternId, quantity: 1, selectedNeta: {} }
        ]
      }
    }));
  };

  const removeNetaChangePattern = (productKey, patternId) => {
    setFormData(prev => ({
      ...prev,
      netaChanges: {
        ...prev.netaChanges,
        [productKey]: prev.netaChanges[productKey].filter(p => p.id !== patternId)
      }
    }));
  };

  const handleNetaChangeDetail = (productKey, patternId, field, value) => {
    const intValue = parseInt(value) || 0;
    if (field === 'quantity') {
      const maxQuantity = getMaxQuantityForPattern(productKey, patternId);
      if (intValue > maxQuantity) {
        alert(`個数は${maxQuantity}個以下で入力してください。`);
        return;
      }
    }
    setFormData(prev => ({
      ...prev,
      netaChanges: {
        ...prev.netaChanges,
        [productKey]: prev.netaChanges[productKey].map(p => 
          p.id === patternId ? { ...p, [field]: intValue } : p
        )
      }
    }));
  };

  const handleNetaSelection = (productKey, patternId, netaItem, isSelected) => {
    setFormData(prev => ({
      ...prev,
      netaChanges: {
        ...prev.netaChanges,
        [productKey]: prev.netaChanges[productKey].map(p => 
          p.id === patternId ? { ...p, selectedNeta: { ...p.selectedNeta, [netaItem]: isSelected } } : p
        )
      }
    }));
  };

  const handleSubmit = () => {
    // ... handleSubmit logic
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="w-full max-w-none mx-auto" style={{width: '70%'}}>
        <div className="bg-white rounded-lg shadow-lg p-6 lg:p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">注文フォーム</h1>
          
          <div className="space-y-8 w-full">
            
            <CustomerInfoSection formData={formData} handleInputChange={handleInputChange} />
            
            <OrderItemsSection 
              orderItems={formData.orderItems}
              handleItemChange={handleItemChange}
              calculateItemTotal={calculateItemTotal}
              calculateTotal={calculateTotal}
            />

            <OrderOptionsSection 
              formData={formData}
              setFormData={setFormData}
              PRODUCTS={PRODUCTS}
              getOrderedProducts={getOrderedProducts}
              addNetaChangePattern={addNetaChangePattern}
              removeNetaChangePattern={removeNetaChangePattern}
              handleNetaChangeDetail={handleNetaChangeDetail}
              handleNetaSelection={handleNetaSelection}
              getMaxQuantityForPattern={getMaxQuantityForPattern}
            />

            <div className="text-center pt-10">
              <button
                type="button"
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
              >
                <Send size={20} />
                注文を送信
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderForm;