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
const { sendOrderConfirmation, sendOrderShipped, sendOrderReadyForPickup, sendOrderCompleted } = require('./mail');

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
      status: 'on-hold',   // 商家在 WooCommerce 后台手动改为 processing（不用 set_paid，因为 WooCommerce 会覆盖 status）
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
        meta_data: [
          ...(item.deliveryDate ? [{ key: 'Delivery Date', value: item.deliveryDate }] : []),
          ...(item.deliveryMethod ? [{ key: 'Delivery Method', value: item.deliveryMethod }] : []),
          ...(item.giftMessage ? [{ key: 'Gift Message', value: item.giftMessage }] : []),
        ],
      })),
      customer_id: customerId,
      customer_note: items
        .filter(item => item.giftMessage)
        .map(item => `Gift Message for "${item.name}": ${item.giftMessage}`)
        .join(' | '),
      meta_data: [
        {
          key: 'delivery_method',
          value: items.some(item => item.deliveryMethod === 'delivery') ? 'Delivery' : 'Pickup',
        },
      ],
    };

    const { data } = await wcApi.post('orders', orderData);

    console.log('[Order] Created:', data.id, 'for', customer?.email || 'guest');

    // 异步发送订单确认邮件（不阻塞响应）
    const customerName = [customer?.firstName, customer?.lastName].filter(Boolean).join(' ') || 'Valued Customer';
    const deliveryMethod = items.some(item => item.deliveryMethod === 'delivery') ? 'Delivery' : 'Pickup';
    sendOrderConfirmation({
      to: customer?.email,
      name: customerName,
      orderId: data.id,
      total: parseFloat(data.total),
      items: items.map((item) => ({
        name: item.name,
        qty: item.qty,
        price: parseFloat(item.sale_price || item.price || 0),
      })),
      status: data.status,
      deliveryMethod,
      deliveryAddress: shipping ? { address: shipping.address, suburb: shipping.suburb, postcode: shipping.postcode, phone: shipping.phone } : null,
      pickupLocation: 'Pisces Flower Studio, Oakleigh South, Melbourne',
      deliveryTime: items.find(item => item.deliveryDate)?.deliveryDate || null,
    });

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
//  订单查询 & 状态更新
// ============================================================

/**
 * GET /api/order/:id — 从 WooCommerce 获取订单实时状态（含各步骤时间戳）
 */
app.get('/api/order/:id', async (req, res) => {
  try {
    const { data } = await wcApi.get(`orders/${req.params.id}`);
    const findMeta = (key) => data.meta_data?.find(m => m.key === key)?.value || null;
    res.json({
      id: data.id,
      number: data.number,
      status: data.status,
      dateCreated: data.date_created,
      datePaid: data.date_paid,
      dateShipped: findMeta('_date_shipped'),
      dateCompleted: data.date_completed,
      total: data.total,
      customerNote: data.customer_note,
      billing: data.billing,
      shipping: data.shipping,
      lineItems: data.line_items.map(item => ({
        id: item.id,
        name: item.name,
        qty: item.quantity,
        price: item.price,
        image: item.image?.src || null,
        deliveryDate: item.meta_data?.find(m => m.key === 'Delivery Date')?.value || '',
        deliveryMethod: item.meta_data?.find(m => m.key === 'Delivery Method')?.value || (data.shipping?.address_1 ? 'delivery' : 'pickup'),
        giftMessage: item.meta_data?.find(m => m.key === 'Gift Message')?.value || '',
      })),
    })
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data?.message || err.message })
  }
});

/**
 * PUT /api/order/:id/status — 更新订单状态并记录时间戳
 * Body: { status: "processing" | "shipped" | "readyforpick" | "completed" }
 *
 * 状态变更时自动写入对应时间戳到 order meta_data：
 *   - shipped       → 记录 _date_shipped
 *   - readyforpick  → 记录 _date_readyforpick
 *   - completed     → 记录 _date_completed
 * 一次变更只打一个时间戳，历史步骤逐步点亮
 */
