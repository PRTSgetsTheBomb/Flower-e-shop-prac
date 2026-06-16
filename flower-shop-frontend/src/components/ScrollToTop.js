/**
 * ScrollToTop - 路由跳转时自动回到页面顶部
 *
 * 实现原理：
 * 监听 useLocation 的 pathname 变化，每次路由切换时执行 window.scrollTo(0, 0)。
 * 该组件不渲染任何 UI，放在 BrowserRouter 内部、Routes 外部即可生效。
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default ScrollToTop;
