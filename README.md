# Pisces Flower - E-shop

A flower shop e-commerce frontend built with React.

## Tech Stack

- React 19
- React Router v7
- Framer Motion
- WooCommerce REST API
- Docker

## Getting Started

```bash
cd flower-shop-frontend
npm install
npm start
```

## Environment Variables

Create `.env.local` in `flower-shop-frontend/`:

```env
REACT_APP_WC_URL=http://localhost:8080
REACT_APP_WC_KEY=your_consumer_key
REACT_APP_WC_SECRET=your_consumer_secret
```

## Project Structure

```
flower-shop-frontend/
├── public/
├── src/
│   ├── api/          # API functions
│   ├── components/   # React components
│   │   ├── Homepages/  # Homepage sections
│   │   └── Generic/    # Shared components
│   └── App.js
└── docker-compose.yml
```
