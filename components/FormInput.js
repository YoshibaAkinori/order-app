"use client"; // stateを使うので先頭に追加
import React, { useState } from 'react';

const FormInput = ({ label, name, value, onChange, type = 'text', placeholder, required = false }) => {
  // ★ 日本語入力中かどうかを判定するためのstateを追加
  const [isComposing, setIsComposing] = useState(false);

  return (
    <div>
      <label className="block text-base font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        // ★ 変換の開始と終了を検知するイベントハンドラを追加
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        // ★ 変換中にEnterキーが押されても、意図しない動作を防ぐ
        onKeyDown={(e) => {
          if (e.key === 'Enter' && isComposing) {
            e.preventDefault();
          }
        }}
        className="max-w-md w-full px-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-2xl"
      />
    </div>
  );
};

export default FormInput;