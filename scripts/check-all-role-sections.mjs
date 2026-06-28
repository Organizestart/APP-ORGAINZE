import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";
import { sectionIdsForRole } from "../src/who-can-open-what.js";

const storage = new Map();

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
  if (missing.length) throw new Error(`${screen} missing: ${missing.join(", ")}`);
}

function assertExcludes(html, labels, screen) {
  const present = labels.filter((label) => html.includes(label));
  if (present.length) throw new Error(`${screen} should not show: ${present.join(", ")}`);
}

function assertSameList(actual, expected, screen) {
  const missing = expected.filter((item) => !actual.includes(item));
  const extra = actual.filter((item) => !expected.includes(item));
  if (missing.length || extra.length) {
    throw new Error(`${screen} drifted. Missing: ${missing.join(", ") || "none"}. Extra: ${extra.join(", ") || "none"}.`);
  }
}

async function renderScreen(server, search) {
  installBrowserStubs(search);
  const module = await server.ssrLoadModule("/src/workforce-app-screens.jsx");
  return renderToStaticMarkup(React.createElement(module.App));
}

const globalRestricted = ["Command Review Center"];
const ownerSections = [
  ["owner-dashboard", ["Daily Operations", "Business Health", "Managers on Duty"]],
  ["owner-schedule", ["Schedule Command Center", "Schedule Board", "Manage Schedule"]],
  ["owner-requests", ["Team Requests", "Request Queue"]],
  ["owner-events", ["Events", "Upcoming Event Board"]],
  ["owner-team", ["Team", "Search conversations"]],
  ["owner-guide", ["Guide", "Today&#x27;s shift coach"]],
  ["owner-time", ["Labor Cost Today", "Exception Queue"]],
  ["owner-reports", ["Report Builder", "Generate Report", "Report History"]],
  ["owner-settings", ["Settings &amp; Billing", "Company Profile", "Subscription", "Seat Usage"]],
];

const managerSections = [
  ["manager-dashboard", ["Manager Coverage Board", "Manager Actions", "Team Handoff"]],
  ["manager-schedule", ["Schedule Command Center", "Schedule Board", "Manage Schedule"]],
  ["manager-requests", ["Team Requests", "Request Queue"]],
  ["manager-team", ["Team", "Manager Handoff"]],
  ["manager-guide", ["Guide", "Today&#x27;s shift coach"]],
  ["manager-time", ["Tracked labor", "Exception Queue"]],
  ["manager-settings", ["Manager Settings", "Manager Profile", "Account Preferences", "Authority Boundary"]],
  ["employee-dashboard", ["Next shift", "Shift Readiness"]],
  ["employee-schedule", ["Schedule", "Time Clock"]],
  ["employee-shifts", ["Open Shifts", "Request Shift"]],
  ["employee-clock", ["My Time Clock", "Clock In"]],
  ["employee-requests", ["My Requests", "Request Queue"]],
  ["employee-guide", ["My Shift Guide", "Today&#x27;s shift coach"]],
];

const employeeSections = [
  ["employee-dashboard", ["Next shift", "Shift Readiness"]],
  ["employee-schedule", ["Schedule", "Time Clock"]],
  ["employee-shifts", ["Open Shifts", "Request Shift"]],
  ["employee-clock", ["My Time Clock", "Clock In"]],
  ["employee-requests", ["My Requests", "Request Queue"]],
  ["employee-messages", ["Team", "Search team"]],
  ["employee-guide", ["My Shift Guide", "Today&#x27;s shift coach"]],
  ["employee-settings", ["Employee Settings", "Employee Profile", "Account Preferences", "Authority Boundary"]],
];

const managerRestricted = [
  "Settings & Billing",
  "Report Builder",
  "Generate Report",
  "Upcoming Event Board",
  "Delete Workspace",
  ...globalRestricted,
];

const employeeRestricted = [
  "Manager Actions",
  "Settings & Billing",
  "Report Builder",
  "Generate Report",
  "Upcoming Event Board",
  "Invite system",
  "Delete Workspace",
  ...globalRestricted,
];

