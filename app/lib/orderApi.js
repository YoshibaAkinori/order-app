const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * 汎用的なAPIリクエスト関数
 * @param {string} endpoint - APIのエンドポイント (例: 'orders/search')
 * @param {object} options - fetchに渡すオプション
 * @param {string} responseType - 期待するレスポンスの形式 ('json' or 'blob')
 * @returns {Promise<any>} APIからのレスポンス
 */
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
  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    // ▼▼▼【ここからが修正箇所】▼▼▼
    // ★ サーバーから409 Conflictが返ってきた場合の特別処理
    if (response.status === 409) {
      const error = new Error(responseData.message || '受付番号が重複しました。');
      error.name = 'ReceptionNumberConflictError'; // ★ カスタムエラー名を設定
      error.newReceptionNumber = responseData.newReceptionNumber; // ★ 新しい番号をエラーオブジェクトに格納
      throw error;
    }
    // ▲▲▲【修正ここまで】▲▲▲

    // 通常のエラー処理
    throw new Error(responseData.message || 'APIリクエストに失敗しました。');
  }

  return responseData;
};

// --- API関数 ---

/**
 * 指定した日付と年で注文を検索する
 * @param {string} date - 日付 (YYYY/MM/DD)
 * @param {string} selectedYear - 年 (YYYY)
 * @returns {Promise<Object>} 検索結果
 */
export const searchOrders = (date, selectedYear) => {
    const formattedDate = date.replaceAll('/', '-');
    return request(`orders/search?date=${formattedDate}&year=${selectedYear}`);
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
        body: orderData, // オブジェクトのまま渡す
    });
};

export const sendBatchConfirmationAPI = async (orders, orderDate, year) => {
    return request('send-batch-confirmation', {
        method: 'POST',
        body: { orders, orderDate, year }, // ★ bodyにyearを追加
    });
};