import React, { useState } from 'react';

const CustomerInfoSection = ({ formData, handleInputChange }) => {
  // スタイル定義
  const inputStyle = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xl leading-tight h-[40px]";
  const textareaStyle = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xl resize-none leading-tight h-[65px]";
  // ★★★ w-full を削除 ★★★
  const selectStyle = "px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xl bg-white leading-tight h-[40px]";
  
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
    <div className="bg-blue-50 p-8 rounded-lg min-h-screen">
      <h2 className="text-4xl font-bold text-blue-800 mb-10 text-center">発注者の情報</h2>

      <div className="max-w-4xl mx-auto">
        <div className="order-container">
          <div>
            <label className="block text-2xl font-bold text-gray-700 mb-6">
              担当者名 <span className="text-red-500 text-xl">*</span>
            </label>
            <input
              type="text"
              name="contactName"
              value={formData.contactName}
              onChange={handleInputChange}
              className={inputStyle}
              placeholder="山田太郎"
            />
          </div>

          <div>
            <label className="block text-xl font-semibold text-gray-700 mb-4">
              メールアドレス <span className="text-red-500 text-lg">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={inputStyle}
              placeholder="example@company.com"
            />
          </div>

          <div>
            <label className="block text-xl font-semibold text-gray-700 mb-4">
              FAX番号
            </label>
            <input
              type="tel"
              name="fax"
              value={formData.fax}
              onChange={handleInputChange}
              className={inputStyle}
              placeholder="026-268-1717"
            />
          </div>

          <div>
            <label className="block text-xl font-semibold text-gray-700 mb-4">
              電話番号 <span className="text-red-500 text-lg">*</span>
            </label>
            <input
              type="tel"
              name="tel"
              value={formData.tel}
              onChange={handleInputChange}
              className={inputStyle}
              placeholder="026-268-1718"
            />
          </div>

          <div>
            <label className="block text-xl font-semibold text-gray-700 mb-4">
              法人名 <span className="text-red-500 text-lg">*</span>
            </label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleInputChange}
              className={inputStyle}
              placeholder="株式会社○○○"
            />
          </div>

          <div>
            <label className="block text-xl font-semibold text-gray-700 mb-4">
              部署名
            </label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              className={inputStyle}
              placeholder="営業部"
            />
          </div>

          <div>
            <label className="block text-xl font-semibold text-gray-700 mb-4">
              配達方法 <span className="text-red-500 text-lg">*</span>
            </label>
            <select
              name="deliveryMethod"
              value={formData.deliveryMethod}
              onChange={handleInputChange}
              className={inputStyle}
            >
              <option value="">選択してください</option>
              <option value="出前">出前</option>
              <option value="東口受け取り">東口受け取り</option>
              <option value="日詰受け取り">日詰受け取り</option>
            </select>
          </div>

          {/* ★★★ この「注文日程」セクションを修正 ★★★ */}
          <div>
            <label className="block text-xl font-semibold text-gray-700 mb-4">
              注文日程 <span className="text-red-500 text-lg">*</span>
            </label>
            <div className="order-schedule-container">
              {/* 日付選択 */}
              <select
                name="orderDate"
                value={formData.orderDate}
                onChange={handleInputChange}
                className={`${selectStyle} `}
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
                className={`${selectStyle} `}
              >
                <option value="">時間を選択</option>
                {availableTimes.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xl font-semibold text-gray-700 mb-4">
              お届け先住所
            </label>
            <textarea
              name="deliveryAddress"
              value={formData.deliveryAddress}
              onChange={handleInputChange}
              rows="4"
              className={textareaStyle}
              placeholder="〒380-0921 長野県長野市栗田1525"
            />
          </div>

          <div>
            <label className="block text-xl font-semibold text-gray-700 mb-4">
              支払い方法 <span className="text-red-500 text-lg">*</span>
            </label>
            <select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleInputChange}
              className={inputStyle}
            >
              <option value="">選択してください</option>
              <option value="現金">現金</option>
              <option value="銀行振込">銀行振込</option>
              <option value="クレジットカード">クレジットカード</option>
              <option value="請求書払い">請求書払い</option>
            </select>
          </div>

          <div>
            <label className="block text-xl font-semibold text-gray-700 mb-4">
              領収書・請求書の宛名
            </label>
            <input
              type="text"
              name="invoiceName"
              value={formData.invoiceName}
              onChange={handleInputChange}
              className={inputStyle}
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
    <div className="min-h-screen bg-gray-100 py-8">
      <CustomerInfoSection 
        formData={formData} 
        handleInputChange={handleInputChange} 
      />
    </div>
  );
};

export default App;