# File Guide

These are the main files you will usually care about.

Files that start with `check-` are safety checks. They do not change the app; they make sure the app still works after changes.

| File | Plain-English meaning |
| --- | --- |
| `src/AppStartsHere.jsx` | Starts the app in the browser. |
| `src/BlankScreenSafety.jsx` | Catches screen crashes so a broken test does not become a blank page. |
| `src/SafePreviewAccounts.js` | Ten local test accounts and flow checks used only in Safe Change Preview. |
| `src/RoleAccessRules.js` | Keeps the owner, manager, employee, and platform-admin section access rules in one clear place. |
| `src/FixSavedAppData.js` | Repairs broken or older saved prototype data before screens use it. |
| `src/AllWorkForceScreens.jsx` | The main WorkForce app screens, buttons, dashboards, and workflows. |
| `src/DashboardNextSteps.jsx` | Shared top-of-dashboard action path so manager and employee home screens show the next safe workflows clearly. |
| `src/AppVisualDesign.css` | The app's colors, spacing, sizing, layout, and visual design. |
| `src/lib/DatabaseConnection.js` | Connects the app to Supabase when the project keys are added. |
| `server/PlatformAdminReviewService.mjs` | Runs the protected admin review service for app checks and command review. |
| `scripts/check-admin-review-service.mjs` | Checks that the admin review service starts and responds correctly. |
| `scripts/check-command-production-boundary.mjs` | Checks that command review stays disabled or token-protected in production mode. |
| `scripts/check-home-buttons.mjs` | Checks that owner, manager, employee, and signed-out home buttons still work. |
| `scripts/check-safe-preview.mjs` | Checks that Safe Change Preview works without exposing the wrong role controls. |
| `scripts/check-preview-accounts.mjs` | Checks the ten Safe Preview accounts and their role boundaries. |
| `scripts/check-account-access-flow.mjs` | Checks signed-out account access, linked preview-account URLs, and manager employee-only invite limits. |
| `scripts/check-clickable-actions.mjs` | Checks that visible buttons and dropdowns have a real action or intentional disabled state. |
| `scripts/check-architecture-boundaries.mjs` | Checks that role rules, saved-data repair, test accounts, crash recovery, and admin service stay separated. |
| `scripts/check-dashboard-layout.mjs` | Checks the owner and manager dashboard format does not go back to cramped cards. |
| `scripts/check-all-role-sections.mjs` | Opens every owner, manager, employee, signed-out, and platform-admin section in Safe Preview. |
| `scripts/check-information-flow.mjs` | Checks that important actions really update schedule, requests, time, events, reports, and team messages. |
| `scripts/check-saved-data-recovery.mjs` | Checks that broken or older saved prototype data does not make the app go blank. |
| `scripts/check-visual-safety.mjs` | Checks key screens and CSS guardrails for text overflow, bad display values, and missing containment rules. |
| `scripts/check-supabase-readiness.mjs` | Checks Supabase migrations, secret boundaries, and production-readiness reminders before GitHub/Supabase work is trusted. |
| `scripts/check-app-size-and-speed.mjs` | Checks that test changes do not make the app bundle too large and slow. |
| `supabase/migrations/` | Database setup and security changes that Supabase reads from GitHub. |
| `SECURITY_RUNBOOK.md` | Human checklist for account security, bot protection, billing protection, and audit logging. |
| `ARCHITECTURE_MAP.md` | Plain-English map of how the app is separated so it can keep scaling safely. |
| `BROWSER_QA_REPORT.md` | Plain-English browser QA results with screenshots for the main role-safe screens. |
| `CHANGE_SAFETY_ARCHITECTURE.md` | Plain-English plan for testing app changes before making them part of the main app. |
| `FILE_GUIDE.md` | Plain-English list of the important code and support files. |
| `SAFE_PREVIEW_REFINEMENT_REPORT.md` | Summary of the ten-account safe-preview test pass, mistakes learned, and verification results. |

Some names must stay technical because tools expect them:

| File | Why it stays this way |
| --- | --- |
| `package.json` | App command list and installed packages. |
| `index.html` | Browser page that loads the app. |
| `vite.config.mjs` | Local app server setup. |
| `.env.example` | Safe example of settings needed later. |
