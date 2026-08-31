# Garage Inventory Management System

A multi-shop inventory and sales management app for garage chains. Admins manage shops, attendants, and inventory; shop attendants track stock and record sales. Built with Next.js (App Router), NextAuth, Drizzle ORM, and PostgreSQL (Neon).

## Features

- **Role-based auth** — Admins and shop attendants get separate dashboards; route guards redirect on both sides (see `src/proxy.ts`).
- **Shops & attendants** — Admin can create shops, invite/assign attendants, reassign attendants between shops.
- **Inventory** — Attendants create items, adjust stock (with reason + movement history), and see low-stock warnings.
- **Sales** — Multi-line sale recording with automatic stock decrement and per-sale detail rows.
- **Activity log** — Admin-facing audit trail of all actions across the system.
- **Password reset** — Forgot-password flow via email (SMTP) + signed reset tokens.

## Tech stack

- **Next.js 16** (App Router, React Server Components, Turbopack)
- **NextAuth v5** (beta) — credentials + JWT sessions, augmented roles
- **Drizzle ORM** + **PostgreSQL** (`@neondatabase/serverless` / `pg`)
- **Zod** for server-side validation, **Tailwind CSS v4** for styling
- **SMTP (Nodemailer)** for transactional email

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the `.env` template into place and fill in the values:

```bash
cp .env.example .env
```

| Variable             | Description                                             |
| -------------------- | ------------------------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string (Neon works great)         |
| `AUTH_SECRET`        | `openssl rand -base64 32`                               |
| `AUTH_TRUST_HOST`    | `true` for local development                            |
| `APP_URL`            | e.g. `http://localhost:3000`                            |
| `APP_NAME`           | Brand name shown in the UI / emails                     |
| `NEXT_PUBLIC_APP_CURRENCY` | ISO code used for money formatting (default `USD`) — must keep the `NEXT_PUBLIC_` prefix so client and server render the same currency |
| `SMTP_HOST`          | SMTP server host for outgoing email (leave unset to log to console) |
| `SMTP_PORT`          | SMTP port (default `587`, or `465` with `SMTP_SECURE=true`) |
| `SMTP_USER`          | SMTP username (optional if no auth required)             |
| `SMTP_PASS`          | SMTP password / app password                             |
| `SMTP_SECURE`        | `true` for SSL/TLS, `false` (default) for STARTTLS       |
| `SMTP_FROM`          | Sender address for emails                                  |
| `SEED_ADMIN_PASSWORD`    | Override the seeded admin password (optional)       |
| `SEED_ATTENDANT_PASSWORD`| Override the seeded attendant password (optional)   |

> **Tip:** for local development, run `openssl rand -base64 32` to generate `AUTH_SECRET`. Emails (password reset, low-stock alerts) are sent via SMTP; if `SMTP_HOST` is unset they are logged to the server console instead.

### 3. Set up the database

Generate and push the schema, then seed demo data:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

- `db:seed` is idempotent — it skips if shops already exist.
- `npm run db:seed:reset` wipes and reseeds from scratch.
- `npm run db:studio` opens Drizzle Studio to inspect the data.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Unauthenticated users are redirected to `/login`.

## Demo credentials

After running `npm run db:seed`, log in with any of these accounts:

| Role      | Email            | Password        |
| --------- | ---------------- | --------------- |
| Admin     | `admin@garage.io` | `admin1234`    |
| Attendant | `jordan@garage.io` | `attendant1234` |
| Attendant | `alex@garage.io`   | `attendant1234` |
| Attendant | `sam@garage.io`    | `attendant1234` |
| Attendant | `priya@garage.io`  | `attendant1234` |

- **Admin** (`admin@garage.io`) lands on `/admin` and manages shops, attendants, and the activity log.
- **Attendants** land on `/shop` and manage inventory and sales for their assigned shop.

Override the passwords at seed time with `SEED_ADMIN_PASSWORD` / `SEED_ATTENDANT_PASSWORD`.

## Project structure

```
src/
  app/                  # App Router pages
    admin/              # Admin dashboard, shops, attendants, activity log
    shop/               # Attendant dashboard, inventory, sales
    api/auth/[...nextauth]/  # NextAuth route handler
  components/           # UI + feature components (forms, layouts, etc.)
  db/                   # Drizzle schema, seed script, db client
  lib/
    actions/            # Server actions (admin.ts, attendant.ts, auth.ts)
    auth.ts             # NextAuth config (credentials provider, JWT, roles)
    dal.ts              # Data access / auth guards (requireAdmin, requireAttendant)
    queries.ts          # Read queries
    activity.ts         # Activity log helper
proxy.ts                # Edge middleware for auth + role-based routing
```

## Scripts

| Command                | Description                              |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Start the dev server                     |
| `npm run build`        | Create a production build                |
| `npm run start`        | Serve the production build               |
| `npm run lint`         | Run ESLint                               |
| `npm run db:generate`  | Generate a Drizzle migration             |
| `npm run db:push`      | Push schema changes to the database      |
| `npm run db:studio`    | Open Drizzle Studio                      |
| `npm run db:seed`      | Seed demo data (idempotent)              |
| `npm run db:seed:reset`| Wipe and reseed demo data                |