app.put('/api/order/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required.' });

    // 获取当前订单已有的 meta_data
    const { data: current } = await wcApi.get(`orders/${req.params.id}`);
    const meta = (current.meta_data || []).map(m => ({ key: m.key, value: m.value }));

    // 为当前状态记录时间戳
    const now = new Date().toISOString();
    const timestampKey = `_date_${status}`;
    const exists = meta.find(m => m.key === timestampKey);
    if (exists) {
      exists.value = now;
    } else {
      meta.push({ key: timestampKey, value: now });
    }

    await wcApi.put(`orders/${req.params.id}`, { status, meta_data: meta });

    // 状态变更时发送通知邮件
    const customerName = [current.billing?.first_name, current.billing?.last_name].filter(Boolean).join(' ') || 'Valued Customer';
    const email = current.billing?.email;
    const items = current.line_items?.map(item => ({ name: item.name, qty: item.quantity, price: parseFloat(item.price) })) || [];
    const deliveryMeta = (current.meta_data || []).find(m => m.key === 'delivery_method');
    const deliveryMethod = deliveryMeta?.value === 'Delivery' ? 'Delivery' : 'Pickup';

    if (email) {
      if (status === 'processing') {
        const deliveryDate = (current.line_items || []).find(li => li.meta_data?.find(m => m.key === 'Delivery Date'))?.meta_data?.find(m => m.key === 'Delivery Date')?.value || null;
        sendOrderConfirmation({ to: email, name: customerName, orderId: req.params.id, total: parseFloat(current.total), items, status: 'processing', deliveryMethod, deliveryAddress: current.shipping, pickupLocation: 'Pisces Flower Studio, Oakleigh South, Melbourne', deliveryTime: deliveryDate });
      } else if (status === 'shipped') {
        sendOrderShipped({ to: email, name: customerName, orderId: req.params.id, items, deliveryAddress: current.shipping });
      } else if (status === 'readyforpickup') {
        sendOrderReadyForPickup({ to: email, name: customerName, orderId: req.params.id, items, pickupLocation: 'Pisces Flower Studio, Oakleigh South, Melbourne' });
      } else if (status === 'completed') {
        sendOrderCompleted({ to: email, name: customerName, orderId: req.params.id, deliveryMethod });
      }
    }

    res.json({ success: true, status, timestamp: now });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// ============================================================
//  WooCommerce Webhook — 订单状态变更通知
// ============================================================

/**
 * POST /api/webhook/order-status
 * 由 WooCommerce 在订单状态变更时调用
 *
 * 配置方式：
 *   WooCommerce 后台 → 设置 → 高级 → Webhooks → 添加
 *   - Topic: Order status changed
 *   - Delivery URL: http://YOUR_SERVER:5000/api/webhook/order-status
 *   - Secret: 可选，用于验签
 */
app.post('/api/webhook/order-status', express.json({ type: 'application/json' }), async (req, res) => {
  // 立即返回 200，避免 WooCommerce 重试
  res.status(200).json({ received: true });

  try {
    const order = req.body;
    if (!order?.id || !order?.status) return;

    const status = order.status;
    const email = order.billing?.email;
    if (!email) return;

    const customerName = [order.billing?.first_name, order.billing?.last_name].filter(Boolean).join(' ') || 'Valued Customer';
    const rawItems = Array.isArray(order.line_items) ? order.line_items : (order.line_items ? Object.values(order.line_items) : []);
    const items = rawItems.map(item => ({ name: item.name || item.product_name, qty: item.quantity || item.qty, price: parseFloat(item.price || 0) }));
    const deliveryMeta = (order.meta_data || []).find(m => m.key === 'delivery_method');
    const deliveryMethod = deliveryMeta?.value === 'Delivery' ? 'Delivery' : 'Pickup';

    // 忽略初始创建状态，因为下单时已发了确认邮件
    if (status === 'on-hold' || status === 'pending') return;

    console.log('[Webhook] Order', order.id, 'status changed to', status);

    if (status === 'processing') {
      const deliveryDate = order.line_items?.find(li => li.meta_data?.find(m => m.key === 'Delivery Date'))?.meta_data?.find(m => m.key === 'Delivery Date')?.value || null;
      sendOrderConfirmation({ to: email, name: customerName, orderId: order.id, total: parseFloat(order.total), items, status: 'processing', deliveryMethod, deliveryAddress: order.shipping, pickupLocation: 'Pisces Flower Studio, Oakleigh South, Melbourne', deliveryTime: deliveryDate });
    } else if (status === 'shipped') {
      sendOrderShipped({ to: email, name: customerName, orderId: order.id, items, deliveryAddress: order.shipping });
    } else if (status === 'readyforpickup') {
      sendOrderReadyForPickup({ to: email, name: customerName, orderId: order.id, items, pickupLocation: 'Pisces Flower Studio, Oakleigh South, Melbourne' });
    } else if (status === 'completed') {
      sendOrderCompleted({ to: email, name: customerName, orderId: order.id, deliveryMethod });
    }
  } catch (err) {
    console.error('[Webhook] Error processing order status:', err.message);
  }
});

