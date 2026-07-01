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

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import FadeInUp from '../../components/FadeInUp';
import StripePayment from '../../components/StripePayment';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { addOrder, updateOrderWcId } from '../../utils/orders';
import deliveryAreas, { getShippingBySuburb, getShippingBySuburbAsync } from '../../components/Areas';
import '../PageStyles/CheckoutPage.css';

// Stripe 公钥（测试模式）
const stripePromise = loadStripe('pk_test_51TilJyFsfWLJQAuMEHQ7TNiDLcgNHMN2zvs74sY4r9ppxSkIya35TXJjrBGS7svvkdVSGQMqOHlJ4BtE1GSONP7e00YGo3HnpZ');

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
    const [suburbError, setSuburbError] = useState('');
    const stripeRef = useRef(null);    // 保存 stripe 实例

    // ---- 郊区选择模式与运费计算 ----
    const [suburbMode, setSuburbMode] = useState('select');    // 'select' | 'custom'
    const [customSuburb, setCustomSuburb] = useState('');
    const [shippingCalc, setShippingCalc] = useState({ fee: null, distance: null, known: false, loading: false });

    // 用一个对象管理所有表单字段，handleChange 统一更新
    const [form, setForm] = useState(() => {
        let savedSuburb = '';
        try { savedSuburb = localStorage.getItem('checkout_suburb') || ''; } catch { }
        return {
            firstName: user?.addresses?.[0]?.firstName || '',
            lastName: user?.addresses?.[0]?.lastName || '',
            email: user?.email || '',
            phone: '',
            address: '',
            suburb: savedSuburb,
            postcode: '',
        };
    });

    // 当 suburb 变化时重新计算运费（已知郊区即时、未知 via API）
    // 注意：1000ms 防抖避免突破 Nominatim 1次/秒 限流；ignore 标记清理竞态
    const shippingRequestedRef = useRef(false);
    useEffect(() => {
        let ignore = false;
        const timer = setTimeout(() => {
            const name = suburbMode === 'select' ? form.suburb : customSuburb;
            if (!name) {
                if (!ignore) setShippingCalc({ fee: null, distance: null, known: false, loading: false });
                return;
            }
            // 已知郊区 → 同步，即时响应
            const sync = getShippingBySuburb(name);
            if (sync.fee !== null || sync.distance !== null) {
                if (!ignore) setShippingCalc({ ...sync, known: true, loading: false });
                return;
            }
            // 未知郊区 → 异步 Nominatim API 兜底
            if (shippingRequestedRef.current) return; // 已有请求在途中，不再重复发
            if (!ignore) setShippingCalc((prev) => ({ ...prev, loading: true }));
            shippingRequestedRef.current = true;
            getShippingBySuburbAsync(name).then((result) => {
                if (!ignore) setShippingCalc({ ...result, loading: false });
                shippingRequestedRef.current = false;
            });
        }, 1000);
        return () => {
            ignore = true;
            clearTimeout(timer);
        };
    }, [form.suburb, customSuburb, suburbMode]);

    // 初始化：如果 localStorage 中保存的 suburb 不在预置列表，切到自定义模式
    useEffect(() => {
        if (form.suburb && !deliveryAreas.some(a => a.name === form.suburb)) {
            setSuburbMode('custom');
            setCustomSuburb(form.suburb);
        }
        // 只在组件挂载时运行一次
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 计算运费（从 shippingCalc 状态获得，支持同步/异步两种来源）
    const hasDelivery = cart.some(item => item.deliveryMethod !== 'pickup');
    const deliverySubtotal = cart
        .filter(item => item.deliveryMethod !== 'pickup')
        .reduce((sum, item) => sum + item.qty * (parseFloat(item.sale_price) || parseFloat(item.price) || 0), 0)
    const { fee: shippingFee, distance } = shippingCalc;
    const isFreeShipping = hasDelivery && (deliverySubtotal >= FREE_SHIPPING_THRESHOLD);
    const shipping = hasDelivery && !isFreeShipping && shippingFee !== null ? shippingFee : 0;
    const tax = totalPrice * TAX_RATE;
    const total = totalPrice + shipping + tax;

    const validatePhone = (phone) => {
        const cleaned = phone.replace(/\s/g, '');
        return /^(04\d{8}|0[23578]\d{8}|\+614\d{8}|\+61[23578]\d{8})$/.test(cleaned);
    };

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
        // Suburb 同步到 localStorage
        if (name === 'suburb') {
            try { localStorage.setItem('checkout_suburb', value); } catch { }
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

        // Suburb 最终验证（仅配送订单）
        if (hasDelivery) {
            const suburbName = suburbMode === 'custom' ? customSuburb : form.suburb;
            if (!suburbName) {
                setSuburbError('Please select or enter a delivery area.');
                setSubmitting(false);
                return;
            }
            // 还要确认运费有效（即配送范围内）
            if (shippingFee === null && !shippingCalc.loading) {
                setSuburbError('Sorry, we currently do not deliver to this area.');
                setSubmitting(false);
                return;
            }
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

        // 4. 支付成功 → 保存订单 & 同步到 WooCommerce
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

        // 同步订单到 WooCommerce 后端（不阻塞跳转）
        const token = localStorage.getItem('jwt_token');
        fetch('http://localhost:5000/api/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: cart,
                customer: { firstName: form.firstName, lastName: form.lastName, email },
                shipping: { address: form.address, suburb: form.suburb, postcode: form.postcode, phone: form.phone },
                paymentMethod: cardInfo?.brand || 'Card',
                token,
            }),
        }).then(async (res) => {
            if (res.ok) {
                const data = await res.json();
                updateOrderWcId(email, order.id, data.orderId);
                console.log('[Order] Synced to WooCommerce, ID:', data.orderId);
            } else {
                console.warn('[Order] Sync failed:', res.status);
            }
        }).catch((err) => {
            console.warn('[Order] Sync error:', err.message);
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
                                                        const isKnown = deliveryAreas.some(a => a.name === addr.suburb);
                                                        setForm(prev => ({
                                                            ...prev,
                                                            address: addr.street || '',
                                                            suburb: isKnown ? addr.suburb : '',
                                                            postcode: addr.postcode || '',
                                                        }));
                                                        setSuburbError('');
                                                        try { localStorage.setItem('checkout_suburb', addr.suburb || ''); } catch { }
                                                        // 如果保存的地址不在预置列表，自动切到自定义模式
                                                        if (!isKnown && addr.suburb) {
                                                            setSuburbMode('custom');
                                                            setCustomSuburb(addr.suburb);
                                                        }
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
                                    <h2>Delivery Address</h2>
                                    <div className="form-group full">
                                        <label>Address *</label>
                                        <input type="text" name="address" value={form.address} onChange={handleChange} required />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group suburb-group">
                                            <label>Delivery Area *</label>
                                            {suburbMode === 'select' ? (
                                                <select
                                                    name="suburb"
                                                    value={form.suburb}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === '__other__') {
                                                            setSuburbMode('custom');
                                                            setForm({ ...form, suburb: '' });
                                                        } else {
                                                            setForm({ ...form, suburb: val });
                                                            setSuburbError('');
                                                        }
                                                    }}
                                                    className={suburbError ? 'input-error' : ''}
                                                    required
                                                >
                                                    
                                                    {deliveryAreas.map((area) => (
                                                        <option key={area.name} value={area.name}>{area.name}</option>
                                                    ))}
                                                    <option value="__other__">Other suburb not listed...</option>
                                                    <option value="">Select your suburb...</option>
                                                </select>
                                            ) : (
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                    <input
                                                        type="text"
                                                        value={customSuburb}
                                                        onChange={(e) => {
                                                            setCustomSuburb(e.target.value);
                                                            setSuburbError('');
                                                        }}
                                                        placeholder="Type your suburb name..."
                                                        className={suburbError ? 'input-error' : ''}
                                                        required
                                                        style={{ flex: 1 }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSuburbMode('select');
                                                            setCustomSuburb('');
                                                            setShippingCalc({ fee: null, distance: null, known: false, loading: false });
                                                        }}
                                                        className="suburb-back-btn"
                                                    >
                                                        Back to list
                                                    </button>
                                                </div>
                                            )}
                                            {suburbError && <span className="field-error">Please select a delivery area.</span>}
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
                            {shippingCalc.loading ? (
                                <div className="checkout-summary-shipping">
                                    <span>Shipping: </span>
                                    <span style={{ color: '#8899aa' }}>Checking area...</span>
                                </div>
                            ) : shipping > 0 ? (
                                <>
                                    <div className="checkout-summary-shipping">
                                        <span>Shipping ({distance} km): </span>
                                        <span>${shipping.toFixed(2)}</span>
                                    </div>
                                    {!shippingCalc.known && (
                                        <p style={{ fontSize: 13, color: '#e67e22', margin: '4px 0' }}>
                                            * Extended delivery area
                                        </p>
                                    )}
                                    <div>
                                        <p><strong>Free shipping for orders over $150!</strong></p>
                                    </div>
                                </>
                            ) : hasDelivery && shippingFee === null && !shippingCalc.loading ? (
                                <div className="checkout-summary-shipping">
                                    <span>Shipping: </span>
                                    <span style={{ color: '#e74c3c' }}>Not available</span>
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
