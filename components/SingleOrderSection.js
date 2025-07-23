import React from 'react';
import { X } from 'lucide-react';
import OrderItemsSection from './OrderItemsSection';
import OrderOptionsSection from './OrderOptionsSection';

const SingleOrderSection = ({ 
  order, 
  orderIndex,
  updateOrder, 
  deleteOrder, 
  PRODUCTS,
  isDeletable 
}) => {
  const selectStyle = "px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xl bg-white leading-tight h-[40px]";
  
  const availableDates = [ '2025年12月25日', '2025年12月26日', '2026年01月05日' ];
  const availableTimes = [ '11:00', '12:00', '13:00' ];

  // --- この部品内で使う、あるいは子に渡すための関数群 ---

  const handleDateOrTimeChange = (e) => {
    const { name, value } = e.target;
    updateOrder(order.id, { [name]: value });
  };

  const handleItemChange = (itemIndex, field, value) => {
    const halfWidthValue = String(value).replace(/[０-９]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xFEE0));
    const finalValue = parseInt(halfWidthValue, 10) || 0;
    
    const updatedItems = order.orderItems.map((item, i) => 
      i === itemIndex ? { ...item, [field]: finalValue } : item
    );
    updateOrder(order.id, { orderItems: updatedItems });
  };

  // ★★★ ここからが追加・修正された関数群です ★★★
  
  const getOrderedProducts = () => {
    return order.orderItems.filter(item => (parseInt(item.quantity) || 0) > 0);
  };

  const getTotalUsedQuantity = (productKey) => {
    const patterns = order.netaChanges[productKey] || [];
    return patterns.reduce((total, pattern) => total + (parseInt(pattern.quantity) || 0), 0);
  };

  const getRemainingQuantity = (productKey) => {
    const product = order.orderItems.find(item => item.productKey === productKey);
    const usedQuantity = getTotalUsedQuantity(productKey);
    return (parseInt(product.quantity) || 0) - usedQuantity;
  };

  const getMaxQuantityForPattern = (productKey, currentPatternId) => {
    const product = order.orderItems.find(item => item.productKey === productKey);
    const patterns = order.netaChanges[productKey] || [];
    const otherPatternsTotal = patterns
      .filter(pattern => pattern.id !== currentPatternId)
      .reduce((total, pattern) => total + (parseInt(pattern.quantity) || 0), 0);
    return (parseInt(product.quantity) || 0) - otherPatternsTotal;
  };

  const addNetaChangePattern = (productKey) => {
    if (getRemainingQuantity(productKey) <= 0) {
      alert('これ以上パターンを追加できません。');
      return;
    }
    const newPatternId = Date.now();
    const newPatterns = [
      ...(order.netaChanges[productKey] || []),
      { id: newPatternId, 
        quantity: 1, 
        selectedNeta: {},
        wasabi: 'あり'
     }
    ];
    updateOrder(order.id, { netaChanges: { ...order.netaChanges, [productKey]: newPatterns } });
  };

  const removeNetaChangePattern = (productKey, patternId) => {
    const newPatterns = (order.netaChanges[productKey] || []).filter(p => p.id !== patternId);
    updateOrder(order.id, { netaChanges: { ...order.netaChanges, [productKey]: newPatterns } });
  };

  const handleNetaChangeDetail = (productKey, patternId, field, value) => {
    const intValue = parseInt(String(value).replace(/[０-９]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xFEE0)), 10) || 0;
    if (field === 'quantity') {
      const maxQuantity = getMaxQuantityForPattern(productKey, patternId);
      if (intValue > maxQuantity) {
        alert(`個数は${maxQuantity}個以下で入力してください。`);
        return;
      }
    }
    const newPatterns = (order.netaChanges[productKey] || []).map(p => 
      p.id === patternId ? { ...p, [field]: intValue } : p
    );
    updateOrder(order.id, { netaChanges: { ...order.netaChanges, [productKey]: newPatterns } });
  };

  const handleNetaSelection = (productKey, patternId, netaItem, isSelected) => {
    const newPatterns = (order.netaChanges[productKey] || []).map(p => 
      p.id === patternId ? { ...p, selectedNeta: { ...p.selectedNeta, [netaItem]: isSelected } } : p
    );
    updateOrder(order.id, { netaChanges: { ...order.netaChanges, [productKey]: newPatterns } });
  };

  return (
    <div className="bg-gray-100 p-6 rounded-lg w-full max-w-5xl relative border">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-gray-700">注文 #{orderIndex + 1}</h3>
        {isDeletable && (
          <button 
            onClick={() => deleteOrder(order.id)} 
            className="text-gray-500 hover:text-red-600 transition-colors"
            title="この注文を削除"
          >
            <X size={24} />
          </button>
        )}
      </div>
      
      <div className="space-y-8">
        <div>
          <label className="block text-xl font-semibold text-gray-700 mb-4">注文日程</label>
          <div className="order-schedule-container">
            <select name="orderDate" value={order.orderDate} onChange={handleDateOrTimeChange} className={`${selectStyle} w-72`}>
              <option value="">日付を選択</option>
              {availableDates.map(date => (<option key={date} value={date}>{date}</option>))}
            </select>
            <select name="orderTime" value={order.orderTime} onChange={handleDateOrTimeChange} className={`${selectStyle} w-72`}>
              <option value="">時間を選択</option>
              {availableTimes.map(time => (<option key={time} value={time}>{time}</option>))}
            </select>
          </div>
        </div>
        
        <OrderItemsSection
          orderItems={order.orderItems}
          handleItemChange={handleItemChange}
        />
        
        <OrderOptionsSection 
          order={order}
          updateOrder={updateOrder}
          PRODUCTS={PRODUCTS}
          getOrderedProducts={getOrderedProducts}
          addNetaChangePattern={addNetaChangePattern}
          removeNetaChangePattern={removeNetaChangePattern}
          handleNetaChangeDetail={handleNetaChangeDetail}
          handleNetaSelection={handleNetaSelection}
          getMaxQuantityForPattern={getMaxQuantityForPattern}
        />
      </div>
    </div>
  );
};

export default SingleOrderSection;