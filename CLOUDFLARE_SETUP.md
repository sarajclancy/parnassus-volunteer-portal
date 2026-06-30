# Cloudflare Demo Setup

Use this when you want to publish the volunteer portal outside the private Codex/Sites preview.

## 1. Create a D1 Database

1. Open Cloudflare.
2. Go to Workers & Pages.
3. Open D1 SQL Database.
4. Create a database named `parnassus-volunteer-demo-db`.
5. Copy its Database ID.

## 2. Upload This Project To GitHub

Upload all files from this package into a GitHub repository named:

`parnassus-volunteer-portal`

Do not upload `node_modules`, `dist`, `.wrangler`, `work`, or `outputs`.

## 3. Connect GitHub In Cloudflare

1. Go to Workers & Pages.
2. Click Create application.
3. Choose Continue with GitHub.
4. Select the `parnassus-volunteer-portal` repository.
5. Name the Worker `parnassus-volunteer-portal-demo`.

## 4. Add Build Settings

Use these settings:

```txt
Build command:
pnpm run build

Deploy command:
pnpm run deploy:cloudflare:prepared
```

If Cloudflare only gives you one command box, use:

```txt
pnpm run deploy:cloudflare
```

## 5. Add Environment Variables

Add these in the Cloudflare build/deploy settings:

```txt
CLOUDFLARE_D1_DATABASE_ID = paste your D1 Database ID here
CLOUDFLARE_D1_DATABASE_NAME = parnassus-volunteer-demo-db
CLOUDFLARE_WORKER_NAME = parnassus-volunteer-portal-demo
```

## 6. Confirm D1 Binding

After the Worker exists, open it in Cloudflare and check:

```txt
Settings > Bindings
```

There should be a D1 binding named exactly:

`DB`

If it is missing, add a D1 database binding with variable name `DB` and select `parnassus-volunteer-demo-db`.

## 7. Test The Demo

Open the `workers.dev` URL Cloudflare gives you.

Demo accounts:

```txt
Admin:
admin@school.test
admin2026

Family:
rivera@example.com
family2026
```

Do not use real family data in the public demo.
