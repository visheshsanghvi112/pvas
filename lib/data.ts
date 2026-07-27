// Corporate Announcements are not yet backed by the database schema, so we mock them per the user's directive to keep the UI functional for this specific requirement.
export const corporateEvents = [
  { date: "2026-07-18", title: "Clarification sought on price movement", type: "Exchange query" },
  { date: "2026-07-15", title: "Board meeting intimation for strategic partnership", type: "Announcement" },
  { date: "2026-07-08", title: "Preferential allotment approved in principle", type: "Corporate action" },
  { date: "2026-06-30", title: "Large order win reported by management", type: "Disclosure" }
];

// Remarks are part of case management, which is currently outside the core PVASF computation spec.
export const remarks = [
  { date: "2026-07-20 10:30", officer: "Sanskar", text: "Initial review indicates synchronized accumulation during upper price band sessions." },
  { date: "2026-07-19 16:10", officer: "A. Rao", text: "Requested broker-level KYC linkage report for top five buying clients." }
];
