export const safePreviewAccounts = [
  {
    id: "preview-owner-maya",
    name: "Maya Chen",
    email: "maya.owner@workforce.test",
    role: "owner",
    locationId: "all",
    title: "Owner Director",
    status: "verified",
    scenario: "Full business control, billing/settings, reports, and manager fallback.",
    startSection: "owner-dashboard",
  },
  {
    id: "preview-manager-jordan",
    name: "Jordan Hale",
    email: "jordan.manager@workforce.test",
    role: "manager",
    locationId: "uptown",
    title: "North Team Manager",
    status: "verified",
    scenario: "Schedule, requests, time review, guide, and team handoff only.",
    startSection: "manager-dashboard",
  },
  {
    id: "preview-manager-mina",
    name: "Mina Patel",
    email: "mina.manager@workforce.test",
    role: "manager",
    locationId: "downtown",
    title: "Main Workspace Manager",
    status: "verified",
    scenario: "Checks daily coverage and resolves time-clock flags.",
    startSection: "manager-dashboard",
  },
  {
    id: "preview-manager-iris",
    name: "Iris Stone",
    email: "iris.manager@workforce.test",
    role: "manager",
    locationId: "airport",
    title: "Client Site Manager",
    status: "verified",
    scenario: "Handles client-site schedules and coverage messages.",
    startSection: "manager-dashboard",
  },
  {
    id: "preview-employee-ava",
    name: "Ava Brooks",
    email: "ava.employee@workforce.test",
    role: "employee",
    locationId: "downtown",
    title: "Lead",
    status: "verified",
    hourlyRate: 23.5,
    scenario: "Personal schedule, time clock, guide, messages, and open shifts.",
    startSection: "employee-dashboard",
  },
  {
    id: "preview-employee-luis",
    name: "Luis Vega",
    email: "luis.employee@workforce.test",
    role: "employee",
    locationId: "downtown",
    title: "Service",
    status: "verified",
    hourlyRate: 20.75,
    scenario: "Late-start time flag and request correction path.",
    startSection: "employee-dashboard",
  },
  {
    id: "preview-employee-sam",
    name: "Sam Rivera",
    email: "sam.employee@workforce.test",
    role: "employee",
    locationId: "riverside",
    title: "Inventory",
    status: "verified",
    hourlyRate: 19.5,
    scenario: "Forgot-clock-out auto-flag path.",
    startSection: "employee-dashboard",
  },
  {
    id: "preview-employee-noah",
    name: "Noah Wilson",
    email: "noah.employee@workforce.test",
    role: "employee",
    locationId: "airport",
    title: "Service",
    status: "verified",
    hourlyRate: 21.25,
    scenario: "Client-site open-shift and chat response path.",
    startSection: "employee-dashboard",
  },
  {
    id: "preview-employee-malik",
    name: "Malik Brooks",
    email: "malik.employee@workforce.test",
    role: "employee",
    locationId: "mall",
    title: "Service",
    status: "verified",
    hourlyRate: 20.25,
    scenario: "Open-shift claim and manager approval path.",
    startSection: "employee-dashboard",
  },
  {
    id: "preview-employee-elena",
    name: "Elena Cruz",
    email: "elena.employee@workforce.test",
    role: "employee",
    locationId: "uptown",
    title: "Training Support",
    status: "pending",
    hourlyRate: 22,
    scenario: "Pending invite and guide-training path.",
    startSection: "employee-dashboard",
  },
];

export const safePreviewFlowChecks = [
  {
    id: "auth",
    name: "Invite and account access",
    owner: "Create invite codes and review pending accounts.",
    manager: "Invite employees only.",
    employee: "Use code, sign in, and recover password without role choices.",
  },
  {
    id: "schedule",
    name: "Schedule information flow",
    owner: "Plan day, fill gaps, and send handoff.",
    manager: "Manage schedule, gaps, and team coverage.",
    employee: "See personal schedule and claim open work only.",
  },
  {
    id: "time",
    name: "Time clock and labor flow",
    owner: "See labor cost, rates, exceptions, and audit trail.",
    manager: "Approve or request corrections without extreme edits.",
    employee: "Clock in, lunch, almost-there note, and review only.",
  },
  {
    id: "team",
    name: "Team communication flow",
    owner: "Post announcements and manager handoff briefs.",
    manager: "Use handoff, coverage team, and training questions.",
    employee: "Chat only with employee-safe channels.",
  },
  {
    id: "security",
    name: "Role boundary flow",
    owner: "Business settings, billing, roles, and reports.",
    manager: "No owner billing, reports, events, or workspace delete.",
    employee: "No manager approvals, invite controls, reports, or billing.",
  },
];

export function safePreviewTeamAccounts() {
  return safePreviewAccounts
    .filter((account) => account.role !== "owner")
    .map((account) => ({
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      locationId: account.locationId,
      status: account.status === "pending" ? "pending" : "active",
      verified: account.status !== "pending",
      createdAt: "Safe preview",
      hourlyRate: account.hourlyRate,
      title: account.title,
    }));
}

export function safePreviewInviteRecords() {
  return safePreviewAccounts
    .filter((account) => account.role !== "owner")
    .map((account, index) => ({
      id: `safe-invite-${account.id}`,
      code: account.role === "manager" ? `GV-MGR-${4100 + index}` : `GV-EMP-${6200 + index}`,
      name: account.name,
      email: account.email,
      targetRole: account.role,
      locationId: account.locationId,
      status: account.status === "pending" ? "pending" : "accepted",
      invitedBy: account.role === "manager" ? "Owner" : "Manager",
      verification: "Email code",
      createdAt: "Safe preview",
      expires: account.status === "pending" ? "7 days" : "Used",
    }));
}

export function safePreviewAccountUrl(account, date = "2026-06-24") {
  const params = new URLSearchParams();
  params.set("preview", "safe-change");
  params.set("role", account.role);
  params.set("section", account.startSection);
  params.set("account", account.id);
  params.set("date", date);
  return `/?${params.toString()}`;
}
