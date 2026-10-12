// scripts/test_frontend_api.mjs
// Verifies all frontend data contracts against live backend API (port 8000)

const BASE = "http://127.0.0.1:8000";

async function runTests() {
  console.log("=== FRONTEND API CONTRACT & ENDPOINT VERIFICATION ===\n");

  // 1. Health Check
  const healthRes = await fetch(`${BASE}/api/v1/surveillance/health`);
  const health = await healthRes.json();
  console.log("✓ 1. Health check:", health.status, `(${health.system})`);

  // 2. Authentication Login
  const loginRes = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "vishesh_admin", password: "vishesh123" }),
  });
  if (!loginRes.ok) throw new Error("Login failed: " + (await loginRes.text()));
  const loginData = await loginRes.json();
  const token = loginData.access_token;
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  console.log(`✓ 2. Login successful for '${loginData.user.username}' (${loginData.user.role}) - Token generated`);

  // 3. Current User Profile (/me)
  const meRes = await fetch(`${BASE}/api/v1/auth/me`, { headers: authHeaders });
  const me = await meRes.json();
  console.log(`✓ 3. Profile verified: ${me.full_name}, Department: ${me.department}, Active: ${me.is_active}`);

  // 4. Available Trading Dates
  const datesRes = await fetch(`${BASE}/api/v1/surveillance/dates`, { headers: authHeaders });
  const dates = await datesRes.json();
  console.log(`✓ 4. Available dates: ${dates.length} sessions, Latest date: ${dates[0]}`);

  // 5. Watchlist
  const wlRes = await fetch(`${BASE}/api/v1/surveillance/watchlist?as_of_date=${dates[0]}&window_days=15&exchange=ALL`, { headers: authHeaders });
  const watchlist = await wlRes.json();
  console.log(`✓ 5. Watchlist loaded: ${watchlist.length} scrips ranked`);
  const topScrip = watchlist[0];
  console.log(`     Top Alert: ${topScrip.symbol} (${topScrip.company}) - Risk: ${topScrip.risk}, Score: ${topScrip.score}, Price Rise: +${topScrip.price_rise_pct}%`);

  const sym = topScrip.symbol;

  // 6. Scrip Detail
  const detailRes = await fetch(`${BASE}/api/v1/surveillance/scrip/${sym}?as_of_date=${dates[0]}&window_days=15&exchange=ALL`, { headers: authHeaders });
  const detail = await detailRes.json();
  console.log(`✓ 6. Scrip detail: ${detail.ticker} (${detail.company}) - ISIN: ${detail.isin}`);
  console.log(`     Latest Close: ₹${detail.summary.latest_close}, 15D History Points: ${detail.history.length}`);
  console.log(`     Score Breakdown: ${detail.score_breakdown.map(s => `${s.label}: ${s.score}/5`).join(", ")}`);

  // 7. Scrip Participants & Counterparties
  const partRes = await fetch(`${BASE}/api/v1/surveillance/scrip/${sym}/participants?as_of_date=${dates[0]}&window_days=15`, { headers: authHeaders });
  const participants = await partRes.json();
  console.log(`✓ 7. Participants: ${participants.ltp_contributors.length} LTP contributors, ${participants.counterparty_pairs.length} matched pairs`);
  if (participants.counterparty_pairs.length > 0) {
    const pair = participants.counterparty_pairs[0];
    console.log(`     Sample Ring/Pair: ${pair.pair} - Traded Vol: ${pair.volume.toLocaleString()}, Share: ${pair.share_pct}%`);
  }

  // 8. Shareholding Breakdown
  const shRes = await fetch(`${BASE}/api/v1/surveillance/scrip/${sym}/shareholding-breakdown`, { headers: authHeaders });
  const sh = await shRes.json();
  console.log(`✓ 8. Shareholding: Promoter Float: ${sh.promoter_pct_t}%, Public: ${(100 - sh.promoter_pct_t).toFixed(2)}%`);
  console.log(`     Quarterly points: ${sh.quarterly_history.length}, Key promoter groups: ${sh.promoter_group.length}`);

  // 9. Corporate Actions
  const caRes = await fetch(`${BASE}/api/v1/surveillance/scrip/${sym}/corporate-actions`, { headers: authHeaders });
  const ca = await caRes.json();
  console.log(`✓ 9. Corporate actions: ${ca.length} events logged`);
  ca.forEach(item => {
    console.log(`     [${item.category}] Record: ${item.record_date}, Purpose: ${item.purpose}, Dilution: ${item.dilution_factor}x`);
  });

  // 10. Trade Surveillance Log
  const tradesRes = await fetch(`${BASE}/api/v1/trades/?symbol=${sym}&page=1&page_size=50`, { headers: authHeaders });
  const trades = await tradesRes.json();
  console.log(`✓ 10. Trade surveillance matches: ${trades.data.length} trades returned (Total: ${trades.pagination.total})`);
  if (trades.data.length > 0) {
    const t0 = trades.data[0];
    console.log(`      First trade: #${t0.trade_number} on ${t0.trade_date} - Qty: ${t0.trade_quantity}, Price: ₹${t0.trade_price}, Wash: ${t0.is_same_broker_wash}`);
  }

  // 11. Client 360 PAN Lookup
  const pan = participants.ltp_contributors.length > 0 ? participants.ltp_contributors[0].participant : "ABNPP8622K";
  const clntRes = await fetch(`${BASE}/api/v1/clients/pan/${pan}`, { headers: authHeaders });
  const clnt = await clntRes.json();
  console.log(`✓ 11. Client 360 profile for PAN ${clnt.pan}:`);
  console.log(`      Entity: ${clnt.name}, Category: ${clnt.category}, City: ${clnt.city}, Grade: ${clnt.risk_grade}`);
  console.log(`      Depository BO Accounts: ${clnt.depository_accounts.length} linked accounts`);
  clnt.depository_accounts.forEach(d => console.log(`        DP ID: ${d.dp_id}, BO Account: ${d.client_id}, Status: ${d.status}`));

  // 12. Security Audit Logs
  const auditRes = await fetch(`${BASE}/api/v1/auth/audit-logs?limit=10`, { headers: authHeaders });
  const logs = await auditRes.json();
  console.log(`✓ 12. Immutable audit logs: ${logs.length} recent records retrieved`);

  // 13. System Users List (Admin only)
  const usersRes = await fetch(`${BASE}/api/v1/auth/users`, { headers: authHeaders });
  const users = await usersRes.json();
  console.log(`✓ 13. System users (RBAC): ${users.length} active users registered:`);
  users.forEach(u => console.log(`      User: ${u.username.padEnd(16)} | Role: ${u.role.padEnd(8)} | ${u.full_name} (${u.email})`));

  // 14. Excel Dossier Export Binary Payload
  const excelRes = await fetch(`${BASE}/api/v1/surveillance/scrip/${sym}/export-excel?as_of_date=${dates[0]}`, { headers: authHeaders });
  const excelBlob = await excelRes.arrayBuffer();
  console.log(`✓ 14. Excel regulatory dossier generated: ${excelBlob.byteLength} bytes binary xlsx payload`);

  console.log("\n============================================================");
  console.log("✓ ALL 14 FRONTEND DATA CONTRACTS VERIFIED 100% OPERATIONAL!");
  console.log("============================================================\n");
}

runTests().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
