"use client";
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import Link from 'next/link';

// ボタン内に表示する上矢印アイコン
const ArrowUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" >
    <path d="m5 12 7-7 7 7" />
    <path d="M12 19V5" />
  </svg>
);

// 説明書ページ用のレイアウト
const InstructionsLayout = ({ children }) => {
  // ボタンの表示状態を管理
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    const checkScrollTop = () => {
      // 300px以上スクロールされたらボタンを表示
      if (!showScrollButton && window.pageYOffset > 300) {
        setShowScrollButton(true);
      } else if (showScrollButton && window.pageYOffset <= 300) {
        setShowScrollButton(false);
      }
    };

    // スクロールイベントを監視
    window.addEventListener('scroll', checkScrollTop);
    // クリーンアップ
    return () => window.removeEventListener('scroll', checkScrollTop);
  }, [showScrollButton]);

  // ページトップへスムーズにスクロールする関数
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>取扱説明書</h1>
          <Link href="/" style={{ textDecoration: 'underline', color: '#007bff' }}>
            &larr; アプリケーションに戻る
          </Link>
        </div>
      </header>
      <main>{children}</main>

      {/* スクロールトップボタン */}
      {showScrollButton && (
        <button
          onClick={scrollToTop}
          style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
            transition: 'opacity 0.3s, transform 0.3s',
          }}
          title="トップに戻る"
        >
          <ArrowUpIcon />
        </button>
      )}
    </div>
  );
};

const InstructionsPage = () => {
  const [markdown, setMarkdown] = useState('');
  const contentRef = useRef(null);

  useEffect(() => {
    fetch('/README.md')
      .then(response => response.text())
      .then(text => setMarkdown(text))
      .catch(err => console.error("README.mdの読み込みに失敗しました:", err));
  }, []);

  // --- ヘッダーを考慮したスクロール処理 ---
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
          const headerElement = document.querySelector('.shared-header');
          const headerHeight = headerElement ? headerElement.offsetHeight : 0;
          const elementPosition = heading.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerHeight - 20;
      
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