"use client";
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useConfiguration } from './contexts/ConfigurationContext'; // ★ 1. パスを修正
import { Send, Plus, X as CloseIcon, Trash2 } from 'lucide-react';
import CustomerInfoSection from '../components/CustomerInfoSection';
import SingleOrderSection from '../components/SingleOrderSection';
import ConfirmationModal from '../components/ConfirmationModal';
import * as orderApi from './lib/orderApi';

const OrderForm = () => {
  const { configuration, loading, error, selectedYear, changeYear } = useConfiguration();

  const PRODUCTS = useMemo(() => (configuration?.products || {}), [configuration]);
  const SIDE_ORDERS_DB = useMemo(() => (configuration?.specialMenus || {}), [configuration]);
  const ALLOCATION_MASTER = useMemo(() => (configuration?.allocationMaster || {}), [configuration]);
  const deliveryDates = useMemo(() => (configuration?.deliveryDates || []), [configuration]);
  const deliveryTimes = useMemo(() => (configuration?.deliveryTimes || []), [configuration]);

  const initialCustomerInfo = {
    contactName: '', email: '', fax: '', tel: '', companyName: '',
    paymentMethod: '', invoiceName: '', address: '', floorNumber: '',
    useCombinedPayment: false,
  };


  // createNewOrderはPRODUCTSに依存するため、useMemoでPRODUCTSが更新されるたびに再生成
  const createNewOrder = useMemo(() => {
    return () => ({
      id: Date.now(), orderDate: '', orderTime: '', deliveryAddress: '', deliveryMethod: '', isSameAddress: true,
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
  const [globalNotes, setGlobalNotes] = useState('');
  const [confirmedData, setConfirmedData] = useState(null);



  useEffect(() => {
    if (configuration && orders.length === 0) {
      setOrders([createNewOrder()]);
    }
  }, [configuration, createNewOrder]);

  const getDocumentType = (paymentMethod) => {
    if (['現金'].includes(paymentMethod)) return '領収書';
    if (['請求書払い'].includes(paymentMethod)) return '請求書';
    return '';
  };

  const isInitialMount = React.useRef(true);

  // 注文内容(orders)が変更されたら、領収書詳細をリセットするuseEffect
  useEffect(() => {
    // 初回マウント時（DBからのデータロード時）は何もしない
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // ユーザーの操作によって注文内容が変更された場合のみ、
    // 領収書の詳細指定をリセットして、金額の不整合を防ぐ
    console.log("注文内容が変更されたため、領収書・請求書の詳細を初期化します。");
    setManualReceipts([]);

    // 「まとめてお支払い」が設定されている場合は、それもリセットする
    // （合計金額が変わるため）

  }, [orders]);

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
    setGlobalNotes('');
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  };



  const handleCustomerInfoChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCustomerInfo(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const updateOrder = useCallback((orderId, updatedFields) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updatedFields } : o));
  }, []); // 空の依存配列[]を指定すると、この関数は最初に一度しか作られない

  // ★ (推奨) 他の関数も同様にラップしておくと、より安全になります
  const addOrder = useCallback(() => {
    setOrders(prev => [...prev, createNewOrder()]);
  }, [createNewOrder]);

  const deleteOrder = useCallback((orderId) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  }, []);

  const calculateOrderTotal = (order) => {
    const mainTotal = (order.orderItems || []).reduce((total, item) => total + ((parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity) || 0)), 0);
    const sideTotal = (order.sideOrders || []).reduce((total, item) => {
      const price = SIDE_ORDERS_DB[item.productKey]?.price || 0;
      return total + (price * (parseInt(item.quantity) || 0));
    }, 0);
    return mainTotal + sideTotal;
  };
  const calculateGrandTotal = () => orders.reduce((total, order) => total + calculateOrderTotal(order), 0);

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
    const finalQuantity = parseInt(String(quantity).replace(/[０-９]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xFEE0)), 10) || "";

    setOrders(prevOrders => prevOrders.map(order => {
      if (order.id === orderId) {
        const updatedSideOrders = order.sideOrders
          .map(item => item.productKey === productKey ? { ...item, quantity: finalQuantity } : item);

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

  // 修正: 支払日変更時に対応する領収書の発行日も自動更新
  const updatePaymentGroup = (groupId, field, value) => {
    // 支払いグループの更新
    setPaymentGroups(prev => prev.map(group => group.id === groupId ? { ...group, [field]: value } : group));

    // 支払日が変更された場合、対応する領収書の発行日も自動更新
    if (field === 'paymentDate') {
      // 対応する注文を検索（valueはorder.id文字列）
      const correspondingOrder = orders.find(o => o.id === parseInt(value, 10));

      // 領収書の発行日を更新
      setManualReceipts(prev => prev.map(receipt => {
        // このグループに関連する領収書で、手動編集されていない場合のみ更新
        if (receipt.groupId === groupId && !receipt.isIssueDateManuallyEdited) {
          return {
            ...receipt,
            issueDate: (correspondingOrder && correspondingOrder.orderDate)
              ? correspondingOrder.orderDate
              : ''
          };
        }
        return receipt;
      }));
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

    // --- 以下、支払いグループが存在する場合の同期処理 ---

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
            : ((group.paymentDate) // group.paymentDateはorder.idなので、そのまま使う
              ? group.paymentDate
              : existingReceipt.issueDate || ''),
        };
      }

      // 新規の場合は自動設定
      return {
        id: group.id,
        groupId: group.id, // グループと連動している目印
        documentType: docType,
        issueDate: group.paymentDate || '',
        recipientName: customerInfo.invoiceName,
        amount: group.total,
        isAmountManuallyEdited: false,
        isIssueDateManuallyEdited: false, // 新規作成時は手動編集フラグをfalseに設定
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


  const customerFullAddress = useMemo(() => {
    if (!customerInfo.address) return '';
    return customerInfo.floorNumber
      ? `${customerInfo.address} ${customerInfo.floorNumber}F`
      : customerInfo.address;
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
    const newReceipt = { id: Date.now(), issueDate: '', recipientName: '', amount: '', documentType: '領収書' };
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

        // 発行日が手動で変更された場合は、手動編集フラグを立てる
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

  const generateOrderNumber = (order, receptionNum, index) => {
    if (!receptionNum || receptionNum === 'エラー' || !order.orderDate) {
      return '---';
    }
    try {
      // ★ YYYY-MM-DD のような形式を想定し、末尾2桁（日付）を取得
      const day = order.orderDate.split('/')[2].padStart(2, '0');
      const orderSequence = (index + 1).toString();
      return `${day}${receptionNum}${orderSequence}`;
    } catch (e) {
      // もし予期せぬ日付形式でもエラーにならないようにする
      console.error("Date format error:", order.orderDate);
      return '---';
    }
  };

  // handleOpenConfirmation 関数の全文を以下に置き換えてください
  const handleOpenConfirmation = async () => {
    if (!customerInfo.floorNumber) {
      customerInfo.floorNumber = '0';
    }
    if (!allocationNumber) {
      alert('住所を選択してください。');
      return;
    }

    try {
      // APIライブラリの関数を呼び出す
      const data = await orderApi.generateReceptionNumberAPI(allocationNumber, customerInfo.floorNumber, selectedYear);
      const newReceptionNumber = data.receptionNumber;
      setReceptionNumber(newReceptionNumber);

      const ordersWithFinalId = orders.map((order, index) => ({
        ...order,
        orderId: generateOrderNumber(order, newReceptionNumber, index)
      }));

      const transformedReceipts = (manualReceipts.length > 0 ? manualReceipts : autoGeneratedReceipts).map(receipt => {
        if (!receipt.issueDate) {
          return receipt;
        }

        // ★★★ 修正: order.id でマッチング ★★★
        const correspondingOrderIndex = orders.findIndex(o =>
          o.id.toString() === receipt.issueDate.toString()
        );

        const correspondingOrder = orders[correspondingOrderIndex];

        if (correspondingOrder) {
          const finalOrderNumber = generateOrderNumber(correspondingOrder, newReceptionNumber, correspondingOrderIndex);
          if (finalOrderNumber !== '---') {
            return { ...receipt, issueDate: finalOrderNumber, linkedOrderId: finalOrderNumber };
          }
        }

        return receipt;
      });

      const transformedPaymentGroups = paymentGroupsWithTotals.map(group => {
        const correspondingOrderIndex = orders.findIndex(o => o.id === parseInt(group.paymentDate, 10));
        const correspondingOrder = orders[correspondingOrderIndex];
        if (correspondingOrder) {
          const finalOrderNumber = generateOrderNumber(correspondingOrder, newReceptionNumber, correspondingOrderIndex);
          if (finalOrderNumber !== '---') {
            return { ...group, paymentDate: finalOrderNumber };
          }
        }
        return group;
      });

      // 変換したデータをStateに保存
      setConfirmedData({
        orders: ordersWithFinalId,
        receipts: transformedReceipts,
        paymentGroups: transformedPaymentGroups,
      });

      setIsConfirmationOpen(true); // 最後にモーダルを開く

    } catch (error) {
      console.error("受付番号の取得に失敗しました:", error);
      alert("受付番号の自動生成に失敗しました。管理者にお問い合わせください。");
      setReceptionNumber('エラー');
    }
  };
  const handleSubmit = async () => {
    const finalData = {
      selectedYear: selectedYear,
      customer: customerInfo,
      orders: confirmedData.orders,
      receptionNumber,
      allocationNumber,
      paymentGroups: confirmedData.paymentGroups,
      receipts: confirmedData.receipts,
      orderType: '新規注文',
      globalNotes: globalNotes,
    };

    try {
      // APIライブラリの関数を呼び出す
      await orderApi.saveOrderAPI(finalData);

      if (isConfirmationOpen) setIsConfirmationOpen(false);
      setConfirmedData(null);
      alert('注文が正常に送信されました。');
      resetForm();

    } catch (error) {
      // ★ APIから重複エラーが返ってきた場合の処理
      if (error.name === 'ReceptionNumberConflictError') {
        alert(`他端末と注文が重複したため、処理を中断しました。\nお手数ですが、再度注文内容を確認ボタンを押してください。`);
        setIsConfirmationOpen(false);
      } else {
        // その他の通常エラー
        console.error('注文の送信中にエラーが発生しました:', error);
        alert(`エラー: ${error.message}`);
      }
    }
  };
  /**
  * 注文内容の整合性を検証する関数
  * @returns {boolean} - 問題がなければtrue、あればfalseを返す
  */
  const validateOrderDetails = () => {
    // --- 検証1: ネタ変更の個数が合計を超えていないかチェック ---
    for (const order of orders) {
      if (order.netaChanges) {
        for (const productKey in order.netaChanges) {
          const patterns = order.netaChanges[productKey] || [];
          const netaChangeSum = patterns.reduce((sum, pattern) => sum + (parseInt(pattern.quantity) || 0), 0);
          const mainItem = order.orderItems.find(item => item.productKey === productKey);
          const mainQuantity = parseInt(mainItem?.quantity) || 0;

          if (netaChangeSum > mainQuantity) {
            const productName = mainItem?.name || `商品(${productKey})`;
            const orderIndex = orders.findIndex(o => o.id === order.id);
            alert(`注文 #${orderIndex + 1} の「${productName}」において、ネタ変更の合計個数（${netaChangeSum}個）が商品の注文数（${mainQuantity}個）を超えています。\n\n個数を確認してください。`);
            return false; // 問題があったのでfalseを返して終了
          }
        }
      }
    }

    // --- 検証2: 注文合計と書類合計の金額が一致しているかチェック ---
    const activeOrders = orders.filter(o => o.orderStatus !== 'CANCELED');
    const grandTotal = activeOrders.reduce((total, order) => total + calculateOrderTotal(order), 0);
    const receiptsTotal = finalReceipts.reduce((total, receipt) => total + (parseFloat(receipt.amount) || 0), 0);

    if (grandTotal !== receiptsTotal) {
      const message = `全注文の合計金額 (¥${grandTotal.toLocaleString()}) と、発行される書類の合計金額 (¥${receiptsTotal.toLocaleString()}) が一致していません。\n\nこのまま登録を続けますか？`;
      // ユーザーが「キャンセル」を押した場合は、falseを返して終了
      if (!window.confirm(message)) {
        return false;
      }
    }

    // --- 全ての検証をクリア ---
    return true; // 問題がなかったのでtrueを返す
  };
  const handleNewOrderConfirm = () => {
    // 作成した検証関数を呼び出す
    const isFormValid = validateOrderDetails();

    // 検証が成功した場合（trueが返ってきた場合）のみ、handleOpenConfirmationを呼び出す
    if (isFormValid) {
      handleOpenConfirmation(); // ここで指定の関数を呼び出す
    }
  };


  if (loading) return <h4>設定データを読み込んでいます...</h4>;
  if (error) return <h4 style={{ color: 'red' }}>エラー: {error}</h4>;
  if (!configuration) return <h4>表示する設定年を選択してください。</h4>;

  return (
    <div className="main-container">
      {isConfirmationOpen && confirmedData && ( // ★ confirmedDataが存在する場合のみ表示
        <ConfirmationModal
          onClose={() => setIsConfirmationOpen(false)}
          onSubmit={handleSubmit}
          customerInfo={customerInfo}
          receptionNumber={receptionNumber}
          allocationNumber={allocationNumber}
          calculateOrderTotal={calculateOrderTotal}
          generateOrderNumber={generateOrderNumber}
          calculateGrandTotal={calculateGrandTotal}
          isPaymentOptionsOpen={isPaymentOptionsOpen}
          SIDE_ORDERS_DB={SIDE_ORDERS_DB}
          orderType="新規注文"
          globalNotes={globalNotes}
          // ★★★ ここを修正 ★★★
          orders={confirmedData.orders}
          receipts={confirmedData.receipts}
          paymentGroups={confirmedData.paymentGroups}
        />
      )}
      <div className="main-content">
        <div className="form-container">
          <div className="form-header"> <h1 className="form-title">注文フォーム</h1> </div>
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
              const orderNumberDisplay = generateOrderNumber(order, receptionNumber, index);
              return (
                <SingleOrderSection
                  key={order.id}
                  order={order}
                  orderIndex={index}
                  updateOrder={updateOrder}
                  deleteOrder={() => deleteOrder(order.id)}
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
                  <div className="payment-info-field">
                    <label className="payment-info-label">
                      支払い方法
                      <span className="required-mark">*</span>
                    </label>
                    <select name="paymentMethod"
                      value={customerInfo.paymentMethod}
                      onChange={handleCustomerInfoChange}
                      className="payment-info-select">
                      <option value="">選択してください</option>
                      <option value="現金">代金引換</option>
                      <option value="請求書払い">後日振込(請求書払い)</option>
                    </select>
                  </div>
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
                              <select value={group.paymentDate} onChange={(e) => updatePaymentGroup(group.id, 'paymentDate', e.target.value)} className="combined-payment-select" >
                                <option value="">支払日を選択</option>
                                {orders.map((order, index) => (
                                  // 日付が設定されている注文のみをオプションとして表示
                                  order.orderDate && (
                                    <option key={order.id} value={order.id}>
                                      注文#{index + 1} ({order.orderDate})
                                    </option>
                                  )
                                ))}
                              </select>
                            </div>
                            <div className="order-checklist-container">
                              <p>この日にお支払いをする注文を選択:</p>
                              {orders.map((order, orderIndex) => ( // ★ `orderIndex` をここで取得
                                <div key={order.id} className="order-checklist-item">
                                  <input type="checkbox" id={`order-check-${group.id}-${order.id}`} checked={!!group.checkedOrderIds[order.id]} onChange={() => handleGroupOrderCheck(group.id, order.id)} />
                                  <label htmlFor={`order-check-${group.id}-${order.id}`}> {generateOrderNumber(order, receptionNumber, orderIndex)} ({order.orderDate || '日付未定'}) - ¥{calculateOrderTotal(order).toLocaleString()} </label>
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
                              <button onClick={() => removeReceipt(receipt.id)} className="remove-group-btn"><Trash2 size={16} /></button>
                            </div>
                            <div className="receipt-input-grid">
                              <div className="combined-payment-field">
                                <label className="combined-payment-label">種別</label>
                                <select className="combined-payment-select" value={receipt.documentType} onChange={(e) => updateReceipt(receipt.id, 'documentType', e.target.value)} >
                                  <option value="領収書">領収書</option>
                                  <option value="請求書">請求書</option>
                                </select>
                              </div>
                              <div className="combined-payment-field">
                                <label className="combined-payment-label">発行日</label>
                                <select className="combined-payment-select" value={receipt.issueDate} onChange={(e) => updateReceipt(receipt.id, 'issueDate', e.target.value)}>
                                  <option value="">発行日を選択</option>
                                  {orders.map((order, index) => (
                                    // 日付が設定されている注文のみをオプションとして表示
                                    order.orderDate && (
                                      <option key={order.id} value={order.id}>
                                        注文#{index + 1} ({order.orderDate})
                                      </option>
                                    )
                                  ))}
                                </select>
                              </div>
                              <div className="combined-payment-field">
                                <label className="combined-payment-label">宛名</label>
                                <input type="text" className="payment-info-input" placeholder="株式会社○○○" value={receipt.recipientName} onChange={(e) => updateReceipt(receipt.id, 'recipientName', e.target.value)} />
                              </div>
                              <div className="combined-payment-field">
                                <label className="combined-payment-label">金額</label>
                                <input type="number" className="payment-info-input" placeholder="0" value={receipt.amount} onChange={(e) => updateReceipt(receipt.id, 'amount', e.target.value)} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={addReceipt} className="add-group-btn"> <Plus size={16} /> 領収書/請求書を追加 </button>
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
              <button type="button" onClick={handleNewOrderConfirm} className="confirm-btn"> 注文内容を確認 </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default OrderForm;