import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
import * as schema from "@shared/schema";
import {
  type User, type InsertUser,
  type Category, type InsertCategory,
  type Shop, type InsertShop,
  type Product, type InsertProduct,
  type Coupon, type InsertCoupon,
  type CouponProduct, type InsertCouponProduct,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
  type Vendor, type InsertVendor,
  type Banner, type InsertBanner,
  type OfflineCoupon, type InsertOfflineCoupon, type OfflineCouponCode,
  type Contest, type InsertContest, type ContestSlot,
  type Notification, type UserCoupon,
  users, categories, shops, products, coupons, couponProducts, orders, orderItems, vendors, banners,
  offlineCoupons, offlineCouponCodes, contests, contestSlots, notifications, userCoupons
} from "@shared/schema";

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
const pool = new Pool({ 
  connectionString,
  ssl: process.env.SUPABASE_DATABASE_URL ? { rejectUnauthorized: false } : false,
});
export const db = drizzle(pool, { schema });

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<Pick<User, "name" | "phone" | "address">>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  // Categories
  getAllCategories(): Promise<Category[]>;
  getTopCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(cat: InsertCategory): Promise<Category>;
  updateCategory(id: string, cat: Partial<InsertCategory>): Promise<Category | undefined>;
  toggleTopCategory(id: string): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<void>;

  // Shops
  getAllShops(categoryId?: string): Promise<(Shop & { category?: Category })[]>;
  getShop(id: string): Promise<(Shop & { category?: Category }) | undefined>;
  createShop(shop: InsertShop): Promise<Shop>;
  updateShop(id: string, shop: Partial<InsertShop>): Promise<Shop | undefined>;
  deleteShop(id: string): Promise<void>;
  getFeaturedShops(): Promise<(Shop & { category?: Category })[]>;
  toggleTopShop(id: string): Promise<Shop | undefined>;

  // Products
  getAllProducts(shopId?: string): Promise<(Product & { shop?: Shop })[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductsByShop(shopId: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<void>;

  // Coupons
  getAllCoupons(shopId?: string): Promise<(Coupon & { shop?: Shop })[]>;
  getCouponByCode(code: string, shopId?: string): Promise<Coupon | undefined>;
  getCouponsByShop(shopId: string): Promise<Coupon[]>;
  createCoupon(coupon: InsertCoupon): Promise<Coupon>;
  updateCoupon(id: string, coupon: Partial<InsertCoupon>): Promise<Coupon | undefined>;
  incrementCouponUsage(code: string, shopId: string): Promise<void>;
  deleteCoupon(id: string): Promise<void>;
  getActiveCoupons(): Promise<(Coupon & { shop?: Shop })[]>;

  // Coupon Products
  getCouponProducts(couponId: string): Promise<(CouponProduct & { product?: Product })[]>;
  setCouponProducts(couponId: string, items: { product_id: string; custom_price: string }[]): Promise<void>;

  // Orders
  getAllOrders(): Promise<(Order & { user?: User })[]>;
  getUserOrders(userId: string): Promise<(Order & { items: (OrderItem & { product?: Product })[] })[]>;
  getOrder(id: string): Promise<(Order & { user?: User; items: (OrderItem & { product?: Product })[] }) | undefined>;
  getShopOrders(shopId: string): Promise<(Order & { user?: User; items: (OrderItem & { product?: Product })[] })[]>;
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  updateOrderPayment(id: string, paymentStatus: string, razorpayOrderId?: string): Promise<Order | undefined>;

  // Vendors
  getAllVendors(): Promise<(Vendor & { shop?: Shop })[]>;
  getVendorByEmail(email: string): Promise<Vendor | undefined>;
  getVendorByShopId(shopId: string): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: string, vendor: Partial<InsertVendor>): Promise<Vendor | undefined>;
  deleteVendor(id: string): Promise<void>;

  // Banners
  getAllBanners(): Promise<(Banner & { coupon?: Coupon })[]>;
  getActiveBanners(): Promise<(Banner & { coupon?: Coupon & { shop?: Shop } })[]>;
  createBanner(banner: InsertBanner): Promise<Banner>;
  updateBanner(id: string, banner: Partial<InsertBanner>): Promise<Banner | undefined>;
  deleteBanner(id: string): Promise<void>;

  // Search
  search(query: string): Promise<{ shops: (Shop & { category?: Category })[]; products: (Product & { shop?: Shop })[]; coupons: (Coupon & { shop?: Shop })[] }>;

  // Stats
  getStats(): Promise<{ users: number; categories: number; shops: number; products: number; orders: number; coupons: number; vendors: number }>;
  getRecentOrders(): Promise<(Order & { user?: User })[]>;
  getTopShops(): Promise<Shop[]>;
  getTopCoupons(): Promise<(Coupon & { shop?: Shop })[]>;

  // Offline Coupons
  getOfflineCoupons(): Promise<(OfflineCoupon & { shop?: Shop; claimed_count: number; remaining: number })[]>;
  getOfflineCoupon(id: string): Promise<OfflineCoupon | undefined>;
  createOfflineCoupon(data: InsertOfflineCoupon): Promise<OfflineCoupon>;
  updateOfflineCoupon(id: string, data: Partial<InsertOfflineCoupon>): Promise<OfflineCoupon | undefined>;
  deleteOfflineCoupon(id: string): Promise<void>;
  getOfflineCouponCodes(offlineCouponId: string): Promise<OfflineCouponCode[]>;
  createOfflineCouponCodes(offlineCouponId: string, codes: string[]): Promise<OfflineCouponCode[]>;
  claimOfflineCouponCode(offlineCouponId: string, userId: string): Promise<{ code: OfflineCouponCode; remaining: number } | null>;
  getUserClaimedCode(offlineCouponId: string, userId: string): Promise<OfflineCouponCode | undefined>;
  getUserOfflineCoupons(userId: string): Promise<any[]>;
  markOfflineCouponCodeUsed(codeId: string, userId: string): Promise<OfflineCouponCode | undefined>;
  getOfflineCouponsByShop(shopId: string): Promise<(OfflineCoupon & { claimed_count: number; remaining: number })[]>;

  // Site Settings
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
  getAllSettings(): Promise<Record<string, string>>;

  // Contests
  getAllContests(): Promise<(Contest & { shop?: Shop; slots: ContestSlot[]; attached_coupon?: Coupon })[]>;
  getContest(id: string): Promise<(Contest & { shop?: Shop; slots: ContestSlot[]; attached_coupon?: Coupon }) | undefined>;
  getContestsByShop(shopId: string): Promise<(Contest & { slots: ContestSlot[] })[]>;
  createContest(data: InsertContest): Promise<Contest>;
  updateContest(id: string, data: Partial<InsertContest>): Promise<Contest | undefined>;
  deleteContest(id: string): Promise<void>;
  joinContest(contestId: string, slotNumber: number, userId: string, userName: string, userEmail?: string): Promise<ContestSlot>;
  drawWinner(contestId: string): Promise<Contest | undefined>;
  getUserContestSlot(contestId: string, userId: string): Promise<ContestSlot | undefined>;

  // Notifications
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(data: { user_id: string; type: string; title: string; message?: string; data?: string }): Promise<Notification>;
  markNotificationRead(id: string, userId: string): Promise<void>;
  getUnreadCount(userId: string): Promise<number>;

  // User Coupons
  getUserCoupons(userId: string): Promise<(UserCoupon & { coupon?: any; contest?: any })[]>;
  getUserCoupon(id: string): Promise<UserCoupon | undefined>;
  getCoupon(id: string): Promise<Coupon | undefined>;
  createUserCoupon(data: { user_id: string; coupon_id: string; contest_id: string }): Promise<UserCoupon>;
  claimUserCoupon(id: string, userId: string): Promise<UserCoupon | undefined>;
  saveUserCoupon(userId: string, couponId: string): Promise<{ userCoupon: UserCoupon; alreadySaved: boolean }>;
  unsaveAllUsersForCoupon(couponId: string): Promise<void>;

  // Auto contest check
  getExpiredOpenContests(): Promise<Contest[]>;
}

