# auto Flow — Premium Logistics Automation Platform

**auto Flow** is an all-in-one order management and shipping automation platform built for Algerian and international e-commerce businesses. It supports multi-carrier shipping, multi-store management, COD workflows, real-time tracking, CRM, analytics, and VIP-tier premium support.

Tech stack: **React 19 + TypeScript + Vite 7 + Tailwind CSS 4 + Framer Motion + Supabase + Vercel Serverless Functions**.

---

## Features

- Full authentication (signup + login + OTP verification + session tracking)
- Complete merchant dashboard (orders, shipments, stores, customers, analytics, notifications, logs, settings)
- **Multi-carrier shipping**: Yalidine, ZR Express, Noest, Amana, EMS Algeria, DHL, FedEx, UPS, Aramex
- **E-commerce integrations**: Shopify, WooCommerce, Magento, OpenCart, Custom API
- Cash-on-delivery (COD) management with reconciliation
- Multi-language (English, French, Arabic with RTL) and multi-currency (DZD, USD, EUR)
- Dark / light theme
- **VIP tier** with dedicated account manager, AI shipping optimizer, white-label branding, monthly 1:1 training
- Pricing: Starter (10-day free trial) · Professional (20,000 DZD / 180 days / 5,000 orders) · VIP Lifetime (45,000 DZD / 5.5 years)
- All CTAs route to WhatsApp (`+213 794 157 508`) for instant sales contact

---

## Project Structure

```
.
├── api/              # Vercel serverless functions (Supabase-backed)
├── public/           # Static assets (logos, icons)
├── src/
│   ├── components/   # Logo, Navbar, WhatsAppButton, OTP, etc.
│   ├── context/      # AppContext (lang, theme, user, settings)
│   ├── lib/          # Supabase client, i18n, session, utils
│   ├── pages/        # Landing, Login, Signup, Dashboard, Demo, Admin
│   └── App.tsx
├── index.html
├── vercel.json       # Deployment config + environment variables
└── package.json
```

---

## Local Development

```bash
npm install
npm run dev       # dev server at http://localhost:5173
npm run build     # production bundle (tsc -b && vite build)
npm run lint
```

---

## Supabase Setup

This project uses [Supabase](https://supabase.com) for authentication, database, and serverless functions.

1. Create a new Supabase project at https://supabase.com.
2. Open the SQL editor and create tables for: `users`, `orders`, `shipments`, `stores`, `customers`, `notifications`, `logs`, `plans`, `platform_settings`, `otp_sessions`, `user_sessions`.
3. Copy your project URL and `anon` key from **Settings → API** into the environment variables below.
4. Copy your `service_role` key (kept server-side only) into `SUPABASE_SERVICE_ROLE_KEY` for the API functions.

Required environment variables (configure in Vercel or `.env.local`):

```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>  # server only, never expose
VITE_GOOGLE_CLIENT_ID=<optional, for Google sign-in>
VITE_GOOGLE_AUTH_PROXY=<optional, OAuth proxy URL>
```

> **Security note:** `SUPABASE_SERVICE_ROLE_KEY` must NEVER be committed or exposed to the client. In Vercel add it as an **encrypted environment variable** on the project settings page.

---

## Deployment to Vercel

1. Push this repo to GitHub.
2. Go to https://vercel.com and import the repo.
3. Add the environment variables listed above in **Settings → Environment Variables**.
4. Click **Deploy**. Vercel will auto-detect Vite and build the static frontend plus deploy the `/api` serverless functions.
5. Configure your custom domain (e.g. `app.autoflow.dz`) in **Settings → Domains**.

---

## Customer Contact (WhatsApp)

All primary call-to-action buttons on the landing page, pricing plans, and demo link directly to WhatsApp:

```
https://wa.me/213794157508
```

Update the number in the `platform_settings` Supabase table (key `support_whatsapp`) or from the admin UI.

---

## Pricing

| Plan            | Price          | Duration     | Highlights                                             |
| --------------- | -------------- | ------------ | ------------------------------------------------------ |
| Starter         | Free           | 10-day trial | 500 orders · 2 stores · 5 carriers                     |
| **Professional**| **20,000 DZD** | **180 days** | 5,000 orders · unlimited stores · WhatsApp support     |
| **VIP Lifetime**| **45,000 DZD** | **5.5 years**| Unlimited everything + all VIP perks + dedicated mgr.  |

---

## License

© 2025 auto Flow. All rights reserved.
