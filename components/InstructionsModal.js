"use client";
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const InstructionsModal = ({ onClose }) => {
  const [markdown, setMarkdown] = useState('');

  useEffect(() => {
    // publicフォルダに配置したREADME.mdをfetchで読み込む
    fetch('/README.md')
      .then(response => response.text())
      .then(text => setMarkdown(text))
      .catch(err => console.error("README.mdの読み込みに失敗しました:", err));
  }, []);

  return (
    <div className="settings-modal-backdrop" onClick={onClose}>
      <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
            <h2>説明書</h2>
            <button onClick={onClose} className="settings-modal-close-btn">&times;</button>
        </div>
        <div className="readme-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {markdown}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default InstructionsModal;