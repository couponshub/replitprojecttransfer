import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, db } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

// Use service key for server-side uploads (has storage write permissions)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = (process.env.SUPABASE_URL && supabaseServiceKey)
  ? createClient(process.env.SUPABASE_URL, supabaseServiceKey)
  : null;
const SUPABASE_BUCKET = "images";

// Try to auto-create the bucket on startup
if (supabase) {
  (async () => {
    try {
      const { error } = await supabase.storage.createBucket(SUPABASE_BUCKET, {
        public: true,
        allowedMimeTypes: ["image/*"],
        fileSizeLimit: 10 * 1024 * 1024,
      });
      if (!error) {
        console.log(`[Supabase] Bucket '${SUPABASE_BUCKET}' created successfully`);
      } else if (error.message?.toLowerCase().includes("already exists") || error.message?.toLowerCase().includes("duplicate")) {
        console.log(`[Supabase] Bucket '${SUPABASE_BUCKET}' already exists — ready`);
      } else {
        console.warn(`[Supabase] Could not auto-create bucket: ${error.message} — please create '${SUPABASE_BUCKET}' (Public) manually in Supabase Dashboard → Storage`);
      }
    } catch (e: any) {
      console.warn("[Supabase] Startup bucket check failed:", e.message);
    }
  })();
}
import { insertUserSchema, insertCategorySchema, insertShopSchema, insertProductSchema, insertCouponSchema, users, categories, shops, products, coupons, orders, orderItems, vendors, offlineCoupons } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

const JWT_SECRET = process.env.SESSION_SECRET || "coupons-hub-secret-key";

function sanitizeBody(body: any, extraOmit: string[] = []): any {
  const omit = new Set(["id", "created_at", "category", "shop", "coupon_products", ...extraOmit]);
  const out: any = {};
  for (const [k, v] of Object.entries(body)) {
    if (omit.has(k)) continue;
    if (k === "expiry_date" && v) { out[k] = new Date(v as string); continue; }
    out[k] = v === "" ? null : v;
  }
  return out;
}

interface JwtPayload { id: string; email: string; role: string; }

function generateToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

const uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const memUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

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

