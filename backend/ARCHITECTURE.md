# Architecture & Diagrams

All diagrams are [Mermaid](https://mermaid.js.org/) — they render on GitHub and in
the VS Code Mermaid preview.

---

## 1. System context

```mermaid
flowchart TB
    subgraph Client
        U[Customer<br/>browser]
        A[Admin<br/>back-office]
    end

    subgraph Frontend["Frontend — React SPA (Vite + shadcn)"]
        FE[Storefront + Order form<br/>S3 + CloudFront]
    end

    subgraph Backend["Backend — NestJS REST API"]
        API[NestJS API<br/>ECS Fargate]
    end

    DB[(PostgreSQL<br/>Amazon RDS)]
    SES[Amazon SES<br/>email]
    SNS[Amazon SNS<br/>SMS]

    U -->|HTTPS| FE
    A -->|HTTPS /admin| FE
    FE -->|REST / JSON| API
    API -->|Prisma| DB
    API -->|order receipt /<br/>newsletter confirm| SES
    API -->|COD confirm| SNS
```

---

## 2. Component / layered architecture (NestJS)

```mermaid
flowchart LR
    subgraph HTTP
        C1[ProductsController]
        C2[OrdersController]
        C3[VotesController]
        C4[SubscribersController]
        C5[WeeklyEditionsController]
        C6[ReferenceController]
        C7[AuthController]
    end

    subgraph Services["Business logic (Services)"]
        S1[ProductsService]
        S2[OrdersService]
        S3[VotesService]
        S4[SubscribersService]
        S5[WeeklyEditionsService]
        S6[ReferenceService]
        S7[AuthService]
    end

    subgraph Cross["Cross-cutting"]
        G[JwtAuthGuard / RolesGuard]
        V[ValidationPipe<br/>class-validator DTOs]
        F[AllExceptionsFilter]
        N[NotificationsService<br/>SES + SNS]
        SCH[WinnerRotationJob<br/>@Cron weekly]
    end

    P[(PrismaService)]
    DB[(PostgreSQL)]

    C1 --> S1
    C2 --> S2
    C3 --> S3
    C4 --> S4
    C5 --> S5
    C6 --> S6
    C7 --> S7

    S1 --> P
    S2 --> P
    S2 --> N
    S3 --> P
    S4 --> P
    S4 --> N
    S5 --> P
    S6 --> P
    S7 --> P
    SCH --> S5
    P --> DB

    G -.guards.-> C2
    G -.guards.-> C5
    V -.validates.-> HTTP
    F -.formats errors.-> HTTP
```

> **Public** endpoints: products (read), orders (create), votes, subscribers,
> reference, current weekly edition.
> **Admin (JWT-guarded)**: product writes, order management, weekly-edition
> writes, subscriber export.

---

## 3. Entity-Relationship diagram

```mermaid
erDiagram
    CATEGORIES ||--o{ PRODUCTS : classifies
    GOVERNORATES ||--o{ ORDERS : "ships to"
    PRODUCTS ||--o{ ORDER_ITEMS : "ordered as"
    ORDERS ||--|{ ORDER_ITEMS : contains
    WEEKLY_EDITIONS }o--|| PRODUCTS : "winner is"
    WEEKLY_EDITIONS ||--o{ VOTES : "collected in"
    PRODUCTS ||--o{ VOTES : "voted for"

    CATEGORIES {
        uuid id PK
        citext name UK
        text slug UK
    }

    GOVERNORATES {
        smallint id PK
        text name UK
        numeric delivery_fee
        boolean active
    }

    PRODUCTS {
        uuid id PK
        text slug UK
        text name
        text tagline
        text description
        text image_url
        uuid category_id FK
        numeric price "TND, nullable"
        int votes_count "denormalized"
        boolean is_current_winner
        text status "draft|published|archived"
        timestamptz created_at
        timestamptz updated_at
    }

    WEEKLY_EDITIONS {
        uuid id PK
        int week_number
        int year
        uuid winner_product_id FK
        timestamptz voting_opens_at
        timestamptz voting_closes_at
    }

    VOTES {
        uuid id PK
        uuid product_id FK
        uuid edition_id FK
        text voter_fingerprint
        inet ip_address
        timestamptz created_at
    }

    ORDERS {
        uuid id PK
        text order_number UK
        text full_name
        text phone
        smallint governorate_id FK
        text address
        text status "pending|confirmed|shipped|delivered|cancelled"
        text payment_method "cash_on_delivery"
        numeric subtotal
        numeric delivery_fee
        numeric total
        text notes
        timestamptz created_at
        timestamptz updated_at
    }

    ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        text product_name "snapshot"
        int quantity
        numeric unit_price "snapshot"
        numeric line_total
    }

    SUBSCRIBERS {
        uuid id PK
        citext email UK
        text status "subscribed|unsubscribed"
        boolean confirmed
        timestamptz created_at
        timestamptz unsubscribed_at
    }

    ADMIN_USERS {
        uuid id PK
        citext email UK
        text password_hash
        text role "admin|staff"
        timestamptz created_at
    }
```

**Modeling notes**
- `order_items` **snapshots** `product_name` and `unit_price` so historical
  orders stay correct even if the product price changes later.
- `products.votes_count` is **denormalized** for fast reads; the source of truth
  is the `votes` table (one row per vote). A unique index on
  `(edition_id, voter_fingerprint)` enforces one vote per voter per week.
- "Current winner" is expressed two ways that must stay consistent:
  `weekly_editions.winner_product_id` (authoritative, historical) and
  `products.is_current_winner` (a convenience flag; a **partial unique index**
  guarantees at most one `TRUE`).
- The order form is single-product today, but `order_items` keeps the model
  cart-ready with zero schema change.

---

## 4. Sequence — Place a COD order

```mermaid
sequenceDiagram
    actor C as Customer
    participant FE as React (ProductPage)
    participant API as OrdersController
    participant SVC as OrdersService
    participant DB as PostgreSQL
    participant N as Notifications (SNS/SES)

    C->>FE: Fill form (name, phone, governorate, address, qty)
    FE->>FE: Client validation<br/>(TN phone regex, required fields)
    FE->>API: POST /orders { productId, quantity, customer }
    API->>API: ValidationPipe (DTO) — phone, governorate enum, qty 1..10
    API->>SVC: createOrder(dto)
    SVC->>DB: BEGIN
    SVC->>DB: SELECT product (price, status=published)
    alt product missing / unpublished
        SVC-->>API: 404 / 422
        API-->>FE: error toast
    else ok
        SVC->>DB: lookup governorate delivery_fee
        SVC->>DB: INSERT order (status=pending) + order_items (price snapshot)
        SVC->>DB: COMMIT
        SVC->>N: send SMS/email "order received, we'll call to confirm"
        SVC-->>API: 201 { orderNumber, total }
        API-->>FE: 201
        FE-->>C: "Order Submitted 🎉" toast
    end
```

---

## 5. Sequence — Newsletter subscribe

```mermaid
sequenceDiagram
    actor C as Visitor
    participant FE as Newsletter component
    participant API as SubscribersController
    participant DB as PostgreSQL
    participant SES as Amazon SES

    C->>FE: Enter email + Subscribe
    FE->>API: POST /subscribers { email }
    API->>API: validate email
    API->>DB: INSERT ... ON CONFLICT(email) DO UPDATE (re-subscribe)
    alt new or re-subscribed
        API->>SES: send confirmation email
    end
    API-->>FE: 201 { status: "subscribed" }
    FE-->>C: "You're subscribed!" toast
```

---

## 6. Sequence — Admin: rotate weekly winner

```mermaid
sequenceDiagram
    participant CRON as WinnerRotationJob (@Cron Mon 00:00)
    participant SVC as WeeklyEditionsService
    participant DB as PostgreSQL
    actor ADM as Admin

    Note over CRON,DB: Automatic weekly rotation
    CRON->>SVC: closeCurrentEdition()
    SVC->>DB: tally votes → set winner_product_id, voting_closes_at
    SVC->>DB: open next edition (week+1)
    SVC->>DB: clear old is_current_winner, set new winner flag

    Note over ADM,DB: Manual override (JWT-guarded)
    ADM->>SVC: PATCH /weekly-editions/current { winnerProductId }
    SVC->>DB: UPDATE within transaction (keep flags consistent)
    SVC-->>ADM: 200
```

---

## 7. Deployment (Terraform → AWS)

```mermaid
flowchart TB
    Dev[Developer] -->|git push| GH[GitHub]
    GH -->|GitHub Actions| ECR[(Amazon ECR<br/>API image)]
    GH -->|build SPA| S3FE[(S3 static site)]

    subgraph AWS
        CF[CloudFront] --> S3FE
        CF -->|/api/*| ALB[Application Load Balancer]

        subgraph VPC
            subgraph Public
                ALB
            end
            subgraph PrivateApp["Private subnets"]
                ECS[ECS Fargate<br/>NestJS tasks x2]
            end
            subgraph PrivateData["Private subnets"]
                RDS[(RDS PostgreSQL<br/>Multi-AZ)]
            end
        end

        ECS --> RDS
        ECS --> SM[Secrets Manager<br/>DB creds, JWT secret]
        ECS --> SES[SES]
        ECS --> SNS[SNS]
        ECS --> CW[CloudWatch Logs/Metrics]
        ECR --> ECS
    end

    Customer[Customer] --> CF
```

**Terraform modules** (to place in the repo's `terraform/`):
`network` (VPC, subnets, NAT) · `database` (RDS + subnet group + SG) ·
`api` (ECR, ECS cluster/service/task, ALB, target group, autoscaling) ·
`frontend` (S3 + CloudFront + ACM cert) · `secrets` · `iam`.

---

## 8. Key decisions (ADR-style summary)

| # | Decision | Rationale | Trade-off |
|---|----------|-----------|-----------|
| 1 | NestJS + Prisma + Postgres | Type sharing with FE, transactional COD flow, mature ecosystem | Heavier than BaaS |
| 2 | Guest checkout (no customer accounts) | Form collects only name/phone/address; COD needs no login | No order history per user (lookup by phone/order number instead) |
| 3 | `order_items` with price snapshot | Historical accuracy + future cart support | Slightly more joins |
| 4 | `weekly_editions` entity | Clean "Product of the Week" rotation + per-week voting | One extra table vs. a flag-only approach |
| 5 | Governorate lookup table (not enum) | Carries per-zone `delivery_fee`, editable without migration | Needs a seed |
| 6 | Denormalized `votes_count` | Fast storefront reads | Must update on each vote (handled in service/trigger) |
| 7 | Fargate over Lambda | Long-lived service, scheduled jobs, simpler transactions | Always-on baseline cost |
