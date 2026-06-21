# Vinyl Store

Bilingual (Serbian / English) catalog website for a vinyl record shop. Browse,
search, sort, and filter records; see availability. **Orders are taken by phone
only** — there is no cart or checkout. A password-protected admin panel manages
the catalog.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL on [Neon](https://neon.tech) |
| ORM | Drizzle |
| i18n | next-intl (`sr` default, `en`) — UI only; record data is entered once |
| Auth | Auth.js v5 (credentials, single shared admin) |
| Image storage | Cloudflare R2 (S3-compatible) |
| Hosting | Vercel |

Target running cost: **~$0–1/mo** (Neon + R2 free tiers, Vercel Hobby) + domain.

## Project layout

```
app/
  [locale]/            # public, localized site (sr/en)
    page.tsx           # catalog (search / sort / filter)
    records/[id]/      # record detail + "call to order"
    contact/
  admin/
    login/             # sign-in (outside the auth guard)
    (protected)/       # everything here requires a session
      page.tsx         # dashboard (record list)
      records/new, [id]# add / edit record
  api/auth/[...nextauth]
db/          schema.ts (Drizzle) + Neon client + migrations
i18n/        routing, navigation, request config
lib/         records queries, server actions, R2 storage
messages/    en.json, sr.json
proxy.ts     next-intl middleware (Next 16 renamed middleware → proxy)
```

## Getting started

1. **Install** — `npm install`
2. **Env** — copy `.env.example` to `.env.local` and fill in Neon, Auth.js, and R2 values.
3. **Schema** — push the Drizzle schema to your Neon DB:
   ```bash
   npm run db:push        # or: db:generate + db:migrate for tracked migrations
   ```
4. **Admin user** — create the shared login:
   ```bash
   npm run create-admin -- admin@shop.rs "a-strong-password"
   ```
5. **Run** — `npm run dev` → http://localhost:3000 (redirects to `/sr`).
   Admin at http://localhost:3000/admin.

## Scripts

- `npm run dev` / `build` / `start`
- `npm run typecheck` — `tsc --noEmit`
- `npm run db:push | db:generate | db:migrate | db:studio`
- `npm run create-admin -- <email> "<password>"`

## Decisions / notes

- **Pricing is single-currency (RSD, whole dinars)** with a per-record "Call for price" toggle. Formatted via `lib/format.ts`.
- **Serbian is Latin script only** — search is plain Postgres `ILIKE`; no
  Cyrillic transliteration needed.
- **Translations are UI-only.** Record fields (artist, title, description) are
  stored once as entered; only chrome is bilingual via `messages/*.json`.
- **Stock**: the public site shows only In stock / Out of stock; the real
  quantity is admin-only.

## Next steps (not yet built)

- **Image upload** in the admin form via R2 presigned URLs (`lib/storage.ts`
  has `presignUpload`); the uploader UI and an `images` write path are TODO.
- **Genre tags** editing in the admin form (schema + join table already exist).
- SEO niceties: per-record `generateMetadata`, sitemap, Open Graph images.
