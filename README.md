# RetarGO Marketplace Platform

A multi-role e-commerce platform concept for customers, sellers, admins, and a super administrator.

## What this starter includes
- A polished landing page for the marketplace idea
- A structured requirements document covering user, seller, admin, and super admin modules
- A simple front-end prototype that can be opened locally in a browser

## Suggested stack for the full product
- Frontend: React or Next.js
- Backend: Node.js with Express or NestJS
- Database: PostgreSQL
- Authentication: JWT + role-based access control
- Payments: Paystack, Flutterwave, Stripe, PayPal, or bank transfer
- Real-time features: Socket.IO or Firebase

## Project files
- [index.html](index.html)
- [styles.css](styles.css)
- [script.js](script.js)
- [docs/requirements.md](docs/requirements.md)

## Phase 7 payment integration

RetarGO now supports:
- Server-side payment initialization for Paystack and Flutterwave
- Webhook-based payment verification
- Automatic order status updates from payment events
- Payment history in user account
- Receipt generation per paid order
- Confirmation email dispatch after successful payment

### Required environment variables

Set these in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

APP_URL=http://localhost:3000

PAYSTACK_SECRET_KEY=...
FLUTTERWAVE_SECRET_KEY=...
FLUTTERWAVE_WEBHOOK_SECRET_HASH=...

SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
EMAIL_FROM="RetarGO <no-reply@retargo.com>"
```

Notes:
- Do not prefix payment or SMTP secrets with `NEXT_PUBLIC_`.
- `SUPABASE_SERVICE_ROLE_KEY` is required for secure webhook updates and server-only payment writes.

### Webhook endpoints

Configure provider dashboards to post to:
- `POST /api/payments/paystack/webhook`
- `POST /api/payments/flutterwave/webhook`

Use your production domain, for example:
- `https://your-domain.com/api/payments/paystack/webhook`
- `https://your-domain.com/api/payments/flutterwave/webhook`
