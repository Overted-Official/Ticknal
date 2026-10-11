'use client';

import React, { useState } from 'react';
import { X, Check, AlertCircle, Save } from '@/components/ui/icon-library';
import InlineSpinner from '@/components/ui/InlineSpinner';
import type { PlanLimits, PlanFeatures } from '@/lib/server/plans-service';

export interface EditablePlanData {
  tier: string;
  name: string;
  description?: string | null;
  monthlyPriceEgp: number;
  annualPriceEgp: number;
  annualDiscountPct?: number;
  badge?: string | null;
  color: string;
  limits?: PlanLimits;
  planFeatures?: PlanFeatures;
}

interface EditPlanDrawerProps {
  plan: EditablePlanData;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditPlanDrawer({
  plan,
  onClose,
  onSaved,
}: EditPlanDrawerProps) {
  const [monthlyPrice, setMonthlyPrice] = useState(plan.monthlyPriceEgp);
  const [annualPrice, setAnnualPrice] = useState(plan.annualPriceEgp);
  const [annualDiscount, setAnnualDiscount] = useState(plan.annualDiscountPct ?? 17);
  const [badge, setBadge] = useState(plan.badge || '');

  // Limits
  const [chartsPerTab, setChartsPerTab] = useState(plan.limits?.chartsPerTab ?? 2);
  const [indicatorsPerChart, setIndicatorsPerChart] = useState(plan.limits?.indicatorsPerChart ?? 5);
  const [historicalBars, setHistoricalBars] = useState(plan.limits?.historicalBars ?? 2000);
  const [priceAlerts, setPriceAlerts] = useState(plan.limits?.priceAlerts ?? 0);
  const [pushAlerts, setPushAlerts] = useState(plan.limits?.pushAlerts ?? 0);

  // Features
  const [hydra, setHydra] = useState(Boolean(plan.planFeatures?.hydraIndicator));
  const [typhoon, setTyphoon] = useState(Boolean(plan.planFeatures?.typhoonEngine));
  const [cerberus, setCerberus] = useState(Boolean(plan.planFeatures?.cerberusConfluence));
  const [breakout, setBreakout] = useState(plan.planFeatures?.breakoutDetection ?? 'none');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = {
        monthlyPriceEgp: Number(monthlyPrice),
        annualPriceEgp: Number(annualPrice),
        annualDiscountPct: Number(annualDiscount),
        badge: badge.trim(),
        limits: {
          chartsPerTab: Number(chartsPerTab),
          indicatorsPerChart: Number(indicatorsPerChart),
          historicalBars: Number(historicalBars),
          parallelConnections: plan.limits?.parallelConnections ?? 10,
          priceAlerts: Number(priceAlerts),
          technicalAlerts: Number(priceAlerts),
          pushAlerts: Number(pushAlerts),
        },
        features: {
          breakoutDetection: breakout,
          hydraIndicator: hydra,
          typhoonEngine: typhoon,
          cerberusConfluence: cerberus,
          egxCoverage: true,
          screeners: true,
          devicesSync: true,
          noAds: true,
        },
      };

      const res = await fetch(`/api/console/plans/${plan.tier}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update plan');
      }

      setSuccess(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Error saving plan configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm select-none font-sans">
      <div className="w-full max-w-xl h-full bg-black border-l border-white/10 rounded-none flex flex-col justify-between overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black shrink-0">
          <div className="flex items-center gap-2.5">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: plan.color }}
            />
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Edit {plan.name}
              </h3>
              <p className="text-[11px] text-zinc-400">
                Tier configuration, commercial rates, quotas & feature gates
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
              <Check size={14} className="shrink-0" />
              <span>Plan updated successfully. Propagating globally...</span>
            </div>
          )}

          {/* Section 1: Commercial Pricing & Packaging */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider text-zinc-400">
              1. Commercial Pricing (EGP)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Monthly Rate (EGP)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={monthlyPrice}
                  onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-md bg-white/[0.04] border border-white/10 text-white text-xs tabular-nums focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Annual Pass Total (EGP)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={annualPrice}
                  onChange={(e) => setAnnualPrice(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-md bg-white/[0.04] border border-white/10 text-white text-xs tabular-nums focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Annual Discount (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={annualDiscount}
                  onChange={(e) => setAnnualDiscount(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-md bg-white/[0.04] border border-white/10 text-white text-xs tabular-nums focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Card Badge Label
                </label>
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="e.g. Most Popular"
                  className="w-full h-9 px-3 rounded-md bg-white/[0.04] border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Hardware & Usage Limits */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider text-zinc-400">
              2. Hardware & Usage Limits
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Charts per Layout
                </label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={chartsPerTab}
                  onChange={(e) => setChartsPerTab(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-md bg-white/[0.04] border border-white/10 text-white text-xs tabular-nums focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Indicators per Chart
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={indicatorsPerChart}
                  onChange={(e) => setIndicatorsPerChart(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-md bg-white/[0.04] border border-white/10 text-white text-xs tabular-nums focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Historical Bars
                </label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={historicalBars}
                  onChange={(e) => setHistoricalBars(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-md bg-white/[0.04] border border-white/10 text-white text-xs tabular-nums focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Price Alerts (-1 = Unlim.)
                </label>
                <input
                  type="number"
                  min="-1"
                  value={priceAlerts}
                  onChange={(e) => setPriceAlerts(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-md bg-white/[0.04] border border-white/10 text-white text-xs tabular-nums focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Push Alerts (-1 = Unlim.)
                </label>
                <input
                  type="number"
                  min="-1"
                  value={pushAlerts}
                  onChange={(e) => setPushAlerts(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-md bg-white/[0.04] border border-white/10 text-white text-xs tabular-nums focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Feature Entitlements */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider text-zinc-400">
              3. Feature Entitlements & Quantitative Engines
            </h4>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:bg-white/[0.04] transition-colors">
                <div>
                  <span className="text-xs font-medium text-white block">Hydra Adaptive Momentum Indicator</span>
                  <span className="text-[10px] text-zinc-400">Proprietary dynamic momentum engine</span>
                </div>
                <input
                  type="checkbox"
                  checked={hydra}
                  onChange={(e) => setHydra(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 text-blue-600 focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:bg-white/[0.04] transition-colors">
                <div>
                  <span className="text-xs font-medium text-white block">Typhoon Volume Imbalance Engine</span>
                  <span className="text-[10px] text-zinc-400">Institutional liquidity and order block detector</span>
                </div>
                <input
                  type="checkbox"
                  checked={typhoon}
                  onChange={(e) => setTyphoon(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 text-blue-600 focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:bg-white/[0.04] transition-colors">
                <div>
                  <span className="text-xs font-medium text-white block">Cerberus Multi-Factor Confluence</span>
                  <span className="text-[10px] text-zinc-400">Triple-filter quant confirmation model</span>
                </div>
                <input
                  type="checkbox"
                  checked={cerberus}
                  onChange={(e) => setCerberus(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 text-blue-600 focus:ring-0 cursor-pointer"
                />
              </label>

              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-white block">Breakout Detection Engine</span>
                  <span className="text-[10px] text-zinc-400">Timeframe scope for volume spikes</span>
                </div>
                <select
                  value={breakout}
                  onChange={(e) => setBreakout(e.target.value as any)}
                  className="h-8 px-2 rounded bg-black border border-white/20 text-xs text-white focus:outline-none"
                >
                  <option value="none">None</option>
                  <option value="intraday">Intraday Only</option>
                  <option value="multi_timeframe">Multi-Timeframe</option>
                </select>
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end gap-3 bg-black shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-lg text-xs font-semibold bg-brand-blue hover:opacity-90 text-white transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
          >
            {isSaving ? (
              <InlineSpinner className="w-3.5 h-3.5" label="Saving plan..." />
            ) : (
              <Save size={13} />
            )}
            <span>{isSaving ? 'Saving...' : 'Save Plan Configuration'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
