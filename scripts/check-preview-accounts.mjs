import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { safePreviewAccounts, safePreviewAccountUrl } from "../src/SafePreviewAccounts.js";

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
  if (present.length) throw new Error(`${screen} shows restricted content: ${present.join(", ")}`);
}

async function renderAccount(server, account) {
  const url = safePreviewAccountUrl(account, "2026-06-24");
  installBrowserStubs(url.replace("/", ""));
  const module = await server.ssrLoadModule("/src/MainWorkForceApp.jsx");
  return renderToStaticMarkup(React.createElement(module.App));
}

async function run() {
  if (safePreviewAccounts.length !== 10) {
    throw new Error(`Expected 10 safe preview accounts, found ${safePreviewAccounts.length}`);
  }
  const roleCounts = safePreviewAccounts.reduce((counts, account) => {
    counts[account.role] = (counts[account.role] || 0) + 1;
    return counts;
  }, {});
  if (roleCounts.owner !== 1 || roleCounts.manager !== 3 || roleCounts.employee !== 6) {
    throw new Error(`Unexpected role mix: ${JSON.stringify(roleCounts)}`);
  }

  const server = await createServer({
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });

  try {
    const results = [];
    for (const account of safePreviewAccounts) {
      const html = await renderAccount(server, account);
      assertIncludes(html, ["Safe Change Preview", account.name], account.name);
      if (account.role === "owner") {
        assertIncludes(html, ["10 test accounts and linked flows", "Daily Operations", "Open Report"], account.name);
        assertExcludes(html, ["Command Review"], account.name);
      }
      if (account.role === "manager") {
        assertIncludes(html, ["Manager and employee test paths", "Manager Coverage Board"], account.name);
        assertExcludes(html, ["Settings & Billing", "Reports", "Delete Workspace", "Command Review"], account.name);
      }
      if (account.role === "employee") {
        assertIncludes(html, ["Employee-only test paths", "Shift Readiness"], account.name);
        assertExcludes(html, ["Manager Actions", "Settings & Billing", "Reports", "Invite code", "Command Review"], account.name);
      }
      results.push({ account: account.name, role: account.role, status: "passed" });
    }

    console.log(JSON.stringify({ previewAccountFlows: "passed", roleCounts, accounts: results }, null, 2));
  } finally {
    await server.close();
  }
}

run().catch((error) => {
  console.error("Preview account flow check failed.");
  console.error(error.message || error);
  process.exit(1);
});
