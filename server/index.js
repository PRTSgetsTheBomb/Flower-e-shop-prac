const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { requireAdmin } = require('./middleware/adminAuth');

const app = express();
app.use(cors());
app.use(express.json());

// ---------- 中间件 ----------
const wcApi = require('./lib/woocommerce');
app.use(require('./routes/stripe'));

// ---------- 退款管理（POST 无需 admin，GET/PUT 内部校验）----------
const { registerRefundRoutes } = require('./routes/refunds');
registerRefundRoutes(app, wcApi, requireAdmin);

// ---------- 联系表单（公开）----------
const { sendContactForm } = require('./services/mail');
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }
    const result = await sendContactForm({ name, email, subject, message });
    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to send message. Please try again later.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- 用户订单同步（跨设备）----------
const { verifyToken } = require('./middleware/adminAuth');
app.get('/api/my-orders', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await verifyToken(authHeader.split(' ')[1]);
    if (!user || !user.email) return res.status(401).json({ error: 'Unauthorized' });

    // 从 WooCommerce 按 billing email 拉取订单
    const { data: wcOrders } = await wcApi.get('orders', {
      search: user.email,
      per_page: 50,
      orderby: 'date',
      order: 'desc',
    });

    const orders = wcOrders.map(o => {
      const findMeta = (key) => o.meta_data?.find(m => m.key === key)?.value || null;
      return {
        id: `WC-${o.id}`,
        wooCommerceId: o.id,
        number: o.number,
        status: findMeta('dashboard_status') || o.status,
        date: o.date_created,
        total: parseFloat(o.total || 0),
        items: (o.line_items || []).map(item => ({
          id: item.product_id,
          name: item.name,
          slug: item.slug || '',
          qty: item.quantity,
          price: parseFloat(item.price || 0),
          image: item.image?.src || null,
          deliveryDate: item.meta_data?.find(m => m.key === 'Delivery Date')?.value || '',
          deliveryMethod: item.meta_data?.find(m => m.key === 'Delivery Method')?.value
            || (o.meta_data?.find(m => m.key === 'delivery_method')?.value === 'Delivery' ? 'delivery' : 'pickup'),
          giftMessage: item.meta_data?.find(m => m.key === 'Gift Message')?.value || '',
        })),
        delivery: {
          address: o.shipping?.address_1 || '',
          suburb: o.shipping?.city || '',
          postcode: o.shipping?.postcode || '',
          phone: o.shipping?.phone || o.billing?.phone || '',
        },
      };
    });

    res.json({ orders });
  } catch (err) {
    console.error('[MyOrders] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

app.use(requireAdmin);

// ---------- 路由模块 ----------
app.use(require('./routes/auth'));
app.use(require('./routes/reviews'));
app.use(require('./routes/analytics'));
app.use(require('./routes/wc-proxy'));

// ---------- 订单状态管理 ----------
const { registerOrderRoutes } = require('./services/order-routes');
registerOrderRoutes(app, wcApi);

// ---------- AI 分析 ----------
const { streamAnalysis, clearCache } = require('./services/ai');
const { fetchAllWcOrders } = require('./lib/helpers');

app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { overview, topProducts, topAreas, monthlyTrend, todaySummary, dateRange, question, model } = req.body;
    if (!overview && !topProducts && !topAreas) return res.status(400).json({ error: 'Please provide data.' });
    let historyOrders = [];
    try {
      historyOrders = (await fetchAllWcOrders()).map(o => ({
        number: o.number, 
        status: o.status, 
        date: (o.date_created || '').split('T')[0],
        total: parseFloat(o.total || 0),
        customer: [
          o.billing?.first_name,
          o.billing?.last_name].filter(Boolean).join(' ') || 'Unknown',
        items: (o.line_items || []).map(i => ({
          name: i.name, qty: i.quantity
        })),
        delivery: o.meta_data?.find(m => m.key === 'delivery_method')?.value || (o.shipping?.address_1 ? 'Delivery' : 'Pickup'),
      }));
    } catch (e) {
      console.warn('[AI] History fetch failed:', e.message);
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    await streamAnalysis({
      overview,
      topProducts,
      topAreas,
      monthlyTrend,
      todaySummary,
      dateRange,
      historyOrders
    },
      question,
      model || '',
      chunk => res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`));
    res.write('data: [DONE]\n\n'); res.end();
  } catch (err) {
    console.error('[AI] SSE error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
    else { 
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`); res.end(); 
    }
  }
});

app.post('/api/ai/clear-cache', (req, res) => res.json({ cleared: clearCache() }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));