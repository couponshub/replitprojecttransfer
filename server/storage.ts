import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and, desc, sql, ilike } from "drizzle-orm";
import * as schema from "@shared/schema";
import {
  type User, type InsertUser,
  type Category, type InsertCategory,
  type Shop, type InsertShop,
  type Product, type InsertProduct,
  type Coupon, type InsertCoupon,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
  users, categories, shops, products, coupons, orders, orderItems
} from "@shared/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Categories
  getAllCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(cat: InsertCategory): Promise<Category>;
  updateCategory(id: string, cat: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<void>;

  // Shops
  getAllShops(categoryId?: string): Promise<(Shop & { category?: Category })[]>;
  getShop(id: string): Promise<(Shop & { category?: Category }) | undefined>;
  createShop(shop: InsertShop): Promise<Shop>;
  updateShop(id: string, shop: Partial<InsertShop>): Promise<Shop | undefined>;
  deleteShop(id: string): Promise<void>;
  getFeaturedShops(): Promise<(Shop & { category?: Category })[]>;

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
  deleteCoupon(id: string): Promise<void>;
  getActiveCoupons(): Promise<(Coupon & { shop?: Shop })[]>;

  // Orders
  getAllOrders(): Promise<(Order & { user?: User })[]>;
  getUserOrders(userId: string): Promise<Order[]>;
  getOrder(id: string): Promise<(Order & { items: (OrderItem & { product?: Product })[] }) | undefined>;
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;

  // Stats
  getStats(): Promise<{ users: number; categories: number; shops: number; products: number; orders: number }>;
  getRecentOrders(): Promise<(Order & { user?: User })[]>;
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

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
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
      .orderBy(desc(shops.is_premium))
      .limit(6);
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

  async deleteCoupon(id: string): Promise<void> {
    await db.delete(coupons).where(eq(coupons.id, id));
  }

  async getActiveCoupons(): Promise<(Coupon & { shop?: Shop })[]> {
    const result = await db.select().from(coupons)
      .leftJoin(shops, eq(coupons.shop_id, shops.id))
      .where(eq(coupons.is_active, true))
      .orderBy(desc(coupons.created_at))
      .limit(10);
    return result.map(r => ({ ...r.coupons, shop: r.shops || undefined }));
  }

  async getAllOrders(): Promise<(Order & { user?: User })[]> {
    const result = await db.select().from(orders)
      .leftJoin(users, eq(orders.user_id, users.id))
      .orderBy(desc(orders.created_at));
    return result.map(r => ({ ...r.orders, user: r.users || undefined }));
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    return db.select().from(orders)
      .where(eq(orders.user_id, userId))
      .orderBy(desc(orders.created_at));
  }

  async getOrder(id: string): Promise<(Order & { items: (OrderItem & { product?: Product })[] }) | undefined> {
    const order = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order[0]) return undefined;
    const items = await db.select().from(orderItems)
      .leftJoin(products, eq(orderItems.product_id, products.id))
      .where(eq(orderItems.order_id, id));
    return {
      ...order[0],
      items: items.map(r => ({ ...r.order_items, product: r.products || undefined }))
    };
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

  async getStats(): Promise<{ users: number; categories: number; shops: number; products: number; orders: number }> {
    const [u, c, s, p, o] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ count: sql<number>`count(*)` }).from(categories),
      db.select({ count: sql<number>`count(*)` }).from(shops),
      db.select({ count: sql<number>`count(*)` }).from(products),
      db.select({ count: sql<number>`count(*)` }).from(orders),
    ]);
    return {
      users: Number(u[0].count),
      categories: Number(c[0].count),
      shops: Number(s[0].count),
      products: Number(p[0].count),
      orders: Number(o[0].count),
    };
  }

  async getRecentOrders(): Promise<(Order & { user?: User })[]> {
    const result = await db.select().from(orders)
      .leftJoin(users, eq(orders.user_id, users.id))
      .orderBy(desc(orders.created_at))
      .limit(5);
    return result.map(r => ({ ...r.orders, user: r.users || undefined }));
  }
}

export const storage = new PgStorage();
