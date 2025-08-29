import React, { useState, useEffect } from 'react';
import { Bell, MailWarning, MailCheck } from 'lucide-react';
import { getNotificationsAPI } from '../app/lib/notificationApi';
import Link from 'next/link';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);

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
        // 1時間 (60分 * 60秒 * 1000ミリ秒) ごとに通知を自動更新
        const interval = setInterval(fetchNotifications, 60 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="notification-bell-container">
            <button onClick={() => setIsOpen(!isOpen)} className="notification-bell-button">
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-dropdown-header">
                        通知
                    </div>
                    <ul className="notification-list">
                        {notifications.length > 0 ? (
                            notifications.map(n => (
                                <li key={n.notificationId} className={`notification-item ${n.isRead ? 'read' : ''}`}>
                                    <div className="notification-icon">
                                        {n.type === 'BOUNCE' ? <MailWarning color="red" size={20} /> : <MailCheck color="green" size={20} />}
                                    </div>
                                    <div className="notification-content">
                                        <p className="notification-subject">{n.subject}</p>
                                        <p className="notification-message">{n.message}</p>
                                        <Link href={`/change`}>
                                            <a onClick={() => {
                                                // 注文変更ページに遷移し、受付番号を検索ボックスに自動入力する（将来的な拡張）
                                                setIsOpen(false);
                                            }}>
                                                注文を確認 →
                                            </a>
                                        </Link>
                                    </div>
                                </li>
                            ))
                        ) : (
                            <li className="notification-item-empty">通知はありません</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;