import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(source, labels, screen) {
  const missing = labels.filter((label) => !source.includes(label));
  if (missing.length) throw new Error(`${screen} missing: ${missing.join(", ")}`);
}

function assertNotIncludes(source, labels, screen) {
  const present = labels.filter((label) => source.includes(label));
  if (present.length) throw new Error(`${screen} should not include: ${present.join(", ")}`);
}

function trackedFiles() {
  return execFileSync("git", ["ls-files"], { encoding: "utf8" })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

async function run() {
  const [
    gitignore,
    envExample,
    supabaseReadme,
    initialMigration,
    hardeningMigration,
    supabaseClient,
    securityRunbook,
    packageJson,
  ] = await Promise.all([
    readFile(".gitignore", "utf8"),
    readFile(".env.example", "utf8"),
    readFile("supabase/README.md", "utf8"),
    readFile("supabase/migrations/20260627000000_initial_workforce_schema.sql", "utf8"),
    readFile("supabase/migrations/20260628000000_security_hardening.sql", "utf8"),
    readFile("src/lib/SupabaseConnection.js", "utf8"),
    readFile("SECURITY_RUNBOOK.md", "utf8"),
    readFile("package.json", "utf8"),
  ]);

  const files = trackedFiles();
  const forbiddenTracked = files.filter((file) => /^\.env(\.|$)/.test(file) && file !== ".env.example");
  assert(!forbiddenTracked.length, `Real environment files are tracked: ${forbiddenTracked.join(", ")}`);

  assertIncludes(gitignore, [".env", ".env.*", "!.env.example"], ".gitignore secret rules");
  assertIncludes(envExample, [
    "VITE_SUPABASE_URL=https://your-project-ref.supabase.co",
    "VITE_SUPABASE_ANON_KEY=your-public-anon-key",
    "COMMAND_SERVICE_ENABLED=false",
    "COMMAND_ADMIN_TOKEN=replace-with-long-random-admin-token",
  ], ".env.example placeholders");
  assertNotIncludes(envExample, ["service_role", "SUPABASE_SERVICE_ROLE", "DATABASE_PASSWORD", "sk-proj-"], ".env.example secrets");

  assertIncludes(supabaseReadme, [
    "safe to commit to GitHub",
    "Do not commit `.env`, service-role keys, database passwords, or access tokens.",
    "Organizestart/APP-ORGAINZE",
    "supabase/migrations",
  ], "Supabase README");

  const requiredTables = [
    "public.businesses",
    "public.business_members",
    "public.work_areas",
    "public.team_invites",
    "public.shifts",
    "public.schedule_day_plans",
    "public.staff_requests",
    "public.time_entries",
    "public.events",
    "public.guide_items",
  ];
  requiredTables.forEach((table) => {
    assertIncludes(initialMigration, [`create table if not exists ${table}`, `alter table ${table} enable row level security`], `${table} schema and RLS`);
  });

  assertIncludes(initialMigration, [
    "references auth.users(id)",
    "create or replace function public.is_business_owner",
    "create or replace function public.is_business_member",
    "create or replace function public.is_business_admin",
  ], "Initial Supabase role helpers");

  assertIncludes(hardeningMigration, [
    "create schema if not exists private",
    "create or replace function private.is_business_owner",
    "create or replace function private.is_business_member",
    "create or replace function private.is_business_manager",
    "create or replace function private.is_business_admin",
    "create or replace function private.is_own_member",
    "revoke execute on function public.is_business_owner(uuid) from public, anon, authenticated",
    "revoke execute on function public.is_business_member(uuid) from public, anon, authenticated",
    "revoke execute on function public.is_business_admin(uuid) from public, anon, authenticated",
    "code_hash text",
    "code_fingerprint text",
    "max_attempts integer not null default 5",
    "deleted_at timestamptz",
    "create table if not exists public.audit_log",
    "alter table public.audit_log enable row level security",
    "target_role = 'employee'",
    "members owner update",
    "audit admin read",
    "audit member insert",
  ], "Supabase hardening migration");

  assertNotIncludes(supabaseClient, ["SERVICE_ROLE", "service_role", "SUPABASE_SERVICE", "COMMAND_ADMIN_TOKEN"], "frontend Supabase client");
  assertIncludes(supabaseClient, [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
    "your-project-ref",
    "your-public-anon-key",
    "createClient",
  ], "frontend Supabase anon client");

  assertIncludes(securityRunbook, [
    "still moving from prototype data to Supabase-backed production data",
    "Security Advisor should show zero errors and zero warnings",
    "Authentication should stay invite-only",
    "Anonymous sign-ins and SMS auth should stay disabled",
    "CAPTCHA or Turnstile",
    "spend cap",
    "Role boundaries must be enforced by Supabase RLS or server-side checks",
    "audit_log",
  ], "Security runbook production boundary");

  assertIncludes(packageJson, ["supabase-readiness:smoke", "safe-change:check"], "package smoke wiring");

  console.log(JSON.stringify({
    supabaseReadiness: "passed",
    checked: {
      trackedEnvFiles: "none",
      migrations: 2,
      rlsTables: requiredTables.length,
      hardeningControls: [
        "private helper functions",
        "public helper revokes",
        "invite attempt fields",
        "soft delete fields",
        "audit log",
        "manager invites employee only",
        "owner member authority",
      ],
      frontendClient: "public anon key only",
    },
  }, null, 2));
}

run().catch((error) => {
  console.error("Supabase readiness check failed.");
  console.error(error.message || error);
  process.exit(1);
});
