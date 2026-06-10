# Product of the Week — Backend (NestJS + PostgreSQL)

REST API for the Tunisian cash-on-delivery (COD) e-commerce frontend in this
repo. Event-driven, with a JWT-protected **admin** that can see every resource
(orders, subscribers, votes, products, weekly editions).

- **Stack:** NestJS 10 · Prisma 5 · PostgreSQL 16 · `@nestjs/event-emitter` · JWT auth · Swagger
- **Design docs:** [ARCHITECTURE.md](./ARCHITECTURE.md) (diagrams), [API.md](./API.md) (endpoint spec), [schema.sql](./schema.sql) (raw DDL)

---

## Quick start

```bash
cd backend
cp .env.example .env                 # adjust JWT_SECRET etc.

# 1. Start PostgreSQL (Docker) — or point DATABASE_URL at your own
docker compose up -d db

# 2. Install deps
npm install

# 3. Create the schema + seed admin, products, 24 governorates
npm run prisma:migrate -- --name init
npm run prisma:seed

# 4. Run
npm run start:dev
```

API is served at `http://localhost:3000/api/v1` · Swagger UI at
`http://localhost:3000/api/v1/docs`.

Seeded admin login: **admin@potw.tn / admin1234** (override via `ADMIN_EMAIL` /
`ADMIN_PASSWORD` in `.env` before seeding).

---

## Architecture at a glance

```
HTTP ── Controllers ── Services ──┬── PrismaService ── PostgreSQL
                                  └── EventEmitter2 ──▶ Listeners (notifications, audit)
```

The **write path emits domain events** ([src/common/events/domain-events.ts](src/common/events/domain-events.ts))
and never calls notification code directly. Listeners in
[src/listeners/](src/listeners/) react out-of-band, so a slow SMS/email never
blocks or fails a customer order. Adding a new reaction = adding a listener; no
service changes.

Events emitted: `order.created`, `order.status_changed`,
`subscriber.subscribed`, `subscriber.unsubscribed`, `vote.cast`,
`product.created`, `weekly.winner_set`.

> The notification listeners are **logged stubs today** — drop in a real
> SMS/email client (Twilio / a TN SMS gateway / SES) in
> [notifications.listener.ts](src/listeners/notifications.listener.ts) and
> nothing else changes.

---

## Modules

| Module | Public endpoints | Admin (JWT) |
|--------|------------------|-------------|
| `auth` | `POST /auth/login` | `GET /auth/me` |
| `products` | `GET /products`, `/products/current-winner`, `/products/past-winners`, `/products/:idOrSlug` | `POST/PATCH/DELETE /products` |
| `orders` | `POST /orders` | `GET /orders`, `GET /orders/:id`, `PATCH /orders/:id/status` |
| `votes` | `POST /products/:id/vote` | — |
| `subscribers` | `POST /subscribers`, `DELETE /subscribers/:token` | `GET /subscribers` |
| `weekly-editions` | `GET /weekly-editions/current`, `GET /weekly-editions` | `POST /weekly-editions`, `PATCH /weekly-editions/:id/winner` |
| `reference` | `GET /reference/categories`, `/reference/governorates` | — |
| `admin` | — | `GET /admin/overview`, `/admin/products`, `/admin/orders`, `/admin/subscribers`, `/admin/votes`, `/admin/editions` |

### Admin "see all elements"
`GET /admin/overview` returns dashboard stats (counts, revenue, orders-by-status,
recent orders). The `/admin/*` list endpoints show **everything**, including
non-public rows: draft/archived products, unsubscribed emails, every order and
every vote.

---

## Key behaviours

- **Server-side pricing** — totals are computed from the DB
  (`unitPrice × quantity + governorate.deliveryFee`); client-sent amounts are
  ignored.
- **Tunisian phone validation** — DTO enforces `^(\+216)?[2459]\d{7}$`; quantity
  bounded `1..10`, matching the frontend.
- **Order lifecycle** — `pending → confirmed → shipped → delivered` (or
  `cancelled`); illegal transitions return `400`.
- **One winner** — setting a product/edition winner clears the previous
  `isCurrentWinner` in the same transaction.
- **One vote per voter per edition** — enforced by a unique index; second vote
  returns `409`.

---

## Frontend wiring

Replace the simulated logic in the React app with these calls:

| Frontend | Endpoint |
|----------|----------|
| `src/data/products.ts` (`currentWinner`) | `GET /products/current-winner` |
| `src/data/products.ts` (`pastWinners`) | `GET /products/past-winners` |
| `ProductPage.tsx` `handleSubmitOrder` (setTimeout) | `POST /orders` |
| `Newsletter.tsx` `handleSubmit` (toast only) | `POST /subscribers` |

Use a typed `@tanstack/react-query` layer (already a frontend dependency).

---

## Scripts

| Script | What |
|--------|------|
| `npm run start:dev` | Watch-mode dev server |
| `npm run build` / `start:prod` | Compile to `dist/` and run |
| `npm run prisma:migrate` | Create/apply a dev migration |
| `npm run prisma:seed` | Seed admin + products + governorates |
| `npm run db:reset` | Drop, re-migrate, re-seed |
