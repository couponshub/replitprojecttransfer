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
- `users` - Admin and user accounts (role: admin | user)
- `categories` - Shop categories (Food, Fashion, Electronics, etc.)
- `shops` - Marketplace shops with premium/featured flags
- `products` - Products within shops
- `coupons` - Discount coupons (percentage, flat, free_item, flash types)
- `orders` - Customer orders (pending, confirmed, completed)
- `order_items` - Line items within orders

### Key Routes
- `/` or `/home` - User marketplace homepage
- `/login` - Combined sign-in / register page
- `/category/:id` - Shops filtered by category
- `/shop/:id` - Shop detail with products and coupons
- `/cart` - Shopping cart with coupon application
- `/profile` - User profile and order history
- `/admin-dashboard` - Admin panel with sidebar

### API Endpoints
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
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
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/recent-orders` - Recent orders

## Default Credentials
- **Admin**: admin@marketplace.com / Admin@123
- **User**: aarav@example.com / User@123

## Design
- Colorful Apple-inspired minimal UI
- Plus Jakarta Sans typography
- Blue-to-violet gradient primary theme
- Vibrant category colors
- Gradient coupon cards
- Premium shop badges

## Seed Data
- 10 categories, 10 shops (mix premium/regular), 30 products, 10 coupons, 5 users, 5 orders
- Seeded automatically on first startup
