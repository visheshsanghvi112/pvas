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

export interface ParticipantAudit {
  ticker: string;
  ltp_contributors: Array<{ participant: string; contribution: number }>;
  volume_share: Array<{ participant: string; volume: number; share_pct: number }>;
  counterparty_pairs: Array<{ pair: string; volume: number; share_pct: number }>;
  reversal_pairs: Array<{ pair: string; volume: number; reversal_ratio: number }>;
  circular_loops: Array<{ loop: string; volume: number; gross_volume: number }>;
  profit_makers: Array<{ participant: string; net_pnl: number; buy_volume: number; sell_volume: number }>;
}

export interface TradeRow {
  Ftrd_Trd_Num: number;
  Ftrd_Trd_Date: string;
  Ftrd_Trd_Time: string;
  Ftrd_Trd_Qty: number;
  Ftrd_Trd_Price: number;
  Ftrd_Buy_Exch_Clnt_Token: number;
  Ftrd_Sell_Exch_Clnt_Token: number;
  Ftrd_Same_Broker_Wash_Flag?: number;
}

export interface ClientDetail {
  pan: string;
  clnt_id: string;
  tm_id: string;
  terminals: Array<{ terminal_id: string; location: string }>;
  depository_accounts: Array<{ dp_id: string; client_id: string; status: string }>;
}

const API_BASE = "http://127.0.0.1:8000/api/v1/surveillance";
const TRADES_API_BASE = "http://127.0.0.1:8000/api/v1/trades";
const CLIENTS_API_BASE = "http://127.0.0.1:8000/api/v1/clients";

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export async function fetchWatchlist(search?: string): Promise<ScripSummary[]> {
  const url = new URL(`${API_BASE}/scrips`);
  if (search) url.searchParams.set("search", search);
  
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch watchlist from backend");
  
  const data = await res.json();
  if (Array.isArray(data)) {
    return data.map((s: any) => ({
      ...s,
      company: s.company || `${s.symbol} Industries Ltd`,
      isin: s.isin || `INE${Math.abs(hashString(s.symbol)) % 900000 + 100000}A01018`
    }));
  }
  return [];
}

