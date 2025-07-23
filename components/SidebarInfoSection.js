import React from 'react';

const SidebarInfoSection = () => {
  const inputStyle = "w-full px-4 py-2 border border-gray-300 rounded-lg text-lg";

  return (
    <div className="bg-gray-50 p-6 rounded-lg space-y-4" >
      <h3 className="text-xl font-semibold text-gray-800 text-center">店舗記入欄</h3>
      <div>
        <label className="block text-base font-medium text-gray-700 mb-2">
          受付番号
        </label>
        <input
          type="text"
          className={inputStyle}
          placeholder="受付番号"
        />
      </div>
       <div>
        <label className="block text-base font-medium text-gray-700 mb-2">
          割振番号
        </label>
        <input
          type="text"
          className={inputStyle}
          placeholder="割振番号"
        />
      </div>
      {/* ...その他追加したい入力欄... */}
    </div>
  );
};

export default SidebarInfoSection;