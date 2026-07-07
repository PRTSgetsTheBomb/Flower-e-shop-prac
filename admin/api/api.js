/**
 * 数据分析工具 — 订单数据 API 客户端
 *
 * 通过后端 /api/orders 获取结构化订单数据用于分析
 */

const API_BASE = 'http://localhost:5000';

/**
 * 获取订单数据
 * @param {object} filters
 * @param {string} [filters.status] - 按状态筛选 (processing, completed, etc.)
 * @param {string} [filters.startDate] - 开始日期 YYYY-MM-DD
 * @param {string} [filters.endDate] - 结束日期 YYYY-MM-DD
 * @param {number} [filters.page=1] - 页码
 * @param {number} [filters.perPage=20] - 每页数量
 * @param {string} [filters.search] - 搜索关键词
 * @returns {Promise<{orders: Array, total: number, totalPages: number}>}
 */
export async function fetchOrders(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.page) params.set('page', filters.page);
  if (filters.perPage) params.set('perPage', filters.perPage);
  if (filters.search) params.set('search', filters.search);

  const url = `${API_BASE}/api/orders?${params.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * 获取单笔订单详情
 * @param {number} orderId
 * @returns {Promise<object>}
 */
export async function fetchOrderById(orderId) {
  const res = await fetch(`${API_BASE}/api/order/${orderId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * 获取订单统计摘要
 * @param {object} filters - 同 fetchOrders
 * @returns {Promise<{totalOrders, totalRevenue, avgOrderValue, statusCounts}>}
 */
export async function fetchOrderSummary(filters = {}) {
  const data = await fetchOrders({ ...filters, perPage: 100 });
  const orders = data.orders;

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const statusCounts = {};
  for (const o of orders) {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  }

  return { totalOrders, totalRevenue, avgOrderValue, statusCounts };
}
