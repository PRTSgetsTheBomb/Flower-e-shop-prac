/**
 * 评价系统路由
 *
 * 数据存储：reviews.json（本地） + WooCommerce 商品评价（同步）
 *
 * 路由清单：
 *   POST   /api/can-review  检查用户是否有权评价某商品
 *   GET    /api/reviews      获取商品评价列表（含商家回复）
 *   POST   /api/reviews      提交评价
 *   DELETE /api/reviews      删除评价
 *   PUT    /api/reviews/reply 商家回复评价
 *   GET    /api/sync-reviews 手动同步本地评价到 WooCommerce
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const wcApi = require('../lib/woocommerce');
const REVIEWS_FILE = path.join(__dirname, '..', 'reviews.json');
const rd = () => {
    try {
        return JSON.parse(fs.readFileSync(REVIEWS_FILE, 'utf-8'));
    } catch { return {}; }
};
const wr = d => fs.writeFileSync(REVIEWS_FILE, JSON.stringify(d, null, 2));

router.post('/api/can-review', async (req, res) => {
    try {
        const { token, productId } = req.body;
        if (!token || !productId) return res.json({ canReview: false });
        const wpResp = await fetch(`${process.env.WC_URL}/wp-json/wp/v2/users/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!wpResp.ok) return res.json({ canReview: false });
        const u = await wpResp.json();
        let em = ''; try { em = (await wcApi.get(`customers/${u.id}`)).data.email || ''; } catch { }
        let orders = []; try {
            orders = (await wcApi.get('orders', {
                customer: u.id, status: 'completed', per_page: 100

            })).data;
        } catch { };
        if (!orders.length && em) {
            try {
                orders = (await wcApi.get('orders', { search: em, status: 'completed', per_page: 100 })).data;
            } catch { };
        }
        res.json({ canReview: orders.some(o => o.line_items?.some(i => String(i.product_id) === String(productId))) });
    } catch {
        res.json({ canReview: false });
    }
});

router.get('/api/reviews', async (req, res) => {
    const reviews = (rd()[req.query.productId] || []).slice();
    for (const r of reviews) {
        if (!r.wc_review_id) continue;
        try {
            const resp = await fetch(
                `${process.env.WC_URL}/wp-json/wp/v2/comments?parent=${r.wc_review_id}`
            );
            if (!resp.ok) continue;
            const comments = await resp.json();
            const reply = comments.find(c => c.author_name !== r.author);
            if (reply) r.reply = {
                author: reply.author_name,
                text: (reply.content?.rendered || '').replace(/<[^>]+>/g, ''),
                date: reply.date
            };
        } catch { }
    }
    res.json(reviews);
});

router.post('/api/reviews', async (req, res) => {
    try {
        const { token, productId, rating, text } = req.body;
        if (!token || !productId || !rating || !text) return res.json({ success: false, error: 'Missing fields. ' });
        const wpResp = await fetch(`${process.env.WC_URL}/wp-json/wp/v2/users/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!wpResp.ok) return res.json({ success: false, error: 'Invalid token.' });
        const u = await wpResp.json();
        const rev = { id: `rev_${Date.now()}`, author: u.name, rating: Math.min(5, Math.max(1, + rating)), text, date: new Date().toISOString() };
        const all = rd();
        all[productId] = [rev, ...(all[productId] || [])];
        wr(all);
        try {
            const w = await wcApi.post('products/reviews', {
                product_id: +productId,
                reviewer: u.name,
                reviewer_email: u.email || '',
                rating: +rating,
                review: text,
                status: 'approved'
            })
            if (w.data?.id) {
                const up = rd();
                const t = up[productId]?.find(r => r.id === rev.id);
                if (t) t.wc_review_id = w.data.id; wr(up);
            }
        } catch { }
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

router.delete('/api/reviews', async (req, res) => {
    try {
        const { token, reviewId } = req.body;
        if (!token || !reviewId) return res.json({ success: false, error: 'Missing required fields.' });
        const wpResp = await fetch(`${process.env.WC_URL}/wp-json/wp/v2/users/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!wpResp.ok) return res.json({ success: false, error: 'Invalid token.' });
        const u = await wpResp.json();
        const all = rd();
        for (const pid of Object.keys(all)) {
            const del = all[pid].find(r => r.id === reviewId && r.author === u.name);
            all[pid] = all[pid].filter(r => r.id !== reviewId || r.author !== u.name);
            if (del?.wc_review_id) {
                try {
                    await wcApi.delete(`products/reviews/${del.wc_review_id}`, { force: true });
                } catch { }
            }
        }
        wr(all);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

router.put('/api/reviews/reply', async (req, res) => {
    try {
        const { token, reviewId, text } = req.body;
        if (!token || !reviewId || !text) return res.json({ success: false, error: 'Missing fields.' });
        const wpResp = await fetch(`${process.env.WC_URL}/wp-json/wp/v2/users/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!wpResp.ok) return res.json({ success: false, error: 'Invalid token.' });
        const u = await wpResp.json();
        if (!u.roles?.some(r => ['administrator', 'editor', 'shop_manager'].includes(r))) return res.json({ success: false, error: 'Admin only.' });
        const all = rd();
        for (const pid of Object.keys(all)) {
            const r = all[pid].find(r => r.id === reviewId);
            if (r) {
                r.reply = {
                    author: u.name, text: text.trim(), date: new Date().toISOString()
                };
                break;
            }
        }
        wr(all); res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.message })
    }
});

router.get('/api/sync-reviews', async (req, res) => {
    const all = rd(); let s = 0, f = 0;
    for (const [pid, revs] of Object.entries(all))
        for (const r of revs) {
            if (r.wc_review_id) continue;
            try {
                const w = await wcApi.post('products/reviews', {
                    product_id: +pid,
                    reviewer: r.author,
                    rating: +r.rating,
                    review: r.text,
                    status: 'approved'
                });
                if (w.data?.id) {
                    r.wc_review_id = w.data.id; s++;
                } else f++;
            } catch { f++; }
        }
    wr(all);
    res.json({ synced: s, failed: f });
});

module.exports = router;
