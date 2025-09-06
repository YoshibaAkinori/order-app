"use client";
import React, { useState, useEffect, useMemo } from 'react'; // useMemo をインポート
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

    // ★★★ 1. 現在表示しているトレイを管理するstateを追加 ★★★
    const [currentView, setCurrentView] = useState('inbox'); // 'inbox', 'confirmation', 'sent'

    // 初期データ取得
    useEffect(() => {
        fetchThreads();
    }, []);

    const fetchThreads = async () => {
        setLoading(true);
        setSelectedThread(null); // 更新時は選択を解除
        try {
            const data = await getEmailThreads();
            setThreads(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ★★★ 2. スレッドを3つのカテゴリに分類する ★★★
    // threads または currentView が変更された時だけ再計算される
    const { inboxThreads, confirmationThreads, sentThreads } = useMemo(() => {
        // 受信トレイ：相手からのメッセージが含まれるスレッドすべて
        const inbox = threads.filter(thread =>
            thread.messages.some(m => !m.direction.startsWith('SENT'))
        );

        // 最終確認トレイ：最終確認メールが含まれるスレッドすべて
        const confirmation = threads.filter(thread =>
            thread.messages.some(m => m.direction === 'SENT_CONFIRMATION')
        );

        // 送信済みトレイ：「通常の送信」があり、かつ「最終確認」ではないスレッド
        const sent = threads.filter(thread => {
            const hasRegularSent = thread.messages.some(m => m.direction === 'SENT');
            const hasConfirmation = thread.messages.some(m => m.direction === 'SENT_CONFIRMATION');
            return hasRegularSent && !hasConfirmation;
        });

        return { inboxThreads: inbox, sentThreads: sent, confirmationThreads: confirmation };
    }, [threads]);

    const [isInitializing, setIsInitializing] = useState(false);

    // ★★★【ここから追加】★★★
    const handleInitializeInbox = async () => {
        const isConfirmed = window.confirm(
            "本当によろしいですか？\n受信トレイと通知のすべてのデータが完全に削除されます。この操作は元に戻せません。"
        );

        if (!isConfirmed) {
            return;
        }

        setIsInitializing(true);
        try {
            const result = await initializeInboxAPI();

            alert(result.message);
            await fetchThreads(); // リストを再読み込み

        } catch (err) {
            alert(`初期化に失敗しました: ${err.message}`);
        } finally {
            setIsInitializing(false);
        }
    };


    // 表示するスレッドを現在のビューに応じて切り替える（変更なし）
    const displayedThreads = useMemo(() => {
        if (currentView === 'inbox') return inboxThreads;
        if (currentView === 'confirmation') return confirmationThreads;
        if (currentView === 'sent') return sentThreads;
        return [];
    }, [currentView, inboxThreads, confirmationThreads, sentThreads]);


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
        }
    }

    // スレッドの最後のメッセージを取得
    const lastMessage = thread.messages[thread.messages.length - 1];
    
    // ★★★【ここを修正】★★★
    // 過去の引用部分を削除し、最新のメッセージだけを抽出する
    const bodyLines = (lastMessage.bodyText || '').split('\n');
    let newTextLines = [];
    for (const line of bodyLines) {
        // 引用行や署名の区切り線が見つかったら、そこでループを止める
        if (line.trim().startsWith('>') || line.trim().startsWith('---') || line.trim().startsWith('***')) {
            break;
        }
        newTextLines.push(line);
    }
    const latestMessageOnly = newTextLines.join('\n').trim();
    // ★★★【修正ここまで】★★★

    // 引用文を作成
    const quoteHeader = `\n\n\n> ${new Date(lastMessage.receivedAt).toLocaleString('ja-JP')}、${lastMessage.fromAddress}さんのメッセージ:\n>`;
    // 抽出した最新メッセージだけを引用する
    const quotedBody = latestMessageOnly.split('\n').join('\n> ');

    // 返信の初期テキストを生成（カーソル用の改行 + フッター + 引用文）
    const initialReplyText = `\n\n${EMAIL_FOOTER}${quoteHeader}${quotedBody}`;
    
    setReplyBody(initialReplyText);
};

    // 返信送信処理（変更なし）
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
                        <h3>{selectedThread.subject}</h3>
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
                        {/* 返信フォームは受信トレイと最終確認トレイでのみ表示 */}
                        {(currentView === 'inbox' || currentView === 'confirmation') && (
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