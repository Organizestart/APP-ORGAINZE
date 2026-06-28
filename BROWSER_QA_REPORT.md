# Browser QA Report

Date: 2026-06-28

This pass opened the running local app in the browser on `http://127.0.0.1:5174` and checked the core role-safe paths in Safe Change Preview plus signed-out and platform-admin screens.

## Summary

Passed:

- No console errors were reported on the checked screens.
- No full-page horizontal overflow was detected.
- No visible `undefined`, `NaN`, or `[object Object]` text was detected.
- Owner, manager, employee, signed-out, and platform-admin markers were visible on the right screens.
- Restricted owner/admin text did not appear on manager, employee, or signed-out screens.
- Safe Preview stayed visible on preview routes.

Observed and accepted:

- The Safe Preview account lab uses a contained horizontal account strip. Some account cards sit outside the viewport until the strip is scrolled, but the page itself does not overflow horizontally.
- Employee dashboard labels are styled uppercase, such as `NEXT SHIFT` and `SHIFT READINESS`. The content is visible and readable.

## Screens Checked

| Screen | Result | Screenshot |
| --- | --- | --- |
| Owner dashboard safe preview | Passed | [owner-dashboard-safe-preview.png](browser-qa-screenshots/owner-dashboard-safe-preview.png) |
| Owner team safe preview | Passed | [owner-team-safe-preview.png](browser-qa-screenshots/owner-team-safe-preview.png) |
| Manager schedule safe preview | Passed | [manager-schedule-safe-preview.png](browser-qa-screenshots/manager-schedule-safe-preview.png) |
| Employee dashboard safe preview | Passed | [employee-dashboard-safe-preview.png](browser-qa-screenshots/employee-dashboard-safe-preview.png) |
| Signed out | Passed | [signed-out.png](browser-qa-screenshots/signed-out.png) |
| Platform admin command review | Passed | [platform-admin-command-review.png](browser-qa-screenshots/platform-admin-command-review.png) |

## Browser Evidence

| Screen | Console errors | Page overflow | Bad display text | Active controls |
| --- | ---: | ---: | ---: | ---: |
| Owner dashboard safe preview | 0 | No | 0 | 141 |
| Owner team safe preview | 0 | No | 0 | 41 |
| Manager schedule safe preview | 0 | No | 0 | 66 |
| Employee dashboard safe preview | 0 | No | 0 | 38 |
| Signed out | 0 | No | 0 | 8 |
| Platform admin command review | 0 | No | 0 | 8 |

## Reflection

This matches the current direction because it tests the real browser experience instead of only server-rendered checks. It also keeps the results in a plain-English report so future design passes can compare against visible evidence.
