"use client";
import React, { useState, useEffect } from 'react';
import { useConfiguration } from '@/app/contexts/ConfigurationContext';
import styles from './ProductForm.module.css';

export default function ProductForm({ initialData, onSubmit, onCancel, editingType }) {
  const { configuration, netaMaster } = useConfiguration();
  
  // ★ 1. 選択されたネタのリストを保持するstate（{name, quantity}の配列）
  const [selectedNeta, setSelectedNeta] = useState([]);
  
  const [formData, setFormData] = useState({
    productKey: '',
    name: '',
    price: 0,
  });

  useEffect(() => {
    if (initialData) {
      // 編集モード
      setFormData(initialData);
      setSelectedNeta(initialData.neta || []);
    } else {
      // ★★★ ここからが修正箇所 ★★★
      // 新規作成モードの場合
      let maxKey = 0;
      let startNumber = 0;
      let targetKeys = [];
      
      if (configuration) {
        if (editingType === 'products') {
          // 通常メニューの場合
          startNumber = 1000;
          targetKeys = Object.keys(configuration.products || {}).map(Number);
        } else {
          // 特別メニューの場合
          startNumber = 2000;
          targetKeys = Object.keys(configuration.specialMenus || {}).map(Number);
        }
        
        if (targetKeys.length > 0) {
          maxKey = Math.max(...targetKeys);
        }
      }
      
      setFormData({
        // ★ 最大値が開始番号より小さい場合（最初の登録時など）は、開始番号+1をセット
        productKey: (maxKey < startNumber ? startNumber : maxKey) + 1,
        name: '',
        price: '',
      });
      setSelectedNeta([]);
    }
  }, [initialData, configuration, editingType]); // ★ 依存配列に editingType を追加

  const handleFormChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'number' ? (value === '' ? '' : parseInt(value, 10)) : value 
    }));
  };

  // ★ 2. チェックボックスが変更されたときの処理
  const handleNetaCheckboxChange = (e, netaName) => {
    const { checked } = e.target;
    if (checked) {
      // チェックされたら、数量1でリストに追加
      setSelectedNeta(prev => [...prev, { name: netaName, quantity: 1 }]);
    } else {
      // チェックが外れたら、リストから削除
      setSelectedNeta(prev => prev.filter(item => item.name !== netaName));
    }
  };

  // ★ 3. 数量が変更されたときの処理
  const handleNetaQuantityChange = (e, netaName) => {
    const quantity = parseInt(e.target.value, 10) > 0 ? parseInt(e.target.value, 10) : 1;
    setSelectedNeta(prev => 
      prev.map(item => 
        item.name === netaName ? { ...item, quantity: quantity } : item
      )
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submissionData = {
      ...formData,
      price: Number(formData.price),
      neta: selectedNeta, // ★ 最終的なネタのリストを渡す
    };
    onSubmit(submissionData);
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent}>
        <form onSubmit={handleSubmit}>
          <h3>{initialData ? '商品を編集' : '新しい商品を追加'}</h3>
          
          <div className={styles.netaInputGroup}>
            <label>商品キー</label>
            <input name="productKey" value={formData.productKey} readOnly disabled />
          </div>
          
          <div className={styles.netaInputGroup}>
            <label>商品名</label>
            <input name="name" value={formData.name} onChange={handleFormChange} placeholder="例: 極" required />
          </div>
          
          <div className={styles.netaInputGroup}>
            <label>価格</label>
            <input type="number" name="price" value={formData.price} onChange={handleFormChange} placeholder="例: 3580" required />
          </div>
          
          <div className={styles.formGroup}>
            <label>ネタを選択</label>
            {/* ★ 4. UIをチェックボックス＋数量入力に全面変更 */}
            <div className={styles.netaCheckboxContainer}>
              {(netaMaster || []).map(neta => {
                const isSelected = selectedNeta.some(item => item.name === neta.netaName);
                const currentItem = selectedNeta.find(item => item.name === neta.netaName);

                return (
                  <div key={neta.netaName} className={styles.netaItem}>
                    <div className={styles.checkboxItem}>
                      <input
                        type="checkbox"
                        id={neta.netaName}
                        value={neta.netaName}
                        checked={isSelected}
                        onChange={(e) => handleNetaCheckboxChange(e, neta.netaName)}
                      />
                      <label htmlFor={neta.netaName}>{neta.netaName}</label>
                    </div>
                    {isSelected && (
                      <input
                        type="number"
                        className={styles.netaQuantityInput}
                        value={currentItem.quantity}
                        onChange={(e) => handleNetaQuantityChange(e, neta.netaName)}
                        min="1"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className={styles.formActions}>
            <button type="button" onClick={onCancel} className={styles.cancelButton}>キャンセル</button>
            <button type="submit" className={styles.saveButton}>保存</button>
          </div>
        </form>
      </div>
    </div>
  );
}