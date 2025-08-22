"use client";
import React, { useState, useEffect } from 'react';
import { useConfiguration } from '../app/contexts/ConfigurationContext';
import styles from './ProductForm.module.css'; // 既存のCSSを再利用

const WariateForm = ({ initialData, onSubmit, onCancel }) => {
  const { configuration } = useConfiguration();
  const deliveryRoutes = configuration?.deliveryRoutes || [];

  const [formData, setFormData] = useState({
    name: '',
    responsibleRoutes: [],
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({ name: '', responsibleRoutes: [] });
    }
  }, [initialData]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, name: e.target.value }));
  };

  const handleRouteChange = (e) => {
    const { value: routeName, checked } = e.target;
    setFormData(prev => {
      const currentRoutes = prev.responsibleRoutes || [];
      if (checked) {
        return { ...prev, responsibleRoutes: [...currentRoutes, routeName] };
      } else {
        return { ...prev, responsibleRoutes: currentRoutes.filter(r => r !== routeName) };
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent}>
        <form onSubmit={handleSubmit}>
          <h3>{initialData ? '割り当てを編集' : '新しい割り当てを追加'}</h3>
          <div className={styles.netaInputGroup}>
            <label>割り当て名</label>
            <input name="name" value={formData.name} onChange={handleChange} required />
          </div>

          <div className={styles.formGroup}>
            <label>担当する割り振りを選択</label>
            <div className={styles.netaCheckboxContainer}>
              {deliveryRoutes.map((route, index) => (
                <div key={index} className={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    id={`route-${index}`}
                    value={route}
                    checked={(formData.responsibleRoutes || []).includes(route)}
                    onChange={handleRouteChange}
                  />
                  <label htmlFor={`route-${index}`}>{route}</label>
                </div>
              ))}
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
};

export default WariateForm;