/**
 * 购物车上下文 - CartContext
 *
 * 核心概念：用 useReducer 代替 useState 管理购物车状态
 *
 * 【为什么用 useReducer 而不是 useState？】
 * 购物车的状态操作涉及多种 action（增/删/改/清空），且每个 action 都需要基于
 * 当前 state 计算新 state。useReducer 将"状态变更逻辑"集中到 reducer 函数中，
 * 比多个 useState + 回调函数更清晰、可维护。
 *
 * 【Context 的工作流程】
 * createContext() → 创建上下文容器
 * CartProvider → 用 .Provider 包裹子组件，注入共享值
 * useCart() → 子组件通过 useContext 获取共享值
 * 这避免了"props 层层传递"的问题（prop drilling）。
 *
 * 【Reducer 中的不可变更新】
 * React 要求 state 更新必须是不可变的（immutable）：
 * - ADD: 用 ... 展开旧数组创建新数组
 * - REMOVE: 用 filter 返回新数组（不修改原数组）
 * - UPDATE_QTY: 用 map 替换目标项（不直接修改 item.qty）
 * 直接修改 state（如 state[0].qty = 5）不会触发重新渲染。
 *
 * 【派生状态】
 * totalItems 和 totalPrice 不是单独存储的 state，而是每次渲染时通过
 * reduce 重新计算的。这避免了手动维护它们的同步问题——如果独立存储，
 * 当增删商品时还要记得更新 totalItems，容易产生 bug。
 *
 * 【parseFloat 的用途】
 * API 返回的价格是字符串（如 "19.99"），直接用 `*` 运算会隐式转换，
 * 但用 parseFloat 显式转换更安全，避免意外拼接成字符串。
 */

import React, { createContext, useContext, useReducer, useState, useCallback } from 'react';

const CartContext = createContext();

// ---- Reducer：集中管理所有购物车状态变更 ----
function cartReducer(state, action) {
  switch (action.type) {
    // 添加商品：如果已存在且配送方式一致则数量 +1，否则新增条目
    case 'ADD': {
      const exist = state.find((item) =>
        item.id === action.product.id && item.deliveryMethod === action.product.deliveryMethod
      );
      if (exist) {
        // 不可变更新：用 map 找到目标项，用 ... 展开后修改 qty
        return state.map((item) =>
          item.id === action.product.id ? { ...item, qty: item.qty + (action.product.qty || 1) } : item
        );
      }
      // 新商品：添加到数组末尾，设置数量（默认 1）
      return [...state, { ...action.product, qty: action.product.qty || 1 }];
    }
    // 移除商品：用 filter 排除目标 id
    case 'REMOVE':
      return state.filter((item) => item.id !== action.id);
    // 修改数量：Math.max(1, qty) 保证数量至少为 1，不允许负数和 0
    case 'UPDATE_QTY':
      return state.map((item) =>
        item.id === action.id ? { ...item, qty: Math.max(1, action.qty) } : item
      );
    // 清空购物车
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

function loadCart() {
  try {
    const saved = localStorage.getItem('cart_items');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem('cart_items', JSON.stringify(cart));
}

export function CartProvider({ children }) {
  // useReducer(reducer, 初始值) → 从 localStorage 恢复
  const [cart, dispatch] = useReducer(cartReducer, null, loadCart);

  // 每次 cart 变化时持久化到 localStorage
  const prevCartRef = React.useRef(cart);
  React.useEffect(() => {
    if (prevCartRef.current !== cart) {
      saveCart(cart);
      prevCartRef.current = cart;
    }
  }, [cart]);

  // Toast 通知
  const [toast, setToast] = useState(null);
  const toastTimer = React.useRef(null);

  const showToast = useCallback((message) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  // 将 dispatch 封装成语义化的函数，外部组件不需要知道 action.type 的细节
  const addToCart = useCallback((product) => {
    dispatch({ type: 'ADD', product });
    showToast(`${product.name} added to cart`);
  }, [showToast]);
  const removeFromCart = (id) => dispatch({ type: 'REMOVE', id });
  const updateQty = (id, qty) => dispatch({ type: 'UPDATE_QTY', id, qty });
  const clearCart = () => dispatch({ type: 'CLEAR' });

  // 派生状态：每次渲染根据当前购物车数据重新计算
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.qty * (parseFloat(item.sale_price) || parseFloat(item.price) || 0), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQty, clearCart, totalItems, totalPrice, toast, hideToast }}>
      {children}
      {/* Toast 弹窗由 CartToast 组件渲染，放在 children 之后以覆盖在最上层 */}
    </CartContext.Provider>
  );
}

// 自定义 Hook：让子组件更方便地获取购物车上下文
export function useCart() {
  return useContext(CartContext);
}
