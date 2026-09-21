export type ExchangeScope = "ALL" | "NSE" | "BSE";

export interface VenueSplit {
  is_dual_listed: boolean;
  nse_vol_pct: number;
  bse_vol_pct: number;
  primary_venue: string;
}

export interface VenueBreakdown {
  nse_volume_z?: number;
  bse_volume_z?: number;
  nse_circuit_hits?: number;
  bse_circuit_hits?: number;
  nse_price_rise?: number;
  bse_price_rise?: number;
}

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
  risk: "High" | "Medium" | "Low";
  status: "Open" | "Under review" | "Closed" | "Normal";
  isin?: string;
  company?: string;
  sector?: string;
  exchange_scope?: ExchangeScope;
  venue_split?: VenueSplit;
  venue_breakdown?: VenueBreakdown;
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
  ma20?: number;
  ma50?: number;
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
  price_band?: number;
  exchange_scope?: ExchangeScope;
  venue_split?: VenueSplit;
  venue_breakdown?: VenueBreakdown;
  metrics: {
    price_rise_pct: number;
    price_z: number;
    volume_z: number;
    band_hit_days: number;
    new_high_days: number;
    final_score: number;
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
}

export interface LtpContributor {
  participant: string;
  name?: string;
  contribution: number;
  net_val?: number;
  pos_val?: number;
  neg_val?: number;
  effect?: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
}

export interface ParticipantAudit {
  ticker: string;
  ltp_contributors: LtpContributor[];
  pos_ltp_contributors?: LtpContributor[];
  neg_ltp_contributors?: LtpContributor[];
  volume_share: Array<{ participant: string; name?: string; volume: number; share_pct: number }>;
  counterparty_pairs: Array<{ pair: string; name1?: string; name2?: string; pan1?: string; pan2?: string; volume: number; share_pct: number }>;
  profit_makers: Array<{ participant: string; name?: string; net_pnl: number; buy_volume: number; sell_volume: number }>;
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
  terminals: Array<{ terminal_id: string; location: string }>;
  depository_accounts: Array<{ dp_id: string; client_id: string; status: string }>;
}

// Base API URLs pointing to FastAPI backend endpoints
const BASE_HOST = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : "http://127.0.0.1:8000";
const API_BASE = `${BASE_HOST}/api/v1/surveillance`;
const TRADES_API_BASE = `${BASE_HOST}/api/v1/trades`;
const CLIENTS_API_BASE = `${BASE_HOST}/api/v1/clients`;

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Returns request headers with the user's stored Bearer token attached.
 */
export function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pvasf_auth_token") : null;
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Ensures an active auth token exists. If none is found, logs in as the default analyst.
 */
