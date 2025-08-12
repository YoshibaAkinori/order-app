"use client";
import React, { useState, useEffect } from 'react';

const CustomerInfoSection = ({ formData, handleInputChange, allocationMaster, onLocationSelect　}) => {
  const [selectedValue, setSelectedValue] = useState('');

  useEffect(() => {
    // 初期化時のみ実行
    if (!selectedValue && formData.address) {
      const currentKey = Object.keys(allocationMaster).find(key => allocationMaster[key].address === formData.address);
      if (currentKey) {
        setSelectedValue(currentKey);
      }
    }
  }, [allocationMaster]); // formData.addressを依存配列から削除
  
  const handleSelectChange = (e) => {
  const prefix = e.target.value;
  setSelectedValue(prefix);
  
  // ★ 修正：常に onLocationSelect を呼び出す
  onLocationSelect(prefix);
  
  // allocationMasterから選択された住所の値を確認
  const selectedAddress = allocationMaster[prefix]?.address;
  
  if (selectedAddress === 'その他') {
    // 「その他」を選択した場合は、住所欄と階数を同時に初期化
    const addressEvent = { target: { name: 'address', value: '' } };
    const floorEvent = { target: { name: 'floorNumber', value: '' } };
    
    // 両方を同期的に処理
    handleInputChange(addressEvent);
    handleInputChange(floorEvent);
  }
  // ★ else文を削除して、常にonLocationSelectが呼ばれるようにした
};

  const handleAddressChange = (e) => {
    // 手入力時は選択状態をそのまま維持
    handleInputChange(e);
  };

  // 「その他」に対応するキーを取得
  const otherKey = Object.keys(allocationMaster || {}).find(key => allocationMaster[key].address === 'その他');
  const isOtherSelected = selectedValue === otherKey;

  return (
    <div className="customer-info-section">
      <h2 className="customer-info-title">発注者の情報</h2>
      <div className="customer-info-container">
        <div className="customer-info-form">
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
              法人名・部署名 <span className="required-mark">*</span>
            </label>
            <input type="text" name="companyName" value={formData.companyName} onChange={handleInputChange} className="customer-info-input" placeholder="県庁 〇〇課" />
          </div>
          
          <div className="customer-info-field">
            <label className="customer-info-label">住所</label>
            <select
              onChange={handleSelectChange}
              className="customer-info-input"
              value={selectedValue}
            >
              <option value="">-- 選択してください --</option>
              {Object.keys(allocationMaster || {}).map(prefix => (
                <option key={prefix} value={prefix}>
                  {allocationMaster[prefix].address}
                </option>
              ))}
            </select>
          </div>

          {/* その他選択時の手入力欄 */}
          {isOtherSelected && (
            <div className="customer-info-field">
              <label className="customer-info-label">住所詳細</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleAddressChange}
                className="customer-info-input"
                placeholder="住所を入力してください"
              />
            </div>
          )}

          {!isOtherSelected && (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerInfoSection;