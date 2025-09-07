"use client";
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

const InstructionsModal = ({ onClose }) => {
  const [markdown, setMarkdown] = useState('');
  // モーダル内のスクロール可能なコンテンツ領域を参照します
  const contentRef = useRef(null);

  useEffect(() => {
    // README.mdを読み込みます
    fetch('/README.md')
      .then(response => response.text())
      .then(text => setMarkdown(text))
      .catch(err => console.error("README.mdの読み込みに失敗しました:", err));
  }, []);

  // --- 👇ここからが新しいスクロール処理です👇 ---
  useEffect(() => {
    const contentElement = contentRef.current;
    if (!contentElement) return;

    const handleLinkClick = (event) => {
      // クリックされたのがリンク（<a>タグ）でなければ何もしない
      const link = event.target.closest('a');
      if (!link) return;

      // 外部リンクや通常のリンクは無視
      if (!link.getAttribute('href')?.startsWith('#')) return;

      // リンクのデフォルトの挙動（URLの変更など）をキャンセル
      event.preventDefault();

      // リンクのテキストを取得 (例: "8. 設定管理")
      const linkText = link.textContent;
      if (!linkText) return;
      
      // モーダル内の全ての見出し(h1, h2, h3...)を取得
      const headings = contentElement.querySelectorAll('h1, h2, h3, h4, h5, h6');

      // 全ての見出しをループして、テキストが一致するものを探す
      for (const heading of headings) {
        // 見出しのテキストとリンクのテキストが一致したら
        if (heading.textContent === linkText) {
          // その見出しまでスムーズにスクロール
          heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
          break; // 最初に見つかったものに移動して終了
        }
      }
    };

    // イベントリスナーを登録
    contentElement.addEventListener('click', handleLinkClick);

    // コンポーネントがアンマウントされるときにイベントリスナーを解除
    return () => {
      contentElement.removeEventListener('click', handleLinkClick);
    };
    // markdownの内容がセットされた後に一度だけ実行
  }, [markdown]);

  return (
    <div className="settings-modal-backdrop" onClick={onClose}>
      <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
            <h2>説明書</h2>
            <button onClick={onClose} className="settings-modal-close-btn">&times;</button>
        </div>
        <div className="readme-content" ref={contentRef} style={{ overflowY: 'auto', height: 'calc(80vh - 100px)' }}>
          <ReactMarkdown
            rehypePlugins={[rehypeRaw]}
            remarkPlugins={[remarkGfm]}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default InstructionsModal;