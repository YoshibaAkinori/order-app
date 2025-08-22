"use client";
import React, { useMemo, useState, useEffect, useRef } from 'react'; // ★ useRefを追加

const NetaDrilldownModal = ({ summaryData, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const printRef = useRef(null); // ★ 1. 印刷したい要素を参照するためのRef

  useEffect(() => {
    const timer = setTimeout(() => setIsOpen(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300);
  };

  // ★ 2. 新しい印刷ハンドラ
  const handlePrint = () => {
    const content = printRef.current;
    if (content) {
      const printWindow = window.open('', '', 'height=800,width=1200');
      printWindow.document.write('<html><head><title>ネタ数 詳細内訳</title>');
      
      // ★ 現在のページの全てのスタイルをコピーして、印刷プレビューに適用
      Array.from(document.styleSheets).forEach(styleSheet => {
        try {
          const rules = styleSheet.cssRules;
          if (rules) {
            printWindow.document.write('<style>');
            Array.from(rules).forEach(rule => {
              printWindow.document.write(rule.cssText);
            });
            printWindow.document.write('</style>');
          }
        } catch (e) {
          console.log('Cannot access stylesheet rules:', e);
        }
      });

      printWindow.document.write('</head><body>');
      printWindow.document.write(content.innerHTML);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (!summaryData) return null;

  const { neta_summary, neta_drilldown, masters } = summaryData;

  const sortedNetaList = useMemo(() => {
    if (!masters.netaMaster) return [];
    return [...masters.netaMaster].sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));
  }, [masters.netaMaster]);

  const productList = Object.keys(masters.products).sort((a,b) => Number(a) - Number(b));

  return (
    <div className="modal-backdrop-sidebar" onClick={handleClose}>
      <div 
        className={`modal-content-sidebar ${isOpen ? 'open' : ''}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>ネタ数 詳細内訳</h2>
          <div>
            <button onClick={handlePrint} className="print-button">印刷</button>
            <button onClick={handleClose} className="close-button">&times;</button>
          </div>
        </div>
        {/* ★ 3. refを印刷したい範囲に設定 */}
        <div className="modal-body" ref={printRef}>
          <table className="summary-table">
            <thead>
              <tr>
                <th>ネタ名</th>
                {productList.map(key => (
                  <th key={key}>{masters.products[key].name}</th>
                ))}
                <th>ネタ変(計)</th>
                <th>合計</th>
              </tr>
            </thead>
            <tbody>
              {sortedNetaList.map(neta => {
                const netaName = neta.netaName;
                const drilldown = neta_drilldown[netaName];
                if (!drilldown) return null;

                return (
                  <tr key={netaName}>
                    <td>{netaName}</td>
                    {productList.map(prodKey => (
                      <td key={prodKey}>{drilldown.breakdown[prodKey] || 0}</td>
                    ))}
                    <td>{drilldown.changeTotal || 0}</td>
                    <td>{neta_summary[netaName] || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default NetaDrilldownModal;