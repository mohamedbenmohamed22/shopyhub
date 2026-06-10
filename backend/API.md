# REST API — Resource specification

Base URL: `/api/v1` · Format: JSON · Auth: `Authorization: Bearer <jwt>` (admin only).
All money is in **TND** (3 decimals). IDs are UUIDs unless noted.

Conventions:
- `200 OK`, `201 Created`, `204 No Content`, `400` validation, `401` unauth,
  `403` forbidden, `404` not found, `409` conflict, `422` business rule.
- List endpoints support `?page=1&limit=20` and return `{ data, meta }`.
- 🔓 = public · 🔒 = admin (JWT-guarded).

---

## Products  `/products`

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/products` | 🔓 | List published products. Filters: `?category=`, `?year=`, `?week=`. |
| GET | `/products/current-winner` | 🔓 | The single current Product of the Week. |
| GET | `/products/past-winners` | 🔓 | Previous winners (excludes current). |
| GET | `/products/:idOrSlug` | 🔓 | Single product detail. |
| POST | `/products` | 🔒 | Create a product. |
| PATCH | `/products/:id` | 🔒 | Update fields / status. |
| DELETE | `/products/:id` | 🔒 | Archive (soft) or delete. |

**Product object**
```json
{
  "id": "8f3c…",
  "slug": "lumina-ai",
  "name": "Lumina AI",
  "tagline": "Transform your ideas into stunning visuals instantly",
  "description": "Lumina AI is a revolutionary design tool…",
  "imageUrl": "https://…",
  "category": "AI & Design",
  "price": 149.000,
  "weekNumber": 50,
  "year": 2024,
  "votesCount": 2847,
  "isCurrentWinner": true,
  "status": "published"
}
```

**POST /products** (body)
```json
{
  "name": "Lumina AI",
  "tagline": "…",
  "description": "…",
  "imageUrl": "https://…",
  "categoryId": "…",
  "price": 149,
  "weekNumber": 50,
  "year": 2024,
  "status": "published"
}
```

---

## Orders  `/orders`

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/orders` | 🔓 | Place a cash-on-delivery order. |
| GET | `/orders` | 🔒 | List orders. Filters: `?status=`, `?phone=`, `?from=&to=`. |
| GET | `/orders/:id` | 🔒 | Order detail (with items). |
| PATCH | `/orders/:id/status` | 🔒 | Transition status (pending→confirmed→shipped→delivered / cancelled). |

**POST /orders** (body) — maps 1:1 to the form in `ProductPage.tsx`
```json
{
  "productId": "8f3c…",
  "quantity": 2,
  "customer": {
    "fullName": "Ahmed Ben Ali",
    "phone": "+21620123456",
    "governorateId": 1,
    "address": "12 Rue de Carthage, Tunis 1000"
  },
  "notes": "Call after 6pm"
}
```
**Validation** (server-side DTO):
- `quantity`: integer, `1..10`.
- `phone`: matches `^(\+216)?[2459]\d{7}$`.
- `governorateId`: must exist and be `active`.
- `productId`: must exist and be `published`.

**201 response**
```json
{
  "id": "…",
  "orderNumber": "POW-2024-000123",
  "status": "pending",
  "paymentMethod": "cash_on_delivery",
  "subtotal": 298.000,
  "deliveryFee": 7.000,
  "total": 305.000,
  "items": [
    { "productName": "Lumina AI", "quantity": 2, "unitPrice": 149.000, "lineTotal": 298.000 }
  ],
  "createdAt": "2024-12-15T10:00:00Z"
}
```
> Pricing is computed **server-side** from the DB (never trust client totals):
> `subtotal = unitPrice × quantity`, `deliveryFee` from the governorate,
> `total = subtotal + deliveryFee`.

**PATCH /orders/:id/status**
```json
{ "status": "confirmed" }   // 422 if the transition is illegal
```

---

## Votes  `/products/:id/vote`

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/products/:id/vote` | 🔓 | Cast a vote for a product in the current open edition. |

Body: none required (voter identified by signed cookie/fingerprint + IP).
- `201` → `{ "productId": "…", "votesCount": 2848 }`
- `409` if this voter already voted in the current edition.
- `422` if voting is closed.

---

## Subscribers  `/subscribers`

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/subscribers` | 🔓 | Subscribe (idempotent re-subscribe on conflict). |
| DELETE | `/subscribers/:token` | 🔓 | Unsubscribe via emailed token. |
| GET | `/subscribers` | 🔒 | List/export subscribers. |

**POST /subscribers**
```json
{ "email": "user@example.com" }
```
`201` → `{ "email": "user@example.com", "status": "subscribed" }`

---

## Weekly editions  `/weekly-editions`

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/weekly-editions/current` | 🔓 | Current open edition + winner + tallies. |
| GET | `/weekly-editions` | 🔓 | History of editions. |
| POST | `/weekly-editions` | 🔒 | Open a new edition `{ weekNumber, year, votingOpensAt, votingClosesAt }`. |
| PATCH | `/weekly-editions/:id` | 🔒 | Set winner / close voting `{ winnerProductId }`. |

> A scheduled job (`@Cron`, Mondays) closes the current edition, tallies votes,
> sets the winner, and opens the next one. Admin can override via PATCH.

---

## Reference  `/reference`

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/reference/categories` | 🔓 | All categories. |
| GET | `/reference/governorates` | 🔓 | 24 governorates + `deliveryFee` + `active`. |

```json
// GET /reference/governorates
[ { "id": 1, "name": "Tunis", "deliveryFee": 7.000, "active": true }, … ]
```

---

## Auth  `/auth`  (admin back-office)

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/auth/login` | 🔓 | `{ email, password }` → `{ accessToken, refreshToken }`. |
| POST | `/auth/refresh` | 🔓 | Exchange refresh token. |
| GET | `/auth/me` | 🔒 | Current admin profile. |

---

## Frontend → endpoint mapping

| Frontend code | Replaces simulated logic with |
|---------------|-------------------------------|
| `src/data/products.ts` (`currentWinner`) | `GET /products/current-winner` |
| `src/data/products.ts` (`pastWinners`)   | `GET /products/past-winners` |
| `ProductPage.tsx` `handleSubmitOrder` (setTimeout) | `POST /orders` |
| `Newsletter.tsx` `handleSubmit` (toast only) | `POST /subscribers` |
| Vote counts on cards | `GET /weekly-editions/current` + `POST /products/:id/vote` |

Recommended client: a typed `@tanstack/react-query` layer (already a dependency)
calling these endpoints, with shared TS types generated from the OpenAPI spec
(`@nestjs/swagger`).
