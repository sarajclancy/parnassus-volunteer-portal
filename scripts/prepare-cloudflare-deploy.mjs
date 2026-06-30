import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const placeholderDatabaseId = "00000000-0000-4000-8000-000000000000";
const wranglerPath = resolve("dist", "server", "wrangler.json");

const databaseId =
  process.env.CLOUDFLARE_D1_DATABASE_ID || process.env.D1_DATABASE_ID || "";
const databaseName =
  process.env.CLOUDFLARE_D1_DATABASE_NAME ||
  process.env.D1_DATABASE_NAME ||
  "parnassus-volunteer-demo-db";
const workerName =
  process.env.CLOUDFLARE_WORKER_NAME ||
  process.env.WORKER_NAME ||
  "parnassus-volunteer-portal-demo";

if (!databaseId || databaseId === placeholderDatabaseId) {
  throw new Error(
    [
      "Missing Cloudflare D1 database ID.",
      "In Cloudflare, add an environment variable named CLOUDFLARE_D1_DATABASE_ID",
      "with the Database ID from your D1 database before deploying.",
    ].join(" ")
  );
}

const wrangler = JSON.parse(await readFile(wranglerPath, "utf8"));

wrangler.name = workerName;
wrangler.topLevelName = workerName;
wrangler.d1_databases = [
  {
    binding: "DB",
    database_name: databaseName,
    database_id: databaseId,
  },
];

await writeFile(wranglerPath, `${JSON.stringify(wrangler, null, 2)}\n`);
