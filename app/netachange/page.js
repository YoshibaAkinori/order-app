"use client";
import React, { useState, useMemo } from 'react';
import { useConfiguration } from '../contexts/ConfigurationContext';
import Select from 'react-select';

// API呼び出し用の関数 (別ファイルに分離するのが望ましい)
const getNetaChangeOrders = async (date, route) => {
  const formattedDate = date.replaceAll('/', '-');
  const apiUrl = `https://viy41bgkvd.execute-api.ap-northeast-1.amazonaws.com/neta-changes?date=${formattedDate}&route=${encodeURIComponent(route)}`;
  const response = await fetch(apiUrl);
  if (!response.ok) throw new Error('データ取得エラー');
  return await response.json();
};

const updateNetaChanges = async (order, newNetaChanges) => {
  const apiUrl = `https://viy41bgkvd.execute-api.ap-northeast-1.amazonaws.com/order-details/${order.receptionNumber}/${order.orderId}`;
  const response = await fetch(apiUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ netaChanges: newNetaChanges }),
  });
  if (!response.ok) throw new Error('保存に失敗しました。');
  return await response.json();
};


const NetaChangeAdminPage = () => {
  const { configuration, netaMaster, loading: configLoading } = useConfiguration();
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
      const data = await getNetaChangeOrders(selectedDate, selectedRoute);
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
      await updateNetaChanges(order, order.netaChanges);
      alert(`注文 ${order.orderId} のネタ変更を保存しました。`);
    } catch (e) {
      alert(e.message);
    }
  };
  
  if (configLoading) return <h4>設定読み込み中...</h4>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1 className="admin-header">ネタ変更 管理</h1>
      
      <div className="summary-controls" style={{ marginBottom: '2rem' }}>
        <label>集計日:</label>
        <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
          <option value="">日付選択</option>
          {deliveryDates.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <label>割り振り先:</label>
        <select value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)}>
          <option value="">担当選択</option>
          {deliveryWariate.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
        </select>
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
                // ★★★ 2. selectedNetaが存在し、中身がある場合のみ表示する ★★★
                const removedNeta = Object.keys(pattern.selectedNeta || {});
                if (removedNeta.length === 0) {
                    return null; // ワサビ抜きなどはここでスキップ
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