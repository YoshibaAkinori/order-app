"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { getEmailThreads, sendReplyAPI, markThreadAsReadAPI, initializeInboxAPI } from '../lib/inboxApi';
import './inbox.css';

// フッター（署名）
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
    const [currentView, setCurrentView] = useState('inbox');

    // ★★★ 1. 返信フォームの表示状態を管理するstateを追加 ★★★
    const [isComposing, setIsComposing] = useState(false);

    // 初期データ取得
    useEffect(() => {
        fetchThreads();
    }, []);

    const fetchThreads = async () => {
        setLoading(true);
        setSelectedThread(null);
        setIsComposing(false); // ★★★ 更新時は返信フォームを閉じる
        try {
            const data = await getEmailThreads();
            setThreads(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // スレッドを3つのカテゴリに分類
    const { inboxThreads, confirmationThreads, sentThreads } = useMemo(() => {
        const inbox = threads.filter(thread =>
            thread.messages.some(m => !m.direction.startsWith('SENT'))
        );
        const confirmation = threads.filter(thread =>
            thread.messages.some(m => m.direction === 'SENT_CONFIRMATION')
        );
        const sent = threads.filter(thread => {
            const hasRegularSent = thread.messages.some(m => m.direction === 'SENT');
            const hasConfirmation = thread.messages.some(m => m.direction === 'SENT_CONFIRMATION');
            return hasRegularSent && !hasConfirmation;
        });
        return { 
        inboxThreads: inbox, 
        sentThreads: sent, 
        confirmationThreads: confirmation 
    };
}, [threads]);

    const [isInitializing, setIsInitializing] = useState(false);

    const handleInitializeInbox = async () => {
        if (!window.confirm("本当によろしいですか？\n受信トレイと通知のすべてのデータが完全に削除されます。この操作は元に戻せません。")) {
            return;
        }
        setIsInitializing(true);
        try {
            const result = await initializeInboxAPI();
            alert(result.message);
            await fetchThreads();
        } catch (err) {
            alert(`初期化に失敗しました: ${err.message}`);
        } finally {
            setIsInitializing(false);
        }
    };

    const displayedThreads = useMemo(() => {
        if (currentView === 'inbox') return inboxThreads;
        if (currentView === 'confirmation') return confirmationThreads;
        if (currentView === 'sent') return sentThreads;
        return [];
    }, [currentView, inboxThreads, confirmationThreads, sentThreads]);

    // ★★★ 2. スレッド選択時の処理を簡略化 ★★★
    // 返信フォームの準備ロジックを削除し、スレッド表示と既読処理に専念させる
    const handleThreadSelect = async (thread) => {
        setSelectedThread(thread);
        setIsComposing(false); // スレッドを切り替えたら返信フォームは閉じる
        setReplyBody('');      // 返信内容もクリア

        if (!thread.isRead) {
            try {
                await markThreadAsReadAPI(thread.threadId);
                setThreads(prevThreads =>
                    prevThreads.map(t =>
                        t.threadId === thread.threadId ? { ...t, isRead: true } : t
                    )
                );
            } catch (err) {
                console.error("Failed to mark thread as read:", err);
            }
        }
    };

    // ★★★ 3. 「メールを作成」ボタンが押された時の新しい関数 ★★★
    // ここで初めて返信フォームの準備を行う
    const handleStartComposition = () => {
        if (!selectedThread) return;

        const lastMessage = selectedThread.messages[selectedThread.messages.length - 1];
        const bodyLines = (lastMessage.bodyText || '').split('\n');
        let newTextLines = [];
        for (const line of bodyLines) {
            if (line.trim().startsWith('>') || line.trim().startsWith('---') || line.trim().startsWith('***')) {
                break;
            }
            newTextLines.push(line);
        }
        const latestMessageOnly = newTextLines.join('\n').trim();

        const quoteHeader = `\n\n\n> ${new Date(lastMessage.receivedAt).toLocaleString('ja-JP')}、${lastMessage.fromAddress}さんのメッセージ:\n>`;
        const quotedBody = latestMessageOnly.split('\n').join('\n> ');
        const initialReplyText = `\n\n${EMAIL_FOOTER}${quoteHeader}${quotedBody}`;
        
        setReplyBody(initialReplyText);
        setIsComposing(true); // 返信フォームを表示する
    };

    // 返信送信処理
    const handleSendReply = async () => {
        if (!selectedThread || !replyBody.trim() || isSending) return;
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
            setReplyBody('');
            setIsComposing(false); // 送信後はフォームを閉じる
            await fetchThreads();
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
                <div className="inbox-header">
                    <h2>受信トレイ</h2>
                    <button
                        className="initialize-button"
                        onClick={handleInitializeInbox}
                        disabled={isInitializing}
                    >
                        {isInitializing ? '初期化中...' : '受信トレイを初期化'}
                    </button>
                </div>
                <div className="inbox-view-selector">
                    <button onClick={() => setCurrentView('inbox')} className={currentView === 'inbox' ? 'active' : ''}>受信トレイ</button>
                    <button onClick={() => setCurrentView('confirmation')} className={currentView === 'confirmation' ? 'active' : ''}>最終確認</button>
                    <button onClick={() => setCurrentView('sent')} className={currentView === 'sent' ? 'active' : ''}>送信済み</button>
                </div>

                {displayedThreads.map(thread => (
                    <div
                        key={thread.threadId}
                        className={`thread-item ${selectedThread?.threadId === thread.threadId ? 'selected' : ''} ${!thread.isRead ? 'unread' : ''}`}
                        onClick={() => handleThreadSelect(thread)}
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
                        <div className="message-view-header">
                            <h3>{selectedThread.subject}</h3>
                            {/* 作成中でなく、かつ返信可能なトレイにいる場合のみボタンを表示 */}
                            {!isComposing && (currentView === 'inbox' || currentView === 'confirmation' || currentView === 'sent') && (
                                <button className="compose-button" onClick={handleStartComposition}>
                                    メールを作成
                                </button>
                            )}
                        </div>
                        <div className="message-container">
                            {selectedThread.messages.map(msg => (
                                <div key={msg.emailId} className={`message-bubble ${msg.direction.startsWith('SENT') ? 'sent' : 'received'}`}>
                                    <div className="message-header">
                                        <strong>{msg.direction.startsWith('SENT') ? '自分' : msg.fromAddress}</strong>
                                        <span className="message-date">{new Date(msg.receivedAt).toLocaleString('ja-JP')}</span>
                                    </div>
                                    <pre className="message-body">{msg.bodyText}</pre>
                                </div>
                            ))}
                        </div>
                        {/* ★★★ 5. 返信フォームの表示条件を isComposing state に変更 ★★★ */}
                        {isComposing && (
                            <div className="reply-form">
                                <textarea
                                    placeholder="返信を入力..."
                                    value={replyBody}
                                    onChange={(e) => setReplyBody(e.target.value)}
                                    disabled={isSending}
                                />
                                <button onClick={handleSendReply} disabled={isSending}>
                                    {isSending ? '送信中...' : '送信'}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="no-selection">スレッドを選択してください</div>
                )}
            </div>
        </div>
    );
}