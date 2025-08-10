"use client";
import React, { useState, useMemo, useEffect } from 'react';
import Header from '../../components/Header'; // 既存のヘッダーを再利用
import LogEntry from '../../components/LogEntry'; // ★これから作成する差分表示コンポーネント
import { useConfiguration } from '../contexts/ConfigurationContext';

const ChangeLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { configuration, selectedYear, changeYear } = useConfiguration();
  const ALLOCATION_MASTER = useMemo(() => (configuration?.allocationMaster || {}), [configuration]);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        // ★ステップ1で作成したAPI GatewayのエンドポイントURLに置き換えてください
        const response = await fetch('https://viy41bgkvd.execute-api.ap-northeast-1.amazonaws.com/Logs');
        if (!response.ok) {
          throw new Error('データの取得に失敗しました。');
        }
        const data = await response.json();
        setLogs(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, []); // コンポーネントのマウント時に一度だけ実行

  return (
    <div className="main-container">
      <Header  
        selectedYear={selectedYear}
        changeYear={changeYear}
        onAllocationChange={(e) => handleAllocationChange(e.target.value)}
        ALLOCATION_MASTER={ALLOCATION_MASTER}
      /> 
      <div className="main-content">
        <div className="form-container">
          <div className="form-header">
            <h1 className="form-title">変更履歴</h1>
          </div>
          
          {isLoading && <p>履歴を読み込んでいます...</p>}
          {error && <p className="error-message">エラー: {error}</p>}
          
          <div className="logs-container">
            {!isLoading && !error && logs.map(log => (
              <LogEntry key={log.logId} log={log} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangeLogPage;