"use client";
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useConfiguration } from '../contexts/ConfigurationContext'; 
import { Search, Send, Plus, X as CloseIcon, Trash2 } from 'lucide-react';
import CustomerInfoSection from '../../components/CustomerInfoSection';
import SingleOrderSection from '../../components/SingleOrderSection';
import ConfirmationModal from '../../components/ConfirmationModal';
import { generateEmailHtml } from '../../utils/emailGenerator';

const ChangeOrderPage = ({ initialOrderId, isModalMode = false, onClose }) => {

  const { configuration, loading, error, selectedYear, changeYear } = useConfiguration();

  const PRODUCTS = useMemo(() => (configuration?.products || {}), [configuration]);
  const SIDE_ORDERS_DB = useMemo(() => (configuration?.specialMenus || {}), [configuration]);
  const ALLOCATION_MASTER = useMemo(() => (configuration?.allocationMaster || {}), [configuration]);
  const deliveryDates = useMemo(() => (configuration?.deliveryDates || []), [configuration]);
  const deliveryTimes = useMemo(() => (configuration?.deliveryTimes || []), [configuration]);
  const [globalNotes, setGlobalNotes] = useState('');
  

  const initialCustomerInfo = {
    contactName: '', email: '', fax: '', tel: '', companyName: '',
    paymentMethod: '', invoiceName: '', address: '', floorNumber: '',
    useCombinedPayment: false,
  };

  const createNewOrder = useMemo(() => {
    return () => ({
      id: Date.now(), orderDate: '', orderTime: '', deliveryAddress: '', deliveryMethod: '',isSameAddress: true,
      hasNetaChange: false,
      netaChangeDetails: '', 
      netaChanges: {},
      sideOrders: [],
      orderItems: Object.keys(PRODUCTS).map(key => ({ 
        productKey: key, 
        name: PRODUCTS[key].name, 
        unitPrice: PRODUCTS[key].price, 
        quantity: 0, 
        notes: '' 
      }))
    });
  }, [PRODUCTS]);

  const [searchId, setSearchId] = useState(initialOrderId || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [customerInfo, setCustomerInfo] = useState(initialCustomerInfo);
  const [orders, setOrders] = useState([]);
  const [isPaymentOptionsOpen, setIsPaymentOptionsOpen] = useState(false);
  const [isCombinedPaymentSummaryOpen, setIsCombinedPaymentSummaryOpen] = useState(false);
  const [allocationNumber, setAllocationNumber] = useState('');
  const [receptionNumber, setReceptionNumber] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [paymentGroups, setPaymentGroups] = useState([]);
  const [isReceiptDetailsOpen, setIsReceiptDetailsOpen] = useState(false);
  const [manualReceipts, setManualReceipts] = useState([]);
  

  useEffect(() => {
    if (!selectedYear) {
      changeYear(new Date().getFullYear());
    }
  }, [selectedYear, changeYear]);

  useEffect(() => {
    if (initialOrderId) {
      handleSearch();
    }
  }, [initialOrderId]);

  const getDocumentType = useCallback((paymentMethod) => {
    if (['現金', 'クレジットカード'].includes(paymentMethod)) return '領収書';
    if (['銀行振込', '請求書払い'].includes(paymentMethod)) return '請求書';
    return '';
  }, []); 

  const generateOrderNumber = useCallback((order, receptionNum, index) => {
    if (!receptionNum || receptionNum === 'エラー' || !order.orderDate) {
      return '---';
    }
    try {
      const day = order.orderDate.split('/')[2].padStart(2, '0');
      const sequence = order.sequence !== undefined ? order.sequence : index + 1;
      return `${day}${receptionNum}${sequence}`;
    } catch (e) {
      console.error("Date format error:", order.orderDate);
      return '---';
    }
  }, []);

  const resetForm = () => {
    setCustomerInfo(initialCustomerInfo);
    setOrders([createNewOrder()]);
    setIsPaymentOptionsOpen(false);
    setIsCombinedPaymentSummaryOpen(false);
    setPaymentGroups([]);
    setIsReceiptDetailsOpen(false);
    setManualReceipts([]);
    setAllocationNumber('');
    setReceptionNumber('');
    setIsDataLoaded(false);
    setSearchId('');
    setGlobalNotes('');
  };

  const handleSearch = async () => {
    if (!searchId) {
      alert('受付番号または注文番号を入力してください。');
      return;
    }
    setIsLoading(true);
    setIsDataLoaded(false);

    let receptionNumToSearch = searchId;
    let searchedOrderId = null;

    if (searchId.length > 5 && searchId.match(/[A-Z]/)) {
      receptionNumToSearch = searchId.substring(2, searchId.length - 1);
      searchedOrderId = searchId;
    }
    
    try {
      const apiUrl = `https://viy41bgkvd.execute-api.ap-northeast-1.amazonaws.com/orders/${receptionNumToSearch}`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '注文データの取得に失敗しました。');
      }
      const data = await response.json();

      setCustomerInfo(data.customerInfo);
      setReceptionNumber(data.receptionNumber);
      setAllocationNumber(data.allocationNumber);

      // まず注文データを処理
      const loadedOrders = data.orders.map((dbOrder) => {
        const mergedOrderItems = Object.keys(PRODUCTS).map(productKey => {
          const masterProduct = PRODUCTS[productKey];
          const orderedItem = (dbOrder.orderItems || []).find(item => item.productKey === productKey);
          return {
            productKey: productKey, 
            name: masterProduct.name, 
            unitPrice: masterProduct.price,
            quantity: orderedItem ? orderedItem.quantity : 0, 
            notes: orderedItem ? orderedItem.notes : ''
          };
        });
        return { ...dbOrder, orderItems: mergedOrderItems };
      });

      // 注文の並び替え処理
      loadedOrders.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

      if (searchedOrderId) {
        const foundIndex = loadedOrders.findIndex(order => order.orderId === searchedOrderId);
        if (foundIndex > -1) {
          const [foundOrder] = loadedOrders.splice(foundIndex, 1);
          loadedOrders.unshift(foundOrder);
        }
      }

      setOrders(loadedOrders);

      // 支払いグループの処理 - 注文番号をorder.idに変換
      const processedPaymentGroups = (data.paymentGroups || []).map(group => {
        // group.paymentDateが注文番号の場合、対応するorder.idに変換
        if (group.paymentDate && group.paymentDate.length > 5) {
          const correspondingOrder = loadedOrders.find(order => {
            const tempOrderIndex = loadedOrders.indexOf(order);
            const tempOrderNumber = generateOrderNumber(order, data.receptionNumber, tempOrderIndex);
            return tempOrderNumber === group.paymentDate;
          });
          
          if (correspondingOrder) {
            return {
              ...group,
              paymentDate: correspondingOrder.id.toString() // order.idに変換
            };
          }
        }
        return group;
      });

      setPaymentGroups(processedPaymentGroups);

      // 領収書データの処理
      const loadedReceipts = (data.receipts || []).map(receipt => {
        // 支払いグループに関連する領収書の場合
        if (receipt.groupId) {
          const correspondingGroup = processedPaymentGroups.find(g => g.id === receipt.groupId);
          if (correspondingGroup) {
            // 支払いグループの支払日（order.id）から対応する注文の日付を取得
            const correspondingOrder = loadedOrders.find(o => o.id === parseInt(correspondingGroup.paymentDate, 10));
            return {
              ...receipt,
              issueDate: correspondingOrder ? correspondingOrder.orderDate : receipt.issueDate
            };
          }
        } else {
          // 通常の領収書の場合（支払いグループに関連しない）
          if (receipt.issueDate && receipt.issueDate.length > 5) {
            // 注文番号形式の場合、対応する注文を探す
            const correspondingOrder = loadedOrders.find(order => {
              const tempOrderIndex = loadedOrders.indexOf(order);
              const tempOrderNumber = generateOrderNumber(order, data.receptionNumber, tempOrderIndex);
              return tempOrderNumber === receipt.issueDate;
            });
            
            if (correspondingOrder) {
              return {
                ...receipt,
                issueDate: correspondingOrder.orderDate
              };
            }
          }
        }
        return receipt;
      });

      setManualReceipts(loadedReceipts);

      // UI状態の設定
      if ((processedPaymentGroups && processedPaymentGroups.length > 0) || (loadedReceipts && loadedReceipts.length > 0)) {
        setIsPaymentOptionsOpen(true);
        if(processedPaymentGroups && processedPaymentGroups.length > 0) setIsCombinedPaymentSummaryOpen(true);
        if(loadedReceipts && loadedReceipts.length > 0) setIsReceiptDetailsOpen(true);
      } else {
        setIsPaymentOptionsOpen(false);
        setIsCombinedPaymentSummaryOpen(false);
        setIsReceiptDetailsOpen(false);
      }

      setIsDataLoaded(true);
    } catch (error) {
      alert(`エラー: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    const updateApiUrl = `https://viy41bgkvd.execute-api.ap-northeast-1.amazonaws.com/orders/${receptionNumber}`;

    const ordersWithFinalId = orders.map((order, index) => ({
      ...order,
      // 既存のorderIdがあればそれを使い、なければ新規生成する
      orderId: order.orderId || generateOrderNumber(order, receptionNumber, index)
    }));
    const transformedReceipts = finalReceipts.map(receipt => {
      // 発行日に基づいて対応する注文とインデックスを探す
      const correspondingOrder = orders.find(o => o.orderDate === receipt.issueDate);
      const correspondingOrderIndex = orders.findIndex(o => o.orderDate === receipt.issueDate);

      // 対応する注文が見つかった場合
      if (correspondingOrder && correspondingOrderIndex !== -1) {
        const finalOrderNumber = generateOrderNumber(correspondingOrder, receptionNumber, correspondingOrderIndex);
        
        // 有効な注文番号が生成されたら、issueDateを置き換える
        if (finalOrderNumber !== '---') {
          return { ...receipt, issueDate: finalOrderNumber };
        }
      }
      // 置き換えられない場合は、元のreceipt（日付のまま）を返す
      return receipt;
    });
    // paymentGroupsのpaymentDateも、対応する注文番号に書き換える
    const transformedPaymentGroups = paymentGroupsWithTotals.map(group => {
      // group.paymentDateにはorder.idが入っているため、IDで注文を検索します。
      const correspondingOrder = orders.find(o => o.id === parseInt(group.paymentDate, 10));
      const correspondingOrderIndex = orders.findIndex(o => o.id === parseInt(group.paymentDate, 10));

      if (correspondingOrder && correspondingOrderIndex !== -1) {
        const finalOrderNumber = generateOrderNumber(correspondingOrder, receptionNumber, correspondingOrderIndex);
        if (finalOrderNumber !== '---') {
          // paymentDateを注文番号で置き換えた新しいグループオブジェクトを返す
          return { ...group, paymentDate: finalOrderNumber };
        }
      }
      // 置き換えられない場合は、元のグループをそのまま返す
      return group;
    });

    const updatedData = {
      selectedYear: selectedYear,
      customer: customerInfo, 
      orders: ordersWithFinalId,
      receptionNumber, 
      allocationNumber, 
      paymentGroups: transformedPaymentGroups, 
      receipts: transformedReceipts,
      orderType: '変更',
      globalNotes: globalNotes,
    };
    
    try {
      const response = await fetch(updateApiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '注文の更新に失敗しました。');
      }
      setIsConfirmationOpen(false);
      alert('注文内容を正常に更新しました。');
      if (isModalMode && typeof onClose === 'function') {
        onClose();
      } else {
        resetForm();
      }
    } catch (error) {
      console.error('注文の更新中にエラーが発生しました:', error);
      alert(`エラー: ${error.message}`);
    }
  };

  const handleCustomerInfoChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCustomerInfo(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const updateOrder = useCallback((orderId, updatedFields) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updatedFields } : o));
  }, []);

  const addOrder = useCallback(() => {
    setOrders(prev => [...prev, createNewOrder()]);
  }, [createNewOrder]);

  const deleteOrder = useCallback((orderId) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  }, []);

  const calculateOrderTotal = useCallback((order) => {
    const mainTotal = (order.orderItems || []).reduce((total, item) => total + ((parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity) || 0)), 0);
    const sideTotal = (order.sideOrders || []).reduce((total, item) => {
      const price = SIDE_ORDERS_DB[item.productKey]?.price || 0;
      return total + (price * (parseInt(item.quantity) || 0));
    }, 0);
    return mainTotal + sideTotal;
  }, [SIDE_ORDERS_DB]);

  const calculateGrandTotal = useCallback(() => orders.reduce((total, order) => total + calculateOrderTotal(order), 0), [orders, calculateOrderTotal]);

  const handleToggleCombinedPayment = () => {
    const newOpenState = !isCombinedPaymentSummaryOpen;
    setIsCombinedPaymentSummaryOpen(newOpenState);
    setCustomerInfo(prev => ({ ...prev, useCombinedPayment: newOpenState }));
    if (!newOpenState) setPaymentGroups([]);
  };

  const addSideOrder = (orderId, productKey) => {
    if (!productKey) return;
    setOrders(prevOrders => prevOrders.map(order => {
      if (order.id === orderId) {
        const exists = order.sideOrders.some(item => item.productKey === productKey);
        if (exists) return order;
        const newSideOrder = { productKey, quantity: 1 };
        return { ...order, sideOrders: [...order.sideOrders, newSideOrder] };
      }
      return order;
    }));
  };

  const updateSideOrderQuantity = (orderId, productKey, quantity) => {
    const finalQuantity = parseInt(String(quantity).replace(/[０-９]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xFEE0)), 10) || 0;
    setOrders(prevOrders => prevOrders.map(order => {
      if (order.id === orderId) {
        const updatedSideOrders = order.sideOrders
          .map(item => item.productKey === productKey ? { ...item, quantity: finalQuantity } : item)
          .filter(item => item.quantity > 0);
        return { ...order, sideOrders: updatedSideOrders };
      }
      return order;
    }));
  };

  const removeSideOrder = (orderId, productKey) => {
    setOrders(prevOrders => prevOrders.map(order => {
      if (order.id === orderId) {
        const updatedSideOrders = order.sideOrders.filter(item => item.productKey !== productKey);
        return { ...order, sideOrders: updatedSideOrders };
      }
      return order;
    }));
  };

  const addPaymentGroup = () => {
    const newGroup = { id: Date.now(), paymentDate: '', checkedOrderIds: {} };
    setPaymentGroups(prev => [...prev, newGroup]);
    setIsReceiptDetailsOpen(true); 
  };
  const removePaymentGroup = (groupId) => {
    setPaymentGroups(prev => prev.filter(group => group.id !== groupId));
  };
  // updatePaymentGroup関数を修正して、支払日が変更された時に対応する領収書の発行日も自動更新
