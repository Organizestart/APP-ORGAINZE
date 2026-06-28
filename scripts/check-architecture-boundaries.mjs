import { access, readFile } from "node:fs/promises";
import {
  safePreviewAccounts,
  safePreviewInviteRecords,
  safePreviewTeamAccounts,
} from "../src/PreviewTestAccounts.js";

const requiredFiles = [
  "ARCHITECTURE_MAP.md",
  "FILE_GUIDE.md",
  "src/StartApp.jsx",
  "src/CrashProtectionScreen.jsx",
  "src/WorkForceAppScreens.jsx",
  "src/DashboardActionPath.jsx",
  "src/WorkForceScreenDesign.css",
  "src/RolePermissionRules.js",
  "src/SavedDataRepairRules.js",
  "src/PreviewTestAccounts.js",
  "src/lib/SupabaseConnection.js",
  "server/AdminCommandReviewServer.mjs",
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
    read("src/StartApp.jsx"),
    read("src/WorkForceAppScreens.jsx"),
    read("src/DashboardActionPath.jsx"),
    read("src/RolePermissionRules.js"),
    read("src/SavedDataRepairRules.js"),
    read("src/PreviewTestAccounts.js"),
    read("src/lib/SupabaseConnection.js"),
    read("src/CrashProtectionScreen.jsx"),
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
    'import { App } from "./WorkForceAppScreens.jsx"',
    'import { CrashProtectionScreen } from "./CrashProtectionScreen.jsx"',
    'import "./WorkForceScreenDesign.css"',
    "<CrashProtectionScreen>",
    "<App />",
  ], "src/StartApp.jsx");
  assertIncludes(mainApp, [
    'from "./DashboardActionPath.jsx"',
    'from "./RolePermissionRules.js"',
    'from "./SavedDataRepairRules.js"',
    'from "./PreviewTestAccounts.js"',
    'from "./lib/SupabaseConnection.js"',
    "repairWorkspaceState",
    "safeSectionFromRules",
    "sectionIdsFromRules",
  ], "src/WorkForceAppScreens.jsx");
  assertIncludes(dashboardActionPath, [
    "DashboardActionPath",
    "dashboard-action-path",
    "data-home-target",
  ], "src/DashboardActionPath.jsx");
  assertIncludes(roleRules, [
    "firstSectionByRole",
    "sectionIdsForRole",
    "canRoleAccessSection",
    "safeSectionForRole",
    "runtimeRoleForSection",
    "platform-admin",
  ], "src/RolePermissionRules.js");
  assertIncludes(stateRecovery, [
    "repairWorkspaceState",
    "migrateLegacyLocationCopy",
    "safeArray",
    "safeObject",
  ], "src/SavedDataRepairRules.js");
  assertIncludes(safePreviewAccountsSource, [
    "safePreviewAccounts",
    "safePreviewAccountUrl",
    "safePreviewFlowChecks",
    "safePreviewInviteRecords",
    "safePreviewTeamAccounts",
  ], "src/PreviewTestAccounts.js");
  assertIncludes(supabaseConnection, [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
    "createClient",
  ], "src/lib/SupabaseConnection.js");
  assertIncludes(crashShield, [
    "CrashProtectionScreen",
    "componentDidCatch",
    "This change needs review",
    "Open Safe Preview",
  ], "src/CrashProtectionScreen.jsx");
  assertIncludes(packageJson, [
    '"architecture-boundaries:smoke": "node scripts/check-architecture-boundaries.mjs"',
    "npm run architecture-boundaries:smoke",
  ], "package.json");

  assert(safePreviewAccounts.length === 10, `Expected 10 safe preview accounts, found ${safePreviewAccounts.length}.`);
  assert(safePreviewTeamAccounts().length === 9, "Safe preview team accounts should exclude the owner.");
  assert(safePreviewInviteRecords().length === 9, "Safe preview invite records should match manager and employee accounts.");
  assert(lineCount(mainApp) <= 13000, `src/WorkForceAppScreens.jsx is ${lineCount(mainApp)} lines. Extract another stable rule set before adding more large screens.`);

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
