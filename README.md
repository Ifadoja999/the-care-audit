# The Care Audit

AI-powered public directory of government inspection reports for 37,000+ senior care facilities nationwide.

## What it does

- Pulls and processes state inspection data from CMS and state health departments
- Generates AI summaries of each facility's violation history using Claude (Anthropic)
- Lets facilities claim their profile and respond to findings (Stripe-gated feature)
- Runs automated outreach to facilities via Resend (500 emails/day)
- Tracks facility engagement and audit response workflows

## Tech stack

- **Frontend:** Next.js, React, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Payments:** Stripe (subscriptions + one-time)
- **Email:** Resend
- **Automation:** Trigger.dev (scheduled jobs, background workers)
- **Scraping:** Playwright (multi-portal data extraction)
- **AI:** Claude API (Anthropic) for facility summary generation
- **Deployment:** Vercel

## Structure

- `/app` — Next.js app router pages and API routes
- `/components` — React UI components
- `/lib` — Supabase client, Stripe helpers, utility functions
- `/scripts` — Data ingestion and enrichment scripts
- `/src/trigger` — Trigger.dev background job definitions
- `/supabase` — Database schema and migrations
