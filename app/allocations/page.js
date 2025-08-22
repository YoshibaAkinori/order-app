"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { useConfiguration } from '../contexts/ConfigurationContext';
import { getOrdersByDate, updateAllocations } from '../lib/allocationApi';

const AllocationPage = () => {
  const { configuration, loading: configLoading, error: configError, selectedYear } = useConfiguration();
  const [selectedDate, setSelectedDate] = useState('');
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedPrefix, setExpandedPrefix] = useState(null);
  
  // ★ 1. 割り当ての状態を管理するstate (キーは 'C' や 'C-3' など)
  const [assignments, setAssignments] = useState({});

  const deliveryDates = useMemo(() => (configuration?.deliveryDates || []), [configuration]);
  const allocationMaster = useMemo(() => (configuration?.allocationMaster || {}), [configuration]);
  const deliveryRoutes = useMemo(() => (configuration?.deliveryRoutes || []), [configuration]);

  useEffect(() => {
    if (orders.length > 0) {
      const restoredAssignments = {};
      const assignmentsByPrefix = {}; // 各割振番号ごとの割り当てを一時的に集計

      orders.forEach(order => {
        if (order.assignedRoute) {
          const prefix = order.orderId?.[2];
          
          if (order.isSameAddress === false || !prefix || !allocationMaster[prefix] || allocationMaster[prefix].address === 'その他') {
            restoredAssignments[order.orderId] = order.assignedRoute;
          } else {
            const floor = order.orderId?.[3] || '階数未定';
            const floorKey = `${prefix}-${floor}`;
            restoredAssignments[floorKey] = order.assignedRoute;
            
            // 全体割り当てを推測するために、prefixごとの割り当てを記録
            if (!assignmentsByPrefix[prefix]) {
              assignmentsByPrefix[prefix] = [];
            }
            assignmentsByPrefix[prefix].push(order.assignedRoute);
          }
        }
      });

      // 記録した情報から、全体割り当てを決定
      Object.keys(assignmentsByPrefix).forEach(prefix => {
        const routes = assignmentsByPrefix[prefix];
        if (routes.length > 0) {
          const firstRoute = routes[0];
          // そのprefixの全ての注文が同じ割り当て先なら、全体割り当てもセットする
          if (routes.every(route => route === firstRoute)) {
            restoredAssignments[prefix] = firstRoute;
          }
        }
      });

      setAssignments(restoredAssignments);
    }
  }, [orders, allocationMaster]);
  
  const handleDateChange = async (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    setExpandedPrefix(null);
    setAssignments({}); // 日付が変わったら割り当てをリセット
    if (!date) {
      setOrders([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const formattedDate = date.replaceAll('/', '-');
      const fetchedOrders = await getOrdersByDate(formattedDate);
      setOrders(fetchedOrders);
    } catch (err) {
      setError(err.message);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const { summaryData, groupedByFloor, exceptionOrders } = useMemo(() => {
    const summary = {};
    const grouped = {};
    const exceptions = [];

    Object.keys(allocationMaster).forEach(prefix => {
      summary[prefix] = { totalQuantity: 0, orderCount: 0 };
    });

    orders.forEach(order => {
      const prefix = order.orderId?.[2];
      if (order.isSameAddress === false || !prefix || !allocationMaster[prefix] || allocationMaster[prefix].address === 'その他') {
        exceptions.push(order);
      } else {
        const floor = order.orderId?.[3] || '階数未定';
        const orderTotalQuantity = (order.orderItems || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
        
        if (summary[prefix]) {
          summary[prefix].totalQuantity += orderTotalQuantity;
          summary[prefix].orderCount += 1;
        }

        if (!grouped[prefix]) grouped[prefix] = {};
        if (!grouped[prefix][floor]) grouped[prefix][floor] = [];
        grouped[prefix][floor].push(order);
      }
    });

    return { summaryData: summary, groupedByFloor: grouped, exceptionOrders: exceptions };
  }, [orders, allocationMaster]);
  
  // ★ 2. 割り当てを変更する、より賢いハンドラ関数
  const handleAssignmentChange = (key, route) => {
    setAssignments(prevAssignments => {
      const newAssignments = { ...prevAssignments };
      newAssignments[key] = route;
  
      // 全体キー('C'など)が変更された場合、その下の階層の「個別設定」をクリアして全体設定に追従させる
      if (key.length === 1) {
        if (groupedByFloor[key]) {
          Object.keys(groupedByFloor[key]).forEach(floor => {
            delete newAssignments[`${key}-${floor}`];
          });
        }
      }
      return newAssignments;
    });
  };
  
  const summaryTotals = useMemo(() => {
    const summary = {};
    deliveryRoutes.forEach(route => summary[route] = 0);

    Object.keys(groupedByFloor).forEach(prefix => {
      Object.keys(groupedByFloor[prefix]).forEach(floor => {
        const floorKey = `${prefix}-${floor}`;
        const assignedRoute = assignments[floorKey] || assignments[prefix];
        if (assignedRoute) {
          const totalQuantity = groupedByFloor[prefix][floor].reduce((sum, order) => sum + (order.orderItems || []).reduce((s, i) => s + (i.quantity || 0), 0), 0);
          summary[assignedRoute] += totalQuantity;
        }
      });
    });

    // ★ 個別対応の注文も集計に含める
    exceptionOrders.forEach(order => {
      const assignedRoute = assignments[order.orderId];
      if (assignedRoute) {
        const totalQuantity = (order.orderItems || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
        summary[assignedRoute] += totalQuantity;
      }
    });

    return summary;
  }, [groupedByFloor, exceptionOrders, assignments, deliveryRoutes]);

  const toggleDetails = (prefix) => {
    setExpandedPrefix(prev => (prev === prefix ? null : prefix));
  };

  const handleUpdateAssignments = async () => {
    if (Object.keys(assignments).length === 0) {
      alert('割り当てが選択されていません。');
      return;
    }
    
    // 処理中であることをユーザーに伝える（任意）
    const updatingButton = document.querySelector('.confirm-btn');
    if(updatingButton) updatingButton.textContent = '更新中...';

    try {
      const formattedDate = selectedDate.replaceAll('/', '-');
      const result = await updateAllocations(formattedDate, assignments);
      alert(result.message);
    } catch (err) {
      alert(`エラー: ${err.message}`);
    } finally {
      if(updatingButton) updatingButton.textContent = '割振決定 更新';
    }
  };


  if (configLoading) return <h4>設定データを読み込んでいます...</h4>;
  if (configError) return <h4 style={{color: 'red'}}>エラー: {configError}</h4>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1 className="admin-header">割り当て管理 ({selectedYear}年)</h1>
      
      <div className="admin-controls-container">
        <div>
          <label>配達日を選択: </label>
          <select value={selectedDate} onChange={handleDateChange}>
            <option value="">-- 日付を選択 --</option>
            {deliveryDates.map(date => (<option key={date} value={date}>{date}</option>))}
          </select>
        </div>
      </div>
      
      {isLoading && <p>注文データを読み込み中...</p>}
      {error && <p style={{color: 'red'}}>エラー: {error}</p>}

      {selectedDate && !isLoading && (
        <div className="allocation-container">
          <div className="allocation-task-list">
            <table className='allocation-table'>
              <thead>
                <tr>
                  <th>割振番号</th>
                  <th>入力内容</th>
                  <th>注文合計数</th>
                  <th>全体割り振り</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(summaryData)
                  .filter(prefix => allocationMaster[prefix]?.address !== 'その他')
                  .sort()
                  .map(prefix => (
                  <React.Fragment key={prefix}>
                    <tr onClick={() => toggleDetails(prefix)} style={{ cursor: 'pointer', backgroundColor: expandedPrefix === prefix ? '#eef2ff' : 'transparent' }}>
                      <td>{prefix}</td>
                      <td>{allocationMaster[prefix]?.address}</td>
                      <td>{summaryData[prefix].totalQuantity}</td>
                      <td>
                        <select
                          value={assignments[prefix] || ''}
                          onChange={(e) => handleAssignmentChange(prefix, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="">---</option>
                          {deliveryRoutes.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                    </tr>
                    {expandedPrefix === prefix && (
                      <tr>
                        <td colSpan="4" style={{ padding: '0.5rem 1rem' }}>
                          <table className='allocation-table nested-table'>
                            <thead>
                              <tr>
                                <th>階数</th>
                                <th>合計個数</th>
                                <th>階数ごと割り当て</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.keys(groupedByFloor[prefix] || {}).sort().map(floor => {
                                const floorKey = `${prefix}-${floor}`;
                                const totalQuantityForFloor = groupedByFloor[prefix][floor].reduce((total, order) => total + (order.orderItems || []).reduce((sum, item) => sum + (item.quantity || 0), 0), 0);
                                return (
                                  <tr key={floor}>
                                    <td>{floor}</td>
                                    <td>{totalQuantityForFloor}</td>
                                    <td>
                                      <select
                                        value={assignments[floorKey] || assignments[prefix] || ''}
                                        onChange={(e) => handleAssignmentChange(floorKey, e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <option value="">---</option>
                                        {deliveryRoutes.map(r => <option key={r} value={r}>{r}</option>)}
                                      </select>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            {exceptionOrders.length > 0 && (
              <div className="admin-menu-section" style={{ marginTop: '2rem' }}>
                <h2>個別対応（その他・別住所）</h2>
                <table className='allocation-table'>
                  <thead><tr><th>注文番号</th><th>お届け先（手入力）</th><th>合計個数</th><th>割り振り</th></tr></thead>
                  <tbody>
                    {exceptionOrders.map(order => (
                      <tr key={order.orderId}>
                        <td>{order.orderId}</td>
                        <td>{order.deliveryAddress}</td>
                        <td>{(order.orderItems || []).reduce((sum, item) => sum + (item.quantity || 0), 0)}</td>
                        <td>
                          <select
                            value={assignments[order.orderId] || ''}
                            onChange={(e) => handleAssignmentChange(order.orderId, e.target.value)}
                          >
                            <option value="">---</option>
                            {deliveryRoutes.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="allocation-summary">
            <h3>結果</h3>
            <table className='allocation-table'>
              <tbody>
                {Object.keys(summaryTotals).map(route => (
                  <tr key={route}>
                    <td>{route}</td>
                    <td>{summaryTotals[route]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button 
              className="confirm-btn" 
              style={{width: '100%', marginTop: '1rem'}}
              onClick={handleUpdateAssignments}
            >
              割振決定 更新
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllocationPage;