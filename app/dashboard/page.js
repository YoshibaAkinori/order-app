"use client";
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useConfiguration } from '../contexts/ConfigurationContext';
import { useOrderData } from '../contexts/OrderDataContext';
import { searchOrders } from '../lib/orderApi';
import ChangeOrderPage from '../change/page';
import Link from 'next/link';

// 注文情報を整形して表示するためのヘルパーコンポーネント
const OrderInfoCell = ({ order}) => {
  return (
    <div>
      {/* 通常商品 */}
      {(order.orderItems || []).map(item => {
        if (!item.quantity || item.quantity === 0) return null;

        const change_patterns = item.change_patterns || [];
        const changedQtyTotal = change_patterns.reduce((sum, p) => sum + p.quantity, 0);
        const normal_qty = item.quantity - changedQtyTotal;

        return (
          <React.Fragment key={item.productKey}>
            {/* 変更がない通常分 */}
            {normal_qty > 0 && <div>{item.name} × {normal_qty}</div>}
            
            {/* 変更パターンがある分 */}
            {change_patterns.map(pattern => {
              const removedNeta = Object.keys(pattern.selectedNeta || {})
                .filter(netaName => pattern.selectedNeta[netaName] === true);
              
              let details = [];
              if (isNetaStructurallyChanged) {
                details.push(`${removedNeta.join('、')}抜き`);
              }
              if (pattern.wasabi === '抜き') details.push('さび抜き');
              if (pattern.isOri) details.push('折');
              
              return (
                <div key={pattern.id}>
                  {item.name}
                  {details.length > 0 && ` (${details.join(' ')})`}
                  {' × '}{pattern.quantity}
                </div>
              );
            })}
          </React.Fragment>
        );
      })}
      {/* サイドオーダー */}
      {(order.sideOrders || []).map(item => (
        <div key={item.productKey}>{item.name} × {item.quantity}</div>
      ))}
    </div>
  );
};

// 「備考」列を生成するためのヘルパーコンポーネント
const NotesCell = ({ order, productsMaster }) => {
  const notes = [];
  if (order.notes) {
    notes.push(order.notes);
  }
  if (order.paymentNote) {
    notes.push(order.paymentNote);
  }
  (order.orderItems || []).forEach(item => {
    const change_patterns = item.change_patterns || [];
    change_patterns.forEach(pattern => {
      const originalNeta = productsMaster[item.productKey]?.neta.map(n => n.name) || [];
      const removedNeta = Object.keys(pattern.selectedNeta || {});
      const addedNeta = pattern.to_neta || [];
      
      if (removedNeta.length > 0 || addedNeta.length > 0) {
        const originalSet = new Set(originalNeta);
        removedNeta.forEach(neta => originalSet.delete(neta));
        addedNeta.forEach(neta => originalSet.add(neta));

        notes.push(
          `${item.name}(${pattern.quantity}個): ${removedNeta.join('、')} → ${addedNeta.join('、')}`
        );
      }
    });
  });
  return (
    <div>
      {notes.map((note, index) => (
        <div key={index}>{note}</div>
      ))}
    </div>
  );
};


