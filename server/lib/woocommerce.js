/**
 * WooCommerce API 客户端（共享实例）
 *
 * 所有路由模块通过此文件获取已配置的 WooCommerceRestApi 实例，
 * 避免每个模块重复初始化。
 */
const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;

const wcApi = new WooCommerceRestApi({
  url: process.env.WC_URL,
  consumerKey: process.env.WC_KEY,
  consumerSecret: process.env.WC_SECRET,
  version: 'wc/v3',
  queryStringAuth: true,
});

module.exports = wcApi;
