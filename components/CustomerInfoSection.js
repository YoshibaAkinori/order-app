import React, { useState } from 'react';

const CustomerInfoSection = ({ formData, handleInputChange }) => {
  // 日付と時間の選択肢
  const availableDates = [
    '2025年12月25日',
    '2025年12月26日',
    '2026年01月05日',
  ];
  const availableTimes = [
    '11:00',
    '12:00',
    '13:00',
  ];

  return (
    <div className="customer-info-section">
      <h2 className="customer-info-title">発注者の情報</h2>

      <div className="customer-info-container">
        <div className="customer-info-form">
          <div className="customer-info-field">
            <label className="customer-info-label-large">
              担当者名 <span className="required-mark-large">*</span>
            </label>
            <input
              type="text"
              name="contactName"
              value={formData.contactName}
              onChange={handleInputChange}
              className="customer-info-input"
              placeholder="山田太郎"
            />
          </div>

          <div className="customer-info-field">
            <label className="customer-info-label">
              メールアドレス <span className="required-mark">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="customer-info-input"
              placeholder="example@company.com"
            />
          </div>

          <div className="customer-info-field">
            <label className="customer-info-label">
              FAX番号
            </label>
            <input
              type="tel"
              name="fax"
              value={formData.fax}
              onChange={handleInputChange}
              className="customer-info-input"
              placeholder="026-268-1717"
            />
          </div>

          <div className="customer-info-field">
            <label className="customer-info-label">
              電話番号 <span className="required-mark">*</span>
            </label>
            <input
              type="tel"
              name="tel"
              value={formData.tel}
              onChange={handleInputChange}
              className="customer-info-input"
              placeholder="026-268-1718"
            />
          </div>

          <div className="customer-info-field">
            <label className="customer-info-label">
              法人名 <span className="required-mark">*</span>
            </label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleInputChange}
              className="customer-info-input"
              placeholder="株式会社○○○"
            />
          </div>

          <div className="customer-info-field">
            <label className="customer-info-label">
              部署名
            </label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              className="customer-info-input"
              placeholder="営業部"
            />
          </div>

          <div className="customer-info-field">
            <label className="customer-info-label">
              配達方法 <span className="required-mark">*</span>
            </label>
            <select
              name="deliveryMethod"
              value={formData.deliveryMethod}
              onChange={handleInputChange}
              className="customer-info-input"
            >
              <option value="">選択してください</option>
              <option value="出前">出前</option>
              <option value="東口受け取り">東口受け取り</option>
              <option value="日詰受け取り">日詰受け取り</option>
            </select>
          </div>

          <div className="customer-info-field">
            <label className="customer-info-label">
              注文日程 <span className="required-mark">*</span>
            </label>
            <div className="order-schedule-container">
              {/* 日付選択 */}
              <select
                name="orderDate"
                value={formData.orderDate}
                onChange={handleInputChange}
                className="customer-info-select"
              >
                <option value="">日付を選択</option>
                {availableDates.map(date => (
                  <option key={date} value={date}>{date}</option>
                ))}
              </select>
              {/* 時間選択 */}
              <select
                name="orderTime"
                value={formData.orderTime}
                onChange={handleInputChange}
                className="customer-info-select"
              >
                <option value="">時間を選択</option>
                {availableTimes.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="customer-info-field">
            <label className="customer-info-label">
              お届け先住所
            </label>
            <textarea
              name="deliveryAddress"
              value={formData.deliveryAddress}
              onChange={handleInputChange}
              rows="4"
              className="customer-info-textarea"
              placeholder="〒380-0921 長野県長野市栗田1525"
            />
          </div>

          <div className="customer-info-field">
            <label className="customer-info-label">
              支払い方法 <span className="required-mark">*</span>
            </label>
            <select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleInputChange}
              className="customer-info-input"
            >
              <option value="">選択してください</option>
              <option value="現金">現金</option>
              <option value="銀行振込">銀行振込</option>
              <option value="クレジットカード">クレジットカード</option>
              <option value="請求書払い">請求書払い</option>
            </select>
          </div>

          <div className="customer-info-field">
            <label className="customer-info-label">
              領収書・請求書の宛名
            </label>
            <input
              type="text"
              name="invoiceName"
              value={formData.invoiceName}
              onChange={handleInputChange}
              className="customer-info-input"
              placeholder="株式会社○○○"
            />
          </div>
        </div>
      </div>
    </div>
  );
};


// デモ用のラッパーコンポーネント
// ※この部分は最終的にpage.jsに移動するため、ここではそのままでOK
const App = () => {
  const [formData, setFormData] = useState({
    contactName: '',
    email: '',
    fax: '',
    tel: '',
    companyName: '',
    department: '',
    deliveryMethod: '',
    orderDate: '',
    deliveryAddress: '',
    paymentMethod: '',
    invoiceName: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="app-container">
      <CustomerInfoSection 
        formData={formData} 
        handleInputChange={handleInputChange} 
      />
    </div>
  );
};

export default App;