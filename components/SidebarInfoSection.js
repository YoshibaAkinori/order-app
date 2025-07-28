import React from 'react';

const SidebarInfoSection = () => {
  return (
    <div className="sidebar-info-section">
      <h3 className="sidebar-info-title">店舗記入欄</h3>
      <div className="sidebar-info-field">
        <label className="sidebar-info-label">
          受付番号
        </label>
        <input
          type="text"
          className="sidebar-info-input"
          placeholder="受付番号"
        />
      </div>
       <div className="sidebar-info-field">
        <label className="sidebar-info-label">
          割振番号
        </label>
        <input
          type="text"
          className="sidebar-info-input"
          placeholder="割振番号"
        />
      </div>
      {/* ...その他追加したい入力欄... */}
    </div>
  );
};

export default SidebarInfoSection;