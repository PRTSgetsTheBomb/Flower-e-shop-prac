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

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FadeInUp from '../Generic/FadeInUp';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { addOrder } from '../../utils/orders';
import '../../PageStyles/CheckoutPage.css';

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

    //计算运费
    const hasDelivery = cart.some(item => item.deliveryMethod !== 'pickup');
    const deliverySubtotal = cart
        .filter(item => item.deliveryMethod !== 'pickup')
        .reduce((sum, item) => sum + item.qty * (parseFloat(item.sale_price) || parseFloat(item.price) || 0), 0)
    const shipping = hasDelivery && deliverySubtotal < FREE_SHIPPING_THRESHOLD ? DELIVERY_FEE : 0;
    const tax = totalPrice * TAX_RATE;
    const total = totalPrice + shipping + tax;


    const validatePhone = (phone) => {
        const cleaned = phone.replace(/\s/g, '');  // 移除所有空格
        // 澳洲手机号格式：04XX XXX XXX（10 位，以 04 开头）
        // 澳洲固话格式：0X XXXX XXXX（10 位，以 02/03/07/08 开头）
        // 国际格式：+61 4XX XXX XXX 或 +61 X XXXX XXXX
        return /^(04\d{8}|0[23578]\d{8}|\+614\d{8}|\+61[23578]\d{8})$/.test(cleaned);
    };

    // 用一个对象管理所有表单字段，handleChange 统一更新，比每个字段单独 useState 更简洁
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
        setForm({ ...form, [e.target.name]: e.target.value });
        //手机号验证
        if (name === 'phone') {
            if (value && !validatePhone(value)) {
                setPhoneError('Please enter a valid Australian phone number (e.g. 0412 345 678).');
            }
            else {
                setPhoneError('');
            }
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        //手机号最终验证
        if (!validatePhone(form.phone)) {
            setPhoneError('Please enter a valid Australian phone number (e.g. 0412 345 678).');
            setSubmitting(false);
            return;
        }
        setSubmitting(true);
        // 用 setTimeout 模拟后端请求延迟（1秒），对接真实 API 后替换为 await fetch()
        setTimeout(() => {
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
            });
            clearCart();
            // 跳转到订单总结页
            navigate(`/order/${order.id}`);
            setSubmitting(false);
        }, 1000);
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
                        <button type="submit" className="checkout-place-btn" disabled={submitting}>
                            {submitting ? 'Placing Order...' : 'Place Order'}
                        </button>
                    </div>
                </form>
            </div>
        </FadeInUp>
    );
}

export default CheckoutPage;
