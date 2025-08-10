"use client";
import React, { useState, useEffect } from 'react';
import styles from './ProductForm.module.css'; // 既存のCSSを再利用

export default function AllocationForm({ initialData, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    allocationPrefix: '',
    locationName: '',
    address: '',
    tel: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({ allocationPrefix: '', locationName: '', address: '', tel: '' });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent}>
        <form onSubmit={handleSubmit}>
          <h3>{initialData ? '割り当て情報を編集' : '新しい割り当てを追加'}</h3>
          <div className={styles.netaInputGroup}>
            <label>割り当て<br />アルファベット</label>
            <input name="allocationPrefix" value={formData.allocationPrefix} onChange={handleChange} placeholder="例: A" required disabled={!!initialData} />
          </div>
          <div className={styles.netaInputGroup}>
            <label>住所</label>
            <input name="address" value={formData.address} onChange={handleChange} placeholder="例: 県庁" />
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