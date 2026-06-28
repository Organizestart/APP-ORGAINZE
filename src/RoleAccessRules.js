export const firstSectionByRole = {
  owner: "owner-dashboard",
  manager: "manager-dashboard",
  employee: "employee-dashboard",
  "platform-admin": "admin-command-review",
};

const ownerSections = [
  "owner-dashboard",
  "owner-schedule",
  "owner-requests",
  "owner-events",
  "owner-team",
  "owner-guide",
  "owner-time",
  "owner-reports",
  "owner-settings",
];

const managerSections = [
  "manager-dashboard",
  "manager-schedule",
  "manager-requests",
  "manager-team",
  "manager-guide",
  "manager-time",
  "manager-settings",
  "employee-dashboard",
  "employee-schedule",
  "employee-shifts",
  "employee-clock",
  "employee-requests",
  "employee-guide",
];

const employeeSections = [
  "employee-dashboard",
  "employee-schedule",
  "employee-shifts",
  "employee-clock",
  "employee-requests",
  "employee-messages",
  "employee-guide",
  "employee-settings",
];

const platformAdminSections = ["admin-command-review"];

export function sectionIdsForRole(role, options = {}) {
  if (role === "platform-admin") return platformAdminSections;
  if (role === "owner") {
    return options.ownerRunsManagerFunctions ? [...ownerSections, "owner-manager-dashboard"] : ownerSections;
  }
  if (role === "manager") return managerSections;
  return employeeSections;
}

export function canRoleAccessSection(role, section, options = {}) {
  return sectionIdsForRole(role, options).includes(section);
}

export function safeSectionForRole(role, section, options = {}) {
  return canRoleAccessSection(role, section, options) ? section : firstSectionByRole[role];
}

export function runtimeRoleForSection(role, section) {
  return role === "manager" && section?.startsWith("employee-") ? "employee" : role;
}
