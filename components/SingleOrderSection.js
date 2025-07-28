import React from 'react';
import { X } from 'lucide-react';
import OrderItemsSection from './OrderItemsSection';
import OrderOptionsSection from './OrderOptionsSection';

// ★ allocationNumberの代わりに、計算済みの orderNumberDisplay を受け取る
const SingleOrderSection = ({ order, orderIndex, updateOrder, deleteOrder, PRODUCTS, isDeletable, orderNumberDisplay }) => {
  const availableDates = ['2025年12月25日', '2025年12月26日', '2026年01月05日'];
  const availableTimes = ['11:00', '12:00', '13:00'];

  // ★ 注文番号を生成する関数はここから削除

  const handleInputChange = (e) => {
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
  
  // ... ネタ変更関連のロジック（変更なし） ...
  const getOrderedProducts = () => order.orderItems.filter(item => (parseInt(item.quantity) || 0) > 0);
  const getTotalUsedQuantity = (productKey) => (order.netaChanges[productKey] || []).reduce((total, p) => total + (parseInt(p.quantity) || 0), 0);
  const getMaxQuantityForPattern = (productKey, currentPatternId) => {
    const product = order.orderItems.find(item => item.productKey === productKey);
    const totalQuantity = parseInt(product.quantity) || 0;
    const otherPatternsTotal = (order.netaChanges[productKey] || [])
      .filter(p => p.id !== currentPatternId)
      .reduce((total, p) => total + (parseInt(p.quantity) || 0), 0);
    return totalQuantity - otherPatternsTotal;
  };
  const addNetaChangePattern = (productKey) => {
    const remaining = getMaxQuantityForPattern(productKey, null);
    if (remaining <= 0) return;
    const newPattern = { id: Date.now(), quantity: 1, selectedNeta: {}, wasabi: 'あり' };
    const updatedChanges = { ...order.netaChanges, [productKey]: [...(order.netaChanges[productKey] || []), newPattern] };
    updateOrder(order.id, { netaChanges: updatedChanges });
  };
  const removeNetaChangePattern = (productKey, patternId) => {
    const newPatterns = (order.netaChanges[productKey] || []).filter(p => p.id !== patternId);
    const updatedChanges = { ...order.netaChanges, [productKey]: newPatterns };
    updateOrder(order.id, { netaChanges: updatedChanges });
  };
  const handleNetaChangeDetail = (productKey, patternId, field, value) => {
    let finalValue = value;
    if (field === 'quantity') {
      const intValue = parseInt(String(value).replace(/[０-９]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xFEE0)), 10) || 0;
      if (intValue > getMaxQuantityForPattern(productKey, patternId)) return;
      finalValue = intValue;
    }
    const newPatterns = (order.netaChanges[productKey] || []).map(p => p.id === patternId ? { ...p, [field]: finalValue } : p);
    updateOrder(order.id, { netaChanges: { ...order.netaChanges, [productKey]: newPatterns } });
  };
  const handleNetaSelection = (productKey, patternId, netaItem, isSelected) => {
    const newPatterns = (order.netaChanges[productKey] || []).map(p => p.id === patternId ? { ...p, selectedNeta: { ...p.selectedNeta, [netaItem]: isSelected } } : p);
    updateOrder(order.id, { netaChanges: { ...order.netaChanges, [productKey]: newPatterns } });
  };

  return (
    <div className="single-order-section">
      <div className="single-order-header">
        <h3 className="single-order-title">
          注文 #{orderIndex + 1}
          <span className="order-id-display">
            {/* ★ propsで受け取った値を表示するだけに変更 */}
            (注文番号: {orderNumberDisplay})
          </span>
        </h3>
        {isDeletable && (
          <button onClick={() => deleteOrder(order.id)} className="single-order-delete-btn" title="この注文を削除">
            <X size={24} />
          </button>
        )}
      </div>

      <div className="single-order-content">
        <div className="single-order-field">
          <label className="single-order-label">お届け日</label>
          <div className="order-schedule-container">
            <select name="orderDate" value={order.orderDate} onChange={handleInputChange} className="single-order-select">
              <option value="">日付を選択</option>
              {availableDates.map(date => (<option key={date} value={date}>{date}</option>))}
            </select>
            <select name="orderTime" value={order.orderTime} onChange={handleInputChange} className="single-order-select">
              <option value="">時間を選択</option>
              {availableTimes.map(time => (<option key={time} value={time}>{time}</option>))}
            </select>
          </div>
        </div>

        {/* ★ここにお届け先住所の入力欄を追加★ */}
        <div className="single-order-field">
          <label className="single-order-label">お届け先住所</label>
          <textarea
            name="deliveryAddress"
            value={order.deliveryAddress}
            onChange={handleInputChange}
            rows="3"
            className="single-order-textarea"
            placeholder="〒380-0921 長野県長野市栗田1525"
          />
        </div>
        <div className="single-order-field">
            <label className="single-order-label">
              配達方法 <span className="required-mark">*</span>
            </label>
            {/* valueを「order.deliveryMethod」に修正 */}
            <select 
              name="deliveryMethod" 
              value={order.deliveryMethod} 
              onChange={handleInputChange} 
              className="single-order-select"
            >
              <option value="">選択してください</option>
              <option value="出前">出前</option>
              <option value="東口受け取り">東口受け取り</option>
              <option value="日詰受け取り">日詰受け取り</option>
            </select>
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