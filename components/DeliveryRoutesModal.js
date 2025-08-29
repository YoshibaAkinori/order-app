"use client";
import React, { useState } from 'react';
import FormInput from './FormInput';

export default function DeliveryRoutesModal({ deliveryRoutes = [], onUpdate }) {
  const [newRoute, setNewRoute] = useState('');

  const handleAdd = () => {
    if (newRoute && !deliveryRoutes.includes(newRoute)) {
      onUpdate([...deliveryRoutes, newRoute]);
      setNewRoute('');
    }
  };

  const handleDelete = (routeToDelete) => {
    onUpdate(deliveryRoutes.filter(route => route !== routeToDelete));
  };

  return (
    <>
      <h2>割り振り担当の管理</h2>
      <div className="list-edit-form">
        <input
          name="newRoute"
          value={newRoute}
          onChange={(e) => setNewRoute(e.target.value)}
          placeholder="例: 県庁担当"
        />
        <button onClick={handleAdd}>追加</button>
      </div>
      <ul className="item-list">
        {deliveryRoutes.map((route, index) => (
          <li key={index}>
            {route}
            <button onClick={() => handleDelete(route)}>×</button>
          </li>
        ))}
      </ul>
    </>
  );
}