"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Bell, MailWarning, MailCheck, AlertTriangle } from 'lucide-react'; // ★ AlertTriangleを追加
import { getNotificationsAPI, markNotificationAsReadAPI } from '../app/lib/notificationApi';
import { useOrderData } from '../app/contexts/OrderDataContext'; // ★ Contextをインポート
import Link from 'next/link';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const { orders, currentDate } = useOrderData(); // ★ ordersとcurrentDateを取得
    const [animate, setAnimate] = useState(false);
    

    // メール通知などをAPIから取得するuseEffect（変更なし）
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const data = await getNotificationsAPI();
                setNotifications(data);
            } catch (error) {
                console.error("Failed to fetch notifications:", error);
            }
        };

        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // 共有された注文データを監視し、未割り当てをチェックする
    useEffect(() => {
        if (orders && orders.length > 0 && currentDate) {
            const unassignedOrders = orders.filter(order => !order.assignedRoute);
            const unassignedCount = unassignedOrders.length;

            if (unassignedCount > 0) {
                const unassignedNotification = {
                    notificationId: 'unassigned-alert',
                    type: 'UNASSIGNED_ORDER',
                    isRead: false,
                    // ★ ご要望のメッセージ形式に変更
                    subject: `${currentDate} の注文`,
                    message: `未割り当ての注文が${unassignedCount}件あります。`,
                };
                setNotifications(prev => {
                    const otherNotifications = prev.filter(n => n.notificationId !== 'unassigned-alert');
                    return [unassignedNotification, ...otherNotifications];
                });
            } else {
                setNotifications(prev => prev.filter(n => n.notificationId !== 'unassigned-alert'));
            }
        } else {
            setNotifications(prev => prev.filter(n => n.notificationId !== 'unassigned-alert'));
        }
    }, [orders, currentDate]); // ★ ordersとcurrentDateを監視

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const prevUnreadCountRef = useRef(unreadCount); 
    
    useEffect(() => {
      // 前回の件数より、現在の件数が増えた場合のみ
      if (unreadCount > prevUnreadCountRef.current) {
        setAnimate(true); // アニメーションを開始
        // アニメーションが終わるタイミングで、アニメーションクラスを削除
        const timer = setTimeout(() => setAnimate(false), 600); // 0.6秒後に実行
        return () => clearTimeout(timer);
      }
      // 現在の件数を「前回分」として記憶する
      prevUnreadCountRef.current = unreadCount;
    }, [unreadCount]); // unreadCountが変わるたびに実行

    const handleLinkClick = async (notification) => {
        // もし未読なら、既読にするAPIを呼び出し、フロントの状態も更新
        if (!notification.isRead) {
            try {
                await markNotificationAsReadAPI(notification.notificationId);
                setNotifications(prev =>
                    prev.map(n =>
                        n.notificationId === notification.notificationId ? { ...n, isRead: true } : n
                    )
                );
            } catch (error) {
                console.error("Failed to mark notification as read:", error);
                // エラーが起きてもナビゲーションは妨げない
            }
        }
        // ドロップダウンを閉じる
        setIsOpen(false);
    };

    return (
        <div className="notification-bell-container">
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className={`notification-bell-button ${animate ? 'shake' : ''}`}
            >
              <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                )}
            </button>
            {isOpen && (
            <div className="notification-dropdown">
                <div className="notification-dropdown-header">通知</div>
                <ul className="notification-list">
                    {notifications.length > 0 ? (
                        notifications.map(n => {
                            // ★★★【ここを修正】★★★
                            // subjectから解析するのではなく、n.receptionNumberを直接使う
                            const receptionNumber = n.receptionNumber; 
                            const orderLink = receptionNumber ? `/change?receptionNumber=${receptionNumber}` : '/change';

                            return (
                                <li key={n.notificationId} className={`notification-item ${n.isRead ? 'read' : ''}`}>
                                    <div className="notification-icon">
                                        {n.type === 'BOUNCE' ? <MailWarning color="red" size={20} /> :
                                         n.type === 'UNASSIGNED_ORDER' ? <AlertTriangle color="#f97316" size={20} /> :
                                         <MailCheck color="green" size={20} />}
                                    </div>
                                    <div className="notification-content">
                                        <p className="notification-subject">{n.subject}</p>
                                        <p className="notification-message">{n.message}</p>
                                        
                                        {n.type === 'UNASSIGNED_ORDER' ? (
                                            <Link 
                                              href={`/allocations?date=${currentDate.replaceAll('/', '-')}`} 
                                              onClick={() => handleLinkClick(n)}
                                              className="notification-link"
                                            >
                                                割り当てを確認 →
                                            </Link>
                                        ) : (
                                            <Link 
                                              href={orderLink}
                                              onClick={() => handleLinkClick(n)}
                                              className="notification-link"
                                            >
                                                注文を確認 →
                                            </Link>
                                        )}
                                    </div>
                                </li>
                            )
                        })
                    ) : (
                        <li className="notification-item-empty">通知はありません</li>
                    )}
                </ul>
                
                {/* ★↓ここからが追加箇所↓★ */}
                <div className="notification-dropdown-footer">
                    <button 
                      className="notification-action-btn"
                      onClick={() => setIsOpen(false)}
                    >
                        閉じる
                    </button>
                </div>
                {/* ★↑ここまでが追加箇所↑★ */}
            </div>
        )}
    </div>
    );
};

export default NotificationBell;