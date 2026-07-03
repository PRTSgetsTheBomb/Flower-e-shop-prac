/**
 * 占位页面 - 用于"建设中"的内容页
 *
 * 核心职责：用一个组件处理多个"尚未开发"的路由，动态生成页面标题
 *
 * 设计说明：
 *
 * 1. 【一个组件处理多个路由】
 *    在 App.js 中，/about、/contact、/delivery-areas、/policies/:policy 等
 *    多个路由都指向 PlaceholderPage。如果为每个页面都写一个空壳组件，
 *    会重复很多相同的代码。共享一个组件是更高效的做法。
 *
 * 2. 【useLocation 获取当前路径】
 *    useLocation().pathname 返回当前 URL 的路径部分（如 /policies/refund-policy）。
 *    通过解析路径动态生成页面标题，让用户感觉每个页面都有"专属"标题。
 *
 * 3. 【路径解析逻辑】
 *    - 单段路径如 /about → segments = ["about"] → key = "about" → title = "About Us"
 *    - 多段路径如 /policies/refund-policy → segments = ["policies", "refund-policy"]
 *      → 优先检查第二个段是否有映射 → key = "refund-policy" → title = "Return and Refund Policy"
 *    - 如果映射表中找不到，自动将连字符替换为空格，首字母大写
 *      （如 "delivery-areas" → "Delivery Areas"）
 *
 * 4. 【行内样式的使用场景】
 *    这里的样式很简单（只有 padding、textAlign、minHeight 等几个属性），
 *    没有必要单独写一个 CSS 文件。行内样式适合这种"一次性"的简单布局，
 *    而独立的 CSS 文件更适合需要复用的复杂样式。
 *
 * 5. 【"建设中"页面的价值】
 *    在项目初期先用占位页占住路由，让用户知道"这个页面将来有内容"，
 *    而不是直接 404 或空白页。后续开发对应页面时，只需创建新组件
 *    并替换 App.js 中的 Route 指向即可。
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import FadeInUp from '../../components/FadeInUp';

// 所有占位页面的标题映射表
const titles = {
  contact: 'Contact Us',
  account: 'My Account',
  cart: 'Shopping Cart',
  about: 'About Us',
  'delivery-areas': 'Delivery Areas',
  'prahran-florist': 'Prahran Florist',
  'refund-policy': 'Return and Refund Policy',
  'shipping-policy': 'Shipping Policy',
  'privacy-policy': 'Privacy Policy',
  'terms-of-services': 'Terms of Service',
  'legal-notice': 'Legal Notice',
};

function PlaceholderPage() {
  const { pathname } = useLocation();
  // 将 /policies/refund-policy 拆成 ["policies", "refund-policy"]
  const segments = pathname.replace(/^\//, '').split('/');
  // 如果是 /policies/xxx 这类二级路径，取第二段作为 key
  const key = segments.length > 1 && titles[segments[1]] ? segments[1] : segments[0];
  // 从映射表查找标题，找不到则自动转换：delivery-areas → Delivery Areas
  const title = titles[key] || key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <FadeInUp style={{ padding: '80px 0', textAlign: 'center', minHeight: '300px' }}>
      <div className="container">
        <h1 style={{ fontSize: '2em', marginBottom: '16px', color: '#222' }}>{title}</h1>
        <p style={{ color: '#999' }}>This page might not exist in this website, please check.</p>
      </div>
    </FadeInUp>
  )
}

export default PlaceholderPage;
