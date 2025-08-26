"use client";
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import OrderItemsSection from './OrderItemsSection';
import OrderOptionsSection from './OrderOptionsSection';

const SingleOrderSection = ({
  order,
  orderIndex,
  updateOrder,
  deleteOrder,
  isDeletable,
  orderNumberDisplay,
  PRODUCTS,
  SIDE_ORDERS_DB,
  addSideOrder,
  updateSideOrderQuantity,
  removeSideOrder,
  calculateOrderTotal,
  availableDates,
  availableTimes,
  customerAddress
}) => {

  // 1. 注文がキャンセル済みかどうかを判定 (主に注文変更ページで使用)
  const isCanceled = order.orderStatus === 'CANCELED';

  const isSameAsCustomerAddress = order.isSameAddress !== false;

  useEffect(() => {
    // キャンセル済みでない場合のみ、住所を同期する
    if (isSameAsCustomerAddress && !isCanceled) {
      if (order.deliveryAddress !== customerAddress) {
        updateOrder(order.id, { deliveryAddress: customerAddress });
      }
    }
  }, [customerAddress, isSameAsCustomerAddress, order.id, updateOrder, order.deliveryAddress, isCanceled]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    updateOrder(order.id, { [name]: value });
  };
  
  const handleSameAddressChange = (e) => {
    const isChecked = e.target.checked;
    updateOrder(order.id, {
      isSameAddress: isChecked,
      deliveryAddress: isChecked ? customerAddress : ''
    });
  };

  const handleItemChange = (itemIndex, field, value) => {
    const halfWidthValue = String(value).replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
    const finalValue = parseInt(halfWidthValue, 10) || 0;
    const updatedItems = order.orderItems.map((item, i) => (i === itemIndex ? { ...item, [field]: finalValue } : item));
    updateOrder(order.id, { orderItems: updatedItems });
  };

  const getOrderedProducts = () => order.orderItems.filter((item) => (parseInt(item.quantity) || 0) > 0);
  
  const getMaxQuantityForPattern = (productKey, currentPatternId) => {
    const product = order.orderItems.find((item) => item.productKey === productKey);
    const totalQuantity = parseInt(product?.quantity) || 0;
    const otherPatternsTotal = (order.netaChanges[productKey] || [])
      .filter((p) => p.id !== currentPatternId)
      .reduce((total, p) => total + (parseInt(p.quantity) || 0), 0);
    return totalQuantity - otherPatternsTotal;
  };

  const addNetaChangePattern = (productKey) => {
    const remaining = getMaxQuantityForPattern(productKey, null);
    if (remaining <= 0) return;
    const newPattern = { id: Date.now(), quantity: 1, selectedNeta: {}, wasabi: 'あり', isOri: false };
    const updatedChanges = { ...order.netaChanges, [productKey]: [...(order.netaChanges[productKey] || []), newPattern] };
    updateOrder(order.id, { netaChanges: updatedChanges });
  };

  const removeNetaChangePattern = (productKey, patternId) => {
    const newPatterns = (order.netaChanges[productKey] || []).filter((p) => p.id !== patternId);
    const updatedChanges = { ...order.netaChanges, [productKey]: newPatterns };
    updateOrder(order.id, { netaChanges: updatedChanges });
  };

  const handleNetaChangeDetail = (productKey, patternId, field, value) => {
    let finalValue = value;
    if (field === 'quantity') {
      const intValue = parseInt(String(value).replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0)), 10) || 0;
      if (intValue > getMaxQuantityForPattern(productKey, patternId)) return;
      finalValue = intValue;
    }
    const newPatterns = (order.netaChanges[productKey] || []).map((p) => (p.id === patternId ? { ...p, [field]: finalValue } : p));
    updateOrder(order.id, { netaChanges: { ...order.netaChanges, [productKey]: newPatterns } });
  };

  const handleNetaSelection = (productKey, patternId, netaItem, isSelected) => {
    const newPatterns = (order.netaChanges[productKey] || []).map((p) => (p.id === patternId ? { ...p, selectedNeta: { ...p.selectedNeta, [netaItem]: isSelected } } : p));
    updateOrder(order.id, { netaChanges: { ...order.netaChanges, [productKey]: newPatterns } });
  };
 
  const totalAmountForThisOrder = calculateOrderTotal(order);

  return (
    // 2. キャンセル済みの場合にCSSクラスを付与して見た目を変える
    <div className={`single-order-section ${isCanceled ? 'is-canceled' : ''}`}>
      <div className="single-order-header">
        <h3 className="single-order-title">注文 #{orderIndex + 1}<span className="order-id-display">({orderNumberDisplay})</span></h3>
        
        {/* 3. isDeletableがtrueの時だけ削除ボタンを表示し、キャンセル済みなら無効化 */}
        {isDeletable && (
          <button 
            onClick={deleteOrder} 
            className="single-order-delete-btn" 
            title="この注文を削除またはキャンセル"
            disabled={isCanceled}
          >
            <X size={24} />
          </button>
        )}
      </div>
      
      {/* 4. キャンセル済みの場合にバッジを表示 */}
      {isCanceled && <div className="canceled-badge">キャンセル済み</div>}

      {/* 5. fieldsetで全体を囲み、キャンセル済みなら全てのフォーム操作を無効化 */}
      <fieldset disabled={isCanceled} className="single-order-fieldset">
        <div className="single-order-content">
          <div className="single-order-field">
            <label className="single-order-label">お届け日</label>
            <div className="order-schedule-container">
              <select name="orderDate" value={order.orderDate} onChange={handleInputChange} className="single-order-select">
                <option value="">日付を選択</option>
                {availableDates.map((date) => (<option key={date} value={date}>{date}</option>))}
              </select>
              <select name="orderTime" value={order.orderTime} onChange={handleInputChange} className="single-order-select">
                <option value="">時間を選択</option>
                {availableTimes.map((time) => (<option key={time} value={time}>{time}</option>))}
              </select>
            </div>
          </div>
          <div className="single-order-field">
            <label className="single-order-label">お届け先住所</label>
            <div className="address-checkbox-container">
              <input type="checkbox" id={`same-address-check-${order.id}`} checked={isSameAsCustomerAddress} onChange={handleSameAddressChange} />
              <label htmlFor={`same-address-check-${order.id}`}>発注者の住所と同じ</label>
            </div>
            {!isSameAsCustomerAddress && (
              <textarea name="deliveryAddress" value={order.deliveryAddress} onChange={handleInputChange} rows="3" className="single-order-textarea" placeholder="お届け先の住所を手入力してください" />
            )}
          </div>
          <OrderItemsSection 
            orderItems={order.orderItems} 
            handleItemChange={handleItemChange} 
            totalAmount={totalAmountForThisOrder}
          />
          <OrderOptionsSection
            order={order}
            updateOrder={updateOrder}
            PRODUCTS={PRODUCTS}
            SIDE_ORDERS_DB={SIDE_ORDERS_DB}
            getOrderedProducts={getOrderedProducts}
            addNetaChangePattern={addNetaChangePattern}
            removeNetaChangePattern={removeNetaChangePattern}
            handleNetaChangeDetail={handleNetaChangeDetail}
            handleNetaSelection={handleNetaSelection}
            getMaxQuantityForPattern={getMaxQuantityForPattern}
            addSideOrder={addSideOrder}
            updateSideOrderQuantity={updateSideOrderQuantity}
            removeSideOrder={removeSideOrder}
          />
        </div>
      </fieldset>
    </div>
  );
};

export default SingleOrderSection;