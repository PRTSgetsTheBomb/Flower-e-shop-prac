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

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import FadeInUp from '../../components/FadeInUp';
import SaveAddressBtn from './SaveAddressBtn';
import { useAuth } from '../../context/AuthContext';
import { getOrderById } from '../../utils/orders';
import '../PageStyles/OrderSummary.css';

function OrderSummary() {
    const { orderId } = useParams();
    const { user } = useAuth();
    const [liveStatus, setLiveStatus] = useState(null);

    useEffect(() => {
        const ord = user ? getOrderById(user.email, orderId) : null;
        const wcId = ord?.wooCommerceId;
        if (!wcId) {
            setLiveStatus(null);
            return;
        }
        fetch(`http://localhost:5000/api/order/${wcId}`)
            .then(res => res.json())
            .then(data => setLiveStatus(data))
            .catch(() => { });
    }, [orderId, user]);

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
    const wcId = order?.wooCommerceId;

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
    const isPickup = order.items?.every(item => item.deliveryMethod === 'pickup');

    return (
        <FadeInUp as="section" className="order-summary-page">
            <div className="container">
                <div className="order-summary-card">
                    {/* 头部：状态标识 */}
                    <div className="os-header">
                        {(() => {
                            const s = liveStatus?.status || order.status;
                            const bg = s === 'completed' ? '#28a745' :
                                s === 'shipped' || s === 'readyforpickup' ? '#17a2b8' :
                                    s === 'processing' ? '#ffc107' :
                                        s === 'on-hold' || s === 'On Hold' ? '#fd7e14' : '#6c757d';
                            const color = s === 'processing' || s === 'on-hold' || s === 'On Hold' ? '#333' : '#fff';
                            const label = s === 'processing' ? 'Processing' :
                                s === 'shipped' ? 'Shipped' :
                                    s === 'readyforpickup' ? 'Ready for Pickup' :
                                        s === 'completed' ? (isPickup ? 'Picked Up' : 'Delivered') :
                                            s === 'on-hold' || s === 'On Hold' ? 'Awaiting Review' : s;
                            return (
                                <div className="os-status-badge" style={{ background: bg, color }}>
                                    {label}
                                </div>
                            );
                        })()}
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
                        <div className="os-info-item">
                            <span className="os-info-label">Method</span>
                            <span className="os-info-value">{isPickup ? 'Pickup' : 'Delivery'}</span>
                        </div>
                    </div>

                    {/* 配送信息 */}
                    {order.delivery?.address ? (
                        <>
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
                        </>
                    ) : (
                        <>
                            <div className='os-section'>
                                <h2>Pickup Location</h2>
                                <p>Pisces Flower Studio<br />Oakleigh South, Melbourne</p>
                            </div>
                            {order.items?.[0]?.deliveryDate && (
                                <div className='os-section'>
                                    <h2>Pickup Time</h2>
                                    <p>{order.items[0].deliveryDate}</p>
                                </div>
                            )}
                        </>
                    )}

                    {/* 保存地址到账户 */}
                    {order.delivery?.address && <SaveAddressBtn delivery={order.delivery} />}

                    {/* 订单状态时间线 */}
                    {(liveStatus || !wcId) && (
                        <div className="os-section">
                            <h2>Order Status</h2>
                            <div className="os-timeline">
                                <div className="timeline-step completed">
                                    <span className="timeline-dot">✓</span>
                                    <span>Order Placed — {new Date(order.date).toLocaleDateString()}</span>
                                </div>
                                {liveStatus?.datePaid && (
                                    <div className="timeline-step completed">
                                        <span className="timeline-dot">✓</span>
                                        <span>Payment Confirmed</span>
                                    </div>
                                )}
                                {/* Awaiting Review — 商家在后台确认前 */}
                                {liveStatus?.status === 'on-hold' && (
                                    <div className="timeline-step completed">
                                        <span className="timeline-dot">⏳</span>
                                        <span>Awaiting Review — merchant will confirm your order shortly</span>
                                    </div>
                                )}
                                {/* Processing */}
                                <div className={`timeline-step ${liveStatus?.status === 'processing' || liveStatus?.status === 'readyforpickup' || liveStatus?.status === 'shipped' || liveStatus?.status === 'completed' ? 'completed' : ''}`}>
                                    <span className="timeline-dot">{liveStatus?.status === 'processing' || liveStatus?.status === 'readyforpickup' || liveStatus?.status === 'shipped' || liveStatus?.status === 'completed' ? '✓' : '○'}</span>
                                    <span>Processing</span>
                                </div>
                                {/* Shipped (配送) 或 Ready for Pickup (自提) — 二选一 */}
                                {isPickup ? (
                                    <div className={`timeline-step ${liveStatus?.status === 'readyforpickup' || liveStatus?.status === 'completed' ? 'completed' : ''}`}>
                                        <span className="timeline-dot">{liveStatus?.status === 'readyforpickup' || liveStatus?.status === 'completed' ? '✓' : '○'}</span>
                                        <span>Ready for Pickup</span>
                                    </div>
                                ) : (
                                    <div className={`timeline-step ${liveStatus?.status === 'shipped' || liveStatus?.status === 'completed' ? 'completed' : ''}`}>
                                        <span className="timeline-dot">{liveStatus?.status === 'shipped' || liveStatus?.status === 'completed' ? '✓' : '○'}</span>
                                        <span>Shipped{liveStatus?.dateShipped ? ` — ${new Date(liveStatus.dateShipped).toLocaleDateString()}` : ''}</span>
                                    </div>
                                )}
                                {/* Delivered / Picked Up */}
                                <div className={`timeline-step ${liveStatus?.dateCompleted || liveStatus?.status === 'completed' ? 'completed' : ''}`}>
                                    <span className="timeline-dot">{liveStatus?.dateCompleted || liveStatus?.status === 'completed' ? '✓' : '○'}</span>
                                    <span>{isPickup ? 'Picked Up' : 'Delivered'}{liveStatus?.dateCompleted ? ` — ${new Date(liveStatus.dateCompleted).toLocaleDateString()}` : ''}</span>
                                </div>
                            </div>
                            {/* 客户操作：确认收货/取货 */}
                            {(liveStatus?.status === 'shipped' || liveStatus?.status === 'readyforpickup') && (
                                <button
                                    className="btn-primary"
                                    style={{ marginTop: 16 }}
                                    onClick={async () => {
                                        if (!window.confirm(isPickup ? 'Confirm that you have picked up this order?' : 'Confirm that you have received this order?')) return;
                                        await fetch(`http://localhost:5000/api/order/${wcId}/status`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ status: 'completed' }),
                                        });
                                        setLiveStatus(prev => ({ ...prev, status: 'completed' }));
                                    }}
                                >
                                    {isPickup ? 'Picked Up' : 'Confirm Received'}
                                </button>
                            )}
                            {liveStatus?.status === 'completed' && (
                                <>
                                    <p style={{ color: '#28a745', fontWeight: 600, marginTop: 16 }}>
                                        ✓ {isPickup ? 'Picked up' : 'Delivered and confirmed'}
                                    </p>
                                    <Link
                                        to={`/product/${order.items[0]?.nameSlug || order.items[0]?.slug || order.items[0]?.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}?review&order=${wcId || ''}`}
                                        className="btn-primary"
                                        style={{ marginTop: 12, display: 'inline-block', textDecoration: 'none' }}
                                    >
                                        Write a Review
                                    </Link>
                                </>
                            )}
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
                                                {item.deliveryMethod === 'pickup' ?
                                                    'Please pickup at' : 'Will be delivered at'}: {item.deliveryDate}
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
                        {order.paymentMethod && (
                            <div className="os-total-row">
                                <span>Payment</span>
                                <span style={{ textTransform: 'capitalize' }}>{order.paymentMethod.brand} •••• {order.paymentMethod.last4}</span>
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
