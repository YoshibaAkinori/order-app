"use client";
import React, { useState, useEffect } from 'react';
import NotificationBell from './NotificationBell'; 
import { useInbox } from '../app/contexts/InboxContext';

import Image from 'next/image';
import { useRouter } from 'next/navigation'; // ★ 1. useRouterをインポート
import { Mail } from 'lucide-react';

const SharedHeader = ({ onMenuClick }) => {
  const router = useRouter();
  const { unreadCount } = useInbox(); // ★ 2. Contextから未readCountを取得

  const handleInboxClick = () => {
    router.push('/inbox'); 
  };

  return (
    <header className="shared-header">
      <div className="logo-container">
          <Image 
            src="/logo.png"
            alt="Matsue-order-appLogo" 
            width={60} 
            height={40} 
            priority 
          />
        </div>
      <div className="header-left">
        <NotificationBell />
        <button title="受信トレイを開く" onClick={handleInboxClick} className="mail-button">
          {unreadCount > 0 && <span className="mail-badge">{unreadCount}</span>}
          <Mail size={28} />
        </button>
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