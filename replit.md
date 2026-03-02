# CouponsHub X

A full-stack marketplace for Eluru, AP — discover coupons, offline deals, and top offers from 49 real local shops across all categories. Apple-inspired frosted glass UI with blue-to-violet gradients.

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
- `shops` - Marketplace shops with premium/featured flags, listing_type (products/services/both), business_hours (format: HH:MM-HH:MM), show_on_radar (boolean, default true), marker_color (text, optional custom map marker color)
- `products` - Products within shops (is_active toggle supported)
- `coupons` - Discount coupons (percentage, flat, free_item, bogo, flash, category_offer types) with is_active + featured flags; BOGO supports bogo_buy_product_id, bogo_buy_qty, bogo_get_product_id, bogo_get_qty; category_offer uses category_offer_subtype (percentage/flat/free_item) + restrict_sub_category[]
- `orders` - Customer orders (pending, confirmed, completed, cancelled); includes `customer_location` (optional GPS "lat,lng")
- `order_items` - Line items within orders
- `vendors` - Vendor login accounts (one per shop, separate JWT auth via VENDOR_SECRET)
- `banners` - Home page banner slides linked to coupons
- `contests` - Shop contests (open/closed/completed); total_slots (20 or 30), winner_slot_number, winner_user_id, winner_user_name
- `contest_slots` - Individual slots claimed by users (contest_id, slot_number, user_id, user_name)

### Key Routes
- `/` or `/home` - User marketplace homepage (has Map Radar, Nearby AI, and Contest buttons)
- `/contests` - Contests page: banner carousel, slot grid (20/30 boxes), winner reveal
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

### Category Page Features
- **Shops tab** (default): Premium shops first, then regular shops, A→Z / Z→A sort
- **Products & Services tab**: Fetches all products from shops in this category, live search bar filtering by name/description/sub_category, product count badge

### Home Page
- **Top Categories** (Apple-style grid): Shows categories with `is_top=true` in a 5-column×2-row horizontally scrollable grid; falls back to standard list if none marked
- **Top Shops**: Shows shops with `is_top=true` as circular logos; falls back to featured/all shops
- Admin marks categories/shops as "top" via the ★ toggle in the Admin panel → Categories tab and all-shops list

### API Endpoints
- `POST /api/auth/login` - Login (email or phone)
- `POST /api/auth/register` - Register (with optional phone)
- `GET /api/auth/me` - Current user
- `GET/POST/PUT/DELETE /api/categories` - Categories CRUD
- `GET /api/categories/top` - Categories with is_top=true
- `GET/POST/PUT/DELETE /api/shops` - Shops CRUD
- `GET /api/shops/featured` - Featured shops
- `GET /api/shops/top` - Shops with is_top=true
- `PATCH /api/admin/categories/:id/toggle-top` - Toggle top status for category (admin)
- `PATCH /api/admin/shops/:id/toggle-top` - Toggle top status for shop (admin)
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
