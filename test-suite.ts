import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./server/routes";
import { db, storage } from "./server/storage";
import { users, categories, shops, products, coupons, orders, vendors, contests, orderItems, notifications } from "@shared/schema";
import { sql, eq } from "drizzle-orm";

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

async function runTest(category: string, name: string, fn: () => Promise<any>) {
  const start = Date.now();
  try {
    const details = await fn();
    results.push({
      category,
      name,
      passed: true,
      durationMs: Date.now() - start,
      details,
    });
    console.log(`  ✓ PASS: ${name} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({
      category,
      name,
      passed: false,
      durationMs: Date.now() - start,
      error: err.message || String(err),
    });
    console.error(`  ✗ FAIL: ${name} (${Date.now() - start}ms) -> ${err.message}`);
  }
}

async function main() {
  console.log("==================================================");
  console.log("   COUPONSHUB X - AUTOMATED TEST SUITE           ");
  console.log("==================================================");

  // 1. Setup Server on dynamic port
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);

  await new Promise<void>((resolve) => {
    httpServer.listen(0, "127.0.0.1", () => resolve());
  });

  const addr = httpServer.address() as any;
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  console.log(`Test server running at ${baseUrl}\n`);

  let testUserToken = "";
  let adminToken = "";
  let testUserId = "";
  let createdOrderId = "";
  const testEmail = `test_${Date.now()}@example.com`;
  const testPhone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;

  try {
    // ------------------------------------------------------------------
    // DATABASE TESTS
    // ------------------------------------------------------------------
    console.log("\n[1] Testing Database Integrity & Schema...");
    await runTest("Database", "Database connection and counts", async () => {
      const [uCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
      const [cCount] = await db.select({ count: sql<number>`count(*)` }).from(categories);
      const [sCount] = await db.select({ count: sql<number>`count(*)` }).from(shops);
      const [pCount] = await db.select({ count: sql<number>`count(*)` }).from(products);
      const [cpCount] = await db.select({ count: sql<number>`count(*)` }).from(coupons);
      const [vCount] = await db.select({ count: sql<number>`count(*)` }).from(vendors);

      if (Number(uCount.count) < 1) throw new Error("Users table is empty");
      if (Number(sCount.count) < 1) throw new Error("Shops table is empty");
      if (Number(cCount.count) < 1) throw new Error("Categories table is empty");

      return {
        users: Number(uCount.count),
        categories: Number(cCount.count),
        shops: Number(sCount.count),
        products: Number(pCount.count),
        coupons: Number(cpCount.count),
        vendors: Number(vCount.count),
      };
    });

    // ------------------------------------------------------------------
    // AUTHENTICATION & SECURITY TESTS
    // ------------------------------------------------------------------
    console.log("\n[2] Testing Authentication & Authorization...");

    await runTest("Auth", "User Registration (Valid payload)", async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test User",
          email: testEmail,
          phone: testPhone,
          password: "Password@123",
          address: "123 Test Street, Eluru",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (!data.token) throw new Error("Token missing from registration response");
      if (!data.user?.id) throw new Error("User id missing from response");
      testUserToken = data.token;
      testUserId = data.user.id;
      return { userId: data.user.id, email: data.user.email };
    });

    await runTest("Auth", "User Registration (Duplicate Email Rejection)", async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Duplicate User",
          email: testEmail,
          password: "Password@123",
        }),
      });
      if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
      const data = await res.json();
      if (!data.error) throw new Error("Expected error message for duplicate registration");
      return { message: data.error };
    });

    await runTest("Auth", "User Login (Valid credentials via email)", async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: "Password@123",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (!data.token) throw new Error("No token returned in login");
      testUserToken = data.token;
      return { email: data.user.email, role: data.user.role };
    });

    await runTest("Auth", "User Login (Invalid password rejected)", async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: "WrongPassword!999",
        }),
      });
      if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
      return { status: res.status };
    });

    await runTest("Auth", "Admin Login (admin@marketplace.com)", async () => {
      // Try admin123 first (as per reset-password.ts), fallback to Admin@123
      let res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@marketplace.com",
          password: "admin123",
        }),
      });
      if (!res.ok) {
        res = await fetch(`${baseUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "admin@marketplace.com",
            password: "Admin@123",
          }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (data.user?.role !== "admin") throw new Error(`Expected admin role, got ${data.user?.role}`);
      adminToken = data.token;
      return { email: data.user.email, role: data.user.role };
    });

    await runTest("Auth", "Current User Profile (GET /api/auth/me with Bearer token)", async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${testUserToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (data.id !== testUserId) throw new Error("User ID mismatch");
      return { id: data.id, name: data.name };
    });

    await runTest("Security", "Unauthorized Access to /api/auth/me without token", async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`);
      if (res.status !== 401) throw new Error(`Expected 401 Unauthorized, got ${res.status}`);
      return { status: res.status };
    });

    await runTest("Security", "Non-Admin Forbidden on /api/admin/stats (RBAC Check)", async () => {
      const res = await fetch(`${baseUrl}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${testUserToken}` },
      });
      if (res.status !== 403) throw new Error(`Expected 403 Forbidden, got ${res.status}`);
      return { status: res.status };
    });

    await runTest("Admin", "Admin Access to /api/admin/stats", async () => {
      const res = await fetch(`${baseUrl}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (typeof data.users !== "number" || typeof data.shops !== "number") {
        throw new Error("Invalid stats shape");
      }
      return data;
    });

    // ------------------------------------------------------------------
    // PUBLIC API ENDPOINTS
    // ------------------------------------------------------------------
    console.log("\n[3] Testing Public Catalog APIs...");

    await runTest("Catalog", "GET /api/categories", async () => {
      const res = await fetch(`${baseUrl}/api/categories`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) throw new Error("No categories found");
      return { count: data.length, firstCategory: data[0].name };
    });

    await runTest("Catalog", "GET /api/shops", async () => {
      const res = await fetch(`${baseUrl}/api/shops`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) throw new Error("No shops returned");
      return { count: data.length, sampleShop: data[0].name };
    });

    await runTest("Catalog", "GET /api/shops/featured", async () => {
      const res = await fetch(`${baseUrl}/api/shops/featured`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Expected array of featured shops");
      return { count: data.length };
    });

    await runTest("Catalog", "GET /api/products", async () => {
      const res = await fetch(`${baseUrl}/api/products`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) throw new Error("No products returned");
      return { count: data.length, sampleProduct: data[0].name, price: data[0].price };
    });

    await runTest("Catalog", "GET /api/coupons", async () => {
      const res = await fetch(`${baseUrl}/api/coupons`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) throw new Error("No coupons returned");
      return { count: data.length, sampleCoupon: data[0].code, type: data[0].type };
    });

    await runTest("Catalog", "GET /api/banners", async () => {
      const res = await fetch(`${baseUrl}/api/banners`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Expected array of banners");
      return { count: data.length };
    });

    await runTest("Catalog", "GET /api/contests", async () => {
      const res = await fetch(`${baseUrl}/api/contests`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Expected array of contests");
      return { count: data.length };
    });

    // ------------------------------------------------------------------
    // BUSINESS LOGIC: COUPON VALIDATION & ORDERS
    // ------------------------------------------------------------------
    console.log("\n[4] Testing Coupon Validation & Order Processing...");

    const allCoupons = await storage.getAllCoupons();
    const activeCoupon = allCoupons.find(
      (c) => c.is_active && c.code && (!c.expiry_date || new Date(c.expiry_date) > new Date())
    );

    if (activeCoupon) {
      await runTest("Business Logic", `Coupon Validation (Valid Code: ${activeCoupon.code})`, async () => {
        const res = await fetch(`${baseUrl}/api/coupons/validate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${testUserToken}`,
          },
          body: JSON.stringify({
            code: activeCoupon.code,
            shopId: activeCoupon.shop_id,
            cartTotal: "500",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return { code: data.code, type: data.type, value: data.value };
      });
    }

    await runTest("Business Logic", "Coupon Validation (Invalid Code with Auth)", async () => {
      const res = await fetch(`${baseUrl}/api/coupons/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          code: "NONEXISTENT_CODE_9999",
          cartTotal: "500",
        }),
      });
      if (res.status !== 400 && res.status !== 404) {
        throw new Error(`Expected 400 or 404, got ${res.status}`);
      }
      return { status: res.status };
    });

    const allProducts = await storage.getAllProducts();
    const testProduct = allProducts[0];

    if (testProduct) {
      await runTest("Business Logic", "Create Order (POST /api/orders)", async () => {
        const orderPayload = {
          shop_id: testProduct.shop_id,
          total_amount: "300.00",
          discount_amount: "50.00",
          final_amount: "250.00",
          status: "pending",
          items: [
            {
              product_id: testProduct.id,
              quantity: 2,
              price: testProduct.price || "150.00",
            },
          ],
        };

        const res = await fetch(`${baseUrl}/api/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${testUserToken}`,
          },
          body: JSON.stringify(orderPayload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        if (!data.id) throw new Error("Created order has no ID");
        createdOrderId = data.id;
        return { orderId: data.id, finalAmount: data.final_amount };
      });

      await runTest("Business Logic", "Fetch User Orders (GET /api/orders/my)", async () => {
        const res = await fetch(`${baseUrl}/api/orders/my`, {
          headers: { Authorization: `Bearer ${testUserToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        if (!Array.isArray(data)) throw new Error("Expected array of orders");
        const found = data.find((o: any) => o.id === createdOrderId);
        if (!found) throw new Error("Newly created order not found in /api/orders/my");
        return { ordersFound: data.length, verifiedOrderId: found.id };
      });

      await runTest("Business Logic", "Order Status Update Triggers User Notification (Confirmed)", async () => {
        const updateRes = await fetch(`${baseUrl}/api/orders/${createdOrderId}/status`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ status: "confirmed" }),
        });
        if (!updateRes.ok) throw new Error(`Status update failed: ${updateRes.status}`);

        const notifRes = await fetch(`${baseUrl}/api/notifications`, {
          headers: { Authorization: `Bearer ${testUserToken}` },
        });
        const notifs = await notifRes.json();
        const found = notifs.find((n: any) => n.type === "order_update" && n.title.includes("Confirmed"));
        if (!found) throw new Error("Order 'confirmed' notification was not found in user inbox");
        return { notificationId: found.id, title: found.title, message: found.message };
      });

      await runTest("Business Logic", "Order Status Update Triggers User Notification (Completed)", async () => {
        const updateRes = await fetch(`${baseUrl}/api/orders/${createdOrderId}/status`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ status: "completed" }),
        });
        if (!updateRes.ok) throw new Error(`Status update failed: ${updateRes.status}`);

        const notifRes = await fetch(`${baseUrl}/api/notifications`, {
          headers: { Authorization: `Bearer ${testUserToken}` },
        });
        const notifs = await notifRes.json();
        const found = notifs.find((n: any) => n.type === "order_update" && n.title.includes("Completed"));
        if (!found) throw new Error("Order 'completed' notification was not found in user inbox");

        // Verify unread count is at least 1
        const unreadRes = await fetch(`${baseUrl}/api/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${testUserToken}` },
        });
        const unreadData = await unreadRes.json();
        if (typeof unreadData.count !== "number" || unreadData.count < 1) {
          throw new Error(`Expected positive unread count, got ${unreadData.count}`);
        }

        return { notificationId: found.id, title: found.title, unreadCount: unreadData.count };
      });
    }

  } finally {
    // ------------------------------------------------------------------
    // CLEANUP
    // ------------------------------------------------------------------
    console.log("\n[5] Cleaning up test data...");
    try {
      if (createdOrderId) {
        await db.delete(orderItems).where(eq(orderItems.order_id, createdOrderId));
        await db.delete(orders).where(eq(orders.id, createdOrderId));
        console.log(`  ✓ Cleaned up test order ${createdOrderId}`);
      }
      if (testUserId) {
        await db.delete(notifications).where(eq(notifications.user_id, testUserId));
        await db.delete(users).where(eq(users.id, testUserId));
        console.log(`  ✓ Cleaned up test user ${testUserId}`);
      }
    } catch (cleanErr: any) {
      console.warn("  ! Cleanup warning:", cleanErr.message);
    }

    httpServer.close();
  }

  // ------------------------------------------------------------------
  // SUMMARY REPORT
  // ------------------------------------------------------------------
  console.log("\n==================================================");
  console.log("                TEST RESULTS SUMMARY              ");
  console.log("==================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Total Tests : ${total}`);
  console.log(`Passed      : ${passed} ✅`);
  console.log(`Failed      : ${failed} ❌`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log("\nFailures:");
    results.filter(r => !r.passed).forEach(f => {
      console.log(`  - [${f.category}] ${f.name}: ${f.error}`);
    });
  }
  console.log("==================================================\n");

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
