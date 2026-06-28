import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import {
  safePreviewAccounts,
  safePreviewAccountUrl,
  safePreviewFlowChecks,
  safePreviewInviteRecords,
  safePreviewTeamAccounts,
} from "../src/safe-preview-test-accounts.js";

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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(html, labels, screen) {
  const missing = labels.filter((label) => !html.includes(label));
  if (missing.length) throw new Error(`${screen} missing: ${missing.join(", ")}`);
}

function assertExcludes(html, labels, screen) {
  const present = labels.filter((label) => html.includes(label));
  if (present.length) throw new Error(`${screen} should not show: ${present.join(", ")}`);
}

async function renderScreen(server, search) {
  installBrowserStubs(search);
  const module = await server.ssrLoadModule("/src/workforce-app-screens.jsx");
  return renderToStaticMarkup(React.createElement(module.App));
}

function assertPreviewAccountContracts() {
  assert(safePreviewAccounts.length === 10, `Expected 10 preview accounts, found ${safePreviewAccounts.length}.`);
  const ids = new Set();
  const emails = new Set();
  const roleCounts = { owner: 0, manager: 0, employee: 0 };
  safePreviewAccounts.forEach((account) => {
    assert(!ids.has(account.id), `Duplicate preview account id: ${account.id}`);
    assert(!emails.has(account.email), `Duplicate preview account email: ${account.email}`);
    assert(["owner", "manager", "employee"].includes(account.role), `Unknown preview account role: ${account.role}`);
    assert(account.startSection?.startsWith(account.role === "owner" ? "owner-" : account.role === "manager" ? "manager-" : "employee-"), `${account.name} start section does not match role.`);
    const url = safePreviewAccountUrl(account);
    assert(url.includes("preview=safe-change"), `${account.name} URL does not open safe preview.`);
    assert(url.includes(`role=${account.role}`), `${account.name} URL does not include role.`);
    assert(url.includes(`account=${account.id}`), `${account.name} URL does not include account id.`);
    ids.add(account.id);
    emails.add(account.email);
    roleCounts[account.role] += 1;
  });
  assert(roleCounts.owner === 1, `Expected 1 owner preview account, found ${roleCounts.owner}.`);
  assert(roleCounts.manager === 3, `Expected 3 manager preview accounts, found ${roleCounts.manager}.`);
  assert(roleCounts.employee === 6, `Expected 6 employee preview accounts, found ${roleCounts.employee}.`);

  const teamAccounts = safePreviewTeamAccounts();
  assert(teamAccounts.length === 9, `Expected 9 team accounts excluding owner, found ${teamAccounts.length}.`);
  assert(teamAccounts.every((account) => account.role !== "owner"), "Team account seed should not include owner.");

  const invites = safePreviewInviteRecords();
  assert(invites.length === 9, `Expected 9 preview invite records, found ${invites.length}.`);
  invites.forEach((invite) => {
    const account = safePreviewAccounts.find((item) => item.email === invite.email);
    assert(account, `Invite has no matching account: ${invite.email}`);
    assert(account.role === invite.targetRole, `Invite target role mismatch for ${invite.email}.`);
    assert(invite.code.startsWith(account.role === "manager" ? "GV-MGR-" : "GV-EMP-"), `Invite code prefix mismatch for ${invite.email}.`);
    assert(["accepted", "pending"].includes(invite.status), `Unexpected invite status for ${invite.email}: ${invite.status}`);
  });

  const authFlow = safePreviewFlowChecks.find((flow) => flow.id === "auth");
  assert(authFlow?.owner.includes("invite"), "Auth flow should describe owner invite behavior.");
  assert(authFlow?.manager.includes("employees only"), "Auth flow should describe manager employee-only invite behavior.");
  assert(authFlow?.employee.includes("Use code"), "Auth flow should describe employee code behavior.");
}

async function run() {
  assertPreviewAccountContracts();

  const server = await createServer({
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });

  try {
    const signedOut = await renderScreen(server, "?signedOut=true");
    assertIncludes(signedOut, ["Sign in to your workspace", "Log in", "Sign up", "Use email", "Forgot password?", "Create account"], "signed-out access screen");
    assertExcludes(signedOut, ["Sign in as Owner", "Manager Dashboard", "Employee Section", "Command Review Center"], "signed-out access screen");

    const module = await server.ssrLoadModule("/src/workforce-app-screens.jsx");
    const runAction = module.runWorkflowActionForTest;
    assert(typeof runAction === "function", "Workflow action test runner is not exported.");
    const inviteResult = runAction("create-invite", {
      role: "manager",
      form: {
        name: "Manager Tried Manager Invite",
        email: "manager.tried.manager@workforce.test",
        targetRole: "manager",
        locationId: "downtown",
        verification: "email",
        note: "Account access smoke test.",
      },
    });
    const newestInvite = inviteResult.data.teamInvites[0];
    assert(newestInvite.targetRole === "employee", "Manager-created invite should be limited to employee role.");
    assert(newestInvite.code.startsWith("GV-EMP-"), "Manager-created employee invite should use employee code prefix.");
    assert(inviteResult.data.auditLog[0]?.action === "invite.created", "Invite creation should add an audit entry.");

    const owner = safePreviewAccounts.find((account) => account.role === "owner");
    const manager = safePreviewAccounts.find((account) => account.role === "manager");
    const employee = safePreviewAccounts.find((account) => account.role === "employee");
    const ownerHtml = await renderScreen(server, safePreviewAccountUrl(owner).slice(1));
    assertIncludes(ownerHtml, ["Safe Change Preview", "10 test accounts and linked flows", owner.name], "owner preview account link");
    const managerHtml = await renderScreen(server, safePreviewAccountUrl(manager).slice(1));
    assertIncludes(managerHtml, ["Safe Change Preview", "Manager and employee test paths", manager.name], "manager preview account link");
    assertExcludes(managerHtml, ["Settings &amp; Billing", "Report Builder"], "manager preview account link");
    const employeeHtml = await renderScreen(server, safePreviewAccountUrl(employee).slice(1));
    assertIncludes(employeeHtml, ["Safe Change Preview", "Employee-only test paths", employee.name], "employee preview account link");
    assertExcludes(employeeHtml, ["Manager Actions", "Invite system", "Settings &amp; Billing"], "employee preview account link");

    console.log(JSON.stringify({
      accountAccessFlow: "passed",
      previewAccounts: safePreviewAccounts.length,
      teamAccounts: safePreviewTeamAccounts().length,
      inviteRecords: safePreviewInviteRecords().length,
      checks: [
        "signed-out screen stays neutral",
        "preview account URLs are linked and role-safe",
        "manager-created invite is limited to employee role",
        "auth flow copy covers invite/code/recovery path",
      ],
    }, null, 2));
  } finally {
    await server.close();
  }
}

run().catch((error) => {
  console.error("Account access flow check failed.");
  console.error(error.message || error);
  process.exit(1);
});
