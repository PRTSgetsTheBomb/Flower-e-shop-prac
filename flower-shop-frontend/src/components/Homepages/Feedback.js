/**
 * 客户评价展示
 *
 * 数据驱动渲染：从 Generic/Feedback.js 导入 3 条评价数据，
 * 用 .map() 循环渲染引号样式卡片。
 */

import React from 'react';
import '../../HomePageStyles/Feedback.css';
import feedbacks from '../Generic/Feedback'
import FadeInUp from '../Generic/FadeInUp'

function Feedback() {
  return (
    <FadeInUp as="section" className="feedback-section">
      <div className="container">
        <h2 className="feedback-title">Kind Words From Customers</h2>
        <div className="feedback-grid">
          {feedbacks.map((item) => (
            <div key={item.name} className="feedback-card">
              <p className="feedback-text">"{item.text}"</p>
              <span className="feedback-name">- {item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </FadeInUp>
  )
}

export default Feedback;