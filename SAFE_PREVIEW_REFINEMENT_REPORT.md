# Safe Preview Refinement Report

## Current Status

The app now has a safer test layer for making changes before treating them as accepted main-app behavior. The work is still a local prototype, but it has stronger checks around role boundaries, visual format, information flow, saved-data recovery, performance, and Supabase readiness.

Current branch status:

- Local app work is clean after each committed pass.
- GitHub push from this terminal is still blocked by missing command-line GitHub credentials.
- GitHub Desktop can be used to push the local commits.

## What Was Tested

This pass stayed inside Safe Change Preview and did not create real Supabase users.

- Added a Safe Preview Test Lab.
- Added 10 local test accounts: 1 owner, 3 managers, and 6 employees.
- Linked each test account to the correct role-safe screen.
- Added account-flow smoke tests.
- Added a performance budget check so broad changes do not quietly add lag.
- Added full role-section smoke tests for owner, manager, employee, signed-out, and platform-admin screens.
- Added information-flow tests for dashboard handoff, coverage asks, request decisions, time correction, reports, events, invites, and employee near-work notes.
- Added saved-data recovery tests so broken or older local prototype data does not blank the app.
- Added visual-safety tests for representative screens, bad display values, long labels, and CSS containment guardrails.
- Added Supabase readiness tests for migration hardening, secret boundaries, and prototype-vs-production warnings.
- Updated project rules, architecture notes, and file guide.
- Created a reusable Codex skill: `workforce-safe-preview-refinement`.

## Architecture Added

These files were added or separated so the app can scale without putting every rule into one giant screen file:

- `src/RoleAccessRules.js`: owns allowed sections, safe fallbacks, and manager-as-employee behavior.
- `src/StateRecoveryRules.js`: repairs broken or older saved prototype data before screens use it.
- `scripts/testInformationFlow.mjs`: proves important actions update the right local state.
- `scripts/testSavedDataRecovery.mjs`: proves corrupt saved data does not make the app blank.
- `scripts/testVisualSafety.mjs`: checks representative screens and CSS containment rules.
- `scripts/testSupabaseReadiness.mjs`: checks Supabase migrations, secrets, and production-readiness boundaries.

## Role Coverage

- Owner: owner dashboards, reports, settings, billing, roles, events, manager fallback, and daily operations render through owner-safe paths.
- Manager: schedule, requests, time review, guide, team handoff, and employee-safe pages render without owner billing, reports, events, workspace delete, owner settings, or platform-admin controls.
- Employee: personal dashboard, schedule, open shifts, time clock, requests, messages, guide, and settings render without manager approvals, invites, billing, reports, events, or platform-admin controls.
- Platform Admin: Command Review stays separate from customer owner, manager, and employee dashboards.
- Signed out: shows normal sign-in, sign-up, email, and forgot-password actions without Owner, Manager, or Employee role-choice buttons.

## Mistakes Learned From Previous Fixes

- Text cannot overflow cards or buttons.
- Action menus must stay inside their section.
- Long content should scroll inside its own panel instead of stretching the whole page.
- Owner, manager, and employee authority must never cross over.
- Employees should not see invite controls, manager approvals, billing, reports, or platform admin tools.
- Managers should not see owner billing, workspace delete, owner reports, owner settings, events, or platform admin tools.
- The schedule area should stay clean and board-first, with advanced tools behind focused controls.
- Team chat should be warm and professional, with chat-only behavior unless a channel has a real operations command.
- The app should be tested before main behavior changes.
- Browser URL role changes are prototype behavior only; production role authority must come from Supabase RLS or server-side checks.
- Saved local data can be old or broken, so the app must repair it before rendering screens.
- Visual checks must look for actual bad display values, not only code errors.

## Reflection

This task matches Felix's direction because it makes the app safer to refine without breaking the main prototype. It also gives future work a repeatable way to test owner, manager, and employee flows before visual or workflow changes are accepted.

The added architecture also matches Felix's direction because it makes future changes harder to break:

- Role rules are centralized.
- Saved-data recovery is centralized.
- Information-flow behavior is tested.
- Visual containment is tested.
- Supabase readiness is checked without claiming production is done.

The next refinement should still improve one workflow at a time:

1. Owner dashboard format and information density.
2. Manager dashboard daily operations flow.
3. Employee schedule/time-clock simplicity.
4. Team chat and invite flow.
5. Supabase migration from local preview data into real authenticated accounts.

## Remaining Gaps

These are not complete yet:

- Real Supabase Auth account creation is not wired into the app flow.
- Local preview accounts are not real users.
- Browser role switching is still prototype behavior.
- Payment and billing are still prototype UI, not real billing.
- Command Review real AI lanes require `OPENAI_API_KEY`; deterministic checks pass without it.
- Production launch still needs Supabase Security Advisor checked live, auth rate limits, CAPTCHA/Turnstile, spend controls, and deployed server-side authorization.
- GitHub push from the terminal is blocked until command-line credentials are configured or GitHub Desktop pushes the local commits.

## Verification

Passed:

- `npm run build`
- `npm run performance:budget`
- `npm run home:smoke`
- `npm run command:smoke`
- `npm run safe-change:smoke`
- `npm run preview-accounts:smoke`
- `npm run dashboard-layout:smoke`
- `npm run all-sections:smoke`
- `npm run information-flow:smoke`
- `npm run saved-data:smoke`
- `npm run visual-safety:smoke`
- `npm run supabase-readiness:smoke`
- `npm run safe-change:check`

The current `npm run safe-change:check` gate now covers:

- Build and performance budget.
- Home action and destination routing.
- Command service health and platform-admin separation.
- Safe Change Preview and ten linked accounts.
- Owner, manager, employee, signed-out, and platform-admin section rendering.
- Information-flow state updates.
- Saved-data recovery.
- Visual guardrails.
- Supabase readiness and secret boundaries.
