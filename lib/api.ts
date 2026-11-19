export type ExchangeScope = "ALL" | "NSE" | "BSE";

export interface ScripSummary {
  ticker: string;
  symbol: string;
  latest_close: number;
  price_change_pct: number;
  risk_score: number;
  score: number;
  price_rise_pct: number;
  price_z: number;
  volume_z: number;
  band_hit_days: number;
  new_high_days: number;
  watchlist: boolean;
  threshold?: number;
  risk: "High" | "Medium" | "Low";
  status: "Open" | "Under review" | "Closed" | "Normal";
  isin?: string;
  company?: string;
  sector?: string;
  exchange_scope?: ExchangeScope;
  venue_trigger?: string;
}

export interface ScoreBreakdownItem {
  label: string;
  score: number;
  weight: number;
  contribution: number;
}

export interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  delivery_pct?: number | null;
  ma20?: number | null;
  ma50?: number | null;
  is_band_hit?: boolean;
  is_new_high?: boolean;
}

export interface ShareholderStats {
  unique_pans_15d?: number;
  unique_pans_180d?: number;
  unique_pans_holding_t?: number;
  unique_pans_holding_180?: number;
  avg_trading_pans_15d?: number;
  avg_trading_pans_180d?: number;
  top_1pct_concentration?: number;
  promoter_percent?: number | null;
  public_percent?: number | null;
  has_live_feed?: boolean;
}

export interface AnnouncementItem {
  date: string;
  category: string;
  title: string;
  status: string;
}

export interface ScripDetail {
  ticker: string;
  symbol: string;
  company: string;
  isin: string;
  risk: "High" | "Medium" | "Low";
  status: "Open" | "Under review" | "Closed";
  score?: number;
  risk_score?: number;
  price_band?: number;
  exchange_scope?: ExchangeScope;
  metrics: {
    price_rise_pct: number;
    price_z: number;
    volume_z: number;
    band_hit_days: number;
    new_high_days: number;
    final_score: number;
    // Statistical baseline fields from backend engine (PVASF 2.2 / 2.3)
    price_rise_score?: number;
    price_z_score?: number;
    volume_z_score?: number;
    price_mean?: number;
    price_std?: number;
    price_threshold_95?: number;
    price_threshold_99?: number;
    price_threshold_999?: number;
    volume_mean?: number;
    volume_std?: number;
    volume_threshold_95?: number;
    volume_threshold_99?: number;
    volume_threshold_999?: number;
    price_mod_z?: number;
    volume_mod_z?: number;
    band_score?: number;
    new_high_score?: number;
    [key: string]: any;
  };
  score_breakdown: ScoreBreakdownItem[];
  history: PricePoint[];
  summary: {
    start_price: number;
    latest_close: number;
    price_change_pct: number;
    avg_15d_volume: number;
  };
  shareholders?: ShareholderStats | null;
  announcements?: AnnouncementItem[];
  threshold?: number;
  watchlist?: boolean;
}

export interface LtpContributor {
  participant: string;
  name?: string;
  contribution: number;
  scrip_movement_contribution_pct?: number | null;
  net_val?: number;
  pos_val?: number;
  neg_val?: number;
  effect?: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
}

export interface ParticipantAudit {
  ticker: string;
  scrip_15d_price_change?: number;
  total_market_pos_ltp?: number;
  total_market_neg_ltp?: number;
  total_trades_count?: number;
  ltp_contributors: LtpContributor[];
  pos_ltp_contributors?: LtpContributor[];
  neg_ltp_contributors?: LtpContributor[];
  volume_share: Array<{ participant: string; name?: string; volume: number; share_pct: number }>;
  counterparty_pairs: Array<{ pair: string; name1?: string; name2?: string; pan1?: string; pan2?: string; volume: number; share_pct: number }>;
  profit_makers: Array<{ participant: string; name?: string; net_pnl: number; buy_volume: number; sell_volume: number }>;
  reversal_pairs?: Array<{
    pair: string;
    pan1?: string;
    pan2?: string;
    name1?: string;
    name2?: string;
    volume: number;
    vol_a_to_b?: number;
    vol_b_to_a?: number;
    reversal_ratio: number;
  }>;
  circular_loops?: Array<{
    loop: string;
    nodes?: string[];
    length?: number;
    volume: number;
    gross_volume: number;
    efficiency_pct?: number;
  }>;
}

