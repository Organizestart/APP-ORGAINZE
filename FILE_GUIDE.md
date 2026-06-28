# File Guide

These are the main files you will usually care about.

| File | Plain-English meaning |
| --- | --- |
| `src/StartHere.jsx` | Starts the app in the browser. |
| `src/WorkForceCommandCenter.jsx` | The main WorkForce app screens, buttons, dashboards, and workflows. |
| `src/WorkForceScreenDesign.css` | The app's colors, spacing, sizing, layout, and visual design. |
| `src/lib/SupabaseConnection.js` | Connects the app to Supabase when the project keys are added. |
| `server/AdminReviewService.mjs` | Runs the protected admin review service for app checks and command review. |
| `scripts/checkAdminReviewService.mjs` | Checks that the admin review service starts and responds correctly. |
| `scripts/checkHomeButtons.mjs` | Checks that owner, manager, employee, and signed-out home buttons still work. |
| `supabase/migrations/` | Database setup and security changes that Supabase reads from GitHub. |
| `SECURITY_RUNBOOK.md` | Human checklist for account security, bot protection, billing protection, and audit logging. |

Some names must stay technical because tools expect them:

| File | Why it stays this way |
| --- | --- |
| `package.json` | App command list and installed packages. |
| `index.html` | Browser page that loads the app. |
| `vite.config.mjs` | Local app server setup. |
| `.env.example` | Safe example of settings needed later. |
