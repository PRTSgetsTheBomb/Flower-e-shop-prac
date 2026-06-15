/**
 * 通用由下到上渐入动画组件
 *
 * 用法：用 <FadeInUp> 包裹任何元素，滚动到视口内时自动触发动画
 *
 * 特性：
 * - 基于 framer-motion whileInView，只有元素进入视口才播放
 * - viewport once:true 仅播放一次，不会重复触发
 * - 支持通过 delay prop 自定义延迟（用于交错入场）
 * - 支持通过 className 传递样式
 */
import React from 'react';
import { motion } from 'framer-motion';

const defaultTransition = { duration: 0.5, ease: 'easeOut' };

export default function FadeInUp({ children, delay = 0, className, as = 'div', ...rest }) {
  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ ...defaultTransition, delay }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
