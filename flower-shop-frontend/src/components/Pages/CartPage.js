/**
 * 购物车页面（/cart）
 *
 * 核心职责：展示购物车内的商品列表，支持数量修改和删除
 *
 * 设计说明：
 *
 * 1. 【条件渲染：空购物车 vs 有商品】
 *    用 if (cart.length === 0) 提前 return 空状态 UI，
 *    避免在有商品的情况下还要做"是否为空"的冗余判断。
 *    两种状态的 UI 差异很大，分开写比一个大三元表达式更清晰。
 *
 * 2. 【使用 useCart() 消费 Context】
 *    useCart() 从 CartContext 中解构出 cart 数据和操作方法。
 *    这里不需要关心数据从哪来、怎么存，只管"用"就行。
 *    这就是 Context 将"数据管理"和"数据消费"解耦的好处。
 *
 * 3. 【数量加减：disabled 防越界】
 *    disabled={item.qty <= 1}：数量为 1 时禁用减号按钮。
 *    因为 UPDATE_QTY 有 Math.max(1, qty) 保护，即使按钮没被禁用，
 *    数量也不会减到 0 以下。但禁用按钮提供了更好的用户体验（视觉反馈）。
 *
 * 4. 【价格格式化：toFixed(2)】
 *    所有价格用 .toFixed(2) 确保显示两位小数，避免显示 $19.9 或 $19.999。
 *    parseFloat 是因为 API 返回的价格可能是字符串类型。
 *
 * 5. 【商品名称为 Link】
 *    点击商品名称可跳转到商品详情页 /product/:slug，
 *    方便用户在结账前查看商品详情。
 *
 * 6. 【行小计 vs 总计】
 *    每个商品行单独计算小计（单价 × 数量），
 *    底部总计使用 CartContext 中计算好的 totalPrice，
 *    两者计算结果应该一致（一个在前端算，一个在 Context 算）。
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import FadeInUp from '../Generic/FadeInUp';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { fetchAllProducts } from '../../api/products';
import '../../PageStyles/product.css';
import '../../PageStyles/CartPage.css';

function CartPage() {
  // 从 CartContext 解构出购物车数据和操作方法
  const { cart, removeFromCart, updateQty, clearCart, totalPrice } = useCart();
  const { user } = useAuth();

  // 推荐商品
  const [recommended, setRecommended] = useState([]);
  useEffect(() => {
    const cartIds = new Set(cart.map((item) => item.id));
    fetchAllProducts(12).then((all) =>
      setRecommended(all.filter((p) => !cartIds.has(p.id)).slice(0, 4))
    );
  }, [cart.length]);

  // ---- 空购物车状态 ----
  if (cart.length === 0) {
    return (
      <FadeInUp as="section" className="cart-page">
        <div className="container">
          <h1 className="cart-title">Shopping Cart</h1>
          <p className="cart-empty">Your cart is empty.</p>
          <div className="cart-continue">
            <Link to="/collections/available-today" className="btn-primary">Continue Shopping</Link>
          </div>
        </div>
      </FadeInUp>
    );
  }

  // ---- 有商品状态 ----
  return (
    <FadeInUp as="section" className="cart-page">
      <div className="container">
        <h1 className="cart-title">Shopping Cart</h1>

        {/* 商品列表 */}
        <div className="cart-items">
          {cart.map((item) => (
            <div key={item.id} className="cart-item">
              {/* 商品图片（可选） */}
              {item.image && <img src={item.image} alt={item.name} className="cart-item-image" />}

              {/* 商品信息：名称 + 单价 + 配送日期 */}
              <div className="cart-item-info">
                <Link to={`/product/${item.nameSlug || item.slug}`} className="cart-item-name">{item.name}</Link>
                <p className="cart-item-price">
                  ${(parseFloat(item.sale_price) || parseFloat(item.price) || 0).toFixed(2)}
                </p>
                {item.deliveryDate && (
                  <p className="cart-item-date">Pickup/Delivery: {item.deliveryDate}</p>
                )}
              </div>

              {/* 数量选择器：减号 / 数字 / 加号 */}
              <div className="cart-item-qty">
                <button onClick={() => updateQty(item.id, item.qty - 1)} disabled={item.qty <= 1}>−</button>
                <span>{item.qty}</span>
                <button onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
              </div>

              {/* 行小计 */}
              <p className="cart-item-total">${((parseFloat(item.sale_price) || parseFloat(item.price) || 0) * item.qty).toFixed(2)}</p>

              {/* 删除按钮 */}
              <button className="cart-item-remove" onClick={() => removeFromCart(item.id)}>✕</button>
            </div>
          ))}
        </div>

        {/* 底部操作栏：清空 / 总计 / 结算 */}
        <div className="cart-footer">
          <button className="btn-clear" onClick={clearCart}>Clear Cart</button>
          <div className="cart-total">
            <span>Total</span>
            <strong>${totalPrice.toFixed(2)}</strong>
          </div>
          {user ? (<Link to="/checkout" className="btn-checkout">Checkout</Link>
          ) : (
            <Link to='/account'
              state={{ from: '/checkout' }}
              className="btn-checkout"
            >
              Login to Checkout
            </Link>
          )}
        </div>

        {/* 推荐商品 */}
        {recommended.length > 0 && (
          <section className="cart-recommended">
            <h2 className="cart-rec-title">You May Also Like</h2>
            <div className="product-grid">
              {recommended.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.08, ease: 'easeOut' }}
                >
                  <Link to={`/product/${item.nameSlug || item.slug}`} className="product-card">
                    {item.image && (
                      <img src={item.image} alt={item.name} className="product-image" />
                    )}
                    <span className="product-name">{item.name}</span>
                    {item.price != null && item.price !== '' && (
                      <span className="product-price">
                        {item.sale_price ? (
                          <>
                            <span className="regular-price">${item.regular_price}</span>
                            <span className="sale-price">${item.sale_price}</span>
                          </>
                        ) : (
                          `$${item.price}`
                        )}
                      </span>
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>
    </FadeInUp>
  );
}

export default CartPage;