async function seedElurubusinesses() {
  const existingCount = await db.select({ count: sql<number>`count(*)` }).from(shops);
  if (Number(existingCount[0].count) >= 35) return;

  console.log("Seeding additional Eluru businesses...");
  const allCats = await storage.getAllCategories();
  const cat = (name: string) => allCats.find(c => c.name === name)?.id ?? allCats[0].id;
  const exp30 = new Date(Date.now() + 86400000 * 30);
  const exp60 = new Date(Date.now() + 86400000 * 60);
  const exp90 = new Date(Date.now() + 86400000 * 90);

  const elurushops: any[] = [
    {
      name: "Anand Bhavan Restaurant", description: "Famous pure vegetarian restaurant in Eluru since 1968. Known for idli, dosa, meals & tiffins.", category_id: cat("Restaurants"),
      address: "Opp. Bus Stand, Masjid Road, Eluru - 534001, AP", whatsapp_number: "+918812234501", map_link: "https://www.google.com/maps/place/Anand+Bhavan+Restaurant+Eluru/@16.7051,81.0971,17z",
      banner_image: "https://images.unsplash.com/photo-1555396273-59e20c6a80aa?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&h=450&fit=crop", "https://images.unsplash.com/photo-1547592180-85f173990554?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1555396273-59e20c6a80aa?w=200&h=200&fit=crop", is_premium: true, featured: true, subscription_active: true, commission_percentage: "10", listing_type: "both",
      business_hours: "Mon-Sun: 7 AM - 10 PM",
      products: [
        { name: "Veg Thali (Full Meals)", type: "product", description: "Rice, sambar, rasam, 3 curries, curd, papad, pickle", price: "120", image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=300&fit=crop" },
        { name: "Masala Dosa", type: "product", description: "Crispy dosa with potato masala & chutneys", price: "60", image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop" },
        { name: "Idly Plate (4 pcs)", type: "product", description: "Soft idly with sambar & 2 chutneys", price: "40", image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "ANAND20", type: "percentage", value: "20", featured: true, expiry_date: exp30 },
        { code: "ANANDMEAL", type: "flat", value: "30", featured: false, expiry_date: exp60 },
      ],
      offline: { title: "Anand Bhavan - Show & Save ₹20", description: "Show this coupon at billing counter for ₹20 off on orders above ₹100", banner_image: "https://images.unsplash.com/photo-1555396273-59e20c6a80aa?w=800&h=450&fit=crop", total_codes: 50 },
    },
    {
      name: "Sri Santhi Sagar Restaurant", description: "Family restaurant serving Andhra-style meals, tiffins and snacks. Popular for Pesarattu & Upma.", category_id: cat("Restaurants"),
      address: "Near Railway Station, Eluru - 534002, AP", whatsapp_number: "+918812234502", map_link: "https://www.google.com/maps/place/Sri+Santhi+Sagar+Restaurant+Eluru/@16.7089,81.1021,17z",
      banner_image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1555396273-59e20c6a80aa?w=800&h=450&fit=crop", "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&h=200&fit=crop", is_premium: false, featured: true, subscription_active: true, commission_percentage: "8", listing_type: "both",
      business_hours: "Mon-Sun: 6 AM - 10:30 PM",
      products: [
        { name: "Pesarattu Upma", type: "product", description: "Green moong dosa stuffed with upma, a classic Andhra breakfast", price: "50", image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&h=300&fit=crop" },
        { name: "Andhra Meals", type: "product", description: "Unlimited rice with 5 curries, dal, rasam, curd & dessert", price: "100", image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=300&fit=crop" },
        { name: "Vada Plate (3 pcs)", type: "product", description: "Crispy medu vada with chutney & sambar", price: "45", image: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "SANTHI15", type: "percentage", value: "15", featured: true, expiry_date: exp30 },
      ],
    },
    {
      name: "Al-Raheem Biryani", description: "Authentic Hyderabadi-style dum biryani prepared fresh every day. Famous among biryani lovers of Eluru.", category_id: cat("Biryani"),
      address: "Muslim Bazar, Eluru - 534001, AP", whatsapp_number: "+918812234503", map_link: "https://www.google.com/maps/place/Al-Raheem+Biryani+Eluru/@16.7044,81.0921,17z",
      banner_image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1630383249896-424e482df921?w=800&h=450&fit=crop", "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200&h=200&fit=crop", is_premium: true, featured: true, subscription_active: true, commission_percentage: "12", listing_type: "both",
      business_hours: "Mon-Sun: 11 AM - 11 PM",
      products: [
        { name: "Chicken Dum Biryani (Full)", type: "product", description: "Full pot of aromatic dum biryani (serves 2)", price: "280", image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop" },
        { name: "Mutton Biryani", type: "product", description: "Tender mutton with long-grain basmati rice", price: "350", image: "https://images.unsplash.com/photo-1630383249896-424e482df921?w=400&h=300&fit=crop" },
        { name: "Veg Biryani", type: "product", description: "Mixed vegetable biryani with raita & mirchi ka salan", price: "180", image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "RAHEEM10", type: "percentage", value: "10", featured: true, expiry_date: exp30 },
        { code: "RAHEEMFULL", type: "flat", value: "50", featured: false, expiry_date: exp60 },
      ],
      offline: { title: "Al-Raheem - Free Raita", description: "Show coupon for free raita & salad with any biryani order above ₹200", banner_image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&h=450&fit=crop", total_codes: 30 },
    },
    {
      name: "Sri Krishna Bakery & Sweets", description: "Traditional Eluru sweets shop. Famous for authentic Pootharekulu (paper sweets), Boondi Laddu & seasonal sweets.", category_id: cat("Bakery"),
      address: "Gandhi Nagar, Main Road, Eluru - 534001, AP", whatsapp_number: "+918812234504", map_link: "https://www.google.com/maps/place/Sri+Krishna+Bakery+Sweets+Eluru/@16.7038,81.0961,17z",
      banner_image: "https://images.unsplash.com/photo-1509440159596-0280db8693f5?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&h=450&fit=crop", "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1509440159596-0280db8693f5?w=200&h=200&fit=crop", is_premium: true, featured: true, subscription_active: true, commission_percentage: "10", listing_type: "both",
      business_hours: "Mon-Sun: 8 AM - 10 PM",
      products: [
        { name: "Pootharekulu Box (500g)", type: "product", description: "Traditional Eluru paper sweets - famous across Andhra Pradesh", price: "350", image: "https://images.unsplash.com/photo-1509440159596-0280db8693f5?w=400&h=300&fit=crop" },
        { name: "Boondi Laddu (1kg)", type: "product", description: "Classic temple-style boondi laddu, fresh daily", price: "280", image: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=300&fit=crop" },
        { name: "Special Cake (1kg)", type: "product", description: "Customised fresh cream cakes for all occasions", price: "650", image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "KRISHNA10", type: "percentage", value: "10", featured: true, expiry_date: exp30 },
      ],
      offline: { title: "Sri Krishna - Free Sweet Sample", description: "Visit store & show coupon for free Pootharekulu tasting pack", banner_image: "https://images.unsplash.com/photo-1509440159596-0280db8693f5?w=800&h=450&fit=crop", total_codes: 100 },
    },
    {
      name: "Sri Sai Sweets Eluru", description: "Fresh sweets, namkeens and bakery items. Speciality: Kakinada Kaja, Ariselu, Bobbatlu for festivals.", category_id: cat("Bakery"),
      address: "Ramachandra Rao Street, Eluru - 534001, AP", whatsapp_number: "+918812234505", map_link: "https://www.google.com/maps/place/Sri+Sai+Sweets+Eluru/@16.7045,81.0955,17z",
      banner_image: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1509440159596-0280db8693f5?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=200&h=200&fit=crop", is_premium: false, featured: false, subscription_active: true, commission_percentage: "8", listing_type: "both",
      business_hours: "Mon-Sun: 7 AM - 9 PM",
      products: [
        { name: "Kakinada Kaja (500g)", type: "product", description: "Famous flaky sweet soaked in sugar syrup", price: "200", image: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=300&fit=crop" },
        { name: "Ariselu (250g)", type: "product", description: "Traditional rice flour & jaggery sweet for festivals", price: "150", image: "https://images.unsplash.com/photo-1509440159596-0280db8693f5?w=400&h=300&fit=crop" },
        { name: "Mixed Namkeen Box", type: "product", description: "Assorted savory snacks box 500g", price: "120", image: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "SAISWEEET100", type: "flat", value: "30", featured: false, expiry_date: exp60 },
      ],
    },
    {
      name: "KFC Eluru", description: "KFC Eluru - Finger Lickin' Good! Crispy fried chicken, burgers, Zinger meals & more. Drive-thru available.", category_id: cat("Food & Dining"),
      address: "Powerpet, NH-16, Eluru - 534002, AP", whatsapp_number: "+919000234506", map_link: "https://www.google.com/maps/place/KFC+Eluru/@16.7071,81.1028,17z",
      banner_image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=800&h=450&fit=crop", "https://images.unsplash.com/photo-1562967914-608f82629710?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop", is_premium: true, featured: true, subscription_active: true, commission_percentage: "12", listing_type: "both",
      business_hours: "Mon-Sun: 11 AM - 11 PM",
      products: [
        { name: "Zinger Burger Meal", type: "product", description: "Spicy Zinger burger + fries + Pepsi", price: "299", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop" },
        { name: "Chicken Bucket (8 pcs)", type: "product", description: "8-piece crispy chicken bucket for the family", price: "699", image: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400&h=300&fit=crop" },
        { name: "Krushers (Large)", type: "product", description: "Creamy blended Krusher beverage - Mocha or Vanilla", price: "149", image: "https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "KFCELURU20", type: "percentage", value: "20", featured: true, expiry_date: exp30 },
        { code: "KFCBUCKET", type: "flat", value: "100", featured: true, expiry_date: exp30 },
      ],
    },
    {
      name: "Dominos Pizza Eluru", description: "Domino's Pizza Eluru - Hot pizzas delivered in 30 minutes. Thick crust, thin crust & stuffed crust options.", category_id: cat("Food & Dining"),
      address: "Bus Stand Road, Eluru - 534001, AP", whatsapp_number: "+919000234507", map_link: "https://www.google.com/maps/place/Dominos+Pizza+Eluru/@16.7052,81.0982,17z",
      banner_image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&h=450&fit=crop", "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop", is_premium: true, featured: true, subscription_active: true, commission_percentage: "10", listing_type: "both",
      business_hours: "Mon-Sun: 11 AM - 11:30 PM",
      products: [
        { name: "Farmhouse Pizza (Medium)", type: "product", description: "Loaded with fresh veggies & cheese on thin crust", price: "349", image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop" },
        { name: "Pepperoni Pizza (Large)", type: "product", description: "Classic pepperoni with extra mozzarella", price: "549", image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop" },
        { name: "Pasta Carbonara", type: "product", description: "Creamy white sauce pasta with mushrooms", price: "199", image: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "DOMINOS30", type: "percentage", value: "30", featured: true, expiry_date: exp30 },
        { code: "PIZZAFREE", type: "free_item", value: "0", featured: true, expiry_date: exp30 },
      ],
      offline: { title: "Dominos - Buy 1 Get 1 Free", description: "Show at counter: Buy any medium pizza, get 2nd medium pizza free on weekdays", banner_image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=450&fit=crop", total_codes: 20 },
    },
    {
      name: "Poorvika Mobiles Eluru", description: "Eluru's trusted mobile store. Latest smartphones from Samsung, Apple, Vivo, Oppo, Realme. EMI available.", category_id: cat("Electronics"),
      address: "Ramaraopeta, Main Road, Eluru - 534002, AP", whatsapp_number: "+918812234508", map_link: "https://www.google.com/maps/place/Poorvika+Mobiles+Eluru/@16.7068,81.0988,17z",
      banner_image: "https://images.unsplash.com/photo-1585771724702-34681be2a29d?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1567581935884-3349723552ca?w=800&h=450&fit=crop", "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1585771724702-34681be2a29d?w=200&h=200&fit=crop", is_premium: true, featured: true, subscription_active: true, commission_percentage: "8", listing_type: "both",
      business_hours: "Mon-Sat: 10 AM - 8:30 PM, Sun: 11 AM - 7 PM",
      products: [
        { name: "Samsung Galaxy M35 5G", type: "product", description: "6.6\" display, 50MP camera, 6000mAh battery, 8GB RAM", price: "19999", image: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400&h=300&fit=crop" },
        { name: "Mobile Screen Guard", type: "product", description: "Tempered glass screen guard with installation", price: "199", image: "https://images.unsplash.com/photo-1585771724702-34681be2a29d?w=400&h=300&fit=crop" },
        { name: "Mobile Accessories Combo", type: "product", description: "Case + charger + earphones bundle", price: "599", image: "https://images.unsplash.com/photo-1567581935884-3349723552ca?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "POORVIKA500", type: "flat", value: "500", featured: true, expiry_date: exp30 },
        { code: "MOBILELURU", type: "percentage", value: "8", featured: false, expiry_date: exp60 },
      ],
    },
    {
      name: "Croma Electronics Eluru", description: "India's trusted multi-brand electronics store. TVs, laptops, ACs, refrigerators, washing machines & more.", category_id: cat("Electronics"),
      address: "D. Bhulakshmamma Road, Eluru - 534001, AP", whatsapp_number: "+918812234509", map_link: "https://www.google.com/maps/place/Croma+Electronics+Eluru/@16.7058,81.0973,17z",
      banner_image: "https://images.unsplash.com/photo-1588508065123-287b28e013da?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1567581935884-3349723552ca?w=800&h=450&fit=crop", "https://images.unsplash.com/photo-1593359677879-a4bb92f4e10e?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1588508065123-287b28e013da?w=200&h=200&fit=crop", is_premium: false, featured: false, subscription_active: true, commission_percentage: "6", listing_type: "both",
      business_hours: "Mon-Sun: 10 AM - 9 PM",
      products: [
        { name: "Samsung 43\" 4K Smart TV", type: "product", description: "4K Ultra HD, HDR10+, built-in WiFi & apps", price: "34999", image: "https://images.unsplash.com/photo-1593359677879-a4bb92f4e10e?w=400&h=300&fit=crop" },
        { name: "Boat Bluetooth Speaker", type: "product", description: "360° sound, 10hr battery, waterproof", price: "1499", image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=300&fit=crop" },
        { name: "Whirlpool 1.5 Ton AC", type: "product", description: "5-star rated, inverter AC, auto-clean", price: "34990", image: "https://images.unsplash.com/photo-1588508065123-287b28e013da?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "CROMA2000", type: "flat", value: "2000", featured: true, expiry_date: exp30 },
        { code: "CROMALURU", type: "percentage", value: "5", featured: false, expiry_date: exp90 },
      ],
    },
    {
      name: "Max Fashion Eluru", description: "Trendy fashion for the entire family. Western & Indian wear, kids section, home linen. Unbeatable prices.", category_id: cat("Fashion"),
      address: "RTC Complex, Eluru - 534001, AP", whatsapp_number: "+918812234510", map_link: "https://www.google.com/maps/place/Max+Fashion+Eluru/@16.7075,81.0972,17z",
      banner_image: "https://images.unsplash.com/photo-1441984904996-1035abb5dd88?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=450&fit=crop", "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1441984904996-1035abb5dd88?w=200&h=200&fit=crop", is_premium: true, featured: true, subscription_active: true, commission_percentage: "14", listing_type: "both",
      business_hours: "Mon-Sun: 10 AM - 9:30 PM",
      products: [
        { name: "Women's Kurta (Set of 3)", type: "product", description: "Printed cotton kurtas in trending colours", price: "999", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop" },
        { name: "Men's Formal Shirt", type: "product", description: "100% cotton formal shirt, all sizes", price: "599", image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&h=300&fit=crop" },
        { name: "Kids Dress Pack", type: "product", description: "Set of 2 casual dresses for kids (2-12 yrs)", price: "799", image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "MAXFASH30", type: "percentage", value: "30", featured: true, expiry_date: exp30 },
        { code: "MAXKIDS", type: "flat", value: "200", featured: false, expiry_date: exp60 },
      ],
      offline: { title: "Max Fashion - Special Store Discount", description: "Show at billing: flat 10% extra off on all items (not combinable with other offers)", banner_image: "https://images.unsplash.com/photo-1441984904996-1035abb5dd88?w=800&h=450&fit=crop", total_codes: 100 },
    },
    {
      name: "Fabindia Eluru", description: "Authentic handloom and handcraft clothing from India. Sarees, kurtas, home textiles & organic food products.", category_id: cat("Fashion"),
      address: "Congress Office Road, Eluru - 534001, AP", whatsapp_number: "+918812234511", map_link: "https://www.google.com/maps/place/Fabindia+Eluru/@16.7065,81.0956,17z",
      banner_image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1441984904996-1035abb5dd88?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=200&h=200&fit=crop", is_premium: false, featured: false, subscription_active: true, commission_percentage: "12", listing_type: "both",
      business_hours: "Mon-Sun: 10:30 AM - 8:30 PM",
      products: [
        { name: "Handloom Saree", type: "product", description: "Pure cotton handloom saree with zari border", price: "2499", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop" },
        { name: "Khadi Kurta (Men)", type: "product", description: "Handspun khadi kurta, eco-friendly & comfortable", price: "1299", image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&h=300&fit=crop" },
        { name: "Organic Honey (500g)", type: "product", description: "Pure unprocessed multiflora honey", price: "499", image: "https://images.unsplash.com/photo-1587049352851-8d4e89133924?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "FABINDIA15", type: "percentage", value: "15", featured: false, expiry_date: exp60 },
      ],
    },
    {
      name: "Jawed Habib Hair Studio Eluru", description: "Premium hair salon with expert stylists. Haircut, colour, keratin treatment, bridal makeup & more.", category_id: cat("Beauty & Wellness"),
      address: "Venkata Rao Street, Eluru - 534001, AP", whatsapp_number: "+918812234512", map_link: "https://www.google.com/maps/place/Jawed+Habib+Hair+Studio+Eluru/@16.7081,81.0966,17z",
      banner_image: "https://images.unsplash.com/photo-1560066984-138daec99fd9?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1487412912498-0447fe886868?w=800&h=450&fit=crop", "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1560066984-138daec99fd9?w=200&h=200&fit=crop", is_premium: true, featured: true, subscription_active: true, commission_percentage: "18", listing_type: "both",
      business_hours: "Mon-Sat: 10 AM - 8 PM, Sun: 10 AM - 6 PM",
      products: [
        { name: "Haircut (Men)", type: "service", description: "Wash + cut + blow dry by expert stylist", price: "299", image: "https://images.unsplash.com/photo-1517832207067-4db24a2ae47c?w=400&h=300&fit=crop" },
        { name: "Hair Colour (Women)", type: "service", description: "Global hair colour with premium brands", price: "1499", image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400&h=300&fit=crop" },
        { name: "Keratin Treatment", type: "service", description: "Frizz-free straight hair for 3-6 months", price: "3999", image: "https://images.unsplash.com/photo-1487412912498-0447fe886868?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "JAWEDHAIR25", type: "percentage", value: "25", featured: true, expiry_date: exp30 },
      ],
      offline: { title: "Jawed Habib - Free Head Massage", description: "Show coupon for complimentary 15-min head massage with any haircut", banner_image: "https://images.unsplash.com/photo-1560066984-138daec99fd9?w=800&h=450&fit=crop", total_codes: 40 },
    },
    {
      name: "Lakme Salon Eluru", description: "Trusted beauty salon brand. Facials, waxing, threading, mehndi, bridal packages & nail art services.", category_id: cat("Beauty & Wellness"),
      address: "Srinivasa Nagar, Eluru - 534001, AP", whatsapp_number: "+918812234513", map_link: "https://www.google.com/maps/place/Lakme+Salon+Eluru/@16.7077,81.0959,17z",
      banner_image: "https://images.unsplash.com/photo-1487412912498-0447fe886868?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1560066984-138daec99fd9?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1487412912498-0447fe886868?w=200&h=200&fit=crop", is_premium: true, featured: false, subscription_active: true, commission_percentage: "16", listing_type: "both",
      business_hours: "Mon-Sun: 10 AM - 7:30 PM",
      products: [
        { name: "Classic Facial", type: "service", description: "Cleansing + scrub + massage + mask (60 min)", price: "799", image: "https://images.unsplash.com/photo-1487412912498-0447fe886868?w=400&h=300&fit=crop" },
        { name: "Manicure + Pedicure Combo", type: "service", description: "Complete hand & foot care with nail paint", price: "999", image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=300&fit=crop" },
        { name: "Bridal Makeup Package", type: "service", description: "Full bridal makeup including trial session", price: "9999", image: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "LAKME20", type: "percentage", value: "20", featured: true, expiry_date: exp30 },
        { code: "LAKMEFACIAL", type: "free_item", value: "0", featured: true, expiry_date: exp30 },
      ],
    },
    {
      name: "Kalyan Jewellers Eluru", description: "India's trusted jewellery brand. Gold, silver, platinum jewellery. Exchange offers, EMI available.", category_id: cat("Jewelry"),
      address: "Main Road, Near Clock Tower, Eluru - 534001, AP", whatsapp_number: "+918812234514", map_link: "https://www.google.com/maps/place/Kalyan+Jewellers+Eluru/@16.7083,81.0972,17z",
      banner_image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1573408301185-9519f94558ec?w=800&h=450&fit=crop", "https://images.unsplash.com/photo-1603974372039-adc49044b6bd?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&h=200&fit=crop", is_premium: true, featured: true, subscription_active: true, commission_percentage: "5", listing_type: "both",
      business_hours: "Mon-Sun: 10 AM - 8 PM",
      products: [
        { name: "Gold Chain (22KT, 5g)", type: "product", description: "Classic design 22kt gold chain, BIS hallmarked", price: "30000", image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=300&fit=crop" },
        { name: "Diamond Earrings", type: "product", description: "0.25 ct solitaire diamond stud earrings in 18kt white gold", price: "18500", image: "https://images.unsplash.com/photo-1573408301185-9519f94558ec?w=400&h=300&fit=crop" },
        { name: "Silver Anklets (Pair)", type: "product", description: "Traditional silver payal with bell charm, 925 silver", price: "2500", image: "https://images.unsplash.com/photo-1603974372039-adc49044b6bd?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "KALYAN1000", type: "flat", value: "1000", featured: true, expiry_date: exp30 },
      ],
    },
    {
      name: "Tanishq Jewellery Eluru", description: "India's most trusted jewellery brand. Exquisite diamond & gold jewellery. Exchange offer on old gold.", category_id: cat("Jewelry"),
      address: "Powerpet, Eluru - 534002, AP", whatsapp_number: "+918812234515", map_link: "https://www.google.com/maps/place/Tanishq+Jewellery+Eluru/@16.7091,81.1021,17z",
      banner_image: "https://images.unsplash.com/photo-1573408301185-9519f94558ec?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1573408301185-9519f94558ec?w=200&h=200&fit=crop", is_premium: true, featured: false, subscription_active: true, commission_percentage: "5", listing_type: "both",
      business_hours: "Mon-Sun: 10 AM - 8:30 PM",
      products: [
        { name: "Tanishq Mia Ring", type: "product", description: "14kt gold diamond ring from Mia collection", price: "12500", image: "https://images.unsplash.com/photo-1603974372039-adc49044b6bd?w=400&h=300&fit=crop" },
        { name: "Mangalsutra (Gold)", type: "product", description: "Traditional Telugu mangalsutra, 22kt gold, 5g", price: "28000", image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=300&fit=crop" },
        { name: "Bangles Set (4 pcs)", type: "product", description: "Plain gold bangles, 22kt, 10g set", price: "58000", image: "https://images.unsplash.com/photo-1573408301185-9519f94558ec?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "TANISHQ500", type: "flat", value: "500", featured: true, expiry_date: exp30 },
        { code: "TANISHQGOLD", type: "percentage", value: "2", featured: false, expiry_date: exp90 },
      ],
    },
    {
      name: "Reliance Fresh Eluru", description: "Fresh fruits, vegetables, dairy, groceries & household essentials. Daily fresh produce from local farms.", category_id: cat("Groceries"),
      address: "Aditya Nagar, Eluru - 534001, AP", whatsapp_number: "+918812234516", map_link: "https://www.google.com/maps/place/Reliance+Fresh+Eluru/@16.7055,81.0956,17z",
      banner_image: "https://images.unsplash.com/photo-1588964895597-cfca880b5a6c?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=450&fit=crop", "https://images.unsplash.com/photo-1506617564039-2f3b650b7010?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1588964895597-cfca880b5a6c?w=200&h=200&fit=crop", is_premium: false, featured: false, subscription_active: true, commission_percentage: "5", listing_type: "both",
      business_hours: "Mon-Sun: 8 AM - 9:30 PM",
      products: [
        { name: "Fresh Vegetables Basket (2kg)", type: "product", description: "Seasonal mixed vegetables, farm fresh daily", price: "89", image: "https://images.unsplash.com/photo-1506617564039-2f3b650b7010?w=400&h=300&fit=crop" },
        { name: "Amul Full Cream Milk (1L)", type: "product", description: "Fresh pasteurised full cream milk", price: "70", image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=300&fit=crop" },
        { name: "Grocery Essentials Box", type: "product", description: "Rice 5kg + dal 1kg + oil 1L + spices combo", price: "849", image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "RFRESH100", type: "flat", value: "50", featured: false, expiry_date: exp30 },
      ],
    },
    {
      name: "Big Bazaar Eluru", description: "India's favourite superstore. Groceries, clothing, electronics, household items - all under one roof.", category_id: cat("Groceries"),
      address: "VBC Complex, Eluru - 534002, AP", whatsapp_number: "+918812234517", map_link: "https://www.google.com/maps/place/Big+Bazaar+Eluru/@16.7040,81.0969,17z",
      banner_image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1588964895597-cfca880b5a6c?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop", is_premium: false, featured: false, subscription_active: true, commission_percentage: "6", listing_type: "both",
      business_hours: "Mon-Sun: 9 AM - 10 PM",
      products: [
        { name: "Monthly Grocery Pack", type: "product", description: "Complete household grocery bundle for 1 month", price: "2499", image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop" },
        { name: "Household Cleaning Kit", type: "product", description: "Detergent, floor cleaner, toilet cleaner, dishwash combo", price: "399", image: "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&h=300&fit=crop" },
        { name: "Snacks & Beverages Hamper", type: "product", description: "Biscuits, chips, juices, tea & more in gift box", price: "699", image: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "BAZAAR10", type: "percentage", value: "10", featured: false, expiry_date: exp60 },
        { code: "BIGBFREE", type: "free_item", value: "0", featured: true, expiry_date: exp30 },
      ],
      offline: { title: "Big Bazaar - Wednesday Special", description: "Every Wednesday: 5% extra off on all groceries. Show this coupon at billing.", banner_image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=450&fit=crop", total_codes: 200 },
    },
    {
      name: "MedPlus Pharmacy Eluru", description: "Trusted pharmacy chain with genuine medicines. Diagnostic booking, health monitoring, baby care & more.", category_id: cat("Pharmacy & Health"),
      address: "Gopi Colony, Eluru - 534001, AP", whatsapp_number: "+918812234518", map_link: "https://www.google.com/maps/place/MedPlus+Pharmacy+Eluru/@16.7053,81.0963,17z",
      banner_image: "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=200&h=200&fit=crop", is_premium: false, featured: false, subscription_active: true, commission_percentage: "8", listing_type: "both",
      business_hours: "Mon-Sun: 8 AM - 10 PM",
      products: [
        { name: "Health Check-up Booking", type: "service", description: "Complete blood count + sugar + thyroid panel", price: "699", image: "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=400&h=300&fit=crop" },
        { name: "Blood Pressure Monitor", type: "product", description: "Digital BP monitor with memory function", price: "1299", image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop" },
        { name: "Vitamin D3 + B12 Combo", type: "product", description: "3-month supply vitamin supplement pack", price: "499", image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "MEDPLUS15", type: "percentage", value: "15", featured: true, expiry_date: exp30 },
      ],
    },
    {
      name: "Sriram Hospitals Eluru", description: "Multi-speciality hospital with pharmacy. 24/7 emergency, ICU, operation theatre, lab & pharmacy.", category_id: cat("Pharmacy & Health"),
      address: "Rajamandri Road, Eluru - 534001, AP", whatsapp_number: "+918812234519", map_link: "https://www.google.com/maps/place/Sriram+Hospitals+Eluru/@16.7098,81.0948,17z",
      banner_image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1576602976047-174e57a47881?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=200&h=200&fit=crop", is_premium: true, featured: false, subscription_active: true, commission_percentage: "5", listing_type: "services",
      business_hours: "24/7 (Emergency), OPD: 9 AM - 5 PM",
      products: [
        { name: "OPD Consultation", type: "service", description: "Doctor consultation with digital prescription", price: "300", image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop" },
        { name: "Full Body Check-up", type: "service", description: "Complete health check-up with 40+ parameters", price: "1999", image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop" },
        { name: "Pharmacy - Generic Medicines", type: "service", description: "Quality generic medicines at 50-70% less than branded", price: "0", image: "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "SRIRAM20", type: "percentage", value: "20", featured: false, expiry_date: exp90 },
      ],
    },
    {
      name: "Sri Chaitanya School Eluru", description: "Premier educational institution. CBSE curriculum, JEE & NEET coaching, experienced faculty, results-oriented.", category_id: cat("Education"),
      address: "BVN Colony, Eluru - 534001, AP", whatsapp_number: "+918812234520", map_link: "https://www.google.com/maps/place/Sri+Chaitanya+School+Eluru/@16.7062,81.0935,17z",
      banner_image: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1434030216411-0b5816825d34?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=200&h=200&fit=crop", is_premium: true, featured: false, subscription_active: true, commission_percentage: "10", listing_type: "services",
      business_hours: "Mon-Sat: 7 AM - 5 PM",
      products: [
        { name: "JEE Coaching (Annual)", type: "service", description: "Complete JEE Main + Advanced classroom coaching (11th-12th)", price: "95000", image: "https://images.unsplash.com/photo-1434030216411-0b5816825d34?w=400&h=300&fit=crop" },
        { name: "NEET Coaching (Annual)", type: "service", description: "Medical entrance coaching with daily tests", price: "85000", image: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400&h=300&fit=crop" },
        { name: "Study Material Pack", type: "product", description: "Complete textbooks & DPP sheets set for Class 10", price: "2999", image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "CHAITANYA5000", type: "flat", value: "5000", featured: true, expiry_date: exp90 },
      ],
    },
    {
      name: "Narayana IIT Academy Eluru", description: "Top coaching for IIT-JEE, NEET & Foundation courses. Expert faculty, smart classes, hostel available.", category_id: cat("Education"),
      address: "Arundelpet, Eluru - 534001, AP", whatsapp_number: "+918812234521", map_link: "https://www.google.com/maps/place/Narayana+IIT+Academy+Eluru/@16.7069,81.0941,17z",
      banner_image: "https://images.unsplash.com/photo-1434030216411-0b5816825d34?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1434030216411-0b5816825d34?w=200&h=200&fit=crop", is_premium: false, featured: false, subscription_active: true, commission_percentage: "10", listing_type: "services",
      business_hours: "Mon-Sat: 7 AM - 6 PM",
      products: [
        { name: "Foundation Course (Class 8-10)", type: "service", description: "Maths & Science foundation with competitive exam prep", price: "35000", image: "https://images.unsplash.com/photo-1434030216411-0b5816825d34?w=400&h=300&fit=crop" },
        { name: "Online Test Series", type: "service", description: "1000+ practice tests for JEE & NEET preparation", price: "4999", image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=300&fit=crop" },
        { name: "Crash Course (60 days)", type: "service", description: "Intensive 2-month revision for board & competitive exams", price: "15000", image: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "NARAYANA3000", type: "flat", value: "3000", featured: false, expiry_date: exp90 },
      ],
    },
    {
      name: "Decathlon Sports Eluru", description: "Everything for sport! Cricket, football, badminton, gym, swimming, cycling equipment at best prices.", category_id: cat("Sports & Fitness"),
      address: "Bypass Road, Eluru - 534002, AP", whatsapp_number: "+918812234522", map_link: "https://www.google.com/maps/place/Decathlon+Sports+Eluru/@16.7085,81.1052,17z",
      banner_image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1593906657550-81e48c7c4e3b?w=800&h=450&fit=crop", "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200&h=200&fit=crop", is_premium: false, featured: true, subscription_active: true, commission_percentage: "8", listing_type: "both",
      business_hours: "Mon-Sun: 9 AM - 9 PM",
      products: [
        { name: "Cricket Set (Junior)", type: "product", description: "Bat + ball + stumps + gloves set for kids 8-14 yrs", price: "1299", image: "https://images.unsplash.com/photo-1593906657550-81e48c7c4e3b?w=400&h=300&fit=crop" },
        { name: "Badminton Racket Set", type: "product", description: "2 rackets + 6 shuttles + bag, tournament quality", price: "999", image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop" },
        { name: "Gym Fitness Combo", type: "product", description: "Dumbbell pair (5kg) + resistance bands + yoga mat", price: "1799", image: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "DECA15", type: "percentage", value: "15", featured: true, expiry_date: exp30 },
        { code: "SPORTHUB", type: "flat", value: "200", featured: false, expiry_date: exp60 },
      ],
      offline: { title: "Decathlon - Free Sport Consultation", description: "Show coupon for free 30-min session with our sports expert to pick right gear", banner_image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=450&fit=crop", total_codes: 50 },
    },
    {
      name: "Hotel Grand Eluru", description: "Premium 4-star hotel in the heart of Eluru. AC rooms, restaurant, banquet hall, conference rooms & spa.", category_id: cat("Travel"),
      address: "D.L. Road, Eluru - 534001, AP", whatsapp_number: "+918812234523", map_link: "https://www.google.com/maps/place/Hotel+Grand+Eluru/@16.7065,81.0966,17z",
      banner_image: "https://images.unsplash.com/photo-1566073771259-e5c8674bbb0c?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=450&fit=crop", "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1566073771259-e5c8674bbb0c?w=200&h=200&fit=crop", is_premium: true, featured: true, subscription_active: true, commission_percentage: "12", listing_type: "both",
      business_hours: "24/7",
      products: [
        { name: "Standard Deluxe Room (1 night)", type: "product", description: "AC room with breakfast, WiFi, TV & daily housekeeping", price: "2499", image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop" },
        { name: "Banquet Hall Booking", type: "service", description: "Hall for 100-500 guests with A/V setup (per day)", price: "25000", image: "https://images.unsplash.com/photo-1566073771259-e5c8674bbb0c?w=400&h=300&fit=crop" },
        { name: "Couple Spa Package", type: "service", description: "90-min spa session for two with herbal treatments", price: "3999", image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "GRANDROOM", type: "percentage", value: "20", featured: true, expiry_date: exp30 },
        { code: "GRANDSPA", type: "flat", value: "500", featured: true, expiry_date: exp60 },
      ],
      offline: { title: "Hotel Grand - Free Breakfast Upgrade", description: "Show at check-in for complimentary buffet breakfast upgrade for both guests", banner_image: "https://images.unsplash.com/photo-1566073771259-e5c8674bbb0c?w=800&h=450&fit=crop", total_codes: 30 },
    },
    {
      name: "Hotel Konark Eluru", description: "Budget-friendly hotel with clean rooms, free parking, restaurant, and central Eluru location.", category_id: cat("Travel"),
      address: "Chakali Road, Eluru - 534001, AP", whatsapp_number: "+918812234524", map_link: "https://www.google.com/maps/place/Hotel+Konark+Eluru/@16.7060,81.0978,17z",
      banner_image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1566073771259-e5c8674bbb0c?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=200&h=200&fit=crop", is_premium: false, featured: false, subscription_active: true, commission_percentage: "10", listing_type: "both",
      business_hours: "24/7",
      products: [
        { name: "Standard Room (1 night)", type: "product", description: "Air-conditioned room with TV & hot water", price: "1200", image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop" },
        { name: "Family Room (2 nights)", type: "product", description: "Spacious family room, 2 beds, AC, free WiFi", price: "2800", image: "https://images.unsplash.com/photo-1566073771259-e5c8674bbb0c?w=400&h=300&fit=crop" },
        { name: "Conference Room (half day)", type: "service", description: "Meeting room for 10-20 people with projector", price: "3000", image: "https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "KONARK15", type: "percentage", value: "15", featured: false, expiry_date: exp60 },
      ],
    },
    {
      name: "PVR Cinemas Eluru", description: "Premium multiplex cinema with Dolby Atmos, recliner seats. Telugu, Hindi, English movies daily.", category_id: cat("Entertainment"),
      address: "VBC Mall, Eluru - 534002, AP", whatsapp_number: "+918812234525", map_link: "https://www.google.com/maps/place/PVR+Cinemas+Eluru/@16.7048,81.0961,17z",
      banner_image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=800&h=450&fit=crop", "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=200&h=200&fit=crop", is_premium: true, featured: true, subscription_active: true, commission_percentage: "8", listing_type: "both",
      business_hours: "Daily shows: 10 AM, 1 PM, 4 PM, 7 PM, 10 PM",
      products: [
        { name: "Movie Ticket - Standard", type: "product", description: "2D standard hall ticket (any show)", price: "200", image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=400&h=300&fit=crop" },
        { name: "Movie Ticket - Recliner", type: "product", description: "Premium recliner seat with extra legroom", price: "450", image: "https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=400&h=300&fit=crop" },
        { name: "Popcorn + Drink Combo", type: "product", description: "Large caramel popcorn + 2 cold drinks", price: "299", image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "PVR2FOR1", type: "percentage", value: "50", featured: true, expiry_date: exp30 },
        { code: "PVRPOPCORN", type: "free_item", value: "0", featured: true, expiry_date: exp30 },
      ],
      offline: { title: "PVR Cinemas - Tuesday Discount", description: "Every Tuesday: Show coupon for 30% off on all tickets (valid for 1 person)", banner_image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&h=450&fit=crop", total_codes: 100 },
    },
    {
      name: "Home Centre Eluru", description: "Complete home furnishing & decor store. Furniture, beds, sofas, curtains, kitchenware & home accessories.", category_id: cat("Home & Living"),
      address: "Industrial Area, Eluru - 534001, AP", whatsapp_number: "+918812234526", map_link: "https://www.google.com/maps/place/Home+Centre+Eluru/@16.7102,81.0938,17z",
      banner_image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=450&fit=crop", "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&h=200&fit=crop", is_premium: false, featured: false, subscription_active: true, commission_percentage: "12", listing_type: "both",
      business_hours: "Mon-Sun: 10 AM - 9 PM",
      products: [
        { name: "3-Seater Sofa Set", type: "product", description: "Premium fabric sofa set with cushions, 5yr warranty", price: "18999", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop" },
        { name: "King Size Bed Frame", type: "product", description: "Solid wood king bed with storage drawers", price: "24999", image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop" },
        { name: "Curtain Set (Window)", type: "product", description: "Blackout curtains, pair, 4 colour options", price: "1299", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "HOMECENTRE10", type: "percentage", value: "10", featured: false, expiry_date: exp60 },
        { code: "HOMEFURNISH", type: "flat", value: "1000", featured: true, expiry_date: exp30 },
      ],
    },
    {
      name: "Subway Eluru", description: "Fresh custom sandwiches, wraps, salads. Choose your bread, protein, veggies & sauces. Healthy fast food.", category_id: cat("Food & Dining"),
      address: "Powerpet Main Road, Eluru - 534002, AP", whatsapp_number: "+919000234527", map_link: "https://www.google.com/maps/place/Subway+Eluru/@16.7075,81.1030,17z",
      banner_image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&h=450&fit=crop", "https://images.unsplash.com/photo-1619096252214-ef06c45683e3?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=200&fit=crop", is_premium: false, featured: false, subscription_active: true, commission_percentage: "10", listing_type: "both",
      business_hours: "Mon-Sun: 10 AM - 11 PM",
      products: [
        { name: "Veggie Delight Sub (6\")", type: "product", description: "Fresh veggies on Italian bread with sauces", price: "199", image: "https://images.unsplash.com/photo-1619096252214-ef06c45683e3?w=400&h=300&fit=crop" },
        { name: "Chicken Tikka Sub (12\")", type: "product", description: "Grilled chicken tikka with fresh veggies & chipotle sauce", price: "349", image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop" },
        { name: "Meal Deal (Sub + Drink + Cookie)", type: "product", description: "6\" sub + fountain drink + cookie combo", price: "299", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "SUBWAYCLUB", type: "flat", value: "50", featured: false, expiry_date: exp60 },
        { code: "SUBFREECOOKIE", type: "free_item", value: "0", featured: true, expiry_date: exp30 },
      ],
    },
    {
      name: "Hotel Yamuna Restaurant Eluru", description: "Andhra traditional non-veg meals, fish fry, chicken curry. Famous for Sunday special mutton curry & bone marrow.", category_id: cat("Restaurants"),
      address: "Near Devi Theatre, Eluru - 534001, AP", whatsapp_number: "+918812234528", map_link: "https://www.google.com/maps/place/Hotel+Yamuna+Restaurant+Eluru/@16.7055,81.0971,17z",
      banner_image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200&h=200&fit=crop", is_premium: false, featured: false, subscription_active: true, commission_percentage: "8", listing_type: "both",
      business_hours: "Mon-Sun: 11 AM - 3:30 PM, 7 PM - 10:30 PM",
      products: [
        { name: "Andhra Non-Veg Meals", type: "product", description: "Rice + chicken curry + fish fry + sambar + curd", price: "150", image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop" },
        { name: "Fish Fry (Rohu, 250g)", type: "product", description: "Spicy Andhra-style rohu fish fry", price: "180", image: "https://images.unsplash.com/photo-1519984388953-d2406bc725e1?w=400&h=300&fit=crop" },
        { name: "Mutton Curry (Single)", type: "product", description: "Slow-cooked mutton curry with rice", price: "220", image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "YAMUNA10", type: "percentage", value: "10", featured: false, expiry_date: exp60 },
      ],
    },
    {
      name: "Airtel Xstream Center Eluru", description: "Official Airtel store. Prepaid & postpaid SIM, fiber broadband, Airtel Black plans, DTH & accessories.", category_id: cat("Electronics"),
      address: "One Town, Eluru - 534001, AP", whatsapp_number: "+918812234529", map_link: "https://www.google.com/maps/place/Airtel+Xstream+Center+Eluru/@16.7063,81.0940,17z",
      banner_image: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=1200&h=500&fit=crop",
      banners: ["https://images.unsplash.com/photo-1585771724702-34681be2a29d?w=800&h=450&fit=crop"],
      logo: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=200&h=200&fit=crop", is_premium: false, featured: false, subscription_active: true, commission_percentage: "5", listing_type: "services",
      business_hours: "Mon-Sat: 9:30 AM - 7:30 PM",
      products: [
        { name: "Airtel Fiber 100Mbps (Monthly)", type: "service", description: "Unlimited broadband + free OTT + unlimited calls", price: "599", image: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400&h=300&fit=crop" },
        { name: "Postpaid Plan ₹299", type: "service", description: "Unlimited calls + 25GB data + international roaming", price: "299", image: "https://images.unsplash.com/photo-1585771724702-34681be2a29d?w=400&h=300&fit=crop" },
        { name: "Airtel DTH Recharge (Monthly)", type: "service", description: "350+ channels + HD channels pack", price: "399", image: "https://images.unsplash.com/photo-1593359677879-a4bb92f4e10e?w=400&h=300&fit=crop" },
      ],
      coupons: [
        { code: "AIRTELSETUP", type: "flat", value: "200", featured: false, expiry_date: exp60 },
      ],
    },
  ];

  const newShopIds: string[] = [];
  for (const shopData of elurushops) {
    const { products: prods, coupons: cpns, offline, ...shopFields } = shopData;
    try {
      const createdShop = await storage.createShop(shopFields as any);
      newShopIds.push(createdShop.id);

      if (prods) {
        for (const p of prods) {
          try { await storage.createProduct({ ...p, shop_id: createdShop.id } as any); } catch {}
        }
      }

      const shopProducts = await storage.getProductsByShop(createdShop.id);
      const freeItemProductId = shopProducts[0]?.id;

      if (cpns) {
        for (const c of cpns) {
          const couponData: any = { ...c, shop_id: createdShop.id };
          if (c.type === "free_item" && freeItemProductId) {
            couponData.free_item_product_id = freeItemProductId;
          }
          try { await storage.createCoupon(couponData); } catch {}
        }
      }

      if (offline) {
        try {
          const oc = await storage.createOfflineCoupon({ ...offline, shop_id: createdShop.id } as any);
          const codes: string[] = [];
          const prefix = shopFields.name.replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase();
          for (let i = 0; i < Math.min(offline.total_codes, 20); i++) {
            codes.push(`${prefix}${Math.random().toString(36).slice(2, 8).toUpperCase()}`);
          }
          await storage.createOfflineCouponCodes(oc.id, codes);
        } catch {}
      }
    } catch {}
  }

  if (newShopIds.length > 0) {
    const vendorPass = await bcrypt.hash("Vendor@123", 10);
    for (const shopId of newShopIds) {
      const allShops2 = await storage.getAllShops();
      const shop = allShops2.find(s => s.id === shopId);
      if (shop) {
        const slug = shop.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
        const email = `${slug}@vendor.com`;
        try { await storage.createVendor({ shop_id: shop.id, name: shop.name, email, password: vendorPass }); } catch {}
      }
    }
  }

  console.log(`Seeded ${newShopIds.length} Eluru businesses!`);
}

function extractCoordsFromMapLink(url: string | null): { latitude: string; longitude: string } | null {
  if (!url || url.length < 10) return null;
  const patterns = [
    /@(-?\d+\.?\d+),(-?\d+\.?\d+)/,
    /[?&]q=(-?\d+\.?\d+),(-?\d+\.?\d+)/,
    /[?&]ll=(-?\d+\.?\d+),(-?\d+\.?\d+)/,
    /place\/(-?\d+\.?\d+),(-?\d+\.?\d+)/,
    /center=(-?\d+\.?\d+),(-?\d+\.?\d+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)
        return { latitude: String(lat), longitude: String(lng) };
    }
  }
  return null;
}

async function migrateShopMapLinks() {
  const mapLinkData: Record<string, string> = {
    "Anand Bhavan Restaurant": "https://www.google.com/maps/place/Anand+Bhavan+Restaurant+Eluru/@16.7051,81.0971,17z",
    "Sri Santhi Sagar Restaurant": "https://www.google.com/maps/place/Sri+Santhi+Sagar+Restaurant+Eluru/@16.7089,81.1021,17z",
    "Al-Raheem Biryani": "https://www.google.com/maps/place/Al-Raheem+Biryani+Eluru/@16.7044,81.0921,17z",
    "Sri Krishna Bakery & Sweets": "https://www.google.com/maps/place/Sri+Krishna+Bakery+Sweets+Eluru/@16.7038,81.0961,17z",
    "Sri Sai Sweets Eluru": "https://www.google.com/maps/place/Sri+Sai+Sweets+Eluru/@16.7045,81.0955,17z",
    "KFC Eluru": "https://www.google.com/maps/place/KFC+Eluru/@16.7071,81.1028,17z",
    "Dominos Pizza Eluru": "https://www.google.com/maps/place/Dominos+Pizza+Eluru/@16.7052,81.0982,17z",
    "Poorvika Mobiles Eluru": "https://www.google.com/maps/place/Poorvika+Mobiles+Eluru/@16.7068,81.0988,17z",
    "Croma Electronics Eluru": "https://www.google.com/maps/place/Croma+Electronics+Eluru/@16.7058,81.0973,17z",
    "Max Fashion Eluru": "https://www.google.com/maps/place/Max+Fashion+Eluru/@16.7075,81.0972,17z",
    "Fabindia Eluru": "https://www.google.com/maps/place/Fabindia+Eluru/@16.7065,81.0956,17z",
    "Jawed Habib Hair Studio Eluru": "https://www.google.com/maps/place/Jawed+Habib+Hair+Studio+Eluru/@16.7081,81.0966,17z",
    "Lakme Salon Eluru": "https://www.google.com/maps/place/Lakme+Salon+Eluru/@16.7077,81.0959,17z",
    "Kalyan Jewellers Eluru": "https://www.google.com/maps/place/Kalyan+Jewellers+Eluru/@16.7083,81.0972,17z",
    "Tanishq Jewellery Eluru": "https://www.google.com/maps/place/Tanishq+Jewellery+Eluru/@16.7091,81.1021,17z",
    "Reliance Fresh Eluru": "https://www.google.com/maps/place/Reliance+Fresh+Eluru/@16.7055,81.0956,17z",
    "Big Bazaar Eluru": "https://www.google.com/maps/place/Big+Bazaar+Eluru/@16.7040,81.0969,17z",
    "MedPlus Pharmacy Eluru": "https://www.google.com/maps/place/MedPlus+Pharmacy+Eluru/@16.7053,81.0963,17z",
    "Sriram Hospitals Eluru": "https://www.google.com/maps/place/Sriram+Hospitals+Eluru/@16.7098,81.0948,17z",
    "Sri Chaitanya School Eluru": "https://www.google.com/maps/place/Sri+Chaitanya+School+Eluru/@16.7062,81.0935,17z",
    "Narayana IIT Academy Eluru": "https://www.google.com/maps/place/Narayana+IIT+Academy+Eluru/@16.7069,81.0941,17z",
    "Decathlon Sports Eluru": "https://www.google.com/maps/place/Decathlon+Sports+Eluru/@16.7085,81.1052,17z",
    "Hotel Grand Eluru": "https://www.google.com/maps/place/Hotel+Grand+Eluru/@16.7065,81.0966,17z",
    "Hotel Konark Eluru": "https://www.google.com/maps/place/Hotel+Konark+Eluru/@16.7060,81.0978,17z",
    "PVR Cinemas Eluru": "https://www.google.com/maps/place/PVR+Cinemas+Eluru/@16.7048,81.0961,17z",
    "Home Centre Eluru": "https://www.google.com/maps/place/Home+Centre+Eluru/@16.7102,81.0938,17z",
    "Subway Eluru": "https://www.google.com/maps/place/Subway+Eluru/@16.7075,81.1030,17z",
    "Hotel Yamuna Restaurant Eluru": "https://www.google.com/maps/place/Hotel+Yamuna+Restaurant+Eluru/@16.7055,81.0971,17z",
    "Airtel Xstream Center Eluru": "https://www.google.com/maps/place/Airtel+Xstream+Center+Eluru/@16.7063,81.0940,17z",
    "Navayuga Family Restaurant": "https://www.google.com/maps/place/Navayuga+Family+Restaurant+Eluru/@16.7048,81.1008,17z",
    "Arabic Family Restaurant": "https://www.google.com/maps/place/Arabic+Family+Restaurant+Eluru/@16.7122,81.0968,17z",
    "Paradise Biryani Eluru": "https://www.google.com/maps/place/Paradise+Biryani+Eluru/@16.7090,81.0985,17z",
    "Madina Biryani Point": "https://www.google.com/maps/place/Madina+Biryani+Point+Eluru/@16.7042,81.0930,17z",
    "Garuda Food Court": "https://www.google.com/maps/place/Garuda+Food+Court+Eluru/@16.7058,81.0945,17z",
    "Ratnadeep Super Market": "https://www.google.com/maps/place/Ratnadeep+Super+Market+Eluru/@16.7065,81.0978,17z",
    "Reliance Digital Eluru": "https://www.google.com/maps/place/Reliance+Digital+Eluru/@16.7072,81.0982,17z",
    "Samsung SmartPlaza Eluru": "https://www.google.com/maps/place/Samsung+SmartPlaza+Eluru/@16.7060,81.0979,17z",
    "Bajaj Electronics Eluru": "https://www.google.com/maps/place/Bajaj+Electronics+Eluru/@16.7048,81.1025,17z",
    "Green Trends Unisex Salon": "https://www.google.com/maps/place/Green+Trends+Salon+Eluru/@16.7128,81.0968,17z",
    "Naturals Unisex Salon Eluru": "https://www.google.com/maps/place/Naturals+Salon+Eluru/@16.7132,81.0971,17z",
    "CMR Central Multiplex Mall": "https://www.google.com/maps/place/CMR+Central+Mall+Eluru/@16.7062,81.0954,17z",
    "Lalitha Jewellery Mart": "https://www.google.com/maps/place/Lalitha+Jewellery+Mart+Eluru/@16.7130,81.0966,17z",
    "Apollo Pharmacy Eluru": "https://www.google.com/maps/place/Apollo+Pharmacy+Eluru/@16.7120,81.0962,17z",
    "VLCC Wellness Eluru": "https://www.google.com/maps/place/VLCC+Wellness+Eluru/@16.7082,81.0958,17z",
    "BeYou Salon Eluru": "https://www.google.com/maps/place/BeYou+Salon+Eluru/@16.7088,81.0962,17z",
    "Hotel Sitara A/C": "https://www.google.com/maps/place/Hotel+Sitara+Eluru/@16.7070,81.0975,17z",
    "F2 Food & Fun Restaurant": "https://www.google.com/maps/place/F2+Food+Fun+Restaurant+Eluru/@16.7055,81.0968,17z",
    "7th heaven": "https://www.google.com/maps/place/7th+Heaven+Eluru/@16.7088,81.0971,17z",
    "Zudio Eluru": "https://www.google.com/maps/place/Zudio+Eluru/@16.7050,81.0960,17z",
  };
  try {
    const allShops = await storage.getAllShops();
    let updated = 0;
    for (const shop of allShops) {
      const correctLink = mapLinkData[shop.name];
      const needsLinkUpdate = correctLink && (!shop.map_link || shop.map_link.includes("goo.gl"));
      const effectiveLink = needsLinkUpdate ? correctLink : shop.map_link;
      const coords = extractCoordsFromMapLink(effectiveLink);
      const needsCoordsUpdate = coords && (!shop.latitude || !shop.longitude);
      if (needsLinkUpdate || needsCoordsUpdate) {
        const updateData: Record<string, string> = {};
        if (needsLinkUpdate && correctLink) updateData.map_link = correctLink;
        if (coords) { updateData.latitude = coords.latitude; updateData.longitude = coords.longitude; }
        await db.update(shops).set(updateData).where(sql`id = ${shop.id}`);
        updated++;
      }
    }
    if (updated > 0) console.log(`Migrated map data for ${updated} shops.`);
  } catch (e) {
    console.error("migrateShopMapLinks error:", e);
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  const cookieParser = (await import("cookie-parser")).default;
  app.use(cookieParser());
  const express = (await import("express")).default;
  app.use("/uploads", express.static(uploadsDir));

  await seedDatabase();
  await seedElurubusinesses();
  await migrateShopMapLinks();

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
    res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone, address: user.address, role: user.role });
  });

  app.get("/api/auth/google", (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(503).json({ error: "Google login not configured" });
    const domain = (process.env.REPLIT_DOMAINS || "").split(",")[0] || req.get("host") || "localhost";
    const callbackUrl = `https://${domain}/api/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: "code",
      scope: "email profile",
      access_type: "online",
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) return res.redirect("/?error=google_not_configured");
      const code = req.query.code as string;
      if (!code) return res.redirect("/?error=google_denied");
      const domain = (process.env.REPLIT_DOMAINS || "").split(",")[0] || req.get("host") || "localhost";
      const callbackUrl = `https://${domain}/api/auth/google/callback`;
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: callbackUrl,
          grant_type: "authorization_code",
        }),
      });
      const tokenData = await tokenRes.json() as any;
      if (!tokenData.access_token) return res.redirect("/login?error=google_token_failed");
      const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const profile = await profileRes.json() as any;
      if (!profile.email) return res.redirect("/login?error=google_no_email");
      let user = await storage.getUserByEmail(profile.email);
      if (!user) {
        const randomPass = await bcrypt.hash(Math.random().toString(36), 10);
        user = await storage.createUser({
          name: profile.name || profile.email.split("@")[0],
          email: profile.email,
          phone: null,
          password: randomPass,
          role: "user",
        });
      }
      const token = generateToken({ id: user.id, email: user.email, role: user.role });
      res.cookie("token", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
      res.redirect(`/home?google_token=${encodeURIComponent(token)}`);
    } catch (err) {
      console.error("Google OAuth error:", err);
      res.redirect("/login?error=google_failed");
    }
  });

  app.patch("/api/users/me", authMiddleware, async (req, res) => {
    try {
      const { name, phone, address } = req.body;
      const data: any = {};
      if (name !== undefined) data.name = name;
      if (phone !== undefined) data.phone = phone || null;
      if (address !== undefined) data.address = address || null;
      const updated = await storage.updateUser((req as any).user.id, data);
      if (!updated) return res.status(404).json({ error: "User not found" });
      res.json({ id: updated.id, name: updated.name, email: updated.email, phone: updated.phone, address: updated.address, role: updated.role });
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  // Categories
  app.get("/api/categories", async (req, res) => {
    const allCats = await storage.getAllCategories();
    if (req.query.withShops === "true") {
      const allShops = await storage.getAllShops();
      const shopCatIds = new Set(allShops.map(s => s.category_id).filter(Boolean));
      return res.json(allCats.filter(c => shopCatIds.has(c.id)));
    }
    res.json(allCats);
  });

  app.get("/api/categories/top", async (req, res) => {
    res.json(await storage.getTopCategories());
  });

  app.patch("/api/admin/categories/:id/toggle-top", adminMiddleware, async (req, res) => {
    const updated = await storage.toggleTopCategory(req.params.id);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.patch("/api/admin/shops/:id/toggle-top", adminMiddleware, async (req, res) => {
    const updated = await storage.toggleTopShop(req.params.id);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.post("/api/categories", adminMiddleware, async (req, res) => {
    try {
      const data = insertCategorySchema.parse(req.body);
      res.json(await storage.createCategory(data));
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  app.put("/api/categories/:id", adminMiddleware, async (req, res) => {
    try {
      const updated = await storage.updateCategory(req.params.id, sanitizeBody(req.body));
      if (!updated) return res.status(404).json({ error: "Not found" });
      res.json(updated);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  app.delete("/api/categories/:id", adminMiddleware, async (req, res) => {
    await storage.deleteCategory(req.params.id);
    res.json({ success: true });
  });

  // File upload → Supabase Storage
  app.post("/api/upload", adminMiddleware, memUpload.single("file"), async (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    try {
      if (supabase) {
        const ext = req.file.originalname.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage
          .from(SUPABASE_BUCKET)
          .upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
        if (error) {
          console.error("[Supabase Upload Error]", JSON.stringify(error));
          const msg = (error.message || "").toLowerCase();
          if (msg.includes("bucket") || msg.includes("not found") || msg.includes("does not exist") || msg.includes("no such")) {
            return res.status(400).json({ error: "supabase_bucket_missing", message: "Please create a public bucket named 'images' in your Supabase Storage dashboard.", detail: error.message });
          }
          throw new Error(error.message);
        }
        const { data: urlData } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(fileName);
        return res.json({ url: urlData.publicUrl, provider: "supabase" });
      } else {
        const localName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.]/g, "_")}`;
        fs.writeFileSync(path.join(uploadsDir, localName), req.file.buffer);
        return res.json({ url: `/uploads/${localName}`, provider: "local" });
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Upload failed" });
    }
  });

  // Shops
  app.get("/api/shops", async (req, res) => {
    const { categoryId } = req.query;
    res.json(await storage.getAllShops(categoryId as string | undefined));
  });

  app.get("/api/shops/featured", async (req, res) => {
    res.json(await storage.getFeaturedShops());
  });

  app.get("/api/shops/top", async (req, res) => {
    res.json(await storage.getTopShops());
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
      const body = sanitizeBody(req.body);
      if (body.map_link) {
        const coords = extractCoordsFromMapLink(body.map_link);
        if (coords) { body.latitude = coords.latitude; body.longitude = coords.longitude; }
      }
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

  app.post("/api/products/bulk", adminMiddleware, async (req, res) => {
    try {
      const { shop_id, items } = req.body;
      if (!shop_id || !Array.isArray(items) || items.length === 0)
        return res.status(400).json({ error: "shop_id and items[] required" });
      const created: any[] = [];
      for (const item of items) {
        if (!item.name || item.name.trim() === "") continue;
        const product = await storage.createProduct({
          shop_id,
          name: item.name.trim(),
          description: item.description || "",
          price: item.price ? String(item.price) : "0",
          type: item.type || "food",
          sub_category: item.sub_category || item.category || "",
          is_active: true,
        } as any);
        created.push(product);
      }
      res.json({ count: created.length, products: created });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.put("/api/products/:id", adminMiddleware, async (req, res) => {
    try {
      const updated = await storage.updateProduct(req.params.id, sanitizeBody(req.body));
      if (!updated) return res.status(404).json({ error: "Not found" });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
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
      const { code, shopId, cartTotal } = req.body;
      const coupon = await storage.getCouponByCode(code, shopId);
      if (!coupon) return res.status(404).json({ error: "Invalid or expired coupon" });
      if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
        return res.status(400).json({ error: "Coupon has expired" });
      }

      // Min order amount check for free_item coupons
      if (coupon.type === "free_item" && coupon.min_order_amount) {
        const minAmt = parseFloat(coupon.min_order_amount);
        const cartAmt = parseFloat(cartTotal || "0");
        if (cartAmt < minAmt) {
          return res.status(400).json({ error: `Minimum order ₹${minAmt.toFixed(0)} required for this free item coupon. Add ₹${(minAmt - cartAmt).toFixed(0)} more.` });
        }
      }

      let items_to_add: { id: string; name: string; price: number; shop_id: string; shopName: string; isFreeItem?: boolean }[] = [];
      const shop = coupon.shop_id ? await storage.getShop(coupon.shop_id) : null;
      const shopName = shop?.name || "Shop";

      // Attached products (optional, any coupon type)
      const cpItems = await storage.getCouponProducts(coupon.id);
      if (cpItems.length > 0) {
        for (const cp of cpItems) {
          const qty = Math.max(1, parseInt(String((cp as any).quantity || "1")));
          for (let q = 0; q < qty; q++) {
            items_to_add.push({
              id: cp.product?.id || cp.product_id || "",
              name: cp.product?.name || "Product",
              price: parseFloat(cp.custom_price),
              shop_id: cp.product?.shop_id || coupon.shop_id || "",
              shopName,
            });
          }
        }
      }

      // Free item — single auto-add mode (free_item_product_id is set, no pick list)
      if (coupon.type === "free_item" && coupon.free_item_product_id && !(coupon.free_item_products?.length)) {
        const product = await storage.getProduct(coupon.free_item_product_id);
        if (product) {
          const qty = Math.max(1, parseInt(String(coupon.free_item_qty || "1")));
          for (let i = 0; i < qty; i++) {
            items_to_add = [
              ...items_to_add,
              { id: product.id, name: product.name, price: 0, originalPrice: parseFloat(String(product.price || "0")), shop_id: product.shop_id || "", shopName, isFreeItem: true },
            ];
          }
        }
      }

      // Free item — pick-one mode (free_item_products array is set)
      let pick_one_items: { id: string; name: string; price: number; image?: string; shop_id: string; shopName: string }[] = [];
      if (coupon.type === "free_item" && coupon.free_item_products && coupon.free_item_products.length > 0) {
        for (const pid of coupon.free_item_products) {
          const product = await storage.getProduct(pid);
          if (product) {
            pick_one_items.push({
              id: product.id,
              name: product.name,
              price: parseFloat(String(product.price || "0")),
              image: product.image || product.images?.[0],
              shop_id: product.shop_id || "",
              shopName,
            });
          }
        }
      }

      // BOGO (Buy One Get One) — add buy product with real price + get product as free
      let bogo_buy_product_name: string | null = null;
      let bogo_get_product_name: string | null = null;
      if (coupon.type === "bogo") {
        if (coupon.bogo_buy_product_id) {
          const buyProduct = await storage.getProduct(coupon.bogo_buy_product_id);
          if (buyProduct) {
            bogo_buy_product_name = buyProduct.name;
            const buyQty = Math.max(1, parseInt(String(coupon.bogo_buy_qty || "1")));
            for (let i = 0; i < buyQty; i++) {
              items_to_add = [
                ...items_to_add,
                { id: buyProduct.id, name: buyProduct.name, price: parseFloat(String(buyProduct.price || "0")), shop_id: buyProduct.shop_id || "", shopName, isFreeItem: false, isBogoItem: true },
              ];
            }
          }
        }
        if (coupon.bogo_get_product_id) {
          const getProduct = await storage.getProduct(coupon.bogo_get_product_id);
          if (getProduct) {
            bogo_get_product_name = getProduct.name;
            const qty = Math.max(1, parseInt(String(coupon.bogo_get_qty || "1")));
            for (let i = 0; i < qty; i++) {
              items_to_add = [
                ...items_to_add,
                { id: getProduct.id, name: getProduct.name, price: 0, originalPrice: parseFloat(String(getProduct.price || "0")), shop_id: getProduct.shop_id || "", shopName, isFreeItem: true },
              ];
            }
          }
        }
      }

      res.json({ ...coupon, items_to_add, pick_one_items, bogo_buy_product_name, bogo_get_product_name });
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
      const { coupon_products: cpItems } = req.body;
      const rest = sanitizeBody(req.body);
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

  app.get("/api/admin/orders/:id", adminMiddleware, async (req, res) => {
    const order = await storage.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: "Not found" });
    res.json(order);
  });

  app.get("/api/vendor/orders", vendorMiddleware, async (req, res) => {
    const vendor = (req as any).vendor;
    if (!vendor.shop_id) return res.status(400).json({ error: "No shop linked" });
    res.json(await storage.getShopOrders(vendor.shop_id));
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
      const shopData = sanitizeBody(req.body, ["is_premium", "commission_percentage", "subscription_active", "featured"]);
      if (shopData.map_link) {
        const coords = extractCoordsFromMapLink(shopData.map_link);
        if (coords) { shopData.latitude = coords.latitude; shopData.longitude = coords.longitude; }
      }
      const updated = await storage.updateShop(shopId, shopData);
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
      const updated = await storage.updateProduct(req.params.id, sanitizeBody(req.body, ["shop_id"]));
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
      const { coupon_products: cpItems, ...rest } = req.body;
      const cleaned = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v === "" ? null : v]));
      const body = { ...cleaned, shop_id: shopId };
      if (body.expiry_date) body.expiry_date = new Date(body.expiry_date);
      const coupon = await storage.createCoupon(body);
      if (cpItems && Array.isArray(cpItems) && cpItems.length > 0) {
        await storage.setCouponProducts(coupon.id, cpItems);
      }
      res.json(coupon);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  app.patch("/api/vendor/coupons/:id", vendorMiddleware, async (req, res) => {
    try {
      const { coupon_products: cpItems } = req.body;
      const updated = await storage.updateCoupon(req.params.id, sanitizeBody(req.body, ["shop_id"]));
      if (!updated) return res.status(404).json({ error: "Not found" });
      if (cpItems !== undefined) {
        await storage.setCouponProducts(req.params.id, Array.isArray(cpItems) ? cpItems : []);
      }
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
      const updated = await storage.updateOfflineCoupon(req.params.id, sanitizeBody(req.body));
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

  app.get("/api/user/my-downloads", authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      res.json(await storage.getUserOfflineCoupons(userId));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/offline-coupon-codes/:codeId/use", authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const updated = await storage.markOfflineCouponCodeUsed(req.params.codeId, userId);
      res.json(updated);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  // ── Vendor Offline Coupons ───────────────────────────────────────────────────
  app.get("/api/vendor/offline-coupons", vendorMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).vendor.shop_id;
      res.json(await storage.getOfflineCouponsByShop(shopId));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/vendor/offline-coupons", vendorMiddleware, upload.single("banner"), async (req, res) => {
    try {
      const shopId = (req as any).vendor.shop_id;
      const { title, description, total_codes } = req.body;
      if (!title) return res.status(400).json({ error: "title is required" });
      let banner_image = req.body.banner_image || "";
      if (req.file) banner_image = `/uploads/${req.file.filename}`;
      if (!banner_image) return res.status(400).json({ error: "banner image is required" });
      const oc = await storage.createOfflineCoupon({
        shop_id: shopId,
        title,
        description: description || null,
        banner_image,
        total_codes: parseInt(total_codes || "10"),
        is_active: true,
      });
      const shop = await storage.getShop(shopId);
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

  app.patch("/api/vendor/offline-coupons/:id", vendorMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).vendor.shop_id;
      const oc = await storage.getOfflineCoupon(req.params.id);
      if (!oc || oc.shop_id !== shopId) return res.status(403).json({ error: "Forbidden" });
      const updated = await storage.updateOfflineCoupon(req.params.id, sanitizeBody(req.body, ["shop_id"]));
      res.json(updated);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  app.delete("/api/vendor/offline-coupons/:id", vendorMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).vendor.shop_id;
      const oc = await storage.getOfflineCoupon(req.params.id);
      if (!oc || oc.shop_id !== shopId) return res.status(403).json({ error: "Forbidden" });
      await storage.deleteOfflineCoupon(req.params.id);
      res.json({ ok: true });
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  app.get("/api/vendor/offline-coupons/:id/codes", vendorMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).vendor.shop_id;
      const oc = await storage.getOfflineCoupon(req.params.id);
      if (!oc || oc.shop_id !== shopId) return res.status(403).json({ error: "Forbidden" });
      res.json(await storage.getOfflineCouponCodes(req.params.id));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Site Settings (public read, admin write)
  app.get("/api/settings", async (_req, res) => {
    try { res.json(await storage.getAllSettings()); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/admin/settings", adminMiddleware, async (req, res) => {
    try {
      const { key, value } = req.body;
      if (!key || typeof value !== "string") return res.status(400).json({ error: "key and value required" });
      await storage.setSetting(key, value);
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  return httpServer;
}
