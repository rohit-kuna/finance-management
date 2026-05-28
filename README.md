# next-fs-template-simple

Next.js App Router template with:
- Clerk authentication
- App-level role authorization (`USER` / `ADMIN`)
- Drizzle + Postgres user table keyed by Clerk user id

## Setup

1. Copy envs and fill Clerk keys:

```bash
cp .env.example .env.local
```

2. Start Postgres (optional helper):

```bash
npm run dockerup
```

3. Run app:

```bash
npm run dev
```

## Required Environment Variables

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `DATABASE_URL`

Without Clerk keys, build/runtime will fail when `ClerkProvider` initializes.

## Auth + Role Flow

- Clerk session protection is enforced in `middleware.ts` for non-public routes.
- Public routes:
  - `/`
  - `/sign-in`
  - `/sign-up`
- DB user sync is performed in `app/lib/user-sync.ts` on first authenticated access.
- Role checks happen in `app/lib/auth.ts`:
  - `requireUser()`
  - `requireAdmin()`

## Routes

- `/sign-in` and `/sign-up` are Clerk catch-all routes for App Router.
- `/dashboard` is authenticated-user space.
- `/admin` is admin-only space.
- `/admin/users` is admin users table view.
