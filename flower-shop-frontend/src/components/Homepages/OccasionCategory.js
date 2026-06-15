/**
 * 按场合分类导航
 *
 * 数据驱动渲染：从 occasions.js 导入 6 种场合数据，
 * 用 .map() 循环生成卡片网格，每张卡片包含图片、标题和描述。
 * 数据与视图分离，增删场合只需修改数据文件。
 */

import React from 'react';
import { Link } from 'react-router-dom';
import FadeInUp from '../Generic/FadeInUp';
import occasions from '../Generic/occasions';
import '../../HomePageStyles/OccasionCategory.css';

function OccasionCategory() {
    return (
        <FadeInUp as="section" className="occasion-section">
            <div className="container">
                <h2 className="section-title">Shop by Occasion</h2>
                <div className="occasion-grid">
                    {occasions.map((item) => (
                        <Link key={item.title} to={item.link} className="occasion-card">
                            <div className="occasion-image">
                                <img src={item.img} alt={item.title} />
                            </div>
                            <div className="occasion-info">
                                <h3>{item.title}</h3>
                                <p>{item.desc}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </FadeInUp>
    );
}

export default OccasionCategory;