export interface TradeRow {
  trade_number: number;
  trade_date: string;
  trade_time?: string;
  trade_quantity: number;
  trade_price: number;
  buyer_client_token: number;
  seller_client_token: number;
  is_same_broker_wash?: number;
  exchange?: string;
}


export interface ClientDetail {
  pan: string;
  clnt_id: string;
  tm_id: string;
  name?: string;
  category?: string;
  client_code?: string;
  city?: string;
  risk_grade?: string;
  terminals: Array<{ terminal_id: string; location: string }>;
  depository_accounts: Array<{ dp_id: string; client_id: string; status: string }>;
}

// Base API URLs pointing to FastAPI backend endpoints
export function getBaseHost(): string {
  // In the browser, always use same-origin to route through Next.js rewrite proxy (/api/*)
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return "http://127.0.0.1:8005";
}

export function createApiUrl(path: string): URL {
  return new URL(path, getBaseHost());
}

// In browser, empty string "" enables clean same-origin relative paths (/api/v1/...)
const BASE_HOST = typeof window !== "undefined"
  ? ""
  : ((typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) || "http://127.0.0.1:8005");
const API_BASE = `${BASE_HOST}/api/v1/surveillance`;
const TRADES_API_BASE = `${BASE_HOST}/api/v1/trades`;
const CLIENTS_API_BASE = `${BASE_HOST}/api/v1/clients`;


/**
 * Decodes the token's payload to determine if it is expired.
 */
