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

function CheckoutPage() {
    const { cart, totalPrice, clearCart } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [placed, setPlaced] = useState(false);
    const [submitting, setSubmitting] = useState(false);

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
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitting(true);
        // 用 setTimeout 模拟后端请求延迟（1秒），对接真实 API 后替换为 await fetch()
        setTimeout(() => {
            const email = user?.email || form.email;
            addOrder(email, cart, totalPrice, {
                firstName: form.firstName,
                lastName: form.lastName,
                address: form.address,
                suburb: form.suburb,
                postcode: form.postcode,
                phone: form.phone,
            });
            clearCart();
            setPlaced(true);
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
                        <p>Thank you for your order. You will receive a confirmation email shortly.</p>
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
                                <input type="email" name="email" value={form.email} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label>Phone *</label>
                                <input type="tel" name="phone" value={form.phone} onChange={handleChange} required />
                            </div>
                        </div>

                        {cart.some(item => item.deliveryMethod !== 'pickup') && (
                            <div className="form-section">
                                <h2>Delivery</h2>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>First Name *</label>
                                        <input type="text" name="firstName" value={form.firstName} onChange={handleChange} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Last Name *</label>
                                        <input type="text" name="lastName" value={form.lastName} onChange={handleChange} required />
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
                        <div className="checkout-summary-total">
                            <span>Total</span>
                            <span>${totalPrice.toFixed(2)}</span>
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
