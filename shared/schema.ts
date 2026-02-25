import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, numeric, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum("role", ["admin", "user"]);
export const couponTypeEnum = pgEnum("coupon_type", ["percentage", "flat", "free_item", "bundle", "flash"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "confirmed", "completed"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  password: text("password").notNull(),
  role: roleEnum("role").notNull().default("user"),
  created_at: timestamp("created_at").notNull().default(sql`now()`),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  image: text("image"),
  created_at: timestamp("created_at").notNull().default(sql`now()`),
});

export const shops = pgTable("shops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  banner_image: text("banner_image"),
  logo: text("logo"),
  address: text("address"),
  whatsapp_number: text("whatsapp_number"),
  map_link: text("map_link"),
  website_link: text("website_link"),
  category_id: varchar("category_id").references(() => categories.id),
  is_premium: boolean("is_premium").notNull().default(false),
  commission_percentage: numeric("commission_percentage", { precision: 5, scale: 2 }).default("0"),
  subscription_active: boolean("subscription_active").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
  created_at: timestamp("created_at").notNull().default(sql`now()`),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shop_id: varchar("shop_id").references(() => shops.id),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  image: text("image"),
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
  expiry_date: timestamp("expiry_date"),
  created_at: timestamp("created_at").notNull().default(sql`now()`),
});

export const couponProducts = pgTable("coupon_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coupon_id: varchar("coupon_id").references(() => coupons.id),
  product_id: varchar("product_id").references(() => products.id),
  custom_price: numeric("custom_price", { precision: 10, scale: 2 }).notNull(),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").references(() => users.id),
  total_amount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  discount_amount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  final_amount: numeric("final_amount", { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum("status").notNull().default("pending"),
  created_at: timestamp("created_at").notNull().default(sql`now()`),
});

export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  order_id: varchar("order_id").references(() => orders.id),
  product_id: varchar("product_id").references(() => products.id),
  quantity: integer("quantity").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, created_at: true });
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
