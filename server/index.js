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