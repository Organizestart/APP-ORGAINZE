# File Guide

These are the main files you will usually care about.

| File | Plain-English meaning |
| --- | --- |
| `src/StartApp.jsx` | Starts the app in the browser. |
| `src/SafeChangeShield.jsx` | Catches screen crashes so a broken test does not become a blank page. |
| `src/SafePreviewAccounts.js` | Ten local test accounts and flow checks used only in Safe Change Preview. |
| `src/RoleAccessRules.js` | Keeps the owner, manager, employee, and platform-admin section access rules in one clear place. |
| `src/StateRecoveryRules.js` | Repairs broken or older saved prototype data before screens use it. |
| `src/MainWorkForceApp.jsx` | The main WorkForce app screens, buttons, dashboards, and workflows. |
| `src/AppDesign.css` | The app's colors, spacing, sizing, layout, and visual design. |
| `src/lib/ConnectToSupabase.js` | Connects the app to Supabase when the project keys are added. |
| `server/AdminReviewServer.mjs` | Runs the protected admin review service for app checks and command review. |
| `scripts/testAdminReviewServer.mjs` | Checks that the admin review service starts and responds correctly. |
| `scripts/testHomeButtons.mjs` | Checks that owner, manager, employee, and signed-out home buttons still work. |
| `scripts/testSafePreview.mjs` | Checks that Safe Change Preview works without exposing the wrong role controls. |
| `scripts/testPreviewAccounts.mjs` | Checks the ten Safe Preview accounts and their role boundaries. |
| `scripts/testDashboardLayout.mjs` | Checks the owner and manager dashboard format does not go back to cramped cards. |
| `scripts/testAllRoleSections.mjs` | Opens every owner, manager, employee, signed-out, and platform-admin section in Safe Preview. |
| `scripts/testInformationFlow.mjs` | Checks that important actions really update schedule, requests, time, events, reports, and team messages. |
| `scripts/testSavedDataRecovery.mjs` | Checks that broken or older saved prototype data does not make the app go blank. |
| `scripts/testVisualSafety.mjs` | Checks key screens and CSS guardrails for text overflow, bad display values, and missing containment rules. |
| `scripts/testSupabaseReadiness.mjs` | Checks Supabase migrations, secret boundaries, and production-readiness reminders before GitHub/Supabase work is trusted. |
| `scripts/testAppSizeAndSpeed.mjs` | Checks that test changes do not make the app bundle too large and slow. |
| `supabase/migrations/` | Database setup and security changes that Supabase reads from GitHub. |
| `SECURITY_RUNBOOK.md` | Human checklist for account security, bot protection, billing protection, and audit logging. |
| `CHANGE_SAFETY_ARCHITECTURE.md` | Plain-English plan for testing app changes before making them part of the main app. |
| `SAFE_PREVIEW_REFINEMENT_REPORT.md` | Summary of the ten-account safe-preview test pass, mistakes learned, and verification results. |

Some names must stay technical because tools expect them:

| File | Why it stays this way |
| --- | --- |
| `package.json` | App command list and installed packages. |
| `index.html` | Browser page that loads the app. |
| `vite.config.mjs` | Local app server setup. |
| `.env.example` | Safe example of settings needed later. |
