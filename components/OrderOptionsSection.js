import React from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';

const OrderOptionsSection = ({ 
  formData, setFormData, PRODUCTS, getOrderedProducts, 
  addNetaChangePattern, removeNetaChangePattern, handleNetaChangeDetail, 
  handleNetaSelection, getMaxQuantityForPattern 
}) => {
  return (
    <div className="bg-purple-50 p-6 rounded-lg">
      <h2 className="text-xl font-semibold text-purple-800 mb-4">備考・オプション</h2>
      
      <div className="mt-6 space-y-4">
        {/* ネタ変更 */}
        <div className="bg-white p-4 rounded-lg border border-orange-200">
          <div className="flex items-center space-x-3 mb-3">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, hasNetaChange: !prev.hasNetaChange }))}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                formData.hasNetaChange 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {formData.hasNetaChange ? '✓ ネタ変更あり' : 'ネタ変更'}
            </button>
            <span className="text-sm text-gray-600">
              ネタの変更がある場合はクリックしてください
            </span>
          </div>
          
          {formData.hasNetaChange && (
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
                        {(formData.netaChanges[product.productKey] || []).map((pattern, patternIndex) => (
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
                              ※ チェックしたネタが変更されます。（チェックしていないネタは通常通りとなります。）
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
                  <p className="text-sm">商品の個数を入力すると、ネタ変更の詳細設定が表示されます</p>
                </div>
              )}
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  その他ネタ変更の詳細・特別な要望
                </label>
                <textarea
                  value={formData.netaChangeDetails}
                  onChange={(e) => setFormData(prev => ({ ...prev, netaChangeDetails: e.target.value }))}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="上記以外のネタ変更や特別な要望があれば記入してください"
                />
              </div>
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg border border-orange-200">
          <div className="flex items-center space-x-3 mb-3">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, hasOtherDateOrder: !prev.hasOtherDateOrder }))}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                formData.hasOtherDateOrder 
                  ? 'bg-blue-500 text-white hover:bg-blue-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {formData.hasOtherDateOrder ? '✓ 別日注文あり' : '別日注文'}
            </button>
            <span className="text-sm text-gray-600">
              別の日にも注文がある場合はクリックしてください
            </span>
          </div>
          
          {formData.hasOtherDateOrder && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                別日注文の詳細
              </label>
              <textarea
                value={formData.otherDateOrderDetails}
                onChange={(e) => setFormData(prev => ({ ...prev, otherDateOrderDetails: e.target.value }))}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="別日の注文詳細を記入してください（例：○月○日に同じ内容、△月△日に違う商品等）"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderOptionsSection;