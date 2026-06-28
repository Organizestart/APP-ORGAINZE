# WorkForce System Improvement Plan

## North Star

Build WorkForce into a communication and organization command center for small businesses: owners see what needs action, managers coordinate daily operations, and employees get simple instructions, schedules, requests, and chat without admin clutter.

## Current Product Rule

The home dashboard must stay action-first. If a card, button, or metric is visible, it should open the right work area, create/update a record, or connect to a chat thread. No decorative controls.

## Implemented Command Tools

1. Dashboard Handoff
   - Owner can send the current dashboard state into Manager Handoff.
   - The brief includes open shifts, pending requests, time flags, next action, and latest announcement.
   - After sending, the app opens the Manager Handoff chat so the owner can keep coordinating.

2. Dashboard Risk Brief
   - Owner can generate a risk summary from the home page.
   - The brief posts to Manager Handoff with coverage gaps, pending requests, time flags, highest-risk shift, and flagged labor cost.

3. Dashboard Guide Tip
   - Owner can generate a guide recommendation from the home page.
   - The tip posts to Training Questions and points the team at the lowest-completion relevant guide card.

4. Dashboard Event Summary
   - Owner can summarize event staffing needs from the home page.
   - The summary posts to Manager Handoff with open staffing gaps and the next event deadline.

5. Daily Command Queue
   - Owner home now turns coverage gaps, pending requests, time flags, event staffing gaps, and guide gaps into direct decisions.
   - Each queue item opens the correct workspace, scopes the location when needed, and carries a short context strip into the destination.
   - The latest command trace stays visible as a small log link without making the home page feel like an admin tool.
   - Daily Readiness now gives the owner a compact schedule-aware score for coverage, requests, time, events, guide, and Manager Handoff, and every item opens the responsible workflow.

6. Owner Recommendation Draft
   - Today Focus now shows one suggested next move based on live dashboard data.
   - The owner can open the related workspace with context or approve the suggestion into Manager Handoff.
   - Approval posts a coordination plan only; schedule, request, and time records still use their normal approval flows.

7. Role-Safe Home Actions
   - Manager home metrics now open Schedule, Requests, Time, and Guide with a clear context strip.
   - Manager home coverage asks post to the team, and prep actions target the visible gap instead of another location.
   - Manager and owner-manager home now use the selected workspace date for coverage metrics, board rows, coverage asks, and prep actions. Unplanned future dates route managers into the dated schedule builder instead of posting a false coverage ask.
   - Employee Today now performs the correct punch action from the home screen and opens the time clock result.
   - Employee shift alerts open the shift request flow directly, and visible role switching was removed from the app shell.

## Next Design Systems To Improve

1. Command Home
   - A daily action queue that groups coverage, requests, time flags, announcements, and guide gaps.
   - Each item should have one clear next action and one destination.
   - Keep the compact command tool row for generated handoff, risk brief, guide suggestion, and event staffing summary.
   - Done for owner home: Command Activity is now an owner-facing Daily Command Queue with direct workspace actions.
   - Done for owner lower cards: guide progress rows open the exact guide, manager rows open Manager Handoff with location context, and Latest Announcement has a real Post action.
   - Done for manager home: metrics and action rows open, update, or communicate without owner billing controls.
   - Done for manager home focus: schedule routes select the open shift, guide routes select the weak guide, and coverage asks open Coverage Team after posting.
   - Done for employee home: punch, shift alerts, requests, chat, and guide actions stay employee-safe.
   - Done for employee home focus: open-shift and guide actions carry the exact shift or guide into the employee-only destination screen.

2. Communication Hub
   - Team Announcements for official updates.
   - Coverage Team for shift help and staffing offers.
   - Manager Handoff for operational notes.
   - Direct Chats for employee/manager conversations.
   - Messages posted by leadership in Team Announcements create official announcement records and update the owner dashboard.
   - Coverage Team now has quick actions for open gaps, coverage asks, and request review.
   - Manager Handoff now has quick actions for sending a brief, reviewing time, and opening requests.
   - Coverage Team and Manager Handoff quick actions now respect the active location and selected date.
   - Employees keep an employee-safe inbox view without invite controls or leadership posting tools.
   - Leadership chats now support pinning, read/unread state, and a compact More menu for related work and search.
   - Employee inbox tabs now filter Team, Alerts, and Direct messages instead of acting like static labels.

