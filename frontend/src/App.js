/**
 * 应用根组件 - App
 *
 * 核心职责：定义整个 SPA 的路由结构和全局 Provider 层级
 *
 * 设计说明：
 *
 * 1. 【Provider 嵌套顺序】
 *    <AuthProvider> 在外层，<CartProvider> 在内层。
 *    因为 CartProvider 可能需要访问用户信息（如 userId），所以 AuthProvider 必须先包裹。
 *    如果调换顺序，CartProvider 内部无法使用 useAuth()。
 *
 * 2. 【BrowserRouter】
 *    HTML5 history API 模式，URL 中不带 # 号。
 *    相比 HashRouter 更美观，但需要服务端做 fallback 配置（否则刷新会 404）。
 *    create-react-app 开发服务器默认支持。
 *
 * 3. 【Routes / Route】
 *    React Router v6 的声明式路由，路径匹配使用精确匹配（而非 v5 的 Switch）。
 *    :slug 和 :policy 是动态参数，可通过 useParams() 获取。
 *    * 为通配符，匹配所有未定义路径，用于 404 页面。
 *
 * 4. 【Header / Footer 放在 Routes 外面】
 *    全局布局，所有页面都显示导航栏和页脚，不需要在每个页面组件中重复引入。
 *
 * 5. 【PlaceholderPage 被多个路由复用】
 *    /about、/contact、/delivery-areas 等"建设中"页面指向同一个组件，
 *    通过 useLocation 获取当前路径动态生成标题，避免为每个页面写一个空壳组件。
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

// Global Layout Components
import Header from './components/home/Header';
import DeliveryBanner from './components/home/DeliveryBanner';
import Footer from './components/common/Footer';
import ScrollToTop from './components/common/ScrollToTop';
import CartToast from './components/pages/CartToast';

// Page Components
import HomePage from './components/home/HomePage';
import AboutUs from './components/pages/AboutUs';
import AccountPage from './components/pages/AccountPage';
import BlogPage from './components/pages/BlogPage';
import BlogPostPage from './components/pages/BlogPostPage';
import CartPage from './components/pages/CartPage';
import CheckoutPage from './components/pages/CheckoutPage';
import CollectionPages from './components/pages/CollectionPages';
import ContactPage from './components/pages/ContactPage';
import DeliveryArea from './components/pages/DeliveryArea';
import DeliveryPage from './components/pages/DeliveryPage';
import EventPage from './components/pages/EventPage';
import LegalNotice from './components/pages/LegalNotice';
import OrderSummary from './components/pages/OrderSummary';
import PlaceholderPage from './components/pages/PlaceholderPage';
import PrivacyPolicy from './components/pages/PrivacyPolicy';
import ProductDetail from './components/pages/ProductDetail';
import RefundPolicy from './components/pages/RefundPolicy';
import SearchPage from './components/pages/SearchPage';
import ShippingPolicy from './components/pages/ShippingPolicy';
import SignUpPage from './components/pages/SignUpPage';
import TermsOfService from './components/pages/TermsOfService';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>      {/* 认证上下文 - 提供 user/login/logout */}
      <CartProvider>       {/* 购物车上下文 - 提供 cart/addToCart 等 */}
      <CartToast />        {/* 加入购物车通知弹窗 */}
      <ScrollToTop />      {/* 路由跳转时自动回到顶部 */}
      <DeliveryBanner />
      <Header />           {/* 全局导航栏，在所有页面顶部显示 */}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/collections/:slug" element={<CollectionPages />} />     {/* :slug 是动态参数，如 dried-flowers */}
        <Route path="/search" element={<SearchPage />} />
        <Route path="/product/:slug" element={<ProductDetail />} />          {/* 商品详情页 */}
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/register" element={<SignUpPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order/:orderId" element={<OrderSummary />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/delivery-areas" element={<DeliveryArea />} />
        <Route path="/delivery/:slug" element={<DeliveryPage />} />
        <Route path="/policies/refund-policy" element={<RefundPolicy />} />
        <Route path="/policies/shipping-policy" element={<ShippingPolicy />} />
        <Route path="/policies/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/policies/terms-of-services" element={<TermsOfService />} />
        <Route path="/policies/legal-notice" element={<LegalNotice />} />
        <Route path="/policies/:policy" element={<PlaceholderPage />} />
        <Route path="/blogs" element={<BlogPage />} />
        <Route path="/blogs/:slug" element={<BlogPostPage />} />
        <Route path="/prahran-florist" element={<DeliveryPage />} />
        <Route path="/events" element={<EventPage />} />
        <Route path="*" element={<PlaceholderPage />} />                      {/* 404 通配符 */}
      </Routes>
      <Footer />           {/* 全局页脚，在所有页面底部显示 */}
      </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
