"use client";
import React from 'react'; 

const zenkakuToHankaku = (str) => {
  if (!str) return str; // nullやundefinedの場合はそのまま返す
  return str.replace(/[０-９]/g, (char) => {
    return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
  });
};


const CustomerInfoSection = ({ formData, handleInputChange, allocationMaster, onLocationSelect, allocationNumber, isOtherSelected }) => {


  const handleSelectChange = (e) => {

    onLocationSelect(e.target.value);
  };
  const handleFloorNumberChange = (e) => {
    // 1. 全角数字を半角に変換
    const hankakuValue = zenkakuToHankaku(e.target.value);
    // 2. 数字以外の文字を削除
    const numericOnlyValue = hankakuValue.replace(/[^0-9]/g, '');

    // ★ 変更点：シンプルで安全なオブジェクトを作成して親関数を呼び出す
    handleInputChange({
      target: {
        name: 'floorNumber', // 入力欄の名前を直接指定
        value: numericOnlyValue,
      }
    });
  };

  return (
    <div className="customer-info-section">
      <h2 className="customer-info-title">発注者の情報</h2>
      <div className="customer-info-container">
        <div className="customer-info-form">
          {/* 担当者名から法人名までの入力欄は変更ありません */}
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
          
          {/* 住所ドロップダウン (この部分は変更ありません) */}
          <div className="customer-info-field">
            <label className="customer-info-label">住所</label>
            <select
              onChange={handleSelectChange}
              className="customer-info-input"
              value={allocationNumber}
            >
              <option value="">-- 選択してください --</option>
              {Object.keys(allocationMaster || {}).map(prefix => (
                <option key={prefix} value={prefix}>
                  {allocationMaster[prefix].address}
                </option>
              ))}
            </select>
          </div>

          {/* 条件に応じた入力欄の表示 (このロジックは生かします) */}
          {isOtherSelected ? (
            // 「その他」が選択された場合
            <div className="customer-info-field">
              <label className="customer-info-label">住所詳細</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="customer-info-input"
                placeholder="住所を入力してください"
              />
            </div>
          ) : (
            // 「その他」以外が選択された場合
            <div className="customer-info-field">
              <label className="customer-info-label">階数</label>
              <input
                type="text" // ★★★ typeを"text"に変更して"0"も扱えるようにする ★★★
                name="floorNumber"
                onChange={handleFloorNumberChange}
                value={formData.floorNumber}
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