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
 * 指定された日付と割り当ての集計データを取得する
 * @param {string} date - 日付 (YYYY-MM-DD)
 * @param {string} route - 割り当て名
 * @param {string} year - 年
 * @returns {Promise<Object>} 集計データ
 */
export const fetchSummaryAPI = (date, route, year) => {
    const formattedDate = date.replaceAll('/', '-');
    const params = new URLSearchParams({ date: formattedDate, route, year });
    return request(`daily-summary?${params.toString()}`);
};