const updatePaymentGroup = (groupId, field, value) => {
  setPaymentGroups(prev => prev.map(group => group.id === groupId ? { ...group, [field]: value } : group));
  
  // 支払日が変更された場合、対応する領収書の発行日も自動更新
  if (field === 'paymentDate') {
    // 対応する注文を検索
    const correspondingOrder = orders.find(o => o.id === parseInt(value, 10));
    
    if (correspondingOrder && correspondingOrder.orderDate) {
      // 対応する領収書を更新（手動編集されていない場合のみ）
      setManualReceipts(prev => prev.map(receipt => {
        if (receipt.groupId === groupId && !receipt.isIssueDateManuallyEdited) {
          return {
            ...receipt,
            issueDate: correspondingOrder.orderDate
          };
        }
        return receipt;
      }));
    } else {
      // 支払日がクリアされた場合、発行日もクリア（手動編集されていない場合のみ）
      setManualReceipts(prev => prev.map(receipt => {
        if (receipt.groupId === groupId && !receipt.isIssueDateManuallyEdited) {
          return {
            ...receipt,
            issueDate: ''
          };
        }
        return receipt;
      }));
    }
  }
};
  const handleGroupOrderCheck = (groupId, orderId) => {
    setPaymentGroups(prevGroups => prevGroups.map(group => {
      if (group.id === groupId) {
        const newCheckedOrderIds = { ...group.checkedOrderIds };
        if (newCheckedOrderIds[orderId]) { 
          delete newCheckedOrderIds[orderId]; 
          } else { 
            newCheckedOrderIds[orderId] = true; 
          }
        return { ...group, checkedOrderIds: newCheckedOrderIds };
      }
      return group;
    }));
  };

  const paymentGroupsWithTotals = useMemo(() => {
    return paymentGroups.map(group => {
      const groupTotal = orders.reduce((total, order) => {
        if (group.checkedOrderIds[order.id]) { return total + calculateOrderTotal(order); }
        return total;
      }, 0);
      return { ...group, total: groupTotal };
    });
  }, [paymentGroups, orders, calculateOrderTotal]);

  // useEffectの修正版 - 無限ループを防ぎ、手動入力を保持する
