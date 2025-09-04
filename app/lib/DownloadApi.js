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
      const errorData = await response.json().catch(() => ({ 
        message: 'APIからのエラー応答がJSON形式ではありません。' 
      }));
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
    throw error;
  }
};

/**
 * ファイルを自動ダウンロードする（ブラウザのダウンロード機能を使用）
 * @param {Blob} blob - ダウンロードするファイルのBlob
 * @param {string} filename - ダウンロード時のファイル名
 */
export const downloadFile = (blob, filename) => {
  try {
    // Blobから一時的なURLを作成
    const url = window.URL.createObjectURL(blob);
    
    // 一時的なリンク要素を作成してクリックを実行
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none'; // リンクを非表示にする
    
    // DOM に追加してクリック、その後削除
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // メモリリークを防ぐためにURLを解放
    window.URL.revokeObjectURL(url);
    
    console.log(`ファイル "${filename}" のダウンロードを開始しました`);
  } catch (error) {
    console.error('Download File Error:', error);
    throw new Error(`ファイルのダウンロードに失敗しました: ${error.message}`);
  }
};

/**
 * URLからファイルをダウンロードしてBlobとして取得する
 * @param {string} downloadUrl - ダウンロードURL
 * @returns {Promise<Blob>} ファイルのBlobオブジェクト
 */
const fetchFileFromUrl = async (downloadUrl) => {
  try {
    const response = await fetch(downloadUrl);
    
    if (!response.ok) {
      throw new Error(`ファイルの取得に失敗しました: ${response.statusText}`);
    }
    
    return response.blob();
  } catch (error) {
    console.error('File Fetch Error:', error);
    throw error;
  }
};

// --- API関数 ---

/**
 * 宛名Excelファイルをエクスポートして自動ダウンロードする
 * @param {Array<object>} receipts - エクスポートする領収書データの配列
 * @param {string} warihuri - 選択された割り振り名
 * @param {string} year - 選択された年
 * @returns {Promise<{filename: string, fileSize: number}>} ファイル情報
 */
export const exportAtenaExcel = async (receipts, warihuri, year) => {
  try {
    console.log('Excelエクスポートを開始...');
    
    // APIを呼び出してレスポンスを取得
    const response = await request('/upload/export-atena-excel', {
      method: 'POST',
      body: {
        receipts,
        warihuri,
        year
      },
    }, 'json');

    let blob, filename, fileSize;

    // レスポンスの形式に応じて処理を分岐
    if (response.downloadUrl) {
      // S3経由の場合：ダウンロードURLからファイルを取得
      console.log('S3からファイルを取得中...');
      blob = await fetchFileFromUrl(response.downloadUrl);
      filename = response.filename;
      fileSize = response.fileSize;
      
    } else if (response.body && response.isBase64Encoded) {
      // 従来の形式：base64エンコードされたファイル
      console.log('Base64データをBlobに変換中...');
      const binaryString = atob(response.body);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      // ファイル名を生成
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      filename = `atena_list_${warihuri}_${today}.xlsx`;
      fileSize = blob.size;
      
    } else {
      throw new Error('APIレスポンスが期待される形式ではありません');
    }

    // ファイルを自動ダウンロード
    console.log(`ファイルサイズ: ${fileSize} bytes`);
    downloadFile(blob, filename);

    return {
      filename,
      fileSize
    };

  } catch (error) {
    console.error('Excel Export Error:', error);
    throw new Error(`Excelファイルのエクスポートに失敗しました: ${error.message}`);
  }
};

/**
 * 一覧Excelファイルをエクスポートして自動ダウンロードする
 * @param {Array<object>} orders - エクスポートする注文データの配列
 * @param {string[]} routes - 選択された配達ルート名の配列
 * @param {string} year - 選択された年
 * @param {string} date - 選択された日付 (例: '2024/12/31')
 * @returns {Promise<{filename: string, fileSize: number}>} ファイル情報
 */
export const exportIchiranExcel = async (orders, routes, year, date) => { // ★ date を引数に追加
  try {
    console.log('一覧Excelエクスポートを開始...');
    
    // APIを呼び出してレスポンスを取得
    const response = await request('/upload/export-ichiran-excel', {
      method: 'POST',
      body: {
        orders,
        routes,
        year,
        date
      },
    }, 'json');

    // S3経由でのダウンロード処理は exportAtenaExcel と共通
    if (response.downloadUrl) {
      console.log('S3からファイルを取得中...');
      const blob = await fetchFileFromUrl(response.downloadUrl);
      const filename = response.filename;
      const fileSize = response.fileSize;
      
      console.log(`ファイルサイズ: ${fileSize} bytes`);
      downloadFile(blob, filename);

      return { filename, fileSize };
    } else {
      throw new Error('APIレスポンスが期待される形式ではありません');
    }

  } catch (error) {
    console.error('一覧Excelエクスポートエラー:', error);
    throw new Error(`一覧Excelファイルのエクスポートに失敗しました: ${error.message}`);
  }
};