export async function fetchScripDetail(scripId: string): Promise<ScripDetail> {
  const cleanId = scripId.toUpperCase();
  const res = await fetch(`${API_BASE}/scrip/${cleanId}`, { cache: "no-store" });
  
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

  const risk = final_score >= 60 ? "High" : final_score >= 33 ? "Medium" : "Low";

  return {
    ticker: data.ticker ?? cleanId,
    symbol: data.symbol ?? cleanId,
    company: data.company ?? `${cleanId} Industries Ltd`,
    isin: data.isin ?? `INE${Math.abs(hashString(cleanId)) % 900000 + 100000}A01018`,
    risk: (data.risk as "High" | "Medium" | "Low") ?? risk,
    status: (data.status as "Open" | "Under review" | "Closed") ??
            (final_score >= 60 ? "Open" : final_score >= 33 ? "Under review" : "Closed"),
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

export async function fetchScripParticipants(scripId: string): Promise<ParticipantAudit> {
  const cleanId = scripId.toUpperCase();
  const res = await fetch(`${API_BASE}/scrip/${cleanId}/participants`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch participants for ${cleanId}`);
  return await res.json();
}

export async function fetchTradeLog(symbol: string): Promise<TradeRow[]> {
  const cleanId = symbol.toUpperCase();
  const res = await fetch(`${TRADES_API_BASE}/?symbol=${cleanId}&page_size=100`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch trade log for ${cleanId}`);
  const result = await res.json();
  return result.data || [];
}

export async function fetchClient360(pan: string): Promise<ClientDetail> {
  const cleanPan = pan.toUpperCase();
  const res = await fetch(`${CLIENTS_API_BASE}/pan/${cleanPan}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch client 360 for PAN ${cleanPan}`);
  return await res.json();
}

export async function saveModelWeights(weights: Record<string, number>, threshold?: number) {
  const res = await fetch(`${API_BASE}/weights`, {
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
    const res = await fetch(`${API_BASE}/upload-eod`, {
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
  const res = await fetch(`${API_BASE}/scrip/${cleanId}/shareholding-breakdown`, { cache: "no-store" });
  if (!res.ok) return { symbol: cleanId, quarterly_history: [], promoter_group: [] };
  return await res.json();
}

export interface CaseRecord {
  id: number | string;
  case_id: string;
  target_symbol: string;
  title: string;
  lead_officer: string;
  status: string;
  priority: "High" | "Medium" | "Low";
  description?: string;
  created_at: string;
  updated_at?: string;
  closed_at?: string;
  pinned_evidence_count?: number;
}

export async function fetchCases(): Promise<CaseRecord[]> {
  try {
    const res = await fetch("http://127.0.0.1:8000/api/v1/cases/", { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchCorporateActions(scripId: string) {
  const cleanId = scripId.toUpperCase();
  const res = await fetch(`${API_BASE}/scrip/${cleanId}/corporate-actions`, { cache: "no-store" });
  if (!res.ok) return [];
  return await res.json();
}

export interface AggSecDay {
  Asd_Cmp_Token: number;
  Asd_Symbol: string;
  Asd_Date: string;
  Asd_Open_Price: number;
  Asd_High_Price: number;
  Asd_Low_Price: number;
  Asd_Close_Price: number;
  Asd_Tot_Qty: number;
  Asd_Tot_Val: number;
  Asd_Tot_Trd_Cnt: number;
  Asd_High_52W: number;
  Asd_Low_52W: number;
  Asd_Up_Ckt_Lmt: number;
  Asd_Lwr_Ckt_Lmt: number;
}

export interface AggClntSecDay {
  Acsd_Cmp_Token: number;
  Acsd_Clnt_Token: number;
  Acsd_Date: string;
  Acsd_Tot_Buy_Qty: number;
  Acsd_Tot_Sell_Qty: number;
  Acsd_Pos_Cont_Val: number;
  Acsd_Neg_Cont_Val?: number;
  Acsd_Net_Cont_Val?: number;
  Acsd_Wash_Trd_Qty: number;
}

export interface AggPanPairDay {
  Appd_Cmp_Token: number;
  Appd_Buy_Clnt_Token: number;
  Appd_Sell_Clnt_Token: number;
  Appd_Date: string;
  Appd_Tot_Trd_Qty: number;
  Appd_Tot_Trd_Val: number;
  Appd_Pos_Contri: number;
  Appd_Neg_Contri?: number;
  Appd_Net_Contri?: number;
}

export async function fetchSecurityAggregates(symbol: string): Promise<AggSecDay[]> {
  const cleanSym = symbol.toUpperCase();
  const res = await fetch(`http://127.0.0.1:8000/api/v1/agg-trades/security/${cleanSym}`, { cache: "no-store" });
  if (!res.ok) return [];
  return await res.json();
}

export async function fetchClientAggregates(clntToken?: number, cmpToken?: number, targetDate?: string): Promise<AggClntSecDay[]> {
  const url = new URL("http://127.0.0.1:8000/api/v1/agg-trades/client");
  if (clntToken) url.searchParams.set("clnt_token", clntToken.toString());
  if (cmpToken) url.searchParams.set("cmp_token", cmpToken.toString());
  if (targetDate) url.searchParams.set("target_date", targetDate);
  
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return [];
  return await res.json();
}

export async function fetchPanPairAggregates(buyClntToken?: number, cmpToken?: number, targetDate?: string): Promise<AggPanPairDay[]> {
  const url = new URL("http://127.0.0.1:8000/api/v1/agg-trades/pan_pair");
  if (buyClntToken) url.searchParams.set("buy_clnt_token", buyClntToken.toString());
  if (cmpToken) url.searchParams.set("cmp_token", cmpToken.toString());
  if (targetDate) url.searchParams.set("target_date", targetDate);
  
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return [];
  return await res.json();
}

