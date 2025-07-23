import React from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';

const OrderOptionsSection = ({ 
  order, 
  PRODUCTS,
  updateOrder,
  // ネタ変更のための関数群
  getOrderedProducts,
  addNetaChangePattern,
  removeNetaChangePattern,
  handleNetaChangeDetail,
  handleNetaSelection,
  getMaxQuantityForPattern
}) => {
  return (
    <div className="bg-purple-50 p-6 rounded-lg">
      <h2 className="text-xl font-semibold text-purple-800 mb-6 text-center">備考・オプション</h2>
      
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3 mb-3">
            <button
              type="button"
              onClick={() => updateOrder(order.id, { hasNetaChange: !order.hasNetaChange })}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                order.hasNetaChange 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {order.hasNetaChange ? '✓ ネタ変更あり' : 'ネタ変更'}
            </button>
            <span className="text-sm text-gray-600">
              ネタの変更がある場合はクリックしてください
            </span>
          </div>
          
          {order.hasNetaChange && (
            <div className="mt-4 space-y-4">
              {getOrderedProducts().length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    <Edit className="inline mr-2" size={18} />
                    ご注文いただいた商品のネタ変更
                  </h3>
                  
                  {getOrderedProducts().map((product) => (
                    <div key={product.productKey} className="bg-gray-50 p-4 rounded-lg mb-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-bold text-gray-800">
                          {product.name} × {product.quantity}個
                        </h4>
                        <button
                          type="button"
                          onClick={() => addNetaChangePattern(product.productKey)}
                          disabled={getMaxQuantityForPattern(product.productKey, null) <= 0}
                          className={`px-3 py-1 text-sm rounded transition-colors ${
                            getMaxQuantityForPattern(product.productKey, null) <= 0
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          <Plus size={14} className="inline mr-1" />
                          変更パターン追加
                        </button>
                      </div>

                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">標準ネタ:</h5>
                        <div className="flex flex-wrap gap-2">
                          {PRODUCTS[product.productKey].neta.map((netaItem) => (
                            <span key={netaItem} className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded">
                              {netaItem}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        {(order.netaChanges[product.productKey] || []).map((pattern, patternIndex) => (
                          <div key={pattern.id} className="bg-white p-4 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-center mb-3">
                              <h5 className="font-medium text-gray-800">
                                変更パターン {patternIndex + 1}
                              </h5>
                              <div className="flex items-center space-x-2">
                                <label className="text-sm text-gray-600">個数:</label>
                                <input
                                  type="number"
                                  min="1"
                                  max={getMaxQuantityForPattern(product.productKey, pattern.id)}
                                  value={pattern.quantity}
                                  onChange={(e) => handleNetaChangeDetail(product.productKey, pattern.id, 'quantity', e.target.value)}
                                  className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-center"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeNetaChangePattern(product.productKey, pattern.id)}
                                  className="p-1 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {PRODUCTS[product.productKey].neta.map((netaItem) => (
                                <div key={netaItem} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`${product.productKey}-${pattern.id}-${netaItem}`}
                                    checked={pattern.selectedNeta[netaItem] || false}
                                    onChange={(e) => handleNetaSelection(product.productKey, pattern.id, netaItem, e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <label 
                                    htmlFor={`${product.productKey}-${pattern.id}-${netaItem}`}
                                    className="text-sm text-gray-700 cursor-pointer"
                                  >
                                    {netaItem}
                                  </label>
                                </div>
                              ))}
                            </div>
                            
                            <div className="mt-3 text-xs text-gray-500">
                              ※ チェックしたネタが別のネタへ変更されます
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <h6 className="text-sm font-medium text-gray-700 mb-2">ワサビ</h6>
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center">
                                  <input
                                    type="radio"
                                    id={`wasabi-ari-${pattern.id}`}
                                    name={`wasabi-option-${pattern.id}`}
                                    value="あり"
                                    checked={pattern.wasabi === 'あり'}
                                    onChange={(e) => handleNetaChangeDetail(product.productKey, pattern.id, 'wasabi', e.target.value)}
                                    className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <label htmlFor={`wasabi-ari-${pattern.id}`} className="ml-2 block text-sm text-gray-900">
                                    あり
                                  </label>
                                </div>
                                <div className="flex items-center">
                                  <input
                                    type="radio"
                                    id={`wasabi-nuki-${pattern.id}`}
                                    name={`wasabi-option-${pattern.id}`}
                                    value="抜き"
                                    checked={pattern.wasabi === '抜き'}
                                    onChange={(e) => handleNetaChangeDetail(product.productKey, pattern.id, 'wasabi', e.target.value)}
                                    className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <label htmlFor={`wasabi-nuki-${pattern.id}`} className="ml-2 block text-sm text-gray-900">
                                    抜き
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>まず商品を選択してください</p>
                </div>
              )}
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  その他ネタ変更の詳細
                </label>
                <textarea
                  value={order.netaChangeDetails}
                  onChange={(e) => updateOrder(order.id, { netaChangeDetails: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="上記以外のネタ変更や特別な要望があれば記入してください"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderOptionsSection;