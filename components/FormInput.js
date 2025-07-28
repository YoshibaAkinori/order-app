"use client"; // stateを使うので先頭に追加
import React, { useState } from 'react';

const FormInput = ({ label, name, value, onChange, type = 'text', placeholder, required = false }) => {
  // ★ 日本語入力中かどうかを判定するためのstateを追加
  const [isComposing, setIsComposing] = useState(false);

  return (
    <div className="form-input-container">
      <label className="form-input-label">
        {label} {required && <span className="required-mark">*</span>}
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
        className="form-input-field"
      />
    </div>
  );
};

export default FormInput;