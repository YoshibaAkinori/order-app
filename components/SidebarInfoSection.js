import React from 'react';

// ★ propsを受け取るように変更
const SidebarInfoSection = ({ allocationNumber, onAllocationChange }) => {
  return (
    <div className="sidebar-info-section">
      <h3 className="sidebar-info-title">店舗記入欄</h3>
      <div className="sidebar-info-field">
        <label className="sidebar-info-label">受付番号</label>
        <input type="text" className="sidebar-info-input" placeholder="受付番号" />
      </div>
      <div className="sidebar-info-field">
        <label className="sidebar-info-label">割振番号</label>
        {/* ★ valueとonChangeを設定 */}
        <input
          type="text"
          className="sidebar-info-input"
          placeholder="割振番号 (例: A)"
          value={allocationNumber}
          onChange={onAllocationChange}
          maxLength="1"
        />
      </div>
    </div>
  );
};

export default SidebarInfoSection;