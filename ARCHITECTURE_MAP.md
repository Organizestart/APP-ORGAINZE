# Architecture Map

This is the plain-English map for how the prototype is organized so it can keep growing without turning into one fragile file.

## Main App Pieces

| Area | File | Job |
| --- | --- | --- |
| Browser start | `src/StartApp.jsx` | Opens the app, loads the design file, and wraps the app in the crash shield. |
| Crash shield | `src/CrashProtectionScreen.jsx` | Shows a recovery screen if a test screen crashes instead of leaving a blank page. |
| Main workspace | `src/WorkForceAppScreens.jsx` | Holds the visible owner, manager, employee, schedule, team, guide, time, events, and settings screens. |
| Design | `src/WorkForceScreenDesign.css` | Controls spacing, layout, colors, text sizing, scrolling, and card containment. |
| Role access | `src/RolePermissionRules.js` | Keeps owner, manager, employee, and platform-admin section access in one place. |
| Saved-data recovery | `src/SavedDataRepairRules.js` | Repairs broken or older local prototype data before the app renders. |
| Safe test accounts | `src/PreviewTestAccounts.js` | Holds the ten local test accounts, invite records, and role-safe preview links. |
| Dashboard action path | `src/DashboardActionPath.jsx` | Reusable role-safe action strip for home screens so users see the next workflow without a separate tutorial. |
| Supabase connection | `src/lib/SupabaseConnection.js` | Connects to Supabase only when public project keys are provided. |
| Admin review service | `server/AdminCommandReviewServer.mjs` | Runs the platform-admin-only command review checks and protected command endpoints. |

## Safety Checks

Safety checks live in `scripts/check-*.mjs`. They do not change the app. They prove that a change did not break the important boundaries.

Current checks cover:

- Build and bundle size.
- Home buttons and workflow destinations.
- Platform-admin command review separation.
- Production command endpoint protection.
- Safe Change Preview.
- Ten linked preview accounts.
- Signed-out account and invite-code behavior.
- Clickable buttons and dropdown wiring.
- Dashboard layout boundaries.
- Every owner, manager, employee, signed-out, and platform-admin section.
- Information flow state changes.
- Saved-data recovery.
- Visual overflow and bad display values.
- Supabase readiness and secret boundaries.
- Architecture boundaries.
- Manual browser QA evidence for role-safe screens when visual checks materially change.

## Scaling Rules

- Keep role authority in `src/RolePermissionRules.js`.
- Keep saved-data repair in `src/SavedDataRepairRules.js`.
- Keep ten-account preview data in `src/PreviewTestAccounts.js`.
- Keep reusable dashboard action paths in `src/DashboardActionPath.jsx`.
- Keep Supabase connection setup in `src/lib/SupabaseConnection.js`.
- Keep crash recovery in `src/CrashProtectionScreen.jsx`.
- Keep platform-admin command review in `server/AdminCommandReviewServer.mjs`.
- Keep new safety checks named `scripts/check-*.mjs` and list them in `FILE_GUIDE.md`.
- Keep `src/WorkForceAppScreens.jsx` focused on screens and workflow wiring. If it grows too much, extract the next stable rule set before adding more large screens.
