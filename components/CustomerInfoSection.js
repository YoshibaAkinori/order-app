"use client";
import React, { useState, useEffect } from 'react';


const CustomerInfoSection = ({ formData, handleInputChange, allocationMaster, onLocationSelect, deliveryAddress }) => {
  const [selectedValue, setSelectedValue] = useState('');

  useEffect(() => {
    // formData.addressから現在の選択値を逆引きして設定
    const currentKey = Object.keys(allocationMaster).find(key => allocationMaster[key].address === formData.address);
    if (currentKey) {
      setSelectedValue(currentKey);
    } else if (formData.address) {
      // 登録済みの住所に一致しないが、住所が入力されている場合は「その他」を選択状態にする
      setSelectedValue('その他');
    } else {
      setSelectedValue('');
    }
  }, [formData.address, allocationMaster]);
  
  const handleSelectChange = (e) => {
    const prefix = e.target.value;
    setSelectedValue(prefix);
    onLocationSelect(prefix); // 親コンポーネントに変更を通知
  };
  const isAddressManuallyEditable = selectedValue === 'その他';

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
              法人名・部署名 <span className="required-mark">*</span>
            </label>
            <input type="text" name="companyName" value={formData.companyName} onChange={handleInputChange} className="customer-info-input" placeholder="県庁 〇〇課" />
          </div>
          {/* ★ 2. 割り当て場所を選択するドロップダウンを追加 */}
          <div className="customer-info-field">
            <label className="customer-info-label">住所</label>
            <select
              onChange={(e) => onLocationSelect(e.target.value)} // ★ 呼び出す関数名を変更
              className="customer-info-input"
              // ★ valueを追加して、選択が反映されるようにする
              value={Object.keys(allocationMaster).find(key => allocationMaster[key].address === formData.address) || ''}
            >
              <option value="">-- 選択してください --</option>
              {Object.keys(allocationMaster || {}).map(prefix => (
                <option key={prefix} value={prefix}>
                  {allocationMaster[prefix].address}
                </option>
              ))}
            </select>
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
          <div className="customer-info-field">
            <label className="customer-info-label">お届け先住所詳細</label>
            <textarea 
              name="deliveryAddressDetail" // 名前は他と重複しないように変更
              value={deliveryAddress} // ★ propsから受け取った値を表示
              rows="3" 
              className="customer-info-input" // 他の入力欄とスタイルを合わせる
              readOnly // ★ この欄は自動入力専用とし、直接編集はさせない
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerInfoSection;