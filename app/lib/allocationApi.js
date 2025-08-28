const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// ★★★ 共通リクエスト関数を追加（安定性のため） ★★★
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

// ★★★ getOrdersByDate を修正 ★★★
export const getOrdersByDate = async (date, year) => {
  if (!date || !year) throw new Error('日付と年を指定してください。');
  // URLSearchParams を使って安全にパラメータを付与
  const params = new URLSearchParams({ year });
  return request(`orders-by-date/${date}?${params.toString()}`);
};

// ★★★ updateAllocations を修正 ★★★
export const updateAllocations = async (date, assignments, year) => {
  if (!date || !year) throw new Error('日付と年を指定してください。');
  const params = new URLSearchParams({ year });
  return request(`orders-by-date/${date}?${params.toString()}`, {
    method: 'POST',
    body: assignments,
  });
};