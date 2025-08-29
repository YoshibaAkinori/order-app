"use client";
import React, { useState } from 'react';
import FormInput from './FormInput'; 

export default function DeliveryDatesModal({ deliveryDates = [], onUpdate }) {
  const [newDate, setNewDate] = useState('');

  const handleAdd = () => {
    if (newDate && !deliveryDates.includes(newDate)) {
      onUpdate([...deliveryDates, newDate].sort()); // 追加後にソート
      setNewDate('');
    }
  };

  const handleDelete = (dateToDelete) => {
    onUpdate(deliveryDates.filter(date => date !== dateToDelete));
  };

  return (
    <>
      <h2>配達可能日の管理</h2>
      <div className="list-edit-form">
        <input
          name="newDate"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          placeholder="例: 2025/01/01"
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