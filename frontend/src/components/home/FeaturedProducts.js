/**
 * 首页精选商品推荐区�?
 *
 * 设计说明�?
 * - 用两�?state（products + loading）而不�?products === null 来判断，
 *   因为需要区�?加载�?�?加载完毕但为�?两种状�?
 * - .finally() 保证无论 API 成功或失败都关闭 loading，避免页面卡�?
 * - fetchAllProducts 内部有双 API 降级：优�?WooCommerce API（含价格数据），
 *   不可用时自动回退�?WordPress API（仅有基本内容），保证页面不白屏
 * - mapProduct 将不同来源的原始数据统一为相同格式，组件只需处理一套结�?
 * - 限制显示 8 个商品（4 �?× 2 行），视觉整齐且首页应给用户"精�?感而非海量列表
 * - CSS �?nth-child(n+9) { display: none } 作为双重保险
 * - 整张卡片�?<Link> 包裹，SPA 客户端路由跳转不刷新页面，对 SEO 友好
 * - 价格三态显示：有促销价时划掉原价显示红色；仅有普通价直接显示；无价格时不渲染
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchAllProducts } from '../../api/products.js';
import Loading from '../common/Loading.js';
import ProductCard from '../common/ProductCard';
import '../../styles/product.css';
import '../../styles/FeaturedProducts.css';

const MAX_PRODUCTS = 8; // 4 �?× 2 行，首页仅展�?8 个精选商�?

function FeaturedProducts() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true); // �?products 分开，区�?加载�?�?空数�?

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
                            <ProductCard key={product.id} product={product} animated delay={i * 0.06} />
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