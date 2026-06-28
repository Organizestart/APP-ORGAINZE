import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";

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

function assertIncludes(source, labels, area) {
  const missing = labels.filter((label) => !source.includes(label));
  if (missing.length) throw new Error(`${area} missing: ${missing.join(", ")}`);
}

function assertExcludes(source, labels, area) {
  const present = labels.filter((label) => source.includes(label));
  if (present.length) throw new Error(`${area} should not include: ${present.join(", ")}`);
}

async function renderScreen(server, search) {
  installBrowserStubs(search);
  const module = await server.ssrLoadModule("/src/workforce-app-screens.jsx");
  return renderToStaticMarkup(React.createElement(module.App));
}

async function run() {
  const appSource = await readFile("src/workforce-app-screens.jsx", "utf8");
  const cssSource = await readFile("src/app-look-and-layout.css", "utf8");

  assertIncludes(appSource, ["<details className=\"safe-preview-test-lab\">", "safe-preview-lab-body"], "Safe preview compact lab");
  assertIncludes(appSource, ["safe-change-preview-mode"], "Safe preview shell marker");
  assertExcludes(cssSource, [".safe-preview-lab-head"], "Removed old always-open preview lab header");
  assertIncludes(cssSource, [
    ".safe-change-preview-mode .owner-dashboard-lower-grid {\n  grid-template-columns: repeat(2, minmax(360px, 1fr));",
    ".safe-change-preview-mode .owner-dashboard-lower-grid .owner-ops-panel {\n  grid-column: 1 / -1;",
    ".safe-change-preview-mode .owner-dashboard-lower-grid .owner-decision-summary {\n  grid-template-columns: 44px minmax(0, 1fr);",
    ".safe-change-preview-mode .owner-dashboard-lower-grid .owner-decision-summary > .status",
  ], "Owner dashboard containment CSS");

  const server = await createServer({
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });

  try {
    const owner = await renderScreen(server, "?preview=safe-change&role=owner&section=owner-dashboard&account=preview-owner-maya&date=2026-06-24");
    const manager = await renderScreen(server, "?preview=safe-change&role=manager&section=manager-dashboard&account=preview-manager-jordan&date=2026-06-24");

    assertIncludes(owner, ["safe-change-preview-mode", "Safe Change Preview", "Daily Operations", "Business Health", "Managers on Duty", "<details class=\"safe-preview-test-lab\">"], "Owner dashboard render");
    assertExcludes(owner, ["Command Review"], "Owner dashboard role boundary");
    assertIncludes(manager, ["Safe Change Preview", "Manager Coverage Board", "Manager Actions", "Team Handoff", "<details class=\"safe-preview-test-lab\">"], "Manager dashboard render");
    assertExcludes(manager, ["Settings & Billing", "Billing Seats", "Command Review"], "Manager dashboard role boundary");

    console.log(JSON.stringify({
      dashboardLayout: "passed",
      safePreviewLab: "compact details panel",
      ownerLowerGrid: "two roomy columns with daily operations full width",
      roleBoundaries: "owner and manager dashboards checked",
    }, null, 2));
  } finally {
    await server.close();
  }
}

run().catch((error) => {
  console.error("Dashboard layout check failed.");
  console.error(error.message || error);
  process.exit(1);
});
