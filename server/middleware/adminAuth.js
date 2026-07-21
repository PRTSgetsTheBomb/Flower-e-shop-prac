/**
 * 管理员认证中间件
 *
 * verifyAdmin(token)  — 通过 WordPress JWT 验证身份 + 检查 admin 角色
 * requireAdmin        — Express 中间件，拦截 /api/analytics、/api/orders 等管理接口
 *
 * 注意：/api/wc 不在保护范围内，WooCommerce 代理有自己的 API Key 认证
 */
async function verifyAdmin(token) {
    const wsResp = await fetch(`${process.env.WC_URL}/wp-json/wp/v2/users/me?context=edit`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!wsResp.ok) return null;
    const wpUser = await wsResp.json();
    const adminRoles = ['administrator', 'shop_manager', 'editor'];
    if (!wpUser.roles?.some(r => adminRoles.includes(r))) return null;
    return wpUser;
}

async function requireAdmin(req, res, next) {
    if (req.method === 'GET' && req.path.startsWith('/api/order/') && !req.path.endsWith('/status')) {
        return next();
    }
    const adminPaths = ['/api/analytics', '/api/orders', '/api/order', '/api/ai', '/api/sync-reviews'];
    if (!adminPaths.some(p => req.path.startsWith(p))) return next();
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];

    // 取消订单允许普通用户操作
    if (req.method === 'PUT' && req.path.endsWith('/status') && req.body?.status === 'cancelled') {
        const user = await verifyToken(token);
        if (!user) return res.status(401).json({ error: 'Unauthorized' });
        req.adminUser = user;
        return next();
    }

    const user = await verifyAdmin(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.adminUser = user;
    next();
}

async function verifyToken(token) {
    try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
        if (payload.exp && payload.exp * 1000 < Date.now()) return null;
        const uid = payload.data?.user?.id;
        if (!uid) return null;
        return { id: Number(uid), name: payload.data?.user?.display_name || 'User' };
    } catch {
        return null;
    }
}

module.exports = { requireAdmin, verifyAdmin };