const OrderListPage = () => {
  const { configuration, loading: configLoading, error: configError, selectedYear } = useConfiguration();
  const [apiData, setApiData] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const { setOrders, setCurrentDate } = useOrderData();
  

  useEffect(() => {
    // このコンポーネントが画面から消える時に実行されるクリーンアップ関数
    return () => {
      setOrders([]);
    };
  }, [setOrders]);

  const deliveryDates = useMemo(() => (configuration?.deliveryDates || []), [configuration]);
  const deliveryRoutes = useMemo(() => (configuration?.deliveryRoutes || []), [configuration]);
  
  const productsMaster = useMemo(() => apiData?.masters?.products || {}, [apiData]);

  const processedOrders = useMemo(() => {
    if (!apiData || !apiData.orders) return [];
    const ordersWithNotes = apiData.orders.map(o => ({
      ...o,
      paymentNote: '',
      displayOrderTotal: o.orderTotal,
    }));
    const ordersMap = new Map(ordersWithNotes.map(o => [o.orderId, o]));
    const allPaymentGroups = apiData.orders.flatMap(o => o.paymentGroups || []);
    const seenGroupIds = new Set();
    allPaymentGroups.forEach(group => {
      if (seenGroupIds.has(group.id)) return;
      seenGroupIds.add(group.id);
      const checkedOrderIds = Object.keys(group.checkedOrderIds || {});
      if (checkedOrderIds.length === 0) return;
      const payingOrderId = group.paymentDate;
      const payingOrder = ordersMap.get(payingOrderId);
      if (payingOrder) {
        const paidForOrderIds = checkedOrderIds.filter(id => id !== payingOrderId);
        if (paidForOrderIds.length > 0) {
          payingOrder.paymentNote = `${paidForOrderIds.join(', ')} の分もお支払い`;
          payingOrder.displayOrderTotal = group.total;
        }
      }
      checkedOrderIds.forEach(id => {
        if (id !== payingOrderId) {
          const paidForOrder = ordersMap.get(id);
          if (paidForOrder) {
            paidForOrder.paymentNote = `${payingOrderId}でお支払い`;
            paidForOrder.displayOrderTotal = 0;
          }
        }
      });
    });
    return Array.from(ordersMap.values());
  }, [apiData]);
  
  const handleFetch = async () => {
    if (!selectedDate) { alert('日付を選択してください。'); return; }
    setIsLoading(true); 
    setError(null);
    setSelectedRoute('');
    setOrders([]);
    setCurrentDate(selectedDate);
    try {
      const data = await searchOrders(selectedDate, selectedYear); 
      setApiData(data);
      setOrders(data.orders || []);
    } catch (err) { setError(err.message); setApiData(null); }
    finally { setIsLoading(false); }
  };

  const openChangeModal = (orderId) => {
    setEditingOrderId(orderId);
    setIsChangeModalOpen(true);
  };
  const closeChangeModal = () => {
    setEditingOrderId(null);
    setIsChangeModalOpen(false);
    handleFetch();
  };
  
  const filteredOrders = useMemo(() => {
    const filteredByRoute = selectedRoute 
      ? processedOrders.filter(order => order.assignedRoute === selectedRoute)
      : processedOrders;
    const filteredBySearch = searchTerm
      ? filteredByRoute.filter(order => 
          Object.values(order).some(value => 
            String(value).toLowerCase().includes(searchTerm.toLowerCase())
          )
        )
      : filteredByRoute;
    return filteredBySearch.sort((a, b) => (a.orderId || '').localeCompare(b.orderId || ''));
  }, [processedOrders, selectedRoute, searchTerm]);

  if (configLoading) return <h4>設定読み込み中...</h4>;

  return (
    <div className="main-content">
      {isChangeModalOpen && (
        <div className="modal-backdrop-sidebar" onClick={closeChangeModal}>
          <div className="modal-content-sidebar open" onClick={(e) => e.stopPropagation()}>
            <button onClick={closeChangeModal} className="close-button" style={{position: 'absolute', top: '1rem', right: '1rem'}}>&times;</button>
            <ChangeOrderPage initialOrderId={editingOrderId} isModalMode={true} onClose={closeChangeModal} />
          </div>
        </div>
      )}

      <h1 className="admin-header">注文一覧 ({selectedYear}年)</h1>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end',
        marginBottom: '10px'
      }}>
        <div style={{ 
          fontSize: '1.5em', 
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ color: 'blue', fontWeight: 'bold' }}>領収書：青</span>
          <span style={{ margin: '0 5px' }}>|</span>
          <span style={{ color: '#C00000', fontWeight: 'bold' }}>請求書：赤</span>
        </div>
      </div>
      
      <div className="list-controls">
        <div className="filters">
          <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
            <option value="">日付選択</option>
            {deliveryDates.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button onClick={handleFetch} disabled={isLoading}>
            {isLoading ? '読込中...' : '表示'}
          </button>
        </div>
        <div className="search-and-export">
          <input 
            type="text" 
            placeholder="一覧内を検索..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)}>
            <option value="">担当選択 (すべて)</option>
            {(deliveryRoutes || []).map(w => <option key={w} value={w}>{w}</option>)}
          </select>
          <button>一覧Excel</button>
          <button>ラベルExcel</button>
          <button>宛名Excel</button>
        </div>
      </div>

      {error && <p style={{color: 'red'}}>エラー: {error}</p>}

      <table className="order-list-table">
        <thead>
          <tr>
            <th>注文番号</th>
            <th>住所</th>
            <th>時間</th>
            <th>担当者</th>
            <th>電話番号</th>
            <th>宛名</th>
            <th>注文情報</th>
            <th>備考</th>
            <th>支払金額</th>
            <th>割り当て</th>
            <th className="px-4 py-2">PDF出力</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map(order => {
            const hasEmail = order.customerInfo && order.customerInfo.email;
          return(
            <tr key={order.orderId}>
              <td>
                <button onClick={() => openChangeModal(order.orderId)} className="link-button">
                  {order.orderId}
                </button>
              </td>
              <td>{order.deliveryAddress}</td>
              <td>{order.deliveryTime}</td>
              <td>{order.contactName}</td>
              <td>{order.tel}</td>
              {/* ### ▼▼▼ 変更箇所 ▼▼▼ ### */}
              <td>
                {(order.receipts || [])
                  .filter(receipt => receipt.issueDate === order.orderId) // 1. issueDate と orderId が一致するものだけを抽出
                  .map((receipt, index) => {
                    // 2. documentType に応じてスタイルを定義
                    const recipientStyle = {
                      color: receipt.documentType === '領収書' ? 'blue' : (receipt.documentType === '請求書' ? '#C00000' : 'inherit'),
                      fontWeight: 'bold'
                    };

                    return (
                      <div key={receipt.id || index} style={recipientStyle}>
                        {receipt.recipientName}
                      </div>
                    );
                })}
              </td>
              {/* ### ▲▲▲ 変更箇所 ▲▲▲ ### */}
              <td><OrderInfoCell order={order} productsMaster={productsMaster} /></td>
              <td><NotesCell order={order} productsMaster={productsMaster} /></td>
              <td>¥{(order.displayOrderTotal || 0).toLocaleString()}</td>
              <td>{order.assignedRoute}</td>
              <td className="border px-4 py-2 text-center">
                {hasEmail ? (
                  <Link
                    href={`/order-confirmation/${order.receptionNumber}/${selectedYear}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gray-button"
                  >
                    PDF
                  </Link>
                ) : (
                  <Link
                    href={`/order-confirmation/${order.receptionNumber}/${selectedYear}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="red-border-button"
                  >
                    PDF
                  </Link>
                )}
              </td>
            </tr>
          );
        })}
        </tbody>
      </table>
    </div>
  );
};

export default OrderListPage;