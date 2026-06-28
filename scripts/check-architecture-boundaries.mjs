import { access, readFile } from "node:fs/promises";
import {
  safePreviewAccounts,
  safePreviewInviteRecords,
  safePreviewTeamAccounts,
} from "../src/SafePreviewAccounts.js";

const requiredFiles = [
  "ARCHITECTURE_MAP.md",
  "FILE_GUIDE.md",
  "src/AppStartsHere.jsx",
  "src/BlankScreenSafety.jsx",
  "src/AllWorkForceScreens.jsx",
  "src/DashboardNextSteps.jsx",
  "src/AppVisualDesign.css",
  "src/RoleAccessRules.js",
  "src/FixSavedAppData.js",
  "src/SafePreviewAccounts.js",
  "src/lib/DatabaseConnection.js",
  "server/PlatformAdminReviewService.mjs",
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
    read("src/AppStartsHere.jsx"),
    read("src/AllWorkForceScreens.jsx"),
    read("src/DashboardNextSteps.jsx"),
    read("src/RoleAccessRules.js"),
    read("src/FixSavedAppData.js"),
    read("src/SafePreviewAccounts.js"),
    read("src/lib/DatabaseConnection.js"),
    read("src/BlankScreenSafety.jsx"),
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
    'import { App } from "./AllWorkForceScreens.jsx"',
    'import { BlankScreenSafety } from "./BlankScreenSafety.jsx"',
    'import "./AppVisualDesign.css"',
    "<BlankScreenSafety>",
    "<App />",
  ], "src/AppStartsHere.jsx");
  assertIncludes(mainApp, [
    'from "./DashboardNextSteps.jsx"',
    'from "./RoleAccessRules.js"',
    'from "./FixSavedAppData.js"',
    'from "./SafePreviewAccounts.js"',
    'from "./lib/DatabaseConnection.js"',
    "repairWorkspaceState",
    "safeSectionFromRules",
    "sectionIdsFromRules",
  ], "src/AllWorkForceScreens.jsx");
  assertIncludes(dashboardActionPath, [
    "DashboardNextSteps",
    "dashboard-action-path",
    "data-home-target",
  ], "src/DashboardNextSteps.jsx");
  assertIncludes(roleRules, [
    "firstSectionByRole",
    "sectionIdsForRole",
    "canRoleAccessSection",
    "safeSectionForRole",
    "runtimeRoleForSection",
    "platform-admin",
  ], "src/RoleAccessRules.js");
  assertIncludes(stateRecovery, [
    "repairWorkspaceState",
    "migrateLegacyLocationCopy",
    "safeArray",
    "safeObject",
  ], "src/FixSavedAppData.js");
  assertIncludes(safePreviewAccountsSource, [
    "safePreviewAccounts",
    "safePreviewAccountUrl",
    "safePreviewFlowChecks",
    "safePreviewInviteRecords",
    "safePreviewTeamAccounts",
  ], "src/SafePreviewAccounts.js");
  assertIncludes(supabaseConnection, [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
    "createClient",
  ], "src/lib/DatabaseConnection.js");
  assertIncludes(crashShield, [
    "BlankScreenSafety",
    "componentDidCatch",
    "This change needs review",
    "Open Safe Preview",
  ], "src/BlankScreenSafety.jsx");
  assertIncludes(packageJson, [
    '"architecture-boundaries:smoke": "node scripts/check-architecture-boundaries.mjs"',
    "npm run architecture-boundaries:smoke",
  ], "package.json");

  assert(safePreviewAccounts.length === 10, `Expected 10 safe preview accounts, found ${safePreviewAccounts.length}.`);
  assert(safePreviewTeamAccounts().length === 9, "Safe preview team accounts should exclude the owner.");
  assert(safePreviewInviteRecords().length === 9, "Safe preview invite records should match manager and employee accounts.");
  assert(lineCount(mainApp) <= 13000, `src/AllWorkForceScreens.jsx is ${lineCount(mainApp)} lines. Extract another stable rule set before adding more large screens.`);

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
