/**
 * 加入购物车 Toast 通知弹窗
 *
 * 浮在页面右上角，显示商品已加入购物车，带渐入渐出动画。
 * 点击 "View Cart" 跳转到购物车页，点击 ✕ 或 2.8 秒后自动关闭。
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import '../../PageStyles/CartToast.css';

export default function CartToast() {
  const { toast, hideToast } = useCart();

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          className="cart-toast"
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 60 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div className="cart-toast-body">
            <span className="cart-toast-icon">✓</span>
            <div className="cart-toast-text">
              <strong>{toast}</strong>
            </div>
          </div>
          <div className="cart-toast-actions">
            <Link to="/cart" className="cart-toast-link" onClick={hideToast}>View Cart</Link>
            <button className="cart-toast-close" onClick={hideToast}>✕</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
