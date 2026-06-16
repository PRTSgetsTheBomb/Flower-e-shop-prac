/**
 * 结算页面（/checkout）
 *
 * 核心职责：收集配送信息并生成订单
 *
 * 设计说明：
 * - 三态渲染：空购物车 → 订单表单 → 下单成功
 * - 表单状态用一个对象管理（form），通过 handleChange 统一更新，
 *   比每个字段单独写 useState 更简洁
 * - 调用 addOrder() 将订单保存到 localStorage，然后清空购物车
 * - setTimeout 模拟后端请求延迟（1秒），展示 submitting 状态
 * - 右侧订单摘要实时同步购物车数据
 */

import React, { useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import FadeInUp from '../Generic/FadeInUp';
import StripePayment from '../StripePayment';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { addOrder } from '../../utils/orders';
import '../../PageStyles/CheckoutPage.css';

// Stripe 公钥（测试模式）
const stripePromise = loadStripe('pk_test_51TilJyFsfWLJQAuMEHQ7TNiDLcgNHMN2zvs74sY4r9ppxSkIya35TXJjrBGS7svvkdVSGQMqOHlJ4BtE1GSONP7e00YGo3HnpZ');

const DELIVERY_FEE = 15;
const TAX_RATE = 0.1;
const FREE_SHIPPING_THRESHOLD = 150;

function CheckoutPage() {
    const { cart, totalPrice, clearCart } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [placed, setPlaced] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [phoneError, setPhoneError] = useState('');
    const [cardError, setCardError] = useState('');
    const stripeRef = useRef(null);    // 保存 stripe 实例

    //计算运费
    const hasDelivery = cart.some(item => item.deliveryMethod !== 'pickup');
    const deliverySubtotal = cart
        .filter(item => item.deliveryMethod !== 'pickup')
        .reduce((sum, item) => sum + item.qty * (parseFloat(item.sale_price) || parseFloat(item.price) || 0), 0)
    const shipping = hasDelivery && deliverySubtotal < FREE_SHIPPING_THRESHOLD ? DELIVERY_FEE : 0;
    const tax = totalPrice * TAX_RATE;
    const total = totalPrice + shipping + tax;

    const validatePhone = (phone) => {
        const cleaned = phone.replace(/\s/g, '');
        return /^(04\d{8}|0[23578]\d{8}|\+614\d{8}|\+61[23578]\d{8})$/.test(cleaned);
    };

    // 用一个对象管理所有表单字段，handleChange 统一更新
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        suburb: '',
        postcode: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
        // 手机号验证
        if (name === 'phone') {
            if (value && !validatePhone(value)) {
                setPhoneError('Please enter a valid Australian phone number (e.g. 0412 345 678).');
            } else {
                setPhoneError('');
            }
        }
    };

    const onStripeReady = useCallback(({ stripe, elements }) => {
        stripeRef.current = { stripe, elements };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        //手机号最终验证
        if (!validatePhone(form.phone)) {
            setPhoneError('Please enter a valid Australian phone number (e.g. 0412 345 678).');
            setSubmitting(false);
            return;
        }

        setSubmitting(true);
        setCardError('');

        // 1. 请求后端创建 PaymentIntent
        let clientSecret;
        try {
            const res = await fetch('http://localhost:5000/create-payment-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: total }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            clientSecret = data.clientSecret;
        } catch (err) {
            setCardError('Payment service unavailable: ' + err.message);
            setSubmitting(false);
            return;
        }

        // 2. 先创建 PaymentMethod 获取卡信息
        const { stripe, elements } = stripeRef.current || {};
        let paymentMethodId;
        let cardInfo = null;
        if (stripe && elements) {
            const { error, paymentMethod } = await stripe.createPaymentMethod({
                type: 'card',
                card: elements.getElement('card'),
                billing_details: {
                    name: `${form.firstName} ${form.lastName}`,
                    email: user?.email || form.email,
                    phone: form.phone,
                },
            });
            if (error) {
                setCardError(error.message);
                setSubmitting(false);
                return;
            }
            paymentMethodId = paymentMethod.id;
            cardInfo = {
                brand: paymentMethod.card?.brand || 'Card',
                last4: paymentMethod.card?.last4 || '****',
            };
        }

        // 3. 确认支付
        if (stripe && clientSecret && paymentMethodId) {
            const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: paymentMethodId,
            });
            if (error) {
                setCardError(error.message);
                setSubmitting(false);
                return;
            }
            console.log('[Stripe] Payment succeeded:', paymentIntent.id);
        }

        // 4. 支付成功 → 保存订单 & 跳转
        const email = user?.email || form.email;
        const order = addOrder(email, cart, total, {
            firstName: form.firstName,
            lastName: form.lastName,
            address: form.address,
            suburb: form.suburb,
            postcode: form.postcode,
            phone: form.phone,
            shipping,
            tax,
            paymentMethod: cardInfo,
        });
        clearCart();
        navigate(`/order/${order.id}`);
        setSubmitting(false);
    };

    if (cart.length === 0 && !placed) {
        return (
            <FadeInUp as="section" className="checkout-page">
                <div className="container">
                    <h1 className="checkout-title">Checkout</h1>
                    <p style={{ textAlign: 'center', color: '#999' }}>Your cart is empty.</p>
                    <div style={{ textAlign: 'center', marginTop: 16 }}>
                        <Link to="/collections/available-today" className="event-btn">Continue Shopping</Link>
                    </div>
                </div>
            </FadeInUp>
        );
    }

    if (placed) {
        return (
            <FadeInUp as="section" className="checkout-page">
                <div className="container">
                    <div className="checkout-success">
                        <h1>Order Placed!</h1>
                        <p>Thank you for your order. You will receive a confirmation information shortly through email and message.</p>
                        <Link to="/" className="event-btn">Back to Home</Link>
                    </div>
                </div>
            </FadeInUp>
        );
    }

    return (
        <FadeInUp as="section" className="checkout-page">
            <div className="container">
                <h1 className="checkout-title">Checkout</h1>
                <Elements stripe={stripePromise}>
                <form className="checkout-layout" onSubmit={handleSubmit}>
                    {/* 左侧：表单 */}
                    <div className="checkout-form">
                        <div className="form-section">
                            <h2>Contact</h2>
                            <div className="form-group">
                                <label>Email *</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="your@email.com"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Phone *</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    className={phoneError ? 'input-error' : ''}
                                    placeholder="0412 345 678"
                                    required
                                />
                                {phoneError && <span className="field-error">{phoneError}</span>}
                            </div>
                        </div>

                        {cart.some(item => item.deliveryMethod !== 'pickup') && (
                            <div className="form-section">
                                {/* 已保存地址快速选择 */}
                                {user?.addresses?.length > 0 && (
                                    <div className="form-section">
                                        <label className="saved-address-label">Saved Addresses</label>
                                        <select
                                            className="saved-address-select"
                                            defaultValue=""
                                            onChange={(e) => {
                                                const addr = user.addresses.find(a => a.id === e.target.value);
                                                if (addr) {
                                                    setForm(prev => ({
                                                        ...prev,
                                                        address: addr.street || '',
                                                        suburb: addr.suburb || '',
                                                        postcode: addr.postcode || '',
                                                    }));
                                                }
                                            }}
                                        >
                                            <option value="" disabled>Select a saved address...</option>
                                            {user.addresses.map(addr => (
                                                <option key={addr.id} value={addr.id}>
                                                    {addr.label || 'Address'} — {addr.street}, {addr.suburb} {addr.postcode}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <h2>Delivery</h2>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>First Name *</label>
                                        <input
                                            type="text"
                                            name="firstName"
                                            value={form.firstName}
                                            onChange={handleChange}
                                            placeholder="John"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Last Name *</label>
                                        <input
                                            type="text"
                                            name="lastName"
                                            value={form.lastName}
                                            onChange={handleChange}
                                            placeholder="Smith"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-group full">
                                    <label>Address *</label>
                                    <input type="text" name="address" value={form.address} onChange={handleChange} required />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Suburb *</label>
                                        <input type="text" name="suburb" value={form.suburb} onChange={handleChange} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Postcode *</label>
                                        <input type="text" name="postcode" value={form.postcode} onChange={handleChange} required />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 右侧：订单摘要 */}
                    <div className="checkout-summary">
                        <h2>Order Summary</h2>
                        {cart.map((item) => (
                            <div key={item.id} className="checkout-summary-item">
                                <span className="cs-name">{item.name}</span>
                                {item.deliveryDate && (
                                    <span className='cs-method'>
                                        {item.deliveryMethod === 'pickup' ? 'Pickup' : 'Delivery'}: {item.deliveryDate}
                                    </span>
                                )}
                                <span className="cs-qty">x{item.qty}</span>
                                <span className="cs-price">
                                    ${((parseFloat(item.sale_price) || parseFloat(item.price) || 0) * item.qty).toFixed(2)}
                                </span>
                            </div>
                        ))}
                        <div className="checkout-summary-subtotal">
                            <span>Subtotal: </span>
                            <span>${totalPrice.toFixed(2)}</span>
                        </div>
                        {shipping > 0 ? (
                            <div className="checkout-summary-shipping">
                                <span>Shipping: </span>
                                <span>${DELIVERY_FEE.toFixed(2)}</span>
                            </div>
                        ) : hasDelivery ? (
                            <div className="checkout-summary-shipping checkout-summary-shipping-free">
                                <span>Shipping: </span>
                                <span>Free</span>
                            </div>
                        ) : null}
                        <div className="checkout-summary-total">
                            <span>Tax Invoice: </span>
                            <span>${tax.toFixed(2)}</span>
                            <span>Total</span>
                            <span>${total.toFixed(2)}</span>
                        </div>

                        {/* 信用卡支付 */}
                        <StripePayment onStripeReady={onStripeReady} />
                        {cardError && <p className="stripe-error">{cardError}</p>}

                        <button type="submit" className="checkout-place-btn" disabled={submitting}>
                            {submitting ? 'Placing Order...' : 'Place Order'}
                        </button>
                    </div>
                </form>
                </Elements>
            </div>
        </FadeInUp>
    );
}

export default CheckoutPage;
