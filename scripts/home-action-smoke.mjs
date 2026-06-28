import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";

const storage = new Map();
const scheduleBoardIncludes = ["Schedule Command Center", "Schedule Board", "Manage Schedule", "Today", "Tomorrow", "Week", "Month", "Custom", "Role", "Coverage Snapshot", "Open Shifts"];
const scheduleRangeIncludes = ["Range Board", "Coverage Snapshot", "Open Day", "Build Day", "Copy Today"];
const targetContracts = {
  "owner-schedule": { search: "?role=owner&section=owner-schedule", includes: scheduleBoardIncludes, excludes: ["Command Review"] },
  "owner-requests": { search: "?role=owner&section=owner-requests", includes: ["Team Requests", "Request Queue"], excludes: ["Command Review"] },
  "owner-time": { search: "?role=owner&section=owner-time", includes: ["Labor Cost Today", "Exception Queue"], excludes: ["Command Review"] },
  "owner-guide": { search: "?role=owner&section=owner-guide", includes: ["Guide", "Today&#x27;s shift coach"], excludes: ["Command Review"] },
  "owner-events": { search: "?role=owner&section=owner-events", includes: ["Events", "Upcoming Event Board"], excludes: ["Command Review"] },
  "owner-team:manager-handoff": { search: "?role=owner&section=owner-team", includes: ["Team", "Manager Handoff"], excludes: ["Command Review"] },
  "owner-team:training-questions": { search: "?role=owner&section=owner-team", includes: ["Team", "Training Questions"], excludes: ["Command Review"] },
  "owner-team:coverage": { search: "?role=owner&section=owner-team", includes: ["Team", "Coverage Team"], excludes: ["Command Review"] },
  "owner-team:announcements": { search: "?role=owner&section=owner-team", includes: ["Team", "Announcements"], excludes: ["Command Review"] },
  "owner-reports:business": { search: "?role=owner&section=owner-reports", includes: ["Open shifts", "Report Builder", "Generate Report", "Share to Handoff", "Report History"], excludes: ["Command Review"] },
  "owner-reports:command-log": { search: "?role=owner&section=owner-reports", includes: ["Open shifts", "Report Builder", "Generate Report", "Share to Handoff", "Report History"], excludes: ["Command Review"] },
  "owner-reports:risk": { search: "?role=owner&section=owner-reports", includes: ["Open shifts", "Report Builder", "Generate Report", "Share to Handoff", "Report History"], excludes: ["Command Review"] },
  "owner-manager-dashboard": { search: "?role=owner&section=owner-manager-dashboard", includes: ["Today Coverage", "Manager Actions", "Next Actions", "Team Handoff"], excludes: ["Billing Seats", "Command Review"] },
  "manager-schedule": { search: "?role=manager&section=manager-schedule", includes: scheduleBoardIncludes, excludes: ["Billing Seats", "Command Review", "Settings & Billing"] },
  "manager-requests": { search: "?role=manager&section=manager-requests", includes: ["Team Requests", "Request Queue"], excludes: ["Billing Seats", "Command Review", "Settings & Billing"] },
  "manager-time": { search: "?role=manager&section=manager-time", includes: ["Tracked labor", "Exception Queue"], excludes: ["Billing Seats", "Command Review", "Settings & Billing", "Labor Cost Today"] },
  "manager-guide": { search: "?role=manager&section=manager-guide", includes: ["Guide", "Today&#x27;s shift coach"], excludes: ["Billing Seats", "Command Review", "Settings & Billing"] },
  "manager-team:manager-handoff": { search: "?role=manager&section=manager-team", includes: ["Team", "Manager Handoff"], excludes: ["Billing Seats", "Command Review", "Settings & Billing"] },
  "manager-team:coverage": { search: "?role=manager&section=manager-team", includes: ["Team", "Coverage Team"], excludes: ["Billing Seats", "Command Review", "Settings & Billing"] },
  "manager-team:training-questions": { search: "?role=manager&section=manager-team", includes: ["Team", "Training Questions"], excludes: ["Billing Seats", "Command Review", "Settings & Billing"] },
  "manager-settings": { search: "?role=manager&section=manager-settings", includes: ["Manager Settings", "Manager Profile", "Authority Boundary", "Protected Access"], excludes: ["Billing Seats", "Command Review", "Settings & Billing", "Delete Workspace"] },
  "employee-dashboard": { search: "?role=employee&section=employee-dashboard", includes: ["Next shift", "Shift Readiness", "Shift plan", "Location check", "Guide tip", "Today plan"], excludes: ["Manager Actions", "Billing Seats", "Command Review", "Settings & Billing"] },
  "employee-clock": { search: "?role=employee&section=employee-clock", includes: ["My Time Clock", "Clock In"], excludes: ["Manager Actions", "Billing Seats", "Command Review", "Settings & Billing"] },
  "employee-schedule": { search: "?role=employee&section=employee-schedule", includes: ["Schedule", "Time Clock"], excludes: ["Manager Actions", "Billing Seats", "Command Review", "Settings & Billing"] },
  "employee-shifts": { search: "?role=employee&section=employee-shifts", includes: ["Open Shifts", "Request Shift"], excludes: ["Manager Actions", "Billing Seats", "Command Review", "Settings & Billing"] },
  "employee-requests": { search: "?role=employee&section=employee-requests", includes: ["My Requests", "Request Queue"], excludes: ["Manager Actions", "Billing Seats", "Command Review", "Settings & Billing"] },
  "employee-messages": { search: "?role=employee&section=employee-messages", includes: ["Team", "Search team"], excludes: ["Manager Actions", "Billing Seats", "Command Review", "Settings & Billing", "Invite code"] },
  "employee-guide": { search: "?role=employee&section=employee-guide", includes: ["My Shift Guide", "Today&#x27;s shift coach"], excludes: ["Manager Actions", "Billing Seats", "Command Review", "Settings & Billing"] },
  "employee-settings": { search: "?role=employee&section=employee-settings", includes: ["Employee Settings", "Employee Profile", "Authority Boundary", "Protected Access"], excludes: ["Manager Actions", "Billing Seats", "Command Review", "Settings & Billing", "Delete Workspace"] },
};
const modalContracts = {
  "modal:shift": ['modalName === "shift"', "addShift(form, patchData)", 'modalName === "shift" &&'],
  "modal:announcement": ['modalName === "announcement"', "addAnnouncement(form, patchData, role)"],
  "modal:guide": ['modalName === "guide"', "addGuide(form, patchData)"],
  "modal:event": ['modalName === "event"', "addEvent(form, patchData)"],
  "modal:request": ['modalName === "request"', "addRequest(form, patchData, role)"],
};

