# Prototype Instructions

Run the local server yourself and open the preview in the in-app browser. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

User proportion preference: match the provided dashboard screenshot proportions: approximately 1487 x 1058, a narrow 176px left rail, compact top controls, six KPI cards across, and schedule preview plus right focus panel. Do not force five lower dashboard cards into one row when their content becomes functional; owner lower cards must keep professional readable widths, use a wide Daily Operations card, and scroll long content inside each card instead of squeezing text.

Time Clock v1.1 direction: keep the employee punch flow simple with button/PIN, location-ish verification, start/end lunch, and an "I'm almost there" note. Auto-flag forgotten clock-outs for manager review. Managers should approve or request employee correction, not freely rewrite time; owner views should surface labor cost, overtime risk, missed punches, and on-site staff first.

Business setup rule: the app must support small businesses with no manager and/or only one location. If no manager is assigned, the owner receives manager operations inside the owner section. If the business has one location, hide multi-location controls and filter schedules, requests, events, and time review to the primary location.

Payroll tracking rule: owner and manager time-review screens should show hourly rate, tracked hours, and estimated pay for working employees. Keep it lightweight for now: editable hourly rate in the review row, calculated labor cost summaries, and no full payroll/tax workflow yet.

Command Review rule: keep Command Review as a platform/admin tool, not a customer owner feature. Real agent reviews run through the local command service with PM, Designer, and Engineer lanes. Safe fixes are patch proposals only; the app must not directly mutate source files from the UI.

Command production boundary rule: keep `npm run command-boundary:smoke` passing when changing `server/PlatformAdminReviewService.mjs`, Vite proxying, command review UI, or environment configuration. Production mode must leave command endpoints disabled unless `COMMAND_SERVICE_ENABLED=true`, require `COMMAND_ADMIN_TOKEN` for non-health endpoints, block disallowed origins, and still keep fixes as proposals rather than direct source mutation.

Supabase connection rule: Supabase project configuration, migrations, and public anon-key placeholders may live in GitHub, but real `.env` files, service-role keys, database passwords, and access tokens must never be committed. Treat Supabase as the production data target only after each prototype localStorage workflow is intentionally migrated and role-tested.

Security hardening rule: production authority must come from Supabase RLS or server-side checks, not URL role parameters or localStorage. Keep v1 invite-only, disable anonymous and SMS auth, require CAPTCHA/Turnstile on public account flows, protect command/AI routes behind platform-admin auth, and record sensitive role, pay, schedule, time, event, billing, and delete actions in an audit trail.

Signed-out rule: when a user signs out, do not show Owner, Manager, or Employee role choices. Show a neutral signed-out state only. Role switching is a prototype preview control inside the app, not part of the signed-out screen.

Role account settings rule: every signed-in role needs a normal account menu with sign out. Owner settings may include business, billing, seats, danger zone, and workspace-wide security. Manager settings may include manager profile, notifications, and account security only; they must never expose owner billing, reports, events, workspace delete, or platform-admin tools. Employee settings may include employee profile, notifications, and account security only; they must never expose manager approvals, owner controls, billing, reports, events, invites, or platform-admin tools.

Manager employee-section rule: managers may access employee-section routes such as My Dashboard, My Schedule, Open Shifts, My Time Clock, My Requests, and My Guide, but those pages must render with employee-safe behavior. Manager operations like time exceptions, team request approvals, owner reports, events, billing, and workspace settings must stay out of employee-section pages.

Home dashboard rule: every visible dashboard action should connect to a real workflow, modal, filtered view, or chat thread. Dashboard communication actions should update the team communication system, not only update a standalone card.

Information-flow testing rule: broad workflow changes should prove that important actions mutate the correct local state, not only that screens render. Keep smoke coverage for dashboard handoff, coverage team requests, request decisions, time corrections and audit records, report snapshots and report sharing, future open shifts, event edit/delete history, manager-created employee invites, and employee near-work notes.

Role access architecture rule: keep role section authority in `src/RoleAccessRules.js` instead of scattering permission lists across screen components. Main screens may define visual navigation labels and icons, but the allowed section IDs, safe fallbacks, and manager-as-employee runtime behavior should stay in the shared rule file so authority does not drift as the app grows.

Saved-data recovery rule: broad changes that touch app state, storage keys, seed data, or normalization must keep `npm run saved-data:smoke` passing. The app should recover from corrupt, partial, or older local prototype data by rendering owner, manager, employee, and Safe Change Preview screens instead of going blank, and safe-preview renders must not mutate the main saved-data key.

