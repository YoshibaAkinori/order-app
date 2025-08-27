"use client";
import React, { useState, useEffect } from 'react';
import { useConfiguration } from '../app/contexts/ConfigurationContext';
import { configureAmplify } from '../utils/amplify-config';
import SharedHeader from "./SharedHeader";
import SidebarInfoSection from './SidebarInfoSection';
import YearSelector from './YearSelector'; // YearSelectorをインポート

export default function MainLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
      {isLoggedIn && <SharedHeader onMenuClick={() => setIsSidebarOpen(true)} />}

      {isLoggedIn && isSidebarOpen && (
        <>
          <div className="overlay" onClick={() => setIsSidebarOpen(false)}></div>
          <div className="sidebar">
            <div className="sidebar-header">
              <h3>メニュー</h3>
              <button onClick={() => setIsSidebarOpen(false)} className="sidebar-close-btn">&times;</button>
            </div>
            
            {/* 年選択セクション */}
            <div className="sidebar-year-section">
              <label className="sidebar-year-label">年度選択</label>
              <YearSelector />
            </div>
            
            <a href="/" onClick={() => setIsSidebarOpen(false)}>新規注文</a>
            <a href="./change" onClick={() => setIsSidebarOpen(false)}>注文変更</a>
            <a href="./dashboard" onClick={() => setIsSidebarOpen(false)}>注文一覧</a>
            <a href="./allocations" onClick={() => setIsSidebarOpen(false)}>割り当て管理</a>
            <a href="./netacounts" onClick={() => setIsSidebarOpen(false)}>ネタ数</a>
            <a href="./netachange" onClick={() => setIsSidebarOpen(false)}>ネタ変更詳細</a>
            <a href="./settings" onClick={() => setIsSidebarOpen(false)}>設定管理</a>
            <a href="./Log" onClick={() => setIsSidebarOpen(false)}>変更ログ</a>
            <div style={{marginTop: 'auto'}}>
              <button onClick={logout} className="logout-button-sidebar">ログアウト</button>
            </div>
          </div>
        </>
      )}
      
      <main className="main-page-content">
        {isLoggedIn ? (
          children
        ) : (
          <div className="login-prompt">
            <h2>寿司注文管理システム</h2>
            <SidebarInfoSection />
          </div>
        )}
      </main>
    </>
  );
}