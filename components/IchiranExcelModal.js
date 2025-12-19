"use client";
import React, { useState, useMemo } from 'react';

const IchiranExcelModal = ({ allRoutes = [], deliveryWariate = [], onClose, onSubmit }) => {
  const [selectedWariate, setSelectedWariate] = useState('');
  const [checkedRoutes, setCheckedRoutes] = useState({});

  // 割り当てを選択したときの処理
  const handleWariateSelect = (wariateName) => {
    setSelectedWariate(wariateName);
    const wariate = deliveryWariate.find(w => w.name === wariateName);
    if (wariate) {
      // 該当する割り当てのresponsibleRoutesを全てtrueにする
      const newCheckedRoutes = {};
      (wariate.responsibleRoutes || []).forEach(route => {
        newCheckedRoutes[route] = true;
      });
      setCheckedRoutes(newCheckedRoutes);
    }
  };

  // チェックボックスの変更処理
  const handleRouteCheck = (route) => {
    setCheckedRoutes(prev => ({
      ...prev,
      [route]: !prev[route]
    }));
  };

  // 作成ボタンの処理
  const handleSubmit = () => {
    const selectedRoutes = Object.keys(checkedRoutes).filter(route => checkedRoutes[route]);
    if (selectedRoutes.length === 0) {
      alert('少なくとも1つのルートを選択してください。');
      return;
    }
    onSubmit(selectedRoutes);
  };

  // 表示するルート一覧（選択された割り当てのresponsibleRoutes）
  const displayRoutes = useMemo(() => {
    if (!selectedWariate) return [];
    const wariate = deliveryWariate.find(w => w.name === selectedWariate);
    return wariate?.responsibleRoutes || [];
  }, [selectedWariate, deliveryWariate]);

  return (
    <div className="settings-modal-backdrop" onClick={onClose}>
      <div className="settings-modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h2>一覧Excelを作成</h2>
          <button onClick={onClose} className="settings-modal-close-btn">&times;</button>
        </div>
        
        {/* 割り当て選択ボタン */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {(deliveryWariate || []).map(wariate => (
            <button 
              key={wariate.name} 
              onClick={() => handleWariateSelect(wariate.name)}
              style={{ 
                flex: '1',
                minWidth: '100px',
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: selectedWariate === wariate.name ? '#e91e63' : '#ccc',
                color: selectedWariate === wariate.name ? 'white' : '#333',
                opacity: selectedWariate === wariate.name ? 1 : 0.6
              }}
            >
              {wariate.name}
            </button>
          ))}
        </div>

        {/* ルートチェックボックス */}
        {selectedWariate && (
          <>
            <div style={{ 
              border: '1px solid #ddd', 
              borderRadius: '4px', 
              padding: '1rem',
              marginBottom: '1rem',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: '#666' }}>
                出力するルート:
              </div>
              {displayRoutes.map(route => (
                <label 
                  key={route} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    padding: '0.3rem 0',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checkedRoutes[route] || false}
                    onChange={() => handleRouteCheck(route)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  {route}
                </label>
              ))}
            </div>

            <button 
              onClick={handleSubmit}
              style={{ 
                width: '100%',
                padding: '0.75rem 1rem',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: '#e91e63',
                color: 'white',
                fontWeight: 'bold'
              }}
            >
              {selectedWariate} 用で作成
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default IchiranExcelModal;