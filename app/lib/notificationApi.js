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

export const markNotificationAsReadAPI = async (notificationId) => {
    return request(`notifications/${notificationId}/read`, {
        method: 'PUT',
    });
};

// ★★★ 追加: 通知を削除するAPI ★★★
export const deleteNotificationAPI = async (notificationId) => {
    return request(`notifications/${notificationId}`, {
        method: 'DELETE',
    });
};