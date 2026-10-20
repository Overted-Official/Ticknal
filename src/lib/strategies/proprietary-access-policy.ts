export const PROPRIETARY_STRATEGY_IDS = ['typhon', 'cerberus', 'hydra', 'psi', 'psi_v2'] as const;
export type ProprietaryStrategyId = typeof PROPRIETARY_STRATEGY_IDS[number];

export const OWNER_EMAIL = 'abdelrahman.m.abualola@gmail.com';

export function isProprietaryStrategy(value: string): value is ProprietaryStrategyId {
  return PROPRIETARY_STRATEGY_IDS.some((id) => id === value);
}

export function isProprietaryOwner(email: string | null | undefined, _role?: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === OWNER_EMAIL;
}

export function resolveProprietaryAccess(
  email: string | null | undefined,
  role: string | null | undefined,
  grant: { enabled: boolean; notificationsEnabled: boolean } | null,
): { canView: boolean; canReceiveAlerts: boolean } {
  const isOwner = isProprietaryOwner(email, role);
  // STRICT RULE: Only the platform owner (abdelrahman.m.abualola@gmail.com) can view the proprietary strategies in the studio / builder
  const canView = isOwner;
  // Users receive notifications if owner, or if toggled on for them in the console
  const canReceiveAlerts = isOwner || grant?.enabled === true || grant?.notificationsEnabled === true;
  return { canView, canReceiveAlerts };
}

export function filterAccessibleSignals<T extends { strategy: string }>(rows: T[], canReceiveAlerts: boolean): T[] {
  return canReceiveAlerts ? rows : rows.filter((row) => !isProprietaryStrategy(row.strategy));
}
