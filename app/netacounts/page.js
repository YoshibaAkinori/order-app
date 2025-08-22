"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { useConfiguration } from '../contexts/ConfigurationContext';
import NetaDrilldownModal from '../../components/NetaDrilldownModal';

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
      alert('集計日と割り振り先を選択してください。');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const formattedDate = selectedDate.replaceAll('/', '-');
      const apiUrl = `https://viy41bgkvd.execute-api.ap-northeast-1.amazonaws.com/daily-summary?date=${formattedDate}&route=${selectedRoute}`;
      const response = await fetch(apiUrl);
      if(!response.ok) throw new Error('集計データの取得に失敗しました。');
      const data = await response.json();
      setApiData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const summaryData = useMemo(() => {
    if (!apiData) return null;

    const { product_summary, other_orders_summary, filtered_orders, masters } = apiData;
    
    // ネタサマリーを初期化
    const neta_summary = {};
    const neta_drilldown = {};
    masters.netaMaster.forEach(neta => {
        neta_summary[neta.netaName] = 0;
        neta_drilldown[neta.netaName] = {
            breakdown: Object.keys(masters.products).reduce((acc, key) => ({...acc, [key]: 0}), {}),
            changeTotal: 0
        };
    });

    // 注文をループしてネタ数を集計
    (filtered_orders || []).forEach(order => {
        (order.orderItems || []).forEach(item => {
            const key = item.productKey;
            const qty = item.quantity || 0;
            if(!masters.products[key] || qty === 0) return;

            let final_neta_composition = {};
            const neta_changes = order.netaChanges?.[key];

            if (neta_changes && neta_changes.length > 0) {
                const final_neta_names = Object.keys(neta_changes[0].selectedNeta || {});
                final_neta_names.forEach(name => final_neta_composition[name] = (final_neta_composition[name] || 0) + 1);
            } else {
                (masters.products[key].neta || []).forEach(neta => {
                    final_neta_composition[neta.name] = (final_neta_composition[neta.name] || 0) + (neta.quantity || 1);
                });
            }

            Object.keys(final_neta_composition).forEach(netaName => {
                const netaQty = final_neta_composition[netaName];
                if(neta_summary.hasOwnProperty(netaName)){
                    neta_summary[netaName] += netaQty * qty;
                    neta_drilldown[netaName].breakdown[key] += netaQty * qty;
                    // (ここにネタ変の合計ロジックを追加可能)
                }
            });
        });
    });

    return { product_summary, other_orders_summary, masters, neta_summary, neta_drilldown };
  }, [apiData]);

  const productList = summaryData ? Object.keys(summaryData.masters.products) : [];
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
    <div style={{ padding: '1rem', fontFamily: 'Arial, sans-serif' }}>
      <div className="summary-header">
        <div style={{ flex: 1, textAlign: 'center', fontSize: '24px', fontWeight: 'bold' }}>
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
        <div style={{ flex: 1, textAlign: 'center', fontSize: '24px', fontWeight: 'bold' }}>
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
      </div>

      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <button onClick={handleFetchSummary} disabled={isLoading} className="summary-fetch-button">
          {isLoading ? '集計中...' : '表示'}
        </button>
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
            {/* ★ クリックでモーダルを開く */}
            <div className="neta-table-header" onClick={() => setIsDrilldownOpen(true)} style={{cursor: 'pointer'}}>ネタ数 📖</div>
            <table className="summary-table">
              <tbody>
                {sortedNetaList.map(neta => (
                  <tr key={neta.netaName}>
                    <td>{neta.netaName}</td>
                    <td>{summaryData.neta_summary[neta.netaName] || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SummaryPage;