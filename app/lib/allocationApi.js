// lib/allocationApi.js (新規作成)
const BASE_URL = 'https://viy41bgkvd.execute-api.ap-northeast-1.amazonaws.com'; // ★ あなたのAPI GatewayのURL

export const getOrdersByDate = async (date) => {
  const response = await fetch(`${BASE_URL}/orders-by-date/${date}`);
  if (!response.ok) {
    throw new Error('指定された日付の注文取得に失敗しました。');
  }
  return await response.json();
};

// ★ この関数を追加
export const updateAllocations = async (date, assignments) => {
  const response = await fetch(`${BASE_URL}/orders-by-date/${date}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assignments),
  });
  if (!response.ok) {
    throw new Error('割り当ての更新に失敗しました。');
  }
  return await response.json();
};