import React from 'react';

const OrderItemsSection = ({ orderItems, handleItemChange, calculateItemTotal, calculateTotal }) => {
  return (
    <div className="bg-yellow-50 p-6 rounded-lg w-full max-w-5xl">
      <h2 className="text-2xl font-semibold text-yellow-800 mb-6 text-center">注文内容</h2>
      
      <div className="bg-white rounded-lg overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-5 text-left text-base font-medium text-gray-700 border-b border-gray-200">商品名</th>
              <th className="px-6 py-5 text-center text-base font-medium text-gray-700 border-b border-gray-200">単価</th>
              <th className="px-6 py-5 text-center text-base font-medium text-gray-700 border-b border-gray-200">個数</th>
              <th className="px-6 py-5 text-center text-base font-medium text-gray-700 border-b border-gray-200">金額</th>
            </tr>
          </thead>
          <tbody>
            {orderItems.map((item, index) => (
              <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-6 py-5 border-r border-gray-200">
                  <div className="flex items-center">
                    <div className="text-xl font-bold text-gray-800">{item.name}</div>
                  </div>
                </td>
                <td className="px-6 py-5 text-center border-r border-gray-200">
                  <div className="text-base text-gray-600 mb-1">税込</div>
                  <div className="text-xl font-semibold text-gray-800">
                    {item.unitPrice.toLocaleString()}円
                  </div>
                </td>
                <td className="px-6 py-5 text-center border-r border-gray-200">
                  <input
                    type="number"
                    value={item.quantity === 0 ? '' : item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                    min="0"
                    className="w-28 px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-center text-lg"
                    // ★★★ ここを変更 ★★★
                    placeholder="0"
                  />
                </td>
                <td className="px-6 py-5 text-center">
                  <div className="text-xl font-bold text-gray-800">
                    {calculateItemTotal(item).toLocaleString()}円
                  </div>
                </td>
              </tr>
            ))}
            <tr className="bg-yellow-100 border-t-2 border-yellow-300">
              <td className="px-6 py-5 font-bold text-yellow-800 text-xl" colSpan="3">
                合計金額
              </td>
              <td className="px-6 py-5 text-center">
                <div className="text-2xl font-bold text-yellow-800">
                  ¥{calculateTotal().toLocaleString()}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderItemsSection;