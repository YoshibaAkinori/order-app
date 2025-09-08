"use client";
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import Link from 'next/link';

// 説明書ページ用のレイアウト
const InstructionsLayout = ({ children }) => (
  <div style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>
    {/* ページ内のタイトルは残しつつ、アプリ全体のヘッダーとは別にします */}
    <header style={{ marginBottom: '2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>取扱説明書</h1>
        <Link href="/" style={{ textDecoration: 'underline', color: '#007bff' }}>
          &larr; アプリケーションに戻る
        </Link>
      </div>
    </header>
    <main>{children}</main>
  </div>
);

const InstructionsPage = () => {
  const [markdown, setMarkdown] = useState('');
  const contentRef = useRef(null);

  useEffect(() => {
    fetch('/README.md')
      .then(response => response.text())
      .then(text => setMarkdown(text))
      .catch(err => console.error("README.mdの読み込みに失敗しました:", err));
  }, []);

  // --- 👇ヘッダーを考慮したスクロール処理 ---
  useEffect(() => {
    const contentElement = contentRef.current;
    if (!contentElement) return;

    const handleLinkClick = (event) => {
      const link = event.target.closest('a');
      if (!link || !link.getAttribute('href')?.startsWith('#')) return;
      
      event.preventDefault();

      const linkText = link.textContent;
      if (!linkText) return;
      
      const headings = contentElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
      
      for (const heading of headings) {
        if (heading.textContent === linkText) {
          // 1. アプリケーション全体のヘッダー要素を取得
          const headerElement = document.querySelector('.shared-header');
          // 2. ヘッダーの高さを取得（なければ0）
          const headerHeight = headerElement ? headerElement.offsetHeight : 0;
          
          // 3. スクロール先の位置を計算（見出しの位置 - ヘッダーの高さ - 少しの余白）
          const elementPosition = heading.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerHeight - 20; // 20pxの余白を追加
      
          // 4. 計算した位置までスムーズにスクロール
          window.scrollTo({
             top: offsetPosition,
             behavior: "smooth"
          });

          break;
        }
      }
    };

    contentElement.addEventListener('click', handleLinkClick);

    return () => {
      contentElement.removeEventListener('click', handleLinkClick);
    };
  }, [markdown]);

  return (
    <InstructionsLayout>
      <div className="readme-content" ref={contentRef} style={{ lineHeight: '1.8' }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    </InstructionsLayout>
  );
};

export default InstructionsPage;