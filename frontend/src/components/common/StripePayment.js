/**
 * Stripe 支付卡片输入组件
 *
 * 核心职责：提供安全的信用卡信息输入界面，校验卡片有效性
 *
 * 设计说明：
 * - 使用 Stripe Elements 的 CardElement 渲染安全的 iframe 输入框
 * - Stripe 直接处理卡号/CVV/有效期，不会传输到我们的服务器
 * - 测试卡号：4242 4242 4242 4242（任何未来日期 + 任意三位 CVV）
 * - 通过 onStripeReady 回调将 stripe 实例暴露给父组件，供提交时使用
 */

import React from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      fontFamily: 'inherit',
      color: '#222',
      '::placeholder': { color: '#bbb' },
      padding: '10px 0',
    },
    invalid: { color: '#e74c3c' },
  },
  hidePostalCode: true,
};

function StripePayment({ onStripeReady }) {
  const stripe = useStripe();
  const elements = useElements();

  // 将 stripe 实例传给父组件，以便在提交时调用 createPaymentMethod
  React.useEffect(() => {
    if (stripe && elements && onStripeReady) {
      onStripeReady({ stripe, elements });
    }
  }, [stripe, elements, onStripeReady]);

  return (
    <div className="stripe-card-wrap">
      <label>Card Details</label>
      <div className="stripe-card-input">
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>
      <p className="stripe-card-hint">
        Test: 4242 4242 4242 4242 | Any future date | Any CVC
      </p>
    </div>
  );
}

export default StripePayment;
