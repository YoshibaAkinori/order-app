"use client";
import React, { useState, useMemo, useCallback } from 'react';
import { useConfiguration } from '../contexts/ConfigurationContext';
import { searchOrders } from '../lib/orderApi';
import ChangeOrderPage from '../change/page';

// 注文情報を整形して表示するためのヘルパーコンポーネント
const OrderInfoCell = ({ order, productsMaster }) => {
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
              const removedNeta = Object.keys(pattern.selectedNeta || {});
              const isNetaStructurallyChanged = removedNeta.length > 0;
              
              let details = [];
              // ★ 純粋なネタ変更の場合、抜いたネタを表示
              if (isNetaStructurallyChanged) {
                details.push(`${removedNeta.join('、')}抜き`);
              }
              // ★ ワサビや折の情報は、ネタ変更の有無に関わらず追加
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

// ★ 2. 「備考」列を生成するためのヘルパーコンポーネント
const NotesCell = ({ order, productsMaster }) => {
  const notes = [];
  if (order.notes) {
    notes.push(order.notes);
  }
  // ★ paymentNoteプロパティを直接参照
  if (order.paymentNote) {
    notes.push(order.paymentNote);
  }
  (order.orderItems || []).forEach(item => {
    const change_patterns = item.change_patterns || [];
    change_patterns.forEach(pattern => {
      const originalNeta = productsMaster[item.productKey]?.neta.map(n => n.name) || [];
      const removedNeta = Object.keys(pattern.selectedNeta || {});
      const addedNeta = pattern.to_neta || [];
      
      // ★ 抜いたネタ、または追加したネタがある純粋なネタ変更の場合のみ備考を生成
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

  const deliveryDates = useMemo(() => (configuration?.deliveryDates || []), [configuration]);
  const deliveryRoutes = useMemo(() => (configuration?.deliveryRoutes || []), [configuration]);
  
  const productsMaster = useMemo(() => apiData?.masters?.products || {}, [apiData]);

  // ★★★ 1. このuseMemoフックを、以下の新しいロジックに丸ごと置き換える ★★★
  const processedOrders = useMemo(() => {
    if (!apiData || !apiData.orders) return [];

    const ordersWithNotes = apiData.orders.map(o => ({
      ...o,
      paymentNote: '',
      displayOrderTotal: o.orderTotal, // ★ 表示用の金額を新しく作る
    }));

    const ordersMap = new Map(ordersWithNotes.map(o => [o.orderId, o]));

    const allPaymentGroups = apiData.orders.flatMap(o => o.paymentGroups || []);
    const seenGroupIds = new Set();
    
    allPaymentGroups.forEach(group => {
      if (seenGroupIds.has(group.id)) return;
      seenGroupIds.add(group.id);

      const checkedOrderIds = Object.keys(group.checkedOrderIds || {});
      if (checkedOrderIds.length === 0) return;

      const payingOrderId = group.paymentDate; // これが支払日の注文番号
      
      // 支払う側の注文を処理
      const payingOrder = ordersMap.get(payingOrderId);
      if (payingOrder) {
        const paidForOrderIds = checkedOrderIds.filter(id => id !== payingOrderId);
        if (paidForOrderIds.length > 0) {
          payingOrder.paymentNote = `${paidForOrderIds.join(', ')} の分もお支払い`;
          payingOrder.displayOrderTotal = group.total; // ★ 金額をグループの合計に上書き
        }
      }

      // 支払われる側の注文を処理
      checkedOrderIds.forEach(id => {
        if (id !== payingOrderId) {
          const paidForOrder = ordersMap.get(id);
          if (paidForOrder) {
            paidForOrder.paymentNote = `${payingOrderId}でお支払い`;
            paidForOrder.displayOrderTotal = 0; // ★ 金額を0に上書き
          }
        }
      });
    });

    return Array.from(ordersMap.values());
  }, [apiData]);

  const handleFetch = async () => {
    if (!selectedDate) { alert('日付を選択してください。'); return; }
    setIsLoading(true); setError(null);
    try {
      // ★ APIからは常に日付全体のデータを取得する
      const data = await searchOrders(selectedDate, selectedRoute, selectedYear); 
      setApiData(data);
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

  
  // ★★★ 2. 絞り込みと並び替えのロジックを修正 ★★★
  const filteredOrders = useMemo(() => {
    // まず、加工済みの全注文リストから絞り込みを行う
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
    <div style={{ padding: '2rem' }}>
      {isChangeModalOpen && (
        <div className="modal-backdrop-sidebar" onClick={closeChangeModal}>
          <div className="modal-content-sidebar open" onClick={(e) => e.stopPropagation()}>
            <button onClick={closeChangeModal} className="close-button" style={{position: 'absolute', top: '1rem', right: '1rem'}}>&times;</button>
            <ChangeOrderPage initialOrderId={editingOrderId} isModalMode={true} onClose={closeChangeModal} />
          </div>
        </div>
      )}


      <h1 className="admin-header">注文一覧 ({selectedYear}年)</h1>
      
      <div className="list-controls">
        <div className="filters">
          <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
            <option value="">日付選択</option>
            {deliveryDates.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)}>
            <option value="">担当選択 (すべて)</option>
            {(deliveryRoutes || []).map(w => <option key={w} value={w}>{w}</option>)}
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
            <th>書類</th>
            <th>宛名</th>
            <th>注文情報</th>
            <th>備考</th>
            <th>支払金額</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map(order => (
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
              <td>{order.receiptType}</td>
              <td>{order.recipientName}</td>
              <td><OrderInfoCell order={order} productsMaster={productsMaster} /></td>
              <td><NotesCell order={order} productsMaster={productsMaster} /></td>
              <td>¥{(order.displayOrderTotal || 0).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrderListPage;