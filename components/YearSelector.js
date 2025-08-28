"use client";
import React from 'react';
import { useConfiguration } from '../app/contexts/ConfigurationContext';

const YearSelector = ({ showLabel = true, className = "", onYearChange }) => {
  const { selectedYear, changeYear } = useConfiguration();

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear ; i++) {
      years.push(i);
    }
    return years;
  };

  const yearOptions = generateYearOptions();

  const handleYearChange = (newYear) => {
    console.log('=== 年選択変更 ===');
    console.log('変更前:', selectedYear);
    console.log('変更後:', newYear);
    
    changeYear(newYear);
    
    // コールバック関数が提供されている場合は実行（サイドバーを閉じるなど）
    if (onYearChange) {
      onYearChange(newYear);
    }
    
    // ページを完全にリロードして確実に反映
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  return (
    <div className={className}>
      {showLabel && <label htmlFor="year-select">設定年: </label>}
      <select
        id="year-select"
        value={selectedYear || ''}
        onChange={(e) => handleYearChange(e.target.value)}
        className="year-selector-dropdown"
      >
        <option value="" disabled>-- 年を選択してください --</option>
        {yearOptions.map(year => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>
    </div>
  );
};

export default YearSelector;