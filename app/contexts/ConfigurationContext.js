"use client";
import React, { createContext, useState, useEffect, useContext } from 'react';

const ConfigurationContext = createContext();

const EMPTY_CONFIG_TEMPLATE = {
  products: {},
  specialMenus: {},
  sideMenus: {},
  deliveryDates: [],
  deliveryTimes: [],
  allocationMaster: {},
};

export const ConfigurationProvider = ({ children }) => {
  const [configuration, setConfiguration] = useState(null);
  const [netaMaster, setNetaMaster] = useState([]);
  const [loading, setLoading] = useState(false); // ★ 初期値はfalseが良い
  const [error, setError] = useState(null);

  const [selectedYear, setSelectedYear] = useState(() => {
    // ページロード時にlocalStorageから前回の値を取得
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedYear') || null;
    }
    return null;
  });

  const fetchConfiguration = async (year) => {
    setLoading(true);
    setError(null);
    try {
      const [configResponse, netaResponse] = await Promise.all([
        fetch(`https://viy41bgkvd.execute-api.ap-northeast-1.amazonaws.com/configurations/${year}`),
        fetch(`https://viy41bgkvd.execute-api.ap-northeast-1.amazonaws.com/neta-master`)
      ]);

      if (netaResponse.ok) {
        const netaData = await netaResponse.json();
        const sortedNeta = netaData.sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));
        setNetaMaster(sortedNeta);
      } else if (netaResponse.status === 404) {
        setNetaMaster([]);
      } else {
        throw new Error('ネタマスタの取得に失敗しました。');
      }
      
      if (configResponse.ok) {
        const configData = await configResponse.json();
        setConfiguration(configData);
      } else if (configResponse.status === 404) {
        setConfiguration({ ...EMPTY_CONFIG_TEMPLATE, configYear: null });
      } else {
        throw new Error('設定データの取得に失敗しました。');
      }

    } catch (err) {
      setConfiguration(null);
      setNetaMaster([]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedYear) {
      fetchConfiguration(selectedYear);
    }
  }, [selectedYear]);

  const changeYear = (year) => {
    if (typeof window !== 'undefined') {
      // localStorageに新しい値を保存
      localStorage.setItem('selectedYear', year);
    }
    setSelectedYear(year);
  };
  
  // ★★★ この行に `fetchConfiguration` を追加 ★★★
  const value = { configuration, loading, error, selectedYear, changeYear, fetchConfiguration, netaMaster };

  return (
    <ConfigurationContext.Provider value={value}>
      {children}
    </ConfigurationContext.Provider>
  );
};

export const useConfiguration = () => useContext(ConfigurationContext);