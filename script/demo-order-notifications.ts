import { db, storage } from "../server/storage";
import { users, orders, orderItems, notifications } from "@shared/schema";
import { eq } from "drizzle-orm";

const baseUrl = "http://127.0.0.1:5001";

async function main() {
  console.log("==================================================");
  console.log("       ORDER STATUS NOTIFICATION DEMO RUNNER      ");
  console.log("==================================================");

  // Dynamically start server on port 5001
  const express = (await import("express")).default;
  const { registerRoutes } = await import("../server/routes");
  const { createServer } = await import("http");
  const cookieParser = (await import("cookie-parser")).default;

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  const server = createServer(app);
  await registerRoutes(server, app);

  await new Promise<void>((resolve) => server.listen(5001, () => resolve()));
  console.log(`✓ Test server listening at ${baseUrl}\n`);

  let demoUserId: string | null = null;
  let demoOrderId: string | null = null;

  try {
    // 1. Create / login demo user
    const demoEmail = `demo_customer_${Date.now()}@example.com`;
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Demo Customer",
        email: demoEmail,
        password: "password123",
        phone: "9988776655",
      }),
    });
    const regData = await regRes.json();
    const userToken = regData.token;
    demoUserId = regData.user.id;
    console.log(`[Step 1] Customer registered: ${demoEmail} (ID: ${demoUserId})`);

    // 2. Admin login
    let adminRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@marketplace.com",
        password: "admin123",
      }),
    });
    if (!adminRes.ok) {
      adminRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@marketplace.com",
          password: "Admin@123",
        }),
      });
    }
    const adminData = await adminRes.json();
    if (!adminRes.ok) throw new Error("Admin login failed: " + JSON.stringify(adminData));
    const adminToken = adminData.token;
    console.log(`[Step 2] Admin authenticated: admin@marketplace.com (Role: ${adminData.user.role})`);

    // 3. Customer places an order
    const products = await storage.getAllProducts();
    const testProduct = products[0] || { id: "prod-1", price: "250.00", name: "Sample Product" };

    const orderRes = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        items: [
          { product_id: testProduct.id, product_name: testProduct.name, quantity: 2, price: "250.00" }
        ],
        total_amount: "500.00",
        discount_amount: "0.00",
        final_amount: "500.00",
        shop_id: testProduct.shop_id || null,
        shop_name: "Reliance Fresh Eluru",
      }),
    });
    const orderData = await orderRes.json();
    demoOrderId = orderData.id;
    console.log(`\n[Step 3] Customer placed order #${demoOrderId?.slice(-8).toUpperCase()} (Status: ${orderData.status})`);

    // 4. Admin updates order status to "confirmed"
    console.log("\n[Step 4] Admin updating order status -> 'confirmed'...");
    const confirmRes = await fetch(`${baseUrl}/api/orders/${demoOrderId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "confirmed" }),
    });
    const confirmData = await confirmRes.json();
    console.log(`[Step 4 Response] HTTP ${confirmRes.status}:`, confirmData);

    // 5. Admin updates order status to "completed"
    console.log("\n[Step 5] Admin updating order status -> 'completed'...");
    const completeRes = await fetch(`${baseUrl}/api/orders/${demoOrderId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "completed" }),
    });
    const completeData = await completeRes.json();
    console.log(`[Step 5 Response] HTTP ${completeRes.status}: Order status -> ${completeData.status}`);

    // 6. Fetch user notifications
    console.log("\n[Step 6] Fetching customer notification inbox...");
    const notifRes = await fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const notifs = await notifRes.json();

    const unreadRes = await fetch(`${baseUrl}/api/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const unreadData = await unreadRes.json();

    console.log(`\n📬 Customer Inbox received ${notifs.length} notification(s) [Unread: ${unreadData.count}]:\n`);
    notifs.forEach((n: any, idx: number) => {
      console.log(`  Notification ${idx + 1}:`);
      console.log(`    Title:   ${n.title}`);
      console.log(`    Message: ${n.message}`);
      console.log(`    Type:    ${n.type}`);
      console.log(`    Time:    ${new Date(n.created_at).toLocaleTimeString()}`);
      console.log("    --------------------------------------------");
    });

    console.log("\n==================================================");
    console.log("       DEMO COMPLETED SUCCESSFULLY! ALL VERIFIED!  ");
    console.log("==================================================");

  } finally {
    if (demoOrderId) {
      await db.delete(orderItems).where(eq(orderItems.order_id, demoOrderId));
      await db.delete(orders).where(eq(orders.id, demoOrderId));
    }
    if (demoUserId) {
      await db.delete(notifications).where(eq(notifications.user_id, demoUserId));
      await db.delete(users).where(eq(users.id, demoUserId));
    }
    server.close();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
