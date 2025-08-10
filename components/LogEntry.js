import React from 'react';

const LogEntry = ({ log }) => {
  return (
    <div className="log-entry-card">
      <div className="log-header">
        <strong className="reception-number">受付番号: {log.receptionNumber}</strong>
        <span className="log-timestamp">
          {new Date(log.timestamp).toLocaleString('ja-JP')}
        </span>
      </div>
      <div className="log-body">
        {/* APIから渡された整形済みのテキスト配列を表示するだけ */}
        {log.changes && log.changes.length > 0 ? (
          <ul>
            {log.changes.map((changeText, index) => (
              <li key={index}>{changeText}</li>
            ))}
          </ul>
        ) : (
          <p>変更点はありませんでした。</p>
        )}
      </div>
    </div>
  );
};

export default LogEntry;