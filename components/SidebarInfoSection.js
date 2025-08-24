"use client";
import React, { useState } from 'react';
import { useConfiguration } from '../app/contexts/ConfigurationContext';
import { signIn } from 'aws-amplify/auth';

const SidebarInfoSection = () => {
  const { login } = useConfiguration();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);


const handleLogin = async (e) => {
  e.preventDefault();
  console.log('=== ログイン試行開始 ===');
  
  if (!username || !password) {
    setError('ユーザー名とパスワードを入力してください。');
    return;
  }
  
  setError('');
  setIsLoading(true);
  
  try {
    console.log('signIn呼び出し前 - username:', username);
    
    // Amplifyが正しく設定されているかの確認
    const { Amplify } = await import('aws-amplify');
    console.log('Amplify object:', Amplify);
    
    const result = await signIn({ username, password });
    console.log('✅ SignIn成功:', result);
    
    if (result.isSignedIn) {
      login();
    }
  } catch (err) {
    console.error('❌ ログインエラー詳細:', {
      name: err.name,
      message: err.message,
      code: err.code,
      stack: err.stack
    });
    setError(`ログインエラー: ${err.message}`);
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="sidebar-info-section">
      <h3 className="sidebar-info-title">ログイン</h3>
      <form onSubmit={handleLogin}>
        <div className="sidebar-info-field">
          <label className="sidebar-info-label">ユーザー名</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="sidebar-info-input"
            required
          />
        </div>
        <div className="sidebar-info-field">
          <label className="sidebar-info-label">パスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="sidebar-info-input"
            required
          />
        </div>
        {error && <p style={{ color: 'red', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}
        <button type="submit" className="login-button" disabled={isLoading}>
          {isLoading ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>
    </div>
  );
};

export default SidebarInfoSection;