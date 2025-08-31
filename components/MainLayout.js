"use client";
import React, { useState, useEffect } from 'react';
import { useConfiguration } from '../app/contexts/ConfigurationContext';
import { configureAmplify } from '../utils/amplify-config';
import SharedHeader from "./SharedHeader";
import SidebarInfoSection from './SidebarInfoSection';
import YearSelector from './YearSelector'; // YearSelectorをインポート
import InstructionsModal from './InstructionsModal';
import Link from 'next/link'; 
import Image from 'next/image';

export default function MainLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const { isLoggedIn, authLoading, logout } = useConfiguration();
  

  // アプリケーションの初回ロード時に一度だけAmplifyを設定
  useEffect(() => {
    console.log('=== MainLayout useEffect実行 ===');
    try {
      configureAmplify();
      console.log('✅ configureAmplify呼び出し成功');
    } catch (error) {
      console.error('❌ configureAmplify呼び出し失敗:', error);
    }
  }, []);

  // 認証チェック中は何も表示しない（ちらつき防止）
  if (authLoading) {
    return null;
  }

  return (
    <>
      {isLoggedIn && <SharedHeader onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />}

      {isLoggedIn && isSidebarOpen && (
        <>
          <div className="overlay" onClick={() => setIsSidebarOpen(false)}></div>
          <div className="sidebar">
            <div className="sidebar-header">
              <h3>メニュー</h3>
              <button onClick={() => setIsSidebarOpen(false)} className="sidebar-close-btn">&times;</button>
            </div>
            
            {/* 年選択セクション */}
            <div className="sidebar-content">
              <div className="sidebar-year-section">
                <label className="sidebar-year-label">年度選択</label>
                <YearSelector />
              </div>
    
              <Link href="/" onClick={() => setIsSidebarOpen(false)}>新規注文</Link>
              <Link href="./change" onClick={() => setIsSidebarOpen(false)}>注文変更</Link>
              <Link href="./dashboard" onClick={() => setIsSidebarOpen(false)}>注文一覧</Link>
              <Link href="./allocations" onClick={() => setIsSidebarOpen(false)}>割り当て管理</Link>
              <Link href="./netacounts" onClick={() => setIsSidebarOpen(false)}>ネタ数</Link>
              <Link href="./netachange" onClick={() => setIsSidebarOpen(false)}>ネタ変更詳細</Link>
              <Link href="./settings" onClick={() => setIsSidebarOpen(false)}>設定管理</Link>
              <Link href="./Log" onClick={() => setIsSidebarOpen(false)}>変更ログ</Link>
            </div>

              {/* 2. 一番下に固定したいボタンを新しいdiv（フッター）で囲む */}
            <div className="sidebar-footer">
              <button onClick={logout} className="logout-button-sidebar">ログアウト</button>
              <a href="#" onClick={(e) => {
                e.preventDefault();
                setIsInstructionsOpen(true);
                setIsSidebarOpen(false);
                }}>
                説明書
              </a>
            </div>
          </div>
        </>
      )}
      {isInstructionsOpen && <InstructionsModal onClose={() => setIsInstructionsOpen(false)} />}
      
      <main className="main-page-content">
        {isLoggedIn ? (
          children
        ) : (
          <div className="login-prompt">
            <div className="logo-container">
              <Image 
                src="/logo.png" // publicフォルダからの相対パス
                alt="Matsue-order-appLogo" 
                width={60} 
                height={40} 
                priority 
              />
            </div>
            <h2>松栄寿司注文管理システム</h2>
            <SidebarInfoSection />
          </div>
        )}
      </main>
    </>
  );
}