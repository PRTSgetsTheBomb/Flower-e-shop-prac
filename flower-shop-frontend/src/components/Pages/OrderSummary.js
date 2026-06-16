/**
 * 订单总结页面（/order/:orderId）
 *
 * 核心职责：下单成功后展示完整的订单详情，包含商品清单、配送信息和金额汇总
 *
 * 设计说明：
 * - 从 URL 参数获取 orderId，从 localStorage 查询订单数据
 * - 如果未登录或找不到订单，显示友好的提示（而非直接报错）
 * - 支持从我的账户页面直接点击订单号跳转过来
 */

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import FadeInUp from '../Generic/FadeInUp';
import { useAuth } from '../../context/AuthContext';
import { getOrderById } from '../../utils/orders';
import '../../PageStyles/OrderSummary.css';

function OrderSummary() {
    const { orderId } = useParams();
    const { user } = useAuth();

    // 未登录
    if (!user) {
        return (
            <FadeInUp as="section" className="order-summary-page">
                <div className="container">
                    <div className="order-summary-card">
                        <h1>Order Not Found</h1>
                        <p>Please sign in to view your order details.</p>
                        <Link to="/account" className="btn-primary">Sign In</Link>
                    </div>
                </div>
            </FadeInUp>
        );
    }

    const order = getOrderById(user.email, orderId);

    // 订单不存在
    if (!order) {
        return (
            <FadeInUp as="section" className="order-summary-page">
                <div className="container">
                    <div className="order-summary-card">
                        <h1>Order Not Found</h1>
                        <p>This order could not be found. It may have been placed under a different account.</p>
                        <Link to="/account" className="btn-primary">My Account</Link>
                    </div>
                </div>
            </FadeInUp>
        );
    }

    const orderDate = new Date(order.date);

    return (
        <FadeInUp as="section" className="order-summary-page">
            <div className="container">
                <div className="order-summary-card">
                    {/* 头部：状态标识 */}
                    <div className="os-header">
                        <div className="os-status-badge">&#10003; {order.status}</div>
                        <h1>Thank You, {user.name}!</h1>
                        <p className="os-subtitle">Your order has been placed successfully.</p>
                    </div>

                    {/* 订单信息 */}
                    <div className="os-info-grid">
                        <div className="os-info-item">
                            <span className="os-info-label">Order Number</span>
                            <span className="os-info-value">{order.id}</span>
                        </div>
                        <div className="os-info-item">
                            <span className="os-info-label">Date</span>
                            <span className="os-info-value">{orderDate.toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <div className="os-info-item">
                            <span className="os-info-label">Email</span>
                            <span className="os-info-value">{user.email}</span>
                        </div>
                        <div className="os-info-item">
                            <span className="os-info-label">Phone</span>
                            <span className="os-info-value">{order.delivery?.phone}</span>
                        </div>
                    </div>

                    {/* 配送信息 */}
                    {order.delivery?.address && (
                        <div className="os-section">
                            <h2>Delivery Address</h2>
                            <p className="os-delivery-detail">
                                {order.delivery.firstName} {order.delivery.lastName}
                                <br />
                                {order.delivery.address}
                                <br />
                                {order.delivery.suburb} {order.delivery.postcode}
                            </p>
                        </div>
                    )}

                    {/* 商品清单 */}
                    <div className="os-section">
                        <h2>Items Ordered</h2>
                        <div className="os-items">
                            {order.items.map((item, index) => (
                                <div key={index} className="os-item">
                                    {item.image && <img src={item.image} alt={item.name} className="os-item-image" />}
                                    <div className="os-item-info">
                                        <span className="os-item-name">{item.name}</span>
                                        {item.deliveryDate && (
                                            <span className="os-item-date">
                                                {item.deliveryMethod === 'pickup' ? 'Pickup' : 'Delivery'}: {item.deliveryDate}
                                            </span>
                                        )}
                                    </div>
                                    <span className="os-item-qty">x{item.qty}</span>
                                    <span className="os-item-price">${(item.price * item.qty).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 金额汇总 */}
                    <div className="os-total">
                        <div className="os-total-row">
                            <span>Subtotal</span>
                            <span>${order.items.reduce((s, i) => s + i.price * i.qty, 0).toFixed(2)}</span>
                        </div>
                        {order.delivery?.shipping !== undefined && (
                            <div className="os-total-row">
                                <span>Shipping</span>
                                <span>{order.delivery.shipping > 0 ? `$${order.delivery.shipping.toFixed(2)}` : 'Free'}</span>
                            </div>
                        )}
                        {order.delivery?.tax !== undefined && order.delivery.tax > 0 && (
                            <div className="os-total-row">
                                <span>Tax Invoice</span>
                                <span>${order.delivery.tax.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="os-total-row os-total-final">
                            <span>Total</span>
                            <strong>${order.total.toFixed(2)}</strong>
                        </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="os-actions">
                        <Link to="/" className="btn-primary">Continue Shopping</Link>
                        <Link to="/account" className="btn-secondary">View My Orders</Link>
                    </div>
                </div>
            </div>
        </FadeInUp>
    );
}

export default OrderSummary;
