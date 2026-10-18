export const PROPRIETARY_STRATEGY_IDS = ['typhon', 'cerberus', 'hydra', 'psi', 'psi_v2'] as const;
export type ProprietaryStrategyId = typeof PROPRIETARY_STRATEGY_IDS[number];

const OWNER_EMAIL = 'abdelrahman.m.abualola@gmail.com';

export function isProprietaryStrategy(value: string): value is ProprietaryStrategyId {
  return PROPRIETARY_STRATEGY_IDS.some((id) => id === value);
}

export function isProprietaryOwner(email: string | null | undefined, role: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === OWNER_EMAIL && (role === 'admin' || role === 'superadmin');
}

export function resolveProprietaryAccess(
  email: string | null | undefined,
  role: string | null | undefined,
  grant: { enabled: boolean; notificationsEnabled: boolean } | null,
): { canView: boolean; canReceiveAlerts: boolean } {
  const canView = isProprietaryOwner(email, role) || grant?.enabled === true;
  return { canView, canReceiveAlerts: canView && grant?.notificationsEnabled === true };
}

export function filterAccessibleSignals<T extends { strategy: string }>(rows: T[], canView: boolean): T[] {
  return canView ? rows : rows.filter((row) => !isProprietaryStrategy(row.strategy));
}
