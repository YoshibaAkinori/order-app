"use client";
import React, { useState } from 'react';
// FormInputのimportは元のコードになかったので削除しました

export default function DeliveryDatesModal({ deliveryDates = [], onUpdate }) {
  const [newDate, setNewDate] = useState('');

  const handleAdd = () => {
    // YYYY/MM/DD形式 (10文字) で、リストにまだ存在しない場合のみ追加
    if (newDate.length === 10 && !deliveryDates.includes(newDate)) {
      onUpdate([...deliveryDates, newDate].sort());
      setNewDate('');
    }
  };

  const handleDelete = (dateToDelete) => {
    onUpdate(deliveryDates.filter(date => date !== dateToDelete));
  };

  // ★ 1. 日付入力専用のonChangeハンドラを新しく作成
  const handleDateChange = (e) => {
    // 入力値を取得
    const value = e.target.value;

    // 数字以外の文字をすべて削除
    const digitsOnly = value.replace(/[^0-9]/g, '');

    // YYYYMMDD (8文字) までに制限
    const truncatedDigits = digitsOnly.slice(0, 8);

    // 長さに応じて自動で "/" を挿入
    let formattedDate = truncatedDigits;
    if (truncatedDigits.length > 4) {
      formattedDate = `${truncatedDigits.slice(0, 4)}/${truncatedDigits.slice(4)}`;
    }
    if (truncatedDigits.length > 6) {
      formattedDate = `${truncatedDigits.slice(0, 4)}/${truncatedDigits.slice(4, 6)}/${truncatedDigits.slice(6)}`;
    }

    // 整形した値でStateを更新
    setNewDate(formattedDate);
  };


  return (
    <>
      <h2>配達可能日の管理</h2>
      <p className="instruction-text">
        日付は半角数字で続けて入力してください。「/」は自動で挿入されます。
      </p>
      <div className="list-edit-form">
        <input
          name="newDate"
          value={newDate}
          onChange={handleDateChange} // ★ 2. 作成した専用ハンドラを設定
          placeholder="例: 2025/01/01"
          maxLength="10" // 最大文字数を10文字に設定
        />
        <button onClick={handleAdd}>追加</button>
      </div>
      <ul className="item-list">
        {deliveryDates.map((date, index) => (
          <li key={index}>
            {date}
            <button onClick={() => handleDelete(date)}>×</button>
          </li>
        ))}
      </ul>
    </>
  );
}