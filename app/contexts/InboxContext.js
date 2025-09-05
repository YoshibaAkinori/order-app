"use client";
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { getEmailThreads } from '../lib/inboxApi';

const InboxContext = createContext();

export const useInbox = () => useContext(InboxContext);

export const InboxProvider = ({ children }) => {
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const threads = await getEmailThreads();
            const count = threads.filter(t => !t.isRead).length;
            setUnreadCount(count);
        } catch (err) {
            console.error("Failed to fetch unread count:", err);
        }
    }, []);

    // 5分ごとに未読件数をチェックする
    useEffect(() => {
        fetchUnreadCount(); // 初回読み込み
        const interval = setInterval(fetchUnreadCount, 5 * 60 * 1000); // 5分
        return () => clearInterval(interval);
    }, [fetchUnreadCount]);

    const value = { unreadCount, fetchUnreadCount };

    return (
        <InboxContext.Provider value={value}>
            {children}
        </InboxContext.Provider>
    );
};