3. Invite And Account Flow
   - Owner/manager creates invite code.
   - New user activates account with code, email, password, and verification.
   - Signed-out screen stays neutral and does not expose role choices.
   - The signed-in shell now shows a current-role account badge instead of cross-role preview buttons.
   - Signed-out now opens a full account access page with login, sign-up, email-code sign-in, and forgot-password states.
   - Done for Safe Preview: the app now has a ten-account local test lab with 1 owner, 3 managers, and 6 employees. Each account opens the correct role-safe screen before real Supabase Auth users are created.
   - Done for Safe Preview checks: account-flow smoke tests verify managers do not receive owner-only surfaces and employees do not receive manager, invite, billing, report, event, or platform-admin controls.

4. Organization Tools
   - Schedule assistant for gaps, open shifts, and likely coverage candidates.
   - Schedule now supports today, tomorrow, week, and month planning with dated shifts, range summaries, role filtering, and a copy-from-today template action.
   - Schedule now shows explicit planning presets for Today, Tomorrow, Next 7 days, and Month while still allowing a typed custom date.
   - Week and month schedule views now use a date-range board with one card per day, scroll contained inside the board, and an Open Day action for drilling back into the daily time board.
   - Workspace dates now persist in the URL, and the dashboard future-date brief opens schedule, event, request, and report workflows with the selected day preserved.
   - Owner home KPIs, focus titles, and the Daily Command Queue now use the selected date instead of showing today's coverage under a future date.
   - Owner home readiness, suggested next move, notifications, handoff, and risk briefs now treat a selected date with no shifts as an unplanned schedule instead of pulling in open shifts from another date.
   - Employee home now uses the selected date for assigned shifts and open-shift alerts, and future dates open Time Clock without mutating live punch state.
   - Dashboard schedule preview now uses the same dated shift system for day, week, and month views instead of placeholder weekly counts.
   - Topbar notifications now act as a role-aware Action Center for requests, schedule gaps, time flags, event staffing, guide work, billing, and employee shift/clock items.
   - Event staffing board for signups and assigned support.
   - Guide helper that recommends the right checklist based on role, location, and shift.
   - Time review queue for missed punches, late starts, lunch issues, and hourly-rate cost visibility.
   - Locations now work as typed custom work areas, teams, routes, client sites, projects, or branches instead of only preset demo locations.
   - Dashboard clicks carry a short context strip into Schedule, Requests, Guide, and Time so users know why that workspace opened.
   - Event Summary opens the event board with staffing context after posting to Manager Handoff.
   - Report drilldowns show coverage, request, labor, and event-staffing summaries before exports.
   - Guide now turns unclear or weak cards into Training Questions messages so employees, managers, and owners can improve instructions through the communication hub.
   - Dashboard Guide actions now carry the exact weak card into the Guide workspace instead of opening the library generically.
   - Dashboard Event actions now carry the exact staffing gap into Events, highlight the event, and offer Manage Staff, Post Reminder, and Edit from a focused panel.
   - Reports now open with a focused insight panel from dashboard routes, and report summary cards drill into Schedule, Requests, Time, or Events.
   - Time review now opens with the relevant employee selected from dashboard metrics, reports, schedule tools, shift inspector, schedule handoff, and Manager Handoff chat actions.

5. Agent-Assisted Tools
   - Keep Command Review internal to platform/admin for now.
   - Later, add a customer-facing Operations Copilot only after the main workflows are stable.
   - First useful agent jobs: summarize today, detect coverage risk, draft announcements, prepare manager handoff, recommend guide updates, and summarize event staffing needs.
   - Done for the owner prototype: Today Focus can draft one next move and requires owner approval before posting it to Manager Handoff.
   - Done for platform command review: deterministic checks now audit dashboard action wiring for owner, manager, and employee home screens even when the AI agent key is unavailable.
   - Done for command smoke: the local smoke check now proves the dashboard action audit is returned and passing, not just that the command service is online.
   - Done for command review evidence: test results now show concise proof lines in the app, and the dashboard audit also checks shared home controls like metric cards, action rows, command tool buttons, timeline shifts, and guide rows.
   - Done for rendered home smoke: command smoke now renders Owner, Manager, Employee, and Signed-out home screens and verifies expected controls plus role restrictions.
   - Done for home route contracts: rendered smoke checks now verify the destination sections behind owner, manager, and employee home action families.
   - Done for command test integration: Command Review deterministic tests now run the rendered home-route smoke and report screen, route, and control coverage.
   - Done for Daily Command Queue detail: owner home queue rows now show who owns the item, when it is due, and which workflow the action opens.
   - Done for owner home action contracts: key owner dashboard controls now declare their destination targets, and the home smoke test verifies 13 targets across schedule, requests, time, guide, billing, team, events, reports, and modals.
   - Done for role-safe home action contracts: manager home now verifies 5 manager-safe targets, employee home verifies 7 employee-safe targets, and the smoke test blocks owner-only destinations from lower-authority home screens.
   - Done for full home target allowlists: the smoke test now extracts every rendered home action target and validates all owner, manager, employee, and signed-out targets against role-safe allowlists.
   - Done for home target resolution: each unique rendered home action target now resolves to a real route or modal implementation; current coverage resolves 14 owner, 5 manager, and 7 employee targets.
   - Done for safe-change gate: `npm run safe-change:check` now covers build, performance budget, home action wiring, command service checks, Safe Preview rendering, and ten-account role-boundary flows.

