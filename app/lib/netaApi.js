const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// 新しいネタを作成 (POST /neta-master)
export const createNeta = async (netaData) => {
  const response = await fetch(`${BASE_URL}/neta-master`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(netaData),
  });
  if (!response.ok) throw new Error('ネタの作成に失敗しました。');
  return await response.json();
};

// 既存のネタを更新 (PUT /neta-master/{netaName})
export const updateNeta = async (netaName, netaData) => {
  const response = await fetch(`${BASE_URL}/neta-master/${netaName}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(netaData),
  });
  if (!response.ok) throw new Error('ネタの更新に失敗しました。');
  return await response.json();
};

// ネタを削除 (DELETE /neta-master/{netaName})
export const deleteNeta = async (netaName) => {
  const response = await fetch(`${BASE_URL}/neta-master/${netaName}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('ネタの削除に失敗しました。');
  return await response.json();
};