State recovery architecture rule: keep generic saved-data repair behavior in `src/FixSavedAppData.js` rather than embedding every array/object fallback inside the main screen file. Main screens may add app-specific seed behavior after repair, but corrupt or older state must first pass through the shared recovery rules.

Visual safety testing rule: broad layout, copy, dashboard, schedule, team, settings, events, time, or employee-screen changes must keep `npm run visual-safety:smoke` passing. The smoke check should render representative owner, manager, employee, signed-out, and platform-admin screens, block visible `undefined`, `NaN`, `[object Object]`, and long unbroken labels, and verify CSS still contains the containment rules that prevent words and controls from spilling outside their cards.

Clickable action testing rule: visible buttons and dropdowns should not be decorative unless they are intentionally disabled. Keep `npm run clickable-actions:smoke` passing after workflow, chat, settings, schedule, dashboard, or form changes so controls that look clickable either run a real action, submit a form, open a focused workflow, or clearly stay disabled.

Supabase readiness rule: any GitHub/Supabase-facing change must keep `npm run supabase-readiness:smoke` passing. The check should prove real `.env` files are not tracked, frontend code uses only public Supabase anon variables, migrations keep RLS/audit/invite/soft-delete hardening visible, and docs still state the app is a prototype until Supabase RLS-backed workflows are migrated and tested.

Owner and manager dashboard cleanup rule: owner and manager dashboards are daily operations surfaces, not billing, admin, or AI-agent review surfaces. Keep owner home focused on schedule health, gaps, requests, time risk, team handoff, events, and guide work; keep billing and workspace administration in Settings. Keep manager home focused on schedule, requests, time, guide, and team handoff only. Real Agents SDK / Command Review work stays platform-admin-only.

Owner home business-health rule: the Business Health lower card must follow the selected workspace date. Location rows should count only shifts for that date, open schedule/report destinations with that date context, and include a compact brief action that posts the selected location/date summary into Manager Handoff.

Owner home manager-duty rule: the Managers on Duty lower card must follow the selected workspace date. Location rows should derive the visible lead from that date's Manager or Lead shifts, show Need lead or No plan when no scheduled lead exists, open the dated schedule builder with location context, and include a compact brief action that posts the selected location/date manager-duty summary into Manager Handoff.

Location format rule: WorkForce is communication and organization software for many business types, so location should mean any typed work area, team, client site, route, project, or branch. Do not lock users into a short preset list like downtown/airport/uptown; saved locations can be suggestions, but users need typed custom values.

Schedule planning rule: scheduling must support selected dates plus today, tomorrow, next week, week, next month, month, and custom date-range planning. Future dates should show their own shifts, empty-state actions, range preparation, and template-building controls instead of silently reusing only today's schedule. Day view uses the time board; week, month, and custom views must use a date-range board so each day stays distinct. The schedule planner should expose a clear planning horizon map so users understand whether they are editing a day, tomorrow, a week, a month, or a custom range.

Schedule board controls rule: schedule planning should not stack every control down the page. Keep the primary board focused, and put work area, day/week/month/custom range switching, selected date controls, role filter, and compact range summary inside the Schedule Board toolbar instead of a separate strip above the board. Planning detail, day setup, and longer range actions should stay in focused panels or drawers so long detail areas scroll inside their panel instead of stretching the whole screen.

Schedule manage menu rule: owner and manager schedule should open on the clean time/location board first. Board view filters and advanced tools live behind one Manage Schedule button, not a split button or three-dot control. The menu includes All, Gaps, Managers, Day Builder, Calendar, Plan Schedule, Add Shift, Add Open Shift, and Fill Missing Person. Calendar is a temporary panel with large clean day boxes and short status labels only; clicking a day opens the day schedule builder for that date. Employees must keep a simpler personal schedule/calendar and never receive planning, fill-person, or manager approval tools.

Schedule date-scope rule: schedule manager tools, handoff actions, shift inspector, request counts, and time-risk shortcuts must use the active schedule day or date range. Today-only time entries must not appear as tomorrow, week, month, or custom-range blockers unless they have a matching entry date.

Schedule day setup rule: the schedule planner should let owner/manager users customize the selected date with demand level, staffing target, lead role, business hours, required roles, role needs, arrival window, labor budget, repeat pattern, publish rule, break plan, lock time, time-block granularity, coverage goal, swap rule, and manager notes. Saving must persist to that date plan, applying setup to a range must copy those rules into the active week, month, or custom date range, sharing must post the setup into team handoff communication, and copying a schedule template must carry the setup rules along with the shift blocks.

