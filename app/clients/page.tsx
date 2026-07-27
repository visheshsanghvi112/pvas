"use client";

import { useState, useEffect } from "react";
import { 
  UserCheck, 
  Search, 
  Building, 
  ChevronRight,
  ChevronLeft,
  Eye,
  X,
  Link as LinkIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ExchClient {
  Decl_Exch_Clnt_Token: number;
  Decl_Clnt_Token: number;
  Decl_TM_Id: string;
  Decl_Clnt_Id: string;
  Decl_Client_Code: string;
  Decl_Clnt_Pan: string;
  Decl_Clnt_Name: string;
  Decl_Clnt_Catg_Type_Desc: string;
  Decl_Clnt_Stat: number;
  Decl_City: string;
  Decl_State: string;
  Decl_Frst_Email_Id: string;
  Decl_Frst_Mob_Num: string;
  Decl_Rec_Date: string;
  Decl_Exch_Id: string;
}

interface DepClient {
  Ddcl_Dep_Clnt_Token: number;
  Ddcl_Clnt_Token: number;
  Ddcl_Dep_Token: number;
  Ddcl_BP_Id: string;
  Ddcl_Clnt_Id: string;
  Ddcl_Clnt_Pan: string;
  Ddcl_Clnt_Name: string;
  Ddcl_Clnt_Catg_Type_Desc: string;
  Ddcl_City: string;
  Ddcl_Acct_Openng_Date: string;
  Ddcl_Poa_Enbld_Indc?: string;
}

interface ClientProfileResponse {
  exchange_account: ExchClient;
  depository_accounts: DepClient[];
}

export default function ClientProfilePage() {
  const [clients, setClients] = useState<ExchClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [query, setQuery] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<ClientProfileResponse | null>(null);

  useEffect(() => {
    loadClients();
  }, [page]);

  async function loadClients() {
    setLoading(true);
    try {
      const url = new URL("http://127.0.0.1:8000/api/v1/clients/exchange");
      url.searchParams.set("page", page.toString());
      url.searchParams.set("page_size", pageSize.toString());
      if (query) url.searchParams.set("name", query);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setClients(data.data || []);
        setTotal(data.pagination?.total || 0);
        setTotalPages(data.pagination?.total_pages || 1);
      }
    } catch (e) {
      console.error("Failed to load exchange clients", e);
    } finally {
      setLoading(false);
    }
  }

  async function searchClients() {
    if (!query) return loadClients();
    setLoading(true);
    try {
      const url = new URL("http://127.0.0.1:8000/api/v1/clients/exchange/search");
      url.searchParams.set("q", query);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setClients(data || []);
        setTotal(data.length || 0);
        setTotalPages(1);
      }
    } catch (e) {
      console.error("Search failed", e);
    } finally {
      setLoading(false);
    }
  }

  async function openProfile(token: number) {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/clients/profile/${token}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedProfile(data);
      }
    } catch (e) {
      console.error("Failed to fetch profile", e);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" />
            Client 360° Profile & Cross-Market Account Reconstruct
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cross-market audit matching Exchange Accounts (<code className="bg-muted px-1 py-0.5 rounded text-xs">DECL</code>) with Depository Accounts (<code className="bg-muted px-1 py-0.5 rounded text-xs">DDCL</code>).
          </p>
        </div>
      </div>

      {/* Search Filter */}
      <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
        <div className="flex gap-3 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by PAN, Client ID, or Name"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchClients()}
            />
          </div>
          <Button onClick={searchClients}>Search</Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-[11px] font-semibold tracking-wider border-b border-border">
              <tr>
                <th className="px-4 py-3">Client Token</th>
                <th className="px-4 py-3">PAN Number</th>
                <th className="px-4 py-3">Client Name</th>
                <th className="px-4 py-3">TM ID (Broker)</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Loading client directory...
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No client records match the search query.
                  </td>
                </tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.Decl_Exch_Clnt_Token} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {c.Decl_Exch_Clnt_Token}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-foreground">
                      {c.Decl_Clnt_Pan}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {c.Decl_Clnt_Name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {c.Decl_TM_Id}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="bg-muted px-2 py-0.5 rounded text-muted-foreground">
                        {c.Decl_Clnt_Catg_Type_Desc || "Individual"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {c.Decl_City || "Mumbai"}, {c.Decl_State || "Maharashtra"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500">
                        ACTIVE
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" className="h-8 px-2 text-xs" onClick={() => openProfile(c.Decl_Exch_Clnt_Token)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> 360° Profile
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
          <div>
            Showing <span className="font-semibold text-foreground">{(page - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-foreground">{Math.min(page * pageSize, total)}</span> of{" "}
            <span className="font-semibold text-foreground">{total.toLocaleString()}</span> registered client accounts
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-8 px-2 text-xs"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <span>Page {page} of {totalPages}</span>
            <Button
              variant="outline"
              className="h-8 px-2 text-xs"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Client 360 Profile Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  Client 360° Cross-Market Profile
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  PAN: {selectedProfile.exchange_account.Decl_Clnt_Pan} | Name: {selectedProfile.exchange_account.Decl_Clnt_Name}
                </p>
              </div>
              <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => setSelectedProfile(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Exchange Account Summary Card */}
            <div className="bg-muted/30 border border-border p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Building className="h-4 w-4 text-primary" />
                Exchange Trading Account (DECL)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block">Client Code:</span>
                  <span className="font-mono font-medium text-foreground">{selectedProfile.exchange_account.Decl_Client_Code}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Trading Member ID:</span>
                  <span className="font-mono text-foreground">{selectedProfile.exchange_account.Decl_TM_Id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Email ID:</span>
                  <span className="text-foreground">{selectedProfile.exchange_account.Decl_Frst_Email_Id}</span>
                </div>
              </div>
            </div>

            {/* Linked Depository Accounts Card */}
            <div className="bg-muted/30 border border-border p-4 rounded-lg space-y-3">
              <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <LinkIcon className="h-4 w-4 text-primary" />
                Linked Depository Demat Accounts (DDCL — Cross-Referenced)
              </h4>

              {selectedProfile.depository_accounts.length === 0 ? (
                <p className="text-xs text-muted-foreground">No linked depository account records found for this client token.</p>
              ) : (
                <div className="space-y-2">
                  {selectedProfile.depository_accounts.map((dep) => (
                    <div key={dep.Ddcl_Dep_Clnt_Token} className="bg-card p-3 rounded border border-border/60 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <span className="text-muted-foreground block">DP ID:</span>
                        <span className="font-mono font-semibold text-foreground">{dep.Ddcl_BP_Id}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Depository:</span>
                        <span className="text-foreground">{dep.Ddcl_Dep_Token === 1 ? "NSDL" : "CDSL"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Opening Date:</span>
                        <span className="text-foreground">{dep.Ddcl_Acct_Openng_Date || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">PoA Status:</span>
                        <span className="text-emerald-500 font-semibold">{dep.Ddcl_Poa_Enbld_Indc || "Active"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" className="h-8 text-xs px-3" onClick={() => setSelectedProfile(null)}>
                Close Profile
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
