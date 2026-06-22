/**
 * 下单成功后提示保存配送地址到账户
 */
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function SaveAddressBtn({ delivery }) {
  const { user, addAddress } = useAuth();
  const [saved, setSaved] = useState(false); // false=未保存, true=保存中, 'done'=完成

  // 检查该地址是否已保存（仅在非保存状态下判断）
  const alreadySaved = !saved && (user?.addresses || []).some(
    (a) => a.street === delivery?.address && a.suburb === delivery?.suburb
  );

  if (!user || alreadySaved) return null;
  if (saved === 'done') return null;

  const handleSave = async () => {
    setSaved(true);
    await addAddress({
      label: 'Home',
      street: delivery.address || '',
      suburb: delivery.suburb || '',
      city: '',
      state: '',
      postcode: delivery.postcode || '',
    });
    setTimeout(() => setSaved('done'), 2000);
  };

  return (
    <div className="save-address-row">
      {saved ? (
        <span className="save-address-success">✓ Address saved</span>
      ) : (
        <>
          <p>Save this address for future orders?</p>
          <button className="save-address-btn" onClick={handleSave}>Save Address</button>
        </>
      )}
    </div>
  );
}
