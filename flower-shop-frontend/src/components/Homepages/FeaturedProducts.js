/**
 * 首页精选商品推荐区域
 *
 * 设计说明：
 * - 用两个 state（products + loading）而不是 products === null 来判断，
 *   因为需要区分"加载中"和"加载完毕但为空"两种状态
 * - .finally() 保证无论 API 成功或失败都关闭 loading，避免页面卡死
 * - fetchAllProducts 内部有双 API 降级：优先 WooCommerce API（含价格数据），
 *   不可用时自动回退到 WordPress API（仅有基本内容），保证页面不白屏
 * - mapProduct 将不同来源的原始数据统一为相同格式，组件只需处理一套结构
 * - 限制显示 8 个商品（4 列 × 2 行），视觉整齐且首页应给用户"精选"感而非海量列表
 * - CSS 中 nth-child(n+9) { display: none } 作为双重保险
 * - 整张卡片用 <Link> 包裹，SPA 客户端路由跳转不刷新页面，对 SEO 友好
 * - 价格三态显示：有促销价时划掉原价显示红色；仅有普通价直接显示；无价格时不渲染
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchAllProducts } from '../../api/products.js';
import Loading from '../Generic/Loading.js';
import '../../PageStyles/product.css';
import '../../HomePageStyles/FeaturedProducts.css';

const MAX_PRODUCTS = 8; // 4 列 × 2 行，首页仅展示 8 个精选商品

function FeaturedProducts() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true); // 与 products 分开，区分"加载中"和"空数据"

    useEffect(() => {
        fetchAllProducts(MAX_PRODUCTS)
            .then(setProducts)
            .finally(() => setLoading(false)); // 不论成功失败都要关闭 loading
    }, []);

    return (
        <motion.section
            className="category-section"
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
        >
            <div className="container">
                <h2 className="section-title">Today's Flower Picks for Delivery</h2>
                {loading ? (
                    <Loading />
                ) : (
                    <div className="product-grid">
                        {products.map((product, i) => (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.45, delay: i * 0.06, ease: 'easeOut' }}
                            >
                                <Link
                                    to={`/product/${product.nameSlug || product.slug}`}
                                    className="product-card"
                                >
                                    {product.image && (
                                        <img src={product.image} alt={product.name} className="product-image" />
                                    )}
                                    <span className="product-name">{product.name}</span>
                                    {product.price != null && product.price !== '' && (
                                        <span className="product-price">
                                            {product.sale_price ? (
                                                <>
                                                    <span className="regular-price">${product.regular_price}</span>
                                                    <span className="sale-price">${product.sale_price}</span>
                                                </>
                                            ) : (
                                                `$${product.price}`
                                            )}
                                        </span>
                                    )}
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
                <div className="view-all-wrapper">
                    <Link to="/collections/available-today" className="btn-view-all">View All</Link>
                </div>
            </div>
        </motion.section>
    );
};

export default FeaturedProducts;