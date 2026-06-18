# Pisces Flower 项目进度

> 最后更新：2026-06-16

---

## 已完成功能

| 类别           | 内容   |                                                                           | 状态   |
|------          |------ |                                                                            |------|
| **首页**| 11 个 Section 完整拼装                                                                    | 完成   |
| **商品分类页**| `/collections/:slug` 动态路由，支持全部商品和按分类筛选，useMemo 动态生成标题           | 完成   |
| **商品详情页**  | `/product/:slug`，含数量选择、配送日期、礼品留言、推荐商品、"You May Also Like" 推荐     | 完成   |
| **搜索结果页**  | `/search?q=` URL 驱动搜索，支持模糊匹配，多状态渲染                                  | 完成   |
| **购物车页**    | useReducer 管理状态，增删改查、数量防越界、价格自动汇总、行小计                        | 完成   |
| **结算页**      | `/checkout` 配送表单 + 订单摘要 + 订单保存到 localStorage                            | 完成   |
| **登录/仪表盘** | 双状态渲染（未登录显示表单，已登录显示 Orders/Profile 标签切换 + 个人信息 + 登出）      | 完成   |
| **注册页**      | 表单验证（非空检查、密码长度 >= 6）、注册后自动登录                                   | 完成   |
| **婚礼/活动页** | `/events` 静态内容介绍页                                                            | 完成   |
| **联系我们页**  | `/contact` 双栏布局：左侧联系信息 + 嵌入式 Google 地图，右侧联系表单，表单提交即时反馈  | 完成   |
| **关于我们页**  | `/about` 品牌故事静态内容页                                                         | 完成   |
| **配送区域页**  | `/delivery-areas` 服务区域导航列表                                                  | 完成   |
| **区域详情页**  | `/delivery/:slug` 动态生成地区名 + 推荐商品，同时处理 `/prahran-florist` 路径          | 完成   |
| **政策页面**    | `/policies/*` 退款/配送/隐私/服务条款/法律声明共5个静态内容页                         | 完成   |
| **博客列表页**  | `/blogs` 从 WordPress API 获取文章列表，显示封面图、日期、摘要                        | 完成   |
| **博客详情页**  | `/blogs/:slug` 文章详情，含完整内容和封面图                                           | 完成   |
| **订单查看**    | 账户页 Orders 标签页展示历史订单，含商品清单、配送地址、状态                           | 完成   |
| **花名 Slug**   | URL 使用花名 slug（如 `/product/alstromeria`），兼容旧 `flower-1` 格式                | 完成   |
| **占位页**      | 未知路由统一由 PlaceholderPage 处理，标题根据路径动态生成                             | 完成   |

## 已完成的基础设施

| 模块 | 内容 |
|------|------  |
| **路由架构**   | App.js 配置 23 个路由，Provider 嵌套（Auth > Cart），全局 Header + Footer 布局 |
| **API 层**    | WooCommerce REST API + WordPress API 双通道降级，统一数据映射 |
| **认证系统**   | AuthContext + localStorage 实现注册/登录/登出，含前端迁移指南注释 |
| **购物车系统** | CartContext + useReducer，4 种 action 类型，派生状态自动计算 |
| **订单系统**   | orders.js 工具模块，localStorage 持久化，按用户 email 隔离 |
| **文章系统**   | articles.js API 模块，从 WordPress REST API 获取，支持 `_embed` 封面图 |
| **CSS 架构**  | 所有 CSS 集中到 `src/styles/` 目录统一管理 |
| **代码注释**   | 所有 JS 源文件及 CSS 文件添加了设计说明注释 |

## 路由清单

| 路径                        | 组件               | 状态   |
|------                       |------             |------  |
| `/`                         | `HomePage`        | 已完成  |
| `/collections/:slug`        | `CollectionPages` | 已完成  |
| `/search?q=`                | `SearchPage`      | 已完成  |
| `/product/:slug`            | `ProductDetail`   | 已完成  |
| `/account`                  | `AccountPage`     | 已完成  |
| `/register`                 | `SignUpPage`      | 已完成  |
| `/cart`                     | `CartPage`        | 已完成  |
| `/checkout`                 | `CheckoutPage`    | 已完成  |
| `/events`                   | `EventPage`       | 已完成  |
| `/contact`                  | `ContactPage`     | 已完成  |
| `/about`                    | `AboutUs`         | 已完成  |
| `/delivery-areas`           | `DeliveryArea`    | 已完成  |
| `/delivery/:slug`           | `DeliveryPage`    | 已完成  |
| `/prahran-florist`          | `DeliveryPage`    | 已完成  |
| `/policies/refund-policy`   | `RefundPolicy`    | 已完成  |
| `/policies/shipping-policy` | `ShippingPolicy`  | 已完成  |
| `/policies/privacy-policy`  | `PrivacyPolicy`   | 已完成  |
| `/policies/terms-of-services`| `TermsOfService` | 已完成  |
| `/policies/legal-notice`    | `LegalNotice`     | 已完成  |
| `/blogs`                    | `BlogPage`        | 已完成  |
| `/blogs/:slug`              | `BlogPostPage`    | 已完成  |
| `*` (404)                   | `PlaceholderPage` | 占位    |

## 剩余待开发

| 事项      | 说明                                                                                |
|------     |------                                                                              |
| 后端对接   | AuthContext 的 saveAccount / authenticate 替换为真实 API          |
| 联系表单   | ContactPage 表单当前模拟发送，需对接真实邮件/API                   |

### 客户端
|Review| 收到货才能评论

### 商家端
|WooCommerce| 下单后可以在WC看到，包括各种信息要进行汇总
|运费| 计算到不同地区的运费

## 优化建议
| ProductDetail界面 | 告诉用户哪些花支持配送，哪些花仅支持自提                             |
|           | 可以尝试使用React Query / Tanstack Query                 | 
| 分类后描述 | 在商品列表之后添加更多描述、吸引阅读                       |
| 字体美化   | 使用适当字体提升阅读体验                                  |
| 分享按钮   | 添加分享功能，用户点击分享按钮时显示分享弹窗                |

## 技术栈

- React 19
- React Router v7
- framer-motion
- WooCommerce REST API (@woocommerce/woocommerce-rest-api)
- Create React App (react-app-rewired)