'use client';

import { useState, useEffect } from 'react';
import type { PlanLimits, PlanFeatures } from '@/lib/server/plans-service';

export interface UserEntitlementsState {
  tier: 'free' | 'plus' | 'elite' | 'vip';
  planName: string;
  isPaid: boolean;
  limits: PlanLimits;
  features: PlanFeatures;
  isLoading: boolean;
  error: string | null;
  canCreateAlert: (currentCount: number) => boolean;
  canAddIndicator: (currentCount: number) => boolean;
  canAddChart: (currentCount: number) => boolean;
  canUseIndicator: (indicatorKey: 'hydra' | 'typhoon' | 'cerberus') => boolean;
}

const DEFAULT_LIMITS: PlanLimits = {
  chartsPerTab: 2,
  indicatorsPerChart: 5,
  historicalBars: 2000,
  parallelConnections: 5,
  priceAlerts: 0,
  technicalAlerts: 0,
  pushAlerts: 0,
};

const DEFAULT_FEATURES: PlanFeatures = {
  breakoutDetection: 'none',
  hydraIndicator: false,
  typhoonEngine: false,
  cerberusConfluence: false,
  egxCoverage: true,
  screeners: true,
  devicesSync: true,
  noAds: true,
};

export function useUserEntitlements(): UserEntitlementsState {
  const [data, setData] = useState<{
    tier: 'free' | 'plus' | 'elite' | 'vip';
    planName: string;
    isPaid: boolean;
    limits: PlanLimits;
    features: PlanFeatures;
  }>({
    tier: 'free',
    planName: 'Free Member',
    isPaid: false,
    limits: DEFAULT_LIMITS,
    features: DEFAULT_FEATURES,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchEntitlements() {
      try {
        const res = await fetch('/api/user/entitlements');
        if (!res.ok) {
          throw new Error('Failed to load user access entitlements');
        }
        const json = await res.json();
        if (isMounted && json.success) {
          setData({
            tier: json.tier || 'free',
            planName: json.planName || 'Free Member',
            isPaid: Boolean(json.isPaid),
            limits: json.limits || DEFAULT_LIMITS,
            features: json.features || DEFAULT_FEATURES,
          });
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Error loading entitlements');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchEntitlements();
    return () => {
      isMounted = false;
    };
  }, []);

  return {
    ...data,
    isLoading,
    error,
    canCreateAlert: (currentCount: number) => {
      if (data.limits.priceAlerts === -1) return true;
      return currentCount < data.limits.priceAlerts;
    },
    canAddIndicator: (currentCount: number) => {
      return currentCount < data.limits.indicatorsPerChart;
    },
    canAddChart: (currentCount: number) => {
      return currentCount < data.limits.chartsPerTab;
    },
    canUseIndicator: (indicatorKey: 'hydra' | 'typhoon' | 'cerberus') => {
      if (indicatorKey === 'hydra') return Boolean(data.features.hydraIndicator);
      if (indicatorKey === 'typhoon') return Boolean(data.features.typhoonEngine);
      if (indicatorKey === 'cerberus') return Boolean(data.features.cerberusConfluence);
      return true;
    },
  };
}
