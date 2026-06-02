import { db } from "../server/storage";
import { sql } from "drizzle-orm";

async function checkColumn() {
  try {
    const result = await db.execute(
      sql`SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name='users' AND column_name='fcm_token'`
    );
    const hasColumn = result.rows && result.rows.length > 0;
    if (hasColumn) {
      console.log("SUCCESS: The 'fcm_token' column exists in the 'users' table.");
    } else {
      console.log("MISSING: The 'fcm_token' column does NOT exist yet.");
    }
  } catch (error) {
    console.error("Failed to connect to database:", error);
  }
  process.exit(0);
}

checkColumn();
