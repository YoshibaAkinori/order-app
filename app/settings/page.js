"use client";
import React, { useState } from 'react';
import { useConfiguration } from '../contexts/ConfigurationContext';
import { saveConfiguration, copyPreviousYearConfigAPI } from '../lib/configApi';
import { createNeta, updateNeta, deleteNeta } from '../lib/netaApi';
import ProductForm from '../../components/ProductForm';
import NetaForm from '../../components/NetaForm';
import AllocationForm from '../../components/AllocationForm';
import WariateForm from '../../components/WariateForm';
// ★ 新しいコンポーネントをインポート
import DeliveryDatesModal from '../../components/DeliveryDatesModal';
import DeliveryTimesModal from '../../components/DeliveryTimesModal';
import DeliveryRoutesModal from '../../components/DeliveryRoutesModal';


export default function ProductAdminPage() {
  const { configuration, netaMaster, loading, error, selectedYear, fetchConfiguration } = useConfiguration();
  
  const [openModal, setOpenModal] = useState(null);

  // 各フォーム用のState（変更なし）
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingType, setEditingType] = useState('products');
  const [isNetaFormOpen, setIsNetaFormOpen] = useState(false);
  const [editingNeta, setEditingNeta] = useState(null);
  const [isAllocationFormOpen, setIsAllocationFormOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState(null);
  const [isWariateFormOpen, setIsWariateFormOpen] = useState(false);
  const [editingWariate, setEditingWariate] = useState(null);
  
  // ★ newDate, newTime, newRoute のstateは不要になったので削除
  
  const [isCopying, setIsCopying] = useState(false);

  // --- (ここから handleUpdateConfigList まで変更なし) ---
  const handleAddNewProduct = (type) => { setIsProductFormOpen(true); setEditingProduct(null); setEditingType(type); };
  const handleEditProduct = (productKey, type) => { setIsProductFormOpen(true); setEditingProduct({ ...configuration[type][productKey], productKey }); setEditingType(type); };
  const handleDeleteProduct = async (productKey, type) => {
    if (window.confirm(`本当に「${configuration[type][productKey].name}」を削除しますか？`)) {
      const newConfig = { ...configuration };
      delete newConfig[type][productKey];
      await saveConfiguration(selectedYear, newConfig).then(() => fetchConfiguration(selectedYear)).catch(alert);
    }
  };
  const handleProductFormSubmit = async (formData) => {
    const newConfig = { ...configuration, products: configuration.products || {}, specialMenus: configuration.specialMenus || {} };
    const { productKey, ...productData } = formData;
    newConfig[editingType][productKey] = productData;
    await saveConfiguration(selectedYear, newConfig).then(() => {
      alert(`商品を保存しました。`);
      setIsProductFormOpen(false);
      fetchConfiguration(selectedYear);
    }).catch(alert);
  };
  const handleAddNewNeta = () => { setIsNetaFormOpen(true); setEditingNeta(null); };
  const handleEditNeta = (neta) => { setIsNetaFormOpen(true); setEditingNeta(neta); };
  const handleDeleteNeta = async (netaName) => {
    if (window.confirm(`本当に「${netaName}」を削除しますか？`)) {
      await deleteNeta(netaName).then(() => fetchConfiguration(selectedYear)).catch(alert);
    }
  };
  const handleNetaFormSubmit = async (formData) => {
    const promise = editingNeta ? updateNeta(editingNeta.netaName, formData) : createNeta(formData);
    await promise.then(() => {
      alert(`ネタを保存しました。`);
      setIsNetaFormOpen(false);
      fetchConfiguration(selectedYear);
    }).catch(alert);
  };
  
  // ★ handleUpdateConfigList は各モーダルから呼び出されるように変更
  const handleUpdateConfigList = async (listName, newList) => {
    await saveConfiguration(selectedYear, { ...configuration, [listName]: newList })
      .then(() => fetchConfiguration(selectedYear))
      .catch(alert);
  };

  // ★ handleAddDate, handleDeleteDate などは各コンポーネント内に移動したため削除

  const handleAddNewAllocation = () => {
    const keys = Object.keys(configuration?.allocationMaster || {});
    const nextPrefix = keys.length > 0 ? String.fromCharCode(Math.max(...keys.map(k => k.charCodeAt(0))) + 1) : 'A';
    setEditingAllocation({ allocationPrefix: nextPrefix, address: '' });
    setIsAllocationFormOpen(true);
  };
  const handleEditAllocation = (prefix) => { setEditingAllocation({ allocationPrefix: prefix, ...configuration.allocationMaster[prefix] }); setIsAllocationFormOpen(true); };
  const handleDeleteAllocation = async (prefix) => {
    if (window.confirm(`本当に割り当て「${prefix}」を削除しますか？`)) {
      const newConfig = { ...configuration };
      delete newConfig.allocationMaster[prefix];
      await saveConfiguration(selectedYear, newConfig).then(() => fetchConfiguration(selectedYear)).catch(alert);
    }
  };
  const handleAllocationFormSubmit = async (formData) => {
    const newConfig = { ...configuration, allocationMaster: configuration.allocationMaster || {} };
    const { allocationPrefix, ...data } = formData;
    newConfig.allocationMaster[allocationPrefix] = data;
    await saveConfiguration(selectedYear, newConfig).then(() => {
      alert(`割り当てを保存しました。`);
      setIsAllocationFormOpen(false);
      fetchConfiguration(selectedYear);
    }).catch(alert);
  };
  
  // ★ handleAddRoute, handleDeleteRoute は DeliveryRoutesModal に移動したため削除
  
  const handleAddNewWariate = () => { setIsWariateFormOpen(true); setEditingWariate(null); };
  const handleEditWariate = (wariate) => { setIsWariateFormOpen(true); setEditingWariate(wariate); };
  const handleDeleteWariate = (index) => {
    if (window.confirm('本当にこの割り当てを削除しますか？')) {
      handleUpdateConfigList('deliveryWariate', (configuration.deliveryWariate || []).filter((_, i) => i !== index));
    }
  };
  const handleWariateFormSubmit = async (formData) => {
    const current = configuration.deliveryWariate || [];
    const newList = editingWariate ? current.map(w => w.name === editingWariate.name ? formData : w) : [...current, formData];
    await handleUpdateConfigList('deliveryWariate', newList);
    setIsWariateFormOpen(false);
  };

  const handleCopyFromPreviousYear = async () => {
    const message = `${selectedYear - 1}年の設定をコピーして、${selectedYear}年の新しい設定を作成します。`;
    if (!window.confirm(message)) return;
    
    setIsCopying(true);
    try {
      const result = await copyPreviousYearConfigAPI(selectedYear);
      alert(result.message);
      fetchConfiguration(selectedYear);
    } catch (err) {
      alert(`エラー: ${err.message}`);
    } finally {
      setIsCopying(false);
    }
  };
  
  const isNewConfiguration = configuration && !configuration.configYear;
  const products = configuration?.products || {};
  const specialMenus = configuration?.specialMenus || {};
  const allocationMaster = configuration?.allocationMaster || {};

  const ModalContent = () => {
    switch (openModal) {
      // ★★★ ここからが修正箇所 ★★★
      case 'deliveryDates':
        return (
          <DeliveryDatesModal
            deliveryDates={configuration?.deliveryDates}
            onUpdate={(newList) => handleUpdateConfigList('deliveryDates', newList)}
          />
        );
      case 'deliveryTimes':
        return (
          <DeliveryTimesModal
            deliveryTimes={configuration?.deliveryTimes}
            onUpdate={(newList) => handleUpdateConfigList('deliveryTimes', newList)}
          />
        );
      case 'deliveryRoutes':
          return (
            <DeliveryRoutesModal
              deliveryRoutes={configuration?.deliveryRoutes}
              onUpdate={(newList) => handleUpdateConfigList('deliveryRoutes', newList)}
            />
          );
      // ★★★ ここまでが修正箇所 ★★★
      case 'products':
        return (
          <>
            <div className="admin-controls-container" style={{marginBottom: '1rem'}}>
              <h2>通常メニュー</h2>
              <button onClick={() => handleAddNewProduct('products')}>+ 通常メニューを追加</button>
            </div>
            <table>
              <thead>
                <tr><th>商品名</th><th>商品ID</th><th>価格</th><th>操作</th></tr>
              </thead>
              <tbody>
                {Object.keys(products).sort((a,b) => Number(a) - Number(b)).map(key => (
                  <tr key={key}>
                    <td>{products[key].name}</td>
                    <td>{key}</td>
                    <td>¥{products[key].price.toLocaleString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button onClick={() => handleEditProduct(key, 'products')} className="edit-button">編集</button>
                        <button onClick={() => handleDeleteProduct(key, 'products')} className="delete-button">削除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        );
      case 'specialMenus':
          return (
            <>
              <div className="admin-controls-container" style={{marginBottom: '1rem'}}>
                <h2>特殊メニュー</h2>
                <button onClick={() => handleAddNewProduct('specialMenus')}>+ 特殊メニューを追加</button>
              </div>
              <table>
              <thead>
                <tr><th>商品名</th><th>商品ID</th><th>価格</th><th>操作</th></tr>
              </thead>
              <tbody>
                {Object.keys(specialMenus).sort((a,b) => Number(a) - Number(b)).map(key => (
                  <tr key={key}>
                    <td>{specialMenus[key].name}</td>
                    <td>{key}</td>
                    <td>¥{specialMenus[key].price.toLocaleString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button onClick={() => handleEditProduct(key, 'specialMenus')} className="edit-button">編集</button>
                        <button onClick={() => handleDeleteProduct(key, 'specialMenus')} className="delete-button">削除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </>
          );
      case 'deliveryWariate':
          return (
            <>
              <div className="admin-controls-container" style={{marginBottom: '1rem'}}>
                <h2>割り当ての管理</h2>
                <button onClick={handleAddNewWariate}>+ 新しい割り当てを追加</button>
              </div>
              <table className='mastatable'>
                <thead><tr><th>割り当て名</th><th>担当する割り振り</th><th>操作</th></tr></thead>
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
            </>
          );
      case 'allocationMaster':
        return (
            <>
              <div className="admin-controls-container" style={{marginBottom: '1rem'}}>
                <h2>割り当てアルファベット</h2>
                <button onClick={handleAddNewAllocation}>+ 新しい割り当てを追加</button>
              </div>
              <table className='mastatable'>
                <thead><tr><th>記号</th><th>住所</th><th>操作</th></tr></thead>
                <tbody>
                  {Object.keys(allocationMaster).map(prefix => (
                    <tr key={prefix}>
                      <td>{prefix}</td>
                      <td>{allocationMaster[prefix].address}</td>
                      <td>
                        <div className="action-buttons">
                          <button onClick={() => handleEditAllocation(prefix)} className="edit-button">編集</button>
                          <button onClick={() => handleDeleteAllocation(prefix)} className="delete-button">削除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
        );
      case 'netaMaster':
        return (
          <>
            <div className="admin-controls-container" style={{marginBottom: '1rem'}}>
              <h2>ネタ種類</h2>
              <button onClick={handleAddNewNeta}>+ 新しいネタを追加</button>
            </div>
            <table className='mastatable'>
              <thead><tr><th>ネタ名</th><th>カテゴリ</th><th>操作</th></tr></thead>
              <tbody>
                {(netaMaster || []).map(neta => (
                  <tr key={neta.netaName}>
                    <td>{neta.netaName}</td>
                    <td>{neta.category}</td>
                    <td>
                      <div className="action-buttons">
                        <button onClick={() => handleEditNeta(neta)} className="edit-button">編集</button>
                        <button onClick={() => handleDeleteNeta(neta.netaName)} className="delete-button">削除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="main-content">
      <h1 className="admin-header">設定管理</h1>

      {isProductFormOpen && ( <ProductForm initialData={editingProduct} onSubmit={handleProductFormSubmit} onCancel={() => setIsProductFormOpen(false)} editingType={editingType} /> )}
      {isNetaFormOpen && ( <NetaForm initialData={editingNeta} onSubmit={handleNetaFormSubmit} onCancel={() => setIsNetaFormOpen(false)} netaMaster={netaMaster} /> )}
      {isAllocationFormOpen && ( <AllocationForm initialData={editingAllocation} onSubmit={handleAllocationFormSubmit} onCancel={() => setIsAllocationFormOpen(false)} /> )}
      {isWariateFormOpen && ( <WariateForm initialData={editingWariate} onSubmit={handleWariateFormSubmit} onCancel={() => setIsWariateFormOpen(false)} /> )}
      
      {selectedYear ? (
        <>
          {loading && <p>データを再読み込みしています...</p>}
          {error && <p style={{color: 'red'}}>エラー: {error}</p>}

          {configuration && (
            <>
              {isNewConfiguration ? (
                <div className="new-year-setup-box">
                  <h2>{selectedYear}年の新規設定を開始</h2>
                  <p>
                    下のボタンを押すと、{selectedYear - 1}年の設定（商品マスタ等）を引き継いで、{selectedYear}年の設定を新規作成します。<br />
                  </p>
                  <div className="setup-step">
                    <h3>{selectedYear}年の設定を作成して年度更新</h3>
                    <button onClick={handleCopyFromPreviousYear} disabled={isCopying} className="copy-button">
                      {isCopying ? '処理中...' : `設定をコピーして年度更新を実行`}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="settings-dashboard">
                  <div className="settings-card color-group-1" onClick={() => setOpenModal('deliveryDates')}>
                    <h3>配達日管理</h3>
                    <p>注文を受け付ける日付を設定します。</p>
                  </div>
                  <div className="settings-card color-group-1" onClick={() => setOpenModal('deliveryTimes')}>
                    <h3>配達時間管理</h3>
                    <p>配達の時間帯の選択肢を設定します。</p>
                  </div>
                  <div className="settings-card color-group-1" onClick={() => setOpenModal('products')}>
                    <h3>通常メニュー管理</h3>
                    <p>通常メニューの商品内容や価格を設定します。</p>
                  </div>
                  <div className="settings-card color-group-1" onClick={() => setOpenModal('specialMenus')}>
                    <h3>特殊メニュー管理</h3>
                    <p>その他の注文や特別メニューを設定します。</p>
                  </div>
                  <div className="settings-card color-group-2" onClick={() => setOpenModal('deliveryRoutes')}>
                    <h3>割り振り管理</h3>
                    <p>配達担当の名称を設定します。</p>
                  </div>
                  <div className="settings-card color-group-2" onClick={() => setOpenModal('deliveryWariate')}>
                    <h3>割り当て管理</h3>
                    <p>割り振り担当がどの配達先を担当するかを設定します。</p>
                  </div>
                  <div className="settings-card color-group-2" onClick={() => setOpenModal('allocationMaster')}>
                    <h3>割り当て番号管理</h3>
                    <p>受付番号に使われる記号と住所の対応を設定します。</p>
                  </div>
                  <div className="settings-card color-group-3" onClick={() => setOpenModal('netaMaster')}>
                    <h3>ネタ種類管理</h3>
                    <p>商品に使われるネタの大元マスタを管理します。</p>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <p style={{ marginTop: '1rem', fontWeight: 'bold' }}>操作したい設定年を選択してください。</p>
      )}

      {openModal && (
        <div className="settings-modal-backdrop" onClick={() => setOpenModal(null)}>
          <div className="settings-modal-content" onClick={e => e.stopPropagation()}>
            <div className="settings-modal-header">
              <button onClick={() => setOpenModal(null)} className="settings-modal-close-btn">&times;</button>
            </div>
            <ModalContent />
          </div>
        </div>
      )}
    </div>
  );
}