"use client";
import React from 'react';

const SharedHeader = ({ onMenuClick }) => {
  return (
    <header className="shared-header">
      {/* ★ あなたのハンバーガーボタン用のCSSクラスを適用 */}
      <button onClick={onMenuClick} className="hamburger-menu-btn" title="メニューを開く">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" x2="20" y1="12" y2="12" />
          <line x1="4" x2="20" y1="6" y2="6" />
          <line x1="4" x2="20" y1="18" y2="18" />
        </svg>
      </button>
      {/* 必要であれば、ここにアプリケーションのロゴなどを追加できます */}
    </header>
  );
};

export default SharedHeader;