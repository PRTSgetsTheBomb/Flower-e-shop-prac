# Pisces Flower — E-shop

A flower shop e-commerce frontend built with React, featuring a complete online shopping experience with product browsing, cart management, checkout, and user accounts.

## Tech Stack

| Frontend | Backend / APIs | Tooling |
|---|---|---|
| React 19 | WooCommerce REST API | Create React App (react-app-rewired) |
| React Router v7 | WordPress REST API (fallback) | Docker / docker-compose |
| Framer Motion | localStorage (auth / cart / orders) |  |
| | WooCommerce API client (npm package) |  |

## Features

| Category | Features |
|---|---|
| **Homepage** | 11 sections: banner, featured products, occasion categories, local florist intro, customer reviews, FAQ, CTA — all with fade-in-up animations |
| **Catalog** | Product grid with pagination, **sorting** (A–Z, price, date), **filtering** (in-stock, price range), responsive 2-column layout on mobile |
| **Product Detail** | Image gallery with thumbnail switching, **lightbox** zoom, quantity selector, delivery date picker, gift message, add-to-cart with toast notification |
| **Search** | Fuzzy keyword search with WooCommerce + WordPress API fallback |
| **Cart** | useReducer state management, quantity controls, persistent to localStorage, **product recommendations** at bottom |
| **Checkout** | Delivery form, order summary, order saved to localStorage |
| **User Account** | Login / register, dashboard with Orders & Profile tabs, **address management** (add/delete), editable name |
| **Product Reviews** | Star rating (1–5), text review, localStorage persistence, anonymous or named |
| **Mobile** | Hamburger menu, responsive layouts across all pages (768px / 480px breakpoints) |
| **Animations** | Staggered fade-in-up cards, page section scroll animations via framer-motion |
| **Policies** | 5 static pages: refund, shipping, privacy, terms, legal notice |
| **Blog** | Article list & detail from WordPress API |

## Getting Started

### Prerequisites

- Node.js >= 18
- npm
- Docker (optional, for WooCommerce API)

### Install & Run

```bash
cd flower-shop-frontend
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

### WooCommerce API (optional)

```bash
docker compose up -d
```

Then set environment variables (see below).

## Environment Variables

Create `.env.local` in `flower-shop-frontend/`:

```env
REACT_APP_WC_URL=http://localhost:8080
REACT_APP_WC_KEY=your_consumer_key
REACT_APP_WC_SECRET=your_consumer_secret
```

Without these, the app falls back to the public WordPress REST API (product prices will be null).

## Project Structure

```
flower-shop-frontend/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── api/                    # WooCommerce / WordPress API layer
│   ├── components/
│   │   ├── Pages/              # Route page components (20+ pages)
│   │   ├── Homepages/          # Homepage section components (11 sections)
│   │   └── Generic/            # Shared components (Loading, FadeInUp, etc.)
│   ├── context/                # React Context (Auth, Cart)
│   ├── utils/                  # Utility functions (orders)
│   ├── PageStyles/             # CSS for page components
│   ├── HomePageStyles/         # CSS for homepage sections
│   ├── App.js                  # Root component with all routes
│   ├── HomePage.js             # Homepage assembly
│   ├── Footer.js
│   └── index.js
├── docker-compose.yml
├── PROGRESS.md                 # Detailed project status
└── README.md
```

