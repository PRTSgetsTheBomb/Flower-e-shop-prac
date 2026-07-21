/**
 * 共享工具函数
 *
 * fetchAllWcOrders / fetchAllWcProducts  分页拉取 WooCommerce 全部数据
 * getProductsCache                       商品信息缓存（10 分钟 TTL）
 * getDeliveryMethodFromOrder             从订单 meta 推断配送方式（delivery/pickup）
 * calcDeliveryFee                        根据郊区坐标计算运费（Haversine 公式）
 */
const wcApi = require('./woocommerce');

async function fetchAllWcOrders(params = {}) {
    let all = [], page = 1;
    console.log('[helpers] fetchAllWcOrders start');
    const first = await wcApi.get('orders', { ...params, per_page: 100, page });
    console.log('[helpers] first response type:', typeof first, 'has data:', !!first?.data, 'count:', first?.data?.length);
    const totalPages = parseInt(first.headers?.['x-wp-totalpages'], 10) || 1;
    all = first.data;
    for (let p = 2; p <= totalPages; p++) {
        all = all.concat((await wcApi.get('orders', { ...params, per_page: 100, page: p })).data);
    }
    return all.filter(o => o.status !== 'trash');
}

async function fetchAllWcProducts() {
    let all = [], page = 1;
    const first = await wcApi.get('products', { per_page: 100, page });
    const totalPages = parseInt(first.headers?.['x-wp-totalpages'], 10) || 1;
    all = first.data;
    for (let p = 2; p <= totalPages; p++) {
        all = all.concat((await wcApi.get('products', { per_page: 100, page: p })).data);
    }
    return all;
}

let _cachedProducts = null, _cachedTime = 0;
async function getProductsCache() {
    if (_cachedProducts && Date.now() - _cachedTime < 10 * 60 * 1000) return _cachedProducts;
    const prods = await fetchAllWcProducts();
    const byId = {}, byName = {};
    for (const p of prods) {
        const info = {
            id: p.id,
            image: p.images?.[0]?.src || null,
            categories: (p.categories || []).map(c => c.name),
            primaryCategory: p.categories?.[0]?.name || 'Uncategorized'
        };
        byId[p.id] = info;
        if (p.name) byName[p.name.trim()] = info;
    }
    _cachedProducts = { byId, byName }; _cachedTime = Date.now();
    return _cachedProducts;
}

function getDeliveryMethodFromOrder(order) {
    const dm = order.meta_data?.find(m => m.key === 'delivery_method');
    if (dm) {
        if (dm.value === 'Delivery') return 'delivery';
        if (dm.value === 'Pickup') return 'pickup';
    }
    const first = order.line_items?.[0]?.meta_data?.find(m => m.key === 'Delivery Method')?.value;
    if (first) return first === 'delivery' ? 'delivery' : 'pickup';
    return order.shipping?.address_1 ? 'delivery' : 'pickup';
}

const STORE_LOCATION = { lat: -37.92, lng: 145.09 };
const SUBURB_COORDS = {
    'Melbourne CBD': [-37.8136, 144.9631], 'Armadale': [-37.8550, 145.0167], 'Bentleigh': [-37.9181, 145.0356],
    'Camberwell': [-37.8322, 145.0694], 'Malvern': [-37.8583, 145.0250], 'Richmond': [-37.8231, 145.0019],
    'St Kilda': [-37.8676, 144.9800], 'South Yarra': [-37.8383, 144.9917], 'Windsor': [-37.8517, 144.9917],
    'Southbank': [-37.8200, 144.9600], 'Port Melbourne': [-37.8267, 144.9400],
};

function calcDeliveryFee(suburb) {
    const c = SUBURB_COORDS[suburb]; if (!c) return null;
    const d = (() => {
        const R = 6371, dLat = (c[0] - STORE_LOCATION.lat) * Math.PI / 180, dLng = (c[1] - STORE_LOCATION.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(STORE_LOCATION.lat * Math.PI / 180) * Math.cos(c[0] * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    })();
    if (d > 20) return null;
    return Math.min(Math.round((5 + d * 1.2) * 2) / 2, 30);
}

module.exports = { fetchAllWcOrders, fetchAllWcProducts, getProductsCache, getDeliveryMethodFromOrder, calcDeliveryFee };