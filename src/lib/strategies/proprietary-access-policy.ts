export const PROPRIETARY_STRATEGY_IDS = ['typhon', 'cerberus', 'hydra', 'psi', 'psi_v2'] as const;
export type ProprietaryStrategyId = typeof PROPRIETARY_STRATEGY_IDS[number];

export const OWNER_EMAIL = 'abdelrahman.m.abualola@gmail.com';

export function isProprietaryStrategy(value: string): value is ProprietaryStrategyId {
  return PROPRIETARY_STRATEGY_IDS.some((id) => id === value);
}

export function isProprietaryOwner(email: string | null | undefined, _role?: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === OWNER_EMAIL;
}

type AlertGrant = { enabled: boolean; notificationsEnabled: boolean };

export function proprietaryAlertRecipientIds<T extends AlertGrant & { userId: string }>(grants: readonly T[]): string[] {
  return grants.filter((grant) => grant.enabled && grant.notificationsEnabled).map((grant) => grant.userId);
}

export function resolveProprietaryAccess(
  email: string | null | undefined,
  role: string | null | undefined,
  grant: AlertGrant | null,
): { canView: boolean; canReceiveAlerts: boolean; canManageAlerts: boolean } {
  const isOwner = isProprietaryOwner(email, role);
  // STRICT RULE: Only the platform owner (abdelrahman.m.abualola@gmail.com) can view the proprietary strategies in the studio / builder
  const canView = isOwner;
  // Viewing permission alone never opts anyone into alerts, including the owner.
  const canReceiveAlerts = grant?.enabled === true && grant.notificationsEnabled === true;
  // Keep the preference available after opt-out, but never after revocation.
  const canManageAlerts = isOwner || grant?.enabled === true;
  return { canView, canReceiveAlerts, canManageAlerts };
}

export function filterAccessibleSignals<T extends { strategy: string }>(rows: T[], canReceiveAlerts: boolean): T[] {
  return canReceiveAlerts ? rows : rows.filter((row) => !isProprietaryStrategy(row.strategy));
}
