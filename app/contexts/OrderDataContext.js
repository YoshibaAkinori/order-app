"use client";
import React, { createContext, useState, useContext } from 'react';

const OrderDataContext = createContext();
export const useOrderData = () => useContext(OrderDataContext);

export const OrderDataProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [currentDate, setCurrentDate] = useState(''); // ★ 1. 日付用のstateを追加

  const value = { orders, setOrders, currentDate, setCurrentDate }; // ★ 2. valueに追加

  return (
    <OrderDataContext.Provider value={value}>
      {children}
    </OrderDataContext.Provider>
  );
};