/**
 * 关于花艺介绍
 *
 * 双卡片布局：左侧介绍干花，右侧介绍鲜花。
 * 纯文字内容，无交互逻辑。
 */

import React from 'react';
import FadeInUp from '../../components/FadeInUp';
import '../HomePageStyles/AboutArrange.css';

function AboutArrange() {
    return (
        <FadeInUp as="section" className="arrange-section">
            <div className="container arrange-grid">
                <div className="arrange-card">
                    <h1>Dried Flowers &amp; Arrangements</h1>
                    <p>
                        Are you looking for flower delivery in Melbourne
                        Pisces Flower offers high-quality <strong>dried flowers</strong> and <strong>fresh flower arrangements</strong> to customers across Melbourne and surrounding suburbs?
                        Dried flowers have become a favourite for art lovers and people who love sustainable products.
                        We handpick our dried flowers with extra care and create arrangements that last beautifully,
                        brighten quiet corners of the home, and arrive at the recipient's door on time.
                    </p>
                </div>
                <div className="arrange-card">
                    <h1>Fresh Flower Bouquets &amp; Arrangements</h1>
                    <p>
                        Our <strong>fresh flower bouquets</strong> are designed by florists for same-day delivery across Melbourne.
                        We offer custom designs for <strong>anniversaries, sympathy, new baby flowers, get well wishes,
                        celebrations, graduations</strong>, offices and events. Every bouquet is packed thoughtfully to arrive fresh.
                    </p>
                </div>
            </div>
        </FadeInUp>
    );
}

export default AboutArrange;