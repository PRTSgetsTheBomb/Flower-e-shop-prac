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
 * @param {string} params.to       - 客户邮箱
 * @param {string} params.name     - 客户姓名
 * @param {string} params.orderId  - WooCommerce 订单号
 * @param {number} params.total    - 订单总额
 * @param {Array}  params.items    - 商品列表 [{name, qty, price}]
 * @param {string} params.status   - 订单状态
 */
async function sendOrderConfirmation({ to, name, orderId, total, items, status }) {
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
                If you have any questions, please <a href="/contact" style="color:#2d5a27;">contact us</a>.
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
    subject: `Order Confirmation #${orderId} — Pisces Flower`,
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

module.exports = { sendOrderConfirmation };
