"use client";
import React, { useState } from 'react';
import { Plus, Trash2, Send, Edit } from 'lucide-react';

const OrderForm = () => {
  // 商品マスタ（環境変数のように管理）
  const PRODUCTS = {
    kiwami: { 
      name: '極', 
      price: 3580,
      neta: ['まぐろ', 'サーモン', 'いくら', 'えび', 'いか', 'うに', 'あなご', 'たまご']
    },
    takumi: { 
      name: '匠', 
      price: 3240,
      neta: ['まぐろ', 'サーモン', 'いくら', 'えび', 'いか', 'たまご', 'きゅうり巻き']
    },
    kei: { 
      name: '恵', 
      price: 2480,
      neta: ['まぐろ', 'サーモン', 'えび', 'いか', 'たまご', 'きゅうり巻き']
    },
    izumi: { 
      name: '泉', 
      price: 1890,
      neta: ['まぐろ', 'サーモン', 'えび', 'たまご', 'きゅうり巻き']
    }
  };

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
    orderDate: '',
    paymentMethod: '',
    invoiceName: '',
    hasNetaChange: false,
    netaChangeDetails: '',
    netaChanges: {}, // 商品ごとのネタ変更情報（配列形式）
    hasOtherDateOrder: false,
    otherDateOrderDetails: '',
    orderItems: Object.keys(PRODUCTS).map(key => ({
      productKey: key,
      name: PRODUCTS[key].name,
      unitPrice: PRODUCTS[key].price,
      quantity: 0,
      notes: ''
    }))
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.orderItems];
    newItems[index][field] = value;
    setFormData(prev => ({
      ...prev,
      orderItems: newItems
    }));
  };

  const calculateItemTotal = (item) => {
    const price = parseFloat(item.unitPrice) || 0;
    const quantity = parseInt(item.quantity) || 0;
    return price * quantity;
  };

  const calculateTotal = () => {
    return formData.orderItems.reduce((total, item) => {
      return total + calculateItemTotal(item);
    }, 0);
  };

  // 注文のある商品のみを取得
  const getOrderedProducts = () => {
    return formData.orderItems.filter(item => item.quantity > 0);
  };

  // 使用済み個数の計算
  const getTotalUsedQuantity = (productKey) => {
    const patterns = formData.netaChanges[productKey] || [];
    return patterns.reduce((total, pattern) => total + (parseInt(pattern.quantity) || 0), 0);
  };

  // 残り個数の計算
  const getRemainingQuantity = (productKey) => {
    const product = formData.orderItems.find(item => item.productKey === productKey);
    const usedQuantity = getTotalUsedQuantity(productKey);
    return product.quantity - usedQuantity;
  };

  // 最大選択可能個数の計算（特定パターンを除く）
  const getMaxQuantityForPattern = (productKey, currentPatternId) => {
    const product = formData.orderItems.find(item => item.productKey === productKey);
    const patterns = formData.netaChanges[productKey] || [];
    const otherPatternsTotal = patterns
      .filter(pattern => pattern.id !== currentPatternId)
      .reduce((total, pattern) => total + (parseInt(pattern.quantity) || 0), 0);
    return product.quantity - otherPatternsTotal;
  };

  // ネタ変更パターンの追加
  const addNetaChangePattern = (productKey) => {
    const product = formData.orderItems.find(item => item.productKey === productKey);
    const usedQuantity = getTotalUsedQuantity(productKey);
    const remainingQuantity = product.quantity - usedQuantity;
    
    if (remainingQuantity <= 0) {
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
          {
            id: newPatternId,
            quantity: Math.min(1, remainingQuantity),
            selectedNeta: {}
          }
        ]
      }
    }));
  };

  // ネタ変更パターンの削除
  const removeNetaChangePattern = (productKey, patternId) => {
    setFormData(prev => ({
      ...prev,
      netaChanges: {
        ...prev.netaChanges,
        [productKey]: prev.netaChanges[productKey].filter(pattern => pattern.id !== patternId)
      }
    }));
  };

  // ネタ変更の詳細を更新
  const handleNetaChangeDetail = (productKey, patternId, field, value) => {
    if (field === 'quantity') {
      const maxQuantity = getMaxQuantityForPattern(productKey, patternId);
      if (value > maxQuantity) {
        alert(`個数は${maxQuantity}個以下で入力してください。`);
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      netaChanges: {
        ...prev.netaChanges,
        [productKey]: prev.netaChanges[productKey].map(pattern => 
          pattern.id === patternId ? { ...pattern, [field]: value } : pattern
        )
      }
    }));
  };

  // ネタの選択状態を更新
  const handleNetaSelection = (productKey, patternId, netaItem, isSelected) => {
    setFormData(prev => ({
      ...prev,
      netaChanges: {
        ...prev.netaChanges,
        [productKey]: prev.netaChanges[productKey].map(pattern => 
          pattern.id === patternId ? {
            ...pattern,
            selectedNeta: {
              ...pattern.selectedNeta,
              [netaItem]: isSelected
            }
          } : pattern
        )
      }
    }));
  };

  const handleSubmit = () => {
    // 注文データの整理
    const orderData = {
      ...formData,
      orderSummary: {
        totalAmount: calculateTotal(),
        itemCount: formData.orderItems.filter(item => item.quantity > 0).length,
        hasNetaChange: formData.hasNetaChange,
        hasOtherDateOrder: formData.hasOtherDateOrder
      }
    };
    
    console.log('注文データ:', orderData);
    
    // 確認メッセージの作成
    let confirmMessage = `注文を送信します。\n\n`;
    confirmMessage += `合計金額: ¥${calculateTotal().toLocaleString()}\n`;
    
    if (formData.hasNetaChange) {
      confirmMessage += `※ネタ変更があります\n`;
    }
    if (formData.hasOtherDateOrder) {
      confirmMessage += `※別日注文があります\n`;
    }
    
    confirmMessage += `\n送信してよろしいですか？`;
    
    if (window.confirm(confirmMessage)) {
      alert('注文を送信しました！');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">注文フォーム</h1>
          
          <div className="space-y-8">
            {/* 店舗記入欄 */}
            <div className="bg-blue-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-blue-800 mb-4">店舗記入欄</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  割振番号
                </label>
                <input
                  type="text"
                  name="storeNumber"
                  value={formData.storeNumber}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例: ST-001"
                />
              </div>
            </div>

            {/* 発注者の情報 */}
            <div className="bg-green-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-green-800 mb-4">発注者の情報</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    担当者名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="contactName"
                    value={formData.contactName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="山田太郎"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    メールアドレス <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="example@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    FAX番号
                  </label>
                  <input
                    type="tel"
                    name="fax"
                    value={formData.fax}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="019-123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    電話番号 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="tel"
                    value={formData.tel}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="019-123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    法人名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="株式会社○○○"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    部署名
                  </label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="営業部"
                  />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    配達方法 <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="deliveryMethod"
                    value={formData.deliveryMethod}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">選択してください</option>
                    <option value="出前">出前</option>
                    <option value="東口受け取り">東口受け取り</option>
                    <option value="日詰受け取り">日詰受け取り</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    注文日程 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="orderDate"
                    value={formData.orderDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  お届け先住所
                </label>
                <textarea
                  name="deliveryAddress"
                  value={formData.deliveryAddress}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="〒123-4567 岩手県紫波郡紫波町..."
                />
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    支払い方法 <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">選択してください</option>
                    <option value="現金">現金</option>
                    <option value="銀行振込">銀行振込</option>
                    <option value="クレジットカード">クレジットカード</option>
                    <option value="請求書払い">請求書払い</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    領収書・請求書の宛名
                  </label>
                  <input
                    type="text"
                    name="invoiceName"
                    value={formData.invoiceName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="株式会社○○○"
                  />
                </div>
              </div>
            </div>

            {/* 注文内容 */}
            <div className="bg-orange-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-orange-800 mb-4">注文内容</h2>
              
              <div className="bg-white rounded-lg overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 border-b border-gray-200">商品名</th>
                      <th className="px-6 py-4 text-center text-sm font-medium text-gray-700 border-b border-gray-200">単価</th>
                      <th className="px-6 py-4 text-center text-sm font-medium text-gray-700 border-b border-gray-200">個数</th>
                      <th className="px-6 py-4 text-center text-sm font-medium text-gray-700 border-b border-gray-200">金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.orderItems.map((item, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 border-r border-gray-200">
                          <div className="flex items-center">
                            <div className="bg-orange-100 px-3 py-1 rounded text-sm font-medium text-orange-800 mr-3">
                              注文内容
                            </div>
                            <div className="text-lg font-bold text-gray-800">{item.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center border-r border-gray-200">
                          <div className="text-sm text-gray-600 mb-1">税込</div>
                          <div className="text-lg font-semibold text-gray-800">
                            {item.unitPrice.toLocaleString()}円
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center border-r border-gray-200">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            min="0"
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-center"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="text-lg font-bold text-gray-800">
                            {calculateItemTotal(item).toLocaleString()}円
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* 合計行 */}
                    <tr className="bg-orange-100 border-t-2 border-orange-300">
                      <td className="px-6 py-4 font-bold text-orange-800 text-lg" colSpan="3">
                        合計金額
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-xl font-bold text-orange-800">
                          ¥{calculateTotal().toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              {/* 備考欄 */}
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
                                <div className="flex items-center space-x-4">
                                  <div className="text-sm text-gray-600">
                                    <span className="font-medium">使用済み: {getTotalUsedQuantity(product.productKey)}個</span>
                                    <span className="ml-2 text-orange-600 font-medium">
                                      残り: {getRemainingQuantity(product.productKey)}個
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => addNetaChangePattern(product.productKey)}
                                    disabled={getRemainingQuantity(product.productKey) <= 0}
                                    className={`px-3 py-1 text-sm rounded transition-colors ${
                                      getRemainingQuantity(product.productKey) <= 0
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                    }`}
                                  >
                                    <Plus size={14} className="inline mr-1" />
                                    変更パターン追加
                                  </button>
                                </div>
                              </div>

                              {/* 標準ネタ表示 */}
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

                              {/* ネタ変更パターン一覧 */}
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
                                          onChange={(e) => handleNetaChangeDetail(product.productKey, pattern.id, 'quantity', parseInt(e.target.value))}
                                          className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-center"
                                        />
                                        <span className="text-sm text-gray-600">
                                          個 (最大{getMaxQuantityForPattern(product.productKey, pattern.id)}個)
                                        </span>
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
                                      ※ チェックしたネタのみが入ります（チェックしていないネタは抜かれます）
                                    </div>
                                  </div>
                                ))}
                                
                                {(!formData.netaChanges[product.productKey] || formData.netaChanges[product.productKey].length === 0) && (
                                  <div className="text-center py-4 text-gray-500">
                                    <p className="text-sm">「変更パターン追加」ボタンをクリックしてネタ変更を設定してください</p>
                                  </div>
                                )}
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

                {/* 別日注文 */}
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

                {/* 一般的な備考 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    その他備考・特別な要望
                  </label>
                  <textarea
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="その他の特別な要望や注意事項があれば入力してください"
                  />
                </div>
              </div>
            </div>

            {/* 送信ボタン */}
            <div className="text-center pt-6">
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