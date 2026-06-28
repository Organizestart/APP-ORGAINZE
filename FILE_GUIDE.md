# File Guide

These are the main files you will usually care about.

| File | Plain-English meaning |
| --- | --- |
| `src/StartHere.jsx` | Starts the app in the browser. |
| `src/SafeChangeGuard.jsx` | Catches screen crashes so a broken test does not become a blank page. |
| `src/WorkForceCommandCenter.jsx` | The main WorkForce app screens, buttons, dashboards, and workflows. |
| `src/WorkForceScreenDesign.css` | The app's colors, spacing, sizing, layout, and visual design. |
| `src/lib/SupabaseConnection.js` | Connects the app to Supabase when the project keys are added. |
| `server/AdminReviewService.mjs` | Runs the protected admin review service for app checks and command review. |
| `scripts/checkAdminReviewService.mjs` | Checks that the admin review service starts and responds correctly. |
| `scripts/checkHomeButtons.mjs` | Checks that owner, manager, employee, and signed-out home buttons still work. |
| `scripts/checkSafeChangePreview.mjs` | Checks that Safe Change Preview works without exposing the wrong role controls. |
| `supabase/migrations/` | Database setup and security changes that Supabase reads from GitHub. |
| `SECURITY_RUNBOOK.md` | Human checklist for account security, bot protection, billing protection, and audit logging. |
| `CHANGE_SAFETY_ARCHITECTURE.md` | Plain-English plan for testing app changes before making them part of the main app. |

Some names must stay technical because tools expect them:

| File | Why it stays this way |
| --- | --- |
| `package.json` | App command list and installed packages. |
| `index.html` | Browser page that loads the app. |
| `vite.config.mjs` | Local app server setup. |
| `.env.example` | Safe example of settings needed later. |