function installBrowserStubs(search) {
  storage.clear();
  globalThis.localStorage = {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
    removeItem(key) {
      storage.delete(key);
    },
    clear() {
      storage.clear();
    },
  };
  globalThis.window = {
    location: { pathname: "/", search },
    history: { replaceState() {} },
    requestAnimationFrame(callback) {
      return setTimeout(callback, 0);
    },
  };
  globalThis.document = {
    createElement() {
      return {
        click() {},
        set download(_value) {},
        set href(_value) {},
      };
    },
    getElementById() {
      return null;
    },
  };
}

function assertIncludes(html, labels, screen) {
  const missing = labels.filter((label) => !html.includes(label));
  if (missing.length) {
    throw new Error(`${screen} missing visible controls: ${missing.join(", ")}`);
  }
}

function assertExcludes(html, labels, screen) {
  const present = labels.filter((label) => html.includes(label));
  if (present.length) {
    throw new Error(`${screen} shows restricted controls: ${present.join(", ")}`);
  }
}

function assertActionTargets(html, targets, screen) {
  const missing = (targets || []).filter((target) => !html.includes(`data-home-target="${target}"`));
  if (missing.length) {
    throw new Error(`${screen} missing action targets: ${missing.join(", ")}`);
  }
}

function assertForbiddenActionTargets(html, targets, screen) {
  const present = (targets || []).filter((target) => html.includes(`data-home-target="${target}"`));
  if (present.length) {
    throw new Error(`${screen} exposes restricted action targets: ${present.join(", ")}`);
  }
}

