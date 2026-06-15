/**
 * 最受欢迎商品展示（Favorite / LocalLoved）
 *
 * 展示两个主打品类：Fresh Flower Bouquets 和 Dried & Preserved Flowers。
 * 每个品类用大图 + 覆盖层文字 + "SHOP" 按钮组成。
 * 左侧主图（大）+ 右侧副图（小），形成视觉层次感。
 */

import React from 'react';
import { Link } from 'react-router-dom';
import FadeInUp from '../Generic/FadeInUp';
import '../../HomePageStyles/LocalLoved.css';

function LocalLoved() {
    return (
        <FadeInUp as="section" className="favorite-section">
            <div className="container">
                <h2 className="favorite-title">Shop Our Most Loved Flowers in Melbourne</h2>

                <div className="favorite-grid">
                    <div className="favorite-featured">
                        <img
                            src="https://piscesflower.com.au/cdn/shop/files/20240411205200.jpg?v=1712836224&width=700"
                            alt="Fresh Flower Bouquets"
                        />
                        <div className="favorite-overlay">
                            <h3>Fresh Flower Bouquets</h3>
                            <p>
                                Seasonal bouquets arranged for birthdays, anniversaries, sympathy, new baby gifts and everyday
                                Melbourne flower delivery.
                            </p>
                            <Link to="/collections/fresh-flowers">SHOP FRESH BOUQUETS</Link>
                        </div>
                    </div>
                    <div className="favorite-side">
                        <div className="favorite-panel">
                            <img
                                src="https://piscesflower.com.au/cdn/shop/files/FF830AB3-7E37-4A71-B5B1-47417CCB9B7F.jpg?v=1698058085&width=700"
                                alt="Fresh Flower Bouquets"
                            />
                            <div className="favorite-overlay">
                                <h3>Dried & Preserved Flower</h3>
                                <p>
                                    Long-lasting arrangements for gifts, homestyling, weddings and event flowers,
                                    delivered across Melbourne.
                                </p>
                                <Link to="/collections/dried-flowers">SHOP DRIED BOUQUETS</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </FadeInUp>
    );
}

export default LocalLoved;