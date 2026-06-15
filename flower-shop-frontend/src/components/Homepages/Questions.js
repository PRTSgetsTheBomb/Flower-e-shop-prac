/**
 * FAQ 手风琴组件
 *
 * 核心职责：展示常见问题列表，点击问题展开/收起答案
 *
 * 设计说明：
 *
 * 1. 【手风琴模式（Accordion）】
 *    同一时间只能展开一个 FAQ 项。点击另一个会自动收起当前展开的。
 *    这是最常见的 FAQ 交互模式，避免页面被展开的答案撑得太长。
 *
 * 2. 【用索引标记展开项】
 *    openIndex 存储当前展开项的索引（数字），而不是布尔值。
 *    如果用布尔数组（如 [true, false, false]），每次点击需要更新整个数组，
 *    而且需要额外的循环来确保"同一时间只有一个展开"。
 *    用索引更简洁：null 表示全部收起，数字表示对应索引的项展开。
 *
 * 3. 【toggle 逻辑】
 *    const toggle = (i) => setOpenIndex(openIndex === i ? null : i);
 *    - 如果点击的是已展开的项 → 设为 null（收起）
 *    - 如果点击的是未展开的项 → 设为该索引（展开，自动收起其他的）
 *    这个"点击自身可关闭"的细节提升了用户体验。
 *
 * 4. 【AnimatePresence 的作用】
 *    AnimatePresence 包裹的条件渲染，确保组件"卸载"时也能播放退出动画。
 *    如果没有它，motion.div 的 exit 动画不会生效，答案会直接消失（没有过渡）。
 *    它是 framer-motion 中专用于"离开动画"的组件。
 *
 * 5. 【箭头旋转动画】
 *    animate={{ rotate: openIndex === i ? 180 : 0 }}
 *    用 framer-motion 的 animate 属性让箭头在展开/收起时平滑旋转。
 *    比 CSS transition 更简洁，且与手风琴动画保持一致。
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../../HomePageStyles/Questions.css';
import faqs from '../Generic/Questions';
import FadeInUp from '../Generic/FadeInUp';

function Questions() {
  const [openIndex, setOpenIndex] = useState(null); // null=全部收起，数字=对应索引展开

  // 切换展开项：点击已展开的收起，点击未展开的展开
  const toggle = (i) => setOpenIndex(openIndex === i ? null : i);

  return (
    <FadeInUp as="section" className="faq-section">
      <div className="container">
        <h2 className="faq-title">Pisces Flower FAQ</h2>
        {faqs.map((item, i) => (
          <div key={i} className="faq-item">
            <button className="faq-q" onClick={() => toggle(i)}>
              {item.q}
              <motion.span
                className="faq-arrow"
                animate={{ rotate: openIndex === i ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >▾</motion.span>
            </button>
            <AnimatePresence>
              {openIndex === i && (
                <motion.div
                  className="faq-answer"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                >
                  <p className="faq-a">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </FadeInUp>
  )
}

export default Questions;