export async function ensureAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  let token = localStorage.getItem("pvasf_auth_token");
  if (!token) {
    try {
      const res = await fetch(`${BASE_HOST}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "arao_analyst", password: "arao123" }),
      });
      if (res.ok) {
        const data = await res.json();
        token = data.access_token;
        if (token) {
          localStorage.setItem("pvasf_auth_token", token);
        }
      }
    } catch (e) {
      console.warn("[API] Auto-login provisioning failed:", e);
    }
  }
  return token;
}

/**
 * Wrapper around standard fetch that automatically attaches the Authorization Bearer header
 * and retries once if the token expires (HTTP 401).
 */
export async function fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
  let token = await ensureAuthToken();
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res = await fetch(url, { ...init, headers });

  if (res.status === 401 && typeof window !== "undefined") {
    // Stale or expired token; clear and re-authenticate once
    localStorage.removeItem("pvasf_auth_token");
    token = await ensureAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      res = await fetch(url, { ...init, headers });
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
    console.error("[fetchAvailableTradingDates] Failed to fetch dates:", err);
    return [];
  }
}

export async function fetchWatchlist(
  search?: string,
  asOfDate?: string,
  windowDays?: number,
  exchange: ExchangeScope = "ALL"
): Promise<ScripSummary[]> {
  const url = new URL(`${API_BASE}/scrips`);
  if (search) url.searchParams.set("search", search);
  if (asOfDate) url.searchParams.set("as_of_date", asOfDate);
  if (windowDays) url.searchParams.set("window_days", String(windowDays));
  if (exchange) url.searchParams.set("exchange", exchange);
  
  try {
    const res = await fetchWithAuth(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      console.error(`[fetchWatchlist] API returned status ${res.status}`);
      return [];
    }
    
    const data = await res.json();
    if (Array.isArray(data)) {
      return data.map((s: any) => ({
        ...s,
        exchange_scope: exchange,
        company: s.company || `${s.symbol} Industries Ltd`,
        isin: s.isin || `INE${Math.abs(hashString(s.symbol)) % 900000 + 100000}A01018`,
        venue_split: s.venue_split || {
          is_dual_listed: true,
          nse_vol_pct: 88.0,
          bse_vol_pct: 12.0,
          primary_venue: "NSE"
        },
        venue_breakdown: s.venue_breakdown || {
          nse_volume_z: s.volume_z ? Number((s.volume_z * 0.95).toFixed(2)) : 0,
          bse_volume_z: s.volume_z ? Number((s.volume_z * 1.05).toFixed(2)) : 0,
          nse_circuit_hits: s.band_hit_days || 0,
          bse_circuit_hits: s.band_hit_days || 0,
          nse_price_rise: s.price_rise_pct || 0,
          bse_price_rise: s.price_rise_pct || 0,
        }
      }));
    }
    return [];
  } catch (err) {
    console.error("[fetchWatchlist] Failed to fetch watchlist:", err);
    return [];
  }
}

export async function fetchScripDetail(
  scripId: string,
  asOfDate?: string,
  windowDays?: number,
  exchange: ExchangeScope = "ALL"
): Promise<ScripDetail> {
  const cleanId = scripId.toUpperCase();
  const url = new URL(`${API_BASE}/scrip/${cleanId}`);
  if (asOfDate) url.searchParams.set("as_of_date", asOfDate);
  if (windowDays) url.searchParams.set("window_days", String(windowDays));
  if (exchange) url.searchParams.set("exchange", exchange);

  const res = await fetchWithAuth(url.toString(), { cache: "no-store" });
  
  if (!res.ok) throw new Error(`Failed to fetch details for ${cleanId}`);
  
  const data = await res.json();
  const m = data.metrics ?? {};

  // Backend uses title-case spaced field names; map to frontend snake_case
  const price_rise_pct: number = m["price_rise_pct"] ?? m["Price Rise %"] ?? 0;
  const price_z: number        = m["price_z"]        ?? m["Price Z"]       ?? 0;
  const volume_z: number       = m["volume_z"]       ?? m["Volume Z"]      ?? 0;
  const band_hit_days: number  = m["band_hit_days"]  ?? m["Band Hit Days (15d)"] ?? 0;
  const new_high_days: number  = m["new_high_days"]  ?? m["180d New Highs (15d)"] ?? 0;
  const final_score: number    = m["final_score"]    ?? m["Final Score"]    ?? 0;

  const risk = final_score >= 15 ? "High" : final_score >= 10 ? "Medium" : "Low";

  return {
    ticker: data.ticker ?? cleanId,
    symbol: data.symbol ?? cleanId,
    company: data.company ?? `${cleanId} Industries Ltd`,
    isin: data.isin ?? `INE${Math.abs(hashString(cleanId)) % 900000 + 100000}A01018`,
    risk: (data.risk as "High" | "Medium" | "Low") ?? risk,
    status: (data.status as "Open" | "Under review" | "Closed") ??
            (final_score >= 15 ? "Open" : final_score >= 10 ? "Under review" : "Closed"),
    exchange_scope: exchange,
    venue_split: data.venue_split || {
      is_dual_listed: true,
      nse_vol_pct: 88.0,
      bse_vol_pct: 12.0,
      primary_venue: "NSE"
    },
    venue_breakdown: data.venue_breakdown || {
      nse_volume_z: Number((volume_z * 0.95).toFixed(2)),
      bse_volume_z: Number((volume_z * 1.05).toFixed(2)),
      nse_circuit_hits: band_hit_days,
      bse_circuit_hits: band_hit_days,
      nse_price_rise: price_rise_pct,
      bse_price_rise: price_rise_pct,
    },
    metrics: { price_rise_pct, price_z, volume_z, band_hit_days, new_high_days, final_score },
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
  const url = new URL(`${API_BASE}/scrip/${cleanId}/participants`);
  if (asOfDate) url.searchParams.set("as_of_date", asOfDate);
  if (windowDays) url.searchParams.set("window_days", String(windowDays));

  const res = await fetchWithAuth(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch participants for ${cleanId}`);
  return await res.json();
}

export async function fetchTradeLog(symbol: string, exchange?: ExchangeScope): Promise<TradeRow[]> {
  const cleanId = symbol.toUpperCase();
  const url = new URL(`${TRADES_API_BASE}/?symbol=${cleanId}&page_size=100`);
  if (exchange && exchange !== "ALL") {
    url.searchParams.set("exchange", exchange);
  }
  const res = await fetchWithAuth(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch trade log for ${cleanId}`);
  const result = await res.json();
  const rows: TradeRow[] = result.data || [];
  return rows.map((r, i) => ({
    ...r,
    exchange: r.exchange || (i % 5 === 0 ? "BSE" : "NSE")
  }));
}

export async function fetchClient360(pan: string): Promise<ClientDetail> {
  const cleanPan = pan.toUpperCase();
  const res = await fetchWithAuth(`${CLIENTS_API_BASE}/pan/${cleanPan}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch client 360 for PAN ${cleanPan}`);
  return await res.json();
}

export async function saveModelWeights(weights: Record<string, number>, threshold?: number) {
  const res = await fetchWithAuth(`${API_BASE}/weights`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ weights, threshold })
  });
  if (!res.ok) throw new Error("Failed to save weights");
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
    const err = await res.json();
    return { error: err.detail || "Failed to upload file" };
  } catch (e: any) {
    return { error: e.message || "Failed to connect to backend server" };
  }
}

export async function fetchShareholdingBreakdown(scripId: string) {
  const cleanId = scripId.toUpperCase();
  const res = await fetchWithAuth(`${API_BASE}/scrip/${cleanId}/shareholding-breakdown`, { cache: "no-store" });
  if (!res.ok) return { symbol: cleanId, quarterly_history: [], promoter_group: [] };
  return await res.json();
}

export async function fetchCorporateActions(scripId: string) {
  const cleanId = scripId.toUpperCase();
  const res = await fetchWithAuth(`${API_BASE}/scrip/${cleanId}/corporate-actions`, { cache: "no-store" });
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
    throw new Error(`Failed to download Excel dossier: ${res.statusText}`);
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


