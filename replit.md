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
- `shops` - Marketplace shops with premium/featured flags, listing_type (products/services/both), business_hours (format: HH:MM-HH:MM), show_on_radar (boolean, default true), marker_color (text, optional custom map marker color), category_ids (VARCHAR array for multi-category support)
- `products` - Products within shops (is_active toggle supported)
- `coupons` - Discount coupons (percentage, flat, free_item, bogo, flash, category_offer, min_order, combo types) with is_active + featured flags; BOGO supports bogo_buy_product_id, bogo_buy_qty, bogo_get_product_id, bogo_get_qty; category_offer uses category_offer_subtype (percentage/flat/free_item) + restrict_sub_category[]; min_order uses min_order_amount + category_offer_subtype (percentage/flat); combo uses coupon_products table with custom_price per item (originalPrice fetched from product for cart savings display)
- `orders` - Customer orders (pending, confirmed, completed, cancelled); includes `customer_location` (optional GPS "lat,lng")
- `order_items` - Line items within orders
- `vendors` - Vendor login accounts (one per shop, separate JWT auth via VENDOR_SECRET)
- `banners` - Home page banner slides linked to coupons
- `contests` - Shop contests (open/closed/completed); total_slots (20 or 30), winner_slot_number, winner_user_id, winner_user_name, end_time (nullable, for auto-draw), attached_coupon_id (nullable, links to contest coupon prize)
- `contest_slots` - Individual slots claimed by users (contest_id, slot_number, user_id, user_name)
- `notifications` - User notifications (id, user_id, type, title, message, data, is_read, created_at); types: contest_win, coupon, etc.
- `user_coupons` - Coupons won from contests (id, user_id, coupon_id, contest_id, is_claimed, claimed_at, created_at)

### Key Routes
- `/` or `/home` - User marketplace homepage (has Map Radar, Nearby AI, and Contest buttons)
- `/contests` - Contests page: banner carousel, slot grid (20/30 boxes), winner reveal, end_time display
- `/notifications` - User notifications list with unread badge, mark-as-read
- `/my-coupons` - User's won contest coupons with claim button
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
- **Top Coupons / Offline Coupons**: Tabbed section showing featured/active coupons and offline printable coupons
- Admin marks categories/shops as "top" via the ★ toggle in the Admin panel → Categories tab and all-shops list
- Note: "For You" personalized sections based on browsing history were removed to simplify layout

### Nearby Shops Map Feature
- Click "Map Radar" button to open interactive Leaflet map with nearby shops
- When clicking a shop in the nearby list or map:
  - Detailed card displays shop info, address, distance, and all active coupons
  - "GO THERE NOW" button navigates to full shop page
  - "Back" button returns to shop list

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

## Personalization
- `client/src/lib/history.ts` — localStorage-based user browsing history tracker
  - Tracks recently viewed shops (up to 20) and categories (up to 10)
  - `useUserHistory()` hook: exposes `recentShopIds`, `topCategoryIds`, `hasHistory`, `recordShop`, `recordCategory`
  - `recordShopView()` / `recordCategoryView()` — standalone functions for direct use
- Home page **Recently Viewed** section: shows shops the user has viewed recently (appears above categories, hidden until history exists)
- Home page **For You** section: shows shops + coupons from the user's most-visited categories (appears above coupons section, hidden until history exists)
- Both sections hidden on first visit; automatically appear as user browses

## Design
- Colorful Apple-inspired minimal UI with frosted glass sidebar
- Plus Jakarta Sans typography
- Blue-to-violet gradient primary theme
- Vibrant category colors and gradient stat cards
- Backdrop blur effects on sidebar and header
- Premium shop badges with amber/gold accents

## Database
- **Primary database**: Supabase PostgreSQL via `SUPABASE_DATABASE_URL` (pooler URL: aws-1-ap-northeast-1.pooler.supabase.com:6543)
- **Images**: Supabase Storage bucket `images`
- **Migration status**: COMPLETE — Production data migrated (41 shops, 15 categories, 55 coupons, 126 products, 14 users, 37 orders, 92 order_items, 29 vendors, 200 offline_coupon_codes)
- **Connection**: `server/storage.ts` auto-converts SUPABASE_DATABASE_URL to pooler URL (IPv4 compatible)
- Seeding disabled — live production data in Supabase

## Recent Updates

### Multi-Category Support (In Progress)
- **Status**: Code complete, awaiting database migration approval
- **Changes Made**:
  - Schema: Added `category_ids` (VARCHAR array) field to shops table
  - Admin Form: Updated category selection to multi-select (click to toggle categories on/off)
  - Storage: Ready to handle category_ids via Partial<InsertShop>
  - **To Activate**: Run `npm run db:push` and approve the database migration when prompted by selecting "create column" option
- **How to Use**: In admin dashboard → Shops → when creating/editing a shop, click multiple categories to assign the shop to all of them. Users will then see the shop in each of those categories.

### Map Popup to Shop Page Navigation
- Clicking "View →" on a coupon in the map popup now navigates directly to that shop's page and highlights the specific coupon with a glowing border
- Coupon remains highlighted for 3 seconds then fades back to normal
