const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * 汎用的なAPIリクエスト関数
 * (他のAPIファイルに存在する場合、この部分は不要です)
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
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'APIリクエストに失敗しました。');
  }
  return response.json();
};


/**
 * 指定された年の設定を更新または新規作成する
 * @param {string} year - 設定年 (例: "2025")
 * @param {object} configData - 保存する完全な設定オブジェクト
 */
export const saveConfiguration = async (year, configData) => {
  const response = await fetch(`${BASE_URL}/configurations/${year}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(configData),
  });

  if (!response.ok) {
    throw new Error('設定の保存に失敗しました。');
  }

  return await response.json();
};

/**
 * 前年の設定をコピーして、指定した年の新しい設定を作成する
 * @param {string} year - 新しく作成する設定の年
 * @returns {Promise<Object>} APIからの成功メッセージ
 */
export const copyPreviousYearConfigAPI = (year) => {
    if (!year) {
        return Promise.reject(new Error("年が指定されていません。"));
    }
    // ★ 修正点: yearをURLから削除し、リクエストのボディに含める
    return request(`configurations/copy-from-previous`, {
        method: 'POST',
        body: { year: year }
    });
};