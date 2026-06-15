/**
 * WooCommerce REST API 客户端配置
 *
 * 核心职责：创建并导出一个配置好的 API 实例，供 products.js 使用
 *
 * 设计说明：
 *
 * 1. 【环境变量（REACT_APP_ 前缀）】
 *    Create React App 要求自定义环境变量必须以 REACT_APP_ 开头，
 *    否则会被忽略。这些变量在 .env 文件中定义：
 *    REACT_APP_WC_URL=https://example.com
 *    REACT_APP_WC_KEY=ck_xxx
 *    REACT_APP_WC_SECRET=cs_xxx
 *    用环境变量的好处：不同环境（开发/测试/生产）可以配置不同的 API 地址，
 *    代码不需要修改。
 *
 * 2. 【WooCommerce REST API】
 *    @woocommerce/woocommerce-rest-api 是官方提供的 Node.js 客户端。
 *    它封装了 API 请求的鉴权和 URL 拼接，我们只需要调用 api.get()、api.post()。
 *    version: "wc/v3" 指定使用 WooCommerce API 的 v3 版本。
 *
 * 3. 【queryStringAuth: true】
 *    将 API Key 和 Secret 放在 URL 查询参数中而不是 HTTP Header。
 *    某些服务器（如共享主机）可能不支持 Header 方式的鉴权，
 *    用查询参数方式兼容性更好。但注意：HTTPS 是必须的，否则 Key 会暴露。
 *
 * 4. 【为什么单独一个文件？】
 *    如果将来需要更换电商平台（如 Shopify），只需要修改这个文件和
 *    products.js 中的数据映射，所有组件代码不需要改动。
 *    这就是"关注点分离"——API 配置和组件逻辑解耦。
 */

import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";

const api = new WooCommerceRestApi({
  url: process.env.REACT_APP_WC_URL,         // WooCommerce 站点地址
  consumerKey: process.env.REACT_APP_WC_KEY,      // API 公钥
  consumerSecret: process.env.REACT_APP_WC_SECRET, // API 密钥
  version: "wc/v3",                                 // API 版本
  queryStringAuth: true,                            // Key 放在 URL 参数中
});

export default api;