// scripts/test_frontend_routes.mjs
// Comprehensive code-level simulation and verification of all frontend routes,
// API data pipelines, state structures, and UI contracts.

const PORT = process.env.PORT || "3005";
const FRONTEND_HOST = `http://localhost:${PORT}`;
const BACKEND_HOST = "http://localhost:8000";

let authToken = null;

async function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function testHttpRoute(route, expectedStatus = 200) {
  const url = `${FRONTEND_HOST}${route}`;
  const res = await fetch(url, { redirect: "manual" });
  if (expectedStatus === 307 || expectedStatus === 308) {
    assert(res.status === 307 || res.status === 308, `Route ${route} returned redirect (${res.status})`);
    const loc = res.headers.get("location");
    assert(loc && loc.includes("/analysis/"), `Redirect location is valid: ${loc}`);
    return;
  }
  assert(res.status === expectedStatus, `Route ${route} returned HTTP ${res.status}`);
  const html = await res.text();
  assert(html.length > 500, `Route ${route} returned non-empty HTML document (${html.length} bytes)`);
  assert(!html.includes("Application error: a server-side exception has occurred"), `Route ${route} has no unhandled Next.js SSR exception`);
}

async function runTestSuite() {
  console.log("\n=======================================================");
  console.log("   PVASF FRONTEND VERIFICATION & CODE INSPECTION SUITE");
  console.log("=======================================================\n");

  // ── PHASE 1: Next.js SSR HTTP Route Integrity ──
  console.log("--- PHASE 1: Testing Next.js Route Rendering ---");
  await testHttpRoute("/");
  await testHttpRoute("/history");
  await testHttpRoute("/settings");
  await testHttpRoute("/analysis/SKMEGGPROD");
  await testHttpRoute("/analysis/TDPOWERSYS");
  await testHttpRoute("/analysis/RELIANCE");
  await testHttpRoute("/analysis/QUALITY");
  await testHttpRoute("/analysis/NOVAENERGY");
  await testHttpRoute("/analyse/SKMEGGPROD", 307); // dynamic redirect test

  // ── PHASE 2: Authentication & Token Management ──
  console.log("\n--- PHASE 2: Authentication & Role Switcher Verification ---");
  const loginRes = await fetch(`${BACKEND_HOST}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "vishesh_admin", password: "vishesh123" })
  });
  assert(loginRes.ok, "Admin login successful");
  const loginData = await loginRes.json();
  authToken = loginData.access_token;
  assert(!!authToken, "Bearer JWT access token acquired");

  const authHeaders = {
    Authorization: `Bearer ${authToken}`,
    "Content-Type": "application/json"
  };

  // Test Viewer login
  const viewerRes = await fetch(`${BACKEND_HOST}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "guest_viewer", password: "guest123" })
  });
  assert(viewerRes.ok, "Viewer (guest_viewer) login operational");

  // Test Analyst login
  const analystRes = await fetch(`${BACKEND_HOST}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "arao_analyst", password: "arao123" })
  });
  assert(analystRes.ok, "Analyst (arao_analyst) login operational");

  // ── PHASE 3: Dashboard Data Pipeline Contract ──
  console.log("\n--- PHASE 3: Dashboard Component Data Contracts ---");
  const datesRes = await fetch(`${FRONTEND_HOST}/api/v1/surveillance/dates`, { headers: authHeaders });
  assert(datesRes.ok, "GET /api/v1/surveillance/dates via Next rewrite proxy is 200 OK");
  const dates = await datesRes.json();
  assert(Array.isArray(dates) && dates.length > 0, `Dates array loaded (${dates.length} sessions)`);
  const asOfDate = dates[0];

  const watchlistRes = await fetch(`${FRONTEND_HOST}/api/v1/surveillance/scrips?as_of_date=${asOfDate}&window_days=15&exchange=ALL`, { headers: authHeaders });
  assert(watchlistRes.ok, "GET /api/v1/surveillance/scrips is 200 OK");
  const watchlist = await watchlistRes.json();
  assert(Array.isArray(watchlist) && watchlist.length > 0, `Watchlist scrips returned (${watchlist.length} scrips)`);

  // Verify all fields required by AlertsTable component
  const sampleScrip = watchlist[0];
  const requiredFields = [
    "symbol", "latest_close", "price_rise_pct", "price_z", "volume_z",
    "band_hit_days", "new_high_days", "score", "risk"
  ];
  for (const f of requiredFields) {
    assert(sampleScrip[f] !== undefined, `AlertsTable requirement: '${f}' is present on scrip (value: ${sampleScrip[f]})`);
  }

  // ── PHASE 4: Investigation Workspace Data Contracts ──
  console.log("\n--- PHASE 4: Investigation Workspace Component Data Contracts ---");
  const scripDetailRes = await fetch(`${FRONTEND_HOST}/api/v1/surveillance/scrip/${sampleScrip.symbol}?as_of_date=${asOfDate}&window_days=15&exchange=ALL`, { headers: authHeaders });
  assert(scripDetailRes.ok, `GET scrip details for ${sampleScrip.symbol} is 200 OK`);
  const detail = await scripDetailRes.json();
  assert(!!detail.metrics, "ScripDetail has 'metrics' object");
  assert(Array.isArray(detail.history) && detail.history.length > 0, `ScripDetail has history points (${detail.history.length})`);
  assert(Array.isArray(detail.score_breakdown) && detail.score_breakdown.length === 5, "ScripDetail has 5-parameter score breakdown");

  // Participants
  const partRes = await fetch(`${FRONTEND_HOST}/api/v1/surveillance/scrip/${sampleScrip.symbol}/participants?as_of_date=${asOfDate}&window_days=15`, { headers: authHeaders });
  assert(partRes.ok, "GET participants is 200 OK");
  const partData = await partRes.json();
  assert(Array.isArray(partData.ltp_contributors), "Participants has 'ltp_contributors' array");
  assert(Array.isArray(partData.volume_share), "Participants has 'volume_share' array");
  assert(Array.isArray(partData.counterparty_pairs), "Participants has 'counterparty_pairs' array");
  assert(Array.isArray(partData.profit_makers), "Participants has 'profit_makers' array");

  // Shareholding Breakdown
  const shRes = await fetch(`${FRONTEND_HOST}/api/v1/surveillance/scrip/${sampleScrip.symbol}/shareholding-breakdown`, { headers: authHeaders });
  assert(shRes.ok, "GET shareholding-breakdown is 200 OK");
  const shData = await shRes.json();
  assert(typeof shData.promoter_pct_t === "number", `Shareholding has promoter_pct_t (${shData.promoter_pct_t}%)`);

  // Corporate Actions
  const caRes = await fetch(`${FRONTEND_HOST}/api/v1/surveillance/scrip/${sampleScrip.symbol}/corporate-actions`, { headers: authHeaders });
  assert(caRes.ok, "GET corporate-actions is 200 OK");

  // Client 360
  if (partData.ltp_contributors.length > 0) {
    const testPan = partData.ltp_contributors[0].participant;
    const clientRes = await fetch(`${FRONTEND_HOST}/api/v1/clients/pan/${testPan}`, { headers: authHeaders });
    assert(clientRes.ok, `GET Client 360 for PAN ${testPan} is 200 OK`);
    const clientData = await clientRes.json();
    assert(!!clientData.pan, `Client 360 has PAN (${clientData.pan})`);
    assert(Array.isArray(clientData.depository_accounts), `Client 360 has depository accounts (${clientData.depository_accounts.length})`);
  }

  // Excel Export
  const excelRes = await fetch(`${FRONTEND_HOST}/api/v1/surveillance/scrip/${sampleScrip.symbol}/export-excel?as_of_date=${asOfDate}&window_days=15&exchange=ALL`, { headers: authHeaders });
  assert(excelRes.ok, "GET export-excel binary payload is 200 OK");
  const excelBytes = await excelRes.arrayBuffer();
  assert(excelBytes.byteLength > 1000, `Excel binary generated successfully (${excelBytes.byteLength} bytes)`);

  // ── PHASE 5: History & Settings Contracts ──
  console.log("\n--- PHASE 5: Audit Log Trail & Model Settings Contracts ---");
  const auditRes = await fetch(`${FRONTEND_HOST}/api/v1/auth/audit-logs?limit=50`, { headers: authHeaders });
  assert(auditRes.ok, "GET audit-logs is 200 OK");
  const logs = await auditRes.json();
  assert(Array.isArray(logs) && logs.length > 0, `Audit logs returned (${logs.length} entries)`);

  const usersRes = await fetch(`${FRONTEND_HOST}/api/v1/auth/users`, { headers: authHeaders });
  assert(usersRes.ok, "GET users list is 200 OK");
  const users = await usersRes.json();
  assert(Array.isArray(users) && users.length >= 3, `Users list returned (${users.length} registered users)`);

  // Model weights inspection & calibration update test
  const getWeightsRes = await fetch(`${FRONTEND_HOST}/api/v1/surveillance/weights`, { headers: authHeaders });
  assert(getWeightsRes.ok, "GET /api/v1/surveillance/weights is 200 OK");
  const currentWeights = await getWeightsRes.json();
  assert(currentWeights.status === "SUCCESS", "Weights payload status is SUCCESS");
  assert(typeof currentWeights.threshold === "number", `Threshold is number (${currentWeights.threshold})`);
  assert(typeof currentWeights.weights === "object", "Weights dictionary present");

  const weightsRes = await fetch(`${FRONTEND_HOST}/api/v1/surveillance/weights`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      weights: {
        price_rise: 20.0,
        price_z: 20.0,
        volume_z: 20.0,
        band_persistence: 20.0,
        new_high: 20.0
      },
      threshold: 60.0
    })
  });
  assert(weightsRes.ok, "POST /api/v1/surveillance/weights calibration update is 200 OK");
  const postWeightsData = await weightsRes.json();
  assert(postWeightsData.threshold === 60.0, "Saved threshold is confirmed as 60.0");

  console.log("\n=======================================================");
  console.log("   ALL 5 PHASES & ALL FRONTEND CONTRACTS PASSED 100%!");
  console.log("=======================================================\n");
}

runTestSuite().catch((err) => {
  console.error("\n❌ SUITE EXECUTION FAILED:\n", err);
  process.exit(1);
});
