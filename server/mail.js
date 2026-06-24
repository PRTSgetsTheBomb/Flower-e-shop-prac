/**
 * 邮件发送模块
 *
 * 核心职责：通过 Brevo SMTP 发送订单通知邮件
 *
 * 设计说明：
 * - 使用 nodemailer 连接 Brevo SMTP
 * - 提供 sendOrderConfirmation() 发送订单确认邮件
 * - 可在后续添加其他邮件类型（发货通知、送达通知等）
 * - 邮件模板使用内联样式，兼容主流邮件客户端
 */

const nodemailer = require('nodemailer');

// 创建 SMTP 传输器
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_HOST,
  port: parseInt(process.env.BREVO_PORT, 10),
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
  },
});

/**
 * 发送订单确认邮件
 * @param {object} params
 * @param {string} params.to              - 客户邮箱
 * @param {string} params.name            - 客户姓名
 * @param {string} params.orderId         - WooCommerce 订单号
 * @param {number} params.total           - 订单总额
 * @param {Array}  params.items           - 商品列表 [{name, qty, price}]
 * @param {string} params.status          - 订单状态
 * @param {string} params.deliveryMethod  - 配送方式 ("Delivery" | "Pickup")
 * @param {object} params.deliveryAddress - 配送地址 {address, suburb, postcode, phone}
 * @param {string} params.pickupLocation  - 自提地点（仅 pickup 时）
 * @param {string} params.deliveryTime    - 配送/自提时间
 */
async function sendOrderConfirmation({ to, name, orderId, total, items, status, deliveryMethod, deliveryAddress, pickupLocation, deliveryTime }) {
  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #eee;">
          <strong>${item.name}</strong>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:center;">
          ${item.qty}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;">
          $${(item.price * item.qty).toFixed(2)}
        </td>
      </tr>`
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" style="background:#f4f4f4;padding:20px;">
    <tr>
      <td align="center">
        <table width="600" style="background:#fff;border-radius:8px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#2d5a27;padding:30px;text-align:center;">
              <h1 style="color:#fff;margin:0;font-size:24px;">Pisces Flower</h1>
              <p style="color:#d4edda;margin:8px 0 0;font-size:14px;">Order Confirmation</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:30px;">
              <p style="font-size:16px;color:#333;">Hi <strong>${name}</strong>,</p>
              <p style="color:#555;line-height:1.6;">
                Thank you for your order! We've received it and will start processing shortly.
              </p>
              <table style="margin:20px 0;width:100%;">
                <tr>
                  <td style="background:#f8f9fa;padding:15px;border-radius:6px;">
                    <table width="100%">
                      <tr>
                        <td style="color:#666;font-size:14px;">Order Number</td>
                        <td style="text-align:right;font-weight:bold;color:#333;">#${orderId}</td>
                      </tr>
                      <tr>
                        <td style="color:#666;font-size:14px;">Status</td>
                        <td style="text-align:right;color:#856404;font-weight:bold;">${status}</td>
                      </tr>
                      <tr>
                        <td style="color:#666;font-size:14px;padding-top:10px;border-top:1px solid #ddd;"><strong>${deliveryMethod === 'Pickup' ? 'Pickup' : 'Delivery'}</strong></td>
                        <td style="text-align:right;padding-top:10px;border-top:1px solid #ddd;color:#333;font-size:14px;">
                          ${deliveryMethod === 'Pickup'
                            ? pickupLocation || 'Pisces Flower Studio, Oakleigh South VIC 3167'
                            : [deliveryAddress?.address, deliveryAddress?.suburb, deliveryAddress?.postcode].filter(Boolean).join(', ')
                          }
                        </td>
                      </tr>
                      ${deliveryMethod !== 'Pickup' && deliveryAddress?.phone ? `
                      <tr>
                        <td style="color:#666;font-size:14px;">Phone</td>
                        <td style="text-align:right;color:#333;font-size:14px;">${deliveryAddress.phone}</td>
                      </tr>` : ''}
                      <tr>
                        <td style="color:#666;font-size:14px;">${deliveryMethod === 'Pickup' ? 'Pickup Date' : 'Estimated Delivery Time'}</td>
                        <td style="text-align:right;color:#333;font-size:14px;">${deliveryTime || 'To be confirmed'}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top:6px;font-size:11px;color:#999;line-height:1.4;">
                          Delivery time could be delayed for any reason, we will try our best to give the customer a better shopping experience.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!-- Items -->
              <table width="100%" style="margin:20px 0;">
                <thead>
                  <tr>
                    <th style="text-align:left;padding:8px 0;border-bottom:2px solid #2d5a27;color:#2d5a27;">Item</th>
                    <th style="text-align:center;padding:8px 0;border-bottom:2px solid #2d5a27;color:#2d5a27;">Qty</th>
                    <th style="text-align:right;padding:8px 0;border-bottom:2px solid #2d5a27;color:#2d5a27;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="2" style="text-align:right;padding:10px 0;font-weight:bold;font-size:16px;">Total</td>
                    <td style="text-align:right;padding:10px 0;font-weight:bold;font-size:16px;color:#2d5a27;">
                      $${total.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
              <p style="color:#555;line-height:1.6;font-size:14px;">
                We'll send you another email when your order is dispatched.
                If you have any questions, please <a href="${process.env.SITE_URL || 'http://localhost:3000'}/contact" style="color:#2d5a27;">contact us</a>.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#2d5a27;padding:20px;text-align:center;">
              <p style="color:#d4edda;margin:0;font-size:12px;">
                Pisces Flower &mdash; Fresh flowers delivered with love.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Pisces Flower" <noreply@piscesflower.com>',
    to,
    subject: status === 'processing' ? `Your Order #${orderId} Is Now Being Processed — Pisces Flower` : `Order Confirmation #${orderId} — Pisces Flower`,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[Mail] Order confirmation sent to', to, '| Message ID:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[Mail] Failed to send confirmation:', err.message);
    // 发件失败不阻塞主流程，记录日志即可
    return { success: false, error: err.message };
  }
}

