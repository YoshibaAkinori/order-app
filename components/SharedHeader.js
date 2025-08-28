"use client";
import React from 'react';
import NotificationBell from './NotificationBell'; 

const SharedHeader = ({ onMenuClick }) => {
  return (
    <header className="shared-header">
      <div className="header-left">
        {/* ★★★ ここからが変更点 ★★★ */}
        <NotificationBell />
      </div>
      <div className="header-title">
        <h1>松栄寿し注文管理システム</h1>
      </div>
      <div className="header-right">
        <button onClick={onMenuClick} className="hamburger-menu-btn" title="メニューを開く">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default SharedHeader;