const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const request = async (endpoint, options = {}) => {
    const url = `${BASE_URL}/${endpoint}`;
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

// ★ 1. 引数に selectedYear を追加
export const searchOrders = async (date, selectedYear) => {
  const formattedDate = date.replaceAll('/', '-');
  // ★ 2. URLに year パラメータを追加
  let apiUrl = `${BASE_URL}/orders/search?date=${formattedDate}&year=${selectedYear}`;

  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error('注文データの検索に失敗しました。');
  }
  return await response.json();
};

/**
 * 新しい受付番号をサーバーから取得する
 * @param {string} allocation - 割り当て記号 (例: 'A')
 * @param {string} floor - 階数
 * @param {string} year - 年
 * @returns {Promise<Object>} 受付番号を含むオブジェクト
 */
export const generateReceptionNumberAPI = (allocation, floor, year) => {
    const params = new URLSearchParams({ allocation, floor, year });
    return request(`reception-number?${params.toString()}`);
};

/**
 * 新しい注文データをサーバーに保存する
 * @param {object} orderData - 送信する注文データ全体
 * @returns {Promise<Object>} APIからの成功メッセージ
 */
export const saveOrderAPI = (orderData) => {
    return request('orders', {
        method: 'POST',
        body: orderData,
    });
};