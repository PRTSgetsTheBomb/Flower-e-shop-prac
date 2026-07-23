/**
 * 账户页面�?account）：双状态页�?
 *
 * 设计说明�?
 * - �?if (user) 提前 return 代替 JSX 三元表达式，因为登录�?�?UI 差异极大�?
 *   两个独立 return 块可读性远强于一个巨大的嵌套三元表达�?
 * - 密码显隐按钮（👁️/🙈）让用户确认输入无误再提交，减少输错导致的挫败感
 * - tabIndex={-1} 使密码切换按钮不可通过 Tab 聚焦，保持表单键盘导航顺�?
 * - e.preventDefault() 阻止表单默认提交行为（刷新页面），保�?SPA 体验
 * - 先前端校验非空再�?login()，避免不必要的异步请�?
 * - localStorage 持久化登录状态，刷新页面不丢失（模拟真实后端 token 行为�?
 * - Orders / Profile �?tab 切换而非独立路由，切换更快且 URL 不变
 * - "Sign out of all devices" 是真实后端的预留，当前实现与普通登出相�?
 *
 * 当前使用 localStorage 本地认证（见 AuthContext.js�?
 * 对接真实后端后无需修改此文件逻辑，只需替换 AuthContext 中的实现
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import FadeInUp from '../common/FadeInUp';
import { useAuth } from '../../context/AuthContext';
import { getUserOrders, requestRefund } from '../../utils/orders';
import '../../styles/AccountPage.css';

const API_BASE = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

function AccountPage() {
    const { user, login, logout, updateProfile, addAddress, removeAddress, updateAddress, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [tab, setTab] = useState('orders');   // 仪表盘标签页: 'orders' | 'profile'
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null); // null=添加模式, id=编辑模式
    const [addressForm, setAddressForm] = useState({
        label: '', street: '', suburb: '', postcode: ''
    });
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false); // 密码显隐切换
    const [error, setError] = useState('');
    const [orders, setOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(true);
    const [liveStatuses, setLiveStatuses] = useState({});

    // 从服务端 + localStorage 合并订单
    useEffect(() => {
        if (!user) { setOrdersLoading(false); return; }
        setOrdersLoading(true);
        (async () => {
            const localOrders = getUserOrders(user.email);
            try {
                const token = localStorage.getItem('jwt_token');
                if (!token) throw new Error('No token');
                const res = await fetch(`${API_BASE}/api/my-orders`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error('API error');
                const { orders: serverOrders } = await res.json();

                // 合并：以服务端为准，去重（按 wooCommerceId），保留本地无 WC ID 的旧订单
                const wcIds = new Set(serverOrders.map(o => o.wooCommerceId).filter(Boolean));
                const localOnly = localOrders.filter(o => !o.wooCommerceId || !wcIds.has(o.wooCommerceId));
                setOrders([...serverOrders, ...localOnly]);
            } catch {
                setOrders(localOrders);
            } finally {
                setOrdersLoading(false);
            }
        })();
    }, [user]);

    // 退款申请弹窗
    const [refundModal, setRefundModal] = useState(null); // { orderId, wcOrderId, order } | null
    const [refundReason, setRefundReason] = useState('');
    const [refundMessage, setRefundMessage] = useState('');
    const [refundImages, setRefundImages] = useState([]);
    const [refundSubmitting, setRefundSubmitting] = useState(false);
    const [refundError, setRefundError] = useState('');
    const [refundSuccess, setRefundSuccess] = useState(false);
    const [refundConfirming, setRefundConfirming] = useState(false);

    // 从服务端订单构建 liveStatus 映射
    useEffect(() => {
        const map = {};
        orders.forEach(o => {
            if (o.wooCommerceId) {
                map[o.id] = { id: o.id, status: o.status, number: o.number };
            }
        });
        setLiveStatuses(map);
    }, [orders]);

    const statusLabel = (s, order) => {
        const isPickup = order.items?.every(item => item.deliveryMethod === 'pickup');
        if (s === 'processing') return 'Processing';
        if (s === 'fulfilled') return isPickup ? 'Ready for Pickup' : 'Shipped';
        if (s === 'shipped') return 'Shipped';
        if (s === 'readyforpickup') return 'Ready for Pickup';
        if (s === 'completed') return isPickup ? 'Picked Up' : 'Delivered';
        if (s === 'cancelled' || s === 'Cancelled') return 'Cancelled';
        if (s === 'on-hold' || s === 'On Hold') return 'Awaiting Review';
        return s;
    };

    // 提交退款申请 — 第一步：显示确认
    const handleRefundSubmit = (e) => {
        e.preventDefault();
        if (!refundReason) { setRefundError('Please select a reason.'); return; }
        setRefundError('');
        setRefundConfirming(true);
    };

    // 第二步：确认后实际提交
    const handleRefundConfirm = async () => {
        setRefundSubmitting(true);
        setRefundError('');
        try {
            const fd = new FormData();
            fd.append('orderId', refundModal.orderId);
            if (refundModal.wcOrderId) fd.append('wcOrderId', refundModal.wcOrderId);
            fd.append('reason', refundReason);
            fd.append('message', refundMessage);
            fd.append('email', user.email);
            fd.append('name', user.name || '');
            refundImages.forEach((f) => fd.append('images', f));
            await requestRefund(fd);
            setRefundSuccess(true);
            setRefundConfirming(false);
        } catch (err) {
            setRefundError(err.message || 'Failed to submit refund request.');
        } finally {
            setRefundSubmitting(false);
        }
    };

    const openRefundModal = (order) => {
        const wcStatus = liveStatuses[order.id]?.status || order.status;
        if (wcStatus !== 'completed') return;
        setRefundModal({ orderId: order.id, wcOrderId: order.wooCommerceId, order });
        setRefundReason('');
        setRefundMessage('');
        setRefundImages([]);
        setRefundError('');
        setRefundSuccess(false);
        setRefundConfirming(false);
    };

    if (user) {
        return (
            <FadeInUp as="section" className="account-page">
                <div className="container">
                    <div className="account-header">
                        <h1>My Account</h1>
                        <div className="account-avatar">{user.firstName?.[0]?.toUpperCase() || user.name?.[0]?.toUpperCase() || 'U'}</div>
                    </div>

                    <nav className="account-tabs">
                        <button className={`account-tab${tab === 'orders' ? ' active' : ''}`} onClick={() => setTab('orders')}>Orders</button>
                        <button className={`account-tab${tab === 'profile' ? ' active' : ''}`} onClick={() => setTab('profile')}>Profile</button>
                    </nav>

                    {tab === 'orders' && (
                        <div className="account-card">
                            {ordersLoading ? (
                                <div className="account-empty"><p>Loading orders...</p></div>
                            ) : orders.length === 0 ? (
                                <div className="account-empty">
                                    <p>No orders yet.</p>
                                    <Link to="/collections/available-today" className="btn-primary">Go to store</Link>
                                </div>
                            ) : (
                                <div className="orders-list">
                                    {orders.map((order) => {
                                        const liveStatus = liveStatuses[order.id];
                                        const currentStatus = order.status === 'Cancelled' ? 'Cancelled' : (liveStatus?.status || order.status);
                                        return (
                                            <div key={order.id} className="order-card" onClick={() => navigate(`/order/${order.id}`)}>
                                                <div className="order-header">
                                                    <span className="order-id">{liveStatus?.number ? `#${liveStatus.number}` : order.id}</span>
                                                    <span className={`order-status-badge status-${currentStatus}`}>
                                                        {statusLabel(currentStatus, order)}
                                                    </span>
                                                </div>
                                                <p className="order-date">{new Date(order.date).toLocaleDateString()}</p>
                                                <div className="order-items">
                                                    {order.items.slice(0, 3).map((item) => (
                                                        <div key={item.id} className="order-item">
                                                            {item.image && <img src={item.image} alt={item.name} />}
                                                            <div className="order-item-info">
                                                                <span className="order-item-name">{item.name}</span>
                                                                <span className="order-item-qty">x{item.qty}</span>
                                                            </div>
                                                            <span className="order-item-price">${(item.price * item.qty).toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                    {order.items.length > 3 && (
                                                        <div className="order-item-more">+{order.items.length - 3} more items</div>
                                                    )}
                                                </div>
                                                <div className="order-total">
                                                    <span>Total</span>
                                                    <strong>${order.total.toFixed(2)}</strong>
                                                </div>
                                                {order.delivery?.address && (
                                                    <p className="order-delivery">
                                                        {order.delivery.suburb} {order.delivery.postcode}
                                                    </p>
                                                )}
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    {currentStatus === 'completed' && (
                                                        <button className="btn-refund-request" onClick={() => openRefundModal(order)}>Request Refund</button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'profile' && (
                        <>
                            <div className="account-card">
                                <div className="profile-row">
                                    <span className="profile-label">First Name</span>
                                    <span className="profile-value">{user.firstName}</span>
                                </div>
                                <div className="profile-row">
                                    <span className="profile-label">Last Name</span>
                                    <span className="profile-value">{user.lastName}</span>
                                </div>
                                <div className="profile-row">
                                    <span className="profile-label">Email</span>
                                    <span className="profile-value">{user.email}</span>
                                </div>
                            </div>

                            <div className="account-card">
                                <div className="address-header">
                                    <h2>Addresses</h2>
                                    <button className="btn-add" onClick={() => {
                                        setAddressForm({ label: '', street: '', suburb: '', postcode: '' });
                                        setEditingAddress(null);
                                        setShowAddressForm(true);
                                    }}>+ Add</button>
                                </div>
                                {(user.addresses || []).length === 0 ? (
                                    <p className="address-empty">No addresses added.</p>
                                ) : (
                                    <div className="address-list">
                                        {user.addresses.map((addr) => (
                                            <div key={addr.id} className="address-card">
                                                <div className="address-card-header">
                                                    <span className="address-label">{addr.label || 'Address'}</span>
                                                    <div className="address-actions">
                                                        <button className="address-edit" onClick={() => {
                                                            setAddressForm({
                                                                label: addr.label || '',
                                                                street: addr.street || '',
                                                                suburb: addr.suburb || '',
                                                                postcode: addr.postcode || '',
                                                            });
                                                            setEditingAddress(addr.id);
                                                            setShowAddressForm(true);
                                                        }}></button>
                                                        <button className="address-delete" onClick={() => removeAddress(addr.id)}></button>
                                                    </div>
                                                </div>
                                                <p className="address-detail">{addr.street}</p>
                                                <p className="address-detail">{addr.suburb}{addr.suburb ? ', ' : ''} {addr.postcode}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {showAddressForm && (
                                <div className="address-overlay">
                                    <div className="address-form-card">
                                        <div className="address-form-header">
                                            <h3>{editingAddress ? 'Edit Address' : 'Add Address'}</h3>
                                            <button className="address-form-close" onClick={() => setShowAddressForm(false)}></button>
                                        </div>
                                        <div className="address-form-body">
                                            <div className="form-group">
                                                <label>Label</label>
                                                <select value={addressForm.label} onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}>
                                                    <option value="">Select label</option>
                                                    <option value="Home">Home</option>
                                                    <option value="Work">Work</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label>Street Address</label>
                                                <input type="text" value={addressForm.street} onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })} placeholder="123 Main St" />
                                            </div>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Suburb</label>
                                                    <input type="text" value={addressForm.suburb} onChange={(e) => setAddressForm({ ...addressForm, suburb: e.target.value })} placeholder="Suburb" />
                                                </div>
                                            </div>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Postcode</label>
                                                    <input type="text" value={addressForm.postcode} onChange={(e) => setAddressForm({ ...addressForm, postcode: e.target.value })} placeholder="2000" />
                                                </div>
                                            </div>
                                            <div className="address-form-actions">
                                                <button className="profile-cancel" onClick={() => setShowAddressForm(false)}>Cancel</button>
                                                <button className="profile-save" onClick={() => {
                                                    if (!addressForm.street.trim()) return;
                                                    if (editingAddress) {
                                                        updateAddress(editingAddress, addressForm);
                                                    } else {
                                                        addAddress(addressForm);
                                                    }
                                                    setShowAddressForm(false);
                                                    setEditingAddress(null);
                                                }}>{editingAddress ? 'Update' : 'Save'}</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="account-actions">
                                <button className="btn-login btn-logout" onClick={() => { logout(); navigate('/'); }}>
                                    Sign out
                                </button>
                                <button className="btn-logout-all" onClick={() => { logout(); navigate('/'); }}>
                                    Sign out of all devices
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* 退款申请弹窗 */}
                {refundModal && (
                    <div className="refund-overlay" onClick={() => setRefundModal(null)}>
                        <div className="refund-modal" onClick={(e) => e.stopPropagation()}>
                            <button className="refund-modal-close" onClick={() => setRefundModal(null)}>&times;</button>
                            <h3>Request Refund</h3>
                            {refundSuccess ? (
                                <div className="refund-success">
                                    <p>Your refund request has been submitted.</p>
                                    <p className="refund-success-hint">We will review it and get back to you via email.</p>
                                    <button className="btn-primary" onClick={() => setRefundModal(null)}>Close</button>
                                </div>
                            ) : refundConfirming ? (
                                <div className="refund-confirm">
                                    <h4>Confirm Refund Request</h4>
                                    <div className="refund-confirm-details">
                                        <p><strong>Order:</strong> {refundModal.orderId}</p>
                                        <p><strong>Reason:</strong> {refundReason}</p>
                                        {refundMessage && <p><strong>Details:</strong> {refundMessage}</p>}
                                        {refundImages.length > 0 && <p><strong>Images:</strong> {refundImages.length} file(s)</p>}
                                    </div>
                                    <p className="refund-confirm-warning">Are you sure you want to submit this refund request?</p>
                                    {refundError && <p className="form-error">{refundError}</p>}
                                    <div className="refund-confirm-actions">
                                        <button className="btn-secondary" onClick={() => setRefundConfirming(false)}>Back</button>
                                        <button className="btn-primary" onClick={handleRefundConfirm} disabled={refundSubmitting}>
                                            {refundSubmitting ? 'Submitting...' : 'Confirm'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleRefundSubmit}>
                                    <p className="refund-order-id">Order: {refundModal.orderId}</p>
                                    <div className="form-group">
                                        <label>Reason *</label>
                                        <select value={refundReason} onChange={(e) => setRefundReason(e.target.value)} required>
                                            <option value="">-- Select a reason --</option>
                                            <option value="Quality Issue">Quality Issue</option>
                                            <option value="Late Delivery">Late Delivery</option>
                                            <option value="Wrong Item">Wrong Item</option>
                                            <option value="Damaged">Damaged</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Details</label>
                                        <textarea
                                            value={refundMessage}
                                            onChange={(e) => setRefundMessage(e.target.value)}
                                            placeholder="Please describe the issue..."
                                            rows={4}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Upload Images (optional)</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={(e) => setRefundImages(Array.from(e.target.files || []))}
                                        />
                                        {refundImages.length > 0 && (
                                            <div className="refund-image-preview">
                                                {refundImages.map((f, i) => (
                                                    <span key={i} className="refund-image-name">{f.name}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {refundError && <p className="form-error">{refundError}</p>}
                                    <button type="submit" className="btn-primary" disabled={refundSubmitting}>
                                        {refundSubmitting ? 'Submitting...' : 'Submit Request'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                )}
            </FadeInUp>
        );
    }

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        if (!email || !password) {
            setError('Please fill in all fields.');
            return;
        }
        const result = await login(email, password);
        if (result.success) {
            navigate(location.state?.from || '/account');
        } else {
            setError(result.error);
        }
    };

    return (
        <FadeInUp as="section" className="account-page">
            <div className="container">
                <div className="account-card">
                    <h1>Login</h1>
                    <form onSubmit={handleLogin}>
                        <div className="form-group">
                            <label>Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <div className="password-wrapper">
                                <input type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
                                <button type="button" className="pwd-toggle" onClick={() => setShowPwd(!showPwd)} tabIndex={-1}>
                                    {showPwd ? '🙈' : '👀'}
                                </button>
                            </div>
                        </div>
                        {error && <p className="form-error">{error}</p>}
                        <button type="submit" className="btn-login" disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                    <p className="account-footer">
                        Don't have an account? <Link to="/register" state={{ from: location.state?.from }}>Create one</Link>
                    </p>
                    <p className="demo-hint">Use a registered account to sign in.</p>
                </div>
            </div>
        </FadeInUp>
    );
}

export default AccountPage;