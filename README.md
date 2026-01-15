# SellGH Backend API

**Tagline:** Sell anything, reach everyone

Multi-vendor marketplace backend API built with Express.js and Supabase.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage
- **Payments:** Paystack + Mobile Money APIs

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account
- Paystack account

### Installation

1. Install dependencies:
```bash
npm install
```

2. Setup environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your credentials

4. Start development server:
```bash
npm run dev
```

The server will run on `http://localhost:5000`

## Project Structure

```
src/
├── config/         # Configuration files (Supabase, Paystack, etc.)
├── controllers/    # Request handlers
├── middleware/     # Custom middleware (auth, validation, etc.)
├── models/         # Database models/schemas
├── routes/         # API routes
├── services/       # Business logic
├── utils/          # Helper functions
└── server.js       # Main application file
```

## API Routes (Planned)

- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/products` - Get all products
- `POST /api/products` - Create product (vendor only)
- `GET /api/vendors` - Get all vendors
- `POST /api/orders` - Create order
- `POST /api/payments/initialize` - Initialize payment

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm start` - Start production server
- `npm test` - Run tests

## Environment Variables

See `.env.example` for required environment variables.

## License

ISC