async function assertRoleSections(server, role, account, sections, restrictedLabels) {
  const results = [];
  for (const [section, includes] of sections) {
    const search = `?preview=safe-change&role=${role}&section=${section}&account=${account}&date=2026-06-24`;
    const html = await renderScreen(server, search);
    assertIncludes(html, ["Safe Change Preview", ...includes], `${role} ${section}`);
    assertExcludes(html, restrictedLabels, `${role} ${section}`);
    results.push(section);
  }
  return results;
}

async function run() {
  const appSource = await readFile("src/workforce-app-screens.jsx", "utf8");
  const roleRulesSource = await readFile("src/who-can-open-what.js", "utf8");
  assertIncludes(appSource, [
    "function canRoleAccessSection",
    "function safeSectionForRole",
    "from \"./who-can-open-what.js\"",
  ], "role access architecture");
  assertIncludes(roleRulesSource, [
    "export function sectionIdsForRole",
    "export function safeSectionForRole",
    "function runtimeRoleForSection",
  ], "shared role access rules");

  const server = await createServer({
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });

  try {
    const appModule = await server.ssrLoadModule("/src/workforce-app-screens.jsx");
    assertIncludes(appModule.navigationSectionIdsForTest.toString(), ["navForRole"], "navigation test export");
    for (const role of ["owner", "manager", "employee", "platform-admin"]) {
      assertSameList(
        appModule.navigationSectionIdsForTest(role),
        sectionIdsForRole(role),
        `${role} navigation and access rules`,
      );
    }

    const owner = await assertRoleSections(server, "owner", "preview-owner-maya", ownerSections, globalRestricted);
    const manager = await assertRoleSections(server, "manager", "preview-manager-jordan", managerSections, managerRestricted);
    const employee = await assertRoleSections(server, "employee", "preview-employee-luis", employeeSections, employeeRestricted);

    const platformAdmin = await renderScreen(server, "?role=platform-admin&section=admin-command-review&date=2026-06-24");
    assertIncludes(platformAdmin, ["Platform Admin", "Command Review Center", "Run Whole App Review"], "platform admin");
    assertExcludes(platformAdmin, ["Owner Section", "Employee Section", "Settings & Billing"], "platform admin");

    const signedOut = await renderScreen(server, "?signedOut=true");
    assertIncludes(signedOut, ["Sign in to your workspace", "Log in", "Sign up", "Use email", "Forgot password?", "Create account"], "signed out");
    assertExcludes(signedOut, ["Sign in as Owner", "Manager Dashboard", "Employee Section"], "signed out");

    const forcedManagerOwnerRoute = await renderScreen(server, "?preview=safe-change&role=manager&section=owner-reports&account=preview-manager-jordan&date=2026-06-24");
    assertIncludes(forcedManagerOwnerRoute, ["Manager Coverage Board"], "manager forced owner route fallback");
    assertExcludes(forcedManagerOwnerRoute, ["Report Builder", "Settings & Billing"], "manager forced owner route fallback");

    const forcedEmployeeManagerRoute = await renderScreen(server, "?preview=safe-change&role=employee&section=manager-time&account=preview-employee-luis&date=2026-06-24");
    assertIncludes(forcedEmployeeManagerRoute, ["Next shift", "Shift Readiness"], "employee forced manager route fallback");
    assertExcludes(forcedEmployeeManagerRoute, ["Exception Queue", "Manager Actions"], "employee forced manager route fallback");

    console.log(JSON.stringify({
      allRoleSections: "passed",
      renderedSections: {
        owner: owner.length,
        manager: manager.length,
        employee: employee.length,
        platformAdmin: 1,
        signedOut: 1,
      },
      forcedRouteFallbacks: "passed",
    }, null, 2));
  } finally {
    await server.close();
  }
}

run().catch((error) => {
  console.error("All role section check failed.");
  console.error(error.message || error);
  process.exit(1);
});
