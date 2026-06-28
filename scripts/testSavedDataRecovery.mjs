import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { repairWorkspaceState } from "../src/StateRecoveryRules.js";

const storage = new Map();
const mainStorageKey = "workforce-command-center-v9";
const safePreviewStorageKey = "workforce-command-center-safe-preview-v1";

function installBrowserStubs(search, entries = {}) {
  storage.clear();
  Object.entries(entries).forEach(([key, value]) => storage.set(key, value));
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function renderScreen(server, search, entries = {}) {
  installBrowserStubs(search, entries);
  const module = await server.ssrLoadModule("/src/MainWorkForceApp.jsx");
  return renderToStaticMarkup(React.createElement(module.App));
}

async function run() {
  const repaired = repairWorkspaceState({
    requests: "broken",
    shifts: null,
    businessSetup: { managerCoverage: "owner" },
    settingsProfile: { displayName: "Recovered Workspace" },
    messages: [{ id: "custom-message" }],
  }, {
    baseState: {
      requests: [{ id: "request-fallback" }],
      shifts: [{ id: "shift-fallback" }],
      messages: [],
      billing: { plan: "Fallback" },
      datePlans: {},
    },
    defaultBusinessSetup: { managerCoverage: "managers", locationScope: "multi", primaryLocationId: "main" },
    defaultSettingsProfile: { displayName: "Default Workspace" },
    defaultWorkspaceHours: {},
    defaultInvoiceContact: {},
    defaultSecuritySettings: {},
    defaultNotificationSettings: {},
    defaultScheduleOps: {},
    defaultTimeClock: {},
  });
  assert(repaired.requests[0].id === "request-fallback", "State recovery did not repair bad request arrays.");
  assert(repaired.shifts[0].id === "shift-fallback", "State recovery did not repair bad shift arrays.");
  assert(repaired.businessSetup.managerCoverage === "owner", "State recovery did not preserve safe business setup values.");
  assert(repaired.settingsProfile.displayName === "Recovered Workspace", "State recovery did not preserve safe profile values.");
  assert(repaired.messages[0].id === "custom-message", "State recovery replaced a valid array.");

  const server = await createServer({
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });

  try {
    const brokenMain = await renderScreen(server, "?role=owner&section=owner-dashboard", {
      [mainStorageKey]: "{not valid json",
    });
    assertIncludes(brokenMain, ["Daily Operations", "Coverage Today"], "broken main saved data");
    assertExcludes(brokenMain, ["Safe Change Preview", "Command Review Center"], "broken main saved data");

    const partialState = JSON.stringify({
      settingsProfile: { displayName: "Partial Recovery Workspace" },
      messages: "not an array",
      requests: "not an array",
      shifts: [],
      timeEntries: null,
      reportSnapshots: "not an array",
      businessSetup: { managerCoverage: "owner", locationScope: "single", primaryLocationId: "downtown" },
    });
    const ownerPartial = await renderScreen(server, "?role=owner&section=owner-manager-dashboard&date=2026-06-24", {
      [mainStorageKey]: partialState,
    });
    assertIncludes(ownerPartial, ["Owner Manager Board", "Manager Actions"], "partial owner-manager saved data");
    assertExcludes(ownerPartial, ["Command Review Center"], "partial owner-manager saved data");

    const managerPartial = await renderScreen(server, "?role=manager&section=manager-dashboard&date=2026-06-24", {
      [mainStorageKey]: partialState,
    });
    assertIncludes(managerPartial, ["Manager Coverage Board", "Manager Actions"], "partial manager saved data");
    assertExcludes(managerPartial, ["Settings &amp; Billing", "Report Builder"], "partial manager saved data");

    const employeePartial = await renderScreen(server, "?role=employee&section=employee-dashboard&date=2026-06-24", {
      [mainStorageKey]: partialState,
    });
    assertIncludes(employeePartial, ["Next shift", "Shift Readiness"], "partial employee saved data");
    assertExcludes(employeePartial, ["Manager Actions", "Invite system"], "partial employee saved data");

    const badSafePreview = await renderScreen(server, "?preview=safe-change&role=owner&section=owner-dashboard", {
      [mainStorageKey]: JSON.stringify({ settingsProfile: { displayName: "Main Data Marker" } }),
      [safePreviewStorageKey]: "{broken safe preview json",
    });
    assertIncludes(badSafePreview, ["Safe Change Preview", "10 test accounts and linked flows", "Daily Operations"], "broken safe preview saved data");
    assertExcludes(badSafePreview, ["Command Review Center"], "broken safe preview saved data");

    const mainValue = JSON.stringify({ settingsProfile: { displayName: "Main data should stay untouched" } });
    await renderScreen(server, "?preview=safe-change&role=manager&section=manager-dashboard", {
      [mainStorageKey]: mainValue,
      [safePreviewStorageKey]: JSON.stringify({
        settingsProfile: { displayName: "Safe recovery workspace" },
        teamAccounts: null,
        teamInvites: "not an array",
        safePreviewAccounts: [],
      }),
    });
    if (storage.get(mainStorageKey) !== mainValue) {
      throw new Error("Safe preview render changed main saved data.");
    }

    console.log(JSON.stringify({
      savedDataRecovery: "passed",
      scenarios: [
        "direct recovery rule repair",
        "broken main saved data",
        "partial owner-manager saved data",
        "partial manager saved data",
        "partial employee saved data",
        "broken safe preview saved data",
        "safe preview keeps main data untouched",
      ],
    }, null, 2));
  } finally {
    await server.close();
  }
}

run().catch((error) => {
  console.error("Saved data recovery check failed.");
  console.error(error.message || error);
  process.exit(1);
});
