"use client";
import React from 'react';

// ★ propsに selectedYear と changeYear を追加
const Header = ({ onLogout, allocationNumber, onAllocationChange, ALLOCATION_MASTER, selectedYear, changeYear }) => {

  // ★ 年選択肢を動的に生成するロジック
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 2; i++) {
      years.push(i);
    }
    return years;
  };
  const yearOptions = generateYearOptions();

  return (
    <header className="app-header">
      <div className="header-main-row">
        <nav className="header-nav">
          <a href="./" className="header-link">注文入力</a>
          <a href="./change" className="header-link">注文変更</a>
          <a href="./dashboard" className="header-link">注文一覧</a>
          <a href="./dashboard" className="header-link">ネタ数</a>
          <a href="./dashboard" className="header-link">割り当て</a>
          <a href="./settings" className="header-link">設定</a>
          <a href="./Log" className="header-link">変更ログ</a>
        </nav>
        <button onClick={onLogout} className="logout-btn">
          ログアウト
        </button>
      </div>
      <div className="header-controls">
        {/* ★ 年選択のドロップダウンを追加 */}
        <div className="header-control-item">
          <label htmlFor="year-select">設定年: </label>
          <select
            id="year-select"
            value={selectedYear || ''}
            onChange={(e) => changeYear(e.target.value)}
            className="header-select"
          >
            <option value="" disabled>選択...</option>
            {yearOptions.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
    </div>
    </header>
  );
};

export default Header;