function extractActionTargets(html) {
  return [...html.matchAll(/data-home-target="([^"]+)"/g)].map((match) => match[1]);
}

function assertAllowedActionTargets(html, allowedTargets, screen) {
  const actualTargets = extractActionTargets(html);
  const allowed = new Set(allowedTargets || []);
  const unexpected = [...new Set(actualTargets.filter((target) => !allowed.has(target)))];
  if (unexpected.length) {
    throw new Error(`${screen} exposes unapproved action targets: ${unexpected.join(", ")}`);
  }
  return actualTargets;
}

function assertModalTarget(target, appSource, screen) {
  const needles = modalContracts[target];
  if (!needles) throw new Error(`${screen} has no modal contract for ${target}`);
  const missing = needles.filter((needle) => !appSource.includes(needle));
  if (missing.length) {
    throw new Error(`${screen} modal target ${target} missing implementation: ${missing.join(", ")}`);
  }
}

async function assertActionTargetDestinations(server, targets, screen, appSource) {
  const uniqueTargets = [...new Set(targets)];
  const verified = [];
  for (const target of uniqueTargets) {
    if (target.startsWith("modal:")) {
      assertModalTarget(target, appSource, screen);
      verified.push({ target, type: "modal" });
      continue;
    }
    const contract = targetContracts[target];
    if (!contract) throw new Error(`${screen} has no destination contract for ${target}`);
    const html = await renderScreen(server, contract.search);
    assertIncludes(html, contract.includes || [], `${screen} target ${target}`);
    assertExcludes(html, contract.excludes || [], `${screen} target ${target}`);
    verified.push({ target, type: "route" });
  }
  return verified;
}

async function assertRoutes(server, routes, screen) {
  const results = [];
  for (const route of routes || []) {
    const html = await renderScreen(server, route.search);
    assertIncludes(html, route.includes || [], `${screen} route ${route.search}`);
    assertExcludes(html, route.excludes || [], `${screen} route ${route.search}`);
    results.push({ route: route.search, status: "passed", markers: (route.includes || []).length });
  }
  return results;
}

async function renderScreen(server, search) {
  installBrowserStubs(search);
  const module = await server.ssrLoadModule("/src/App.jsx");
  return renderToStaticMarkup(React.createElement(module.App));
}

