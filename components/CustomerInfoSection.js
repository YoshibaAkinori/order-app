import React from 'react';

const CustomerInfoSection = ({ formData, handleInputChange }) => {
  return (
    <div className="customer-info-section">
      <h2 className="customer-info-title">発注者の情報</h2>
      <div className="customer-info-container">
        <div className="customer-info-form">

          {/* ... 担当者名から部署名までのフィールドは変更なし ... */}
          <div className="customer-info-field">
            <label className="customer-info-label">
              担当者名 <span className="required-mark">*</span>
            </label>
            <input type="text" name="contactName" value={formData.contactName} onChange={handleInputChange} className="customer-info-input" placeholder="山田太郎" />
          </div>
          <div className="customer-info-field">
            <label className="customer-info-label">
              メールアドレス <span className="required-mark">*</span>
            </label>
            <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="customer-info-input" placeholder="example@company.com" />
          </div>
          <div className="customer-info-field">
            <label className="customer-info-label">FAX番号</label>
            <input type="tel" name="fax" value={formData.fax} onChange={handleInputChange} className="customer-info-input" placeholder="026-268-1717" />
          </div>
          <div className="customer-info-field">
            <label className="customer-info-label">
              電話番号 <span className="required-mark">*</span>
            </label>
            <input type="tel" name="tel" value={formData.tel} onChange={handleInputChange} className="customer-info-input" placeholder="026-268-1718" />
          </div>
          <div className="customer-info-field">
            <label className="customer-info-label">
              法人名 <span className="required-mark">*</span>
            </label>
            <input type="text" name="companyName" value={formData.companyName} onChange={handleInputChange} className="customer-info-input" placeholder="株式会社○○○" />
          </div>
          <div className="customer-info-field">
            <label className="customer-info-label">部署名</label>
            <input type="text" name="department" value={formData.department} onChange={handleInputChange} className="customer-info-input" placeholder="営業部" />
          </div>
          <div className="customer-info-field">
            <label className="customer-info-label">階数</label>
            <input
              type="number"
              name="floorNumber"
              value={formData.floorNumber}
              onChange={handleInputChange}
              className="customer-info-input"
              placeholder="例: 2"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerInfoSection;