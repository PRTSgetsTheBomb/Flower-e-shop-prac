/**
 * 订单状态管理路由
 * - GET  /api/order/:id         查询订单详情
 * - PUT  /api/order/:id/status  更新订单状态 + 时间戳
 * - POST /api/webhook/order-status  WooCommerce 状态变更 Webhook（发送邮件）
 */

const { sendOrderConfirmation, sendOrderShipped, sendOrderReadyForPickup, sendOrderCompleted, sendOrderCancelled } = require('./mail');

function registerOrderRoutes(app, wcApi) {

  /**
   * GET /api/order/:id
   */
  app.get('/api/order/:id', async (req, res) => {
    try {
      const { data } = await wcApi.get(`orders/${req.params.id}`);
      const findMeta = (key) => data.meta_data?.find(m => m.key === key)?.value || null;
      res.json({
        id: data.id, number: data.number,
        status: findMeta('dashboard_status') || data.status,
        dateCreated: data.date_created, datePaid: data.date_paid,
        dateShipped: findMeta('_date_shipped') || findMeta('_date_fulfilled'),
        dateCompleted: data.date_completed,
        total: data.total, customerNote: data.customer_note,
        billing: data.billing, shipping: data.shipping,
        lineItems: data.line_items.map(item => ({
          id: item.id, name: item.name, qty: item.quantity, price: item.price,
          image: item.image?.src || null,
          deliveryDate: item.meta_data?.find(m => m.key === 'Delivery Date')?.value || '',
          deliveryMethod: item.meta_data?.find(m => m.key === 'Delivery Method')?.value
            || (data.meta_data?.find(m => m.key === 'delivery_method')?.value === 'Delivery' ? 'delivery' : 'pickup'),
          giftMessage: item.meta_data?.find(m => m.key === 'Gift Message')?.value || '',
        })),
      });
    } catch (err) {
      const status = err.response?.status || 500;
      res.status(status).json({ error: err.response?.data?.message || err.message });
    }
  });

  /**
   * PUT /api/order/:id/status
   * Body: { status: "fulfill" | "processing" | "completed" | ... }
   */
  app.put('/api/order/:id/status', async (req, res) => {
    try {
      let { status } = req.body;
      if (!status) return res.status(400).json({ error: 'Status is required.' });

      const { data: current } = await wcApi.get(`orders/${req.params.id}`);
      // 保留 id 字段，确保 WC 能正确识别已有 meta 条目进行更新/覆盖
      const meta = (current.meta_data || []).map(m => ({ id: m.id, key: m.key, value: m.value }));
      const deliveryMeta = (current.meta_data || []).find(m => m.key === 'delivery_method');
      const isDelivery = deliveryMeta?.value === 'Delivery';

      if (status === 'fulfill') {
        status = 'fulfilled';
      }
      // 自定义状态：如果 WC 不支持，存为 meta 标记 + 保持 processing
      const customStatuses = ['fulfilled', 'readyforpickup'];
      const useMeta = customStatuses.includes(status);
      const wcStatus = useMeta ? 'processing' : status;

      const now = new Date().toISOString();
      if (useMeta) {
        const key = 'dashboard_status';
        const exist = meta.find(m => m.key === key);
        if (exist) exist.value = status; else meta.push({ key, value: status });
      } else {
        // 转为标准状态时清除 dashboard_status（置空而非删除，确保 WC 覆盖旧值）
        const exist = meta.find(m => m.key === 'dashboard_status');
        if (exist) exist.value = '';
      }
      const timestampKey = `_date_${status}`;
      const exists = meta.find(m => m.key === timestampKey);
      if (exists) { exists.value = now; }
      else { meta.push({ key: timestampKey, value: now }); }

      await wcApi.put(`orders/${req.params.id}`, { status: wcStatus, meta_data: meta });

      // 自定义状态直接发送邮件（标准状态由 webhook 发送，避免重复）
      const customerName = [current.billing?.first_name, current.billing?.last_name].filter(Boolean).join(' ') || 'Valued Customer';
      const email = current.billing?.email;
      if (email) {
        console.log('[Order] Sending email for status:', status, 'to:', email);
        try {
          if (status === 'cancelled') {
            await sendOrderCancelled({ to: email, name: customerName, orderId: req.params.id });
          } else if (status === 'fulfilled') {
            const addr = current.shipping ? {
              address: current.shipping.address_1,
              suburb: current.shipping.city,
              postcode: current.shipping.postcode,
            } : null;
            await sendOrderShipped({ to: email, name: customerName, orderId: req.params.id, items: (current.line_items || []).map(item => ({ name: item.name, qty: item.quantity })), deliveryAddress: addr });
          } else if (status === 'readyforpickup') {
            await sendOrderReadyForPickup({ to: email, name: customerName, orderId: req.params.id, items: (current.line_items || []).map(item => ({ name: item.name, qty: item.quantity })), pickupLocation: 'Pisces Flower Studio, Oakleigh South, Melbourne' });
          }
        } catch (mailErr) {
          console.error('[Order] Email send error:', mailErr.message);
        }
      }

      res.json({ success: true, status, timestamp: now });
    } catch (err) {
      res.status(500).json({ error: err.response?.data?.message || err.message });
    }
  });

  /**
   * POST /api/webhook/order-status
   * WooCommerce 状态变更时触发，统一发送通知邮件
   */
  app.post('/api/webhook/order-status', async (req, res) => {
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
      const deliveryMethod = deliveryMeta?.value === 'Delivery' ? 'Delivery'
        : (order.shipping?.address_1 ? 'Delivery' : 'Pickup');

      if (status === 'on-hold' || status === 'pending') return;

      // 转换 WC 地址格式（address_1/city）→ 邮件模板格式（address/suburb）
      const shippingAddr = order.shipping?.address_1 ? {
        address: order.shipping.address_1,
        suburb: order.shipping.city,
        postcode: order.shipping.postcode,
        phone: order.shipping.phone,
      } : null;

      // 检查自定义状态（dashboard_status meta），用于识别 readyforpickup / fulfilled 等
      const dashboardStatus = (order.meta_data || []).find(m => m.key === 'dashboard_status')?.value;
      const effectiveStatus = dashboardStatus || status;

      console.log('[Webhook] Order', order.id, 'status changed to', status, dashboardStatus ? `(dashboard: ${dashboardStatus})` : '');

      if (effectiveStatus === 'processing' && !dashboardStatus) {
        // 纯 processing 状态（非自定义），发送确认邮件
        const deliveryDate = rawItems.reduce((found, item) => {
          if (found) return found;
          const meta = item.meta_data;
          if (!Array.isArray(meta)) return null;
          const dd = meta.find(m => m.key === 'Delivery Date');
          return dd?.value || null;
        }, null);
        sendOrderConfirmation({ to: email, name: customerName, orderId: order.id, total: parseFloat(order.total) || 0, items, status: 'processing', deliveryMethod, deliveryAddress: shippingAddr, pickupLocation: 'Pisces Flower Studio, Oakleigh South, Melbourne', deliveryTime: deliveryDate });
      } else if (effectiveStatus === 'shipped' || effectiveStatus === 'readyforpickup' || effectiveStatus === 'fulfilled') {
        if (deliveryMethod === 'Delivery') {
          sendOrderShipped({ to: email, name: customerName, orderId: order.id, items, deliveryAddress: shippingAddr });
        } else {
          sendOrderReadyForPickup({ to: email, name: customerName, orderId: order.id, items, pickupLocation: 'Pisces Flower Studio, Oakleigh South, Melbourne' });
        }
      } else if (effectiveStatus === 'completed') {
        sendOrderCompleted({ to: email, name: customerName, orderId: order.id, deliveryMethod });
      } else if (status === 'cancelled') {
        sendOrderCancelled({ to: email, name: customerName, orderId: order.id });
      }
    } catch (err) {
      console.error('[Webhook] Error:', err.message);
    }
  });
}

module.exports = { registerOrderRoutes };
