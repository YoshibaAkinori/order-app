"use client";
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useConfiguration } from './contexts/ConfigurationContext'; // ★ 1. パスを修正
import { Send, Plus, X as CloseIcon, Trash2 } from 'lucide-react';
import CustomerInfoSection from '../components/CustomerInfoSection';
import SingleOrderSection from '../components/SingleOrderSection';
import ConfirmationModal from '../components/ConfirmationModal';
import { generateEmailHtml } from '../utils/emailGenerator';

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

  const [customerInfo, setCustomerInfo] = useState(initialCustomerInfo);
  const [orders, setOrders] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPaymentOptionsOpen, setIsPaymentOptionsOpen] = useState(false);
  const [isCombinedPaymentSummaryOpen, setIsCombinedPaymentSummaryOpen] = useState(false);
  const [allocationNumber, setAllocationNumber] = useState('');
  const [receptionNumber, setReceptionNumber] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [paymentGroups, setPaymentGroups] = useState([]);
  const [isReceiptDetailsOpen, setIsReceiptDetailsOpen] = useState(false);
  const [manualReceipts, setManualReceipts] = useState([]);
  const [globalNotes, setGlobalNotes] = useState(''); 


  
 useEffect(() => {
    if (configuration && orders.length === 0) {
      setOrders([createNewOrder()]);
    }
  }, [configuration, createNewOrder]);

  const getDocumentType = (paymentMethod) => {
    if (['現金', 'クレジットカード'].includes(paymentMethod)) return '領収書';
    if (['銀行振込', '請求書払い'].includes(paymentMethod)) return '請求書';
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
  const updatePaymentGroup = (groupId, field, value) => {
    setPaymentGroups(prev => prev.map(group => group.id === groupId ? { ...group, [field]: value } : group));
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
      const existingReceipt = manualReceipts.find(r => r.id === group.id);

      return {
        id: group.id,
        groupId: group.id, // グループと連動している目印
        documentType: docType,
        issueDate: group.paymentDate,
        recipientName: customerInfo.invoiceName,
        // 手動で金額が編集されていればその値を維持し、そうでなければ自動計算された合計額を使う
        amount: (existingReceipt && existingReceipt.isAmountManuallyEdited)
                  ? existingReceipt.amount
                  : group.total,
        isAmountManuallyEdited: (existingReceipt && existingReceipt.isAmountManuallyEdited) || false,
      };
    });

    // 4. 自動生成されたリストと、完全に手動のリストを結合
    const newFinalReceipts = [...autoGeneratedReceipts, ...purelyManualReceipts];

    // 5. 最終的なリストが現在のものと異なる場合のみ、更新をかけて無限ループを防ぐ
    if (JSON.stringify(manualReceipts) !== JSON.stringify(newFinalReceipts)) {
      setManualReceipts(newFinalReceipts);
    }

  }, [paymentGroupsWithTotals, customerInfo,manualReceipts]);
  
  
  const customerFullAddress = useMemo(() => {
    if (!customerInfo.address) return '';
    return customerInfo.floorNumber
      ? `${customerInfo.address} ${customerInfo.floorNumber}F`
      : customerInfo.address;
  }, [customerInfo.address, customerInfo.floorNumber]);

  const handleLocationSelect = useCallback((prefix) => {
    setAllocationNumber(prefix);
    
    let newAddress = '';
    
    if (prefix && prefix !== 'その他') {
      const allocationData = ALLOCATION_MASTER[prefix];
      if (allocationData) {
        newAddress = allocationData.address || '';
      }
    }
    
    setCustomerInfo(prev => ({
      ...prev,
      address: newAddress,
      floorNumber: '',
    }));
  }, [ALLOCATION_MASTER]);

  
  
 
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
        // ★ 金額が変更されたら、手動編集フラグを立てる
        if (field === 'amount') {
          updatedReceipt.isAmountManuallyEdited = true;
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

  const handleOpenConfirmation = async () => {
    if(!customerInfo.floorNumber){
      customerInfo.floorNumber = 0;
    }
    if (!allocationNumber) {
      alert('住所を選択してください。');
      return;
    }
    try {
      const apiUrl = `https://viy41bgkvd.execute-api.ap-northeast-1.amazonaws.com/reception-number?allocation=${allocationNumber}&floor=${customerInfo.floorNumber}`;
      console.log('受付番号APIを呼び出します:', apiUrl);
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error('受付番号の取得APIからの応答が異常です');
      }
      const data = await response.json();
      setReceptionNumber(data.receptionNumber); 
      setIsConfirmationOpen(true);
    } catch (error) {
      console.error("受付番号の取得に失敗しました:", error);
      alert("受付番号の自動生成に失敗しました。管理者にお問い合わせください。");
      setReceptionNumber('エラー');
    }
  };
    const handleSubmit = async () => {
    // ★★★ あなたのAPI GatewayのURLをここに貼り付けてください ★★★
    const saveOrderApiUrl = 'https://viy41bgkvd.execute-api.ap-northeast-1.amazonaws.com/orders';
    const sendEmailApiUrl = 'https://<あなたのAPI GatewayのID>.execute-api.ap-northeast-1.amazonaws.com/send-email'; // メール用API（仮）
    
    if (!saveOrderApiUrl.includes('execute-api')) {
      alert('APIのURLを正しく設定してください。');
      return;
    }

    // 各注文に最終的な注文番号を追加
    const ordersWithFinalId = orders.map((order, index) => ({
      ...order,
      orderId: generateOrderNumber(order, receptionNumber, index)
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
      const correspondingOrder = orders.find(o => o.orderDate === group.paymentDate);
      const correspondingOrderIndex = orders.findIndex(o => o.orderDate === group.paymentDate);

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

    const finalData = { 
      selectedYear: selectedYear,
      customer: customerInfo, 
      orders: ordersWithFinalId,
      receptionNumber, 
      allocationNumber, 
      paymentGroups: transformedPaymentGroups, 
      receipts: transformedReceipts,
      orderType: '新規注文',
      globalNotes: globalNotes,
    };

    try {
      // --- DB書き込みAPIの呼び出し ---
      console.log('DB書き込みAPIを呼び出します...');
      const saveResponse = await fetch(saveOrderApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(errorData.message || 'データベースへの書き込みに失敗しました。');
      }
      console.log('DB書き込み成功:', await saveResponse.json());

      // --- メール送信APIの呼び出し ---
      if (customerInfo.email) {
        console.log('メール送信APIを呼び出します...');
        const emailHtml = generateEmailHtml({
          customerInfo, orders, receptionNumber, allocationNumber, calculateOrderTotal,
          generateOrderNumber, calculateGrandTotal, isPaymentOptionsOpen,
          SIDE_ORDERS_DB, receipts: finalReceipts, paymentGroups: paymentGroupsWithTotals
        });
        
        const emailResponse = await fetch(sendEmailApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: customerInfo.email,
            subject: '【松栄寿し】ご注文内容の確認',
            bodyHtml: emailHtml,
          }),
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          throw new Error(errorData.message || 'メールの送信に失敗しました。');
        }
        console.log('メール送信成功:', await emailResponse.json());
      }
      
      // --- 全て成功した場合の処理 ---
      if (isConfirmationOpen) setIsConfirmationOpen(false);
      alert('注文が正常に送信されました。');
      resetForm();

    } catch (error) {
      console.error('注文の送信中にエラーが発生しました:', error);
      alert(`エラー: ${error.message}`);
    }
  };

  
  if (loading) return <h4>設定データを読み込んでいます...</h4>;
  if (error) return <h4 style={{color: 'red'}}>エラー: {error}</h4>;
  if (!configuration) return <h4>表示する設定年を選択してください。</h4>;

  return (
    <div className="main-container">
      {isConfirmationOpen && ( <ConfirmationModal onClose={() => setIsConfirmationOpen(false)} onSubmit={handleSubmit} customerInfo={customerInfo} orders={orders} receptionNumber={receptionNumber} allocationNumber={allocationNumber} calculateOrderTotal={calculateOrderTotal} generateOrderNumber={generateOrderNumber} calculateGrandTotal={calculateGrandTotal} isPaymentOptionsOpen={isPaymentOptionsOpen} SIDE_ORDERS_DB={SIDE_ORDERS_DB} receipts={finalReceipts} paymentGroups={paymentGroupsWithTotals} orderType="新規注文" globalNotes={globalNotes}/> )}
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
        />
            {orders.map((order, index) => {
              const orderNumberDisplay = generateOrderNumber(order, receptionNumber, index);
              return (
                <SingleOrderSection
                  key={order.id}
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
                              <select value={group.paymentDate} onChange={(e) => updatePaymentGroup(group.id, 'paymentDate', e.target.value)} className="combined-payment-select" >
                                <option value="">支払日を選択</option>
                                {orders.map((order, index) => (
                                  // 日付が設定されている注文のみをオプションとして表示
                                  order.orderDate && (
                                  <option key={order.id} value={order.orderDate}>
                                   注文#{index + 1} ({order.orderDate})
                                  </option>
                                 )
                                ))}
                              </select>
                            </div>
                            <div className="order-checklist-container">
                              <p>この日にお支払いをする注文を選択:</p>
                              {orders.map(order => (
                                <div key={order.id} className="order-checklist-item">
                                  <input type="checkbox" id={`order-check-${group.id}-${order.id}`} checked={!!group.checkedOrderIds[order.id]} onChange={() => handleGroupOrderCheck(group.id, order.id)} />
                                  <label htmlFor={`order-check-${group.id}-${order.id}`}> {generateOrderNumber(order, receptionNumber, index)} ({order.orderDate || '日付未定'}) - ¥{calculateOrderTotal(order).toLocaleString()} </label>
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
                                  <option key={order.id} value={order.orderDate}>
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
              <button type="button" onClick={handleOpenConfirmation} className="confirm-btn"> 注文内容を確認 </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default OrderForm;