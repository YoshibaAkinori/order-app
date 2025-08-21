"use client";
import React from 'react';

// ★ propsに selectedYear と changeYear を追加
const Header = ({ onLogout }) => {

  return (
    <header className="app-header">
      <div className="header-main-row">
        <nav className="header-nav">
          <a href="./" className="header-link">注文入力</a>
          <a href="./change" className="header-link">注文変更</a>
          <a href="./dashboard" className="header-link">注文一覧</a>
          <a href="./dashboard" className="header-link">ネタ数</a>
          <a href="./allocations" className="header-link">割り当て</a>
          <a href="./settings" className="header-link">設定</a>
          <a href="./Log" className="header-link">変更ログ</a>
        </nav>
        <button onClick={onLogout} className="logout-btn">
          ログアウト
        </button>
      </div>
    </header>
  );
};

export default Header;