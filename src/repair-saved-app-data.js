const arrayFields = [
  "shifts",
  "requests",
  "guideCards",
  "events",
  "messages",
  "announcements",
  "teamInvites",
  "teamAccounts",
  "savedLocations",
  "timeEntries",
  "completedGuideIds",
  "reportSnapshots",
  "reportLog",
  "auditLog",
];

export function migrateLegacyLocationCopy(value) {
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

export function safeArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

export function safeObject(value, fallback = {}) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
}

export function repairWorkspaceState(state, defaults) {
  const {
    baseState,
    defaultBusinessSetup,
    defaultSettingsProfile,
    defaultWorkspaceHours,
    defaultInvoiceContact,
    defaultSecuritySettings,
    defaultNotificationSettings,
    defaultScheduleOps,
    defaultTimeClock,
  } = defaults;
  const raw = migrateLegacyLocationCopy({ ...baseState, ...safeObject(state) });
  const repaired = { ...raw };
  arrayFields.forEach((field) => {
    repaired[field] = safeArray(raw[field], baseState[field]);
  });
  return {
    ...repaired,
    datePlans: safeObject(raw.datePlans, baseState.datePlans || {}),
    billing: { ...baseState.billing, ...safeObject(raw.billing) },
    businessSetup: { ...defaultBusinessSetup, ...safeObject(raw.businessSetup) },
    settingsProfile: { ...defaultSettingsProfile, ...safeObject(raw.settingsProfile) },
    workspaceHours: { ...defaultWorkspaceHours, ...safeObject(raw.workspaceHours) },
    invoiceContact: { ...defaultInvoiceContact, ...safeObject(raw.invoiceContact) },
    securitySettings: { ...defaultSecuritySettings, ...safeObject(raw.securitySettings) },
    notificationSettings: { ...defaultNotificationSettings, ...safeObject(raw.notificationSettings) },
    scheduleOps: { ...defaultScheduleOps, ...safeObject(raw.scheduleOps) },
    timeClock: { ...defaultTimeClock, ...safeObject(raw.timeClock) },
  };
}
