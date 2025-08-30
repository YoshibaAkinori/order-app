"use client";
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useConfiguration } from '../contexts/ConfigurationContext'; 
import { Search, Send, Plus, X as CloseIcon, Trash2 } from 'lucide-react';
import CustomerInfoSection from '../../components/CustomerInfoSection';
import SingleOrderSection from '../../components/SingleOrderSection';
import ConfirmationModal from '../../components/ConfirmationModal';

import { 
  searchOrderAPI, 
  updateOrderAPI, 
  cancelAllOrdersAPI, 
} from '../lib/changeApi';

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
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [paymentGroups, setPaymentGroups] = useState([]);
  const [isReceiptDetailsOpen, setIsReceiptDetailsOpen] = useState(false);
  const [manualReceipts, setManualReceipts] = useState([]);
  const [initialOrderIds, setInitialOrderIds] = useState(new Set());

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
    if (['代金引換'].includes(paymentMethod)) return '領収書';
    if (['後日振込(請求書払い)'].includes(paymentMethod)) return '請求書';
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
  const otherKey = useMemo(() => {
    if (!ALLOCATION_MASTER) return null;
    // allocationMasterの中から、値が「その他」である項目のキーを探す
    return Object.keys(ALLOCATION_MASTER).find(key => 
      ALLOCATION_MASTER[key].address === 'その他'
    );
  }, [ALLOCATION_MASTER]);

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
    const data = await searchOrderAPI(receptionNumToSearch, selectedYear);

    const loadedCustomerInfo = data.customerInfo || {};
    const sanitizedCustomerInfo = {
      ...initialCustomerInfo, // まず全ての項目を空文字で初期化
      ...loadedCustomerInfo,  // 読み込んだデータで上書き
      contactName: loadedCustomerInfo.contactName || '',
      email: loadedCustomerInfo.email || '',
      fax: loadedCustomerInfo.fax || '',
      tel: loadedCustomerInfo.tel || '',
      companyName: loadedCustomerInfo.companyName || '',
      invoiceName: loadedCustomerInfo.invoiceName || '',
      address: loadedCustomerInfo.address || '',
      floorNumber: loadedCustomerInfo.floorNumber || '',
    };
    setCustomerInfo(sanitizedCustomerInfo);
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
    setInitialOrderIds(new Set(loadedOrders.map(o => o.orderId).filter(Boolean)));
    // ★★★ 支払いグループの処理を改善 ★★★
    const processedPaymentGroups = (data.paymentGroups || []).map(group => {
  // DBのpaymentDateは注文番号なので、そのまま使う
  return group; 
  // ※ もし古いデータ形式（日付）が残っている場合は、それをorderIdに変換するロジックは残してもOK
});

setPaymentGroups(processedPaymentGroups);

// ★★★ 領収書データの処理 ★★★
const loadedReceipts = (data.receipts || []).map(receipt => {
  // DBのissueDateは注文番号なので、そのまま使う
  return receipt;
  // ※ グループ経由でのissueDate設定ロジックも、注文番号をそのまま使うように修正
});
setManualReceipts(loadedReceipts);

    setManualReceipts(loadedReceipts);

    // UIの状態設定
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
const handleConfirmClick = () => {
  for (const order of orders) {
    // この注文にネタ変更があるか確認
    if (order.netaChanges) {
      // ネタ変更が設定されている各商品（極、匠など）をチェック
      for (const productKey in order.netaChanges) {
        // 1. ネタ変更の合計個数を計算
        const patterns = order.netaChanges[productKey] || [];
        const netaChangeSum = patterns.reduce((sum, pattern) => sum + (parseInt(pattern.quantity) || 0), 0);

        // 2. 対応する商品の注文数を取得
        const mainItem = order.orderItems.find(item => item.productKey === productKey);
        const mainQuantity = parseInt(mainItem?.quantity) || 0;

        // 3. もしネタ変更の合計が注文数を超えていたら、エラーを出して処理を中断
        if (netaChangeSum > mainQuantity) {
          const productName = mainItem?.name || `商品(${productKey})`;
          const orderIndex = orders.findIndex(o => o.id === order.id);
          
          alert(
            `注文 #${orderIndex + 1} の「${productName}」において、ネタ変更の合計個数（${netaChangeSum}個）が商品の注文数（${mainQuantity}個）を超えています。\n\n個数を確認してください。`
          );
          return; // ★ここで処理を中断させる
        }
      }
    }
  }
  // 1. キャンセルされていない有効な注文の合計金額を計算
  const activeOrders = orders.filter(o => o.orderStatus !== 'CANCELED');
  const grandTotal = activeOrders.reduce((total, order) => total + calculateOrderTotal(order), 0);

  // 2. 全ての領収書/請求書（finalReceipts）の合計金額を計算
  const receiptsTotal = finalReceipts.reduce((total, receipt) => total + (parseFloat(receipt.amount) || 0), 0);

  // 3. 金額が一致しない場合のみ、確認メッセージを表示
  if (grandTotal !== receiptsTotal) {
    const message = `全注文の合計金額 (¥${grandTotal.toLocaleString()}) と、発行される書類の合計金額 (¥${receiptsTotal.toLocaleString()}) が一致していません。\n\nこのまま更新を続けますか？`;
    
    // ユーザーが「キャンセル」を押した場合は、処理を中断
    if (!window.confirm(message)) {
      return; 
    }
  }

  // 4. 金額が一致している、またはユーザーが確認して「OK」を押した場合、確認モーダルを開く
  setIsConfirmationOpen(true);
};

