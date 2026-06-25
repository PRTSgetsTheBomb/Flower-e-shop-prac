/**
 * 商品卡片组件
 *
 * 统一渲染商品卡片（图片 + 名称 + 价格），包裹在 Link 中跳转商品详情。
 * 可选 animated 属性控制 framer-motion 入场动画。
 *
 * 替代 FeaturedProducts / SearchPage / CollectionPages / DeliveryPage / ProductDetail
 * 中反复书写的 ~25 行重复 JSX。
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import PriceDisplay from './PriceDisplay';

export default function ProductCard({ product, animated = false, delay = 0 }) {
  const cardContent = (
    <Link to={`/product/${product.nameSlug || product.slug}`} className="product-card">
      {product.image && (
        <img src={product.image} alt={product.name} className="product-image" />
      )}
      <span className="product-name">{product.name}</span>
      <PriceDisplay
        price={product.price}
        regular_price={product.regular_price}
        sale_price={product.sale_price}
      />
    </Link>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45, delay, ease: 'easeOut' }}
      >
        {cardContent}
      </motion.div>
    );
  }

  return <React.Fragment key={product.id}>{cardContent}</React.Fragment>;
}
