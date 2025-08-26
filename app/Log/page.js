"use client";
import React, { useState, useMemo, useEffect } from 'react';
import LogEntry from '../../components/LogEntry';
import { useConfiguration } from '../contexts/ConfigurationContext';

const ChangeLogPage = () => {
  const [logs, setLogs] = useState([]); // 初期値は空配列
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { configuration, selectedYear, changeYear } = useConfiguration();
  const ALLOCATION_MASTER = useMemo(() => (configuration?.allocationMaster || {}), [configuration]);

  // handleAllocationChange 関数を定義（エラー回避用）
  const handleAllocationChange = (value) => {
    // 必要に応じて実装
    console.log('Allocation changed:', value);
  };

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      setError(null); // エラーをリセット
      
      try {
        const response = await fetch('https://viy41bgkvd.execute-api.ap-northeast-1.amazonaws.com/Logs');
        
        if (!response.ok) {
          throw new Error(`データの取得に失敗しました。ステータス: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('受信したデータ:', data); // デバッグ用
        
        // Lambda関数のレスポンス形式に応じて処理
        if (data && data.success && Array.isArray(data.logs)) {
          setLogs(data.logs);
        } else if (Array.isArray(data)) {
          // 直接配列が返された場合
          setLogs(data);
        } else {
          console.error('予期しないデータ形式:', data);
          setLogs([]);
          setError('データの形式が正しくありません');
        }
        
      } catch (err) {
        console.error('ログ取得エラー:', err);
        setError(err.message);
        setLogs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, []);

  return (
    <div className="main-container">
      <div className="main-content">
        <div className="form-container">
          <div className="form-header">
            <h1 className="form-title">変更履歴</h1>
          </div>
          
          {isLoading && (
            <div className="loading-message">
              <p>履歴を読み込んでいます...</p>
            </div>
          )}
          
          {error && (
            <div className="error-message">
              <p>エラー: {error}</p>
            </div>
          )}
          
          <div className="log-message">
            {!isLoading && !error && Array.isArray(logs) && logs.length > 0 && 
              logs.map(log => (
                <LogEntry key={log.logId} log={log} />
              ))
            }
            
            {!isLoading && !error && (!logs || logs.length === 0) && (
              <div className="no-logs-message">
                <p>変更履歴はありません。</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangeLogPage;