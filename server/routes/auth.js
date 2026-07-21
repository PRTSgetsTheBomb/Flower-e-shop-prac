/**
 * 认证 & 用户路由
 *
 * 路由清单：
 *   POST /api/admin/login          管理员登录（JWT）
 *   POST /api/admin/verify         验证 token 有效性
 *   POST /api/admin/verify-password 二次密码验证（敏感操作前）
 *   POST /api/register             用户注册（创建 WooCommerce 客户）
 *   POST /api/me                   获取当前用户信息
 *   PUT  /api/me                   更新用户资料
 */
const express = require('express');
const router = express.Router();
const wcApi = require('../lib/woocommerce');
const { verifyAdmin } = require('../middleware/adminAuth');

// POST /api/admin/login
router.post('/api/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
        const jwtResp = await fetch(`${process.env.WC_URL}/wp-json/jwt-auth/v1/token`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: email, password }),
        });
        if (!jwtResp.ok) {
            const err = await jwtResp.json().catch(() => ({}));
            const msg = (err.message || 'Invalid credentials').replace(/<[^>]+>/g, '').trim();
            return res.status(401).json({ error: msg });
        }
        const { token } = await jwtResp.json();
        const user = await verifyAdmin(token);
        if (!user) return res.status(401).json({ error: 'Admin access required.' });
        console.log(`[Admin] Login: ${user.name} (${user.email})`);
        res.json({
            token, user: {
                name: user.name,
                email: user.email || email,
            }
        });
    } catch (err) {
        console.error('[Login] Error: ', err.message);
        res.status(500).json({ error: 'Login failed.' });
    }
});

// POST /api/admin/verify
router.post('/api/admin/verify', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.json({ valid: false });
        const user = await verifyAdmin(token);
        if (!user) return res.json({ valid: false });
        res.json({
            valid: true, user: {
                name: user.name,
                email: user.email
            }
        });
    } catch {
        res.json({ valid: false });
    }
});