// ============================================================
//  检查用户是否可以评价某商品
// ============================================================

/**
 * POST /api/can-review
 * Body: { token, productId }
 * Returns: { canReview: boolean }
 *
 * 检查登录用户是否有该商品的 completed 订单
 */
app.post('/api/can-review', async (req, res) => {
  try {
    const { token, productId } = req.body;
    if (!token || !productId) {
      return res.json({ canReview: false });
    }

    // 用 JWT 获取 WordPress 用户信息
    const wpResp = await fetch(`${process.env.WC_URL}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!wpResp.ok) return res.json({ canReview: false });

    const wpUser = await wpResp.json();

    // 通过 WooCommerce 获取客户邮箱
    let customerEmail = '';
    try {
      const { data: customer } = await wcApi.get(`customers/${wpUser.id}`);
      customerEmail = customer.email || '';
    } catch { }

    // 获取该用户的所有已完成的 WooCommerce 订单
    let orders = [];
    try {
      const byCustomer = await wcApi.get('orders', {
        customer: wpUser.id,
        status: 'completed',
        per_page: 100,
      });
      orders = byCustomer.data;
    } catch { }

    // 如果按 customer_id 没查到，改用 email 搜索
    if (orders.length === 0 && customerEmail) {
      try {
        const byEmail = await wcApi.get('orders', {
          search: customerEmail,
          status: 'completed',
          per_page: 100,
        });
        orders = byEmail.data;
      } catch { }
    }

    const canReview = orders.some(order =>
      order.line_items?.some(item => String(item.product_id) === String(productId))
    );

    res.json({ canReview });
  } catch (err) {
    console.error('[CanReview] Error:', err.message);
    res.json({ canReview: false });
  }
});

// ============================================================
//  评价 CRUD（本地 JSON 文件存储）
// ============================================================

const fs = require('fs');
const path = require('path');
const REVIEWS_FILE = path.join(__dirname, 'reviews.json');

function readReviews() {
  try { return JSON.parse(fs.readFileSync(REVIEWS_FILE, 'utf-8')); }
  catch { return {}; }
}

function writeReviews(data) {
  fs.writeFileSync(REVIEWS_FILE, JSON.stringify(data, null, 2));
}

/**
 * GET /api/reviews?productId=xxx
 * 获取某商品的所有评价（含来自 WooCommerce 的商家回复）
 */
app.get('/api/reviews', async (req, res) => {
  const { productId } = req.query;
  const all = readReviews();
  const reviews = all[productId] || [];

  // 对有 wc_review_id 的评价，从 WordPress 拉取商家回复
  for (const review of reviews) {
    if (!review.wc_review_id) continue;
    try {
      const resp = await fetch(
        `${process.env.WC_URL}/wp-json/wp/v2/comments?parent=${review.wc_review_id}`
      );
      if (!resp.ok) continue;
      const comments = await resp.json();
      const adminReply = comments.find(c => c.author_name !== review.author);
      if (adminReply) {
        review.reply = {
          author: adminReply.author_name,
          text: adminReply.content?.rendered?.replace(/<[^>]+>/g, '') || '',
          date: adminReply.date,
        };
      }
    } catch { }
  }

  res.json(reviews);
});

/**
 * POST /api/reviews
 * Body: { token, productId, rating, text }
 * 提交评价（需 JWT 验证），同时同步到 WooCommerce
 */
app.post('/api/reviews', async (req, res) => {
  try {
    const { token, productId, rating, text } = req.body;
    if (!token || !productId || !rating || !text) {
      return res.json({ success: false, error: 'Missing required fields.' });
    }

    // 用 JWT 获取用户信息
    const wpResp = await fetch(`${process.env.WC_URL}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!wpResp.ok) return res.json({ success: false, error: 'Invalid token.' });
    const wpUser = await wpResp.json();

    const review = {
      id: `rev_${Date.now()}`,
      author: wpUser.name,
      rating: Math.min(5, Math.max(1, Number(rating))),
      text,
      date: new Date().toISOString(),
    };

    // 写入本地 JSON
    const all = readReviews();
    all[productId] = [review, ...(all[productId] || [])];
    writeReviews(all);

    // 同步到 WooCommerce 商品评价（不影响本地保存）
    try {
      const wcRes = await wcApi.post('products/reviews', {
        product_id: Number(productId),
        reviewer: wpUser.name,
        reviewer_email: wpUser.email || '',
        rating: Number(rating),
        review: text,
        status: 'approved',
      });
      const wcId = wcRes.data?.id;
      if (wcId) {
        console.log(`[Reviews] Synced to WooCommerce: review #${wcId} for product #${productId}`);
        const updated = readReviews();
        const target = updated[productId]?.find((r) => r.id === review.id);
        if (target) target.wc_review_id = wcId;
        writeReviews(updated);
      } else {
        console.warn('[Reviews] WooCommerce response:', JSON.stringify(wcRes.data));
      }
    } catch (wcErr) {
      console.warn('[Reviews] WooCommerce sync error:',
        wcErr.response?.status,
        JSON.stringify(wcErr.response?.data || wcErr.message)
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Reviews] POST error:', err.message);
    res.json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/reviews
 * Body: { token, reviewId }
 * 删除评价（需 JWT 验证 + 验证所有权），同时从 WooCommerce 删除
 */
app.delete('/api/reviews', async (req, res) => {
  try {
    const { token, reviewId } = req.body;
    if (!token || !reviewId) {
      return res.json({ success: false, error: 'Missing required fields.' });
    }

    // 用 JWT 获取用户信息
    const wpResp = await fetch(`${process.env.WC_URL}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!wpResp.ok) return res.json({ success: false, error: 'Invalid token.' });
    const wpUser = await wpResp.json();

    const all = readReviews();
    // 在所有商品中查找并删除匹配的评价
    for (const pid of Object.keys(all)) {
      const before = all[pid].length;
      const deleted = all[pid].find((r) => r.id === reviewId && r.author === wpUser.name);
      all[pid] = all[pid].filter((r) => r.id !== reviewId || r.author !== wpUser.name);
      if (all[pid].length !== before) {
        // 同步删除 WooCommerce 评价
        const wcId = deleted?.wc_review_id;
        if (wcId) {
          try {
            await wcApi.delete(`products/reviews/${wcId}`, { force: true });
            console.log(`[Reviews] Deleted WooCommerce review #${wcId}`);
          } catch (wcErr) {
            console.warn('[Reviews] WooCommerce delete error:', wcErr.response?.status, JSON.stringify(wcErr.response?.data || wcErr.message));
          }
        }
        break;
      }
    }
    writeReviews(all);

    res.json({ success: true });
  } catch (err) {
    console.error('[Reviews] DELETE error:', err.message);
    res.json({ success: false, error: err.message });
  }
});

// ============================================================
//  商家回复评价
//  PUT /api/reviews/reply
//  Body: { token, reviewId, text }
//  需要 admin 级别的 JWT token
// ============================================================

app.put('/api/reviews/reply', async (req, res) => {
  try {
    const { token, reviewId, text } = req.body;
    if (!token || !reviewId || !text) {
      return res.json({ success: false, error: 'Missing required fields.' });
    }

    // 验证 token 是否为管理员
    const wpResp = await fetch(`${process.env.WC_URL}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!wpResp.ok) return res.json({ success: false, error: 'Invalid token.' });
    const wpUser = await wpResp.json();

    // 检查是否有管理员权限（editor 或 administrator）
    const adminRoles = ['administrator', 'editor', 'shop_manager'];
    const isAdmin = wpUser.roles?.some(r => adminRoles.includes(r));
    if (!isAdmin) {
      return res.json({ success: false, error: 'Only store admins can reply to reviews.' });
    }

    // 在所有商品中查找该评价并添加回复
    const all = readReviews();
    let found = false;
    for (const pid of Object.keys(all)) {
      const review = all[pid].find(r => r.id === reviewId);
      if (review) {
        review.reply = {
          author: wpUser.name,
          text: text.trim(),
          date: new Date().toISOString(),
        };
        found = true;
        break;
      }
    }

    if (!found) {
      return res.json({ success: false, error: 'Review not found.' });
    }

    writeReviews(all);

    res.json({ success: true });

    res.json({ success: true });
  } catch (err) {
    console.error('[Reviews] Reply error:', err.message);
    res.json({ success: false, error: err.message });
  }
});

// ============================================================
//  手动补传：将 reviews.json 中未同步的评价写入 WooCommerce
//  访问一次 GET /api/sync-reviews 即可触发
// ============================================================

app.get('/api/sync-reviews', async (req, res) => {
  const all = readReviews();
  let synced = 0, failed = 0;

  for (const [productId, reviews] of Object.entries(all)) {
    for (const review of reviews) {
      if (review.wc_review_id) continue;
      try {
        const wcRes = await wcApi.post('products/reviews', {
          product_id: Number(productId),
          reviewer: review.author,
          reviewer_email: '',
          rating: Number(review.rating),
          review: review.text,
          status: 'approved',
        });
        const wcId = wcRes.data?.id;
        if (wcId) { review.wc_review_id = wcId; synced++; }
        else { failed++; }
      } catch { failed++; }
    }
  }

  writeReviews(all);
  res.json({ synced, failed, total: synced + failed });
  console.log(`[Sync] Reviews backfill: ${synced} synced, ${failed} failed`);
});

// ============================================================
//  获取订单数据（分析用）
// ============================================================

/**
 * GET /api/orders — 获取 WooCommerce 订单数据，支持筛选和分页
 *
 * Query 参数：
 *   status    — 按状态筛选（processing, shipped, completed, on-hold, etc.）
 *   startDate — 开始日期 (YYYY-MM-DD)
 *   endDate   — 结束日期 (YYYY-MM-DD)
 *   page      — 页码（默认 1）
 *   perPage   — 每页数量（默认 20，最大 100）
 *   search    — 按邮箱或姓名搜索
 *
 * Returns:
 *   { orders: [...], total, totalPages, currentPage }
 */
app.get('/api/orders', async (req, res) => {
  try {
    const { status, startDate, endDate, page = 1, perPage = 20, search } = req.query;
    const limit = Math.min(parseInt(perPage, 10) || 20, 100);

    // 构建 WooCommerce 查询参数
    const params = {
      per_page: limit,
      page: parseInt(page, 10),
      orderby: 'date',
      order: 'desc',
    };

    if (status) params.status = status;
    if (search) params.search = search;

    // 日期范围筛选
    let after = null;
    let before = null;
    if (startDate) after = `${startDate}T00:00:00`;
    if (endDate) before = `${endDate}T23:59:59`;

    // WooCommerce API 不支持直接用 after/before 筛选，
    // 我们分批拉取所有订单，在内存中过滤
    let allOrders = [];
    let currentPage = 1;
    let totalPages = 1;

    const firstRes = await wcApi.get('orders', { ...params, page: currentPage });
    const headers = firstRes.headers;
    totalPages = parseInt(headers?.['x-wp-totalpages'], 10) || 1;
    allOrders = firstRes.data;

    // 按日期过滤
    if (after || before) {
      // 拉取所有页
      for (let p = 2; p <= totalPages; p++) {
        const res = await wcApi.get('orders', { ...params, page: p });
        allOrders = allOrders.concat(res.data);
      }

      if (after) {
        const afterDate = new Date(after).getTime();
        allOrders = allOrders.filter(o => new Date(o.date_created).getTime() >= afterDate);
      }
      if (before) {
        const beforeDate = new Date(before).getTime();
        allOrders = allOrders.filter(o => new Date(o.date_created).getTime() <= beforeDate);
      }
    }

    // 映射为分析用结构
    const orders = allOrders.map(order => ({
      id: order.id,
      number: order.number,
      status: order.status,
      dateCreated: order.date_created,
      datePaid: order.date_paid,
      dateCompleted: order.date_completed,
      total: parseFloat(order.total),
      subtotal: parseFloat(order.subtotal || 0),
      shippingTotal: parseFloat(order.shipping_total || 0),
      taxTotal: parseFloat(order.total_tax || 0),
      discountTotal: parseFloat(order.discount_total || 0),
      paymentMethod: order.payment_method_title,
      currency: order.currency,
      customer: {
        id: order.customer_id,
        name: `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim(),
        email: order.billing?.email,
        phone: order.billing?.phone,
      },
      billing: order.billing,
      shipping: order.shipping,
      items: (order.line_items || []).map(item => ({
        productId: item.product_id,
        name: item.name,
        qty: item.quantity,
        price: parseFloat(item.price),
        total: parseFloat(item.total),
        image: item.image?.src || null,
      })),
      itemCount: order.line_items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
      deliveryMethod: order.shipping?.address_1 ? 'Delivery' : 'Pickup',
      customerNote: order.customer_note,
    }));

    res.json({
      orders,
      total: parseInt(headers?.['x-wp-total'], 10) || orders.length,
      totalPages: after || before ? 1 : totalPages,
      currentPage: parseInt(page, 10),
    });
  } catch (err) {
    console.error('[Orders] Error fetching orders:', err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// ============================================================
//  数据分析聚合 API
// ============================================================

/**
 * 辅助函数：从 WooCommerce 拉取所有订单（处理分页）
 */
async function fetchAllWcOrders(params = {}) {
  let allOrders = [];
  let page = 1;
  let totalPages = 1;

  const firstRes = await wcApi.get('orders', { ...params, per_page: 100, page });
  totalPages = parseInt(firstRes.headers?.['x-wp-totalpages'], 10) || 1;
  allOrders = firstRes.data;

  for (let p = 2; p <= totalPages; p++) {
    const res = await wcApi.get('orders', { ...params, per_page: 100, page: p });
    allOrders = allOrders.concat(res.data);
  }

  return allOrders;
}

/**
 * 辅助函数：从 WooCommerce 拉取所有商品（含分类信息）
 */
async function fetchAllWcProducts() {
  let allProducts = [];
  let page = 1;
  let totalPages = 1;

  const firstRes = await wcApi.get('products', { per_page: 100, page });
  totalPages = parseInt(firstRes.headers?.['x-wp-totalpages'], 10) || 1;
  allProducts = firstRes.data;

  for (let p = 2; p <= totalPages; p++) {
    const res = await wcApi.get('products', { per_page: 100, page: p });
    allProducts = allProducts.concat(res.data);
  }

  return allProducts;
}

/**
 * 辅助函数：从订单的 meta_data 中提取配送方式
 */
function getDeliveryMethodFromOrder(order) {
  const dmMeta = order.meta_data?.find(m => m.key === 'delivery_method');
  if (dmMeta) return dmMeta.value === 'Delivery' ? 'delivery' : 'pickup';
  // 兜底：有配送地址视为 delivery
  return order.shipping?.address_1 ? 'delivery' : 'pickup';
}

/**
 * GET /api/analytics/summary
 * 获取总体统计数据：订单总数、总营收、delivery/pickup 比例
 */
app.get('/api/analytics/summary', async (req, res) => {
  try {
    const orders = await fetchAllWcOrders();

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

    let deliveryCount = 0;
    let pickupCount = 0;
    for (const o of orders) {
      const method = getDeliveryMethodFromOrder(o);
      if (method === 'delivery') deliveryCount++;
      else pickupCount++;
    }

    // 按状态统计
    const statusCounts = {};
    for (const o of orders) {
      const s = o.status || 'unknown';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }

    // 按月统计
    // 优先使用 Delivery Date meta_data（种子数据用此字段模拟历史月份），
    // 没有则回退到 order.date_created
    const monthlyMap = {};
    for (const o of orders) {
      const deliveryDateMeta = o.meta_data?.find(m => m.key === 'Delivery Date');
      const dateStr = deliveryDateMeta?.value || o.date_created;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) continue; // 跳过无效日期
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[key]) {
        monthlyMap[key] = { month: key, orderCount: 0, revenue: 0, deliveryCount: 0, pickupCount: 0 };
      }
      monthlyMap[key].orderCount++;
      monthlyMap[key].revenue += parseFloat(o.total || 0);
      if (getDeliveryMethodFromOrder(o) === 'delivery') {
        monthlyMap[key].deliveryCount++;
      } else {
        monthlyMap[key].pickupCount++;
      }
    }

    const monthly = Object.values(monthlyMap)
      .map(m => ({ ...m, revenue: Math.round(m.revenue * 100) / 100 }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      totalOrders,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      deliveryCount,
      pickupCount,
      deliveryRatio: totalOrders > 0 ? Math.round((deliveryCount / totalOrders) * 10000) / 100 : 0,
      pickupRatio: totalOrders > 0 ? Math.round((pickupCount / totalOrders) * 10000) / 100 : 0,
      statusCounts,
      monthly,
    });
  } catch (err) {
    console.error('[Analytics] Summary error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/delivery-areas
 * 按配送地区(suburb/city)聚合统计
 */
app.get('/api/analytics/delivery-areas', async (req, res) => {
  try {
    const orders = await fetchAllWcOrders();

    // 只统计配送订单
    const deliveryOrders = orders.filter(o => getDeliveryMethodFromOrder(o) === 'delivery');

    // 按 suburb (city 字段) 分组
    const areaMap = {};
    for (const o of deliveryOrders) {
      const city = (o.shipping?.city || 'Unknown').trim();
      if (!areaMap[city]) {
        areaMap[city] = { suburb: city, orderCount: 0, totalRevenue: 0, productCounts: {} };
      }
      areaMap[city].orderCount++;
      areaMap[city].totalRevenue += parseFloat(o.total || 0);

      // 统计该地区购买的商品
      for (const item of (o.line_items || [])) {
        const name = item.name || 'Unknown';
        areaMap[city].productCounts[name] = (areaMap[city].productCounts[name] || 0) + item.quantity;
      }
    }

    // 转换为数组并排序（订单数降序）
    const areas = Object.values(areaMap)
      .map(a => ({
        ...a,
        totalRevenue: Math.round(a.totalRevenue * 100) / 100,
        topProducts: Object.entries(a.productCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, qty]) => ({ name, qty })),
      }))
      .sort((a, b) => b.orderCount - a.orderCount);

    res.json({ areas, totalDeliveryOrders: deliveryOrders.length });
  } catch (err) {
    console.error('[Analytics] Delivery areas error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/products
 * 商品销售排行统计
 */
app.get('/api/analytics/products', async (req, res) => {
  try {
    const orders = await fetchAllWcOrders();

    // 获取所有商品信息（含分类）
    let productsMeta = {};
    try {
      const wcProducts = await fetchAllWcProducts();
      for (const p of wcProducts) {
        productsMeta[p.id] = {
          categories: (p.categories || []).map(c => c.name),
          primaryCategory: p.categories?.[0]?.name || 'Uncategorized',
        };
      }
    } catch {
      // 商品信息获取失败时不影响主流程
    }

    const productMap = {};
    let deliveryOrderCount = 0;
    let pickupOrderCount = 0;

    for (const o of orders) {
      const method = getDeliveryMethodFromOrder(o);
      if (method === 'delivery') deliveryOrderCount++;
      else pickupOrderCount++;

      for (const item of (o.line_items || [])) {
        const id = item.product_id;
        const name = item.name || 'Unknown';
        if (!productMap[id]) {
          productMap[id] = {
            productId: id,
            name,
            category: productsMeta[id]?.primaryCategory || '',
            categories: productsMeta[id]?.categories || [],
            totalQty: 0,
            totalRevenue: 0,
            deliveryQty: 0,
            pickupQty: 0,
            orderCount: 0,
            priceSum: 0,
            priceCount: 0,
          };
        }
        productMap[id].totalQty += item.quantity;
        productMap[id].totalRevenue += parseFloat(item.total || 0);
        productMap[id].orderCount++;
        productMap[id].priceSum += parseFloat(item.price || 0) * item.quantity;
        productMap[id].priceCount += item.quantity;
        if (method === 'delivery') productMap[id].deliveryQty += item.quantity;
        else productMap[id].pickupQty += item.quantity;
      }
    }

    const products = Object.values(productMap)
      .map(p => ({
        productId: p.productId,
        name: p.name,
        category: p.category,
        categories: p.categories,
        totalQty: p.totalQty,
        totalRevenue: Math.round(p.totalRevenue * 100) / 100,
        deliveryQty: p.deliveryQty,
        pickupQty: p.pickupQty,
        orderCount: p.orderCount,
        deliveryRatio: p.totalQty > 0 ? Math.round((p.deliveryQty / p.totalQty) * 10000) / 100 : 0,
        unitPrice: p.priceCount > 0 ? Math.round((p.priceSum / p.priceCount) * 100) / 100 : 0,
      }))
      .sort((a, b) => b.totalQty - a.totalQty);

    res.json({
      products,
      totalDeliveryOrders: deliveryOrderCount,
      totalPickupOrders: pickupOrderCount,
    });
  } catch (err) {
    console.error('[Analytics] Products error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/monthly-products
 * 按月 × 商品 交叉分析：每个月每种商品卖了多少件
 *
 * Returns:
 *   { rows: [{ month, productId, productName, qty, revenue, deliveryQty, pickupQty }],
 *     months: [...], products: [...] }
 */
app.get('/api/analytics/monthly-products', async (req, res) => {
  try {
    const orders = await fetchAllWcOrders();

    // 按 (month, productId) 分组
    const cellMap = {};
    const monthSet = new Set();
    const productSet = new Set();

    for (const o of orders) {
      const deliveryDateMeta = o.meta_data?.find(m => m.key === 'Delivery Date');
      const dateStr = deliveryDateMeta?.value || o.date_created;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) continue;
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const method = getDeliveryMethodFromOrder(o);

      monthSet.add(month);

      for (const item of (o.line_items || [])) {
        const id = item.product_id;
        const name = item.name || 'Unknown';
        const key = `${month}|${id}`;
        productSet.add(id);

        if (!cellMap[key]) {
          cellMap[key] = { month, productId: id, productName: name, qty: 0, revenue: 0, deliveryQty: 0, pickupQty: 0 };
        }
        cellMap[key].qty += item.quantity;
        cellMap[key].revenue += parseFloat(item.total || 0);
        if (method === 'delivery') cellMap[key].deliveryQty += item.quantity;
        else cellMap[key].pickupQty += item.quantity;
      }
    }

    // 构建产品名称映射（取最新出现的名称）
    const productNames = {};
    for (const cell of Object.values(cellMap)) {
      productNames[cell.productId] = cell.productName;
    }

    const months = Array.from(monthSet).sort();
    const products = Array.from(productSet).sort((a, b) => a - b);

    const rows = Object.values(cellMap).map(c => ({
      ...c,
      revenue: Math.round(c.revenue * 100) / 100,
    }));

    res.json({ rows, months, products: products.map(id => ({ id, name: productNames[id] || 'Unknown' })) });
  } catch (err) {
    console.error('[Analytics] Monthly products error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/delivery-area/:suburb
 * 获取单个配送地区的详细数据
 *
 * Returns:
 *   { suburb, orderCount, totalRevenue, customers, monthlyTrend, topProducts, recentOrders }
 */
app.get('/api/analytics/delivery-area/:suburb', async (req, res) => {
  try {
    const suburb = decodeURIComponent(req.params.suburb).trim();
    const orders = await fetchAllWcOrders();

    // 筛选该地区的配送订单
    const areaOrders = orders.filter(o => {
      const method = getDeliveryMethodFromOrder(o);
      const city = (o.shipping?.city || '').trim();
      return method === 'delivery' && city.toLowerCase() === suburb.toLowerCase();
    });

    const orderCount = areaOrders.length;
    const totalRevenue = Math.round(areaOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0) * 100) / 100;

    // 客户列表（去重）
    const customerMap = {};
    for (const o of areaOrders) {
      const email = o.billing?.email;
      if (email && !customerMap[email]) {
        customerMap[email] = {
          name: `${o.billing?.first_name || ''} ${o.billing?.last_name || ''}`.trim() || 'Unknown',
          email,
          phone: o.billing?.phone || '',
          orderCount: 0,
          totalSpent: 0,
          firstOrder: o.date_created,
          lastOrder: o.date_created,
        };
      }
      if (customerMap[email]) {
        customerMap[email].orderCount++;
        customerMap[email].totalSpent += parseFloat(o.total || 0);
        if (o.date_created < customerMap[email].firstOrder) customerMap[email].firstOrder = o.date_created;
        if (o.date_created > customerMap[email].lastOrder) customerMap[email].lastOrder = o.date_created;
      }
    }

    const customers = Object.values(customerMap)
      .map(c => ({ ...c, totalSpent: Math.round(c.totalSpent * 100) / 100 }))
      .sort((a, b) => b.totalSpent - a.totalSpent);

    // 月度趋势
    const monthlyMap = {};
    for (const o of areaOrders) {
      const deliveryDateMeta = o.meta_data?.find(m => m.key === 'Delivery Date');
      const dateStr = deliveryDateMeta?.value || o.date_created;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[key]) monthlyMap[key] = { month: key, orderCount: 0, revenue: 0 };
      monthlyMap[key].orderCount++;
      monthlyMap[key].revenue += parseFloat(o.total || 0);
    }
    const monthlyTrend = Object.values(monthlyMap)
      .map(m => ({ ...m, revenue: Math.round(m.revenue * 100) / 100 }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Top 商品
    const productCounts = {};
    for (const o of areaOrders) {
      for (const item of (o.line_items || [])) {
        const name = item.name || 'Unknown';
        productCounts[name] = (productCounts[name] || 0) + item.quantity;
      }
    }
    const topProducts = Object.entries(productCounts)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty);

    // 最近订单
    const recentOrders = areaOrders
      .sort((a, b) => new Date(b.date_created) - new Date(a.date_created))
      .slice(0, 20)
      .map(o => ({
        id: o.id,
        number: o.number,
        date: o.date_created,
        total: parseFloat(o.total),
        customer: `${o.billing?.first_name || ''} ${o.billing?.last_name || ''}`.trim(),
        items: (o.line_items || []).map(item => ({ name: item.name, qty: item.quantity })),
      }));

    res.json({
      suburb,
      orderCount,
      totalRevenue,
      uniqueCustomers: customers.length,
      customers,
      monthlyTrend,
      topProducts,
      recentOrders,
    });
  } catch (err) {
    console.error('[Analytics] Delivery area detail error:', err.message);
    res.status(500).json({ error: err.message });
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
