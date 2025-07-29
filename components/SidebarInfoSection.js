import React from 'react';

const SidebarInfoSection = ({ onLogin }) => {
  return (
    <div className="sidebar-info-section">
      <h3 className="sidebar-info-title">ログイン</h3>
      <form className="login-form" onSubmit={(e) => { e.preventDefault(); onLogin(); }}>
        <div className="login-field">
          {/* ★ ラベルを変更 */}
          <label className="login-label">ユーザーID</label>
          <input
            type="text" // ★ typeを"email"から"text"に変更
            className="login-input"
            placeholder="ユーザーIDを入力" // ★ placeholderを変更
          />
        </div>
        <div className="login-field">
          <label className="login-label">パスワード</label>
          <input
            type="password"
            className="login-input"
            placeholder="********"
          />
        </div>
        <button type="submit" className="login-button">
          ログイン
        </button>
      </form>
    </div>
  );
};

export default SidebarInfoSection;