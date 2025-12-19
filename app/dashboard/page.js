"use client";
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useConfiguration } from '../contexts/ConfigurationContext';
import { useOrderData } from '../contexts/OrderDataContext';
import { searchOrders, sendBatchConfirmationAPI } from '../lib/orderApi';
import { exportAtenaExcel, exportIchiranExcel } from '../lib/DownloadApi';
import IchiranExcelModal from '../../components/IchiranExcelModal';
import ChangeOrderPage from '../change/page';
import Link from 'next/link';
import { Mail } from 'lucide-react';

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
              const isNetaStructurallyChanged = removedNeta.length > 0;
              
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

// 宛名Excel出力用モーダルコンポーネント
const WariateExcelModal = ({ deliveryWariate, deliveryRoutes, onClose, onExport }) => {
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
    onExport(selectedWariate, selectedRoutes);
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
          <h2>作成する領収書を選択</h2>
          <button onClick={onClose} className="settings-modal-close-btn">&times;</button>
        </div>
        
        {/* 割り当て選択ボタン */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {(deliveryWariate || []).map(wariate => (
            <button 
              key={wariate.name} 
              onClick={() => handleWariateSelect(wariate.name)}
              className={selectedWariate === wariate.name ? 'copy-button' : 'gray-button'}
              style={{ 
                flex: '1',
                minWidth: '100px',
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
              className="copy-button"
              style={{ width: '100%' }}
            >
              {selectedWariate} 用で作成
            </button>
          </>
        )}
      </div>
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
      const removedNeta = Object.keys(pattern.selectedNeta || {})
                .filter(netaName => pattern.selectedNeta[netaName] === true);
      const addedNeta = pattern.to_neta || [];
      
      if (removedNeta.length > 0) {
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
  const [selectedFilter, setSelectedFilter] = useState(''); // 統合フィルタ用
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [isWariateModalOpen, setIsWariateModalOpen] = useState(false);
  const [isIchiranExcelModalOpen, setIsIchiranExcelModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const {setOrders, setCurrentDate } = useOrderData();
  
  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    // このコンポーネントが画面から消える時に実行されるクリーンアップ関数
    return () => {
      setOrders([]);
    };
  }, [setOrders]);

  const deliveryDates = useMemo(() => (configuration?.deliveryDates || []), [configuration]);
  const deliveryRoutes = useMemo(() => (configuration?.deliveryRoutes || []), [configuration]);
  const deliveryWariate = useMemo(() => (configuration?.deliveryWariate || []), [configuration]);
  
  const productsMaster = useMemo(() => apiData?.masters?.products || {}, [apiData]);

  // 統合フィルタの選択肢を生成
  // deliveryWariate の name を先に、その後に deliveryWariate の name と同名でない deliveryRoutes を追加
  const filterOptions = useMemo(() => {
    // deliveryWariate の name を集める
    const wariateNames = new Set((deliveryWariate || []).map(w => w.name));

    // deliveryWariate の name をリストに追加（type: 'wariate'）
    const options = (deliveryWariate || []).map(w => ({
      value: w.name,
      label: w.name,
      type: 'wariate',
      routes: w.responsibleRoutes || []
    }));

    // deliveryRoutes の中で deliveryWariate の name と同名でないものを追加（type: 'route'）
    (deliveryRoutes || []).forEach(route => {
      if (!wariateNames.has(route)) {
        options.push({
          value: route,
          label: route,
          type: 'route',
          routes: [route]
        });
      }
    });

    return options;
  }, [deliveryWariate, deliveryRoutes]);

  const processedOrders = useMemo(() => {
    if (!apiData || !apiData.orders) return [];
    
    const ordersWithNotes = apiData.orders.map(o => {
      // 通常商品とサイドメニューの数量を合計
      const totalQuantity = (o.orderItems || []).reduce((sum, item) => sum + (item.quantity || 0), 0) + 
                              (o.sideOrders || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

      return {
        ...o,
        paymentNote: '', 
        displayOrderTotal: o.orderTotal,
        totalQuantity: totalQuantity, // 計算した合計数量を注文オブジェクトに追加
      }
    });
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
    //setSelectedFilter('');
    setOrders([]);
    setCurrentDate(selectedDate);
    try {
      const data = await searchOrders(selectedDate, selectedYear); 
      setApiData(data);
      setOrders(data.orders || []);
    } catch (err) { setError(err.message); setApiData(null); }
    finally { setIsLoading(false); }
  };

  const handleAtenaExcel = () => {
    if (filteredOrders.length === 0) {
      alert('対象の注文がありません。');
      return;
    }
    setIsWariateModalOpen(true); // ★ モーダルを開くだけにする
  };

  /**
   * 「一覧Excel」ボタンがクリックされたときの処理
   */
  const handleIchiranExcel = () => {
    if (filteredOrders.length === 0) {
      alert('対象の注文がありません。');
      return;
    }
    setIsIchiranExcelModalOpen(true); // モーダルを開く
  };

  /**
   * モーダルでルートが選択され、「作成」ボタンが押されたときの処理
   * @param {string[]} selectedRoutes - 選択された配達ルート名の配列
   */
  const handleExportIchiranExcel = async (selectedRoutes) => {
    setIsIchiranExcelModalOpen(false); // モーダルを閉じる
    
    if (selectedRoutes.length === 0) {
      alert('ルートが選択されていません。');
      return;
    }

    setIsExporting(true);

    try {
      // 選択されたルートに基づいて、表示中の注文データをフィルタリング
      const ordersToExport = filteredOrders.filter(order => 
        selectedRoutes.includes(order.assignedRoute)
      );

      if (ordersToExport.length === 0) {
        alert('選択されたルートに該当する注文がありませんでした。');
        return;
      }
      
      // APIを呼び出し、Excelファイルを作成・ダウンロード
      const result = await exportIchiranExcel(ordersToExport, selectedRoutes, selectedYear, selectedDate);
      
      alert(`ファイル "${result.filename}" のダウンロードが完了しました！`);
      setIsExporting(false);

    } catch (err) {
      alert(`エラー: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWariateSelectAndExport = async (warihuriName, selectedRoutes) => {
    setIsWariateModalOpen(false); // モーダルを閉じる

    const selectedDay = selectedDate.split('/')[2];

    const receiptsToExport = filteredOrders
    .filter(order => selectedRoutes.includes(order.assignedRoute)) // 選択されたルートでフィルタ
    .flatMap(order => 
      (order.receipts || []).map(receipt => ({
        recipientName: receipt.recipientName,
        amount: receipt.amount,
        orderDate: selectedDate,
        // 絞り込みのために、receiptの元データも一時的に含めておく
        issueDate: receipt.issueDate,
        documentType: receipt.documentType
      }))
    )
    .filter(receipt => {
      // 2. documentTypeが「領収書」のものだけに絞り込む
      if (receipt.documentType !== '領収書') {
        return false;
      }
      
      // 3. issueDate（注文番号）の先頭2文字が、選択した日付の「日」と一致するかチェック
      //    (issueDateが存在しない場合は除外)
      if (!receipt.issueDate || typeof receipt.issueDate !== 'string') {
        return false;
      }
      const issueDay = receipt.issueDate.substring(0, 2);
      return issueDay === selectedDay;
    });


    if (receiptsToExport.length === 0) {
      alert('書き出す宛名情報がありません。');
      setIsLoading(false);
      return;
    }
    
    setIsExporting(true);
    try {
      // APIに渡すデータからは、絞り込みに使った余分な情報は除外しておく
      const cleanReceipts = receiptsToExport.map(({ recipientName, amount, orderDate}) => ({
        recipientName,
        amount,
        orderDate
      }));

      const result = await exportAtenaExcel(cleanReceipts, warihuriName, selectedYear);
  
      // 成功メッセージを表示
      alert(`ファイル "${result.filename}" のダウンロードが完了しました！`);
      setIsExporting(false);
  
    } catch (err) {
      alert(`エラー: ${err.message}`);
    }
  };

  const handleSendBatchEmail = async () => {
        if (filteredOrders.length === 0) {
            alert('対象の注文がありません。');
            return;
        }

        // 1. メールアドレスが存在する注文だけを抽出
        const ordersToSend = filteredOrders
            .filter(order => order.customerInfo && order.customerInfo.email)
            .map(order => ({
                receptionNumber: order.receptionNumber,
                year: selectedYear, // 現在選択中の年
            }));

        if (ordersToSend.length === 0) {
            alert('メールアドレスが登録されている注文が一覧にありません。');
            return;
        }

        if (!confirm(`${ordersToSend.length}件のお客様に最終確認メールを送信します。よろしいですか？`)) {
            return;
        }
        
        setIsLoading(true);
        try {
            // 2. 新しいAPIを呼び出す
            const result = await sendBatchConfirmationAPI(ordersToSend, selectedDate, selectedYear);
            
            const successCount = result.summary.filter(r => r.status === 'success').length;
            const failedCount = result.summary.filter(r => r.status === 'failed').length;
            const skippedCount = result.summary.filter(r => r.status === 'skipped').length;

            alert(`一括送信が完了しました。\n成功: ${successCount}件\n失敗: ${failedCount}件\nスキップ(送信済み): ${skippedCount}件`);

        } catch (err) {
            alert(`エラーが発生しました: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
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
    let filtered = processedOrders;

    // 統合フィルタでフィルタリング
    if (selectedFilter) {
      const selectedOption = filterOptions.find(opt => opt.value === selectedFilter);
      if (selectedOption) {
        filtered = filtered.filter(order => 
          selectedOption.routes.includes(order.assignedRoute)
        );
      }
    }

    // 検索でフィルタリング
    if (searchTerm) {
      filtered = filtered.filter(order => 
        Object.values(order).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    return filtered.sort((a, b) => (a.orderId || '').localeCompare(b.orderId || ''));
  }, [processedOrders, selectedFilter, searchTerm, filterOptions]);

  if (configLoading) return <h4>設定読み込み中...</h4>;

  return (
    <div className="main-content main-content--full-width">
      {isChangeModalOpen && (
        <div className="modal-backdrop-sidebar" onClick={closeChangeModal}>
          <div className="modal-content-sidebar open" onClick={(e) => e.stopPropagation()}>
            <button onClick={closeChangeModal} className="close-button" style={{position: 'absolute', top: '1rem', right: '1rem'}}>&times;</button>
            <ChangeOrderPage initialOrderId={editingOrderId} isModalMode={true} onClose={closeChangeModal} />
          </div>
        </div>
      )}
      {isExporting && (
        <div className="loading-overlay">
          通信中...
        </div>
      )}
      {isIchiranExcelModalOpen && (
        <IchiranExcelModal
          allRoutes={deliveryRoutes}
          deliveryWariate={deliveryWariate}
          onClose={() => setIsIchiranExcelModalOpen(false)}
          onSubmit={handleExportIchiranExcel}
        />
      )}
      {isWariateModalOpen && (
        <WariateExcelModal
          deliveryWariate={deliveryWariate}
          deliveryRoutes={deliveryRoutes}
          onClose={() => setIsWariateModalOpen(false)}
          onExport={handleWariateSelectAndExport}
        />
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
          <select value={selectedDate} onChange={(e) => {
            setSelectedDate(e.target.value);
            setSelectedFilter('');
          }}>
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
          <select value={selectedFilter} onChange={(e) => setSelectedFilter(e.target.value)}>
            <option value="">割り振り選択 (すべて)</option>
            {filterOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button title="最終確認メール" onClick={handleSendBatchEmail}>
            <Mail size={20} />
          </button>
          <button onClick={handleIchiranExcel}>一覧Excel</button>
          <button onClick={handleAtenaExcel}>宛名Excel</button>
          <button onClick={handlePrint}>印刷</button>
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
            <th>宛名</th>
            <th>注文情報</th>
            <th>備考</th>
            <th>支払金額</th>
            <th>割り当て</th>
            <th>合計数</th>
            <th className="no-print">PDF出力</th> 
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
              <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                {order.totalQuantity}
              </td>
              <td className="border px-4 py-2 text-center no-print">
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