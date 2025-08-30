"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { useConfiguration } from '../contexts/ConfigurationContext';
import NetaDrilldownModal from '../../components/NetaDrilldownModal';
import { fetchSummaryAPI } from '../../app/lib/summaryApi';

const SummaryPage = () => {
  const { configuration, loading: configLoading, error: configError, selectedYear } = useConfiguration();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [apiData, setApiData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);

  const deliveryDates = useMemo(() => (configuration?.deliveryDates || []), [configuration]);
  const deliveryWariate = useMemo(() => (configuration?.deliveryWariate || []), [configuration]);


  useEffect(() => {
    if (isDrilldownOpen) {
      // モーダルが開いたら、背景のスクロールを禁止
      document.body.style.overflow = 'hidden';
    } else {
      // モーダルが閉じたら、スクロールを許可
      document.body.style.overflow = 'unset';
    }
    
    // このコンポーネントがアンマウントされた時にも、スクロールを許可に戻す
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isDrilldownOpen]);

  const handleFetchSummary = async () => {
    if (!selectedDate || !selectedRoute) {
      alert('集計日と割り当てを選択してください。');
      return;
    }
    setIsLoading(true);
    setError(null);
    setApiData(null);

    try {
      // APIライブラリの関数を呼び出すだけ
      const data = await fetchSummaryAPI(selectedDate, selectedRoute, selectedYear);
      setApiData(data);
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch summary:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const summaryData = useMemo(() => {
    if (!apiData) return null;

    const { product_summary, other_orders_summary, filtered_orders, masters } = apiData;
    
    const neta_summary = {};
    const neta_drilldown = {};
    (masters.netaMaster || []).forEach(neta => {
        neta_summary[neta.netaName] = 0;
        neta_drilldown[neta.netaName] = {
            breakdown: Object.keys(masters.products).reduce((acc, key) => ({...acc, [key]: 0}), {}),
            changeTotal: 0
        };
    });

    // STEP 1: 通常商品のネタを計算
    (filtered_orders || []).forEach(order => {
        (order.orderItems || []).forEach(item => {
            const productKey = item.productKey;
            const totalItemQty = item.quantity || 0;
            const productMaster = masters.products[productKey];
            if(!productMaster || totalItemQty === 0) return;

            // STEP 1: 全ての注文を、まず「通常注文」として元のネタ構成で集計する
            // これにより、商品別の列には「変更がなかった場合」の総数が計上される
            (productMaster.neta || []).forEach(neta => {
                const netaName = neta.name;
                const netaQty = neta.quantity || 1;
                 if(neta_drilldown.hasOwnProperty(netaName)){
                    neta_drilldown[netaName].breakdown[productKey] += netaQty * totalItemQty;
                }
            });

            // STEP 2: ネタ変更があった注文の「差分」だけを changeTotal に反映させる
            const neta_changes_patterns = order.netaChanges?.[productKey] || [];
            neta_changes_patterns.forEach(pattern => {
                const isTrueNetaChange = Object.keys(pattern.selectedNeta || {}).length > 0;
                if (isTrueNetaChange) {
                    const pattern_qty = pattern.quantity || 0;
                    const removedNetaSet = new Set(Object.keys(pattern.selectedNeta || {}));
                    const addedNeta = pattern.to_neta || []; // TODO: addedNetaの構造に注意

                    // 「変更前のネタ」をマイナスとして計上
                    removedNetaSet.forEach(netaName => {
                        if(neta_drilldown.hasOwnProperty(netaName)){
                            // マスターから、そのネタの基本数量を取得
                            const netaInfo = (productMaster.neta || []).find(n => n.name === netaName);
                            const netaBaseQty = netaInfo ? (netaInfo.quantity || 1) : 1;
                            neta_drilldown[netaName].changeTotal -= netaBaseQty * pattern_qty;
                        }
                    });

                    // 「変更後のネタ」をプラスとして計上
                    addedNeta.forEach(netaName => {
                        if(neta_drilldown.hasOwnProperty(netaName)){
                            // 変更で追加されるネタは、基本数量1として仮定
                            neta_drilldown[netaName].changeTotal += 1 * pattern_qty;
                        }
                    });
                }
            });
        });
    });
    
    // ### ▼▼▼ 変更箇所 ▼▼▼ ###
    // STEP 2: サイドオーダー（特別注文）に含まれるネタを集計する
    (filtered_orders || []).forEach(order => {
        (order.sideOrders || []).forEach(sideItem => {
            const productKey = sideItem.productKey;
            const itemQty = sideItem.quantity || 0;
            const sideProductMaster = masters.specialMenus?.[productKey];

            if (sideProductMaster && itemQty > 0) {
                (sideProductMaster.neta || []).forEach(neta => {
                    const netaName = neta.name;
                    const netaQtyPerItem = neta.quantity || 1;
                    const totalNetaQty = netaQtyPerItem * itemQty;

                    if (neta_drilldown.hasOwnProperty(netaName)) {
                        // ドリルダウンの「ネタ変(計)」の列（プラス分）に加算する
                        neta_drilldown[netaName].changeTotal += totalNetaQty;
                    }
                });
            }
        });
    });
    // ### ▲▲▲ 変更箇所 ▲▲▲ ###

    // STEP 3: 全ての集計を元に最終的な合計(neta_summary)を計算
    Object.keys(neta_drilldown).forEach(netaName => {
        const drilldown = neta_drilldown[netaName];
        const breakdownTotal = Object.values(drilldown.breakdown).reduce((sum, val) => sum + val, 0);
        // changeTotal にサイドオーダー分が加算された状態で合計を出す
        neta_summary[netaName] = breakdownTotal + drilldown.changeTotal;
    });
    
    return { product_summary, other_orders_summary, masters, neta_summary, neta_drilldown };
  }, [apiData]);

  const categoryTotals = useMemo(() => {
    if (!summaryData) return {};
    
    const { neta_summary, masters } = summaryData;
    const totals = {};

    (masters.netaMaster || []).forEach(neta => {
      const category = neta.category;
      // 「その他」カテゴリは集計から除外
      if (category && category !== 'その他') {
        if (!totals[category]) {
          totals[category] = 0;
        }
        totals[category] += neta_summary[neta.netaName] || 0;
      }
    });
    
    return totals;
  }, [summaryData]);

  const productList = summaryData ? Object.keys(summaryData.masters.products).sort((a,b) => Number(a) - Number(b)) : [];
  const sortedNetaList = useMemo(() => {
    if (!summaryData || !summaryData.masters.netaMaster) return [];
    
    // netaMasterのリストを、displayOrderの昇順でソートする
    // 元の配列を壊さないようにコピー([...])してからソートするのが安全です
    return [...summaryData.masters.netaMaster].sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));
  }, [summaryData]);
  const otherOrderList = summaryData ? Object.keys(summaryData.other_orders_summary) : [];
  

  

  if (configLoading) return <h4>設定データを読み込んでいます...</h4>;
  if (configError) return <h4 style={{color: 'red'}}>エラー: {configError}</h4>;
  
  return (
    <div className="main-content">
      <div className="summary-header">
        <div className="summary-header-item">
          <select 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="summary-select"
          >
            <option value="">日付選択</option>
            {deliveryDates.map(date => (
              <option key={date} value={date}>{`${date.split('/')[1]}月${date.split('/')[2]}日`}</option>
            ))}
          </select>
        </div>
        <div className="summary-header-item">
          <select 
            value={selectedRoute} 
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="summary-select"
          >
            <option value="">担当選択</option>
            {deliveryWariate.map(wariate => (
              <option key={wariate.name} value={wariate.name}>{wariate.name}</option>
            ))}
          </select>
        </div>
         <div className="summary-header-item">
         <button onClick={handleFetchSummary} disabled={isLoading} className="summary-fetch-button">
          {isLoading ? '集計中...' : '表示'}
        </button>
      </div>
      </div>

      {error && <p style={{color: 'red', textAlign: 'center'}}>エラー: {error}</p>}
      {isDrilldownOpen && (
        <NetaDrilldownModal 
          summaryData={summaryData}
          onClose={() => setIsDrilldownOpen(false)}
        />
      )}

      {summaryData && (
        <div className="summary-grid-container">
          <div className="summary-products-section">
            {productList.map(key => {
              const product = summaryData.masters.products[key];
              const summary = summaryData.product_summary[key];
              
              // ★ 新しい8カテゴリのデータを元に表示
              return (
                <table key={key} className="product-summary-table">
                  <tbody>
                    <tr>
                      <td rowSpan={4} className="product-name-cell">{product.name}</td>
                      <td className="label-cell">さび入り</td>
                      <td className="value-cell">{summary.normal_wasabi}</td>
                      <td className="unit-cell">折 {summary.normal_wasabi_ori}</td>
                    </tr>
                    <tr>
                      <td className="label-cell sub-label">ネタ変</td>
                      <td className="value-cell sub-value">{summary.changed_wasabi}</td>
                      <td className="unit-cell sub-value">折 {summary.changed_wasabi_ori}</td>
                    </tr>
                    <tr>
                      <td className="label-cell no-wasabi-label">さび抜き</td>
                      <td className="value-cell no-wasabi-value">{summary.normal_nowasabi}</td>
                      <td className="unit-cell no-wasabi-label">折 {summary.normal_nowasabi_ori}</td>
                    </tr>
                     <tr>
                      <td className="label-cell sub-label no-wasabi-label">ネタ変</td>
                      <td className="value-cell sub-value no-wasabi-value">{summary.changed_nowasabi}</td>
                      <td className="unit-cell sub-value no-wasabi-label">折 {summary.changed_nowasabi_ori}</td>
                    </tr>
                  </tbody>
                </table>
              );
            })}
            
            <table className="summary-table other-orders-table">
               <tbody>
                {otherOrderList.map(name => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>{summaryData.other_orders_summary[name]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="summary-neta-section">
            <div className="neta-table-header" onClick={() => setIsDrilldownOpen(true)} style={{cursor: 'pointer'}}>ネタ数</div>
            <table className="summary-table">
              <thead><tr><th>ネタ名</th><th>必要数</th></tr></thead>
              <tbody>
                {sortedNetaList
                  .filter(neta => summaryData.neta_summary[neta.netaName] > 0)
                  .map(neta => (
                  <tr key={neta.netaName} onClick={() => setIsDrilldownOpen(true)} style={{cursor: 'pointer'}}>
                    <td>{neta.netaName}</td>
                    <td>{summaryData.neta_summary[neta.netaName]}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {Object.keys(categoryTotals).sort().map(category => (
                  <tr key={category} style={{fontWeight: 'bold', backgroundColor: '#f2f2f2'}}>
                    <td>{category} 計</td>
                    <td>{categoryTotals[category]}</td>
                  </tr>
                ))}
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
export default SummaryPage;