# Data Manager

A digital business diary. Replaces the paper notebook where you scribble "spoke
to so-and-so about tomatoes 3 days ago." Tracks **contacts** (suppliers, buyers,
partners), **interactions** (dated diary entries with location, summary,
follow-up), product **categories**, and firm **deals** with payment status.

Built with Next.js 14 + Supabase. Deploys free on Vercel.

## What it does

- **Contacts** — add suppliers/buyers with phone, locality, address, notes
- **Interactions** — log conversations with date, location, what was discussed,
  follow-up date, and product line items (e.g. "Tomato, 200kg, ₹18/kg")
- **Deals** — turn talks into firm orders, track payment status
- **Categories** — taxonomy of products (Vegetables, Fruits, …)
- **Team** — invite teammates by email; everyone shares the same workspace
- **Auth** — email + password, magic link, or Google sign-in
- Mobile-friendly UI; works as a "save to home screen" app from your phone

## Setup (one-time, ~15 minutes)

### 1. Install dependencies

```powershell
cd "D:\projects\data manager"
npm install
```

### 2. Create a Supabase project (free)

1. Go to https://supabase.com → **Start your project** → sign in with GitHub.
2. Click **New project**. Pick a name (e.g. `data-manager`), set a database
   password, choose the region closest to you. Wait ~1 minute for provisioning.
3. From the project dashboard, open **Settings → API**. Copy these two values:
   - **Project URL** (e.g. `https://abc123.supabase.co`)
   - **anon public** key (a long `eyJ...` string)

### 3. Run the database migration

In the Supabase dashboard:

1. Open **SQL editor → New query**.
2. Paste the entire contents of `supabase/migrations/0001_init.sql` from this
   repo.
3. Click **Run**. You should see "Success. No rows returned." This creates all
   tables, RLS policies, and the signup trigger.

### 4. Configure environment variables

Copy the example file:

```powershell
Copy-Item .env.local.example .env.local
```

Open `.env.local` and paste in the two values from step 2:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 5. (Optional) Enable Google sign-in

If you only need email/password + magic link, **skip this step**.

In Supabase dashboard:

1. **Authentication → Providers → Google** → enable.
2. Follow the linked guide to create OAuth credentials in Google Cloud Console:
   https://supabase.com/docs/guides/auth/social-login/auth-google
3. Paste the Client ID and Secret back into Supabase, save.
4. Add `http://localhost:3000/auth/callback` to Google's authorized redirect
   URIs while testing locally; add your Vercel URL once deployed.

### 6. (Optional) Disable email confirmation while testing

In **Authentication → Providers → Email**, you can turn off **Confirm email**
during development so signups go straight through. Re-enable it before going
live.

### 7. Run locally

```powershell
npm run dev
```

Open http://localhost:3000. Sign up, name your workspace, and start logging.

---

## Deploy to Vercel (free)

1. Push this folder to a GitHub repo (`git init && git add . && git commit ...`,
   then create a repo on GitHub and push).
2. Go to https://vercel.com → **Add New… → Project** → import your repo.
3. **Environment Variables** — paste the same three from `.env.local`, but set
   `NEXT_PUBLIC_SITE_URL` to the URL Vercel will give you
   (e.g. `https://data-manager-yourname.vercel.app`).
4. Click **Deploy**. Done.
5. Back in Supabase → **Authentication → URL Configuration**, add your Vercel
   URL to **Site URL** and to the **Redirect URLs** allow-list (the bare URL
   plus `/auth/callback`).
6. If you enabled Google, add the production callback URL to Google's
   authorized redirect URIs too.

The free Vercel + Supabase tiers handle a small team's usage comfortably.

---

## Inviting teammates

1. Sign in.
2. Go to **Team → Invite**.
3. Enter their email and pick role (Admin/Member).
4. Tell them to sign up at the same URL with that email. They'll be added
   automatically by the database trigger.

---

## Data model

| Table | What it holds |
|---|---|
| `organizations` | Your business workspace |
| `members` | Who belongs to which workspace and their role |
| `invitations` | Pending team invites (auto-accepted on signup) |
| `categories` | Product taxonomy (Vegetables, Fruits, Spices…) |
| `contacts` | Suppliers, buyers, partners |
| `interactions` | Diary entries — who, when, where, what, follow-up |
| `interaction_items` | Line items for an interaction (category + qty + price) |
| `deals` | Firm transactions with payment status |
| `deal_items` | Line items for a deal |

Row Level Security ensures each workspace only sees its own data.

---

## Project layout

```
data manager/
├── supabase/migrations/0001_init.sql   ← run this in Supabase SQL editor
├── src/
│   ├── app/
│   │   ├── (auth)/login,signup        ← sign-in / sign-up pages
│   │   ├── auth/callback/route.ts     ← OAuth + magic link landing
│   │   ├── onboarding/                ← first-time workspace setup
│   │   └── (app)/
│   │       ├── layout.tsx             ← sidebar shell, auth guard
│   │       ├── dashboard/             ← stats + recent activity
│   │       ├── contacts/              ← list, new, [id], [id]/edit
│   │       ├── interactions/          ← list, new, [id], [id]/edit
│   │       ├── deals/                 ← list, new, [id], [id]/edit
│   │       ├── categories/            ← manage product tags
│   │       └── team/                  ← invite/list teammates
│   ├── components/                    ← UI primitives + forms
│   ├── lib/supabase/                  ← browser/server clients + middleware
│   ├── lib/types.ts                   ← typed schema
│   ├── lib/org.ts                     ← `requireOrg()` helper
│   └── middleware.ts                  ← cookie-based session refresh
└── README.md
```

---

## Common commands

```powershell
npm run dev        # start dev server on http://localhost:3000
npm run build      # production build
npm run start      # run production build locally
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
```

---

## Roadmap ideas (not built yet)

- Global search across contacts + interactions + deals
- Export to CSV / WhatsApp share
- Photo attachments for interactions (Supabase Storage)
- Reminders by email or push for follow-ups
- Reports: monthly purchases by supplier, by category, etc.
- Offline-first PWA install prompt

The schema is designed to extend — drop new columns or tables and add an
RLS policy that uses `is_member_of(org_id)`.