// POST /api/admin/verify-password
// 二次认证：用于取消订单等敏感操作
router.post('/api/admin/verify-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) return res.json({ valid: false });

        const wsResp = await fetch(`${process.env.WC_URL}/wp-json/wp/v2/users/me?context=edit`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!wsResp.ok) return res.json({ valid: false });
        const wpUser = await wsResp.json();
        const adminRoles = ['administrator', 'shop_manager', 'editor'];
        if (!wpUser.roles?.some(r => adminRoles.includes(r))) return res.json({ valid: false });

        const jwtResp = await fetch(`${process.env.WC_URL}/wp-json/jwt-auth/v1/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: wpUser.email || wpUser.slug, password }),
        });
        res.json({ valid: jwtResp.ok });
    } catch {
        res.json({ valid: false });
    }
});

// POST /api/register
router.post('/api/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        if (!email || !password || !firstName || !lastName) return res.status(400).json({ error: 'All fields required.' });
        const existing = await wcApi.get('customers', { email });
        if (existing.data?.length > 0) return res.status(409).json({ error: 'Email already registered.' });
        const { data } = await wcApi.post('customers', {
            email, first_name: firstName, last_name: lastName, username: email, password,
            billing: { first_name: firstName, last_name: lastName, email },
        });
        console.log('[Register] Customer:', data.id, email);
        res.json({ success: true, user: { id: data.id, firstName: data.first_name, lastName: data.last_name, name: `${data.first_name} ${data.last_name}`, email: data.email } });
    } catch (err) {
        res.status(500).json({ error: err.response?.data?.message || 'Registration failed.' });
    }
});

// POST /api/me
router.post('/api/me', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(401).json({ error: 'No token.' });
        const wpResp = await fetch(`${process.env.WC_URL}/wp-json/wp/v2/users/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!wpResp.ok) return res.status(401).json({ error: 'Invalid token' });
        const wpUser = await wpResp.json();
        let c = {}; try { c = (await wcApi.get(`customers/${wpUser.id}`)).data; } catch { };
        res.json({
            id: c.id || wpUser.id, firstName: c.first_name || '', lastName: c.last_name || '',
            name: c.first_name ? `${c.first_name} ${c.last_name}` : wpUser.name, email: c.email || '',
            billing: c.billing || {}, shipping: c.shipping || {}, avatar: wpUser.avatar_urls?.['96'] || null
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// PUT /api/me
router.put('/api/me', async (req, res) => {
    try {
        const { token, ...updates } = req.body;
        if (!token) return res.status(401).json({ error: 'No token.' });
        const wpResp = await fetch(`${process.env.WC_URL}/wp-json/wp/v2/users/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!wpResp.ok) return res.status(401).json({ error: 'Invalid token.' });
        const wpUser = await wpResp.json();
        const d = {};
        if (updates.firstName) d.first_name = updates.firstName;
        if (updates.lastName) d.last_name = updates.lastName;
        if (updates.billing) d.billing = updates.billing;
        if (updates.shipping) d.shipping = updates.shipping;
        await wcApi.put(`customers/${wpUser.id}`, d);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update profile.' });
    }
});

// POST /api/create-order
router.post('/api/create-order', async (req, res) => {
    try {
        const { items, customer, shipping, paymentMethod, token } = req.body;
        if (!items?.length) return res.status(400).json({ error: 'Order needs items.' });
        let customerId = 0;
        if (token) {
            try {
                const r = await fetch(`${process.env.WC_URL}/wp-json/wp/v2/users/me`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }); if (r.ok) customerId = (await r.json()).id;
            } catch { }
        }
        const { data } = await wcApi.post('orders', {
            payment_method: 'stripe', payment_method_title: 'Stripe (Card)', status: 'on-hold',
            billing: { first_name: customer?.firstName || '', last_name: customer?.lastName || '', address_1: shipping?.address || '', city: shipping?.suburb || '', postcode: shipping?.postcode || '', email: customer?.email || '', phone: shipping?.phone || '' },
            shipping: { first_name: customer?.firstName || '', last_name: customer?.lastName || '', address_1: shipping?.address || '', city: shipping?.suburb || '', postcode: shipping?.postcode || '' },
            line_items: items.map(i => ({
                product_id: +i.id, quantity: i.qty, price: parseFloat(i.sale_price || i.price || 0).toFixed(2),
                meta_data: [...(i.deliveryDate ? [{ key: 'Delivery Date', value: i.deliveryDate }] : []), ...(i.deliveryMethod ? [{ key: 'Delivery Method', value: i.deliveryMethod }] : []), ...(i.giftMessage ? [{ key: 'Gift Message', value: i.giftMessage }] : []), ...(i.deliveryNote ? [{ key: 'Delivery Note', value: i.deliveryNote }] : [])]
            })),
            customer_id: customerId,
            meta_data: [{ key: 'delivery_method', value: items.every(i => i.deliveryMethod !== 'delivery') ? 'Pickup' : items.every(i => i.deliveryMethod === 'delivery') ? 'Delivery' : 'Mixed' }],
        });
        console.log('[order] Created:', data.id, customer?.email || 'guest');
        const { sendOrderConfirmation } = require('../services/mail');
        sendOrderConfirmation({ to: customer?.email, name: [customer?.firstName, customer?.lastName].filter(Boolean).join(' ') || 'Valued Customer', orderId: data.id, total: parseFloat(data.total), items: items.map(i => ({ name: i.name, qty: i.qty, price: parseFloat(i.sale_price || i.price || 0) })), status: data.status, deliveryMethod: items.some(i => i.deliveryMethod === 'delivery') ? 'Delivery' : 'Pickup', deliveryAddress: shipping ? { address: shipping.address, suburb: shipping.suburb, postcode: shipping.postcode, phone: shipping.phone } : null, pickupLocation: 'Pisces Flower Studio, Oakleigh South, Melbourne', deliveryTime: items.find(i => i.deliveryDate)?.deliveryDate || null });
        res.json({ success: true, orderId: data.id, orderNumber: data.number, dateCreated: data.date_created, total: data.total, status: data.status });
    } catch (err) {
        res.status(500).json({ error: err.response?.data?.message || 'Failed to create order. ' });
    }
});

module.exports = router;