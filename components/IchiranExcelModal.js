"use client";
import React, { useState } from 'react';
import styles from './ProductForm.module.css'; // 既存のCSSを再利用

const IchiranExcelModal = ({ allRoutes = [], onClose, onSubmit }) => {
  // 選択されたルートを管理するためのstate
  const [selectedRoutes, setSelectedRoutes] = useState([]);

  // チェックボックスの状態が変更されたときの処理
  const handleRouteChange = (e) => {
    const { value: routeName, checked } = e.target;
    setSelectedRoutes(prev => {
      if (checked) {
        return [...prev, routeName]; // チェックされたら追加
      } else {
        return prev.filter(r => r !== routeName); // チェックが外れたら削除
      }
    });
  };
  
  // 「全選択/全解除」のチェックボックスが変更されたときの処理
  const handleSelectAllChange = (e) => {
    if (e.target.checked) {
      setSelectedRoutes(allRoutes); // すべてのルートを選択
    } else {
      setSelectedRoutes([]); // すべての選択を解除
    }
  };


  // 作成ボタンが押されたときの処理
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(selectedRoutes); // 親コンポーネントに選択されたルートを渡す
  };

  const isAllSelected = allRoutes.length > 0 && selectedRoutes.length === allRoutes.length;

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <h3>一覧Excelを作成</h3>
          <p>Excelに含める配達ルートを選択してください。</p>

          <div className={styles.formGroup}>
            {/* ★ 全選択用のチェックボックスを追加 */}
            <div className={styles.checkboxItem} style={{ borderBottom: '1px solid #ccc', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="checkbox"
                id="select-all-routes"
                checked={isAllSelected}
                onChange={handleSelectAllChange}
              />
              <label htmlFor="select-all-routes" style={{ fontWeight: 'bold' }}>すべて選択 / 解除</label>
            </div>
            
            <div className={styles.netaCheckboxContainer}>
              {allRoutes.map((route, index) => (
                <div key={index} className={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    id={`route-${index}`}
                    value={route}
                    checked={selectedRoutes.includes(route)}
                    onChange={handleRouteChange}
                  />
                  <label htmlFor={`route-${index}`}>{route}</label>
                </div>
              ))}
            </div>
          </div>
          
          <div className={styles.formActions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>キャンセル</button>
            <button type="submit" className={styles.saveButton}>作成</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IchiranExcelModal;