/**
 * 发送发货通知邮件
 */
async function sendOrderShipped({ to, name, orderId, items, deliveryAddress }) {
  const itemsHtml = items.map(item =>
    `<tr><td style="padding:6px 0;border-bottom:1px solid #eee;">${item.name} × ${item.qty}</td></tr>`
  ).join('');

  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" style="background:#f4f4f4;padding:20px;">
    <tr><td align="center">
      <table width="600" style="background:#fff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#2d5a27;padding:30px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;">Pisces Flower</h1>
          <p style="color:#d4edda;margin:8px 0 0;font-size:14px;">Your Order Has Been Shipped!</p>
        </td></tr>
        <tr><td style="padding:30px;">
          <p style="font-size:16px;color:#333;">Hi <strong>${name}</strong>,</p>
          <p style="color:#555;line-height:1.6;">Great news! Your order <strong>#${orderId}</strong> is on its way and will arrive shortly.</p>
          ${deliveryAddress ? `
          <p style="color:#555;line-height:1.6;">
            Shipping to:<br/>
            ${[deliveryAddress.address, deliveryAddress.suburb, deliveryAddress.postcode].filter(Boolean).join(', ')}
          </p>` : ''}
          <table width="100%" style="margin:16px 0;">
            <thead><tr><th style="text-align:left;padding:8px 0;border-bottom:2px solid #2d5a27;color:#2d5a27;">Items</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <p style="color:#555;line-height:1.6;font-size:14px;">
            If you have any questions, please <a href="${process.env.SITE_URL || 'http://localhost:3000'}/contact" style="color:#2d5a27;">contact us</a>.
          </p>
        </td></tr>
        <tr><td style="background:#2d5a27;padding:20px;text-align:center;">
          <p style="color:#d4edda;margin:0;font-size:12px;">Pisces Flower &mdash; Fresh flowers delivered with love.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to, subject: `Your Order #${orderId} Has Been Shipped — Pisces Flower`, html,
    });
    console.log('[Mail] Shipped notice sent to', to, '| ID:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[Mail] Failed to send shipped notice:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 发送自提通知邮件
 */
async function sendOrderReadyForPickup({ to, name, orderId, items, pickupLocation }) {
  const itemsHtml = items.map(item =>
    `<tr><td style="padding:6px 0;border-bottom:1px solid #eee;">${item.name} × ${item.qty}</td></tr>`
  ).join('');

  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" style="background:#f4f4f4;padding:20px;">
    <tr><td align="center">
      <table width="600" style="background:#fff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#fd7e14;padding:30px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;">Pisces Flower</h1>
          <p style="color:#fff3cd;margin:8px 0 0;font-size:14px;">Ready for Pickup!</p>
        </td></tr>
        <tr><td style="padding:30px;">
          <p style="font-size:16px;color:#333;">Hi <strong>${name}</strong>,</p>
          <p style="color:#555;line-height:1.6;">Your order <strong>#${orderId}</strong> is now ready for pickup!</p>
          <p style="background:#f8f9fa;padding:12px;border-radius:6px;color:#333;">
            <strong>Pickup Location:</strong><br/>${pickupLocation || 'Pisces Flower Studio, Oakleigh South, Melbourne'}
          </p>
          <table width="100%" style="margin:16px 0;">
            <thead><tr><th style="text-align:left;padding:8px 0;border-bottom:2px solid #fd7e14;color:#fd7e14;">Items</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <p style="color:#555;line-height:1.6;font-size:14px;">
            If you have any questions, please <a href="${process.env.SITE_URL || 'http://localhost:3000'}/contact" style="color:#fd7e14;">contact us</a>.
          </p>
        </td></tr>
        <tr><td style="background:#fd7e14;padding:20px;text-align:center;">
          <p style="color:#fff3cd;margin:0;font-size:12px;">Pisces Flower &mdash; Fresh flowers delivered with love.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to, subject: `Your Order #${orderId} Is Ready for Pickup — Pisces Flower`, html,
    });
    console.log('[Mail] ReadyForPickup notice sent to', to, '| ID:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[Mail] Failed to send pickup notice:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 发送订单完成通知邮件（Delivered / Picked Up）
 */
async function sendOrderCompleted({ to, name, orderId, deliveryMethod }) {
  const verb = deliveryMethod === 'Pickup' ? 'picked up' : 'delivered';
  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" style="background:#f4f4f4;padding:20px;">
    <tr><td align="center">
      <table width="600" style="background:#fff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#28a745;padding:30px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;">Pisces Flower</h1>
          <p style="color:#d4edda;margin:8px 0 0;font-size:14px;">Order ${verb === 'delivered' ? 'Delivered' : 'Picked Up'}!</p>
        </td></tr>
        <tr><td style="padding:30px;">
          <p style="font-size:16px;color:#333;">Hi <strong>${name}</strong>,</p>
          <p style="color:#555;line-height:1.6;">Your order <strong>#${orderId}</strong> has been ${verb}. Thank you for choosing Pisces Flower!</p>
          <p style="color:#555;line-height:1.6;font-size:14px;">
            We'd love to hear your feedback. <a href="${process.env.SITE_URL || 'http://localhost:3000'}/contact" style="color:#28a745;">Let us know</a> how we did.
          </p>
        </td></tr>
        <tr><td style="background:#28a745;padding:20px;text-align:center;">
          <p style="color:#d4edda;margin:0;font-size:12px;">Pisces Flower &mdash; Fresh flowers delivered with love.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to, subject: `Your Order #${orderId} Has Been ${verb === 'delivered' ? 'Delivered' : 'Picked Up'} — Pisces Flower`, html,
    });
    console.log('[Mail] Completed notice sent to', to, '| ID:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[Mail] Failed to send completed notice:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendOrderConfirmation, sendOrderShipped, sendOrderReadyForPickup, sendOrderCompleted };
