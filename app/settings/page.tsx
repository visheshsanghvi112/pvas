import { BellRing, Database, Gauge, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MetricHelp } from "@/components/ui/metric-help";
import type { MetricHelpKey } from "@/lib/metric-help";

const scoreRows = [
  ["Price Rise", ["Under 15%", "15% - 75%", "76% - 150%", "> 150%"], "priceRise" as const],
  ["Price Z", ["< 1.645", "≥ 1.645", "≥ 2.33", "≥ 3.09"], "priceZ" as const],
  ["Volume Z", ["< 1.645", "≥ 1.645", "≥ 2.33", "≥ 3.09"], "volumeZ" as const],
  ["Band Hits", ["0 - 2 days", "3 - 5 days", "6 - 9 days", "≥ 10 days"], "bandPersistence" as const],
  ["180D Highs", ["0 days", "1 - 5 days", "5 - 9 days", "≥ 10 days"], "highBreakout" as const]
] as const;

const weights = [
  ["Price Rise", 25, "priceRise" as const],
  ["Price Z", 20, "priceZ" as const],
  ["Volume Z", 25, "volumeZ" as const],
  ["Band Persistence", 15, "bandPersistence" as const],
  ["180D High", 15, "highBreakout" as const]
] as const;

function FieldLabel({ label, helpKey }: { label: string; helpKey?: MetricHelpKey }) {
  return (
    <span className="flex items-center text-xs font-semibold text-slate-500">
      {label}
      <MetricHelp helpKey={helpKey} />
    </span>
  );
}

function NumberField({ label, value, min = 0, max, suffix, helpKey }: { label: string; value: number; min?: number; max?: number; suffix?: string; helpKey?: MetricHelpKey }) {
  return (
    <label className="space-y-2">
      <FieldLabel label={label} helpKey={helpKey} />
      <div className="flex items-center gap-2">
        <Input type="number" min={min} max={max} step={1} defaultValue={value} inputMode="numeric" />
        {suffix ? <span className="text-sm font-semibold text-slate-500">{suffix}</span> : null}
      </div>
    </label>
  );
}

function SelectField({ label, value, options, helpKey }: { label: string; value: string; options: readonly string[]; helpKey?: MetricHelpKey }) {
  return (
    <label className="space-y-2">
      <FieldLabel label={label} helpKey={helpKey} />
      <select defaultValue={value} className="h-10 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary">
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function MultiSelectField({ label, options, selected }: { label: string; options: readonly string[]; selected: readonly string[] }) {
  return (
    <div className="space-y-2">
      <FieldLabel label={label} />
      <div className="grid gap-2 rounded-xl border bg-white p-3">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" defaultChecked={selected.includes(option)} className="h-4 w-4 rounded border-slate-300 accent-slate-950" />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">PVASF</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Configuration</h1>
        </div>
        <Button>Save Configuration</Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <Gauge className="h-5 w-5 text-blue-600" />
            <CardTitle helpKey="compositeScore">Alert Eligibility</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <NumberField label="Watchlist Score" value={60} max={100} />
            <NumberField label="High Risk Score" value={75} max={100} />
            <NumberField label="Critical Score" value={90} max={100} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <Database className="h-5 w-5 text-blue-600" />
            <CardTitle>Observation Windows</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <NumberField label="Alert Window" value={15} min={1} max={60} suffix="days" />
            <NumberField label="History Window" value={180} min={30} max={365} suffix="days" />
            <SelectField label="PAN Snapshot" value="T and T-180" options={["T", "T and T-90", "T and T-180"]} helpKey="shareholding" />
            <NumberField label="Corporate Lookback" value={15} min={1} max={180} suffix="days" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <SlidersHorizontal className="h-5 w-5 text-blue-600" />
          <CardTitle>Metric Score Bands</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-2xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {["Metric", "Score 0", "Score 1", "Score 3", "Score 5"].map((head) => (
                    <th key={head} className="px-4 py-3 font-semibold">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {scoreRows.map(([metric, options, helpKey]) => (
                  <tr key={metric}>
                    <td className="px-4 py-3 font-semibold">{metric}<MetricHelp helpKey={helpKey} /></td>
                    {options.map((value) => (
                      <td key={value} className="px-4 py-3">
                        <select defaultValue={value} className="h-9 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary">
                          {options.map((option) => <option key={option}>{option}</option>)}
                        </select>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div>
        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <SlidersHorizontal className="h-5 w-5 text-blue-600" />
            <CardTitle helpKey="compositeScore">Model Weights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {weights.map(([label, value, helpKey]) => (
              <div key={label} className="grid grid-cols-[1fr_120px] items-center gap-4">
                <div className="flex items-center text-sm font-semibold">{label}<MetricHelp helpKey={helpKey} /></div>
                <Input type="number" min={0} max={100} step={1} defaultValue={value} className="h-9" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <BellRing className="h-5 w-5 text-blue-600" />
          <CardTitle>Outputs & Notifications</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <MultiSelectField label="Display Outputs" options={["PV", "Corporate", "Shareholding", "Suspects"]} selected={["PV", "Corporate", "Shareholding", "Suspects"]} />
          <MultiSelectField label="Participant Flags" options={["Volume", "LTP", "Counterparty", "Profit"]} selected={["Volume", "LTP", "Counterparty", "Profit"]} />
          <SelectField label="Notify On" value="High risk" options={["High risk", "High + medium risk", "Unresolved clarification", "All alerts"]} />
        </CardContent>
      </Card>
    </div>
  );
}