async function run() {
  const server = await createServer({
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  const appSource = await readFile("src/App.jsx", "utf8");

  try {
    const checks = [
      {
        name: "Owner home",
        search: "?role=owner&section=owner-dashboard",
        includes: [
          "Coverage Today",
          "Open Shifts",
          "Pending Requests",
          "Labor Hours",
          "Guide Completion",
          "Event Staffing",
          "Daily Readiness",
          "Handoff",
          "Build Schedule",
          "Day",
          "Week",
          "Month",
          "Daily Operations",
          "Save Brief",
          "Share Brief",
          "Open Report",
          "Today Focus",
          "Daily Command Queue",
          "Follow-up Plan",
          "Proof trail",
          "Before 4 PM",
          "Open schedule gap",
          "Before payroll",
          "Review exception",
          "Training lead",
          "Business Health",
          "Brief",
          "Managers on Duty",
          "Send Brief",
          "Coach Tip",
          "Share Update",
          "Open Chat",
          "Latest trace",
        ],
        excludes: ["Billing Seats", "Subscription Status", "Settings & Billing", "Command Review"],
        targets: [
          "owner-schedule",
          "owner-requests",
          "owner-time",
          "owner-guide",
          "owner-events",
          "modal:shift",
          "modal:announcement",
          "modal:guide",
          "owner-team:manager-handoff",
          "owner-team:training-questions",
          "owner-events",
          "owner-reports:business",
        ],
        allowedTargets: [
          "owner-schedule",
          "owner-requests",
          "owner-time",
          "owner-guide",
          "owner-events",
          "modal:shift",
          "modal:announcement",
          "modal:guide",
          "owner-team:manager-handoff",
          "owner-team:training-questions",
          "owner-team:coverage",
          "owner-team:announcements",
          "owner-events",
          "owner-reports:business",
          "owner-reports:command-log",
          "owner-reports:risk",
          "owner-manager-dashboard",
        ],
        routes: [
          { search: "?role=owner&section=owner-dashboard&date=2026-06-25", includes: ["Overview of tomorrow operations", "Coverage Tomorrow", "Tomorrow Gaps", "Tomorrow Focus", "Tomorrow Planning", "Create event", "New events will default to", "Daily report"], excludes: ["Coverage Today", "Command Review"] },
          { search: "?role=owner&section=owner-dashboard&date=2026-07-05", includes: ["Overview of Sun, Jul 5, 2026 operations", "Build Sun, Jul 5, 2026 schedule", "No shifts are planned for Sun, Jul 5, 2026"], excludes: ["Coverage Today", "Command Review"] },
          { search: "?role=owner&section=owner-schedule", includes: scheduleBoardIncludes, excludes: ["Command Review"] },
          { search: "?role=owner&section=owner-schedule&date=2026-06-25&period=week", includes: [...scheduleRangeIncludes, "Jun 25 - Jul 1"], excludes: ["Command Review"] },
          { search: "?role=owner&section=owner-schedule&date=2026-06-25&period=custom&end=2026-07-08", includes: [...scheduleRangeIncludes, "Custom", "Range ends", "Jun 25 - Jul 8"], excludes: ["Command Review"] },
          { search: "?role=owner&section=owner-requests", includes: ["Team Requests", "Request Queue"], excludes: ["Command Review"] },
          { search: "?role=owner&section=owner-time", includes: ["Labor Cost Today", "Exception Queue"], excludes: ["Command Review"] },
          { search: "?role=owner&section=owner-guide", includes: ["Guide", "Today&#x27;s shift coach"], excludes: ["Command Review"] },
          { search: "?role=owner&section=owner-events", includes: ["Events", "Upcoming Event Board"], excludes: ["Command Review"] },
          { search: "?role=owner&section=owner-team", includes: ["Team", "Invite code"], excludes: ["Command Review"] },
          { search: "?role=owner&section=owner-reports", includes: ["Open shifts", "Report Builder", "Generate Report", "Share to Handoff", "Report History"], excludes: ["Command Review"] },
          { search: "?role=owner&section=owner-settings", includes: ["Settings section", "Owner controls"], excludes: ["Command Review"] },
          { search: "?role=owner&section=owner-settings&settings=locations", includes: ["Locations", "Location Setup", "Manage Locations", "Saved work area"], excludes: ["Command Review"] },
        ],
      },
      {
        name: "Manager home",
        search: "?role=manager&section=manager-dashboard",
        includes: [
          "Today Coverage",
          "Team Clock Status",
          "Approvals",
          "Guide Progress",
          "Manager Coverage Board",
          "Manager Actions",
          "Next Actions",
          "Team Handoff",
          "Post Update",
          "Proof anchors",
          "Send Digest",
          "Coach Guide",
          "Follow-up Plan",
          "Proof trail",
          "Ask team for coverage",
          "Prepare open shift",
        ],
        excludes: ["Billing Seats", "Command Review", "Settings & Billing"],
        targets: [
          "manager-schedule",
          "manager-requests",
          "manager-time",
          "manager-guide",
          "manager-team:manager-handoff",
          "manager-team:coverage",
          "manager-team:training-questions",
        ],
        allowedTargets: [
          "manager-schedule",
          "manager-requests",
          "manager-time",
          "manager-guide",
          "manager-team:manager-handoff",
          "manager-team:coverage",
          "manager-team:training-questions",
        ],
        forbiddenTargets: [
          "owner-settings:billing",
          "owner-team:manager-handoff",
          "owner-reports:business",
          "owner-events",
        ],
        routes: [
          { search: "?role=manager&section=manager-dashboard&date=2026-07-05", includes: ["Sun, Jul 5, 2026 Coverage", "Sun, Jul 5, 2026 review only", "Sun, Jul 5, 2026 has no schedule yet", "Build Sun, Jul 5, 2026 schedule first"], excludes: ["Billing Seats", "Command Review", "Settings & Billing"] },
          { search: "?role=manager&section=manager-schedule", includes: scheduleBoardIncludes, excludes: ["Billing Seats", "Command Review", "Settings & Billing"] },
          { search: "?role=manager&section=manager-schedule&date=2026-06-25&period=week", includes: [...scheduleRangeIncludes, "Jun 25 - Jul 1"], excludes: ["Billing Seats", "Command Review", "Settings & Billing"] },
          { search: "?role=manager&section=manager-schedule&date=2026-06-25&period=custom&end=2026-07-08", includes: [...scheduleRangeIncludes, "Custom", "Range ends", "Jun 25 - Jul 8"], excludes: ["Billing Seats", "Command Review", "Settings & Billing"] },
          { search: "?role=manager&section=manager-requests", includes: ["Team Requests", "Request Queue"], excludes: ["Billing Seats", "Command Review", "Settings & Billing"] },
	          { search: "?role=manager&section=manager-time", includes: ["Tracked labor", "Live Attendance", "Exception Queue"], excludes: ["Billing Seats", "Command Review", "Settings & Billing", "Labor Cost Today"] },
	          { search: "?role=manager&section=manager-guide", includes: ["Guide", "Today&#x27;s shift coach"], excludes: ["Billing Seats", "Command Review", "Settings & Billing"] },
	          { search: "?role=manager&section=manager-team", includes: ["Team", "Invite code"], excludes: ["Billing Seats", "Command Review", "Settings & Billing"] },
	          { search: "?role=manager&section=manager-settings", includes: ["Manager Settings", "Manager Profile", "Notifications", "Security", "Authority Boundary"], excludes: ["Billing Seats", "Command Review", "Settings & Billing", "Delete Workspace"] },
	        ],
	      },
      {
        name: "Employee home",
        search: "?role=employee&section=employee-dashboard",
        includes: [
          "Next shift",
          "open shifts",
          "Shift Readiness",
          "Shift plan",
          "Location check",
          "Guide tip",
          "Today plan",
          "Team update",
          "Training",
        ],
        excludes: ["Manager Actions", "Billing Seats", "Command Review", "Settings & Billing"],
        targets: [
          "employee-dashboard",
          "employee-clock",
          "employee-schedule",
          "employee-shifts",
          "employee-requests",
          "employee-messages",
          "employee-guide",
        ],
        allowedTargets: [
          "employee-dashboard",
          "employee-clock",
          "employee-schedule",
          "employee-shifts",
          "employee-requests",
          "employee-messages",
          "employee-guide",
        ],
        forbiddenTargets: [
          "manager-schedule",
          "manager-requests",
          "manager-time",
          "manager-team:manager-handoff",
          "manager-team:coverage",
          "manager-team:training-questions",
          "owner-settings:billing",
          "owner-team:manager-handoff",
          "owner-reports:business",
          "owner-events",
        ],
        routes: [
          { search: "?role=employee&section=employee-dashboard&date=2026-07-05", includes: ["Sun, Jul 5, 2026", "No shift scheduled", "No pickup options for Sun, Jul 5, 2026", "Shift Readiness", "Review Only", "Selected day plan", "Time Clock"], excludes: ["Manager Actions", "Billing Seats", "Command Review", "Settings & Billing", "Coverage offer - Today"] },
          { search: "?role=employee&section=employee-dashboard&date=2026-06-28", includes: ["Sun, Jun 28, 2026", "Time Clock", "No pickup options for Sun, Jun 28, 2026", "Shift Readiness", "Review Only", "Selected day plan"], excludes: ["Clock In", "Manager Actions", "Billing Seats", "Command Review", "Settings & Billing", "Coverage offer - Today"] },
          { search: "?role=employee&section=employee-schedule&date=2026-07-05", includes: ["Sun, Jul 5, 2026 schedule", "No approved shift is scheduled for Sun, Jul 5, 2026.", "Requests this range", "open this range"], excludes: ["Manager Actions", "Billing Seats", "Command Review", "Settings & Billing", "Coverage offer - Today"] },
          { search: "?role=employee&section=employee-clock", includes: ["My Time Clock", "Clock In", "Start Lunch"], excludes: ["Manager Actions", "Billing Seats", "Command Review", "Settings & Billing"] },
          { search: "?role=employee&section=employee-clock&date=2026-07-05", includes: ["My Time Clock", "Sun, Jul 5, 2026 review only", "Review Only", "Available on workday"], excludes: ["Clock In", "I'm Almost There", "Manager Actions", "Billing Seats", "Command Review", "Settings & Billing"] },
          { search: "?role=employee&section=employee-shifts", includes: ["Open Shifts", "Request Shift"], excludes: ["Manager Actions", "Billing Seats", "Command Review", "Settings & Billing"] },
          { search: "?role=employee&section=employee-shifts&date=2026-06-28", includes: ["Sun, Jun 28, 2026 Shifts", "No open shifts for Sun, Jun 28, 2026", "New shifts for Sun, Jun 28, 2026"], excludes: ["Today Shifts", "Manager Actions", "Billing Seats", "Command Review", "Settings & Billing", "Request Shift"] },
          { search: "?role=employee&section=employee-shifts&date=2026-07-05", includes: ["Sun, Jul 5, 2026 Shifts", "No open shifts for Sun, Jul 5, 2026", "New shifts for Sun, Jul 5, 2026"], excludes: ["Manager Actions", "Billing Seats", "Command Review", "Settings & Billing", "Request Shift"] },
          { search: "?role=employee&section=employee-requests", includes: ["My Requests", "Request Queue"], excludes: ["Manager Actions", "Billing Seats", "Command Review", "Settings & Billing"] },
	          { search: "?role=employee&section=employee-messages", includes: ["Team", "Search team"], excludes: ["Manager Actions", "Billing Seats", "Command Review", "Settings & Billing", "Invite code"] },
	          { search: "?role=employee&section=employee-messages&date=2026-06-28", includes: ["Team", "Sun, Jun 28, 2026", "No open shift alerts", "New opportunities for Sun, Jun 28, 2026"], excludes: ["Manager Actions", "Billing Seats", "Command Review", "Settings & Billing", "Invite code"] },
	          { search: "?role=employee&section=employee-guide", includes: ["My Shift Guide", "Today&#x27;s shift coach"], excludes: ["Manager Actions", "Billing Seats", "Command Review", "Settings & Billing"] },
	          { search: "?role=employee&section=employee-settings", includes: ["Employee Settings", "Employee Profile", "Notifications", "Security", "Authority Boundary"], excludes: ["Manager Actions", "Billing Seats", "Command Review", "Settings & Billing", "Delete Workspace"] },
	        ],
	      },
      {
        name: "Signed out",
        search: "?signedOut=true",
        includes: ["Sign in to your workspace", "No active account", "Log in", "Sign up", "Use email", "Forgot password?"],
        excludes: ["Owner account signed out", "Sign in as", "Owner", "Manager", "Employee", "Choose a role"],
        allowedTargets: [],
      },
    ];

    const results = [];
    for (const check of checks) {
      const html = await renderScreen(server, check.search);
      assertIncludes(html, check.includes, check.name);
      assertExcludes(html, check.excludes, check.name);
      assertActionTargets(html, check.targets, check.name);
      assertForbiddenActionTargets(html, check.forbiddenTargets, check.name);
      const actionTargets = assertAllowedActionTargets(html, check.allowedTargets, check.name);
      const resolvedTargets = await assertActionTargetDestinations(server, actionTargets, check.name, appSource);
      const routes = await assertRoutes(server, check.routes, check.name);
      results.push({ name: check.name, status: "passed", controls: check.includes.length, targets: (check.targets || []).length, actionTargets: actionTargets.length, resolvedTargets: resolvedTargets.length, routes: routes.length });
    }

    console.log(JSON.stringify({ homeActionSmoke: "passed", screens: results }, null, 2));
  } finally {
    await server.close();
  }
}

run().catch((error) => {
  console.error("Home action smoke check failed.");
  console.error(error.message || error);
  process.exit(1);
});
