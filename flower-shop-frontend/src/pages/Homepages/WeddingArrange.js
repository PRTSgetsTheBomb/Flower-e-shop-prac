/**
 * 婚礼与企业花艺
 *
 * 两栏布局：左侧婚礼花艺介绍 + 右侧企业活动介绍。
 * 含配图和各自的行动号召链接。
 */

import React from 'react';
import { Link } from 'react-router-dom';
import FadeInUp from '../../components/FadeInUp';
import '../HomePageStyles/WeddingArrange.css';

function WeddingArrange() {
  return (
    <FadeInUp as="section" className="wedding-section">
      <div className="container wedding-grid">
        <div className="wedding-text">
          <h2>Wedding Bouquets &amp; Arrangements</h2>
          <p>
            Custom bridal bouquets, ceremony flowers and event arrangements for intimate celebrations,
            larger venues and corporate occasions.
          </p>
          <Link to="/events" className="wedding-btn">LEARN MORE</Link>
        </div>
        <div className="wedding-image">
          <img
            src="https://piscesflower.com.au/cdn/shop/files/wedding-bouquets.jpg?v=1646625502&width=900"
            alt="Wedding bouquets"
          />
        </div>
        <div className="wedding-text">
          <h2>Corporate Events</h2>
          <p>
            Reception flowers, lunch styling, office arrangements and custom floral pieces.
          </p>
          <Link to="/contact" className="wedding-link">Enquire for corporate flowers</Link>
        </div>
      </div>
    </FadeInUp>
  )
}

export default WeddingArrange;