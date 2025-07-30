import React from 'react';

 const OrderItemsSection = ({ orderItems, handleItemChange, totalAmount }) => {
  const calculateItemTotal = (item) => {
    const price = parseFloat(item.unitPrice) || 0;
    const quantity = parseInt(item.quantity) || 0;
    return price * quantity;
  };

  return (
    <div className="order-items-section">
      <h2 className="order-items-title">注文内容</h2>
      <div className="order-items-container">
        <table className="order-items-table">
          <thead>
            <tr>
              <th className="text-left">商品名</th>
              <th className="text-center">単価</th>
              <th className="text-center">個数</th>
              <th className="text-center">金額</th>
            </tr>
          </thead>
          <tbody>
            {orderItems.map((item, index) => (
              <tr key={item.productKey}>
                <td className="border-right">
                  <div className="item-name">{item.name}</div>
                </td>
                <td className="text-center border-right">
                  <div className="unit-price-label">税込</div>
                  <div className="unit-price-value">{item.unitPrice.toLocaleString()}円</div>
                </td>
                <td className="text-center border-right">
                  <input
                    type="number"
                    value={item.quantity === 0 ? '' : item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    min="0"
                    className="quantity-input"
                    placeholder="0"
                  />
                </td>
                <td className="text-center">
                  <div className="item-total-price">{calculateItemTotal(item).toLocaleString()}円</div>
                </td>
              </tr>
            ))}
            <tr className="totals-row">
              <td colSpan="3">
                <span className="totals-label">合計金額</span>
              </td>
              <td>
                <div className="totals-value">¥{totalAmount.toLocaleString()}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderItemsSection;