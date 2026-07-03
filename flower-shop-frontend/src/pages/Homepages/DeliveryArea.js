/**
 * 首页配送区域展示
 *
 * 从 Areas.js 数据文件导入 11 个 Melbourne 郊区名称，
 * 循环生成按钮样式的链接，点击跳转到对应配送区域详情页。
 * 底部提供"View all delivery areas"入口。
 */

import React from 'react';
import { Link } from 'react-router-dom';
import '../HomePageStyles/DeliveryArea.css';
import areas from '../../components/Areas'
import FadeInUp from '../../components/FadeInUp'

function DeliveryArea() {
  return (
    <FadeInUp as="section" className="delivery-section">
      <div className="container">
        <h2 className="delivery-title">Flower Delivery Across Melbourne</h2>
        <p className="delivery-desc">
          We deliver fresh flowers, dried flowers and flower boxes to homes, offices, hospitals and
          venues across Melbourne, including these suburbs:
        </p>
        <div className="delivery-grid">
          {areas.map((area) => (
            <Link key={area.name} to={`/delivery/${area.name.toLowerCase().replace(/\s+/g, '-')}`} className="delivery-btn">
              {area.name}
            </Link>
          ))}
        </div>
        <div className="delivery-footer">
          <Link to="/delivery-areas" className="delivery-link">View all delivery areas</Link>
        </div>
      </div>
        </FadeInUp>
    );
}

export default DeliveryArea;