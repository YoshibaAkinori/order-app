const BASE_URL = 'https://viy41bgkvd.execute-api.ap-northeast-1.amazonaws.com';

// ★ 1. 引数に selectedYear を追加
export const searchOrders = async (date, route, selectedYear) => {
  const formattedDate = date.replaceAll('/', '-');
  // ★ 2. URLに year パラメータを追加
  let apiUrl = `${BASE_URL}/orders/search?date=${formattedDate}&year=${selectedYear}`;

  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error('注文データの検索に失敗しました。');
  }
  return await response.json();
};