"use client";
import React, { useState, useEffect } from 'react';
import LogEntry from '../../components/LogEntry';
import { useConfiguration } from '../contexts/ConfigurationContext';

const ChangeLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // ★★★ 変更点: selectedYear を useConfiguration から取得 ★★★
  const { selectedYear } = useConfiguration();

  useEffect(() => {
    const fetchLogs = async () => {
      // ★★★ 変更点: selectedYear がないとAPIを呼ばないようにする ★★★
      if (!selectedYear) {
        setIsLoading(false);
        setLogs([]);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        // ★★★ 変更点: APIのURLに year クエリパラメータを追加 ★★★
        const response = await fetch(`https://viy41bgkvd.execute-api.ap-northeast-1.amazonaws.com/Logs?year=${selectedYear}`);
        
        if (!response.ok) {
          throw new Error(`データの取得に失敗しました。ステータス: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.success && Array.isArray(data.logs)) {
          setLogs(data.logs);
        } else if (Array.isArray(data)) {
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
  }, [selectedYear]); // ★★★ 変更点: selectedYear を依存配列に追加 ★★★

  return (
    <div className="main-container">
      <div className="main-content">
        <div className="form-container">
          <div className="form-header">
            <h1 className="form-title">変更履歴 ({selectedYear}年)</h1>
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

          {!isLoading && !error && !selectedYear && (
            <div className="no-logs-message">
                <p>表示する年度を選択してください。</p>
            </div>
          )}
          
          <div className="log-message">
            {!isLoading && !error && selectedYear && Array.isArray(logs) && logs.length > 0 && 
              logs.map(log => (
                <LogEntry key={log.logId} log={log} />
              ))
            }
            
            {!isLoading && !error && selectedYear && (!logs || logs.length === 0) && (
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