# Delivery Date Pro

Production-ready Shopify custom app: product-specific delivery date picker with capacity, cutoff, blackout dates, and theme extension.

## Architecture

- **Node + Remix** (Shopify CLI scaffold)
- **Embedded admin** — Polaris UI
- **Theme App Extension** — storefront block (product/cart)
- **App Proxy** — `/apps/delivery/available-dates` and `/apps/delivery/validate-date`
- **Prisma + PostgreSQL** — production (Neon); use `DATABASE_URL` with Postgres URL on Vercel
- **Metafields** — product-level settings: `delivery.enabled`, `delivery.cutoff_hours`, `delivery.max_days_ahead`, `delivery.daily_capacity`

## Core features

1. **Product-specific date picker** — Enable/disable and override cutoff, max days ahead, daily capacity per product via metafields.
2. **Storefront widget** — Theme block with Flatpickr; preselects next valid date; disables blackout, fully booked, past cutoff, beyond max days; saves line item property `Delivery Date`.
3. **Admin settings** — Global cutoff time, daily capacity, max days ahead, weekend toggle, timezone, blackout dates (one-off + recurring), “Show on Cart page” toggle.
4. **Capacity** — Server-side count per date; product override or global fallback.
5. **Cutoff** — Same-day disabled after cutoff; product override; shop timezone.
6. **Order tagging** — `orders/create` webhook adds tags `Delivery-[YYYY-MM-DD]` and `Delivery-Date-Selected` and increments daily count.
7. **App Proxy** — HMAC-verified; returns available/excluded dates and next valid date; validate-date for checkout.
8. **Security** — HMAC on proxy; server-side date validation before checkout.
9. **Confirmation email** — Shortcode for the order confirmation email `line_items` loop to display the selected **Delivery Date** per line item (see [docs/confirmation-email-shortcode.md](docs/confirmation-email-shortcode.md)).
10. **Product add-ons** — In admin, create add-ons (e.g. “Additional meat pie”) and link each to a Shopify product variant. Add-ons appear under the date selector; when selected they are added to cart with the main product so the total includes their price.

## Code structure

```
app/
  routes/
    admin.settings     → app.settings.tsx (Polaris admin)
    api.available-dates → apps.delivery.available-dates.tsx (proxy)
    api.validate-date  → apps.delivery.validate-date.tsx (proxy) + api.validate-date.tsx
    webhooks/orders-create → webhooks.orders.create.tsx
    webhooks/products-update → webhooks.products.update.tsx
  lib/
    app-proxy.server.ts
    delivery/
      availability.server.ts
      blackout.server.ts
      capacity.server.ts
      metafields.server.ts
      metafield-definitions.server.ts
      settings.server.ts
extensions/
  delivery-widget/     (Theme App Extension)
    blocks/delivery-date-picker.liquid
    assets/delivery-date-picker.js, .css
prisma/
  schema.prisma        (Session, GlobalSettings, BlackoutDate, DeliveryDayCount, ProductDeliveryCache)
```

## Installation (Shopify Partners)

### Prerequisites

- Node.js 20+
- Shopify Partner account
- Development store (or Plus sandbox)

### 1. Clone and install

```bash
cd "Shopify Date Picker"
npm install
```

### 2. Environment

Create `.env` (or use `shopify app env`):

```env
# Populated by `shopify app dev` or set manually:
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SCOPES=write_products,read_orders,write_orders,read_products
SHOPIFY_APP_URL=https://your-ngrok-or-host URL
DATABASE_URL="file:./dev.sqlite"
```

For local SQLite:

```bash
echo 'DATABASE_URL="file:./dev.sqlite"' >> .env
```

### 3. Database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Create/link app in Partners

