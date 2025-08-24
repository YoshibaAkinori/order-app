"use client";
import React, { createContext, useState, useEffect, useContext } from 'react';
import { getCurrentUser, signOut } from 'aws-amplify/auth';

const ConfigurationContext = createContext();

const EMPTY_CONFIG_TEMPLATE = {
  products: {}, specialMenus: {}, sideMenus: {},
  deliveryDates: [], deliveryTimes: [], allocationMaster: {},
  deliveryWariate: [], netaMaster: []
};

export const ConfigurationProvider = ({ children }) => {
  const [configuration, setConfiguration] = useState(null);
  const [netaMaster, setNetaMaster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true); // 認証チェック専用のローディング状態
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // ページロード時にCognitoのセッションとlocalStorageの年を確認
    const checkAuthAndLoadData = async () => {
      try {
        console.log('=== 認証チェック開始 ===');
        await getCurrentUser();
        console.log('✅ ユーザー認証済み');
        setIsLoggedIn(true);
        
        const savedYear = localStorage.getItem('selectedYear');
        if (savedYear) {
          setSelectedYear(savedYear);
        } else {
          setLoading(false); // 年が未選択なので、データローディングを終える
        }
      } catch (error) {
        console.log('❌ ユーザー未認証:', error.message);
        setIsLoggedIn(false);
        setLoading(false);
      } finally {
        setAuthLoading(false); // 認証チェック完了
        console.log('=== 認証チェック完了 ===');
      }
    };
    checkAuthAndLoadData();
  }, []);

  const fetchConfiguration = async (year) => {
    setLoading(true);
    setError(null);
    try {
      const [configResponse, netaResponse] = await Promise.allSettled([
        fetch(`https://viy41bgkvd.execute-api.ap-northeast-1.amazonaws.com/configurations/${year}`),
        fetch(`https://viy41bgkvd.execute-api.ap-northeast-1.amazonaws.com/neta-master`)
      ]);

      if (netaResponse.status === 'fulfilled' && netaResponse.value.ok) {
        const netaData = await netaResponse.value.json();
        setNetaMaster(netaData.sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999)));
      } else if (netaResponse.status === 'fulfilled' && netaResponse.value.status === 404) {
        setNetaMaster([]);
      } else {
        throw new Error('ネタマスタの取得に失敗しました。');
      }
      
      if (configResponse.status === 'fulfilled' && configResponse.value.ok) {
        const configData = await configResponse.value.json();
        setConfiguration(configData);
      } else if (configResponse.status === 'fulfilled' && configResponse.value.status === 404) {
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
    if (selectedYear && isLoggedIn) {
      fetchConfiguration(selectedYear);
    }
  }, [selectedYear, isLoggedIn]);

  const changeYear = (year) => {
    console.log('=== changeYear呼び出し ===');
    console.log('新しい年:', year);
    localStorage.setItem('selectedYear', year);
    setSelectedYear(year);
    // データの強制リセットを追加
    setConfiguration(null);
    setNetaMaster([]);
    setError(null);
  };
  
  const login = () => setIsLoggedIn(true);

  const logout = async () => {
    try {
      await signOut();
      setIsLoggedIn(false);
      // ログアウト時に他の状態もリセット
      setSelectedYear(null);
      setConfiguration(null);
      localStorage.removeItem('selectedYear');
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };
  
  const value = { 
    configuration, 
    netaMaster, 
    loading, 
    authLoading, // 認証ローディング状態を追加
    error, 
    selectedYear, 
    changeYear, 
    fetchConfiguration, 
    isLoggedIn, 
    login, 
    logout 
  };

  return (
    <ConfigurationContext.Provider value={value}>
      {children}
    </ConfigurationContext.Provider>
  );
};

export const useConfiguration = () => useContext(ConfigurationContext);