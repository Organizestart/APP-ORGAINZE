# Change Safety Architecture

This app now has a safer way to test changes before treating them as part of the main system.

## What It Does

- **Safe Change Preview** opens the app as a test copy.
- Preview edits use a separate saved-data area, so normal prototype data is not overwritten.
- Preview includes a **Test Lab** with 10 local accounts: 1 owner, 3 managers, and 6 employees.
- Each test account has a direct role-safe link so owner, manager, and employee flows can be checked quickly.
- The app entrance has a **Safe Change Guard**. If a screen crashes, it shows a recovery screen instead of a blank page.
- A safety check command loads owner, manager, employee, signed-out, admin review, and safe preview screens before a change is accepted.

## How To Test A Change

1. Open the app normally for the main experience.
2. Add `preview=safe-change` to the URL when testing a new idea.

Example:

```text
http://127.0.0.1:5174/?preview=safe-change&role=owner&section=owner-dashboard
```

3. Use **Copy Main Data** if you want the preview to start from the current main prototype data.
4. Use **Reset Preview** if the test copy gets messy.
5. Use **Exit Preview** to return to the normal app.
6. Before keeping the change, run the safety check.

```text
npm run safe-change:check
```

## What The Safety Check Covers

- The app still builds.
- Owner home and key owner routes still load.
- Manager home and key manager routes still load.
- Employee home and key employee routes still load.
- Ten local preview accounts exist and render through the correct role-safe screen.
- The built app stays under the current performance budget so test changes do not quietly add lag.
- Signed-out state does not show Owner, Manager, or Employee role buttons.
- Admin command review stays platform-admin-only.
- Command review service is checked in production mode so command endpoints are disabled or token-protected.
- Safe Change Preview loads for owner, manager, and employee.
- Safe preview screens do not expose restricted owner or manager controls.
- Broken or older saved prototype data does not make owner, manager, employee, or Safe Change Preview screens go blank.
- Representative screens and CSS guardrails are checked for bad display values, long unbroken text, and missing containment rules.
- Supabase and GitHub-facing files are checked for migration hardening, secret boundaries, and prototype-vs-production warnings.

## Working Rules

- Test broad redesigns in Safe Change Preview first.
- Keep risky changes behind a preview or focused panel until the checks pass.
- Touch one workflow at a time when possible: dashboard, schedule, team, settings, time, events, guide, or reports.
- Do not let a preview-only idea become the normal screen until the safety check passes.
- Use local preview accounts before creating real Supabase Auth users.
- If a change crashes the app, use the recovery screen and fix it before continuing.

## Current Boundaries

This is a local prototype safety layer. It prevents prototype state clashes and catches app-screen errors, but production safety still needs backend permissions, Supabase RLS, rate limits, audit logs, and real deployment checks.
