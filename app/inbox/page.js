"use client";
import React, { useState, useEffect } from 'react';
import { getEmailThreads, sendReplyAPI , markThreadAsReadAPI} from '../lib/inboxApi';
import './inbox.css';

// ★★★ 1. フッター（署名）を定数として定義 ★★★
const EMAIL_FOOTER = `
----------------------------------------
松栄寿し 長野駅東口店
〒380-0921 長野県長野市大字栗田1525番地
TEL: (026)217-8700 / FAX: (026)268-1718
mail: mail@support.h-matsue.com
`;

export default function InboxPage() {
    const [threads, setThreads] = useState([]);
    const [selectedThread, setSelectedThread] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [replyBody, setReplyBody] = useState(''); 
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        getEmailThreads()
            .then(data => setThreads(data))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const fetchThreads = async () => {
        setLoading(true);
        try {
            const data = await getEmailThreads();
            setThreads(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ★★★ 2. スレッドが選択された時の処理を新しい関数にまとめる ★★★
    const handleThreadSelect = async (thread) => { // ★ asyncを追加
        setSelectedThread(thread);
        // もしスレッドが未読なら、既読にするAPIを呼び出す
        if (!thread.isRead) {
            try {
                await markThreadAsReadAPI(thread.threadId);
                
                // フロントエンドの表示も即座に更新
                setThreads(prevThreads => 
                    prevThreads.map(t => 
                        t.threadId === thread.threadId ? { ...t, isRead: true } : t
                    )
                );

            } catch (err) {
                console.error("Failed to mark thread as read:", err);
                // エラーが起きてもUIの操作は続行させる
            }
        }

        // スレッドの最後のメッセージを取得
        const lastMessage = thread.messages[thread.messages.length - 1];
        
        // 引用文を作成 (例: "> 9/6/2025, 1:23:45 PM、customer@example.comさんのメッセージ:")
        const quoteHeader = `\n\n\n> ${new Date(lastMessage.receivedAt).toLocaleString('ja-JP')}、${lastMessage.fromAddress}さんのメッセージ:\n>`;
        const quotedBody = (lastMessage.bodyText || '').split('\n').join('\n> ');

        // 返信の初期テキストを生成（カーソル用の改行 + フッター + 引用文）
        const initialReplyText = `\n\n${EMAIL_FOOTER}${quoteHeader}${quotedBody}`;
        
        setReplyBody(initialReplyText);
    };

    const handleSendReply = async () => {
        if (!selectedThread || !replyBody.trim() || isSending) return;

        // 相手のアドレスを見つける
        const recipient = selectedThread.participants.find(p => p && !p.includes('support.h-matsue.com'));
        if (!recipient) {
            alert('返信先のメールアドレスが見つかりません。');
            return;
        }
        
        const replyData = {
            toAddress: recipient,
            subject: selectedThread.subject.startsWith('Re: ') ? selectedThread.subject : `Re: ${selectedThread.subject}`,
            bodyText: replyBody,
            threadId: selectedThread.threadId,
            receptionNumber: selectedThread.receptionNumber,
        };

        setIsSending(true);
        try {
            await sendReplyAPI(replyData);
            alert('返信を送信しました。');
            setReplyBody(''); // テキストエリアを空にする
            await fetchThreads(); // ★ 送信後に受信トレイを更新
        } catch (err) {
            alert(`返信の送信に失敗しました: ${err.message}`);
        } finally {
            setIsSending(false);
        }
    };

    if (loading) return <div>読み込み中...</div>;
    if (error) return <div>エラー: {error}</div>;

    return (
        <div className="inbox-layout">
            <div className="thread-list">
                <h2>受信トレイ</h2>
                {threads.map(thread => (
                    <div 
                        key={thread.threadId} 
                        className={`thread-item ${selectedThread?.threadId === thread.threadId ? 'selected' : ''} ${!thread.isRead ? 'unread' : ''}`}
                        onClick={() => handleThreadSelect(thread)} // ★★★ 3. 新しいハンドラーを呼び出す ★★★
                    >
                        <div className="thread-subject">{thread.subject} ({thread.messages.length})</div>
                        <div className="thread-participants">{thread.receptionNumber}</div>
                        <div className="thread-date">{new Date(thread.lastMessageAt).toLocaleString('ja-JP')}</div>
                    </div>
                ))}
            </div>

            <div className="message-view">
                {selectedThread ? (
                    <>
                        <h3>{selectedThread.subject}</h3>
                        <div className="message-container">
                            {selectedThread.messages.map(msg => (
                                <div key={msg.emailId} className={`message-bubble ${msg.direction === 'SENT' ? 'sent' : 'received'}`}>
                                    <div className="message-header">
                                        <strong>{msg.direction === 'SENT' ? '自分' : msg.fromAddress}</strong>
                                        <span className="message-date">{new Date(msg.receivedAt).toLocaleString('ja-JP')}</span>
                                    </div>
                                    <pre className="message-body">{msg.bodyText}</pre>
                                </div>
                            ))}
                        </div>
                        <div className="reply-form">
                            <textarea 
                                placeholder="返信を入力..."
                                value={replyBody}
                                onChange={(e) => setReplyBody(e.target.value)}
                                disabled={isSending} // 送信中は入力不可に
                            />
                            <button onClick={handleSendReply} disabled={isSending}>
                                {isSending ? '送信中...' : '送信'}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="no-selection">スレッドを選択してください</div>
                )}
            </div>
        </div>
    );
}