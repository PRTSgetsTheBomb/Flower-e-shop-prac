/**
 * 数据分析聚合路由
 *
 * 所有接口需要 admin 认证（由 requireAdmin 中间件保护）
 *
 * 路由清单：
 *   GET /api/analytics/summary          总览：订单数、营收、delivery/pickup 比例、月度趋势
 *   GET /api/analytics/daily            按天聚合（日趋势图）
 *   GET /api/analytics/delivery-areas   按郊区统计配送数据
 *   GET /api/analytics/delivery-area/:s  单个郊区详情（客户、商品、月度趋势）
 *   GET /api/analytics/products          商品销售排行
 *   GET /api/analytics/monthly-products  按月 × 商品交叉分析
 *   GET /api/analytics/today             今日/未来 N 天待处理订单
 *   GET /api/orders                      订单列表（分页、筛选）
 */
const express = require('express');
const router = express.Router();
const { fetchAllWcOrders, getProductsCache, getDeliveryMethodFromOrder, calcDeliveryFee } = require('../lib/helpers');

// ---- GET /api/analytics/summary ----
router.get('/api/analytics/summary', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let orders = await fetchAllWcOrders();
        if (startDate || endDate) orders = orders.filter(o => {
            const ds = (o.meta_data?.find(m => m.key === 'Delivery Date')?.value || o.date_created || '').split('T')[0];
            if (startDate && ds < startDate) return false;
            if (endDate && ds > endDate) return false;
            return true;
        });
        const total = orders.length, revenue = orders.reduce((s, o) => s + parseFloat(o.total || 0), 0);
        let dCount = 0, pCount = 0, dFee = 0;
        for (const o of orders) {
            if (getDeliveryMethodFromOrder(o) === 'delivery') {
                dCount++;
                const f = calcDeliveryFee((o.shipping?.city || '').trim());
                if (f !== null) dFee += f;
            } else pCount++;
        }
        const status = {};
        orders.forEach(o => {
            const s = o.status || '?';
            status[s] = (status[s] || 0) + 1;
        });
        const mm = {};
        for (const o of orders) {
            const ds = o.meta_data?.find(m => m.key === 'Delivery Date')?.value || o.date_created;
            const d = new Date(ds);
            if (isNaN(d.getTime())) continue;
            const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!mm[k]) {
                mm[k] = {
                    month: k,
                    orderCount: 0,
                    revenue: 0,
                    deliveryCount: 0,
                    pickupCount: 0,
                }
            };
            mm[k].orderCount++; mm[k].revenue += parseFloat(o.total || 0);
            getDeliveryMethodFromOrder(o) === 'delivery' ? mm[k].deliveryCount++ : mm[k].pickupCount++;
        }
        const monthly = Object.values(mm).map(m => ({
            ...m,
            revenue: Math.round(m.revenue * 100) / 100
        })).sort((a, b) => a.month.localeCompare(b.month));
        const areas = new Set();
        let ti = 0;
        orders.forEach(o => {
            ti += (o.line_items || []).length;
            const s = (o.shipping?.city || '').trim();
            if (s) areas.add(s);
        });
        res.json({
            totalOrders: total,
            totalRevenue: Math.round(revenue * 100) / 100,
            deliveryCount: dCount,
            pickupCount: pCount,
            deliveryRatio: total ? Math.round(dCount / total * 10000) / 100 : 0,
            pickupRatio: total ? Math.round(pCount / total * 10000) / 100 : 0,
            totalDeliveryFee: Math.round(dFee * 100) / 100,
            avgDeliveryFee: dCount ? Math.round(dFee / dCount * 100) / 100 : 0,
            statusCounts: status,
            monthly,
            areasServed: areas.size,
            avgItemsPerOrder: ti ? (ti / total).toFixed(1) : 0,
        });
    } catch (err) {
        console.error('[Analytics] Summary error:', err.message, err.stack);
        res.status(500).json({ error: err.message });
    }
});

