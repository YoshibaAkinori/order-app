const API_BASE_URL = "https://viy41bgkvd.execute-api.ap-northeast-1.amazonaws.com";

// 汎用的なAPIリクエスト関数
const request = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}/${endpoint}`;
    const config = {
        method: options.method || 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
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

    // 成功時、No Content(204)でなければJSONを返す
    if (response.status === 204) {
        return;
    }
    return response.json();
};

// 各APIに対応する関数をエクスポート
export const searchOrderAPI = (receptionNum) => request(`orders/${receptionNum}`);

export const updateOrderAPI = (receptionNum, data) => request(`orders/${receptionNum}`, {
    method: 'PUT',
    body: data,
});

export const cancelAllOrdersAPI = (receptionNum, data) => request(`orders/${receptionNum}/cancel`, {
    method: 'POST',
    body: data,
});

export const cancelSingleOrderAPI = (receptionNum, orderId) => request(`orders/${receptionNum}/${orderId}/cancel`, {
    method: 'POST',
});