import React, { useState, useEffect } from 'react';

const OrderForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    fax: '',
    tel: '',
    companyName: '',
    personalName: '',
    deliveryWanted: false,
    pickupLocation: '',
    building: '',
    floor: '',
    orderDate: '',
    orderTime: '',
    customDate: '',
    customTime: '',
    quantities: [0, 0, 0, 0],
    notes: ['', '', '', ''],
    paymentMethod: '',
    receiptName: ''
  });

  const [total, setTotal] = useState(0);
  const prices = [3580, 3240, 2480, 1890];
  const productNames = ['極', '匠', '恵', '泉'];

  useEffect(() => {
    const newTotal = formData.quantities.reduce((sum, qty, index) => {
      return sum + (qty * prices[index]);
    }, 0);
    setTotal(newTotal);
  }, [formData.quantities]);

  const handleQuantityChange = (index, value) => {
    const newQuantities = [...formData.quantities];
    newQuantities[index] = parseInt(value) || 0;
    setFormData(prev => ({
      ...prev,
      quantities: newQuantities
    }));
  };

  const handleNotesChange = (index, value) => {
    const newNotes = [...formData.notes];
    newNotes[index] = value;
    setFormData(prev => ({
      ...prev,
      notes: newNotes
    }));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = () => {
    console.log('フォームデータ:', formData);
    alert('注文を受け付けました！');
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto bg-white border-2 border-black">
        {/* Header */}
        <div className="bg-black text-white text-center py-3">
          <h1 className="text-xl font-bold">御用納め・御用始め専用 注文用紙</h1>
        </div>

        <div>
          {/* Contact Section */}
          <div className="flex border-b border-black">
            <div className="w-32 bg-gray-100 border-r border-black flex items-center justify-center py-8">
              <div className="transform rotate-180 writing-mode-vertical text-center font-bold">
                ご担当者様
              </div>
            </div>
            <div className="flex-1 border-r border-black">
              <div className="flex border-b border-black h-12">
                <div className="w-20 bg-gray-100 border-r border-black flex items-center justify-center font-bold">
                  ★ Mail
                </div>
                <div className="flex-1 px-3 flex items-center">
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full border-none outline-none"
                    placeholder="メールアドレス"
                  />
                </div>
              </div>
              <div className="flex border-b border-black h-12">
                <div className="w-20 bg-gray-100 border-r border-black flex items-center justify-center font-bold">
                  FAX
                </div>
                <div className="flex-1 px-3 flex items-center">
                  <input
                    type="text"
                    value={formData.fax}
                    onChange={(e) => handleInputChange('fax', e.target.value)}
                    className="w-full border-none outline-none"
                    placeholder="FAX番号"
                  />
                </div>
              </div>
              <div className="flex h-12">
                <div className="w-20 bg-gray-100 border-r border-black flex items-center justify-center font-bold">
                  TEL
                </div>
                <div className="flex-1 px-3 flex items-center">
                  <input
                    type="text"
                    value={formData.tel}
                    onChange={(e) => handleInputChange('tel', e.target.value)}
                    className="w-full border-none outline-none"
                    placeholder="電話番号"
                  />
                </div>
              </div>
            </div>
            <div className="w-40 bg-gray-100 p-3 text-center">
              <div className="font-bold mb-2">受付番号</div>
              <div className="text-sm">(店舗記入欄)</div>
            </div>
          </div>

          {/* Customer Info Section */}
          <div className="flex border-b border-black">
            <div className="w-32 bg-gray-100 border-r border-black flex items-center justify-center py-8">
              <div className="transform rotate-180 writing-mode-vertical text-center font-bold">
                ご依頼者様
              </div>
            </div>
            <div className="flex-1 border-r border-black p-4">
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <div className="mb-2 font-bold">法人・部署名</div>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    className="w-full border border-gray-300 px-2 py-1"
                    placeholder="法人・部署名"
                  />
                </div>
                <div className="flex-1">
                  <div className="mb-2 font-bold">個人名</div>
                  <input
                    type="text"
                    value={formData.personalName}
                    onChange={(e) => handleInputChange('personalName', e.target.value)}
                    className="w-full border border-gray-300 px-2 py-1"
                    placeholder="個人名"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="delivery"
                    checked={formData.deliveryWanted}
                    onChange={(e) => handleInputChange('deliveryWanted', e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="delivery">出前希望</label>
                </div>
              </div>
            </div>
            <div className="w-40 bg-gray-100 p-3">
              <div className="mb-3">
                <input
                  type="radio"
                  id="pickup-higuchi"
                  name="pickupLocation"
                  value="東口店頭受取"
                  checked={formData.pickupLocation === '東口店頭受取'}
                  onChange={(e) => handleInputChange('pickupLocation', e.target.value)}
                  className="mr-2"
                />
                <label htmlFor="pickup-higuchi">東口店頭受取</label>
              </div>
              <div>
                <input
                  type="radio"
                  id="pickup-hizume"
                  name="pickupLocation"
                  value="日詰店頭受取"
                  checked={formData.pickupLocation === '日詰店頭受取'}
                  onChange={(e) => handleInputChange('pickupLocation', e.target.value)}
                  className="mr-2"
                />
                <label htmlFor="pickup-hizume">日詰店頭受取</label>
              </div>
            </div>
          </div>

          {/* Order Details Section */}
          <div className="flex border-b border-black">
            <div className="w-32 bg-gray-100 border-r border-black flex items-center justify-center py-8">
              <div className="transform rotate-180 writing-mode-vertical text-center font-bold">
                お引き渡し・注文日
              </div>
            </div>
            <div className="flex-1 p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <span>棟・庁舎</span>
                  <input
                    type="text"
                    value={formData.building}
                    onChange={(e) => handleInputChange('building', e.target.value)}
                    className="border border-gray-300 px-2 py-1 w-32"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span>階数【</span>
                  <input
                    type="text"
                    value={formData.floor}
                    onChange={(e) => handleInputChange('floor', e.target.value)}
                    className="border border-gray-300 px-2 py-1 w-16"
                  />
                  <span>階】</span>
                </div>
              </div>

              <table className="w-full border-collapse border border-black mb-4">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black p-2">日付</th>
                    <th className="border border-black p-2">
                      <input
                        type="radio"
                        name="orderDate"
                        value="12月25日"
                        checked={formData.orderDate === '12月25日'}
                        onChange={(e) => handleInputChange('orderDate', e.target.value)}
                        className="mr-1"
                      />
                      12月25日
                    </th>
                    <th className="border border-black p-2">
                      <input
                        type="radio"
                        name="orderDate"
                        value="12月26日"
                        checked={formData.orderDate === '12月26日'}
                        onChange={(e) => handleInputChange('orderDate', e.target.value)}
                        className="mr-1"
                      />
                      12月26日
                    </th>
                    <th className="border border-black p-2">
                      <input
                        type="radio"
                        name="orderDate"
                        value="01月05日"
                        checked={formData.orderDate === '01月05日'}
                        onChange={(e) => handleInputChange('orderDate', e.target.value)}
                        className="mr-1"
                      />
                      01月05日
                    </th>
                    <th className="border border-black p-2">
                      <input
                        type="radio"
                        name="orderDate"
                        value="01月06日"
                        checked={formData.orderDate === '01月06日'}
                        onChange={(e) => handleInputChange('orderDate', e.target.value)}
                        className="mr-1"
                      />
                      01月06日
                    </th>
                    <th className="border border-black p-2">
                      <input
                        type="radio"
                        name="orderDate"
                        value="custom"
                        checked={formData.orderDate === 'custom'}
                        onChange={(e) => handleInputChange('orderDate', e.target.value)}
                        className="mr-1"
                      />
                      <input
                        type="text"
                        value={formData.customDate}
                        onChange={(e) => handleInputChange('customDate', e.target.value)}
                        className="border border-gray-300 px-1 w-20"
                        placeholder="月日"
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2 bg-gray-100 font-bold">時間</td>
                    <td className="border border-black p-2 text-center">
                      <input
                        type="radio"
                        name="orderTime"
                        value="11時まで"
                        checked={formData.orderTime === '11時まで'}
                        onChange={(e) => handleInputChange('orderTime', e.target.value)}
                        className="mr-1"
                      />
                      11時まで
                    </td>
                    <td className="border border-black p-2 text-center">
                      <input
                        type="radio"
                        name="orderTime"
                        value="11時45分まで"
                        checked={formData.orderTime === '11時45分まで'}
                        onChange={(e) => handleInputChange('orderTime', e.target.value)}
                        className="mr-1"
                      />
                      11時45分まで
                    </td>
                    <td className="border border-black p-2 text-center">
                      <input
                        type="radio"
                        name="orderTime"
                        value="12時まで"
                        checked={formData.orderTime === '12時まで'}
                        onChange={(e) => handleInputChange('orderTime', e.target.value)}
                        className="mr-1"
                      />
                      12時まで
                    </td>
                    <td className="border border-black p-2 text-center">
                      <input
                        type="radio"
                        name="orderTime"
                        value="12時30分まで"
                        checked={formData.orderTime === '12時30分まで'}
                        onChange={(e) => handleInputChange('orderTime', e.target.value)}
                        className="mr-1"
                      />
                      12時30分まで
                    </td>
                    <td className="border border-black p-2 text-center">
                      <input
                        type="radio"
                        name="orderTime"
                        value="custom"
                        checked={formData.orderTime === 'custom'}
                        onChange={(e) => handleInputChange('orderTime', e.target.value)}
                        className="mr-1"
                      />
                      <input
                        type="text"
                        value={formData.customTime}
                        onChange={(e) => handleInputChange('customTime', e.target.value)}
                        className="border border-gray-300 px-1 w-20"
                        placeholder="時分"
                      />
                      ころ
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Product Order Section */}
          <div className="flex border-b border-black">
            <div className="w-32 bg-gray-100 border-r border-black flex items-center justify-center py-8">
              <div className="transform rotate-180 writing-mode-vertical text-center font-bold">
                注文内容
              </div>
            </div>
            <div className="flex-1 p-4">
              <table className="w-full border-collapse border border-black">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black p-2">商品名</th>
                    <th className="border border-black p-2">単価</th>
                    <th className="border border-black p-2">個数</th>
                    <th className="border border-black p-2">金額</th>
                    <th className="border border-black p-2">備考</th>
                  </tr>
                </thead>
                <tbody>
                  {productNames.map((name, index) => (
                    <tr key={index}>
                      <td className="border border-black p-2 text-center font-bold text-lg">{name}</td>
                      <td className="border border-black p-2 text-center">税込 {prices[index].toLocaleString()} 円</td>
                      <td className="border border-black p-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={formData.quantities[index]}
                          onChange={(e) => handleQuantityChange(index, e.target.value)}
                          className="w-16 text-center border border-gray-300 px-1"
                        />
                      </td>
                      <td className="border border-black p-2 text-center">
                        {formData.quantities[index] > 0 ? `¥${(formData.quantities[index] * prices[index]).toLocaleString()}` : ''}
                      </td>
                      <td className="border border-black p-2">
                        <input
                          type="text"
                          value={formData.notes[index]}
                          onChange={(e) => handleNotesChange(index, e.target.value)}
                          className="w-full border-none outline-none"
                          placeholder="備考"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total Section */}
          <div className="flex border-b border-black">
            <div className="w-32 bg-gray-100 border-r border-black flex items-center justify-center py-8">
              <div className="transform rotate-180 writing-mode-vertical text-center font-bold">
                合計金額
              </div>
            </div>
            <div className="flex-1 p-8 text-center">
              <div className="text-3xl font-bold">¥{total.toLocaleString()}</div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="bg-gray-50 p-4 border-b border-black text-sm">
            <div className="mb-1">●ワサビ抜き、アレルギーによるネタ変更等 ご希望の際は備考欄にご記入ください。</div>
            <div className="mb-1">●また、容器は黒明「精」、または「折」のおまかせでの提供となります。</div>
            <div>●別途 ご希望がある場合は、備考欄に内容を詳しくご記入ください。</div>
          </div>

          {/* Payment Section */}
          <div className="flex border-b border-black">
            <div className="w-32 bg-gray-100 border-r border-black flex items-center justify-center py-8">
              <div className="transform rotate-180 writing-mode-vertical text-center font-bold">
                支払方法
              </div>
            </div>
            <div className="flex-1 p-4">
              <div className="mb-4">
                <div className="flex items-center gap-4 mb-2">
                  <input
                    type="radio"
                    id="cash-on-delivery"
                    name="paymentMethod"
                    value="代金引換"
                    checked={formData.paymentMethod === '代金引換'}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    className="mr-2"
                  />
                  <label htmlFor="cash-on-delivery">代金引換　　（領収書発行）</label>
                  <div className="ml-8">
                    <div className="text-sm mb-1">領収書または請求書 宛名</div>
                    <input
                      type="text"
                      value={formData.receiptName}
                      onChange={(e) => handleInputChange('receiptName', e.target.value)}
                      className="border border-gray-300 px-2 py-1 w-48"
                      placeholder="宛名"
                    />
                  </div>
                </div>
              </div>
              <div>
                <input
                  type="radio"
                  id="bank-transfer"
                  name="paymentMethod"
                  value="銀行振込"
                  checked={formData.paymentMethod === '銀行振込'}
                  onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                  className="mr-2"
                />
                <label htmlFor="bank-transfer">銀行振込　　（請求書払い）</label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex">
            <div className="flex-1 p-4">
              <div className="text-xs mb-4">
                ご注文は電話またはFAXで承っております。つながりにくくなります。FAXからのご注文をよろしくお願いいたします。<br />
                確認のメールは、matsue2681717@gmail.comより返信いたします。受信設定もあわせてお願いいたします。
              </div>
              
              <div className="flex items-center gap-8 mb-4">
                <div className="text-4xl font-bold transform rotate-180 writing-mode-vertical">
                  杉茶屋
                </div>
                <div>
                  <div className="mb-4">
                    <div className="font-bold">日詰本店</div>
                    <div>長野市大字稲葉2757-6</div>
                  </div>
                  <div className="mb-4">
                    <div className="font-bold">長野駅東口店</div>
                    <div>長野市大字栗田1525</div>
                  </div>
                  <div className="bg-black text-white p-2 text-sm">
                    <div className="text-center font-bold mb-2">
                      お問い合わせ・ご連絡先<br />
                      長野駅東口店
                    </div>
                    <div className="flex justify-between">
                      <span>TEL</span>
                      <span>026-217-8700</span>
                    </div>
                    <div className="flex justify-between">
                      <span>FAX</span>
                      <span>026-268-1718</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-48 bg-gray-100 p-4 border-l border-black">
              <div className="text-xs text-center mb-4">
                締切情報のご連絡を<br />
                (締切変更)<br />
                (新規受付)<br />
                にいたします。
              </div>
              <div className="text-xs text-center mb-4">
                ★メールアドレス(またはFAX番号)を<br />
                ご記入ください。<br />
                当日12時までに届かない場合は<br />
                お電話でご連絡ください。
              </div>
              <div className="border-2 border-black p-3 text-center">
                <div className="text-sm font-bold mb-1">
                  御用納め・御用始めの新規受付締切は
                </div>
                <div className="text-xl font-bold text-red-600">
                  12月19日(金)
                </div>
                <div className="text-sm font-bold">まで</div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="p-6 bg-gray-100 text-center">
            <button
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200"
            >
              注文を送信
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderForm;