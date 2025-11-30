"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Bell, MailWarning, MailCheck, AlertTriangle, X } from 'lucide-react'; // ★ Xを追加
import { getNotificationsAPI, markNotificationAsReadAPI, deleteNotificationAPI } from '../app/lib/notificationApi'; // ★ deleteNotificationAPIを追加
import { useOrderData } from '../app/contexts/OrderDataContext';
import Link from 'next/link';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const { orders, currentDate } = useOrderData();
    const [animate, setAnimate] = useState(false);

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

    useEffect(() => {
        if (orders && orders.length > 0 && currentDate) {
            const unassignedOrders = orders.filter(order => !order.assignedRoute);
            const unassignedCount = unassignedOrders.length;

            if (unassignedCount > 0) {
                const unassignedNotification = {
                    notificationId: 'unassigned-alert',
                    type: 'UNASSIGNED_ORDER',
                    isRead: false,
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
    }, [orders, currentDate]);

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const prevUnreadCountRef = useRef(unreadCount);

    useEffect(() => {
        if (unreadCount > prevUnreadCountRef.current) {
            setAnimate(true);
            const timer = setTimeout(() => setAnimate(false), 600);
            return () => clearTimeout(timer);
        }
        prevUnreadCountRef.current = unreadCount;
    }, [unreadCount]);

    const handleLinkClick = async (notification) => {
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
            }
        }
        setIsOpen(false);
    };

    // ★★★ 追加: 通知を削除する関数 ★★★
    const handleDeleteNotification = async (e, notificationId) => {
        e.stopPropagation(); // 親要素のクリックイベントを防止

        // フロントエンド専用の通知（unassigned-alert）は単に非表示にする
        if (notificationId === 'unassigned-alert') {
            setNotifications(prev => prev.filter(n => n.notificationId !== notificationId));
            return;
        }

        try {
            await deleteNotificationAPI(notificationId);
            setNotifications(prev => prev.filter(n => n.notificationId !== notificationId));
        } catch (error) {
            console.error("Failed to delete notification:", error);
            alert("通知の削除に失敗しました。");
        }
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
                                        {/* ★★★ 追加: 削除ボタン ★★★ */}
                                        <button
                                            className="notification-delete-btn"
                                            onClick={(e) => handleDeleteNotification(e, n.notificationId)}
                                            title="この通知を削除"
                                        >
                                            <X size={16} />
                                        </button>
                                    </li>
                                );
                            })
                        ) : (
                            <li className="notification-item-empty">通知はありません</li>
                        )}
                    </ul>

                    <div className="notification-dropdown-footer">
                        <button
                            className="notification-action-btn"
                            onClick={() => setIsOpen(false)}
                        >
                            閉じる
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;