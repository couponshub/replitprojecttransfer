# CouponsHub X

A full-stack marketplace web application for discovering and using coupons from top shops.

## Tech Stack
- **Frontend**: React + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Node.js + Express
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: JWT-based authentication with bcryptjs
- **Routing**: wouter
- **State**: TanStack Query v5

## Architecture

### Database Tables
- `users` - Admin and user accounts (role: admin | user, supports phone field)
- `categories` - Shop categories (Food, Fashion, Electronics, etc.)
- `shops` - Marketplace shops with premium/featured flags, listing_type (products/services/both)
- `products` - Products within shops
- `coupons` - Discount coupons (percentage, flat, free_item, flash types)
- `orders` - Customer orders (pending, confirmed, completed)
- `order_items` - Line items within orders
- `vendors` - Vendor login accounts (one per shop, separate JWT auth via VENDOR_SECRET)
- `banners` - Home page banner slides linked to coupons

### Key Routes
- `/` or `/home` - User marketplace homepage
- `/login` - 4-tab login (Sign In, Create Account, Vendor, Admin)
- `/category/:id` - Shops filtered by category
- `/shop/:id` - Shop detail with products and coupons
- `/cart` - Shopping cart with coupon application
- `/profile` - User profile and order history
- `/admin-dashboard` - Apple-themed admin panel with sidebar

### Admin Dashboard Tabs
- **Dashboard** - Overview stats (7 cards), recent orders, top shops, top coupons
- **Categories** - CRUD management
- **Shops** - CRUD with premium toggle, category filter
- **Products** - CRUD with shop filter
- **Coupons** - CRUD with active/inactive status
- **Orders** - Table view with status management
- **Users** - All users table with contact details
- **Vendors** - All shops with vendor login management (Set Login / Update Login per shop)
- **Top Shops** - Ranked premium shops
- **Top Coupons** - Active coupons showcase

### API Endpoints
- `POST /api/auth/login` - Login (email or phone)
- `POST /api/auth/register` - Register (with optional phone)
- `GET /api/auth/me` - Current user
- `GET/POST/PUT/DELETE /api/categories` - Categories CRUD
- `GET/POST/PUT/DELETE /api/shops` - Shops CRUD
- `GET /api/shops/featured` - Featured shops
- `GET/POST/PUT/DELETE /api/products` - Products CRUD
- `GET/POST/PUT/DELETE /api/coupons` - Coupons CRUD
- `POST /api/coupons/validate` - Validate coupon code
- `GET /api/orders` - All orders (admin only)
- `GET /api/orders/my` - User's own orders
- `POST /api/orders` - Place order
- `PUT /api/orders/:id/status` - Update order status (admin)
- `GET /api/admin/stats` - Dashboard statistics (users, categories, shops, vendors, products, coupons, orders)
- `GET /api/admin/recent-orders` - Recent orders
- `GET /api/admin/users` - All users (admin)
- `GET /api/admin/top-shops` - Top premium shops
- `GET /api/admin/top-coupons` - Top active coupons

## Default Credentials
- **Admin**: admin@marketplace.com / Admin@123
- **User**: aarav@example.com / User@123 (phone: 9876543210)

## Design
- Colorful Apple-inspired minimal UI with frosted glass sidebar
- Plus Jakarta Sans typography
- Blue-to-violet gradient primary theme
- Vibrant category colors and gradient stat cards
- Backdrop blur effects on sidebar and header
- Premium shop badges with amber/gold accents

## Seed Data
- 10 categories, 10 shops (mix premium/regular), 30 products, 10 coupons, 5 users (with phone numbers), 5 orders
- Seeded automatically on first startup
