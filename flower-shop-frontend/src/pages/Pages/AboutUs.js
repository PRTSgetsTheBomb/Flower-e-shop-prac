/**
 * 关于我们页面（/about）
 *
 * 静态内容页面，展示品牌故事和介绍。
 * 当前内容为固定文本，后续可改为从 CMS 获取。
 */

import React from 'react';
import '../PageStyles/AboutUs.css';
import FadeInUp from '../../components/FadeInUp';

function AboutUs() {
    return (
        <FadeInUp as="section" className="about-page">
            <div className="container">
                <h1 className="about-title">About Us</h1>
                <div className="about-divider">
                    <p className="about-subtitle">Our Story</p>
                </div>
                <div className="about-content">
                    <p>
                        Stepping into Pisces Flowers store you will think you are in a wonderland with
                        abundance of fragrance and stunning worldwide flowers in every corner of our store.
                        We are specializing in styling flowers and artistic floral arrangements.
                        We are renowned for our bespoke bouquets and confident that you have chosen a florist
                        that will deliver only the freshest, longest lasting flowers and luxury floral gifts.
                    </p>
                    <h3 className="about-subsection">What else</h3>
                    <p>
                        No matter what the occasion or who that special order is for,
                        we are the florist in the Melbourne CBD to call for innovative and
                        elegant floral designs that are lovingly crafted by the hands of the most passionate designers in Australia.
                    </p>
                </div>
            </div>
        </FadeInUp>
    );
}

export default AboutUs;