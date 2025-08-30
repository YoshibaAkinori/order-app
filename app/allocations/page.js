// yoshibaakinori/order-app/order-app-8094ec39b25a835d91830515c67061c5f07dcf37/app/allocations/page.js

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
  
  const [assignments, setAssignments] = useState({});

  const deliveryDates = useMemo(() => (configuration?.deliveryDates || []), [configuration]);
  const allocationMaster = useMemo(() => (configuration?.allocationMaster || {}), [configuration]);
  const deliveryRoutes = useMemo(() => (configuration?.deliveryRoutes || []), [configuration]);
  const deliveryWariate = useMemo(() => (configuration?.deliveryWariate || []), [configuration]);

  useEffect(() => {
    if (orders.length > 0) {
      const restoredAssignments = {};
      const assignmentsByPrefix = {}; 

      orders.forEach(order => {
        if (order.assignedRoute) {
          const orderId = order.orderId;
          const prefix = orderId?.[2];
          
          if (order.isSameAddress === false || !prefix || !allocationMaster[prefix] || allocationMaster[prefix].address === 'その他') {
            restoredAssignments[orderId] = order.assignedRoute;
          } else {
            // ### ▼▼▼ 変更箇所1 ▼▼▼ ###
            const floorMatch = orderId ? orderId.match(/^\d+[A-Z](\d+)/) : null;
            const floor = floorMatch ? floorMatch[1] : '階数未定';
            // ### ▲▲▲ 変更箇所 ▲▲▲ ###
            const floorKey = `${prefix}-${floor}`;
            restoredAssignments[floorKey] = order.assignedRoute;
            
            if (!assignmentsByPrefix[prefix]) {
              assignmentsByPrefix[prefix] = [];
            }
            assignmentsByPrefix[prefix].push(order.assignedRoute);
          }
        }
      });

      Object.keys(assignmentsByPrefix).forEach(prefix => {
        const routes = assignmentsByPrefix[prefix];
        if (routes.length > 0) {
          const firstRoute = routes[0];
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
    setAssignments({}); 
    if (!date) {
      setOrders([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const formattedDate = date.replaceAll('/', '-');
      const fetchedOrders = await getOrdersByDate(formattedDate,selectedYear);
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
      const orderId = order.orderId;
      const prefix = orderId?.[2];
      
      if (order.isSameAddress === false || !prefix || !allocationMaster[prefix] || allocationMaster[prefix].address === 'その他') {
        exceptions.push(order);
      } else {
        // ### ▼▼▼ 変更箇所2 ▼▼▼ ###
        const floorMatch = orderId ? orderId.match(/^\d+[A-Z](\d+)/) : null;
        const floor = floorMatch ? floorMatch[1] : '階数未定';
        // ### ▲▲▲ 変更箇所 ▲▲▲ ###
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
  
  const handleAssignmentChange = (key, route) => {
    setAssignments(prevAssignments => {
      const newAssignments = { ...prevAssignments };
      newAssignments[key] = route;
  
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
  
  const summaryTotalsByRoute = useMemo(() => {
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
    exceptionOrders.forEach(order => {
      const assignedRoute = assignments[order.orderId];
      if (assignedRoute) {
        const totalQuantity = (order.orderItems || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
        summary[assignedRoute] += totalQuantity;
      }
    });
    return summary;
  }, [groupedByFloor, exceptionOrders, assignments, deliveryRoutes]);


  const summaryTotalsByWariate = useMemo(() => {
    const wariateTotals = {};
    (deliveryWariate || []).forEach(w => wariateTotals[w.name] = 0);

    const routeToWariateMap = {};
    (deliveryWariate || []).forEach(w => {
      (w.responsibleRoutes || []).forEach(r => {
        routeToWariateMap[r] = w.name;
      });
    });

    Object.keys(summaryTotalsByRoute).forEach(route => {
      const wariateName = routeToWariateMap[route];
      if (wariateName) {
        wariateTotals[wariateName] += summaryTotalsByRoute[route];
      }
    });
    
    return wariateTotals;
  }, [summaryTotalsByRoute, deliveryWariate]);

  const toggleDetails = (prefix) => {
    setExpandedPrefix(prev => (prev === prefix ? null : prefix));
  };

  const handleUpdateAssignments = async () => {
    if (Object.keys(assignments).length === 0) {
      alert('割り当てが選択されていません。');
      return;
    }
    
    const updatingButton = document.querySelector('.confirm-btn');
    if(updatingButton) updatingButton.textContent = '更新中...';

    try {
      const formattedDate = selectedDate.replaceAll('/', '-');
      const result = await updateAllocations(formattedDate, assignments,selectedYear);
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
    <div className="main-content">
      <h1 className="admin-header">割り当て管理 ({selectedYear}年)</h1>
      
      <div className="summary-controls">
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
                {Object.keys(summaryTotalsByRoute).map(route => (
                  <tr key={route}>
                    <td>{route}</td>
                    <td>{summaryTotalsByRoute[route]}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 style={{marginTop: '2rem'}}>割り当て別 合計</h3>
            <table className='allocation-table'>
              <tbody>
                {Object.keys(summaryTotalsByWariate).map(wariateName => (
                  <tr key={wariateName}>
                    <td>{wariateName}</td>
                    <td>{summaryTotalsByWariate[wariateName]}</td>
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