const handleUpdate = async () => {
  // 1. キャンセルされていない有効な注文のみを抽出
  const activeOrders = orders.filter(order => order.orderStatus !== 'CANCELED');

  // 2. 有効な注文に最終的な注文番号を付与
  const ordersWithFinalId = activeOrders.map((order, index) => ({
    ...order,
    // 既存のorderIdがあればそれを使い、なければ新規生成する
    orderId: order.orderId || generateOrderNumber(order, receptionNumber, index)
  }));

  // ★ 修正: stateのデータが既に正しい形式なので、複雑な変換は不要
  // paymentGroups と receipts は、現在のstateをそのまま使用
  const transformedPaymentGroups = paymentGroupsWithTotals;
  const transformedReceipts = finalReceipts;

  // 3. バックエンドに送信するデータを作成
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
    // ★ 修正: APIモジュールを呼び出す
    await updateOrderAPI(receptionNumber, updatedData);

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

const handleCancelAll = async () => {
    if (!window.confirm(`受付番号「${receptionNumber}」の注文を本当にすべてキャンセルしますか？`)) return;
    setIsLoading(true);
    try {
      await cancelAllOrdersAPI(receptionNumber, { selectedYear });
      alert('注文をキャンセルしました。');
      resetForm();
    } catch (error) {
      console.error('キャンセル処理中にエラー:', error);
      alert(`エラー: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };


const handleDeleteOrCancelOrder = (orderToHandle) => {
  // 1. 現在キャンセルされていない有効な注文の数を数える
  const activeOrders = orders.filter(o => o.orderStatus !== 'CANCELED');
  
  // 2. もし有効な注文が残り1件で、かつその最後の1件をキャンセルしようとしている場合は処理を中断
  if (activeOrders.length <= 1 && orderToHandle.orderStatus !== 'CANCELED') {
    alert('有効な注文が最後の1件になるため、キャンセル予定にできません。\n受付全体をキャンセルする場合は、ページ下部の「この受付を全てキャンセル」ボタンを使用してください。');
    return; // ここで関数を終了
  }

  // どの注文かを判定するためのキーを定義
  const orderTempId = orderToHandle.id.toString();
  const orderLinkingKey = orderToHandle.orderId || orderTempId;
  
  // ★ 1. DBに保存済みの「既存注文」か、画面で追加しただけの「新規注文」かを判定
  const isPersistedOrder = initialOrderIds.has(orderToHandle.orderId);

  // =============================================================
  // ★ ケースA: 新規注文の場合 → 即座にリストから削除
  // =============================================================
  if (!isPersistedOrder) {
    if (orders.length <= 1) {
      return alert('最後の1件は削除できません。');
    }

    // 関連する支払いグループがあれば、警告して初期化
    const isOrderInPaymentGroup = paymentGroups.some(
      group => group.checkedOrderIds[orderTempId] || group.paymentDate === orderLinkingKey
    );
    if (isOrderInPaymentGroup) {
      alert("このご注文は支払いグループに設定されているため、支払いグループと関連する領収書を初期化します。");
      setPaymentGroups([]);
      setManualReceipts(prev => prev.filter(r => !r.groupId));
      setIsCombinedPaymentSummaryOpen(false);
    }
    
    // 注文リストから物理的に削除
    setOrders(prev => prev.filter(o => o.id !== orderToHandle.id));
    return;
  }

  // =============================================================
  // ケースB: 既存注文の場合 → 「キャンセル予定」としてマーク
  // =============================================================
  
  // ステータスを切り替える（キャンセル ⇔ 有効）
  const nextStatus = orderToHandle.orderStatus === 'CANCELED' ? undefined : 'CANCELED';
  setOrders(prev => 
    prev.map(o => 
      o.id === orderToHandle.id ? { ...o, orderStatus: nextStatus } : o
    )
  );

  // 「キャンセル予定」にする場合のみ、クリーンアップ処理を実行
  if (nextStatus === 'CANCELED') {
    let nextManualReceipts = manualReceipts;

    // --- 支払いグループのクリーンアップ ---
    const isOrderInPaymentGroup = paymentGroups.some(
      group => group.checkedOrderIds[orderTempId] || group.paymentDate === orderLinkingKey
    );
    if (isOrderInPaymentGroup) {
      alert("キャンセル予定の注文が支払いグループに含まれていたため、支払いグループと関連領収書を初期化します。\n変更を確定するには、最後に「更新」ボタンを押してください。");
      setPaymentGroups([]);
      // グループに紐づいていた自動生成の領収書を削除
      nextManualReceipts = nextManualReceipts.filter(r => !r.groupId);
    }

    // ★★★ 修正箇所 ★★★
    // --- 支払いグループとは無関係の領収書のクリーンアップ ---
    // キャンセルされた注文を発行日としていた領収書を「リストから削除」する
    const finalReceipts = nextManualReceipts.filter(r => r.issueDate !== orderLinkingKey);

    // 最終的な領収書リストをstateにセット
    setManualReceipts(finalReceipts);
  }
};

  const handleCustomerInfoChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCustomerInfo(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // page.js

const updateOrder = useCallback((orderId, updatedFields) => {
  const originalOrder = orders.find(o => o.id === orderId);
  if (!originalOrder) return;

  let newOrderId = null;
  const oldOrderId = originalOrder.orderId;

  // --- 1. 注文番号が変更されるかチェック ---
  if (updatedFields.orderDate && updatedFields.orderDate !== originalOrder.orderDate) {
    const orderIndex = orders.findIndex(o => o.id === orderId);
    const tempOrderForIdGeneration = { ...originalOrder, ...updatedFields };
    const generatedId = generateOrderNumber(tempOrderForIdGeneration, receptionNumber, orderIndex);
    
    if (generatedId !== '---') {
      newOrderId = generatedId;
      updatedFields.orderId = newOrderId;
    }
  }

  // --- 2. 注文番号が変更された場合の処理 ---
  if (oldOrderId && newOrderId) {
    let wasReferencedInPaymentGroup = false;
    let wasReferencedInReceipt = false;

    // 2-1. 支払いグループをチェックし、必要ならリセット
    const nextPaymentGroups = paymentGroups.map(group => {
      if (group.paymentDate === oldOrderId) {
        wasReferencedInPaymentGroup = true;
        return { ...group, paymentDate: '' }; // 支払日をリセット
      }
      return group;
    });

    // 2-2. 領収書をチェックし、必要ならリセット
    const nextManualReceipts = manualReceipts.map(receipt => {
      if (receipt.issueDate === oldOrderId) {
        wasReferencedInReceipt = true;
        return { ...receipt, issueDate: '' }; // 発行日をリセット
      }
      return receipt;
    });

    // 2-3. もし参照されていたら、警告を表示し、Stateを更新
    if (wasReferencedInPaymentGroup || wasReferencedInReceipt) {
      // ユーザーのリクエストに合わせて警告メッセージを調整
      alert("支払いグループの支払いをする注文が変更されました。\n関連する日付設定が初期化されますので、再度設定してください。");
      
      setPaymentGroups(nextPaymentGroups);
      setManualReceipts(nextManualReceipts);
    }
  }

  // --- 3. 最後にordersのStateを更新 ---
  setOrders(prev =>
    prev.map(o =>
      o.id === orderId
        ? { ...o, ...updatedFields }
        : o
    )
  );

}, [orders, receptionNumber, generateOrderNumber, paymentGroups, manualReceipts, setPaymentGroups, setManualReceipts]);
  

  const addOrder = useCallback(() => {
    setOrders(prev => [...prev, createNewOrder()]);
  }, [createNewOrder]);


  const calculateOrderTotal = useCallback((order) => {
    const mainTotal = (order.orderItems || []).reduce((total, item) => total + ((parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity) || 0)), 0);
    const sideTotal = (order.sideOrders || []).reduce((total, item) => {
      const price = SIDE_ORDERS_DB[item.productKey]?.price || 0;
      return total + (price * (parseInt(item.quantity) || 0));
    }, 0);
    return mainTotal + sideTotal;
  }, [SIDE_ORDERS_DB]);

  const calculateGrandTotal = useCallback(() => orders.reduce((total, order) => total + calculateOrderTotal(order), 0), [orders, calculateOrderTotal]);

  const orderTotalsJson = useMemo(() => {
  // 各注文のIDと合計金額をオブジェクトにまとめる
  const totalsMap = orders.reduce((acc, order) => {
    // 変更中もユニークな「id」をキーにする
    acc[order.id] = calculateOrderTotal(order);
    return acc;
  }, {});
  // オブジェクトをJSON文字列に変換する。これにより、金額の変更があった場合のみ値が変わる。
  return JSON.stringify(totalsMap);
}, [orders, calculateOrderTotal]);


// 2. 監視対象を「orders」から「orderTotalsJson」に変更したuseEffect
useEffect(() => {
  if (paymentGroups && paymentGroups.length > 0) {
    return;
  }
  const autoLinkedReceipts = manualReceipts.filter(r => 
    !r.isAmountManuallyEdited && 
    !r.isIssueDateManuallyEdited && 
    r.issueDate
  );
  
  if (autoLinkedReceipts.length === 0) {
    return; 
  }

  let hasChanged = false;
  const nextReceipts = manualReceipts.map(receipt => {
    if (
      !receipt.isAmountManuallyEdited && 
      !receipt.isIssueDateManuallyEdited && 
      receipt.issueDate
    ) {
      const linkedOrder = orders.find(o => (o.orderId || o.id) == receipt.issueDate);

      if (linkedOrder) {
        const currentOrderTotal = calculateOrderTotal(linkedOrder);

        if (parseFloat(receipt.amount) !== currentOrderTotal) {
          hasChanged = true;
          return { ...receipt, amount: currentOrderTotal.toString() }; 
        }
      }
    }
    return receipt;
  });

  if (hasChanged) {
    setManualReceipts(nextReceipts);
  }
  // ★ 依存配列の主要な監視対象を orderTotalsJson に変更
}, [orderTotalsJson, manualReceipts, orders, calculateOrderTotal, setManualReceipts]);
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
const updatePaymentGroup = (id, field, value) => {
  setPaymentGroups(prevGroups =>
    prevGroups.map(group => {
      if (group.id === id) {
        const updatedGroup = { ...group, [field]: value };

        // 支払日変更なら関連する領収書の発行日も更新
        if (field === 'paymentDate') {
          // ★★★ 修正箇所 ★★★
          // valueには選択された注文のIDが直接入っているため、
          // これをそのまま領収書の発行日(issueDate)にセットします。
          setManualReceipts(prevReceipts =>
            prevReceipts.map(receipt => {
              // このグループに関連する領収書で、手動編集されていない場合のみ更新
              if ((receipt.groupId === id || receipt.paymentGroupId === id) && 
                  !receipt.isIssueDateManuallyEdited) {
                return { 
                  ...receipt, 
                  issueDate: value, // ★ 日付ではなく、注文ID(value)を直接セット
                  linkedPaymentDate: value 
                };
              }
              return receipt;
            })
          );
        }

        return updatedGroup;
      }
      return group;
    })
  );
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
    const purelyManualReceipts = manualReceipts.filter(r => !r.groupId && !r.paymentGroupId);
    if (manualReceipts.length !== purelyManualReceipts.length) {
        setManualReceipts(purelyManualReceipts);
    }
    return;
  }

  // 2. ユーザーが完全に手動で追加した領収書（グループIDを持たない）を抽出
  const purelyManualReceipts = manualReceipts.filter(r => !r.groupId && !r.paymentGroupId);

  // 3. 現在の支払いグループを元に、領収書を自動生成
  const autoGeneratedReceipts = paymentGroupsWithTotals.map(group => {
    const docType = getDocumentType(customerInfo.paymentMethod) || '領収書';
    const existingReceipt = manualReceipts.find(r => 
      r.groupId === group.id || r.paymentGroupId === group.id
    );

    // ★ 修正: group.paymentDateにはリンクキー(orderId等)が直接入っているため、それをそのまま使う
    const autoIssueDate = group.paymentDate || '';

    // 既存の領収書がある場合は、手動編集された値を保持
    if (existingReceipt) {
      return {
        ...existingReceipt,
        groupId: group.id, // グループIDを確実に設定
        // 金額は手動編集されていない場合のみ更新
        amount: existingReceipt.isAmountManuallyEdited 
                ? existingReceipt.amount 
                : group.total,
        // ★ 修正: 発行日は手動編集されている場合は既存値を保持、そうでなければ正しいキー(autoIssueDate)を自動設定
        issueDate: existingReceipt.isIssueDateManuallyEdited 
                   ? existingReceipt.issueDate
                   : autoIssueDate,
        linkedPaymentDate: group.paymentDate // 連動している支払日を記録
      };
    }

    // 新規の場合は自動設定
    return {
      id: group.id,
      groupId: group.id,
      documentType: docType,
      // ★ 修正: 正しいキー(autoIssueDate)をセット
      issueDate: autoIssueDate,
      recipientName: customerInfo.invoiceName,
      amount: group.total,
      isAmountManuallyEdited: false,
      isIssueDateManuallyEdited: false,
      linkedPaymentDate: group.paymentDate // 連動している支払日を記録
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
             (receipt.groupId || receipt.paymentGroupId) !== (newReceipt.groupId || newReceipt.paymentGroupId);
    });

  if (hasChanged) {
    setManualReceipts(newFinalReceipts);
  }

}, [paymentGroupsWithTotals, customerInfo.paymentMethod, customerInfo.invoiceName, orders]);

  const customerFullAddress = useMemo(() => {
  if (!customerInfo.address) return '';

  // ★★★ 階数が0より大きい有効な数値の場合のみ「F」を追加する ★★★
  const floor = parseInt(customerInfo.floorNumber, 10);
  if (!isNaN(floor) && floor > 0) {
    return `${customerInfo.address} ${floor}F`;
  }
  
  // それ以外の場合は、住所のみを返す
  return customerInfo.address;
}, [customerInfo.address, customerInfo.floorNumber]);

  const handleLocationSelect = useCallback((prefix) => {
  setAllocationNumber(prefix);
  
  // ★★★ 「その他」のキーと比較する形に修正 ★★★
  if (prefix && prefix !== otherKey) {
    const allocationData = ALLOCATION_MASTER[prefix];
    setCustomerInfo(prev => ({
      ...prev,
      address: allocationData?.address || '',
      floorNumber: '',
    }));
  } else {
    // ★★★ 「その他」が選択されたら、住所は空にして手入力できるようにする ★★★
    setCustomerInfo(prev => ({
      ...prev,
      address: '', 
      floorNumber: '',
    }));
  }
}, [ALLOCATION_MASTER, otherKey]);

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
        
        // 発行日が変更された場合は、手動編集フラグを立てる
        if (field === 'issueDate') {
          updatedReceipt.isIssueDateManuallyEdited = true;
          // 手動編集された場合は、支払いグループとの連動を解除
          delete updatedReceipt.linkedPaymentDate;
        }
        
        // 手動編集フラグの設定（新規追加）
        if (field === 'isIssueDateManuallyEdited') {
          updatedReceipt.isIssueDateManuallyEdited = value;
          if (value) {
            // 手動編集モードに切り替えた場合、連動を解除
            delete updatedReceipt.linkedPaymentDate;
          }
        }
        
        return updatedReceipt;
      }
      return r;
    }));
  };

  const finalReceipts = useMemo(() => {
    // Priority 1: ユーザーが手動で詳細を指定した場合は、それを最優先する
    if (manualReceipts.length > 0) {
      return manualReceipts;
    }

    // Priority 2: 「まとめてお支払い」が設定されている場合は、グループに基づき自動生成
    if (paymentGroupsWithTotals.length > 0) {
      return paymentGroupsWithTotals.map(group => {
        const docType = getDocumentType(customerInfo.paymentMethod) || '領収書';
        return {
          id: group.id,
          groupId: group.id,
          documentType: docType,
          issueDate: group.paymentDate || '', // リンクキー(orderId)
          recipientName: customerInfo.invoiceName,
          amount: group.total,
        };
      });
    }

    // Priority 3: 上記以外の場合、注文ごとに領収書を自動生成（新規追加するロジック）
    const docType = getDocumentType(customerInfo.paymentMethod);
    // 書類種別と宛名が設定されている場合のみ実行
    if (docType && customerInfo.invoiceName) {
      // キャンセルされていない有効な注文のみを対象にする
      const activeOrders = orders.filter(o => o.orderStatus !== 'CANCELED');
      
      return activeOrders.map((order, index) => ({
        id: order.id,
        documentType: docType,
        // 発行日には、最終的な注文番号(orderId)を使用
        issueDate: order.orderId || generateOrderNumber(order, receptionNumber, index),
        recipientName: customerInfo.invoiceName,
        amount: calculateOrderTotal(order)
      }));
    }

    // 上記のいずれの条件にも当てはまらない場合は、空のリストを返す
    return [];

  }, [
    manualReceipts, 
    paymentGroupsWithTotals, 
    orders, 
    customerInfo, 
    getDocumentType, 
    calculateOrderTotal, 
    receptionNumber, 
    generateOrderNumber
  ]);
  
  if (loading) return <h4>設定データを読み込んでいます...</h4>;
  if (error) return <h4 style={{color: 'red'}}>エラー: {error}</h4>;
  if (!configuration) return <h4>表示する設定年を選択してください。</h4>;

  return (
    <div className={isModalMode ? "modal-page-container" : "main-container"}>
      {isConfirmationOpen && ( <ConfirmationModal onClose={() => setIsConfirmationOpen(false)} onSubmit={handleUpdate} customerInfo={customerInfo} orders={orders.filter(o => o.orderStatus !== 'CANCELED')}  receptionNumber={receptionNumber} allocationNumber={allocationNumber} calculateOrderTotal={calculateOrderTotal} generateOrderNumber={generateOrderNumber} calculateGrandTotal={calculateGrandTotal} isPaymentOptionsOpen={isPaymentOptionsOpen} SIDE_ORDERS_DB={SIDE_ORDERS_DB} receipts={finalReceipts} paymentGroups={paymentGroupsWithTotals} orderType="変更" globalNotes={globalNotes}/> )}
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
              isOtherSelected={allocationNumber === otherKey}
        />
            {orders.map((order, index) => {
              const orderNumberDisplay = order.orderId || '（新規追加）';
              return (
                <SingleOrderSection
                  key={order.id || order.orderId}
                  order={order}
                  orderIndex={index}
                  updateOrder={updateOrder}
                  isDeletable={true} // 常にボタンを表示
                  deleteOrder={() => handleDeleteOrCancelOrder(order)}
                  PRODUCTS={PRODUCTS}
                  SIDE_ORDERS_DB={SIDE_ORDERS_DB}
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
                                    <option key={order.id} value={order.orderId || order.id}>
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
                    <option key={order.id} value={order.orderId || order.id}>
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
              <button 
                type="button" 
                onClick={handleCancelAll} 
                className="cancel-btn"
                disabled={!receptionNumber || isLoading}
              >
                この受付を全てキャンセル
              </button>
              <button 
                type="button" 
                onClick={handleConfirmClick} 
                className="confirm-btn"
                disabled={isLoading}
              >
  この内容で更新を確認
</button>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default ChangeOrderPage;
                                