# WorkForce Security Runbook

This app is still moving from prototype data to Supabase-backed production data. Treat browser role switching and localStorage as demo-only until each workflow is migrated and tested against Supabase Row Level Security.

## Immediate Supabase Checks

- Security Advisor should show zero errors and zero warnings after the hardening migration runs.
- Authentication should stay invite-only for the first production version.
- Anonymous sign-ins and SMS auth should stay disabled for v1.
- Email verification should stay enabled.
- CAPTCHA or Turnstile should be enabled for signup, password reset, magic link, and invite activation flows.

## Abuse And Bill Protection

- Keep Supabase spend cap enabled when available, and add usage alerts for auth emails, MAU, storage, realtime, functions, logs, and egress.
- Do not enable public file uploads until storage bucket policies are written and tested.
- Do not deploy the command review service publicly unless `COMMAND_SERVICE_ENABLED=true`, `COMMAND_ADMIN_TOKEN` is set to a long random value, and the deployment is behind platform-admin auth.
- Keep OpenAI keys, Supabase service-role keys, database passwords, and webhook secrets out of GitHub and frontend environment variables.

## Role Boundaries

- Owners manage billing, workspace deletion, role assignment, pay authority, and business security settings.
- Managers manage daily operations: schedule, requests, time review, guide help, and team handoff.
- Employees manage only their own schedule, requests, time clock, guide tasks, and messages.
- Role boundaries must be enforced by Supabase RLS or server-side checks, not URL parameters or client state.

## Audit Trail

Record these actions in `audit_log` before production launch:

- Invite created, accepted, canceled, expired, or blocked.
- Role, status, and pay-rate changes.
- Schedule publishing, shift creation, open-shift claims, and coverage assignments.
- Time approvals, corrections, owner reviews, and clock edits.
- Event creation, edits, staff assignment, deletion, and restore.
- Billing, seat, invoice-contact, security, and workspace-delete requests.
