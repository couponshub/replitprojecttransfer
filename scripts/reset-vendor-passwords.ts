import bcrypt from 'bcryptjs';
import { db } from '../server/db';
import { vendors } from '../shared/schema';

async function main() {
  const hash = await bcrypt.hash('Vendor@123', 10);
  console.log('Hash:', hash);
  await db.update(vendors).set({ password: hash });
  console.log('All vendor passwords reset to Vendor@123 ✓');
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
