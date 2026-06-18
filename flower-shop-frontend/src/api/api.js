/**
 * WooCommerce API 客户端配置
 *
 * 由于 @woocommerce/woocommerce-rest-api 在浏览器端无法正常进行 OAuth 1.0a 签名
 * （缺少 crypto），改为通过后端代理服务器转发请求。
 *
 * 前端调用 api.get() / api.post() → 后端 /api/wc/* → WooCommerce API
 * 这样 API 密钥只存在于服务端，不会暴露给浏览器。
 */

const API_SERVER = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

const api = {
  /**
   * GET 请求，代理到后端
   * @param {string} endpoint - WooCommerce API 路径，如 "products", "orders"
   * @param {object} params - 查询参数对象
   * @returns {Promise<{data: any, headers: object}>}
   */
  async get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `${API_SERVER}/api/wc/${endpoint}${query ? '?' + query : ''}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw { response: { status: res.status, data: err } };
    }
    const data = await res.json();
    return {
      data,
      headers: {
        'x-wp-total': res.headers.get('x-wp-total'),
        'x-wp-totalpages': res.headers.get('x-wp-totalpages'),
      },
    };
  },

  /**
   * POST 请求，代理到后端
   */
  async post(endpoint, data = {}) {
    const res = await fetch(`${API_SERVER}/api/wc/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw { response: { status: res.status, data: err } };
    }
    return { data: await res.json() };
  },

  /**
   * PUT 请求，代理到后端
   */
  async put(endpoint, data = {}) {
    const res = await fetch(`${API_SERVER}/api/wc/${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw { response: { status: res.status, data: err } };
    }
    return { data: await res.json() };
  },

  /**
   * DELETE 请求，代理到后端
   */
  async delete(endpoint) {
    const res = await fetch(`${API_SERVER}/api/wc/${endpoint}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw { response: { status: res.status, data: err } };
    }
    return { data: await res.json() };
  },
};

export default api;