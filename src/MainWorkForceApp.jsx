import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Bell,
  BookOpenText,
  Buildings,
  CalendarBlank,
  CaretDown,
  CaretLeft,
  CaretRight,
  ChartLineUp,
  ChatCircleText,
  CheckCircle,
  Clock,
  CreditCard,
  DownloadSimple,
  DotsThree,
  Funnel,
  Gear,
  Hash,
  ListChecks,
  MagnifyingGlass,
  MapPin,
  Megaphone,
  PaperPlaneRight,
  PencilSimple,
  Plus,
  PushPin,
  ShieldCheck,
  SignIn,
  SignOut,
  Smiley,
  Sparkle,
  Trash,
  UserCircle,
  UserPlus,
  UsersThree,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { isSupabaseConfigured, supabase } from "./lib/ConnectToSupabase.js";
import {
  safePreviewAccounts,
  safePreviewAccountUrl,
  safePreviewFlowChecks,
  safePreviewInviteRecords,
  safePreviewTeamAccounts,
} from "./SafePreviewAccounts.js";

const mainWorkspaceStorageKey = "workforce-command-center-v9";
const safePreviewStorageKey = "workforce-command-center-safe-preview-v1";
const commandReviewStorageKey = "workforce-admin-command-review-latest";
const authAttemptStorageKey = "workforce-auth-attempts-v1";
const inviteAttemptStorageKey = "workforce-invite-attempts-v1";
const inviteTtlMs = 7 * 24 * 60 * 60 * 1000;
const authAttemptWindowMs = 10 * 60 * 1000;
const inviteAttemptWindowMs = 15 * 60 * 1000;
const maxAuthAttempts = 6;
const maxInviteAttempts = 5;

const locations = [
  { id: "all", name: "All locations" },
  { id: "downtown", name: "Main workspace", manager: "Maya Chen" },
  { id: "uptown", name: "North team", manager: "Jordan Hale" },
  { id: "riverside", name: "Field team", manager: "Noel Ramos" },
  { id: "airport", name: "Client site", manager: "Iris Stone" },
  { id: "mall", name: "Warehouse", manager: "Ava Taylor" },
];

const hourMarks = [6, 8, 10, 12, 14, 16, 18, 20, 22];

const eventTypeOptions = [
  ["training", "Training"],
  ["coverage", "Coverage support"],
  ["meeting", "Team meeting"],
  ["rush", "Rush prep"],
  ["maintenance", "Maintenance"],
  ["community", "Community event"],
  ["inspection", "Inspection"],
];

const eventAudienceOptions = [
  ["all", "All team members"],
  ["managers", "Managers only"],
  ["leads", "Leads and managers"],
  ["scheduled", "Scheduled staff"],
  ["location", "Selected location only"],
  ["invited", "Invited staff only"],
];

const eventPriorityOptions = [
  ["normal", "Normal"],
  ["important", "Important"],
  ["urgent", "Urgent"],
  ["required", "Required attendance"],
];

const eventRoleOptions = [
  ["any", "Any role"],
  ["service", "Service"],
  ["cashier", "Cashier"],
  ["lead", "Lead"],
  ["manager", "Manager"],
  ["inventory", "Inventory"],
  ["training", "Training support"],
  ["guest-help", "Guest help"],
];

const eventSignupRuleOptions = [
  ["open", "Open signup"],
  ["manager-approval", "Manager approval"],
  ["owner-approval", "Owner approval"],
  ["invite-only", "Invite only"],
];

const eventRepeatOptions = [
  ["none", "One time"],
  ["weekly", "Weekly"],
  ["monthly", "Monthly"],
  ["quarterly", "Quarterly"],
];

const inviteVerificationOptions = [
  ["email-code", "Email code"],
  ["manager-confirm", "Manager confirms identity"],
  ["owner-confirm", "Owner confirms identity"],
];

const reportTypeOptions = [
  ["business", "Business health"],
  ["coverage", "Coverage"],
  ["requests", "Requests"],
  ["labor", "Labor"],
  ["events", "Events"],
  ["risk", "Risk"],
  ["log", "Command log"],
];

const reportRangeOptions = [
  ["day", "Selected day"],
  ["week", "Next 7 days"],
  ["month", "Month"],
  ["all", "All visible"],
];

const reportAudienceOptions = [
  ["Owner", "Owner"],
  ["Manager handoff", "Manager handoff"],
  ["Team summary", "Team summary"],
];

const defaultBusinessSetup = {
  managerCoverage: "managers",
  locationScope: "multi",
  primaryLocationId: "downtown",
};

const defaultSettingsProfile = {
  legalName: "Greenview Cafe Group LLC",
  displayName: "Greenview Cafe Group",
  businessType: "Food & Beverage",
  timeZone: "(GMT-07:00) Pacific Time (US & Canada)",
  primaryContact: "Maya Chen",
  taxId: "84-1234567",
};

const defaultWorkspaceHours = {
  weeklySchedule: "Mon - Sun, 5:00 AM - 11:00 PM",
  overtimeThreshold: 40,
  payrollWeekStarts: "Sunday",
  timeClockRounding: "15 minutes",
};

const defaultInvoiceContact = {
  name: "Maya Chen",
  email: "billing@greenviewcafe.com",
  phone: "(206) 555-0198",
  address: "123 Pike St, Ste 400, Seattle, WA 98101",
};

const defaultSecuritySettings = {
  mfa: "Enabled",
  passwordPolicy: "Strong - 8+ characters",
  sso: "Not configured",
  activeSessions: "View sessions (3)",
  signupMode: "Invite only",
  captcha: "Required on public account flows",
  anonymousAuth: "Disabled",
  smsAuth: "Disabled",
  spendProtection: "Spend cap and alerts required",
};

const defaultNotificationSettings = {
  requests: "Owner and managers",
  scheduleChanges: "All affected team members",
  timeClockFlags: "Manager and owner",
  dailySummary: "Every morning",
};

const defaultScheduleOps = {
  publishedAt: "Not published",
  handoffStatus: "Not sent",
  coverageAsk: "Not posted",
  riskCheck: "Not checked",
};

const defaultTimeClock = {
  employee: "Ava Brooks",
  role: "Lead",
  locationId: "downtown",
  shift: "7:00 AM - 3:00 PM",
  status: "off",
  lunchStatus: "Not started",
  authMethod: "Location button ready",
  locationStatus: "verified",
  proximity: "Main workspace check - within expected area",
  earlyWindow: "Inside 10 minute clock-in window",
  lastPunch: "No punch recorded today",
  nearWorkNote: "Not sent",
};

const businessWorkspaces = {
  greenview: {
    label: "Greenview Cafe Group",
    profile: defaultSettingsProfile,
    setup: defaultBusinessSetup,
    invoiceContact: defaultInvoiceContact,
    billing: { plan: "Monthly", seats: 34, included: 10, cost: 66 },
    hours: defaultWorkspaceHours,
    announcement: {
      title: "Schedule changes by 4 PM",
      body: "Managers should confirm open shifts before the evening close.",
      audience: "All teams",
      createdBy: "Owner",
      urgent: true,
    },
  },
  northstar: {
    label: "Northstar Retail Group",
    profile: {
      legalName: "Northstar Retail Group LLC",
      displayName: "Northstar Retail Group",
      businessType: "Retail & Service",
      timeZone: "(GMT-07:00) Pacific Time (US & Canada)",
      primaryContact: "Iris Stone",
      taxId: "91-2245780",
    },
    setup: {
      managerCoverage: "owner",
      locationScope: "single",
      primaryLocationId: "mall",
    },
    invoiceContact: {
      name: "Iris Stone",
      email: "billing@northstarretail.com",
      phone: "(206) 555-0144",
      address: "500 Pine St, Ste 210, Seattle, WA 98101",
    },
    billing: { plan: "Yearly", seats: 18, included: 10, cost: 299 },
    hours: {
      weeklySchedule: "Mon - Sat, 8:00 AM - 9:00 PM",
      overtimeThreshold: 38,
      payrollWeekStarts: "Monday",
      timeClockRounding: "10 minutes",
    },
    announcement: {
      title: "Northstar weekend rush prep",
      body: "Confirm floor coverage and manager fallback before Friday close.",
      audience: "Warehouse team",
      createdBy: "Owner",
      urgent: true,
    },
  },
};

const coverageCandidates = [
  { name: "Ava Brooks", role: "Lead", homeLocationId: "downtown", skills: ["lead", "cashier", "service", "closer"], availability: "Available after 4 PM", rate: 23.5, risk: "Low", load: "32h scheduled" },
  { name: "Luis Vega", role: "Service", homeLocationId: "downtown", skills: ["service", "cashier", "guest help"], availability: "Can extend 2 hours", rate: 20.75, risk: "Medium", load: "34h scheduled" },
  { name: "Sam Rivera", role: "Inventory", homeLocationId: "riverside", skills: ["inventory", "cashier", "delivery"], availability: "Free after 2 PM", rate: 19.5, risk: "Low", load: "28h scheduled" },
  { name: "Mina Patel", role: "Manager", homeLocationId: "uptown", skills: ["manager", "lead", "cashier", "training"], availability: "Backup only", rate: 24, risk: "Medium", load: "38h scheduled" },
  { name: "Noah Wilson", role: "Service", homeLocationId: "airport", skills: ["service", "guest help", "closer"], availability: "Available 2 PM - 6 PM", rate: 21.25, risk: "Low", load: "30h scheduled" },
  { name: "Malik Brooks", role: "Service", homeLocationId: "mall", skills: ["service", "cashier", "closer"], availability: "Can close tonight", rate: 20.25, risk: "Low", load: "29h scheduled" },
];

const baseState = {
  shifts: [
    { id: "s1", locationId: "downtown", employee: "Ava Brooks", role: "Lead", start: 6, end: 14, status: "covered", note: "Opening checklist" },
    { id: "s2", locationId: "downtown", employee: "Luis Vega", role: "Service", start: 14, end: 18, status: "covered", note: "Lunch rush" },
    { id: "s3", locationId: "downtown", employee: "Open shift", role: "Cashier", start: 18, end: 22, status: "open", note: "Need closer" },
    { id: "s4", locationId: "uptown", employee: "Mina Patel", role: "Manager", start: 6, end: 13, status: "covered", note: "Manager on duty" },
    { id: "s5", locationId: "uptown", employee: "Jordan Hale", role: "Floor", start: 13, end: 22, status: "covered", note: "Peak support" },
    { id: "s6", locationId: "riverside", employee: "Sam Rivera", role: "Inventory", start: 6, end: 14, status: "covered", note: "Delivery" },
    { id: "s7", locationId: "riverside", employee: "Open shift", role: "Cashier", start: 14, end: 18, status: "open", note: "Afternoon gap" },
    { id: "s8", locationId: "riverside", employee: "Noel Ramos", role: "Manager", start: 18, end: 22, status: "covered", note: "Evening lead" },
    { id: "s9", locationId: "airport", employee: "Iris Stone", role: "Manager", start: 6, end: 14, status: "covered", note: "Manager on duty" },
    { id: "s10", locationId: "airport", employee: "Open shift", role: "Guest help", start: 14, end: 18, status: "open", note: "Client demand coverage" },
    { id: "s11", locationId: "airport", employee: "Noah Wilson", role: "Service", start: 18, end: 22, status: "covered", note: "Evening support" },
    { id: "s12", locationId: "mall", employee: "Ava Taylor", role: "Lead", start: 7, end: 15, status: "covered", note: "Warehouse opener" },
    { id: "s13", locationId: "mall", employee: "Malik Brooks", role: "Service", start: 15, end: 21, status: "covered", note: "Warehouse close" },
  ],
  requests: [
    { id: "r1", employee: "Ava Brooks", locationId: "downtown", type: "Shift swap", date: "Today", status: "pending", reason: "Can cover North team opener instead." },
    { id: "r2", employee: "Luis Vega", locationId: "downtown", type: "Time off", date: "Fri", status: "pending", reason: "Family appointment after 4 PM." },
    { id: "r3", employee: "Sam Rivera", locationId: "riverside", type: "Late arrival", date: "Tomorrow", status: "approved", reason: "Transit delay reported early." },
    { id: "r4", employee: "Mina Patel", locationId: "uptown", type: "Guide edit", date: "This week", status: "pending", reason: "Update closing checklist." },
  ],
  announcements: [
    { id: "a1", title: "Schedule changes by 4 PM", body: "Managers should confirm open shifts before the evening close.", audience: "All teams", createdBy: "Owner", urgent: true },
  ],
  guideCards: [
    { id: "g1", title: "Opening Checklist", type: "Basics", locationId: "all", completion: 86 },
    { id: "g2", title: "Customer Recovery Steps", type: "Customer Service", locationId: "all", completion: 74 },
    { id: "g3", title: "Client Site Closing Notes", type: "Location", locationId: "airport", completion: 61 },
  ],
  events: [
    {
      id: "e1",
      title: "Seasonal training",
      locationId: "downtown",
      date: "Jun 28",
      time: "2:00 PM",
      needed: 8,
      signed: 5,
      eventType: "training",
      audience: "scheduled",
      priority: "required",
      roleNeeded: "training",
      signupRule: "manager-approval",
      repeat: "none",
      deadline: "Jun 27, 4:00 PM",
      notes: "Review guest recovery scripts and register handoff.",
    },
    {
      id: "e2",
      title: "Client site rush prep",
      locationId: "airport",
      date: "Jun 30",
      time: "9:00 AM",
      needed: 6,
      signed: 4,
      eventType: "rush",
      audience: "location",
      priority: "important",
      roleNeeded: "guest-help",
      signupRule: "open",
      repeat: "weekly",
      deadline: "Jun 29, 6:00 PM",
      notes: "Prep counter flow and extra guest support before morning rush.",
    },
  ],
  timeEntries: [
    { id: "t1", employee: "Ava Brooks", locationId: "downtown", shift: "7:00 AM - 3:00 PM", status: "Ready", duration: "0h 00m", workedHours: 0, scheduledHours: 8, hourlyRate: 23.5, flag: "Location verified", severity: "approved", source: "Geofence + button" },
    { id: "t2", employee: "Luis Vega", locationId: "downtown", shift: "10:00 AM - 6:00 PM", status: "Working", duration: "1h 44m", workedHours: 1.73, scheduledHours: 8, hourlyRate: 20.75, flag: "Started 6m late", severity: "pending", source: "PIN verified" },
    { id: "t3", employee: "Sam Rivera", locationId: "riverside", shift: "6:00 AM - 2:00 PM", status: "Auto-flagged", duration: "8h 02m", workedHours: 8.03, scheduledHours: 8, hourlyRate: 19.5, flag: "Forgot clock-out", severity: "denied", source: "System flag" },
    { id: "t4", employee: "Mina Patel", locationId: "uptown", shift: "7:00 AM - 3:00 PM", status: "Near work", duration: "Pending", workedHours: 0, scheduledHours: 8, hourlyRate: 24, flag: "Almost there note sent", severity: "pending", source: "Employee note" },
  ],
  messages: [
    {
      id: "m1",
      person: "Maya Chen",
      role: "Main workspace manager",
      group: "Favorites",
      initials: "MC",
      accent: "sage",
      time: "1:48 PM",
      text: "Main workspace closer is still open.",
      unread: true,
      online: true,
      audience: "leadership",
      history: [
        { id: "m1-h1", sender: "Maya Chen", time: "11:18 AM", body: "Main workspace closer is still open after 6 PM.", mine: false },
        { id: "m1-h2", sender: "Owner", time: "11:21 AM", body: "Thanks, I am checking the schedule board now.", mine: true },
        { id: "m1-h3", sender: "Maya Chen", time: "11:26 AM", body: "Luis can stay until 6, but we still need one person for the final block.", mine: false },
      ],
    },
    {
      id: "m2",
      person: "Manager Handoff",
      role: "Greenview Operations",
      group: "Greenview Operations",
      initials: "GH",
      accent: "mint",
      time: "1:42 PM",
      text: "Client site and Field team both need coverage notes.",
      unread: false,
      online: true,
      audience: "leadership",
      history: [
        { id: "m2-h1", sender: "Noel Ramos", time: "10:04 AM", body: "Field team has the afternoon cashier gap. I added it to the handoff.", mine: false },
        { id: "m2-h2", sender: "Iris Stone", time: "10:12 AM", body: "Client site can cover the evening block if the guest help shift gets filled.", mine: false },
        { id: "m2-h3", sender: "Owner", time: "10:20 AM", body: "Good. Keep the handoff focused on coverage, time entries, and urgent requests.", mine: true },
      ],
    },
    {
      id: "m3",
      person: "Ava Brooks",
      role: "Lead",
      group: "Chats",
      initials: "AB",
      accent: "peach",
      time: "1:35 PM",
      text: "I can take North team opening if approved.",
      unread: false,
      online: true,
      audience: "all",
      history: [
        { id: "m3-h1", sender: "Ava Brooks", time: "9:18 AM", body: "I can take North team opening if approved.", mine: false },
        { id: "m3-h2", sender: "Owner", time: "9:23 AM", body: "Thanks Ava. I will check with Jordan and confirm.", mine: true },
      ],
    },
    {
      id: "m4",
      person: "Coverage Team",
      role: "All locations",
      group: "Greenview Operations",
      initials: "CT",
      accent: "blue",
      time: "12:58 PM",
      text: "Please keep open-shift updates in this chat today.",
      unread: true,
      online: false,
      audience: "all",
      history: [
        { id: "m4-h1", sender: "Owner", time: "8:05 AM", body: "Please keep open-shift updates in this chat today.", mine: true },
        { id: "m4-h2", sender: "Jordan Hale", time: "8:20 AM", body: "North team is covered after 1 PM.", mine: false },
        { id: "m4-h3", sender: "Noah Wilson", time: "8:27 AM", body: "Client site evening support is confirmed.", mine: false },
      ],
    },
    {
      id: "m6",
      person: "Team Announcements",
      role: "All teams",
      group: "Greenview Operations",
      initials: "TA",
      accent: "mint",
      time: "12:10 PM",
      text: "Schedule changes by 4 PM",
      unread: false,
      online: true,
      audience: "all",
      history: [
        { id: "m6-h1", sender: "Owner", time: "12:10 PM", body: "Schedule changes by 4 PM: Managers should confirm open shifts before the evening close.", mine: true },
      ],
    },
    {
      id: "m5",
      person: "Training Questions",
      role: "Guide support",
      group: "Teams and channels",
      initials: "TQ",
      accent: "violet",
      time: "Yesterday",
      text: "Can we update the customer recovery card?",
      unread: false,
      online: false,
      audience: "all",
      history: [
        { id: "m5-h1", sender: "Mina Patel", time: "Yesterday", body: "Can we update the customer recovery card before Friday?", mine: false },
        { id: "m5-h2", sender: "Owner", time: "Yesterday", body: "Yes. Add the notes here and I will revise the guide.", mine: true },
      ],
    },
  ],
  teamInvites: [
    { id: "inv1", code: "GV-MGR-2841", name: "Jordan Hale", email: "jordan.hale@greenviewcafe.com", targetRole: "manager", locationId: "uptown", status: "pending", invitedBy: "Owner", verification: "Email code", createdAt: "Today", expires: "7 days" },
    { id: "inv2", code: "GV-EMP-6193", name: "Ava Brooks", email: "ava.brooks@greenviewcafe.com", targetRole: "employee", locationId: "downtown", status: "accepted", invitedBy: "Maya Chen", verification: "Email code", createdAt: "Yesterday", expires: "Used" },
  ],
  teamAccounts: [
    { id: "acct1", name: "Maya Chen", email: "maya.chen@greenviewcafe.com", role: "manager", locationId: "downtown", status: "active", verified: true, createdAt: "Jun 20" },
    { id: "acct2", name: "Ava Brooks", email: "ava.brooks@greenviewcafe.com", role: "employee", locationId: "downtown", status: "active", verified: true, createdAt: "Jun 23" },
  ],
  billing: { plan: "Monthly", seats: 34, included: 10, cost: 66 },
  activeBusinessId: "greenview",
  settingsProfile: defaultSettingsProfile,
  workspaceHours: defaultWorkspaceHours,
  invoiceContact: defaultInvoiceContact,
  securitySettings: defaultSecuritySettings,
  notificationSettings: defaultNotificationSettings,
  scheduleOps: defaultScheduleOps,
  businessSetup: defaultBusinessSetup,
  savedLocations: [],
  clockedIn: false,
  timeClock: defaultTimeClock,
  completedGuideIds: ["g1"],
  reportSnapshots: [],
  reportLog: ["Weekly labor report generated at 8:15 AM"],
  auditLog: [],
};

const ownerNav = [
  ["owner-dashboard", "Dashboard", Buildings],
  ["owner-schedule", "Schedule", CalendarBlank],
  ["owner-requests", "Requests", ListChecks],
  ["owner-events", "Events", MapPin],
  ["owner-team", "Team", UsersThree],
  ["owner-guide", "Guide", BookOpenText],
  ["owner-time", "Time Clock", Clock],
  ["owner-reports", "Reports", ChartLineUp],
  ["owner-settings", "Settings & Billing", Gear],
];

const platformAdminNav = [
  ["admin-command-review", "Command Review", Sparkle, "Platform Admin"],
];

const managerNav = [
  ["manager-dashboard", "Manager Dashboard", Buildings, "Manager Section"],
  ["manager-schedule", "Schedule", CalendarBlank, "Manager Section"],
  ["manager-requests", "Approvals", ListChecks, "Manager Section"],
  ["manager-team", "Team", UsersThree, "Manager Section"],
  ["manager-guide", "Guide Management", BookOpenText, "Manager Section"],
  ["manager-time", "Time Review", Clock, "Manager Section"],
  ["manager-settings", "Settings", Gear, "Manager Section"],
  ["employee-dashboard", "My Dashboard", UserCircle, "Employee Section"],
  ["employee-schedule", "My Schedule", CalendarBlank, "Employee Section"],
  ["employee-shifts", "Open Shifts", Sparkle, "Employee Section"],
  ["employee-clock", "My Time Clock", SignIn, "Employee Section"],
  ["employee-requests", "My Requests", ListChecks, "Employee Section"],
  ["employee-guide", "My Guide", BookOpenText, "Employee Section"],
];

const employeeNav = [
  ["employee-dashboard", "Dashboard", UserCircle, "Employee Section"],
  ["employee-schedule", "Schedule", CalendarBlank, "Employee Section"],
  ["employee-shifts", "Open Shifts", Sparkle, "Employee Section"],
  ["employee-clock", "Time Clock", SignIn, "Employee Section"],
  ["employee-requests", "Requests", ListChecks, "Employee Section"],
  ["employee-messages", "Messages", ChatCircleText, "Employee Section"],
  ["employee-guide", "Guide", BookOpenText, "Employee Section"],
  ["employee-settings", "Settings", Gear, "Employee Section"],
];

const firstSectionByRole = {
  owner: "owner-dashboard",
  manager: "manager-dashboard",
  employee: "employee-dashboard",
  "platform-admin": "admin-command-review",
};

const settingsTabIds = ["business", "locations", "roles", "billing", "security", "notifications"];
const settingsTabLabels = {
  business: "Business",
  locations: "Locations",
  roles: "Roles & Permissions",
  billing: "Billing & Plan",
  security: "Security",
  notifications: "Notifications",
};
const operationsToday = "2026-06-24";
const schedulePeriodIds = ["day", "week", "month", "custom"];
const scheduleModeIds = ["schedule", "calendar", "planning"];

function initialRoleFromUrl() {
  const requested = new URLSearchParams(window.location.search).get("role");
  return ["owner", "manager", "employee", "platform-admin"].includes(requested) ? requested : "owner";
}

function isSafeChangePreview() {
  const params = new URLSearchParams(window.location.search);
  return params.get("preview") === "safe-change" || params.get("sandbox") === "true";
}

function currentSafePreviewAccountId() {
  if (!isSafeChangePreview()) return "";
  return new URLSearchParams(window.location.search).get("account") || "";
}

function workspaceStorageKey() {
  return isSafeChangePreview() ? safePreviewStorageKey : mainWorkspaceStorageKey;
}

function preserveSafeChangePreview(params) {
  if (!isSafeChangePreview()) return;
  params.set("preview", "safe-change");
  const accountId = currentSafePreviewAccountId();
  if (accountId) params.set("account", accountId);
}

function initialSectionFromUrl(role) {
  const requested = new URLSearchParams(window.location.search).get("section");
  return safeSectionForRole(role, requested);
}

function initialSettingsTabFromUrl() {
  const requested = new URLSearchParams(window.location.search).get("settings");
  return settingsTabIds.includes(requested) ? requested : "business";
}

function initialSignedOutFromUrl() {
  return new URLSearchParams(window.location.search).get("signedOut") === "true";
}

function initialDayFromUrl() {
  const requested = new URLSearchParams(window.location.search).get("date");
  return validDateKey(requested) ? requested : operationsToday;
}

function initialSchedulePeriodFromUrl() {
  const requested = new URLSearchParams(window.location.search).get("period");
  return schedulePeriodIds.includes(requested) ? requested : "day";
}

function initialScheduleModeFromUrl() {
  const requested = new URLSearchParams(window.location.search).get("mode");
  return scheduleModeIds.includes(requested) ? requested : "schedule";
}

function initialScheduleEndFromUrl(startDay = operationsToday) {
  const requested = new URLSearchParams(window.location.search).get("end");
  return validDateKey(requested) ? requested : offsetDateKey(startDay, 13);
}

function isScheduleSection(section) {
  return section === "owner-schedule" || section === "manager-schedule";
}

function syncBrowserUrl(role, section, settingsTab, day) {
  const currentParams = new URLSearchParams(window.location.search);
  const preservingSameSchedule = isScheduleSection(section) && currentParams.get("section") === section;
  const params = new URLSearchParams();
  preserveSafeChangePreview(params);
  params.set("role", role);
  params.set("section", section);
  if (section === "owner-settings") params.set("settings", settingsTab || "business");
  if (validDateKey(day)) params.set("date", day);
  if (preservingSameSchedule) {
    const period = currentParams.get("period");
    const end = currentParams.get("end");
    if (schedulePeriodIds.includes(period) && period !== "day") params.set("period", period);
    if (period === "custom" && validDateKey(end)) params.set("end", end);
  }
  window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
}

function syncSchedulePeriodInUrl(scope, day, period, endDate, mode = "schedule") {
  const params = new URLSearchParams(window.location.search);
  preserveSafeChangePreview(params);
  params.set("role", scope === "owner" ? "owner" : "manager");
  params.set("section", scope === "owner" ? "owner-schedule" : "manager-schedule");
  if (validDateKey(day)) params.set("date", day);
  if (scheduleModeIds.includes(mode) && mode !== "schedule") params.set("mode", mode);
  else params.delete("mode");
  if (period && period !== "day") params.set("period", period);
  else params.delete("period");
  if (period === "custom" && validDateKey(endDate)) params.set("end", endDate);
  else params.delete("end");
  window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
}

function migrateLegacyLocationCopy(value) {
  if (Array.isArray(value)) return value.map(migrateLegacyLocationCopy);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, migrateLegacyLocationCopy(entry)]));
  }
  if (typeof value !== "string") return value;
  return value
    .replace(/\bDowntown\b/g, "Main workspace")
    .replace(/\bUptown\b/g, "North team")
    .replace(/\bSuburb\b/g, "Field team")
    .replace(/\bAirport\b/g, "Client site")
    .replace(/\bMall\b/g, "Warehouse")
    .replace(/\bstore\b/g, "work area");
}

function normalizeState(state) {
  const next = ensureSchedulePlanningSeed(migrateLegacyLocationCopy({ ...baseState, ...state }));
  const messages = Array.isArray(next.messages) ? next.messages : baseState.messages;
  if (messages.some((message) => message.id === "m6")) return { ...next, messages };
  const latest = next.announcements?.[0] || baseState.announcements[0];
  return {
    ...next,
    messages: postAnnouncementToMessages(messages, latest, latest.createdBy || "Owner", "Recent"),
  };
}

function mergeUniqueBy(items, additions, keyFor) {
  const seen = new Set(items.map(keyFor).filter(Boolean));
  const merged = [...items];
  additions.forEach((item) => {
    const key = keyFor(item);
    if (key && seen.has(key)) return;
    if (key) seen.add(key);
    merged.push(item);
  });
  return merged;
}

function ensureSafePreviewSeed(state) {
  const teamAccounts = mergeUniqueBy(
    Array.isArray(state.teamAccounts) ? state.teamAccounts : [],
    safePreviewTeamAccounts(),
    (account) => String(account.email || account.id || "").toLowerCase(),
  );
  const teamInvites = mergeUniqueBy(
    Array.isArray(state.teamInvites) ? state.teamInvites : [],
    safePreviewInviteRecords(),
    (invite) => String(invite.email || invite.code || "").toLowerCase(),
  );
  const auditLog = Array.isArray(state.auditLog) ? state.auditLog : [];
  const hasPreviewAudit = auditLog.some((entry) => entry.action === "safe_preview.seeded");
  return {
    ...state,
    teamAccounts,
    teamInvites,
    safePreviewAccounts,
    safePreviewFlowChecks,
    auditLog: hasPreviewAudit
      ? auditLog
      : [{
        id: "safe-preview-seeded",
        time: "Safe preview",
        actor: "System",
        action: "safe_preview.seeded",
        target: "10 test accounts",
        detail: "Safe Change Preview seeded with owner, manager, and employee test accounts.",
      }, ...auditLog],
  };
}

function ensureSchedulePlanningSeed(state) {
  const shifts = Array.isArray(state.shifts) ? state.shifts : baseState.shifts;
  const hasFutureSchedule = shifts.some((shift) => validDateKey(shift.date) && shift.date !== operationsToday);
  if (hasFutureSchedule) return state;
  const tomorrow = offsetDateKey(operationsToday, 1);
  const nextWeek = offsetDateKey(operationsToday, 7);
  const nextMonth = offsetPeriodDateKey(monthStartDateKey(operationsToday), "month", 1);
  const starterShifts = [
    { id: "seed-tomorrow-1", date: tomorrow, locationId: "downtown", employee: "Maya Chen", role: "Lead", start: 7, end: 15, status: "covered", note: "Tomorrow lead setup" },
    { id: "seed-tomorrow-2", date: tomorrow, locationId: "downtown", employee: "Open shift", role: "Service", start: 15, end: 21, status: "open", note: "Tomorrow close coverage" },
    { id: "seed-week-1", date: nextWeek, locationId: "uptown", employee: "Jordan Hale", role: "Manager", start: 8, end: 16, status: "covered", note: "Weekly kickoff lead" },
    { id: "seed-week-2", date: offsetDateKey(nextWeek, 1), locationId: "riverside", employee: "Open shift", role: "Field support", start: 10, end: 18, status: "open", note: "Weekly route support" },
    { id: "seed-week-3", date: offsetDateKey(nextWeek, 3), locationId: "mall", employee: "Ava Taylor", role: "Inventory", start: 9, end: 17, status: "covered", note: "Warehouse cycle count" },
    { id: "seed-month-1", date: nextMonth, locationId: "airport", employee: "Iris Stone", role: "Manager", start: 9, end: 17, status: "covered", note: "Monthly client-site launch" },
    { id: "seed-month-2", date: offsetDateKey(nextMonth, 6), locationId: "downtown", employee: "Open shift", role: "Training support", start: 12, end: 18, status: "open", note: "Monthly training support" },
  ];
  const existingIds = new Set(shifts.map((shift) => shift.id));
  const newShifts = starterShifts.filter((shift) => !existingIds.has(shift.id));
  if (!newShifts.length) return state;
  const nextShifts = [...shifts, ...newShifts];
  const datePlans = { ...(state.datePlans || {}) };
  [
    { date: tomorrow, status: "Prepared", demand: "Busy", staffTarget: 4, roleNeeds: "Close coverage and lead handoff", requiredRoles: "Lead, Service, Closer", notes: "Tomorrow has its own plan and coverage gap." },
    { date: nextWeek, status: "Prepared", demand: "Normal", staffTarget: 5, roleNeeds: "Set weekly lead coverage", requiredRoles: "Manager, Field support, Inventory", notes: "Start of next weekly planning window." },
    { date: offsetDateKey(nextWeek, 1), status: "Draft", demand: "Needs coverage", staffTarget: 3, roleNeeds: "Field route support", requiredRoles: "Field support", notes: "Weekly range has one open support day." },
    { date: nextMonth, status: "Prepared", demand: "Event day", staffTarget: 4, roleNeeds: "Client-site launch staffing", requiredRoles: "Manager, Training support", notes: "First day of next monthly plan." },
  ].forEach((plan) => {
    if (datePlans[plan.date]) return;
    const basePlan = defaultDatePlan(plan.date, nextShifts);
    datePlans[plan.date] = {
      ...basePlan,
      ...plan,
      label: formatDisplayDate(plan.date),
      preparedAt: "Seeded",
      updatedAt: "Seeded",
    };
  });
  return { ...state, shifts: nextShifts, datePlans };
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(workspaceStorageKey()));
    const normalized = stored ? normalizeState(stored) : normalizeState(baseState);
    return isSafeChangePreview() ? ensureSafePreviewSeed(normalized) : normalized;
  } catch {
    const normalized = normalizeState(baseState);
    return isSafeChangePreview() ? ensureSafePreviewSeed(normalized) : normalized;
  }
}

function getBusinessSetup(data) {
  return { ...defaultBusinessSetup, ...(data?.businessSetup || {}) };
}

function getActiveBusinessId(data) {
  return businessWorkspaces[data?.activeBusinessId] ? data.activeBusinessId : "greenview";
}

function getSettingsProfile(data) {
  return { ...defaultSettingsProfile, ...(data?.settingsProfile || {}) };
}

function getWorkspaceHours(data) {
  return { ...defaultWorkspaceHours, ...(data?.workspaceHours || {}) };
}

function getInvoiceContact(data) {
  return { ...defaultInvoiceContact, ...(data?.invoiceContact || {}) };
}

function getSecuritySettings(data) {
  return { ...defaultSecuritySettings, ...(data?.securitySettings || {}) };
}

function getNotificationSettings(data) {
  return { ...defaultNotificationSettings, ...(data?.notificationSettings || {}) };
}

function getScheduleOps(data) {
  return { ...defaultScheduleOps, ...(data?.scheduleOps || {}) };
}

function defaultDatePlan(day, shifts = []) {
  const safeDay = validDateKey(day) ? day : operationsToday;
  const rollup = scheduleRollupForDate(shifts, safeDay);
  const managerShift = rollup.shifts.find((shift) => shift.role.toLowerCase().includes("manager") || shift.note.toLowerCase().includes("manager"));
  const estimatedBudget = Math.max(rollup.hours * 22, rollup.total ? rollup.total * 120 : 300);
  return {
    label: formatDisplayDate(safeDay),
    demand: rollup.open ? "Needs coverage" : rollup.total >= 5 ? "Busy" : "Normal",
    staffTarget: Math.max(rollup.total, rollup.covered + rollup.open, 1),
    leadRole: managerShift?.role || "Manager or lead",
    businessStart: "6:00 AM",
    businessEnd: "10:00 PM",
    roleNeeds: rollup.open ? "Cover open roles first" : rollup.total ? "Core roles covered" : "Add the roles this day needs",
    requiredRoles: rollup.shifts.length ? Array.from(new Set(rollup.shifts.map((shift) => shift.role))).join(", ") : "Add required roles",
    breakPlan: "Stagger lunches around peak coverage",
    arrivalWindow: "15 minutes before shift",
    laborBudget: Math.round(estimatedBudget),
    lockTime: "4:00 PM day before",
    publishRule: "Publish when coverage is ready",
    repeatPattern: "One time",
    timeGranularity: "15 minute blocks",
    coverageGoal: rollup.open ? "Cover every open role before publishing" : "Every role has a named owner",
    swapRule: "Manager approval before changes are final",
    notes: rollup.total ? "Review coverage, requests, and time risk before publishing." : "Build this day from a template or add the first shift.",
    status: rollup.total ? "Ready to review" : "Draft",
    preparedAt: "Not prepared",
    updatedAt: "Not saved",
  };
}

function getDatePlan(data, day, shifts = []) {
  const safeDay = validDateKey(day) ? day : operationsToday;
  const defaults = defaultDatePlan(safeDay, shifts);
  const merged = { ...defaults, ...(data?.datePlans?.[safeDay] || {}) };
  return {
    ...merged,
    staffTarget: Math.max(defaults.staffTarget, Number(merged.staffTarget) || 0, 1),
    laborBudget: Math.max(0, Number(merged.laborBudget) || defaults.laborBudget || 0),
  };
}

function getTeamInvites(data) {
  return Array.isArray(data?.teamInvites) ? data.teamInvites : [];
}

function getTeamAccounts(data) {
  return Array.isArray(data?.teamAccounts) ? data.teamAccounts : [];
}

function getAuditLog(data) {
  return Array.isArray(data?.auditLog) ? data.auditLog : [];
}

function appendAudit(data, entry) {
  return {
    ...data,
    auditLog: [{
      id: `audit-${Date.now()}-${secureRandomToken(4)}`,
      at: new Date().toISOString(),
      ...entry,
    }, ...getAuditLog(data)].slice(0, 200),
  };
}

function secureRandomToken(length = 12) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = new Uint32Array(length);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values);
    return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
  }
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function normalizeAccessCode(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function inviteCodeParts(code) {
  const normalized = normalizeAccessCode(code);
  return normalized ? normalized.match(/.{1,4}/g)?.join("-") || normalized : "";
}

function inviteExpiresAt() {
  return new Date(Date.now() + inviteTtlMs).toISOString();
}

function inviteIsExpired(invite) {
  if (!invite?.expiresAt) return false;
  return Date.parse(invite.expiresAt) <= Date.now();
}

function inviteStatus(invite) {
  if (!invite) return "missing";
  if (invite.status !== "pending") return invite.status;
  return inviteIsExpired(invite) ? "expired" : "pending";
}

function emailMatchesInvite(invite, email) {
  if (!invite?.email) return true;
  return invite.email.trim().toLowerCase() === String(email || "").trim().toLowerCase();
}

function attemptBucket(storageKeyName, key, maxAttempts, windowMs) {
  const now = Date.now();
  const safeKey = String(key || "unknown").toLowerCase();
  let store = {};
  try {
    store = JSON.parse(localStorage.getItem(storageKeyName) || "{}") || {};
  } catch {
    store = {};
  }
  const current = store[safeKey] || { count: 0, resetAt: now + windowMs };
  const nextCurrent = current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
  const nextCount = nextCurrent.count + 1;
  store[safeKey] = { count: nextCount, resetAt: nextCurrent.resetAt };
  localStorage.setItem(storageKeyName, JSON.stringify(store));
  return {
    ok: nextCount <= maxAttempts,
    remaining: Math.max(0, maxAttempts - nextCount),
    retryAfterMinutes: Math.max(1, Math.ceil((nextCurrent.resetAt - now) / 60000)),
  };
}

function authAttemptKey(mode, email) {
  return `${mode}:${String(email || "").trim().toLowerCase() || "unknown"}`;
}

function inviteAttemptKey(code, email) {
  return `${normalizeAccessCode(code) || "unknown"}:${String(email || "").trim().toLowerCase() || "unknown"}`;
}

function ownerRunsManagerFunctions(data) {
  return getBusinessSetup(data).managerCoverage === "owner";
}

function singleLocationMode(data) {
  return getBusinessSetup(data).locationScope === "single";
}

function primaryLocationId(data) {
  return getBusinessSetup(data).primaryLocationId || "downtown";
}

function customLocationIdFromName(name) {
  const cleaned = String(name || "").trim();
  if (!cleaned) return "";
  return `custom:${encodeURIComponent(cleaned)}`;
}

function locationNameFromCustomId(id) {
  if (!String(id || "").startsWith("custom:")) return "";
  try {
    return decodeURIComponent(String(id).slice(7)).trim();
  } catch {
    return String(id).slice(7).replace(/[-_]+/g, " ").trim();
  }
}

function fallbackLocationName(id) {
  const custom = locationNameFromCustomId(id);
  if (custom) return custom;
  return String(id || "Location")
    .replace(/[-_:]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function locationName(id) {
  if (id === "all") return locations[0].name;
  return locations.find((location) => location.id === id)?.name || fallbackLocationName(id);
}

function customLocationIdsFromData(data) {
  const ids = new Set();
  const collect = (value) => {
    if (!value || value === "all" || locations.some((location) => location.id === value)) return;
    ids.add(value);
  };
  getSavedLocations(data).forEach((location) => collect(location.id));
  [data?.shifts, data?.requests, data?.guideCards, data?.events, data?.timeEntries, data?.teamInvites, data?.teamAccounts]
    .filter(Array.isArray)
    .forEach((items) => items.forEach((item) => collect(item.locationId)));
  collect(data?.timeClock?.locationId);
  collect(getBusinessSetup(data).primaryLocationId);
  return Array.from(ids);
}

function getSavedLocations(data) {
  return Array.isArray(data?.savedLocations) ? data.savedLocations : [];
}

function workspaceLocationList(data) {
  const physical = locations.filter((location) => location.id !== "all");
  const custom = customLocationIdsFromData(data).map((id) => ({
    id,
    name: getSavedLocations(data).find((location) => location.id === id)?.name || locationName(id),
    manager: getSavedLocations(data).find((location) => location.id === id)?.manager || "Unassigned",
  }));
  return [...physical, ...custom];
}

function businessLocations(data, includeAll = false) {
  const physical = workspaceLocationList(data);
  const visible = singleLocationMode(data) ? physical.filter((location) => location.id === primaryLocationId(data)) : physical;
  return includeAll && !singleLocationMode(data) ? [locations[0], ...visible] : visible;
}

function locationOptions(data, includeAll = false) {
  return businessLocations(data, includeAll).map((item) => [item.id, item.name]);
}

function resolveLocationEntry(data, entry, includeAll = false) {
  const cleaned = String(entry || "").trim();
  if (!cleaned) return includeAll ? "all" : primaryLocationId(data);
  const options = businessLocations(data, includeAll);
  const match = options.find((location) => (
    location.id.toLowerCase() === cleaned.toLowerCase()
    || location.name.toLowerCase() === cleaned.toLowerCase()
  ));
  return match?.id || customLocationIdFromName(cleaned);
}

function saveWorkspaceLocation(locationId, patchData, manager = "Unassigned") {
  if (!locationId || locationId === "all" || locations.some((location) => location.id === locationId)) return;
  patchData?.((data) => {
    const savedLocations = getSavedLocations(data);
    if (savedLocations.some((location) => location.id === locationId)) return data;
    return {
      ...data,
      savedLocations: [
        ...savedLocations,
        { id: locationId, name: locationName(locationId), manager },
      ],
    };
  }, `${locationName(locationId)} added to workspace locations.`);
}

function locationInputId(label) {
  return `location-${String(label || "field").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function optionLabel(options, id, fallback = "Not set") {
  return options.find(([value]) => value === id)?.[1] || fallback;
}

function effectiveLocation(data, location) {
  return singleLocationMode(data) ? primaryLocationId(data) : location;
}

function matchesActiveLocation(data, location, itemLocationId) {
  const activeLocation = effectiveLocation(data, location);
  return activeLocation === "all" || itemLocationId === activeLocation;
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function rateMoney(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
}

function parseDurationHours(duration) {
  if (!duration || duration === "Pending") return 0;
  const match = String(duration).match(/(\d+)h\s*(\d+)?m?/);
  if (!match) return 0;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  return Number((hours + minutes / 60).toFixed(2));
}

function entryWorkedHours(entry) {
  return Number(entry.workedHours ?? parseDurationHours(entry.duration));
}

function entryScheduledHours(entry) {
  return Number(entry.scheduledHours ?? Math.max(8, entryWorkedHours(entry)));
}

function entryLaborCost(entry) {
  return entryWorkedHours(entry) * Number(entry.hourlyRate || 0);
}

function entryScheduledCost(entry) {
  return entryScheduledHours(entry) * Number(entry.hourlyRate || 0);
}

function timeEntryDateKey(entry) {
  if (validDateKey(entry?.date)) return entry.date;
  const resolved = entry?.date ? requestDateKey({ date: entry.date }) : "";
  return resolved || operationsToday;
}

function timeFocusForLocation(data, location = "all", dateScope = null) {
  const scopedDateKeys = Array.isArray(dateScope)
    ? dateScope.filter(validDateKey)
    : validDateKey(dateScope)
      ? [dateScope]
      : [];
  const matchesDateScope = (entry) => !scopedDateKeys.length || scopedDateKeys.includes(timeEntryDateKey(entry));
  const pickEntry = (entries) => (
    entries.find((entry) => entry.severity !== "approved") ||
    entries.find((entry) => entry.flag.includes("Forgot") || entry.status === "Auto-flagged") ||
    entries.find((entry) => ["Working", "Ready", "Near work", "Lunch"].includes(entry.status)) ||
    [...entries].sort((a, b) => entryLaborCost(b) - entryLaborCost(a))[0]
  );
  const scopedEntries = data.timeEntries.filter((entry) => matchesDateScope(entry) && matchesActiveLocation(data, location, entry.locationId));
  const fallbackEntries = location === "all" ? [] : data.timeEntries.filter((entry) => matchesDateScope(entry) && matchesActiveLocation(data, "all", entry.locationId));
  return pickEntry(scopedEntries) || pickEntry(fallbackEntries);
}

function formatHours(value) {
  return `${Number(value || 0).toFixed(2).replace(/\.00$/, "")}h`;
}

function planDisplayName(plan) {
  if (plan === "Yearly") return "Annual Plan";
  if (plan === "Weekly") return "Starter Plan";
  return "Standard Plan";
}

function parseDateKey(value) {
  return new Date(`${value || operationsToday}T12:00:00`);
}

function validDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "");
}

function formatDisplayDate(value) {
  if (!validDateKey(value)) return "selected date";
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(parseDateKey(value));
}

function shortDisplayDate(value) {
  if (!validDateKey(value)) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(parseDateKey(value));
}

function selectedDateInfo(value) {
  const selected = parseDateKey(value);
  const today = parseDateKey(operationsToday);
  const dayOffset = Math.round((selected - today) / 86400000);
  return {
    isToday: dayOffset === 0,
    label: dayOffset === 0 ? "Today" : dayOffset === 1 ? "Tomorrow" : dayOffset === -1 ? "Yesterday" : formatDisplayDate(value),
    tone: dayOffset < 0 ? "past" : dayOffset > 0 ? "future" : "today",
    shortLabel: shortDisplayDate(value),
  };
}

function sentenceDateLabel(value) {
  const info = typeof value === "object" ? value : selectedDateInfo(value);
  return ["Today", "Tomorrow", "Yesterday"].includes(info.label) ? info.label.toLowerCase() : info.label;
}

function offsetDateKey(value, offset) {
  const date = parseDateKey(value);
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthDateKeys(value) {
  const date = parseDateKey(value);
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = new Date(year, month, index + 1);
    return `${day.getFullYear()}-${`${day.getMonth() + 1}`.padStart(2, "0")}-${`${day.getDate()}`.padStart(2, "0")}`;
  });
}

function calendarMonthCells(value) {
  const monthStart = monthStartDateKey(validDateKey(value) ? value : operationsToday);
  const start = offsetDateKey(monthStart, -parseDateKey(monthStart).getDay());
  const monthKey = monthStart.slice(0, 7);
  return Array.from({ length: 42 }, (_, index) => {
    const date = offsetDateKey(start, index);
    return {
      date,
      inMonth: date.slice(0, 7) === monthKey,
      day: Number(date.slice(8, 10)),
    };
  });
}

function dateRangeKeys(startValue, endValue, maxDays = 62) {
  const start = validDateKey(startValue) ? startValue : operationsToday;
  const end = validDateKey(endValue) ? endValue : start;
  const startTime = parseDateKey(start).getTime();
  const endTime = parseDateKey(end).getTime();
  const first = startTime <= endTime ? start : end;
  const last = startTime <= endTime ? end : start;
  const dayCount = Math.min(Math.round((parseDateKey(last) - parseDateKey(first)) / 86400000) + 1, maxDays);
  return Array.from({ length: Math.max(1, dayCount) }, (_, index) => offsetDateKey(first, index));
}

function scheduleRangeDates(value, period, endDate) {
  if (period === "custom") return dateRangeKeys(value, endDate || offsetDateKey(value, 13));
  if (period === "month") return monthDateKeys(value);
  if (period === "week") return Array.from({ length: 7 }, (_, index) => offsetDateKey(value, index));
  return [validDateKey(value) ? value : operationsToday];
}

function shiftDateKey(shift) {
  return validDateKey(shift?.date) ? shift.date : operationsToday;
}

function periodLabel(value, period, endDate) {
  const dateInfo = selectedDateInfo(value);
  if (period === "custom") {
    const range = scheduleRangeDates(value, "custom", endDate);
    const first = range[0] || value;
    const last = range[range.length - 1] || value;
    return `${shortDisplayDate(first)} - ${shortDisplayDate(last)}`;
  }
  if (period === "month") {
    return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(parseDateKey(value));
  }
  if (period === "week") {
    const end = offsetDateKey(value, 6);
    return `${shortDisplayDate(value)} - ${shortDisplayDate(end)}`;
  }
  return dateInfo.label;
}

function schedulePlanningModeDetail(selectedDate, schedulePeriod, customRangeEnd, rows = []) {
  const dateInfo = selectedDateInfo(selectedDate);
  const rangeLabel = periodLabel(selectedDate, schedulePeriod, customRangeEnd);
  const emptyDays = rows.filter((row) => !row.total).length;
  const blockerDays = rows.filter((row) => row.open || row.pending).length;
  if (schedulePeriod === "month") {
    return {
      title: "Monthly planning",
      detail: `${rangeLabel} is a forecast view. Each day keeps its own hours, staffing target, blockers, and setup rules.`,
      cadence: "Month",
      dayLogic: `${rows.length} separate day plans`,
      nextStep: emptyDays ? "Prepare empty days" : blockerDays ? "Resolve blockers" : "Review month",
      watch: emptyDays ? `${emptyDays} empty days` : `${blockerDays} blocker days`,
    };
  }
  if (schedulePeriod === "week") {
    return {
      title: "Weekly planning",
      detail: `${rangeLabel} shows seven operating days together without merging them into one schedule.`,
      cadence: "Week",
      dayLogic: "Open a day to edit its board",
      nextStep: emptyDays ? "Fill week gaps" : blockerDays ? "Clear coverage risk" : "Publish handoff",
      watch: emptyDays ? `${emptyDays} days need shifts` : `${blockerDays} days need review`,
    };
  }
  if (schedulePeriod === "custom") {
    return {
      title: "Custom range",
      detail: `${rangeLabel} lets you choose the exact planning window, then prepare or copy templates across that range.`,
      cadence: `${rows.length} days`,
      dayLogic: "Start and end dates are manual",
      nextStep: emptyDays ? "Prepare range" : blockerDays ? "Ask coverage" : "Share range",
      watch: emptyDays ? `${emptyDays} empty days` : `${blockerDays} blocker days`,
    };
  }
  return {
    title: dateInfo.label === "Tomorrow" ? "Tomorrow setup" : `${dateInfo.label} day plan`,
    detail: `${dateInfo.label} edits one operating day with its own time board, business hours, staffing target, breaks, and publish rules.`,
    cadence: "Day",
    dayLogic: "One board, one setup",
    nextStep: rows[0]?.total ? "Review day" : "Build the day",
    watch: rows[0]?.open ? `${rows[0].open} open shifts` : rows[0]?.total ? "Coverage ready" : "No shifts yet",
  };
}

function monthStartDateKey(value) {
  const date = parseDateKey(value);
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-01`;
}

function offsetPeriodDateKey(value, period, direction) {
  if (period === "month") {
    const date = parseDateKey(value);
    date.setMonth(date.getMonth() + direction);
    return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
  }
  return offsetDateKey(value, period === "week" ? direction * 7 : direction);
}

function scheduleRollupForDate(shifts, date) {
  const dayShifts = shifts.filter((shift) => shiftDateKey(shift) === date);
  const open = dayShifts.filter((shift) => shift.status === "open").length;
  const pending = dayShifts.filter((shift) => shift.status === "pending").length;
  const covered = dayShifts.filter((shift) => shift.status !== "open").length;
  const hours = dayShifts.reduce((sum, shift) => sum + shiftLength(shift), 0);
  return { date, shifts: dayShifts, total: dayShifts.length, open, pending, covered, hours };
}

function scheduleRangeSummary(shifts, dates) {
  const rows = dates.map((date) => scheduleRollupForDate(shifts, date));
  return rows.reduce((summary, row) => ({
    total: summary.total + row.total,
    open: summary.open + row.open,
    pending: summary.pending + row.pending,
    covered: summary.covered + row.covered,
    hours: summary.hours + row.hours,
    rows: [...summary.rows, row],
  }), { total: 0, open: 0, pending: 0, covered: 0, hours: 0, rows: [] });
}

function buildScheduleHorizonItems(data, shifts, selectedDate, schedulePeriod, customRangeEnd) {
  const cards = [
    { id: "today", label: "Today", date: operationsToday, period: "day", detail: "Current operating day" },
    { id: "tomorrow", label: "Tomorrow", date: offsetDateKey(operationsToday, 1), period: "day", detail: "Next operating day" },
    { id: "this-week", label: "This Week", date: operationsToday, period: "week", detail: "7 day staffing window" },
    { id: "next-week", label: "Next Week", date: offsetDateKey(operationsToday, 7), period: "week", detail: "Upcoming weekly plan" },
    { id: "this-month", label: "This Month", date: monthStartDateKey(operationsToday), period: "month", detail: "Full month planning" },
    { id: "next-month", label: "Next Month", date: offsetPeriodDateKey(monthStartDateKey(operationsToday), "month", 1), period: "month", detail: "Prepare next month early" },
    { id: "custom", label: "Custom", date: selectedDate, period: "custom", endDate: customRangeEnd, detail: "Exact start and end dates" },
  ];
  const plans = data?.datePlans || {};
  return cards.map((card) => {
    const dates = scheduleRangeDates(card.date, card.period, card.endDate);
    const summary = scheduleRangeSummary(shifts, dates);
    const emptyDays = summary.rows.filter((row) => !row.total).length;
    const preparedDays = dates.filter((date) => plans[date]).length;
    const isActive = selectedDate === card.date && schedulePeriod === card.period;
    const tone = summary.open ? "risk" : emptyDays ? "empty" : summary.total ? "ready" : "empty";
    const status = summary.open
      ? `${summary.open} gap${summary.open === 1 ? "" : "s"}`
      : emptyDays
        ? `${emptyDays} day${emptyDays === 1 ? "" : "s"} empty`
        : summary.total
          ? "Covered"
          : "No plan";
    return {
      ...card,
      dates,
      summary,
      emptyDays,
      preparedDays,
      isActive,
      tone,
      status,
      rangeLabel: periodLabel(card.date, card.period, card.endDate),
    };
  });
}

function parseScheduleHour(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value || "").trim().toLowerCase();
  const match = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return fallback;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const suffix = match[3];
  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  return Math.min(24, Math.max(0, hour + minute / 60));
}

function scheduleTimeBounds(plan, shifts = []) {
  const planStart = parseScheduleHour(plan?.businessStart, 6);
  const planEnd = parseScheduleHour(plan?.businessEnd, 22);
  const shiftStarts = shifts.map((shift) => Number(shift.start)).filter(Number.isFinite);
  const shiftEnds = shifts.map((shift) => Number(shift.end)).filter(Number.isFinite);
  const start = Math.floor(Math.min(planStart, ...shiftStarts, 6));
  const end = Math.ceil(Math.max(planEnd, ...shiftEnds, start + 1, 22));
  return {
    start: Math.max(0, Math.min(start, 23)),
    end: Math.max(Math.min(end, 24), Math.max(1, start + 1)),
  };
}

function scheduleHourMarks(bounds) {
  const start = Number(bounds?.start ?? 6);
  const end = Number(bounds?.end ?? 22);
  const span = Math.max(1, end - start);
  const step = span <= 8 ? 1 : span <= 18 ? 2 : 4;
  const marks = [];
  for (let hour = start; hour <= end; hour += step) marks.push(hour);
  if (marks[marks.length - 1] !== end) marks.push(end);
  return marks;
}

export function App() {
  const initialRole = useMemo(() => initialRoleFromUrl(), []);
  const safePreview = useMemo(() => isSafeChangePreview(), []);
  const [data, setData] = useState(loadState);
  const [role, setRole] = useState(initialRole);
  const [section, setSection] = useState(() => initialSectionFromUrl(initialRole));
  const [signedOut, setSignedOut] = useState(initialSignedOutFromUrl);
  const mode = "Simple";
  const [location, setLocation] = useState("all");
  const [day, setDay] = useState(() => initialDayFromUrl());
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [density, setDensity] = useState("Comfortable");
  const [threadId, setThreadId] = useState("m1");
  const [messageDraft, setMessageDraft] = useState("");
  const [settingsStartTab, setSettingsStartTab] = useState(() => initialSettingsTabFromUrl());
  const [routeFocus, setRouteFocus] = useState(null);

  useEffect(() => {
    localStorage.setItem(workspaceStorageKey(), JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    const safeSection = safeSectionForRole(role, section, data);
    if (safeSection !== section) setSection(safeSection);
  }, [data, role, section]);

  useEffect(() => {
    const nextLocation = effectiveLocation(data, location);
    if (nextLocation !== location) setLocation(nextLocation);
  }, [data, location]);

  function patchData(updater, message) {
    setData((current) => (typeof updater === "function" ? updater(current) : { ...current, ...updater }));
    if (message) setToast(message);
  }

  function resetSafePreview() {
    localStorage.removeItem(safePreviewStorageKey);
    setData(ensureSafePreviewSeed(normalizeState(baseState)));
    setToast("Safe preview reset. Main app data was not changed.");
  }

  function copyMainDataToSafePreview() {
    try {
      const stored = JSON.parse(localStorage.getItem(mainWorkspaceStorageKey));
      const nextData = ensureSafePreviewSeed(stored ? normalizeState(stored) : normalizeState(baseState));
      localStorage.setItem(safePreviewStorageKey, JSON.stringify(nextData));
      setData(nextData);
      setToast("Main app data copied into the safe preview.");
    } catch {
      const nextData = ensureSafePreviewSeed(normalizeState(baseState));
      localStorage.setItem(safePreviewStorageKey, JSON.stringify(nextData));
      setData(nextData);
      setToast("Safe preview started with clean demo data.");
    }
  }

  function changeRole(nextRole) {
    const nextSection = firstSectionByRole[nextRole];
    setRole(nextRole);
    setSection(nextSection);
    setSignedOut(false);
    setRouteFocus(null);
    syncBrowserUrl(nextRole, nextSection, undefined, day);
    setToast(`${roleLabel(nextRole)} preview loaded. Authority boundaries updated.`);
  }

  function signOut() {
    setSignedOut(true);
    setNotificationsOpen(false);
    setModal(null);
    setToast("");
    const params = new URLSearchParams();
    preserveSafeChangePreview(params);
    params.set("signedOut", "true");
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  }

  function authenticateFromSignedOut(message = "Signed in. Workspace opened.") {
    const nextSection = firstSectionByRole[role] || firstSectionByRole.owner;
    setSignedOut(false);
    setSection(nextSection);
    setRouteFocus(null);
    syncBrowserUrl(role, nextSection, undefined, day);
    setToast(message);
  }

  function changeDay(nextDay) {
    setDay(nextDay);
    syncBrowserUrl(role, section, section === "owner-settings" ? settingsStartTab : undefined, nextDay);
    setToast(validDateKey(nextDay) ? `Workspace date set to ${formatDisplayDate(nextDay)}.` : "Choose a date to update the workspace.");
  }

  function navigateSection(nextSection) {
    const safeSection = safeSectionForRole(role, nextSection, data);
    const nextSettingsTab = safeSection === "owner-settings" ? "business" : undefined;
    if (nextSettingsTab) setSettingsStartTab(nextSettingsTab);
    setSection(safeSection);
    setRouteFocus(null);
    syncBrowserUrl(role, safeSection, nextSettingsTab, day);
  }

  function go(nextSection, message, focus = null) {
    const safeSection = safeSectionForRole(role, nextSection, data);
    const nextSettingsTab = safeSection === "owner-settings" ? settingsStartTab : undefined;
    if (safeSection !== "owner-settings") setSettingsStartTab("business");
    setSection(safeSection);
    setRouteFocus(focus ? { ...focus, section: safeSection } : null);
    syncBrowserUrl(role, safeSection, nextSettingsTab, day);
    if (message) setToast(message);
  }

  function goSettings(tab, message) {
    const safeSection = safeSectionForRole(role, "owner-settings", data);
    setSettingsStartTab(tab);
    setSection(safeSection);
    setRouteFocus(null);
    syncBrowserUrl(role, safeSection, safeSection === "owner-settings" ? tab : undefined, day);
    if (message) setToast(message);
  }

  function changeSettingsTab(tab, label) {
    if (!settingsTabIds.includes(tab)) return;
    setSettingsStartTab(tab);
    syncBrowserUrl(role, "owner-settings", tab, day);
    setToast(`${label || settingsTabLabels[tab]} settings opened.`);
  }

  function goThread(nextThreadId, message) {
    const nextSection = role === "owner" ? "owner-team" : role === "manager" ? "manager-team" : "employee-messages";
    setThreadId(nextThreadId);
    setSection(nextSection);
    setRouteFocus(null);
    syncBrowserUrl(role, nextSection, undefined, day);
    if (message) setToast(message);
  }

  const activeLocation = effectiveLocation(data, location);
  const filteredShifts = useMemo(() => {
    if (activeLocation === "all") return data.shifts;
    return data.shifts.filter((shift) => shift.locationId === activeLocation);
  }, [activeLocation, data.shifts]);

  const metrics = useMemo(() => getMetrics(data, activeLocation), [activeLocation, data]);
  const nav = navForRole(role, data);
  const activeLabel = nav.find(([id]) => id === section)?.[1] || "Dashboard";

  if (signedOut) {
    return <SignedOutScreen onAuthenticated={authenticateFromSignedOut} />;
  }

  return (
    <div className={`app-shell role-${role} section-${section} density-${density.toLowerCase()} ${safePreview ? "safe-change-preview-mode" : ""}`}>
      <Sidebar nav={nav} role={role} section={section} onRole={changeRole} onSection={navigateSection} data={data} />
      <main className="workspace">
        <Topbar
          activeLabel={activeLabel}
          role={role}
          mode={mode}
          location={activeLocation}
          setLocation={setLocation}
          day={day}
          setDay={changeDay}
          notificationsOpen={notificationsOpen}
          setNotificationsOpen={setNotificationsOpen}
          data={data}
          patchData={patchData}
          go={go}
          goSettings={goSettings}
          onSignOut={signOut}
        />
        {toast && (
          <div className="toast" role="status">
            <CheckCircle size={18} weight="fill" />
            <span>{toast}</span>
            <button type="button" aria-label="Dismiss update" onClick={() => setToast("")}>
              <X size={16} />
            </button>
          </div>
        )}

        {safePreview && (
          <SafeChangePreviewBar
            data={data}
            role={role}
            day={day}
            onReset={resetSafePreview}
            onCopyMain={copyMainDataToSafePreview}
          />
        )}

        <Screen
          data={data}
          patchData={patchData}
          role={role}
          section={section}
          mode={mode}
          location={activeLocation}
          setLocation={setLocation}
          day={day}
          setDay={changeDay}
          metrics={metrics}
          shifts={filteredShifts}
          openModal={setModal}
          go={go}
          goSettings={goSettings}
          goThread={goThread}
          density={density}
          setDensity={setDensity}
          settingsStartTab={settingsStartTab}
          onSettingsTabChange={changeSettingsTab}
          threadId={threadId}
          setThreadId={setThreadId}
          messageDraft={messageDraft}
          setMessageDraft={setMessageDraft}
          routeFocus={routeFocus}
        />
      </main>

      {modal && (
        <ActionModal
          modal={modal}
          setModal={setModal}
          data={data}
          patchData={patchData}
          role={role}
          selectedDay={day}
        />
      )}
    </div>
  );
}

function SafeChangePreviewBar({ data, role, day, onReset, onCopyMain }) {
  const currentParams = new URLSearchParams(window.location.search);
  const exitParams = new URLSearchParams(currentParams);
  exitParams.delete("preview");
  exitParams.delete("sandbox");
  const exitUrl = `${window.location.pathname}?${exitParams.toString()}`;
  const accounts = Array.isArray(data?.safePreviewAccounts) ? data.safePreviewAccounts : safePreviewAccounts;
  const ownerCount = accounts.filter((account) => account.role === "owner").length;
  const managerCount = accounts.filter((account) => account.role === "manager").length;
  const employeeCount = accounts.filter((account) => account.role === "employee").length;
  const visibleAccounts = accounts.filter((account) => (
    role === "owner" ? true : role === "manager" ? account.role !== "owner" : account.role === "employee"
  ));
  const currentAccountId = currentSafePreviewAccountId();
  const labTitle = role === "owner"
    ? "10 test accounts and linked flows"
    : role === "manager"
      ? "Manager and employee test paths"
      : "Employee-only test paths";

  return (
    <section className="safe-change-preview-panel" aria-label="Safe change preview">
      <div className="safe-change-preview-bar">
        <div className="safe-change-preview-copy">
          <ShieldCheck size={20} weight="fill" />
          <div>
            <strong>Safe Change Preview</strong>
            <span>Testing copy only. Normal owner, manager, and employee data stays protected.</span>
          </div>
        </div>
        <div className="safe-change-preview-actions">
          <button type="button" onClick={onCopyMain}>Copy Main Data</button>
          <button type="button" onClick={onReset}>Reset Preview</button>
          <a href={exitUrl}>Exit Preview</a>
        </div>
      </div>
      <details className="safe-preview-test-lab">
        <summary>
          <div>
            <p className="eyebrow">Test lab</p>
            <h3>{labTitle}</h3>
          </div>
          <div className="safe-preview-lab-metrics" aria-label="Safe preview account counts">
            <span><strong>{ownerCount}</strong> owner</span>
            <span><strong>{managerCount}</strong> managers</span>
            <span><strong>{employeeCount}</strong> employees</span>
          </div>
          <span className="safe-preview-lab-toggle" aria-hidden="true" />
        </summary>
        <div className="safe-preview-lab-body">
          <div className="safe-preview-account-strip" aria-label="Test account links">
            {visibleAccounts.map((account) => (
              <a
                key={account.id}
                className={`${currentAccountId === account.id ? "active" : ""} ${account.role}`}
                href={safePreviewAccountUrl(account, validDateKey(day) ? day : operationsToday)}
              >
                <span>{initialsFromName(account.name, "TA")}</span>
                <strong>{account.name}</strong>
                <em>{account.role}</em>
              </a>
            ))}
          </div>
          <div className="safe-preview-flow-grid" aria-label="Preview flow health">
            {safePreviewFlowChecks.map((flow) => (
              <article key={flow.id}>
                <strong>{flow.name}</strong>
                <p>{flow[role] || flow.owner}</p>
                <span>Linked and role-scoped</span>
              </article>
            ))}
          </div>
        </div>
      </details>
    </section>
  );
}

function roleLabel(role) {
  if (role === "platform-admin") return "Platform Admin";
  return role === "owner" ? "Owner" : role === "manager" ? "Manager" : "Employee";
}

function initialsFromName(name, fallback = "OS") {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || fallback;
}

function safePreviewAccountForRole(role, data) {
  if (!isSafeChangePreview()) return null;
  const accountId = currentSafePreviewAccountId();
  if (!accountId) return null;
  const accounts = Array.isArray(data?.safePreviewAccounts) ? data.safePreviewAccounts : safePreviewAccounts;
  const account = accounts.find((entry) => entry.id === accountId && entry.role === role);
  if (!account) return null;
  return {
    name: account.name,
    email: account.email,
    initials: initialsFromName(account.name, role === "owner" ? "OS" : role === "manager" ? "MG" : "EM"),
    title: `${account.title} test account`,
    location: account.locationId === "all" ? getSettingsProfile(data).displayName : locationName(account.locationId),
    rate: account.hourlyRate || null,
  };
}

function accountProfileForRole(role, data) {
  const previewAccount = safePreviewAccountForRole(role, data);
  if (previewAccount) return previewAccount;
  const profile = getSettingsProfile(data);
  if (role === "owner") {
    return {
      name: profile.primaryContact || "Owner",
      email: profile.email || "owner@workforce.local",
      initials: "OS",
      title: "Owner account",
      location: profile.displayName,
      rate: null,
    };
  }
  const accounts = Array.isArray(data?.teamAccounts) ? data.teamAccounts : [];
  const account = accounts.find((entry) => entry.role === role);
  if (role === "manager") {
    const name = account?.name || "Maya Chen";
    const locationId = account?.locationId || primaryLocationId(data);
    return {
      name,
      email: account?.email || "manager@workforce.local",
      initials: initialsFromName(name, "MG"),
      title: "Manager account",
      location: locationName(locationId),
      rate: null,
    };
  }
  const name = account?.name || "Ava Brooks";
  const locationId = account?.locationId || primaryLocationId(data);
  return {
    name,
    email: account?.email || "employee@workforce.local",
    initials: initialsFromName(name, "EM"),
    title: "Employee account",
    location: locationName(locationId),
    rate: employeeHourlyRate(data),
  };
}

function navForRole(role, data = baseState) {
  if (role === "platform-admin") return platformAdminNav;
  if (role === "owner") {
    const nav = ownerNav.map((item) => [...item, "Owner Section"]);
    return ownerRunsManagerFunctions(data) ? [
      ...nav,
      ["owner-manager-dashboard", "Manager Operations", Buildings, "Manager Functions"],
    ] : nav;
  }
  if (role === "manager") return managerNav;
  return employeeNav;
}

function sectionIdsForRole(role, data = baseState) {
  return navForRole(role, data).map(([id]) => id);
}

function canRoleAccessSection(role, section, data = baseState) {
  return sectionIdsForRole(role, data).includes(section);
}

function safeSectionForRole(role, section, data = baseState) {
  return canRoleAccessSection(role, section, data) ? section : firstSectionByRole[role];
}

function runtimeRoleForSection(role, section) {
  return role === "manager" && section?.startsWith("employee-") ? "employee" : role;
}

function Sidebar({ nav, role, section, onRole, onSection, data }) {
  let lastGroup = "";
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><ShieldCheck size={31} weight="fill" /></div>
        <div>
          <h1>WorkForce</h1>
          <p>Command Center</p>
        </div>
      </div>

      {role === "platform-admin" ? (
        <div className="admin-role-badge">
          <Sparkle size={17} weight="fill" />
          <span>Platform Admin</span>
        </div>
      ) : (
        <div className="role-badge" aria-label={`${roleLabel(role)} account`}>
          <UserCircle size={17} weight="fill" />
          <span>{roleLabel(role)} account</span>
        </div>
      )}

      <div className="authority-note">
        <ShieldCheck size={18} weight="fill" />
        <span>{authorityCopy(role, data)}</span>
      </div>

      <nav className="nav-list" aria-label={`${roleLabel(role)} navigation`}>
        {nav.map(([id, label, Icon, group]) => {
          const showGroup = group !== lastGroup;
          lastGroup = group;
          return (
            <div className="nav-pack" key={id}>
              {showGroup && <p className="nav-group">{group}</p>}
              <button type="button" className={section === id ? "active" : ""} onClick={() => onSection(id)}>
                <Icon size={19} />
                <span>{label}</span>
              </button>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function authorityCopy(role, data) {
  if (role === "platform-admin") return "Internal admin tooling only. Business owners, managers, and employees do not receive this section.";
  if (role === "owner" && ownerRunsManagerFunctions(data)) return "Owner section includes manager functions because no manager is assigned.";
  if (role === "owner") return "Owner section only. Billing and workspace controls are visible.";
  if (role === "manager") return "Manager and employee sections only. Owner billing is hidden.";
  return "Employee section only. Approval and admin controls are hidden.";
}

function Topbar({
  activeLabel,
  role,
  mode,
  location,
  setLocation,
  day,
  setDay,
  notificationsOpen,
  setNotificationsOpen,
  data,
  patchData,
  go,
  goSettings,
  onSignOut,
}) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const singleLocation = singleLocationMode(data);
  const activeBusinessId = getActiveBusinessId(data);
  const profile = getSettingsProfile(data);
  const account = accountProfileForRole(role, data);
  const ownerManagerMode = ownerRunsManagerFunctions(data);
  const dateInfo = selectedDateInfo(day);
  const ownerDateLabel = sentenceDateLabel(dateInfo);
  const ownerSubtitle = activeLabel === "Settings & Billing"
    ? "Manage your business, team, and subscription."
    : `Overview of ${ownerDateLabel} operations across your business.`;
  const notificationItems = role === "platform-admin" ? [] : buildNotificationItems(data, role, location, day);
  const alertCount = notificationItems.filter((item) => item.alert).reduce((sum, item) => sum + Math.max(1, Number(item.count || 0)), 0);
  const topNotification = notificationItems.find((item) => item.alert) || notificationItems[0];
  const urgentNotifications = notificationItems.filter((item) => item.tone === "urgent").length;
  const clearNotifications = notificationItems.filter((item) => item.tone === "good").length;
  const actionCenterStatus = alertCount
    ? `${alertCount} item${alertCount === 1 ? "" : "s"} ${alertCount === 1 ? "needs" : "need"} attention`
    : "No urgent blockers";
  const actionCenterQuickActions = buildActionCenterQuickActions(data, role, day, location, patchData, go, goSettings);
  function openAccountMenu() {
    setUserMenuOpen((open) => !open);
    setNotificationsOpen(false);
  }

  function goFromAccountMenu(action) {
    action();
    setUserMenuOpen(false);
  }

  function openNotificationItem(item) {
    if (item.locationId && item.locationId !== "all") setLocation?.(item.locationId);
    if (item.settingsTab) {
      goSettings(item.settingsTab, item.message);
    } else if (item.section) {
      go(item.section, item.message, item.focus);
    }
    setNotificationsOpen(false);
  }

  function runActionCenterCommand(action) {
    action.onClick?.();
    setNotificationsOpen(false);
  }

  function saveCommittedWorkspaceLocation(nextLocation) {
    saveWorkspaceLocation(nextLocation, patchData);
  }

  if (role === "platform-admin") {
    return (
      <header className="topbar admin-topbar">
        <div className="topbar-title">
          <p className="eyebrow">Platform Admin workspace</p>
          <h2>{activeLabel}</h2>
          <span>Internal review, testing, and safe fix proposals for the app.</span>
        </div>
        <div className="admin-topbar-controls">
          <div className="admin-tool-pill">
            <ShieldCheck size={18} weight="fill" />
            <span>Internal tool</span>
          </div>
          <div className="admin-tool-pill">
            <Sparkle size={18} weight="fill" />
            <span>Agents SDK</span>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="topbar">
      <div className="topbar-title">
        <p className="eyebrow">{roleLabel(role)} workspace</p>
        <h2>{activeLabel}</h2>
        {role === "owner" && <span>{ownerSubtitle}</span>}
      </div>
      <div className="topbar-controls">
        {role === "owner" && (
          <label className="select-control business-control">
            <span>Business</span>
            <select value={activeBusinessId} onChange={(event) => switchBusinessWorkspace(event.target.value, patchData, setLocation)}>
              {Object.entries(businessWorkspaces).map(([id, workspace]) => (
                <option key={id} value={id}>{workspace.label}</option>
              ))}
            </select>
          </label>
        )}
        <div className="mode-label" aria-label="Current mode">
          {mode}
        </div>
        {singleLocation ? (
          <div className="location-pill" aria-label="Single location">
            <MapPin size={18} weight="fill" />
            <div>
              <span>Location</span>
              <strong>{locationName(primaryLocationId(data))}</strong>
            </div>
          </div>
        ) : (
          <LocationInput
            label="Location"
            value={location}
            onChange={setLocation}
            onCommit={saveCommittedWorkspaceLocation}
            data={data}
            includeAll
            className="select-control location-search-control"
          />
        )}
        <label className="select-control">
          <span>Date</span>
          <input
            type="date"
            value={day}
            onInput={(event) => setDay(event.currentTarget.value)}
            onChange={(event) => setDay(event.target.value)}
          />
        </label>
        <button className="icon-action" type="button" onClick={() => {
          setNotificationsOpen(!notificationsOpen);
          setUserMenuOpen(false);
        }} aria-label="Open notifications">
          <Bell size={20} />
          {alertCount > 0 && <span>{alertCount}</span>}
        </button>
        <button
          className={`user-pill ${userMenuOpen ? "active" : ""}`}
          type="button"
          onClick={openAccountMenu}
          aria-label={`Open ${roleLabel(role).toLowerCase()} account menu`}
          aria-expanded={userMenuOpen}
        >
          <strong>{account.initials}</strong>
          <span>{roleLabel(role)}</span>
        </button>
      </div>
      {userMenuOpen && (
        <div className="user-menu-panel">
          <div className="user-menu-head">
            <strong>{account.title}</strong>
            <span>{account.name}</span>
          </div>
          <div className="authority-line">
            <ShieldCheck size={16} weight="fill" />
            <span>
              {role === "owner"
                ? ownerManagerMode ? "Owner access with manager fallback active" : "Owner access active"
                : role === "manager"
                  ? "Manager settings active. Owner billing stays hidden."
                  : "Employee access active. Admin controls stay hidden."}
            </span>
          </div>
          {role === "owner" ? (
            <>
              <button type="button" onClick={() => goFromAccountMenu(() => goSettings("business", "Business profile opened from account menu."))}>
                <Buildings size={17} />
                <span>Business Profile</span>
              </button>
              <button type="button" onClick={() => goFromAccountMenu(() => goSettings("roles", "Roles and permissions opened from account menu."))}>
                <UsersThree size={17} />
                <span>Roles & Permissions</span>
              </button>
              <button type="button" onClick={() => goFromAccountMenu(() => goSettings("security", "Security settings opened from account menu."))}>
                <ShieldCheck size={17} />
                <span>Security</span>
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => goFromAccountMenu(() => go(`${role}-settings`, `${roleLabel(role)} profile settings opened.`))}>
                <UserCircle size={17} />
                <span>{roleLabel(role)} Profile</span>
              </button>
              <button type="button" onClick={() => goFromAccountMenu(() => go(`${role}-settings`, `${roleLabel(role)} notification settings opened.`))}>
                <Bell size={17} />
                <span>Notifications</span>
              </button>
              <button type="button" onClick={() => goFromAccountMenu(() => go(`${role}-settings`, `${roleLabel(role)} security settings opened.`))}>
                <ShieldCheck size={17} />
                <span>Security</span>
              </button>
            </>
          )}
          {role === "owner" && ownerManagerMode && (
            <button type="button" onClick={() => goFromAccountMenu(() => go("owner-manager-dashboard", "Manager operations opened from owner account menu."))}>
              <UserCircle size={17} />
              <span>Manager Operations</span>
            </button>
          )}
          <button type="button" className="user-menu-signout" onClick={onSignOut}>
            <SignOut size={17} />
            <span>Sign out</span>
          </button>
        </div>
      )}
      {notificationsOpen && (
        <div className="notifications-panel">
          <div className="notifications-head">
            <div>
              <strong>Action Center</strong>
              <span>{actionCenterStatus}</span>
            </div>
            <button type="button" aria-label="Close notifications" onClick={() => setNotificationsOpen(false)}>
              <X size={15} />
            </button>
          </div>
          <section className={`notification-command-card ${urgentNotifications ? "urgent" : alertCount ? "warn" : "good"}`} aria-label="Action Center summary">
            <div>
              <span>{roleLabel(role)} command</span>
              <strong>{topNotification?.label || "All clear"}</strong>
              <p>{topNotification?.detail || "No active operations are waiting."}</p>
            </div>
            <div className="notification-command-metrics">
              <span>{urgentNotifications} urgent</span>
              <span>{clearNotifications} clear</span>
            </div>
          </section>
          <div className="notification-quick-actions" aria-label="Action Center quick actions">
            {actionCenterQuickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button type="button" key={action.label} onClick={() => runActionCenterCommand(action)} {...homeActionTarget(action.target)}>
                  <Icon size={16} />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
          <div className="notification-action-list">
            {notificationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button type="button" className={`notification-action ${item.tone}`} key={item.id} onClick={() => openNotificationItem(item)} {...homeActionTarget(item.target)}>
                  <Icon size={17} weight="fill" />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </span>
                  <em>{item.meta}</em>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}

function buildNotificationItems(data, role, location, day) {
  const activeLocation = effectiveLocation(data, location);
  const date = validDateKey(day) ? day : operationsToday;
  const scheduleTarget = role === "owner" ? "owner-schedule" : role === "manager" ? "manager-schedule" : "employee-schedule";
  const requestTarget = role === "owner" ? "owner-requests" : role === "manager" ? "manager-requests" : "employee-requests";
  const timeTarget = role === "owner" ? "owner-time" : role === "manager" ? "manager-time" : "employee-clock";
  const guideTarget = role === "owner" ? "owner-guide" : role === "manager" ? "manager-guide" : "employee-guide";
  const dateInfo = selectedDateInfo(date);

  if (role === "employee") {
    const openShifts = employeeAvailableShifts(data).filter((shift) => shiftDateKey(shift) === date);
    const leadShift = openShifts[0];
    const myRequests = employeeRequests(data).filter((request) => requestAppliesToDate(request, date));
    const pendingRequest = myRequests.find((request) => request.status === "pending") || myRequests[0];
    const nextGuide = data.guideCards.find((card) => !data.completedGuideIds.includes(card.id)) || data.guideCards[0];
    const clock = { ...defaultTimeClock, ...(data.timeClock || {}) };
    const punch = employeeHomePunchAction(clock);
    const clockLabel = dateInfo.isToday ? punch.label : "Time Clock";
    const clockDetail = dateInfo.isToday
      ? `${clock.locationStatus === "verified" ? "Location check ready" : "Location needs review"} - ${clock.lastPunch}.`
      : `${dateInfo.label} review only. Punch actions unlock on the workday.`;
    return [
      leadShift
        ? {
          id: "employee-open-shifts",
          label: `${openShifts.length} open shift${openShifts.length === 1 ? "" : "s"}`,
          detail: `${locationName(leadShift.locationId)} needs ${leadShift.role}, ${formatHour(leadShift.start)} - ${formatHour(leadShift.end)}.`,
          meta: "Request",
          count: openShifts.length,
          alert: true,
          tone: "warn",
          icon: CalendarBlank,
          section: "employee-shifts",
          target: "employee-shifts",
          message: "Open shifts opened from Action Center.",
          focus: {
            title: "Open shift alert opened",
            detail: `${locationName(leadShift.locationId)} needs ${leadShift.role}, ${formatHour(leadShift.start)} - ${formatHour(leadShift.end)}.`,
            source: "Action Center",
            shiftId: leadShift.id,
            scheduleDate: date,
          },
        }
        : {
          id: "employee-open-shifts-clear",
          label: "No open shifts",
          detail: `No pickup options for ${dateInfo.label}.`,
          meta: "Monitor",
          count: 0,
          alert: false,
          tone: "good",
          icon: CheckCircle,
          section: "employee-shifts",
          target: "employee-shifts",
          message: "Open shifts opened from Action Center.",
          focus: {
            title: "Open shifts opened",
            detail: `No open shifts are available for ${dateInfo.label}.`,
            source: "Action Center",
            scheduleDate: date,
          },
        },
      {
        id: "employee-clock",
        label: clockLabel,
        detail: clockDetail,
        meta: "Time",
        count: 0,
        alert: dateInfo.isToday && clock.status === "off",
        tone: dateInfo.isToday && clock.status === "off" ? "info" : "good",
        icon: Clock,
        section: timeTarget,
        target: timeTarget,
        message: "Time clock opened from Action Center.",
        focus: {
          title: `${dateInfo.label} time clock`,
          detail: dateInfo.isToday ? "Clock action opened from Action Center." : "Future dates are review only until the workday.",
          source: "Action Center",
          scheduleDate: date,
        },
      },
      pendingRequest
        ? {
          id: "employee-requests",
          label: `${pendingRequest.type} ${pendingRequest.status}`,
          detail: `${pendingRequest.date} - ${pendingRequest.reason}`,
          meta: pendingRequest.status,
          count: pendingRequest.status === "pending" ? 1 : 0,
          alert: pendingRequest.status === "pending",
          tone: pendingRequest.status === "pending" ? "info" : "good",
          icon: ListChecks,
          section: requestTarget,
          target: requestTarget,
          message: "My requests opened from Action Center.",
          focus: {
            title: "Request opened",
            detail: `${pendingRequest.type} - ${pendingRequest.status}.`,
            source: "Action Center",
            requestId: pendingRequest.id,
            scheduleDate: date,
          },
        }
        : {
          id: "employee-requests-clear",
          label: "No active requests",
          detail: "Create a time-off or shift request when you need one.",
          meta: "Ready",
          count: 0,
          alert: false,
          tone: "good",
          icon: ListChecks,
          section: requestTarget,
          target: requestTarget,
          message: "My requests opened from Action Center.",
          focus: {
            title: "My requests opened",
            detail: `No employee requests are active for ${dateInfo.label}.`,
            source: "Action Center",
            scheduleDate: date,
          },
        },
      {
        id: "employee-guide",
        label: nextGuide ? nextGuide.title : "Guide complete",
        detail: nextGuide ? `${nextGuide.completion}% complete. Open the guide before your shift.` : "No guide card needs review.",
        meta: "Guide",
        count: nextGuide && nextGuide.completion < 100 ? 1 : 0,
        alert: Boolean(nextGuide && nextGuide.completion < 70),
        tone: nextGuide && nextGuide.completion < 70 ? "warn" : "info",
        icon: BookOpenText,
        section: guideTarget,
        target: guideTarget,
        message: "Guide opened from Action Center.",
        focus: nextGuide ? {
          title: "Guide opened",
          detail: `${nextGuide.title} is ${nextGuide.completion}% complete.`,
          source: "Action Center",
          guideId: nextGuide.id,
        } : undefined,
      },
    ];
  }

  const scopedShifts = data.shifts.filter((shift) => matchesActiveLocation(data, activeLocation, shift.locationId));
  const dayShifts = scopedShifts.filter((shift) => shiftDateKey(shift) === date);
  const openShifts = dayShifts.filter((shift) => shift.status === "open");
  const leadShift = openShifts[0];
  const noDayPlan = dayShifts.length === 0;
  const pendingRequests = data.requests.filter((request) => request.status === "pending" && requestAppliesToDate(request, date) && matchesActiveLocation(data, activeLocation, request.locationId));
  const leadRequest = pendingRequests[0];
  const timeFlags = data.timeEntries.filter((entry) => entry.severity !== "approved" && timeEntryDateKey(entry) === date && matchesActiveLocation(data, activeLocation, entry.locationId));
  const leadTimeFlag = timeFlags[0];
  const guide = [...data.guideCards]
    .filter((card) => activeLocation === "all" || card.locationId === "all" || card.locationId === activeLocation)
    .sort((a, b) => (a.completion || 0) - (b.completion || 0))[0];

  const items = [
    {
      id: "requests",
      label: leadRequest ? `${pendingRequests.length} request${pendingRequests.length === 1 ? "" : "s"} waiting` : "Requests clear",
      detail: leadRequest ? `${leadRequest.employee}: ${leadRequest.type} at ${locationName(leadRequest.locationId)}.` : "No request decision is waiting in this view.",
      meta: leadRequest ? "Review" : "Clear",
      count: pendingRequests.length,
      alert: pendingRequests.length > 0,
      tone: pendingRequests.length ? "warn" : "good",
      icon: ListChecks,
      section: requestTarget,
      target: requestTarget,
      locationId: leadRequest?.locationId,
      message: "Request queue opened from Action Center.",
      focus: {
        title: leadRequest ? "Request queue opened" : "Requests clear",
        detail: leadRequest ? `${leadRequest.employee} has a ${leadRequest.type.toLowerCase()} request waiting.` : "No pending request decisions in this view.",
        source: "Action Center",
      },
    },
    {
      id: "schedule",
      label: leadShift ? `${openShifts.length} open shift${openShifts.length === 1 ? "" : "s"}` : noDayPlan ? `${dateInfo.label} not planned` : "Coverage clear",
      detail: leadShift
        ? `${locationName(leadShift.locationId)} needs ${leadShift.role}, ${formatHour(leadShift.start)} - ${formatHour(leadShift.end)}.`
        : noDayPlan
          ? `No shifts are planned for ${sentenceDateLabel(dateInfo)} in this view.`
          : "No open shift is currently unfilled.",
      meta: leadShift ? "Schedule" : noDayPlan ? "Plan" : "Covered",
      count: openShifts.length,
      alert: Boolean(leadShift || noDayPlan),
      tone: leadShift ? "urgent" : noDayPlan ? "warn" : "good",
      icon: CalendarBlank,
      section: scheduleTarget,
      target: scheduleTarget,
      locationId: leadShift?.locationId,
      message: "Schedule opened from Action Center.",
      focus: {
        title: leadShift ? "Coverage gap opened" : noDayPlan ? "Schedule not planned" : "Schedule clear",
        detail: leadShift
          ? `${locationName(leadShift.locationId)} needs ${leadShift.role}, ${formatHour(leadShift.start)} - ${formatHour(leadShift.end)}.`
          : noDayPlan
            ? `No shifts are planned for ${sentenceDateLabel(dateInfo)}. Build the day or copy a template.`
            : "No open coverage gap is showing in this view.",
        source: "Action Center",
        shiftId: leadShift?.id,
        schedulePeriod: "day",
        scheduleDate: date,
      },
    },
    {
      id: "time",
      label: leadTimeFlag ? `${timeFlags.length} time flag${timeFlags.length === 1 ? "" : "s"}` : "Time clean",
      detail: leadTimeFlag ? `${leadTimeFlag.employee}: ${leadTimeFlag.flag} at ${locationName(leadTimeFlag.locationId)}.` : "No time clock exception is open.",
      meta: leadTimeFlag ? "Audit" : "Clear",
      count: timeFlags.length,
      alert: timeFlags.length > 0,
      tone: timeFlags.length ? "urgent" : "good",
      icon: Clock,
      section: timeTarget,
      target: timeTarget,
      locationId: leadTimeFlag?.locationId,
      message: "Time review opened from Action Center.",
      focus: {
        title: leadTimeFlag ? "Time flag opened" : "Time review opened",
        detail: leadTimeFlag ? `${leadTimeFlag.employee} has ${leadTimeFlag.flag.toLowerCase()} at ${locationName(leadTimeFlag.locationId)}.` : "No open time exception is showing in this view.",
        source: "Action Center",
        timeEntryId: leadTimeFlag?.id,
        timeView: leadTimeFlag ? "exceptions" : "active",
      },
    },
    {
      id: "guide",
      label: guide && guide.completion < 90 ? "Guide needs work" : "Guide steady",
      detail: guide ? `${guide.title} is ${guide.completion}% complete.` : "No guide cards are configured yet.",
      meta: "Guide",
      count: guide && guide.completion < 90 ? 1 : 0,
      alert: Boolean(guide && guide.completion < 70),
      tone: guide && guide.completion < 70 ? "warn" : "info",
      icon: BookOpenText,
      section: guideTarget,
      target: guideTarget,
      locationId: guide?.locationId,
      message: "Guide opened from Action Center.",
      focus: guide ? {
        title: "Guide opened",
        detail: `${guide.title} is ${guide.completion}% complete.`,
        source: "Action Center",
        guideId: guide.id,
      } : undefined,
    },
  ];

  if (role === "owner") {
    const eventGaps = data.events
      .filter((event) => matchesActiveLocation(data, activeLocation, event.locationId))
      .map((event) => ({ ...event, gap: Math.max(0, Number(event.needed || 0) - Number(event.signed || 0)) }))
      .filter((event) => event.gap > 0);
    const leadEvent = eventGaps[0];
    items.splice(3, 0, {
      id: "events",
      label: leadEvent ? `${eventGaps.length} event gap${eventGaps.length === 1 ? "" : "s"}` : "Events staffed",
      detail: leadEvent ? `${leadEvent.title} needs ${leadEvent.gap} more at ${locationName(leadEvent.locationId)}.` : "Event signups are currently covered.",
      meta: leadEvent ? "Staff" : "Covered",
      count: eventGaps.length,
      alert: eventGaps.length > 0,
      tone: eventGaps.length ? "warn" : "good",
      icon: MapPin,
      section: "owner-events",
      target: "owner-events",
      locationId: leadEvent?.locationId,
      message: "Events opened from Action Center.",
      focus: {
        title: leadEvent ? "Event staffing gap opened" : "Events staffed",
        detail: leadEvent ? `${leadEvent.title} needs ${leadEvent.gap} more team member${leadEvent.gap === 1 ? "" : "s"}.` : "Event signups are currently covered.",
        source: "Action Center",
        eventId: leadEvent?.id,
      },
    });
    const paidSeats = Math.max(0, Number(data.billing.seats || 0) - Number(data.billing.included || 0));
    items.push({
      id: "billing",
      label: `${paidSeats} paid seat${paidSeats === 1 ? "" : "s"}`,
      detail: `${data.billing.seats} total seats on the ${data.billing.plan} plan.`,
      meta: "Billing",
      count: 0,
      alert: false,
      tone: "info",
      icon: CreditCard,
      settingsTab: "billing",
      target: "owner-settings:billing",
      message: "Billing seats opened from Action Center.",
    });
  }

  return items;
}

function buildActionCenterQuickActions(data, role, day, location, patchData, go, goSettings) {
  const selectedDate = validDateKey(day) ? day : operationsToday;
  const activeLocation = effectiveLocation(data, location);
  if (role === "owner") {
    return [
      {
        label: "Send Handoff",
        icon: PaperPlaneRight,
        target: "owner-team:manager-handoff",
        onClick: () => sendDashboardHandoff(selectedDate, activeLocation, patchData),
      },
      {
        label: "Risk Brief",
        icon: WarningCircle,
        target: "owner-team:manager-handoff",
        onClick: () => sendDashboardRiskBrief(selectedDate, activeLocation, patchData),
      },
      {
        label: "Daily Report",
        icon: ChartLineUp,
        target: "owner-reports:business",
        onClick: () => go("owner-reports", "Daily report opened from Action Center.", {
          title: "Daily report opened",
          detail: "Generate or share the current operating snapshot.",
          source: "Action Center",
          reportType: "business",
          reportDate: selectedDate,
        }),
      },
      {
        label: "Billing",
        icon: CreditCard,
        target: "owner-settings:billing",
        onClick: () => goSettings("billing", "Billing seats opened from Action Center."),
      },
    ];
  }
  if (role === "manager") {
    const scopedShifts = data.shifts.filter((shift) => matchesActiveLocation(data, activeLocation, shift.locationId));
    const dayShifts = scopedShifts.filter((shift) => shiftDateKey(shift) === selectedDate);
    const openCount = dayShifts.filter((shift) => shift.status === "open").length;
    const pendingCount = data.requests.filter((request) => request.status === "pending" && requestAppliesToDate(request, selectedDate) && matchesActiveLocation(data, activeLocation, request.locationId)).length;
    return [
      {
        label: "Send Handoff",
        icon: PaperPlaneRight,
        target: "manager-team:manager-handoff",
        onClick: () => sendScheduleHandoff(openCount, pendingCount, patchData, { day: selectedDate, location: activeLocation }),
      },
      {
        label: "Schedule",
        icon: CalendarBlank,
        target: "manager-schedule",
        onClick: () => go("manager-schedule", "Manager schedule opened from Action Center.", {
          title: "Schedule opened",
          detail: "Review coverage and prepare the selected day.",
          source: "Action Center",
          schedulePeriod: "day",
          scheduleDate: selectedDate,
        }),
      },
      {
        label: "Time Review",
        icon: Clock,
        target: "manager-time",
        onClick: () => go("manager-time", "Manager time review opened from Action Center.", {
          title: "Time review opened",
          detail: "Review late starts, missed punches, and corrections.",
          source: "Action Center",
          timeView: "exceptions",
        }),
      },
    ];
  }
  return [
    {
      label: "My Shift",
      icon: CalendarBlank,
      target: "employee-schedule",
      onClick: () => go("employee-schedule", "My schedule opened from Action Center.", {
        title: "Schedule opened",
        detail: "Review your selected day and upcoming week.",
        source: "Action Center",
        scheduleDate: selectedDate,
      }),
    },
      {
        label: "Time Clock",
        icon: Clock,
        target: "employee-clock",
        onClick: () => go("employee-clock", "Time clock opened from Action Center.", {
        title: `${selectedDateInfo(selectedDate).label} time clock`,
        detail: selectedDate === operationsToday ? "Clock in, manage lunch, or send an almost-there note." : "Future dates are review only until the workday.",
        source: "Action Center",
        scheduleDate: selectedDate,
      }),
    },
      {
        label: "Requests",
        icon: ListChecks,
        target: "employee-requests",
        onClick: () => go("employee-requests", "My requests opened from Action Center.", {
        title: "Requests opened",
        detail: "Review your time-off and shift requests.",
        source: "Action Center",
        scheduleDate: selectedDate,
      }),
    },
  ];
}

function buildOwnerReadiness(data, shifts, metrics, location, day) {
  const activeLocation = effectiveLocation(data, location);
  const date = validDateKey(day) ? day : operationsToday;
  const dateInfo = selectedDateInfo(date);
  const scopedShifts = shifts.filter((shift) => matchesActiveLocation(data, activeLocation, shift.locationId));
  const dayShifts = scopedShifts.filter((shift) => shiftDateKey(shift) === date);
  const dayOpenShifts = dayShifts.filter((shift) => shift.status === "open");
  const leadOpenShift = dayOpenShifts[0];
  const noDayPlan = dayShifts.length === 0;
  const pendingRequests = data.requests.filter((request) => request.status === "pending" && requestAppliesToDate(request, date) && matchesActiveLocation(data, activeLocation, request.locationId));
  const leadRequest = pendingRequests[0];
  const timeFlags = (data.timeEntries || []).filter((entry) => entry.severity !== "approved" && timeEntryDateKey(entry) === date && matchesActiveLocation(data, activeLocation, entry.locationId));
  const leadTimeFlag = timeFlags[0];
  const eventGaps = data.events
    .filter((event) => matchesActiveLocation(data, activeLocation, event.locationId))
    .map((event) => ({ ...event, gap: Math.max(0, Number(event.needed || 0) - Number(event.signed || 0)) }))
    .filter((event) => event.gap > 0);
  const leadEvent = eventGaps[0];
  const guide = [...data.guideCards]
    .filter((card) => activeLocation === "all" || card.locationId === "all" || card.locationId === activeLocation)
    .sort((a, b) => (a.completion || 0) - (b.completion || 0))[0];
  const ops = getScheduleOps(data);
  const handoffSent = ops.handoffStatus !== "Not sent";
  const requestCount = pendingRequests.length || Number(metrics?.pending || 0);
  const items = [
    {
      id: "coverage",
      label: "Coverage",
      status: leadOpenShift ? `${dayOpenShifts.length} gap${dayOpenShifts.length === 1 ? "" : "s"}` : noDayPlan ? "No plan" : "Ready",
      detail: leadOpenShift
        ? `${locationName(leadOpenShift.locationId)} ${leadOpenShift.role}, ${formatHour(leadOpenShift.start)} - ${formatHour(leadOpenShift.end)}`
        : noDayPlan
          ? `No shifts planned for ${sentenceDateLabel(dateInfo)}.`
          : `${dateInfo.label} schedule is covered.`,
      tone: leadOpenShift ? "urgent" : noDayPlan ? "warn" : "good",
      clear: Boolean(!leadOpenShift && !noDayPlan),
      icon: CalendarBlank,
      target: "owner-schedule",
      section: "owner-schedule",
      locationId: leadOpenShift?.locationId,
      message: leadOpenShift ? `${locationName(leadOpenShift.locationId)} coverage gap opened from readiness.` : `${dateInfo.label} schedule opened from readiness.`,
      focus: {
        title: leadOpenShift ? "Coverage gap opened" : noDayPlan ? "Schedule not planned" : "Schedule ready",
        detail: leadOpenShift
          ? `${locationName(leadOpenShift.locationId)} needs ${leadOpenShift.role}, ${formatHour(leadOpenShift.start)} - ${formatHour(leadOpenShift.end)}.`
          : noDayPlan
            ? `No shifts are planned for ${sentenceDateLabel(dateInfo)}. Build the day or copy a template.`
            : `${dateInfo.label} schedule is ready for review.`,
        source: "Daily Readiness",
        shiftId: leadOpenShift?.id,
        schedulePeriod: "day",
        scheduleDate: date,
      },
    },
    {
      id: "requests",
      label: "Requests",
      status: leadRequest ? `${requestCount} pending` : "Clear",
      detail: leadRequest ? `${leadRequest.employee}: ${leadRequest.type}` : "No pending approval is waiting.",
      tone: leadRequest ? "warn" : "good",
      clear: !leadRequest,
      icon: ListChecks,
      target: "owner-requests",
      section: "owner-requests",
      locationId: leadRequest?.locationId,
      message: leadRequest ? `${locationName(leadRequest.locationId)} request opened from readiness.` : "Requests opened from readiness.",
      focus: {
        title: leadRequest ? "Request queue opened" : "Requests clear",
        detail: leadRequest ? `${leadRequest.employee} has a ${leadRequest.type.toLowerCase()} request waiting.` : "No pending approvals are currently in this view.",
        source: "Daily Readiness",
      },
    },
    {
      id: "time",
      label: "Time",
      status: leadTimeFlag ? `${timeFlags.length} flag${timeFlags.length === 1 ? "" : "s"}` : "Clean",
      detail: leadTimeFlag ? `${leadTimeFlag.employee}: ${leadTimeFlag.flag}` : "No time exception needs review.",
      tone: leadTimeFlag ? "urgent" : "good",
      clear: !leadTimeFlag,
      icon: Clock,
      target: "owner-time",
      section: "owner-time",
      locationId: leadTimeFlag?.locationId,
      message: leadTimeFlag ? `${locationName(leadTimeFlag.locationId)} time flag opened from readiness.` : "Time review opened from readiness.",
      focus: {
        title: leadTimeFlag ? "Time flag opened" : "Time clean",
        detail: leadTimeFlag ? `${leadTimeFlag.employee} has ${leadTimeFlag.flag.toLowerCase()} at ${locationName(leadTimeFlag.locationId)}.` : "No open time clock exception is showing in this view.",
        source: "Daily Readiness",
        timeEntryId: leadTimeFlag?.id,
        timeView: leadTimeFlag ? "exceptions" : "active",
      },
    },
    {
      id: "events",
      label: "Events",
      status: leadEvent ? `${eventGaps.length} gap${eventGaps.length === 1 ? "" : "s"}` : "Staffed",
      detail: leadEvent ? `${leadEvent.title} needs ${leadEvent.gap} more.` : "Event signups are covered.",
      tone: leadEvent ? "warn" : "good",
      clear: !leadEvent,
      icon: MapPin,
      target: "owner-events",
      section: "owner-events",
      locationId: leadEvent?.locationId,
      message: leadEvent ? `${leadEvent.title} opened from readiness.` : "Events opened from readiness.",
      focus: {
        title: leadEvent ? "Event staffing gap opened" : "Events staffed",
        detail: leadEvent ? `${leadEvent.title} needs ${leadEvent.gap} more team member${leadEvent.gap === 1 ? "" : "s"}.` : "Event signups are currently covered.",
        source: "Daily Readiness",
        eventId: leadEvent?.id,
      },
    },
    {
      id: "guide",
      label: "Guide",
      status: guide && guide.completion < 90 ? `${guide.completion}%` : "Steady",
      detail: guide ? guide.title : "No guide cards configured.",
      tone: guide && guide.completion < 70 ? "warn" : "info",
      clear: Boolean(!guide || guide.completion >= 90),
      icon: BookOpenText,
      target: "owner-guide",
      section: "owner-guide",
      locationId: guide?.locationId,
      message: guide ? `${guide.title} opened from readiness.` : "Guide opened from readiness.",
      focus: guide ? {
        title: "Guide opened",
        detail: `${guide.title} is ${guide.completion}% complete.`,
        source: "Daily Readiness",
        guideId: guide.id,
      } : undefined,
    },
    {
      id: "handoff",
      label: "Handoff",
      status: handoffSent ? "Sent" : "Needed",
      detail: handoffSent ? ops.handoffStatus : "Send managers the latest plan.",
      tone: handoffSent ? "good" : "info",
      clear: handoffSent,
      icon: PaperPlaneRight,
      target: "owner-team:manager-handoff",
      section: "owner-team",
      threadId: "m2",
      message: "Manager Handoff opened from Daily Readiness.",
    },
  ];
  const clearCount = items.filter((item) => item.clear).length;
  const score = Math.round((clearCount / items.length) * 100);
  const attentionCount = items.length - clearCount;
  return {
    score,
    label: score >= 85 ? "Ready to run" : score >= 65 ? "Needs attention" : "At risk",
    tone: score >= 85 ? "good" : score >= 65 ? "warn" : "urgent",
    detail: `${dateInfo.label} / ${locationName(activeLocation)} / ${attentionCount} item${attentionCount === 1 ? "" : "s"} need action.`,
    items,
  };
}

function buildOwnerDecisionBrief(data, shifts, metrics, location, day, recommendation) {
  const selectedDate = validDateKey(day) ? day : operationsToday;
  const dateInfo = selectedDateInfo(selectedDate);
  const activeLocation = effectiveLocation(data, location);
  const scopeLabel = activeLocation === "all" ? "All work areas" : locationName(activeLocation);
  const scopedShifts = shifts.filter((shift) => shiftDateKey(shift) === selectedDate && matchesActiveLocation(data, activeLocation, shift.locationId));
  const openShifts = scopedShifts.filter((shift) => shift.status === "open");
  const pendingRequests = data.requests.filter((request) => request.status === "pending" && requestAppliesToDate(request, selectedDate) && matchesActiveLocation(data, activeLocation, request.locationId));
  const timeFlags = data.timeEntries.filter((entry) => entry.severity !== "approved" && timeEntryDateKey(entry) === selectedDate && matchesActiveLocation(data, activeLocation, entry.locationId));
  const eventGaps = data.events
    .filter((event) => matchesActiveLocation(data, activeLocation, event.locationId) && reportEventAppliesToDate(event, [selectedDate]))
    .map((event) => ({ ...event, gap: Math.max(0, Number(event.needed || 0) - Number(event.signed || 0)) }))
    .filter((event) => event.gap > 0);
  const blockerCount = openShifts.length + pendingRequests.length + timeFlags.length + eventGaps.length;
  const latestSnapshot = getReportSnapshots(data).find((snapshot) => (
    snapshot.date === selectedDate && (!snapshot.location || snapshot.location === activeLocation || activeLocation === "all")
  ));
  const scheduledHours = scopedShifts.reduce((sum, shift) => sum + shiftLength(shift), 0);
  return {
    selectedDate,
    dateLabel: dateInfo.label,
    scopeLabel,
    state: !scopedShifts.length ? "Plan missing" : blockerCount ? "Needs decision" : "Ready to share",
    tone: !scopedShifts.length ? "warn" : blockerCount ? "urgent" : "good",
    summary: !scopedShifts.length
      ? `${dateInfo.label} has no schedule yet for ${scopeLabel}.`
      : `${dateInfo.label} has ${blockerCount} decision blocker${blockerCount === 1 ? "" : "s"} across ${scopeLabel}.`,
    priority: recommendation?.title || "Keep watch",
    priorityDetail: recommendation?.detail || `${dateInfo.label} is ready for owner review.`,
    latestSnapshot,
    signals: [
      {
        label: "Coverage",
        value: openShifts.length ? `${openShifts.length} gap${openShifts.length === 1 ? "" : "s"}` : scopedShifts.length ? "Covered" : "No plan",
        detail: scopedShifts.length ? `${scopedShifts.length} shifts / ${formatHours(scheduledHours)}` : "Build the day first",
        tone: openShifts.length || !scopedShifts.length ? "warn" : "good",
      },
      {
        label: "Requests",
        value: pendingRequests.length,
        detail: pendingRequests[0] ? `${pendingRequests[0].employee} waiting` : "Queue clear",
        tone: pendingRequests.length ? "warn" : "good",
      },
      {
        label: "Time risk",
        value: timeFlags.length,
        detail: timeFlags[0] ? `${timeFlags[0].employee}: ${timeFlags[0].flag}` : "No flags",
        tone: timeFlags.length ? "urgent" : "good",
      },
      {
        label: "Events",
        value: eventGaps.length,
        detail: eventGaps[0] ? `${eventGaps[0].title} needs ${eventGaps[0].gap}` : "Staffed",
        tone: eventGaps.length ? "warn" : "good",
      },
    ],
    proofRows: [
      ["Saved report", latestSnapshot ? `${latestSnapshot.typeLabel} / ${latestSnapshot.rangeLabel}` : "No saved brief yet"],
      ["Handoff", getScheduleOps(data).handoffStatus],
      ["Risk check", getScheduleOps(data).riskCheck],
    ],
  };
}

function SignedOutScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("Use your work email to continue.");
  const [form, setForm] = useState({
    email: "maya.chen@greenviewcafe.com",
    password: "",
    name: "",
    inviteCode: "",
    emailCode: "",
  });

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function selectMode(nextMode) {
    setMode(nextMode);
    setCodeSent(false);
    setNotice(nextMode === "forgot" ? "Enter your work email and we will send a reset link." : "Use your work email to continue.");
  }

  async function submitAuth(event) {
    event.preventDefault();
    if (busy) return;
    const attempt = attemptBucket(authAttemptStorageKey, authAttemptKey(mode, form.email), maxAuthAttempts, authAttemptWindowMs);
    if (!attempt.ok) {
      setNotice(`Too many attempts. Try again in about ${attempt.retryAfterMinutes} minutes.`);
      return;
    }

    if (mode === "signup" && !form.inviteCode.trim()) {
      setNotice("Enter the invite code from your workplace to create the account.");
      return;
    }
    if ((mode === "login" || mode === "signup") && form.password.length < 8) {
      setNotice("Password needs at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      if (isSupabaseConfigured && supabase) {
        if (mode === "forgot") {
          const { error } = await supabase.auth.resetPasswordForEmail(form.email);
          if (error) throw error;
          setNotice("Password reset link sent. Check your email to continue.");
          return;
        }
        if (mode === "email-code" && !codeSent) {
          const { error } = await supabase.auth.signInWithOtp({
            email: form.email,
            options: { shouldCreateUser: false },
          });
          if (error) throw error;
          setCodeSent(true);
          setNotice("Sign-in code sent. Enter the code from your email.");
          return;
        }
        if (mode === "email-code" && codeSent) {
          const { data, error } = await supabase.auth.verifyOtp({
            email: form.email,
            token: form.emailCode.trim(),
            type: "email",
          });
          if (error) throw error;
          if (!data.session) {
            setNotice("Email verified. Finish any required workplace approval before entering the app.");
            return;
          }
          onAuthenticated("Signed in with email code. Workspace opened.");
          return;
        }
        if (mode === "login") {
          const { data, error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
          if (error) throw error;
          if (!data.session) {
            setNotice("Check your email to finish verification before entering the app.");
            return;
          }
          onAuthenticated("Signed in. Workspace opened.");
          return;
        }
        if (mode === "signup") {
          const { data, error } = await supabase.auth.signUp({
            email: form.email,
            password: form.password,
            options: {
              data: {
                full_name: form.name.trim(),
                invite_code: normalizeAccessCode(form.inviteCode),
              },
            },
          });
          if (error) throw error;
          if (!data.session) {
            setNotice("Account created. Check your email to verify before entering the workspace.");
            return;
          }
          onAuthenticated("Account created. Workspace opened.");
          return;
        }
      }

      if (mode === "forgot") {
        setNotice("Password reset link sent. Check your email to continue.");
        return;
      }
      if (mode === "email-code" && !codeSent) {
        setCodeSent(true);
        setNotice("Sign-in code sent. Enter the code from your email.");
        return;
      }
      onAuthenticated(mode === "signup" ? "Account created. Workspace opened." : "Signed in. Workspace opened.");
    } catch (error) {
      setNotice(error.message || "Could not complete sign in. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const isLogin = mode === "login";
  const isSignup = mode === "signup";
  const isEmailCode = mode === "email-code";
  const isForgot = mode === "forgot";
  const submitLabel = isForgot ? "Send reset link" : isSignup ? "Create account" : isEmailCode && !codeSent ? "Send email code" : "Continue";

  return (
    <main className="signed-out-shell">
      <section className="auth-card" aria-label="WorkForce account access">
        <div className="auth-panel auth-copy">
          <div className="signed-out-brand">
            <div className="brand-mark"><ShieldCheck size={30} weight="fill" /></div>
            <div>
              <strong>WorkForce</strong>
              <span>Command Center</span>
            </div>
          </div>
          <div>
            <p className="eyebrow">Account access</p>
            <h1>Sign in to your workspace</h1>
            <p>Use a verified work email to reach schedules, time clock, requests, team chat, and business tools.</p>
          </div>
          <div className="auth-trust-list" aria-label="Access protections">
            <div>
              <ShieldCheck size={18} weight="fill" />
              <span>{isSupabaseConfigured ? "Supabase session protection active" : "Prototype session protection active"}</span>
            </div>
            <div>
              <CheckCircle size={18} weight="fill" />
              <span>Email verification ready</span>
            </div>
            <div>
              <SignIn size={18} weight="fill" />
              <span>Invite-only signup and attempt limits ready</span>
            </div>
          </div>
        </div>

        <div className="auth-panel auth-form-panel">
          <div className="auth-status">
            <ShieldCheck size={18} weight="fill" />
            <div>
              <strong>You have signed out</strong>
              <span>No active account on this device.</span>
            </div>
          </div>

          <div className="auth-mode-tabs" aria-label="Account access options">
            <button type="button" className={isLogin ? "active" : ""} onClick={() => selectMode("login")}>Log in</button>
            <button type="button" className={isSignup ? "active" : ""} onClick={() => selectMode("signup")}>Sign up</button>
            <button type="button" className={isEmailCode ? "active" : ""} onClick={() => selectMode("email-code")}>Use email</button>
          </div>

          <form className="auth-form" onSubmit={submitAuth}>
            <label className="auth-field">
              <span>Work email</span>
              <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="name@business.com" required />
            </label>

            {isSignup && (
              <label className="auth-field">
                <span>Full name</span>
                <input type="text" value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Your name" required />
              </label>
            )}

            {(isLogin || isSignup) && (
              <label className="auth-field">
                <span>Password</span>
                <input type="password" value={form.password} onChange={(event) => update("password", event.target.value)} placeholder="Enter password" required />
              </label>
            )}

            {isSignup && (
              <label className="auth-field">
                <span>Invite code</span>
                <input type="text" value={form.inviteCode} onChange={(event) => update("inviteCode", event.target.value.toUpperCase())} placeholder="GV-1234" required />
              </label>
            )}

            {isEmailCode && codeSent && (
              <label className="auth-field">
                <span>Email code</span>
                <input type="text" value={form.emailCode} onChange={(event) => update("emailCode", event.target.value)} placeholder="6-digit code" required />
              </label>
            )}

            {isForgot && (
              <div className="auth-reset-note">
                <WarningCircle size={18} />
                <span>We will send a reset link to the email above. No account details are shown while signed out.</span>
              </div>
            )}

            <div className="auth-notice" role="status">{notice}</div>

            <button className="auth-submit" type="submit">
              <span>{busy ? "Working..." : submitLabel}</span>
              <PaperPlaneRight size={18} weight="fill" />
            </button>
          </form>

          <div className="auth-secondary-actions">
            <button type="button" onClick={() => selectMode(isForgot ? "login" : "forgot")}>
              {isForgot ? "Back to login" : "Forgot password?"}
            </button>
            {!isSignup && (
              <button type="button" onClick={() => selectMode("signup")}>
                Create account
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Screen(props) {
  const { section, role } = props;
  const employeeSectionRole = runtimeRoleForSection(role, section);
  const sectionProps = employeeSectionRole === role ? props : { ...props, role: employeeSectionRole, actingRole: role };
  if (section === "owner-dashboard") return <OwnerDashboard {...sectionProps} />;
  if (section === "owner-schedule" || section === "manager-schedule") return <ScheduleBoard {...sectionProps} scope={role === "owner" ? "owner" : "manager"} />;
  if (section === "owner-requests" || section === "manager-requests" || section === "employee-requests") return <RequestsWorkspace {...sectionProps} />;
  if (section === "owner-events") return <EventsWorkspace {...sectionProps} />;
  if (section === "owner-team" || section === "manager-team" || section === "employee-messages") return <TeamWorkspace {...sectionProps} />;
  if (section === "owner-guide" || section === "manager-guide" || section === "employee-guide") return <GuideWorkspace {...sectionProps} />;
  if (section === "owner-time" || section === "manager-time" || section === "employee-clock") return <TimeWorkspace {...sectionProps} />;
  if (section === "owner-reports") return <ReportsWorkspace {...sectionProps} />;
  if (section === "admin-command-review") return <CommandReviewWorkspace {...sectionProps} />;
  if (section === "owner-settings") return <SettingsWorkspace {...sectionProps} />;
  if (section === "manager-settings" || section === "employee-settings") return <RoleSettingsWorkspace {...sectionProps} />;
  if (section === "owner-manager-dashboard") return <ManagerDashboard {...sectionProps} />;
  if (section === "manager-dashboard") return <ManagerDashboard {...sectionProps} />;
  if (section === "employee-dashboard") return <EmployeeDashboard {...sectionProps} />;
  if (section === "employee-schedule") return <EmployeeSchedule {...sectionProps} />;
  if (section === "employee-shifts") return <EmployeeOpenShifts {...sectionProps} />;
  return <OwnerDashboard {...sectionProps} />;
}

function RouteFocusBanner({ focus }) {
  if (!focus) return null;
  return (
    <section className="route-focus-banner" aria-label="Opened context">
      <div>
        <CheckCircle size={18} weight="fill" />
        <span>{focus.source || "Opened from app"}</span>
      </div>
      <strong>{focus.title}</strong>
      <p>{focus.detail}</p>
    </section>
  );
}

function CommandReviewWorkspace({ data, metrics, role, location }) {
  const [serviceStatus, setServiceStatus] = useState(null);
  const [report, setReport] = useState(loadCommandReport);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [activeIssueId, setActiveIssueId] = useState("");

  useEffect(() => {
    refreshServiceStatus();
  }, []);

  function saveReport(nextReport) {
    setReport(nextReport);
    localStorage.setItem(commandReviewStorageKey, JSON.stringify(nextReport));
  }

  async function commandFetch(endpoint, options = {}) {
    const response = await fetch(`/api/command/${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok && !body.summary) throw new Error(body.message || `Command service returned ${response.status}.`);
    return body;
  }

  async function refreshServiceStatus() {
    try {
      const status = await commandFetch("health");
      setServiceStatus(status);
      setError("");
    } catch (nextError) {
      setServiceStatus(null);
      setError(nextError.message);
    }
  }

  async function runWholeAppReview() {
    setBusy("review");
    setError("");
    try {
      const nextReport = await commandFetch("review", {
        method: "POST",
        body: JSON.stringify({ scope: "whole-app", appSnapshot: commandAppSnapshot(data, metrics, role, location) }),
      });
      saveReport(nextReport);
      setActiveIssueId(nextReport.issues?.[0]?.id || "");
      await refreshServiceStatus();
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy("");
    }
  }

  async function runCommandTests() {
    setBusy("test");
    setError("");
    try {
      const result = await commandFetch("test", { method: "POST", body: JSON.stringify({}) });
      const nextReport = report || emptyCommandReport(result.runId, result.createdAt);
      saveReport({ ...nextReport, tests: result.tests || [] });
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy("");
    }
  }

  async function proposeFix(issueId) {
    setBusy(`fix-${issueId}`);
    setError("");
    try {
      const result = await commandFetch("propose-fixes", {
        method: "POST",
        body: JSON.stringify({ selectedIssueIds: [issueId], report }),
      });
      const proposals = mergeFixProposals(report?.fixProposals || [], result.fixProposals || []);
      const issues = (report?.issues || []).map((issue) => issue.id === issueId ? { ...issue, status: "proposed" } : issue);
      saveReport({ ...report, issues, fixProposals: proposals });
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy("");
    }
  }

  function markIssueReviewed(issueId) {
    if (!report) return;
    saveReport({
      ...report,
      issues: report.issues.map((issue) => issue.id === issueId ? { ...issue, status: "reviewed" } : issue),
    });
  }

  const issues = report?.issues || [];
  const tests = report?.tests || [];
  const activeIssue = issues.find((issue) => issue.id === activeIssueId) || issues[0];
  const fixProposals = report?.fixProposals || [];
  const laneCards = commandLaneCards(report);
  const severityGroups = ["critical", "high", "medium", "low"].map((severity) => ({
    severity,
    issues: issues.filter((issue) => issue.severity === severity),
  })).filter((group) => group.issues.length);

  return (
    <div className="screen-grid command-review-screen">
      <section className="section-tools command-review-hero">
        <div>
          <p className="eyebrow">Platform admin command system</p>
          <h3>Command Review Center</h3>
          <p>PM, Designer, and Engineer agent lanes for the whole app.</p>
        </div>
        <div className="command-review-actions">
          <button type="button" onClick={refreshServiceStatus} disabled={Boolean(busy)}>
            <ShieldCheck size={17} /> Health
          </button>
          <button className="primary-action" type="button" onClick={runWholeAppReview} disabled={Boolean(busy)}>
            <Sparkle size={17} /> {busy === "review" ? "Running" : "Run Whole App Review"}
          </button>
          <button type="button" onClick={runCommandTests} disabled={Boolean(busy)}>
            <CheckCircle size={17} /> {busy === "test" ? "Testing" : "Run Tests"}
          </button>
          <button type="button" onClick={() => exportData(report || emptyCommandReport(), "command-review-report.json")} disabled={!report}>
            <DownloadSimple size={17} /> Export Report
          </button>
        </div>
      </section>

      {error && (
        <div className="command-alert">
          <WarningCircle size={18} weight="fill" />
          <span>{error}</span>
        </div>
      )}

      <section className="command-status-grid" aria-label="Command service status">
        <Metric
          label="Service"
          value={serviceStatus?.ready ? "Ready" : "Offline"}
          detail={serviceStatus?.message || "Waiting for command service"}
          state={serviceStatus?.ready ? "good" : "warn"}
          icon={ShieldCheck}
        />
        <Metric
          label="Agents"
          value={serviceStatus?.configured ? "Live" : "Key needed"}
          detail={serviceStatus?.configured ? serviceStatus.model : "OPENAI_API_KEY required"}
          state={serviceStatus?.configured ? "good" : "warn"}
          icon={Sparkle}
        />
        <Metric
          label="Last Run"
          value={report?.createdAt ? shortDateTime(report.createdAt) : "None"}
          detail={report?.runId || "No review cached"}
          state="info"
          icon={Clock}
        />
      </section>

      <section className="command-lane-grid" aria-label="Agent review lanes">
        {laneCards.map((lane) => (
          <Panel
            key={lane.id}
            title={lane.title}
            eyebrow={`${lane.score}/100`}
            className={`command-lane ${lane.state}`}
            action={statusBadge(lane.badgeState, lane.badge)}
          >
            <strong>{lane.action}</strong>
            <p>{lane.detail}</p>
          </Panel>
        ))}
      </section>

      <section className="command-review-grid">
        <Panel title="Issue Queue" eyebrow={`${issues.length} flags`} className="command-issue-panel">
          {!issues.length && <p className="empty">No review flags yet.</p>}
          <div className="command-issue-list">
            {severityGroups.map((group) => (
              <div className="command-severity-group" key={group.severity}>
                <div className="command-severity-head">
                  <strong>{group.severity}</strong>
                  <span>{group.issues.length}</span>
                </div>
                {group.issues.map((issue) => (
                  <article className={`command-issue-row ${activeIssue?.id === issue.id ? "active" : ""}`} key={issue.id}>
                    <button type="button" onClick={() => setActiveIssueId(issue.id)}>
                      <span>{commandLaneLabel(issue.lane)}</span>
                      <strong>{issue.title}</strong>
                      <small>{issue.affectedArea}</small>
                    </button>
                    <div className="command-row-actions">
                      {statusBadge(issueStatusClass(issue.status), issue.status || "open")}
                      <button type="button" onClick={() => proposeFix(issue.id)} disabled={busy === `fix-${issue.id}`}>
                        {busy === `fix-${issue.id}` ? "Planning" : "Propose Fix"}
                      </button>
                      <button type="button" onClick={() => markIssueReviewed(issue.id)}>Mark Reviewed</button>
                    </div>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </Panel>

        <div className="command-side-stack">
          <Panel title="Evidence" eyebrow={activeIssue ? commandLaneLabel(activeIssue.lane) : "No issue"}>
            {activeIssue ? (
              <div className="command-evidence">
                <strong>{activeIssue.title}</strong>
                <p>{activeIssue.evidence}</p>
                <dl>
                  <div>
                    <dt>Area</dt>
                    <dd>{activeIssue.affectedArea}</dd>
                  </div>
                  <div>
                    <dt>Recommendation</dt>
                    <dd>{activeIssue.recommendation}</dd>
                  </div>
                  <div>
                    <dt>Fix safety</dt>
                    <dd>{activeIssue.safeFix ? "Safe proposal" : "Needs approval"}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="empty">Run a review to load evidence.</p>
            )}
          </Panel>

          <Panel title="Test Results" eyebrow={`${tests.length} checks`}>
            {!tests.length && <p className="empty">No test run yet.</p>}
            <div className="command-test-list">
              {tests.map((test) => (
                <article className="command-test-row" key={test.name}>
                  {statusBadge(commandTestStatus(test.status), test.status)}
                  <div>
                    <strong>{test.name}</strong>
                    <span>{test.detail}</span>
                    {Boolean(test.evidence?.length) && (
                      <ul className="command-test-evidence" aria-label={`${test.name} evidence`}>
                        {test.evidence.slice(0, 4).map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </Panel>
        </div>
      </section>

      <Panel title="Fix Proposals" eyebrow={`${fixProposals.length} briefs`} className="command-proposal-panel">
        {!fixProposals.length && <p className="empty">No fix proposals yet.</p>}
        <div className="command-proposal-list">
          {fixProposals.map((proposal) => (
            <article className="command-proposal-row" key={proposal.id || proposal.issueId}>
              <div>
                <strong>{proposal.title}</strong>
                <span>{proposal.summary}</span>
                <p>{proposal.patchBrief}</p>
              </div>
              {statusBadge(proposal.safety === "safe-proposal" ? "approved" : "pending", proposal.safety === "safe-proposal" ? "safe" : "approval")}
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function OwnerDashboard({ data, metrics, shifts, openModal, patchData, go, goThread, location, setLocation, day, setDay }) {
  const selectedDate = validDateKey(day) ? day : operationsToday;
  const dateInfo = selectedDateInfo(day);
  const activeLocation = effectiveLocation(data, location);
  const selectedShifts = shifts.filter((shift) => shiftDateKey(shift) === selectedDate);
  const openShift = selectedShifts.find((shift) => shift.status === "open");
  const datePendingRequests = data.requests.filter((request) => request.status === "pending" && requestAppliesToDate(request, selectedDate) && matchesActiveLocation(data, activeLocation, request.locationId));
  const pendingRequest = datePendingRequests[0];
  const dateTimeFlags = data.timeEntries.filter((entry) => entry.severity !== "approved" && timeEntryDateKey(entry) === selectedDate && matchesActiveLocation(data, activeLocation, entry.locationId));
  const timeFlag = dateTimeFlags[0];
  const dateEventGaps = data.events
    .filter((event) => matchesActiveLocation(data, activeLocation, event.locationId) && reportEventAppliesToDate(event, [selectedDate]))
    .map((event) => ({ ...event, gap: Math.max(0, Number(event.needed || 0) - Number(event.signed || 0)) }))
    .filter((event) => event.gap > 0);
  const leadEventGap = dateEventGaps[0];
  const lowGuide = [...data.guideCards]
    .filter((card) => activeLocation === "all" || card.locationId === "all" || card.locationId === activeLocation)
    .sort((a, b) => (a.completion || 0) - (b.completion || 0))[0];
  const openCount = selectedShifts.filter((shift) => shift.status === "open").length;
  const coveredCount = selectedShifts.filter((shift) => shift.status !== "open").length;
  const pendingCount = datePendingRequests.length;
  const timeFlagCount = dateTimeFlags.length;
  const eventGapCount = dateEventGaps.length;
  const coveragePercent = selectedShifts.length ? Math.round((coveredCount / selectedShifts.length) * 100) : 100;
  const laborHours = selectedShifts.reduce((sum, shift) => sum + Math.max(0, shift.end - shift.start), 0);
  const selectedMetrics = { ...metrics, total: selectedShifts.length, covered: coveredCount, open: openCount, pending: pendingCount };
  const coverageLabel = dateInfo.isToday ? "Coverage Today" : `Coverage ${dateInfo.label}`;
  const openShiftLabel = dateInfo.isToday ? "Open Shifts" : `${dateInfo.label} Gaps`;
  const laborLabel = dateInfo.isToday ? "Labor Hours" : `${dateInfo.label} Hours`;
  const schedulePreviewTitle = dateInfo.isToday ? "Coverage Today / Schedule Preview" : `${dateInfo.label} Coverage / Schedule Preview`;
  const focusTitle = dateInfo.isToday ? "Today Focus" : `${dateInfo.label} Focus`;
  const ownerRecommendation = buildOwnerNextMove(data, selectedShifts, selectedMetrics, location, day);
  function openCoverageFromDashboard() {
    if (openShift) setLocation?.(openShift.locationId);
    go(
      "owner-schedule",
      openShift ? `${locationName(openShift.locationId)} coverage gap opened.` : `${dateInfo.label} schedule opened.`,
      {
        title: openShift ? "Coverage gap opened" : "Schedule opened",
        detail: openShift
          ? `${locationName(openShift.locationId)} needs ${openShift.role}, ${formatHour(openShift.start)} - ${formatHour(openShift.end)}.`
          : `${dateInfo.label} schedule is ready for review.`,
        source: "Owner dashboard",
        shiftId: openShift?.id,
        schedulePeriod: "day",
        scheduleDate: selectedDate,
      }
    );
  }
  function openRequestsFromDashboard() {
    if (pendingRequest) setLocation?.(pendingRequest.locationId);
    go(
      "owner-requests",
      pendingRequest ? `${locationName(pendingRequest.locationId)} request queue opened.` : `${dateInfo.label} request queue opened.`,
      {
        title: pendingRequest ? "Request queue opened" : "Requests opened",
        detail: pendingRequest
          ? `${pendingRequest.employee} has a ${pendingRequest.type.toLowerCase()} request for ${locationName(pendingRequest.locationId)}.`
          : `${dateInfo.label} requests are ready for review.`,
        source: "Owner dashboard",
      }
    );
  }
  function openTimeFromDashboard() {
    if (timeFlag) setLocation?.(timeFlag.locationId);
    go(
      "owner-time",
      timeFlag ? `${locationName(timeFlag.locationId)} time flag opened.` : `${dateInfo.label} time review opened.`,
      {
        title: timeFlag ? "Time flag opened" : "Time review opened",
        detail: timeFlag
          ? `${timeFlag.employee} - ${timeFlag.flag} at ${locationName(timeFlag.locationId)}.`
          : `${dateInfo.label} labor and time entries are ready for review.`,
        source: "Owner dashboard",
        timeEntryId: timeFlag?.id,
        timeView: timeFlag ? "exceptions" : "labor",
      }
    );
  }
  function openGuideFromDashboard() {
    if (lowGuide?.locationId && lowGuide.locationId !== "all") setLocation?.(lowGuide.locationId);
    go(
      "owner-guide",
      lowGuide ? `${lowGuide.title} guide opened from dashboard.` : "Guide library opened from dashboard.",
      {
        title: lowGuide ? "Guide gap opened" : "Guide library opened",
        detail: lowGuide
          ? `${lowGuide.title} is at ${lowGuide.completion}% completion.`
          : "Review guide cards and training questions.",
        source: "Owner dashboard",
        guideId: lowGuide?.id,
      }
    );
  }
  function openEventsFromDashboard() {
    if (leadEventGap) setLocation?.(leadEventGap.locationId);
    go("owner-events", leadEventGap ? `${leadEventGap.title} staffing gap opened.` : `${dateInfo.label} events opened.`, {
      title: leadEventGap ? "Event staffing gap opened" : "Events opened",
      detail: leadEventGap
        ? `${leadEventGap.title} needs ${leadEventGap.gap} more team member${leadEventGap.gap === 1 ? "" : "s"}.`
        : `${dateInfo.label} event staffing is ready for review.`,
      source: "Owner dashboard",
      eventId: leadEventGap?.id,
    });
  }
  function openScheduleFromDashboard(message = `${dateInfo.label} schedule opened from dashboard.`) {
    setDay?.(day);
    go("owner-schedule", message, {
      title: "Schedule builder opened",
      detail: `${dateInfo.label} schedule board opened from the dashboard preview.`,
      source: "Owner dashboard",
      schedulePeriod: "day",
      scheduleDate: selectedDate,
    });
  }
  function sendHandoffFromDashboard() {
    sendDashboardHandoff(day, location, patchData);
    goThread("m2", `Manager handoff opened with ${sentenceDateLabel(dateInfo)} dashboard brief.`);
  }
  function sendRiskBriefFromDashboard() {
    sendDashboardRiskBrief(day, location, patchData);
    goThread("m2", "Manager handoff opened with the risk brief.");
  }
  function sendGuideTipFromDashboard() {
    sendDashboardGuideTip(day, location, patchData);
    goThread("m5", "Training Questions opened with the guide tip.");
  }
  function sendEventSummaryFromDashboard() {
    sendDashboardEventSummary(day, location, patchData);
    if (leadEventGap) setLocation?.(leadEventGap.locationId);
    go("owner-events", "Event summary posted to Manager Handoff and event board opened.", {
      title: "Event staffing summary posted",
      detail: leadEventGap
        ? `${leadEventGap.title} needs ${leadEventGap.gap} more team member${leadEventGap.gap === 1 ? "" : "s"}.`
        : "Review event signups and staffing gaps here; the summary was also sent to Manager Handoff.",
      source: "Owner dashboard",
      eventId: leadEventGap?.id,
    });
  }
  function openRecommendationDestination() {
    if (ownerRecommendation.locationId && ownerRecommendation.locationId !== "all") setLocation?.(ownerRecommendation.locationId);
    go(ownerRecommendation.section, `${ownerRecommendation.title} opened from owner recommendation.`, {
      title: ownerRecommendation.title,
      detail: ownerRecommendation.detail,
      source: "Owner recommendation",
      shiftId: ownerRecommendation.shiftId,
      schedulePeriod: ownerRecommendation.schedulePeriod,
      scheduleDate: ownerRecommendation.scheduleDate,
      guideId: ownerRecommendation.guideId,
      eventId: ownerRecommendation.eventId,
      reportType: ownerRecommendation.reportType,
      timeEntryId: ownerRecommendation.timeEntryId,
      timeView: ownerRecommendation.timeView,
    });
  }
  function approveRecommendationFromDashboard() {
    sendDashboardActionPlan(day, location, patchData);
    goThread("m2", "Approved action plan sent to Manager Handoff.");
  }
  return (
    <div className="screen-grid">
      <section className="kpi-strip">
        <Metric label={coverageLabel} value={`${coveragePercent}%`} detail={openShift ? `${locationName(openShift.locationId)} needs ${openShift.role}` : selectedShifts.length ? "Schedule covered" : "No dated plan"} state={coveragePercent >= 90 ? "good" : "warn"} icon={UsersThree} onClick={openCoverageFromDashboard} actionTarget="owner-schedule" />
        <Metric label={openShiftLabel} value={openCount} detail={openShift ? `Next: ${locationName(openShift.locationId)}` : selectedShifts.length ? "No gaps" : "Build plan"} state={openCount ? "warn" : "good"} icon={CalendarBlank} onClick={openCoverageFromDashboard} actionTarget="owner-schedule" />
        <Metric label="Pending Requests" value={pendingCount} detail={pendingRequest ? `${locationName(pendingRequest.locationId)} ${pendingRequest.type}` : `${dateInfo.label} queue clear`} state={pendingCount ? "info" : "good"} icon={ListChecks} onClick={openRequestsFromDashboard} actionTarget="owner-requests" />
        <Metric label={laborLabel} value={laborHours} detail={timeFlag ? `${locationName(timeFlag.locationId)} ${timeFlag.flag}` : selectedShifts.length ? "Scheduled hours" : "No shifts planned"} state="good" icon={Clock} onClick={openTimeFromDashboard} actionTarget="owner-time" />
        <Metric label="Guide Completion" value={`${metrics.guide}%`} detail={lowGuide ? `Review ${lowGuide.title}` : "Open guide"} state="info" icon={BookOpenText} onClick={openGuideFromDashboard} actionTarget="owner-guide" />
        <Metric label="Event Staffing" value={eventGapCount} detail={leadEventGap ? `${leadEventGap.title} needs ${leadEventGap.gap}` : `${dateInfo.label} events staffed`} state={eventGapCount ? "warn" : "good"} icon={MapPin} onClick={openEventsFromDashboard} actionTarget="owner-events" />
      </section>

      <OwnerReadinessStrip
        data={data}
        shifts={shifts}
        metrics={metrics}
        location={location}
        day={day}
        setLocation={setLocation}
        go={go}
        goThread={goThread}
      />

      {!dateInfo.isToday && (
        <DatePlanningBrief
          day={day}
          dateInfo={dateInfo}
          data={data}
          metrics={metrics}
          shifts={shifts}
          location={location}
          openModal={openModal}
          patchData={patchData}
          go={go}
        />
      )}

      <section className="main-grid">
        <Panel
          title={schedulePreviewTitle}
          eyebrow={`${locationName(location)} schedule preview`}
          action={
            <div className="button-row">
              <button type="button" onClick={() => openModal("shift")} {...homeActionTarget("modal:shift")}>
                <Plus size={16} /> Add Shift
              </button>
              <button className="primary-action" type="button" onClick={() => openScheduleFromDashboard()} {...homeActionTarget("owner-schedule")}>
                <CalendarBlank size={16} /> Build Schedule
              </button>
            </div>
          }
        >
          <DashboardSchedulePreview
            data={data}
            shifts={shifts}
            day={day}
            setDay={setDay}
            setLocation={setLocation}
            go={go}
          />
        </Panel>

        <Panel
          title={focusTitle}
          eyebrow="Owner action queue"
          action={<button type="button" onClick={sendHandoffFromDashboard} {...homeActionTarget("owner-team:manager-handoff")}><PaperPlaneRight size={16} /> Send Handoff</button>}
        >
          <OwnerRecommendationCard
            recommendation={ownerRecommendation}
            onApprove={approveRecommendationFromDashboard}
            onOpen={openRecommendationDestination}
            approveTarget="owner-team:manager-handoff"
            openTarget={ownerRecommendation.section}
          />
          <ActionQueue
            items={[
              { label: `${pendingCount} request${pendingCount === 1 ? "" : "s"} waiting`, detail: pendingRequest ? `${pendingRequest.employee} needs a ${pendingRequest.type.toLowerCase()} decision.` : `${dateInfo.label} has no request blockers.`, action: pendingCount ? "Approve Requests" : "Open Requests", target: "owner-requests", onClick: openRequestsFromDashboard },
              { label: `${openCount} coverage gap${openCount === 1 ? "" : "s"}`, detail: openShift ? `${locationName(openShift.locationId)} needs ${openShift.role}.` : `${dateInfo.label} schedule has no open gaps.`, action: "Open Schedule", target: "owner-schedule", onClick: openCoverageFromDashboard },
              { label: timeFlagCount ? `${timeFlagCount} time flag${timeFlagCount === 1 ? "" : "s"}` : "Time entries clear", detail: timeFlag ? `${timeFlag.employee} - ${timeFlag.flag}.` : `No time-clock blockers for ${dateInfo.label}.`, action: "Review Time", target: "owner-time", onClick: openTimeFromDashboard },
              { label: "Announcement", detail: data.announcements[0]?.title || "No announcement posted.", action: "Post", target: "modal:announcement", onClick: () => openModal("announcement") },
            ]}
          />
          <CommandToolRow
            items={[
              { label: "Risk Brief", detail: "Send risk summary", icon: WarningCircle, target: "owner-team:manager-handoff", onClick: sendRiskBriefFromDashboard },
              { label: "Guide Tip", detail: "Recommend one guide", icon: BookOpenText, target: "owner-team:training-questions", onClick: sendGuideTipFromDashboard },
              { label: "Event Summary", detail: "Post staffing needs", icon: MapPin, target: "owner-events", onClick: sendEventSummaryFromDashboard },
            ]}
          />
        </Panel>
      </section>

      <section className="lower-grid owner-dashboard-lower-grid">
        <OwnerDailyOperationsPanel
          data={data}
          shifts={shifts}
          metrics={selectedMetrics}
          location={location}
          day={day}
          recommendation={ownerRecommendation}
          patchData={patchData}
          go={go}
          goThread={goThread}
          setLocation={setLocation}
          onOpenPriority={openRecommendationDestination}
        />
        <BusinessHealth data={data} go={go} goThread={goThread} setLocation={setLocation} patchData={patchData} day={day} />
        <ManagersPanel data={data} go={go} goThread={goThread} setLocation={setLocation} patchData={patchData} day={day} />
        <GuideSnapshot data={data} openModal={openModal} go={go} goThread={goThread} patchData={patchData} location={location} day={day} />
        <AnnouncementSnapshot data={data} openModal={openModal} goThread={goThread} patchData={patchData} location={location} day={day} />
      </section>
    </div>
  );
}

function OwnerDailyOperationsPanel({ data, shifts, metrics, location, day, recommendation, patchData, go, goThread, setLocation, onOpenPriority }) {
  const brief = buildOwnerDecisionBrief(data, shifts, metrics, location, day, recommendation);
  const activeLocation = effectiveLocation(data, location);
  const activeLocationLabel = activeLocation === "all" ? "All locations" : locationName(activeLocation);
  const selectedDate = brief.selectedDate;
  const dateInfo = selectedDateInfo(selectedDate);
  const dueDateLabel = dateInfo.isToday ? "Today" : dateInfo.label;
  const monitorDateLabel = dateInfo.isToday ? "Monitor today" : `Monitor ${dateInfo.label}`;
  const beforeCloseLabel = dateInfo.isToday ? "Before 4 PM" : `${dateInfo.label} by 4 PM`;
  const shiftDueLabel = dateInfo.isToday ? "This shift" : dateInfo.label;
  const ops = getScheduleOps(data);
  const openShifts = data.shifts.filter((shift) => shift.status === "open" && shiftDateKey(shift) === selectedDate && matchesActiveLocation(data, activeLocation, shift.locationId));
  const pendingRequests = data.requests.filter((request) => request.status === "pending" && requestAppliesToDate(request, selectedDate) && matchesActiveLocation(data, activeLocation, request.locationId));
  const timeFlags = data.timeEntries.filter((entry) => entry.severity !== "approved" && timeEntryDateKey(entry) === selectedDate && matchesActiveLocation(data, activeLocation, entry.locationId));
  const eventGaps = data.events
    .filter((event) => matchesActiveLocation(data, activeLocation, event.locationId) && reportEventAppliesToDate(event, [selectedDate]))
    .map((event) => ({ ...event, gap: Math.max(0, Number(event.needed || 0) - Number(event.signed || 0)) }))
    .filter((event) => event.gap > 0);
  const lowGuide = [...data.guideCards]
    .filter((card) => activeLocation === "all" || card.locationId === "all" || card.locationId === activeLocation)
    .sort((a, b) => (a.completion || 0) - (b.completion || 0))[0];
  const reportLog = Array.isArray(data.reportLog) ? data.reportLog : [];
  const guideTip = reportLog.find((item) => item.toLowerCase().includes("guide tip"));
  const latestReport = reportLog[0] || "No report generated yet";
  const leadShift = openShifts[0];
  const leadRequest = pendingRequests[0];
  const leadTimeFlag = timeFlags[0];
  const leadEvent = eventGaps[0];
  const flaggedCost = timeFlags.reduce((sum, entry) => sum + entryLaborCost(entry), 0);
  const reportOptions = {
    type: "business",
    range: "day",
    audience: "Owner",
    date: brief.selectedDate,
    location: activeLocation,
  };

  function saveBrief() {
    generateReport(patchData, reportOptions);
  }

  function shareBrief() {
    shareReportToHandoff(patchData, { ...reportOptions, audience: "Manager handoff" });
    goThread?.("m2", `${brief.dateLabel} owner decision brief shared to Manager Handoff.`);
  }

  function openReport() {
    go("owner-reports", `${brief.dateLabel} owner decision report opened.`, {
      title: `${brief.dateLabel} decision report`,
      detail: brief.summary,
      source: "Owner Decision Brief",
      reportType: "business",
      reportDate: brief.selectedDate,
    });
  }
  function openQueue(section, itemLocationId, message, focus) {
    if (itemLocationId && itemLocationId !== "all") setLocation?.(itemLocationId);
    go(section, message, focus);
  }

  const queueRows = [
    leadShift
      ? {
        tone: "urgent",
        icon: CalendarBlank,
        label: `${openShifts.length} coverage gap${openShifts.length === 1 ? "" : "s"}`,
        detail: `${locationName(leadShift.locationId)} needs ${leadShift.role}, ${formatHour(leadShift.start)} - ${formatHour(leadShift.end)}.`,
        meta: "Schedule",
        owner: locations.find((item) => item.id === leadShift.locationId)?.manager || "Manager",
        due: beforeCloseLabel,
        workflow: "Open schedule gap",
        target: "owner-schedule",
        action: "Open",
        quickAction: "Ask Team",
        quickTarget: "owner-team:coverage",
        onQuickAction: () => requestCoverageSupport(patchData, { shiftId: leadShift.id, location: leadShift.locationId, day: selectedDate, sender: "Owner" }),
        onClick: () => openQueue("owner-schedule", leadShift.locationId, `${locationName(leadShift.locationId)} coverage gap opened from daily queue.`, {
          title: "Coverage gap opened",
          detail: `${locationName(leadShift.locationId)} needs ${leadShift.role}, ${formatHour(leadShift.start)} - ${formatHour(leadShift.end)}.`,
          source: "Daily command queue",
          shiftId: leadShift.id,
          schedulePeriod: "day",
          scheduleDate: selectedDate,
        }),
      }
      : {
        tone: "good",
        icon: CheckCircle,
        label: "Coverage clear",
        detail: `${activeLocationLabel} has no open shifts for ${sentenceDateLabel(dateInfo)}.`,
        meta: "Schedule",
        owner: "Managers",
        due: monitorDateLabel,
        workflow: "Review schedule",
        target: "owner-schedule",
        action: "View",
        quickAction: "Publish",
        quickTarget: "owner-team:announcements",
        onQuickAction: () => publishSchedule(patchData),
        onClick: () => openQueue("owner-schedule", activeLocation, "Schedule opened from daily queue.", {
          title: "Schedule opened",
          detail: `${activeLocationLabel} has no open coverage gaps for ${sentenceDateLabel(dateInfo)}.`,
          source: "Daily command queue",
          schedulePeriod: "day",
          scheduleDate: selectedDate,
        }),
      },
    leadRequest
      ? {
        tone: "warn",
        icon: ListChecks,
        label: `${pendingRequests.length} request${pendingRequests.length === 1 ? "" : "s"} waiting`,
        detail: `${leadRequest.employee}: ${leadRequest.type} at ${locationName(leadRequest.locationId)}.`,
        meta: "Approval",
        owner: leadRequest.employee,
        due: dueDateLabel,
        workflow: "Review request",
        target: "owner-requests",
        action: "Review",
        quickAction: "Approve",
        quickTarget: "owner-requests",
        onQuickAction: () => updateRequest(leadRequest.id, "approved", patchData),
        onClick: () => openQueue("owner-requests", leadRequest.locationId, `${locationName(leadRequest.locationId)} requests opened from daily queue.`, {
          title: "Request queue opened",
          detail: `${leadRequest.employee} has a ${leadRequest.type.toLowerCase()} request waiting.`,
          source: "Daily command queue",
        }),
      }
      : {
        tone: "good",
        icon: CheckCircle,
        label: "Requests clear",
        detail: `${activeLocationLabel} has no pending request decisions.`,
        meta: "Approval",
        owner: "Owner",
        due: monitorDateLabel,
        workflow: "View requests",
        target: "owner-requests",
        action: "View",
        onClick: () => openQueue("owner-requests", activeLocation, "Requests opened from daily queue.", {
          title: "Requests opened",
          detail: `${activeLocationLabel} has no pending request decisions.`,
          source: "Daily command queue",
        }),
      },
    leadTimeFlag
      ? {
        tone: "urgent",
        icon: Clock,
        label: `${timeFlags.length} time flag${timeFlags.length === 1 ? "" : "s"}`,
        detail: `${leadTimeFlag.employee}: ${leadTimeFlag.flag}. ${money(flaggedCost)} in flagged labor.`,
        meta: "Time",
        owner: leadTimeFlag.employee,
        due: "Before payroll",
        workflow: "Review exception",
        target: "owner-time",
        action: "Review",
        quickAction: "Correct",
        quickTarget: "owner-time",
        onQuickAction: () => requestTimeCorrection(leadTimeFlag.id, patchData),
        onClick: () => openQueue("owner-time", leadTimeFlag.locationId, `${locationName(leadTimeFlag.locationId)} time review opened from daily queue.`, {
          title: "Time flag opened",
          detail: `${leadTimeFlag.employee} has ${leadTimeFlag.flag.toLowerCase()} at ${locationName(leadTimeFlag.locationId)}.`,
          source: "Daily command queue",
          timeEntryId: leadTimeFlag.id,
          timeView: "exceptions",
        }),
      }
      : {
        tone: "good",
        icon: CheckCircle,
        label: "Time clean",
        detail: `${activeLocationLabel} has no open time clock exceptions.`,
        meta: "Time",
        owner: "Manager",
        due: monitorDateLabel,
        workflow: "View time",
        target: "owner-time",
        action: "View",
        onClick: () => openQueue("owner-time", activeLocation, "Time review opened from daily queue.", {
          title: "Time review opened",
          detail: `${activeLocationLabel} has no open time clock exceptions.`,
          source: "Daily command queue",
          timeView: "active",
        }),
      },
    leadEvent
      ? {
        tone: "warn",
        icon: MapPin,
        label: `${eventGaps.length} event staffing gap${eventGaps.length === 1 ? "" : "s"}`,
        detail: `${leadEvent.title} needs ${leadEvent.gap} more at ${locationName(leadEvent.locationId)}.`,
        meta: "Events",
        owner: locations.find((item) => item.id === leadEvent.locationId)?.manager || "Manager",
        due: leadEvent.deadline || "Before event",
        workflow: "Manage staff",
        target: "owner-events",
        action: "Open",
        quickAction: "Reminder",
        quickTarget: "owner-team:announcements",
        onQuickAction: () => postEventStaffingReminder(leadEvent.id, patchData),
        onClick: () => openQueue("owner-events", leadEvent.locationId, `${locationName(leadEvent.locationId)} events opened from daily queue.`, {
          title: "Event staffing gap opened",
          detail: `${leadEvent.title} needs ${leadEvent.gap} more team member${leadEvent.gap === 1 ? "" : "s"}.`,
          source: "Daily command queue",
          eventId: leadEvent.id,
        }),
      }
      : {
        tone: "good",
        icon: CheckCircle,
        label: "Events staffed",
        detail: `${activeLocationLabel} event signups are currently covered.`,
        meta: "Events",
        owner: "Owner",
        due: monitorDateLabel,
        workflow: "View events",
        target: "owner-events",
        action: "View",
        quickAction: "Summary",
        quickTarget: "owner-team:manager-handoff",
        onQuickAction: () => sendDashboardEventSummary(selectedDate, activeLocation, patchData),
        onClick: () => openQueue("owner-events", activeLocation, "Events opened from daily queue.", {
          title: "Events opened",
          detail: `${activeLocationLabel} event signups are currently covered.`,
          source: "Daily command queue",
        }),
      },
    lowGuide
      ? {
        tone: lowGuide.completion < 75 ? "warn" : "info",
        icon: BookOpenText,
        label: "Guide gap",
        detail: `${lowGuide.title} is ${lowGuide.completion}% complete.`,
        meta: "Guide",
        owner: "Training lead",
        due: lowGuide.completion < 75 ? shiftDueLabel : "This week",
        workflow: "Open guide",
        target: "owner-guide",
        action: "Open",
        quickAction: "Tip",
        quickTarget: "owner-team:training-questions",
        onQuickAction: () => sendDashboardGuideTip(selectedDate, activeLocation, patchData),
        onClick: () => openQueue("owner-guide", lowGuide.locationId, `${lowGuide.title} opened from daily queue.`, {
          title: "Guide gap opened",
          detail: `${lowGuide.title} is ${lowGuide.completion}% complete.`,
          source: "Daily command queue",
          guideId: lowGuide.id,
        }),
      }
      : {
        tone: "info",
        icon: BookOpenText,
        label: "Guide library",
        detail: "No guide cards are set up yet.",
        meta: "Guide",
        owner: "Owner",
        due: "Setup needed",
        workflow: "Create guide",
        target: "owner-guide",
        action: "Open",
        quickAction: "Tip",
        quickTarget: "owner-team:training-questions",
        onQuickAction: () => sendDashboardGuideTip(selectedDate, activeLocation, patchData),
        onClick: () => openQueue("owner-guide", activeLocation, "Guide library opened from daily queue.", {
          title: "Guide library opened",
          detail: "Create the first guide card for employees.",
          source: "Daily command queue",
        }),
      },
  ];

  const followUpRows = queueRows.filter((row) => row.tone === "urgent" || row.tone === "warn").slice(0, 3);
  const visibleFollowUps = followUpRows.length ? followUpRows : [{
    label: "No blockers",
    detail: `${activeLocationLabel} is clear for ${sentenceDateLabel(dateInfo)}.`,
    owner: "Owner",
    due: monitorDateLabel,
    workflow: "Monitor",
    target: "owner-reports:command-log",
    onClick: () => go("owner-reports", "Command activity log opened from follow-up plan.", {
      title: "Command activity log",
      detail: latestReport,
      source: "Follow-up plan",
      reportType: "log",
      reportDate: selectedDate,
    }),
  }];
  const proofRows = [
    { label: "Handoff", detail: ops.handoffStatus, target: "owner-team:manager-handoff", onClick: () => goThread("m2", "Manager Handoff opened from proof trail.") },
    { label: "Coverage", detail: ops.coverageAsk, target: "owner-team:coverage", onClick: () => goThread("m4", "Coverage Team opened from proof trail.") },
    { label: "Risk", detail: ops.riskCheck, target: "owner-reports:risk", onClick: () => go("owner-reports", "Risk report opened from proof trail.", {
      title: "Risk report opened",
      detail: ops.riskCheck,
      source: "Proof trail",
      reportType: "risk",
      reportDate: selectedDate,
    }) },
  ];
  const latestTrace = [
    { label: "Manager handoff", detail: ops.handoffStatus, target: "owner-team:manager-handoff", onClick: () => goThread("m2", "Manager handoff opened from operations trace.") },
    { label: "Coverage ask", detail: ops.coverageAsk, target: "owner-team:coverage", onClick: () => goThread("m4", "Coverage Team opened from operations trace.") },
    { label: "Guide tip", detail: guideTip || latestReport, target: "owner-team:training-questions", onClick: () => goThread("m5", "Training Questions opened from operations trace.") },
  ].find((row) => row.detail && !["Not sent", "Not checked"].includes(row.detail)) || {
    label: "Latest report",
    detail: latestReport,
    target: "owner-reports:command-log",
    onClick: () => go("owner-reports", "Reports opened from operations trace.", {
      title: "Command activity log",
      detail: latestReport,
      source: "Daily operations",
      reportType: "log",
      reportDate: selectedDate,
    }),
  };

  return (
    <Panel
      title="Daily Operations"
      eyebrow={`${brief.dateLabel} command queue`}
      className="owner-ops-panel"
      action={<button type="button" onClick={openReport} {...homeActionTarget("owner-reports:business")}>Open Report</button>}
    >
      <div className={`owner-decision-brief owner-ops-brief ${brief.tone}`} aria-label="Daily Operations Brief">
        <div className="owner-decision-summary">
          <div className="owner-decision-icon">
            <ChartLineUp size={19} weight="fill" />
          </div>
          <div>
            <span>{brief.scopeLabel}</span>
            <strong>{brief.state}</strong>
            <p>{brief.summary}</p>
          </div>
          {statusBadge(brief.tone === "good" ? "approved" : brief.tone === "urgent" ? "pending" : "draft", brief.state)}
        </div>

        <div className="owner-decision-signals">
          {brief.signals.map((signal) => (
            <article className={signal.tone} key={signal.label}>
              <span>{signal.label}</span>
              <strong>{signal.value}</strong>
              <p>{signal.detail}</p>
            </article>
          ))}
        </div>

        <div className="owner-decision-priority">
          <div>
            <span>Priority</span>
            <strong>{brief.priority}</strong>
            <p>{brief.priorityDetail}</p>
          </div>
          <button type="button" onClick={onOpenPriority} {...homeActionTarget(recommendation?.section || "owner-reports:business")}>
            Review
          </button>
        </div>

        <div className="owner-decision-proof" aria-label="Decision proof">
          {brief.proofRows.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="owner-decision-actions">
          <button type="button" onClick={saveBrief} {...homeActionTarget("owner-reports:business")}>
            <ChartLineUp size={15} /> Save Brief
          </button>
          <button type="button" onClick={shareBrief} {...homeActionTarget("owner-team:manager-handoff")}>
            <PaperPlaneRight size={15} /> Share Brief
          </button>
          <button type="button" onClick={openReport} {...homeActionTarget("owner-reports:business")}>
            Open Report
          </button>
        </div>
      </div>
      <div className="command-queue-list owner-ops-queue" aria-label="Daily Command Queue">
        {queueRows.map(({ tone, label, detail, meta, owner, due, workflow, target, icon: Icon, action, onClick, quickAction, quickTarget, onQuickAction }) => (
          <article className={`command-queue-row ${tone}`} key={label}>
            <Icon size={17} weight="fill" />
            <div>
              <strong><span>{label}</span><em>{meta}</em></strong>
              <span>{detail}</span>
              <small className="command-queue-meta">
                <span>{owner}</span>
                <span>{due}</span>
                <span>{workflow}</span>
              </small>
            </div>
            <div className="command-queue-actions">
              <button type="button" onClick={onClick} {...homeActionTarget(target)}>{action}</button>
              {quickAction && (
                <button className="quick" type="button" onClick={onQuickAction} {...homeActionTarget(quickTarget || target)}>{quickAction}</button>
              )}
            </div>
          </article>
        ))}
      </div>
      <div className="command-followup-board owner-ops-followup" aria-label="Command follow-up plan">
        <div className="command-followup-head">
          <span>Follow-up Plan</span>
          <strong>{followUpRows.length ? `${followUpRows.length} blocker${followUpRows.length === 1 ? "" : "s"} to close` : "No blockers to close"}</strong>
        </div>
        <div className="command-followup-list">
          {visibleFollowUps.map((item) => (
            <button type="button" key={`${item.label}-${item.owner}`} onClick={item.onClick} {...homeActionTarget(item.target)}>
              <span>{item.owner}</span>
              <strong>{item.label}</strong>
              <em>{item.due} - {item.workflow}</em>
            </button>
          ))}
        </div>
        <div className="command-proof-row" aria-label="Proof trail">
          {proofRows.map((item) => (
            <button type="button" key={item.label} onClick={item.onClick} {...homeActionTarget(item.target)}>
              <span>{item.label}</span>
              <strong>{item.detail || "Not recorded"}</strong>
            </button>
          ))}
        </div>
      </div>
      <div className="command-trace-note owner-ops-trace">
        <span>Latest trace</span>
        <button type="button" onClick={latestTrace.onClick} {...homeActionTarget(latestTrace.target)}>
          <strong>{latestTrace.label}</strong>
          <em>{latestTrace.detail}</em>
        </button>
      </div>
    </Panel>
  );
}

function OwnerReadinessStrip({ data, shifts, metrics, location, day, setLocation, go, goThread }) {
  const readiness = buildOwnerReadiness(data, shifts, metrics, location, day);
  function openReadinessItem(item) {
    if (item.locationId && item.locationId !== "all") setLocation?.(item.locationId);
    if (item.threadId === "m2") {
      goThread("m2", item.message);
      return;
    }
    go(item.section, item.message, item.focus);
  }
  return (
    <section className={`readiness-strip ${readiness.tone}`} aria-label="Daily Readiness">
      <div className="readiness-summary">
        <div className="readiness-score">
          <ShieldCheck size={20} weight="fill" />
          <strong>{readiness.score}%</strong>
        </div>
        <div>
          <p className="eyebrow">Daily Readiness</p>
          <h3>{readiness.label}</h3>
          <span>{readiness.detail}</span>
        </div>
      </div>
      <div className="readiness-items">
        {readiness.items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={`readiness-item ${item.tone}`}
              type="button"
              key={item.id}
              onClick={() => openReadinessItem(item)}
              {...homeActionTarget(item.target)}
            >
              <Icon size={18} weight="fill" />
              <span>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </span>
              <em>{item.status}</em>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DashboardSchedulePreview({ data, shifts, day, setDay, setLocation, go }) {
  const [previewLocation, setPreviewLocation] = useState("all");
  const [previewRole, setPreviewRole] = useState("all");
  const [previewMode, setPreviewMode] = useState("day");
  const [previewDate, setPreviewDate] = useState(validDateKey(day) ? day : operationsToday);
  const locationOptions = businessLocations(data, true).filter((item) => item.id === "all" || shifts.some((shift) => shift.locationId === item.id));
  const roleOptions = Array.from(new Set(shifts.map((shift) => shift.role))).sort();
  const rangeDates = scheduleRangeDates(previewDate, previewMode);
  const filteredShifts = shifts.filter((shift) => {
    const locationMatches = previewLocation === "all" || shift.locationId === previewLocation;
    const roleMatches = previewRole === "all" || shift.role === previewRole;
    return locationMatches && roleMatches;
  });
  const rangeSummary = scheduleRangeSummary(filteredShifts, rangeDates);
  const previewShifts = filteredShifts.filter((shift) => rangeDates.includes(shiftDateKey(shift)));
  const coveredCount = rangeSummary.covered;
  const coverage = rangeSummary.total ? Math.round((coveredCount / rangeSummary.total) * 100) : 100;

  useEffect(() => {
    setPreviewDate(validDateKey(day) ? day : operationsToday);
  }, [day]);

  function setPreviewPeriod(nextMode) {
    setPreviewMode(nextMode);
  }

  function movePreviewRange(direction) {
    setPreviewDate((currentDate) => offsetPeriodDateKey(currentDate, previewMode, direction));
  }

  function resetPreviewDate() {
    setPreviewDate(validDateKey(day) ? day : operationsToday);
  }

  function openFilteredSchedule(nextDay = previewDate, message = "Schedule board opened from dashboard preview.", nextPeriod = previewMode) {
    setDay?.(nextDay);
    if (previewLocation !== "all") setLocation?.(previewLocation);
    go("owner-schedule", message, {
      title: `${periodLabel(nextDay, nextPeriod)} schedule opened`,
      detail: `${previewLocation === "all" ? "All visible locations" : locationName(previewLocation)}${previewRole === "all" ? "" : ` / ${previewRole}`} opened from the dashboard schedule preview.`,
      source: "Dashboard schedule preview",
      schedulePeriod: nextPeriod,
      scheduleRole: previewRole,
    });
  }

  return (
    <div className="dashboard-schedule-preview">
      <div className="dashboard-preview-controls">
        <label>
          <span>Location</span>
          <select value={previewLocation} onChange={(event) => setPreviewLocation(event.target.value)}>
            {locationOptions.map((item) => (
              <option key={item.id} value={item.id}>{item.id === "all" ? "All visible locations" : item.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Role</span>
          <select value={previewRole} onChange={(event) => setPreviewRole(event.target.value)}>
            <option value="all">All roles</option>
            {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
        </label>
        <div className="schedule-view-toggle" aria-label="Dashboard schedule preview mode">
          <button type="button" className={previewMode === "day" ? "active" : ""} onClick={() => setPreviewPeriod("day")}>Day</button>
          <button type="button" className={previewMode === "week" ? "active" : ""} onClick={() => setPreviewPeriod("week")}>Week</button>
          <button type="button" className={previewMode === "month" ? "active" : ""} onClick={() => setPreviewPeriod("month")}>Month</button>
        </div>
        <div className="dashboard-date-stepper" aria-label="Preview date">
          <button type="button" aria-label="Previous schedule range" onClick={() => movePreviewRange(-1)}>
            <CaretLeft size={15} />
          </button>
          <button type="button" onClick={resetPreviewDate}>{periodLabel(previewDate, previewMode)}</button>
          <button type="button" aria-label="Next schedule range" onClick={() => movePreviewRange(1)}>
            <CaretRight size={15} />
          </button>
        </div>
      </div>

      <div className="dashboard-preview-status">
        <span>{coverage}% covered</span>
        <span>{rangeSummary.open} open</span>
        <span>{formatHours(rangeSummary.hours)} scheduled</span>
      </div>

      {previewMode === "day" ? (
        previewShifts.length ? (
          <Timeline
            shifts={previewShifts}
            compact
            onShiftClick={(shift) => {
              setLocation?.(shift.locationId);
              openFilteredSchedule(shiftDateKey(shift), `${locationName(shift.locationId)} ${shift.role} shift opened from dashboard preview.`, "day");
            }}
          />
        ) : (
          <div className="empty preview-empty">No shifts match these filters.</div>
        )
      ) : (
        <DashboardRangePreview
          shifts={filteredShifts}
          dates={rangeDates}
          mode={previewMode}
          onOpenDate={(nextDay) => openFilteredSchedule(nextDay, `${formatDisplayDate(nextDay)} schedule opened from ${previewMode} preview.`, "day")}
        />
      )}

      <div className="schedule-preview-footer">
        <div className="schedule-legend">
          <span><i className="legend-covered" /> Covered</span>
          <span><i className="legend-open" /> Open</span>
          <span><i className="legend-pending" /> Pending</span>
        </div>
        <button className="text-action" type="button" onClick={() => openFilteredSchedule(previewDate, "Full schedule opened from dashboard preview.", previewMode)}>
          View Full Schedule
        </button>
      </div>
    </div>
  );
}

function DashboardRangePreview({ shifts, dates, mode, onOpenDate }) {
  const rows = scheduleRangeSummary(shifts, dates).rows;

  return (
    <div className={`dashboard-range-preview ${mode}`}>
      {rows.map((row) => (
        <button className="dashboard-range-card" type="button" key={row.date} onClick={() => onOpenDate?.(row.date)}>
          <span>{shortDisplayDate(row.date)}</span>
          <strong>{selectedDateInfo(row.date).label}</strong>
          <p>{row.total ? `${row.total} shifts / ${formatHours(row.hours)}` : "No dated plan"}</p>
          {row.open ? statusBadge("pending", `${row.open} gaps`) : row.total ? statusBadge("approved", "Covered") : statusBadge("draft", "Empty")}
        </button>
      ))}
    </div>
  );
}

function DatePlanningBrief({ day, dateInfo, data, metrics, shifts, location, openModal, patchData, go }) {
  const selectedDate = validDateKey(day) ? day : operationsToday;
  const activeLocation = effectiveLocation(data, location);
  const selectedShifts = shifts.filter((shift) => shiftDateKey(shift) === selectedDate);
  const openShifts = selectedShifts.filter((shift) => shift.status === "open");
  const plan = data.datePlans?.[selectedDate];
  const visibleEvents = data.events.filter((event) => matchesActiveLocation(data, activeLocation, event.locationId) && reportEventAppliesToDate(event, [selectedDate]));
  const visibleRequests = data.requests.filter((request) => request.status === "pending" && requestAppliesToDate(request, selectedDate) && matchesActiveLocation(data, activeLocation, request.locationId));
  function openSelectedSchedule() {
    go("owner-schedule", `${dateInfo.label} schedule opened.`, {
      title: `${dateInfo.label} schedule opened`,
      detail: openShifts[0]
        ? `${locationName(openShifts[0].locationId)} needs ${openShifts[0].role}, ${formatHour(openShifts[0].start)} - ${formatHour(openShifts[0].end)}.`
        : `${dateInfo.label} has ${selectedShifts.length} scheduled shift${selectedShifts.length === 1 ? "" : "s"} in this view.`,
      source: "Date planning",
      shiftId: openShifts[0]?.id,
      schedulePeriod: "day",
      scheduleDate: selectedDate,
    });
  }
  function openSelectedReport() {
    go("owner-reports", `${dateInfo.label} report opened.`, {
      title: `${dateInfo.label} report opened`,
      detail: "Review labor, coverage, request, and event signals before the selected day starts.",
      source: "Date planning",
      reportType: "business",
      reportDate: selectedDate,
    });
  }
  return (
    <section className={`date-brief ${dateInfo.tone}`} aria-label="Selected date planning brief">
      <div className="date-brief-head">
        <div>
          <p className="eyebrow">Selected date</p>
          <h3>{dateInfo.label} Planning</h3>
          <span>{plan ? `Prepared ${plan.preparedAt}` : "Use this brief to prep schedule, events, requests, and reports for the selected day."}</span>
        </div>
        <button type="button" onClick={() => prepareDatePlan(day, patchData)}>
          {plan ? "Refresh Plan" : "Prepare Day"}
        </button>
      </div>
      <div className="date-brief-grid">
        <button type="button" onClick={openSelectedSchedule} {...homeActionTarget("owner-schedule")}>
          <CalendarBlank size={20} weight="fill" />
          <strong>{openShifts.length ? `${openShifts.length} gaps to plan` : "Schedule ready"}</strong>
          <span>{openShifts[0] ? `${locationName(openShifts[0].locationId)} needs ${openShifts[0].role}` : "Open the schedule board for staffing edits"}</span>
        </button>
        <button type="button" onClick={() => openModal("event")} {...homeActionTarget("modal:event")}>
          <MapPin size={20} weight="fill" />
          <strong>{visibleEvents.length ? `${visibleEvents.length} events` : "Create event"}</strong>
          <span>New events will default to {formatDisplayDate(day)}</span>
        </button>
        <button type="button" onClick={() => openModal("request")} {...homeActionTarget("modal:request")}>
          <ListChecks size={20} weight="fill" />
          <strong>{visibleRequests.length} request{visibleRequests.length === 1 ? "" : "s"} in queue</strong>
          <span>{visibleRequests[0] ? `${visibleRequests[0].employee} needs a decision` : "New request forms use the selected date"}</span>
        </button>
        <button type="button" onClick={openSelectedReport} {...homeActionTarget("owner-reports:business")}>
          <ChartLineUp size={20} weight="fill" />
          <strong>Daily report</strong>
          <span>Review labor and coverage before the day starts</span>
        </button>
      </div>
    </section>
  );
}

function ManagerDashboard({ data, metrics, shifts, openModal, patchData, go, goThread, setLocation, role, day }) {
  const ownerManaged = role === "owner" && ownerRunsManagerFunctions(data);
  const scheduleTarget = ownerManaged ? "owner-schedule" : "manager-schedule";
  const requestTarget = ownerManaged ? "owner-requests" : "manager-requests";
  const timeTarget = ownerManaged ? "owner-time" : "manager-time";
  const guideTarget = ownerManaged ? "owner-guide" : "manager-guide";
  const selectedDate = validDateKey(day) ? day : operationsToday;
  const dateInfo = selectedDateInfo(selectedDate);
  const dateLabel = sentenceDateLabel(dateInfo);
  const dayShifts = shifts.filter((shift) => shiftDateKey(shift) === selectedDate);
  const openShifts = dayShifts.filter((shift) => shift.status === "open");
  const coveredShifts = dayShifts.filter((shift) => shift.status !== "open");
  const noDayPlan = dayShifts.length === 0;
  const activeTimeEntries = dateInfo.isToday ? data.timeEntries.filter((entry) => ["Working", "Ready", "Near work", "Lunch"].includes(entry.status)).length : 0;
  const openShift = openShifts[0];
  const datePendingRequests = data.requests.filter((request) => request.status === "pending" && requestAppliesToDate(request, selectedDate));
  const pendingCount = datePendingRequests.length;
  const pendingRequest = datePendingRequests.find((request) => !openShift || request.locationId === openShift.locationId) || datePendingRequests[0];
  const scopedTimeEntries = dateInfo.isToday ? data.timeEntries : [];
  const timeFlag = scopedTimeEntries.find((entry) => entry.severity !== "approved" && (!openShift || entry.locationId === openShift.locationId)) || scopedTimeEntries.find((entry) => entry.severity !== "approved");
  const timeFlagCount = scopedTimeEntries.filter((entry) => entry.severity !== "approved").length;
  const lowGuide = [...data.guideCards].sort((a, b) => (a.completion || 0) - (b.completion || 0))[0];
  const roleSource = ownerManaged ? "Owner manager board" : "Manager dashboard";
  const coverageValue = dayShifts.length ? `${coveredShifts.length}/${dayShifts.length}` : "0/0";
  const coverageDetail = openShift
    ? `${locationName(openShift.locationId)} needs ${openShift.role}`
    : noDayPlan
      ? `No shifts planned for ${dateLabel}`
      : `${dateInfo.label} covered`;
  const scheduleTitle = openShift ? "Coverage gap opened" : noDayPlan ? `${dateInfo.label} schedule not planned` : "Schedule opened";
  const scheduleDetail = openShift
    ? `${locationName(openShift.locationId)} needs ${openShift.role}, ${formatHour(openShift.start)} - ${formatHour(openShift.end)}.`
    : noDayPlan
      ? `Build ${dateInfo.label} schedule or copy a day template.`
      : `${dateInfo.label} coverage and manager assignments are ready for review.`;
  function openManagerSchedule(message = "Manager schedule opened.") {
    if (openShift) setLocation?.(openShift.locationId);
    go(scheduleTarget, message, {
      title: scheduleTitle,
      detail: scheduleDetail,
      source: roleSource,
      shiftId: openShift?.id,
      schedulePeriod: "day",
      scheduleDate: selectedDate,
    });
  }
  function openManagerRequests() {
    if (pendingRequest) setLocation?.(pendingRequest.locationId);
    go(requestTarget, "Manager request queue opened.", {
      title: pendingRequest ? "Request queue opened" : "Requests opened",
      detail: pendingRequest
        ? `${pendingRequest.employee} has a ${pendingRequest.type.toLowerCase()} request waiting.`
        : "Review schedule, time-off, and shift requests.",
      source: roleSource,
    });
  }
  function openManagerTime() {
    if (timeFlag) setLocation?.(timeFlag.locationId);
    go(timeTarget, "Manager time review opened.", {
      title: timeFlag ? "Time exception opened" : "Time review opened",
      detail: timeFlag
        ? `${timeFlag.employee} - ${timeFlag.flag} at ${locationName(timeFlag.locationId)}.`
        : dateInfo.isToday ? "Review active staff and time clock exceptions." : `${dateInfo.label} is scheduled review only; live time starts on the work day.`,
      source: roleSource,
      timeEntryId: timeFlag?.id,
      timeView: timeFlag ? "exceptions" : "active",
    });
  }
  function openManagerGuide() {
    if (lowGuide?.locationId && lowGuide.locationId !== "all") setLocation?.(lowGuide.locationId);
    go(guideTarget, "Manager guide opened.", {
      title: lowGuide ? "Guide review opened" : "Guide library opened",
      detail: lowGuide ? `${lowGuide.title} is ${lowGuide.completion}% complete.` : "Review guide cards assigned to the team.",
      source: roleSource,
      guideId: lowGuide?.id,
    });
  }
  function postManagerCoverageAsk() {
    if (!openShift) {
      openManagerSchedule(noDayPlan ? `${dateInfo.label} schedule builder opened before asking the team.` : "Schedule opened before posting a coverage ask.");
      return;
    }
    if (openShift) setLocation?.(openShift.locationId);
    requestCoverageSupport(patchData, { location: openShift?.locationId || "all", day: selectedDate, shiftId: openShift.id, sender: ownerManaged ? "Owner" : "Manager" });
    goThread?.("m4", openShift ? `${locationName(openShift.locationId)} coverage ask opened in Coverage Team.` : "Coverage Team opened after manager ask.");
  }
  function prepareManagerGap() {
    if (!openShift) {
      if (noDayPlan) {
        openManagerSchedule(`${dateInfo.label} schedule builder opened before shift prep.`);
        return;
      }
      patchData((data) => data, `No open shift needs prep for ${dateInfo.label}.`);
      return;
    }
    fillFirstOpenShift(patchData, openShift.id, selectedDate);
    setLocation?.(openShift.locationId);
    go(scheduleTarget, `${locationName(openShift.locationId)} prepared shift opened from manager dashboard.`, {
      title: "Prepared shift opened",
      detail: `${openShift.role}, ${formatHour(openShift.start)} - ${formatHour(openShift.end)} moved to pending assignment.`,
      source: roleSource,
      shiftId: openShift.id,
      schedulePeriod: "day",
      scheduleDate: selectedDate,
    });
  }
  const teamTargetPrefix = ownerManaged ? "owner-team" : "manager-team";
  const ops = getScheduleOps(data);
  function postManagerHandoffDigest() {
    const time = scheduleStamp();
    const digestOwner = ownerManaged ? "Owner" : "Manager";
    const firstNextStep = openShift
      ? `ask Coverage Team for ${locationName(openShift.locationId)} ${openShift.role}`
      : pendingRequest
        ? `decide ${pendingRequest.employee}'s ${pendingRequest.type.toLowerCase()} request`
        : timeFlag
          ? `review ${timeFlag.employee}'s ${timeFlag.flag.toLowerCase()}`
          : "monitor schedule changes";
    const body = `${dateInfo.label} manager digest: ${coveredShifts.length}/${dayShifts.length || 0} shifts assigned, ${openShifts.length} open shifts, ${pendingCount} pending requests, ${timeFlagCount} time flags. Guide focus: ${lowGuide ? `${lowGuide.title} at ${lowGuide.completion}%` : "no guide gaps"}. Next step: ${firstNextStep}.`;
    patchData((data) => ({
      ...data,
      scheduleOps: { ...getScheduleOps(data), handoffStatus: `Digest ${time}` },
      messages: postManagerHandoff(data.messages, body, digestOwner, time),
    }), "Manager handoff digest sent.");
    goThread?.("m2", `${dateInfo.label} manager digest posted to Manager Handoff.`);
  }
  const teamPulseLocation = openShift?.locationId || pendingRequest?.locationId || "all";
  function postManagerTeamPulse() {
    postManagerTeamPulseUpdate(patchData, {
      day: selectedDate,
      location: teamPulseLocation,
      sender: ownerManaged ? "Owner" : "Manager",
    });
    goThread?.("m2", `${dateInfo.label} team pulse posted to Manager Handoff.`);
  }
  function coachTeamGuide() {
    sendDashboardGuideTip(selectedDate, teamPulseLocation, patchData, ownerManaged ? "Owner" : "Manager");
    goThread?.("m5", "Training Questions opened from Team Handoff.");
  }
  const managerFollowUps = [
    noDayPlan
      ? {
        label: `Build ${dateInfo.label}`,
        detail: "No dated schedule exists yet.",
        owner: ownerManaged ? "Owner" : "Manager",
        due: dateInfo.isToday ? "Before asking team" : dateInfo.label,
        workflow: "Schedule setup",
        target: scheduleTarget,
        onClick: () => openManagerSchedule(`${dateInfo.label} schedule builder opened from manager follow-up.`),
      }
      : openShift
        ? {
          label: "Close coverage gap",
          detail: `${locationName(openShift.locationId)} needs ${openShift.role}.`,
          owner: locations.find((item) => item.id === openShift.locationId)?.manager || "Manager",
          due: dateInfo.isToday ? "Before close" : `${dateInfo.label} by close`,
          workflow: "Coverage ask",
          target: `${teamTargetPrefix}:coverage`,
          onClick: postManagerCoverageAsk,
        }
        : {
          label: "Coverage ready",
          detail: `${dateInfo.label} schedule has no open shifts.`,
          owner: ownerManaged ? "Owner" : "Manager",
          due: "Monitor",
          workflow: "Schedule review",
          target: scheduleTarget,
          onClick: () => openManagerSchedule(`${dateInfo.label} schedule opened from manager follow-up.`),
        },
    pendingRequest ? {
      label: "Request decision",
      detail: `${pendingRequest.employee} - ${pendingRequest.type}.`,
      owner: pendingRequest.employee,
      due: dateInfo.label,
      workflow: "Approval queue",
      target: requestTarget,
      onClick: openManagerRequests,
    } : null,
    timeFlag ? {
      label: "Time exception",
      detail: `${timeFlag.employee} - ${timeFlag.flag}.`,
      owner: timeFlag.employee,
      due: "Before payroll",
      workflow: "Time review",
      target: timeTarget,
      onClick: openManagerTime,
    } : null,
    lowGuide && lowGuide.completion < 90 ? {
      label: "Coach guide",
      detail: `${lowGuide.title} is ${lowGuide.completion}% complete.`,
      owner: "Training lead",
      due: dateInfo.isToday ? "This shift" : "This week",
      workflow: "Guide support",
      target: `${teamTargetPrefix}:training-questions`,
      onClick: () => {
        sendDashboardGuideTip(selectedDate, "all", patchData, ownerManaged ? "Owner" : "Manager");
        goThread?.("m5", `${lowGuide.title} coaching tip opened from manager follow-up.`);
      },
    } : null,
  ].filter(Boolean).slice(0, 4);
  const managerProofRows = [
    { label: "Handoff", detail: ops.handoffStatus, target: `${teamTargetPrefix}:manager-handoff`, onClick: () => goThread?.("m2", "Manager Handoff opened from manager proof trail.") },
    { label: "Coverage", detail: ops.coverageAsk, target: `${teamTargetPrefix}:coverage`, onClick: () => goThread?.("m4", "Coverage Team opened from manager proof trail.") },
    { label: "Risk", detail: ops.riskCheck, target: timeTarget, onClick: openManagerTime },
  ];
  const digestSignals = [
    { label: "Coverage", value: noDayPlan ? "No plan" : `${coveredShifts.length}/${dayShifts.length}`, detail: openShift ? `${locationName(openShift.locationId)} gap` : "Schedule signal" },
    { label: "Requests", value: pendingCount, detail: pendingRequest ? `${pendingRequest.employee} waiting` : "Queue clear" },
    { label: "Time risk", value: timeFlagCount, detail: timeFlag ? `${timeFlag.employee} flag` : dateInfo.isToday ? "No active flags" : "Review on workday" },
  ];
  const digestProof = [
    { label: "Handoff", value: ops.handoffStatus || "Not sent" },
    { label: "Coverage ask", value: ops.coverageAsk || "Not posted" },
    { label: "Risk check", value: ops.riskCheck || "Not checked" },
  ];
  return (
    <div className="screen-grid">
      <section className="kpi-strip">
        <Metric label={`${dateInfo.label} Coverage`} value={coverageValue} detail={coverageDetail} state={openShift || noDayPlan ? "warn" : "good"} onClick={() => openManagerSchedule()} actionTarget={scheduleTarget} />
        <Metric label="Team Clock Status" value={activeTimeEntries} detail={timeFlag ? `${timeFlag.flag}` : dateInfo.isToday ? "Active today" : `${dateInfo.label} review only`} onClick={openManagerTime} actionTarget={timeTarget} />
        <Metric label="Approvals" value={pendingCount} detail={pendingRequest ? `${pendingRequest.type} waiting` : ownerManaged ? "Owner-managed queue" : `${dateInfo.label} queue clear`} state={pendingCount ? "warn" : "good"} onClick={openManagerRequests} actionTarget={requestTarget} />
        <Metric label="Guide Progress" value={`${metrics.guide}%`} detail={lowGuide ? `Review ${lowGuide.title}` : "Assigned cards"} onClick={openManagerGuide} actionTarget={guideTarget} />
      </section>
      <section className="main-grid">
        <Panel title={ownerManaged ? "Owner Manager Board" : "Manager Coverage Board"} eyebrow={ownerManaged ? `${dateInfo.label} / no manager assigned` : `${dateInfo.label} by work area`} action={<button type="button" onClick={() => openManagerSchedule("Manager schedule opened from dashboard.")} {...homeActionTarget(scheduleTarget)}>Manage Schedule</button>}>
          {dayShifts.length ? (
            <Timeline shifts={dayShifts} compact onShiftClick={(shift) => {
              setLocation?.(shift.locationId);
              go(scheduleTarget, `${locationName(shift.locationId)} shift opened from manager board.`, {
                title: `${locationName(shift.locationId)} shift opened`,
                detail: `${shift.role}, ${formatHour(shift.start)} - ${formatHour(shift.end)}.`,
                source: roleSource,
                shiftId: shift.id,
                schedulePeriod: "day",
                scheduleDate: selectedDate,
              });
            }} />
          ) : (
            <div className="schedule-empty-board manager-empty-board">
              <CalendarBlank size={24} />
              <strong>{dateInfo.label} has no schedule yet</strong>
              <span>Build the day before asking staff for coverage or preparing assignments.</span>
              <button type="button" onClick={() => openManagerSchedule(`${dateInfo.label} schedule builder opened from manager board.`)}>Build Schedule</button>
            </div>
          )}
        </Panel>
        <Panel title="Manager Actions" eyebrow={ownerManaged ? "Owner has manager functions" : "No owner billing controls here"}>
          <ActionQueue
            items={[
              { label: "Approve team requests", detail: pendingRequest ? `${pendingRequest.employee} - ${pendingRequest.type}` : ownerManaged ? "Owner handles manager approvals directly." : `${dateInfo.label} request queue is clear.`, action: "Open", target: requestTarget, onClick: openManagerRequests },
              { label: "Review clock entries", detail: timeFlag ? `${timeFlag.employee} - ${timeFlag.flag}` : "Check late starts and corrections.", action: "Review", target: timeTarget, onClick: openManagerTime },
              { label: "Ask team for coverage", detail: openShift ? `${locationName(openShift.locationId)} needs ${openShift.role}.` : noDayPlan ? `Build ${dateInfo.label} schedule first.` : "No coverage ask is needed right now.", action: openShift ? "Ask" : "Schedule", target: openShift ? (ownerManaged ? "owner-team:coverage" : "manager-team:coverage") : scheduleTarget, onClick: postManagerCoverageAsk },
              { label: "Prepare open shift", detail: openShift ? "Creates a pending assignment for the visible gap." : noDayPlan ? "No dated schedule exists yet." : `No open shift needs prep for ${dateInfo.label}.`, action: openShift ? "Prep" : "Schedule", target: scheduleTarget, onClick: prepareManagerGap },
            ]}
          />
        </Panel>
      </section>
      <section className="lower-grid manager-home-lower">
        <Panel title={ownerManaged ? "Owner-Managed Next Actions" : "Next Actions"} eyebrow={`${dateInfo.label} blockers and proof`}>
          <div className="command-followup-board manager-followup-board" aria-label="Manager follow-up plan">
            <div className="command-followup-head">
              <span>Follow-up Plan</span>
              <strong>{managerFollowUps.filter((item) => item.label !== "Coverage ready").length ? "Close the next blockers" : "No urgent blockers"}</strong>
            </div>
            <div className="command-followup-list">
              {managerFollowUps.map((item) => (
                <button type="button" key={`${item.label}-${item.owner}`} onClick={item.onClick} {...homeActionTarget(item.target)}>
                  <span>{item.owner}</span>
                  <strong>{item.label}</strong>
                  <em>{item.due} - {item.workflow}</em>
                </button>
              ))}
            </div>
            <div className="command-proof-row" aria-label="Proof trail">
              {managerProofRows.map((item) => (
                <button type="button" key={item.label} onClick={item.onClick} {...homeActionTarget(item.target)}>
                  <span>{item.label}</span>
                  <strong>{item.detail || "Not recorded"}</strong>
                </button>
              ))}
            </div>
          </div>
        </Panel>
        <ManagerTeamPulseCard
          dateInfo={dateInfo}
          noDayPlan={noDayPlan}
          coveredCount={coveredShifts.length}
          totalShifts={dayShifts.length}
          openShift={openShift}
          pendingCount={pendingCount}
          timeFlagCount={timeFlagCount}
          lowGuide={lowGuide}
          scheduleTarget={scheduleTarget}
          teamTargetPrefix={teamTargetPrefix}
          digestSignals={digestSignals}
          digestProof={digestProof}
          onOpenHandoff={() => goThread?.("m2", "Manager Handoff opened from Team Handoff.")}
          onSendDigest={postManagerHandoffDigest}
          onPostUpdate={postManagerTeamPulse}
          onAskCoverage={openShift ? postManagerCoverageAsk : () => openManagerSchedule(`${dateInfo.label} schedule opened from Team Handoff.`)}
          onCoachGuide={coachTeamGuide}
        />
      </section>
    </div>
  );
}

function ManagerTeamPulseCard({ dateInfo, noDayPlan, coveredCount, totalShifts, openShift, pendingCount, timeFlagCount, lowGuide, scheduleTarget, teamTargetPrefix, digestSignals, digestProof, onOpenHandoff, onSendDigest, onPostUpdate, onAskCoverage, onCoachGuide }) {
  const coverageTarget = openShift ? `${teamTargetPrefix}:coverage` : scheduleTarget;
  const coverageDetail = noDayPlan
    ? `Build ${dateInfo.label} schedule first.`
    : openShift
      ? `${locationName(openShift.locationId)} needs ${openShift.role}.`
      : `${dateInfo.label} coverage is clear.`;
  const signals = [
    { label: "Schedule", value: noDayPlan ? "No plan" : `${coveredCount}/${totalShifts}`, detail: coverageDetail },
    { label: "Requests", value: pendingCount, detail: pendingCount ? "Waiting for a decision" : "Queue clear" },
    { label: "Time", value: timeFlagCount, detail: timeFlagCount ? "Needs review" : dateInfo.isToday ? "Clock flow clear" : "Review on workday" },
    { label: "Guide", value: lowGuide ? `${lowGuide.completion}%` : "Ready", detail: lowGuide ? lowGuide.title : "No guide gaps" },
  ];
  return (
    <Panel title="Team Handoff" eyebrow={`${dateInfo.label} communication`} action={<button type="button" onClick={onOpenHandoff} {...homeActionTarget(`${teamTargetPrefix}:manager-handoff`)}>Open Team</button>}>
      <div className="manager-team-pulse" aria-label="Manager team pulse">
        <div className="manager-team-pulse-summary">
          <span>Live team signal</span>
          <strong>{openShift ? "Coverage needs a reply" : noDayPlan ? "Build the plan first" : pendingCount || timeFlagCount ? "Clear the next decision" : "Team is aligned"}</strong>
          <p>{coverageDetail}</p>
        </div>
        <div className="manager-team-pulse-grid">
          {signals.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
        <div className="manager-handoff-digest" aria-label="Manager handoff digest">
          <div className="manager-digest-grid">
            {digestSignals.map((item) => (
              <article key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.detail}</small>
              </article>
            ))}
          </div>
          <div className="manager-digest-proof" aria-label="Proof anchors">
            <span>Proof anchors</span>
            {digestProof.map((item) => (
              <strong key={item.label}>{item.label}: {item.value}</strong>
            ))}
          </div>
        </div>
        <div className="manager-team-pulse-actions">
          <button type="button" className="primary-action" onClick={onSendDigest} {...homeActionTarget(`${teamTargetPrefix}:manager-handoff`)}>
            Send Digest
          </button>
          <button type="button" onClick={onPostUpdate} {...homeActionTarget(`${teamTargetPrefix}:manager-handoff`)}>
            Post Update
          </button>
          <button type="button" onClick={onAskCoverage} {...homeActionTarget(coverageTarget)}>
            {openShift ? "Ask Coverage" : "Open Schedule"}
          </button>
          <button type="button" onClick={onCoachGuide} {...homeActionTarget(`${teamTargetPrefix}:training-questions`)}>
            Coach Guide
          </button>
        </div>
      </div>
    </Panel>
  );
}

function employeeAssignedShifts(data) {
  return data.shifts.filter((shift) => shift.employee === "Ava Brooks" && shift.status !== "open" && (!singleLocationMode(data) || shift.locationId === primaryLocationId(data)));
}

function employeeAvailableShifts(data) {
  return data.shifts.filter((shift) => shift.status === "open" && (!singleLocationMode(data) || shift.locationId === primaryLocationId(data)));
}

function employeeRequests(data) {
  return data.requests.filter((request) => request.employee === "Ava Brooks" && (!singleLocationMode(data) || request.locationId === primaryLocationId(data)));
}

function requestDateKey(request) {
  const rawDate = String(request?.date || "").trim();
  const normalized = rawDate.toLowerCase();
  if (validDateKey(rawDate)) return rawDate;
  if (normalized === "today") return operationsToday;
  if (normalized === "tomorrow") return offsetDateKey(operationsToday, 1);
  if (normalized === "yesterday") return offsetDateKey(operationsToday, -1);

  const weekdayIndex = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(normalized.slice(0, 3));
  if (weekdayIndex >= 0) {
    const today = parseDateKey(operationsToday);
    const offset = (weekdayIndex - today.getDay() + 7) % 7;
    return offsetDateKey(operationsToday, offset);
  }

  const parsed = Date.parse(`${rawDate} ${parseDateKey(operationsToday).getFullYear()} 12:00:00`);
  if (!Number.isNaN(parsed) && /\d/.test(rawDate)) {
    const date = new Date(parsed);
    return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
  }

  return "";
}

function requestAppliesToDate(request, date) {
  if (!validDateKey(date)) return true;
  const normalized = String(request?.date || "").trim().toLowerCase();
  if (normalized === "this week") return scheduleRangeDates(operationsToday, "week").includes(date);
  const requestDate = requestDateKey(request);
  return requestDate ? requestDate === date : true;
}

function requestAppliesToAnyDate(request, dates) {
  const validDates = dates.filter(validDateKey);
  if (!validDates.length) return true;
  return validDates.some((date) => requestAppliesToDate(request, date));
}

function employeeHourlyRate(data) {
  return data.timeEntries.find((entry) => entry.employee === "Ava Brooks")?.hourlyRate || coverageCandidates.find((candidate) => candidate.name === "Ava Brooks")?.rate || 0;
}

function employeeHomePunchAction(clock) {
  if (clock.status === "lunch") return { label: "End Lunch", action: "end-lunch" };
  if (clock.status === "working") return { label: "Start Lunch", action: "start-lunch" };
  return { label: "Clock In", action: "clock-in" };
}

function shiftLength(shift) {
  return Math.max(0, Number(shift.end || 0) - Number(shift.start || 0));
}

function EmployeeSectionShell({ title, eyebrow = "Employee", active, go, day = operationsToday, alertCount = 0, children, className = "" }) {
  const selectedDate = validDateKey(day) ? day : operationsToday;
  const dateInfo = selectedDateInfo(selectedDate);
  function openEmployeeChat() {
    go("employee-messages", `Team chat opened for ${dateInfo.label}.`, {
      title: "Team chat opened",
      detail: `Messages and shift alerts opened from ${sentenceDateLabel(dateInfo)}.`,
      source: "Employee header",
      scheduleDate: selectedDate,
    });
  }
  function openEmployeeAlerts() {
    go("employee-shifts", `Shift alerts opened for ${dateInfo.label}.`, {
      title: `${dateInfo.label} shift alerts`,
      detail: alertCount ? `${alertCount} open shift${alertCount === 1 ? "" : "s"} in view.` : `No open shifts are available for ${sentenceDateLabel(dateInfo)}.`,
      source: "Employee header",
      scheduleDate: selectedDate,
    });
  }
  return (
    <section className="employee-phone-shell" aria-label={`${title} employee screen`}>
      <div className={`employee-phone-app employee-work-app ${className}`}>
        <header className="employee-mobile-head">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h3>{title}</h3>
        </div>
        <div className="employee-mobile-tools">
            <button type="button" aria-label="Open team chat" onClick={openEmployeeChat} {...homeActionTarget("employee-messages")}>
              <ChatCircleText size={18} />
            </button>
            <button type="button" aria-label="Open shift alerts" onClick={openEmployeeAlerts} {...homeActionTarget("employee-shifts")}>
              <Bell size={18} />
              {alertCount > 0 && <i>{alertCount}</i>}
            </button>
            <span aria-hidden="true">AB</span>
          </div>
        </header>
        <main className="employee-work-scroll">
          {children}
        </main>
        <EmployeePhoneTabs active={active} go={go} day={selectedDate} />
      </div>
    </section>
  );
}

function EmployeeDashboard({ data, go, patchData, day }) {
  const selectedDate = validDateKey(day) ? day : operationsToday;
  const dateInfo = selectedDateInfo(selectedDate);
  const dateLabel = sentenceDateLabel(dateInfo);
  const myShifts = employeeAssignedShifts(data).filter((shift) => shiftDateKey(shift) === selectedDate);
  const myRequests = employeeRequests(data).filter((request) => requestAppliesToDate(request, selectedDate));
  const openShifts = employeeAvailableShifts(data).filter((shift) => shiftDateKey(shift) === selectedDate);
  const nextShift = myShifts[0];
  const nextRequest = myRequests[0];
  const hourlyRate = employeeHourlyRate(data);
  const nextGuide = data.guideCards.find((card) => !data.completedGuideIds.includes(card.id)) || data.guideCards[0];
  const clock = { ...defaultTimeClock, ...(data.timeClock || {}) };
  const punchAction = employeeHomePunchAction(clock);
  const hasShiftAlert = Boolean(openShifts[0]);
  const canPunchToday = dateInfo.isToday;
  const primaryActionLabel = canPunchToday ? punchAction.label : "Time Clock";
  function handleHomePunch() {
    if (!canPunchToday) {
      go("employee-clock", `Time clock opened for ${dateInfo.label}.`, {
        title: `${dateInfo.label} time clock`,
        detail: "Clock-in actions are available on the workday with location verification.",
        source: "Employee selected day",
      });
      return;
    }
    punchClock(punchAction.action, patchData);
    go("employee-clock", `${punchAction.label} saved from Today.`);
  }
  function openEmployeeShifts(message = `Open shifts opened for ${dateInfo.label}.`) {
    go("employee-shifts", message, openShifts[0] ? {
      title: "Open shift alert opened",
      detail: `${locationName(openShifts[0].locationId)} needs ${openShifts[0].role}, ${formatHour(openShifts[0].start)} - ${formatHour(openShifts[0].end)}.`,
      source: "Employee selected day",
      shiftId: openShifts[0].id,
      scheduleDate: selectedDate,
    } : {
      title: "Open shifts opened",
      detail: `No open shifts are available for ${dateLabel}.`,
      source: "Employee selected day",
      scheduleDate: selectedDate,
    });
  }
  function openEmployeeSchedule() {
    go("employee-schedule", `${dateInfo.label} schedule opened from Shift Readiness.`, {
      title: `${dateInfo.label} schedule`,
      detail: nextShift
        ? `${locationName(nextShift.locationId)} ${nextShift.role}, ${formatHour(nextShift.start)} - ${formatHour(nextShift.end)}.`
        : `No approved shift is scheduled for ${dateLabel}.`,
      source: "Shift Readiness",
      scheduleDate: selectedDate,
      shiftId: nextShift?.id,
    });
  }
  function openEmployeeGuide() {
    go("employee-guide", nextGuide ? `${nextGuide.title} opened from ${dateInfo.label}.` : `Guide opened from ${dateInfo.label}.`, {
      title: nextGuide ? "Guide opened" : "Guide library opened",
      detail: nextGuide ? `${nextGuide.title} is ${nextGuide.completion}% complete.` : "Review shift help cards.",
      source: "Employee selected day",
      guideId: nextGuide?.id,
      scheduleDate: selectedDate,
    });
  }
  const readinessItems = [
    {
      id: "schedule",
      icon: CalendarBlank,
      label: "Shift plan",
      state: nextShift ? "Ready" : openShifts.length ? "Pickup" : "Clear",
      detail: nextShift
        ? `${locationName(nextShift.locationId)} - ${formatHour(nextShift.start)} to ${formatHour(nextShift.end)}`
        : openShifts.length
          ? `${openShifts.length} open shift${openShifts.length === 1 ? "" : "s"} for ${dateLabel}`
          : `No approved shift for ${dateLabel}`,
      target: "employee-schedule",
      onClick: openEmployeeSchedule,
    },
    {
      id: "clock",
      icon: MapPin,
      label: "Location check",
      state: dateInfo.isToday ? clock.locationStatus === "verified" ? "Ready" : "Check" : "Review Only",
      detail: dateInfo.isToday
        ? clock.locationStatus === "verified"
          ? "Verified for today's punch flow"
          : "Verify when you arrive before clocking in"
        : "Clock actions unlock on the workday",
      target: "employee-clock",
      onClick: () => go("employee-clock", `Time clock opened for ${dateInfo.label}.`, {
        title: `${dateInfo.label} time clock`,
        detail: dateInfo.isToday ? "Location check, clock, and lunch actions are available today." : "Future dates are review only until the workday.",
        source: "Shift Readiness",
        scheduleDate: selectedDate,
      }),
    },
    {
      id: "requests",
      icon: ListChecks,
      label: "Requests",
      state: nextRequest ? nextRequest.status : "None",
      detail: nextRequest ? `${nextRequest.type} - ${nextRequest.reason}` : `No request is active for ${dateLabel}`,
      target: "employee-requests",
      onClick: () => go("employee-requests", `Requests opened from Shift Readiness for ${dateInfo.label}.`, {
        title: nextRequest ? "Request opened" : "My requests opened",
        detail: nextRequest ? `${nextRequest.type} - ${nextRequest.status}.` : `No employee requests are active for ${dateLabel}.`,
        source: "Shift Readiness",
        requestId: nextRequest?.id,
        scheduleDate: selectedDate,
      }),
    },
    {
      id: "guide",
      icon: BookOpenText,
      label: "Guide tip",
      state: nextGuide ? `${nextGuide.completion}%` : "Done",
      detail: nextGuide ? nextGuide.title : "All shift guide cards are complete",
      target: "employee-guide",
      onClick: openEmployeeGuide,
    },
  ];
  return (
    <EmployeeSectionShell title={dateInfo.label} eyebrow="Employee day" active="today" go={go} day={selectedDate} alertCount={openShifts.length} className="employee-today-app">
      <article className="employee-today-hero">
        <div className="employee-today-copy">
          <span>{dateInfo.isToday ? "Next shift" : `${dateInfo.label} shift`}</span>
          <strong>{nextShift ? `${formatHour(nextShift.start)} - ${formatHour(nextShift.end)}` : "No shift scheduled"}</strong>
          <p>{nextShift ? `${locationName(nextShift.locationId)} - ${nextShift.role}` : `No approved shift is scheduled for ${dateLabel}.`}</p>
        </div>
        <button type="button" className={`employee-primary-cta ${canPunchToday ? "" : "secondary"}`} onClick={handleHomePunch} {...homeActionTarget("employee-clock")}>
          {primaryActionLabel}
        </button>
      </article>

      <section className="employee-quick-grid" aria-label="Employee quick actions">
        <button type="button" className="employee-quick-card" onClick={() => openEmployeeShifts()} {...homeActionTarget("employee-shifts")}>
          <Sparkle size={20} weight="fill" />
          <strong>{openShifts.length} open shifts</strong>
          <span>{openShifts.length ? "Tap to request extra hours" : `No pickup options for ${dateLabel}`}</span>
        </button>
        <button type="button" className="employee-quick-card" onClick={() => go("employee-requests", `Requests opened for ${dateInfo.label}.`, {
          title: nextRequest ? "Request opened" : "My requests opened",
          detail: nextRequest ? `${nextRequest.type} - ${nextRequest.status}.` : `No employee requests are active for ${dateLabel}.`,
          source: "Employee selected day",
          requestId: nextRequest?.id,
          scheduleDate: selectedDate,
        })} {...homeActionTarget("employee-requests")}>
          <ListChecks size={20} />
          <strong>{nextRequest ? statusBadge(nextRequest.status, nextRequest.status) : "No requests"}</strong>
          <span>{nextRequest ? `${nextRequest.type} - ${nextRequest.date}` : "Send time off or swap request"}</span>
        </button>
      </section>

      <section className="employee-work-card employee-readiness-card" aria-label={`${dateInfo.label} shift readiness`}>
        <div className="employee-card-head">
          <div>
            <span>Shift Readiness</span>
            <strong>{dateInfo.isToday ? "Before you start" : `${dateInfo.label} prep`}</strong>
          </div>
          <button type="button" onClick={() => go("employee-messages", `Team chat opened from Shift Readiness for ${dateInfo.label}.`, { scheduleDate: selectedDate, source: "Shift Readiness" })} {...homeActionTarget("employee-messages")}>Chat</button>
        </div>
        <div className="employee-readiness-list">
          {readinessItems.map((item) => {
            const Icon = item.icon;
            return (
              <button type="button" className="employee-readiness-item" key={item.id} onClick={item.onClick} {...homeActionTarget(item.target)}>
                <Icon size={18} weight={item.id === "guide" ? "regular" : "fill"} />
                <span>{item.label}</span>
                <strong>{item.state}</strong>
                <small>{item.detail}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="employee-work-card">
        <div className="employee-card-head">
          <div>
            <span>{dateInfo.isToday ? "Today plan" : "Selected day plan"}</span>
            <strong>{nextShift ? `${shiftLength(nextShift)} hrs scheduled` : openShifts.length ? "Available for pickup" : "No scheduled hours"}</strong>
          </div>
          <i>{hourlyRate ? `${rateMoney(hourlyRate)}/hr` : "Rate set"}</i>
        </div>
        <div className="employee-mini-list">
          <div>
            <span>Lunch</span>
            <strong>{dateInfo.isToday ? clock.lunchStatus || "Not started" : "On shift day"}</strong>
          </div>
          <div>
            <span>Location check</span>
            <strong>{dateInfo.isToday ? clock.locationStatus === "verified" ? "Verified" : "Needs check" : "At arrival"}</strong>
          </div>
        </div>
      </section>

      <section className="employee-work-card">
        <div className="employee-card-head">
          <div>
            <span>Team update</span>
            <strong>{openShifts.length ? "New shift alert" : "No urgent alerts"}</strong>
          </div>
          <button type="button" onClick={() => hasShiftAlert ? openEmployeeShifts(`Shift alert opened for ${dateInfo.label}.`) : go("employee-messages", `Team chat opened for ${dateInfo.label}.`, { scheduleDate: selectedDate, source: "Employee day card" })} {...homeActionTarget(hasShiftAlert ? "employee-shifts" : "employee-messages")}>{hasShiftAlert ? "View" : "Chat"}</button>
        </div>
        <p className="employee-card-note">
          {openShifts[0]
            ? `${locationName(openShifts[0].locationId)} needs ${openShifts[0].role}, ${formatHour(openShifts[0].start)} - ${formatHour(openShifts[0].end)}.`
            : `Team messages and approved schedule changes for ${dateLabel} stay in the chat center.`}
        </p>
      </section>

      <section className="employee-work-card">
        <div className="employee-card-head">
          <div>
            <span>Training</span>
            <strong>{nextGuide?.title || "Guide complete"}</strong>
          </div>
          <button type="button" onClick={openEmployeeGuide} {...homeActionTarget("employee-guide")}>Open</button>
        </div>
        <div className="employee-progress-line">
          <span style={{ width: `${nextGuide?.completion || 100}%` }} />
        </div>
      </section>
    </EmployeeSectionShell>
  );
}

function EmployeeOpenShifts({ data, patchData, go, routeFocus, day }) {
  const targetDate = validDateKey(routeFocus?.scheduleDate) ? routeFocus.scheduleDate : validDateKey(day) ? day : operationsToday;
  const dateInfo = selectedDateInfo(targetDate);
  const dateLabel = sentenceDateLabel(dateInfo);
  const openShifts = employeeAvailableShifts(data).filter((shift) => shiftDateKey(shift) === targetDate);
  const focusedShift = openShifts.find((shift) => shift.id === routeFocus?.shiftId);
  const featuredShift = focusedShift || openShifts[0];
  const hourlyRate = employeeHourlyRate(data);
  return (
    <EmployeeSectionShell title={dateInfo.isToday ? "Open Shifts" : `${dateInfo.label} Shifts`} active="shifts" go={go} day={targetDate} alertCount={openShifts.length} className="employee-shifts-app">
      <RouteFocusBanner focus={routeFocus} />
      {featuredShift ? (
        <article className="employee-shift-feature">
          <div className="employee-shift-feature-top">
            <span>Best match</span>
            <strong>{locationName(featuredShift.locationId)}</strong>
          </div>
          <h4>{featuredShift.role}</h4>
          <p>{formatHour(featuredShift.start)} - {formatHour(featuredShift.end)} - {shiftLength(featuredShift)} hours</p>
          <div className="employee-shift-meta">
            <span>{money(shiftLength(featuredShift) * hourlyRate)} est.</span>
            <span>Approval required</span>
            <span>{featuredShift.note}</span>
          </div>
          <button type="button" onClick={() => claimShift(featuredShift.id, patchData)}>
            Request Shift
          </button>
        </article>
      ) : (
        <section className="employee-empty-state">
          <Sparkle size={26} />
          <strong>No open shifts for {dateInfo.label}</strong>
          <span>When a manager or owner opens one for {dateLabel}, it will show here first.</span>
        </section>
      )}

      <section className="employee-work-card">
        <div className="employee-card-head">
          <div>
            <span>Available feed</span>
            <strong>{openShifts.length ? `${openShifts.length} opportunities` : "All caught up"}</strong>
          </div>
          <button type="button" onClick={() => go("employee-messages", `Team alerts opened for ${dateInfo.label}.`, { scheduleDate: targetDate, source: "Employee open shifts" })}>Alerts</button>
        </div>
        <div className="employee-shift-feed">
          {openShifts.map((shift, index) => (
            <article className={`employee-shift-row ${routeFocus?.shiftId === shift.id ? "selected" : ""}`} key={shift.id}>
              <div>
                <span>{locationName(shift.locationId)}</span>
                <strong>{shift.role}</strong>
                <p>{formatHour(shift.start)} - {formatHour(shift.end)} - {shift.note}</p>
              </div>
              <div className="employee-shift-row-action">
                <i>{index === 0 ? "New" : "Open"}</i>
                <button type="button" onClick={() => claimShift(shift.id, patchData)}>Request</button>
              </div>
            </article>
          ))}
          {!openShifts.length && <p className="empty">New shifts for {dateLabel} will appear here.</p>}
        </div>
      </section>
    </EmployeeSectionShell>
  );
}

function ScheduleBoard({ data, shifts, scope, openModal, patchData, go, routeFocus, day = operationsToday, setDay, location = "all", setLocation }) {
  const initialPanelMode = initialScheduleModeFromUrl();
  const [schedulePanel, setSchedulePanel] = useState(() => initialPanelMode === "calendar" ? "calendar" : initialPanelMode === "planning" ? "plan" : null);
  const [manageMenuOpen, setManageMenuOpen] = useState(false);
  const [scheduleView, setScheduleView] = useState("all");
  const [schedulePeriodState, setSchedulePeriodState] = useState(() => initialSchedulePeriodFromUrl());
  const [customRangeEnd, setCustomRangeEndState] = useState(() => initialScheduleEndFromUrl(initialDayFromUrl()));
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedShiftId, setSelectedShiftId] = useState(null);
  const requestTarget = scope === "owner" ? "owner-requests" : "manager-requests";
  const timeTarget = scope === "owner" ? "owner-time" : "manager-time";
  const selectedDate = validDateKey(day) ? day : operationsToday;
  const schedulePeriod = schedulePeriodIds.includes(schedulePeriodState) ? schedulePeriodState : "day";
  const safeCustomRangeEnd = validDateKey(customRangeEnd) ? customRangeEnd : offsetDateKey(selectedDate, 13);
  const rangeDates = scheduleRangeDates(selectedDate, schedulePeriod, safeCustomRangeEnd);
  const rangeSummary = scheduleRangeSummary(shifts, rangeDates);
  const periodShifts = shifts.filter((shift) => rangeDates.includes(shiftDateKey(shift)));
  const roleOptions = Array.from(new Set(shifts.map((shift) => shift.role))).sort();
  const roleFilteredShifts = roleFilter === "all" ? periodShifts : periodShifts.filter((shift) => shift.role === roleFilter);
  const openShifts = roleFilteredShifts.filter((shift) => shift.status === "open");
  const pendingShifts = roleFilteredShifts.filter((shift) => shift.status === "pending");
  const managerShifts = roleFilteredShifts.filter((shift) => shift.role.toLowerCase().includes("manager") || shift.note.toLowerCase().includes("manager"));
  const displayShifts = scheduleView === "gaps"
    ? roleFilteredShifts.filter((shift) => shift.status === "open" || shift.status === "pending")
    : scheduleView === "managers"
      ? managerShifts
      : roleFilteredShifts;
  const displayRows = rangeDates.map((date) => scheduleRollupForDate(displayShifts, date));
  const selectedDatePlan = getDatePlan(data, selectedDate, shifts);
  const timelineBounds = scheduleTimeBounds(selectedDatePlan, displayShifts);
  const coveredCount = roleFilteredShifts.filter((shift) => shift.status !== "open").length;
  const coveragePercent = roleFilteredShifts.length ? Math.round((coveredCount / roleFilteredShifts.length) * 100) : 100;
  const laborHours = roleFilteredShifts.reduce((sum, shift) => sum + shiftLength(shift), 0);
  const pendingRequests = data.requests.filter((request) => request.status === "pending" && requestAppliesToAnyDate(request, rangeDates) && (!singleLocationMode(data) || request.locationId === primaryLocationId(data))).length;
  const selectedShift = displayShifts.find((shift) => shift.id === selectedShiftId) || openShifts[0] || displayShifts[0] || periodShifts[0];
  const selectedTimeEntry = timeFocusForLocation(data, selectedShift?.locationId || "all", rangeDates);
  const scheduleOps = getScheduleOps(data);
  const selectedDayShifts = shifts
    .filter((shift) => shiftDateKey(shift) === selectedDate)
    .filter((shift) => roleFilter === "all" || shift.role === roleFilter);
  const coverageShift = selectedShift?.status === "open" || selectedShift?.status === "pending" ? selectedShift : openShifts[0] || pendingShifts[0] || selectedShift;

  function setSchedulePeriod(nextPeriod, dateForUrl = selectedDate, endDateForUrl = safeCustomRangeEnd) {
    const normalized = schedulePeriodIds.includes(nextPeriod) ? nextPeriod : "day";
    setSchedulePeriodState(normalized);
    syncSchedulePeriodInUrl(scope, dateForUrl, normalized, endDateForUrl);
  }

  function setCustomRangeEnd(nextEnd, nextStart = selectedDate) {
    const normalizedEnd = validDateKey(nextEnd) ? nextEnd : offsetDateKey(nextStart, 13);
    setCustomRangeEndState(normalizedEnd);
    if (schedulePeriod === "custom") syncSchedulePeriodInUrl(scope, nextStart, "custom", normalizedEnd);
  }

  function goScheduleDate(nextDate, nextPeriod = schedulePeriod, nextEndDate = safeCustomRangeEnd) {
    const safeDate = validDateKey(nextDate) ? nextDate : selectedDate;
    const normalizedPeriod = schedulePeriodIds.includes(nextPeriod) ? nextPeriod : "day";
    const normalizedEnd = normalizedPeriod === "custom" && !validDateKey(nextEndDate) ? offsetDateKey(safeDate, 13) : nextEndDate;
    if (normalizedPeriod === "custom") setCustomRangeEndState(normalizedEnd);
    setDay?.(safeDate);
    setSchedulePeriod(normalizedPeriod, safeDate, normalizedEnd);
  }

  function moveScheduleRange(direction) {
    if (schedulePeriod === "custom") {
      const step = Math.max(rangeDates.length, 1);
      goScheduleDate(offsetDateKey(selectedDate, direction * step), "custom", offsetDateKey(safeCustomRangeEnd, direction * step));
      return;
    }
    goScheduleDate(offsetPeriodDateKey(selectedDate, schedulePeriod, direction), schedulePeriod);
  }

  function openRangeDay(nextDate) {
    setDay?.(nextDate);
    setSchedulePeriod("day", nextDate, safeCustomRangeEnd);
  }

  function openSchedulePanel(nextPanel) {
    setSchedulePanel(nextPanel);
    setManageMenuOpen(false);
  }

  function openDayBuilder(nextDate = selectedDate) {
    openRangeDay(nextDate);
    setSchedulePanel("builder");
    setManageMenuOpen(false);
  }

  function addOpenShiftForDate(nextDate = selectedDate) {
    addOpenShiftForScheduleDay({
      date: nextDate,
      location,
      selectedShift,
      timelineBounds,
      data,
      patchData,
    });
    openDayBuilder(nextDate);
  }

  function openShiftModalFromMenu() {
    openModal("shift");
    setManageMenuOpen(false);
  }

  useEffect(() => {
    if (!routeFocus?.shiftId || !shifts.some((shift) => shift.id === routeFocus.shiftId)) return;
    setSelectedShiftId((current) => current === routeFocus.shiftId ? current : routeFocus.shiftId);
  }, [routeFocus?.shiftId, shifts]);

  useEffect(() => {
    const routeHasScheduleFocus = validDateKey(routeFocus?.scheduleDate) || schedulePeriodIds.includes(routeFocus?.schedulePeriod);
    if (validDateKey(routeFocus?.scheduleDate)) {
      setDay?.(routeFocus.scheduleDate);
    }
    if (schedulePeriodIds.includes(routeFocus?.schedulePeriod)) {
      setSchedulePeriod(routeFocus.schedulePeriod, routeFocus.scheduleDate || selectedDate, safeCustomRangeEnd);
    }
    if (routeFocus?.scheduleRole) {
      setRoleFilter(routeFocus.scheduleRole);
    }
  }, [routeFocus?.scheduleDate, routeFocus?.schedulePeriod, routeFocus?.scheduleRole]);

  return (
    <div className="stack schedule-workspace">
      <div className="section-tools schedule-workspace-top">
        <div>
          <p className="eyebrow">{scope === "owner" ? "Owner planning" : "Manager planning"}</p>
          <h3>Schedule Command Center</h3>
          <span className="schedule-workspace-subtitle">{periodLabel(selectedDate, schedulePeriod, safeCustomRangeEnd)} / {locationName(location)}</span>
        </div>
        <button type="button" onClick={() => exportData(data.shifts, "schedule-export.json")}>
          <DownloadSimple size={17} /> Export
        </button>
      </div>
      <RouteFocusBanner focus={routeFocus} />

      <>
        <Panel
          title={schedulePeriod === "day" ? "Schedule Board" : "Range Board"}
          eyebrow={schedulePeriod === "day"
            ? `${periodLabel(selectedDate, schedulePeriod)} / ${formatHour(timelineBounds.start)} to ${formatHour(timelineBounds.end)}`
            : `${periodLabel(selectedDate, schedulePeriod, safeCustomRangeEnd)} / cards are days, chips are shifts`}
          action={
            <div className="schedule-board-actions">
              <ManageScheduleControl
                open={manageMenuOpen}
                onToggle={() => setManageMenuOpen((open) => !open)}
                scheduleView={scheduleView}
                onSetScheduleView={(nextView) => {
                  setScheduleView(nextView);
                  setManageMenuOpen(false);
                }}
                onDayBuilder={() => openDayBuilder(selectedDate)}
                onCalendar={() => openSchedulePanel("calendar")}
                onPlan={() => openSchedulePanel("plan")}
                onAddShift={openShiftModalFromMenu}
                onAddOpenShift={() => addOpenShiftForDate(selectedDate)}
                onFillMissing={() => openSchedulePanel("coverage")}
              />
            </div>
          }
        >
          <ScheduleWorkspaceControls
            data={data}
            location={location}
            setLocation={setLocation}
            selectedDate={selectedDate}
            schedulePeriod={schedulePeriod}
            customRangeEnd={safeCustomRangeEnd}
            rangeSummary={rangeSummary}
            roleFilter={roleFilter}
            roleOptions={roleOptions}
            setRoleFilter={setRoleFilter}
            onGoDate={goScheduleDate}
            onMoveRange={moveScheduleRange}
            onSetCustomEnd={setCustomRangeEnd}
            embedded
          />
          {schedulePeriod === "day" && displayShifts.length ? (
            <Timeline shifts={displayShifts} selectedShiftId={selectedShift?.id} onShiftClick={(shift) => setSelectedShiftId(shift.id)} bounds={timelineBounds} />
          ) : schedulePeriod !== "day" ? (
            <ScheduleRangeBoard
              period={schedulePeriod}
              rows={displayRows}
              selectedShiftId={selectedShift?.id}
              datePlans={data.datePlans || {}}
              onShiftClick={(shift) => setSelectedShiftId(shift.id)}
              onOpenDate={openRangeDay}
              onPrepareDate={(nextDate) => prepareDatePlan(nextDate, patchData)}
              onCopyTemplate={(nextDate) => copyScheduleTemplate(operationsToday, nextDate, patchData)}
              sourceDate={operationsToday}
            />
          ) : (
            <div className="schedule-empty-board">
              <CalendarBlank size={24} />
              <strong>No shifts in this range yet</strong>
              <span>Add a shift or copy today’s template into {periodLabel(selectedDate, schedulePeriod)}.</span>
              <button type="button" onClick={() => copyScheduleTemplate(operationsToday, selectedDate, patchData)}>Use Today Template</button>
            </div>
          )}
        </Panel>

        <section className="schedule-command-grid schedule-command-grid-compact">
          <Panel title="Coverage Snapshot" eyebrow={`${periodLabel(selectedDate, schedulePeriod, safeCustomRangeEnd)} planning range`}>
            <div className="schedule-stat-grid">
              <ScheduleStat icon={UsersThree} label="Covered shifts" value={`${coveragePercent}%`} detail={`${coveredCount}/${roleFilteredShifts.length} assigned`} state={coveragePercent >= 90 ? "good" : "warn"} />
              <ScheduleStat icon={CalendarBlank} label="Open shifts" value={openShifts.length} detail={openShifts.length ? "Use Fill Missing Person" : "No gaps"} state={openShifts.length ? "warn" : "good"} />
              <ScheduleStat icon={ShieldCheck} label="Manager coverage" value={managerShifts.length} detail="Leads on schedule" state={managerShifts.length ? "good" : "warn"} />
              <ScheduleStat icon={Clock} label="Labor hours" value={formatHours(laborHours)} detail={`Across ${rangeDates.length} day${rangeDates.length === 1 ? "" : "s"}`} state="info" />
            </div>
          </Panel>

          <ScheduleHandoffPanel
            data={data}
            ops={scheduleOps}
            openShifts={openShifts}
            selectedShift={selectedShift}
            pendingRequests={pendingRequests}
            managerShifts={managerShifts}
            dateScope={rangeDates}
            selectedDate={selectedDate}
            requestTarget={requestTarget}
            timeTarget={timeTarget}
            patchData={patchData}
            go={go}
          />

          <ShiftInspector shift={selectedShift} requestTarget={requestTarget} timeTarget={timeTarget} go={go} patchData={patchData} data={data} />
        </section>

        {schedulePanel && (
          <ScheduleDrawer title={scheduleDrawerTitle(schedulePanel)} eyebrow={scheduleDrawerEyebrow(schedulePanel, selectedDate)} onClose={() => setSchedulePanel(null)}>
            {schedulePanel === "calendar" && (
              <ScheduleCalendarPanel
                data={data}
                shifts={roleFilteredShifts}
                selectedDate={selectedDate}
                rangeDates={rangeDates}
                onOpenDate={openDayBuilder}
              />
            )}
            {schedulePanel === "builder" && (
              <ScheduleDayBuilder
                data={data}
                shifts={selectedDayShifts}
                selectedDate={selectedDate}
                timelineBounds={scheduleTimeBounds(getDatePlan(data, selectedDate, shifts), selectedDayShifts)}
                selectedShiftId={selectedShift?.id}
                onShiftClick={(shift) => setSelectedShiftId(shift.id)}
                onAddShift={openShiftModalFromMenu}
                onAddOpenShift={() => addOpenShiftForDate(selectedDate)}
                onCopyToday={() => copyScheduleTemplate(operationsToday, selectedDate, patchData)}
                onPlanDay={() => prepareDatePlan(selectedDate, patchData)}
              />
            )}
            {schedulePanel === "plan" && (
              <SchedulePlannerPanel
                data={data}
                shifts={shifts}
                selectedDate={selectedDate}
                schedulePeriod={schedulePeriod}
                setSchedulePeriod={setSchedulePeriod}
                customRangeEnd={safeCustomRangeEnd}
                setCustomRangeEnd={setCustomRangeEnd}
                setDay={setDay}
                rangeSummary={rangeSummary}
                timelineBounds={timelineBounds}
                openModal={openModal}
                patchData={patchData}
              />
            )}
            {schedulePanel === "coverage" && (
              <CoverageAssistantPanel shift={coverageShift} patchData={patchData} />
            )}
          </ScheduleDrawer>
        )}

        <Panel title="Open Shifts" eyebrow="Claim requests require manager or owner approval">
          <ShiftTable shifts={[...openShifts, ...pendingShifts]} patchData={patchData} />
        </Panel>
      </>
    </div>
  );
}

function ScheduleWorkspaceControls({ data, location, setLocation, selectedDate, schedulePeriod, customRangeEnd, rangeSummary, roleFilter, roleOptions, setRoleFilter, onGoDate, onMoveRange, onSetCustomEnd, embedded = false }) {
  const selectedDateInfo = selectedDateInfoForPanel(selectedDate);
  const locationChoices = businessLocations(data, true);
  return (
    <section className={`schedule-control-strip ${embedded ? "schedule-board-toolbar" : ""}`} aria-label={embedded ? "Schedule board controls" : "Shared schedule controls"}>
      <label className="schedule-control-field schedule-location-control">
        <span>Work area</span>
        <select value={location} onChange={(event) => setLocation?.(event.target.value)} disabled={singleLocationMode(data)}>
          {locationChoices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>

      <div className="schedule-period-controls schedule-control-periods" aria-label="Schedule range type">
        <button type="button" className={selectedDateInfo.isToday && schedulePeriod === "day" ? "active" : ""} onClick={() => onGoDate(operationsToday, "day")}>Today</button>
        <button type="button" className={selectedDate === offsetDateKey(operationsToday, 1) && schedulePeriod === "day" ? "active" : ""} onClick={() => onGoDate(offsetDateKey(operationsToday, 1), "day")}>Tomorrow</button>
        <button type="button" className={schedulePeriod === "week" ? "active" : ""} onClick={() => onGoDate(selectedDate, "week")}>Week</button>
        <button type="button" className={schedulePeriod === "month" ? "active" : ""} onClick={() => onGoDate(selectedDate, "month")}>Month</button>
        <button type="button" className={schedulePeriod === "custom" ? "active" : ""} onClick={() => onGoDate(selectedDate, "custom", customRangeEnd)}>Custom</button>
      </div>

      <div className="dashboard-date-stepper schedule-control-date" aria-label="Schedule date range">
        <button type="button" aria-label="Previous schedule range" onClick={() => onMoveRange(-1)}>
          <CaretLeft size={15} />
        </button>
        <input type="date" aria-label="Selected schedule date" value={selectedDate} onChange={(event) => onGoDate(event.target.value, schedulePeriod, customRangeEnd)} />
        <button type="button" aria-label="Next schedule range" onClick={() => onMoveRange(1)}>
          <CaretRight size={15} />
        </button>
      </div>

      {schedulePeriod === "custom" && (
        <label className="schedule-control-field schedule-control-end">
          <span>Range ends</span>
          <input type="date" value={customRangeEnd} onChange={(event) => onSetCustomEnd(event.target.value, selectedDate)} />
        </label>
      )}

      <label className="schedule-control-field schedule-role-filter">
        <span>Role</span>
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
          <option value="all">All roles</option>
          {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
        </select>
      </label>

      <div className="schedule-control-summary">
        <span>{periodLabel(selectedDate, schedulePeriod, customRangeEnd)}</span>
        <strong>{rangeSummary.total} shifts / {rangeSummary.open} gaps</strong>
        <p>{formatHours(rangeSummary.hours)} scheduled across {rangeSummary.rows.length} day{rangeSummary.rows.length === 1 ? "" : "s"}.</p>
      </div>
    </section>
  );
}

function scheduleDrawerTitle(panel) {
  const titles = {
    calendar: "Calendar",
    builder: "Day Schedule Builder",
    plan: "Plan Schedule",
    coverage: "Fill Missing Person",
  };
  return titles[panel] || "Manage Schedule";
}

function scheduleDrawerEyebrow(panel, selectedDate) {
  const labels = {
    calendar: "Choose a day",
    builder: formatDisplayDate(selectedDate),
    plan: "Build plan tools",
    coverage: "Coverage helper",
  };
  return labels[panel] || formatDisplayDate(selectedDate);
}

function ScheduleDrawer({ title, eyebrow, onClose, children }) {
  return (
    <section className="schedule-drawer" aria-label={title}>
      <div className="schedule-drawer-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
        </div>
        <button type="button" className="icon-button" aria-label={`Close ${title}`} onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div className="schedule-drawer-body">
        {children}
      </div>
    </section>
  );
}

function ManageScheduleControl({ open, onToggle, scheduleView, onSetScheduleView, onDayBuilder, onCalendar, onPlan, onAddShift, onAddOpenShift, onFillMissing }) {
  const viewItems = [
    ["all", "All"],
    ["gaps", "Gaps"],
    ["managers", "Managers"],
  ];
  const menuItems = [
    { label: "Day Builder", icon: CalendarBlank, onClick: onDayBuilder },
    { label: "Calendar", icon: CalendarBlank, onClick: onCalendar },
    { label: "Plan Schedule", icon: ListChecks, onClick: onPlan },
    { label: "Add Shift", icon: Plus, onClick: onAddShift },
    { label: "Add Open Shift", icon: Sparkle, onClick: onAddOpenShift },
    { label: "Fill Missing Person", icon: UsersThree, onClick: onFillMissing },
  ];
  return (
    <div className="manage-schedule-control">
      <button type="button" className="manage-schedule-main" aria-label="Open Manage Schedule menu" aria-expanded={open} onClick={onToggle}>
        <span>Manage Schedule</span>
        <CaretDown size={17} weight="bold" />
      </button>
      {open && (
        <div className="manage-schedule-menu">
          <div className="manage-schedule-menu-group">
            <span>Board view</span>
            <div className="manage-schedule-view-toggle" aria-label="Schedule board view">
              {viewItems.map(([id, label]) => (
                <button type="button" key={id} className={scheduleView === id ? "active" : ""} onClick={() => onSetScheduleView?.(id)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="manage-schedule-menu-divider" />
          {menuItems.map(({ label, icon: Icon, onClick }) => (
            <button type="button" key={label} onClick={onClick}>
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleCalendarPanel({ data, shifts, selectedDate, rangeDates = [], onOpenDate }) {
  const cells = calendarMonthCells(selectedDate);
  const monthDates = monthDateKeys(selectedDate);
  const monthSummary = scheduleRangeSummary(shifts, monthDates);
  const rangeSet = new Set(rangeDates);
  const plannedDays = monthSummary.rows.filter((row) => row.total).length;
  const gapDays = monthSummary.rows.filter((row) => row.open || row.pending).length;
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <section className="schedule-calendar-clean">
      <div className="schedule-calendar-meta compact" aria-label="Calendar summary">
        <article>
          <span>Planned</span>
          <strong>{plannedDays}/{monthDates.length}</strong>
        </article>
        <article>
          <span>Needs help</span>
          <strong>{gapDays}</strong>
        </article>
        <article>
          <span>Open</span>
          <strong>{monthSummary.open}</strong>
        </article>
      </div>
      <div className="schedule-calendar-month-title">
        <strong>{periodLabel(monthStartDateKey(selectedDate), "month")}</strong>
        <span>Click a day to build or edit that schedule.</span>
      </div>
      <div className="schedule-calendar-weekdays" aria-hidden="true">
        {weekdays.map((dayName) => <span key={dayName}>{dayName}</span>)}
      </div>
      <div className="schedule-calendar-grid clean">
        {cells.map((cell) => {
          const rollup = scheduleRollupForDate(shifts, cell.date);
          const plan = data.datePlans?.[cell.date];
          const tone = rollup.open ? "risk" : rollup.pending ? "pending" : rollup.total ? "covered" : "empty";
          const isSelected = cell.date === selectedDate;
          const isToday = cell.date === operationsToday;
          const inRange = rangeSet.has(cell.date);
          const primaryLabel = rollup.total ? `${rollup.total} shift${rollup.total === 1 ? "" : "s"}` : plan ? "Planned" : "No plan";
          const secondaryLabel = rollup.open ? `${rollup.open} open` : rollup.pending ? `${rollup.pending} pending` : rollup.total ? "Covered" : "";
          return (
            <button
              type="button"
              key={cell.date}
              data-date={cell.date}
              className={`schedule-calendar-day ${tone} ${cell.inMonth ? "" : "outside"} ${isSelected ? "selected" : ""} ${isToday ? "today" : ""} ${inRange ? "in-range" : ""}`}
              onClick={() => onOpenDate?.(cell.date)}
            >
              <span className="schedule-calendar-date">
                <strong>{cell.day}</strong>
                {isToday && <em>Today</em>}
              </span>
              <span className={`schedule-calendar-status ${tone}`}>{primaryLabel}</span>
              {secondaryLabel && <span className="schedule-calendar-mini">{secondaryLabel}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ScheduleDayBuilder({ data, shifts, selectedDate, timelineBounds, selectedShiftId, onShiftClick, onAddShift, onAddOpenShift, onCopyToday, onPlanDay }) {
  const selectedPlan = getDatePlan(data, selectedDate, shifts);
  const rollup = scheduleRollupForDate(shifts, selectedDate);
  const hasShifts = shifts.length > 0;
  return (
    <section className="schedule-day-builder">
      <div className="schedule-builder-summary">
        <article>
          <span>Date</span>
          <strong>{formatDisplayDate(selectedDate)}</strong>
        </article>
        <article>
          <span>Shifts</span>
          <strong>{rollup.total}</strong>
        </article>
        <article>
          <span>Open</span>
          <strong>{rollup.open}</strong>
        </article>
        <article>
          <span>Target</span>
          <strong>{selectedPlan.staffTarget}</strong>
        </article>
      </div>

      {hasShifts ? (
        <div className="schedule-builder-board">
          <Timeline shifts={shifts} selectedShiftId={selectedShiftId} onShiftClick={onShiftClick} bounds={timelineBounds} />
        </div>
      ) : (
        <div className="schedule-builder-empty">
          <CalendarBlank size={26} />
          <strong>This day is empty</strong>
          <span>Add assigned shifts, open claimable work, or copy today as a starter plan.</span>
        </div>
      )}

      <div className="schedule-builder-actions">
        <button type="button" className="primary-action" onClick={onAddShift}>Add Employee Shift</button>
        <button type="button" onClick={onAddOpenShift}>Add Open Shift</button>
        <button type="button" onClick={onCopyToday} disabled={selectedDate === operationsToday}>Copy From Today</button>
        <button type="button" onClick={onPlanDay}>Plan Day</button>
      </div>
    </section>
  );
}

function SchedulePlannerPanel({ data, shifts, selectedDate, schedulePeriod, setSchedulePeriod, customRangeEnd, setCustomRangeEnd, setDay, rangeSummary, timelineBounds, openModal, patchData }) {
  const [sideTool, setSideTool] = useState("overview");
  const rows = rangeSummary.rows;
  const selectedDateInfo = selectedDateInfoForPanel(selectedDate);
  const selectedPlan = getDatePlan(data, selectedDate, shifts);
  const leadGap = rows.flatMap((row) => row.shifts).find((shift) => shift.status === "open" || shift.status === "pending");
  const selectedDayRollup = scheduleRollupForDate(shifts, selectedDate);
  const emptySelectedDay = selectedDayRollup.total === 0;
  const rangeDates = rows.map((row) => row.date);
  const emptyRangeDays = rows.filter((row) => !row.total).length;
  const savedSetupDays = rangeDates.filter((date) => data.datePlans?.[date]).length;
  const todayHasTemplate = shifts.some((shift) => shiftDateKey(shift) === operationsToday);
  const horizonItems = buildScheduleHorizonItems(data, shifts, selectedDate, schedulePeriod, customRangeEnd);
  const planningMode = schedulePlanningModeDetail(selectedDate, schedulePeriod, customRangeEnd, rows);
  const planningPresets = [
    { id: "today", label: "Today", date: operationsToday, period: "day", detail: "Work the current shift board." },
    { id: "tomorrow", label: "Tomorrow", date: offsetDateKey(operationsToday, 1), period: "day", detail: "Build the next operating day." },
    { id: "this-week", label: "This Week", date: operationsToday, period: "week", detail: "Review the next 7 days from today." },
    { id: "next-week", label: "Next Week", date: offsetDateKey(operationsToday, 7), period: "week", detail: "Plan the next staffing window." },
    { id: "this-month", label: "This Month", date: monthStartDateKey(operationsToday), period: "month", detail: "Scan every day in this month." },
    { id: "next-month", label: "Next Month", date: offsetPeriodDateKey(monthStartDateKey(operationsToday), "month", 1), period: "month", detail: "Prepare next month early." },
    { id: "two-week", label: "Custom 14 Days", date: selectedDate, endDate: offsetDateKey(selectedDate, 13), period: "custom", detail: "Set a two-week custom range." },
  ];
  function goDate(nextDate, nextPeriod = schedulePeriod, nextEndDate = customRangeEnd) {
    const normalizedEnd = nextPeriod === "custom" && !validDateKey(nextEndDate) ? offsetDateKey(nextDate, 13) : nextEndDate;
    setDay?.(nextDate);
    if (nextPeriod === "custom") setCustomRangeEnd?.(normalizedEnd, nextDate);
    setSchedulePeriod(nextPeriod, nextDate, normalizedEnd);
  }
  function moveRange(direction) {
    if (schedulePeriod === "custom") {
      const step = Math.max(rangeDates.length, 1);
      goDate(offsetDateKey(selectedDate, direction * step), "custom", offsetDateKey(customRangeEnd, direction * step));
      return;
    }
    goDate(offsetPeriodDateKey(selectedDate, schedulePeriod, direction));
  }
  const sideTools = [
    ["overview", "Overview"],
    ["days", "Days"],
    ["setup", "Setup"],
    ["actions", "Actions"],
  ];
  return (
    <section className="schedule-planner-panel" aria-label="Schedule planning range">
      <div className="schedule-planner-head">
        <div>
          <p className="eyebrow">Planning Horizon</p>
          <h3>{periodLabel(selectedDate, schedulePeriod, customRangeEnd)}</h3>
          <span>{rangeSummary.total} shifts, {rangeSummary.open} open, {formatHours(rangeSummary.hours)} scheduled across {rows.length} day{rows.length === 1 ? "" : "s"}.</span>
        </div>
      </div>

      <div className="schedule-workbench">
        <div className="schedule-workbench-main">
          <ScheduleHorizonMap items={horizonItems} onPick={(item) => goDate(item.date, item.period, item.endDate)} />

          <div className="schedule-scope-summary" aria-label="Active schedule planning scope">
            <article>
              <span>Scope</span>
              <strong>{schedulePeriod === "day" ? "Day" : schedulePeriod === "week" ? "Week" : schedulePeriod === "month" ? "Month" : "Custom range"}</strong>
              <p>{rows.length} day{rows.length === 1 ? "" : "s"} in view.</p>
            </article>
            <article>
              <span>Operating window</span>
              <strong>{formatHour(timelineBounds?.start ?? 6)} - {formatHour(timelineBounds?.end ?? 22)}</strong>
              <p>{selectedPlan.timeGranularity} / {selectedPlan.arrivalWindow}</p>
            </article>
            <article>
              <span>Saved setup</span>
              <strong>{savedSetupDays}/{rows.length} days saved</strong>
              <p>{selectedPlan.requiredRoles}</p>
            </article>
            <article>
              <span>Requests & gaps</span>
              <strong>{rangeSummary.open + rangeSummary.pending} blockers</strong>
              <p>{emptyRangeDays ? `${emptyRangeDays} empty day${emptyRangeDays === 1 ? "" : "s"} need setup.` : "No empty days in this scope."}</p>
            </article>
          </div>

          <div className={`schedule-period-grid ${schedulePeriod}`}>
            {rows.map((row) => {
              const isSelected = row.date === selectedDate;
              const info = selectedDateInfoForPanel(row.date);
              return (
                <button className={isSelected ? "active" : ""} type="button" key={row.date} onClick={() => goDate(row.date, "day")}>
                  <span>{shortDisplayDate(row.date)}</span>
                  <strong>{info.label}</strong>
                  <p>{row.total ? `${row.total} shifts / ${formatHours(row.hours)}` : "No plan yet"}</p>
                  {row.open ? statusBadge("pending", `${row.open} gaps`) : row.total ? statusBadge("approved", "Covered") : statusBadge("draft", "Empty")}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="schedule-side-settings" aria-label="Schedule settings">
          <div className="schedule-side-head">
            <div>
              <p className="eyebrow">Schedule Settings</p>
              <h4>{schedulePeriod === "day" ? selectedDateInfo.label : periodLabel(selectedDate, schedulePeriod, customRangeEnd)}</h4>
              <span>Switch the horizon, inspect days, or edit the setup without expanding the whole board.</span>
            </div>
          </div>

          <div className="schedule-period-controls schedule-side-periods" aria-label="Schedule range type">
            <button type="button" className={selectedDateInfo.isToday && schedulePeriod === "day" ? "active" : ""} onClick={() => goDate(operationsToday, "day")}>Today</button>
            <button type="button" className={selectedDate === offsetDateKey(operationsToday, 1) && schedulePeriod === "day" ? "active" : ""} onClick={() => goDate(offsetDateKey(operationsToday, 1), "day")}>Tomorrow</button>
            <button type="button" className={schedulePeriod === "week" ? "active" : ""} onClick={() => goDate(selectedDate, "week")}>Week</button>
            <button type="button" className={schedulePeriod === "month" ? "active" : ""} onClick={() => goDate(selectedDate, "month")}>Month</button>
            <button type="button" className={schedulePeriod === "custom" ? "active" : ""} onClick={() => goDate(selectedDate, "custom", customRangeEnd)}>Custom</button>
          </div>

          <div className="dashboard-date-stepper schedule-side-date" aria-label="Schedule date range">
            <button type="button" aria-label="Previous schedule range" onClick={() => moveRange(-1)}>
              <CaretLeft size={15} />
            </button>
            <input type="date" aria-label="Selected schedule date" value={selectedDate} onChange={(event) => goDate(event.target.value)} />
            <button type="button" aria-label="Next schedule range" onClick={() => moveRange(1)}>
              <CaretRight size={15} />
            </button>
          </div>
          {schedulePeriod === "custom" && (
            <label className="schedule-custom-end schedule-side-custom-end">
              <span>Range ends</span>
              <input type="date" value={customRangeEnd} onChange={(event) => goDate(selectedDate, "custom", event.target.value)} />
            </label>
          )}

          <div className="schedule-side-tabs" role="tablist" aria-label="Schedule tools">
            {sideTools.map(([id, label]) => (
              <button
                className={sideTool === id ? "active" : ""}
                type="button"
                key={id}
                onClick={() => setSideTool(id)}
                aria-selected={sideTool === id}
                role="tab"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="schedule-side-panel" hidden={sideTool !== "overview"}>
            <SchedulePlanningModeGuide mode={planningMode} rows={rows} rangeSummary={rangeSummary} savedSetupDays={savedSetupDays} />
            <div className="schedule-range-summary">
              <article>
                <span>Selected day</span>
                <strong>{selectedDateInfo.label}</strong>
                <p>{emptySelectedDay ? "No shifts yet. Build from a template or add one shift." : `${selectedDayRollup.total} shifts / ${formatHours(selectedDayRollup.hours)}`}</p>
              </article>
              <article>
                <span>Coverage risk</span>
                <strong>{leadGap ? `${locationName(leadGap.locationId)} ${leadGap.role}` : "No urgent gaps"}</strong>
                <p>{leadGap ? `${formatHour(leadGap.start)} - ${formatHour(leadGap.end)} needs attention.` : "Current range has no open or pending shift flagged first."}</p>
              </article>
              <article>
                <span>Customization</span>
                <strong>{schedulePeriod === "custom" ? "Custom range" : schedulePeriod === "month" ? "Monthly view" : schedulePeriod === "week" ? "Weekly view" : "Daily view"}</strong>
                <p>{emptyRangeDays ? `${emptyRangeDays} day${emptyRangeDays === 1 ? "" : "s"} still need a plan.` : "Every day in this range has a plan."}</p>
              </article>
            </div>
          </div>

          <div className="schedule-side-panel" hidden={sideTool !== "days"}>
            <SchedulePlanningMap
              rows={rows}
              selectedDate={selectedDate}
              datePlans={data.datePlans || {}}
              onOpenDay={(nextDate) => goDate(nextDate, "day")}
              onPrepareDay={(nextDate) => prepareDatePlan(nextDate, patchData)}
              onCopyTemplate={(nextDate) => copyScheduleTemplate(operationsToday, nextDate, patchData)}
              sourceDate={operationsToday}
            />
          </div>

          <div className="schedule-side-panel" hidden={sideTool !== "setup"}>
            <ScheduleDaySetupPanel
              data={data}
              selectedDate={selectedDate}
              rangeDates={rangeDates}
              shifts={shifts}
              patchData={patchData}
            />
          </div>

          <div className="schedule-side-panel" hidden={sideTool !== "actions"}>
            <div className="schedule-planner-controls schedule-side-actions">
              <button type="button" onClick={() => prepareDatePlan(selectedDate, patchData)}>
                {data.datePlans?.[selectedDate] ? "Refresh Day Plan" : "Prepare Day"}
              </button>
              <button type="button" onClick={() => copyScheduleTemplate(operationsToday, selectedDate, patchData)} disabled={selectedDateInfo.isToday}>
                Use Today Template
              </button>
              <button type="button" onClick={() => prepareScheduleRange(rangeDates, patchData)}>
                Prepare Range
              </button>
              <button type="button" onClick={() => copyScheduleTemplateToDates(operationsToday, rangeDates, patchData)} disabled={!todayHasTemplate || !emptyRangeDays}>
                Fill Empty Days
              </button>
              <button type="button" onClick={() => sendScheduleRangeHandoff(rangeDates, patchData)}>
                Post Range Handoff
              </button>
              <button type="button" className="primary-action" onClick={() => openModal("shift")}>
                <Plus size={16} /> Add Shift
              </button>
            </div>

            <div className="schedule-preset-grid" aria-label="Quick schedule range presets">
              {planningPresets.map((preset) => {
                const isActive = selectedDate === preset.date && schedulePeriod === preset.period && (preset.period !== "custom" || preset.endDate === customRangeEnd);
                return (
                  <button className={isActive ? "active" : ""} type="button" key={preset.id} onClick={() => goDate(preset.date, preset.period, preset.endDate)}>
                    <span>{preset.label}</span>
                    <strong>{periodLabel(preset.date, preset.period, preset.endDate)}</strong>
                    <p>{preset.detail}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function SchedulePlanningModeGuide({ mode, rows, rangeSummary, savedSetupDays }) {
  const emptyDays = rows.filter((row) => !row.total).length;
  const blockerDays = rows.filter((row) => row.open || row.pending).length;
  const coveredDays = rows.filter((row) => row.total && !row.open && !row.pending).length;
  return (
    <section className="schedule-mode-guide" aria-label="Planning mode guide">
      <div className="schedule-mode-main">
        <span>Planning Mode</span>
        <strong>{mode.title}</strong>
        <p>{mode.detail}</p>
      </div>
      <article>
        <span>Cadence</span>
        <strong>{mode.cadence}</strong>
        <p>{mode.dayLogic}</p>
      </article>
      <article>
        <span>Best next step</span>
        <strong>{mode.nextStep}</strong>
        <p>{rangeSummary.total} shifts / {formatHours(rangeSummary.hours)} total.</p>
      </article>
      <article>
        <span>Watch</span>
        <strong>{mode.watch}</strong>
        <p>{savedSetupDays}/{rows.length} setups saved, {coveredDays} ready, {blockerDays} with blockers, {emptyDays} empty.</p>
      </article>
    </section>
  );
}

function SchedulePlanningMap({ rows, selectedDate, datePlans = {}, onOpenDay, onPrepareDay, onCopyTemplate, sourceDate }) {
  const emptyDays = rows.filter((row) => !row.total).length;
  const blockerDays = rows.filter((row) => row.open || row.pending).length;
  const savedDays = rows.filter((row) => datePlans[row.date]).length;
  const rangeLabel = rows.length > 1
    ? `${shortDisplayDate(rows[0]?.date)} - ${shortDisplayDate(rows[rows.length - 1]?.date)}`
    : selectedDateInfo(rows[0]?.date || selectedDate).label;

  return (
    <section className="schedule-planning-map" aria-label="Planning Detail Map">
      <div className="schedule-planning-map-head">
        <div>
          <span>Planning Detail Map</span>
          <strong>{rangeLabel}</strong>
          <p>{savedDays}/{rows.length} saved setups, {emptyDays} empty day{emptyDays === 1 ? "" : "s"}, {blockerDays} day{blockerDays === 1 ? "" : "s"} with blockers.</p>
        </div>
        <em>Each day keeps its own setup</em>
      </div>
      <div className="schedule-planning-map-list">
        {rows.map((row) => {
          const plan = datePlans[row.date];
          const defaultTarget = Math.max(row.total, row.covered + row.open + row.pending, 1);
          const staffTarget = Number(plan?.staffTarget || defaultTarget);
          const staffingGap = Math.max(0, staffTarget - row.covered);
          const blockers = row.open + row.pending;
          const nextStep = !plan
            ? "Prepare setup"
            : !row.total
              ? "Build shifts"
              : blockers
                ? "Cover gaps"
                : staffingGap
                  ? "Add people"
                  : "Ready";
          const tone = blockers ? "risk" : !row.total ? "empty" : staffingGap ? "warn" : "ready";
          const dayInfo = selectedDateInfo(row.date);
          return (
            <article className={`schedule-planning-row ${tone} ${row.date === selectedDate ? "active" : ""}`} key={row.date}>
              <button className="schedule-planning-date" type="button" onClick={() => onOpenDay?.(row.date)}>
                <span>{shortDisplayDate(row.date)}</span>
                <strong>{dayInfo.label}</strong>
                <small>{row.date === selectedDate ? "Selected" : "Open day"}</small>
              </button>
              <div>
                <span>Window</span>
                <strong>{plan ? `${plan.businessStart || "6:00 AM"} - ${plan.businessEnd || "10:00 PM"}` : "Not set"}</strong>
                <p>{plan ? `${plan.timeGranularity || "15 minute blocks"} / ${plan.lockTime || "Lock time unset"}` : "Prepare the day to save hours, lock time, and blocks."}</p>
              </div>
              <div>
                <span>Staffing</span>
                <strong>{row.covered}/{staffTarget} covered</strong>
                <p>{row.total ? `${row.open} open, ${row.pending} pending, ${formatHours(row.hours)}` : "No shifts are built yet."}</p>
              </div>
              <div>
                <span>Setup detail</span>
                <strong>{plan?.demand || "No saved setup"}</strong>
                <p>{plan?.requiredRoles || "Roles, break plan, budget, and notes are waiting."}</p>
              </div>
              <div className="schedule-planning-next">
                {statusBadge(tone === "ready" ? "approved" : tone === "risk" ? "pending" : "draft", nextStep)}
                <div>
                  <button type="button" onClick={() => onPrepareDay?.(row.date)}>
                    {plan ? "Refresh" : "Prepare"}
                  </button>
                  <button type="button" onClick={() => onOpenDay?.(row.date)}>Open</button>
                  <button type="button" onClick={() => onCopyTemplate?.(row.date)} disabled={row.date === sourceDate}>
                    Copy
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ScheduleHorizonMap({ items, onPick }) {
  return (
    <div className="schedule-horizon-map" aria-label="Schedule planning horizon">
      {items.map((item) => (
        <button
          type="button"
          className={`${item.isActive ? "active" : ""} ${item.tone}`}
          key={item.id}
          onClick={() => onPick?.(item)}
        >
          <span>{item.label}</span>
          <strong>{item.rangeLabel}</strong>
          <p>{item.detail}</p>
          <div>
            <em>{item.summary.total} shifts</em>
            <em>{formatHours(item.summary.hours)}</em>
            <em>{item.status}</em>
          </div>
          <small>{item.preparedDays}/{item.dates.length} day plans saved</small>
        </button>
      ))}
    </div>
  );
}

function ScheduleDaySetupPanel({ data, selectedDate, rangeDates = [selectedDate], shifts, patchData }) {
  const savedPlan = getDatePlan(data, selectedDate, shifts);
  const [form, setForm] = useState(savedPlan);
  const validRangeDates = [...new Set((rangeDates || []).filter(validDateKey))];

  useEffect(() => {
    setForm(savedPlan);
  }, [
    selectedDate,
    savedPlan.demand,
    savedPlan.staffTarget,
    savedPlan.leadRole,
    savedPlan.businessStart,
    savedPlan.businessEnd,
    savedPlan.roleNeeds,
    savedPlan.requiredRoles,
    savedPlan.breakPlan,
    savedPlan.arrivalWindow,
    savedPlan.laborBudget,
    savedPlan.lockTime,
    savedPlan.publishRule,
    savedPlan.repeatPattern,
    savedPlan.timeGranularity,
    savedPlan.coverageGoal,
    savedPlan.swapRule,
    savedPlan.notes,
    savedPlan.status,
    savedPlan.updatedAt,
  ]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="schedule-day-setup" aria-label="Selected day setup">
      <div className="schedule-day-setup-head">
        <div>
          <span>Day Setup</span>
          <strong>{savedPlan.label}</strong>
          <p>{savedPlan.status} - last saved {savedPlan.updatedAt}</p>
        </div>
        <div className="schedule-day-setup-actions">
          <button type="button" onClick={() => updateScheduleDayPlan(selectedDate, form, patchData)}>Save Setup</button>
          <button type="button" onClick={() => applyScheduleDayPlanToDates(selectedDate, form, validRangeDates, patchData)} disabled={validRangeDates.length <= 1}>Apply to Range</button>
          <button type="button" onClick={() => sendDatePlanHandoff(selectedDate, form, patchData)}>Post Handoff</button>
        </div>
      </div>
      <div className="schedule-day-setup-grid">
        <label>
          <span>Demand</span>
          <select value={form.demand} onChange={(event) => update("demand", event.target.value)}>
            <option>Normal</option>
            <option>Busy</option>
            <option>Slow</option>
            <option>Event day</option>
            <option>Needs coverage</option>
          </select>
        </label>
        <label>
          <span>Staff target</span>
          <input type="number" min="1" max="60" value={form.staffTarget} onChange={(event) => update("staffTarget", Number(event.target.value))} />
        </label>
        <label>
          <span>Lead role</span>
          <input value={form.leadRole} onChange={(event) => update("leadRole", event.target.value)} />
        </label>
      </div>
      <div className="schedule-day-detail-grid">
        <label>
          <span>Business hours</span>
          <input value={form.businessStart} onChange={(event) => update("businessStart", event.target.value)} />
        </label>
        <label>
          <span>Close time</span>
          <input value={form.businessEnd} onChange={(event) => update("businessEnd", event.target.value)} />
        </label>
        <label>
          <span>Lock time</span>
          <input value={form.lockTime} onChange={(event) => update("lockTime", event.target.value)} />
        </label>
        <label>
          <span>Role needs</span>
          <input value={form.roleNeeds} onChange={(event) => update("roleNeeds", event.target.value)} />
        </label>
      </div>
      <div className="schedule-day-detail-grid">
        <label>
          <span>Required roles</span>
          <input value={form.requiredRoles} onChange={(event) => update("requiredRoles", event.target.value)} />
        </label>
        <label>
          <span>Arrival window</span>
          <input value={form.arrivalWindow} onChange={(event) => update("arrivalWindow", event.target.value)} />
        </label>
        <label>
          <span>Labor budget</span>
          <input type="number" min="0" value={form.laborBudget} onChange={(event) => update("laborBudget", Number(event.target.value))} />
        </label>
        <label>
          <span>Repeat</span>
          <select value={form.repeatPattern} onChange={(event) => update("repeatPattern", event.target.value)}>
            <option>One time</option>
            <option>Every weekday</option>
            <option>Every week</option>
            <option>Every month</option>
            <option>Custom pattern</option>
          </select>
        </label>
      </div>
      <div className="schedule-day-detail-grid">
        <label>
          <span>Time blocks</span>
          <select value={form.timeGranularity} onChange={(event) => update("timeGranularity", event.target.value)}>
            <option>5 minute blocks</option>
            <option>10 minute blocks</option>
            <option>15 minute blocks</option>
            <option>30 minute blocks</option>
            <option>Hourly blocks</option>
          </select>
        </label>
        <label>
          <span>Coverage goal</span>
          <input value={form.coverageGoal} onChange={(event) => update("coverageGoal", event.target.value)} />
        </label>
        <label>
          <span>Swap rule</span>
          <input value={form.swapRule} onChange={(event) => update("swapRule", event.target.value)} />
        </label>
      </div>
      <label className="schedule-day-notes">
        <span>Publish rule</span>
        <textarea aria-label="Publish rule" value={form.publishRule} onChange={(event) => update("publishRule", event.target.value)} />
      </label>
      <label className="schedule-day-notes">
        <span>Break plan</span>
        <textarea aria-label="Break plan" value={form.breakPlan} onChange={(event) => update("breakPlan", event.target.value)} />
      </label>
      <label className="schedule-day-notes">
        <span>Manager notes</span>
        <textarea aria-label="Manager notes" value={form.notes} onChange={(event) => update("notes", event.target.value)} />
      </label>
    </section>
  );
}

function selectedDateInfoForPanel(date) {
  return selectedDateInfo(validDateKey(date) ? date : operationsToday);
}

function ScheduleHandoffPanel({ data, ops, openShifts, selectedShift, pendingRequests, managerShifts, dateScope, selectedDate, requestTarget, timeTarget, patchData, go }) {
  const riskLabel = openShifts.length || pendingRequests ? "Needs review" : "Ready";
  const selectedTimeEntry = timeFocusForLocation(data, selectedShift?.locationId || "all", dateScope);
  return (
    <Panel title="Publish & Handoff" eyebrow="Manager closeout controls">
      <div className="handoff-status-grid">
        <div>
          <span>Published</span>
          <strong>{ops.publishedAt}</strong>
        </div>
        <div>
          <span>Handoff</span>
          <strong>{ops.handoffStatus}</strong>
        </div>
        <div>
          <span>Coverage ask</span>
          <strong>{ops.coverageAsk}</strong>
        </div>
        <div>
          <span>Risk check</span>
          <strong>{ops.riskCheck}</strong>
        </div>
      </div>
      <ActionQueue
        items={[
          {
            label: "Publish schedule",
            detail: `${openShifts.length} open shifts and ${managerShifts.length} manager leads in view.`,
            action: "Publish",
            onClick: () => publishSchedule(patchData),
          },
          {
            label: "Send manager handoff",
            detail: `${riskLabel}: ${pendingRequests} pending requests need attention.`,
            action: "Send",
            onClick: () => sendScheduleHandoff(openShifts.length, pendingRequests, patchData, { day: selectedDate, location: selectedShift?.locationId || "all" }),
          },
          {
            label: "Run risk check",
            detail: "Review late starts, missed punches, and coverage gaps.",
            action: "Check",
            onClick: () => runScheduleRiskCheck(openShifts.length, pendingRequests, patchData),
          },
          {
            label: "Post coverage ask",
            detail: selectedShift ? `${locationName(selectedShift.locationId)} ${selectedShift.role} will be posted.` : "Send one clear coverage request to the team feed.",
            action: "Post Ask",
            onClick: () => requestCoverageSupport(patchData, { day: selectedDate, shiftId: selectedShift?.id, location: selectedShift?.locationId }),
          },
          {
            label: "Resolve blockers",
            detail: openShifts.length ? "Start with coverage gaps." : "Open time review for remaining risk.",
            action: "Open",
            onClick: () => {
              if (openShifts.length) {
                go(requestTarget, "Coverage blockers opened from schedule handoff.");
                return;
              }
              go(timeTarget, "Time review opened from schedule handoff.", {
                title: selectedTimeEntry ? "Schedule time risk opened" : "Time review opened",
                detail: selectedTimeEntry
                  ? `${selectedTimeEntry.employee} - ${selectedTimeEntry.flag} at ${locationName(selectedTimeEntry.locationId)}.`
                  : "Review remaining time clock and labor risk.",
                source: "Schedule handoff",
                timeEntryId: selectedTimeEntry?.id,
                timeView: selectedTimeEntry ? "exceptions" : "labor",
              });
            },
          },
        ]}
      />
    </Panel>
  );
}

function ShiftInspector({ shift, requestTarget, timeTarget, go, patchData, data }) {
  if (!shift) {
    return (
      <Panel title="Shift Inspector" eyebrow="Click a shift block" className="shift-inspector-panel">
        <p className="empty">Select a shift from the schedule board to see manager actions.</p>
      </Panel>
    );
  }
  const needsCoverage = shift.status === "open" || shift.status === "pending";
  const selectedTimeEntry = timeFocusForLocation(data, shift.locationId, shiftDateKey(shift));
  return (
    <Panel title="Shift Inspector" eyebrow={`${locationName(shift.locationId)} shift selected`} className="shift-inspector-panel">
      <div className="shift-inspector-card">
        <div>
          <span>{formatHour(shift.start)} - {formatHour(shift.end)}</span>
          <strong>{shift.employee}</strong>
          <p>{shift.role} - {shift.note}</p>
        </div>
        {statusBadge(shift.status, needsCoverage ? "Needs action" : "Covered")}
      </div>
      <ActionQueue
        items={[
          {
            label: needsCoverage ? "Assign this shift" : "Log manager review",
            detail: needsCoverage ? "Move this shift into covered status for now." : "Keep an audit note that this shift was checked.",
            action: needsCoverage ? "Assign" : "Review",
            onClick: () => needsCoverage ? assignShift(shift.id, patchData) : reviewShift(shift.id, patchData),
          },
          { label: "Ask team for help", detail: "Post a coverage note for this selected shift.", action: "Post Help", onClick: () => requestCoverageSupport(patchData, { shiftId: shift.id, location: shift.locationId }) },
          { label: "Related requests", detail: "Check swaps, time off, and late-arrival notes.", action: "Open", onClick: () => go(requestTarget) },
          {
            label: "Time risk",
            detail: selectedTimeEntry
              ? `${selectedTimeEntry.employee} - ${selectedTimeEntry.flag}`
              : "Review punches and labor impact for this location.",
            action: "Open",
            onClick: () => go(timeTarget, `${locationName(shift.locationId)} time risk opened from shift inspector.`, {
              title: "Shift time risk opened",
              detail: selectedTimeEntry
                ? `${selectedTimeEntry.employee} - ${selectedTimeEntry.flag} at ${locationName(selectedTimeEntry.locationId)}.`
                : `${locationName(shift.locationId)} labor and time entries opened.`,
              source: "Shift inspector",
              timeEntryId: selectedTimeEntry?.id,
              timeView: selectedTimeEntry ? "exceptions" : "labor",
            }),
          },
        ]}
      />
    </Panel>
  );
}

function CoverageAssistantPanel({ shift, patchData }) {
  if (!shift) {
    return (
      <Panel title="Coverage Assistant" eyebrow="Pick a shift first" className="coverage-assistant-panel">
        <p className="empty">Select a schedule block to see suggested people for coverage.</p>
      </Panel>
    );
  }
  const candidates = candidateOptionsForShift(shift);
  const needsCoverage = shift.status === "open" || shift.status === "pending";
  return (
    <Panel
      title="Coverage Assistant"
      eyebrow={`${locationName(shift.locationId)} ${needsCoverage ? "gap" : "backup"} suggestions`}
      className="coverage-assistant-panel"
      action={<button type="button" onClick={() => requestCoverageSupport(patchData, { shiftId: shift.id, location: shift.locationId })}>Ask Team</button>}
    >
      <div className="coverage-assistant-summary">
        <div>
          <span>Selected shift</span>
          <strong>{shift.role} - {formatHour(shift.start)} to {formatHour(shift.end)}</strong>
        </div>
        {statusBadge(shift.status, needsCoverage ? "Needs coverage" : "Covered")}
      </div>
      <div className="coverage-candidate-list">
        {candidates.map((candidate) => (
          <article className="coverage-candidate-row" key={candidate.name}>
            <div className="candidate-person">
              <span className="candidate-initials">{candidate.name.split(" ").map((part) => part[0]).join("")}</span>
              <div>
                <strong>{candidate.name}</strong>
                <span>{candidate.role} - {locationName(candidate.homeLocationId)}</span>
              </div>
            </div>
            <div className="candidate-fit">
              <strong>{candidate.score}%</strong>
              <span>{candidate.reason}</span>
            </div>
            <div className="candidate-details">
              <span>{candidate.availability}</span>
              <span>{money(candidate.rate)}/hr</span>
              <span>{candidate.risk} risk</span>
            </div>
            <div className="candidate-actions">
              <button type="button" onClick={() => offerShiftToCandidate(shift, candidate, patchData)}>
                {needsCoverage ? "Send Offer" : "Offer Backup"}
              </button>
              <button
                className="primary-action"
                type="button"
                onClick={() => needsCoverage ? assignShiftToCandidateFromSchedule(shift, candidate, patchData) : logBackupCandidate(shift.id, candidate.name, patchData)}
              >
                {needsCoverage ? "Assign Now" : "Log Backup"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function ScheduleStat({ icon: Icon, label, value, detail, state }) {
  return (
    <article className={`schedule-stat ${state || ""}`}>
      <Icon size={20} weight="fill" />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
    </article>
  );
}

function EmployeeSchedule({ data, openModal, go, day, setDay }) {
  const selectedDate = validDateKey(day) ? day : operationsToday;
  const selectedInfo = selectedDateInfo(selectedDate);
  const rangeDates = scheduleRangeDates(selectedDate, "week");
  const myShiftFeed = employeeAssignedShifts(data);
  const requestFeed = employeeRequests(data);
  const openShiftFeed = employeeAvailableShifts(data);
  const myShifts = myShiftFeed.filter((shift) => rangeDates.includes(shiftDateKey(shift)));
  const selectedDayShifts = myShifts.filter((shift) => shiftDateKey(shift) === selectedDate);
  const myRequests = requestFeed.filter((request) => requestAppliesToAnyDate(request, rangeDates));
  const selectedDayRequests = requestFeed.filter((request) => requestAppliesToDate(request, selectedDate));
  const openShifts = openShiftFeed.filter((shift) => rangeDates.includes(shiftDateKey(shift)));
  const selectedDayOpenShifts = openShifts.filter((shift) => shiftDateKey(shift) === selectedDate);
  const weekDays = rangeDates.map((date) => {
    const hasShift = myShiftFeed.some((shift) => shiftDateKey(shift) === date);
    const hasRequest = requestFeed.some((request) => requestAppliesToDate(request, date));
    const className = [date === selectedDate ? "today" : "", hasShift ? "work" : "", hasRequest ? "request" : ""].filter(Boolean).join(" ");
    return {
      date,
      day: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(parseDateKey(date)),
      number: new Intl.DateTimeFormat("en-US", { day: "numeric" }).format(parseDateKey(date)),
      className,
    };
  });
  const nextShift = selectedDayShifts[0] || myShifts[0];
  const nextShiftInfo = nextShift ? selectedDateInfo(shiftDateKey(nextShift)) : null;
  const nextShiftDateLabel = nextShiftInfo ? sentenceDateLabel(nextShiftInfo) : "";
  return (
    <EmployeeSectionShell title="Schedule" active="schedule" go={go} day={selectedDate} alertCount={selectedDayOpenShifts.length} className="employee-schedule-app">
      <section className="employee-week-strip" aria-label="Week schedule">
        {weekDays.map((item) => (
          <button type="button" key={item.date} className={item.className} aria-pressed={item.date === selectedDate} onClick={() => setDay?.(item.date)}>
            <span>{item.day}</span>
            <strong>{item.number}</strong>
            <i aria-hidden="true" />
          </button>
        ))}
      </section>

      <article className="employee-work-card employee-next-card">
        <div className="employee-card-head">
          <div>
            <span>{selectedInfo.label} schedule</span>
            <strong>{nextShift ? `${locationName(nextShift.locationId)} - ${nextShift.role}` : "No shift scheduled"}</strong>
          </div>
          {nextShift ? statusBadge(nextShift.status, nextShift.status === "pending" ? "Pending" : "Ready") : statusBadge("approved", "Clear")}
        </div>
        <div className="employee-schedule-detail">
          <CalendarBlank size={22} />
          <div>
            <strong>{nextShift ? `${formatHour(nextShift.start)} - ${formatHour(nextShift.end)}` : "Check open shifts"}</strong>
            <span>{nextShift ? `${shiftLength(nextShift)} hours scheduled for ${nextShiftDateLabel}` : `No approved shift is scheduled for ${sentenceDateLabel(selectedInfo)}.`}</span>
          </div>
        </div>
        <div className="employee-card-actions">
          <button type="button" onClick={() => go("employee-clock", `Time clock opened for ${selectedInfo.label}.`, { scheduleDate: selectedDate, source: "Employee schedule" })}>Time Clock</button>
          <button type="button" onClick={() => openModal?.("request")}>Request Time Off</button>
        </div>
      </article>

      <section className="employee-work-card">
        <div className="employee-card-head">
          <div>
            <span>Requests this range</span>
            <strong>{selectedDayRequests.length ? `${selectedDayRequests.length} for ${selectedInfo.label}` : myRequests.length ? "Week activity" : "No active requests"}</strong>
          </div>
          <button type="button" onClick={() => openModal?.("request")}>New</button>
        </div>
        <div className="employee-request-list">
          {myRequests.slice(0, 3).map((request) => (
            <article className="employee-request-pill" key={request.id}>
              <div>
                <strong>{request.type}</strong>
                <span>{request.date} - {request.reason}</span>
              </div>
              {statusBadge(request.status)}
            </article>
          ))}
          {!myRequests.length && <p className="empty">Send a time off, late arrival, or swap request from here.</p>}
        </div>
      </section>

      <section className="employee-work-card">
        <div className="employee-card-head">
          <div>
            <span>Extra hours</span>
            <strong>{selectedDayOpenShifts.length ? `${selectedDayOpenShifts.length} open for ${selectedInfo.label}` : openShifts.length ? `${openShifts.length} open this range` : "No extra shifts"}</strong>
          </div>
          <button type="button" onClick={() => go("employee-shifts", `Open shifts opened for ${selectedInfo.label}.`, { scheduleDate: selectedDate, source: "Employee schedule" })}>View</button>
        </div>
        <p className="employee-card-note">
          {selectedDayOpenShifts[0]
            ? `${locationName(selectedDayOpenShifts[0].locationId)} has ${selectedDayOpenShifts[0].role}, ${formatHour(selectedDayOpenShifts[0].start)} - ${formatHour(selectedDayOpenShifts[0].end)}.`
            : openShifts[0]
              ? `${locationName(openShifts[0].locationId)} has ${openShifts[0].role} later in this range.`
              : "Open shifts will be listed in the shift feed when managers post them."}
        </p>
      </section>
    </EmployeeSectionShell>
  );
}

function RequestsWorkspace({ data, role, openModal, patchData, location, routeFocus }) {
  const canApprove = role === "owner" || role === "manager";
  const businessRequests = data.requests.filter((request) => matchesActiveLocation(data, location, request.locationId));
  const visibleRequests = role === "employee" ? businessRequests.filter((request) => request.employee === "Ava Brooks") : businessRequests;
  const activeLocation = effectiveLocation(data, location);
  return (
    <div className="stack">
      <div className="section-tools">
        <div>
          <p className="eyebrow">{canApprove ? "Approval workflow" : "Employee request center"}</p>
          <h3>{canApprove ? "Team Requests" : "My Requests"}</h3>
        </div>
        <button type="button" onClick={() => openModal("request")}>
          <Plus size={17} /> New Request
        </button>
      </div>
      <RouteFocusBanner focus={routeFocus} />
      <Panel title="Request Queue" eyebrow={activeLocation === "all" ? (canApprove ? "Only owners and managers can approve" : "Employees cannot approve requests") : `${locationName(activeLocation)} requests`}>
        <div className="request-list">
          {visibleRequests.map((request) => (
            <div className="request-row" key={request.id}>
              <div>
                <strong>{request.type}</strong>
                <span>{request.employee} - {locationName(request.locationId)} - {request.date}</span>
                <p>{request.reason}</p>
              </div>
              <div className="row-actions">
                {statusBadge(request.status)}
                {canApprove && request.status === "pending" && (
                  <>
                    <button type="button" onClick={() => updateRequest(request.id, "approved", patchData)}>Approve</button>
                    <button type="button" onClick={() => updateRequest(request.id, "denied", patchData)}>Deny</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function EventsWorkspace({ data, openModal, patchData, location, routeFocus }) {
  const [openEventMenuId, setOpenEventMenuId] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(routeFocus?.eventId || null);
  const visibleEvents = data.events.filter((event) => matchesActiveLocation(data, location, event.locationId));
  const activeLocation = effectiveLocation(data, location);
  const eventGaps = visibleEvents
    .map((event) => ({ ...event, gap: Math.max(0, Number(event.needed || 0) - Number(event.signed || 0)) }))
    .filter((event) => event.gap > 0);
  const leadGap = eventGaps[0];
  const selectedEvent = visibleEvents.find((event) => event.id === selectedEventId) || leadGap || visibleEvents[0];

  useEffect(() => {
    if (!routeFocus?.eventId || !visibleEvents.some((event) => event.id === routeFocus.eventId)) return;
    setSelectedEventId((current) => current === routeFocus.eventId ? current : routeFocus.eventId);
  }, [routeFocus?.eventId, visibleEvents]);

  function selectEvent(event) {
    setSelectedEventId(event.id);
  }

  function selectEventFromKeyboard(event, item) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    selectEvent(item);
  }

  function manageEventStaff(event) {
    selectEvent(event);
    setOpenEventMenuId(null);
    openModal({ type: "event-staff", eventId: event.id, values: event });
  }

  function editEvent(event) {
    selectEvent(event);
    setOpenEventMenuId(null);
    openModal({ type: "event", mode: "edit", eventId: event.id, values: event });
  }

  return (
    <div className="stack">
      <div className="section-tools">
        <div>
          <p className="eyebrow">Owner event planning</p>
          <h3>Events</h3>
        </div>
        <button type="button" onClick={() => openModal("event")}>
          <Plus size={17} /> Create Event
        </button>
      </div>
      <RouteFocusBanner focus={routeFocus} />
      <section className="event-summary-strip" aria-label="Event staffing summary">
        <div>
          <span>Events in view</span>
          <strong>{visibleEvents.length}</strong>
        </div>
        <div>
          <span>Staffing gaps</span>
          <strong>{eventGaps.reduce((sum, event) => sum + event.gap, 0)}</strong>
        </div>
        <div>
          <span>Next focus</span>
          <strong>{leadGap ? `${leadGap.title} needs ${leadGap.gap}` : "No event gaps"}</strong>
        </div>
      </section>
      <EventFocusPanel
        event={selectedEvent}
        onManage={manageEventStaff}
        onEdit={editEvent}
        onReminder={(event) => postEventStaffingReminder(event.id, patchData)}
      />
      <Panel title="Upcoming Event Board" eyebrow={activeLocation === "all" ? "Staffing needs and signups" : `${locationName(activeLocation)} staffing needs and signups`}>
        <div className="event-grid">
          {visibleEvents.map((event) => {
            const eventType = optionLabel(eventTypeOptions, event.eventType, "Event");
            const priority = optionLabel(eventPriorityOptions, event.priority, "Normal");
            const audience = optionLabel(eventAudienceOptions, event.audience, "All team members");
            const roleNeeded = optionLabel(eventRoleOptions, event.roleNeeded, "Any role");
            const signupRule = optionLabel(eventSignupRuleOptions, event.signupRule, "Open signup");
            const repeat = optionLabel(eventRepeatOptions, event.repeat, "One time");
            const signed = Math.min(Number(event.signed) || 0, Number(event.needed) || 1);
            const needed = Math.max(1, Number(event.needed) || 1);
            const progress = Math.round((signed / needed) * 100);
            const menuOpen = openEventMenuId === event.id;
            const selected = selectedEvent?.id === event.id;
            return (
              <div className={`event-row ${menuOpen ? "menu-open" : ""} ${selected ? "selected" : ""}`} key={event.id}>
                <div
                  className="event-summary"
                  role="button"
                  tabIndex={0}
                  onClick={() => selectEvent(event)}
                  onKeyDown={(keyEvent) => selectEventFromKeyboard(keyEvent, event)}
                >
                  <div className="event-title-line">
                    <strong>{event.title}</strong>
                    <span className={`event-priority ${event.priority || "normal"}`}>{priority}</span>
                  </div>
                  <span>{locationName(event.locationId)} - {event.date} at {event.time}</span>
                  <div className="event-detail-chips">
                    <span>{eventType}</span>
                    <span>{audience}</span>
                    <span>{roleNeeded}</span>
                    <span>{signupRule}</span>
                    <span>{repeat}</span>
                  </div>
                  {event.notes && <p>{event.notes}</p>}
                </div>
                <div className="event-meter">
                  <div className="event-split-action">
                    <button
                      type="button"
                      className="event-manage-button"
                      onClick={() => manageEventStaff(event)}
                    >
                      Manage Staff
                    </button>
                    <button
                      type="button"
                      className="event-more-button"
                      aria-label={`More actions for ${event.title}`}
                      aria-expanded={menuOpen}
                      onClick={() => {
                        selectEvent(event);
                        setOpenEventMenuId(menuOpen ? null : event.id);
                      }}
                    >
                      <CaretDown size={15} weight="bold" />
                    </button>
                    {menuOpen && (
                      <div className="event-more-menu">
                        <button
                          type="button"
                          onClick={() => {
                            editEvent(event);
                          }}
                        >
                          <PencilSimple size={15} /> Edit event
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenEventMenuId(null);
                            duplicateEvent(event.id, patchData);
                          }}
                        >
                          <Plus size={15} /> Duplicate event
                        </button>
                        <button
                          type="button"
                          className="danger-action"
                          onClick={() => {
                            setOpenEventMenuId(null);
                            deleteEvent(event.id, patchData);
                          }}
                        >
                          <Trash size={15} /> Delete event
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="event-staffing-status">
                    <span>{signed}/{needed} staffed</span>
                    <div className="event-progress-line" aria-label={`${progress}% staffed`}>
                      <span style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  {event.deadline && <span>Deadline {event.deadline}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function EventFocusPanel({ event, onManage, onEdit, onReminder }) {
  if (!event) {
    return (
      <section className="event-focus-panel empty" aria-label="Selected event">
        <div>
          <p className="eyebrow">Selected event</p>
          <h3>No event selected</h3>
          <span>Create an event or select one from the board.</span>
        </div>
      </section>
    );
  }
  const needed = Math.max(1, Number(event.needed) || 1);
  const signed = Math.min(Number(event.signed) || 0, needed);
  const gap = Math.max(0, needed - signed);
  const progress = Math.round((signed / needed) * 100);
  return (
    <section className={`event-focus-panel ${gap ? "needs-staff" : "covered"}`} aria-label="Selected event">
      <div className="event-focus-copy">
        <p className="eyebrow">Selected event</p>
        <h3>{event.title}</h3>
        <span>{locationName(event.locationId)} - {event.date} at {event.time}</span>
      </div>
      <div className="event-focus-progress">
        <strong>{gap ? `${gap} staff needed` : "Fully staffed"}</strong>
        <div className="event-progress-line" aria-label={`${progress}% staffed`}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <span>{signed}/{needed} staffed{event.deadline ? ` - Deadline ${event.deadline}` : ""}</span>
      </div>
      <div className="event-focus-actions">
        <button type="button" className="primary-action" onClick={() => onManage(event)}>
          <UsersThree size={16} /> Manage Staff
        </button>
        <button type="button" onClick={() => onReminder(event)}>
          <Megaphone size={16} /> Post Reminder
        </button>
        <button type="button" onClick={() => onEdit(event)}>
          <PencilSimple size={16} /> Edit
        </button>
      </div>
    </section>
  );
}

function TeamWorkspace({ data, role, threadId, setThreadId, messageDraft, setMessageDraft, patchData, openModal, go, location, setLocation, day, routeFocus }) {
  const [chatSearch, setChatSearch] = useState("");
  const [teamAccessOpen, setTeamAccessOpen] = useState(false);
  const [chatMoreOpen, setChatMoreOpen] = useState(false);
  const chatSearchRef = useRef(null);

  useEffect(() => {
    setChatMoreOpen(false);
  }, [threadId]);

  if (role === "employee") {
    return (
      <EmployeeTeamInbox
        data={data}
        threadId={threadId}
        setThreadId={setThreadId}
        chatSearch={chatSearch}
        setChatSearch={setChatSearch}
        patchData={patchData}
        go={go}
        day={day}
        routeFocus={routeFocus}
      />
    );
  }

  const canInvite = role === "owner" || role === "manager";
  const inviteScope = role === "owner" ? "all" : role === "manager" ? "employee" : "none";
  const teamInvites = getTeamInvites(data).filter((invite) => inviteScope === "all" || (inviteScope === "employee" && invite.targetRole === "employee"));
  const pendingTeamInvites = teamInvites.filter((invite) => invite.status === "pending");
  const visibleThreads = data.messages.filter((message) => role !== "employee" || message.audience === "all");
  const filteredThreads = visibleThreads.filter((message) => {
    const search = chatSearch.trim().toLowerCase();
    if (!search) return true;
    return [message.person, message.role, message.text, message.group].some((value) => value.toLowerCase().includes(search));
  });
  const selected = filteredThreads.find((message) => message.id === threadId) || filteredThreads[0] || visibleThreads[0];
  const selectedIsAnnouncementThread = selected?.id === "m6";
  const selectedIsActionChannel = selected?.id === "m2" || selected?.id === "m4";
  const groupedThreads = groupThreads(filteredThreads);
  const history = selected?.history?.length ? selected.history : [
    { id: `${selected?.id || "empty"}-fallback`, sender: selected?.person || "Team", time: selected?.time || "Now", body: selected?.text || "Start a conversation with your team.", mine: false },
  ];
  const relatedDestination = selected?.id === "m6"
    ? (role === "owner" ? "owner-dashboard" : "manager-dashboard")
    : selected?.id === "m2"
      ? (role === "owner" ? "owner-time" : "manager-time")
      : selected?.id === "m4"
        ? (role === "owner" ? "owner-schedule" : "manager-schedule")
        : null;

  function selectThread(id) {
    setThreadId(id);
    markThreadRead(id, patchData);
  }

  function toggleSelectedPin() {
    if (!selected) return;
    toggleThreadPinned(selected.id, patchData, selected.pinned);
  }

  function toggleSelectedRead() {
    if (!selected) return;
    setThreadUnread(selected.id, !selected.unread, patchData);
    setChatMoreOpen(false);
  }

  function openRelatedWork() {
    if (!relatedDestination || !selected) return;
    go(relatedDestination, `${selected.person} related workspace opened.`);
    setChatMoreOpen(false);
  }

  function focusChatSearch() {
    chatSearchRef.current?.focus();
    setChatMoreOpen(false);
  }

  return (
    <section className="team-chat-shell" aria-label="Team chat">
      <aside className="chat-sidebar panel">
        <div className="chat-sidebar-head">
          <div>
            <p className="eyebrow">{roleLabel(role)} chat</p>
            <h3>Team</h3>
          </div>
          <div className="chat-sidebar-actions">
            <button
              type="button"
              className="team-access-trigger"
              aria-label="Invite code menu"
              aria-expanded={teamAccessOpen}
              onClick={() => setTeamAccessOpen((open) => !open)}
            >
              <ShieldCheck size={19} weight="regular" />
              <span>Invite code</span>
              {pendingTeamInvites.length > 0 && <strong>{pendingTeamInvites.length}</strong>}
              <CaretDown size={14} weight="bold" />
            </button>
            <TeamAccessPanel
              canInvite={canInvite}
              invites={teamInvites}
              openModal={openModal}
              patchData={patchData}
              menuOpen={teamAccessOpen}
              closeMenu={() => setTeamAccessOpen(false)}
            />
          </div>
        </div>
        <label className="chat-search">
          <MagnifyingGlass size={17} />
          <input ref={chatSearchRef} value={chatSearch} onChange={(event) => setChatSearch(event.target.value)} placeholder="Search conversations" />
        </label>
        <div className="chat-thread-groups">
          {groupedThreads.map(([group, threads]) => (
            <div className="chat-thread-group" key={group}>
              <p>{group}</p>
              {threads.map((message) => (
                <ChatThreadRow
                  key={message.id}
                  message={message}
                  selected={selected?.id === message.id}
                  onClick={() => selectThread(message.id)}
                />
              ))}
            </div>
          ))}
          {!filteredThreads.length && <p className="empty">No chats match that search.</p>}
        </div>
      </aside>

      <main className="chat-room panel">
        <header className="chat-room-head">
          <div className="chat-room-person">
            <ChatAvatar message={selected} />
            <div>
              <p className="eyebrow">{selected?.group || "Conversation"}</p>
              <h3>{selected?.person || "Team chat"}</h3>
              <span>{selected?.role || "Chat only"} · {selected?.online ? "Available now" : "Replies when available"}</span>
            </div>
          </div>
          <div className="chat-room-actions" aria-label="Chat actions">
            <span className="chat-only-pill">{selectedIsAnnouncementThread ? "Official channel" : selectedIsActionChannel ? "Action channel" : "Chat only"}</span>
            <button
              type="button"
              className={selected?.pinned ? "active" : ""}
              aria-label={selected?.pinned ? "Unpin conversation" : "Pin conversation"}
              aria-pressed={Boolean(selected?.pinned)}
              onClick={toggleSelectedPin}
              disabled={!selected}
            >
              <PushPin size={18} weight={selected?.pinned ? "fill" : "regular"} />
            </button>
            <div className="chat-more-wrap">
              <button
                type="button"
                aria-label="More chat options"
                aria-expanded={chatMoreOpen}
                onClick={() => setChatMoreOpen((open) => !open)}
                disabled={!selected}
              >
                <DotsThree size={20} weight="bold" />
              </button>
              {chatMoreOpen && selected && (
                <div className="chat-more-menu" role="menu" aria-label="Conversation options">
                  <button type="button" role="menuitem" onClick={toggleSelectedRead}>
                    {selected.unread ? "Mark read" : "Mark unread"}
                  </button>
                  {relatedDestination && (
                    <button type="button" role="menuitem" onClick={openRelatedWork}>
                      Open related work
                    </button>
                  )}
                  <button type="button" role="menuitem" onClick={focusChatSearch}>
                    Search conversations
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="chat-tabs" aria-label="Team chat tabs">
          <button type="button" className="active">
            <ChatCircleText size={16} /> Chat
          </button>
        </div>
        {selectedIsAnnouncementThread && (
          <div className="chat-channel-note">
            <Megaphone size={17} weight="fill" />
            <span>Messages posted here become official announcements and update the owner dashboard.</span>
          </div>
        )}
        <ChatChannelActions
          selected={selected}
          data={data}
          role={role}
          patchData={patchData}
          go={go}
          location={location}
          setLocation={setLocation}
          day={day}
        />

        <div className="chat-window">
          <span className="chat-date-pill">Today</span>
          {history.map((message) => (
            <ChatMessage key={message.id} message={message} thread={selected} />
          ))}
        </div>

        <form
          className="chat-composer"
          onSubmit={(event) => {
            event.preventDefault();
            const body = messageDraft.trim();
            if (!body || !selected) return;
            sendMessage(selected.id, body, patchData, undefined, roleLabel(role));
            setMessageDraft("");
          }}
        >
          <button className="composer-icon" type="button" aria-label="Add quick reaction">
            <Smiley size={20} />
          </button>
          <input value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder={selectedIsAnnouncementThread ? "Post announcement to team" : `Message ${selected?.person || "team"}`} />
          <button className="composer-send" type="submit" aria-label="Send message">
            <PaperPlaneRight size={19} weight="fill" />
          </button>
        </form>
      </main>
    </section>
  );
}

function ChatChannelActions({ selected, data, role, patchData, go, location, setLocation, day }) {
  if (!selected || (selected.id !== "m2" && selected.id !== "m4")) return null;
  const scheduleTarget = role === "owner" ? "owner-schedule" : "manager-schedule";
  const requestTarget = role === "owner" ? "owner-requests" : "manager-requests";
  const timeTarget = role === "owner" ? "owner-time" : "manager-time";
  const activeLocation = effectiveLocation(data, location);
  const selectedDate = validDateKey(day) ? day : operationsToday;
  const dateInfo = selectedDateInfo(selectedDate);
  const scopedShifts = data.shifts.filter((shift) => shiftDateKey(shift) === selectedDate && matchesActiveLocation(data, activeLocation, shift.locationId));
  const scopedRequests = data.requests.filter((request) => request.status === "pending" && requestAppliesToDate(request, selectedDate) && matchesActiveLocation(data, activeLocation, request.locationId));
  const scopedTimeFlags = data.timeEntries.filter((entry) => entry.severity !== "approved" && timeEntryDateKey(entry) === selectedDate && matchesActiveLocation(data, activeLocation, entry.locationId));
  const firstOpenShift = scopedShifts.find((shift) => shift.status === "open");
  const firstPendingRequest = scopedRequests[0];
  const firstTimeFlag = scopedTimeFlags[0];
  const openCount = scopedShifts.filter((shift) => shift.status === "open").length;
  const pendingCount = scopedRequests.length;
  const timeFlagCount = scopedTimeFlags.length;
  const scopeLabel = activeLocation === "all" ? "All locations" : locationName(activeLocation);
  const actionContext = { location: activeLocation, day: selectedDate };

  function openScopedSchedule(message) {
    if (firstOpenShift) setLocation?.(firstOpenShift.locationId);
    go(scheduleTarget, message, {
      title: "Schedule opened",
      detail: `${scopeLabel} schedule opened from ${selected.person || "team chat"} for ${dateInfo.label}.`,
      source: selected.person || "Team chat",
      schedulePeriod: "day",
      scheduleDate: selectedDate,
      shiftId: firstOpenShift?.id,
    });
  }

  function openScopedRequests(message) {
    if (firstPendingRequest && activeLocation === "all") setLocation?.(firstPendingRequest.locationId);
    go(requestTarget, message, {
      title: "Requests opened",
      detail: firstPendingRequest
        ? `${firstPendingRequest.employee} has a ${firstPendingRequest.type.toLowerCase()} request for ${dateInfo.label}.`
        : `${scopeLabel} has no pending requests for ${dateInfo.label}.`,
      source: selected.person || "Team chat",
      requestId: firstPendingRequest?.id,
      scheduleDate: selectedDate,
    });
  }

  function openScopedTime(message) {
    if (firstTimeFlag && activeLocation === "all") setLocation?.(firstTimeFlag.locationId);
    go(timeTarget, message, {
      title: firstTimeFlag ? "Handoff time flag opened" : "Time review opened",
      detail: firstTimeFlag
        ? `${firstTimeFlag.employee} - ${firstTimeFlag.flag} at ${locationName(firstTimeFlag.locationId)}.`
        : `${scopeLabel} time review opened from chat tools.`,
      source: selected.person || "Team chat",
      timeEntryId: firstTimeFlag?.id,
      timeView: firstTimeFlag ? "exceptions" : "active",
    });
  }

  const config = selected.id === "m4"
    ? {
      icon: UsersThree,
      title: "Coverage tools",
      detail: `${scopeLabel} · ${dateInfo.label}: ${openCount} open shifts and ${pendingCount} pending requests.`,
      actions: [
        { label: "Open Gaps", onClick: () => openScopedSchedule(`${scopeLabel} open shifts opened from Coverage Team.`) },
        { label: "Post Coverage Ask", onClick: () => requestCoverageSupport(patchData, actionContext) },
        { label: "Review Requests", onClick: () => openScopedRequests(`${scopeLabel} requests opened from Coverage Team.`) },
      ],
    }
    : {
      icon: PaperPlaneRight,
      title: "Handoff tools",
      detail: `${scopeLabel} · ${dateInfo.label}: ${openCount} open shifts, ${pendingCount} pending requests, ${timeFlagCount} time flags.`,
      actions: [
        { label: "Send Brief", onClick: () => sendScheduleHandoff(openCount, pendingCount, patchData, actionContext) },
        { label: "Review Time", onClick: () => openScopedTime(`${scopeLabel} time review opened from Manager Handoff.`) },
        { label: "Open Requests", onClick: () => openScopedRequests(`${scopeLabel} requests opened from Manager Handoff.`) },
      ],
    };
  const Icon = config.icon;

  return (
    <div className="chat-channel-actions" aria-label={`${config.title} quick actions`}>
      <div>
        <Icon size={18} weight="fill" />
        <span>
          <strong>{config.title}</strong>
          <small>{config.detail}</small>
        </span>
      </div>
      <div>
        {config.actions.map((action) => (
          <button type="button" key={action.label} onClick={action.onClick}>{action.label}</button>
        ))}
      </div>
    </div>
  );
}

function EmployeeTeamInbox({ data, threadId, setThreadId, chatSearch, setChatSearch, patchData, go, day = operationsToday, routeFocus }) {
  const [activeInboxTab, setActiveInboxTab] = useState("team");
  const searchInputRef = useRef(null);
  const selectedDate = validDateKey(routeFocus?.scheduleDate) ? routeFocus.scheduleDate : validDateKey(day) ? day : operationsToday;
  const dateInfo = selectedDateInfo(selectedDate);
  const openShifts = data.shifts.filter((shift) => shift.status === "open" && shiftDateKey(shift) === selectedDate && (!singleLocationMode(data) || shift.locationId === primaryLocationId(data)));
  const priorityShift = openShifts[0];
  const visibleThreads = data.messages.filter((message) => message.audience === "all");
  const search = chatSearch.trim().toLowerCase();
  const filteredThreads = visibleThreads.filter((message) => {
    if (!search) return true;
    return [message.person, message.role, message.text, message.group].some((value) => value.toLowerCase().includes(search));
  });
  const priorityThreads = filteredThreads.filter((message) => message.id === "m4" || message.text.toLowerCase().includes("open shift"));
  const priorityIds = new Set(priorityThreads.map((message) => message.id));
  const channels = filteredThreads.filter((message) => ["Greenview Operations", "Teams and channels"].includes(message.group) && !priorityIds.has(message.id));
  const directMessages = filteredThreads.filter((message) => message.group === "Chats");
  const alertThreads = filteredThreads.filter((message) => priorityIds.has(message.id) || message.unread);
  const visibleTabThreads = activeInboxTab === "alerts" ? alertThreads : activeInboxTab === "direct" ? directMessages : filteredThreads;
  const selectedId = visibleTabThreads.some((message) => message.id === threadId) ? threadId : visibleTabThreads[0]?.id;
  const managerName = locations.find((location) => location.id === (priorityShift?.locationId || primaryLocationId(data)))?.manager || "Manager";
  const showPriority = activeInboxTab !== "direct";
  const showChannels = activeInboxTab === "team";
  const showDirect = activeInboxTab !== "alerts";
  const showAlerts = activeInboxTab === "alerts";

  function openShiftDetails() {
    go("employee-shifts", `Open shifts opened from Team for ${dateInfo.label}.`, priorityShift ? {
      title: "Open shift alert opened",
      detail: `${locationName(priorityShift.locationId)} needs ${priorityShift.role}, ${formatHour(priorityShift.start)} - ${formatHour(priorityShift.end)}.`,
      source: "Employee team inbox",
      shiftId: priorityShift.id,
      scheduleDate: selectedDate,
    } : {
      title: "Open shifts opened",
      detail: `No open shifts are available for ${sentenceDateLabel(dateInfo)}.`,
      source: "Employee team inbox",
      scheduleDate: selectedDate,
    });
  }

  function openSearch() {
    searchInputRef.current?.focus();
  }

  function openAlerts() {
    setActiveInboxTab("alerts");
  }

  function selectEmployeeThread(id) {
    setThreadId(id);
    markThreadRead(id, patchData);
  }

  return (
    <section className="employee-phone-shell" aria-label="Employee team inbox">
      <div className="employee-phone-app employee-team-inbox">
        <header className="employee-mobile-head">
          <div>
            <p className="eyebrow">Employee</p>
            <h3>Team</h3>
            <span>{dateInfo.label}</span>
          </div>
          <div className="employee-mobile-tools">
            <button type="button" aria-label="Search team" onClick={openSearch}>
              <MagnifyingGlass size={18} />
            </button>
            <button type="button" className={activeInboxTab === "alerts" ? "active" : ""} aria-label="Open notifications" onClick={openAlerts}>
              <Bell size={18} />
              <i>{openShifts.length}</i>
            </button>
            <span aria-hidden="true">AB</span>
          </div>
        </header>

        <label className="employee-team-search">
          <MagnifyingGlass size={16} />
          <input ref={searchInputRef} value={chatSearch} onChange={(event) => setChatSearch(event.target.value)} placeholder="Search team" />
        </label>

        <div className="employee-chat-tabs" aria-label="Employee team filters">
          <button type="button" className={activeInboxTab === "team" ? "active" : ""} onClick={() => setActiveInboxTab("team")}>Team</button>
          <button type="button" className={activeInboxTab === "alerts" ? "active" : ""} onClick={() => setActiveInboxTab("alerts")}>Alerts</button>
          <button type="button" className={activeInboxTab === "direct" ? "active" : ""} onClick={() => setActiveInboxTab("direct")}>Direct</button>
        </div>

        <main className="employee-inbox-scroll">
          {showPriority && (
          <section className="employee-priority-card" aria-label="Priority open shift alert">
            <div className="employee-priority-copy">
              <span className="employee-alert-badge">Priority</span>
              <strong>{priorityShift ? "Open shift alert" : "No open shift alerts"}</strong>
              <p>
                {priorityShift
                  ? `${locationName(priorityShift.locationId)} needs ${priorityShift.role}, ${formatHour(priorityShift.start)} - ${formatHour(priorityShift.end)}.`
                  : `New opportunities for ${sentenceDateLabel(dateInfo)} from your manager will appear here.`}
              </p>
              {priorityShift && <small>Posted by {managerName} · Approval required</small>}
            </div>
            <button type="button" onClick={openShiftDetails} disabled={!priorityShift}>
              View
            </button>
          </section>
          )}

          {showPriority && (
          <EmployeeInboxGroup title={showAlerts ? "Unread and Priority" : "Priority"}>
            {(showAlerts ? alertThreads : priorityThreads.slice(0, 1)).map((message) => (
              <EmployeeInboxRow
                key={message.id}
                message={message}
                selected={selectedId === message.id}
                badge={message.unread || priorityIds.has(message.id) ? "New" : undefined}
                onClick={() => selectEmployeeThread(message.id)}
              />
            ))}
          </EmployeeInboxGroup>
          )}

          {showChannels && (
          <EmployeeInboxGroup title="Channels">
            {channels.map((message) => (
              <EmployeeInboxRow
                key={message.id}
                message={message}
                selected={selectedId === message.id}
                onClick={() => selectEmployeeThread(message.id)}
              />
            ))}
          </EmployeeInboxGroup>
          )}

          {showDirect && (
          <EmployeeInboxGroup title="Direct Messages">
            {directMessages.map((message) => (
              <EmployeeInboxRow
                key={message.id}
                message={message}
                selected={selectedId === message.id}
                onClick={() => selectEmployeeThread(message.id)}
              />
            ))}
          </EmployeeInboxGroup>
          )}

          {!visibleTabThreads.length && <p className="empty">No {activeInboxTab === "direct" ? "direct messages" : activeInboxTab === "alerts" ? "alerts" : "team messages"} match that search.</p>}
        </main>

        {priorityShift && (
          <aside className="employee-shift-toast" aria-label="New shift available">
            <div>
              <strong>New shift available</strong>
              <span>{locationName(priorityShift.locationId)} · {formatHour(priorityShift.start)} - {formatHour(priorityShift.end)}</span>
            </div>
            <button type="button" onClick={openShiftDetails}>View</button>
          </aside>
        )}

        <EmployeePhoneTabs active="chat" go={go} day={selectedDate} />
      </div>
    </section>
  );
}

function EmployeeInboxGroup({ title, children }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  if (!items || (Array.isArray(items) && !items.length)) return null;
  return (
    <section className="employee-inbox-group">
      <p>{title}</p>
      <div>{items}</div>
    </section>
  );
}

function EmployeeInboxRow({ message, selected, badge, onClick }) {
  return (
    <button type="button" className={`employee-inbox-row ${selected ? "active" : ""}`} onClick={onClick}>
      <ChatAvatar message={message} />
      <span className="employee-inbox-copy">
        <span>
          <strong>{message.person}</strong>
          <small>{message.time}</small>
        </span>
        <em>{message.text}</em>
      </span>
      {badge ? <i>{badge}</i> : message.unread ? <i>New</i> : null}
    </button>
  );
}

function EmployeePhoneTabs({ active, go, day = operationsToday }) {
  const selectedDate = validDateKey(day) ? day : operationsToday;
  const dateInfo = selectedDateInfo(selectedDate);
  const tabs = [
    ["today", "Today", UserCircle, "employee-dashboard"],
    ["schedule", "Schedule", CalendarBlank, "employee-schedule"],
    ["shifts", "Shifts", Sparkle, "employee-shifts"],
    ["requests", "Requests", ListChecks, "employee-requests"],
    ["chat", "Chat", ChatCircleText, "employee-messages"],
  ];
  return (
    <nav className="employee-phone-tabs" aria-label="Employee navigation">
      {tabs.map(([id, label, Icon, section]) => (
        <button
          type="button"
          key={id}
          className={active === id ? "active" : ""}
          onClick={() => go(section, `${label} opened for ${dateInfo.label}.`, {
            title: `${label} opened`,
            detail: `Employee ${label.toLowerCase()} view opened for ${sentenceDateLabel(dateInfo)}.`,
            source: "Employee tabs",
            scheduleDate: selectedDate,
          })}
          {...homeActionTarget(section)}
        >
          <Icon size={18} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function TeamAccessPanel({ canInvite, invites, openModal, patchData, menuOpen, closeMenu }) {
  const [showPending, setShowPending] = useState(false);
  const pendingInvites = invites.filter((invite) => invite.status === "pending");
  if (!menuOpen) return null;

  return (
    <section className="team-access-menu" aria-label="Team account access menu">
      {canInvite && (
        <button
          type="button"
          onClick={() => {
            closeMenu();
            openModal("invite");
          }}
        >
          <UserPlus size={23} />
          <span>Create invite</span>
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          closeMenu();
          openModal("activate-account");
        }}
      >
        <SignIn size={23} />
        <span>Use code</span>
      </button>
      <button type="button" onClick={() => setShowPending((open) => !open)}>
        <Clock size={23} />
        <span>Pending invites</span>
        <strong>{pendingInvites.length}</strong>
      </button>
      {pendingInvites.length > 0 && (
        <div className={`invite-mini-list ${showPending ? "open" : ""}`}>
          {showPending && pendingInvites.slice(0, 3).map((invite) => (
            <div key={invite.id}>
              <span>{invite.name}</span>
              <strong>{invite.code}</strong>
              <button type="button" aria-label={`Cancel invite ${invite.code}`} onClick={() => cancelInvite(invite.id, patchData)}>
                <Trash size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function groupThreads(threads) {
  const order = ["Pinned", "Favorites", "Greenview Operations", "Chats", "Teams and channels"];
  return order
    .map((group) => [group, threads.filter((thread) => (thread.pinned ? "Pinned" : thread.group) === group)])
    .filter(([, groupThreads]) => groupThreads.length);
}

function ChatThreadRow({ message, selected, onClick }) {
  const badgeCount = chatThreadBadgeCount(message);
  return (
    <button type="button" className={`chat-thread ${selected ? "active" : ""}`} onClick={onClick}>
      <ChatAvatar message={message} />
      <span className="chat-thread-copy">
        <span className="chat-thread-title-row">
          <strong>{message.person}</strong>
          <small>{message.time}</small>
        </span>
        <span className="chat-thread-preview">
          <small>
            {message.pinned && <PushPin className="chat-thread-pin" size={12} weight="fill" />}
            {message.text}
          </small>
          {badgeCount > 0 ? <em>{badgeCount}</em> : message.unread && <i aria-label="Unread chat" />}
        </span>
      </span>
    </button>
  );
}

function chatThreadBadgeCount(message) {
  const demoCounts = { m3: 1, m4: 2, m5: 3 };
  return demoCounts[message?.id] || 0;
}

function ChatAvatar({ message }) {
  return (
    <span className={`chat-avatar ${message?.accent || "sage"}`} aria-hidden="true">
      {message?.group === "Greenview Operations" ? <Hash size={18} weight="bold" /> : message?.group === "Teams and channels" ? <Sparkle size={18} weight="fill" /> : message?.initials}
      {message?.online && <i />}
    </span>
  );
}

function ChatMessage({ message, thread }) {
  return (
    <article className={`chat-message ${message.mine ? "mine" : ""}`}>
      {!message.mine && <ChatAvatar message={thread} />}
      <div className="chat-message-stack">
        <div className="chat-message-meta">
          <strong>{message.mine ? "You" : message.sender}</strong>
          <span>{message.time}</span>
        </div>
        <div className="chat-bubble">{message.body}</div>
      </div>
    </article>
  );
}

const guideNeedOptions = [
  { id: "today", label: "Today" },
  { id: "start", label: "Start shift" },
  { id: "customer", label: "Customer issue" },
  { id: "close", label: "Closing" },
  { id: "review", label: "Needs review" },
];

function normalizeGuideCard(card) {
  const text = `${card.title} ${card.type} ${locationName(card.locationId)}`.toLowerCase();
  let useCase = "During shift";
  let steps = [
    "Read the update before the task starts.",
    "Use the rule with the customer or station.",
    "Ask a manager if anything is unclear.",
  ];

  if (text.includes("opening")) {
    useCase = "Start shift";
    steps = [
      "Confirm the station is clean and stocked.",
      "Check register, tools, and today's schedule notes.",
      "Tell the lead if anything is missing before opening.",
    ];
  } else if (text.includes("customer") || text.includes("recovery")) {
    useCase = "Customer issue";
    steps = [
      "Listen first and repeat the customer's concern.",
      "Offer the approved fix or call the lead if needed.",
      "Log the recovery note before the rush moves on.",
    ];
  } else if (text.includes("closing")) {
    useCase = "Closing";
    steps = [
      "Finish guest handoff and clean active stations.",
      "Confirm register, inventory, and locked areas.",
      "Send the closing note before clocking out.",
    ];
  } else if (text.includes("location") || text.includes("airport")) {
    useCase = "Location support";
    steps = [
      "Check the location-specific note before the rush.",
      "Follow the local handoff rule for that station.",
      "Post a question if the note does not match today.",
    ];
  }

  return {
    ...card,
    useCase,
    steps,
    searchText: `${text} ${useCase} ${steps.join(" ")}`.toLowerCase(),
  };
}

function filterGuideCards(cards, search, need) {
  const query = search.trim().toLowerCase();
  return cards.filter((card) => {
    const matchesSearch = !query || card.searchText.includes(query);
    if (!matchesSearch) return false;
    if (need === "start") return card.useCase === "Start shift" || card.searchText.includes("opening");
    if (need === "customer") return card.useCase === "Customer issue" || card.searchText.includes("customer");
    if (need === "close") return card.useCase === "Closing" || card.searchText.includes("closing");
    if (need === "review") return card.completion < 75;
    return true;
  });
}

function guideCardScope(card) {
  if (!card) return "the team";
  return card.locationId === "all" ? "all locations" : locationName(card.locationId);
}

function guideActionPlanFor(card, selectedStepCount, activeComplete, canEdit) {
  if (!card) return null;
  const missingSteps = Math.max(0, card.steps.length - selectedStepCount);
  if (activeComplete) {
    return {
      tone: "good",
      eyebrow: "Ready for shift",
      title: "Guide marked complete",
      detail: "This card is done for now. Keep it available if the team needs to review the steps again.",
    };
  }
  if (card.reviewStatus) {
    return {
      tone: "warn",
      eyebrow: "Revision in motion",
      title: card.reviewStatus,
      detail: "Training Questions has the latest note. Keep the card visible until the update is handled.",
    };
  }
  if (canEdit && card.completion < 75) {
    return {
      tone: "warn",
      eyebrow: "Manager action",
      title: "Send a revision request",
      detail: "Ask the team to clarify missing steps in Training Questions before this guide is used in a rush.",
    };
  }
  if (!canEdit && missingSteps > 0) {
    return {
      tone: "info",
      eyebrow: "What to do next",
      title: `${missingSteps} step${missingSteps === 1 ? "" : "s"} left`,
      detail: "Check each step as you work. If today's shift does not match this card, ask the manager from here.",
    };
  }
  return {
    tone: "info",
    eyebrow: canEdit ? "Manager action" : "What to do next",
    title: canEdit ? "Review after the next team question" : "Ready to complete",
    detail: canEdit ? "Watch Training Questions for unclear steps, then update this card." : "All steps are checked. Mark the guide complete when you are done.",
  };
}

function sendGuideQuestion(card, role, locationLabel, patchData) {
  if (!card) return;
  const time = scheduleStamp();
  const sender = roleLabel(role);
  const body = `${sender} guide question: "${card.title}" for ${locationLabel}. Need help confirming the right step before using it on shift.`;
  patchData((data) => ({
    ...data,
    guideCards: data.guideCards.map((guideCard) => guideCard.id === card.id ? { ...guideCard, reviewStatus: "Question sent" } : guideCard),
    messages: postTrainingQuestion(data.messages, body, sender, time),
  }), "Guide question sent to Training Questions.");
}

function sendGuideRevisionRequest(card, role, patchData) {
  if (!card) return;
  const time = scheduleStamp();
  const sender = roleLabel(role);
  const body = `${sender} guide revision request: "${card.title}" is ${card.completion}% complete for ${guideCardScope(card)}. Add missing steps or confirm the current checklist in Training Questions.`;
  patchData((data) => ({
    ...data,
    guideCards: data.guideCards.map((guideCard) => guideCard.id === card.id ? { ...guideCard, reviewStatus: "Revision requested" } : guideCard),
    reportLog: [`Guide revision requested at ${time}: ${card.title}`, ...(data.reportLog || [])],
    messages: postTrainingQuestion(data.messages, body, sender, time),
  }), "Guide revision request sent to Training Questions.");
}

function GuideWorkspace({ data, role, location, openModal, patchData, goThread, routeFocus }) {
  const canEdit = role === "owner" || role === "manager";
  const [guideSearch, setGuideSearch] = useState("");
  const [guideNeed, setGuideNeed] = useState("today");
  const [activeGuideId, setActiveGuideId] = useState(data.guideCards[0]?.id || "");
  const [checkedSteps, setCheckedSteps] = useState({});
  const cards = useMemo(() => data.guideCards.map(normalizeGuideCard), [data.guideCards]);
  const filteredCards = useMemo(() => filterGuideCards(cards, guideSearch, guideNeed), [cards, guideSearch, guideNeed]);
  const activeCard = filteredCards.length ? filteredCards.find((card) => card.id === activeGuideId) || filteredCards[0] : null;
  const completedCount = cards.filter((card) => data.completedGuideIds.includes(card.id)).length;
  const guideAverage = cards.length ? Math.round(cards.reduce((sum, card) => sum + card.completion, 0) / cards.length) : 0;
  const selectedStepCount = activeCard?.steps.filter((step) => checkedSteps[`${activeCard.id}-${step}`]).length || 0;
  const activeComplete = activeCard ? data.completedGuideIds.includes(activeCard.id) : false;
  const locationLabel = location === "all" ? "All locations" : locationName(location);
  const guideActionPlan = guideActionPlanFor(activeCard, selectedStepCount, activeComplete, canEdit);

  useEffect(() => {
    if (routeFocus?.guideId && cards.some((card) => card.id === routeFocus.guideId)) {
      setActiveGuideId(routeFocus.guideId);
    }
  }, [cards, routeFocus?.guideId]);

  function chooseNeed(nextNeed) {
    setGuideNeed(nextNeed);
    const nextCards = filterGuideCards(cards, guideSearch, nextNeed);
    if (nextCards[0]) setActiveGuideId(nextCards[0].id);
  }

  function chooseCard(cardId) {
    setActiveGuideId(cardId);
  }

  function toggleGuideStep(step) {
    if (!activeCard) return;
    const key = `${activeCard.id}-${step}`;
    setCheckedSteps((current) => ({ ...current, [key]: !current[key] }));
  }

  function completeActiveGuide() {
    if (!activeCard || activeComplete) return;
    setCheckedSteps((current) => activeCard.steps.reduce((next, step) => ({ ...next, [`${activeCard.id}-${step}`]: true }), current));
    toggleGuide(activeCard.id, patchData);
  }

  function askManagerAboutGuide() {
    if (!activeCard) return;
    sendGuideQuestion(activeCard, role, locationLabel, patchData);
    goThread?.("m5", "Training Questions opened with your guide question.");
  }

  function requestGuideRevision() {
    if (!activeCard) return;
    sendGuideRevisionRequest(activeCard, role, patchData);
    goThread?.("m5", "Training Questions opened with the guide revision request.");
  }

  return (
    <div className="guide-workspace">
      <div className="section-tools">
        <div>
          <p className="eyebrow">{canEdit ? "Guide command center" : "Employee shift help"}</p>
          <h3>{canEdit ? "Guide" : "My Shift Guide"}</h3>
        </div>
        <div className="section-actions">
          {canEdit && (
            <>
              <button type="button" onClick={() => goThread?.("m5", "Guide questions opened.")}>
                <ChatCircleText size={17} /> Questions
              </button>
              <button type="button" onClick={() => openModal("guide")}>
                <Plus size={17} /> Add Guide Card
              </button>
            </>
          )}
        </div>
      </div>
      <RouteFocusBanner focus={routeFocus} />

      <section className="guide-coach">
        <div className="guide-shift-summary">
          <p className="eyebrow">Today's shift coach</p>
          <h4>{activeCard?.title || "Choose a guide"}</h4>
          <div className="guide-shift-meta">
            <span><MapPin size={16} /> {locationLabel}</span>
            <span><Clock size={16} /> Before, during, and close</span>
            <span><CheckCircle size={16} /> {completedCount} / {cards.length} completed</span>
          </div>
        </div>
        <div className="guide-search-box">
          <label className="chat-search">
            <MagnifyingGlass size={17} />
            <input value={guideSearch} onChange={(event) => setGuideSearch(event.target.value)} placeholder="Search customer, closing, opening" />
          </label>
          <div className="guide-need-tabs" aria-label="Guide situations">
            {guideNeedOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={guideNeed === option.id ? "active" : ""}
                aria-label={`Show ${option.label} guides`}
                onClick={() => chooseNeed(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="guide-layout">
        <Panel title={canEdit ? "Guide Library" : "Recommended Help"} eyebrow={`${filteredCards.length} active ${filteredCards.length === 1 ? "card" : "cards"}`}>
          <div className="guide-list">
            {filteredCards.map((card) => {
              const completed = data.completedGuideIds.includes(card.id);
              return (
                <button
                  type="button"
                  className={`guide-help-row ${activeCard?.id === card.id ? "active" : ""}`}
                  key={card.id}
                  aria-label={`Open guide ${card.title}`}
                  onClick={() => chooseCard(card.id)}
                >
                  <span className={`guide-topic-icon ${completed ? "complete" : ""}`}>
                    {completed ? <CheckCircle size={18} weight="fill" /> : <BookOpenText size={18} />}
                  </span>
                  <span className="guide-help-copy">
                    <strong>{card.title}</strong>
                    <small>{card.useCase} - {card.type} - {locationName(card.locationId)}</small>
                    <span className="progress-line"><span style={{ width: `${card.completion}%` }} /></span>
                  </span>
                  <span className={`status ${completed ? "good" : card.reviewStatus || card.completion < 70 ? "warn" : ""}`}>
                    {completed ? "Done" : card.reviewStatus ? "Review" : `${card.completion}%`}
                  </span>
                </button>
              );
            })}
            {!filteredCards.length && <p className="empty">No guide cards match that search.</p>}
          </div>
        </Panel>

        <aside className="guide-detail panel">
          <div className="guide-detail-head">
            <div>
              <p className="eyebrow">{activeCard?.useCase || "Guide card"}</p>
              <h4>{activeCard?.title || "Choose a guide"}</h4>
            </div>
            {activeCard && <span className="status">{activeComplete ? "Completed" : `${selectedStepCount} / ${activeCard.steps.length}`}</span>}
          </div>
          {activeCard && (
            <>
              <div className="guide-step-list">
                {activeCard.steps.map((step, index) => {
                  const checked = Boolean(checkedSteps[`${activeCard.id}-${step}`]);
                  return (
                    <button
                      key={step}
                      type="button"
                      className={`guide-step ${checked ? "checked" : ""}`}
                      aria-label={`${checked ? "Uncheck" : "Check"} step ${index + 1}: ${step}`}
                      onClick={() => toggleGuideStep(step)}
                    >
                      <span>{checked ? <CheckCircle size={18} weight="fill" /> : index + 1}</span>
                      <strong>{step}</strong>
                    </button>
                  );
                })}
              </div>
              {guideActionPlan && (
                <div className={`guide-action-plan ${guideActionPlan.tone}`}>
                  <p className="eyebrow">{guideActionPlan.eyebrow}</p>
                  <strong>{guideActionPlan.title}</strong>
                  <span>{guideActionPlan.detail}</span>
                </div>
              )}
              <div className="guide-detail-actions">
                {!canEdit && (
                  <button type="button" onClick={completeActiveGuide} disabled={activeComplete}>
                    {activeComplete ? "Completed" : "Complete Guide"}
                  </button>
                )}
                {canEdit ? (
                  <>
                    <button type="button" onClick={requestGuideRevision}>
                      <PaperPlaneRight size={17} /> Send Revision
                    </button>
                    <button type="button" onClick={() => goThread?.("m5", "Training Questions opened.")}>
                      <ChatCircleText size={17} /> Open Questions
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={askManagerAboutGuide}>
                    <ChatCircleText size={17} /> Ask Manager
                  </button>
                )}
                {canEdit && <button type="button" onClick={() => removeGuide(activeCard.id, patchData)}><Trash size={16} /> Remove</button>}
              </div>
            </>
          )}
        </aside>
      </section>

      {canEdit && (
        <section className="guide-manager-grid">
          <div className="guide-manager-panel">
            <p className="eyebrow">Coverage</p>
            <strong>{guideAverage}% average completion</strong>
            <span>{cards.filter((card) => card.completion < 75).length} cards need manager review.</span>
          </div>
          <div className="guide-manager-panel">
            <p className="eyebrow">Employee questions</p>
            <strong>Training Questions</strong>
            <span>Use Team chat to capture unclear steps and update cards.</span>
          </div>
          <div className="guide-manager-panel">
            <p className="eyebrow">Quick fix</p>
            <strong>Update weak cards first</strong>
            <span>Customer recovery and location notes should stay current.</span>
          </div>
        </section>
      )}
    </div>
  );
}

function TimeWorkspace({ data, role, patchData, location, routeFocus, day }) {
  const clock = { ...defaultTimeClock, ...(data.timeClock || {}) };
  if (role === "employee") return <EmployeeTimeClock clock={clock} patchData={patchData} routeFocus={routeFocus} day={day} />;
  return <LeadershipTimeClock data={data} role={role} patchData={patchData} location={location} routeFocus={routeFocus} />;
}

function EmployeeTimeClock({ clock, patchData, routeFocus, day }) {
  const [pin, setPin] = useState("");
  const selectedDate = validDateKey(routeFocus?.scheduleDate) ? routeFocus.scheduleDate : validDateKey(day) ? day : operationsToday;
  const dateInfo = selectedDateInfo(selectedDate);
  const isToday = dateInfo.isToday;
  const isWorking = clock.status === "working";
  const isLunch = clock.status === "lunch";
  const isOff = clock.status === "off";
  return (
    <div className="time-clock-layout">
      <Panel title="My Time Clock" eyebrow="Version 1.1 punch flow">
        <RouteFocusBanner focus={routeFocus} />
        <div className={`time-punch-hero ${clock.status}`}>
          <div>
            <span>{locationName(clock.locationId)} - {clock.role}</span>
            <strong>{isToday ? timeClockLabel(clock.status) : `${dateInfo.label} review only`}</strong>
            <p>{isToday ? clock.shift : "Punch actions unlock on the workday after location verification."}</p>
          </div>
          <div className="time-punch-mark">
            <Clock size={28} weight="fill" />
            <span>{dateInfo.label}</span>
          </div>
        </div>

        <div className="time-status-grid">
          <TimeSignal icon={MapPin} label="Location" value={isToday ? "Verified" : "At arrival"} detail={isToday ? clock.proximity : "Check happens when the shift starts"} state="good" />
          <TimeSignal icon={ShieldCheck} label="Punch security" value={clock.authMethod} detail={isToday ? clock.earlyWindow : "PIN and location required on workday"} state="info" />
          <TimeSignal icon={Clock} label={isToday ? "Last action" : "Punch state"} value={isToday ? clock.lastPunch : "Locked"} detail={isToday ? `Lunch: ${clock.lunchStatus}` : "Review only"} state={isLunch ? "warn" : "good"} />
        </div>

        <div className="pin-row" aria-label="PIN punch verification">
          <label className="form-line">
            <span>PIN check</span>
            <input inputMode="numeric" maxLength="4" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="4 digit PIN" disabled={!isToday} />
          </label>
          <button type="button" onClick={() => verifyPunchPin(pin, patchData)} disabled={!isToday}>
            <ShieldCheck size={17} /> Verify PIN
          </button>
        </div>

        <div className="time-action-grid">
          {!isToday ? (
            <button className="primary-action" type="button" disabled>
              <Clock size={18} /> Review Only
            </button>
          ) : isOff ? (
            <button className="primary-action" type="button" onClick={() => punchClock("clock-in", patchData)}>
              <SignIn size={18} /> Clock In
            </button>
          ) : (
            <button className="primary-action" type="button" onClick={() => punchClock("clock-out", patchData)} disabled={isLunch}>
              <SignOut size={18} /> Clock Out
            </button>
          )}
          <button type="button" onClick={() => punchClock("start-lunch", patchData)} disabled={!isToday || !isWorking}>
            <Clock size={18} /> Start Lunch
          </button>
          <button type="button" onClick={() => punchClock("end-lunch", patchData)} disabled={!isToday || !isLunch}>
            <CheckCircle size={18} /> End Lunch
          </button>
          <button type="button" onClick={() => sendNearWorkNote(patchData)} disabled={!isToday}>
            <MapPin size={18} /> {isToday ? "I'm Almost There" : "Available on workday"}
          </button>
        </div>
      </Panel>

      <Panel title={isToday ? "Today's Shift" : `${dateInfo.label} Shift`} eyebrow="Simple employee view">
        <div className="next-shift time-shift-card">
          <CalendarBlank size={28} />
          <div>
            <strong>{isToday ? clock.shift : "Scheduled time appears on the selected day plan"}</strong>
            <span>{locationName(clock.locationId)} - {clock.role}</span>
          </div>
        </div>
        <ListRows
          rows={[
            ["Clock-in rule", "Location verified before punch", statusBadge("approved", "On")],
            ["Lunch", clock.lunchStatus, statusBadge(isLunch ? "pending" : "approved", isLunch ? "Active" : "Ready")],
            ["Near-work note", clock.nearWorkNote, statusBadge(clock.nearWorkNote === "Sent to manager" ? "pending" : "approved", clock.nearWorkNote === "Sent to manager" ? "Sent" : "Ready")],
          ]}
        />
      </Panel>

      <Panel title="What Gets Flagged" eyebrow="Automatic manager review">
        <div className="time-rule-list">
          <TimeRule title="Forgot clock-out" detail="System flags it for manager approval." />
          <TimeRule title="Late or early punch" detail="Employee note is kept with the entry." />
          <TimeRule title="Big edits" detail="Manager requests correction; owner can audit." />
        </div>
      </Panel>
    </div>
  );
}

function LeadershipTimeClock({ data, role, patchData, location, routeFocus }) {
  const [timeView, setTimeView] = useState(routeFocus?.timeView || (routeFocus?.timeEntryId ? "exceptions" : "labor"));
  const [selectedEntryId, setSelectedEntryId] = useState(routeFocus?.timeEntryId || null);
  const activeLocation = effectiveLocation(data, location);
  const visibleEntries = data.timeEntries.filter((entry) => matchesActiveLocation(data, location, entry.locationId));
  const exceptions = visibleEntries.filter((entry) => entry.severity !== "approved" || ["Forgot clock-out", "Started 6m late", "Correction requested"].includes(entry.flag));
  const active = visibleEntries.filter((entry) => ["Working", "Ready", "Near work"].includes(entry.status)).length;
  const autoFlags = visibleEntries.filter((entry) => entry.flag.includes("Forgot") || entry.status === "Auto-flagged").length;
  const totalTrackedHours = visibleEntries.reduce((sum, entry) => sum + entryWorkedHours(entry), 0);
  const totalTrackedPay = visibleEntries.reduce((sum, entry) => sum + entryLaborCost(entry), 0);
  const totalScheduledPay = visibleEntries.reduce((sum, entry) => sum + entryScheduledCost(entry), 0);
  const averageRate = visibleEntries.length ? visibleEntries.reduce((sum, entry) => sum + Number(entry.hourlyRate || 0), 0) / visibleEntries.length : 0;
  const overtimeRisk = role === "owner" ? "$420" : "2 staff";
  const highestLaborEntry = [...visibleEntries].sort((a, b) => entryLaborCost(b) - entryLaborCost(a))[0];
  const missedPunchEntry = visibleEntries.find((entry) => entry.flag.includes("Forgot") || entry.status === "Auto-flagged");
  const activeEntry = visibleEntries.find((entry) => ["Working", "Ready", "Near work"].includes(entry.status));
  const selectedEntry = visibleEntries.find((entry) => entry.id === selectedEntryId) || exceptions[0] || highestLaborEntry || visibleEntries[0];

  useEffect(() => {
    if (routeFocus?.timeEntryId && visibleEntries.some((entry) => entry.id === routeFocus.timeEntryId)) {
      setSelectedEntryId((current) => current === routeFocus.timeEntryId ? current : routeFocus.timeEntryId);
      setTimeView(routeFocus.timeView || "exceptions");
      return;
    }
    if (routeFocus?.timeView) setTimeView(routeFocus.timeView);
  }, [routeFocus?.timeEntryId, routeFocus?.timeView, data.timeEntries, location]);

  function selectTimeEntry(entry, nextView = "labor") {
    if (entry) setSelectedEntryId(entry.id);
    setTimeView(nextView);
  }

  return (
    <div className="stack">
      <RouteFocusBanner focus={routeFocus} />
      {role === "owner" && (
        <section className="kpi-strip time-kpi-strip">
          <Metric label="Labor Cost Today" value={money(totalTrackedPay)} detail={`${formatHours(totalTrackedHours)} tracked`} state="good" icon={CreditCard} onClick={() => selectTimeEntry(highestLaborEntry, "labor")} />
          <Metric label="Overtime Risk" value={overtimeRisk} detail="Watch closing shifts" state="warn" icon={WarningCircle} onClick={() => selectTimeEntry(highestLaborEntry, "overtime")} />
          <Metric label="Missed Punches" value={autoFlags} detail="Auto-flagged" state={autoFlags ? "warn" : "good"} icon={Clock} onClick={() => selectTimeEntry(missedPunchEntry || exceptions[0], "missed")} />
          <Metric label="On-site Staff" value={active} detail="Across all locations" state="info" icon={UsersThree} onClick={() => selectTimeEntry(activeEntry, "active")} />
        </section>
      )}

      <section className="payroll-strip" aria-label="Payroll summary">
        <PayrollCard label="Tracked labor" value={money(totalTrackedPay)} detail={`${formatHours(totalTrackedHours)} worked so far`} active={timeView === "labor"} onClick={() => selectTimeEntry(highestLaborEntry, "labor")} />
        <PayrollCard label="Scheduled labor" value={money(totalScheduledPay)} detail="Projected from assigned hours" active={timeView === "overtime"} onClick={() => selectTimeEntry(highestLaborEntry, "overtime")} />
        <PayrollCard label="Average rate" value={`${rateMoney(averageRate)}/hr`} detail={`${visibleEntries.length} employees in view`} active={timeView === "active"} onClick={() => selectTimeEntry(activeEntry || visibleEntries[0], "active")} />
      </section>

      <TimeFocusPanel
        entry={selectedEntry}
        view={timeView}
        role={role}
        patchData={patchData}
      />

      <section className="time-leadership-grid">
        <Panel
          title={role === "owner" ? "Time Clock Health" : "Live Attendance"}
          eyebrow={activeLocation === "all" ? (role === "owner" ? "Rates, hours, and labor cost" : "Manager section") : `${locationName(activeLocation)} rates, hours, and labor cost`}
        >
          <div className="attendance-list">
            {visibleEntries.map((entry) => (
              <div className={`attendance-row ${selectedEntry?.id === entry.id ? "selected" : ""}`} key={entry.id}>
                <button type="button" className="attendance-person attendance-person-action" onClick={() => selectTimeEntry(entry, "labor")}>
                  <strong>{entry.employee}</strong>
                  <span>{locationName(entry.locationId)} - {entry.shift}</span>
                </button>
                <div className="payroll-cells">
                  <label className="pay-rate-field">
                    <span>Rate/hr</span>
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={entry.hourlyRate ?? 0}
                      onChange={(event) => updateHourlyRate(entry.id, event.target.value, patchData)}
                    />
                  </label>
                  <div>
                    <span>Hours</span>
                    <strong>{formatHours(entryWorkedHours(entry))}</strong>
                  </div>
                  <div>
                    <span>Est pay</span>
                    <strong>{money(entryLaborCost(entry))}</strong>
                  </div>
                </div>
                <div className="attendance-state">
                  <span className="time-source">{entry.source}</span>
                  {statusBadge(entry.severity || "pending", entry.status)}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Exception Queue" eyebrow={role === "owner" ? "Audit-ready flags" : "Limited manager approval"}>
          <div className="exception-list">
            {exceptions.map((entry) => (
              <div className={`exception-card ${selectedEntry?.id === entry.id ? "selected" : ""}`} key={entry.id}>
                <button type="button" className="exception-summary-button" onClick={() => selectTimeEntry(entry, "exceptions")}>
                  <strong>{entry.flag}</strong>
                  <span>{entry.employee} - {locationName(entry.locationId)} - {entry.duration} - {rateMoney(entry.hourlyRate)}/hr - {money(entryLaborCost(entry))}</span>
                </button>
                <div className="button-row">
                  <button type="button" onClick={() => approveTime(entry.id, patchData)}>Approve</button>
                  <button type="button" onClick={() => requestTimeCorrection(entry.id, patchData)}>Request Correction</button>
                  {role === "owner" && <button className="primary-action" type="button" onClick={() => ownerReviewTime(entry.id, patchData)}>Owner Review</button>}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <Panel title="Version 1.1 Rules" eyebrow="Simple safeguards">
        <div className="time-rule-grid">
          <TimeRule title="Employee punch" detail="Button first, PIN check available for stronger trust." />
          <TimeRule title="Location-ish check" detail="App shows whether the employee is near the assigned work location." />
          <TimeRule title="Lunch break" detail="Employees only start or end lunch; no complicated break setup yet." />
          <TimeRule title="Forgot clock-out" detail="System auto-flags it so a manager must review." />
          <TimeRule title="Manager limit" detail="Managers approve or request correction; major edits stay owner-visible." />
          <TimeRule title="Owner first" detail="Owner sees labor cost, overtime risk, missed punches, and on-site staff first." />
        </div>
      </Panel>
    </div>
  );
}

function TimeFocusPanel({ entry, view, role, patchData }) {
  if (!entry) {
    return (
      <section className="time-focus-panel empty" aria-label="Selected time entry">
        <div>
          <p className="eyebrow">Time review</p>
          <h3>No time entry selected</h3>
          <span>Select an entry or open a dashboard time flag.</span>
        </div>
      </section>
    );
  }
  const viewLabel = {
    labor: "Labor cost",
    overtime: "Overtime watch",
    missed: "Missed punch",
    active: "On-site staff",
    exceptions: "Exception review",
  }[view] || "Time review";
  const needsReview = entry.severity !== "approved";
  const delta = Math.max(0, entryScheduledCost(entry) - entryLaborCost(entry));
  return (
    <section className={`time-focus-panel ${needsReview ? "needs-review" : "approved"}`} aria-label="Selected time entry">
      <div>
        <p className="eyebrow">{viewLabel}</p>
        <h3>{entry.employee}</h3>
        <span>{locationName(entry.locationId)} - {entry.flag} - {entry.shift}</span>
      </div>
      <div className="time-focus-metrics">
        <div>
          <span>Worked</span>
          <strong>{formatHours(entryWorkedHours(entry))}</strong>
        </div>
        <div>
          <span>Rate</span>
          <strong>{rateMoney(entry.hourlyRate)}/hr</strong>
        </div>
        <div>
          <span>Est pay</span>
          <strong>{money(entryLaborCost(entry))}</strong>
        </div>
        <div>
          <span>Schedule delta</span>
          <strong>{money(delta)}</strong>
        </div>
      </div>
      <div className="time-focus-actions">
        <button type="button" onClick={() => approveTime(entry.id, patchData)} disabled={!needsReview}>Approve</button>
        <button type="button" onClick={() => requestTimeCorrection(entry.id, patchData)}>Request Correction</button>
        {role === "owner" && (
          <button type="button" className="primary-action" onClick={() => ownerReviewTime(entry.id, patchData)}>
            Owner Review
          </button>
        )}
      </div>
    </section>
  );
}

function PayrollCard({ label, value, detail, onClick, active = false }) {
  const content = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={`payroll-card payroll-card-action ${active ? "active" : ""}`} onClick={onClick}>
        {content}
      </button>
    );
  }
  return (
    <article className="payroll-card">
      {content}
    </article>
  );
}

function TimeSignal({ icon: Icon, label, value, detail, state }) {
  return (
    <div className={`time-signal ${state || ""}`}>
      <Icon size={20} weight="fill" />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
    </div>
  );
}

function TimeRule({ title, detail }) {
  return (
    <div className="time-rule">
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}

function ReportsWorkspace({ data, patchData, location, routeFocus, go, day = operationsToday }) {
  const selectedDate = validDateKey(routeFocus?.reportDate) ? routeFocus.reportDate : validDateKey(day) ? day : operationsToday;
  const [reportView, setReportView] = useState(normalizeReportType(routeFocus?.reportType || "business"));
  const [reportBuilder, setReportBuilder] = useState(() => ({
    type: normalizeReportType(routeFocus?.reportType || "business"),
    range: routeFocus?.reportDate ? "day" : "week",
    audience: "Manager handoff",
  }));
  const activeLocation = effectiveLocation(data, location);
  const visibleShifts = data.shifts.filter((shift) => matchesActiveLocation(data, activeLocation, shift.locationId));
  const visibleRequests = data.requests.filter((request) => matchesActiveLocation(data, activeLocation, request.locationId));
  const visibleEntries = data.timeEntries.filter((entry) => matchesActiveLocation(data, activeLocation, entry.locationId));
  const visibleEvents = data.events.filter((event) => matchesActiveLocation(data, activeLocation, event.locationId));
  const openShifts = visibleShifts.filter((shift) => shift.status === "open").length;
  const pendingRequests = visibleRequests.filter((request) => request.status === "pending").length;
  const totalLabor = visibleEntries.reduce((sum, entry) => sum + entryLaborCost(entry), 0);
  const eventStaffingGap = visibleEvents.reduce((sum, event) => sum + Math.max(0, Number(event.needed || 0) - Number(event.signed || 0)), 0);
  const reportLog = Array.isArray(data.reportLog) ? data.reportLog : [];
  const reportSnapshots = getReportSnapshots(data);
  const reportContext = {
    activeLocation,
    visibleShifts,
    visibleRequests,
    visibleEntries,
    visibleEvents,
    openShifts,
    pendingRequests,
    totalLabor,
    eventStaffingGap,
  };

  useEffect(() => {
    if (routeFocus?.reportType) {
      const nextType = normalizeReportType(routeFocus.reportType);
      setReportView(nextType);
      setReportBuilder((current) => ({ ...current, type: nextType }));
    }
  }, [routeFocus?.reportType]);

  return (
    <div className="stack">
      <RouteFocusBanner focus={routeFocus} />
      <section className="report-kpi-grid" aria-label="Report summary">
        <PayrollCard
          label="Open shifts"
          value={openShifts}
          detail={activeLocation === "all" ? "Across visible business" : `${locationName(activeLocation)} only`}
          active={reportView === "coverage"}
          onClick={() => setReportView("coverage")}
        />
        <PayrollCard
          label="Pending requests"
          value={pendingRequests}
          detail="Need owner or manager decision"
          active={reportView === "requests"}
          onClick={() => setReportView("requests")}
        />
        <PayrollCard
          label="Tracked labor"
          value={money(totalLabor)}
          detail={`${visibleEntries.length} time entries in view`}
          active={reportView === "labor" || reportView === "risk"}
          onClick={() => setReportView("labor")}
        />
        <PayrollCard
          label="Event staffing gap"
          value={eventStaffingGap}
          detail={`${visibleEvents.length} events in view`}
          active={reportView === "events"}
          onClick={() => setReportView("events")}
        />
      </section>
      <ReportInsightPanel view={reportView} context={reportContext} routeFocus={routeFocus} go={go} />
      <ReportBuilderPanel
        data={data}
        patchData={patchData}
        location={location}
        selectedDate={selectedDate}
        reportBuilder={reportBuilder}
        setReportBuilder={setReportBuilder}
        latestSnapshot={reportSnapshots[0]}
      />
      <Panel title="Report History" eyebrow={activeLocation === "all" ? "Owner exports" : `${locationName(activeLocation)} exports`}>
        <div className="button-row">
          <button type="button" onClick={() => generateReport(patchData, { ...reportBuilder, date: selectedDate, location })}>Generate Report</button>
          <button type="button" onClick={() => exportData({ reportSnapshots, reportLog }, "workcenter-report.json")}><DownloadSimple size={17} /> Export Data</button>
        </div>
        <ListRows rows={[
          ...reportSnapshots.map((snapshot) => [
            snapshot.typeLabel,
            snapshot.summary,
            statusBadge("approved", snapshot.rangeLabel),
          ]),
          ...reportLog.map((item) => ["Report", item, statusBadge("approved")]),
        ]} />
      </Panel>
    </div>
  );
}

function ReportBuilderPanel({ data, patchData, location, selectedDate, reportBuilder, setReportBuilder, latestSnapshot }) {
  const draftSnapshot = buildReportSnapshot(data, { ...reportBuilder, date: selectedDate, location });
  const metrics = latestSnapshot?.metrics || draftSnapshot.metrics;
  function update(key, value) {
    setReportBuilder((current) => ({ ...current, [key]: value }));
  }
  return (
    <section className="report-builder-panel" aria-label="Report Builder">
      <div className="report-builder-head">
        <div>
          <p className="eyebrow">Report Builder</p>
          <h3>{draftSnapshot.title}</h3>
          <span>{draftSnapshot.summary}</span>
        </div>
        <div className="report-builder-actions">
          <button type="button" className="primary-action" onClick={() => generateReport(patchData, { ...reportBuilder, date: selectedDate, location })}>
            <ChartLineUp size={17} /> Generate Report
          </button>
          <button type="button" onClick={() => shareReportToHandoff(patchData, { ...reportBuilder, date: selectedDate, location })}>
            <PaperPlaneRight size={17} /> Share to Handoff
          </button>
        </div>
      </div>
      <div className="report-builder-controls">
        <label>
          <span>Report type</span>
          <select value={reportBuilder.type} onChange={(event) => update("type", event.target.value)}>
            {reportTypeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>Range</span>
          <select value={reportBuilder.range} onChange={(event) => update("range", event.target.value)}>
            {reportRangeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>Audience</span>
          <select value={reportBuilder.audience} onChange={(event) => update("audience", event.target.value)}>
            {reportAudienceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
      <div className="report-snapshot-strip" aria-label="Latest report snapshot">
        {metrics.map((metric) => (
          <article key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <p>{metric.detail}</p>
          </article>
        ))}
      </div>
      {latestSnapshot && (
        <div className="report-builder-latest">
          <strong>Latest saved</strong>
          <span>{latestSnapshot.title} at {latestSnapshot.createdAt}</span>
        </div>
      )}
    </section>
  );
}

function ReportInsightPanel({ view, context, routeFocus, go }) {
  const {
    activeLocation,
    visibleShifts,
    visibleRequests,
    visibleEntries,
    visibleEvents,
    openShifts,
    pendingRequests,
    totalLabor,
    eventStaffingGap,
  } = context;
  const scopeLabel = activeLocation === "all" ? "All locations" : locationName(activeLocation);
  const leadShift = visibleShifts.find((shift) => shift.status === "open");
  const leadRequest = visibleRequests.find((request) => request.status === "pending");
  const leadEntry = [...visibleEntries].sort((a, b) => entryLaborCost(b) - entryLaborCost(a))[0];
  const leadEvent = visibleEvents
    .map((event) => ({ ...event, gap: Math.max(0, Number(event.needed || 0) - Number(event.signed || 0)) }))
    .find((event) => event.gap > 0);
  const viewKey = view === "risk" ? "labor" : view;
  const insightMap = {
    coverage: {
      eyebrow: "Coverage report",
      title: openShifts ? `${openShifts} open shift${openShifts === 1 ? "" : "s"}` : "Coverage is clear",
      detail: leadShift
        ? `${locationName(leadShift.locationId)} needs ${leadShift.role}, ${formatHour(leadShift.start)} - ${formatHour(leadShift.end)}.`
        : `${scopeLabel} has no open shifts in this report view.`,
      action: "Open Schedule",
      onClick: () => go("owner-schedule", "Schedule opened from report insight.", {
        title: "Coverage report opened",
        detail: leadShift ? `${locationName(leadShift.locationId)} needs ${leadShift.role}.` : `${scopeLabel} coverage is clear.`,
        source: "Reports",
        shiftId: leadShift?.id,
      }),
    },
    requests: {
      eyebrow: "Request report",
      title: pendingRequests ? `${pendingRequests} pending decision${pendingRequests === 1 ? "" : "s"}` : "Requests are clear",
      detail: leadRequest
        ? `${leadRequest.employee} has a ${leadRequest.type.toLowerCase()} request at ${locationName(leadRequest.locationId)}.`
        : `${scopeLabel} has no pending request decisions right now.`,
      action: "Open Requests",
      onClick: () => go("owner-requests", "Requests opened from report insight.", {
        title: "Request report opened",
        detail: leadRequest ? `${leadRequest.employee} has a ${leadRequest.type.toLowerCase()} request.` : `${scopeLabel} requests are clear.`,
        source: "Reports",
      }),
    },
    labor: {
      eyebrow: "Labor report",
      title: `${money(totalLabor)} tracked labor`,
      detail: leadEntry
        ? `${leadEntry.employee} is the highest visible labor line at ${money(entryLaborCost(leadEntry))}.`
        : `${scopeLabel} has no time entries in this report view.`,
      action: "Open Time",
      onClick: () => go("owner-time", "Time review opened from report insight.", {
        title: "Labor report opened",
        detail: leadEntry ? `${leadEntry.employee}: ${money(entryLaborCost(leadEntry))} tracked labor.` : `${scopeLabel} labor report opened.`,
        source: "Reports",
        timeEntryId: leadEntry?.id,
        timeView: "labor",
      }),
    },
    events: {
      eyebrow: "Event staffing report",
      title: eventStaffingGap ? `${eventStaffingGap} event staff gap${eventStaffingGap === 1 ? "" : "s"}` : "Events are staffed",
      detail: leadEvent
        ? `${leadEvent.title} needs ${leadEvent.gap} more at ${locationName(leadEvent.locationId)}.`
        : `${scopeLabel} event staffing is covered in this report view.`,
      action: "Open Events",
      onClick: () => go("owner-events", "Events opened from report insight.", {
        title: "Event staffing report opened",
        detail: leadEvent ? `${leadEvent.title} needs ${leadEvent.gap} more.` : `${scopeLabel} events are staffed.`,
        source: "Reports",
        eventId: leadEvent?.id,
      }),
    },
    business: {
      eyebrow: "Business health report",
      title: `${scopeLabel} operating snapshot`,
      detail: `${openShifts} open shifts, ${pendingRequests} pending requests, ${money(totalLabor)} tracked labor, and ${eventStaffingGap} event staffing gaps.`,
      action: "Open Schedule",
      onClick: () => go("owner-schedule", "Schedule opened from business health report.", {
        title: "Business health report opened",
        detail: `${scopeLabel} coverage details opened from Reports.`,
        source: "Reports",
        shiftId: leadShift?.id,
      }),
    },
    log: {
      eyebrow: "Command log",
      title: routeFocus?.title || "Command activity log",
      detail: routeFocus?.detail || "Review the latest generated report and command activity.",
      action: "Open Dashboard",
      onClick: () => go("owner-dashboard", "Dashboard opened from report log."),
    },
  };
  const insight = insightMap[viewKey] || insightMap.business;
  return (
    <section className={`report-insight-panel ${viewKey}`} aria-label="Selected report insight">
      <div>
        <p className="eyebrow">{insight.eyebrow}</p>
        <h3>{insight.title}</h3>
        <span>{insight.detail}</span>
      </div>
      <div className="report-insight-actions">
        <button type="button" className="primary-action" onClick={insight.onClick}>{insight.action}</button>
        <button type="button" onClick={() => go("owner-dashboard", "Owner dashboard opened from Reports.")}>Back to Dashboard</button>
      </div>
    </section>
  );
}

function RoleSettingsWorkspace({ data, patchData, role, density, setDensity, go }) {
  const [activePanel, setActivePanel] = useState("profile");
  const account = accountProfileForRole(role, data);
  const notifications = getNotificationSettings(data);
  const isManager = role === "manager";
  const title = isManager ? "Manager Settings" : "Employee Settings";
  const subtitle = isManager
    ? "Manage your profile, alerts, and account security without owner billing tools."
    : "Manage your profile, alerts, and account security for your employee workspace.";
  const settingsPanels = [
    ["profile", isManager ? "Manager Profile" : "Employee Profile", UserCircle],
    ["notifications", "Notifications", Bell],
    ["security", "Security", ShieldCheck],
  ];
  const allowedAccess = isManager
    ? ["Manager dashboard", "Schedule management", "Approvals", "Team chat", "Guide management", "Time review"]
    : ["Personal dashboard", "My schedule", "Open shifts", "My time clock", "My requests", "Messages", "Guide"];
  const hiddenAccess = isManager
    ? ["Owner billing", "Owner reports", "Workspace delete", "Platform command review"]
    : ["Manager approvals", "Owner billing", "Reports", "Event administration", "Platform command review"];

  function updateNotificationSetting(key, value) {
    patchData((current) => ({
      ...current,
      notificationSettings: { ...getNotificationSettings(current), [key]: value },
    }), `${roleLabel(role)} notification preference updated.`);
  }

  function reviewSecurity(label) {
    patchData((current) => current, `${label} reviewed for ${roleLabel(role)} account.`);
  }

  return (
    <div className="role-settings-grid">
      <aside className="role-settings-rail" aria-label={`${roleLabel(role)} settings sections`}>
        <div>
          <p className="eyebrow">{roleLabel(role)} workspace</p>
          <h2>{title}</h2>
          <span>{subtitle}</span>
        </div>
        <div className="settings-tab-list" role="tablist" aria-label={`${roleLabel(role)} settings pages`}>
          {settingsPanels.map(([id, label, Icon]) => (
            <button
              className={activePanel === id ? "active" : ""}
              id={`${role}-settings-tab-${id}`}
              key={id}
              type="button"
              onClick={() => setActivePanel(id)}
              aria-current={activePanel === id ? "page" : undefined}
              aria-controls={`${role}-settings-panel-${id}`}
              aria-selected={activePanel === id}
              role="tab"
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="owner-control-card">
          <ShieldCheck size={18} weight="fill" />
          <div>
            <strong>{roleLabel(role)} authority</strong>
            <span>{isManager ? "Manager and employee tools only." : "Employee tools only."}</span>
          </div>
        </div>
      </aside>

      <div className="role-settings-workspace">
        <section className="settings-page-header">
          <div>
            <p className="eyebrow">{roleLabel(role)} account</p>
            <h2>{settingsPanels.find(([id]) => id === activePanel)?.[1] || title}</h2>
            <span>{subtitle}</span>
            <p className="settings-active-status" aria-live="polite">
              <CheckCircle size={14} weight="fill" />
              Viewing {roleLabel(role)} settings
            </p>
          </div>
          <div className="settings-page-actions">
            <button className="primary-settings-action" type="button" onClick={() => go(firstSectionByRole[role], `${roleLabel(role)} dashboard opened.`)}>
              Open Dashboard
            </button>
          </div>
        </section>

        <div
          className="settings-tab-panel"
          id={`${role}-settings-panel-${activePanel}`}
          role="tabpanel"
          aria-labelledby={`${role}-settings-tab-${activePanel}`}
        >
          {activePanel === "profile" && (
            <section className="settings-content-grid">
              <div className="settings-main-column">
                <SettingsSection title={isManager ? "Manager Profile" : "Employee Profile"}>
                  <SettingsInfoRows
                    rows={[
                      ["Name", account.name],
                      ["Email", account.email],
                      ["Role", roleLabel(role)],
                      ["Primary work area", account.location],
                      ...(account.rate ? [["Hourly rate", money(account.rate)]] : []),
                    ]}
                  />
                </SettingsSection>
                <SettingsSection title="Account Preferences">
                  <div className="settings-control-rows">
                    <label>
                      <span>Display density</span>
                      <select value={density} onChange={(event) => setDensity(event.target.value)}>
                        <option>Comfortable</option>
                        <option>Compact</option>
                      </select>
                    </label>
                    <label>
                      <span>Default landing page</span>
                      <select value={firstSectionByRole[role]} onChange={(event) => go(event.target.value, `${roleLabel(role)} landing page opened.`)}>
                        {navForRole(role, data).filter(([, , , group]) => group === `${roleLabel(role)} Section`).map(([id, label]) => (
                          <option key={id} value={id}>{label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </SettingsSection>
              </div>
              <div className="settings-side-column">
                <SettingsSection title="Authority Boundary">
                  <div className="role-access-grid">
                    <article>
                      <span>Can use</span>
                      {allowedAccess.map((item) => <strong key={item}>{item}</strong>)}
                    </article>
                    <article>
                      <span>Hidden</span>
                      {hiddenAccess.map((item) => <strong key={item}>{item}</strong>)}
                    </article>
                  </div>
                </SettingsSection>
              </div>
            </section>
          )}

          {activePanel === "notifications" && (
            <section className="settings-content-grid">
              <div className="settings-main-column">
                <SettingsSection title="Notification Preferences">
                  <div className="settings-control-rows">
                    <label>
                      <span>Schedule changes</span>
                      <select value={notifications.scheduleChanges} onChange={(event) => updateNotificationSetting("scheduleChanges", event.target.value)}>
                        <option>All affected team members</option>
                        <option>Managers only</option>
                        <option>Owner and managers</option>
                      </select>
                    </label>
                    <label>
                      <span>Requests</span>
                      <select value={notifications.requests} onChange={(event) => updateNotificationSetting("requests", event.target.value)}>
                        <option>Owner and managers</option>
                        <option>Managers only</option>
                        <option>Owner only</option>
                      </select>
                    </label>
                    <label>
                      <span>Time clock flags</span>
                      <select value={notifications.timeClockFlags} onChange={(event) => updateNotificationSetting("timeClockFlags", event.target.value)}>
                        <option>Manager and owner</option>
                        <option>Assigned manager only</option>
                        <option>Owner only</option>
                      </select>
                    </label>
                    <label>
                      <span>Daily summary</span>
                      <select value={notifications.dailySummary} onChange={(event) => updateNotificationSetting("dailySummary", event.target.value)}>
                        <option>Every morning</option>
                        <option>Every evening</option>
                        <option>Off</option>
                      </select>
                    </label>
                  </div>
                </SettingsSection>
              </div>
              <div className="settings-side-column">
                <SettingsSection title="Preview">
                  <SettingsInfoRows
                    rows={[
                      ["Schedule", notifications.scheduleChanges],
                      ["Requests", notifications.requests],
                      ["Time clock", notifications.timeClockFlags],
                      ["Daily summary", notifications.dailySummary],
                    ]}
                  />
                </SettingsSection>
              </div>
            </section>
          )}

          {activePanel === "security" && (
            <section className="settings-content-grid">
              <div className="settings-main-column">
                <SettingsSection title="Security">
                  <SettingsInfoRows
                    rows={[
                      ["Sign-in email", account.email],
                      ["Verification", "Email code required"],
                      ["Password", "Managed by account owner"],
                      ["Active sessions", "This device"],
                    ]}
                  />
                  <div className="role-settings-actions">
                    <button type="button" onClick={() => reviewSecurity("Active sessions")}>Review sessions</button>
                    <button type="button" onClick={() => reviewSecurity("Password reset email")}>Send password reset email</button>
                  </div>
                </SettingsSection>
              </div>
              <div className="settings-side-column">
                <SettingsSection title="Protected Access">
                  <SettingsInfoRows
                    rows={[
                      ["Role", roleLabel(role)],
                      ["Owner tools", "Hidden"],
                      ["Billing", "Hidden"],
                      ["Command Review", "Hidden"],
                    ]}
                  />
                </SettingsSection>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsWorkspace({ data, patchData, density, setDensity, openModal, settingsStartTab, onSettingsTabChange }) {
  const [activeSettingsTab, setActiveSettingsTab] = useState(() => (
    settingsTabIds.includes(settingsStartTab) ? settingsStartTab : "business"
  ));
  const settingsContentRef = useRef(null);
  const setup = getBusinessSetup(data);
  const profile = getSettingsProfile(data);
  const hours = getWorkspaceHours(data);
  const invoiceContact = getInvoiceContact(data);
  const security = getSecuritySettings(data);
  const notifications = getNotificationSettings(data);
  const visibleLocations = businessLocations(data);
  const locationPrefix = profile.displayName;
  const totalSeats = Math.max(45, data.billing.seats + 10);
  const usedSeats = Math.min(data.billing.seats, totalSeats);
  const availableSeats = Math.max(0, totalSeats - usedSeats);
  const seatPercent = Math.round((usedSeats / totalSeats) * 100);
  const planName = planDisplayName(data.billing.plan);
  const projected = data.billing.plan === "Weekly" ? 89 : data.billing.plan === "Yearly" ? 299 : 349;
  const settingsTabs = [
    ["business", "Business", Buildings, "Profile, hours, and workspace rules"],
    ["locations", "Locations", MapPin, "Work areas, teams, sites, and single-location mode"],
    ["roles", "Roles & Permissions", UsersThree, "Authority levels, seats, and manager coverage"],
    ["billing", "Billing & Plan", CreditCard, "Subscription, seats, and invoice contact"],
    ["security", "Security", ShieldCheck, "Access, health, and protected actions"],
    ["notifications", "Notifications", Bell, "Alerts for requests, shifts, and time clock flags"],
  ];
  const activeSettings = settingsTabs.find(([id]) => id === activeSettingsTab) || settingsTabs[0];
  const settingsActions = {
    business: [
      ["Edit Business", "settings-profile"],
      ["Edit Hours", "settings-hours"],
    ],
    locations: [
      ["Manage Locations", "settings-locations"],
      ["Edit Rules", "settings-rules"],
    ],
    roles: [
      ["Edit Rules", "settings-rules"],
      ["Manage Seats", "settings-seats"],
    ],
    billing: [
      ["Manage Plan", "settings-plan"],
      ["Edit Invoice", "settings-invoice"],
    ],
    security: [
      ["Manage Security", "settings-security"],
      ["Check Health", "settings-health"],
    ],
    notifications: [
      ["Preview Rules", "settings-health"],
      ["Edit Requests", "settings-rules"],
    ],
  };
  const activeActions = settingsActions[activeSettingsTab] || settingsActions.business;

  useEffect(() => {
    if (settingsTabIds.includes(settingsStartTab)) setActiveSettingsTab(settingsStartTab);
  }, [settingsStartTab]);

  function activateSettingsTab(id) {
    if (!settingsTabIds.includes(id)) return;
    const nextSettings = settingsTabs.find(([tabId]) => tabId === id);
    setActiveSettingsTab(id);
    onSettingsTabChange?.(id, nextSettings?.[1]);
    window.requestAnimationFrame(() => {
      settingsContentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function updateNotificationSetting(key, value) {
    patchData((current) => ({
      ...current,
      notificationSettings: { ...getNotificationSettings(current), [key]: value },
    }), "Notification setting updated.");
  }

  const locationRows = visibleLocations.map((location) => (
    <button className="settings-location-row" key={location.id} type="button" onClick={() => updateBusinessSetup({ primaryLocationId: location.id }, patchData)}>
      <MapPin size={16} weight="fill" />
      <strong>{location.name}</strong>
      <span>{location.id.startsWith("custom:") ? `Typed custom area - ${locationPrefix}` : `Saved work area - ${locationPrefix}`}</span>
      <em>{location.manager}<small>Lead</small></em>
      <span aria-hidden="true">{setup.primaryLocationId === location.id ? "Primary" : "Set"}</span>
    </button>
  ));

  return (
    <div className="settings-grid">
      <aside className="settings-rail" aria-label="Settings sections">
        <div className="settings-tab-list" role="tablist" aria-label="Settings pages">
          {settingsTabs.map(([id, label, Icon]) => (
            <button
              className={activeSettingsTab === id ? "active" : ""}
              id={`settings-tab-${id}`}
              key={id}
              type="button"
              onClick={() => activateSettingsTab(id)}
              aria-current={activeSettingsTab === id ? "page" : undefined}
              aria-controls={`settings-panel-${id}`}
              aria-selected={activeSettingsTab === id}
              role="tab"
              data-setting-tab={id}
              title={`Open ${label} settings`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="owner-control-card">
          <ShieldCheck size={18} weight="fill" />
          <div>
            <strong>Owner controls</strong>
            <span>Only owners can edit these settings.</span>
          </div>
        </div>
      </aside>

      <div className="settings-workspace" ref={settingsContentRef}>
        <section className="settings-page-header">
          <div>
            <p className="eyebrow">Settings section</p>
            <h2>{activeSettings[1]}</h2>
            <span>{activeSettings[3]}</span>
            <p className="settings-active-status" aria-live="polite">
              <CheckCircle size={14} weight="fill" />
              Viewing {activeSettings[1]}
            </p>
          </div>
          <div className="settings-page-actions">
            {activeActions.map(([label, modalName], index) => (
              <button
                className={index === 0 ? "primary-settings-action" : ""}
                key={label}
                type="button"
                onClick={() => openModal(modalName)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <div
          className="settings-tab-panel"
          id={`settings-panel-${activeSettingsTab}`}
          role="tabpanel"
          aria-labelledby={`settings-tab-${activeSettingsTab}`}
        >
          {activeSettingsTab === "business" && (
            <>
            <section className="settings-summary-grid" aria-label="Business setting summary">
              <SettingsSummaryCard
                icon={Buildings}
                tone="green"
                eyebrow="Business"
                title={profile.displayName}
                detail={profile.businessType}
                action="View Public Profile"
                onClick={() => openModal("settings-profile")}
              />
              <SettingsSummaryCard
                icon={ShieldCheck}
                tone="green"
                eyebrow="Subscription"
                title={planName}
                detail="Renews Jul 24, 2025"
                badge="Active"
                action="Manage Plan"
                onClick={() => {
                  activateSettingsTab("billing");
                  openModal("settings-plan");
                }}
              />
              <SettingsSummaryCard
                icon={UsersThree}
                tone="blue"
                eyebrow="Seat Usage"
                title={`${usedSeats} / ${totalSeats}`}
                detail={`${seatPercent}%`}
                progress={seatPercent}
                action="Manage Seats"
                onClick={() => {
                  activateSettingsTab("roles");
                  openModal("settings-seats");
                }}
              />
              <SettingsSummaryCard
                icon={CheckCircle}
                tone="green"
                eyebrow="Account Health"
                title="Good"
                detail="All systems operational"
                action="View Health"
                onClick={() => openModal("settings-health")}
              />
            </section>

            <section className="settings-content-grid">
              <div className="settings-main-column">
                <SettingsSection title="Company Profile" action={<button type="button" onClick={() => openModal("settings-profile")}>Edit</button>}>
                  <SettingsInfoRows
                    rows={[
                      ["Legal business name", profile.legalName],
                      ["Display name", profile.displayName],
                      ["Business type", profile.businessType],
                      ["Time zone", profile.timeZone],
                      ["Default location", `${locationPrefix} - ${locationName(setup.primaryLocationId)}`],
                      ["Primary contact", profile.primaryContact],
                      ["Tax ID", profile.taxId],
                    ]}
                  />
                </SettingsSection>

                <SettingsSection title="Business Hours" action={<button type="button" onClick={() => openModal("settings-hours")}>Edit</button>}>
                  <SettingsInfoRows
                    rows={[
                      ["Default weekly schedule", hours.weeklySchedule],
                      ["Overtime threshold", `${hours.overtimeThreshold} hours per week`],
                      ["Payroll week starts", hours.payrollWeekStarts],
                      ["Time clock rounding", hours.timeClockRounding],
                    ]}
                  />
                </SettingsSection>
              </div>

              <div className="settings-side-column">
                <SettingsSection title="Workspace Rules" action={<button type="button" onClick={() => openModal("settings-rules")}>Edit</button>}>
                  <div className="settings-control-rows">
                    <label>
                      <span>Management coverage</span>
                      <select value={setup.managerCoverage} onChange={(event) => updateBusinessSetup({ managerCoverage: event.target.value }, patchData)}>
                        <option value="managers">Managers assigned</option>
                        <option value="owner">Owner manages directly</option>
                      </select>
                    </label>
                    <label>
                      <span>Location setup</span>
                      <select value={setup.locationScope} onChange={(event) => updateBusinessSetup({ locationScope: event.target.value }, patchData)}>
                        <option value="multi">Multiple locations</option>
                        <option value="single">Single location</option>
                      </select>
                    </label>
                    <LocationInput
                      label="Primary location"
                      value={setup.primaryLocationId}
                      onChange={(value) => updateBusinessSetup({ primaryLocationId: value }, patchData)}
                      data={data}
                    />
                    <label>
                      <span>Appearance density</span>
                      <select value={density} onChange={(event) => setDensity(event.target.value)}>
                        <option>Comfortable</option>
                        <option>Compact</option>
                      </select>
                    </label>
                  </div>
                </SettingsSection>
              </div>
            </section>
            </>
          )}

          {activeSettingsTab === "locations" && (
            <section className="settings-content-grid">
            <div className="settings-main-column">
              <SettingsSection
                title="Locations"
                subtitle={`${visibleLocations.length} ${visibleLocations.length === 1 ? "location" : "locations"}`}
                action={<button type="button" onClick={() => openModal("settings-locations")}>Manage Locations</button>}
              >
                <div className="settings-location-list">{locationRows}</div>
              </SettingsSection>
            </div>
            <div className="settings-side-column">
              <SettingsSection title="Location Setup" action={<button type="button" onClick={() => openModal("settings-locations")}>Edit</button>}>
                <div className="settings-control-rows">
                  <label>
                    <span>Location setup</span>
                    <select value={setup.locationScope} onChange={(event) => updateBusinessSetup({ locationScope: event.target.value }, patchData)}>
                      <option value="multi">Multiple locations</option>
                      <option value="single">Single location</option>
                    </select>
                  </label>
                  <LocationInput
                    label="Primary location"
                    value={setup.primaryLocationId}
                    onChange={(value) => updateBusinessSetup({ primaryLocationId: value }, patchData)}
                    data={data}
                  />
                </div>
                <SettingsInfoRows
                  rows={[
                    ["Current mode", setup.locationScope === "single" ? "Single location" : "Multiple locations"],
                    ["Default filter", `${locationPrefix} - ${locationName(setup.primaryLocationId)}`],
                    ["Manager fallback", setup.managerCoverage === "owner" ? "Owner handles approvals" : "Assigned managers handle approvals"],
                  ]}
                />
              </SettingsSection>
            </div>
            </section>
          )}

          {activeSettingsTab === "roles" && (
            <section className="settings-content-grid">
            <div className="settings-main-column">
              <SettingsSection title="Roles & Permissions" action={<button type="button" onClick={() => openModal("settings-rules")}>Edit Rules</button>}>
                <div className="settings-permission-grid">
                  <article className="settings-permission-card">
                    <strong>Employee</strong>
                    <span>Employee section only</span>
                    <p>Can see personal schedule, clock in and out, chat, create requests, and complete guide cards.</p>
                  </article>
                  <article className="settings-permission-card">
                    <strong>Manager</strong>
                    <span>Manager + employee sections</span>
                    <p>Can manage schedules, requests, team messages, guide cards, and time review without owner billing controls.</p>
                  </article>
                  <article className="settings-permission-card">
                    <strong>Owner</strong>
                    <span>Owner section only</span>
                    <p>Can manage the business workspace, billing, seats, security, and manager fallback when no manager is assigned.</p>
                  </article>
                </div>
              </SettingsSection>

              <SettingsSection title="Management Coverage" action={<button type="button" onClick={() => openModal("settings-rules")}>Open Rules</button>}>
                <div className="settings-control-rows">
                  <label>
                    <span>Manager mode</span>
                    <select value={setup.managerCoverage} onChange={(event) => updateBusinessSetup({ managerCoverage: event.target.value }, patchData)}>
                      <option value="managers">Managers assigned</option>
                      <option value="owner">Owner manages directly</option>
                    </select>
                  </label>
                </div>
                <SettingsInfoRows
                  rows={[
                    ["Current responsibility", setup.managerCoverage === "owner" ? "Owner handles manager approvals" : "Managers handle daily approvals"],
                    ["Employee access", "Employee tools only"],
                    ["Billing access", "Owner only"],
                  ]}
                />
              </SettingsSection>
            </div>
            <div className="settings-side-column">
              <SettingsSection title="Seats & Users" action={<button type="button" onClick={() => openModal("settings-seats")}>Manage Seats</button>}>
                <SettingsInfoRows
                  rows={[
                    ["Total seats", totalSeats],
                    ["Seats used", usedSeats],
                    ["Available seats", availableSeats],
                  ]}
                />
                <SettingsProgress value={seatPercent} />
                <label className="seat-input-row">
                  <span>Seats used</span>
                  <input type="number" min="1" max={totalSeats} value={data.billing.seats} onChange={(event) => updateBilling({ seats: Number(event.target.value) }, patchData)} />
                </label>
              </SettingsSection>
            </div>
            </section>
          )}

          {activeSettingsTab === "billing" && (
            <section className="settings-content-grid">
            <div className="settings-main-column">
              <SettingsSection title="Billing Plan" action={<button type="button" onClick={() => openModal("settings-plan")}>Manage Plan</button>}>
                <div className="settings-control-rows">
                  <label>
                    <span>Current plan</span>
                    <strong>{planName}</strong>
                  </label>
                  <label>
                    <span>Billing cycle</span>
                    <select value={data.billing.plan} onChange={(event) => updateBilling({ plan: event.target.value }, patchData)}>
                      <option>Weekly</option>
                      <option>Monthly</option>
                      <option>Yearly</option>
                    </select>
                  </label>
                </div>
                <SettingsInfoRows
                  rows={[
                    ["Renewal date", "July 24, 2025"],
                    ["Payment method", "VISA .... 4242  Update"],
                    ["Monthly cost", money(projected)],
                  ]}
                />
              </SettingsSection>

              <SettingsSection title="Invoice Contact" action={<button type="button" onClick={() => openModal("settings-invoice")}>Edit</button>}>
                <SettingsInfoRows
                  rows={[
                    ["Name", invoiceContact.name],
                    ["Email", invoiceContact.email],
                    ["Phone", invoiceContact.phone],
                    ["Address", invoiceContact.address],
                  ]}
                />
              </SettingsSection>
            </div>
            <div className="settings-side-column">
              <SettingsSection title="Seats & Users" action={<button type="button" onClick={() => openModal("settings-seats")}>Manage Seats</button>}>
                <SettingsInfoRows
                  rows={[
                    ["Total seats", totalSeats],
                    ["Seats used", usedSeats],
                    ["Available seats", availableSeats],
                  ]}
                />
                <SettingsProgress value={seatPercent} />
              </SettingsSection>
            </div>
            </section>
          )}

          {activeSettingsTab === "security" && (
            <section className="settings-content-grid">
            <div className="settings-main-column">
              <SettingsSection title="Security" action={<button type="button" onClick={() => openModal("settings-security")}>Manage Security</button>}>
                <SettingsInfoRows
                  rows={[
                    ["Multi-factor authentication", security.mfa],
                    ["Password policy", security.passwordPolicy],
                    ["Single sign-on (SSO)", security.sso],
                    ["Active sessions", security.activeSessions],
                  ]}
                />
              </SettingsSection>

              <SettingsSection title="Account Health" action={<button type="button" onClick={() => openModal("settings-health")}>View Health</button>}>
                <SettingsInfoRows
                  rows={[
                    ["System status", "Operational"],
                    ["Last sync", "2 minutes ago"],
                    ["Security checks", "Passing"],
                    ["Owner controls", "Locked to owner role"],
                  ]}
                />
              </SettingsSection>
            </div>
            <div className="settings-side-column">
              <section className="settings-danger-zone">
                <div>
                  <h3>Danger Zone</h3>
                  <strong>Delete workspace</strong>
                  <span>This prototype records a protected deletion request instead of erasing the app.</span>
                </div>
                <button type="button" onClick={() => openModal("settings-delete")}>Delete Workspace</button>
              </section>
            </div>
            </section>
          )}

          {activeSettingsTab === "notifications" && (
            <section className="settings-content-grid">
            <div className="settings-main-column">
              <SettingsSection title="Notification Rules">
                <div className="settings-control-rows">
                  <label>
                    <span>Request approvals</span>
                    <select value={notifications.requests} onChange={(event) => updateNotificationSetting("requests", event.target.value)}>
                      <option>Owner and managers</option>
                      <option>Owner only</option>
                      <option>Managers only</option>
                    </select>
                  </label>
                  <label>
                    <span>Schedule changes</span>
                    <select value={notifications.scheduleChanges} onChange={(event) => updateNotificationSetting("scheduleChanges", event.target.value)}>
                      <option>All affected team members</option>
                      <option>Managers only</option>
                      <option>Owner and managers</option>
                    </select>
                  </label>
                  <label>
                    <span>Time clock flags</span>
                    <select value={notifications.timeClockFlags} onChange={(event) => updateNotificationSetting("timeClockFlags", event.target.value)}>
                      <option>Manager and owner</option>
                      <option>Owner only</option>
                      <option>Assigned manager only</option>
                    </select>
                  </label>
                  <label>
                    <span>Daily summary</span>
                    <select value={notifications.dailySummary} onChange={(event) => updateNotificationSetting("dailySummary", event.target.value)}>
                      <option>Every morning</option>
                      <option>Every evening</option>
                      <option>Off</option>
                    </select>
                  </label>
                </div>
              </SettingsSection>
            </div>
            <div className="settings-side-column">
              <SettingsSection title="Notification Preview">
                <SettingsInfoRows
                  rows={[
                    ["Requests", notifications.requests],
                    ["Schedule changes", notifications.scheduleChanges],
                    ["Time clock flags", notifications.timeClockFlags],
                    ["Daily summary", notifications.dailySummary],
                  ]}
                />
              </SettingsSection>
            </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsSummaryCard({ icon: Icon, tone, eyebrow, title, detail, badge, progress, action, onClick }) {
  return (
    <article className="settings-summary-card">
      <div className={`settings-summary-icon ${tone || "green"}`}>
        <Icon size={25} />
      </div>
      <div>
        <span>{eyebrow}</span>
        <h3>{title} {badge && <em>{badge}</em>}</h3>
        <p>{detail}</p>
        {typeof progress === "number" && <SettingsProgress value={progress} compact />}
        <button className="text-action" type="button" onClick={onClick}>{action}</button>
      </div>
    </article>
  );
}

function SettingsSection({ title, subtitle, action, children }) {
  return (
    <section className="settings-section">
      <div className="settings-section-head">
        <div>
          <h3>{title}</h3>
          {subtitle && <span>{subtitle}</span>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SettingsInfoRows({ rows }) {
  return (
    <div className="settings-info-rows">
      {rows.map(([label, value]) => (
        <div className="settings-info-row" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function SettingsProgress({ value, compact = false }) {
  return (
    <div className={`settings-progress ${compact ? "compact" : ""}`}>
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      <em>{value}%</em>
    </div>
  );
}

function homeActionTarget(target) {
  return target ? { "data-home-target": target } : {};
}

function Metric({ label, value, detail, state, icon: Icon, onClick, actionTarget }) {
  const content = (
    <>
      {Icon && (
        <div className="metric-icon">
          <Icon size={21} weight="fill" />
        </div>
      )}
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
    </>
  );
  if (onClick) {
    return (
      <button className={`metric metric-action ${state || ""}`} type="button" onClick={onClick} {...homeActionTarget(actionTarget)}>
        {content}
      </button>
    );
  }
  return (
    <article className={`metric ${state || ""}`}>
      {content}
    </article>
  );
}

function Panel({ title, eyebrow, action, children, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h3>{title}</h3>
        </div>
        {action && <div className="panel-action">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function Timeline({ shifts, compact = false, onShiftClick, selectedShiftId, bounds }) {
  const timelineBounds = bounds || scheduleTimeBounds(null, shifts);
  const marks = scheduleHourMarks(timelineBounds);
  const span = Math.max(1, timelineBounds.end - timelineBounds.start);
  const visibleLocations = Array.from(new Set(shifts.map((shift) => shift.locationId)))
    .filter(Boolean)
    .map((id) => {
      const location = locations.find((item) => item.id === id);
      return location || { id, name: locationName(id), manager: "Unassigned" };
    });
  return (
    <div className={`timeline ${compact ? "compact" : ""}`} style={{ "--timeline-columns": marks.length, "--timeline-grid-size": `${100 / Math.max(marks.length, 1)}%` }}>
      <div className="timeline-head">
        <span>Location</span>
        {marks.map((hour) => <span key={hour}>{formatHour(hour)}</span>)}
      </div>
      {visibleLocations.map((location) => (
        <div className="timeline-row" key={location.id}>
          <div className="timeline-location">
            <strong>{location.name}</strong>
            <span>{location.manager}</span>
          </div>
          <div className="timeline-track">
            {shifts.filter((shift) => shift.locationId === location.id).map((shift) => {
              const left = Math.max(0, ((shift.start - timelineBounds.start) / span) * 100);
              const width = Math.min(100 - left, Math.max(4, ((shift.end - shift.start) / span) * 100));
              return (
                <button
                  type="button"
                  className={`shift-block ${shift.status} ${selectedShiftId === shift.id ? "selected" : ""}`}
                  key={shift.id}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={`${shift.employee}: ${formatHour(shift.start)} - ${formatHour(shift.end)}`}
                  onClick={() => onShiftClick?.(shift)}
                >
                  <strong>{shift.employee}</strong>
                  <span>{shift.role}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ScheduleRangeBoard({ period, rows, selectedShiftId, datePlans = {}, onShiftClick, onOpenDate, onPrepareDate, onCopyTemplate, sourceDate }) {
  return (
    <div className={`schedule-range-board ${period}`}>
      {rows.map((row) => {
        const dateInfo = selectedDateInfo(row.date);
        const hasRisk = row.open || row.pending;
        const datePlan = datePlans[row.date];
        return (
          <article className={`schedule-range-day-card ${hasRisk ? "needs-work" : row.total ? "covered" : "empty"}`} key={row.date}>
            <div className="schedule-range-day-head">
              <div>
                <span>{shortDisplayDate(row.date)}</span>
                <strong>{dateInfo.label}</strong>
                <p>{row.total ? `${row.total} shifts / ${formatHours(row.hours)}` : "No plan yet"}</p>
              </div>
              {row.open ? statusBadge("pending", `${row.open} gaps`) : row.total ? statusBadge("approved", "Covered") : statusBadge("draft", "Empty")}
            </div>
            {row.shifts.length ? (
              <div className="schedule-range-shift-list">
                {row.shifts.map((shift) => (
                  <button
                    type="button"
                    className={`range-shift-chip ${shift.status} ${selectedShiftId === shift.id ? "selected" : ""}`}
                    key={shift.id}
                    onClick={() => onShiftClick?.(shift)}
                  >
                    <span>
                      <strong>{locationName(shift.locationId)} - {shift.role}</strong>
                      <small>{formatHour(shift.start)} - {formatHour(shift.end)} - {shift.employee}</small>
                    </span>
                    <em>{shift.status === "open" ? "Open" : shift.status === "pending" ? "Pending" : "Covered"}</em>
                  </button>
                ))}
              </div>
            ) : (
              <p className="schedule-range-empty">Use the day template or add a shift when this date needs coverage.</p>
            )}
            <p className="schedule-range-plan-note">
              {datePlan
                ? `${datePlan.status || "Prepared"} - target ${datePlan.staffTarget || 1} - ${datePlan.demand || "Normal"} - ${datePlan.businessStart || "6:00 AM"} to ${datePlan.businessEnd || "10:00 PM"}`
                : "No saved day setup yet"}
            </p>
            {datePlan && (
              <div className="schedule-range-plan-tags" aria-label={`${dateInfo.label} plan details`}>
                <span>{datePlan.timeGranularity || "15 minute blocks"}</span>
                <span>{datePlan.lockTime || "4:00 PM lock"}</span>
                <span>{datePlan.requiredRoles || "Roles needed"}</span>
              </div>
            )}
            <div className="schedule-range-day-actions">
              <button className="schedule-open-day" type="button" onClick={() => onOpenDate?.(row.date)}>
                Open Day
              </button>
              <button type="button" onClick={() => onPrepareDate?.(row.date)}>
                {row.total ? "Refresh Plan" : "Build Day"}
              </button>
              <button type="button" onClick={() => onCopyTemplate?.(row.date)} disabled={row.date === sourceDate}>
                Copy Today
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function BusinessHealth({ data, go, goThread, setLocation, patchData, day = operationsToday }) {
  const visibleLocations = businessLocations(data);
  const selectedDate = validDateKey(day) ? day : operationsToday;
  const dateInfo = selectedDateInfo(selectedDate);
  function openLocation(locationId, target, label) {
    setLocation?.(locationId);
    go(target, `${locationName(locationId)} ${label} opened.`, {
      title: `${locationName(locationId)} ${label} opened`,
      detail: label === "report"
        ? `Review ${locationName(locationId)} coverage, labor, requests, and staffing health for ${sentenceDateLabel(dateInfo)}.`
        : `Review ${locationName(locationId)} schedule coverage and open gaps for ${sentenceDateLabel(dateInfo)}.`,
      source: "Business Health",
      reportType: label === "report" ? "business" : undefined,
      reportDate: label === "report" ? selectedDate : undefined,
      schedulePeriod: label === "schedule" ? "day" : undefined,
      scheduleDate: label === "schedule" ? selectedDate : undefined,
    });
  }
  function sendLocationBrief(locationId) {
    setLocation?.(locationId);
    sendDashboardHandoff(selectedDate, locationId, patchData);
    goThread?.("m2", `${locationName(locationId)} ${dateInfo.label} business brief sent to Manager Handoff.`);
  }
  return (
    <Panel
      title="Business Health"
      eyebrow={singleLocationMode(data) ? `${dateInfo.label} / single location` : `${dateInfo.label} by location`}
      action={<button type="button" onClick={() => go("owner-reports", "Business health report opened.", {
        title: "Business health report",
        detail: `Review ${dateInfo.label} location coverage, labor, requests, and event staffing in one report.`,
        source: "Business Health",
        reportType: "business",
        reportDate: selectedDate,
      })} {...homeActionTarget("owner-reports:business")}>View Report</button>}
    >
      <div className="location-health-list owner-card-scroll">
        {visibleLocations.map((location) => {
          const shifts = data.shifts.filter((shift) => shift.locationId === location.id && shiftDateKey(shift) === selectedDate);
          const open = shifts.filter((shift) => shift.status === "open").length;
          const covered = Math.max(0, shifts.length - open);
          const coverage = shifts.length ? Math.round((covered / shifts.length) * 100) : 100;
          return (
            <article className="location-health-row" key={location.id}>
              <button type="button" onClick={() => openLocation(location.id, "owner-schedule", "schedule")} {...homeActionTarget("owner-schedule")}>
                <strong>{location.name}</strong>
                <span>{covered}/{shifts.length} covered - {coverage}%</span>
              </button>
              {open ? statusBadge("pending", `${open} gaps`) : shifts.length ? statusBadge("approved", "Healthy") : statusBadge("draft", "No plan")}
              <div className="location-health-actions">
                <button type="button" onClick={() => openLocation(location.id, "owner-schedule", "schedule")} {...homeActionTarget("owner-schedule")}>Schedule</button>
                <button type="button" onClick={() => openLocation(location.id, "owner-reports", "report")} {...homeActionTarget("owner-reports:business")}>Report</button>
                <button type="button" onClick={() => sendLocationBrief(location.id)} {...homeActionTarget("owner-team:manager-handoff")}>Brief</button>
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}

function isManagerLeadShift(shift) {
  if (!shift || shift.status === "open") return false;
  const text = `${shift.role || ""} ${shift.note || ""}`.toLowerCase();
  return text.includes("manager") || text.includes("lead");
}

function managerDutyRows(data, selectedDate) {
  return businessLocations(data).map((location) => {
    const dayShifts = data.shifts.filter((shift) => shift.locationId === location.id && shiftDateKey(shift) === selectedDate);
    const coveredShifts = dayShifts.filter((shift) => shift.status !== "open");
    const leadShift = coveredShifts.find(isManagerLeadShift);
    const fallbackShift = coveredShifts[0];
    const leadName = leadShift?.employee || (dayShifts.length ? location.manager || "Unassigned" : "No lead scheduled");
    const leadRole = leadShift?.role || (dayShifts.length ? "Needs schedule slot" : "Build day plan");
    const detail = leadShift
      ? `${formatHour(leadShift.start)} - ${formatHour(leadShift.end)}`
      : dayShifts.length
        ? `${coveredShifts.length}/${dayShifts.length} covered - assign lead`
        : "No dated schedule";
    const status = leadShift ? "on-duty" : dayShifts.length ? "needs-lead" : "no-plan";
    return { location, dayShifts, coveredShifts, leadShift, fallbackShift, leadName, leadRole, detail, status };
  });
}

function sendManagerDutyBrief(day, locationId, patchData) {
  if (!patchData) return;
  const selectedDate = validDateKey(day) ? day : operationsToday;
  const dateInfo = selectedDateInfo(selectedDate);
  const time = scheduleStamp();
  patchData((data) => {
    const rows = managerDutyRows(data, selectedDate).filter((row) => locationId === "all" || row.location.id === locationId);
    const leadCount = rows.filter((row) => row.status === "on-duty").length;
    const needsLead = rows.filter((row) => row.status === "needs-lead").length;
    const noPlan = rows.filter((row) => row.status === "no-plan").length;
    const scope = locationId === "all" ? "all visible locations" : locationName(locationId);
    const summary = rows.map((row) => `${row.location.name}: ${row.leadName} (${row.status === "on-duty" ? row.leadRole : row.detail})`).join("; ");
    const body = `${dateInfo.label} manager duty brief for ${scope}: ${leadCount}/${rows.length} leads confirmed, ${needsLead} need a lead, ${noPlan} not planned. ${summary}.`;
    return {
      ...data,
      scheduleOps: { ...getScheduleOps(data), handoffStatus: `Manager duty ${time}` },
      messages: postManagerHandoff(data.messages, body, "Owner", time),
    };
  }, "Manager duty brief sent to Manager Handoff.");
}

function ManagersPanel({ data, go, goThread, setLocation, patchData, day = operationsToday }) {
  const visibleLocations = businessLocations(data);
  const selectedDate = validDateKey(day) ? day : operationsToday;
  const dateInfo = selectedDateInfo(selectedDate);
  const rows = managerDutyRows(data, selectedDate);
  function openManagerSchedule(row) {
    setLocation?.(row.location.id);
    go("owner-schedule", `${row.location.name} manager coverage opened.`, {
      title: `${row.location.name} manager coverage`,
      detail: row.leadShift
        ? `${row.leadName} is scheduled ${formatHour(row.leadShift.start)} - ${formatHour(row.leadShift.end)}.`
        : row.dayShifts.length
          ? `${row.location.name} has a dated plan but no Manager or Lead shift assigned.`
          : `${row.location.name} has no dated schedule yet.`,
      source: "Managers on Duty",
      shiftId: row.leadShift?.id || row.fallbackShift?.id,
      scheduleDate: selectedDate,
      schedulePeriod: "day",
    });
  }
  function sendDutyBrief(row) {
    setLocation?.(row.location.id);
    sendManagerDutyBrief(selectedDate, row.location.id, patchData);
    goThread?.("m2", `${row.location.name} ${dateInfo.label} manager duty brief sent.`);
  }
  if (ownerRunsManagerFunctions(data)) {
    return (
      <Panel title="Owner Manager Mode" eyebrow={`${dateInfo.label} / no manager assigned`} action={<button type="button" onClick={() => go("owner-manager-dashboard")} {...homeActionTarget("owner-manager-dashboard")}>Open Manager Ops</button>}>
        <div className="manager-mode-list">
          {visibleLocations.map((location) => (
            <div className="manager-mode-row" key={location.id}>
              <div>
                <strong>{location.name}</strong>
                <span>Owner handles manager approvals directly.</span>
              </div>
              {statusBadge("pending", "Owner-managed")}
            </div>
          ))}
        </div>
        <button className="manager-mode-action" type="button" onClick={() => go("owner-manager-dashboard", "Manager operations opened.")} {...homeActionTarget("owner-manager-dashboard")}>Open Manager Operations</button>
      </Panel>
    );
  }
  return (
    <Panel title="Managers on Duty" eyebrow={`${dateInfo.label} scheduled leads`} action={<button type="button" onClick={() => {
      sendManagerDutyBrief(selectedDate, "all", patchData);
      goThread("m2", `${dateInfo.label} manager duty handoff opened.`);
    }} {...homeActionTarget("owner-team:manager-handoff")}>Send Brief</button>}>
      <div className="manager-duty-list owner-card-scroll">
        {rows.map((row) => (
          <article className="manager-duty-row" key={row.location.id}>
            <button
              type="button"
              className="manager-duty-main"
              onClick={() => openManagerSchedule(row)}
              {...homeActionTarget("owner-schedule")}
            >
              <span>{row.location.name}</span>
              <strong>{row.leadName}</strong>
              <em>{row.detail}</em>
            </button>
            {row.status === "on-duty" ? statusBadge("approved", "On duty") : row.status === "needs-lead" ? statusBadge("pending", "Need lead") : statusBadge("draft", "No plan")}
            <div className="manager-duty-actions">
              <button type="button" onClick={() => openManagerSchedule(row)} {...homeActionTarget("owner-schedule")}>Schedule</button>
              <button type="button" onClick={() => sendDutyBrief(row)} {...homeActionTarget("owner-team:manager-handoff")}>Brief</button>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function GuideSnapshot({ data, openModal, go, goThread, patchData, location = "all", day = operationsToday }) {
  const selectedDate = validDateKey(day) ? day : operationsToday;
  const dateInfo = selectedDateInfo(selectedDate);
  const activeLocation = effectiveLocation(data, location);
  const scopedCards = data.guideCards.filter((card) => activeLocation === "all" || card.locationId === "all" || card.locationId === activeLocation);
  const visibleCards = scopedCards.length ? scopedCards : data.guideCards;
  const average = data.guideCards.length ? Math.round(data.guideCards.reduce((sum, card) => sum + card.completion, 0) / data.guideCards.length) : 0;
  const lowestGuide = [...visibleCards].sort((a, b) => (a.completion || 0) - (b.completion || 0))[0];
  const cardsNeedingReview = visibleCards.filter((card) => !data.completedGuideIds.includes(card.id) && card.completion < 90).length;
  const scopeLabel = activeLocation === "all" ? "All work areas" : locationName(activeLocation);
  function openGuide(card = lowestGuide) {
    go("owner-guide", card ? `${card.title} opened from dashboard guide snapshot.` : "Guide library opened.", {
      title: card ? "Guide card opened" : "Guide library opened",
      detail: card ? `${card.title} is ${card.completion}% complete for ${scopeLabel}.` : "Review guide cards and employee questions.",
      source: "Guide snapshot",
      guideId: card?.id,
      scheduleDate: selectedDate,
      guideLocation: activeLocation,
    });
  }
  function sendGuideTip() {
    if (typeof patchData !== "function") return;
    sendDashboardGuideTip(selectedDate, activeLocation, patchData, "Owner");
    goThread?.("m5", `${dateInfo.label} guide tip opened in Training Questions.`);
  }
  return (
    <Panel
      title="Guide Completion"
      eyebrow={`${dateInfo.label} training help`}
      action={<button type="button" onClick={sendGuideTip} disabled={typeof patchData !== "function"} {...homeActionTarget("owner-team:training-questions")}><BookOpenText size={16} /> Coach Tip</button>}
    >
      <div className="guide-dashboard-focus">
        <div className="guide-dashboard-icon">
          <BookOpenText size={18} weight="fill" />
        </div>
        <div className="guide-dashboard-copy">
          <span>{scopeLabel} - {average}% average</span>
          <strong>{lowestGuide?.title || "Build the first guide"}</strong>
          <p>
            {lowestGuide
              ? `${lowestGuide.completion}% complete. ${cardsNeedingReview} guide${cardsNeedingReview === 1 ? " needs" : "s need"} review for ${dateInfo.label}.`
              : "Create one practical guide for employees before the next shift."}
          </p>
        </div>
        {lowestGuide ? statusBadge(lowestGuide.completion < 75 ? "pending" : "approved", lowestGuide.completion < 75 ? "Needs work" : "Steady") : statusBadge("draft", "Empty")}
      </div>
      <div className="guide-snapshot-actions">
        <button type="button" onClick={() => openGuide()} {...homeActionTarget("owner-guide")}>Open Guide</button>
        <button type="button" onClick={() => openModal("guide")} {...homeActionTarget("modal:guide")}><Plus size={17} /> Add Card</button>
      </div>
      <div className="guide-snapshot-list">
        <ProgressRows cards={visibleCards.slice(0, 3)} completed={data.completedGuideIds} onCardClick={openGuide} />
      </div>
    </Panel>
  );
}

function AnnouncementSnapshot({ data, openModal, goThread, patchData, location = "all", day = operationsToday }) {
  const latest = data.announcements[0];
  const selectedDate = validDateKey(day) ? day : operationsToday;
  const dateInfo = selectedDateInfo(selectedDate);
  const activeLocation = effectiveLocation(data, location);
  const scopeLabel = activeLocation === "all" ? "All work areas" : locationName(activeLocation);
  function shareAnnouncementUpdate() {
    if (typeof patchData !== "function") return;
    sendDashboardAnnouncementUpdate(selectedDate, activeLocation, patchData, "Owner");
    goThread?.("m6", `${dateInfo.label} team update opened in Team Announcements.`);
  }
  return (
    <Panel
      title="Latest Announcement"
      eyebrow={`${dateInfo.label} team broadcast`}
      action={<button type="button" onClick={shareAnnouncementUpdate} disabled={typeof patchData !== "function"} {...homeActionTarget("owner-team:announcements")}><Megaphone size={16} weight="fill" /> Share Update</button>}
    >
      <div className="announcement-mini">
        <span>{scopeLabel} - {latest?.audience || "All teams"}</span>
        <strong>{latest?.title || "No announcement"}</strong>
        <p>{latest?.body || "Post an update to keep the team aligned."}</p>
        <div className="announcement-mini-actions">
          <button type="button" onClick={() => openModal("announcement")} {...homeActionTarget("modal:announcement")}><Plus size={16} /> New Post</button>
          <button type="button" onClick={() => goThread(announcementThreadId(data), "Announcement thread opened.")} {...homeActionTarget("owner-team:announcements")}>Open Chat</button>
        </div>
      </div>
    </Panel>
  );
}

function ActionQueue({ items }) {
  return (
    <div className="action-queue">
      {items.map((item) => (
        <div className="action-row" key={item.label}>
          <div>
            <strong>{item.label}</strong>
            <span>{item.detail}</span>
          </div>
          <button type="button" onClick={item.onClick} {...homeActionTarget(item.target)}>{item.action}</button>
        </div>
      ))}
    </div>
  );
}

function CommandToolRow({ items }) {
  return (
    <div className="command-tool-row" aria-label="Command tools">
      {items.map(({ label, detail, icon: Icon, target, onClick }) => (
        <button className="command-tool-button" type="button" key={label} onClick={onClick} {...homeActionTarget(target)}>
          <Icon size={17} weight="fill" />
          <span>
            <strong>{label}</strong>
            <small>{detail}</small>
          </span>
        </button>
      ))}
    </div>
  );
}

function OwnerRecommendationCard({ recommendation, onApprove, onOpen, approveTarget, openTarget }) {
  const Icon = recommendation.icon;
  return (
    <article className={`owner-recommendation ${recommendation.tone}`}>
      <div className="owner-recommendation-icon">
        <Icon size={18} weight="fill" />
      </div>
      <div className="owner-recommendation-copy">
        <span>{recommendation.eyebrow}</span>
        <strong>{recommendation.title}</strong>
        <p>{recommendation.detail}</p>
      </div>
      <div className="owner-recommendation-actions">
        <button className="primary-action" type="button" onClick={onApprove} {...homeActionTarget(approveTarget)}>Approve & Send</button>
        <button type="button" onClick={onOpen} {...homeActionTarget(openTarget)}>{recommendation.openLabel}</button>
      </div>
    </article>
  );
}

function ShiftTable({ shifts, patchData }) {
  if (!shifts.length) return <p className="empty">No open shifts in this filter.</p>;
  return (
    <ListRows
      rows={shifts.map((shift) => [
        locationName(shift.locationId),
        `${formatHour(shift.start)} - ${formatHour(shift.end)}`,
        `${shift.role} - ${shift.employee}`,
        <button type="button" onClick={() => assignShift(shift.id, patchData)}>Assign</button>,
      ])}
    />
  );
}

function ListRows({ rows }) {
  return (
    <div className="list-rows">
      {rows.map((row, index) => (
        <div className="list-row" key={index}>
          {row.map((cell, cellIndex) => <div key={cellIndex}>{cell}</div>)}
        </div>
      ))}
    </div>
  );
}

function LocationInput({ label = "Location", value, onChange, onCommit, data, includeAll = false, className = "form-line" }) {
  const listId = `${locationInputId(label)}-${useId().replace(/:/g, "")}`;
  const [draft, setDraft] = useState(() => locationName(value));
  const options = locationOptions(data, includeAll);

  useEffect(() => {
    setDraft(locationName(value));
  }, [value]);

  function updateDraft(nextDraft) {
    setDraft(nextDraft);
    onChange(resolveLocationEntry(data, nextDraft, includeAll));
  }

  function commitDraft(nextDraft = draft) {
    const nextLocation = resolveLocationEntry(data, nextDraft, includeAll);
    onChange(nextLocation);
    onCommit?.(nextLocation);
    setDraft(locationName(nextLocation));
  }

  return (
    <label className={`location-entry-control ${className}`}>
      <span>{label}</span>
      <input
        aria-label={label}
        list={listId}
        value={draft}
        placeholder="Type a location, team, site, or area"
        onChange={(event) => updateDraft(event.target.value)}
        onBlur={() => commitDraft()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitDraft(event.currentTarget.value);
          }
        }}
        required
      />
      <datalist id={listId}>
        {options.map(([id, name]) => <option key={id} value={name} />)}
      </datalist>
    </label>
  );
}

function ProgressRows({ cards, completed, onCardClick }) {
  return (
    <div className="progress-list">
      {cards.map((card) => (
        <button className="progress-item progress-item-action" type="button" key={card.id} onClick={() => onCardClick?.(card)} {...homeActionTarget(onCardClick ? "owner-guide" : undefined)}>
          <div>
            <strong>{card.title}</strong>
            <span>{completed?.includes(card.id) ? "Completed by you" : `${card.completion}% team completion`}</span>
          </div>
          <div className="progress-line"><span style={{ width: `${completed?.includes(card.id) ? 100 : card.completion}%` }} /></div>
        </button>
      ))}
    </div>
  );
}

function ActionModal({ modal, setModal, data, patchData, role, selectedDay }) {
  const modalName = modalKey(modal);
  const isEditEvent = modalName === "event" && modalMode(modal) === "edit";
  const [form, setForm] = useState(defaultForm(modal, role, data, selectedDay));
  const staffEvent = modalName === "event-staff" ? getEventById(data, modal.eventId) : null;
  const staffCandidates = staffEvent ? eventStaffCandidates(staffEvent, data) : [];

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event) {
    event.preventDefault();
    let shouldClose = true;
    if (modalName === "shift") addShift(form, patchData);
    if (modalName === "announcement") addAnnouncement(form, patchData, role);
    if (modalName === "event" && isEditEvent) updateEvent(modal.eventId, form, patchData);
    if (modalName === "event" && !isEditEvent) addEvent(form, patchData);
    if (modalName === "guide") addGuide(form, patchData);
    if (modalName === "request") addRequest(form, patchData, role);
    if (modalName === "invite") shouldClose = createTeamInvite(form, role, patchData);
    if (modalName === "activate-account") shouldClose = activateTeamAccount(form, data, patchData);
    if (modalName.startsWith("settings-")) saveSettingsModal(modalName, form, patchData);
    if (shouldClose) setModal(null);
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal" onSubmit={submit}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{modalTitle(modal).eyebrow}</p>
            <h3>{modalTitle(modal).title}</h3>
          </div>
          <button type="button" aria-label="Close modal" onClick={() => setModal(null)}><X size={18} /></button>
        </div>
        {modalName === "shift" && (
          <>
            <TextInput label="Employee" value={form.employee} onChange={(value) => update("employee", value)} />
            <LocationInput label="Location" value={form.locationId} onChange={(value) => update("locationId", value)} data={data} />
            <TextInput label="Role" value={form.role} onChange={(value) => update("role", value)} />
            <TextInput label="Date" type="date" value={form.date} onChange={(value) => update("date", value)} />
            <div className="two-col">
              <NumberInput label="Start hour" value={form.start} onChange={(value) => update("start", value)} />
              <NumberInput label="End hour" value={form.end} onChange={(value) => update("end", value)} />
            </div>
            <TextInput label="Note" value={form.note} onChange={(value) => update("note", value)} />
          </>
        )}
        {modalName === "announcement" && (
          <>
            <TextInput label="Title" value={form.title} onChange={(value) => update("title", value)} />
            <TextArea label="Announcement" value={form.body} onChange={(value) => update("body", value)} />
            <TextInput label="Audience" value={form.audience} onChange={(value) => update("audience", value)} />
          </>
        )}
        {modalName === "event" && (
          <>
            <TextInput label="Event title" value={form.title} onChange={(value) => update("title", value)} />
            <div className="two-col">
              <LocationInput label="Location" value={form.locationId} onChange={(value) => update("locationId", value)} data={data} />
              <SelectInput label="Event type" value={form.eventType} onChange={(value) => update("eventType", value)} options={eventTypeOptions} />
            </div>
            <div className="two-col">
              <TextInput label="Date" value={form.date} onChange={(value) => update("date", value)} />
              <TextInput label="Time" value={form.time} onChange={(value) => update("time", value)} />
            </div>
            <div className="two-col">
              <NumberInput label="Staff needed" value={form.needed} onChange={(value) => update("needed", value)} />
              <SelectInput label="Staff role" value={form.roleNeeded} onChange={(value) => update("roleNeeded", value)} options={eventRoleOptions} />
            </div>
            <div className="two-col">
              <SelectInput label="Audience" value={form.audience} onChange={(value) => update("audience", value)} options={eventAudienceOptions} />
              <SelectInput label="Priority" value={form.priority} onChange={(value) => update("priority", value)} options={eventPriorityOptions} />
            </div>
            <div className="two-col">
              <SelectInput label="Signup rule" value={form.signupRule} onChange={(value) => update("signupRule", value)} options={eventSignupRuleOptions} />
              <SelectInput label="Repeat" value={form.repeat} onChange={(value) => update("repeat", value)} options={eventRepeatOptions} />
            </div>
            <TextInput label="Signup deadline" value={form.deadline} onChange={(value) => update("deadline", value)} />
            <TextArea label="Prep notes" value={form.notes} onChange={(value) => update("notes", value)} />
          </>
        )}
        {modalName === "event-staff" && staffEvent && (
          <div className="event-staff-manager">
            <div className="event-staff-summary">
              <strong>{staffEvent.title}</strong>
              <span>{locationName(staffEvent.locationId)} - {staffEvent.date} at {staffEvent.time}</span>
              <div className="event-progress-line">
                <span style={{ width: `${eventStaffProgress(staffEvent)}%` }} />
              </div>
              <small>{Math.min(Number(staffEvent.signed) || 0, Number(staffEvent.needed) || 1)} of {Math.max(1, Number(staffEvent.needed) || 1)} spots staffed</small>
            </div>
            <div className="event-staff-list">
              {staffCandidates.map((candidate) => {
                const assigned = (staffEvent.staffAssignments || []).includes(candidate.name);
                const full = Number(staffEvent.signed) >= Number(staffEvent.needed);
                return (
                  <div key={candidate.name} className="event-staff-row">
                    <div>
                      <strong>{candidate.name}</strong>
                      <span>{candidate.role} - {candidate.location}</span>
                    </div>
                    <button
                      type="button"
                      disabled={assigned || (!assigned && full)}
                      onClick={() => assignEventStaff(staffEvent.id, candidate.name, patchData)}
                    >
                      {assigned ? "Assigned" : "Assign"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {modalName === "guide" && (
          <>
            <TextInput label="Guide title" value={form.title} onChange={(value) => update("title", value)} />
            <TextInput label="Type" value={form.type} onChange={(value) => update("type", value)} />
            <LocationInput label="Location" value={form.locationId} onChange={(value) => update("locationId", value)} data={data} includeAll />
          </>
        )}
        {modalName === "request" && (
          <>
            <TextInput label="Employee" value={form.employee} onChange={(value) => update("employee", value)} disabled={role === "employee"} />
            <LocationInput label="Location" value={form.locationId} onChange={(value) => update("locationId", value)} data={data} />
            <TextInput label="Request type" value={form.type} onChange={(value) => update("type", value)} />
            <TextInput label="Date" value={form.date} onChange={(value) => update("date", value)} />
            <TextArea label="Reason" value={form.reason} onChange={(value) => update("reason", value)} />
          </>
        )}
        {modalName === "invite" && (
          <>
            <TextInput label="Full name" value={form.name} onChange={(value) => update("name", value)} />
            <TextInput label="Email" type="email" value={form.email} onChange={(value) => update("email", value)} />
            <div className="two-col">
              <SelectInput label="Account type" value={form.targetRole} onChange={(value) => update("targetRole", value)} options={inviteRoleOptions(role)} />
              <LocationInput label="Location" value={form.locationId} onChange={(value) => update("locationId", value)} data={data} />
            </div>
            <SelectInput label="Verification" value={form.verification} onChange={(value) => update("verification", value)} options={inviteVerificationOptions} />
            <TextArea label="Invite note" value={form.note} onChange={(value) => update("note", value)} />
            <div className="access-modal-note">
              <ShieldCheck size={17} weight="fill" />
              <span>The code is generated after saving. The person uses it with their email, password, and verification code.</span>
            </div>
          </>
        )}
        {modalName === "activate-account" && (
          <>
            <TextInput label="Invite code" value={form.code} onChange={(value) => update("code", value)} />
            <TextInput label="Full name" value={form.name} onChange={(value) => update("name", value)} />
            <TextInput label="Email" type="email" value={form.email} onChange={(value) => update("email", value)} />
            <TextInput label="Password" type="password" value={form.password} onChange={(value) => update("password", value)} />
            <TextInput label="Verification code" value={form.verificationCode} onChange={(value) => update("verificationCode", value)} />
            <div className="access-modal-note">
              <CheckCircle size={17} weight="fill" />
              <span>The invite code decides whether this account becomes a manager or employee account.</span>
            </div>
          </>
        )}
        {modalName === "settings-profile" && (
          <>
            <TextInput label="Legal business name" value={form.legalName} onChange={(value) => update("legalName", value)} />
            <TextInput label="Display name" value={form.displayName} onChange={(value) => update("displayName", value)} />
            <TextInput label="Business type" value={form.businessType} onChange={(value) => update("businessType", value)} />
            <TextInput label="Time zone" value={form.timeZone} onChange={(value) => update("timeZone", value)} />
            <div className="two-col">
              <TextInput label="Primary contact" value={form.primaryContact} onChange={(value) => update("primaryContact", value)} />
              <TextInput label="Tax ID" value={form.taxId} onChange={(value) => update("taxId", value)} />
            </div>
          </>
        )}
        {modalName === "settings-locations" && (
          <>
            <SelectInput label="Location setup" value={form.locationScope} onChange={(value) => update("locationScope", value)} options={[["multi", "Multiple locations"], ["single", "Single location"]]} />
            <LocationInput label="Primary location" value={form.primaryLocationId} onChange={(value) => update("primaryLocationId", value)} data={data} />
            <div className="settings-location-help">
              <MapPin size={17} weight="fill" />
              <span>Type any work area, team, route, client site, branch, or project. Custom entries are saved when used.</span>
            </div>
            <div className="settings-modal-list">
              {businessLocations(data).map((location) => (
                <button type="button" key={location.id} onClick={() => update("primaryLocationId", location.id)}>
                  <MapPin size={16} weight="fill" />
                  <span>{location.name}</span>
                  <strong>{location.id.startsWith("custom:") ? "Custom" : location.manager}</strong>
                </button>
              ))}
            </div>
          </>
        )}
        {modalName === "settings-hours" && (
          <>
            <TextInput label="Default weekly schedule" value={form.weeklySchedule} onChange={(value) => update("weeklySchedule", value)} />
            <NumberInput label="Overtime threshold" value={form.overtimeThreshold} max={168} onChange={(value) => update("overtimeThreshold", value)} />
            <SelectInput label="Payroll week starts" value={form.payrollWeekStarts} onChange={(value) => update("payrollWeekStarts", value)} options={[["Sunday", "Sunday"], ["Monday", "Monday"], ["Saturday", "Saturday"]]} />
            <SelectInput label="Time clock rounding" value={form.timeClockRounding} onChange={(value) => update("timeClockRounding", value)} options={[["None", "None"], ["5 minutes", "5 minutes"], ["10 minutes", "10 minutes"], ["15 minutes", "15 minutes"]]} />
          </>
        )}
        {modalName === "settings-rules" && (
          <>
            <SelectInput label="Management coverage" value={form.managerCoverage} onChange={(value) => update("managerCoverage", value)} options={[["managers", "Managers assigned"], ["owner", "Owner manages directly"]]} />
            <SelectInput label="Location setup" value={form.locationScope} onChange={(value) => update("locationScope", value)} options={[["multi", "Multiple locations"], ["single", "Single location"]]} />
            <LocationInput label="Primary location" value={form.primaryLocationId} onChange={(value) => update("primaryLocationId", value)} data={data} />
          </>
        )}
        {modalName === "settings-plan" && (
          <>
            <SelectInput label="Plan" value={form.plan} onChange={(value) => update("plan", value)} options={[["Weekly", "Weekly"], ["Monthly", "Monthly"], ["Yearly", "Yearly"]]} />
            <TextInput label="Renewal date" value={form.renewalDate} onChange={(value) => update("renewalDate", value)} />
            <TextInput label="Payment method" value={form.paymentMethod} onChange={(value) => update("paymentMethod", value)} />
          </>
        )}
        {modalName === "settings-seats" && (
          <>
            <NumberInput label="Seats used" value={form.seats} max={500} onChange={(value) => update("seats", value)} />
            <NumberInput label="Included seats" value={form.included} max={500} onChange={(value) => update("included", value)} />
          </>
        )}
        {modalName === "settings-invoice" && (
          <>
            <TextInput label="Name" value={form.name} onChange={(value) => update("name", value)} />
            <TextInput label="Email" value={form.email} onChange={(value) => update("email", value)} />
            <TextInput label="Phone" value={form.phone} onChange={(value) => update("phone", value)} />
            <TextArea label="Address" value={form.address} onChange={(value) => update("address", value)} />
          </>
        )}
        {modalName === "settings-security" && (
          <>
            <SelectInput label="Multi-factor authentication" value={form.mfa} onChange={(value) => update("mfa", value)} options={[["Enabled", "Enabled"], ["Required for owners", "Required for owners"], ["Disabled", "Disabled"]]} />
            <TextInput label="Password policy" value={form.passwordPolicy} onChange={(value) => update("passwordPolicy", value)} />
            <SelectInput label="Single sign-on" value={form.sso} onChange={(value) => update("sso", value)} options={[["Not configured", "Not configured"], ["Optional", "Optional"], ["Required", "Required"]]} />
            <TextInput label="Active sessions" value={form.activeSessions} onChange={(value) => update("activeSessions", value)} />
          </>
        )}
        {modalName === "settings-health" && (
          <div className="settings-modal-list">
            <div><CheckCircle size={18} weight="fill" /><span>System status</span><strong>Operational</strong></div>
            <div><Clock size={18} weight="fill" /><span>Last sync</span><strong>2 minutes ago</strong></div>
            <div><ShieldCheck size={18} weight="fill" /><span>Security checks</span><strong>Passing</strong></div>
          </div>
        )}
        {modalName === "settings-delete" && (
          <>
            <div className="danger-copy">
              <strong>Delete workspace is protected.</strong>
              <span>Type DELETE to record a deletion request. The prototype will not erase your app.</span>
            </div>
            <TextInput label="Confirmation" value={form.confirm} onChange={(value) => update("confirm", value)} />
          </>
        )}
        <div className="modal-actions">
          <button type="button" onClick={() => setModal(null)}>Cancel</button>
          <button type="submit">{modalSubmitLabel(modal)}</button>
        </div>
      </form>
    </div>
  );
}

function TextInput({ label, value, onChange, disabled, type = "text" }) {
  return (
    <label className="form-line">
      <span>{label}</span>
      <input aria-label={label} type={type} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} required />
    </label>
  );
}

function NumberInput({ label, value, onChange, min = 1, max = 24 }) {
  return (
    <label className="form-line">
      <span>{label}</span>
      <input aria-label={label} type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} required />
    </label>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="form-line">
      <span>{label}</span>
      <textarea aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} required />
    </label>
  );
}

function SelectInput({ label, value, onChange, options }) {
  return (
    <label className="form-line">
      <span>{label}</span>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
    </label>
  );
}

function modalKey(modal) {
  return typeof modal === "string" ? modal : modal?.type || "";
}

function modalMode(modal) {
  return typeof modal === "string" ? "create" : modal?.mode || "create";
}

function eventFormFromEvent(event) {
  return {
    title: event.title || "Team event",
    locationId: event.locationId || primaryLocationId(baseState),
    eventType: event.eventType || "training",
    date: event.date || formatDisplayDate(operationsToday),
    time: event.time || "10:00 AM",
    needed: Number(event.needed) || 1,
    roleNeeded: event.roleNeeded || "any",
    audience: event.audience || "scheduled",
    priority: event.priority || "normal",
    signupRule: event.signupRule || "manager-approval",
    repeat: event.repeat || "none",
    deadline: event.deadline || "",
    notes: event.notes || "",
  };
}

function defaultForm(modal, role, data = baseState, selectedDay = operationsToday) {
  const modalName = modalKey(modal);
  if (modalName === "event" && modalMode(modal) === "edit") return eventFormFromEvent(modal.values || {});

  const defaultLocation = primaryLocationId(data);
  const guideLocation = singleLocationMode(data) ? defaultLocation : "all";
  const setup = getBusinessSetup(data);
  const selectedDate = formatDisplayDate(selectedDay);
  const forms = {
    shift: { employee: "Open shift", locationId: defaultLocation, role: "Service", date: validDateKey(selectedDay) ? selectedDay : operationsToday, start: 12, end: 18, note: "New coverage need" },
    announcement: { title: "Team update", body: "Please review today's schedule before clocking in.", audience: "All teams" },
    event: {
      title: "Team training",
      locationId: defaultLocation,
      eventType: "training",
      date: selectedDate,
      time: "10:00 AM",
      needed: 5,
      roleNeeded: "any",
      audience: "scheduled",
      priority: "normal",
      signupRule: "manager-approval",
      repeat: "none",
      deadline: `${selectedDate}, 4:00 PM`,
      notes: "Add setup notes, coverage needs, or manager instructions.",
    },
    guide: { title: "New procedure", type: "Operations", locationId: guideLocation },
    request: { employee: role === "employee" ? "Ava Brooks" : "Team member", locationId: defaultLocation, type: "Time off", date: selectedDate, reason: "Add request reason." },
    invite: { name: "New team member", email: "newhire@greenviewcafe.com", targetRole: role === "manager" ? "employee" : "employee", locationId: defaultLocation, verification: "email-code", note: "Use this invite code to create your WorkForce account." },
    "activate-account": { code: "", name: "New team member", email: "newhire@greenviewcafe.com", password: "", verificationCode: "" },
    "settings-profile": getSettingsProfile(data),
    "settings-locations": { locationScope: setup.locationScope, primaryLocationId: setup.primaryLocationId },
    "settings-hours": getWorkspaceHours(data),
    "settings-rules": { managerCoverage: setup.managerCoverage, locationScope: setup.locationScope, primaryLocationId: setup.primaryLocationId },
    "settings-plan": { plan: data.billing.plan, renewalDate: "July 24, 2025", paymentMethod: "VISA .... 4242" },
    "settings-seats": { seats: data.billing.seats, included: data.billing.included },
    "settings-invoice": getInvoiceContact(data),
    "settings-security": getSecuritySettings(data),
    "settings-health": {},
    "settings-delete": { confirm: "" },
  };
  return forms[modalName] || {};
}

function modalTitle(modal) {
  const modalName = modalKey(modal);
  if (modalName === "event" && modalMode(modal) === "edit") return { eyebrow: "Events", title: "Edit Event" };

  const labels = {
    shift: { eyebrow: "Schedule", title: "Add Shift" },
    announcement: { eyebrow: "Team", title: "Post Announcement" },
    event: { eyebrow: "Events", title: "Create Event" },
    "event-staff": { eyebrow: "Events", title: "Manage Staff" },
    guide: { eyebrow: "Guide", title: "Add Guide Card" },
    request: { eyebrow: "Requests", title: "Create Request" },
    invite: { eyebrow: "Team Access", title: "Create Invite Code" },
    "activate-account": { eyebrow: "Team Access", title: "Activate Account" },
    "settings-profile": { eyebrow: "Settings", title: "Company Profile" },
    "settings-locations": { eyebrow: "Settings", title: "Manage Locations" },
    "settings-hours": { eyebrow: "Settings", title: "Business Hours" },
    "settings-rules": { eyebrow: "Settings", title: "Workspace Rules" },
    "settings-plan": { eyebrow: "Billing", title: "Manage Plan" },
    "settings-seats": { eyebrow: "Billing", title: "Manage Seats" },
    "settings-invoice": { eyebrow: "Billing", title: "Invoice Contact" },
    "settings-security": { eyebrow: "Security", title: "Manage Security" },
    "settings-health": { eyebrow: "Account Health", title: "System Status" },
    "settings-delete": { eyebrow: "Danger Zone", title: "Delete Workspace" },
  };
  return labels[modalName] || { eyebrow: "Action", title: "Update" };
}

function modalSubmitLabel(modal) {
  const modalName = modalKey(modal);
  if (modalName === "event" && modalMode(modal) === "edit") return "Save Event";
  if (modalName === "event-staff") return "Done";
  if (modalName === "invite") return "Create Invite";
  if (modalName === "activate-account") return "Activate Account";
  if (modalName === "settings-health") return "Done";
  if (modalName === "settings-delete") return "Confirm";
  if (modalName.startsWith("settings-")) return "Save Changes";
  return "Save";
}

function getMetrics(data, location) {
  const shifts = location === "all" ? data.shifts : data.shifts.filter((shift) => shift.locationId === location);
  const total = shifts.length;
  const open = shifts.filter((shift) => shift.status === "open").length;
  const covered = total - open;
  const hours = shifts.reduce((sum, shift) => sum + Math.max(0, shift.end - shift.start), 0);
  const pending = data.requests.filter((request) => request.status === "pending" && (location === "all" || request.locationId === location)).length;
  const guide = Math.round(data.guideCards.reduce((sum, card) => sum + card.completion, 0) / data.guideCards.length);
  return { total, open, covered, hours, pending, guide };
}

function formatHour(hour) {
  const normalized = ((Number(hour || 0) % 24) + 24) % 24;
  const whole = Math.floor(normalized);
  const minutes = Math.round((normalized - whole) * 60);
  const display = whole % 12 || 12;
  const suffix = whole >= 12 ? "PM" : "AM";
  return `${display}:${`${minutes}`.padStart(2, "0")} ${suffix}`;
}

function statusBadge(status, label = status) {
  return <span className={`status ${status}`}>{label}</span>;
}

function loadCommandReport() {
  try {
    const stored = JSON.parse(localStorage.getItem(commandReviewStorageKey));
    return stored && stored.runId ? stored : null;
  } catch {
    return null;
  }
}

function emptyCommandReport(runId = "no-run", createdAt = new Date().toISOString()) {
  return {
    runId,
    createdAt,
    summary: "No command review has run yet.",
    scores: { product: 0, design: 0, engineering: 0 },
    issues: [],
    tests: [],
    fixProposals: [],
  };
}

function commandAppSnapshot(data, metrics, role, location) {
  const setup = getBusinessSetup(data);
  return {
    role,
    location,
    activeBusinessId: getActiveBusinessId(data),
    businessSetup: setup,
    metrics,
    counts: {
      shifts: data.shifts.length,
      openShifts: data.shifts.filter((shift) => shift.status === "open").length,
      pendingRequests: data.requests.filter((request) => request.status === "pending").length,
      timeFlags: data.timeEntries.filter((entry) => entry.severity !== "approved").length,
      guideCards: data.guideCards.length,
    },
    scheduleOps: getScheduleOps(data),
    clock: data.timeClock,
    prototypeBoundary: "React localStorage prototype. Backend/service endpoints are local development only.",
  };
}

function commandLaneLabel(lane) {
  if (lane === "product") return "Product Manager";
  if (lane === "design") return "Designer";
  return "Engineer";
}

function commandLaneCards(report) {
  const lanes = [
    ["product", "Product Manager"],
    ["design", "Designer"],
    ["engineering", "Engineer"],
  ];
  return lanes.map(([id, title]) => {
    const laneIssues = (report?.issues || []).filter((issue) => issue.lane === id && issue.status !== "reviewed");
    const topIssue = laneIssues.find((issue) => ["critical", "high"].includes(issue.severity)) || laneIssues[0];
    const score = Math.round(report?.scores?.[id] || 0);
    return {
      id,
      title,
      score,
      state: laneIssues.length ? "warn" : "clear",
      badge: laneIssues.length ? `${laneIssues.length} flags` : "Clear",
      badgeState: laneIssues.length ? "pending" : "approved",
      action: topIssue?.title || (report ? "No open lane flags" : "Waiting for review"),
      detail: topIssue?.recommendation || (report ? "Reviewed items are clear or already marked reviewed." : "Run Whole App Review to load this lane."),
    };
  });
}

function issueStatusClass(status) {
  if (status === "reviewed") return "approved";
  if (status === "proposed") return "pending";
  return "pending";
}

function commandTestStatus(status) {
  if (status === "passed") return "approved";
  if (status === "failed") return "denied";
  return "pending";
}

function shortDateTime(value) {
  if (!value) return "None";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Recent";
  }
}

function mergeFixProposals(existing, incoming) {
  const byId = new Map();
  [...existing, ...incoming].forEach((proposal) => {
    const key = proposal.id || proposal.issueId || proposal.title;
    byId.set(key, proposal);
  });
  return Array.from(byId.values());
}

function timeClockLabel(status) {
  if (status === "working") return "Clocked in";
  if (status === "lunch") return "On lunch";
  return "Ready to clock in";
}

function fillFirstOpenShift(patchData, preferredShiftId = null, dateScope = null) {
  const scopedDates = Array.isArray(dateScope)
    ? dateScope.filter(validDateKey)
    : validDateKey(dateScope)
      ? [dateScope]
      : [];
  const matchesScope = (shift) => !scopedDates.length || scopedDates.includes(shiftDateKey(shift));
  patchData((data) => {
    const open = preferredShiftId
      ? data.shifts.find((shift) => shift.id === preferredShiftId && shift.status === "open" && matchesScope(shift))
      : data.shifts.find((shift) => shift.status === "open" && matchesScope(shift));
    if (!open) return data;
    return {
      ...data,
      shifts: data.shifts.map((shift) => shift.id === open.id ? { ...shift, status: "pending", employee: "Pending assignment" } : shift),
      scheduleOps: { ...getScheduleOps(data), coverageAsk: `${formatDisplayDate(shiftDateKey(open))} ${open.role} moved pending` },
    };
  }, scopedDates.length > 1 ? "First open shift in this range moved to pending assignment." : preferredShiftId ? "Selected open shift moved to pending assignment." : "First open shift moved to pending assignment.");
}

function scheduleStamp() {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function announcementThreadId(data) {
  return data.messages.some((message) => message.id === "m6") ? "m6" : "m4";
}

function announcementChatBody(announcement) {
  return `${announcement.title}: ${announcement.body}`;
}

function announcementFromChatText(text, sender) {
  const clean = text.trim();
  const [rawTitle, ...bodyParts] = clean.split(":");
  const hasBody = bodyParts.join(":").trim().length > 0;
  const title = hasBody ? rawTitle.trim() : clean.slice(0, 72);
  const body = hasBody ? bodyParts.join(":").trim() : clean;
  return {
    id: `a${Date.now()}`,
    title: title || "Team announcement",
    body: body || clean,
    audience: "All teams",
    createdBy: sender,
    urgent: /\burgent\b|\bimportant\b|\brequired\b/i.test(clean),
    source: "Team Announcements",
  };
}

function postAnnouncementToMessages(messages, announcement, sender, time) {
  const body = announcementChatBody(announcement);
  const entry = { id: `m6-${Date.now()}`, sender, time, body, mine: true };
  const hasAnnouncementThread = messages.some((message) => message.id === "m6");
  if (!hasAnnouncementThread) {
    return [{
      id: "m6",
      person: "Team Announcements",
      role: announcement.audience || "All teams",
      group: "Greenview Operations",
      initials: "TA",
      accent: "mint",
      time,
      text: announcement.title,
      unread: true,
      online: true,
      audience: "all",
      history: [entry],
    }, ...messages];
  }
  return messages.map((message) => {
    if (message.id !== "m6") return message;
    const history = message.history?.length ? message.history : [];
    return {
      ...message,
      role: announcement.audience || message.role,
      text: announcement.title,
      time,
      unread: true,
      history: [...history, entry],
    };
  });
}

function publishSchedule(patchData) {
  const time = scheduleStamp();
  const announcement = {
    id: `a${Date.now()}`,
    title: "Schedule published",
    body: "The latest schedule is published. Please review your shift and reply in chat if you see a conflict.",
    audience: "All teams",
    createdBy: "Manager",
    urgent: false,
  };
  patchData((data) => ({
    ...data,
    scheduleOps: { ...getScheduleOps(data), publishedAt: `Today ${time}` },
    announcements: [announcement, ...data.announcements],
    messages: postAnnouncementToMessages(data.messages, announcement, "Manager", time),
  }), "Schedule published to the team.");
}

function sendScheduleHandoff(openCount, pendingCount, patchData, context = {}) {
  const time = scheduleStamp();
  const dateInfo = selectedDateInfo(context.day || operationsToday);
  patchData((data) => ({
    ...data,
    scheduleOps: { ...getScheduleOps(data), handoffStatus: `Sent ${time}` },
    messages: postManagerHandoff(
      data.messages,
      `${dateInfo.label} ${context.location && context.location !== "all" ? `${locationName(context.location)} ` : ""}schedule handoff: ${openCount} open shifts, ${pendingCount} pending requests, review time entries before close.`,
      "Manager",
      time
    ),
  }), "Manager handoff sent.");
}

function sendScheduleRangeHandoff(dates, patchData) {
  const validDates = [...new Set((dates || []).filter(validDateKey))];
  if (!validDates.length) return;
  const time = scheduleStamp();
  patchData((data) => {
    const summary = scheduleRangeSummary(data.shifts, validDates);
    const savedDays = validDates.filter((date) => data.datePlans?.[date]).length;
    const emptyDays = summary.rows.filter((row) => !row.total).length;
    const firstDate = validDates[0];
    const lastDate = validDates[validDates.length - 1];
    const rangeLabel = validDates.length === 1 ? selectedDateInfo(firstDate).label : `${shortDisplayDate(firstDate)} - ${shortDisplayDate(lastDate)}`;
    const nextStep = summary.open
      ? `Fill ${summary.open} open shift${summary.open === 1 ? "" : "s"} before publishing.`
      : emptyDays
        ? `Build ${emptyDays} empty day${emptyDays === 1 ? "" : "s"} or copy the template.`
        : "Range is ready for final review.";
    const body = `${rangeLabel} schedule range: ${summary.total} shifts, ${summary.open} open, ${summary.pending} pending, ${formatHours(summary.hours)} scheduled, ${savedDays}/${validDates.length} day setups saved. ${nextStep}`;
    return {
      ...data,
      scheduleOps: { ...getScheduleOps(data), handoffStatus: `Range ${time}` },
      messages: postManagerHandoff(data.messages, body, "Schedule", time),
    };
  }, "Schedule range posted to Manager Handoff.");
}

function postManagerTeamPulseUpdate(patchData, context = {}) {
  const time = scheduleStamp();
  const selectedDate = validDateKey(context.day) ? context.day : operationsToday;
  const dateInfo = selectedDateInfo(selectedDate);
  const sender = context.sender || "Manager";
  patchData((data) => {
    const activeLocation = effectiveLocation(data, context.location || "all");
    const scopeLabel = activeLocation === "all" ? "all work areas" : locationName(activeLocation);
    const scopedShifts = data.shifts.filter((shift) => shiftDateKey(shift) === selectedDate && matchesActiveLocation(data, activeLocation, shift.locationId));
    const openShifts = scopedShifts.filter((shift) => shift.status === "open");
    const pendingRequests = data.requests.filter((request) => request.status === "pending" && requestAppliesToDate(request, selectedDate) && matchesActiveLocation(data, activeLocation, request.locationId));
    const timeFlags = data.timeEntries.filter((entry) => entry.severity !== "approved" && timeEntryDateKey(entry) === selectedDate && matchesActiveLocation(data, activeLocation, entry.locationId));
    const guide = [...data.guideCards]
      .filter((card) => activeLocation === "all" || card.locationId === "all" || card.locationId === activeLocation)
      .sort((a, b) => (a.completion || 0) - (b.completion || 0))[0];
    const nextStep = !scopedShifts.length
      ? `build ${dateInfo.label} schedule before asking the team`
      : openShifts.length
        ? `fill ${openShifts.length} open shift${openShifts.length === 1 ? "" : "s"}`
        : pendingRequests.length
          ? `clear ${pendingRequests.length} request${pendingRequests.length === 1 ? "" : "s"}`
          : timeFlags.length
            ? `review ${timeFlags.length} time flag${timeFlags.length === 1 ? "" : "s"}`
            : "monitor team replies";
    const body = `${dateInfo.label} team pulse for ${scopeLabel}: ${scopedShifts.length} shifts, ${openShifts.length} open, ${pendingRequests.length} pending requests, ${timeFlags.length} time flags. Guide focus: ${guide ? `${guide.title} at ${guide.completion}%` : "no guide cards yet"}. Next step: ${nextStep}.`;
    return {
      ...data,
      scheduleOps: { ...getScheduleOps(data), handoffStatus: `Team pulse ${time}` },
      messages: postManagerHandoff(data.messages, body, sender, time),
    };
  }, "Team pulse posted to Manager Handoff.");
}

function postManagerHandoff(messages, body, sender, time) {
  const entry = { id: `m2-${Date.now()}`, sender, time, body, mine: true };
  const hasThread = messages.some((message) => message.id === "m2");
  if (!hasThread) {
    return [{
      id: "m2",
      person: "Manager Handoff",
      role: "Greenview Operations",
      group: "Greenview Operations",
      initials: "GH",
      accent: "mint",
      time,
      text: body,
      unread: true,
      online: true,
      audience: "leadership",
      history: [entry],
    }, ...messages];
  }
  return messages.map((message) => {
    if (message.id !== "m2") return message;
    const history = message.history?.length ? message.history : [];
    return {
      ...message,
      text: body,
      time,
      unread: true,
      history: [...history, entry],
    };
  });
}

function postCoverageTeam(messages, body, sender, time) {
  const entry = { id: `m4-${Date.now()}`, sender, time, body, mine: true };
  const hasThread = messages.some((message) => message.id === "m4");
  if (!hasThread) {
    return [{
      id: "m4",
      person: "Coverage Team",
      role: "All locations",
      group: "Greenview Operations",
      initials: "CT",
      accent: "blue",
      time,
      text: body,
      unread: true,
      online: true,
      audience: "all",
      history: [entry],
    }, ...messages];
  }
  return messages.map((message) => {
    if (message.id !== "m4") return message;
    const history = message.history?.length ? message.history : [];
    return {
      ...message,
      text: body,
      time,
      unread: true,
      history: [...history, entry],
    };
  });
}

function toggleThreadPinned(id, patchData, isPinned) {
  patchData((data) => ({
    ...data,
    messages: data.messages.map((thread) => thread.id === id ? { ...thread, pinned: !isPinned } : thread),
  }), isPinned ? "Conversation unpinned." : "Conversation pinned.");
}

function setThreadUnread(id, unread, patchData) {
  patchData((data) => ({
    ...data,
    messages: data.messages.map((thread) => thread.id === id ? { ...thread, unread } : thread),
  }), unread ? "Conversation marked unread." : "Conversation marked read.");
}

function markThreadRead(id, patchData) {
  patchData((data) => ({
    ...data,
    messages: data.messages.map((thread) => thread.id === id && thread.unread ? { ...thread, unread: false } : thread),
  }));
}

function buildOwnerNextMove(data, shifts, metrics, location, day) {
  const activeLocation = effectiveLocation(data, location);
  const selectedDate = validDateKey(day) ? day : operationsToday;
  const dateInfo = selectedDateInfo(selectedDate);
  const scopeLabel = activeLocation === "all" ? "the business" : locationName(activeLocation);
  const dayShifts = shifts.filter((shift) => shiftDateKey(shift) === selectedDate);
  const openShift = dayShifts.find((shift) => shift.status === "open");
  const pendingRequests = data.requests.filter((request) => request.status === "pending" && requestAppliesToDate(request, selectedDate) && matchesActiveLocation(data, activeLocation, request.locationId));
  const leadRequest = pendingRequests[0];
  const timeFlags = data.timeEntries.filter((entry) => entry.severity !== "approved" && timeEntryDateKey(entry) === selectedDate && matchesActiveLocation(data, activeLocation, entry.locationId));
  const leadTimeFlag = timeFlags[0];
  const eventGaps = data.events
    .filter((event) => matchesActiveLocation(data, activeLocation, event.locationId))
    .map((event) => ({ ...event, gap: Math.max(0, Number(event.needed || 0) - Number(event.signed || 0)) }))
    .filter((event) => event.gap > 0);
  const leadEvent = eventGaps[0];
  const lowGuide = [...data.guideCards]
    .filter((card) => activeLocation === "all" || card.locationId === "all" || card.locationId === activeLocation)
    .sort((a, b) => (a.completion || 0) - (b.completion || 0))[0];

  if (!dayShifts.length) {
    const detail = `No shifts are planned for ${sentenceDateLabel(dateInfo)} in ${scopeLabel}.`;
    return {
      eyebrow: "Suggested next move",
      title: `Build ${dateInfo.label} schedule`,
      detail,
      handoffLine: `${detail} Build the day from a template or add dated shifts before sending the handoff.`,
      section: "owner-schedule",
      locationId: activeLocation,
      schedulePeriod: "day",
      scheduleDate: selectedDate,
      openLabel: "Schedule",
      icon: CalendarBlank,
      tone: "warn",
    };
  }

  if (openShift) {
    const detail = `${locationName(openShift.locationId)} needs ${openShift.role}, ${formatHour(openShift.start)} - ${formatHour(openShift.end)}.`;
    return {
      eyebrow: "Suggested next move",
      title: `Fill ${openShift.role} coverage`,
      detail,
      handoffLine: `${detail} Ask the manager to confirm who can take the shift before close.`,
      section: "owner-schedule",
      locationId: openShift.locationId,
      shiftId: openShift.id,
      schedulePeriod: "day",
      scheduleDate: selectedDate,
      openLabel: "Schedule",
      icon: CalendarBlank,
      tone: "urgent",
    };
  }

  if (leadRequest) {
    const detail = `${leadRequest.employee} has a ${leadRequest.type.toLowerCase()} request at ${locationName(leadRequest.locationId)}.`;
    return {
      eyebrow: "Suggested next move",
      title: "Clear request queue",
      detail,
      handoffLine: `${detail} Review the decision before manager handoff.`,
      section: "owner-requests",
      locationId: leadRequest.locationId,
      openLabel: "Requests",
      icon: ListChecks,
      tone: "warn",
    };
  }

  if (leadTimeFlag) {
    const detail = `${leadTimeFlag.employee} has ${leadTimeFlag.flag.toLowerCase()} at ${locationName(leadTimeFlag.locationId)}.`;
    return {
      eyebrow: "Suggested next move",
      title: "Review time exception",
      detail,
      handoffLine: `${detail} Keep changes inside the normal correction approval flow.`,
      section: "owner-time",
      locationId: leadTimeFlag.locationId,
      timeEntryId: leadTimeFlag.id,
      timeView: "exceptions",
      openLabel: "Time",
      icon: Clock,
      tone: "urgent",
    };
  }

  if (leadEvent) {
    const detail = `${leadEvent.title} needs ${leadEvent.gap} more team member${leadEvent.gap === 1 ? "" : "s"} at ${locationName(leadEvent.locationId)}.`;
    return {
      eyebrow: "Suggested next move",
      title: "Staff event gap",
      detail,
      handoffLine: `${detail} Confirm signups before the event deadline.`,
      section: "owner-events",
      locationId: leadEvent.locationId,
      eventId: leadEvent.id,
      openLabel: "Events",
      icon: MapPin,
      tone: "warn",
    };
  }

  if (lowGuide && lowGuide.completion < 90) {
    const detail = `${lowGuide.title} is ${lowGuide.completion}% complete for ${lowGuide.locationId === "all" ? "all locations" : locationName(lowGuide.locationId)}.`;
    return {
      eyebrow: "Suggested next move",
      title: "Tighten one guide",
      detail,
      handoffLine: `${detail} Ask the lead to add missing steps after the rush.`,
      section: "owner-guide",
      locationId: lowGuide.locationId,
      guideId: lowGuide.id,
      openLabel: "Guide",
      icon: BookOpenText,
      tone: "info",
    };
  }

  return {
    eyebrow: "Suggested next move",
    title: "Keep watch",
    detail: `${dateInfo.label} is clear for ${scopeLabel}: ${metrics.open} open shifts and ${metrics.pending} pending requests.`,
    handoffLine: `${dateInfo.label} is clear for ${scopeLabel}. Keep monitoring schedule changes and team messages.`,
    section: "owner-reports",
    locationId: activeLocation,
    reportType: "business",
    openLabel: "Reports",
    icon: CheckCircle,
    tone: "good",
  };
}

function sendDashboardActionPlan(day, location, patchData) {
  const time = scheduleStamp();
  const dateInfo = selectedDateInfo(day);
  patchData((data) => {
    const activeLocation = effectiveLocation(data, location);
    const scopedShifts = activeLocation === "all" ? data.shifts : data.shifts.filter((shift) => shift.locationId === activeLocation);
    const recommendation = buildOwnerNextMove(data, scopedShifts, getMetrics(data, activeLocation), activeLocation, day);
    const body = `${dateInfo.label} approved action plan: ${recommendation.title}. ${recommendation.handoffLine} This is a coordination plan; schedule, request, and time records still use their normal approvals.`;
    return {
      ...data,
      scheduleOps: { ...getScheduleOps(data), handoffStatus: `Action plan ${time}` },
      reportLog: [`Action plan approved at ${time}: ${recommendation.title}`, ...(data.reportLog || [])],
      messages: postManagerHandoff(data.messages, body, "Owner", time),
    };
  }, "Approved action plan sent to Manager Handoff.");
}

function sendDashboardHandoff(day, location, patchData) {
  const time = scheduleStamp();
  const selectedDate = validDateKey(day) ? day : operationsToday;
  const dateInfo = selectedDateInfo(selectedDate);
  patchData((data) => {
    const activeLocation = effectiveLocation(data, location);
    const pendingRequests = data.requests.filter((request) => request.status === "pending" && requestAppliesToDate(request, selectedDate) && (activeLocation === "all" || request.locationId === activeLocation)).length;
    const scopedShifts = activeLocation === "all" ? data.shifts : data.shifts.filter((shift) => shift.locationId === activeLocation);
    const dayShifts = scopedShifts.filter((shift) => shiftDateKey(shift) === selectedDate);
    const openShifts = dayShifts.filter((shift) => shift.status === "open");
    const openShift = openShifts[0];
    const timeFlags = data.timeEntries.filter((entry) => entry.severity !== "approved" && timeEntryDateKey(entry) === selectedDate && (activeLocation === "all" || entry.locationId === activeLocation)).length;
    const latestAnnouncement = data.announcements[0]?.title || "No announcement posted";
    const nextAction = !dayShifts.length
      ? `Start by building the ${sentenceDateLabel(dateInfo)} schedule.`
      : openShift
      ? `Start with ${locationName(openShift.locationId)} ${openShift.role} coverage.`
      : pendingRequests
        ? "Start with pending requests."
        : timeFlags
          ? "Start with time review."
          : "No urgent blocker is showing on the dashboard.";
    const body = `${dateInfo.label} dashboard handoff: ${openShifts.length} open shifts, ${pendingRequests} pending requests, ${timeFlags} time flags. ${nextAction} Latest announcement: ${latestAnnouncement}.`;
    return {
      ...data,
      scheduleOps: { ...getScheduleOps(data), handoffStatus: `Dashboard brief ${time}` },
      messages: postManagerHandoff(data.messages, body, "Owner", time),
    };
  }, "Dashboard handoff sent to Manager Handoff.");
}

function sendDashboardRiskBrief(day, location, patchData) {
  const time = scheduleStamp();
  const selectedDate = validDateKey(day) ? day : operationsToday;
  const dateInfo = selectedDateInfo(selectedDate);
  patchData((data) => {
    const activeLocation = effectiveLocation(data, location);
    const scopedShifts = activeLocation === "all" ? data.shifts : data.shifts.filter((shift) => shift.locationId === activeLocation);
    const pendingRequests = data.requests.filter((request) => request.status === "pending" && requestAppliesToDate(request, selectedDate) && (activeLocation === "all" || request.locationId === activeLocation)).length;
    const dayShifts = scopedShifts.filter((shift) => shiftDateKey(shift) === selectedDate);
    const openShifts = dayShifts.filter((shift) => shift.status === "open");
    const openShift = openShifts[0];
    const timeFlags = data.timeEntries.filter((entry) => entry.severity !== "approved" && timeEntryDateKey(entry) === selectedDate && (activeLocation === "all" || entry.locationId === activeLocation));
    const flaggedCost = timeFlags.reduce((sum, entry) => sum + entryLaborCost(entry), 0);
    const body = !dayShifts.length
      ? `${dateInfo.label} risk brief: no schedule is planned yet, ${pendingRequests} pending requests, ${timeFlags.length} time flags. Build the schedule before reviewing coverage risk. Flagged labor currently totals ${money(flaggedCost)}.`
      : openShift
        ? `${dateInfo.label} risk brief: ${openShifts.length} open shifts, ${pendingRequests} pending requests, ${timeFlags.length} time flags. Highest risk is ${locationName(openShift.locationId)} ${openShift.role}, ${formatHour(openShift.start)} - ${formatHour(openShift.end)}. Flagged labor currently totals ${money(flaggedCost)}.`
        : `${dateInfo.label} risk brief: coverage is clear, ${pendingRequests} pending requests, ${timeFlags.length} time flags. Flagged labor currently totals ${money(flaggedCost)}.`;
    return {
      ...data,
      scheduleOps: { ...getScheduleOps(data), riskCheck: `Dashboard risk ${time}` },
      messages: postManagerHandoff(data.messages, body, "Owner", time),
    };
  }, "Risk brief sent to Manager Handoff.");
}

function postTrainingQuestion(messages, body, sender, time) {
  const entry = { id: `m5-${Date.now()}`, sender, time, body, mine: true };
  const hasThread = messages.some((message) => message.id === "m5");
  if (!hasThread) {
    return [{
      id: "m5",
      person: "Training Questions",
      role: "Guide support",
      group: "Teams and channels",
      initials: "TQ",
      accent: "violet",
      time,
      text: body,
      unread: true,
      online: true,
      audience: "all",
      history: [entry],
    }, ...messages];
  }
  return messages.map((message) => {
    if (message.id !== "m5") return message;
    const history = message.history?.length ? message.history : [];
    return {
      ...message,
      text: body,
      time,
      unread: true,
      history: [...history, entry],
    };
  });
}

function sendDashboardGuideTip(day, location, patchData, sender = "Owner") {
  const time = scheduleStamp();
  const dateInfo = selectedDateInfo(day);
  patchData((data) => {
    const activeLocation = effectiveLocation(data, location);
    const relevantCards = data.guideCards.filter((card) => activeLocation === "all" || card.locationId === "all" || card.locationId === activeLocation);
    const card = [...(relevantCards.length ? relevantCards : data.guideCards)].sort((a, b) => (a.completion || 0) - (b.completion || 0))[0];
    const body = card
      ? `${dateInfo.label} guide tip: review "${card.title}" first. It is at ${card.completion}% completion and supports ${card.locationId === "all" ? "all locations" : locationName(card.locationId)}. Ask managers to add missing steps before close.`
      : `${dateInfo.label} guide tip: no guide cards are available yet. Create one for the highest-risk opening or closing checklist.`;
    return {
      ...data,
      reportLog: [`Guide tip generated at ${time}`, ...(data.reportLog || [])],
      messages: postTrainingQuestion(data.messages, body, sender, time),
    };
  }, "Guide tip sent to Training Questions.");
}

function sendDashboardEventSummary(day, location, patchData) {
  const time = scheduleStamp();
  const dateInfo = selectedDateInfo(day);
  patchData((data) => {
    const activeLocation = effectiveLocation(data, location);
    const visibleEvents = data.events.filter((event) => activeLocation === "all" || event.locationId === activeLocation);
    const eventGaps = visibleEvents
      .map((event) => ({ ...event, gap: Math.max(0, Number(event.needed || 0) - Number(event.signed || 0)) }))
      .filter((event) => event.gap > 0);
    const leadEvent = eventGaps[0];
    const body = leadEvent
      ? `${dateInfo.label} event summary: ${eventGaps.length} events need staffing. ${leadEvent.title} needs ${leadEvent.gap} more ${leadEvent.roleNeeded || "team"} support at ${locationName(leadEvent.locationId)} before ${leadEvent.deadline || "the deadline"}.`
      : `${dateInfo.label} event summary: no event staffing gaps in view. Keep signups monitored for schedule changes.`;
    return {
      ...data,
      scheduleOps: { ...getScheduleOps(data), handoffStatus: `Event summary ${time}` },
      messages: postManagerHandoff(data.messages, body, "Owner", time),
    };
  }, "Event staffing summary sent to Manager Handoff.");
}

function postEventStaffingReminder(eventId, patchData) {
  const time = scheduleStamp();
  patchData((data) => {
    const event = data.events.find((item) => item.id === eventId);
    if (!event) return data;
    const needed = Math.max(1, Number(event.needed) || 1);
    const signed = Math.min(Number(event.signed) || 0, needed);
    const gap = Math.max(0, needed - signed);
    const roleNeeded = optionLabel(eventRoleOptions, event.roleNeeded, "team");
    const announcement = {
      id: `a${Date.now()}`,
      title: `${event.title} staffing reminder`,
      body: gap
        ? `${locationName(event.locationId)} needs ${gap} more ${roleNeeded} support for ${event.title} on ${event.date} at ${event.time}.`
        : `${event.title} is fully staffed. Please watch for schedule changes before ${event.date}.`,
      audience: optionLabel(eventAudienceOptions, event.audience, "All team members"),
      createdBy: "Owner",
      urgent: gap > 0,
    };
    const handoff = gap
      ? `Event reminder posted: ${event.title} still needs ${gap} more ${roleNeeded} support at ${locationName(event.locationId)}.`
      : `Event reminder posted: ${event.title} is fully staffed; keep monitoring changes.`;
    return {
      ...data,
      announcements: [announcement, ...data.announcements],
      scheduleOps: { ...getScheduleOps(data), handoffStatus: `Event reminder ${time}` },
      messages: postManagerHandoff(
        postAnnouncementToMessages(data.messages, announcement, "Owner", time),
        handoff,
        "Owner",
        time
      ),
    };
  }, "Event staffing reminder posted.");
}

function sendDashboardAnnouncementUpdate(day, location, patchData, sender = "Owner") {
  const time = scheduleStamp();
  const selectedDate = validDateKey(day) ? day : operationsToday;
  const dateInfo = selectedDateInfo(selectedDate);
  patchData((data) => {
    const activeLocation = effectiveLocation(data, location);
    const latest = data.announcements[0];
    const scopeLabel = activeLocation === "all" ? "All work areas" : locationName(activeLocation);
    const title = `${dateInfo.label} team update`;
    const body = latest
      ? `${scopeLabel}: ${latest.title}. ${latest.body}`
      : `${scopeLabel}: check today's schedule, requests, and team chat before your shift.`;
    const announcement = {
      id: `a${Date.now()}`,
      title,
      body,
      audience: activeLocation === "all" ? "All teams" : `${scopeLabel} team`,
      createdBy: sender,
      urgent: Boolean(latest?.urgent),
      source: "Owner dashboard",
      date: selectedDate,
      locationId: activeLocation,
    };
    return {
      ...data,
      announcements: [announcement, ...data.announcements],
      reportLog: [`Team update shared at ${time}: ${title}`, ...(data.reportLog || [])],
      messages: postAnnouncementToMessages(data.messages, announcement, sender, time),
    };
  }, "Team update shared to Announcements.");
}

function runScheduleRiskCheck(openCount, pendingCount, patchData) {
  const time = scheduleStamp();
  const status = openCount || pendingCount ? `${openCount + pendingCount} items need review` : "Clear";
  patchData((data) => ({
    ...data,
    scheduleOps: { ...getScheduleOps(data), riskCheck: `${status} at ${time}` },
  }), "Schedule risk check updated.");
}

function requestCoverageSupport(patchData, context = {}) {
  const time = scheduleStamp();
  const selectedDate = validDateKey(context.day) ? context.day : operationsToday;
  const dateInfo = selectedDateInfo(selectedDate);
  const sender = context.sender || "Manager";
  patchData((data) => {
    const selectedShift = context.shiftId ? data.shifts.find((shift) => shift.id === context.shiftId) : null;
    const activeLocation = effectiveLocation(data, selectedShift?.locationId || context.location || "all");
    const scopedShifts = data.shifts.filter((shift) => (
      shift.status === "open" || shift.status === "pending"
    ) && shiftDateKey(shift) === selectedDate && matchesActiveLocation(data, activeLocation, shift.locationId));
    const firstGap = selectedShift || scopedShifts[0];
    const locationLabel = firstGap ? locationName(firstGap.locationId) : activeLocation === "all" ? "All locations" : locationName(activeLocation);
    const shiftDetail = firstGap
      ? firstGap.status === "covered"
        ? `${locationName(firstGap.locationId)} has ${firstGap.role}, ${formatHour(firstGap.start)} - ${formatHour(firstGap.end)}, covered by ${firstGap.employee}. Reply if you can be backup.`
        : `${locationName(firstGap.locationId)} needs ${firstGap.role}, ${formatHour(firstGap.start)} - ${formatHour(firstGap.end)}.`
      : "No open shift is currently selected, but managers should keep monitoring coverage.";
    const announcement = {
      id: `a${Date.now()}`,
      title: `${locationLabel} coverage help needed`,
      body: `${dateInfo.label}: ${shiftDetail} Please reply in Coverage Team if you can help.`,
      audience: firstGap || activeLocation !== "all" ? `${locationLabel} team` : "All teams",
      createdBy: sender,
      urgent: true,
    };
    return {
      ...data,
      scheduleOps: { ...getScheduleOps(data), coverageAsk: firstGap ? `${firstGap.role} ask ${time}` : `Posted ${time}` },
      announcements: [announcement, ...data.announcements],
      messages: postCoverageTeam(
        postAnnouncementToMessages(data.messages, announcement, sender, time),
        announcementChatBody(announcement),
        sender,
        time
      ),
    };
  }, "Coverage request posted to the team.");
}

function addShift(form, patchData) {
  const date = validDateKey(form.date) ? form.date : operationsToday;
  patchData((data) => ({
    ...appendAudit(data, {
      actor: "Owner or manager",
      action: "schedule.shift_created",
      target: `${form.employee} / ${date}`,
      detail: `${form.role} shift added for ${locationName(form.locationId)}.`,
    }),
    shifts: [{ id: `s${Date.now()}`, status: form.employee === "Open shift" ? "open" : "covered", ...form, date }, ...data.shifts],
  }), "Shift added to the schedule.");
}

function addOpenShiftForScheduleDay({ date, location, selectedShift, timelineBounds, data, patchData }) {
  const safeDate = validDateKey(date) ? date : operationsToday;
  const safeLocation = location && location !== "all" ? location : selectedShift?.locationId || primaryLocationId(data);
  const start = Number.isFinite(selectedShift?.start) ? selectedShift.start : Number.isFinite(timelineBounds?.start) ? timelineBounds.start : 9;
  const end = Number.isFinite(selectedShift?.end) && selectedShift.end > start ? selectedShift.end : Math.min(start + 4, Number.isFinite(timelineBounds?.end) ? timelineBounds.end : 17);
  const role = selectedShift?.status === "open" || selectedShift?.status === "pending" ? selectedShift.role : selectedShift?.role || "Service";
  patchData((current) => ({
    ...appendAudit(current, {
      actor: "Owner or manager",
      action: "schedule.open_shift_created",
      target: `${safeDate} / ${safeLocation}`,
      detail: `${role} open shift created for team claim.`,
    }),
    shifts: [{
      id: `s${Date.now()}`,
      employee: "Open shift",
      locationId: safeLocation,
      role,
      date: safeDate,
      start,
      end,
      note: "Claimable open work",
      status: "open",
    }, ...current.shifts],
  }), "Open shift added for the team to claim.");
}

function copyScheduleTemplate(sourceDate, targetDate, patchData) {
  if (!validDateKey(targetDate)) return;
  patchData((data) => {
    const sourceShifts = data.shifts.filter((shift) => shiftDateKey(shift) === sourceDate);
    if (!sourceShifts.length) return data;
    const stamp = Date.now();
    const existingTargetIds = new Set(data.shifts.filter((shift) => shiftDateKey(shift) === targetDate).map((shift) => `${shift.locationId}-${shift.role}-${shift.start}-${shift.end}`));
    const copies = sourceShifts
      .filter((shift) => !existingTargetIds.has(`${shift.locationId}-${shift.role}-${shift.start}-${shift.end}`))
      .map((shift, index) => ({
        ...shift,
        id: `s${stamp}-${index}`,
        date: targetDate,
        status: shift.status === "pending" ? "open" : shift.status,
        note: shift.note.includes("template") ? shift.note : `${shift.note} - template`,
      }));
    if (!copies.length) return data;
    const time = scheduleStamp();
    const sourcePlan = getDatePlan(data, sourceDate, data.shifts);
    const existingPlan = getDatePlan(data, targetDate, data.shifts);
    return {
      ...data,
      shifts: [...copies, ...data.shifts],
      datePlans: {
        ...(data.datePlans || {}),
        [targetDate]: {
          ...existingPlan,
          demand: sourcePlan.demand,
          staffTarget: Math.max(existingPlan.staffTarget, sourcePlan.staffTarget, copies.length, 1),
          leadRole: sourcePlan.leadRole,
          businessStart: sourcePlan.businessStart,
          businessEnd: sourcePlan.businessEnd,
          roleNeeds: sourcePlan.roleNeeds,
          requiredRoles: sourcePlan.requiredRoles,
          breakPlan: sourcePlan.breakPlan,
          arrivalWindow: sourcePlan.arrivalWindow,
          laborBudget: sourcePlan.laborBudget,
          lockTime: sourcePlan.lockTime,
          publishRule: sourcePlan.publishRule,
          repeatPattern: sourcePlan.repeatPattern,
          timeGranularity: sourcePlan.timeGranularity,
          coverageGoal: sourcePlan.coverageGoal,
          swapRule: sourcePlan.swapRule,
          label: formatDisplayDate(targetDate),
          status: "Template copied",
          preparedAt: existingPlan.preparedAt === "Not prepared" ? time : existingPlan.preparedAt,
          updatedAt: time,
          notes: `Template copied from ${formatDisplayDate(sourceDate)}. Review staffing target and lock time before publishing.`,
        },
      },
    };
  }, `${formatDisplayDate(targetDate)} schedule template added.`);
}

function prepareScheduleRange(dates, patchData) {
  const validDates = [...new Set((dates || []).filter(validDateKey))];
  if (!validDates.length) return;
  const time = scheduleStamp();
  patchData((data) => {
    const datePlans = { ...(data.datePlans || {}) };
    validDates.forEach((day) => {
      const currentPlan = getDatePlan(data, day, data.shifts);
      datePlans[day] = {
        ...currentPlan,
        label: formatDisplayDate(day),
        preparedAt: currentPlan.preparedAt === "Not prepared" ? time : currentPlan.preparedAt,
        updatedAt: time,
        status: currentPlan.status === "Draft" ? "Prepared" : currentPlan.status,
      };
    });
    return {
      ...data,
      datePlans,
      scheduleOps: { ...getScheduleOps(data), riskCheck: `${validDates.length} day range prepared ${time}` },
    };
  }, `${validDates.length} schedule day${validDates.length === 1 ? "" : "s"} prepared.`);
}

function copyScheduleTemplateToDates(sourceDate, targetDates, patchData) {
  const validTargets = [...new Set((targetDates || []).filter((date) => validDateKey(date) && date !== sourceDate))];
  if (!validDateKey(sourceDate) || !validTargets.length) return;
  patchData((data) => {
    const sourceShifts = data.shifts.filter((shift) => shiftDateKey(shift) === sourceDate);
    if (!sourceShifts.length) return data;
    const emptyTargets = validTargets.filter((date) => !data.shifts.some((shift) => shiftDateKey(shift) === date));
    if (!emptyTargets.length) return data;
    const stamp = Date.now();
    const copiedShifts = emptyTargets.flatMap((date, dateIndex) => sourceShifts.map((shift, shiftIndex) => ({
      ...shift,
      id: `s${stamp}-${dateIndex}-${shiftIndex}`,
      date,
      status: shift.status === "pending" ? "open" : shift.status,
      note: shift.note.includes("range template") ? shift.note : `${shift.note} - range template`,
    })));
    const time = scheduleStamp();
    const datePlans = { ...(data.datePlans || {}) };
    const sourcePlan = getDatePlan(data, sourceDate, data.shifts);
    emptyTargets.forEach((date) => {
      const currentPlan = getDatePlan(data, date, data.shifts);
      datePlans[date] = {
        ...currentPlan,
        demand: sourcePlan.demand,
        staffTarget: Math.max(currentPlan.staffTarget, sourcePlan.staffTarget, 1),
        leadRole: sourcePlan.leadRole,
        businessStart: sourcePlan.businessStart,
        businessEnd: sourcePlan.businessEnd,
        roleNeeds: sourcePlan.roleNeeds,
        requiredRoles: sourcePlan.requiredRoles,
        breakPlan: sourcePlan.breakPlan,
        arrivalWindow: sourcePlan.arrivalWindow,
        laborBudget: sourcePlan.laborBudget,
        lockTime: sourcePlan.lockTime,
        publishRule: sourcePlan.publishRule,
        repeatPattern: sourcePlan.repeatPattern,
        timeGranularity: sourcePlan.timeGranularity,
        coverageGoal: sourcePlan.coverageGoal,
        swapRule: sourcePlan.swapRule,
        label: formatDisplayDate(date),
        status: "Template copied",
        preparedAt: currentPlan.preparedAt === "Not prepared" ? time : currentPlan.preparedAt,
        updatedAt: time,
        notes: `Template copied from ${formatDisplayDate(sourceDate)}. Review hours, breaks, role needs, and staffing target before publishing.`,
      };
    });
    return {
      ...data,
      shifts: [...copiedShifts, ...data.shifts],
      datePlans,
      scheduleOps: { ...getScheduleOps(data), publishedAt: `${emptyTargets.length} empty days filled ${time}` },
    };
  }, "Empty schedule days filled from today's template.");
}

function candidateOptionsForShift(shift) {
  if (!shift) return [];
  const role = shift.role.toLowerCase();
  return coverageCandidates
    .filter((candidate) => candidate.name !== shift.employee)
    .map((candidate) => {
      const skillMatch = candidate.skills.some((skill) => role.includes(skill) || skill.includes(role.split(" ")[0]));
      const locationFit = candidate.homeLocationId === shift.locationId;
      const closeShiftFit = shift.end >= 18 && candidate.skills.includes("closer");
      const managerFit = role.includes("manager") && candidate.skills.includes("manager");
      const riskPenalty = candidate.risk === "Low" ? 0 : 7;
      const score = Math.min(98, 62 + (skillMatch ? 16 : 0) + (locationFit ? 12 : 0) + (closeShiftFit ? 8 : 0) + (managerFit ? 10 : 0) - riskPenalty);
      const reason = locationFit ? "Home location fit" : skillMatch ? "Role skill fit" : closeShiftFit ? "Closing fit" : "Backup option";
      return { ...candidate, score, reason };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

function assignShift(id, patchData) {
  assignShiftTo(id, "Ava Brooks", patchData);
}

function assignShiftTo(id, employee, patchData) {
  patchData((data) => ({
    ...data,
    shifts: data.shifts.map((shift) => {
      if (shift.id !== id) return shift;
      const note = shift.note.includes(`Assigned to ${employee}`) ? shift.note : `${shift.note} - Assigned to ${employee}`;
      return { ...shift, employee, status: "covered", note };
    }),
  }), `Shift assigned to ${employee}.`);
}

function assignShiftToCandidateFromSchedule(shift, candidate, patchData) {
  const time = scheduleStamp();
  const body = `Schedule assignment confirmed: ${candidate.name} is assigned to ${locationName(shift.locationId)} ${shift.role}, ${formatHour(shift.start)} - ${formatHour(shift.end)}.`;
  patchData((data) => ({
    ...data,
    scheduleOps: { ...getScheduleOps(data), coverageAsk: `Assigned ${candidate.name} ${time}` },
    shifts: data.shifts.map((item) => {
      if (item.id !== shift.id) return item;
      const note = item.note.includes(`Assigned to ${candidate.name}`) ? item.note : `${item.note} - Assigned to ${candidate.name}`;
      return { ...item, employee: candidate.name, status: "covered", note };
    }),
    messages: postCoverageTeam(data.messages, body, "Manager", time),
  }), `Shift assigned to ${candidate.name}.`);
}

function offerShiftToCandidate(shift, candidate, patchData) {
  const time = scheduleStamp();
  const needsCoverage = shift.status === "open" || shift.status === "pending";
  const requestType = needsCoverage ? "Coverage offer" : "Backup offer";
  const body = `${requestType} sent to ${candidate.name}: ${locationName(shift.locationId)} ${shift.role}, ${formatHour(shift.start)} - ${formatHour(shift.end)}.`;
  patchData((data) => ({
    ...data,
    scheduleOps: { ...getScheduleOps(data), coverageAsk: `Offered to ${candidate.name} ${time}` },
    shifts: data.shifts.map((item) => {
      if (item.id !== shift.id) return item;
      const offerNote = item.note.includes(`Offer sent to ${candidate.name}`) ? item.note : `${item.note} - Offer sent to ${candidate.name}`;
      return needsCoverage ? { ...item, status: "pending", employee: `Offer sent to ${candidate.name}`, note: offerNote } : { ...item, note: offerNote };
    }),
    requests: [{
      id: `r${Date.now()}`,
      employee: candidate.name,
      locationId: shift.locationId,
      type: requestType,
      date: "Today",
      status: "pending",
      reason: `${shift.role} shift from ${formatHour(shift.start)} to ${formatHour(shift.end)}. ${candidate.reason}.`,
    }, ...data.requests],
    messages: postCoverageTeam(data.messages, body, "Manager", time),
  }), `Coverage offer sent to ${candidate.name}.`);
}

function logBackupCandidate(id, employee, patchData) {
  patchData((data) => ({
    ...data,
    shifts: data.shifts.map((shift) => {
      if (shift.id !== id) return shift;
      const note = shift.note.includes(`Backup: ${employee}`) ? shift.note : `${shift.note} - Backup: ${employee}`;
      return { ...shift, note };
    }),
  }), `${employee} logged as backup.`);
}

function reviewShift(id, patchData) {
  patchData((data) => ({
    ...data,
    shifts: data.shifts.map((shift) => {
      if (shift.id !== id) return shift;
      const note = shift.note.includes("Manager reviewed") ? shift.note : `${shift.note} - Manager reviewed`;
      return { ...shift, note };
    }),
  }), "Manager review added to the shift.");
}

function claimShift(id, patchData) {
  patchData((data) => ({
    ...data,
    shifts: data.shifts.map((shift) => shift.id === id ? { ...shift, employee: "Ava Brooks", status: "pending" } : shift),
    requests: [{
      id: `r${Date.now()}`,
      employee: "Ava Brooks",
      locationId: data.shifts.find((shift) => shift.id === id)?.locationId || "downtown",
      type: "Open shift claim",
      date: selectedDateInfo(shiftDateKey(data.shifts.find((shift) => shift.id === id))).label,
      status: "pending",
      reason: "Employee requested to claim an open shift.",
    }, ...data.requests],
  }), "Shift claim sent for approval.");
}

function updateRequest(id, status, patchData) {
  patchData((data) => ({
    ...data,
    requests: data.requests.map((request) => request.id === id ? { ...request, status } : request),
  }), `Request ${status}.`);
}

function addRequest(form, patchData, role) {
  patchData((data) => ({
    ...data,
    requests: [{ id: `r${Date.now()}`, status: "pending", employee: role === "employee" ? "Ava Brooks" : form.employee, ...form }, ...data.requests],
  }), "Request submitted.");
}

function addAnnouncement(form, patchData, role) {
  const time = scheduleStamp();
  const announcement = { id: `a${Date.now()}`, createdBy: roleLabel(role), urgent: false, ...form };
  patchData((data) => ({
    ...data,
    announcements: [announcement, ...data.announcements],
    messages: postAnnouncementToMessages(data.messages, announcement, roleLabel(role), time),
  }), "Announcement posted.");
}

function inviteRoleOptions(role) {
  return role === "owner" ? [["employee", "Employee"], ["manager", "Manager"]] : [["employee", "Employee"]];
}

function makeInviteCode(targetRole) {
  const prefix = targetRole === "manager" ? "MGR" : "EMP";
  return `GV-${prefix}-${inviteCodeParts(secureRandomToken(12))}`;
}

function createTeamInvite(form, role, patchData) {
  const targetRole = role === "manager" ? "employee" : form.targetRole;
  const code = makeInviteCode(targetRole);
  const name = form.name.trim() || "New team member";
  const email = form.email.trim().toLowerCase();
  patchData((data) => ({
    ...appendAudit(data, {
      actor: roleLabel(role),
      action: "invite.created",
      target: email || name,
      detail: `${roleLabel(targetRole)} invite created for ${locationName(form.locationId)}.`,
    }),
    teamInvites: [{
      id: `inv${Date.now()}`,
      code,
      codeFingerprint: normalizeAccessCode(code).slice(-6),
      name,
      email,
      targetRole,
      locationId: form.locationId,
      status: "pending",
      invitedBy: roleLabel(role),
      verification: optionLabel(inviteVerificationOptions, form.verification, "Email code"),
      createdAt: "Just now",
      expires: "7 days",
      expiresAt: inviteExpiresAt(),
      maxAttempts: maxInviteAttempts,
      attempts: 0,
      note: form.note,
    }, ...getTeamInvites(data)],
  }), `${roleLabel(targetRole)} invite code ${code} created.`);
  return true;
}

function activateTeamAccount(form, data, patchData) {
  const code = normalizeAccessCode(form.code);
  const email = form.email.trim().toLowerCase();
  const attempt = attemptBucket(inviteAttemptStorageKey, inviteAttemptKey(code, email), maxInviteAttempts, inviteAttemptWindowMs);
  if (!attempt.ok) {
    patchData((current) => appendAudit(current, {
      actor: email || "Unknown",
      action: "invite.blocked",
      target: code.slice(-6) || "unknown",
      detail: `Invite activation throttled for about ${attempt.retryAfterMinutes} minutes.`,
    }), `Too many invite attempts. Try again in about ${attempt.retryAfterMinutes} minutes.`);
    return false;
  }
  const invite = getTeamInvites(data).find((item) => normalizeAccessCode(item.code) === code);
  const status = inviteStatus(invite);
  if (status !== "pending") {
    patchData((current) => current, "Invite code is not active.");
    return false;
  }
  if (!emailMatchesInvite(invite, email)) {
    patchData((current) => appendAudit(current, {
      actor: email || "Unknown",
      action: "invite.email_mismatch",
      target: invite.codeFingerprint || normalizeAccessCode(invite.code).slice(-6),
      detail: "Invite activation blocked because the email did not match the invite.",
    }), "This invite is tied to a different email.");
    return false;
  }
  if ((form.password || "").length < 8) {
    patchData((current) => current, "Password needs at least 8 characters.");
    return false;
  }
  if ((form.verificationCode || "").trim().length < 6) {
    patchData((current) => current, "Verification code needs 6 digits.");
    return false;
  }
  const name = form.name.trim() || invite.name;
  const account = {
    id: `acct${Date.now()}`,
    name,
    email,
    role: invite.targetRole,
    locationId: invite.locationId,
    status: "active",
    verified: true,
    createdAt: "Just now",
    invitedBy: invite.invitedBy,
    passwordSet: true,
  };
  patchData((current) => ({
    ...appendAudit(current, {
      actor: email,
      action: "invite.accepted",
      target: invite.codeFingerprint || normalizeAccessCode(invite.code).slice(-6),
      detail: `${roleLabel(invite.targetRole)} account activated for ${name}.`,
    }),
    teamInvites: getTeamInvites(current).map((item) => (
      item.id === invite.id || normalizeAccessCode(item.code) === normalizeAccessCode(invite.code)
        ? { ...item, status: "accepted", expires: "Used", acceptedBy: email, acceptedAt: new Date().toISOString(), attempts: Number(item.attempts || 0) + 1 }
        : item
    )),
    teamAccounts: [account, ...getTeamAccounts(current).filter((item) => item.email.toLowerCase() !== email.toLowerCase())],
  }), `${roleLabel(invite.targetRole)} account activated for ${name}.`);
  return true;
}

function cancelInvite(id, patchData) {
  patchData((data) => ({
    ...appendAudit(data, {
      actor: "Owner or manager",
      action: "invite.canceled",
      target: id,
      detail: "Invite code canceled before activation.",
    }),
    teamInvites: getTeamInvites(data).map((invite) => invite.id === id ? { ...invite, status: "canceled", expires: "Canceled" } : invite),
  }), "Invite code canceled.");
}

function addEvent(form, patchData) {
  const needed = Math.max(1, Number(form.needed) || 1);
  patchData((data) => ({
    ...appendAudit(data, {
      actor: "Owner",
      action: "event.created",
      target: form.title,
      detail: `${form.title} created for ${locationName(form.locationId)}.`,
    }),
    events: [{ id: `e${Date.now()}`, signed: 0, ...form, needed }, ...data.events],
  }), "Event created.");
}

function updateEvent(id, form, patchData) {
  const needed = Math.max(1, Number(form.needed) || 1);
  patchData((data) => ({
    ...appendAudit(data, {
      actor: "Owner",
      action: "event.updated",
      target: id,
      detail: `${form.title} updated.`,
    }),
    events: data.events.map((event) => (
      event.id === id
        ? { ...event, ...form, needed, signed: Math.min(Number(event.signed) || 0, needed) }
        : event
    )),
  }), "Event updated.");
}

function deleteEvent(id, patchData) {
  patchData((data) => ({
    ...appendAudit(data, {
      actor: "Owner",
      action: "event.deleted",
      target: id,
      detail: "Event removed from active board.",
    }),
    events: data.events.filter((event) => event.id !== id),
    deletedEvents: [
      ...data.events.filter((event) => event.id === id).map((event) => ({ ...event, deletedAt: new Date().toISOString(), status: "deleted" })),
      ...(Array.isArray(data.deletedEvents) ? data.deletedEvents : []),
    ].slice(0, 50),
  }), "Event deleted.");
}

function duplicateEvent(id, patchData) {
  patchData((data) => ({
    ...data,
    events: data.events.flatMap((event) => event.id === id
      ? [
          event,
          {
            ...event,
            id: `e${Date.now()}`,
            title: `${event.title} copy`,
            signed: 0,
            staffAssignments: [],
          },
        ]
      : [event]),
  }), "Event duplicated.");
}

function getEventById(data, id) {
  return data.events.find((event) => event.id === id);
}

function eventStaffProgress(event) {
  const needed = Math.max(1, Number(event.needed) || 1);
  const signed = Math.min(Number(event.signed) || 0, needed);
  return Math.round((signed / needed) * 100);
}

function eventStaffCandidates(event, data) {
  const candidates = new Map();
  data.shifts
    .filter((shift) => shift.employee && shift.employee !== "Open shift")
    .forEach((shift) => {
      if (!candidates.has(shift.employee)) {
        candidates.set(shift.employee, {
          name: shift.employee,
          role: shift.role,
          location: locationName(shift.locationId),
          locationId: shift.locationId,
          sameLocation: event.locationId === "all" || shift.locationId === event.locationId,
        });
      }
    });
  return Array.from(candidates.values())
    .sort((a, b) => Number(b.sameLocation) - Number(a.sameLocation) || a.name.localeCompare(b.name))
    .slice(0, 5);
}

function assignEventStaff(id, employee, patchData) {
  patchData((data) => ({
    ...appendAudit(data, {
      actor: "Owner or manager",
      action: "event.staff_assigned",
      target: id,
      detail: `${employee} assigned to event.`,
    }),
    events: data.events.map((event) => {
      if (event.id !== id) return event;
      const assignments = event.staffAssignments || [];
      const needed = Math.max(1, Number(event.needed) || 1);
      const signed = Math.min(Number(event.signed) || 0, needed);
      if (assignments.includes(employee) || signed >= needed) return event;
      return {
        ...event,
        signed: signed + 1,
        staffAssignments: [...assignments, employee],
      };
    }),
  }), `${employee} assigned to event.`);
}

function prepareDatePlan(day, patchData) {
  if (!validDateKey(day)) return;
  const time = scheduleStamp();
  patchData((data) => {
    const currentPlan = getDatePlan(data, day, data.shifts);
    return {
      ...data,
      datePlans: {
        ...(data.datePlans || {}),
        [day]: {
          ...currentPlan,
          label: formatDisplayDate(day),
          preparedAt: currentPlan.preparedAt === "Not prepared" ? time : currentPlan.preparedAt,
          updatedAt: time,
          status: "Prepared",
        },
      },
    };
  }, `${formatDisplayDate(day)} plan prepared.`);
}

function updateScheduleDayPlan(day, form, patchData) {
  if (!validDateKey(day)) return;
  const time = scheduleStamp();
  patchData((data) => {
    const currentPlan = getDatePlan(data, day, data.shifts);
    return {
      ...data,
      datePlans: {
        ...(data.datePlans || {}),
        [day]: {
          ...currentPlan,
          ...form,
          label: formatDisplayDate(day),
          staffTarget: Math.max(currentPlan.staffTarget, Number(form.staffTarget) || 0, 1),
          businessStart: form.businessStart || currentPlan.businessStart,
          businessEnd: form.businessEnd || currentPlan.businessEnd,
          roleNeeds: form.roleNeeds || currentPlan.roleNeeds,
          requiredRoles: form.requiredRoles || currentPlan.requiredRoles,
          breakPlan: form.breakPlan || currentPlan.breakPlan,
          arrivalWindow: form.arrivalWindow || currentPlan.arrivalWindow,
          laborBudget: Math.max(0, Number(form.laborBudget) || currentPlan.laborBudget || 0),
          status: "Customized",
          publishRule: form.publishRule || currentPlan.publishRule,
          repeatPattern: form.repeatPattern || currentPlan.repeatPattern,
          timeGranularity: form.timeGranularity || currentPlan.timeGranularity,
          coverageGoal: form.coverageGoal || currentPlan.coverageGoal,
          swapRule: form.swapRule || currentPlan.swapRule,
          preparedAt: currentPlan.preparedAt === "Not prepared" ? time : currentPlan.preparedAt,
          updatedAt: time,
        },
      },
      scheduleOps: { ...getScheduleOps(data), riskCheck: `Day setup ${time}` },
    };
  }, `${formatDisplayDate(day)} setup saved.`);
}

function applyScheduleDayPlanToDates(sourceDay, form, targetDates, patchData) {
  const validTargets = [...new Set((targetDates || []).filter(validDateKey))];
  if (!validDateKey(sourceDay) || !validTargets.length) return;
  const time = scheduleStamp();
  patchData((data) => {
    const sourcePlan = getDatePlan(data, sourceDay, data.shifts);
    const datePlans = { ...(data.datePlans || {}) };
    validTargets.forEach((day) => {
      const currentPlan = getDatePlan(data, day, data.shifts);
      datePlans[day] = {
        ...currentPlan,
        ...sourcePlan,
        ...form,
        label: formatDisplayDate(day),
        staffTarget: Math.max(currentPlan.staffTarget, Number(form.staffTarget) || sourcePlan.staffTarget || 0, 1),
        businessStart: form.businessStart || sourcePlan.businessStart || currentPlan.businessStart,
        businessEnd: form.businessEnd || sourcePlan.businessEnd || currentPlan.businessEnd,
        roleNeeds: form.roleNeeds || sourcePlan.roleNeeds || currentPlan.roleNeeds,
        requiredRoles: form.requiredRoles || sourcePlan.requiredRoles || currentPlan.requiredRoles,
        breakPlan: form.breakPlan || sourcePlan.breakPlan || currentPlan.breakPlan,
        arrivalWindow: form.arrivalWindow || sourcePlan.arrivalWindow || currentPlan.arrivalWindow,
        laborBudget: Math.max(0, Number(form.laborBudget) || sourcePlan.laborBudget || currentPlan.laborBudget || 0),
        lockTime: form.lockTime || sourcePlan.lockTime || currentPlan.lockTime,
        publishRule: form.publishRule || sourcePlan.publishRule || currentPlan.publishRule,
        repeatPattern: form.repeatPattern || sourcePlan.repeatPattern || currentPlan.repeatPattern,
        timeGranularity: form.timeGranularity || sourcePlan.timeGranularity || currentPlan.timeGranularity,
        coverageGoal: form.coverageGoal || sourcePlan.coverageGoal || currentPlan.coverageGoal,
        swapRule: form.swapRule || sourcePlan.swapRule || currentPlan.swapRule,
        notes: form.notes || sourcePlan.notes || currentPlan.notes,
        status: "Customized",
        preparedAt: currentPlan.preparedAt === "Not prepared" ? time : currentPlan.preparedAt,
        updatedAt: time,
      };
    });
    return {
      ...data,
      datePlans,
      scheduleOps: { ...getScheduleOps(data), riskCheck: `${validTargets.length} day setup applied ${time}` },
    };
  }, `Setup applied to ${validTargets.length} schedule day${validTargets.length === 1 ? "" : "s"}.`);
}

function sendDatePlanHandoff(day, form, patchData) {
  if (!validDateKey(day)) return;
  const time = scheduleStamp();
  const label = formatDisplayDate(day);
  patchData((data) => {
    const currentPlan = getDatePlan(data, day, data.shifts);
    const staffTarget = Math.max(currentPlan.staffTarget, Number(form.staffTarget) || 0, 1);
    const laborBudget = Math.max(0, Number(form.laborBudget) || currentPlan.laborBudget || 0);
    const body = `${label} setup: ${form.demand || "Normal"} demand, ${form.businessStart || "6:00 AM"}-${form.businessEnd || "10:00 PM"}, target ${staffTarget} staff, lead ${form.leadRole || "Manager or lead"}, labor budget ${money(laborBudget)}, lock ${form.lockTime || "4:00 PM day before"}. Required roles: ${form.requiredRoles || "Review roles"}. Role needs: ${form.roleNeeds || "Review role needs"}. Time blocks: ${form.timeGranularity || "15 minute blocks"}. Coverage goal: ${form.coverageGoal || "Every role has a named owner"}. Swap rule: ${form.swapRule || "Manager approval before changes are final"}. Arrival: ${form.arrivalWindow || "At shift start"}. Publish rule: ${form.publishRule || "Publish when ready"}. Repeat: ${form.repeatPattern || "One time"}. Breaks: ${form.breakPlan || "Stagger breaks"}. ${form.notes || "No notes added."}`;
    return {
      ...data,
      datePlans: {
        ...(data.datePlans || {}),
        [day]: {
          ...currentPlan,
          ...form,
          label,
          staffTarget,
          businessStart: form.businessStart || "6:00 AM",
          businessEnd: form.businessEnd || "10:00 PM",
          roleNeeds: form.roleNeeds || "Review role needs",
          requiredRoles: form.requiredRoles || "Review roles",
          breakPlan: form.breakPlan || "Stagger breaks",
          arrivalWindow: form.arrivalWindow || "At shift start",
          laborBudget,
          publishRule: form.publishRule || "Publish when ready",
          repeatPattern: form.repeatPattern || "One time",
          timeGranularity: form.timeGranularity || "15 minute blocks",
          coverageGoal: form.coverageGoal || "Every role has a named owner",
          swapRule: form.swapRule || "Manager approval before changes are final",
          status: "Shared to handoff",
          updatedAt: time,
        },
      },
      scheduleOps: { ...getScheduleOps(data), handoffStatus: `Day setup ${time}` },
      messages: data.messages.map((message) => message.id === "m2"
        ? {
          ...message,
          text: body,
          unread: true,
          time,
          history: [
            ...(message.history || []),
            { id: `m2-plan-${Date.now()}`, sender: "Schedule", time, body, mine: true },
          ],
        }
        : message),
    };
  }, `${label} setup posted to Manager Handoff.`);
}

function addGuide(form, patchData) {
  patchData((data) => ({
    ...data,
    guideCards: [{ id: `g${Date.now()}`, completion: 0, ...form }, ...data.guideCards],
  }), "Guide card added.");
}

function removeGuide(id, patchData) {
  patchData((data) => ({
    ...data,
    guideCards: data.guideCards.filter((card) => card.id !== id),
  }), "Guide card removed.");
}

function toggleGuide(id, patchData) {
  patchData((data) => {
    const done = data.completedGuideIds.includes(id);
    return {
      ...data,
      completedGuideIds: done ? data.completedGuideIds.filter((item) => item !== id) : [...data.completedGuideIds, id],
    };
  }, "Guide progress updated.");
}

function verifyPunchPin(pin, patchData) {
  patchData((data) => ({
    ...data,
    timeClock: {
      ...defaultTimeClock,
      ...(data.timeClock || {}),
      authMethod: "PIN verified",
      lastPunch: "PIN verified at 6:54 AM",
    },
  }), pin.length === 4 ? "PIN verified for this punch." : "PIN check marked for demo.");
}

function punchClock(action, patchData) {
  const states = {
    "clock-in": {
      clockedIn: true,
      clock: { status: "working", lunchStatus: "Not started", lastPunch: "Clocked in at 6:58 AM", authMethod: "Location + button" },
      entry: { status: "Working", duration: "0h 00m", workedHours: 0, flag: "Location verified", severity: "approved", source: "Geofence + button" },
      message: "Clocked in. Location verified.",
    },
    "clock-out": {
      clockedIn: false,
      clock: { status: "off", lunchStatus: "Completed", lastPunch: "Clocked out at 3:02 PM", authMethod: "Location + button" },
      entry: { status: "Clocked out", duration: "8h 04m", workedHours: 8.07, flag: "Ready for payroll", severity: "approved", source: "Geofence + button" },
      message: "Clocked out. Time entry saved.",
    },
    "start-lunch": {
      clockedIn: true,
      clock: { status: "lunch", lunchStatus: "Started at 12:03 PM", lastPunch: "Lunch started at 12:03 PM", authMethod: "Location + button" },
      entry: { status: "Lunch", duration: "4h 58m", workedHours: 4.97, flag: "Lunch active", severity: "pending", source: "Employee punch" },
      message: "Lunch started.",
    },
    "end-lunch": {
      clockedIn: true,
      clock: { status: "working", lunchStatus: "Ended at 12:33 PM", lastPunch: "Lunch ended at 12:33 PM", authMethod: "Location + button" },
      entry: { status: "Working", duration: "5h 28m", workedHours: 5.47, flag: "Lunch completed", severity: "approved", source: "Employee punch" },
      message: "Lunch ended. Shift resumed.",
    },
  };
  const next = states[action];
  if (!next) return;
  patchData((data) => ({
    ...appendAudit(data, {
      actor: "Ava Brooks",
      action: `time.${action}`,
      target: operationsToday,
      detail: next.message,
    }),
    clockedIn: next.clockedIn,
    timeClock: {
      ...defaultTimeClock,
      ...(data.timeClock || {}),
      ...next.clock,
      authMethod: action === "clock-in" && data.timeClock?.authMethod === "PIN verified" ? "PIN verified + location" : next.clock.authMethod,
    },
    timeEntries: data.timeEntries.map((entry) => entry.employee === "Ava Brooks" ? { ...entry, ...next.entry, date: operationsToday } : entry),
  }), next.message);
}

function sendNearWorkNote(patchData) {
  patchData((data) => ({
    ...data,
    timeClock: {
      ...defaultTimeClock,
      ...(data.timeClock || {}),
      nearWorkNote: "Sent to manager",
      lastPunch: "Almost there note sent at 6:48 AM",
    },
    timeEntries: data.timeEntries.map((entry) => entry.employee === "Ava Brooks" ? { ...entry, status: "Near work", workedHours: 0, flag: "Almost there note sent", severity: "pending", source: "Employee note", date: operationsToday } : entry),
  }), "Almost there note sent to the manager.");
}

function updateHourlyRate(id, value, patchData) {
  const hourlyRate = Math.max(0, Number(value || 0));
  patchData((data) => ({
    ...appendAudit(data, {
      actor: "Owner or authorized manager",
      action: "pay.hourly_rate_updated",
      target: id,
      detail: `Hourly rate set to ${rateMoney(hourlyRate)}.`,
    }),
    timeEntries: data.timeEntries.map((entry) => entry.id === id ? { ...entry, hourlyRate } : entry),
  }), "Hourly rate updated.");
}

function approveTime(id, patchData) {
  patchData((data) => ({
    ...appendAudit(data, {
      actor: "Owner or manager",
      action: "time.approved",
      target: id,
      detail: "Time entry approved.",
    }),
    timeEntries: data.timeEntries.map((entry) => entry.id === id ? { ...entry, flag: "Approved", status: "Approved", severity: "approved" } : entry),
  }), "Time entry approved.");
}

function requestTimeCorrection(id, patchData) {
  patchData((data) => ({
    ...appendAudit(data, {
      actor: "Owner or manager",
      action: "time.correction_requested",
      target: id,
      detail: "Employee time correction requested.",
    }),
    timeEntries: data.timeEntries.map((entry) => entry.id === id ? { ...entry, flag: "Correction requested", status: "Employee follow-up", severity: "pending" } : entry),
  }), "Correction request sent to employee.");
}

function ownerReviewTime(id, patchData) {
  patchData((data) => ({
    ...appendAudit(data, {
      actor: "Owner",
      action: "time.owner_reviewed",
      target: id,
      detail: "Owner review logged.",
    }),
    timeEntries: data.timeEntries.map((entry) => entry.id === id ? { ...entry, flag: "Owner reviewed", status: "Audit logged", severity: "approved" } : entry),
  }), "Owner review logged.");
}

function sendMessage(id, text, patchData, toastMessage, sender = "You") {
  const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  patchData((data) => {
    if (id === "m6") {
      const announcement = announcementFromChatText(text, sender);
      return {
        ...data,
        announcements: [announcement, ...data.announcements],
        messages: postAnnouncementToMessages(data.messages, announcement, sender, time),
      };
    }
    return {
      ...data,
      messages: data.messages.map((thread) => {
        if (thread.id !== id) return thread;
        const history = thread.history?.length ? thread.history : [
          { id: `${id}-seed`, sender: thread.person, time: thread.time || "Now", body: thread.text, mine: false },
        ];
        return {
          ...thread,
          text,
          time,
          unread: false,
          history: [...history, { id: `${id}-${Date.now()}`, sender, time, body: text, mine: true }],
        };
      }),
    };
  }, toastMessage || (id === "m6" ? "Announcement posted to the team." : "Message sent."));
}

function updateBilling(update, patchData) {
  patchData((data) => ({
    ...appendAudit(data, {
      actor: "Owner",
      action: "billing.updated",
      target: "workspace billing",
      detail: Object.keys(update).join(", ") || "Billing update",
    }),
    billing: { ...data.billing, ...update },
  }), "Billing estimate updated.");
}

function switchBusinessWorkspace(id, patchData, setLocation) {
  const nextBusinessId = businessWorkspaces[id] ? id : "greenview";
  const workspace = businessWorkspaces[nextBusinessId];
  const nextSetup = { ...defaultBusinessSetup, ...workspace.setup };
  setLocation?.(nextSetup.locationScope === "single" ? nextSetup.primaryLocationId : "all");
  patchData((data) => {
    return applyBusinessSetup({
      ...data,
      activeBusinessId: nextBusinessId,
      settingsProfile: workspace.profile,
      invoiceContact: workspace.invoiceContact,
      workspaceHours: workspace.hours,
      billing: workspace.billing,
      announcements: [{ id: `${nextBusinessId}-announcement`, ...workspace.announcement }, ...data.announcements.filter((item) => !String(item.id).endsWith("-announcement"))],
      scheduleOps: { ...defaultScheduleOps },
    }, nextSetup);
  }, `${workspace.label} workspace loaded.`);
}

function applyBusinessSetup(data, nextSetup) {
  const primaryLocation = nextSetup.primaryLocationId;
  const shouldSavePrimary = primaryLocation && primaryLocation !== "all" && !locations.some((location) => location.id === primaryLocation);
  const savedLocations = getSavedLocations(data);
  const nextSavedLocations = shouldSavePrimary && !savedLocations.some((location) => location.id === primaryLocation)
    ? [...savedLocations, { id: primaryLocation, name: locationName(primaryLocation), manager: "Unassigned" }]
    : savedLocations;
  return {
    ...data,
    businessSetup: nextSetup,
    savedLocations: nextSavedLocations,
    timeClock: {
      ...defaultTimeClock,
      ...(data.timeClock || {}),
      locationId: nextSetup.primaryLocationId,
      proximity: `${locationName(nextSetup.primaryLocationId)} check - within expected area`,
    },
  };
}

function saveSettingsModal(modal, form, patchData) {
  if (modal === "settings-profile") {
    patchData((data) => ({
      ...appendAudit(data, { actor: "Owner", action: "settings.profile_updated", target: "company profile", detail: "Company profile updated." }),
      settingsProfile: { ...getSettingsProfile(data), ...form },
    }), "Company profile updated.");
    return;
  }
  if (modal === "settings-locations" || modal === "settings-rules") {
    patchData((data) => appendAudit(
      applyBusinessSetup(data, { ...getBusinessSetup(data), ...form }),
      {
        actor: "Owner",
        action: modal === "settings-locations" ? "settings.locations_updated" : "settings.rules_updated",
        target: "workspace setup",
        detail: modal === "settings-locations" ? "Location settings updated." : "Workspace rules updated.",
      },
    ), modal === "settings-locations" ? "Location settings updated." : "Workspace rules updated.");
    return;
  }
  if (modal === "settings-hours") {
    patchData((data) => ({
      ...appendAudit(data, { actor: "Owner", action: "settings.hours_updated", target: "business hours", detail: "Business hours updated." }),
      workspaceHours: { ...getWorkspaceHours(data), ...form },
    }), "Business hours updated.");
    return;
  }
  if (modal === "settings-plan") {
    patchData((data) => ({
      ...appendAudit(data, { actor: "Owner", action: "billing.plan_updated", target: "billing plan", detail: `Billing plan set to ${form.plan}.` }),
      billing: { ...data.billing, plan: form.plan },
    }), "Billing plan updated.");
    return;
  }
  if (modal === "settings-seats") {
    patchData((data) => ({
      ...appendAudit(data, { actor: "Owner", action: "billing.seats_updated", target: "billing seats", detail: "Seat count updated." }),
      billing: { ...data.billing, seats: Math.max(1, Number(form.seats || 1)), included: Math.max(1, Number(form.included || 1)) },
    }), "Seat count updated.");
    return;
  }
  if (modal === "settings-invoice") {
    patchData((data) => ({
      ...appendAudit(data, { actor: "Owner", action: "billing.invoice_contact_updated", target: form.email, detail: "Invoice contact updated." }),
      invoiceContact: { ...getInvoiceContact(data), ...form },
    }), "Invoice contact updated.");
    return;
  }
  if (modal === "settings-security") {
    patchData((data) => ({
      ...appendAudit(data, { actor: "Owner", action: "settings.security_updated", target: "security settings", detail: "Security settings updated." }),
      securitySettings: { ...getSecuritySettings(data), ...form },
    }), "Security settings updated.");
    return;
  }
  if (modal === "settings-delete") {
    patchData((data) => form.confirm === "DELETE"
      ? {
          ...appendAudit(data, { actor: "Owner", action: "workspace.delete_requested", target: "workspace", detail: "Deletion request recorded for owner review." }),
          deletionRequest: { requestedAt: "Today", status: "Owner review required" },
        }
      : data, form.confirm === "DELETE" ? "Deletion request recorded for owner review." : "Workspace deletion stayed locked.");
    return;
  }
  patchData((data) => data, "Account health checked.");
}

function updateBusinessSetup(update, patchData) {
  patchData((data) => applyBusinessSetup(data, { ...getBusinessSetup(data), ...update }), "Business setup updated.");
}

function normalizeReportType(type) {
  const cleaned = String(type || "business").replace("command-log", "log");
  return reportTypeOptions.some(([value]) => value === cleaned) ? cleaned : "business";
}

function normalizeReportRange(range) {
  return reportRangeOptions.some(([value]) => value === range) ? range : "day";
}

function getReportSnapshots(data) {
  return Array.isArray(data?.reportSnapshots) ? data.reportSnapshots : [];
}

function reportRangeDates(date, range) {
  const selectedDate = validDateKey(date) ? date : operationsToday;
  const normalizedRange = normalizeReportRange(range);
  if (normalizedRange === "all") return null;
  return scheduleRangeDates(selectedDate, normalizedRange);
}

function reportRangeLabel(date, range) {
  const normalizedRange = normalizeReportRange(range);
  if (normalizedRange === "all") return "All visible";
  return periodLabel(validDateKey(date) ? date : operationsToday, normalizedRange);
}

function reportEventAppliesToDate(event, dates) {
  if (!dates) return true;
  const eventDate = String(event?.date || "").trim();
  return dates.some((date) => eventDate === shortDisplayDate(date) || eventDate === formatDisplayDate(date));
}

function buildReportSnapshot(data, options = {}) {
  const type = normalizeReportType(options.type);
  const range = normalizeReportRange(options.range);
  const selectedDate = validDateKey(options.date) ? options.date : operationsToday;
  const dates = reportRangeDates(selectedDate, range);
  const activeLocation = effectiveLocation(data, options.location || "all");
  const scopeLabel = activeLocation === "all" ? "All locations" : locationName(activeLocation);
  const rangeLabel = reportRangeLabel(selectedDate, range);
  const locationMatches = (locationId) => matchesActiveLocation(data, activeLocation, locationId);
  const visibleShifts = data.shifts.filter((shift) => locationMatches(shift.locationId) && (!dates || dates.includes(shiftDateKey(shift))));
  const visibleRequests = data.requests.filter((request) => locationMatches(request.locationId) && (!dates || requestAppliesToAnyDate(request, dates)));
  const visibleEntries = data.timeEntries.filter((entry) => locationMatches(entry.locationId) && (!dates || dates.includes(timeEntryDateKey(entry))));
  const visibleEvents = data.events.filter((event) => locationMatches(event.locationId) && reportEventAppliesToDate(event, dates));
  const openShifts = visibleShifts.filter((shift) => shift.status === "open").length;
  const pendingRequests = visibleRequests.filter((request) => request.status === "pending").length;
  const timeFlags = visibleEntries.filter((entry) => entry.severity !== "approved").length;
  const laborCost = visibleEntries.reduce((sum, entry) => sum + entryLaborCost(entry), 0);
  const laborHours = visibleEntries.reduce((sum, entry) => sum + entryWorkedHours(entry), 0);
  const eventStaffingGap = visibleEvents.reduce((sum, event) => sum + Math.max(0, Number(event.needed || 0) - Number(event.signed || 0)), 0);
  const typeLabel = optionLabel(reportTypeOptions, type, "Business health");
  const riskScore = openShifts * 2 + pendingRequests + timeFlags * 2 + eventStaffingGap;
  const summary = `${scopeLabel}, ${rangeLabel}: ${openShifts} open shifts, ${pendingRequests} pending requests, ${timeFlags} time flags, ${eventStaffingGap} event gaps.`;
  return {
    id: options.id || "draft-report",
    type,
    typeLabel,
    range,
    rangeLabel,
    audience: options.audience || "Owner",
    date: selectedDate,
    location: activeLocation,
    scopeLabel,
    title: `${typeLabel} Report`,
    summary,
    createdAt: options.createdAt || "Draft",
    metrics: [
      { label: "Open shifts", value: openShifts, detail: `${visibleShifts.length} shifts reviewed` },
      { label: "Requests", value: pendingRequests, detail: `${visibleRequests.length} requests in scope` },
      { label: "Labor", value: money(laborCost), detail: `${formatHours(laborHours)} tracked` },
      { label: "Risk", value: riskScore, detail: timeFlags ? `${timeFlags} time flags` : "No time flags" },
    ],
    rows: [
      ["Coverage", `${openShifts} open / ${visibleShifts.length} total shifts`, openShifts ? "Needs action" : "Covered"],
      ["Requests", `${pendingRequests} pending / ${visibleRequests.length} total`, pendingRequests ? "Review" : "Clear"],
      ["Labor", `${money(laborCost)} / ${formatHours(laborHours)}`, timeFlags ? "Exceptions" : "Tracked"],
      ["Events", `${eventStaffingGap} staffing gaps / ${visibleEvents.length} events`, eventStaffingGap ? "Needs staff" : "Covered"],
    ],
  };
}

function generateReport(patchData, options = {}) {
  const time = scheduleStamp();
  patchData((data) => {
    const snapshot = buildReportSnapshot(data, { ...options, id: `rep-${Date.now()}`, createdAt: time });
    return {
      ...data,
      reportSnapshots: [snapshot, ...getReportSnapshots(data)].slice(0, 12),
      reportLog: [`${snapshot.title} generated at ${time}: ${snapshot.summary}`, ...(data.reportLog || [])],
    };
  }, "Report generated.");
}

function shareReportToHandoff(patchData, options = {}) {
  const time = scheduleStamp();
  patchData((data) => {
    const snapshot = buildReportSnapshot(data, { ...options, id: `rep-${Date.now()}`, createdAt: time });
    const body = `${snapshot.title} shared to ${snapshot.audience}: ${snapshot.summary} Next step: review coverage, request, labor, and event lines before the next handoff.`;
    return {
      ...data,
      reportSnapshots: [snapshot, ...getReportSnapshots(data)].slice(0, 12),
      reportLog: [`${snapshot.title} shared at ${time}: ${snapshot.summary}`, ...(data.reportLog || [])],
      scheduleOps: { ...getScheduleOps(data), handoffStatus: `Report shared ${time}` },
      messages: postManagerHandoff(data.messages, body, "Reports", time),
    };
  }, "Report shared to Manager Handoff.");
}

function exportData(value, filename) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
