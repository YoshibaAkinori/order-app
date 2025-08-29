"use client";
import React from 'react';
import Link from 'next/link'; 

// ★ propsに selectedYear と changeYear を追加
const Header = ({ onLogout }) => {

  return (
    <header className="app-header">
      <div className="header-main-row">
        <nav className="header-nav">
          <Link href="./" className="header-link">注文入力</Link>
          <Link href="./change" className="header-link">注文変更</Link>
          <Link href="./dashboard" className="header-link">注文一覧</Link>
          <Link href="./netacounts" className="header-link">ネタ数</Link>
          <Link href="./netachange" className="header-link">ネタ変更</Link>
          <Link href="./allocations" className="header-link">割り当て</Link>
          <Link href="./settings" className="header-link">設定</Link>
          <Link href="./Log" className="header-link">変更ログ</Link>
        </nav>
        <button onClick={onLogout} className="logout-btn">
          ログアウト
        </button>
      </div>
    </header>
  );
};

export default Header;