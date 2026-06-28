import { access, readFile } from "node:fs/promises";
import {
  safePreviewAccounts,
  safePreviewInviteRecords,
  safePreviewTeamAccounts,
} from "../src/SafePreviewAccounts.js";

const requiredFiles = [
  "ARCHITECTURE_MAP.md",
  "FILE_GUIDE.md",
  "src/StartApp.jsx",
  "src/SafeChangeShield.jsx",
  "src/MainWorkForceApp.jsx",
  "src/AppDesign.css",
  "src/RoleAccessRules.js",
  "src/StateRecoveryRules.js",
  "src/SafePreviewAccounts.js",
  "src/lib/ConnectToSupabase.js",
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
    read("src/MainWorkForceApp.jsx"),
    read("src/RoleAccessRules.js"),
    read("src/StateRecoveryRules.js"),
    read("src/SafePreviewAccounts.js"),
    read("src/lib/ConnectToSupabase.js"),
    read("src/SafeChangeShield.jsx"),
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
    'import { App } from "./MainWorkForceApp.jsx"',
    'import { SafeChangeShield } from "./SafeChangeShield.jsx"',
    'import "./AppDesign.css"',
    "<SafeChangeShield>",
    "<App />",
  ], "src/StartApp.jsx");
  assertIncludes(mainApp, [
    'from "./RoleAccessRules.js"',
    'from "./StateRecoveryRules.js"',
    'from "./SafePreviewAccounts.js"',
    'from "./lib/ConnectToSupabase.js"',
    "repairWorkspaceState",
    "safeSectionFromRules",
    "sectionIdsFromRules",
  ], "src/MainWorkForceApp.jsx");
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
  ], "src/StateRecoveryRules.js");
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
  ], "src/lib/ConnectToSupabase.js");
  assertIncludes(crashShield, [
    "SafeChangeShield",
    "componentDidCatch",
    "This change needs review",
    "Open Safe Preview",
  ], "src/SafeChangeShield.jsx");
  assertIncludes(packageJson, [
    '"architecture-boundaries:smoke": "node scripts/check-architecture-boundaries.mjs"',
    "npm run architecture-boundaries:smoke",
  ], "package.json");

  assert(safePreviewAccounts.length === 10, `Expected 10 safe preview accounts, found ${safePreviewAccounts.length}.`);
  assert(safePreviewTeamAccounts().length === 9, "Safe preview team accounts should exclude the owner.");
  assert(safePreviewInviteRecords().length === 9, "Safe preview invite records should match manager and employee accounts.");
  assert(lineCount(mainApp) <= 13000, `src/MainWorkForceApp.jsx is ${lineCount(mainApp)} lines. Extract another stable rule set before adding more large screens.`);

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