Schedule time-window rule: the visible day schedule board must use the selected date's saved business hours and time-block setup instead of a fixed 6 AM to 10 PM grid. If a shift starts earlier or ends later than the saved setup, the board should expand enough to keep every shift visible inside the timeline.

Schedule planning detail rule: week, month, and custom scheduling must include a compact planning detail map. Each visible date should show its saved setup status, operating window, staffing target, blockers, setup detail, and next action inside a scrollable area so long ranges do not stretch the whole page.

Schedule range action rule: schedule planning controls must explain the active planning mode and keep quick actions scoped to that day, week, month, or custom range. Filling gaps, preparing days, filling empty days, and posting handoffs must use only the active schedule date range, and range handoffs should summarize shifts, open gaps, pending shifts, hours, saved setups, and next action in Manager Handoff.

Dashboard schedule preview rule: the owner home preview must use real dated schedule data for day, week, and month views. Do not show synthetic weekly or monthly counts that are disconnected from shift dates.

Dashboard date-planning rule: when the owner changes the workspace date, preserve it in the URL and carry that selected day into dashboard schedule, event, request, and report actions. Future-date planning cards must count only shifts for the selected date, not today's gaps.

Reports rule: dashboard report actions must land in a report builder that can generate saved snapshots by type, date range, location/work area, and audience. Generated reports must update report history, and report sharing must post a concise summary into Manager Handoff communication.

Owner home date rule: owner dashboard KPIs, focus headings, and command queue coverage rows must reflect the selected workspace date. Do not label a future-date dashboard as Today or count today's open shifts when the date picker is on tomorrow or another date.

Owner home no-plan rule: when the selected workspace date has no shifts, owner home should say the date is not planned and open the schedule builder for that date. Do not fall back to an open shift from another day in readiness, recommendations, notifications, handoff briefs, or risk briefs.

Owner home readiness rule: readiness indicators must be functional and open the responsible workflow or chat thread with context. Coverage should open Schedule, requests should open Requests, time should open Time Review, events should open Events, guide should open Guide, and handoff should open Manager Handoff.

Owner command queue rule: Daily Command Queue rows on owner home should do more than navigate. Each active row should expose a compact safe quick action such as asking the team for coverage, approving a visible request, requesting a time correction, posting an event reminder, sending a guide tip, or publishing a covered schedule. Quick actions must update the underlying app state, team communication, announcement, or report log.

Owner command follow-up rule: the owner Daily Command Queue must also show a compact follow-up plan and proof trail so owners can see who owns the next blockers, when they are due, and where handoff, coverage, and risk evidence lives. Follow-up actions must open only owner-safe workflows.

Owner home date-scope rule: owner KPI cards, focus queue, readiness, recommendations, notifications, command queue, handoffs, event prompts, and risk briefs must scope requests, coverage gaps, events, and time flags to the selected workspace date. Legacy time entries without a date are Today only and must not appear as future-day blockers.

Owner decision brief rule: owner home should include a compact dated decision brief that summarizes coverage, requests, time risk, events, proof status, and the current priority. It must save a real report snapshot, open the dated report builder, and share a concise brief into Manager Handoff without exposing manager or employee-only tools.

Manager home date rule: manager and owner-manager dashboards must use the selected workspace date for coverage metrics, board rows, coverage asks, and prep actions. If that date has no shifts, show a build-schedule state and route actions to the dated schedule builder instead of posting a coverage ask.

Manager home request/time rule: manager dashboard approvals and live clock status must reflect the selected workspace date. Future dates should show schedule review state rather than live punch state, and manager coverage messages must include the selected date plus the visible shift context.

Manager home follow-up rule: manager and owner-manager dashboards must show a compact follow-up plan and proof trail for the selected date. Follow-up actions may open schedule, requests, time, guide support, and manager-safe team channels only; they must never expose owner billing, reports, events, or settings to managers.

Manager handoff digest rule: manager and owner-manager home must include a compact handoff digest for the selected date. It should summarize coverage, requests, time risk, guide focus, and proof anchors, then provide safe quick actions to send a Manager Handoff digest, ask Coverage Team, open schedule when needed, and post a guide coaching tip. Manager digest actions must stay within manager-safe workflows and team channels.

Manager team pulse rule: manager and owner-manager home should include a compact dated Team Pulse that turns the visible schedule, requests, time flags, and guide focus into a real communication action. Posting the pulse must write into Manager Handoff, coverage asks must go to Coverage Team only when a visible open shift exists, guide coaching must go to Training Questions, and manager-role targets must never expose owner billing, reports, events, settings, or platform-admin tools.

