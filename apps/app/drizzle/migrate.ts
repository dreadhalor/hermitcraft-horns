import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from './db';
import path from 'path';

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, './migrations');

    await migrate(db, { migrationsFolder: migrationPath });
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runMigration();
