# Supabase Setup

This folder is safe to commit to GitHub. It contains local Supabase configuration and database migrations only.

Do not commit `.env`, service-role keys, database passwords, or access tokens.

## GitHub Connection

In Supabase, connect this repository:

`Organizestart/APP-ORGAINZE`

Supabase should read database migrations from:

`supabase/migrations`

## App Environment

Create a local `.env` from `.env.example` and fill in the public project values:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```
