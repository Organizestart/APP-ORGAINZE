import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { performance } from "node:perf_hooks";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";
import { safePreviewAccounts } from "../src/SafePreviewAccounts.js";

const storage = new Map();
const mainStorageKey = "workforce-command-center-v9";
const safePreviewStorageKey = "workforce-command-center-safe-preview-v1";

function installBrowserStubs(search) {
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
    locationReloaded: false,
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
    throw new Error(`${screen} missing: ${missing.join(", ")}`);
  }
}

function assertExcludes(html, labels, screen) {
  const present = labels.filter((label) => html.includes(label));
  if (present.length) {
    throw new Error(`${screen} should not show: ${present.join(", ")}`);
  }
}

async function renderScreen(server, search) {
  installBrowserStubs(search);
  const start = performance.now();
  const module = await server.ssrLoadModule("/src/MainWorkForceApp.jsx");
  const html = renderToStaticMarkup(React.createElement(module.App));
  return { html, ms: Math.round(performance.now() - start) };
}

async function run() {
  if (safePreviewAccounts.length !== 10) {
    throw new Error(`Safe preview should have 10 test accounts, found ${safePreviewAccounts.length}`);
  }
  storage.set(mainStorageKey, JSON.stringify({ settingsProfile: { displayName: "Main Workspace Marker" } }));
  storage.set(safePreviewStorageKey, JSON.stringify({ settingsProfile: { displayName: "Safe Preview Marker" } }));
  const appSource = await readFile("src/MainWorkForceApp.jsx", "utf8");
  assertIncludes(appSource, ["function preserveSafeChangePreview", "params.set(\"preview\", \"safe-change\")"], "Safe preview URL preservation");

  const server = await createServer({
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });

  try {
    const normal = await renderScreen(server, "?role=owner&section=owner-dashboard");
    assertIncludes(normal.html, ["Coverage Today", "Daily Operations"], "Normal owner dashboard");
    assertExcludes(normal.html, ["Safe Change Preview", "Command Review"], "Normal owner dashboard");

    const previewRoutes = [
      {
        name: "Owner safe preview",
        search: "?preview=safe-change&role=owner&section=owner-dashboard",
        includes: ["Safe Change Preview", "Testing copy only", "10 test accounts and linked flows", "Coverage Today", "Daily Operations"],
        excludes: ["Command Review"],
      },
      {
        name: "Manager safe preview",
        search: "?preview=safe-change&role=manager&section=manager-dashboard",
        includes: ["Safe Change Preview", "Manager and employee test paths", "Manager Coverage Board", "Team Handoff"],
        excludes: ["Billing Seats", "Settings & Billing", "Command Review"],
      },
      {
        name: "Employee safe preview",
        search: "?preview=safe-change&role=employee&section=employee-dashboard",
        includes: ["Safe Change Preview", "Employee-only test paths", "Next shift", "Shift Readiness"],
        excludes: ["Manager Actions", "Billing Seats", "Command Review", "10 test accounts and linked flows"],
      },
    ];

    const results = [];
    for (const route of previewRoutes) {
      const rendered = await renderScreen(server, route.search);
      assertIncludes(rendered.html, route.includes, route.name);
      assertExcludes(rendered.html, route.excludes, route.name);
      if (rendered.ms > 2500) {
        throw new Error(`${route.name} rendered too slowly: ${rendered.ms}ms`);
      }
      results.push({ name: route.name, renderMs: rendered.ms });
    }

    console.log(JSON.stringify({
      safeChangePreview: "passed",
      testAccounts: safePreviewAccounts.length,
      mainStorageProtected: storage.has(mainStorageKey),
      previewStorageAvailable: storage.has(safePreviewStorageKey),
      screens: results,
    }, null, 2));
  } finally {
    await server.close();
  }
}

run().catch((error) => {
  console.error("Safe change preview check failed.");
  console.error(error.message || error);
  process.exit(1);
});
