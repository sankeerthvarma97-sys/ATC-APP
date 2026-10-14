import "dotenv/config";
import { Pool } from "pg";

async function run() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL");
  }

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    console.log("Beginning safe in-place ALTER TABLE transaction...");
    await client.query("BEGIN;");

    // 1. Convert User.creditBalance
    console.log("Altering User.creditBalance to DECIMAL(24, 2)...");
    await client.query(`
      ALTER TABLE "User" 
      ALTER COLUMN "creditBalance" TYPE DECIMAL(24, 2) 
      USING "creditBalance"::numeric(24, 2);
    `);

    // 2. Convert CreditTransaction columns
    console.log("Altering CreditTransaction columns to DECIMAL(24, 2)...");
    await client.query(`
      ALTER TABLE "CreditTransaction" 
      ALTER COLUMN "amount" TYPE DECIMAL(24, 2) 
      USING "amount"::numeric(24, 2);
    `);

    await client.query(`
      ALTER TABLE "CreditTransaction" 
      ALTER COLUMN "balanceBefore" TYPE DECIMAL(24, 2) 
      USING "balanceBefore"::numeric(24, 2);
    `);

    await client.query(`
      ALTER TABLE "CreditTransaction" 
      ALTER COLUMN "balanceAfter" TYPE DECIMAL(24, 2) 
      USING "balanceAfter"::numeric(24, 2);
    `);

    // 3. Add idempotencyKey column if not present
    console.log("Adding column CreditTransaction.idempotencyKey if missing...");
    await client.query(`
      ALTER TABLE "CreditTransaction" 
      ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
    `);

    // 4. Add idempotencyKey unique index
    console.log("Creating unique index on CreditTransaction.idempotencyKey...");
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "CreditTransaction_idempotencyKey_key" 
      ON "CreditTransaction"("idempotencyKey");
    `);

    await client.query("COMMIT;");
    console.log("Transaction successfully committed! All data preserved.");
  } catch (err) {
    await client.query("ROLLBACK;");
    console.error("Migration failed, transaction rolled back safely:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
