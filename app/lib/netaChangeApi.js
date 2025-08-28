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

/**
 * 指定された条件でネタ変更のある注文リストを取得する
 * @param {string} date - 日付 (YYYY/MM/DD)
 * @param {string} route - 割り当て名
 * @param {string} year - 年
 * @returns {Promise<Array>} 注文データの配列
 */
export const getNetaChangeOrdersAPI = (date, route, year) => {
    const formattedDate = date.replaceAll('/', '-');
    const params = new URLSearchParams({ date: formattedDate, route, year });
    return request(`neta-changes?${params.toString()}`);
};

/**
 * 特定の注文のネタ変更情報を更新する
 * @param {object} order - 対象の注文オブジェクト
 * @param {object} newNetaChanges - 新しいネタ変更データ
 * @param {string} year - 年
 * @returns {Promise<Object>} 更新結果
 */
export const updateNetaChangesAPI = (order, newNetaChanges, year) => {
    return request(`order-details/${order.receptionNumber}/${order.orderId}`, {
        method: 'PUT',
        body: { 
            netaChanges: newNetaChanges,
            year: year // バックエンドが年を必要とするため追加
        },
    });
};