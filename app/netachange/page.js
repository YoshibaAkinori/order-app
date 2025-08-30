"use client";
import React, { useState, useMemo } from 'react';
import { useConfiguration } from '../contexts/ConfigurationContext';
import Select from 'react-select';
// ★★★ 新しいAPIライブラリから関数をインポート ★★★
import { getNetaChangeOrdersAPI, updateNetaChangesAPI } from '../lib/netaChangeApi';

const NetaChangeAdminPage = () => {
  // ★★★ selectedYearをコンテキストから取得 ★★★
  const { configuration, netaMaster, loading: configLoading, selectedYear } = useConfiguration();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const deliveryDates = useMemo(() => (configuration?.deliveryDates || []), [configuration]);
  const deliveryWariate = useMemo(() => (configuration?.deliveryWariate || []), [configuration]);
  const productsMaster = useMemo(() => (configuration?.products || {}), [configuration]);
  const netaOptions = useMemo(() => (netaMaster || []).map(n => ({ value: n.netaName, label: n.netaName })), [netaMaster]);

  const handleFetch = async () => {
    if (!selectedDate || !selectedRoute) return;
    setIsLoading(true);
    try {
      // ★★★ APIライブラリの関数を使用（selectedYearを渡す） ★★★
      const data = await getNetaChangeOrdersAPI(selectedDate, selectedRoute, selectedYear);
      setOrders(data);
    } catch (e) {
      alert(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToNetaChange = (orderIndex, productKey, patternId, selectedOptions) => {
    const newOrders = [...orders];
    const targetOrder = newOrders[orderIndex];
    const targetPatterns = targetOrder.netaChanges[productKey];
    
    const newPatterns = targetPatterns.map(p => {
      if (p.id === patternId) {
        return { ...p, to_neta: selectedOptions.map(opt => opt.value) };
      }
      return p;
    });
    
    targetOrder.netaChanges[productKey] = newPatterns;
    setOrders(newOrders);
  };
  
  const handleSaveChanges = async (order) => {
    try {
      // ★★★ APIライブラリの関数を使用（selectedYearを渡す） ★★★
      await updateNetaChangesAPI(order, order.netaChanges, selectedYear);
      alert(`注文 ${order.orderId} のネタ変更を保存しました。`);
    } catch (e) {
      alert(e.message);
    }
  };
  
  if (configLoading) return <h4>設定読み込み中...</h4>;

  return (
    <div className="main-content">
      <h1 className="admin-header">ネタ変更 管理</h1>
      
      <div className="summary-controls">
        <div className="control-group">
          <label>集計日:</label>
          <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
            <option value="">日付選択</option>
            {deliveryDates.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
  
        <div className="control-group">
          <label>割り振り先:</label>
          <select value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)}>
            <option value="">担当選択</option>
              {deliveryWariate.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
          </select>
        </div>
  
        <button onClick={handleFetch} disabled={isLoading}>
           {isLoading ? '読込中...' : '表示'}
        </button>
      </div>

      <div className="neta-change-list">
        {orders.map((order, orderIndex) => 
          Object.keys(order.netaChanges || {}).map(productKey => {
            const item = order.orderItems.find(i => i.productKey === productKey);
            const originalNeta = productsMaster[productKey]?.neta.map(n => n.name) || [];

            return order.netaChanges[productKey].map(pattern => {
                const removedNeta = Object.keys(pattern.selectedNeta || {});
                if (removedNeta.length === 0) {
                    return null;
                }

                return (
                    <div key={pattern.id} className="neta-change-card">
                        <div className="neta-change-header">
                          <h3>{order.orderId} - {item?.name} (数量: {pattern.quantity})</h3>
                          <button onClick={() => handleSaveChanges(order)}>この注文を保存</button>
                        </div>
                        <div className="neta-change-columns">
                          <div className="neta-column">
                            <h4>元のネタ</h4>
                            <ul>{originalNeta.map(n => <li key={n}>{n}</li>)}</ul>
                          </div>
                          <div className="neta-column">
                            <h4>抜いたネタ</h4>
                            <ul>{removedNeta.map(n => <li key={n}>{n}</li>)}</ul>
                          </div>
                          <div className="neta-column">
                            <h4>入れるネタ</h4>
                            <Select
                                isMulti
                                options={netaOptions}
                                value={(pattern.to_neta || []).map(n => ({ value: n, label: n }))}
                                onChange={(opts) => handleToNetaChange(orderIndex, productKey, pattern.id, opts)}
                            />
                          </div>
                        </div>
                    </div>
                );
            })
          })
        )}
      </div>
    </div>
  );
};

export default NetaChangeAdminPage;