Employee home date rule: employee home must use the selected workspace date for assigned shifts, open-shift alerts, header chat/alert actions, bottom tab navigation, and open-shift destinations. Future or non-today dates may open Time Clock for review, but must not mutate punch state or show a live Clock In action.

Employee home readiness rule: employee home should include a compact shift-readiness panel for the selected date. Readiness actions may open only employee-safe destinations: personal schedule, employee time clock, employee requests, employee guide, open shifts, and employee messages. Future dates must show review-only clock guidance and never expose manager approvals, owner reports, billing, settings, or invite controls.

Employee action-center rule: employee notification actions must stay employee-only and selected-date aware. Open-shift and request alerts should not mix Today with a future selected date, and future time-clock actions should open review-only punch guidance.

Notification Action Center rule: the topbar bell should show role-appropriate operational actions plus compact quick commands tied to the selected workspace date and active location. Owners may see requests, schedule gaps, time flags, event staffing, guide work, billing, handoff, risk brief, and reports. Managers may see manager-safe requests, schedule, time, guide work, and handoff. Employees may see only their own shifts, clock, requests, and guide items; future dates may open review-only clock context but must not expose live punch actions.

Communication map rule: owner and manager home communication maps must be command surfaces, not just chat links. Each visible channel should open the thread and provide one safe quick command that posts the right message to Manager Handoff, Coverage Team, or Training Questions with the correct role sender.

Owner guide snapshot rule: the owner home Guide Completion card must follow the selected workspace date and location, show the guide that needs the most attention, open that guide with context, and post a compact Coach Tip into Training Questions instead of acting like a passive progress widget.

Owner announcement snapshot rule: the owner home Latest Announcement card must follow the selected workspace date and location, allow a new post, open Team Announcements, and share a compact dated update into the announcement thread. It should not be only a static preview.

Change safety architecture rule: when planning a risky UI or workflow change, test it in Safe Change Preview first by using `preview=safe-change`. Preview state must use the separate safe-preview storage key and must not overwrite the normal prototype state. Keep the Safe Change Guard around the app entrance so screen crashes show a recovery state instead of a blank page. Before treating a change as accepted, run `npm run safe-change:check` and keep owner, manager, employee, signed-out, and platform-admin boundaries passing.

Safe preview visual refinement rule: broad dashboard, layout, spacing, density, or workflow-format experiments should be scoped under `safe-change-preview-mode` first. Do not silently apply experimental visual changes to the normal app until the user has reviewed the preview and accepted the direction.

Safe preview account testing rule: broad account, invite, and role-boundary experiments should use the ten local Safe Preview test accounts before creating real Supabase Auth users. Owners may see all preview account links, managers may see manager and employee test paths only, and employees may see employee-only test paths. Real Supabase account creation should be a later production-auth pass with explicit user approval.

Account access testing rule: account, invite, sign-in, sign-up, use-code, forgot-password, or role-link changes must keep `npm run account-access:smoke` passing. Signed-out screens must stay neutral without owner/manager/employee role buttons, all ten Safe Preview accounts must keep valid linked URLs, invite records must match the preview accounts, and manager-created invites must stay employee-only.

Plain file naming rule: new app, server, and safety-check files should use plain purpose names that Felix can understand without coding experience. Prefer names like `AllWorkForceScreens`, `AppVisualDesign`, `RoleAccessRules`, and `check-home-buttons` over hidden abbreviations or generic developer shorthand, and keep `FILE_GUIDE.md` updated when files are added or renamed.

Architecture boundary rule: keep `npm run architecture-boundaries:smoke` passing when moving app code, adding new screens, or changing startup, role access, saved-data recovery, safe-preview accounts, Supabase setup, crash recovery, or command review service code. New large rule sets should be extracted into purpose-named files and listed in `ARCHITECTURE_MAP.md` and `FILE_GUIDE.md` instead of making `src/AllWorkForceScreens.jsx` absorb every responsibility.

Dashboard first-use clarity rule: do not add a separate tutorial page for normal owner, manager, or employee work. Reduce confusion by adding compact role-safe action paths near the top of home screens, using real workflow buttons and dated context. Manager paths must stay manager-safe; employee paths must stay employee-only.

Dashboard metric readability rule: KPI and metric cards must keep text in a real content column. If a card has no icon, do not reserve an empty icon column; use a no-icon layout so labels, numbers, and details stay readable instead of squeezing into a tiny strip.

Safe change performance rule: safe-preview changes must keep the app under the current performance budget. Run `npm run safe-change:check` after broad UI work; it includes build, route smoke tests, account role tests, command-service checks, and bundle-size budget checks so new experiments do not add avoidable lag.
