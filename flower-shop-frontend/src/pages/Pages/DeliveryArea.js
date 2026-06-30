/**
 * 配送区域页面（/delivery-areas）
 *
 * 核心职责：展示所有服务区域的导航链接
 * - 数据驱动渲染：从 Generic/Areas 导入地名列表，动态生成链接
 * - 每个地名自动转为 slug 指向 /delivery/:slug
 * - Prahran 单独作为一个特殊区域链接
 * - 与首页 DeliveryArea 组件共用同一份数据源，增删地名只需修改 Areas.js
 */

import React from 'react';
import { Link } from 'react-router-dom';
import FadeInUp from '../../components/FadeInUp';
import areas from '../../components/Areas';
import '../PageStyles/DeliveryAreaPage.css';

// 将地名转为 URL slug（如 "St Kilda" → "st-kilda"、"Melbourne CBD" → "melbourne-cbd"）
const toSlug = (name) => name.toLowerCase().replace(/\s+/g, '-');

function DeliveryArea() {
  return (
    <FadeInUp as="section" className="delivery-page">
      <div className="container">
        <h1 className="delivery-title">Service Areas</h1>
        <p className="delivery-desc">
          Pisces Flower delivers fresh flowers, dried flowers and flower boxes to homes,
          offices, hospitals and venues across Melbourne. We take pride in serving our
          local communities with the freshest, longest lasting flowers and luxury floral gifts.
        </p>
        <div className="delivery-list">
          {/* 特殊区域：Prahran 花店 */}
          <Link key="prahran" to="/prahran-florist">Florist Prahran</Link>
          {/* 从 Areas.js 动态生成配送区域链接 */}
          {areas.map((area) => (
            <Link key={area} to={`/delivery/${toSlug(area)}`}>
              Flower Delivery {area}
            </Link>
          ))}
        </div>
      </div>
    </FadeInUp>
  )
}

export default DeliveryArea;