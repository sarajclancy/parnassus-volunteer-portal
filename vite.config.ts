import vinext from "vinext";
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { existsSync, readFileSync } from "node:fs";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

function readHostingConfig() {
  const path = new URL("./.openai/hosting.json", import.meta.url);

  if (!existsSync(path)) {
    return { d1: "DB", r2: null };
  }

  return JSON.parse(readFileSync(path, "utf8")) as {
    d1?: string | null;
    r2?: string | null;
  };
}

const hostingConfig = readHostingConfig();
const d1 = process.env.CLOUDFLARE_D1_BINDING ?? hostingConfig.d1 ?? "DB";
const r2 = process.env.CLOUDFLARE_R2_BINDING ?? hostingConfig.r2 ?? null;
const databaseName =
  process.env.CLOUDFLARE_D1_DATABASE_NAME ?? "parnassus-volunteer-demo-db";
const databaseId =
  process.env.CLOUDFLARE_D1_DATABASE_ID ??
  process.env.D1_DATABASE_ID ??
  SITE_CREATOR_PLACEHOLDER_DATABASE_ID;

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: databaseName,
          database_id: databaseId,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig({
  plugins: [
    vinext(),
    sites(),
    cloudflare({
      inspectorPort: false,
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
      config: localBindingConfig,
    }),
  ],
});
