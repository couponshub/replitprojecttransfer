import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, db } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import { insertUserSchema, insertCategorySchema, insertShopSchema, insertProductSchema, insertCouponSchema, users, categories, shops, products, coupons, orders, orderItems, vendors, offlineCoupons } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

const JWT_SECRET = process.env.SESSION_SECRET || "coupons-hub-secret-key";

interface JwtPayload { id: string; email: string; role: string; }

function generateToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

const uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, "_")}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  authMiddleware(req, res, () => {
    if ((req as any).user?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  });
}

const VENDOR_SECRET = (process.env.SESSION_SECRET || "coupons-hub-secret-key") + "-vendor";

function generateVendorToken(payload: { id: string; email: string; shop_id: string }) {
  return jwt.sign(payload, VENDOR_SECRET, { expiresIn: "7d" });
}

function vendorMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.vendor_token || req.headers["x-vendor-token"];
  if (!token) return res.status(401).json({ error: "Vendor authentication required" });
  try {
    const decoded = jwt.verify(token as string, VENDOR_SECRET) as any;
    (req as any).vendor = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid vendor token" });
  }
}

async function seedDatabase() {
  const existing = await db.select({ count: sql<number>`count(*)` }).from(users);
  if (Number(existing[0].count) > 0) return;

  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("Admin@123", 10);
  await storage.createUser({ name: "Admin", email: "admin@marketplace.com", password: adminPassword, role: "admin" });

  const userPass = await bcrypt.hash("User@123", 10);
  const userNames = ["Aarav Sharma", "Priya Reddy", "Rahul Patel", "Sneha Kumar", "Vijay Nair"];
  const userEmails = ["aarav@example.com", "priya@example.com", "rahul@example.com", "sneha@example.com", "vijay@example.com"];
  const userPhones = ["9876543210", "9876543211", "9876543212", "9876543213", "9876543214"];
  const createdUsers = [];
  for (let i = 0; i < 5; i++) {
    const u = await storage.createUser({ name: userNames[i], email: userEmails[i], phone: userPhones[i], password: userPass, role: "user" });
    createdUsers.push(u);
  }

  const categoryData = [
    { name: "Food & Dining", image: "/images/cat-food.jpg" },
    { name: "Fashion", image: "/images/cat-fashion.jpg" },
    { name: "Electronics", image: "/images/cat-electronics.jpg" },
    { name: "Beauty & Wellness", image: "/images/cat-beauty.jpg" },
    { name: "Travel", image: "/images/cat-travel.jpg" },
    { name: "Groceries", image: "/images/cat-grocery.jpg" },
    { name: "Sports & Fitness", image: "/images/cat-sports.jpg" },
    { name: "Entertainment", image: "/images/cat-entertainment.jpg" },
    { name: "Home & Living", image: "/images/cat-home.jpg" },
    { name: "Education", image: "/images/cat-education.jpg" },
  ];
  const createdCategories = [];
  for (const cat of categoryData) {
    const c = await storage.createCategory(cat);
    createdCategories.push(c);
  }

  const shopData = [
    { name: "Burger Bliss", description: "Best burgers in town with fresh ingredients", banner_image: "/images/shop-burger.jpg", logo: "/images/logo-burger.jpg", address: "123 Main Street, Hyderabad", whatsapp_number: "+919876543210", category_id: createdCategories[0].id, is_premium: true, commission_percentage: "15", subscription_active: true, featured: true },
    { name: "Zara Style Hub", description: "Latest fashion trends at great prices", banner_image: "/images/shop-zara.jpg", logo: "/images/logo-zara.jpg", address: "45 Fashion Ave, Bangalore", whatsapp_number: "+919876543211", category_id: createdCategories[1].id, is_premium: true, commission_percentage: "12", subscription_active: true, featured: true },
    { name: "TechZone", description: "Top electronics and gadgets at unbeatable prices", banner_image: "/images/shop-tech.jpg", logo: "/images/logo-tech.jpg", address: "78 Silicon Park, Pune", whatsapp_number: "+919876543212", category_id: createdCategories[2].id, is_premium: false, commission_percentage: "10", subscription_active: true, featured: true },
    { name: "Glow Beauty", description: "Premium skincare and beauty products", banner_image: "/images/shop-beauty.jpg", logo: "/images/logo-beauty.jpg", address: "22 Blossom Lane, Mumbai", whatsapp_number: "+919876543213", category_id: createdCategories[3].id, is_premium: true, commission_percentage: "18", subscription_active: true, featured: true },
    { name: "EasyTrip", description: "Affordable travel deals and holiday packages", banner_image: "/images/shop-travel.jpg", logo: "/images/logo-travel.jpg", address: "56 Airport Road, Delhi", whatsapp_number: "+919876543214", category_id: createdCategories[4].id, is_premium: false, commission_percentage: "8", subscription_active: true, featured: true },
    { name: "Fresh Basket", description: "Farm-fresh groceries delivered to your door", banner_image: "/images/shop-grocery.jpg", logo: "/images/logo-grocery.jpg", address: "90 Green Market, Chennai", whatsapp_number: "+919876543215", category_id: createdCategories[5].id, is_premium: false, commission_percentage: "5", subscription_active: true, featured: false },
    { name: "FitLife Sports", description: "Premium sports gear and fitness equipment", banner_image: "/images/shop-sports.jpg", logo: "/images/logo-sports.jpg", address: "34 Stadium Road, Kolkata", whatsapp_number: "+919876543216", category_id: createdCategories[6].id, is_premium: true, commission_percentage: "14", subscription_active: true, featured: true },
    { name: "CineStar", description: "Movie tickets and entertainment at best rates", banner_image: "/images/shop-cinema.jpg", logo: "/images/logo-cinema.jpg", address: "12 Movie Nagar, Hyderabad", whatsapp_number: "+919876543217", category_id: createdCategories[7].id, is_premium: false, commission_percentage: "6", subscription_active: true, featured: false },
    { name: "HomeDecor Plus", description: "Furniture and home decor for every style", banner_image: "/images/shop-home.jpg", logo: "/images/logo-home.jpg", address: "67 Interior Lane, Ahmedabad", whatsapp_number: "+919876543218", category_id: createdCategories[8].id, is_premium: true, commission_percentage: "16", subscription_active: true, featured: false },
    { name: "LearnSmart", description: "Online courses and educational content", banner_image: "/images/shop-edu.jpg", logo: "/images/logo-edu.jpg", address: "Online Platform, Pan India", whatsapp_number: "+919876543219", category_id: createdCategories[9].id, is_premium: false, commission_percentage: "20", subscription_active: true, featured: false },
  ];
  const createdShops = [];
  for (const shop of shopData) {
    const s = await storage.createShop(shop as any);
    createdShops.push(s);
  }

  const productData = [
    { shop_id: createdShops[0].id, name: "Classic Cheeseburger", description: "Juicy beef patty with cheddar cheese", price: "199", image: "/images/prod-burger1.jpg" },
    { shop_id: createdShops[0].id, name: "BBQ Bacon Burger", description: "Smoky bacon with BBQ sauce", price: "249", image: "/images/prod-burger2.jpg" },
    { shop_id: createdShops[0].id, name: "Veggie Supreme", description: "Garden-fresh veggie burger", price: "179", image: "/images/prod-burger3.jpg" },
    { shop_id: createdShops[1].id, name: "Summer Dress", description: "Floral summer dress, all sizes", price: "1499", image: "/images/prod-dress.jpg" },
    { shop_id: createdShops[1].id, name: "Denim Jacket", description: "Classic denim jacket, unisex", price: "2499", image: "/images/prod-jacket.jpg" },
    { shop_id: createdShops[1].id, name: "Casual T-Shirt", description: "Comfortable cotton T-shirt", price: "599", image: "/images/prod-tshirt.jpg" },
    { shop_id: createdShops[2].id, name: "Wireless Earbuds", description: "Premium sound quality earbuds", price: "3999", image: "/images/prod-earbuds.jpg" },
    { shop_id: createdShops[2].id, name: "Smart Watch", description: "Health monitoring smartwatch", price: "8999", image: "/images/prod-watch.jpg" },
    { shop_id: createdShops[2].id, name: "Portable Charger", description: "20000mAh fast charging", price: "1299", image: "/images/prod-charger.jpg" },
    { shop_id: createdShops[3].id, name: "Vitamin C Serum", description: "Brightening face serum", price: "899", image: "/images/prod-serum.jpg" },
    { shop_id: createdShops[3].id, name: "Moisturizing Cream", description: "Deep hydration cream", price: "599", image: "/images/prod-cream.jpg" },
    { shop_id: createdShops[3].id, name: "Lip Gloss Set", description: "5 shades gift set", price: "749", image: "/images/prod-lipgloss.jpg" },
    { shop_id: createdShops[4].id, name: "Goa Package", description: "3 nights 4 days Goa getaway", price: "15999", image: "/images/prod-goa.jpg" },
    { shop_id: createdShops[4].id, name: "Manali Package", description: "5 nights 6 days Manali trek", price: "22999", image: "/images/prod-manali.jpg" },
    { shop_id: createdShops[4].id, name: "Kerala Backwaters", description: "7 nights Kerala luxury tour", price: "35999", image: "/images/prod-kerala.jpg" },
    { shop_id: createdShops[5].id, name: "Organic Vegetables Box", description: "Weekly fresh veggie subscription", price: "799", image: "/images/prod-veggies.jpg" },
    { shop_id: createdShops[5].id, name: "Fruit Basket", description: "Seasonal fresh fruits", price: "499", image: "/images/prod-fruits.jpg" },
    { shop_id: createdShops[5].id, name: "Dairy Combo", description: "Milk, curd, butter, cheese", price: "399", image: "/images/prod-dairy.jpg" },
    { shop_id: createdShops[6].id, name: "Yoga Mat", description: "Non-slip premium yoga mat", price: "1299", image: "/images/prod-yoga.jpg" },
    { shop_id: createdShops[6].id, name: "Dumbbell Set", description: "5-25kg adjustable dumbbells", price: "4999", image: "/images/prod-dumbbells.jpg" },
    { shop_id: createdShops[6].id, name: "Running Shoes", description: "Lightweight marathon shoes", price: "3499", image: "/images/prod-shoes.jpg" },
    { shop_id: createdShops[7].id, name: "Movie Ticket - 2D", description: "Standard 2D movie experience", price: "250", image: "/images/prod-ticket.jpg" },
    { shop_id: createdShops[7].id, name: "Movie Ticket - IMAX", description: "Immersive IMAX experience", price: "650", image: "/images/prod-imax.jpg" },
    { shop_id: createdShops[7].id, name: "Combo Popcorn Deal", description: "Large popcorn + 2 drinks", price: "399", image: "/images/prod-popcorn.jpg" },
    { shop_id: createdShops[8].id, name: "Coffee Table", description: "Minimalist wooden coffee table", price: "8999", image: "/images/prod-table.jpg" },
    { shop_id: createdShops[8].id, name: "Decorative Lamp", description: "Ambient lighting floor lamp", price: "2999", image: "/images/prod-lamp.jpg" },
    { shop_id: createdShops[8].id, name: "Wall Art Set", description: "Set of 3 canvas prints", price: "1999", image: "/images/prod-art.jpg" },
    { shop_id: createdShops[9].id, name: "Python Bootcamp", description: "Complete Python programming course", price: "1999", image: "/images/prod-python.jpg" },
    { shop_id: createdShops[9].id, name: "Data Science Bundle", description: "ML & AI complete bundle", price: "4999", image: "/images/prod-datascience.jpg" },
    { shop_id: createdShops[9].id, name: "English Speaking Course", description: "Fluency in 30 days", price: "999", image: "/images/prod-english.jpg" },
  ];
  const createdProducts = [];
  for (const prod of productData) {
    const p = await storage.createProduct(prod as any);
    createdProducts.push(p);
  }

  const tomorrow = new Date(Date.now() + 86400000 * 30);
  const couponData = [
    { shop_id: createdShops[0].id, code: "BURGER20", type: "percentage" as const, value: "20", is_active: true, expiry_date: tomorrow },
    { shop_id: createdShops[1].id, code: "STYLE500", type: "flat" as const, value: "500", is_active: true, expiry_date: tomorrow },
    { shop_id: createdShops[2].id, code: "TECH15", type: "percentage" as const, value: "15", is_active: true, expiry_date: tomorrow },
    { shop_id: createdShops[3].id, code: "GLOW25", type: "percentage" as const, value: "25", is_active: true, expiry_date: tomorrow },
    { shop_id: createdShops[4].id, code: "TRIP1000", type: "flat" as const, value: "1000", is_active: true, expiry_date: tomorrow },
    { shop_id: createdShops[5].id, code: "FRESH10", type: "percentage" as const, value: "10", is_active: true, expiry_date: tomorrow },
    { shop_id: createdShops[6].id, code: "FIT30", type: "percentage" as const, value: "30", is_active: true, expiry_date: tomorrow },
    { shop_id: createdShops[7].id, code: "MOVIE50", type: "flat" as const, value: "50", is_active: true, expiry_date: tomorrow },
    { shop_id: createdShops[8].id, code: "HOME200", type: "flat" as const, value: "200", is_active: true, expiry_date: tomorrow },
    { shop_id: createdShops[9].id, code: "LEARN40", type: "percentage" as const, value: "40", is_active: true, expiry_date: tomorrow },
  ];
  const createdCoupons = [];
  for (const coupon of couponData) {
    const c = await storage.createCoupon(coupon as any);
    createdCoupons.push(c);
  }

  const statuses = ["pending", "confirmed", "completed", "pending", "confirmed"];
  for (let i = 0; i < 5; i++) {
    const user = createdUsers[i];
    const product = createdProducts[i * 3];
    const total = parseFloat(product.price as string) * 2;
    const discount = total * 0.1;
    const order = await storage.createOrder(
      { user_id: user.id, total_amount: total.toString(), discount_amount: discount.toString(), final_amount: (total - discount).toString(), status: statuses[i] as any },
      [{ order_id: "", product_id: product.id, quantity: 2, price: product.price as string }]
    );
  }

  console.log("Seeding complete!");
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  const cookieParser = (await import("cookie-parser")).default;
  app.use(cookieParser());
  const express = (await import("express")).default;
  app.use("/uploads", express.static(uploadsDir));

  await seedDatabase();

  // Seed vendor accounts for existing shops if none exist
  const existingVendors = await db.select({ count: sql<number>`count(*)` }).from(vendors);
  if (Number(existingVendors[0].count) === 0) {
    const allShops = await storage.getAllShops();
    const vendorPass = await bcrypt.hash("Vendor@123", 10);
    for (const shop of allShops) {
      const slug = shop.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
      const email = `${slug}@vendor.com`;
      try {
        await storage.createVendor({ shop_id: shop.id, name: shop.name, email, password: vendorPass });
      } catch {}
    }
    console.log("Vendor accounts seeded!");
  }

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, phone, password } = req.body;
      if ((!email && !phone) || !password) return res.status(400).json({ error: "Email or phone and password required" });
      let user;
      if (phone) {
        user = await storage.getUserByPhone(phone);
      } else {
        user = await storage.getUserByEmail(email);
      }
      if (!user) return res.status(401).json({ error: "Invalid credentials" });
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });
      const token = generateToken({ id: user.id, email: user.email, role: user.role });
      res.cookie("token", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone } });
    } catch (err) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, phone, password } = req.body;
      if (!name || !email || !password) return res.status(400).json({ error: "All fields required" });
      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(400).json({ error: "Email already registered" });
      const hashed = await bcrypt.hash(password, 10);
      const user = await storage.createUser({ name, email, phone: phone || null, password: hashed, role: "user" });
      const token = generateToken({ id: user.id, email: user.email, role: user.role });
      res.cookie("token", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ success: true });
  });

  app.get("/api/auth/me", authMiddleware, async (req, res) => {
    const user = await storage.getUser((req as any).user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  });

  // Categories
  app.get("/api/categories", async (req, res) => {
    res.json(await storage.getAllCategories());
  });

  app.post("/api/categories", adminMiddleware, async (req, res) => {
    try {
      const data = insertCategorySchema.parse(req.body);
      res.json(await storage.createCategory(data));
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  app.put("/api/categories/:id", adminMiddleware, async (req, res) => {
    const updated = await storage.updateCategory(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/categories/:id", adminMiddleware, async (req, res) => {
    await storage.deleteCategory(req.params.id);
    res.json({ success: true });
  });

  // File upload
  app.post("/api/upload", adminMiddleware, upload.single("file"), (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
  });

  // Shops
  app.get("/api/shops", async (req, res) => {
    const { categoryId } = req.query;
    res.json(await storage.getAllShops(categoryId as string | undefined));
  });

  app.get("/api/shops/featured", async (req, res) => {
    res.json(await storage.getFeaturedShops());
  });

  app.get("/api/shops/:id", async (req, res) => {
    const shop = await storage.getShop(req.params.id);
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    res.json(shop);
  });

  app.post("/api/shops", adminMiddleware, async (req, res) => {
    try {
      const data = insertShopSchema.parse(req.body);
      res.json(await storage.createShop(data));
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  app.put("/api/shops/:id", adminMiddleware, async (req, res) => {
    try {
      const { id, created_at, category, ...body } = req.body;
      const updated = await storage.updateShop(req.params.id, body);
      if (!updated) return res.status(404).json({ error: "Not found" });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/shops/:id", adminMiddleware, async (req, res) => {
    await storage.deleteShop(req.params.id);
    res.json({ success: true });
  });

  // Products
  app.get("/api/products", async (req, res) => {
    const { shopId } = req.query;
    res.json(await storage.getAllProducts(shopId as string | undefined));
  });

  app.get("/api/products/:id", async (req, res) => {
    const product = await storage.getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: "Not found" });
    res.json(product);
  });

  app.post("/api/products", adminMiddleware, async (req, res) => {
    try {
      const data = insertProductSchema.parse(req.body);
      res.json(await storage.createProduct(data));
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  app.put("/api/products/:id", adminMiddleware, async (req, res) => {
    const updated = await storage.updateProduct(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/products/:id", adminMiddleware, async (req, res) => {
    await storage.deleteProduct(req.params.id);
    res.json({ success: true });
  });

  // Coupons
  app.get("/api/coupons", async (req, res) => {
    const { shopId } = req.query;
    res.json(await storage.getAllCoupons(shopId as string | undefined));
  });

  app.get("/api/coupons/active", async (req, res) => {
    res.json(await storage.getActiveCoupons());
  });

  app.get("/api/search", async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      if (q.length < 2) return res.json({ shops: [], products: [], coupons: [] });
      const results = await storage.search(q);
      return res.json(results);
    } catch (err: any) {
      return res.status(500).json({ shops: [], products: [], coupons: [] });
    }
  });

  app.post("/api/coupons/validate", authMiddleware, async (req, res) => {
    try {
      const { code, shopId } = req.body;
      const coupon = await storage.getCouponByCode(code, shopId);
      if (!coupon) return res.status(404).json({ error: "Invalid or expired coupon" });
      if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
        return res.status(400).json({ error: "Coupon has expired" });
      }

      let items_to_add: { id: string; name: string; price: number; shop_id: string; shopName: string; isFreeItem?: boolean }[] = [];
      const shop = coupon.shop_id ? await storage.getShop(coupon.shop_id) : null;
      const shopName = shop?.name || "Shop";

      // Attached products (optional, any coupon type)
      const cpItems = await storage.getCouponProducts(coupon.id);
      if (cpItems.length > 0) {
        items_to_add = cpItems.map(cp => ({
          id: cp.product?.id || cp.product_id || "",
          name: cp.product?.name || "Product",
          price: parseFloat(cp.custom_price),
          shop_id: cp.product?.shop_id || coupon.shop_id || "",
          shopName,
        }));
      }

      // Free item — always added for free_item type
      if (coupon.type === "free_item" && coupon.free_item_product_id) {
        const product = await storage.getProduct(coupon.free_item_product_id);
        if (product) {
          items_to_add = [
            ...items_to_add,
            { id: product.id, name: product.name, price: 0, shop_id: product.shop_id || "", shopName, isFreeItem: true },
          ];
        }
      }

      res.json({ ...coupon, items_to_add });
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  app.get("/api/coupons/:id/products", adminMiddleware, async (req, res) => {
    res.json(await storage.getCouponProducts(req.params.id));
  });

  app.post("/api/users", adminMiddleware, async (req, res) => {
    try {
      const { name, email, phone, password } = req.body;
      if (!name || !email || !password) return res.status(400).json({ error: "Name, email and password required" });
      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(400).json({ error: "Email already registered" });
      const hashed = await bcrypt.hash(password, 10);
      const user = await storage.createUser({ name, email, phone: phone || null, password: hashed, role: "user" });
      res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, created_at: user.created_at });
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  app.post("/api/coupons", adminMiddleware, async (req, res) => {
    try {
      const { coupon_products: cpItems, ...rest } = req.body;
      if (rest.expiry_date) rest.expiry_date = new Date(rest.expiry_date);
      const data = insertCouponSchema.parse(rest);
      const coupon = await storage.createCoupon(data);
      if (cpItems && Array.isArray(cpItems) && cpItems.length > 0) {
        await storage.setCouponProducts(coupon.id, cpItems);
      }
      res.json(coupon);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  app.put("/api/coupons/:id", adminMiddleware, async (req, res) => {
    try {
      const { coupon_products: cpItems, ...rest } = req.body;
      if (rest.expiry_date) rest.expiry_date = new Date(rest.expiry_date);
      const updated = await storage.updateCoupon(req.params.id, rest);
      if (!updated) return res.status(404).json({ error: "Not found" });
      if (cpItems !== undefined) {
        await storage.setCouponProducts(req.params.id, Array.isArray(cpItems) ? cpItems : []);
      }
      res.json(updated);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  app.delete("/api/coupons/:id", adminMiddleware, async (req, res) => {
    await storage.deleteCoupon(req.params.id);
    res.json({ success: true });
  });

  // Orders
  app.get("/api/orders", adminMiddleware, async (req, res) => {
    res.json(await storage.getAllOrders());
  });

  app.get("/api/orders/my", authMiddleware, async (req, res) => {
    res.json(await storage.getUserOrders((req as any).user.id));
  });

  app.get("/api/orders/:id", authMiddleware, async (req, res) => {
    const order = await storage.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: "Not found" });
    if ((req as any).user.role !== "admin" && order.user_id !== (req as any).user.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(order);
  });

  app.post("/api/orders", authMiddleware, async (req, res) => {
    try {
      const { items, total_amount, discount_amount, final_amount, shop_id, shop_name, coupon_code } = req.body;
      const order = await storage.createOrder(
        {
          user_id: (req as any).user.id,
          shop_id: shop_id || null,
          shop_name: shop_name || null,
          total_amount,
          discount_amount: discount_amount || "0",
          final_amount,
          status: "pending",
          payment_status: "unpaid",
          coupon_code: coupon_code || null,
        },
        (items || []).map((i: any) => ({
          product_id: i.product_id,
          product_name: i.product_name || null,
          quantity: i.quantity,
          price: i.price,
          is_free_item: i.is_free_item || false,
          order_id: "",
        }))
      );
      res.json(order);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  app.put("/api/orders/:id/status", adminMiddleware, async (req, res) => {
    const { status } = req.body;
    const order = await storage.updateOrderStatus(req.params.id, status);
    if (!order) return res.status(404).json({ error: "Not found" });
    res.json(order);
  });

  // Razorpay payment
  app.post("/api/payment/create-order", authMiddleware, async (req, res) => {
    try {
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) {
        return res.status(503).json({ error: "Payment gateway not configured. Please contact admin." });
      }
      const Razorpay = (await import("razorpay")).default;
      const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
      const { orderId, amount } = req.body;
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(parseFloat(amount) * 100),
        currency: "INR",
        receipt: orderId,
      });
      await storage.updateOrderPayment(orderId, "pending", razorpayOrder.id);
      res.json({ razorpayOrderId: razorpayOrder.id, amount: razorpayOrder.amount, currency: "INR", keyId });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/payment/verify", authMiddleware, async (req, res) => {
    try {
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keySecret) return res.status(503).json({ error: "Payment gateway not configured." });
      const crypto = (await import("crypto")).default;
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto.createHmac("sha256", keySecret).update(body).digest("hex");
      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ error: "Payment verification failed. Please contact support." });
      }
      const order = await storage.updateOrderPayment(orderId, "paid", razorpay_order_id);
      res.json({ success: true, order });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Admin stats
  app.get("/api/admin/stats", adminMiddleware, async (req, res) => {
    res.json(await storage.getStats());
  });

  app.get("/api/admin/recent-orders", adminMiddleware, async (req, res) => {
    res.json(await storage.getRecentOrders());
  });

  app.get("/api/admin/users", adminMiddleware, async (req, res) => {
    const allUsers = await storage.getAllUsers();
    res.json(allUsers.map(u => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, created_at: u.created_at })));
  });

  app.get("/api/admin/top-shops", adminMiddleware, async (req, res) => {
    res.json(await storage.getTopShops());
  });

  app.get("/api/admin/top-coupons", adminMiddleware, async (req, res) => {
    res.json(await storage.getTopCoupons());
  });

  // Banners
  app.get("/api/banners", async (req, res) => {
    res.json(await storage.getActiveBanners());
  });

  app.get("/api/admin/banners", adminMiddleware, async (req, res) => {
    res.json(await storage.getAllBanners());
  });

  app.post("/api/admin/banners", adminMiddleware, async (req, res) => {
    try {
      const banner = await storage.createBanner(req.body);
      res.json(banner);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  app.put("/api/admin/banners/:id", adminMiddleware, async (req, res) => {
    const banner = await storage.updateBanner(req.params.id, req.body);
    if (!banner) return res.status(404).json({ error: "Not found" });
    res.json(banner);
  });

  app.delete("/api/admin/banners/:id", adminMiddleware, async (req, res) => {
    await storage.deleteBanner(req.params.id);
    res.json({ ok: true });
  });

  // ── Vendor Auth ──────────────────────────────────────────────────────────────
  app.post("/api/vendor/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Email and password required" });
      const vendor = await storage.getVendorByEmail(email);
      if (!vendor) return res.status(401).json({ error: "Invalid credentials" });
      const valid = await bcrypt.compare(password, vendor.password);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });
      const token = generateVendorToken({ id: vendor.id, email: vendor.email, shop_id: vendor.shop_id! });
      res.cookie("vendor_token", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
      res.json({ token, vendor: { id: vendor.id, name: vendor.name, email: vendor.email, shop_id: vendor.shop_id } });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/vendor/logout", (req, res) => {
    res.clearCookie("vendor_token");
    res.json({ ok: true });
  });

  app.get("/api/vendor/me", vendorMiddleware, async (req, res) => {
    const v = req.body;
    const vendor = await storage.getVendorByEmail((req as any).vendor.email);
    if (!vendor) return res.status(404).json({ error: "Not found" });
    res.json({ id: vendor.id, name: vendor.name, email: vendor.email, shop_id: vendor.shop_id });
  });

  // ── Vendor Shop Management ───────────────────────────────────────────────────
  app.get("/api/vendor/shop", vendorMiddleware, async (req, res) => {
    const shopId = (req as any).vendor.shop_id;
    const shop = await storage.getShop(shopId);
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    res.json(shop);
  });

  app.patch("/api/vendor/shop", vendorMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).vendor.shop_id;
      const updated = await storage.updateShop(shopId, req.body);
      res.json(updated);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  // ── Vendor Products ──────────────────────────────────────────────────────────
  app.get("/api/vendor/products", vendorMiddleware, async (req, res) => {
    const shopId = (req as any).vendor.shop_id;
    res.json(await storage.getProductsByShop(shopId));
  });

  app.post("/api/vendor/products", vendorMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).vendor.shop_id;
      const product = await storage.createProduct({ ...req.body, shop_id: shopId });
      res.json(product);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  app.patch("/api/vendor/products/:id", vendorMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).vendor.shop_id;
      const product = await storage.getProduct(req.params.id);
      if (!product || product.shop_id !== shopId) return res.status(403).json({ error: "Forbidden" });
      const updated = await storage.updateProduct(req.params.id, req.body);
      res.json(updated);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  app.delete("/api/vendor/products/:id", vendorMiddleware, async (req, res) => {
    const shopId = (req as any).vendor.shop_id;
    const product = await storage.getProduct(req.params.id);
    if (!product || product.shop_id !== shopId) return res.status(403).json({ error: "Forbidden" });
    await storage.deleteProduct(req.params.id);
    res.json({ ok: true });
  });

  // ── Vendor Coupons ───────────────────────────────────────────────────────────
  app.get("/api/vendor/coupons", vendorMiddleware, async (req, res) => {
    const shopId = (req as any).vendor.shop_id;
    res.json(await storage.getCouponsByShop(shopId));
  });

  app.post("/api/vendor/coupons", vendorMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).vendor.shop_id;
      const coupon = await storage.createCoupon({ ...req.body, shop_id: shopId });
      res.json(coupon);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  app.patch("/api/vendor/coupons/:id", vendorMiddleware, async (req, res) => {
    try {
      const updated = await storage.updateCoupon(req.params.id, req.body);
      res.json(updated);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  app.delete("/api/vendor/coupons/:id", vendorMiddleware, async (req, res) => {
    await storage.deleteCoupon(req.params.id);
    res.json({ ok: true });
  });

  // ── Admin Vendor Management ──────────────────────────────────────────────────
  app.get("/api/admin/vendors", adminMiddleware, async (req, res) => {
    res.json(await storage.getAllVendors());
  });

  app.post("/api/admin/vendors", adminMiddleware, async (req, res) => {
    try {
      const { shop_id, name, email, password } = req.body;
      if (!shop_id || !email || !password) return res.status(400).json({ error: "shop_id, email, password required" });
      const existing = await storage.getVendorByShopId(shop_id);
      if (existing) {
        const hashed = await bcrypt.hash(password, 10);
        const updated = await storage.updateVendor(existing.id, { name: name || existing.name, email, password: hashed });
        return res.json(updated);
      }
      const hashed = await bcrypt.hash(password, 10);
      const vendor = await storage.createVendor({ shop_id, name: name || "Vendor", email, password: hashed });
      res.json(vendor);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  app.delete("/api/admin/vendors/:id", adminMiddleware, async (req, res) => {
    await storage.deleteVendor(req.params.id);
    res.json({ ok: true });
  });

  // ── Offline Coupons ──────────────────────────────────────────────────────────
  app.get("/api/offline-coupons", async (_req, res) => {
    try {
      const data = await storage.getOfflineCoupons();
      res.json(data.filter(d => d.is_active));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/admin/offline-coupons", adminMiddleware, async (_req, res) => {
    try {
      res.json(await storage.getOfflineCoupons());
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/offline-coupons", adminMiddleware, upload.single("banner"), async (req, res) => {
    try {
      const { shop_id, title, description, total_codes } = req.body;
      if (!title) return res.status(400).json({ error: "title is required" });
      let banner_image = req.body.banner_image || "";
      if (req.file) banner_image = `/uploads/${req.file.filename}`;
      if (!banner_image) return res.status(400).json({ error: "banner image is required" });

      const oc = await storage.createOfflineCoupon({
        shop_id: shop_id || null,
        title,
        description: description || null,
        banner_image,
        total_codes: parseInt(total_codes || "10"),
        is_active: true,
      });

      const shop = shop_id ? await storage.getShop(shop_id) : null;
      const prefix = (shop?.name || "OFF").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 4);
      const count = parseInt(total_codes || "10");
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const generatedCodes: string[] = [];
      while (generatedCodes.length < count) {
        let code = prefix;
        for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
        if (!generatedCodes.includes(code)) generatedCodes.push(code);
      }
      await storage.createOfflineCouponCodes(oc.id, generatedCodes);
      res.json(oc);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  app.patch("/api/offline-coupons/:id", adminMiddleware, async (req, res) => {
    try {
      const updated = await storage.updateOfflineCoupon(req.params.id, req.body);
      res.json(updated);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  app.delete("/api/offline-coupons/:id", adminMiddleware, async (req, res) => {
    await storage.deleteOfflineCoupon(req.params.id);
    res.json({ ok: true });
  });

  app.get("/api/offline-coupons/:id/codes", adminMiddleware, async (req, res) => {
    try {
      res.json(await storage.getOfflineCouponCodes(req.params.id));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/offline-coupons/:id/claim", authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const result = await storage.claimOfflineCouponCode(req.params.id, userId);
      if (!result) return res.status(410).json({ error: "No codes remaining for this coupon" });
      res.json(result);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  app.get("/api/offline-coupons/:id/my-code", authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const code = await storage.getUserClaimedCode(req.params.id, userId);
      if (!code) return res.status(404).json({ error: "No code claimed" });
      const all = await storage.getOfflineCouponCodes(req.params.id);
      const remaining = all.filter(c => !c.claimed_by_user_id).length;
      res.json({ code, remaining });
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  return httpServer;
}
