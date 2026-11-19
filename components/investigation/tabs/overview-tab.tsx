"use client";

import React from "react";
import { Activity, TrendingUp, Zap } from "lucide-react";
import {
  ParameterRadarChart,
  SurveillanceStatisticalDeck,
  AnomalyEventMatrixChart,
  CombinedMarketChart,
} from "@/components/investigation/charts";
import type { ScripDetail } from "@/lib/api";
import { Card, SectionHeader } from "./shared";

export interface OverviewTabProps {
  detail: ScripDetail;
  metrics: any;
  history: any[];
  activeWeights: Record<string, number>;
  windowDays: number;
  onExpandChart: (chart: { title: string; subtitle?: string; chart: React.ReactNode }) => void;
}

export function OverviewTab({
  detail,
  metrics,
  history,
  activeWeights,
  windowDays,
  onExpandChart,
}: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* 5-Parameter Risk Radar Signature Command Card */}
      <Card className="bg-gradient-to-br from-white via-slate-50/60 to-blue-50/20 border-slate-200/90 shadow-xs">
        <SectionHeader
          icon={<Activity className="w-4.5 h-4.5 text-blue-600" />}
          title="5-Parameter Risk Radar Profile & Intelligence Signature"
          subtitle="Comprehensive 0–5 parameter score radar mapped against Risk Thresholds"
          onExpand={() =>
            onExpandChart({
              title: "5-Parameter Risk Radar Profile & Intelligence Signature",
              subtitle: "Comprehensive 0–5 parameter score radar mapped against Risk Thresholds",
              chart: (
                <ParameterRadarChart
                  metrics={metrics}
                  weights={activeWeights}
                  threshold={detail.threshold ?? 60}
                />
              ),
            })
          }
        />
        <div className="p-4 md:p-5">
          <ParameterRadarChart
            metrics={metrics}
            weights={activeWeights}
            threshold={detail.threshold ?? 60}
          />
        </div>
      </Card>

      {/* Unified Price, Volume & DMA Surveillance Analysis Chart */}
      <Card className="group border-slate-200/90 shadow-xs overflow-hidden">
        <SectionHeader
          icon={<TrendingUp className="w-4.5 h-4.5 text-indigo-600" />}
          title="Unified Price, Volume & DMA Analysis"
          subtitle={`Dual-axis market chart with 20 DMA, 50 DMA, traded volume, and ${windowDays}-day analysis window`}
          onExpand={() =>
            onExpandChart({
              title: "Unified Price, Volume & DMA Analysis",
              subtitle: `Dual-axis market chart with 20 DMA, 50 DMA, traded volume, and ${windowDays}-day analysis window`,
              chart: (
                <CombinedMarketChart
                  history={history}
                  metrics={metrics}
                  windowDays={windowDays}
                  threshold={detail.threshold ?? 60}
                  isExpanded={true}
                />
              ),
            })
          }
        />
        <div className="p-4 md:p-5">
          <CombinedMarketChart
            history={history}
            metrics={metrics}
            windowDays={windowDays}
            threshold={detail.threshold ?? 60}
          />
        </div>
      </Card>

      {/* 3-Pillar Core Surveillance Statistical Deck (Preserves all 180D Price, Return Z-Score, and Volume Z-Score metrics) */}
      <SurveillanceStatisticalDeck
        history={history}
        metrics={metrics}
        summary={detail.summary}
        weights={activeWeights}
        windowDays={windowDays}
      />

      <div className="space-y-4">
        {/* Days in past windowDays the scrip hit 180-day high & 90% of price band */}
        <Card>
          <SectionHeader
            icon={<Zap className="w-4 h-4 text-amber-600" />}
            title={`Number of days in past ${windowDays} days the scrip hit 180-day high & 90% of price band`}
            subtitle={`Breakout frequency and price band persistence counts over the ${windowDays}-day analysis window`}
            onExpand={() =>
              onExpandChart({
                title: `Number of days in past ${windowDays} days the scrip hit 180-day high & 90% of price band`,
                subtitle: `Breakout frequency and price band persistence counts over the ${windowDays}-day analysis window`,
                chart: (
                  <AnomalyEventMatrixChart
                    history={history}
                    metrics={metrics}
                    bandPercent={detail?.price_band ?? 0.05}
                    windowDays={windowDays}
                    isExpanded={true}
                  />
                ),
              })
            }
          />
          <div className="p-4 md:p-5">
            <AnomalyEventMatrixChart
              history={history}
              metrics={metrics}
              bandPercent={detail?.price_band ?? 0.05}
              windowDays={windowDays}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
