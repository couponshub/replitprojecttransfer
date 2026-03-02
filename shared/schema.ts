import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, numeric, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum("role", ["admin", "user"]);
export const couponTypeEnum = pgEnum("coupon_type", ["percentage", "flat", "free_item", "bundle", "flash", "bogo"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "confirmed", "completed"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  address: text("address"),
  password: text("password").notNull(),
  role: roleEnum("role").notNull().default("user"),
  created_at: timestamp("created_at").notNull().default(sql`now()`),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  image: text("image"),
  banner: text("banner"),
  is_top: boolean("is_top").notNull().default(false),
  created_at: timestamp("created_at").notNull().default(sql`now()`),
});

export const shops = pgTable("shops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  banner_image: text("banner_image"),
  banners: text("banners").array(),
  logo: text("logo"),
  address: text("address"),
  whatsapp_number: text("whatsapp_number"),
  map_link: text("map_link"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  website_link: text("website_link"),
  payment_id: text("payment_id"),
  payment_qr: text("payment_qr"),
  category_id: varchar("category_id").references(() => categories.id),
  is_premium: boolean("is_premium").notNull().default(false),
  commission_percentage: numeric("commission_percentage", { precision: 5, scale: 2 }).default("0"),
  subscription_active: boolean("subscription_active").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
  is_top: boolean("is_top").notNull().default(false),
  listing_type: text("listing_type").notNull().default("both"),
  business_hours: text("business_hours"),
  show_on_radar: boolean("show_on_radar").notNull().default(true),
  marker_color: text("marker_color"),
  created_at: timestamp("created_at").notNull().default(sql`now()`),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shop_id: varchar("shop_id").references(() => shops.id),
  type: text("type").notNull().default("product"),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }),
  images: text("images").array(),
  image: text("image"),
  sub_category: text("sub_category"),
  grams: text("grams"),
  quantity: text("quantity"),
  size: text("size"),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at").notNull().default(sql`now()`),
});

export const coupons = pgTable("coupons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shop_id: varchar("shop_id").references(() => shops.id),
  code: text("code").notNull(),
  type: couponTypeEnum("type").notNull(),
  value: numeric("value", { precision: 10, scale: 2 }).notNull().default("0"),
  is_active: boolean("is_active").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
  free_item_product_id: varchar("free_item_product_id"),
  free_item_qty: integer("free_item_qty").default(1),
  free_item_products: text("free_item_products").array(),
  bogo_buy_product_id: varchar("bogo_buy_product_id"),
  bogo_buy_qty: integer("bogo_buy_qty").default(1),
  bogo_get_product_id: varchar("bogo_get_product_id"),
  bogo_get_qty: integer("bogo_get_qty").default(1),
  min_order_amount: numeric("min_order_amount", { precision: 10, scale: 2 }),
  expiry_date: timestamp("expiry_date"),
  banner_image: text("banner_image"),
  description: text("description"),
  restrict_sub_category: text("restrict_sub_category").array(),
  created_at: timestamp("created_at").notNull().default(sql`now()`),
});

export const couponProducts = pgTable("coupon_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coupon_id: varchar("coupon_id").references(() => coupons.id),
  product_id: varchar("product_id").references(() => products.id),
  custom_price: numeric("custom_price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").references(() => users.id),
  shop_id: varchar("shop_id").references(() => shops.id),
  shop_name: text("shop_name"),
  total_amount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  discount_amount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  final_amount: numeric("final_amount", { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum("status").notNull().default("pending"),
  payment_status: text("payment_status").notNull().default("unpaid"),
  razorpay_order_id: text("razorpay_order_id"),
  coupon_code: text("coupon_code"),
  created_at: timestamp("created_at").notNull().default(sql`now()`),
});

export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  order_id: varchar("order_id").references(() => orders.id),
  product_id: varchar("product_id").references(() => products.id),
  product_name: text("product_name"),
  quantity: integer("quantity").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  is_free_item: boolean("is_free_item").notNull().default(false),
});

export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shop_id: varchar("shop_id").references(() => shops.id),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  created_at: timestamp("created_at").notNull().default(sql`now()`),
});

export const banners = pgTable("banners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  image_url: text("image_url").notNull(),
  coupon_id: varchar("coupon_id").references(() => coupons.id),
  sort_order: integer("sort_order").notNull().default(0),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at").notNull().default(sql`now()`),
});

export const offlineCoupons = pgTable("offline_coupons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shop_id: varchar("shop_id").references(() => shops.id),
  title: text("title").notNull(),
  description: text("description"),
  banner_image: text("banner_image").notNull(),
  total_codes: integer("total_codes").notNull().default(10),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at").notNull().default(sql`now()`),
});

export const offlineCouponCodes = pgTable("offline_coupon_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offline_coupon_id: varchar("offline_coupon_id").references(() => offlineCoupons.id),
  code: text("code").notNull(),
  claimed_by_user_id: varchar("claimed_by_user_id"),
  claimed_at: timestamp("claimed_at"),
  expires_at: timestamp("expires_at"),
  used_at: timestamp("used_at"),
});

export const insertOfflineCouponSchema = createInsertSchema(offlineCoupons).omit({ id: true, created_at: true });
export type InsertOfflineCoupon = z.infer<typeof insertOfflineCouponSchema>;
export type OfflineCoupon = typeof offlineCoupons.$inferSelect;
export type OfflineCouponCode = typeof offlineCouponCodes.$inferSelect;

export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true, created_at: true });
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;

export const insertBannerSchema = createInsertSchema(banners).omit({ id: true, created_at: true });
export type InsertBanner = z.infer<typeof insertBannerSchema>;
export type Banner = typeof banners.$inferSelect;

export const insertUserSchema = createInsertSchema(users).omit({ id: true, created_at: true });
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, created_at: true });
export const insertShopSchema = createInsertSchema(shops).omit({ id: true, created_at: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, created_at: true });
export const insertCouponSchema = createInsertSchema(coupons).omit({ id: true, created_at: true });
export const insertCouponProductSchema = createInsertSchema(couponProducts).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, created_at: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;
export type InsertShop = z.infer<typeof insertShopSchema>;
export type Shop = typeof shops.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Coupon = typeof coupons.$inferSelect;
export type InsertCouponProduct = z.infer<typeof insertCouponProductSchema>;
export type CouponProduct = typeof couponProducts.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