// ---- GET /api/analytics/daily ----
router.get('/api/analytics/daily', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const orders = await fetchAllWcOrders();
        const dm = {};
        for (const o of orders) {
            const ds = o.meta_data?.find(m => m.key === 'Delivery Date')?.value || o.date_created;
            const key = new Date(ds).toISOString().split('T')[0];
            if (isNaN(new Date(ds))) continue;
            if (startDate && key < startDate) continue;
            if (endDate && key > endDate) continue;
            if (!dm[key]) dm[key] = {
                date: key,
                orderCount: 0,
                revenue: 0
            };
            dm[key].orderCount++;
            dm[key].revenue += parseFloat(o.total || 0);
        }
        let daily = Object.values(dm).map(d => ({
            ...d,
            revenue: Math.round(d.revenue * 100) / 100
        })).sort((a, b) => a.date.localeCompare(b.date));
        if (startDate && endDate) {
            const s = new Date(startDate), e = new Date(endDate), filled = [];
            for (let dt = new Date(s); dt <= e; dt.setDate(dt.getDate() + 1)) {
                filled.push(daily.find(d => d.date === dt.toISOString().split('T')[0]) ||
                {
                    date: dt.toISOString().split('T')[0],
                    orderCount: 0,
                    revenue: 0
                });
            };
            daily = filled;
        };
        res.json({ daily });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
})

