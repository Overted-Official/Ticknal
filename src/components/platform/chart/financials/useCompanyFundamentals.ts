import useSWR, { KeyedMutator } from 'swr';
import type { CompanyFundamentalsResponse } from './types';

const fetcher = async (url: string): Promise<CompanyFundamentalsResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    let errorMessage = `Failed to fetch company fundamentals (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson?.error) {
        errorMessage = errorJson.error;
      }
    } catch {
      // Ignore JSON parse error and use status message
    }
    throw new Error(errorMessage);
  }
  return res.json();
};

export interface UseCompanyFundamentalsResult {
  data: CompanyFundamentalsResponse | null;
  isLoading: boolean;
  isValidating: boolean;
  error: any;
  mutate: KeyedMutator<CompanyFundamentalsResponse>;
}

/**
 * SWR Hook to query historical company financial statements and valuation metrics.
 * Configured with 60s deduping and no focus revalidation for stable drawer viewing.
 */
export function useCompanyFundamentals(
  symbol: string | null | undefined
): UseCompanyFundamentalsResult {
  const cleanSymbol = symbol
    ? symbol
        .trim()
        .toUpperCase()
        .replace(/\.CA$/, '')
        .replace(/^EGX:/, '')
    : null;

  const key = cleanSymbol
    ? `/api/companies/${encodeURIComponent(cleanSymbol)}/fundamentals`
    : null;

  const { data, error, isLoading, isValidating, mutate } =
    useSWR<CompanyFundamentalsResponse>(key, fetcher, {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    });

  return {
    data: data ?? null,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}
