/**
 * 账户页面（/account）：双状态页面
 *
 * 设计说明：
 * - 用 if (user) 提前 return 代替 JSX 三元表达式，因为登录前/后 UI 差异极大，
 *   两个独立 return 块可读性远强于一个巨大的嵌套三元表达式
 * - 密码显隐按钮（👁️/🙈）让用户确认输入无误再提交，减少输错导致的挫败感
 * - tabIndex={-1} 使密码切换按钮不可通过 Tab 聚焦，保持表单键盘导航顺畅
 * - e.preventDefault() 阻止表单默认提交行为（刷新页面），保持 SPA 体验
 * - 先前端校验非空再调 login()，避免不必要的异步请求
 * - localStorage 持久化登录状态，刷新页面不丢失（模拟真实后端 token 行为）
 * - Orders / Profile 用 tab 切换而非独立路由，切换更快且 URL 不变
 * - "Sign out of all devices" 是真实后端的预留，当前实现与普通登出相同
 *
 * 当前使用 localStorage 本地认证（见 AuthContext.js）
 * 对接真实后端后无需修改此文件逻辑，只需替换 AuthContext 中的实现
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import FadeInUp from '../../components/FadeInUp';
import { useAuth } from '../../context/AuthContext';
import { getUserOrders } from '../../utils/orders';
import '../PageStyles/AccountPage.css';

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
    const orders = user ? getUserOrders(user.email) : [];
    const [liveStatuses, setLiveStatuses] = useState({});

    // 从 WooCommerce 同步订单状态
    useEffect(() => {
        if (!orders.length) return;
        const wcOrders = orders.filter(o => o.wooCommerceId);
        if (!wcOrders.length) return;

        const fetchStatus = async (order) => {
            try {
                const res = await fetch(`${API_BASE}/api/order/${order.wooCommerceId}`);
                if (!res.ok) return null;
                const data = await res.json();
                return { id: order.id, status: data.status };
            } catch { return null; }
        };

        Promise.all(wcOrders.map(fetchStatus)).then(results => {
            const map = {};
            results.forEach(r => { if (r) map[r.id] = r.status; });
            setLiveStatuses(map);
        });
    }, [orders.length]);

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
                            <h2>Orders</h2>
                            {orders.length === 0 ? (
                                <div className="account-empty">
                                    <p>No orders yet.</p>
                                    <Link to="/collections/available-today" className="btn-primary">Go to store</Link>
                                </div>
                            ) : (
                                <div className="orders-list">
                                    {orders.map((order) => (
                                        <Link key={order.id} to={`/order/${order.id}`} className="order-card-link">
                                            <div className="order-card">
                                                <div className="order-header">
                                                    <span className="order-id">{order.id}</span>
                                                    <span className="order-status">{liveStatuses[order.id] || order.status}</span>
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
                                                {user.name && (
                                                    <p className="order-delivery">
                                                        Paid by <strong>{user.name}</strong>
                                                    </p>
                                                )}
                                                {order.delivery?.address && (
                                                    <p className="order-delivery">
                                                        Deliver to: {order.delivery.address}, {order.delivery.suburb} {order.delivery.postcode}
                                                    </p>
                                                )}
                                            </div>
                                        </Link>
                                    ))}
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
                                                        }}>✎</button>
                                                        <button className="address-delete" onClick={() => removeAddress(addr.id)}>✕</button>
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
                                            <button className="address-form-close" onClick={() => setShowAddressForm(false)}>✕</button>
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
                                    {showPwd ? '🙈' : '👁️'}
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