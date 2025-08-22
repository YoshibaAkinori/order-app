"use client";
import React, { useState } from 'react';
import { useConfiguration } from '../contexts/ConfigurationContext';
import { saveConfiguration } from '../lib/configApi';
import { createNeta, updateNeta, deleteNeta } from '../lib/netaApi';
import ProductForm from '../../components/ProductForm';
import NetaForm from '../../components/NetaForm';
import AllocationForm from '../../components/AllocationForm';
import WariateForm from '../../components/WariateForm';

export default function ProductAdminPage() {
  const { configuration, netaMaster, loading, error, selectedYear, changeYear, fetchConfiguration } = useConfiguration();
  
  // 商品フォーム用のstate
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingType, setEditingType] = useState('products');
  
  // ネタフォーム用のstate
  const [isNetaFormOpen, setIsNetaFormOpen] = useState(false);
  const [editingNeta, setEditingNeta] = useState(null);

  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newRoute, setNewRoute] = useState('');
  const [newWariate, setNewWariate] = useState('');
  const [isWariateFormOpen, setIsWariateFormOpen] = useState(false);
  const [editingWariate, setEditingWariate] = useState(null);

  // 割り当てフォーム用のstateを追加
  const [isAllocationFormOpen, setIsAllocationFormOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState(null);
  
  const [isArchiving, setIsArchiving] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  // --- 商品(products, specialMenus)関連のハンドラ ---
  const handleAddNewProduct = (type) => {
    setEditingProduct(null);
    setEditingType(type);
    setIsProductFormOpen(true);
  };

  const handleEditProduct = (productKey, type) => {
    const productData = configuration[type][productKey];
    setEditingProduct({ ...productData, productKey });
    setEditingType(type);
    setIsProductFormOpen(true);
  };

  const handleDeleteProduct = async (productKey, type) => {
    const menuName = configuration[type][productKey].name;
    if (window.confirm(`本当に「${menuName}」を削除しますか？`)) {
      const newConfig = { ...configuration };
      delete newConfig[type][productKey];
      try {
        await saveConfiguration(selectedYear, newConfig);
        alert('商品を削除しました。');
        fetchConfiguration(selectedYear);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleProductFormSubmit = async (formData) => {
    const newConfig = { 
      ...configuration,
      products: configuration.products || {},
      specialMenus: configuration.specialMenus || {},
    };
    const { productKey, ...productData } = formData;
    newConfig[editingType][productKey] = productData;
    try {
      await saveConfiguration(selectedYear, newConfig);
      alert(`商品「${formData.name}」を保存しました。`);
      setIsProductFormOpen(false);
      fetchConfiguration(selectedYear);
    } catch (err) {
      alert(err.message);
    }
  };

  // --- ネタマスタ(netaMaster)関連のハンドラ ---
  const handleAddNewNeta = () => {
    setEditingNeta(null);
    setIsNetaFormOpen(true);
  };

  const handleEditNeta = (neta) => {
    setEditingNeta(neta);
    setIsNetaFormOpen(true);
  };

  const handleDeleteNeta = async (netaName) => {
    if (window.confirm(`本当に「${netaName}」を削除しますか？`)) {
      try {
        await deleteNeta(netaName);
        alert('ネタを削除しました。');
        fetchConfiguration(selectedYear);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleNetaFormSubmit = async (formData) => {
    try {
      if (editingNeta) {
        await updateNeta(editingNeta.netaName, formData);
      } else {
        await createNeta(formData);
      }
      alert(`ネタ「${formData.netaName}」を保存しました。`);
      setIsNetaFormOpen(false);
      fetchConfiguration(selectedYear);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateConfigList = async (listName, newList) => {
    const newConfig = {
      ...configuration,
      [listName]: newList,
    };
    try {
      await saveConfiguration(selectedYear, newConfig);
      fetchConfiguration(selectedYear); // データを再取得して画面を更新
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddDate = () => {
    if (newDate && !configuration.deliveryDates.includes(newDate)) {
      const newList = [...configuration.deliveryDates, newDate];
      handleUpdateConfigList('deliveryDates', newList);
      setNewDate('');
    }
  };
  const handleDeleteDate = (indexToRemove) => {
    const newList = configuration.deliveryDates.filter((_, index) => index !== indexToRemove);
    handleUpdateConfigList('deliveryDates', newList);
  };

  const handleAddTime = () => {
    if (newTime && !configuration.deliveryTimes.includes(newTime)) {
      const newList = [...configuration.deliveryTimes, newTime];
      handleUpdateConfigList('deliveryTimes', newList);
      setNewTime('');
    }
  };
  const handleDeleteTime = (indexToRemove) => {
    const newList = configuration.deliveryTimes.filter((_, index) => index !== indexToRemove);
    handleUpdateConfigList('deliveryTimes', newList);
  };

  // ★ 3. 割り当てマスタを操作するためのハンドラを追加
  const handleAddNewAllocation = () => {
    // ★ 1. 現在の割り当てキーのリストを取得
    const allocationKeys = Object.keys(configuration?.allocationMaster || {});
    
    // ★ 2. 次に使うべきアルファベットを計算
    let nextPrefix = 'A'; // デフォルトは 'A'
    if (allocationKeys.length > 0) {
      // 最も大きい文字コードを見つけて、それに1を足し、新しい文字を生成
      const maxCharCode = Math.max(...allocationKeys.map(key => key.charCodeAt(0)));
      nextPrefix = String.fromCharCode(maxCharCode + 1);
    }

    // ★ 3. 計算したキーを含む初期データをセットしてフォームを開く
    setEditingAllocation({
      allocationPrefix: nextPrefix,
      address: '',
    });
    setIsAllocationFormOpen(true);
  };
  const handleEditAllocation = (prefix) => {
    const allocationData = configuration.allocationMaster[prefix];
    setEditingAllocation({ allocationPrefix: prefix, ...allocationData });
    setIsAllocationFormOpen(true);
  };
  const handleDeleteAllocation = async (prefix) => {
    if (window.confirm(`本当に割り当て「${prefix}」を削除しますか？`)) {
      const newConfig = { ...configuration };
      delete newConfig.allocationMaster[prefix];
      try {
        await saveConfiguration(selectedYear, newConfig);
        alert('割り当てを削除しました。');
        fetchConfiguration(selectedYear);
      } catch (err) {
        alert(err.message);
      }
    }
  };
  const handleAllocationFormSubmit = async (formData) => {
    const newConfig = {
      ...configuration,
      allocationMaster: configuration.allocationMaster || {}
    };
    const { allocationPrefix, ...allocationData } = formData;
    newConfig.allocationMaster[allocationPrefix] = allocationData;
    try {
      await saveConfiguration(selectedYear, newConfig);
      alert(`割り当て「${allocationPrefix}」を保存しました。`);
      setIsAllocationFormOpen(false);
      fetchConfiguration(selectedYear);
    } catch (err) {
      alert(err.message);
    }
  };


  // --- 年選択関連 ---
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 2; i++) {
      years.push(i);
    }
    return years;
  };
  const yearOptions = generateYearOptions();

  const yearSelector = (
    <div>
      <label htmlFor="year-select">設定年: </label>
      <select
        id="year-select"
        value={selectedYear || ''} // ★ selectedYearがnullの場合、空文字として扱う
        onChange={(e) => changeYear(e.target.value)}
      >
        {/* ★ 1. プレースホルダーの選択肢を追加 */}
        <option value="" disabled>-- 年を選択してください --</option>
        {yearOptions.map(year => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>
    </div>
  );
   const handleAddRoute = () => {
    if (newRoute && !(configuration.deliveryRoutes || []).includes(newRoute)) {
      const newList = [...(configuration.deliveryRoutes || []), newRoute];
      handleUpdateConfigList('deliveryRoutes', newList);
      setNewRoute('');
    }
  };
  const handleDeleteRoute = (indexToRemove) => {
    const newList = (configuration.deliveryRoutes || []).filter((_, index) => index !== indexToRemove);
    handleUpdateConfigList('deliveryRoutes', newList);
  };
  // --- 割り当て(deliveryWariate)関連のハンドラ ---
  const handleAddNewWariate = () => {
    setEditingWariate(null); // 新規作成モード
    setIsWariateFormOpen(true);
  };
  const handleEditWariate = (wariate) => {
    setEditingWariate(wariate); // 編集モード
    setIsWariateFormOpen(true);
  };
  const handleDeleteWariate = (indexToRemove) => {
    if (window.confirm('本当にこの割り当てを削除しますか？')) {
      const newList = (configuration.deliveryWariate || []).filter((_, index) => index !== indexToRemove);
      handleUpdateConfigList('deliveryWariate', newList);
    }
  };
  const handleWariateFormSubmit = async (formData) => {
    const currentWariate = configuration.deliveryWariate || [];
    let newWariateList;
    if (editingWariate) {
      // 編集の場合
      newWariateList = currentWariate.map(w => w.name === editingWariate.name ? formData : w);
    } else {
      // 新規追加の場合
      newWariateList = [...currentWariate, formData];
    }
    await handleUpdateConfigList('deliveryWariate', newWariateList);
    setIsWariateFormOpen(false);
  };
  
  
  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>設定管理</h1>
        {yearSelector}
        <p style={{color: 'red'}}>エラー: {error}</p>
      </div>
    );
  }

  const handleCopyFromPreviousYear = async () => {
    if (!window.confirm(`${selectedYear - 1}年の設定をコピーして、${selectedYear}年の新しい設定を作成します。よろしいですか？`)) {
      return;
    }
    
    setIsCopying(true); // ★ 2. コピー開始
    try {
      const response = await fetch(`https://viy41bgkvd.execute-api.ap-northeast-1.amazonaws.com/configurations/${selectedYear}/copy-from-previous`, {
        method: 'POST',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'コピーに失敗しました。');
      }
      alert(result.message);
      fetchConfiguration(selectedYear);
    } catch (err) {
      alert(`エラー: ${err.message}`);
    } finally {
      setIsCopying(false); // ★ 3. コピー終了
    }
  };

  const handleArchiveOrders = async () => {
    const yearToArchive = selectedYear - 1;
    const confirmation = prompt(
      `【警告】これは危険な操作です！\n\n現在の全ての注文データを「${yearToArchive}年分」として永久保存し、現在の注文テーブルを完全に空にします。この操作は元に戻せません。\n\n本当に実行する場合は、下のボックスに「${yearToArchive}」と入力してください。`
    );

    if (confirmation !== String(yearToArchive)) {
      alert('入力が一致しなかったため、処理をキャンセルしました。');
      return;
    }

    setIsArchiving(true);
    try {
      const response = await fetch(`https://viy41bgkvd.execute-api.ap-northeast-1.amazonaws.com/archive-orders`, {
        method: 'POST',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      
      alert(`年度締め処理が完了しました: ${result.message}`);
      fetchConfiguration(selectedYear); // 画面を更新
    } catch (err) {
      alert(`エラー: ${err.message}`);
    } finally {
      setIsArchiving(false);
    }
  };
  
  const isNewConfiguration = configuration && !configuration.configYear;
  const products = configuration?.products || {};
  const specialMenus = configuration?.specialMenus || {};
  const allocationMaster = configuration?.allocationMaster || {};

  return (
    <div style={{ padding: '2rem' }}>
      <h1 className="admin-header">設定管理</h1>

      {isProductFormOpen && (
        <ProductForm
          initialData={editingProduct}
          onSubmit={handleProductFormSubmit}
          onCancel={() => setIsProductFormOpen(false)}
          editingType={editingType}
        />
      )}
      {isNetaFormOpen && (
        <NetaForm
          initialData={editingNeta}
          onSubmit={handleNetaFormSubmit}
          onCancel={() => setIsNetaFormOpen(false)}
          netaMaster={netaMaster}
        />
      )}
      {isAllocationFormOpen && (
        <AllocationForm
          initialData={editingAllocation}
          onSubmit={handleAllocationFormSubmit}
          onCancel={() => setIsAllocationFormOpen(false)}
        />
      )}
      {isWariateFormOpen && (
        <WariateForm
          initialData={editingWariate}
          onSubmit={handleWariateFormSubmit}
          onCancel={() => setIsWariateFormOpen(false)}
        />
      )}

      <div className="admin-controls-container">
        {yearSelector}
      </div>
      
      {selectedYear ? (
        <>
          {/* 年が選択されているが、まだデータ取得中の場合 */}
          {loading && <p>データを再読み込みしています...</p>}
          
          {/* エラーが発生した場合 */}
          {error && <p style={{color: 'red'}}>エラー: {error}</p>}

          {/* データ取得が完了した場合 */}
          {configuration && (
            <>
              {isNewConfiguration && (
                <div className="new-year-setup-box">
                  <h2>{selectedYear}年の新規設定を開始</h2>
                  <p>まずステップ1で前年の注文データを安全に保管し、次にステップ2で前年の商品設定をコピーして新しい年を開始します。</p>

                  <div className="setup-step">
                    <h3>ステップ1：前年 ({selectedYear - 1}年) の注文をアーカイブする</h3>
                    <p>現在の全ての注文データを「{selectedYear - 1}年分」として永久保存し、現在の注文テーブルを空にします。この操作は年に一度だけ行ってください。</p>
                    <button onClick={handleArchiveOrders} disabled={isArchiving} className="delete-button">
                      {isArchiving ? '処理中...' : `アーカイブを実行`}
                    </button>
                  </div>

                  <div className="setup-step">
                    <h3>ステップ2：前年 ({selectedYear - 1}年) の設定をコピーする</h3>
                    <p>商品マスタ、配達日、時間帯などの設定を {selectedYear - 1}年から引き継いで、{selectedYear}年の設定を新規作成します。</p>
                    <button onClick={handleCopyFromPreviousYear} disabled={isCopying} className="copy-button">
                      {isCopying ? 'コピー中...' : '設定をコピー'}
                    </button>
                  </div>
                </div>
              )}
              
              <div className="admin-Date-section">
                <div className="admin-Date-container">
                  <h2>配達可能日の管理</h2>
                </div>
                <div className="list-edit-form">
                  <input type="text" value={newDate} onChange={(e) => setNewDate(e.target.value)}placeholder="例: YYYY/MM/DD"/>
                  <button onClick={handleAddDate}>追加</button>
                </div>
                <ul className="item-list">
                  {(configuration?.deliveryDates || []).map((date, index) => (
                    <li key={index}>
                      {date}
                      <button onClick={() => handleDeleteDate(index)}>×</button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* === 配達時間帯の管理セクション === */}
              <div className="admin-Date-section">
                <div className="admin-Date-container">
                  <h2>配達時間帯の管理</h2>
                 </div>
                <div className="list-edit-form">
                  <input type="text" value={newTime} onChange={(e) => setNewTime(e.target.value)} placeholder="例: 11時半まで" />
                  <button onClick={handleAddTime}>追加</button>
                </div>
                <ul className="item-list">
                  {(configuration?.deliveryTimes || []).map((time, index) => (
                    <li key={index}>
                      {time}
                    <button onClick={() => handleDeleteTime(index)}>×</button>
                    </li>
                  ))}
                </ul>
              </div>
      
              {/* === 通常メニューセクション === */}
              <div className="admin-menu-section">
                <div className="admin-controls-container">
                  <h2>通常メニュー</h2>
                  <button onClick={() => handleAddNewProduct('products')}>+ 通常メニューを追加</button>
                </div>
                  <table>
                    <thead>
                      <tr>
                        <th>商品名</th>
                        <th>商品ID</th>
                        <th>価格</th>
                        <th>ネタ合計数</th>
                        <th>ネタ内容</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(products).sort((a, b) => Number(a) - Number(b)).map(key => {
                        // ★ 2. 各商品のネタ合計数を計算
                        const totalNetaCount = (products[key].neta || []).reduce((sum, item) => sum + item.quantity, 0);

                        return (
                          <tr key={key}>
                            <td>{products[key].name}</td>
                            <td>{key}</td>
                            <td>¥{products[key].price.toLocaleString()}</td>
                            <td>{totalNetaCount}貫</td>
                            <td>
                             {(products[key].neta || [])
                              .map(netaItem => `${netaItem.name} × ${netaItem.quantity}`)
                              .join(', ')}
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button onClick={() => handleEditProduct(key, 'products')} className="edit-button">編集</button>
                                <button onClick={() => handleDeleteProduct(key, 'products')} className="delete-button">削除</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              {/* === 特殊メニューセクション === */}
              <div className="admin-menu-section">
                <div className="admin-controls-container">
                  <h2>特殊メニュー</h2>
                  <button onClick={() => handleAddNewProduct('specialMenus')}>+ 特殊メニューを追加</button>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>商品名</th>
                      <th>商品ID</th>
                      <th>価格</th>
                      <th>ネタ合計数</th>
                      <th>ネタ内容</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(specialMenus).sort((a, b) => Number(a) - Number(b)).map(key => {
                  // ★ 2. 各商品のネタ合計数を計算
                      const totalNetaCount = (specialMenus[key].neta || []).reduce((sum, item) => sum + item.quantity, 0);

                      return (
                        <tr key={key}>
                          <td>{specialMenus[key].name}</td>
                          <td>{key}</td>
                          <td>¥{specialMenus[key].price.toLocaleString()}</td>
                          <td>{totalNetaCount}貫</td>
                          <td>
                            {(specialMenus[key].neta || [])
                            .map(netaItem => `${netaItem.name} × ${netaItem.quantity}`)
                            .join(', ')}
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button onClick={() => handleEditProduct(key, 'specialMenus')} className="edit-button">編集</button>
                              <button onClick={() => handleDeleteProduct(key, 'specialMenus')} className="delete-button">削除</button>
                            </div>
                          </td>
                          
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* === 割当セクション === */}
              <div className="admin-Date-section">
                <div className="admin-controls-container">
                  <h2>割り振り担当の管理</h2>
                </div>
                <div className="list-edit-form">
                  <input type="text" value={newRoute} onChange={(e) => setNewRoute(e.target.value)} placeholder="例: 県庁担当" />
                  <button onClick={handleAddRoute}>追加</button>
                </div>
                <ul className="item-list">
                  {(configuration?.deliveryRoutes || []).map((route, index) => (
                    <li key={index}>
                      {route}
                      <button onClick={() => handleDeleteRoute(index)}>×</button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="admin-menu-section">
            <div className="admin-controls-container">
              <h2>割り当ての管理</h2>
              <button onClick={handleAddNewWariate}>+ 新しい割り当てを追加</button>
            </div>
            <table className='mastatable'>
              <thead>
                <tr>
                  <th>割り当て名</th>
                  <th>担当する割り振り</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {(configuration?.deliveryWariate || []).map((wariate, index) => (
                  <tr key={index}>
                    <td>{wariate.name}</td>
                    <td>{(wariate.responsibleRoutes || []).join(', ')}</td>
                    <td>
                      <div className="action-buttons">
                        <button onClick={() => handleEditWariate(wariate)} className="edit-button">編集</button>
                        <button onClick={() => handleDeleteWariate(index)} className="delete-button">削除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
              <div className="admin-menu-section">
                <div className="admin-controls-container">
                  <h2>割り当てアルファベット</h2>
                  <button onClick={handleAddNewAllocation}>+ 新しい割り当てを追加</button>
                </div>
                <table className='mastatable'>
                  <thead>
                    <tr>
                      <th>記号</th>
                      <th>住所</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                <tbody>
                  {Object.keys(allocationMaster).map(prefix => (
                    <tr key={prefix}>
                      <td>{prefix}</td>
                      <td>{allocationMaster[prefix].address}</td>
                      <td>
                        <button onClick={() => handleEditAllocation(prefix)} className="edit-button">編集</button>
                        <button onClick={() => handleDeleteAllocation(prefix)} style={{ marginLeft: '0.5rem' }} className="delete-button">削除</button>
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>

              {/* === 大元ネタマスタ管理セクション === */}
              <div className="admin-menu-section">
                <div className="admin-controls-container">
                  <h2>ネタ種類</h2>
                  <button onClick={handleAddNewNeta}>+ 新しいネタを追加</button>
                </div>
                <table className='mastatable'>
                  <thead>
                    <tr>
                      <th>ネタ名</th>
                      <th>カテゴリ</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(netaMaster || []).map(neta => (
                      <tr key={neta.netaName}>
                        <td>{neta.netaName}</td>
                        <td>{neta.category}</td>
                        <td>
                          <button onClick={() => handleEditNeta(neta)} className="edit-button">編集</button>
                          <button onClick={() => handleDeleteNeta(neta.netaName)} style={{ marginLeft: '0.5rem' }} className="delete-button">削除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      ) : (
        // ★ 3. 年が選択されていない場合のメッセージ
        <p style={{ marginTop: '1rem', fontWeight: 'bold' }}>
          操作したい設定年を選択してください。
        </p>
      )}
    </div>
  );
}