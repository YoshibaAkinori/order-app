"use client";
import React, { createContext, useState, useEffect, useContext } from 'react';

const ConfigurationContext = createContext();

const EMPTY_CONFIG_TEMPLATE = {
  products: {},
  specialMenus: {},
  sideMenus: {}, // sideMenusもテンプレートに含めるとより安全
  deliveryDates: [],
  deliveryTimes: [],
};

export const ConfigurationProvider = ({ children }) => {
  const [configuration, setConfiguration] = useState(null);
  const [netaMaster, setNetaMaster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);

  const fetchConfiguration = async (year) => {
    setLoading(true);
    setError(null);

    try {
      const [configResponse, netaResponse] = await Promise.allSettled([
        fetch(`https://viy41bgkvd.execute-api.ap-northeast-1.amazonaws.com/configurations/${year}`),
        fetch(`https://viy41bgkvd.execute-api.ap-northeast-1.amazonaws.com/neta-master`)
      ]);

      // ★★★ ここからが修正箇所 ★★★
      // neta-masterデータの処理
      if (netaResponse.status === 'fulfilled' && netaResponse.value.ok) {
        const netaData = await netaResponse.value.json();
        // ★ データを取得した直後に、ここでソート処理を行う
        const sortedNeta = netaData.sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));
        setNetaMaster(sortedNeta);
      } else if (netaResponse.status === 'fulfilled' && netaResponse.value.status === 404) {
        // 404の場合は、エラーではなく「空」の状態として扱う
        console.log("ネタマスタが見つかりません。新規作成モードになります。");
        setNetaMaster([]); // 空の配列をセット
      } else {
        // 404以外の通信エラーやサーバーエラー
        throw new Error('ネタマスタの取得に失敗しました。');
      }
      // ★★★ ここまでが修正箇所 ★★★
      
      // configurationsデータの処理 (こちらは変更なし)
      if (configResponse.status === 'fulfilled' && configResponse.value.ok) {
        const configData = await configResponse.value.json();
        setConfiguration(configData);
      } else if (configResponse.status === 'fulfilled' && configResponse.value.status === 404) {
        console.log(`${year}年のデータが見つからなかったので、新規作成モードに入ります。`);
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
    setSelectedYear(year);
  };
  
  const value = { configuration, loading, error, selectedYear, changeYear, fetchConfiguration, netaMaster };

  return (
    <ConfigurationContext.Provider value={value}>
      {children}
    </ConfigurationContext.Provider>
  );
};

export const useConfiguration = () => useContext(ConfigurationContext);