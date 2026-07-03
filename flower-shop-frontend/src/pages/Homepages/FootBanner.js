/**
 * 首页底部行动号召横幅（CTA Banner）
 *
 * 在用户浏览完首页内容后，再次提醒"去购物"。
 * 包含标题、副标题、主按钮和三个辅助链接。
 * 背景和遮罩层由 CSS 控制。
 */

import React from 'react';
import { Link } from 'react-router-dom';
import FadeInUp from '../../components/FadeInUp';
import '../HomePageStyles/FootBanner.css';

function FootBanner() {
  return (
    <FadeInUp as="section" className="hero-banner">
      <div className="hero-overlay" />
      <div className="container hero-content">
        <h2 className="hero-heading">Need flowers for Melbourne delivery?</h2>
        <p className="hero-subtext">
          Choose from today's available flowers, browse our most loved bouquets, or plan something custom
          with Pisces Flower.
        </p>
        <Link to="/collections/available-today" className="hero-btn">SHOP AVAILABLE TODAY</Link>
        <div className="hero-links">
          <Link to="/collections/fresh-flowers">Fresh Flower Bouquets</Link>
          <Link to="/collections/dried-flowers">Dried &amp; Preserved Flowers</Link>
          <Link to="/contact">Custom Enquiry</Link>
        </div>
      </div>
    </FadeInUp>
  )
}

export default FootBanner;
