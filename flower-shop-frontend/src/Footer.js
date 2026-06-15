/**
 * 全站页脚组件
 *
 * 核心职责：在每页底部显示导航链接和信息
 *
 * 设计说明：
 *
 * 1. 【Link vs <a> 的区别】
 *    - react-router-dom 的 <Link>：SPA 内部跳转，不会刷新页面，状态保持
 *    - 原生 <a>：跳转到外部网站，会加载新页面
 *    页脚中：
 *    - 站内页面（About、Contact 等）用 <Link>
 *    - 外部链接（Instagram、WeChat）用 <a>，加 target="_blank" 新窗口打开
 *    - rel="noopener noreferrer" 是安全要求，防止新页面通过 window.opener 访问原页面
 *
 * 2. 【数据驱动渲染】
 *    Occasions 区域的链接不是手写固定的，而是从 occasions.js 数据文件
 *    中用 .map() 循环渲染。这样如果场合列表有增删，只需要修改数据文件，
 *    页面会自动更新。这是"数据驱动 UI"的思想。
 *
 * 3. 【4 列网格布局】
 *    Shop / Occasions / Pisces Flower / Useful Links 分成 4 列，
 *    每列包含一组相关链接。这种布局清晰且有层次感，用户能快速找到想要的信息。
 *
 * 4. 【版权信息】
 *    footer-bottom 区域展示版权年份和品牌名。
 *    年份直接写 2026，如果后续要自动更新，可以用 {new Date().getFullYear()}。
 */

import React from 'react';
import { Link } from 'react-router-dom';
import occasions from './components/Generic/occasions';
import './Footer.css';

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        {/* 第1列：商品分类链接 */}
        <div className="footer-col">
          <h4>Shop</h4>
          <Link to="/collections/available-today">Available Today</Link>
          <Link to="/collections/fresh-flowers">Fresh Flowers</Link>
          <Link to="/collections/dried-flowers">Dried Flowers</Link>
          <Link to="/collections/flower-box">Flower Box</Link>
          <Link to="/events">Wedding &amp; Events</Link>
          <Link to="/collections/available-today">All Flowers</Link>
        </div>

        {/* 第2列：按场合分类（数据驱动，从 occasions.js 循环渲染） */}
        <div className="footer-col">
          <h4>Occasions</h4>
          {occasions.map((item) => (
            <Link key={item.slug} to={item.link}>{item.title}</Link>
          ))}
        </div>

        {/* 第3列：品牌信息 + 外部社交链接 */}
        <div className="footer-col">
          <h4>Pisces Flower</h4>
          <Link to="/about">About Us</Link>
          <Link to="/delivery-areas">Delivery Areas</Link>
          <Link to="/prahran-florist">Prahran Florist</Link>
          <Link to="/contact">Contact</Link>
          {/* 外部链接用 <a> + target="_blank" 新窗口打开 */}
          <a href="https://instagram.com/piscesfloral" target="_blank" rel="noopener noreferrer">Instagram: piscesfloral</a>
          <a href="https://wechat.com" target="_blank" rel="noopener noreferrer">WeChat: Piscesflower</a>
          <Link to="/blogs">Blog</Link>
        </div>

        {/* 第4列：政策链接 */}
        <div className="footer-col">
          <h4>Useful Links</h4>
          <Link to="/policies/refund-policy">Return and Refund Policy</Link>
          <Link to="/policies/shipping-policy">Shipping Policy</Link>
          <Link to="/policies/privacy-policy">Privacy Policy</Link>
          <Link to="/policies/terms-of-services">Terms of Service</Link>
          <Link to="/policies/legal-notice">Legal Notice</Link>
        </div>
      </div>

      {/* 版权信息 */}
      <div className="footer-bottom">
        <div className="container">
          <p>&copy; 2026 Pisces Flower. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;