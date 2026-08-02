# Pisces Flower — E-shop

A complete flower shop e-commerce platform with **3 modules**:

| Module | Path | Tech | Port |
|---|---|---|---|
| **Frontend** (客户商城) | `frontend/` | React 19 + CRA | 3000 |
| **Server** (后端 API) | `server/` | Express + WooCommerce | 5000 |
| **Admin** (商家面板) | `admin/` | Vanilla JS + Chart.js | 3001 |

---

## Features

### 客户商城 (Frontend)

| Category | Features |
|---|---|
| **Homepage** | 11 sections: banner, featured products, occasion categories, local florist intro, customer reviews, FAQ, CTA — all with fade-in-up animations |
| **Catalog** | Product grid, sorting (A–Z, price, date), filtering (in-stock, price range), responsive 2-column mobile layout |
| **Product Detail** | Image gallery + lightbox, quantity selector, delivery/pickup date picker, suburb validation, gift message, "You May Also Like" recommendations |
| **Search** | Fuzzy keyword search (WooCommerce + WordPress API fallback) |
| **Cart** | useReducer state, quantity controls, localStorage persistence |
| **Checkout** | Delivery form + suburb shipping fee, Stripe payment, order summary |
| **User Account** | Login/register, Orders & Profile tabs, order history (items, address, live status), refund requests, address management |
| **Order Detail** | `/order/:id` — status timeline, items, delivery info; supports WC-synced orders |
| **Refund** | Time-based eligibility: same-day 100% → day 2 70% → day 3 50% → day 4+ not allowed (frontend + backend enforced) |
| **Product Reviews** | Star rating (1–5), text review, localStorage + server sync |
| **Blog** | Article list & detail from WordPress API with featured images |
| **Policies** | 5 static pages: refund, shipping, privacy, terms, legal notice |
| **Delivery Areas** | Service area list + per-area pages, `/prahran-florist` alias |
| **Friendly URLs** | Product URLs use flower name slugs, backward compatible |
| **Typography** | 5-level font system (Display / Heading / Subheading / Body / Caption) via CSS variables |

### 商家面板 (Admin)

| Category | Features |
|---|---|
| **Dashboard** | Today's orders (delivery/pickup/completed/on-hold), KPI cards, revenue trend, delivery map |
| **Analytics** | Summary, delivery areas, product ranking — all with date filtering |
| **Refund Management** | Pending/processed tables, approve/reject, refund analytics (donut + stacked monthly chart), time-range filter |
| **AI Analyst** | Chat widget with auto model routing (Anthropic / DeepSeek) |
| **Auth** | JWT login via WordPress admin credentials |

### 后端 (Server)

| Endpoint | Description |
|---|---|
| `/api/analytics/*` | Summary / delivery-areas / products aggregation |
| `/api/refunds` | Refund submission + admin approval (multer image upload) |
| `/api/refunds/analytics` | Refund reason distribution + monthly trends |
| `/api/auth` | Register / login (local JWT) |
| `/api/order/:id` | Order detail + status updates |
| `/api/my-orders` | Cross-device order sync from WooCommerce |
| `/api/contact` | Contact form → email |
| `/api/ai` | AI analyst chat |
| `/api/reviews` | Product reviews |
| `/api/stripe` | Stripe payment intent / webhook |
| `/api/wc-proxy` | WooCommerce REST proxy |
| Email | Order confirmation, status updates, refund notifications (Brevo SMTP) |

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm
- Docker (optional — for local WooCommerce/WordPress)

### 1. Backend Server

```bash
cd server
npm install
cp .env.example .env   # or create manually (see below)
npm start              # http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm start              # http://localhost:3000
```

### 3. Admin Panel

```bash
cd admin
npx serve . -p 3001    # http://localhost:3001
```

### 4. Local WooCommerce (optional)

```bash
docker compose up -d   # WordPress on :8080, MySQL
```

---

## Environment Variables

### Server (`server/.env`)

```env
# WooCommerce
WC_URL=http://localhost:8080
WC_KEY=your_consumer_key
WC_SECRET=your_consumer_secret

# Email (Brevo SMTP)
BREVO_HOST=smtp-relay.brevo.com
BREVO_PORT=587
BREVO_USER=your_brevo_user
BREVO_PASS=your_brevo_smtp_key
EMAIL_FROM="Pisces Flower <noreply@piscesflower.com>"
CONTACT_EMAIL=you@example.com
SITE_URL=http://localhost:3000

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx

# AI Analyst (optional)
CLAUDE_API_KEY=sk-ant-xxx
CLAUDE_BASE_URL=https://api.anthropic.com
CLAUDE_MODEL=claude-sonnet-5
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_FLASH_MODEL=deepseek-v4-flash
DEEPSEEK_PRO_MODEL=deepseek-v4-pro

# Server
PORT=5000
```

### Frontend (`frontend/.env.local`)

```env
REACT_APP_SERVER_URL=http://localhost:5000
REACT_APP_WC_URL=http://localhost:8080
REACT_APP_WC_KEY=your_consumer_key
REACT_APP_WC_SECRET=your_consumer_secret
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

---

## Project Structure

```
E-shop/
├── frontend/                 # React customer store
│   ├── public/
│   └── src/
│       ├── api/              # WooCommerce / WordPress API layer
│       ├── components/
│       │   ├── common/       # Shared components (ProductCard, Footer, etc.)
│       │   ├── home/         # Homepage sections (11)
│       │   └── pages/        # Route pages (23 routes)
│       ├── context/          # AuthContext, CartContext
│       ├── utils/            # orders, http helpers
│       ├── styles/           # All CSS (font system in index.css)
│       ├── App.js            # Routes + Provider setup
│       └── index.js
├── server/                   # Express backend
│   ├── index.js              # App entry
│   ├── routes/               # auth, refunds, reviews, analytics, stripe, wc-proxy
│   ├── services/             # ai, mail, order-routes
│   ├── middleware/           # adminAuth (JWT)
│   ├── lib/                  # woocommerce client, helpers
│   ├── refunds.json          # Refund request store
│   └── uploads/              # Refund images
├── admin/                    # Merchant dashboard (vanilla JS)
│   ├── index.html
│   ├── app.js
│   └── style.css
├── docker-compose.yml        # Local WordPress + MySQL
├── PROGRESS.md               # Detailed project status
└── README.md
```

---

## Tech Stack

| Frontend | Server | Admin |
|---|---|---|
| React 19 | Express 4 | Vanilla JS |
| React Router v7 | @woocommerce/woocommerce-rest-api | Chart.js 4 (CDN) |
| Framer Motion | Stripe SDK | Leaflet 1.9 (CDN) |
| @stripe/react-stripe-js | Nodemailer (Brevo SMTP) | marked (CDN) |
| CRA (react-app-rewired) | Multer (uploads) | |
| | Anthropic + DeepSeek SDK (AI) | |

## Scripts

```bash
# Frontend
cd frontend && npm start        # dev server
cd frontend && npm run build    # production build
cd frontend && npm test         # run tests

# Server
cd server && npm start          # API server

# Admin
cd admin && npx serve . -p 3001
```

