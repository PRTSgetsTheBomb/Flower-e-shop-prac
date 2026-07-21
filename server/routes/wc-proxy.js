/**
 * WooCommerce API 代理
 *
 * 前端通过此代理间接访问 WooCommerce REST API，避免在浏览器端暴露 API 密钥。
 * 支持 GET / POST / PUT / DELETE，转发分页头部（X-WP-Total / X-WP-TotalPages）。
 *
 * 示例：GET /api/wc/products?per_page=8  →  wcApi.get('products', {per_page:8})
 */
const express = require('express');
const router = express.Router();
const wcApi = require('../lib/woocommerce');

router.all('/api/wc/:endpoint*', async (req, res) => {
    try {
        const endpoint = `${req.params.endpoint}${req.params[0] || ''}`;
        let result;
        switch (req.method.toLowerCase()) {
            case 'get':
                result = await wcApi.get(endpoint, req.query);
                break;
            case 'post':
                result = await wcApi.post(endpoint, req.body);
                break;
            case 'put':
                result = await wcApi.put(endpoint, req.body);
                break;
            case 'delete':
                result = await wcApi.delete(endpoint);
                break;
            default:
                return res.status(405).json({ error: 'Not allowed' });
        }
        if (result.headers?.['x-wp-total']) res.set('X-WP-Total', result.headers['x-wp-total']);
        if (result.headers?.['x-wp-totalpages']) res.set('X-WP-TotalPages', result.headers['x-wp-totalpages']);
        res.json(result.data);
    } catch (err) {
        const s = err.response?.status || 500;
        res.status(s).json({ error: err.response?.data?.message || err.message });
    }
});

module.exports = router;