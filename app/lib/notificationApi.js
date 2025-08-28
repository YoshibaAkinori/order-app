const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const request = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}/${endpoint}`;
    const config = {
        method: options.method || 'GET',
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    };
    if (options.body) {
        config.body = JSON.stringify(options.body);
    }
    const response = await fetch(url, config);
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'APIリクエストに失敗しました。');
    }
    return response.json();
};

export const getNotificationsAPI = () => request('notifications');

// 将来的に「既読にする」機能を実装する場合
// export const markAsReadAPI = (notificationId) => request(`notifications/${notificationId}/read`, { method: 'POST' });