// ---- GET /api/analytics/delivery-areas ----
router.get('/api/analytics/delivery-areas', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        console.log('[delivery-areas] start');
        let orders = await fetchAllWcOrders();
        console.log('[delivery-areas] orders loaded:', orders.length);
        if (startDate || endDate) {
            orders = orders.filter(o => {
                const ds = (o.meta_data?.find(m => m.key === 'Delivery Date')?.value || o.date_created || '').split('T')[0];
                if (startDate && ds < startDate) return false;
                if (endDate && ds > endDate) return false;
                return true;
            });
        }
        console.log('[delivery-areas] after filter:', orders.length);
        let delivers = [];
        try {
            delivers = orders.filter(o => getDeliveryMethodFromOrder(o) === 'delivery');
        } catch (e) {
            console.log('[delivery-areas] filter error:', e.message, e.stack);
            throw e;
        }
        console.log('[delivery-areas] delivery orders:', delivers.length);
        const am = {};
        for (const o of delivers) {
            const city = (o.shipping?.city || 'Unknown').trim();
            if (!am[city]) am[city] = {
                suburb: city,
                orderCount: 0,
                totalRevenue: 0,
                productCounts: {}
            };
            am[city].orderCount++;
            am[city].totalRevenue += parseFloat(o.total || 0);
            for (const item of (o.line_items || [])) {
                am[city].productCounts[item.name || 'Unknown'] = (am[city].productCounts[item.name || 'Unknown'] || 0) + item.quantity;
            };
        }
        const areas = Object.values(am).map(a => ({
            ...a,
            totalRevenue: Math.round(a.totalRevenue * 100) / 100,
            deliveryFee: calcDeliveryFee(a.suburb),
            topProducts: Object.entries(a.productCounts).sort(([, a], [, b]) => b - a).slice(0, 5).map(([n, q]) => ({ name: n, qty: q }))
        })).sort((a, b) => b.orderCount - a.orderCount);
        res.json({ areas, totalDeliveryOrders: delivers.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---- GET /api/analytics/products ----
router.get('/api/analytics/products', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let orders = await fetchAllWcOrders();
        if (startDate || endDate) {
            orders = orders.filter(o => {
                const ds = (o.meta_data?.find(m => m.key === 'Delivery Date')?.value || o.date_created || '').split('T')[0];
                if (startDate && ds < startDate) return false;
                if (endDate && ds > endDate) return false;
                return true;
            });
        }
        let meta = {};
        try {
            meta = (await getProductsCache()).byId;
        } catch { };
        const pm = {};
        let dC = 0, pC = 0;
        for (const o of orders) {
            const method = getDeliveryMethodFromOrder(o);
            method === 'delivery' ? dC++ : pC++;
            const city = (o.shipping?.city || '').trim();
            for (const item of (o.line_items) || []) {
                const id = item.product_id;
                if (!pm[id]) {
                    pm[id] = {
                        productId: id, name: item.name || 'Unknown',
                        category: meta[id]?.primaryCategory || '',
                        categories: meta[id]?.categories || [],
                        image: meta[id]?.image || null,
                        totalQty: 0,
                        totalRevenue: 0,
                        deliveryQty: 0,
                        pickupQty: 0,
                        orderCount: 0,
                        priceSum: 0,
                        priceCount: 0,
                        suburbs: {}
                    };
                }
                pm[id].totalQty += item.quantity;
                pm[id].totalRevenue += parseFloat(item.total || 0);
                pm[id].orderCount++;
                pm[id].priceSum += parseFloat(item.price || 0) * item.quantity;
                pm[id].priceCount += item.quantity;
                if (method === 'delivery') {
                    pm[id].deliveryQty += item.quantity;
                    if (city) pm[id].suburbs[city] = (pm[id].suburbs[city] || 0) + item.quantity;
                } else {
                    pm[id].pickupQty += item.quantity;
                }
            }
        }
        const products = Object.values(pm).map(p => ({
            ...p,
            totalRevenue: Math.round(p.totalRevenue * 100) / 100,
            deliveryRatio: p.totalQty ? Math.round(p.deliveryQty / p.totalQty * 10000) / 100 : 0,
            unitPrice: p.priceCount ? Math.round(p.priceSum / p.priceCount * 100) / 100 : 0,
            topSuburbs: Object.entries(p.suburbs).sort(([, a], [, b]) => b - a).slice(0, 5).map(([s, q]) => ({ suburb: s, qty: q }))
        })).sort((a, b) => b.totalQty - a.totalQty);
        res.json({ products, totalDeliveryOrders: dC, totalPickupOrders: pC });
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
});

// ---- GET /api/analytics/monthly-products ----
router.get('/api/analytics/monthly-products', async (req, res) => {
    try {
        const orders = await fetchAllWcOrders();
        const cm = {}, ms = new Set(), ps = new Set();
        for (const o of orders) {
            const ds = o.meta_data?.find(m => m.key === 'Delivery Date')?.value || o.date_created;
            const d = new Date(ds);
            if (isNaN(d.getTime())) continue;
            const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            ms.add(month);
            for (const item of (o.line_items || [])) {
                const id = item.product_id, key = `${month}|${id}`; ps.add(id);
                if (!cm[key]) cm[key] = {
                    month,
                    productId: id,
                    productName: item.name || 'Unknown',
                    qty: 0,
                    revenue: 0,
                    deliveryQty: 0,
                    pickupQty: 0
                };
                cm[key].qty += item.quantity;
                cm[key].revenue += parseFloat(item.total || 0);
                getDeliveryMethodFromOrder(o) === 'delivery' ?
                    cm[key].deliveryQty += item.quantity :
                    cm[key].pickupQty += item.quantity;
            }
        }
        const names = {};
        for (const c of Object.values(cm)) names[c.productId] = c.productName;
        res.json({
            rows: Object.values(cm).map(c => ({
                ...c,
                revenue: Math.round(c.revenue * 100) / 100
            })),
            months: [...ms].sort(),
            products: [...ps].sort((a, b) => a - b).map(id => ({ id, name: names[id] || 'Unknown' }))
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- GET /api/analytics/delivery-area/:suburb ----
router.get('/api/analytics/delivery-area/:suburb', async (req, res) => {
    try {
        const suburb = decodeURIComponent(req.params.suburb).trim();
        const orders = await fetchAllWcOrders();
        const ao = orders.filter(o =>
            getDeliveryMethodFromOrder(o) === 'delivery' && (o.shipping?.city || '').trim().toLowerCase() === suburb.toLowerCase()
        );
        const count = ao.length, rev = Math.round(ao.reduce((s, o) => s + parseFloat(o.total || 0), 0) * 100) / 100;
        const cust = {};
        for (const o of ao) {
            const e = o.billing?.email;
            if (!e) continue;
            if (!cust[e]) {
                cust[e] = {
                    name: [o.billing?.first_name, o.billing?.last_name].filter(Boolean).join(' ') || 'Unknown',
                    email: e, phone: o.billing?.phone || '',
                    orderCount: 0,
                    totalSpent: 0,
                    firstOrder: o.date_created,
                    lastOrder: o.date_created
                };
            }
            cust[e].orderCount++;
            cust[e].totalSpent += parseFloat(o.total || 0);
            if (o.date_created < cust[e].firstOrder) cust[e].firstOrder = o.date_created;
            if (o.date_created > cust[e].lastOrder) cust[e].lastOrder = o.date_created;
        }
        const customers = Object.values(cust).map(c => ({
            ...c,
            totalSpent: Math.round(c.totalSpent * 100) / 100
        })).sort((a, b) => b.totalSpent - a.totalSpent);
        const mtr = {};
        for (const o of ao) {
            const ds = o.meta_data?.find(m => m.key === 'Delivery Date')?.value || o.date_created;
            const d = new Date(ds);
            if (isNaN(d.getTime())) continue;
            const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!mtr[k]) mtr[k] = { month: k, orderCount: 0, revenue: 0 }; mtr[k].orderCount++;
            mtr[k].revenue += parseFloat(o.total || 0);
        }
        const monthly = Object.values(mtr).map(m => ({
            ...m,
            revenue: Math.round(m.revenue * 100) / 100
        })).sort((a, b) => a.month.localeCompare(b.month));
        const pc = {};
        for (const o of ao) {
            for (const i of (o.line_items || [])) {
                pc[i.name || 'Unknown'] = (pc[i.name || 'Unknown'] || 0) + i.quantity;
            }
        }
        let cache = { byName: {} };
        try {
            cache = await getProductsCache();
        }
        catch { }
        const top = Object.entries(pc).map(([n, q]) => ({
            name: n,
            qty: q,
            image: cache.byName[n]?.image || null
        })).sort((a, b) => b.qty - a.qty);
        const recent = ao.sort((a, b) => new Date(b.date_created) - new Date(a.date_created)).slice(0, 20).map(o => ({
            id: o.id,
            number: o.number,
            date: o.date_created,
            total: parseFloat(o.total),
            customer: [o.billing?.first_name, o.billing?.last_name].filter(Boolean).join(' '),
            items: (o.line_items || []).map(i => ({ name: i.name, qty: i.quantity }))
        }));
        res.json({
            suburb,
            orderCount: count,
            totalRevenue: rev,
            uniqueCustomers: customers.length,
            customers,
            monthlyTrend: monthly,
            topProducts: top,
            recentOrders: recent,
            deliveryFee: calcDeliveryFee(suburb)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---- GET /api/orders ----
router.get('/api/orders', async (req, res) => {
    try {
        const { status, startDate, endDate, page = 1, perPage = 20, search } = req.query;
        const limit = Math.min(+perPage || 20, 100);
        const params = {
            per_page: limit,
            page: +page,
            orderby: 'date',
            order: 'desc'
        };
        if (status) params.status = status;
        if (search) params.search = search;
        let after, before;
        if (startDate) after = `${startDate}T00:00:00`;
        if (endDate) before = `${endDate}T23:59:59`;
        let all = [], tp = 1;
        const first = await require('../lib/woocommerce').get('orders', { ...params, page: 1 });
        tp = parseInt(first.headers?.['x-wp-totalpages'], 10) || 1;
        all = first.data;
        if (after || before) {
            for (let p = 2; p <= tp; p++) {
                all = all.concat((await require('../lib/woocommerce').get('orders', { ...params, page: p })).data);
            }
        }
        if (after) {
            const ad = new Date(after).getTime();
            all = all.filter(o => new Date(o.date_created).getTime() >= ad);
        }
        if (before) {
            const bd = new Date(before).getTime();
            all = all.filter(o => new Date(o.date_created).getTime() <= bd);
        }
        all = all.filter(o => o.status !== 'trash');
        const orders = all.map(o => ({
            id: o.id,
            number: o.number,
            status: o.status,
            dateCreated: o.date_created,
            datePaid: o.date_paid,
            dateCompleted: o.date_completed,
            total: parseFloat(o.total),
            subtotal: parseFloat(o.subtotal || 0),
            shippingTotal: parseFloat(o.shipping_total || 0),
            taxTotal: parseFloat(o.total_tax || 0),
            discountTotal: parseFloat(o.discount_total || 0),
            paymentMethod: o.payment_method_title,
            currency: o.currency,
            customer: {
                id: o.customer_id,
                name: [o.billing?.first_name, o.billing?.last_name].filter(Boolean).join(' '),
                email: o.billing?.email, phone: o.billing?.phone
            },
            billing: o.billing,
            shipping: o.shipping,
            items: (o.line_items || []).map(i => ({
                productId: i.product_id,
                name: i.name,
                qty: i.quantity,
                price: parseFloat(i.price),
                total: parseFloat(i.total),
                image: i.image?.src || null
            })),
            itemCount: (o.line_items || []).reduce((s, i) => s + i.quantity, 0),
            deliveryMethod: o.shipping?.address_1 ? 'Delivery' : 'Pickup',
            customerNote: o.customer_note
        }));
        res.json({
            orders,
            total: parseInt(first.headers?.['x-wp-total'], 10) || orders.length,
            totalPages: after || before ? 1 : tp, currentPage: +page
        });
    } catch (err) {
        res.status(500).json({ error: err.response?.data?.message || err.message });
    }
});

// ---- GET /api/analytics/today ----
router.get('/api/analytics/today', async (req, res) => {
    try {
        const days = Math.max(1, +req.query.days || 1);
        const mt = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Melbourne' });
        const dates = [];
        for (let i = 0; i < days; i++) {
            const [y, m, d] = mt().split('-').map(Number);
            dates.push(new Date(Date.UTC(y, m - 1, d + i)).toISOString().split('T')[0]);
        }
        const tmd = iso => iso ? new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Australia/Melbourne' }) : '';
        const raw = await fetchAllWcOrders();
        const inactive = ['completed', 'cancelled', 'refunded', 'failed', 'trash', 'on-hold', 'pending'];
        const proc = raw.filter(o => {
            const ds = o.meta_data?.find(m => m.key === 'dashboard_status')?.value;
            if (ds === 'fulfilled' || ds === 'readyforpickup') return true;
            return !inactive.includes(o.status);
        });
        const onHold = raw.filter(o => o.status === 'on-hold');
        const comp = raw.filter(o => o.status === 'completed');
        const dList = [], pList = [];
        for (const o of proc) {
            const hm = (o.line_items || []).some(i => {
                const dd = i.meta_data?.find(m => m.key === 'Delivery Date')?.value;
                return dd && dates.includes(dd.split('T')[0]);
            });
            const cd = tmd(o.date_created), dash = o.meta_data?.find(m => m.key === 'dashboard_status')?.value;
            if (!(o.status === 'shipped' || dash === 'fulfilled' || dash === 'readyforpickup') && !hm && !dates.includes(cd)) continue;
            const info = makeOrderInfo(o, tmd, dash);
            getDeliveryMethodFromOrder(o) === 'delivery' ? dList.push(info) : pList.push(info);
        }
        const sf = (a, b) => {
            const an = a.items.some(i => i.deliveryNote) ? 0 : 1, bn = b.items.some(i => i.deliveryNote) ? 0 : 1;
            return an !== bn ? an - bn : (a.items[0]?.deliveryDate || '').localeCompare(b.items[0]?.deliveryDate || '');
        };
        dList.sort(sf);
        pList.sort(sf);
        const cdList = [], cpList = [];
        for (const o of comp) {
            const hm = (o.line_items || []).some(i => {
                const dd = i.meta_data?.find(m => m.key === 'Delivery Date')?.value;
                return dd && dates.includes(dd.split('T')[0]);
            });
            if (!hm && !dates.includes(tmd(o.date_created))) continue;
            const info = makeOrderInfo(o, tmd);
            getDeliveryMethodFromOrder(o) === 'delivery' ? cdList.push(info) : cpList.push(info);
        }
        const hdList = [], hpList = [];
        for (const o of onHold) {
            const info = makeOrderInfo(o, tmd, null, tmd(o.date_created));
            getDeliveryMethodFromOrder(o) === 'delivery' ? hdList.push(info) : hpList.push(info);
        }
        res.json({
            date: dates[0],
            dateRange: days > 1 ? `${dates[0]} ~ ${dates[dates.length - 1]}` : dates[0],
            days,
            deliveryCount: dList.length,
            pickupCount: pList.length,
            deliveries: dList,
            pickups: pList,
            onHold: {
                deliveries: hdList,
                pickups: hpList
            },
            completed: {
                deliveries: cdList,
                pickups: cpList
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function makeOrderInfo(o, tmd, dashStatus, fallbackDate) {
    return {
        id: o.id, number: o.number, status: dashStatus || o.status,
        customer: [o.billing?.first_name, o.billing?.last_name].filter(Boolean).join(' ') || 'Unknown',
        phone: o.billing?.phone || '',
        address: o.shipping?.address_1 ? `${o.shipping.address_1}, ${o.shipping.city || ''} ${o.shipping.postcode || ''}`.trim() : '',
        total: parseFloat(o.total || 0), customerNote: o.customer_note || '', createdDate: tmd(o.date_created),
        items: (o.line_items || []).map(i => ({
            name: i.name,
            qty: i.quantity,
            giftMessage: i.meta_data?.find(m => m.key === 'Gift Message')?.value || '',
            deliveryNote: i.meta_data?.find(m => m.key === 'Delivery Note')?.value || '',
            deliveryDate: i.meta_data?.find(m => m.key === 'Delivery Date')?.value || fallbackDate || ''
        }))
    };
}

module.exports = router;