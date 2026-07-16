/**
 * Product Detail Page (/product/:slug)
 *
 * Displays a single product with full details, quantity selector,
 * delivery/pickup options, date picker, gift message, and special instructions.
 * Supports adding to cart with instant feedback.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import FadeInUp from '../common/FadeInUp';
import ImageLightbox from './ImageLightbox';
import ProductReviews from './ProductReviews';
import { fetchProductBySlug, fetchAllProducts } from '../../api/products';
import { useCart } from '../../context/CartContext';
import deliveryAreas, { getShippingBySuburb, getShippingBySuburbAsync } from '../common/Areas';
import Loading from '../common/Loading';
import ProductCard from '../common/ProductCard';
import '../../styles/ProductDetail.css';

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
    const [deliveryNote, setDeliveryNote] = useState('');
    const [dateError, setDateError] = useState('');

    // 郊区选择模式：select（下拉）| custom（手动输入）
    const [suburbMode, setSuburbMode] = useState(() => {
        const saved = (() => { try { return localStorage.getItem('checkout_suburb') || ''; } catch { return ''; } })();
        return saved && !deliveryAreas.some(a => a.name === saved) ? 'custom' : 'select';
    });
    const [suburbInput, setSuburbInput] = useState(() => {
        try { return localStorage.getItem('checkout_suburb') || ''; }
        catch { return ''; }
    });
    const [suburbResult, setSuburbResult] = useState(null); // { valid, name, fee, distance } | 'loading'
    const suburbTimerRef = useRef(null);

    // 防抖查询郊区（500ms 无输入后触发）
    useEffect(() => {
        if (suburbMode !== 'custom') return;
        const trimmed = suburbInput.trim();
        if (!trimmed) { setSuburbResult(null); return; }
        if (suburbTimerRef.current) clearTimeout(suburbTimerRef.current);
        suburbTimerRef.current = setTimeout(async () => {
            setSuburbResult('loading');
            const result = await getShippingBySuburbAsync(trimmed);
            if (result.fee !== null) {
                setSuburbResult({ valid: true, name: trimmed, fee: result.fee, distance: result.distance });
                setSelectedSuburb(trimmed);
                try { localStorage.setItem('checkout_suburb', trimmed); } catch { }
            } else {
                setSuburbResult({ valid: false, name: trimmed });
            }
        }, 500);
        return () => { if (suburbTimerRef.current) clearTimeout(suburbTimerRef.current); };
    }, [suburbInput, suburbMode]);

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
        addToCart({ ...product, qty, deliveryMethod, deliveryDate, giftMessage, deliveryNote });
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
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
                                    <button onClick={() => setQty(Math.max(1, qty - 1))}>-</button>
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

                                    {suburbMode === 'select' ? (
                                        <>
                                            <select
                                                className="suburb-select"
                                                value={selectedSuburb}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setSelectedSuburb(val);
                                                    setSuburbInput(val);
                                                    try { localStorage.setItem('checkout_suburb', val); } catch { }
                                                }}
                                            >
                                                <option value="">Select your suburb...</option>
                                                {deliveryAreas.map((area) => (
                                                    <option key={area.name} value={area.name}>{area.name}</option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                className="suburb-mode-toggle"
                                                onClick={() => setSuburbMode('custom')}
                                            >
                                                Or enter manually
                                            </button>
                                        </>
                                    ) : (
                                        <div className="suburb-input-wrap">
                                            <input
                                                type="text"
                                                className="suburb-text-input"
                                                placeholder="Type your suburb name..."
                                                value={suburbInput}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setSuburbInput(val);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        e.target.blur();
                                                    }
                                                }}
                                            />
                                            {suburbResult === 'loading' && (
                                                <span className="suburb-checking">⏳ Checking delivery availability...</span>
                                            )}
                                            {suburbResult && suburbResult !== 'loading' && suburbResult.valid && (
                                                <span className="suburb-valid">✓ Delivers to {suburbResult.name} — ${suburbResult.fee.toFixed(2)} ({suburbResult.distance}km)</span>
                                            )}
                                            {suburbResult && suburbResult !== 'loading' && !suburbResult.valid && (
                                                <span className="suburb-invalid">✗ Not in delivery area — consider Pickup</span>
                                            )}
                                            <button
                                                type="button"
                                                className="suburb-mode-toggle"
                                                onClick={() => { setSuburbMode('select'); setSuburbResult(null); }}
                                            >
                                                Back to list
                                            </button>
                                        </div>
                                    )}
                                    <p className="delivery-hint">
                                        We recommend you pick up your order from our store to have a better experience and product quality.
                                    </p>
                                </div>
                            )}

                            <div className="detail-field">
                                <label>{deliveryMethod === 'delivery' ? 'Delivery Date' : 'Pickup Date'} *</label>
                                <input type="date" value={deliveryDate} onChange={(e) => { setDeliveryDate(e.target.value); setDateError(''); }} min={minDateStr} required />
                                {dateError && <span className="field-error">{dateError}</span>}
                                <p className="delivery-hint">
                                    The final delivery / pickup date can be delayed for any reason, we will try our best to deliver your order on time.
                                </p>
                            </div>

                            <div className="detail-field">
                                <label>Gift Message (optional)</label>
                                <textarea rows={3} value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} placeholder="Write a personal message..." maxLength={200} />
                                <span className="field-hint">{giftMessage.length}/200</span>
                            </div>

                            <div className="detail-field">
                                <label>Special Instructions (optional)</label>
                                <textarea rows={2} value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} placeholder="E.g. Urgent delivery, leave at reception, call before arriving..." maxLength={150} />
                                <span className="field-hint">{deliveryNote.length}/150</span>
                            </div>
                        </div>

                        <button className="detail-add-btn" onClick={handleAdd}>
                            {added ? 'Added √' : 'Add to Cart'}
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