import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const migrationPath = process.argv[2];
if (!migrationPath) {
  console.error("Usage: node scripts/apply-migration.mjs <migration-file>");
  process.exit(1);
}

const env = readFileSync(resolve(".env"), "utf8");
const databaseUrl = env
  .split(/\r?\n/)
  .find((line) => line.startsWith("DATABASE_URL="))
  ?.slice("DATABASE_URL=".length);

if (!databaseUrl) {
  console.error("DATABASE_URL not found in .env");
  process.exit(1);
}

const sql = readFileSync(resolve(migrationPath), "utf8");
const client = new pg.Client({ connectionString: databaseUrl });

await client.connect();
try {
  await client.query(sql);
  console.log(JSON.stringify({ applied: migrationPath }));
} finally {
  await client.end();
}
