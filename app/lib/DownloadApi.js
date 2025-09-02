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
 * 宛名Excelファイルをエクスポートする
 * @param {Array<object>} receipts - エクスポートする領収書データの配列
 * @returns {Promise<Blob>} ExcelファイルのBlobオブジェクト
 */
export const exportAtenaExcel = (receipts) => {
    return request('export-atena-excel', {
        method: 'POST',
        body: { receipts }, // オブジェクトのまま渡す
    }, 'blob'); // ★ レスポンスタイプとして'blob'を指定
};

// ★ updateOrderAPI や cancelAllOrdersAPI も同様に追加できます
export const updateOrderAPI = (receptionNumber, orderData) => {
    return request(`orders/${receptionNumber}`, {
        method: 'PUT',
        body: orderData,
    });
};