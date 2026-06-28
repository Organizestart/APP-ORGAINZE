import { access, readFile } from "node:fs/promises";
import {
  safePreviewAccounts,
  safePreviewInviteRecords,
  safePreviewTeamAccounts,
} from "../src/safe-preview-test-accounts.js";

const requiredFiles = [
  "ARCHITECTURE_MAP.md",
  "FILE_GUIDE.md",
  "src/start-the-app.jsx",
  "src/protect-from-blank-screen.jsx",
  "src/workforce-app-screens.jsx",
  "src/dashboard-next-actions.jsx",
  "src/app-look-and-layout.css",
  "src/who-can-open-what.js",
  "src/repair-saved-app-data.js",
  "src/safe-preview-test-accounts.js",
  "src/connect-to-supabase.js",
  "server/protected-admin-review-service.mjs",
  "scripts/check-architecture-boundaries.mjs",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fileExists(path) {
  await access(path);
  return path;
}

async function read(path) {
  return readFile(path, "utf8");
}

function assertIncludes(source, needles, label) {
  const missing = needles.filter((needle) => !source.includes(needle));
  assert(!missing.length, `${label} missing: ${missing.join(", ")}`);
}

function lineCount(source) {
  return source.split("\n").length;
}

async function run() {
  await Promise.all(requiredFiles.map(fileExists));
  const [
    architectureMap,
    fileGuide,
    packageJson,
    startApp,
    mainApp,
    dashboardActionPath,
    roleRules,
    stateRecovery,
    safePreviewAccountsSource,
    supabaseConnection,
    crashShield,
  ] = await Promise.all([
    read("ARCHITECTURE_MAP.md"),
    read("FILE_GUIDE.md"),
    read("package.json"),
    read("src/start-the-app.jsx"),
    read("src/workforce-app-screens.jsx"),
    read("src/dashboard-next-actions.jsx"),
    read("src/who-can-open-what.js"),
    read("src/repair-saved-app-data.js"),
    read("src/safe-preview-test-accounts.js"),
    read("src/connect-to-supabase.js"),
    read("src/protect-from-blank-screen.jsx"),
  ]);

  assertIncludes(fileGuide, requiredFiles, "FILE_GUIDE.md");
  assertIncludes(architectureMap, [
    "Role access",
    "Saved-data recovery",
    "Safe test accounts",
    "Admin review service",
    "Safety Checks",
    "Scaling Rules",
  ], "ARCHITECTURE_MAP.md");
  assertIncludes(startApp, [
    'import { App } from "./workforce-app-screens.jsx"',
    'import { BlankScreenSafety } from "./protect-from-blank-screen.jsx"',
    'import "./app-look-and-layout.css"',
    "<BlankScreenSafety>",
    "<App />",
  ], "src/start-the-app.jsx");
  assertIncludes(mainApp, [
    'from "./dashboard-next-actions.jsx"',
    'from "./who-can-open-what.js"',
    'from "./repair-saved-app-data.js"',
    'from "./safe-preview-test-accounts.js"',
    'from "./connect-to-supabase.js"',
    "repairWorkspaceState",
    "safeSectionFromRules",
    "sectionIdsFromRules",
  ], "src/workforce-app-screens.jsx");
  assertIncludes(dashboardActionPath, [
    "DashboardNextSteps",
    "dashboard-action-path",
    "data-home-target",
  ], "src/dashboard-next-actions.jsx");
  assertIncludes(roleRules, [
    "firstSectionByRole",
    "sectionIdsForRole",
    "canRoleAccessSection",
    "safeSectionForRole",
    "runtimeRoleForSection",
    "platform-admin",
  ], "src/who-can-open-what.js");
  assertIncludes(stateRecovery, [
    "repairWorkspaceState",
    "migrateLegacyLocationCopy",
    "safeArray",
    "safeObject",
  ], "src/repair-saved-app-data.js");
  assertIncludes(safePreviewAccountsSource, [
    "safePreviewAccounts",
    "safePreviewAccountUrl",
    "safePreviewFlowChecks",
    "safePreviewInviteRecords",
    "safePreviewTeamAccounts",
  ], "src/safe-preview-test-accounts.js");
  assertIncludes(supabaseConnection, [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
    "createClient",
  ], "src/connect-to-supabase.js");
  assertIncludes(crashShield, [
    "BlankScreenSafety",
    "componentDidCatch",
    "This change needs review",
    "Open Safe Preview",
  ], "src/protect-from-blank-screen.jsx");
  assertIncludes(packageJson, [
    '"architecture-boundaries:smoke": "node scripts/check-architecture-boundaries.mjs"',
    "npm run architecture-boundaries:smoke",
  ], "package.json");

  assert(safePreviewAccounts.length === 10, `Expected 10 safe preview accounts, found ${safePreviewAccounts.length}.`);
  assert(safePreviewTeamAccounts().length === 9, "Safe preview team accounts should exclude the owner.");
  assert(safePreviewInviteRecords().length === 9, "Safe preview invite records should match manager and employee accounts.");
  assert(lineCount(mainApp) <= 13000, `src/workforce-app-screens.jsx is ${lineCount(mainApp)} lines. Extract another stable rule set before adding more large screens.`);

  console.log(JSON.stringify({
    architectureBoundaries: "passed",
    filesChecked: requiredFiles.length,
    previewAccounts: safePreviewAccounts.length,
    mainAppLines: lineCount(mainApp),
    protectedBoundaries: [
      "role access rules",
      "saved-data recovery",
      "safe preview accounts",
      "Supabase connection",
      "crash shield",
      "platform-admin command service",
    ],
  }, null, 2));
}

run().catch((error) => {
  console.error("Architecture boundary check failed.");
  console.error(error.message || error);
  process.exit(1);
});