export function isTokenExpired(token: string | null): boolean {
  if (!token || !token.includes(".")) return true;
  try {
    const [payloadHex] = token.split(".");
    let jsonStr = "";
    for (let i = 0; i < payloadHex.length; i += 2) {
      jsonStr += String.fromCharCode(parseInt(payloadHex.substr(i, 2), 16));
    }
    const payload = JSON.parse(jsonStr);
    if (!payload.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    // Buffer by 30 seconds to refresh early before actual expiration
    return payload.exp <= now + 30;
  } catch {
    return true;
  }
}

export function setAuthCookie(token: string) {
  if (typeof document !== "undefined") {
    document.cookie = `pvasf_auth_token=${encodeURIComponent(token)}; Path=/; SameSite=Lax; max-age=86400`;
  }
}

export function clearAuthCookie() {
  if (typeof document !== "undefined") {
    document.cookie = "pvasf_auth_token=; Path=/; SameSite=Lax; max-age=0";
  }
}

let activeAuthPromise: Promise<string | null> | null = null;

/**
 * Returns request headers with the user's stored Bearer token attached.
 */
export function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pvasf_auth_token") : null;
  const headers: Record<string, string> = { ...extraHeaders };
  if (token && !isTokenExpired(token)) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Ensures an active auth token exists.
 * In development / demo mode, auto-provisions a session if no token is present and
 * the user has not explicitly clicked 'Sign Out'.
 */
export async function ensureAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("pvasf_auth_token");
  if (token && !isTokenExpired(token)) {
    setAuthCookie(token);
    return token;
  }

  // If user explicitly clicked Sign Out, do not automatically re-authenticate
  const wasLoggedOut = localStorage.getItem("pvasf_logged_out") === "true";
  if (wasLoggedOut) {
    return null;
  }

  // On internal networks, auto-login is active by default for seamless analyst workflow,
  // unless explicitly disabled via NEXT_PUBLIC_DISABLE_AUTO_LOGIN=true.
  const allowAutoLogin = process.env.NEXT_PUBLIC_DISABLE_AUTO_LOGIN !== "true";
  if (!allowAutoLogin) {
    return null;
  }

  // If a login request is already in-flight, return the existing promise
  if (activeAuthPromise) {
    return activeAuthPromise;
  }

  activeAuthPromise = (async () => {
    try {
      const demoUser = process.env.NEXT_PUBLIC_DEMO_USERNAME || "arao_analyst";
      const demoPass = process.env.NEXT_PUBLIC_DEMO_PASSWORD || "arao123";

      // Retry up to 3 times to account for backend startup delays
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          localStorage.removeItem("pvasf_auth_token");
          clearAuthCookie();
          const res = await fetch(`${BASE_HOST}/api/v1/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: demoUser, password: demoPass }),
          });
          if (res.ok) {
            const data = await res.json();
            const newToken = data.access_token;
            if (newToken) {
              localStorage.setItem("pvasf_auth_token", newToken);
              localStorage.removeItem("pvasf_logged_out");
              setAuthCookie(newToken);
              return newToken;
            }
          }
          if (res.status >= 500 && attempt < 2) {
            // Backend or proxy still starting up; back off and retry
            await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
            continue;
          }
        } catch (e) {
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
            continue;
          }
          console.warn("[API] Auto-login provisioning failed:", e);
        }
      }
      return null;
    } finally {
      activeAuthPromise = null;
    }
  })();

  return activeAuthPromise;
}

/**
 * Wrapper around standard fetch that automatically attaches the Authorization Bearer header,
 * pre-emptively validates token freshness, and retries once if the token expires (HTTP 401)
 * or if the upstream backend is cold-starting (HTTP 500/502/503/504).
 */
export async function fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
  const targetUrl = (url.startsWith("http://") || url.startsWith("https://"))
    ? url
    : `${getBaseHost()}${url.startsWith("/") ? "" : "/"}${url}`;
  let token = await ensureAuthToken();
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response | null = null;
  let lastErr: any = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (init?.signal?.aborted) {
      throw new DOMException("The user aborted a request.", "AbortError");
    }
    try {
      res = await fetch(targetUrl, { ...init, headers });
      break;
    } catch (err: any) {
      lastErr = err;
      if (init?.signal?.aborted || err?.name === "AbortError") {
        throw err;
      }
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
        continue;
      }
    }
  }

  if (!res) {
    if (init?.signal?.aborted || lastErr?.name === "AbortError") {
      throw lastErr;
    }
    console.warn(`[fetchWithAuth] Upstream endpoint ${targetUrl} temporarily unreachable, retrying shortly...`);
    return new Response(JSON.stringify({ error: "Service temporarily unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (res.status === 401 && typeof window !== "undefined") {
    if (init?.signal?.aborted) return res;
    // Stale or expired token; clear and re-authenticate once
    localStorage.removeItem("pvasf_auth_token");
    token = await ensureAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      try {
        res = await fetch(targetUrl, { ...init, headers });
      } catch (authRetryErr) {
        // Silently preserve res if retry fails
      }
    }
  } else if ((res.status === 500 || res.status === 502 || res.status === 503 || res.status === 504) && typeof window !== "undefined") {
    if (init?.signal?.aborted) return res;
    // Transient reverse-proxy cold-start hiccup; retry after backoff
    await new Promise((r) => setTimeout(r, 700));
    if (init?.signal?.aborted) return res;
    try {
      res = await fetch(targetUrl, { ...init, headers });
    } catch (retryErr: any) {
      if (retryErr?.name === "AbortError" || init?.signal?.aborted) {
        throw retryErr;
      }
    }
  }

  return res;
}


export async function fetchAvailableTradingDates(): Promise<string[]> {
  try {
    const res = await fetchWithAuth(`${API_BASE}/dates`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn("[fetchAvailableTradingDates] Failed to fetch dates:", err);
    return [];
  }
}

export async function fetchWatchlist(
  search?: string,
  asOfDate?: string,
  windowDays?: number,
  exchange: ExchangeScope = "ALL",
  signal?: AbortSignal
): Promise<ScripSummary[]> {
  const url = createApiUrl(`${API_BASE}/scrips`);
  if (search) url.searchParams.set("search", search);
  if (asOfDate) url.searchParams.set("as_of_date", asOfDate);
  if (windowDays) url.searchParams.set("window_days", String(windowDays));
  if (exchange) url.searchParams.set("exchange", exchange);
  
  try {
    const res = await fetchWithAuth(url.toString(), { cache: "no-store", signal });
    if (!res.ok) {
      if (signal?.aborted) return [];
      console.warn(`[fetchWatchlist] API returned status ${res.status}`);
      return [];
    }
    
    const data = await res.json();
    if (Array.isArray(data)) {
      return data.map((s: any) => ({
        ...s,
        exchange_scope: exchange,
        company: s.company || s.symbol,
        isin: s.isin || "—",
      }));
    }
    return [];
  } catch (err: any) {
    if (err?.name === "AbortError" || signal?.aborted) {
      // Intentionally aborted by newer user navigation; silently exit
      return [];
    }
    console.warn("[fetchWatchlist] Watchlist request transient error, falling back gracefully:", err);
    return [];
  }
}

/**
 * Safely normalizes backend error details (string, Pydantic error array, or object)
 * into a human-readable string without returning [object Object].
 */
export function formatErrorDetail(detail: any): string {
  if (!detail) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => (d && typeof d === "object" ? (d.msg || JSON.stringify(d)) : String(d)))
      .join("; ");
  }
  return typeof detail === "object" ? JSON.stringify(detail) : String(detail);
}

export async function fetchScripDetail(
  scripId: string,
  asOfDate?: string,
  windowDays?: number,
  exchange: ExchangeScope = "ALL"
): Promise<ScripDetail> {
  const cleanId = scripId.toUpperCase();
  const url = createApiUrl(`${API_BASE}/scrip/${cleanId}`);
  if (asOfDate) url.searchParams.set("as_of_date", asOfDate);
  if (windowDays) url.searchParams.set("window_days", String(windowDays));
  if (exchange) url.searchParams.set("exchange", exchange);

  let res = await fetchWithAuth(url.toString(), { cache: "no-store" });
  if (!res.ok && res.status >= 500) {
    await new Promise((r) => setTimeout(r, 250));
    res = await fetchWithAuth(url.toString(), { cache: "no-store" });
  }
  
  if (!res.ok) {
    let errDetail = "";
    try {
      const errJson = await res.json();
      errDetail = formatErrorDetail(errJson.detail) || JSON.stringify(errJson);
    } catch {
      errDetail = await res.text().catch(() => "");
    }
    throw new Error(`Failed to fetch details for ${cleanId} (HTTP ${res.status}): ${errDetail || res.statusText}`);
  }
  
  const data = await res.json();
  const m = data.metrics ?? {};

  // Backend uses both title-case spaced and snake_case field names; normalize core fields
  const price_rise_pct: number = m["price_rise_pct"] ?? m["Price Rise %"] ?? 0;
  const price_z: number        = m["price_z"]        ?? m["Price Z"]       ?? 0;
  const volume_z: number       = m["volume_z"]       ?? m["Volume Z"]      ?? 0;
  const band_hit_days: number  = m["band_hit_days"]  ?? m["Band Hit Days (15d)"] ?? 0;
  const new_high_days: number  = m["new_high_days"]  ?? m["180d New Highs (15d)"] ?? 0;
  const final_score: number    = m["final_score"]    ?? m["Final Score"]    ?? 0;

  const effThreshold: number   = data.threshold ?? 60;
  const mediumThreshold: number = Math.max(10, Math.round(effThreshold * 0.6));
  const risk = (data.risk as "High" | "Medium" | "Low") ?? (final_score >= effThreshold ? "High" : final_score >= mediumThreshold ? "Medium" : "Low");

  // Forward the full backend metrics object so statistical baselines (μ, σ, thresholds)
  // are available to the frontend cards without fallback recalculation (PVASF 2.2 / 2.3)
  const fullMetrics = {
    ...m,
    price_rise_pct,
    price_z,
    volume_z,
    band_hit_days,
    new_high_days,
    final_score,
  };

  return {
    ticker: data.ticker ?? cleanId,
    symbol: data.symbol ?? cleanId,
    company: data.company ?? cleanId,
    isin: data.isin ?? "—",
    risk: (data.risk as "High" | "Medium" | "Low") ?? risk,
    status: (data.status as "Open" | "Under review" | "Closed") ??
            (final_score >= effThreshold ? "Open" : final_score >= mediumThreshold ? "Under review" : "Closed"),
    threshold: effThreshold,
    watchlist: data.watchlist ?? (final_score >= effThreshold),
    exchange_scope: exchange,
    metrics: fullMetrics,
    score_breakdown: data.score_breakdown ?? [],
    history: data.history ?? [],
    summary: data.summary ?? {
      start_price: 0,
      latest_close: 0,
      price_change_pct: 0,
      avg_15d_volume: 0
    },
    shareholders: data.shareholders ?? null,
    announcements: data.announcements ?? []
  };
}

export async function fetchScripParticipants(scripId: string, asOfDate?: string, windowDays?: number): Promise<ParticipantAudit> {
  const cleanId = scripId.toUpperCase();
  const url = createApiUrl(`${API_BASE}/scrip/${cleanId}/participants`);
  if (asOfDate) url.searchParams.set("as_of_date", asOfDate);
  if (windowDays) url.searchParams.set("window_days", String(windowDays));

  const res = await fetchWithAuth(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    let errText = "";
    try {
      const errJson = await res.json();
      errText = formatErrorDetail(errJson.detail) || JSON.stringify(errJson);
    } catch {
      errText = await res.text().catch(() => "");
    }
    throw new Error(`Failed to fetch participants for ${cleanId} (HTTP ${res.status}): ${errText || res.statusText}`);
  }
  return await res.json();
}

export async function fetchTradeLog(symbol: string, exchange?: ExchangeScope): Promise<TradeRow[]> {
  const cleanId = symbol.toUpperCase();
  const url = createApiUrl(`${TRADES_API_BASE}?symbol=${cleanId}&page_size=100`);
  if (exchange && exchange !== "ALL") {
    url.searchParams.set("exchange", exchange);
  }
  const res = await fetchWithAuth(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    let errText = "";
    try {
      const errJson = await res.json();
      errText = formatErrorDetail(errJson.detail) || JSON.stringify(errJson);
    } catch {
      errText = await res.text().catch(() => "");
    }
    throw new Error(`Failed to fetch trade log for ${cleanId} (HTTP ${res.status}): ${errText || res.statusText}`);
  }
  const result = await res.json();
  const rows: TradeRow[] = result.data || [];
  return rows.map((r) => ({
    ...r,
    exchange: r.exchange || "NSE"
  }));
}

export async function fetchClient360(pan: string): Promise<ClientDetail> {
  const cleanPan = pan.toUpperCase();
  const res = await fetchWithAuth(`${CLIENTS_API_BASE}/pan/${cleanPan}`, { cache: "no-store" });
  if (!res.ok) {
    let msg = `Failed to fetch client 360 for PAN ${cleanPan}`;
    try {
      const errJson = await res.json();
      if (errJson?.detail) msg += `: ${formatErrorDetail(errJson.detail)}`;
    } catch (_) {}
    throw new Error(msg);
  }
  return await res.json();
}

export async function fetchModelWeights(): Promise<{
  weights: Record<string, number>;
  threshold: number;
}> {
  const res = await fetchWithAuth(`${API_BASE}/weights`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch model weights");
  return await res.json();
}

export async function saveModelWeights(weights: Record<string, number>, threshold?: number) {
  const res = await fetchWithAuth(`${API_BASE}/weights`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ weights, threshold })
  });
  if (!res.ok) {
    let msg = "Failed to save weights";
    try {
      const errData = await res.json();
      if (errData?.detail) msg = formatErrorDetail(errData.detail);
    } catch (_) {}
    throw new Error(msg);
  }
  return await res.json();
}

export async function uploadEodFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  try {
    const res = await fetchWithAuth(`${API_BASE}/upload-eod`, {
      method: "POST",
      body: formData
    });
    if (res.ok) return await res.json();
    let errDetail = "Failed to upload file";
    try {
      const err = await res.json();
      if (err?.detail) errDetail = formatErrorDetail(err.detail);
    } catch (_) {}
    return { error: errDetail };
  } catch (e: any) {
    return { error: e.message || "Failed to connect to backend server" };
  }
}

export async function fetchShareholdingBreakdown(scripId: string, asOfDate?: string) {
  const cleanId = scripId.toUpperCase();
  const url = createApiUrl(`${API_BASE}/scrip/${cleanId}/shareholding-breakdown`);
  if (asOfDate) url.searchParams.set("as_of_date", asOfDate);
  const res = await fetchWithAuth(url.toString(), { cache: "no-store" });
  if (!res.ok) return { symbol: cleanId, quarterly_history: [], promoter_group: [] };
  return await res.json();
}

export async function fetchCorporateActions(scripId: string, asOfDate?: string) {
  const cleanId = scripId.toUpperCase();
  const url = createApiUrl(`${API_BASE}/scrip/${cleanId}/corporate-actions`);
  if (asOfDate) url.searchParams.set("as_of_date", asOfDate);
  const res = await fetchWithAuth(url.toString(), { cache: "no-store" });
  if (!res.ok) return [];
  return await res.json();
}

export async function downloadScripExcel(
  scripId: string,
  asOfDate?: string,
  windowDays = 15,
  exchange = "ALL"
): Promise<void> {
  const cleanId = scripId.toUpperCase();
  const params = new URLSearchParams();
  if (asOfDate) params.set("as_of_date", asOfDate);
  params.set("window_days", String(windowDays));
  params.set("exchange", exchange);

  const res = await fetchWithAuth(`${API_BASE}/scrip/${cleanId}/export-excel?${params.toString()}`);
  if (!res.ok) {
    let msg = `Failed to download Excel dossier: ${res.statusText}`;
    try {
      const err = await res.json();
      if (err?.detail) msg = formatErrorDetail(err.detail);
    } catch (_) {}
    throw new Error(msg);
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `PVASF_Surveillance_${cleanId}_${asOfDate || "EOD"}.xlsx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}


