/**
 * 订单管理工具模块
 *
 * 核心职责：使用 localStorage 存储和查询用户订单
 *
 * 设计说明：
 * - 数据结构：{ [email]: [order, order, ...] }，按邮箱分组存储
 * - 新订单添加到数组最前面（最新的在前）
 * - 订单 ID 使用 ORD- + 时间戳生成，确保唯一
 * - 所有操作用 try/catch 包裹，防止 JSON.parse 异常
 * - 此为本地演示实现，对接后端后需替换为 API 调用
 */

const ORDERS_KEY = 'user_orders';

function getAllOrders() {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveOrders(orders) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

/**
 * 为用户保存一笔新订单
 * @param {string} email - 用户邮箱
 * @param {Array} items  - 购物车商品列表
 * @param {number} total - 订单总额
 * @param {object} delivery - 配送信息
 */
export function addOrder(email, items, total, delivery) {
  const all = getAllOrders();
  const userOrders = all[email] || [];
  const order = {
    id: `ORD-${Date.now()}`,
    date: new Date().toISOString(),
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      qty: item.qty,
      price: parseFloat(item.sale_price) || parseFloat(item.price) || 0,
      image: item.image,
      deliveryDate: item.deliveryDate,
      deliveryMethod: item.deliveryMethod,
    })),
    total,
    delivery,
    paymentMethod: delivery?.paymentMethod || null,
    status: 'Paid',
  };
  all[email] = [order, ...userOrders];
  saveOrders(all);
  return order;
}

/**
 * 获取用户的所有订单（按时间倒序）
 * @param {string} email
 */
export function getUserOrders(email) {
  const all = getAllOrders();
  return all[email] || [];
}

/**
 * 按订单 ID 查询单笔订单
 * @param {string} email
 * @param {string} orderId
 */
export function getOrderById(email, orderId) {
  const orders = getUserOrders(email);
  return orders.find((o) => o.id === orderId) || null;
}
