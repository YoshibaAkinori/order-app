const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * 汎用的なAPIリクエスト関数
 * @param {string} endpoint - APIのエンドポイント (例: 'orders/search')
 * @param {object} options - fetchに渡すオプション
 * @param {string} responseType - 期待するレスポンスの形式 ('json' or 'blob')
 * @returns {Promise<any>} APIからのレスポンス
 */
const request = async (endpoint, options = {}, responseType = 'json') => {
    const url = `${BASE_URL}/${endpoint}`;

    const config = {
        method: options.method || 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    };

    // bodyが存在する場合は自動でJSON文字列に変換
    if (config.body) {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'APIからのエラー応答がJSON形式ではありません。' }));
            throw new Error(errorData.message || 'APIリクエストに失敗しました。');
        }

        // 期待するレスポンスの形式に応じて処理を分岐
        if (responseType === 'blob') {
            return response.blob();
        }
        // デフォルトはJSON
        return response.json();

    } catch (error) {
        console.error('API Request Error:', error);
        throw error; // エラーを再スローして呼び出し元でキャッチできるようにする
    }
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