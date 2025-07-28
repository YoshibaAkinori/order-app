import React from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';

const OrderOptionsSection = ({
  order,
  PRODUCTS,
  updateOrder,
  getOrderedProducts,
  addNetaChangePattern,
  removeNetaChangePattern,
  handleNetaChangeDetail,
  handleNetaSelection,
  getMaxQuantityForPattern
}) => {
  return (
    <div className="order-options-section">
      <h2 className="order-options-title">ネタ変更 オプション</h2>
      <div className="order-options-content">
        <div className="option-card">
          <div className="option-card-header">
            <button
              type="button"
              onClick={() => updateOrder(order.id, { hasNetaChange: !order.hasNetaChange })}
              className={`neta-change-btn ${order.hasNetaChange ? 'active' : 'inactive'}`}
            >
              {order.hasNetaChange ? '✓ ネタ変更あり' : 'ネタ変更'}
            </button>
            <span className="neta-change-btn-note">
              ネタの変更がある場合はクリックしてください
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
                            <span key={netaItem} className="standard-neta-item">{netaItem}</span>
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
                                  className="pattern-quantity-input"
                                />
                                <button type="button" onClick={() => removeNetaChangePattern(product.productKey, pattern.id)} className="remove-pattern-btn">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            <div className="neta-checkbox-grid">
                              {PRODUCTS[product.productKey].neta.map((netaItem) => (
                                <div key={netaItem} className="neta-checkbox-item">
                                  <input type="checkbox" id={`${product.productKey}-${pattern.id}-${netaItem}`} checked={pattern.selectedNeta[netaItem] || false} onChange={(e) => handleNetaSelection(product.productKey, pattern.id, netaItem, e.target.checked)} className="neta-checkbox" />
                                  <label htmlFor={`${product.productKey}-${pattern.id}-${netaItem}`} className="neta-label">{netaItem}</label>
                                </div>
                              ))}
                            </div>
                            <p className="pattern-note">※ チェックしたネタが別のネタへ変更されます</p>
                            <div className="wasabi-section">
                              <h6 className="wasabi-title">ワサビ</h6>
                              <div className="wasabi-options">
                                <div className="wasabi-option">
                                  <input type="radio" id={`wasabi-ari-${pattern.id}`} name={`wasabi-option-${pattern.id}`} value="あり" checked={pattern.wasabi === 'あり'} onChange={(e) => handleNetaChangeDetail(product.productKey, pattern.id, 'wasabi', e.target.value)} className="wasabi-radio" />
                                  <label htmlFor={`wasabi-ari-${pattern.id}`} className="wasabi-label">あり</label>
                                </div>
                                <div className="wasabi-option">
                                  <input type="radio" id={`wasabi-nuki-${pattern.id}`} name={`wasabi-option-${pattern.id}`} value="抜き" checked={pattern.wasabi === '抜き'} onChange={(e) => handleNetaChangeDetail(product.productKey, pattern.id, 'wasabi', e.target.value)} className="wasabi-radio" />
                                  <label htmlFor={`wasabi-nuki-${pattern.id}`} className="wasabi-label">抜き</label>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="no-products-message">
                  <p>まず商品を選択してください</p>
                </div>
              )}

              <div>
                <label className="details-textarea-label">その他ネタ変更の詳細</label>
                <textarea value={order.netaChangeDetails} onChange={(e) => updateOrder(order.id, { netaChangeDetails: e.target.value })} rows="3" className="details-textarea" placeholder="上記以外のネタ変更や特別な要望があれば記入してください" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderOptionsSection;