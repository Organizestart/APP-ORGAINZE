import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import express from "express";
import { Agent, run, setDefaultOpenAIKey, tool } from "@openai/agents";
import { z } from "zod";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");
const commandModel = process.env.OPENAI_MODEL || "gpt-5.5";
const defaultPort = Number(process.env.COMMAND_PORT || 8787);

let lastRun = null;
let activeServer = null;
let activeKeepAlive = null;

const issueSchema = z.object({
  id: z.string().optional(),
  lane: z.enum(["product", "design", "engineering"]),
  severity: z.enum(["critical", "high", "medium", "low"]),
  title: z.string(),
  evidence: z.string(),
  affectedArea: z.string(),
  recommendation: z.string(),
  safeFix: z.boolean(),
  status: z.enum(["open", "reviewed", "proposed"]).optional(),
});

const testSchema = z.object({
  name: z.string(),
  status: z.enum(["passed", "warning", "failed", "blocked"]),
  detail: z.string(),
  evidence: z.array(z.string()).default([]),
});

const reportSchema = z.object({
  runId: z.string().optional(),
  createdAt: z.string().optional(),
  summary: z.string(),
  scores: z.object({
    product: z.number().min(0).max(100),
    design: z.number().min(0).max(100),
    engineering: z.number().min(0).max(100),
  }),
  issues: z.array(issueSchema),
  tests: z.array(testSchema).optional(),
  fixProposals: z.array(z.any()).optional(),
});

const reviewRequestSchema = z.object({
  scope: z.enum(["whole-app"]).default("whole-app"),
  appSnapshot: z.any().optional(),
});

const fixRequestSchema = z.object({
  selectedIssueIds: z.array(z.string()).default([]),
  report: z.any().optional(),
});

function hasApiKey() {
  return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());
}

function truncate(value, max = 12000) {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max)}\n...[truncated ${value.length - max} chars]` : value;
}

async function readText(relativePath, max = 16000) {
  const absolutePath = path.join(appRoot, relativePath);
  const text = await readFile(absolutePath, "utf8");
  return truncate(text, max);
}

function makeRunId(prefix = "cmd") {
  return `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${crypto.randomBytes(3).toString("hex")}`;
}

function lineHasAllowedCommandFetch(line) {
  return line.includes('fetch("/api/command') || line.includes("fetch('/api/command") || line.includes("fetch(`/api/command");
}

