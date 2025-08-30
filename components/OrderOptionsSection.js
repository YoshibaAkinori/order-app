import React, { useState } from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';

const OrderOptionsSection = ({
  order,
  PRODUCTS,
  SIDE_ORDERS_DB,
  updateOrder,
  getOrderedProducts,
  addNetaChangePattern,
  removeNetaChangePattern,
  handleNetaChangeDetail,
  handleNetaSelection,
  handleNetaChangeBlur,
  getMaxQuantityForPattern,
  addSideOrder,
  updateSideOrderQuantity,
  removeSideOrder,
}) => {
  const [selectedSideOrder, setSelectedSideOrder] = useState('');

  const handleAddSideOrder = () => {
    addSideOrder(order.id, selectedSideOrder);
    setSelectedSideOrder('');
  };

  return (
    <div className="order-options-section">
      <h2 className="order-options-title">ネタ変更・その他の注文</h2>
      <div className="order-options-content">
        <div className="option-card">
          <div className="option-card-header">
            <button
              type="button"
              onClick={() => updateOrder(order.id, { hasNetaChange: !order.hasNetaChange })}
              className={`neta-change-btn ${order.hasNetaChange ? 'active' : 'inactive'}`}
            >
              {order.hasNetaChange ? '✓ 変更あり' : '商品変更'}
            </button>
            <span className="neta-change-btn-note">
              ネタ変更・ワサビ抜き・折など<br />
              商品の変更がある場合はクリックしてください
            </span>
          </div>

          {order.hasNetaChange && (
            <div className="neta-change-details-wrapper">
              {getOrderedProducts().length > 0 ? (
                <>
                  <h3 className="product-title"><Edit size={16} /> ご注文いただいた商品のネタ変更</h3>
                  {getOrderedProducts().map((product) => (
                    <div key={product.productKey} className="neta-change-product-block">
                      <div className="neta-change-product-header">
                        <h4 className="product-title">{product.name} × {product.quantity}個</h4>
                        <button
                          type="button"
                          onClick={() => addNetaChangePattern(product.productKey)}
                          disabled={getMaxQuantityForPattern(product.productKey, null) <= 0}
                          className="add-pattern-btn"
                        >
                          <Plus size={14} />変更パターン追加
                        </button>
                      </div>

                      <div>
                        <h5 className="standard-neta-title">標準ネタ:</h5>
                        <div className="standard-neta-list">
                          {PRODUCTS[product.productKey].neta.map((netaItem) => (
                            <span key={netaItem.name} className="standard-neta-item">
                            {/* 表示する内容も、オブジェクトから名前と数量を取り出すように修正 */}
                            {netaItem.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="neta-change-patterns-container">
                        {(order.netaChanges[product.productKey] || []).map((pattern, patternIndex) => (
                          <div key={pattern.id} className="neta-change-pattern">
                            <div className="pattern-header">
                              <h5 className="pattern-title">変更パターン {patternIndex + 1}</h5>
                              <div className="pattern-controls">
                                <label className="pattern-quantity-label">個数:</label>
                                <input
                                  type="number"
                                  min="1"
                                  max={getMaxQuantityForPattern(product.productKey, pattern.id)}
                                  value={pattern.quantity}
                                  onChange={(e) => handleNetaChangeDetail(product.productKey, pattern.id, 'quantity', e.target.value)}
                                  onBlur={() => handleNetaChangeBlur(product.productKey, pattern.id)}
                                  className="pattern-quantity-input"
                                />
                                <button type="button" onClick={() => removeNetaChangePattern(product.productKey, pattern.id)} className="remove-pattern-btn">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            <div className="neta-checkbox-item">
                              {/* ★ 1. ここで再度mapループを追加して、netaItemを定義する */}
                              {PRODUCTS[product.productKey].neta.map((netaItem) => (
                                <div key={netaItem.name} className="neta-checkbox-item">
                                  <input 
                                    type="checkbox" 
                                    id={`${product.productKey}-${pattern.id}-${netaItem.name}`} 
                                    checked={pattern.selectedNeta[netaItem.name] || false} 
                                    onChange={(e) => handleNetaSelection(product.productKey, pattern.id, netaItem.name, e.target.checked)} 
                                    className="neta-checkbox" 
                                  />
                                  <label 
                                    htmlFor={`${product.productKey}-${pattern.id}-${netaItem.name}`} 
                                    className="neta-label"
                                  >
                                    {netaItem.name}
                                  </label>
                                </div>
                              ))}
                            </div>

                            <p className="pattern-note">※ チェックしたネタが別のネタへ変更されます</p>
                            <div className="wasabi-ori-section">
                              <div className="wasabi-options">
                                <div className="wasabi-option">
                                  <input type="radio" id={`wasabi-ari-${pattern.id}`} name={`wasabi-option-${pattern.id}`} value="あり" checked={pattern.wasabi === 'あり'} onChange={(e) => handleNetaChangeDetail(product.productKey, pattern.id, 'wasabi', e.target.value)} className="wasabi-radio" />
                                  <label htmlFor={`wasabi-ari-${pattern.id}`} className="wasabi-label">サビ入り</label>
                                </div>
                                <div className="wasabi-option">
                                  <input type="radio" id={`wasabi-nuki-${pattern.id}`} name={`wasabi-option-${pattern.id}`} value="抜き" checked={pattern.wasabi === '抜き'} onChange={(e) => handleNetaChangeDetail(product.productKey, pattern.id, 'wasabi', e.target.value)} className="wasabi-radio" />
                                  <label htmlFor={`wasabi-nuki-${pattern.id}`} className="wasabi-label">サビ抜き</label>
                                </div>
                              </div>
                              <div className="ori-option">
                                <input
                                  type="checkbox"
                                  id={`ori-check-${pattern.id}`}
                                  checked={pattern.isOri || false}
                                  onChange={(e) => handleNetaChangeDetail(product.productKey, pattern.id, 'isOri', e.target.checked)}
                                  className="ori-checkbox"
                                />
                                <label htmlFor={`ori-check-${pattern.id}`} className="ori-label">折</label>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="no-products-message"> <p>まず商品を選択してください</p> </div>
              )}
            </div>
          )}
        </div>

        <div className="option-card">
          <h3 className="option-card-title">その他のご注文</h3>
          <div className="side-order-add-form">
            <select value={selectedSideOrder} onChange={(e) => setSelectedSideOrder(e.target.value)} className="side-order-select">
              <option value="">-- 商品を選択 --</option>
              {Object.keys(SIDE_ORDERS_DB).map(key => (
                <option key={key} value={key}>{SIDE_ORDERS_DB[key].name} - {SIDE_ORDERS_DB[key].price}円</option>
              ))}
            </select>
            <button type="button" onClick={handleAddSideOrder} disabled={!selectedSideOrder} className="add-side-order-btn"> <Plus size={16} /> 追加 </button>
          </div>
          
          <div className="side-order-list">
            {(order.sideOrders || []).map(item => (
              <div key={item.productKey} className="side-order-item">
                <div className="side-order-info">
                  <span className="side-order-name">{SIDE_ORDERS_DB[item.productKey]?.name}</span>
                  <span className="side-order-price">{SIDE_ORDERS_DB[item.productKey]?.price.toLocaleString()}円</span>
                </div>
                <div className="side-order-controls">
                  <input
                    type="number"
                    min="0"
                    value={item.quantity === 0 ? '' : item.quantity}
                    onChange={(e) => updateSideOrderQuantity(order.id, item.productKey, e.target.value)}
                    className="side-order-quantity"
                    placeholder="0"
                  />
                  <span>個</span>
                  <button type="button" onClick={() => removeSideOrder(order.id, item.productKey)} className="remove-side-order-btn"> <Trash2 size={16} /> </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default OrderOptionsSection;