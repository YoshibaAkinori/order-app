"use client";
import React, { useState } from 'react';

export default function DeliveryTimesModal({ deliveryTimes = [], onUpdate }) {
  const [newTime, setNewTime] = useState('');

  const handleAdd = () => {
    if (newTime && !deliveryTimes.includes(newTime)) {
      onUpdate([...deliveryTimes, newTime]);
      setNewTime('');
    }
  };

  const handleDelete = (timeToDelete) => {
    onUpdate(deliveryTimes.filter(time => time !== timeToDelete));
  };

  return (
    <>
      <h2>配達時間帯の管理</h2>
      <div className="list-edit-form">
        <input
          name="newTime"
          value={newTime}
          onChange={(e) => setNewTime(e.target.value)}
          placeholder="例: 11時半まで"
        />
        <button onClick={handleAdd}>追加</button>
      </div>
      <ul className="item-list">
        {deliveryTimes.map((time, index) => (
          <li key={index}>
            {time}
            <button onClick={() => handleDelete(time)}>×</button>
          </li>
        ))}
      </ul>
    </>
  );
}