/**
 * 配送区域详情页（/delivery/:slug, /prahran-florist）
 *
 * 核心职责：根据 URL 中的区名动态生成配送区域介绍 + 推荐商品
 *
 * 设计说明：
 * - slugToLocation() 将 URL slug 转为可读的地区名（如 "armadale" → "Armadale"）
 * - 同时处理两种路由模式：/delivery/armadale 和 /prahran-florist
 * - 推荐商品区域复用 fetchAllProducts 和 product-card 样式
 * - 地区描述文本为动态生成，包含地区名
 */

import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import FadeInUp from '../Generic/FadeInUp';
import { fetchAllProducts } from '../../api/products';
import Loading from '../Generic/Loading';
import ProductCard from '../Generic/ProductCard';
import '../../PageStyles/DeliveryPage.css';

// 将 URL slug 转为可读的地名（如 "south-yarra" → "South Yarra"，"cbd" → "CBD"）
function slugToLocation(slug) {
  return slug
    .split('-')
    .map((word) => {
      if (word === 'cbd') return 'CBD';   // 特殊处理缩写
      if (word === 'st') return 'St';      // 保持 "St" 格式
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function DeliveryPage() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);
  // 兼容两种路由模式：
  // /delivery/armadale → segments = ["delivery", "armadale"] → 取 segments[1]
  // /prahran-florist   → segments = ["prahran-florist"]    → 去掉 "-florist" 后缀
  const slug = segments[0] === 'delivery' ? segments[1] : segments[0].replace(/-florist$/, '');
  const locationName = slugToLocation(slug);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchAllProducts(8)
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  const desc = `Pisces Flowers offers reliable same day flower delivery to ${locationName}. We take pride in delivering the freshest, longest lasting flowers and luxury floral gifts straight to your door.`;

  return (
    <FadeInUp as="section" className="delivery-page">
      <div className="container">
        <div className="delivery-hero">
          <h1>Florist {locationName} &mdash; Same Day Flower Delivery</h1>
          <p>{desc}</p>
        </div>

        {loading ? (
          <Loading />
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
        {!loading && (
          <div className="view-all-wrapper">
            <Link to="/collections/available-today" className="btn-view-all">View All</Link>
          </div>
        )}
      </div>
    </FadeInUp>
  )
}

export default DeliveryPage;