async function collectSourceSnapshot(appSnapshot = {}) {
  const [packageJson, appSource, cssSource, agentNotes, qaNotes, viteConfig] = await Promise.all([
    readText("package.json", 8000),
    readText("src/App.jsx", 28000),
    readText("src/styles.css", 18000),
    readText("AGENTS.md", 6000).catch(() => ""),
    readText("design-qa.md", 12000).catch(() => ""),
    readText("vite.config.mjs", 4000),
  ]);

  const navMatch = appSource.match(/const ownerNav = \[[\s\S]*?const firstSectionByRole/);
  const screenMatch = appSource.match(/function Screen\(props\) \{[\s\S]*?\n\}/);
  const settingsMatch = appSource.match(/function SettingsWorkspace[\s\S]*?function SettingsSection/);

  return {
    app: "WorkForce Command Center",
    scope: "whole-app",
    generatedAt: new Date().toISOString(),
    userPlan: "Platform-admin Command Review Center with PM, Designer, and Engineer review lanes.",
    runtimeSnapshot: appSnapshot,
    files: {
      "package.json": packageJson,
      "vite.config.mjs": viteConfig,
      "AGENTS.md": agentNotes,
      "design-qa.md": qaNotes,
      "src/App.jsx:nav-and-routing": truncate(`${navMatch?.[0] || ""}\n\n${screenMatch?.[0] || ""}`, 16000),
      "src/App.jsx:settings-sample": truncate(settingsMatch?.[0] || "", 9000),
      "src/styles.css:tokens-and-layout": cssSource,
    },
  };
}

async function sourceSafetyCheck() {
  const files = ["src/App.jsx", "src/main.jsx", "src/styles.css", "vite.config.mjs"];
  const findings = [];

  for (const file of files) {
    const source = await readText(file, 80000);
    const lines = source.split("\n");

    lines.forEach((line, index) => {
      const location = `${file}:${index + 1}`;
      const checks = [
        ["dangerouslySetInnerHTML", "dangerouslySetInnerHTML should not be used in this local prototype."],
        ["document.write", "document.write can create injection and layout risks."],
        ["postMessage", "postMessage needs an origin policy before use."],
      ];
      checks.forEach(([needle, message]) => {
        if (line.includes(needle)) findings.push(`${location} ${message}`);
      });
      if (/\beval\s*\(/.test(line)) findings.push(`${location} eval should not be used.`);
      if (/new Function\s*\(/.test(line)) findings.push(`${location} new Function should not be used.`);
      if (/\bfetch\s*\(/.test(line) && !lineHasAllowedCommandFetch(line)) {
        findings.push(`${location} fetch is only expected for /api/command endpoints in this prototype.`);
      }
    });
  }

  return {
    name: "Source safety scan",
    status: findings.length ? "warning" : "passed",
    detail: findings.length ? `${findings.length} source pattern needs review.` : "No unsafe source patterns found outside the command API calls.",
    evidence: findings.slice(0, 8),
  };
}

async function roleBoundaryCheck() {
  const source = await readText("src/App.jsx", 90000);
  const ownerNav = source.match(/const ownerNav = \[[\s\S]*?\];/)?.[0] || "";
  const platformAdminNav = source.match(/const platformAdminNav = \[[\s\S]*?\];/)?.[0] || "";
  const managerNav = source.match(/const managerNav = \[[\s\S]*?\];/)?.[0] || "";
  const employeeNav = source.match(/const employeeNav = \[[\s\S]*?\];/)?.[0] || "";
  const screen = source.match(/function Screen\(props\) \{[\s\S]*?\n\}/)?.[0] || "";

  const evidence = [];
  if (ownerNav.includes("Command Review") || ownerNav.includes("admin-command-review")) evidence.push("Owner navigation exposes admin Command Review.");
  if (managerNav.includes("admin-command-review") || managerNav.includes("Command Review")) evidence.push("Manager navigation exposes Command Review.");
  if (employeeNav.includes("admin-command-review") || employeeNav.includes("Command Review")) evidence.push("Employee navigation exposes Command Review.");
  if (!platformAdminNav.includes("admin-command-review") || !platformAdminNav.includes("Command Review")) evidence.push("Platform Admin navigation is missing Command Review.");
  if (!screen.includes('section === "admin-command-review"')) evidence.push("Screen router is missing admin-command-review.");
  if (!source.includes('"platform-admin": "admin-command-review"')) evidence.push("Platform Admin default section is not admin-command-review.");

  return {
    name: "Role boundary check",
    status: evidence.length ? "failed" : "passed",
    detail: evidence.length ? "Command Review role boundary is not correctly wired." : "Command Review is platform-admin-only in navigation and routing.",
    evidence,
  };
}

async function dashboardActionCheck() {
  const appSource = await readText("src/App.jsx", 900000);
  const homeSmokeSource = await readText("scripts/home-action-smoke.mjs", 120000);
  const source = `${appSource}\n${homeSmokeSource}`;
  const requirements = [
    {
      label: "Owner KPI cards route into schedule, request, time, guide, and event workflows.",
      needles: [
        'const coverageLabel = dateInfo.isToday ? "Coverage Today"',
        'onClick={openCoverageFromDashboard}',
        "const datePendingRequests = data.requests.filter",
        "const pendingCount = datePendingRequests.length",
        'Metric label="Pending Requests"',
        "value={pendingCount}",
        'onClick={openRequestsFromDashboard}',
        "const dateTimeFlags = data.timeEntries.filter",
        "const timeFlagCount = dateTimeFlags.length",
        'const laborLabel = dateInfo.isToday ? "Labor Hours"',
        'onClick={openTimeFromDashboard}',
        'Metric label="Guide Completion"',
        'onClick={openGuideFromDashboard}',
        'Metric label="Event Staffing"',
        "function openEventsFromDashboard",
        'go("owner-events"',
      ],
    },
    {
      label: "Owner focus actions post to team communication or open the relevant workflow.",
      needles: [
        "sendDashboardHandoff(day, location, patchData)",
        'goThread("m2"',
        "sendDashboardRiskBrief(day, location, patchData)",
        "sendDashboardGuideTip(day, location, patchData)",
        "sendDashboardEventSummary(day, location, patchData)",
        "reportEventAppliesToDate(event, [selectedDate])",
        "`${pendingCount} request${pendingCount === 1 ? \"\" : \"s\"} waiting`",
        "timeFlagCount ? `${timeFlagCount} time flag${timeFlagCount === 1 ? \"\" : \"s\"}`",
        'openModal("announcement")',
      ],
    },
    {
      label: "Owner dashboard lower cards are connected to deeper workflows.",
      needles: [
        "<BusinessHealth data={data} go={go} goThread={goThread} setLocation={setLocation} patchData={patchData} day={day} />",
        "sendDashboardHandoff(selectedDate, locationId, patchData)",
        "shiftDateKey(shift) === selectedDate",
        "reportDate: selectedDate",
        "scheduleDate: selectedDate",
        "Brief",
        "<ManagersPanel data={data} go={go} goThread={goThread} setLocation={setLocation} patchData={patchData} day={day} />",
        "function managerDutyRows",
        "function sendManagerDutyBrief",
        "isManagerLeadShift",
        "Need lead",
        "No plan",
        "Manager duty brief sent to Manager Handoff",
        '<GuideSnapshot data={data} openModal={openModal} go={go} goThread={goThread} patchData={patchData} location={location} day={day} />',
        "function GuideSnapshot({ data, openModal, go, goThread, patchData, location = \"all\", day = operationsToday })",
        "selectedDateInfo(selectedDate)",
        "owner-team:training-questions",
        "Coach Tip",
        "cardsNeedingReview",
        '<AnnouncementSnapshot data={data} openModal={openModal} goThread={goThread} patchData={patchData} location={location} day={day} />',
        "function AnnouncementSnapshot({ data, openModal, goThread, patchData, location = \"all\", day = operationsToday })",
        "sendDashboardAnnouncementUpdate(selectedDate, activeLocation, patchData, \"Owner\")",
        "function sendDashboardAnnouncementUpdate",
        "Team update shared to Announcements",
        "Share Update",
        "<OwnerDailyOperationsPanel",
        "Daily Operations",
        "Daily Command Queue",
        "Latest trace",
      ],
    },
    {
      label: "Owner Daily Command Queue exposes safe quick actions, not navigation only.",
      needles: [
        "function timeEntryDateKey",
        "return resolved || operationsToday",
        "timeEntryDateKey(entry) === date",
        "timeEntryDateKey(entry) === selectedDate",
        "requestAppliesToDate(request, selectedDate)",
        "reportEventAppliesToDate(event, [selectedDate])",
        "const monitorDateLabel = dateInfo.isToday ? \"Monitor today\" : `Monitor ${dateInfo.label}`",
        "due: monitorDateLabel",
        "due: dueDateLabel",
        "quickAction: \"Ask Team\"",
        "requestCoverageSupport(patchData",
        "quickAction: \"Approve\"",
        "updateRequest(leadRequest.id, \"approved\", patchData)",
        "quickAction: \"Correct\"",
        "requestTimeCorrection(leadTimeFlag.id, patchData)",
        "quickAction: \"Reminder\"",
        "postEventStaffingReminder(leadEvent.id, patchData)",
        "quickAction: \"Tip\"",
        "sendDashboardGuideTip(selectedDate, activeLocation, patchData)",
        "Follow-up Plan",
        "command-followup-board",
        "command-proof-row",
        "proofRows",
        "command-queue-actions",
      ],
    },
    {
      label: "Owner dashboard schedule preview uses real dated day, week, and month data.",
      needles: [
        "function DashboardRangePreview",
        "scheduleRangeDates(previewDate, previewMode)",
        "scheduleRangeSummary(filteredShifts, rangeDates)",
        "previewMode === \"month\"",
        "shiftDateKey(shift)",
        "schedulePeriod: nextPeriod",
        "scheduleRole: previewRole",
      ],
    },
    {
      label: "Owner home has a functional Daily Readiness strip tied to responsible workflows.",
      needles: [
        "function OwnerReadinessStrip",
        "buildOwnerReadiness",
        "homeActionTarget(item.target)",
        'goThread("m2"',
        "owner-team:manager-handoff",
        "owner-events",
        "owner-time",
      ],
    },
    {
      label: "Owner home includes a dated daily operations brief that saves reports and shares to Manager Handoff.",
      needles: [
        "function OwnerDailyOperationsPanel",
        "function buildOwnerDecisionBrief",
        "Daily Operations",
        "Save Brief",
        "Share Brief",
        "Open Report",
        "generateReport(patchData, reportOptions)",
        "shareReportToHandoff(patchData, { ...reportOptions, audience: \"Manager handoff\" })",
        "goThread?.(\"m2\"",
        "owner-decision-brief",
        "owner-reports:business",
        "owner-team:manager-handoff",
        "timeEntryDateKey(entry)",
      ],
    },
    {
      label: "Topbar notifications are role-aware action-center workflows.",
      needles: [
        "function buildNotificationItems",
        "function buildActionCenterQuickActions",
        "Action Center",
        "notification-command-card",
        "notification-quick-actions",
        "Send Handoff",
        "Risk Brief",
        "Daily Report",
        "sendDashboardHandoff(selectedDate, activeLocation, patchData)",
        "sendDashboardRiskBrief(selectedDate, activeLocation, patchData)",
        "requestAppliesToDate(request, selectedDate)",
        "Future dates are review only until the workday.",
        "notification-action",
        "employeeAvailableShifts(data)",
        "employeeRequests(data)",
        "owner-events",
        "owner-settings:billing",
        "scheduleDate: selectedDate",
        "timeEntryId: leadTimeFlag?.id",
        "guideId: guide.id",
      ],
    },
    {
      label: "Manager and employee account settings plus sign-out stay role-safe.",
      needles: [
        '["manager-settings", "Settings", Gear, "Manager Section"]',
        '["employee-settings", "Settings", Gear, "Employee Section"]',
        'section === "manager-settings" || section === "employee-settings"',
        "function RoleSettingsWorkspace",
        "Manager Settings",
        "Employee Settings",
        "Authority Boundary",
        "Protected Access",
        "Manager settings active. Owner billing stays hidden.",
        "Employee access active. Admin controls stay hidden.",
        "onSignOut={signOut}",
        "userMenuOpen &&",
        "Sign out",
      ],
    },
    {
      label: "Location controls support typed custom work areas and saved workspace directory entries.",
      needles: [
        "function customLocationIdFromName",
        "function getSavedLocations",
        "savedLocations: []",
        "function saveWorkspaceLocation",
        "function saveCommittedWorkspaceLocation",
        "onCommit={saveCommittedWorkspaceLocation}",
        "onCommit?.(nextLocation)",
        "Type a location, team, site, or area",
        "Type any work area, team, route, client site, branch, or project.",
        "Custom entries are saved when used.",
        "savedLocations: nextSavedLocations",
      ],
    },
    {
      label: "Manager dashboard actions open manager-safe schedule, requests, time, guide, and team coverage flows.",
      needles: [
        "function openManagerSchedule",
        "function openManagerRequests",
        "function openManagerTime",
        "function openManagerGuide",
        "function postManagerCoverageAsk",
        "function prepareManagerGap",
        "dayShifts = shifts.filter((shift) => shiftDateKey(shift) === selectedDate)",
        "datePendingRequests = data.requests.filter((request) => request.status === \"pending\" && requestAppliesToDate(request, selectedDate))",
        "scopedTimeEntries = dateInfo.isToday ? data.timeEntries : []",
        "requestCoverageSupport(patchData, { location: openShift?.locationId || \"all\", day: selectedDate, shiftId: openShift.id, sender: ownerManaged ? \"Owner\" : \"Manager\" })",
        "shiftDateKey(shift) === selectedDate && matchesActiveLocation(data, activeLocation, shift.locationId)",
        "No dated schedule exists yet.",
        "review only",
        "scheduleDate: selectedDate",
        "ownerManaged ? \"owner-schedule\" : \"manager-schedule\"",
        "ownerManaged ? \"owner-requests\" : \"manager-requests\"",
        "actionTarget={scheduleTarget}",
        "target: openShift ? (ownerManaged ? \"owner-team:coverage\" : \"manager-team:coverage\") : scheduleTarget",
        "Team Handoff",
        "Next Actions",
        "function ManagerTeamPulseCard",
        "function postManagerTeamPulseUpdate",
        "Post Update",
        "messages: postManagerHandoff(data.messages, body, sender, time)",
        "function postManagerHandoffDigest",
        "manager-handoff-digest",
        "manager-digest-grid",
        "manager-digest-proof",
        "Proof anchors",
        "Send Digest",
        "Coach Guide",
        "messages: postManagerHandoff(data.messages, body, digestOwner, time)",
        "managerFollowUps",
        "managerProofRows",
        "command-followup-board manager-followup-board",
      ],
    },
    {
      label: "Schedule supports dated day, tomorrow, week, month, and custom-range planning.",
      needles: [
        "function SchedulePlannerPanel",
        "function ScheduleHorizonMap",
        "function SchedulePlanningModeGuide",
        "function SchedulePlanningMap",
        "buildScheduleHorizonItems(data, shifts, selectedDate, schedulePeriod, customRangeEnd)",
        "function schedulePlanningModeDetail",
        "function ScheduleRangeBoard",
        "function ensureSchedulePlanningSeed",
        "initialSchedulePeriodFromUrl",
        "initialScheduleEndFromUrl",
        "syncSchedulePeriodInUrl",
        "schedulePeriod",
        "Tomorrow",
        "This Week",
        "Next Week",
        "This Month",
        "Next Month",
        "Week",
        "Month",
        "Custom",
        "Operating window",
        "scheduleTimeBounds(selectedDatePlan, displayShifts)",
        "bounds={timelineBounds}",
        "Range ends",
        "shiftDateKey(shift)",
        "scheduleRangeDates(selectedDate, schedulePeriod, safeCustomRangeEnd)",
        "monthStartDateKey(operationsToday)",
        "function dateRangeKeys",
        "function parseScheduleHour",
        "function scheduleTimeBounds",
        "function scheduleHourMarks",
        "cards are days, chips are shifts",
        "Prepare Range",
        "Fill Empty Days",
        "Post Range Handoff",
        "Planning Mode",
        "Best next step",
        "Planning Detail Map",
        "Each day keeps its own setup",
        "Setup detail",
        "function prepareScheduleRange",
        "function copyScheduleTemplateToDates",
        "function sendScheduleRangeHandoff",
        "function fillFirstOpenShift(patchData, preferredShiftId = null, dateScope = null)",
        "copyScheduleTemplate(operationsToday, selectedDate, patchData)",
        "function timeFocusForLocation(data, location = \"all\", dateScope = null)",
        "requestAppliesToAnyDate(request, rangeDates)",
        "timeFocusForLocation(data, selectedShift?.locationId || \"all\", rangeDates)",
        "timeFocusForLocation(data, selectedShift?.locationId || \"all\", dateScope)",
        "timeFocusForLocation(data, shift.locationId, shiftDateKey(shift))",
        "dateScope={rangeDates}",
        "form.date",
        "function ScheduleDaySetupPanel",
        "function updateScheduleDayPlan",
        "function applyScheduleDayPlanToDates",
        "function sendDatePlanHandoff",
        "getDatePlan(data, selectedDate, shifts)",
        "rangeDates={rangeDates}",
        "businessStart",
        "requiredRoles",
        "laborBudget",
        "publishRule",
        "timeGranularity",
        "coverageGoal",
        "swapRule",
        "breakPlan",
        "Apply to Range",
        "Post Handoff",
        "schedule-side-settings",
        "schedule-side-tabs",
        "sideTool",
      ],
    },
    {
      label: "Workspace date is URL-aware and dashboard date-planning actions keep selected-day context.",
      needles: [
        "function initialDayFromUrl",
        "params.set(\"date\", day)",
        "scheduleDate: selectedDate",
        "reportDate: selectedDate",
        "modal:event",
        "modal:request",
        "Coverage ${dateInfo.label}",
        "focusTitle",
        "<OwnerDailyOperationsPanel",
        "sentenceDateLabel",
        "Build ${dateInfo.label} schedule",
        "No shifts are planned for",
        "scheduleDate: selectedDate",
      ],
    },
    {
      label: "Reports actions generate saved snapshots and can share to Manager Handoff.",
      needles: [
        "function ReportsWorkspace",
        "function ReportBuilderPanel",
        "Report Builder",
        "Generate Report",
        "Share to Handoff",
        "function buildReportSnapshot",
        "function generateReport",
        "function shareReportToHandoff",
        "reportSnapshots",
        "postManagerHandoff(data.messages, body, \"Reports\", time)",
      ],
    },
    {
      label: "Employee home actions connect to dated clock, open shifts, requests, messages, and guide.",
      needles: [
        "function handleHomePunch",
        "const canPunchToday = dateInfo.isToday",
        "Time Clock",
        'go("employee-clock"',
        "function EmployeeTimeClock({ clock, patchData, routeFocus, day })",
        "const selectedDate = validDateKey(routeFocus?.scheduleDate) ? routeFocus.scheduleDate : validDateKey(day) ? day : operationsToday",
        "Review Only",
        "Available on workday",
        "function requestAppliesToDate",
        "function requestAppliesToAnyDate",
        "const myRequests = employeeRequests(data).filter((request) => requestAppliesToDate(request, selectedDate))",
        "const openShifts = employeeAvailableShifts(data).filter((shift) => shiftDateKey(shift) === date)",
        "const myRequests = employeeRequests(data).filter((request) => requestAppliesToDate(request, date))",
        "const clockLabel = dateInfo.isToday ? punch.label : \"Time Clock\"",
        "function openEmployeeShifts",
        "function openEmployeeSchedule",
        "Shift Readiness",
        "readinessItems",
        "employee-readiness-list",
        "source: \"Shift Readiness\"",
        "employeeAvailableShifts(data).filter((shift) => shiftDateKey(shift) === selectedDate)",
        "function EmployeeSectionShell({ title, eyebrow = \"Employee\", active, go, day = operationsToday",
        "function openEmployeeChat()",
        "function openEmployeeAlerts()",
        "function EmployeePhoneTabs({ active, go, day = operationsToday })",
        "source: \"Employee tabs\"",
        'go("employee-shifts"',
        "scheduleDate: selectedDate",
        "function EmployeeSchedule",
        "const rangeDates = scheduleRangeDates(selectedDate, \"week\")",
        "setDay?.(item.date)",
        "function EmployeeOpenShifts",
        "const targetDate = validDateKey(routeFocus?.scheduleDate)",
        "claimShift",
        "shiftDateKey(data.shifts.find((shift) => shift.id === id))",
        'go("employee-requests", `Requests opened for ${dateInfo.label}.`',
        'go("employee-messages", `Team chat opened for ${dateInfo.label}.`',
        "function openEmployeeGuide",
        'go("employee-guide"',
        'homeActionTarget("employee-clock")',
        'target: "employee-schedule"',
        "homeActionTarget(item.target)",
        'homeActionTarget("employee-shifts")',
        'homeActionTarget("employee-requests")',
        'homeActionTarget("employee-messages")',
        'homeActionTarget("employee-guide")',
        "homeActionTarget(section)",
        "function EmployeeTeamInbox({ data, threadId, setThreadId, chatSearch, setChatSearch, patchData, go, day = operationsToday, routeFocus })",
        "shiftDateKey(shift) === selectedDate",
      ],
    },
    {
      label: "Dashboard routes pass focus context to the destination screen.",
      needles: [
        "shiftId: openShift?.id",
        "timeEntryId: timeFlag?.id",
        "guideId: lowGuide?.id",
        "eventId: leadEventGap?.id",
        "source: \"Owner dashboard\"",
        "source: roleSource",
        "source: \"Employee selected day\"",
      ],
    },
    {
      label: "Reusable home controls render as clickable controls, not static decoration.",
      needles: [
        "function Metric({ label, value, detail, state, icon: Icon, onClick, actionTarget })",
        "function homeActionTarget",
        '"data-home-target"',
        "metric-action",
        "button type=\"button\" onClick={item.onClick}",
        "className=\"command-tool-button\"",
        "onClick={latestTrace.onClick}",
        "onShiftClick?.(shift)",
        "onCardClick={openGuide}",
      ],
    },
    {
      label: "Owner daily operations routes communication shortcuts into team chat threads.",
      needles: [
        "function OwnerDailyOperationsPanel",
        "Daily Command Queue",
        "command-proof-row",
        "owner-team:manager-handoff",
        "owner-team:coverage",
        "owner-team:training-questions",
        "requestCoverageSupport(patchData, { shiftId: leadShift.id, location: leadShift.locationId, day: selectedDate, sender: \"Owner\" })",
        "sendDashboardGuideTip(selectedDate, activeLocation, patchData)",
        "sendDashboardEventSummary(selectedDate, activeLocation, patchData)",
      ],
    },
    {
      label: "Manager Team Handoff routes manager-safe operating actions into team chat threads.",
      needles: [
        "Team Handoff",
        "onOpenHandoff",
        "onSendDigest",
        "onPostUpdate",
        "onAskCoverage",
        "onCoachGuide",
        "function ChatChannelActions({ selected, data, role, patchData, go, location, setLocation, day })",
        "const selectedDate = validDateKey(day) ? day : operationsToday",
        "shiftDateKey(shift) === selectedDate",
        "requestAppliesToDate(request, selectedDate)",
        "timeEntryDateKey(entry) === selectedDate",
        "manager-team:manager-handoff",
        "manager-team:coverage",
        "manager-team:training-questions",
      ],
    },
    {
      label: "Rendered home smoke validates every declared home action target against role-safe allowlists.",
      needles: [
        "function extractActionTargets",
        "function assertAllowedActionTargets",
        "function assertActionTargetDestinations",
        "const targetContracts",
        "const modalContracts",
        "allowedTargets",
        "actionTargets: actionTargets.length",
        "resolvedTargets: resolvedTargets.length",
      ],
    },
  ];

  const missing = requirements
    .map((requirement) => ({
      label: requirement.label,
      missingNeedles: requirement.needles.filter((needle) => !source.includes(needle)),
    }))
    .filter((requirement) => requirement.missingNeedles.length);

  return {
    name: "Dashboard action wiring",
    status: missing.length ? "failed" : "passed",
    detail: missing.length
      ? `${missing.length} dashboard action contract${missing.length === 1 ? "" : "s"} need wiring.`
      : "Owner, manager, and employee home actions route to real workflows, modals, focused views, or team threads.",
    evidence: missing.length
      ? missing.map((requirement) => `${requirement.label} Missing: ${requirement.missingNeedles.join(", ")}`).slice(0, 8)
      : requirements.map((requirement) => requirement.label),
  };
}

async function renderedHomeRouteCheck() {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, ["scripts/home-action-smoke.mjs"], {
      cwd: appRoot,
      timeout: 45000,
      maxBuffer: 1024 * 1024 * 3,
    });
    const output = stdout.trim();
    const report = output ? JSON.parse(output) : {};
    const screens = Array.isArray(report.screens) ? report.screens : [];
    const routeCount = screens.reduce((sum, screen) => sum + Number(screen.routes || 0), 0);
    const controlCount = screens.reduce((sum, screen) => sum + Number(screen.controls || 0), 0);
    return {
      name: "Rendered home route smoke",
      status: "passed",
      detail: `${screens.length} home states, ${routeCount} destination routes, and ${controlCount} visible control markers rendered successfully.`,
      evidence: screens.map((screen) => `${screen.name}: ${screen.controls} controls, ${screen.routes} routes`).concat(stderr.trim() ? [`stderr: ${truncate(stderr.trim(), 300)}`] : []),
    };
  } catch (error) {
    const detail = error.message || "Rendered home smoke failed.";
    const output = [error.stdout, error.stderr].filter(Boolean).join("\n").trim();
    return {
      name: "Rendered home route smoke",
      status: "failed",
      detail,
      evidence: output ? truncate(output, 1600).split("\n").filter(Boolean) : [detail],
    };
  }
}

async function buildCheck() {
  try {
    const { stdout, stderr } = await execFileAsync("npm", ["run", "build"], {
      cwd: appRoot,
      timeout: 120000,
      maxBuffer: 1024 * 1024 * 6,
    });
    return {
      name: "Production build",
      status: "passed",
      detail: "npm run build completed.",
      evidence: truncate(`${stdout}\n${stderr}`, 1600).split("\n").filter(Boolean).slice(-8),
    };
  } catch (error) {
    return {
      name: "Production build",
      status: "failed",
      detail: "npm run build failed.",
      evidence: truncate(`${error.stdout || ""}\n${error.stderr || ""}\n${error.message || ""}`, 2200).split("\n").filter(Boolean),
    };
  }
}

async function runDeterministicChecks({ includeBuild = false } = {}) {
  const checks = await Promise.all([sourceSafetyCheck(), roleBoundaryCheck(), dashboardActionCheck(), renderedHomeRouteCheck()]);
  if (includeBuild) checks.push(await buildCheck());
  return checks;
}

const appSourceSnapshotTool = tool({
  name: "get_app_source_snapshot",
  description: "Return a whitelisted snapshot of the WorkForce Command Center source, QA notes, and runtime app state.",
  parameters: z.object({}),
  async execute() {
    return JSON.stringify(await collectSourceSnapshot(), null, 2);
  },
});

const deterministicChecksTool = tool({
  name: "run_deterministic_checks",
  description: "Run quick deterministic source and role-boundary checks. This does not modify files.",
  parameters: z.object({
    includeBuild: z.boolean().optional().describe("Whether to include a production build check."),
  }),
  async execute({ includeBuild = false }) {
    return JSON.stringify(await runDeterministicChecks({ includeBuild }), null, 2);
  },
});

function createReviewAgent() {
  const sharedContext = [
    "You are reviewing a local React/Vite workforce scheduling prototype.",
    "The product direction is schedules, work time, requests, team communication, reports, settings, and role-aware command flows.",
    "Owner/Manager/Employee boundaries must be preserved.",
    "Command Review is an internal platform-admin tool, not a business owner feature.",
    "The browser app is a local prototype using localStorage; do not claim production security.",
    "Safe fixes are only patch proposals. Do not ask to mutate files.",
  ].join(" ");

  const productManager = new Agent({
    name: "Product Manager",
    model: commandModel,
    instructions: `${sharedContext} Review workflow fit, business logic, role boundaries, missing product steps, and whether the customer-facing app helps owners and managers manage daily work. Return concise findings.`,
  });

  const designer = new Agent({
    name: "Designer",
    model: commandModel,
    instructions: `${sharedContext} Review layout clarity, command discoverability, mobile and desktop risks, labels, density, and whether controls are usable without explanatory text.`,
  });

  const engineer = new Agent({
    name: "Engineer",
    model: commandModel,
    instructions: `${sharedContext} Review source risks, broken routing, role leaks, test gaps, unsafe patterns, and maintainability risks. Keep fixes scoped.`,
  });

  return new Agent({
    name: "Command Review Orchestrator",
    model: commandModel,
    instructions: [
      sharedContext,
      "You coordinate the full app review.",
      "Use get_app_source_snapshot and run_deterministic_checks.",
      "Call product_manager_review, designer_review, and engineer_review.",
      "Return JSON only with this shape:",
      "{ summary, scores: { product, design, engineering }, issues: [{ lane, severity, title, evidence, affectedArea, recommendation, safeFix, status }], tests: [], fixProposals: [] }.",
      "Use lane values product, design, engineering. Use severity values critical, high, medium, low.",
      "Every issue must include concrete evidence from the source snapshot, runtime snapshot, or deterministic checks.",
      "Mark only low-risk copy, style containment, or local demo-state cleanup as safeFix true.",
    ].join(" "),
    tools: [
      appSourceSnapshotTool,
      deterministicChecksTool,
      productManager.asTool({
        toolName: "product_manager_review",
        toolDescription: "Review product workflow, business logic, and role boundaries.",
      }),
      designer.asTool({
        toolName: "designer_review",
        toolDescription: "Review interface clarity, layout, and command discoverability.",
      }),
      engineer.asTool({
        toolName: "engineer_review",
        toolDescription: "Review source quality, tests, routing, and engineering risks.",
      }),
    ],
  });
}

function extractJson(value) {
  if (typeof value !== "string") return value;
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1] || value;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("Agent output did not include JSON.");
  return JSON.parse(body.slice(start, end + 1));
}

function normalizeIssue(issue, index) {
  const lane = ["product", "design", "engineering"].includes(issue.lane) ? issue.lane : "engineering";
  const severity = ["critical", "high", "medium", "low"].includes(issue.severity) ? issue.severity : "medium";
  return {
    id: issue.id || `${lane}-${index + 1}`,
    lane,
    severity,
    title: String(issue.title || "Review finding"),
    evidence: String(issue.evidence || "No evidence supplied."),
    affectedArea: String(issue.affectedArea || "Whole app"),
    recommendation: String(issue.recommendation || "Review and refine this area."),
    safeFix: Boolean(issue.safeFix),
    status: issue.status || "open",
  };
}

function normalizeReport(candidate, deterministicTests = []) {
  const parsed = reportSchema.partial({ tests: true, fixProposals: true }).parse(candidate);
  const runId = parsed.runId || makeRunId("review");
  const issues = parsed.issues.map(normalizeIssue);
  const tests = [...(parsed.tests || []), ...deterministicTests].map((test) => testSchema.parse(test));

  return {
    runId,
    createdAt: parsed.createdAt || new Date().toISOString(),
    summary: parsed.summary,
    scores: parsed.scores,
    issues,
    tests,
    fixProposals: parsed.fixProposals || [],
  };
}

function deterministicIssuesFromTests(tests = []) {
  return tests
    .filter((test) => ["warning", "failed", "blocked"].includes(test.status))
    .map((test, index) => {
      const isDashboard = test.name.toLowerCase().includes("dashboard");
      const isRole = test.name.toLowerCase().includes("role");
      const lane = isDashboard ? "product" : isRole ? "engineering" : "engineering";
      const severity = test.status === "failed" || test.status === "blocked" ? "high" : "medium";
      return {
        id: `deterministic-${index + 1}`,
        lane,
        severity,
        title: `${test.name} needs attention`,
        evidence: [test.detail, ...(test.evidence || [])].filter(Boolean).join(" "),
        affectedArea: test.name,
        recommendation: isDashboard
          ? "Wire each visible home action to a real workflow, modal, focused route, or team thread before treating the dashboard as complete."
          : "Review the flagged source contract and fix the narrow failing check before the next command review.",
        safeFix: false,
        status: "open",
      };
    });
}

function deterministicScores(tests = []) {
  const scoreLane = (names, fallback) => {
    const laneTests = tests.filter((test) => names.some((name) => test.name.toLowerCase().includes(name)));
    if (!laneTests.length) return fallback;
    return Math.max(0, Math.min(100, laneTests.reduce((score, test) => {
      if (test.status === "passed") return score;
      if (test.status === "warning") return score - 12;
      if (test.status === "blocked") return score - 22;
      return score - 28;
    }, 88)));
  };
  return {
    product: scoreLane(["dashboard"], 72),
    design: scoreLane(["dashboard"], 70),
    engineering: scoreLane(["source", "role", "build"], 82),
  };
}

function fallbackReport(message, deterministicTests = []) {
  return normalizeReport({
    runId: makeRunId("blocked"),
    createdAt: new Date().toISOString(),
    summary: `${message} Deterministic app checks still ran so platform admins can catch dashboard wiring and role-boundary regressions.`,
    scores: deterministicScores(deterministicTests),
    issues: deterministicIssuesFromTests(deterministicTests),
    tests: deterministicTests,
    fixProposals: [],
  }, []);
}

async function runAgentReview({ scope, appSnapshot }) {
  const deterministicTests = await runDeterministicChecks({ includeBuild: false });

  if (!hasApiKey()) {
    const report = fallbackReport("Command service is running, but real agent review needs OPENAI_API_KEY.", deterministicTests);
    lastRun = { runId: report.runId, status: "blocked", createdAt: report.createdAt, model: commandModel, report };
    return { configured: false, report };
  }

  setDefaultOpenAIKey(process.env.OPENAI_API_KEY);
  const snapshot = await collectSourceSnapshot(appSnapshot);
  const agent = createReviewAgent();
  const prompt = [
    `Scope: ${scope}.`,
    "Review the whole app using the tools and specialists.",
    "Runtime app snapshot follows as JSON:",
    JSON.stringify(snapshot, null, 2),
  ].join("\n\n");

  const result = await run(agent, prompt, { maxTurns: 12 });
  const rawReport = extractJson(result.finalOutput);
  const report = normalizeReport(rawReport, deterministicTests);
  lastRun = { runId: report.runId, status: "completed", createdAt: report.createdAt, model: commandModel, report };
  return { configured: true, report };
}

function deterministicFixProposals(report, selectedIssueIds = []) {
  const issueSet = new Set(selectedIssueIds);
  return (report?.issues || [])
    .filter((issue) => !issueSet.size || issueSet.has(issue.id))
    .map((issue) => ({
      id: `fix-${issue.id}`,
      issueId: issue.id,
      title: issue.safeFix ? `Safe proposal: ${issue.title}` : `Approval needed: ${issue.title}`,
      safety: issue.safeFix ? "safe-proposal" : "needs-approval",
      summary: issue.recommendation,
      patchBrief: issue.safeFix
        ? `Prepare a small scoped patch for ${issue.affectedArea}. Verify with npm run build and command tests before applying.`
        : `Do not auto-apply. Review product impact and platform-admin approval before changing ${issue.affectedArea}.`,
      files: issue.safeFix ? ["src/App.jsx", "src/styles.css"] : [],
    }));
}

async function createAgentFixProposals(report, selectedIssueIds) {
  if (!hasApiKey()) return deterministicFixProposals(report, selectedIssueIds);
  setDefaultOpenAIKey(process.env.OPENAI_API_KEY);
  const agent = new Agent({
    name: "Safe Fix Planner",
    model: commandModel,
    instructions: [
      "Create safe fix proposals for a local React/Vite app.",
      "Do not write or mutate files.",
      "Return JSON only: { fixProposals: [{ id, issueId, title, safety, summary, patchBrief, files }] }.",
      "Use safety values safe-proposal or needs-approval.",
      "Only label low-risk copy, CSS containment, or local UI wiring fixes as safe-proposal.",
    ].join(" "),
  });
  const selected = (report?.issues || []).filter((issue) => !selectedIssueIds.length || selectedIssueIds.includes(issue.id));
  const result = await run(agent, JSON.stringify({ selectedIssues: selected }, null, 2), { maxTurns: 4 });
  try {
    const parsed = extractJson(result.finalOutput);
    return Array.isArray(parsed.fixProposals) ? parsed.fixProposals : deterministicFixProposals(report, selectedIssueIds);
  } catch {
    return deterministicFixProposals(report, selectedIssueIds);
  }
}

export function createCommandApp() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/command/health", (_request, response) => {
    response.json({
      ok: true,
      ready: true,
      configured: hasApiKey(),
      model: commandModel,
      lastRun,
      message: hasApiKey()
        ? "Command agent service is ready."
        : "Command agent service is running. Set OPENAI_API_KEY to enable real agent reviews.",
    });
  });

  app.post("/api/command/review", async (request, response) => {
    try {
      const body = reviewRequestSchema.parse(request.body || {});
      const result = await runAgentReview(body);
      response.status(result.configured ? 200 : 202).json(result.report);
    } catch (error) {
      response.status(500).json({
        error: "review_failed",
        message: error.message || "Command review failed.",
      });
    }
  });

  app.post("/api/command/test", async (_request, response) => {
    const tests = await runDeterministicChecks({ includeBuild: true });
    response.json({ runId: makeRunId("test"), createdAt: new Date().toISOString(), tests });
  });

  app.post("/api/command/propose-fixes", async (request, response) => {
    try {
      const body = fixRequestSchema.parse(request.body || {});
      const report = body.report || lastRun?.report || { issues: [] };
      const fixProposals = await createAgentFixProposals(report, body.selectedIssueIds);
      response.json({
        runId: makeRunId("fix"),
        createdAt: new Date().toISOString(),
        fixProposals,
        applied: false,
      });
    } catch (error) {
      response.status(500).json({
        error: "proposal_failed",
        message: error.message || "Fix proposal failed.",
      });
    }
  });

  return app;
}

export function startCommandService({ port = defaultPort } = {}) {
  const app = createCommandApp();
  const server = app.listen(port, "127.0.0.1", () => {
    console.log(`Command agent service listening on http://127.0.0.1:${port}`);
  });
  return server;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  activeServer = startCommandService();
  activeKeepAlive = setInterval(() => {}, 1 << 30);
  activeServer.on("close", () => clearInterval(activeKeepAlive));
}
