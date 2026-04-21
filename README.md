# SellGH Backend API

Multi-vendor marketplace backend API built with Express.js and Supabase.

## Contract First

The current backend supports a transitional schema, but the runtime and SQL contract must stay explicit:

- Canonical order total: `orders.total_amount`, with `orders.total` and `orders.subtotal` kept in sync for compatibility.
- Canonical line-item total: `order_items.total`, with `order_items.subtotal` treated as a legacy alias.
- Canonical payout linkage: `vendor_payouts.commission_ids`, with `vendor_payouts.order_ids` retained only for older rows and UI code.
- Vendor onboarding still accepts legacy aliases such as `business_description`, `business_address`, and provider-specific mobile money fields.

Run [database/schema_reconciliation.sql](database/schema_reconciliation.sql) against older databases before relying on the current controllers. If you change queries or validators, update that SQL file and [tests/schemaContract.test.js](tests/schemaContract.test.js) in the same pass.

## Tech Stack

- Runtime: Node.js
- Framework: Express.js
- Database: Supabase (PostgreSQL)
- Authentication: Supabase Auth
- Storage: Supabase Storage
- Payments: Paystack + Mobile Money APIs

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Paystack account

### Installation

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Fill in your Supabase, Paystack, and email credentials.
4. Start the server with `npm run dev`.

The server runs on `http://localhost:5000` by default.

## Project Structure

```text
src/
|-- config/         Configuration files
|-- controllers/    Request handlers
|-- middleware/     Auth, validation, and request guards
|-- routes/         API routes
|-- services/       Business logic integrations
|-- utils/          Schema and runtime helpers
`-- server.js       Application entrypoint
```

## API Routes

- `GET /api/products` - Public product listing
- `POST /api/products` - Create product (vendor only)
- `GET /api/vendors` - Public vendor listing
- `POST /api/orders` - Legacy order creation path
- `POST /api/orders/checkout` - Server-owned checkout and payment initialization
- `POST /api/payments/initialize` - Initialize payment for an existing order
- `POST /api/users/sync-profile` - Sync authenticated Supabase users into the `users` table

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm start` - Start production server
- `npm test` - Run the backend test suite

## Schema Safety

Before shipping schema-related changes:

1. Update the runtime code.
2. Update [database/schema_reconciliation.sql](database/schema_reconciliation.sql) if the table contract changed.
3. Run `npm test`.
4. Re-run checkout, payment finalization, payout settlement, and vendor-access flows against a real Supabase environment.

## Environment Variables

See `.env.example` for required variables.