## Near-Term Build Sequence

1. Finish owner dashboard function checks.
2. Tighten Team chat and announcement behavior.
   - Done for Team Announcements: official channel posts now update dashboard announcements.
   - Done for Coverage Team and Manager Handoff: leadership channels now carry operational quick actions.
   - Done for scoped context: channel actions respect active location and selected date.
   - Done for owner Communication Map: owner home now has a compact operating-channel map for Manager Handoff, Coverage Team, and Training Questions with direct chat actions.
   - Done for manager Communication Map: manager home now has the same operating-channel map using manager-safe team targets for handoff, coverage, and training questions.
3. Make schedule/event/time actions feel connected from dashboard to detail view.
   - Done for dashboard cards: Schedule, Requests, Guide, and Time show the selected dashboard context at the top.
   - Done for event staffing and report drilldowns.
4. Expand Command Activity into a daily command queue that can become the main home experience.
   - Done: the dashboard now has a location-aware Daily Command Queue with direct owner decisions.
5. Add agent-assisted recommendations behind clear owner approval, not automatic changes.
   - Done for first pass: owner recommendations are approval-based and do not directly edit schedules, requests, or time entries.
6. Next: make manager and employee home actions match the same standard: visible controls must open, update, or communicate clearly.
   - Done: manager and employee home actions now meet the same open/update/communicate standard.
   - Done: manager and employee home actions now carry selected item context into Schedule, Guide, Team, and Open Shifts.
7. Next: audit the detail workspaces for remaining visible controls that do not update state, open a focused destination, or communicate to the team.
   - Done for Team detail pass: leadership Pin/More controls and employee inbox tabs/search/alerts now perform visible actions.
8. Next: continue the detail-workspace audit through Guide, Schedule, Events, Time, Reports, and Settings so every first-screen control has a real action.
   - Done for Guide detail pass: guide completion, step checks, manager questions, revision requests, and dashboard weak-card targeting now update state or open Training Questions.
9. Next: audit Schedule and Events for remaining controls that should create/update records or open the right communication thread.
   - Done for Schedule detail pass: selected coverage gaps carry from dashboard/queue into Schedule; offers, assignments, and team asks update shift/request/message records.
   - Done for Events detail pass: event gaps carry from dashboard/queue into Events; selected events can manage staff, edit details, or post an announcement plus Manager Handoff reminder.
   - Done for Reports detail pass: dashboard report routes carry report context, KPI cards change the selected report insight, and each insight opens the matching operational workspace.
   - Done for Time detail pass: labor/time actions now carry focused entry context, highlight the matching attendance and exception rows, and keep review buttons inside their panels.
   - Done for command audit coverage: Command Review tests now verify visible home/dashboard actions stay wired to real workflows, modals, focused destinations, or team threads.
   - Done for command audit readability: Command Review test rows now display the evidence behind the pass/fail result so dashboard wiring checks are easier to trust.
   - Done for rendered home coverage: `npm run home:smoke` verifies visible home controls for owner, manager, employee, and signed-out states without adding a heavy browser test dependency.
   - Done for rendered route coverage: `npm run home:smoke` also renders 18 destination routes from home actions and checks owner-only controls stay out of manager/employee routes.
   - Done for unified verification: `npm run command:smoke` now checks both dashboard source wiring and rendered route coverage through the command service test endpoint.
