import { createServer } from "vite";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function thread(data, id) {
  return data.messages.find((item) => item.id === id);
}

function threadHistoryCount(data, id) {
  return thread(data, id)?.history?.length || 0;
}

function latestAuditAction(data, action) {
  return data.auditLog?.find((entry) => entry.action === action);
}

async function run() {
  const server = await createServer({
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });

  try {
    const module = await server.ssrLoadModule("/src/MainWorkForceApp.jsx");
    const runAction = module.runWorkflowActionForTest;
    assert(typeof runAction === "function", "Workflow action test runner is not exported.");

    let state;
    let result = runAction("dashboard-handoff", { day: "2026-06-24", location: "all" });
    state = result.data;
    assert(thread(state, "m2")?.text.includes("dashboard handoff"), "Dashboard handoff did not update Manager Handoff.");
    assert(state.scheduleOps.handoffStatus.includes("Dashboard brief"), "Dashboard handoff status was not recorded.");

    const openShift = state.shifts.find((shift) => shift.status === "open");
    assert(openShift, "No open shift available for coverage-support test.");
    const coverageBefore = threadHistoryCount(state, "m4");
    result = runAction("coverage-support", { day: "2026-06-24", shiftId: openShift.id, sender: "Manager" }, state);
    state = result.data;
    assert(threadHistoryCount(state, "m4") > coverageBefore, "Coverage Team did not receive the coverage request.");
    assert(state.announcements[0]?.title.includes("coverage help needed"), "Coverage request did not create a team announcement.");
    assert(state.scheduleOps.coverageAsk.includes(openShift.role) || state.scheduleOps.coverageAsk.includes("Posted"), "Coverage ask status was not recorded.");

    const pendingRequest = state.requests.find((request) => request.status === "pending");
    assert(pendingRequest, "No pending request available for approval test.");
    result = runAction("approve-request", { id: pendingRequest.id, status: "approved" }, state);
    state = result.data;
    assert(state.requests.find((request) => request.id === pendingRequest.id)?.status === "approved", "Request approval did not update request status.");

    const timeEntry = state.timeEntries.find((entry) => entry.severity !== "approved");
    assert(timeEntry, "No time entry available for correction test.");
    result = runAction("time-correction", { id: timeEntry.id }, state);
    state = result.data;
    const correctedEntry = state.timeEntries.find((entry) => entry.id === timeEntry.id);
    assert(correctedEntry?.flag === "Correction requested", "Time correction did not update the time entry.");
    assert(latestAuditAction(state, "time.correction_requested"), "Time correction audit entry was not recorded.");

    const reportBefore = state.reportSnapshots.length;
    result = runAction("generate-report", { type: "business", range: "day", date: "2026-06-24", location: "all" }, state);
    state = result.data;
    assert(state.reportSnapshots.length === reportBefore + 1, "Generate report did not save a report snapshot.");
    assert(state.reportLog[0]?.includes("generated"), "Generate report did not update report history.");

    const handoffBeforeShare = threadHistoryCount(state, "m2");
    result = runAction("share-report", { type: "labor", range: "day", date: "2026-06-24", location: "all", audience: "Manager Handoff" }, state);
    state = result.data;
    assert(threadHistoryCount(state, "m2") > handoffBeforeShare, "Share report did not post to Manager Handoff.");
    assert(state.scheduleOps.handoffStatus.includes("Report shared"), "Shared report handoff status was not recorded.");

    const futureDate = "2026-06-28";
    const futureOpenBefore = state.shifts.filter((shift) => shift.date === futureDate && shift.status === "open").length;
    result = runAction("add-open-shift", { date: futureDate, location: "downtown" }, state);
    state = result.data;
    const futureOpenAfter = state.shifts.filter((shift) => shift.date === futureDate && shift.status === "open").length;
    assert(futureOpenAfter === futureOpenBefore + 1, "Add open shift did not create claimable future work.");
    assert(latestAuditAction(state, "schedule.open_shift_created"), "Open shift creation audit entry was not recorded.");

    const event = state.events[0];
    assert(event, "No event available for update/delete flow test.");
    result = runAction("update-event", { id: event.id, form: { ...event, title: "Flow Smoke Event", needed: 9 } }, state);
    state = result.data;
    assert(state.events.find((item) => item.id === event.id)?.title === "Flow Smoke Event", "Event update did not change the event title.");
    assert(latestAuditAction(state, "event.updated"), "Event update audit entry was not recorded.");
    result = runAction("delete-event", { id: event.id }, state);
    state = result.data;
    assert(!state.events.some((item) => item.id === event.id), "Event delete did not remove the active event.");
    assert(state.deletedEvents?.some((item) => item.id === event.id), "Deleted event was not kept in deleted history.");
    assert(latestAuditAction(state, "event.deleted"), "Event delete audit entry was not recorded.");

    const inviteBefore = state.teamInvites.length;
    result = runAction("create-invite", {
      role: "manager",
      form: {
        name: "Flow Test Employee",
        email: "flow.employee@workforce.test",
        targetRole: "manager",
        locationId: "downtown",
        verification: "email",
        note: "Created by information-flow smoke test.",
      },
    }, state);
    state = result.data;
    assert(state.teamInvites.length === inviteBefore + 1, "Create invite did not add an invite.");
    assert(state.teamInvites[0].targetRole === "employee", "Manager-created invite was not limited to employee role.");
    assert(latestAuditAction(state, "invite.created"), "Invite creation audit entry was not recorded.");

    result = runAction("send-near-work-note", {}, state);
    state = result.data;
    assert(state.timeClock.nearWorkNote === "Sent to manager", "Near-work note did not update employee time clock.");
    assert(state.timeEntries.find((entry) => entry.employee === "Ava Brooks")?.status === "Near work", "Near-work note did not update the employee time entry.");

    console.log(JSON.stringify({
      informationFlow: "passed",
      verifiedFlows: [
        "dashboard handoff",
        "coverage team request",
        "request approval",
        "time correction audit",
        "report generation",
        "report handoff sharing",
        "future open shift",
        "event edit and delete",
        "manager employee-only invite",
        "employee near-work note",
      ],
      finalState: {
        messages: state.messages.length,
        announcements: state.announcements.length,
        requests: state.requests.length,
        reportSnapshots: state.reportSnapshots.length,
        auditLog: state.auditLog.length,
      },
    }, null, 2));
  } finally {
    await server.close();
  }
}

run().catch((error) => {
  console.error("Information flow check failed.");
  console.error(error.message || error);
  process.exit(1);
});
