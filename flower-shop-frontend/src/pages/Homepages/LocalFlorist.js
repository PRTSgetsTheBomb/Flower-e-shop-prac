/**
 * 本地花店介绍
 *
 * 展示品牌定位（本地花店 + Oakleigh South 工作室）。
 * 左侧图片 + 右侧文字，含三个特色卡片（1pm 截单、本地工作室、墨尔本全城配送）。
 */

import React from 'react';
import { Link } from 'react-router-dom';
import FadeInUp from '../../components/FadeInUp';
import '../HomePageStyles/LocalFlorist.css';

function LocalFlorist() {
    return (
        <FadeInUp as="section" className="local-section">
            <div className="container local-grid">
                <div className="local-image">
                    <img
                        src="https://piscesflower.com.au/cdn/shop/t/5/assets/pf-home-local-hands-20260531.jpg?v=30353768495358145881780185175"
                        alt="Local Melbourne Florist"
                    />
                </div>
                <div className="local-content">
                    <span className="local-label">LOCAL MELBOURNE FLORIST</span>
                    <h2 className="local-title">An Online Melbourne Florist With Local Hands.</h2>
                    <p className="local-text">
                        Pisces Flower now works from an Oakleigh South studio, creating fresh bouquets, dried flowers, flower boxes and
                        event flowers for customers across Melbourne.
                    </p>
                    <p className="local-text">
                        We continue to deliver to <strong>Prahran</strong>
                        , <strong>South Yarra</strong>
                        , <strong>St Kilda</strong> and <strong>suburbs across Melbourne</strong>.
                    </p>
                    <div className="local-features">
                        <div className="local-feature">
                            <h4>1 pm cut-off</h4>
                            <p>Same-day deliver when flowers are available.</p>
                        </div>
                        <div className="local-feature">
                            <Link to="/contact" className="local-feature-link"><h4>Oakleigh South studio</h4></Link>
                            <p>Arranged locally by the Pisces Team.</p>
                        </div>
                        <div className="local-feature">
                            <Link to="/pages/service-areas" className="local-feature-link"><h4>Melbourne-wide</h4></Link>
                            <p>Homes, offices, hospitals and venues.</p>
                        </div>
                    </div>
                </div>
            </div>
        </FadeInUp>
    );
}

export default LocalFlorist;