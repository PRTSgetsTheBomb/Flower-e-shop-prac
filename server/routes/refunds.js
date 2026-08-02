/**
 * 退款申请路由
 *
 * - POST   /api/refunds           客户提交退款申请（含图片上传）
 * - GET    /api/refunds           Admin 获取所有退款申请
 * - PUT    /api/refunds/:id       Admin 审批（approve/reject）
 * - GET    /api/uploads/:filename 查看上传的图片
 *
 * 退款比例规则：
 *   当天送达 → 100%
 *   第2天    → 70%
 *   第3天起  → 50%
 */

const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { sendRefundUpdate } = require('../services/mail');

const REFUNDS_FILE = path.join(__dirname, '..', 'refunds.json');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// 确保目录存在
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// multer 配置：限制 5MB，仅允许图片
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `refund-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed.'));
  },
});

// ---- 帮助函数 ----

function readRefunds() {
  try {
    return JSON.parse(fs.readFileSync(REFUNDS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeRefunds(data) {
  fs.writeFileSync(REFUNDS_FILE, JSON.stringify(data, null, 2));
}

/**
 * 计算退款比例
 * @param {string} deliveryDate - "YYYY-MM-DD"
 * @returns {{ rate: number, label: string }}
 */
function calcRefundRate(deliveryDate) {
  if (!deliveryDate) return { rate: 0, eligible: false, label: 'No delivery date — not eligible' };
  const delivery = new Date(deliveryDate);
  const today = new Date();
  // 比较日期（忽略时间）
  const deliveryDay = new Date(delivery.getFullYear(), delivery.getMonth(), delivery.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.floor((todayDay - deliveryDay) / (1000 * 60 * 60 * 24));

  if (diffDays < 0)  return { rate: 0, eligible: false, label: 'Not yet delivered' };
  if (diffDays === 0) return { rate: 1.0, eligible: true, label: '100% (same day)' };
  if (diffDays === 1) return { rate: 0.7, eligible: true, label: '70% (next day)' };
  if (diffDays === 2) return { rate: 0.5, eligible: true, label: '50% (2 days)' };
  return { rate: 0, eligible: false, label: `Not eligible (${diffDays} days)` };
}

// ---- 路由注册 ----

function registerRefundRoutes(app, wcApi, requireAdmin) {

  /**
   * POST /api/refunds — 客户提交退款申请
   * Body (multipart/form-data):
   *   - orderId:   本地订单 ID (ORD-xxx)
   *   - wcOrderId: WooCommerce 订单 ID
   *   - reason:    退款原因
   *   - message:   详细说明
   *   - email:     客户邮箱
   *   - name:      客户姓名
   *   - images:    图片文件（最多 3 张）
   */
  app.post('/api/refunds', upload.array('images', 3), async (req, res) => {
    try {
      const { orderId, wcOrderId, reason, message, email, name } = req.body;
      if (!orderId || !reason || !email) {
        return res.status(400).json({ error: 'orderId, reason, and email are required.' });
      }

      // 获取 WC 订单信息以确定配送日期
      let deliveryDate = null;
      let orderTotal = 0;
      let orderItems = [];
      if (wcOrderId) {
        try {
          const { data } = await wcApi.get(`orders/${wcOrderId}`);
          orderTotal = parseFloat(data.total) || 0;
          orderItems = (data.line_items || []).map(i => i.name);
          // 从 line_items 的 meta_data 中找 Delivery Date
          for (const item of data.line_items || []) {
            const dd = (item.meta_data || []).find(m => m.key === 'Delivery Date');
            if (dd && dd.value) { deliveryDate = dd.value; break; }
          }
        } catch (e) {
          console.warn('[Refund] WC order fetch failed:', e.message);
        }
      }

      const { rate, eligible, label } = calcRefundRate(deliveryDate);
      if (!eligible) {
        return res.status(400).json({ error: `Refund not available: ${label}` });
      }
      const refundAmount = +(orderTotal * rate).toFixed(2);

      const refund = {
        id: `REF-${Date.now()}`,
        orderId,
        wcOrderId: wcOrderId || null,
        deliveryDate,
        orderTotal,
        orderItems,
        refundRate: rate,
        refundRateLabel: label,
        refundAmount,
        reason,
        message: message || '',
        email,
        name: name || '',
        images: (req.files || []).map(f => f.filename),
        status: 'pending',        // pending | approved | rejected
        adminNote: '',
        createdAt: new Date().toISOString(),
        updatedAt: null,
      };

      const refunds = readRefunds();
      refunds.unshift(refund);
      writeRefunds(refunds);

      res.json({ success: true, refund });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/refunds — Admin 获取所有退款申请
   */
  app.get('/api/refunds', requireAdmin, (req, res) => {
    const refunds = readRefunds();
    res.json({ refunds });
  });

  /**
   * PUT /api/refunds/:id — Admin 审批
   * Body: { action: "approve" | "reject", adminNote?: string }
   */
  app.put('/api/refunds/:id', requireAdmin, async (req, res) => {
    try {
      const { action, adminNote } = req.body;
      if (!action || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'action must be "approve" or "reject".' });
      }

      const refunds = readRefunds();
      const idx = refunds.findIndex(r => r.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Refund not found.' });

      const refund = refunds[idx];
      if (refund.status !== 'pending') {
        return res.status(400).json({ error: `Refund is already ${refund.status}.` });
      }

      if (action === 'approve') {
        // 调用 WooCommerce Refund API
        if (refund.wcOrderId && refund.refundAmount > 0) {
          try {
            await wcApi.post(`orders/${refund.wcOrderId}/refunds`, {
              amount: String(refund.refundAmount),
              reason: `Customer refund request: ${refund.reason}. ${refund.message}`.trim(),
            });
          } catch (wcErr) {
            console.error('[Refund] WC refund failed:', wcErr.response?.data || wcErr.message);
            return res.status(500).json({ error: 'WooCommerce refund failed: ' + (wcErr.response?.data?.message || wcErr.message) });
          }
        }
        refund.status = 'approved';
      } else {
        refund.status = 'rejected';
      }

      refund.adminNote = adminNote || '';
      refund.updatedAt = new Date().toISOString();
      writeRefunds(refunds);

      // 发送邮件通知客户
      try {
        await sendRefundUpdate({
          to: refund.email,
          name: refund.name,
          orderId: refund.orderId,
          refundAmount: refund.refundAmount,
          refundRateLabel: refund.refundRateLabel,
          status: refund.status,
          adminNote: refund.adminNote,
        });
      } catch (e) {
        console.warn('[Refund] Email failed:', e.message);
      }

      res.json({ success: true, refund });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/refunds/analytics — 退款分析数据
   * Query: startDate, endDate (YYYY-MM-DD, optional)
   * 返回：原因分布（donut 图）、按月趋势、概览 KPI
   */
  app.get('/api/refunds/analytics', requireAdmin, (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      let refunds = readRefunds();

      // 日期筛选
      if (startDate) {
        refunds = refunds.filter(r => r.createdAt >= startDate);
      }
      if (endDate) {
        refunds = refunds.filter(r => r.createdAt <= endDate + 'T23:59:59.999Z');
      }

      // 退款原因统计（donut 图数据，仅统计 approved + pending，排除 rejected）
      const reasonCounts = {};
      refunds.forEach(r => {
        if (r.status === 'rejected') return;
        const reason = r.reason || 'Unknown';
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      });

      // 状态统计
      const statusCounts = { pending: 0, approved: 0, rejected: 0 };
      refunds.forEach(r => {
        if (statusCounts.hasOwnProperty(r.status)) statusCounts[r.status]++;
      });

      // 按月汇总
      const monthlyMap = {};
      refunds.forEach(r => {
        const month = r.createdAt.slice(0, 7); // "YYYY-MM"
        if (!monthlyMap[month]) monthlyMap[month] = { count: 0, amount: 0, approved: 0, rejected: 0 };
        monthlyMap[month].count++;
        monthlyMap[month].amount += r.refundAmount || 0;
        if (r.status === 'approved') monthlyMap[month].approved++;
        if (r.status === 'rejected') monthlyMap[month].rejected++;
      });
      const monthly = Object.entries(monthlyMap)
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // 概览
      const totalAmount = refunds.reduce((sum, r) => sum + (r.refundAmount || 0), 0);
      const approvedAmount = refunds
        .filter(r => r.status === 'approved')
        .reduce((sum, r) => sum + (r.refundAmount || 0), 0);

      res.json({
        reasonCounts,
        statusCounts,
        monthly,
        overview: {
          total: refunds.length,
          pending: statusCounts.pending,
          approved: statusCounts.approved,
          rejected: statusCounts.rejected,
          totalAmount: +totalAmount.toFixed(2),
          approvedAmount: +approvedAmount.toFixed(2),
        },
        dateRange: { startDate: startDate || null, endDate: endDate || null },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/uploads/:filename — 提供上传图片的静态访问
   */
  app.get('/api/uploads/:filename', (req, res) => {
    const filePath = path.join(UPLOADS_DIR, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found.' });
    res.sendFile(filePath);
  });
}

module.exports = { registerRefundRoutes };
