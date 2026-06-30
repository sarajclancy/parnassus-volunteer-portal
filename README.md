# Parnassus Volunteer Portal

A volunteer scheduling portal branded for Parnassus Preparatory Academy families with:

- Admin event creation with per-position granted hours, start/end dates, locations, descriptions, and multiple positions.
- Event setup includes all-cohort or cohort-specific targeting, JK-12 grade selection, rich custom event fields, resource links, reminder timing, cancellation cutoff, recurrence, position count, per-position hours, requirements, and per-position descriptions.
- Admin event editing after posting, including event details and volunteer positions.
- Clickable admin and family summary cards with matching detail views and family event filters.
- Family sign-in to select and release available volunteer positions while hours are pending.
- Waitlists, swap requests, calendar links, family hour ledger, and exportable admin reports.
- Admin check-in, check-out, no-show tracking, clearance controls, private notes, roster email links, and phone list copy tools.
- QR-code check-in links for signed-in families at event day stations.
- Admin-published volunteer policy with family sign-off tracking before signup, waitlist, or QR check-in.
- Filled volunteer positions show the signed-up family name to all logged-in users.
- Family profiles with student/class details, volunteer interests, multiple participating family members, preferred contact method, clearance status, and multiple phone numbers.
- Automatic family progress toward the 40-hour annual requirement using signed-off hours only.
- Exclusive position claims enforced by the server/database.
- Admin sign-off for completed volunteer hours.

## Local Development

```bash
PATH=/Users/saraclancy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/saraclancy/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH pnpm install
HOME=/Users/saraclancy/Documents/Codex/2026-06-29/i-be/work/home PATH=/Users/saraclancy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/saraclancy/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH pnpm run dev -- --host 127.0.0.1 --port 3000
```

## Demo Accounts

- Admin: `admin@school.test` / `admin2026`
- Family: `rivera@example.com` / `family2026`
- Family: `chen@example.com` / `family2026`
- Family: `patel@example.com` / `family2026`

## Validation

```bash
PATH=/Users/saraclancy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/saraclancy/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH pnpm run lint
PATH=/Users/saraclancy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/saraclancy/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH pnpm run build
```
