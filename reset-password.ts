import { db } from "./server/storage";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function resetPassword() {
  const email = "admin@marketplace.com";
  const newPassword = "admin123";

  try {
    console.log(`Hashing new password for ${email}...`);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    console.log("Updating password in the database...");
    const result = await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.email, email))
      .returning();

    if (result.length > 0) {
      console.log("Password successfully reset");
    } else {
      console.error(`Error: User with email ${email} not found in the database.`);
    }
  } catch (error) {
    console.error("Failed to reset password:", error);
  }
  process.exit(0);
}

resetPassword();
