const BASE_URL = 'https://viy41bgkvd.execute-api.ap-northeast-1.amazonaws.com'; // ★ あなたのAPI GatewayのURL

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

