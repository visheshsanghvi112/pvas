"use client";

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { alertDrivers, bandEvents, ltpContribution, priceSeries, riskDistribution, rollingComparison, scoreDistribution, volumeSeries } from "@/lib/data";

const ownershipData = [
  { holder: "Promoter", t180: 54, t: 52 },
  { holder: "Top 1%", t180: 65, t: 60 }
];

const panHolderData = [
  { period: "T-180", holders: 80 },
  { period: "T", holders: 123 }
];

export function PriceChart() {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={priceSeries}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="day" hide />
        <YAxis />
        <Tooltip />
        <Line dataKey="price" stroke="#2563eb" strokeWidth={3} dot={false} />
        <Line dataKey="ma20" stroke="#059669" dot={false} />
        <Line dataKey="ma50" stroke="#d97706" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function VolumeChart() {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={volumeSeries}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="day" hide />
        <YAxis />
        <Tooltip />
        <Bar dataKey="volume" fill="#3b82f6" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LtpChart() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={ltpContribution} layout="vertical">
        <XAxis type="number" />
        <YAxis dataKey="participant" type="category" width={80} />
        <Tooltip />
        <Bar dataKey="contribution" fill="#2563eb" radius={[0, 8, 8, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RiskDonut() {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={riskDistribution} dataKey="count" nameKey="risk" innerRadius={58} outerRadius={86} paddingAngle={3}>
          {riskDistribution.map((entry) => <Cell key={entry.risk} fill={entry.fill} />)}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ScoreDistributionChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={scoreDistribution}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="bucket" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" fill="#2563eb" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AlertDriversChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={alertDrivers}>
        <XAxis dataKey="metric" />
        <YAxis domain={[0, 5]} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="score" fill="#2563eb" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RollingPriceChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={rollingComparison}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="day" hide />
        <YAxis />
        <Tooltip />
        <Line dataKey="price15" name="15 Day C-C Avg" stroke="#2563eb" strokeWidth={3} dot={false} />
        <Line dataKey="price180" name="180 Day Rolling Mean" stroke="#64748b" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function RollingVolumeChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={rollingComparison}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="day" hide />
        <YAxis />
        <Tooltip />
        <Line dataKey="volume15" name="15 Day Avg Volume" stroke="#2563eb" strokeWidth={3} dot={false} />
        <Line dataKey="volume180" name="180 Day Avg Volume" stroke="#64748b" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BandEventsChart() {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={bandEvents} layout="vertical">
        <XAxis type="number" domain={[0, 15]} />
        <YAxis dataKey="metric" type="category" width={80} />
        <Tooltip />
        <Bar dataKey="days" fill="#0ea5e9" radius={[0, 8, 8, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function OwnershipChangeChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={ownershipData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="holder" />
        <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
        <Tooltip formatter={(value) => `${value}%`} />
        <Bar dataKey="t180" name="T-180" fill="#94a3b8" radius={[8, 8, 0, 0]} />
        <Bar dataKey="t" name="T" fill="#2563eb" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PanHolderChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={panHolderData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="period" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="holders" name="Unique PAN holders" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
