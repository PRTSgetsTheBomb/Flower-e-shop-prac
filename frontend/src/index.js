/**
 * 应用入口文件
 *
 * 核心职责：将 React 应用挂载到 HTML 的 DOM 节点上
 *
 * 设计说明：
 *
 * 1. 【ReactDOM.createRoot】
 *    React 18 的新 API，替代了旧版的 ReactDOM.render()。
 *    createRoot 创建了一个"根节点"，之后的所有渲染都在这个根上管理。
 *    它还启用了 React 18 的并发特性（Concurrent Features）。
 *
 * 2. 【StrictMode】
 *    严格模式，只在开发环境下生效。它会：
 *    - 故意重复调用某些生命周期方法（如 useEffect），帮助发现副作用问题
 *    - 检查过时的 API 使用
 *    - 不渲染任何可见的 UI，纯粹是开发辅助工具
 *
 * 3. 【reportWebVitals】
 *    性能测量工具，可以上报给分析服务。默认不输出任何内容，
 *    如果想查看性能指标，可以改成 reportWebVitals(console.log)。
 *    它测量的是：首次内容绘制（FCP）、最大内容绘制（LCP）等 Web 核心指标。
 *
 * 4. 【index.css】
 *    全局样式文件，这里的 reset 或基础样式会影响到所有组件。
 *    组件级别的样式（如 Header.css）只影响该组件，通过 import 引入后
 *    CRA 的 webpack 配置会自动处理 CSS 作用域。
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
