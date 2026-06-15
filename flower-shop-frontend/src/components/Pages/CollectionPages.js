/**
 * 分类商品列表页（/collections/:slug）
 *
 * 核心职责：根据 URL 中的分类标识展示对应的商品列表
 *
 * 设计说明：
 *
 * 1. 【useParams 获取分类标识】
 *    :slug 从 URL 中获取，如 /collections/dried-flowers 的 slug 是 "dried-flowers"。
 *    这个值决定调用哪个 API（全部商品 vs 按分类查询）和页面标题。
 *
 * 2. 【有条件的数据获取】
 *    如果 slug === 'available-today'，调用 fetchAllProducts(100) 获取所有商品。
 *    否则调用 fetchProductsByCategory(slug) 获取特定分类的商品。
 *    这种根据 URL 改变请求逻辑的模式在电商网站中很常见。
 *
 * 3. 【useEffect 依赖 [slug]】
 *    当用户在分类间切换时（如从 /collections/fresh-flowers 到 dried-flowers），
 *    slug 变化触发 useEffect 重新执行，自动请求新分类的数据。
 *    如果依赖数组是 []，则只在组件挂载时请求一次，切换分类不会刷新数据。
 *
 * 4. 【Promise.resolve 的作用】
 *    fetchAllProducts 和 fetchProductsByCategory 都是 async 函数（返回 Promise），
 *    用 Promise.resolve(fetch).then() 确保无论 fetch 是 Promise 还是普通值，
 *    都能统一用 .then() 处理。这里主要为了类型一致性。
 *
 * 5. 【useMemo 动态生成标题】
 *    useMemo 缓存计算结果，只有 [slug] 变化时才重新计算。
 *    标题生成逻辑：
 *    - 先从内置映射表查找（available-today → "Available Today"）
 *    - 再从 occasions 数据中查找（如 anniversary-flowers → "Anniversary Flowers"）
 *    - 都找不到则用 slug 做文字处理：dried-flowers → "Dried Flowers"
 *
 * 6. 【商品卡片与首页共享 CSS】
 *    本组件和 FeaturedProducts 渲染几乎相同的商品卡片结构，
 *    共享 ../../styles/product.css 中的 .product-card / .product-image 等样式，
 *    避免重复写样式代码。
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import FadeInUp from '../Generic/FadeInUp';
import { fetchAllProducts, fetchProductsByCategory } from '../../api/products';
import occasions from '../Generic/occasions';
import '../../PageStyles/product.css';
import '../../PageStyles/CollectionPages.css';
import Loading from '../Generic/Loading';

const PER_PAGE = 16;

// 辅助：取商品有效价格（sale_price 优先）
function getEffectivePrice(product) {
    if (product.sale_price) return Number(product.sale_price);
    if (product.price) return Number(product.price);
    return null;
}

// 排序选项
const SORT_OPTIONS = [
    { value: 'featured', label: 'Featured' },
    { value: 'az', label: 'Alphabetically, A–Z' },
    { value: 'za', label: 'Alphabetically, Z–A' },
    { value: 'price-asc', label: 'Price, low to high' },
    { value: 'price-desc', label: 'Price, high to low' },
    { value: 'date-asc', label: 'Date, old to new' },
    { value: 'date-desc', label: 'Date, new to old' },
];

function CollectionPages() {
    const { slug } = useParams();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);

    // --- 筛选状态 ---
    const [showFilters, setShowFilters] = useState(false);
    const [inStockOnly, setInStockOnly] = useState(false);
    const [priceMin, setPriceMin] = useState('');
    const [priceMax, setPriceMax] = useState('');

    // --- 排序状态 ---
    const [sortBy, setSortBy] = useState('featured');

    useEffect(() => {
        setLoading(true);
        setPage(1);
        // 切换分类时重置筛选与排序
        setInStockOnly(false);
        setPriceMin('');
        setPriceMax('');
        setSortBy('featured');
        const fetch = slug === 'available-today'
            ? fetchAllProducts(100)
            : fetchProductsByCategory(slug);
        Promise.resolve(fetch)
            .then(setProducts)
            .finally(() => setLoading(false));
    }, [slug]);

    // --- 排序 + 筛选逻辑 ---
    const filtered = useMemo(() => {
        let list = [...products];

        // 库存筛选
        if (inStockOnly) {
            list = list.filter((p) => p.stock_status === 'instock');
        }

        // 价格范围筛选
        const min = priceMin === '' ? null : Number(priceMin);
        const max = priceMax === '' ? null : Number(priceMax);

        if (min !== null || max !== null) {
            list = list.filter((p) => {
                const price = getEffectivePrice(p);
                if (price === null) return false;
                if (min !== null && price < min) return false;
                if (max !== null && price > max) return false;
                return true;
            });
        }

        // 排序（featured 保持 API 原始顺序）
        switch (sortBy) {
            case 'az':
                list.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'za':
                list.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'price-asc':
                list.sort((a, b) => {
                    const pa = getEffectivePrice(a) ?? Infinity;
                    const pb = getEffectivePrice(b) ?? Infinity;
                    return pa - pb;
                });
                break;
            case 'price-desc':
                list.sort((a, b) => {
                    const pa = getEffectivePrice(a) ?? -Infinity;
                    const pb = getEffectivePrice(b) ?? -Infinity;
                    return pb - pa;
                });
                break;
            case 'date-asc':
                list.sort((a, b) => new Date(a.date_created) - new Date(b.date_created));
                break;
            case 'date-desc':
                list.sort((a, b) => new Date(b.date_created) - new Date(a.date_created));
                break;
            default: // 'featured' — 不排序，保持 API 默认顺序
                break;
        }

        return list;
    }, [products, inStockOnly, priceMin, priceMax, sortBy]);

    const totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const title = useMemo(() => {
        const map = {
            'available-today': 'Available Today',
            'fresh-flowers': 'Fresh Flowers',
            'dried-flowers': 'Dried Flowers',
            'flower-box': 'Flower Box',
            'wedding-flowers': 'Wedding & Events',
            ...Object.fromEntries(occasions.map((o) => [o.slug, o.title])),
        };
        return map[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }, [slug]);

    return (
        <FadeInUp as="section" className="category-page">
            <div className="container">
                <div className="category-header">
                    <h2 className="section-title">{title}</h2>
                    <div className="header-controls">
                        <select
                            className="sort-select"
                            value={sortBy}
                            onChange={(e) => { setPage(1); setSortBy(e.target.value); }}
                        >
                            {SORT_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <button
                            className={`filter-toggle${showFilters ? ' active' : ''}`}
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            Filters <span className="filter-arrow">▼</span>
                        </button>
                    </div>
                </div>

                {/* --- 筛选面板 --- */}
                {showFilters && (
                    <div className="filter-bar">
                        <div className="filter-group">
                            <label className="filter-checkbox">
                                <input
                                    type="checkbox"
                                    checked={inStockOnly}
                                    onChange={(e) => { setPage(1); setInStockOnly(e.target.checked); }}
                                />
                                In stock only
                            </label>
                        </div>
                        <div className="filter-group">
                            <label className="filter-label">Price</label>
                            <div className="price-range">
                                <input
                                    type="number"
                                    className="price-input"
                                    placeholder="Min"
                                    value={priceMin}
                                    onChange={(e) => { setPage(1); setPriceMin(e.target.value); }}
                                    min="0"
                                />
                                <span className="price-sep">—</span>
                                <input
                                    type="number"
                                    className="price-input"
                                    placeholder="Max"
                                    value={priceMax}
                                    onChange={(e) => { setPage(1); setPriceMax(e.target.value); }}
                                    min="0"
                                />
                            </div>
                        </div>
                        {(inStockOnly || priceMin !== '' || priceMax !== '') && (
                            <button className="filter-clear" onClick={() => {
                                setInStockOnly(false);
                                setPriceMin('');
                                setPriceMax('');
                                setPage(1);
                            }}>
                                Clear all
                            </button>
                        )}
                    </div>
                )}

                {loading ? (
                    <Loading />
                ) : filtered.length === 0 ? (
                    <p className="empty-text">No products found.</p>
                ) : (
                    <>
                        <p className="results-count">{filtered.length} product{filtered.length > 1 ? 's' : ''}</p>
                        <div className="product-grid">
                            {paginated.map((product, i) => (
                                <motion.div
                                    key={product.id}
                                    initial={{ opacity: 0, y: 40 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.45, delay: i * 0.04, ease: 'easeOut' }}
                                >
                                    <Link
                                        to={`/product/${product.nameSlug || product.slug}`}
                                        className="product-card"
                                    >
                                        {product.image && (
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                className="product-image"
                                            />
                                        )}
                                        <h3 className="product-name">{product.name}</h3>
                                        {product.price != null && product.price !== '' && (
                                            <p className="product-price">
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
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                        {filtered.length > 0 && (
                            <div className="pagination">
                                <button className="page-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>←</button>
                                {Array.from({ length: totalPages }, (_, i) => (
                                    <button key={i + 1} className={`page-btn${page === i + 1 ? ' active' : ''}`} onClick={() => setPage(i + 1)}>
                                        {i + 1}
                                    </button>
                                ))}
                                <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>→</button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </FadeInUp>
    );
}

export default CollectionPages;
