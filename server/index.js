/**
 * 支付 + 用户后端服务
 *
 * 核心职责：
 *   1. Stripe PaymentIntent 创建（原有）
 *   2. WooCommerce 客户注册（新增）
 *   3. 用户信息查询（新增）
 *
 * 启动方式：
 *   cd server && npm install && npm start
 *   默认运行在 http://localhost:5000
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;

const app = express();
app.use(cors());
app.use(express.json());

// ---------- WooCommerce 客户端（管理员权限） ----------
const wcApi = new WooCommerceRestApi({
  url: process.env.WC_URL,
  consumerKey: process.env.WC_KEY,
  consumerSecret: process.env.WC_SECRET,
  version: 'wc/v3',
  queryStringAuth: true,
});

// ============================================================
//  Stripe PaymentIntent
// ============================================================

/**
 * POST /create-payment-intent
 * Body: { amount: number }  — 金额（美元，如 92.95）
 * Returns: { clientSecret: string }
 */
app.post('/create-payment-intent', async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Stripe 以"分"为单位
            currency: 'aud',
            automatic_payment_methods: { enabled: true },
        });

        res.json({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
        console.error('[Stripe] Error creating PaymentIntent:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
//  用户注册（创建 WooCommerce 客户）
// ============================================================

/**
 * POST /api/register
 * Body: { firstName, lastName, email, password }
 * Returns: { success, user: { id, firstName, lastName, name, email } }
 */
app.post('/api/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // 检查邮箱是否已注册
    const existing = await wcApi.get('customers', { email });
    if (existing.data && existing.data.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // 通过 WooCommerce API 创建客户（同时创建 WordPress 用户）
    const { data } = await wcApi.post('customers', {
      email,
      first_name: firstName,
      last_name: lastName,
      username: email,             // 用邮箱作为用户名
      password,
      billing: {
        first_name: firstName,
        last_name: lastName,
        email,
      },
    });

    console.log('[Register] New customer created:', data.id, email);

    res.json({
      success: true,
      user: {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        name: `${data.first_name} ${data.last_name}`,
        email: data.email,
      },
    });
  } catch (err) {
    console.error('[Register] Error:', err.response?.data?.message || err.message);
    res.status(500).json({ error: err.response?.data?.message || 'Registration failed.' });
  }
});

// ============================================================
//  获取用户信息（需要 JWT 验证）
// ============================================================

/**
 * POST /api/me
 * Body: { token }  — JWT token
 * Returns: { id, firstName, lastName, name, email, billing, shipping, avatar }
 *
 * 通过 JWT token 验证身份后，到 WooCommerce 查询客户详情
 * WordPress /users/me 不返回 email，需通过 WP user ID 查找 WooCommerce 客户
 */
app.post('/api/me', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(401).json({ error: 'No token provided.' });

    // 用 JWT token 向 WordPress 验证用户身份，获取 WP user ID
    const wpResp = await fetch(`${process.env.WC_URL}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!wpResp.ok) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    const wpUser = await wpResp.json();

    // WooCommerce 客户 ID 与 WP 用户 ID 相同，直接按 ID 查找
    let customer = {};
    try {
      const { data } = await wcApi.get(`customers/${wpUser.id}`);
      customer = data;
    } catch {
      // 如果按 ID 找不到，尝试按 email 查找（兜底）
      // email 可以从 JWT 解码或从 wpUser 的接口获取
    }

    res.json({
      id: customer.id || wpUser.id,
      firstName: customer.first_name || '',
      lastName: customer.last_name || '',
      name: customer.first_name
        ? `${customer.first_name} ${customer.last_name}`
        : wpUser.name,
      email: customer.email || '',
      billing: customer.billing || {},
      shipping: customer.shipping || {},
      avatar: wpUser.avatar_urls?.['96'] || null,
    });
  } catch (err) {
    console.error('[Me] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

// ============================================================
//  更新用户信息（需要 JWT 验证）
// ============================================================

/**
 * PUT /api/me
 * Body: { token, firstName, lastName, billing, shipping }
 */
app.put('/api/me', async (req, res) => {
  try {
    const { token, ...updates } = req.body;
    if (!token) return res.status(401).json({ error: 'No token provided.' });

    // 验证 JWT
    const wpResp = await fetch(`${process.env.WC_URL}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!wpResp.ok) return res.status(401).json({ error: 'Invalid or expired token.' });

    const wpUser = await wpResp.json();

    // WooCommerce 客户 ID 与 WP 用户 ID 相同
    const customerId = wpUser.id;
    if (!customerId) return res.status(404).json({ error: 'Customer not found.' });

    // 构建更新数据
    const wcData = {};
    if (updates.firstName) wcData.first_name = updates.firstName;
    if (updates.lastName) wcData.last_name = updates.lastName;
    if (updates.billing) wcData.billing = updates.billing;
    if (updates.shipping) wcData.shipping = updates.shipping;

    await wcApi.put(`customers/${customerId}`, wcData);

    res.json({ success: true });
  } catch (err) {
    console.error('[Update Profile] Error:', err.message);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// ============================================================
//  创建 WooCommerce 订单
// ============================================================

/**
 * POST /api/create-order
 * Body: { items, customer, shipping, paymentMethod, token? }
 *
 * 接受前端结账数据，在 WooCommerce 中创建订单
 * 如果提供了 JWT token，会关联到对应的客户账号
 */
app.post('/api/create-order', async (req, res) => {
  try {
    const { items, customer, shipping, paymentMethod, token } = req.body;

    if (!items?.length) {
      return res.status(400).json({ error: 'Order must have at least one item.' });
    }

    // 如果已登录，用 JWT token 关联到 WooCommerce 客户
    let customerId = 0;
    if (token) {
      try {
        const wpResp = await fetch(`${process.env.WC_URL}/wp-json/wp/v2/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (wpResp.ok) {
          const wpUser = await wpResp.json();
          customerId = wpUser.id;
        }
      } catch {
        // token 验证失败，按游客处理
      }
    }

    const orderData = {
      payment_method: 'stripe',
      payment_method_title: 'Stripe (Card)',
      set_paid: true,
      billing: {
        first_name: customer?.firstName || '',
        last_name: customer?.lastName || '',
        address_1: shipping?.address || '',
        city: shipping?.suburb || '',
        postcode: shipping?.postcode || '',
        email: customer?.email || '',
        phone: shipping?.phone || '',
      },
      shipping: {
        first_name: customer?.firstName || '',
        last_name: customer?.lastName || '',
        address_1: shipping?.address || '',
        city: shipping?.suburb || '',
        postcode: shipping?.postcode || '',
      },
      line_items: items.map((item) => ({
        product_id: parseInt(item.id, 10),
        quantity: item.qty,
        price: parseFloat(item.sale_price || item.price || 0).toFixed(2),
      })),
      customer_id: customerId,
      customer_note: items
        .filter(item => item.giftMessage)
        .map(item => `Gift Message for "${item.name}": ${item.giftMessage}`)
        .join(' | '),
    };

    const { data } = await wcApi.post('orders', orderData);

    console.log('[Order] Created:', data.id, 'for', customer?.email || 'guest');

    res.json({
      success: true,
      orderId: data.id,
      orderNumber: data.number,
      dateCreated: data.date_created,
      total: data.total,
      status: data.status,
    });
  } catch (err) {
    console.error('[Order] Error:', err.response?.data?.message || err.message);
    res.status(500).json({ error: err.response?.data?.message || 'Failed to create order.' });
  }
});

// ============================================================
//  WooCommerce API 代理（前端通过此接口调用 WooCommerce）
// ============================================================

/**
 * 所有 /api/wc/:endpoint 请求转发到 WooCommerce REST API
 * 前端无需直接暴露 API 密钥，也避免了浏览器 OAuth 签名问题
 */
app.all('/api/wc/:endpoint*', async (req, res) => {
  try {
    // 提取完整端点路径（如 "products/28" ）
    const suffix = req.params[0] || '';
    const endpoint = `${req.params.endpoint}${suffix}`;
    const method = req.method.toLowerCase();

    const params = { ...req.query };

    let result;
    switch (method) {
      case 'get':
        result = await wcApi.get(endpoint, params);
        break;
      case 'post':
        result = await wcApi.post(endpoint, req.body);
        break;
      case 'put':
        result = await wcApi.put(endpoint, req.body);
        break;
      case 'delete':
        result = await wcApi.delete(endpoint);
        break;
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 转发 WooCommerce 的分页头部
    if (result.headers) {
      if (result.headers['x-wp-total']) {
        res.set('X-WP-Total', result.headers['x-wp-total']);
      }
      if (result.headers['x-wp-totalpages']) {
        res.set('X-WP-TotalPages', result.headers['x-wp-totalpages']);
      }
    }

    res.json(result.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message;
    console.error(`[WC Proxy] ${req.method} ${req.path} -> ${status}: ${message}`);
    res.status(status).json({ error: message });
  }
});

// ============================================================
//  启动服务
// ============================================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
