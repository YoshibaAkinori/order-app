import React from 'react';

// ★ receptionNumberとallocationNumberをpropsで受け取る
const Header = ({ onLogout, receptionNumber, onReceptionChange, allocationNumber, onAllocationChange }) => {
  return (
    <header className="app-header">
      {/* 1段目 */}
      <div className="header-main-row">
        <nav className="header-nav">
          <a href="./settings" className="header-link">設定</a>
          <a href="./dashboard" className="header-link">注文一覧</a>
        </nav>
        <button onClick={onLogout} className="logout-btn">
          ログアウト
        </button>
      </div>
      {/* 2段目 (入力欄に変更) */}
      <div className="header-info-row">
        <div className="header-input-group">
          <label className="header-label">受付番号:</label>
          <input
            type="text"
            className="header-input"
            value={receptionNumber}
            onChange={onReceptionChange}
          />
        </div>
        <div className="header-input-group">
          <label className="header-label">割振番号:</label>
          <input
            type="text"
            className="header-input"
            value={allocationNumber}
            onChange={onAllocationChange}
            maxLength="1"
          />
        </div>
      </div>
    </header>
  );
};

export default Header;