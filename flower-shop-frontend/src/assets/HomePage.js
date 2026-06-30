/**
 * 首页（/）
 *
 * 核心职责：组合多个 Section 组件，按顺序拼成完整的首页
 *
 * 设计说明：
 *
 * 1. 【组件组合模式】
 *    首页由 11 个独立的 Section 组件按顺序排列而成。
 *    每个 Section 负责一块独立的内容（横幅、商品推荐、分类导航等）。
 *    这种"组合"（composition）模式是 React 的核心思想之一：
 *    - 每个组件职责单一，便于开发和维护
 *    - 可以独立修改某个 Section 而不影响其他
 *    - 如果有多个页面需要相同的 Section，直接复用
 *
 * 2. 【空 Fragment <>...</>】
 *    React 要求组件必须返回单个根元素。如果用 div 包裹，
 *    会在 DOM 中多出一层无意义的 div。空 Fragment 只作为逻辑容器，
 *    不会在 DOM 中产生额外节点，保持 HTML 结构干净。
 *
 * 3. 【为什么把 Sections 拆到独立文件？】
 *    如果把 11 个 Section 的代码都写在 HomePage.js 里，
 *    文件会非常大（约 1000+ 行）。拆成独立文件后：
 *    - 每个文件只关注一个 Section
 *    - 可以独立管理各自的 state 和 CSS
 *    - 多人协作时不容易冲突
 *
 * 4. 【各 Section 顺序的意义】
 *    按"吸引注意 → 展示商品 → 建立信任 → 促成行动"的顺序排列：
 *    HeadBanner → 大图吸引注意力
 *    FeaturedProducts → 立刻展示可购买的商品
 *    Favorite/LocalLoved → 热销商品
 *    OccasionCategory → 按场景推荐（降低选择门槛）
 *    LocalFlorist / DeliveryArea → 建立本地信任感
 *    AboutArrange / WeddingArrange → 展示专业性
 *    Feedback → 社交证明（从众心理）
 *    Questions → 打消疑虑
 *    FootBanner → 最后行动号召（CTA）
 */

import FadeInUp from '../components/FadeInUp';
import HeadBanner from '../pages/Homepages/HeadBanner';
import FeaturedProducts from '../pages/Homepages/FeaturedProducts';
import Favorite from '../pages/Homepages/LocalLoved';
import OccasionCategory from '../pages/Homepages/OccasionCategory';
import LocalFlorist from '../pages/Homepages/LocalFlorist';
import DeliveryArea from '../pages/Homepages/DeliveryArea';
import AboutArrange from '../pages/Homepages/AboutArrange';
import WeddingArrange from '../pages/Homepages/WeddingArrange';
import Feedback from '../pages/Homepages/Feedback';
import Questions from '../pages/Homepages/Questions';
import FootBanner from '../pages/Homepages/FootBanner';

function HomePage() {
  return (
    <FadeInUp as="section" className="homepage">
      <HeadBanner />          {/* 首屏大图 Banner */}
      <FeaturedProducts />    {/* 今日精选商品 */}
      <Favorite />            {/* 最受欢迎商品 */}
      <OccasionCategory />    {/* 按场合分类导航 */}
      <LocalFlorist />        {/* 本地花店介绍 */}
      <DeliveryArea />        {/* 配送区域列表 */}
      <AboutArrange />        {/* 干花/鲜花花艺介绍 */}
      <WeddingArrange />      {/* 婚礼/企业花艺 */}
      <Feedback />            {/* 客户评价 */}
      <Questions />           {/* FAQ 常见问题 */}
      <FootBanner />          {/* 底部 CTA 横幅 */}
    </FadeInUp>
  );
}

export default HomePage;