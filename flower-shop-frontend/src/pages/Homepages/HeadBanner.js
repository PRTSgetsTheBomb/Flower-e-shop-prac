/**
 * 首页顶部大图横幅
 *
 * 展示品牌标语和主要行动号召按钮（CTA）。
 * 背景图由 CSS 控制，页面结构仅包含文案和按钮。
 */

import React from 'react';
import { Link } from 'react-router-dom';
import '../HomePageStyles/HeadBanner.css';
import FadeInUp from '../../components/FadeInUp';

function HeadBanner() {
    return (
        <FadeInUp as="section" className="banner">
            <div className='container content'>
                <h1>Flowers for everyone</h1>
                <p>Send flowers and keep smells in hands</p>
                <Link to="/collections/available-today" className="btn-primary">SHOP AVAILABLE TODAY</Link>
            </div>
        </FadeInUp>
    );
};

export default HeadBanner;