"use client";
import React, { useState, useEffect } from 'react';
import styles from './ProductForm.module.css'; // 商品フォームのCSSを再利用

export default function NetaForm({ initialData, onSubmit, onCancel, netaMaster }) {
  const [formData, setFormData] = useState({
    netaName: '',
    category: '',
    displayOrder: 0,
  });

  useEffect(() => {
    if (initialData) {
      // 編集モードの場合
      setFormData(initialData);
    } else {
      // ★ 2. 新規作成モードの場合、表示順の最大値から次の値を計算する
      let maxOrder = 0;
      if (netaMaster && netaMaster.length > 0) {
        // netaMasterの中から最大のdisplayOrderを見つける
        maxOrder = Math.max(...netaMaster.map(neta => neta.displayOrder || 0));
      }
      setFormData({
        netaName: '',
        category: '',
        displayOrder: maxOrder + 1, // ★ 最大値に10を足したものを初期値とする
      });
    }
  }, [initialData, netaMaster]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : parseInt(value, 10)) : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent}>
        <form onSubmit={handleSubmit}>
          <h3>{initialData ? 'ネタを編集' : '新しいネタを追加'}</h3>
          <div className={styles.netaInputGroup}>
            <label>ネタ名</label>
            <input name="netaName" value={formData.netaName} onChange={handleChange} placeholder="例: まぐろ" required disabled={!!initialData} />
          </div>
          <div className={styles.netaInputGroup}>
            <label>カテゴリ</label>
            <input name="category" value={formData.category} onChange={handleChange} placeholder="例: 赤身" />
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