export class PgStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: string, data: Partial<Pick<User, "name" | "phone" | "address">>): Promise<User | undefined> {
    const result = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.created_at));
  }

  async getAllCategories(): Promise<Category[]> {
    return db.select().from(categories).orderBy(categories.name);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return result[0];
  }

  async createCategory(cat: InsertCategory): Promise<Category> {
    const result = await db.insert(categories).values(cat).returning();
    return result[0];
  }

  async updateCategory(id: string, cat: Partial<InsertCategory>): Promise<Category | undefined> {
    const result = await db.update(categories).set(cat).where(eq(categories.id, id)).returning();
    return result[0];
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getTopCategories(): Promise<Category[]> {
    return db.select().from(categories).where(eq(categories.is_top, true)).orderBy(categories.name);
  }

  async toggleTopCategory(id: string): Promise<Category | undefined> {
    const current = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    if (!current[0]) return undefined;
    const result = await db.update(categories).set({ is_top: !current[0].is_top }).where(eq(categories.id, id)).returning();
    return result[0];
  }

  async getAllShops(categoryId?: string): Promise<(Shop & { category?: Category })[]> {
    const allShops = await db.select().from(shops)
      .leftJoin(categories, eq(shops.category_id, categories.id))
      .orderBy(desc(shops.is_premium), desc(shops.featured), desc(shops.created_at));
    const mapped = allShops.map(r => ({ ...r.shops, category: r.categories || undefined }));
    if (categoryId) return mapped.filter(s => s.category_id === categoryId);
    return mapped;
  }

  async getShop(id: string): Promise<(Shop & { category?: Category }) | undefined> {
    const result = await db.select().from(shops)
      .leftJoin(categories, eq(shops.category_id, categories.id))
      .where(eq(shops.id, id)).limit(1);
    if (!result[0]) return undefined;
    return { ...result[0].shops, category: result[0].categories || undefined };
  }

  async createShop(shop: InsertShop): Promise<Shop> {
    const result = await db.insert(shops).values(shop).returning();
    return result[0];
  }

  async updateShop(id: string, shop: Partial<InsertShop>): Promise<Shop | undefined> {
    const result = await db.update(shops).set(shop).where(eq(shops.id, id)).returning();
    return result[0];
  }

  async deleteShop(id: string): Promise<void> {
    await db.delete(shops).where(eq(shops.id, id));
  }

  async getFeaturedShops(): Promise<(Shop & { category?: Category })[]> {
    const result = await db.select().from(shops)
      .leftJoin(categories, eq(shops.category_id, categories.id))
      .where(eq(shops.featured, true))
      .orderBy(desc(shops.is_premium), desc(shops.created_at))
      .limit(20);
    return result.map(r => ({ ...r.shops, category: r.categories || undefined }));
  }

  async getAllProducts(shopId?: string): Promise<(Product & { shop?: Shop })[]> {
    const result = await db.select().from(products)
      .leftJoin(shops, eq(products.shop_id, shops.id))
      .orderBy(desc(products.created_at));
    const mapped = result.map(r => ({ ...r.products, shop: r.shops || undefined }));
    if (shopId) return mapped.filter(p => p.shop_id === shopId);
    return mapped;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return result[0];
  }

  async getProductsByShop(shopId: string): Promise<Product[]> {
    return db.select().from(products).where(eq(products.shop_id, shopId));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const result = await db.insert(products).values(product).returning();
    return result[0];
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const result = await db.update(products).set(product).where(eq(products.id, id)).returning();
    return result[0];
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async getAllCoupons(shopId?: string): Promise<(Coupon & { shop?: Shop })[]> {
    const result = await db.select().from(coupons)
      .leftJoin(shops, eq(coupons.shop_id, shops.id))
      .orderBy(desc(coupons.created_at));
    const mapped = result.map(r => ({ ...r.coupons, shop: r.shops || undefined }));
    if (shopId) return mapped.filter(c => c.shop_id === shopId);
    return mapped;
  }

  async getCouponByCode(code: string, shopId?: string): Promise<Coupon | undefined> {
    const conditions = [eq(coupons.code, code), eq(coupons.is_active, true)];
    if (shopId) conditions.push(eq(coupons.shop_id, shopId));
    const result = await db.select().from(coupons).where(and(...conditions)).limit(1);
    return result[0];
  }

  async getCouponsByShop(shopId: string): Promise<Coupon[]> {
    return db.select().from(coupons).where(and(eq(coupons.shop_id, shopId), eq(coupons.is_active, true)));
  }

  async createCoupon(coupon: InsertCoupon): Promise<Coupon> {
    const result = await db.insert(coupons).values(coupon).returning();
    return result[0];
  }

  async updateCoupon(id: string, coupon: Partial<InsertCoupon>): Promise<Coupon | undefined> {
    const result = await db.update(coupons).set(coupon).where(eq(coupons.id, id)).returning();
    return result[0];
  }

  async incrementCouponUsage(code: string, shopId: string): Promise<void> {
    const result = await db.update(coupons)
      .set({ usage_count: sql`${coupons.usage_count} + 1` })
      .where(and(eq(coupons.code, code), eq(coupons.shop_id, shopId)))
      .returning();
    
    const coupon = result[0];
    if (coupon && coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      await this.unsaveAllUsersForCoupon(coupon.id);
    }
  }

  async unsaveAllUsersForCoupon(couponId: string): Promise<void> {
    await db.delete(userCoupons).where(eq(userCoupons.coupon_id, couponId));
  }

  async deleteCoupon(id: string): Promise<void> {
    await db.delete(couponProducts).where(eq(couponProducts.coupon_id, id));
    await db.delete(coupons).where(eq(coupons.id, id));
  }

  async getActiveCoupons(): Promise<(Coupon & { shop?: Shop })[]> {
    const result = await db.select().from(coupons)
      .leftJoin(shops, eq(coupons.shop_id, shops.id))
      .where(eq(coupons.is_active, true))
      .orderBy(desc(coupons.featured), desc(coupons.created_at))
      .limit(60);
    return result.map(r => ({ ...r.coupons, shop: r.shops || undefined }));
  }

  async getCouponProducts(couponId: string): Promise<(CouponProduct & { product?: Product })[]> {
    const result = await db.select().from(couponProducts)
      .leftJoin(products, eq(couponProducts.product_id, products.id))
      .where(eq(couponProducts.coupon_id, couponId));
    return result.map(r => ({ ...r.coupon_products, product: r.products || undefined }));
  }

  async setCouponProducts(couponId: string, items: { product_id: string; custom_price: string; quantity?: number }[]): Promise<void> {
    await db.delete(couponProducts).where(eq(couponProducts.coupon_id, couponId));
    if (items.length > 0) {
      await db.insert(couponProducts).values(items.map(i => ({
        coupon_id: couponId,
        product_id: i.product_id,
        custom_price: i.custom_price,
        quantity: i.quantity || 1,
      })));
    }
  }

  async getAllOrders(): Promise<(Order & { user?: User })[]> {
    const result = await db.select().from(orders)
      .leftJoin(users, eq(orders.user_id, users.id))
      .orderBy(desc(orders.created_at));
    return result.map(r => ({ ...r.orders, user: r.users || undefined }));
  }

  async getUserOrders(userId: string): Promise<(Order & { items: (OrderItem & { product?: Product })[] })[]> {
    const userOrders = await db.select().from(orders)
      .where(eq(orders.user_id, userId))
      .orderBy(desc(orders.created_at));
    const result = await Promise.all(userOrders.map(async (o) => {
      const items = await db.select().from(orderItems)
        .leftJoin(products, eq(orderItems.product_id, products.id))
        .where(eq(orderItems.order_id, o.id));
      return { ...o, items: items.map(r => ({ ...r.order_items, product: r.products || undefined })) };
    }));
    return result;
  }

  async getOrder(id: string): Promise<(Order & { user?: User; items: (OrderItem & { product?: Product })[] }) | undefined> {
    const result = await db.select().from(orders)
      .leftJoin(users, eq(orders.user_id, users.id))
      .where(eq(orders.id, id)).limit(1);
    if (!result[0]) return undefined;
    const order = result[0];
    const items = await db.select().from(orderItems)
      .leftJoin(products, eq(orderItems.product_id, products.id))
      .where(eq(orderItems.order_id, id));
    return {
      ...order.orders,
      user: order.users || undefined,
      items: items.map(r => ({ ...r.order_items, product: r.products || undefined }))
    };
  }

  async getShopOrders(shopId: string): Promise<(Order & { user?: User; items: (OrderItem & { product?: Product })[] })[]> {
    const shopOrders = await db.select().from(orders)
      .leftJoin(users, eq(orders.user_id, users.id))
      .where(eq(orders.shop_id, shopId))
      .orderBy(desc(orders.created_at));
    return Promise.all(shopOrders.map(async (r) => {
      const items = await db.select().from(orderItems)
        .leftJoin(products, eq(orderItems.product_id, products.id))
        .where(eq(orderItems.order_id, r.orders.id));
      return {
        ...r.orders,
        user: r.users || undefined,
        items: items.map(i => ({ ...i.order_items, product: i.products || undefined }))
      };
    }));
  }

  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    const result = await db.insert(orders).values(order).returning();
    const created = result[0];
    await db.insert(orderItems).values(items.map(i => ({ ...i, order_id: created.id })));
    return created;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const result = await db.update(orders).set({ status: status as any }).where(eq(orders.id, id)).returning();
    return result[0];
  }

  async updateOrderPayment(id: string, paymentStatus: string, razorpayOrderId?: string): Promise<Order | undefined> {
    const update: any = { payment_status: paymentStatus };
    if (razorpayOrderId) update.razorpay_order_id = razorpayOrderId;
    if (paymentStatus === "paid") update.status = "confirmed";
    const result = await db.update(orders).set(update).where(eq(orders.id, id)).returning();
    return result[0];
  }

  async getAllBanners(): Promise<(Banner & { coupon?: Coupon })[]> {
    const result = await db.select().from(banners)
      .leftJoin(coupons, eq(banners.coupon_id, coupons.id))
      .orderBy(banners.sort_order, desc(banners.created_at));
    return result.map(r => ({ ...r.banners, coupon: r.coupons || undefined }));
  }

  async getActiveBanners(): Promise<(Banner & { coupon?: Coupon & { shop?: Shop } })[]> {
    const result = await db.select().from(banners)
      .leftJoin(coupons, eq(banners.coupon_id, coupons.id))
      .leftJoin(shops, eq(coupons.shop_id, shops.id))
      .where(eq(banners.is_active, true))
      .orderBy(banners.sort_order, desc(banners.created_at));
    return result.map(r => ({
      ...r.banners,
      coupon: r.coupons ? { ...r.coupons, shop: r.shops || undefined } : undefined,
    }));
  }

  async getAllVendors(): Promise<(Vendor & { shop?: Shop })[]> {
    const result = await db.select().from(vendors).leftJoin(shops, eq(vendors.shop_id, shops.id)).orderBy(desc(vendors.created_at));
    return result.map(r => ({ ...r.vendors, shop: r.shops || undefined }));
  }

  async getVendorByEmail(email: string): Promise<Vendor | undefined> {
    const result = await db.select().from(vendors).where(eq(vendors.email, email)).limit(1);
    return result[0];
  }

  async getVendorByShopId(shopId: string): Promise<Vendor | undefined> {
    const result = await db.select().from(vendors).where(eq(vendors.shop_id, shopId)).limit(1);
    return result[0];
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const result = await db.insert(vendors).values(vendor).returning();
    return result[0];
  }

  async updateVendor(id: string, vendor: Partial<InsertVendor>): Promise<Vendor | undefined> {
    const result = await db.update(vendors).set(vendor).where(eq(vendors.id, id)).returning();
    return result[0];
  }

  async deleteVendor(id: string): Promise<void> {
    await db.delete(vendors).where(eq(vendors.id, id));
  }

  async createBanner(banner: InsertBanner): Promise<Banner> {
    const result = await db.insert(banners).values(banner).returning();
    return result[0];
  }

  async updateBanner(id: string, banner: Partial<InsertBanner>): Promise<Banner | undefined> {
    const result = await db.update(banners).set(banner).where(eq(banners.id, id)).returning();
    return result[0];
  }

  async deleteBanner(id: string): Promise<void> {
    await db.delete(banners).where(eq(banners.id, id));
  }

  async getStats(): Promise<{ users: number; categories: number; shops: number; products: number; orders: number; coupons: number; vendors: number }> {
    const [u, c, s, p, o, cp, v] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ count: sql<number>`count(*)` }).from(categories),
      db.select({ count: sql<number>`count(*)` }).from(shops),
      db.select({ count: sql<number>`count(*)` }).from(products),
      db.select({ count: sql<number>`count(*)` }).from(orders),
      db.select({ count: sql<number>`count(*)` }).from(coupons),
      db.select({ count: sql<number>`count(*)` }).from(vendors),
    ]);
    return {
      users: Number(u[0].count),
      categories: Number(c[0].count),
      shops: Number(s[0].count),
      products: Number(p[0].count),
      orders: Number(o[0].count),
      coupons: Number(cp[0].count),
      vendors: Number(v[0].count),
    };
  }

  async getRecentOrders(): Promise<(Order & { user?: User })[]> {
    const result = await db.select().from(orders)
      .leftJoin(users, eq(orders.user_id, users.id))
      .orderBy(desc(orders.created_at))
      .limit(5);
    return result.map(r => ({ ...r.orders, user: r.users || undefined }));
  }

  async getTopShops(): Promise<Shop[]> {
    const result = await db.select().from(shops)
      .leftJoin(categories, eq(shops.category_id, categories.id))
      .where(eq(shops.is_top, true))
      .orderBy(desc(shops.is_premium), desc(shops.created_at));
    return result.map(r => ({ ...r.shops, category: r.categories || undefined }));
  }

  async toggleTopShop(id: string): Promise<Shop | undefined> {
    const current = await db.select().from(shops).where(eq(shops.id, id)).limit(1);
    if (!current[0]) return undefined;
    const result = await db.update(shops).set({ is_top: !current[0].is_top }).where(eq(shops.id, id)).returning();
    return result[0];
  }

  async getTopCoupons(): Promise<(Coupon & { shop?: Shop })[]> {
    const result = await db.select().from(coupons)
      .leftJoin(shops, eq(coupons.shop_id, shops.id))
      .where(and(eq(coupons.is_active, true), eq(coupons.featured, true)))
      .orderBy(desc(coupons.created_at))
      .limit(6);
    return result.map(r => ({ ...r.coupons, shop: r.shops || undefined }));
  }

  async search(query: string): Promise<{ shops: (Shop & { category?: Category })[]; products: (Product & { shop?: Shop })[]; coupons: (Coupon & { shop?: Shop })[] }> {
    const cleanQuery = query.replace(/\s+/g, "").toLowerCase();
    const q = `%${query}%`;
    const cq = `%${cleanQuery}%`;

    const [shopRows, productRows, couponRows] = await Promise.all([
      db.select().from(shops).leftJoin(categories, eq(shops.category_id, categories.id))
        .where(or(
          ilike(shops.name, q),
          ilike(shops.description, q),
          sql`replace(${shops.name}, ' ', '') ilike ${cq}`
        )).limit(8),
      db.select().from(products).leftJoin(shops, eq(products.shop_id, shops.id))
        .where(or(
          ilike(products.name, q),
          ilike(products.description, q),
          sql`replace(${products.name}, ' ', '') ilike ${cq}`
        )).limit(8),
      db.select().from(coupons).leftJoin(shops, eq(coupons.shop_id, shops.id))
        .where(and(
          eq(coupons.is_active, true),
          or(
            ilike(coupons.code, q),
            sql`replace(${coupons.code}, ' ', '') ilike ${cq}`
          )
        )).limit(8),
    ]);
    return {
      shops: shopRows.map(r => ({ ...r.shops, category: r.categories || undefined })),
      products: productRows.map(r => ({ ...r.products, shop: r.shops || undefined })),
      coupons: couponRows.map(r => ({ ...r.coupons, shop: r.shops || undefined })),
    };
  }

  // ─── Offline Coupons ────────────────────────────────────────────────────────
  async getOfflineCoupons(): Promise<(OfflineCoupon & { shop?: Shop; claimed_count: number; remaining: number })[]> {
    const rows = await db.select().from(offlineCoupons)
      .leftJoin(shops, eq(offlineCoupons.shop_id, shops.id))
      .orderBy(desc(offlineCoupons.created_at));
    const result = await Promise.all(rows.map(async r => {
      const codes = await db.select().from(offlineCouponCodes)
        .where(eq(offlineCouponCodes.offline_coupon_id, r.offline_coupons.id));
      const claimed_count = codes.filter(c => c.claimed_by_user_id).length;
      const remaining = codes.filter(c => !c.claimed_by_user_id).length;
      return { ...r.offline_coupons, shop: r.shops || undefined, claimed_count, remaining };
    }));
    return result;
  }

  async getOfflineCoupon(id: string): Promise<OfflineCoupon | undefined> {
    const result = await db.select().from(offlineCoupons).where(eq(offlineCoupons.id, id)).limit(1);
    return result[0];
  }

  async createOfflineCoupon(data: InsertOfflineCoupon): Promise<OfflineCoupon> {
    const result = await db.insert(offlineCoupons).values(data).returning();
    return result[0];
  }

  async updateOfflineCoupon(id: string, data: Partial<InsertOfflineCoupon>): Promise<OfflineCoupon | undefined> {
    const result = await db.update(offlineCoupons).set(data).where(eq(offlineCoupons.id, id)).returning();
    return result[0];
  }

  async deleteOfflineCoupon(id: string): Promise<void> {
    await db.delete(offlineCouponCodes).where(eq(offlineCouponCodes.offline_coupon_id, id));
    await db.delete(offlineCoupons).where(eq(offlineCoupons.id, id));
  }

  async getOfflineCouponCodes(offlineCouponId: string): Promise<OfflineCouponCode[]> {
    return db.select().from(offlineCouponCodes).where(eq(offlineCouponCodes.offline_coupon_id, offlineCouponId));
  }

  async createOfflineCouponCodes(offlineCouponId: string, codes: string[]): Promise<OfflineCouponCode[]> {
    const rows = codes.map(code => ({ offline_coupon_id: offlineCouponId, code }));
    return db.insert(offlineCouponCodes).values(rows).returning();
  }

  async claimOfflineCouponCode(offlineCouponId: string, userId: string): Promise<{ code: OfflineCouponCode; remaining: number } | null> {
    const existing = await this.getUserClaimedCode(offlineCouponId, userId);
    if (existing) {
      const all = await this.getOfflineCouponCodes(offlineCouponId);
      const remaining = all.filter(c => !c.claimed_by_user_id).length;
      return { code: existing, remaining };
    }
    const available = await db.select().from(offlineCouponCodes)
      .where(and(
        eq(offlineCouponCodes.offline_coupon_id, offlineCouponId),
        sql`${offlineCouponCodes.claimed_by_user_id} IS NULL`
      ))
      .limit(1);
    if (!available[0]) return null;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const claimed = await db.update(offlineCouponCodes)
      .set({ claimed_by_user_id: userId, claimed_at: sql`now()`, expires_at: expiresAt })
      .where(eq(offlineCouponCodes.id, available[0].id))
      .returning();
    const all = await this.getOfflineCouponCodes(offlineCouponId);
    const remaining = all.filter(c => !c.claimed_by_user_id).length;
    return { code: claimed[0], remaining };
  }

  async getUserClaimedCode(offlineCouponId: string, userId: string): Promise<OfflineCouponCode | undefined> {
    const result = await db.select().from(offlineCouponCodes)
      .where(and(
        eq(offlineCouponCodes.offline_coupon_id, offlineCouponId),
        eq(offlineCouponCodes.claimed_by_user_id, userId)
      ))
      .limit(1);
    return result[0];
  }

  async getUserOfflineCoupons(userId: string): Promise<any[]> {
    const rows = await db.select().from(offlineCouponCodes)
      .where(eq(offlineCouponCodes.claimed_by_user_id, userId))
      .orderBy(desc(offlineCouponCodes.claimed_at));
    const result: any[] = [];
    for (const row of rows) {
      const oc = row.offline_coupon_id ? await this.getOfflineCoupon(row.offline_coupon_id) : null;
      let shop = null;
      if (oc?.shop_id) shop = await this.getShop(oc.shop_id);
      result.push({ ...row, campaign: oc ? { ...oc, shop } : null });
    }
    return result;
  }

  async markOfflineCouponCodeUsed(codeId: string, userId: string): Promise<OfflineCouponCode | undefined> {
    const rows = await db.select().from(offlineCouponCodes).where(eq(offlineCouponCodes.id, codeId)).limit(1);
    if (!rows[0] || rows[0].claimed_by_user_id !== userId) throw new Error("Not authorized");
    const updated = await db.update(offlineCouponCodes)
      .set({ used_at: sql`now()` })
      .where(eq(offlineCouponCodes.id, codeId))
      .returning();
    return updated[0];
  }

  async getOfflineCouponsByShop(shopId: string): Promise<(OfflineCoupon & { claimed_count: number; remaining: number })[]> {
    const all = await db.select().from(offlineCoupons).where(eq(offlineCoupons.shop_id, shopId));
    const result: any[] = [];
    for (const oc of all) {
      const codes = await this.getOfflineCouponCodes(oc.id);
      const claimed_count = codes.filter(c => c.claimed_by_user_id).length;
      const remaining = codes.filter(c => !c.claimed_by_user_id).length;
      result.push({ ...oc, claimed_count, remaining });
    }
    return result;
  }

  async getSetting(key: string): Promise<string | null> {
    const result = await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.key, key)).limit(1);
    return result[0]?.value ?? null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await db.insert(schema.siteSettings).values({ key, value })
      .onConflictDoUpdate({ target: schema.siteSettings.key, set: { value } });
  }

  async getAllSettings(): Promise<Record<string, string>> {
    const rows = await db.select().from(schema.siteSettings);
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  }

  async getAllContests(): Promise<(Contest & { shop?: Shop; slots: ContestSlot[]; attached_coupon?: Coupon })[]> {
    const allContests = await db.select().from(contests).orderBy(desc(contests.created_at));
    const result: any[] = [];
    for (const c of allContests) {
      const shop = c.shop_id ? (await db.select().from(shops).where(eq(shops.id, c.shop_id)).limit(1))[0] : undefined;
      const slots = await db.select().from(contestSlots).where(eq(contestSlots.contest_id, c.id)).orderBy(contestSlots.slot_number);
      const attached_coupon = c.attached_coupon_id ? (await db.select().from(coupons).where(eq(coupons.id, c.attached_coupon_id)).limit(1))[0] : undefined;
      result.push({ ...c, shop, slots, attached_coupon });
    }
    return result;
  }

  async getContest(id: string): Promise<(Contest & { shop?: Shop; slots: ContestSlot[]; attached_coupon?: Coupon }) | undefined> {
    const rows = await db.select().from(contests).where(eq(contests.id, id)).limit(1);
    if (!rows[0]) return undefined;
    const c = rows[0];
    const shop = c.shop_id ? (await db.select().from(shops).where(eq(shops.id, c.shop_id)).limit(1))[0] : undefined;
    const slots = await db.select().from(contestSlots).where(eq(contestSlots.contest_id, c.id)).orderBy(contestSlots.slot_number);
    const attached_coupon = c.attached_coupon_id ? (await db.select().from(coupons).where(eq(coupons.id, c.attached_coupon_id)).limit(1))[0] : undefined;
    return { ...c, shop, slots, attached_coupon };
  }

  async getContestsByShop(shopId: string): Promise<(Contest & { slots: ContestSlot[] })[]> {
    const allContests = await db.select().from(contests).where(eq(contests.shop_id, shopId)).orderBy(desc(contests.created_at));
    const result: any[] = [];
    for (const c of allContests) {
      const slots = await db.select().from(contestSlots).where(eq(contestSlots.contest_id, c.id)).orderBy(contestSlots.slot_number);
      result.push({ ...c, slots });
    }
    return result;
  }

  async createContest(data: InsertContest): Promise<Contest> {
    const rows = await db.insert(contests).values(data).returning();
    return rows[0];
  }

  async updateContest(id: string, data: Partial<InsertContest>): Promise<Contest | undefined> {
    const rows = await db.update(contests).set(data).where(eq(contests.id, id)).returning();
    return rows[0];
  }

  async deleteContest(id: string): Promise<void> {
    await db.delete(contestSlots).where(eq(contestSlots.contest_id, id));
    await db.delete(contests).where(eq(contests.id, id));
  }

  async joinContest(contestId: string, slotNumber: number, userId: string, userName: string, userEmail?: string): Promise<ContestSlot> {
    const existing = await db.select().from(contestSlots).where(
      and(eq(contestSlots.contest_id, contestId), eq(contestSlots.slot_number, slotNumber))
    ).limit(1);
    if (existing[0]) throw new Error("Slot already taken");
    const userSlot = await db.select().from(contestSlots).where(
      and(eq(contestSlots.contest_id, contestId), eq(contestSlots.user_id, userId))
    ).limit(1);
    if (userSlot[0]) throw new Error("Already joined this contest");
    const rows = await db.insert(contestSlots).values({ contest_id: contestId, slot_number: slotNumber, user_id: userId, user_name: userName, user_email: userEmail }).returning();
    return rows[0];
  }

  async drawWinner(contestId: string): Promise<Contest | undefined> {
    const slots = await db.select().from(contestSlots).where(eq(contestSlots.contest_id, contestId));
    if (slots.length === 0) throw new Error("No participants yet");
    const winner = slots[Math.floor(Math.random() * slots.length)];
    const rows = await db.update(contests).set({
      status: "completed",
      winner_slot_number: winner.slot_number,
      winner_user_id: winner.user_id,
      winner_user_name: winner.user_name,
    }).where(eq(contests.id, contestId)).returning();
    return rows[0];
  }

  async getUserContestSlot(contestId: string, userId: string): Promise<ContestSlot | undefined> {
    const rows = await db.select().from(contestSlots).where(
      and(eq(contestSlots.contest_id, contestId), eq(contestSlots.user_id, userId))
    ).limit(1);
    return rows[0];
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.user_id, userId)).orderBy(desc(notifications.created_at)).limit(50);
  }

  async createNotification(data: { user_id: string; type: string; title: string; message?: string; data?: string }): Promise<Notification> {
    const rows = await db.insert(notifications).values(data).returning();
    return rows[0];
  }

  async markNotificationRead(id: string, userId: string): Promise<void> {
    await db.update(notifications).set({ is_read: true }).where(and(eq(notifications.id, id), eq(notifications.user_id, userId)));
  }

  async getUnreadCount(userId: string): Promise<number> {
    const rows = await db.select({ count: sql<number>`count(*)` }).from(notifications)
      .where(and(eq(notifications.user_id, userId), eq(notifications.is_read, false)));
    return Number(rows[0]?.count || 0);
  }

  async getUserCoupons(userId: string): Promise<(UserCoupon & { coupon?: any; contest?: any })[]> {
    const ucs = await db.select().from(userCoupons).where(eq(userCoupons.user_id, userId)).orderBy(desc(userCoupons.created_at));
    const results = [];
    for (const uc of ucs) {
      let coupon = null, contest = null;
      if (uc.coupon_id) {
        const c = await db.select().from(coupons).where(eq(coupons.id, uc.coupon_id)).limit(1);
        if (c[0]) {
          coupon = c[0];
          if (coupon.shop_id) {
            const s = await db.select().from(shops).where(eq(shops.id, coupon.shop_id)).limit(1);
            coupon = { ...coupon, shop: s[0] || null };
          }
        }
      }
      if (uc.contest_id) {
        const ct = await db.select().from(contests).where(eq(contests.id, uc.contest_id)).limit(1);
        contest = ct[0] || null;
      }
      results.push({ ...uc, coupon, contest });
    }
    return results;
  }

  async getUserCoupon(id: string): Promise<UserCoupon | undefined> {
    const rows = await db.select().from(userCoupons).where(eq(userCoupons.id, id)).limit(1);
    return rows[0];
  }

  async saveUserCoupon(userId: string, couponId: string): Promise<{ userCoupon: UserCoupon; alreadySaved: boolean }> {
    const existing = await db.select().from(userCoupons)
      .where(sql`${userCoupons.user_id} = ${userId} AND ${userCoupons.coupon_id} = ${couponId}`)
      .limit(1);
    if (existing[0]) return { userCoupon: existing[0], alreadySaved: true };
    const inserted = await db.insert(userCoupons)
      .values({ user_id: userId, coupon_id: couponId, contest_id: null } as any)
      .returning();
    return { userCoupon: inserted[0], alreadySaved: false };
  }

  async getCoupon(id: string): Promise<Coupon | undefined> {
    const rows = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
    return rows[0];
  }

  async createUserCoupon(data: { user_id: string; coupon_id: string; contest_id: string }): Promise<UserCoupon> {
    const rows = await db.insert(userCoupons).values(data).returning();
    return rows[0];
  }

  async claimUserCoupon(id: string, userId: string): Promise<UserCoupon | undefined> {
    const rows = await db.update(userCoupons)
      .set({ is_claimed: true, claimed_at: new Date() })
      .where(and(eq(userCoupons.id, id), eq(userCoupons.user_id, userId)))
      .returning();
    return rows[0];
  }

  async getExpiredOpenContests(): Promise<Contest[]> {
    return db.select().from(contests).where(
      and(
        eq(contests.status, "open"),
        sql`${contests.end_time} IS NOT NULL AND ${contests.end_time} <= NOW()`
      )
    );
  }
}

export const storage = new PgStorage();
