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

function visibleTextFromHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<svg[\s\S]*?<\/svg>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function assertNoBadText(html, screen) {
  const text = visibleTextFromHtml(html);
  const badMarkers = ["undefined", "NaN", "[object Object]"];
  const foundMarker = badMarkers.find((marker) => text.includes(marker));
  if (foundMarker) throw new Error(`${screen} shows bad text marker: ${foundMarker}`);

  const longTokens = text
    .split(/\s+/)
    .map((token) => token.replace(/^[^\w@#]+|[^\w@#]+$/g, ""))
    .filter(Boolean)
    .filter((token) => token.length > 44)
    .filter((token) => !token.includes("@"))
    .filter((token) => !token.startsWith("http"))
    .filter((token) => !/^GV-[A-Z]+-\d+$/.test(token))
    .filter((token) => !/^\d{2}\/\d{2}\/\d{4}$/.test(token));

  if (longTokens.length) {
    throw new Error(`${screen} has long unbroken visible text: ${Array.from(new Set(longTokens)).slice(0, 5).join(", ")}`);
  }
}

function countMatches(source, pattern) {
  return source.match(new RegExp(pattern, "g"))?.length || 0;
}

function assertCssVisualGuards(css) {
  const requiredSelectors = [
    ".schedule-board-toolbar",
    ".coverage-candidate-row",
    ".owner-dashboard-lower-grid",
    ".safe-change-preview-mode .owner-dashboard-lower-grid",
    ".team-chat-shell",
    ".settings-grid",
    ".event-row",
    ".time-clock-layout",
    ".employee-phone-shell",
  ];
  const missingSelectors = requiredSelectors.filter((selector) => !css.includes(selector));
  if (missingSelectors.length) throw new Error(`Missing visual containment selectors: ${missingSelectors.join(", ")}`);

  const checks = [
    ["min-width: 0", countMatches(css, "min-width: 0"), 35],
    ["text-overflow: ellipsis", countMatches(css, "text-overflow: ellipsis"), 25],
    ["overflow-wrap: anywhere", countMatches(css, "overflow-wrap: anywhere"), 6],
    ["overflow-y: auto", countMatches(css, "overflow-y: auto"), 10],
  ];
  const failures = checks.filter(([, count, minimum]) => count < minimum);
  if (failures.length) {
    throw new Error(`Visual CSS guard count too low: ${failures.map(([label, count, minimum]) => `${label} ${count}/${minimum}`).join(", ")}`);
  }
}

async function renderScreen(server, search) {
  installBrowserStubs(search);
  const module = await server.ssrLoadModule("/src/MainWorkForceApp.jsx");
  return renderToStaticMarkup(React.createElement(module.App));
}

async function run() {
  const css = await readFile("src/AppDesign.css", "utf8");
  assertCssVisualGuards(css);

  const server = await createServer({
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });

  const routes = [
    ["Owner dashboard", "?preview=safe-change&role=owner&section=owner-dashboard&date=2026-06-24"],
    ["Owner schedule", "?preview=safe-change&role=owner&section=owner-schedule&date=2026-06-24"],
    ["Owner team", "?preview=safe-change&role=owner&section=owner-team&date=2026-06-24"],
    ["Owner settings", "?preview=safe-change&role=owner&section=owner-settings&date=2026-06-24"],
    ["Owner events", "?preview=safe-change&role=owner&section=owner-events&date=2026-06-24"],
    ["Owner time", "?preview=safe-change&role=owner&section=owner-time&date=2026-06-24"],
    ["Manager dashboard", "?preview=safe-change&role=manager&section=manager-dashboard&account=preview-manager-jordan&date=2026-06-24"],
    ["Manager schedule", "?preview=safe-change&role=manager&section=manager-schedule&account=preview-manager-jordan&date=2026-06-24"],
    ["Employee dashboard", "?preview=safe-change&role=employee&section=employee-dashboard&account=preview-employee-ava&date=2026-06-24"],
    ["Employee messages", "?preview=safe-change&role=employee&section=employee-messages&account=preview-employee-ava&date=2026-06-24"],
    ["Signed out", "?signedOut=true"],
    ["Platform admin", "?role=platform-admin&section=admin-command-review"],
  ];

  try {
    const checked = [];
    for (const [name, search] of routes) {
      const html = await renderScreen(server, search);
      assertNoBadText(html, name);
      checked.push(name);
    }

    console.log(JSON.stringify({
      visualSafety: "passed",
      screens: checked.length,
      cssGuards: "present",
      checked,
    }, null, 2));
  } finally {
    await server.close();
  }
}

run().catch((error) => {
  console.error("Visual safety check failed.");
  console.error(error.message || error);
  process.exit(1);
});
