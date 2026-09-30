// scripts/verify_e2e.mjs
// Comprehensive End-to-End Verification of Admin Settings & UI Data Contracts

import fs from "fs";
import path from "path";

const BACKEND_HOST = process.env.BACKEND_HOST || "http://127.0.0.1:8000";
const FRONTEND_HOST = process.env.FRONTEND_HOST || "http://127.0.0.1:3000";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
}

async function runE2E() {
  console.log("=======================================================");
  console.log("   PVASF COMPREHENSIVE END-TO-END VERIFICATION SUITE   ");
  console.log("=======================================================\n");

  // ── Step 1: Authentication for All Roles ──
  console.log("--- 1. Authenticating Roles ---");
  const adminLogin = await fetch(`${BACKEND_HOST}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "vishesh_admin", password: "vishesh123" })
  });
  assert(adminLogin.ok, "Admin (vishesh_admin) authenticated successfully");
  const { access_token: adminToken } = await adminLogin.json();
  const adminHeaders = { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" };

  const analystLogin = await fetch(`${BACKEND_HOST}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "arao_analyst", password: "arao123" })
  });
  assert(analystLogin.ok, "Analyst (arao_analyst) authenticated successfully");
  const { access_token: analystToken } = await analystLogin.json();
  const analystHeaders = { Authorization: `Bearer ${analystToken}`, "Content-Type": "application/json" };

  const viewerLogin = await fetch(`${BACKEND_HOST}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "guest_viewer", password: "guest123" })
  });
  assert(viewerLogin.ok, "Viewer (guest_viewer) authenticated successfully");
  const { access_token: viewerToken } = await viewerLogin.json();
  const viewerHeaders = { Authorization: `Bearer ${viewerToken}`, "Content-Type": "application/json" };

  // ── Step 2: Active Model Weights & Disk Persistence Verification ──
  console.log("\n--- 2. Active Model Weights & Persistence Verification ---");
  const weightsRes = await fetch(`${FRONTEND_HOST}/api/v1/surveillance/weights`, { headers: adminHeaders });
  assert(weightsRes.ok, "GET /api/v1/surveillance/weights is 200 OK via Next.js proxy");
  const weightsData = await weightsRes.json();
  assert(weightsData.threshold === 60.0, `Active threshold matches audit log 108: ${weightsData.threshold} === 60.0`);
  assert(weightsData.weights.price_rise === 20.0, "Weight price_rise is 20.0%");
  assert(weightsData.weights.price_z === 20.0, "Weight price_z is 20.0%");
  assert(weightsData.weights.volume_z === 20.0, "Weight volume_z is 20.0%");
  assert(weightsData.weights.band_persistence === 20.0, "Weight band_persistence is 20.0%");
  assert(weightsData.weights.new_high === 20.0, "Weight new_high is 20.0%");

  const configPath = path.resolve("backend/db/model_config.json");
  assert(fs.existsSync(configPath), "backend/db/model_config.json file exists on disk");
  const savedConfigFile = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  assert(savedConfigFile.threshold === 60.0, `Disk config file has threshold 60.0`);
  assert(savedConfigFile.weights.price_rise === 20.0, "Disk config file has balanced weights");

  // ── Step 3: Role-Based Authorization Enforcement on Calibration ──
  console.log("\n--- 3. Role-Based Access Control on Model Calibration ---");
  const viewerPost = await fetch(`${FRONTEND_HOST}/api/v1/surveillance/weights`, {
    method: "POST",
    headers: viewerHeaders,
    body: JSON.stringify({ weights: { price_rise: 20 }, threshold: 50 })
  });
  assert(viewerPost.status === 403, `Viewer is forbidden (HTTP ${viewerPost.status}) from modifying model weights`);

  const analystPost = await fetch(`${FRONTEND_HOST}/api/v1/surveillance/weights`, {
    method: "POST",
    headers: analystHeaders,
    body: JSON.stringify({ weights: { price_rise: 20 }, threshold: 50 })
  });
  assert(analystPost.status === 403, `Analyst is forbidden (HTTP ${analystPost.status}) from modifying model weights`);

  // ── Step 4: Scrip Detail Dynamic Scoring Calculation ──
  console.log("\n--- 4. Scrip Detail & Score Breakdown Math Verification ---");
  const detailRes = await fetch(`${FRONTEND_HOST}/api/v1/surveillance/scrip/SKMEGGPROD?as_of_date=2025-11-03&window_days=15`, { headers: adminHeaders });
  assert(detailRes.ok, "GET /scrip/SKMEGGPROD is 200 OK");
  const detail = await detailRes.json();
  assert(detail.threshold === 60.0, `Scrip detail includes active threshold ${detail.threshold}`);
  assert(Array.isArray(detail.score_breakdown) && detail.score_breakdown.length === 5, "Detail includes 5-parameter score breakdown");

  let calculatedScoreSum = 0;
  for (const item of detail.score_breakdown) {
    assert(typeof item.score === "number", `Parameter ${item.label} raw score is ${item.score} (0-5)`);
    assert(item.weight === 20.0, `Parameter ${item.label} weight is calibrated to 20%`);
    const expectedContribution = (item.score / 5.0) * item.weight;
    assert(Math.abs(item.contribution - expectedContribution) < 0.01, `Parameter ${item.label} contribution ${item.contribution} matches formula (score/5)*weight`);
    calculatedScoreSum += item.contribution;
  }
  const finalScore = detail.score ?? detail.metrics?.final_score;
  assert(Math.abs(finalScore - calculatedScoreSum) < 0.01, `Total Alert Score (${finalScore}) matches sum of weighted contributions (${calculatedScoreSum})`);
  assert(finalScore >= detail.threshold ? detail.risk === "High" : true, `Scrip with score ${finalScore} >= ${detail.threshold} is correctly categorized as High Risk`);

  // ── Step 5: Full Cycle: Update Calibration, Verify Persistence & Audit Trail, Restore ──
  console.log("\n--- 5. Full Calibration Cycle: Update -> Audit Trail -> Recalculation -> Restore ---");
  
  // 5a: Update to threshold 65
  const updateRes = await fetch(`${FRONTEND_HOST}/api/v1/surveillance/weights`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      weights: {
        price_rise: 25.0,
        price_z: 20.0,
        volume_z: 20.0,
        band_persistence: 20.0,
        new_high: 15.0
      },
      threshold: 65.0
    })
  });
  assert(updateRes.ok, "POST /api/v1/surveillance/weights succeeded with HTTP 200");
  const updatedData = await updateRes.json();
  assert(updatedData.threshold === 65.0, "Updated threshold confirmed in API response: 65.0");

  // 5b: Verify disk file was updated
  const configAfterUpdate = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  assert(configAfterUpdate.threshold === 65.0, "Disk file was updated to threshold 65.0 immediately");
  assert(configAfterUpdate.weights.price_rise === 25.0, "Disk file recorded updated price_rise weight (25%)");

  // 5c: Verify audit trail recorded event
  const auditRes = await fetch(`${FRONTEND_HOST}/api/v1/auth/audit-logs?limit=5`, { headers: adminHeaders });
  assert(auditRes.ok, "GET /api/v1/auth/audit-logs succeeded");
  const auditLogs = await auditRes.json();
  const latestLog = auditLogs[0];
  assert(latestLog.action === "UPDATE_MODEL_WEIGHTS", `Audit log recorded action: ${latestLog.action}`);
  assert(latestLog.username === "vishesh_admin", `Audit log recorded actor: ${latestLog.username}`);
  assert(latestLog.details.includes("65"), `Audit log recorded details: ${latestLog.details}`);

  // 5d: Verify scrip detail dynamically reflects new threshold and weights
  const detailAfterUpdate = await (await fetch(`${FRONTEND_HOST}/api/v1/surveillance/scrip/SKMEGGPROD?as_of_date=2025-11-03&window_days=15`, { headers: adminHeaders })).json();
  assert(detailAfterUpdate.threshold === 65.0, `Scrip detail now returns updated threshold ${detailAfterUpdate.threshold}`);
  const priceRiseParam = detailAfterUpdate.score_breakdown.find(p => p.label === "Price Rise");
  assert(priceRiseParam && priceRiseParam.weight === 25.0, `Scrip detail price rise weight dynamically updated to ${priceRiseParam?.weight}%`);

  // 5e: Restore back to 60.0 threshold and balanced 20.0 weights
  const restoreRes = await fetch(`${FRONTEND_HOST}/api/v1/surveillance/weights`, {
    method: "POST",
    headers: adminHeaders,
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
  assert(restoreRes.ok, "Model restored back to threshold 60.0 and equal 20.0 weights");
  const configAfterRestore = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  assert(configAfterRestore.threshold === 60.0, "Disk file restored to threshold 60.0");
  assert(configAfterRestore.weights.price_rise === 20.0, "Disk file restored to price_rise 20.0%");

  // ── Step 6: Frontend SSR Pages Rendering Verification ──
  console.log("\n--- 6. Frontend SSR Route HTML Inspection ---");
  const routesToTest = [
    { url: "/", label: "Dashboard / Watchlist" },
    { url: "/settings", label: "Admin & Model Settings" },
    { url: "/history", label: "Security Audit Trail" },
    { url: "/analysis/SKMEGGPROD", label: "Investigation Workspace (SKMEGGPROD)" },
    { url: "/analysis/TDPOWERSYS", label: "Investigation Workspace (TDPOWERSYS)" },
    { url: "/analysis/RELIANCE", label: "Investigation Workspace (RELIANCE)" },
  ];

  for (const { url, label } of routesToTest) {
    const res = await fetch(`${FRONTEND_HOST}${url}`);
    assert(res.ok, `GET ${url} (${label}) returned HTTP ${res.status}`);
    const html = await res.text();
    assert(html.length > 5000, `GET ${url} returned valid HTML document (${html.length} bytes)`);
    assert(!html.includes("Application error: a client-side exception has occurred"), `GET ${url} has no client exception crash`);
  }

  console.log("\n=======================================================");
  console.log("   🎉 ALL END-TO-END VERIFICATION CHECKS PASSED 100%!  ");
  console.log("=======================================================\n");
}

runE2E().catch((err) => {
  console.error("\n❌ E2E VERIFICATION FAILED:\n", err);
  process.exit(1);
});
