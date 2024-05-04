import { drizzle } from 'drizzle-orm/vercel-postgres';
import { migrate } from 'drizzle-orm/vercel-postgres/migrator';
import { sql } from '@vercel/postgres';
import './env-config';

const db = drizzle(sql);

async function main() {
  console.log('migration started...');
  await migrate(db, { migrationsFolder: 'drizzle/migrations' });
  console.log('migration ended...');
  process.exit(0);
}

main().catch((err) => {
  console.log(err);
  process.exit(0);
});
