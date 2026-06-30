/**
 * 商品详情页（/product/:slug）
 *
 * 核心职责：展示单个商品的详细信息，支持加入购物车
 *
 * 设计说明：
 *
 * 1. 【useParams 获取路由参数】
 *    :slug 是 URL 中的动态段，如 /product/alstromeria 中的 alstromeria（花名）。
 *    当用户从首页或分类页点击商品卡片时，URL 变化触发组件重新渲染，
 *    useEffect 检测到 slug 变化后重新请求数据。
 *
 * 2. 【三态渲染模式】
 *    - loading: 显示 Loading 组件（数据请求中）
 *    - !product: 显示 "Product not found"（API 返回空）
 *    - product: 显示完整的商品详情
 *    这种模式适用于所有"请求外部数据"的页面，是 React 常用模式。
 *
 * 3. 【多个 useState 管理不同维度】
 *    每个独立的状态用单独的 useState，而不是合并成一个对象：
 *    - product: 商品数据
 *    - loading: 加载状态
 *    - added: 加入购物车的反馈状态（显示 "Added ✓" 2 秒）
 *    - qty: 购买数量
 *    - deliveryDate: 配送日期
 *    - giftMessage: 礼品留言
 *    分开管理的好处：更新其中一个不会影响其他，代码更清晰。
 *
 * 4. 【dangerouslySetInnerHTML】
 *    商品描述（short_description / description）来自 WooCommerce API，
 *    内容是 HTML 格式（含 <p>、<ul> 等标签）。React 默认转义 HTML，
 *    需要用 dangerouslySetInnerHTML 来渲染。这个属性名中的 "dangerously"
 *    是 React 的警示：确保内容来源可靠，否则可能被 XSS 攻击。
 *    这里的数据来自自己的电商后台，风险可控。
 *
 * 5. 【加入购物车反馈】
 *    handleAdd 调用 addToCart 后设置 added=true，
 *    按钮文字变为 "Added ✓"，2 秒后自动恢复。
 *    这是一种常见的"即时反馈"模式，让用户知道操作已生效。
 *
 * 6. 【日期选择限制与校验】
 *    min={today} 禁止用户选择今天之前的日期。
 *    today 通过 new Date().toISOString().split('T')[0] 获取当前日期。
 *    handleAdd 中校验 deliveryDate 是否已填，未填时显示红色错误提示，
 *    阻止加入购物车。用户选择日期后错误自动清除。
 *
 * 7. 【字符计数】
 *    {giftMessage.length}/200 实时显示已输入字符数，
 *    maxLength={200} 限制最大输入长度。
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import FadeInUp from '../../components/FadeInUp';
import ImageLightbox from './ImageLightbox';
import ProductReviews from './ProductReviews';
import { fetchProductBySlug, fetchAllProducts } from '../../api/products';
import { useCart } from '../../context/CartContext';
import deliveryAreas from '../../components/Areas';
import Loading from '../../components/Loading';
import ProductCard from '../../components/ProductCard';
import '../PageStyles/ProductDetail.css';

function ProductDetail() {
    const { slug } = useParams();
    const [searchParams] = useSearchParams();
    const reviewOrderId = searchParams.get('order');
    const { addToCart } = useCart();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [recommended, setRecommended] = useState([]);   // 推荐商品
    const [added, setAdded] = useState(false);
    const [selectedImage, setSelectedImage] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [qty, setQty] = useState(1);
    const [deliveryMethod, setDeliveryMethod] = useState('pickup');
    const [selectedSuburb, setSelectedSuburb] = useState(() => {
        try { return localStorage.getItem('checkout_suburb') || ''; }
        catch { return ''; }
    });
    const [deliveryDate, setDeliveryDate] = useState('');
    const [giftMessage, setGiftMessage] = useState('');
    const [dateError, setDateError] = useState('');

    useEffect(() => {
        setLoading(true);
        setSelectedImage(0);
        fetchProductBySlug(slug)
            .then((p) => {
                setProduct(p);
                // 加载推荐商品（排除当前商品，取 4 个）
                if (p) {
                    fetchAllProducts(8).then((all) =>
                        setRecommended(all.filter((item) => item.id !== p.id).slice(0, 4))
                    );
                }
            })
            .finally(() => setLoading(false));
    }, [slug]);

    if (loading) return <section className="detail-page"><div className="container"><Loading /></div></section>;
    if (!product) return (
        <FadeInUp as="section" className="detail-page">
            <div className="container">
                <p className="detail-notfound">Product not found.</p>
                <Link to="/" className="event-btn">Back to Home</Link>
            </div>
        </FadeInUp>
    );

    const handleAdd = () => {
        // 校验：配送/自取日期为必填
        if (!deliveryDate) {
            setDateError(`Please select a ${deliveryMethod} date.`);
            return;
        }
        setDateError('');
        addToCart({ ...product, qty, deliveryMethod, deliveryDate, giftMessage });
        setAdded(true);
    };

    const now = new Date();
    const minDate = new Date();
    if (deliveryMethod === 'pickup') minDate.setDate(minDate.getDate() + 1);
    else if (deliveryMethod === 'delivery' && now.getHours() >= 13) minDate.setDate(minDate.getDate() + 1);
    const minDateStr = minDate.toISOString().split('T')[0];

    return (
        <FadeInUp as="section" className="detail-page">
            <div className="container">
                <div className="detail-layout">
                    <div className="detail-gallery">
                        <div className="detail-main-image" onClick={() => setLightboxOpen(true)}>
                            {product.gallery?.length > 0 ? (
                                <img src={product.gallery[selectedImage]} alt={product.name} />
                            ) : product.image ? (
                                <img src={product.image} alt={product.name} />
                            ) : null}
                        </div>
                        {product.gallery?.length > 1 && (
                            <div className="detail-thumbnails">
                                {product.gallery.map((src, i) => (
                                    <button
                                        key={i}
                                        className={`detail-thumb${selectedImage === i ? ' active' : ''}`}
                                        onClick={() => setSelectedImage(i)}
                                    >
                                        <img src={src} alt={`${product.name} ${i + 1}`} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="detail-info">
                        <h1 className="detail-name">{product.name}</h1>
                        {product.price && (
                            <p className="detail-price">
                                {product.sale_price ? (
                                    <>
                                        <span className="regular-price">${product.regular_price}</span>
                                        <span className="sale-price">${product.sale_price}</span>
                                    </>
                                ) : (
                                    <span>${product.price}</span>
                                )}
                            </p>
                        )}
                        {product.short_description && (
                            <div className="detail-desc" dangerouslySetInnerHTML={{ __html: product.short_description }} />
                        )}

                        <div className="detail-options">
                            <div className="detail-field">
                                <label>Method</label>
                                <div className="method-toggle">
                                    <button
                                        type="button"
                                        className={`method-btn${deliveryMethod === 'pickup' ? ' active' : ''}`}
                                        onClick={() => {
                                            setDeliveryMethod('pickup');
                                            // 切换方式后重新校验日期
                                            const newMin = new Date();
                                            newMin.setDate(newMin.getDate() + 1);
                                            const newMinStr = newMin.toISOString().split('T')[0];
                                            if (deliveryDate && deliveryDate < newMinStr) setDeliveryDate('');
                                        }}
                                    >
                                        Pickup
                                    </button>
                                    <button
                                        type="button"
                                        className={`method-btn${deliveryMethod === 'delivery' ? ' active' : ''}`}
                                        onClick={() => {
                                            setDeliveryMethod('delivery');
                                            // 切换方式后重新校验日期
                                            const newMin = new Date();
                                            if (newMin.getHours() >= 13) newMin.setDate(newMin.getDate() + 1);
                                            const newMinStr = newMin.toISOString().split('T')[0];
                                            if (deliveryDate && deliveryDate < newMinStr) setDeliveryDate('');
                                        }}
                                    >
                                        Delivery
                                    </button>
                                </div>
                            </div>

                            <div className="detail-field">
                                <label>Quantity</label>
                                <div className="qty-selector">
                                    <button onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                                    <span>{qty}</span>
                                    <button onClick={() => setQty(qty + 1)}>+</button>
                                </div>
                            </div>

                            {deliveryMethod === 'delivery' && (
                                <div className="detail-field">
                                    <label>Delivery Area *</label>
                                    <p className="delivery-hint">
                                        We only deliver to selected Melbourne suburbs.
                                    </p>
                                    <select
                                        className="suburb-select"
                                        value={selectedSuburb}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setSelectedSuburb(val);
                                            try { localStorage.setItem('checkout_suburb', val); } catch { }
                                        }}
                                    >
                                        <option value="">Select your suburb...</option>
                                        {deliveryAreas.map((area) => (
                                            <option key={area} value={area}>{area}</option>
                                        ))}
                                    </select>
                                    <p className="delivery-hint">
                                        We recommend you pick up your order from our store to have a better experience and product quality.
                                    </p>
                                </div>
                            )}

                            <div className="detail-field">
                                <label>{deliveryMethod === 'delivery' ? 'Delivery Date' : 'Pickup Date'} *</label>
                                <input type="date" value={deliveryDate} onChange={(e) => { setDeliveryDate(e.target.value); setDateError(''); }} min={minDateStr} required />
                                {dateError && <span className="field-error">{dateError}</span>}
                            </div>

                            <div className="detail-field">
                                <label>Gift Message (optional)</label>
                                <textarea rows={3} value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} placeholder="Write a personal message..." maxLength={200} />
                                <span className="field-hint">{giftMessage.length}/200</span>
                            </div>
                        </div>

                        <button className="detail-add-btn" onClick={handleAdd}>
                            {added ? 'Added ✓' : 'Add to Cart'}
                        </button>
                        {product.description && (
                            <div className="detail-full-desc">
                                <h2>Description</h2>
                                <div dangerouslySetInnerHTML={{ __html: product.description }} />
                            </div>
                        )}
                    </div>
                </div>

                {recommended.length > 0 && (
                    <FadeInUp as="section" className="detail-recommended">
                        <h2 className="detail-rec-title">You May Also Like</h2>
                        <div className="product-grid">
                            {recommended.map((item, i) => (
                                <ProductCard key={item.id} product={item} animated delay={i * 0.08} />
                            ))}
                        </div>
                    </FadeInUp>
                )}
            </div>

            {/* 图片放大查看 */}
            {lightboxOpen && (
                <ImageLightbox
                    src={product.gallery?.length > 0 ? product.gallery[selectedImage] : product.image}
                    alt={product.name}
                    onClose={() => setLightboxOpen(false)}
                />
            )}

            {/* 商品评价 */}
            <div className="container">
                <ProductReviews productId={product.id} productName={product.name} orderId={reviewOrderId} />
            </div>
        </FadeInUp>
    );
}

export default ProductDetail;