useEffect(() => {
  // customerInfoがまだ読み込まれていない場合は何もしない
  if (!customerInfo) return;

  // 1. 支払いグループが存在しない場合は、それに関連付けられていた領収書だけをクリアする
  if (paymentGroups.length === 0) {
    const purelyManualReceipts = manualReceipts.filter(r => !r.groupId);
    if (manualReceipts.length !== purelyManualReceipts.length) {
        setManualReceipts(purelyManualReceipts);
    }
    return;
  }

  // 2. ユーザーが完全に手動で追加した領収書（グループIDを持たない）を抽出
  const purelyManualReceipts = manualReceipts.filter(r => !r.groupId);

  // 3. 現在の支払いグループを元に、領収書を自動生成
  const autoGeneratedReceipts = paymentGroupsWithTotals.map(group => {
    const docType = getDocumentType(customerInfo.paymentMethod) || '領収書';
    const existingReceipt = manualReceipts.find(r => r.groupId === group.id);

    // group.paymentDate (ここには order.id が入っています) を使って、
    // 対応する注文オブジェクトを検索します。
    const correspondingOrder = orders.find(o => o.id === parseInt(group.paymentDate, 10));

    // 既存の領収書がある場合は、手動編集された値を保持
    if (existingReceipt) {
      return {
        ...existingReceipt,
        // 金額は手動編集されていない場合のみ更新
        amount: existingReceipt.isAmountManuallyEdited 
                ? existingReceipt.amount 
                : group.total,
        // 発行日は手動編集されている場合は既存値を保持、そうでなければ自動設定
        issueDate: existingReceipt.isIssueDateManuallyEdited 
                   ? existingReceipt.issueDate
                   : ((group.paymentDate && correspondingOrder && correspondingOrder.orderDate) 
                      ? correspondingOrder.orderDate 
                      : existingReceipt.issueDate || ''),
      };
    }

    // 新規の場合は自動設定
    return {
      id: group.id,
      groupId: group.id,
      documentType: docType,
      issueDate: (group.paymentDate && correspondingOrder && correspondingOrder.orderDate) 
                 ? correspondingOrder.orderDate 
                 : '',
      recipientName: customerInfo.invoiceName,
      amount: group.total,
      isAmountManuallyEdited: false,
    };
  });

  // 4. 自動生成されたリストと、完全に手動のリストを結合
  const newFinalReceipts = [...autoGeneratedReceipts, ...purelyManualReceipts];

  // 5. 変更があった場合のみ更新（無限ループを防ぐため、より厳密な比較）
  const hasChanged = 
    manualReceipts.length !== newFinalReceipts.length ||
    manualReceipts.some((receipt, index) => {
      const newReceipt = newFinalReceipts[index];
      return !newReceipt || 
             receipt.id !== newReceipt.id ||
             receipt.documentType !== newReceipt.documentType ||
             receipt.issueDate !== newReceipt.issueDate ||
             receipt.recipientName !== newReceipt.recipientName ||
             receipt.amount !== newReceipt.amount ||
             receipt.groupId !== newReceipt.groupId;
    });

  if (hasChanged) {
    setManualReceipts(newFinalReceipts);
  }

}, [paymentGroupsWithTotals, customerInfo.paymentMethod, customerInfo.invoiceName, orders]); 
// manualReceiptsを依存配列から除去して無限ループを防ぐ

  const customerFullAddress = useMemo(() => {
    if (!customerInfo.address) return '';
    return customerInfo.floorNumber
      ? `${customerInfo.address} ${customerInfo.floorNumber}F`
      : customerInfo.address;
  }, [customerInfo.address, customerInfo.floorNumber]);

  const handleLocationSelect = useCallback((prefix) => {
    setAllocationNumber(prefix);
    
    let newAddress = '';
    let newCompanyName = '';
    
    if (prefix && prefix !== 'その他') {
      const allocationData = ALLOCATION_MASTER[prefix];
      if (allocationData) {
        newAddress = allocationData.address || '';
        newCompanyName = allocationData.locationName || '';
      }
    }
    
    setCustomerInfo(prev => ({
      ...prev,
      companyName: newCompanyName,
      address: newAddress,
      floorNumber: '',
    }));
  }, [ALLOCATION_MASTER]);

  const handleToggleReceiptDetails = () => setIsReceiptDetailsOpen(prev => !prev);
  
  const addReceipt = () => {
    // 変更注文では orderId は不要なので削除
    const newReceipt = { 
      id: Date.now(), 
      issueDate: '', 
      recipientName: '', 
      amount: '', 
      documentType: '領収書' 
    };
    setManualReceipts(prev => [...prev, newReceipt]);
  };

  const removeReceipt = (receiptId) => setManualReceipts(prev => prev.filter(r => r.id !== receiptId));
  
  const updateReceipt = (receiptId, field, value) => {
  setManualReceipts(prev => prev.map(r => {
    if (r.id === receiptId) {
      const updatedReceipt = { ...r, [field]: value };
      
      // 金額が変更された場合は、手動編集フラグを立てる
      if (field === 'amount') {
        updatedReceipt.isAmountManuallyEdited = true;
      }
      
      // 発行日が変更された場合は、手動編集フラグを立てる（新しく追加）
      if (field === 'issueDate') {
        updatedReceipt.isIssueDateManuallyEdited = true;
      }
      
      return updatedReceipt;
    }
    return r;
  }));
};

  const autoGeneratedReceipts = useMemo(() => {
    const docType = getDocumentType(customerInfo.paymentMethod);
    if (!isPaymentOptionsOpen) {
        if (!customerInfo.paymentMethod || !customerInfo.invoiceName) return [];
        return orders.map(order => ({
            id: order.id,
            documentType: docType || '(種別未定)',
            issueDate: order.orderDate,
            recipientName: customerInfo.invoiceName,
            amount: calculateOrderTotal(order)
        }));
    }
    return [];
  }, [orders, customerInfo.paymentMethod, customerInfo.invoiceName, isPaymentOptionsOpen, calculateOrderTotal, getDocumentType]);

  const finalReceipts = manualReceipts.length > 0 ? manualReceipts : autoGeneratedReceipts;

  const uniqueOrderDates = [...new Set(orders.map(o => o.orderDate).filter(Boolean))];
  
  if (loading) return <h4>設定データを読み込んでいます...</h4>;
  if (error) return <h4 style={{color: 'red'}}>エラー: {error}</h4>;
  if (!configuration) return <h4>表示する設定年を選択してください。</h4>;

  return (
    <div className={isModalMode ? "modal-page-container" : "main-container"}>
      {isConfirmationOpen && ( <ConfirmationModal onClose={() => setIsConfirmationOpen(false)} onSubmit={handleUpdate} customerInfo={customerInfo} orders={orders} receptionNumber={receptionNumber} allocationNumber={allocationNumber} calculateOrderTotal={calculateOrderTotal} generateOrderNumber={generateOrderNumber} calculateGrandTotal={calculateGrandTotal} isPaymentOptionsOpen={isPaymentOptionsOpen} SIDE_ORDERS_DB={SIDE_ORDERS_DB} receipts={finalReceipts} paymentGroups={paymentGroupsWithTotals} orderType="変更" globalNotes={globalNotes}/> )}
      <div className="main-content">
        <div className="form-container">
          <div className="form-header"> <h1 className="form-title">注文変更</h1> </div>
          <div className="search-container">
            <input type="text" value={searchId} onChange={(e) => setSearchId(e.target.value.toUpperCase())} className="search-input" placeholder="受付番号 (A2A) または注文番号 (25A2A1) を入力" />
            <button onClick={handleSearch} className="search-button" disabled={isLoading}> <Search size={20} /> {isLoading ? '検索中...' : '検索'} </button>
          </div>
          {isDataLoaded && (
          <div className="order-detail-container">
            <CustomerInfoSection
              formData={customerInfo}
              handleInputChange={handleCustomerInfoChange}
              allocationMaster={ALLOCATION_MASTER}
              onLocationSelect={handleLocationSelect}
              allocationNumber={allocationNumber} 
        />
            {orders.map((order, index) => {
              const orderNumberDisplay = order.orderId || '（新規追加）';
              return (
                <SingleOrderSection
                  key={order.id || order.orderId}
                  order={order}
                  orderIndex={index}
                  updateOrder={updateOrder}
                  deleteOrder={deleteOrder}
                  PRODUCTS={PRODUCTS}
                  SIDE_ORDERS_DB={SIDE_ORDERS_DB}
                  isDeletable={orders.length > 1}
                  orderNumberDisplay={orderNumberDisplay}
                  calculateOrderTotal={calculateOrderTotal}
                  addSideOrder={addSideOrder}
                  updateSideOrderQuantity={updateSideOrderQuantity}
                  removeSideOrder={removeSideOrder}
                  availableDates={deliveryDates}
                  availableTimes={deliveryTimes}
                  customerAddress={customerFullAddress}
                />
              );
            })}
            <div className="add-order-container">
              <button type="button" onClick={addOrder} className="add-order-btn"> <Plus size={20} /> 別日・別の届け先の注文を追加する </button>
            </div>
            <div className="payment-info-section">
              <h2 className="payment-info-title">お支払い・書類設定</h2>
              <div className="payment-options-container always-open">
                <div className="payment-info-fields-container">
                  <div className="payment-info-field"> <label className="payment-info-label"> 支払い方法 <span className="required-mark">*</span> </label> <select name="paymentMethod" value={customerInfo.paymentMethod} onChange={handleCustomerInfoChange} className="payment-info-select"> <option value="">選択してください</option> <option value="現金">現金</option> <option value="銀行振込">銀行振込</option> <option value="クレジットカード">クレジットカード</option> <option value="請求書払い">請求書払い</option> </select> </div>
                  <div className="payment-info-field"> <label className="payment-info-label"> 領収書・請求書の宛名（自動作成用） </label> <input type="text" name="invoiceName" value={customerInfo.invoiceName} onChange={handleCustomerInfoChange} className="payment-info-input" placeholder="株式会社○○○" /> </div>
              </div>
                <div className="payment-option-item">
                  <button type="button" onClick={handleToggleCombinedPayment} className="payment-option-title-button"> ・まとめてお支払いの有無 </button>
                  {isCombinedPaymentSummaryOpen && orders.length > 1 && (
                    <div className="combined-payment-summary">
                      <div className="payment-groups-container">
                        {paymentGroupsWithTotals.map((group, index) => (
                          <div key={group.id} className="payment-group">
                            <div className="payment-group-header">
                              <h4>支払日#{index + 1}</h4>
                              <button onClick={() => removePaymentGroup(group.id)} className="remove-group-btn"><Trash2 size={16} /></button>
                            </div>
                            <div className="combined-payment-field">
                              <label className="combined-payment-label">支払日</label>
                              <select
                                value={group.paymentDate} 
                                onChange={(e) => updatePaymentGroup(group.id, 'paymentDate', e.target.value)} className="combined-payment-select">
                                <option value="">支払日を選択</option>
                                  {orders.map((order, index) => (
                                    <option key={order.id} value={order.id}>
                                    注文#{index + 1} ({order.orderDate || '日付未定'})
                                </option>
                              ))}
                              </select>
                            </div>
                            <div className="order-checklist-container">
                              <p>この日にお支払いをする注文を選択:</p>
                              {orders.map((order, orderIndex) => (
                                <div key={order.id} className="order-checklist-item">
                                  <input type="checkbox" id={`order-check-${group.id}-${order.id}`} checked={!!group.checkedOrderIds[order.id]} onChange={() => handleGroupOrderCheck(group.id, order.id)} />
                                  <label htmlFor={`order-check-${group.id}-${order.id}`}>
                                    {/* ★★★ ここも同様に修正 ★★★ */}
                                    {order.orderId || generateOrderNumber(order, receptionNumber, orderIndex)}
                                    ({order.orderDate || '日付未定'}) - ¥{calculateOrderTotal(order).toLocaleString()}
                                  </label>
                                </div>
                              ))}
                            </div>
                            <div className="daily-payment-summary">
                              <div className="daily-payment-row total">
                                <strong>合計金額:</strong>
                                <span>¥{group.total.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={addPaymentGroup} className="add-group-btn"> <Plus size={16} /> 支払日を追加 </button>
                    </div>
                  )}
                </div>
                <div className="payment-option-item">
                  <button type="button" onClick={handleToggleReceiptDetails} className="payment-option-title-button"> ・領収書・請求書の詳細指定 </button>
                  {isReceiptDetailsOpen && (
  <div className="receipt-details-container">
    <div className="receipt-groups-container">
      {manualReceipts.map((receipt, index) => (
        <div key={receipt.id} className="receipt-group">
          <div className="receipt-group-header">
            <h4>詳細 #{index + 1}</h4>
            <button onClick={() => removeReceipt(receipt.id)} className="remove-group-btn">
              <Trash2 size={16} />
            </button>
          </div>
          <div className="receipt-input-grid">
            <div className="combined-payment-field">
              <label className="combined-payment-label">種別</label>
              <select 
                className="combined-payment-select" 
                value={receipt.documentType} 
                onChange={(e) => updateReceipt(receipt.id, 'documentType', e.target.value)}
              >
                <option value="領収書">領収書</option>
                <option value="請求書">請求書</option>
              </select>
            </div>

            {/* 変更注文では「発行日」として注文を選択 */}
            <div className="combined-payment-field">
              <label className="combined-payment-label">発行日</label>
              <select 
                className="combined-payment-select" 
                value={receipt.issueDate || ''} 
                onChange={(e) => updateReceipt(receipt.id, 'issueDate', e.target.value)}
              >
                <option value="">注文を選択</option>
                {orders.map((order, index) => (
                  order.orderDate && (
                    <option key={order.id} value={order.orderDate}>
                      注文#{index + 1} ({order.orderDate})
                    </option>
                  )
                ))}
              </select>
            </div>

            <div className="combined-payment-field">
              <label className="combined-payment-label">宛名</label>
              <input 
                type="text" 
                className="payment-info-input" 
                placeholder="株式会社○○○" 
                value={receipt.recipientName} 
                onChange={(e) => updateReceipt(receipt.id, 'recipientName', e.target.value)} 
              />
            </div>
            <div className="combined-payment-field">
              <label className="combined-payment-label">金額</label>
              <input 
                type="number" 
                className="payment-info-input" 
                placeholder="0" 
                value={receipt.amount} 
                onChange={(e) => updateReceipt(receipt.id, 'amount', e.target.value)} 
              />
            </div>
          </div>
        </div>
      ))}
    </div>
    <button onClick={addReceipt} className="add-group-btn">
      <Plus size={16} /> 領収書/請求書を追加
    </button>
  </div>
)}
              </div>
              </div>
            </div>
            <div className="notes-section">
              <h2 className="payment-info-title">備考</h2>
              <textarea
                className="notes-textarea"
                value={globalNotes}
                onChange={(e) => setGlobalNotes(e.target.value)}
                placeholder="アレルギーに関する情報や、その他配送に関する特記事項などがございましたらご記入ください。"
                rows="4"
              />
            </div>
            <div className="submit-container"> 
              <button type="button" onClick={() => setIsConfirmationOpen(true)} className="confirm-btn"> この内容で更新を確認 </button>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default ChangeOrderPage;
                                