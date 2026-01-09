# ELX-like WooCommerce AI Chatbot SaaS — v0.1 Spec (Build Doc)

## Goal
Build a multi-tenant SaaS that provides an embeddable AI chatbot widget for WooCommerce stores.
Each store (tenant) has its own data (products, FAQ, policies), chat behavior, API key, and widget configuration.

## Non-goals (v0.1)
- No multi-language admin UI (EN only is fine, i18n later)
- No advanced analytics dashboard (basic metrics only)
- No complex roles/permissions (owner only)
- No Shopify/Magento (WooCommerce only)

---

## Tech Stack (required)
- Monorepo with:
  - `apps/web` — Next.js (App Router) dashboard + marketing pages
  - `apps/api` — Node.js API (Fastify or Express) in TypeScript
  - `apps/widget` — Embeddable widget (React + Vite) built to a single `widget.js`
  - `packages/shared` — shared types + utils
- Database: Postgres
- Vector search: pgvector in the same Postgres
- Auth: NextAuth (or custom JWT) for dashboard; API key for widget
- Payments: Stripe (single plan) with webhooks
- Deploy target: Vercel (web) + Railway/Fly.io (api+db) OR all on one platform if easier

---

## Core Concepts
### Tenancy
- Every request is scoped to a `storeId` (tenant).
- Widget requests include `storeId` and are authorized via a signed token OR server-side lookup of store config using a public `storeId` + rate limiting.
- Admin requests require user auth and store ownership validation.

### Data Sources per Store
- WooCommerce Products (sync via Woo REST API or product feed endpoint)
- FAQ / Knowledge Base (manual paste + optional URL import)
- Policies (returns/shipping) (optional v0.1 but schema ready)

### AI Pattern
- Orchestrator model handles user conversation.
- Tools:
  - `search_products`
  - `search_faq`
  - `order_status`
  - `create_handoff_ticket` (stub v0.1)
- RAG: embeddings stored in pgvector; retrieve top-k; rerank optional.

---

## Required Features (v0.1)

### 1) Marketing Site (apps/web)
Pages:
- `/` landing (hero, features, integrations, pricing, faq, CTA)
- `/pricing`
- `/login`, `/register`
- Basic SEO (title/description, og tags)

### 2) SaaS Dashboard (apps/web)
Screens:
- Dashboard home: list stores
- Create store wizard:
  - store name
  - WooCommerce domain
  - WooCommerce REST credentials (consumer key/secret) OR product feed URL
- Store settings:
  - API key rotate
  - Widget theme (light/dark), primary color, position (left/right), greeting text
  - Knowledge base editor (FAQ Q/A entries)
  - “Sync now” buttons for products and FAQ import
- Billing page:
  - Stripe checkout link
  - current plan + usage counter (messages this month)
  - cancel/manage billing via Stripe customer portal

### 3) Embeddable Widget (apps/widget)
Requirements:
- Delivered as **single JS** file `widget.js`
- Runs inside **Shadow DOM** (no CSS conflicts)
- Config via script tag data attributes:
  - `data-store-id`
  - `data-theme`
  - `data-position`
  - `data-greeting`
- Chat UI:
  - bubble launcher
  - message list + typing indicator
  - streaming response rendering
  - store session in `localStorage` (`sessionId`)
- Calls `POST /chat` on API
- Shows product cards when API returns product references

Embed snippet output example:
```html
<script
  src="https://cdn.YOUR_DOMAIN.com/widget.js"
  data-store-id="STORE_ID"
  data-theme="dark"
  data-position="right"
  data-greeting="Hi! What are you looking for?"
></script>