- In [Partners](https://partners.shopify.com) create a new app (or use existing).
- In the app’s **App setup**: set **App URL** to your tunnel (e.g. `https://xxx.ngrok.io`).
- Under **URLs** add the same base for **Allowed redirection URL(s)** (e.g. `https://xxx.ngrok.io/auth/callback`).

Then link the project:

```bash
shopify app config link
```

Or manually set `client_id` in `shopify.app.toml` and ensure env vars match.

### 5. App Proxy (Partners)

In the app’s **App setup** → **App proxy**:

- **Subpath prefix:** `apps`
- **Subpath:** `delivery`
- **Proxy URL:** `https://YOUR_APP_HOST/apps/delivery`

So store requests to `https://STORE.myshopify.com/apps/delivery/available-dates` are forwarded to your app.

### 6. Run locally

```bash
shopify app dev
```

This will prompt to create/select a dev store, start the Remix server, and tunnel. Open the app from the Partners dashboard or the store admin.

### 7. Theme extension

- In theme editor, add a **section** that supports **App blocks** (e.g. main product section).
- Add block **“Delivery date picker”** (from Delivery Date Pro).
- Optional: enable **“Show delivery date selector on Cart Page”** in app settings and add the block to the cart template if your theme allows.

### 8. Metafield definitions (optional)

To edit product-level delivery settings in Admin (Product metafields):

- Namespace: `delivery`
- Keys: `enabled` (boolean), `cutoff_hours` (integer), `max_days_ahead` (integer), `daily_capacity` (integer)

You can register these once via GraphQL (Admin API) or use the app’s `registerDeliveryMetafieldDefinitions(admin)` from an install hook or a one-off script. Product updates then sync to `ProductDeliveryCache` via the `products/update` webhook.

---

## Deployment (Vercel)

### 1. Database (production)

Vercel works with external databases. For production, use **PostgreSQL** (e.g. Vercel Postgres, Neon, Railway) and point `DATABASE_URL` to it.

Update `prisma/schema.prisma` for production:

```prisma
datasource db {
  provider = "postgresql"  // or keep sqlite for single-instance
  url      = env("DATABASE_URL")
}
```

Then:

```bash
npx prisma migrate deploy
```

Keep SQLite for local dev; use a separate `DATABASE_URL` for production.

### 2. Vercel project

- Import the repo in Vercel.
- Set **Root Directory** to the project root (where `package.json` and `shopify.app.toml` are).
- **Framework:** Remix (Vercel detects it).
- **Build command:** `npm run build` (or `npx prisma generate && remix vite:build`).
- **Output directory:** leave default (Remix/Vite output).
- **Install command:** `npm install`.

### 3. Environment variables (Vercel)

In Vercel → Project → Settings → Environment Variables, set:

- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `SCOPES` (e.g. `write_products,read_orders,write_orders,read_products`)
- `SHOPIFY_APP_URL` = `https://your-vercel-app.vercel.app`
- `DATABASE_URL` (production PostgreSQL URL)

Redeploy after changing env.

**If you see “the URL must start with the protocol \`file:\`” or Prisma/SQLite errors:** the deployed code still has the old SQLite schema. Ensure (1) the repo connected in Vercel is the one with `provider = "postgresql"` in `prisma/schema.prisma`, (2) `DATABASE_URL` in Vercel is your **Neon (or other) Postgres** connection string (starts with `postgresql://`), and (3) trigger a new deploy from the latest commit.

### 4. Shopify app URLs

In Partners, set:

- **App URL:** `https://your-vercel-app.vercel.app`
- **Allowed redirection URL(s):**  
  `https://your-vercel-app.vercel.app/auth/callback`  
  (and any other auth URLs your app uses)
- **App proxy:** Proxy URL = `https://your-vercel-app.vercel.app/apps/delivery`

### 5. Deploy

```bash
git push
```

Or:

```bash
vercel --prod
```

### 6. Webhooks

Webhooks are registered via `shopify.app.toml` and the Shopify CLI. After deploy, ensure the app’s webhook endpoints use your production URL (e.g. `https://your-vercel-app.vercel.app/webhooks/orders/create`). Re-run `shopify app deploy` or update webhooks in Partners if needed.

---

## UX notes

- **Admin:** Polaris layout; clear labels for cutoff, capacity, max days, timezone, blackouts, cart toggle.
- **Storefront:** Flatpickr; greyed-out disabled dates; messages like “This date is fully booked” and “Ordering window closed for today”; scroll to calendar on invalid selection.
- **Validation:** Selected date is re-validated via proxy before checkout to prevent tampering.

---

## License

MIT.
