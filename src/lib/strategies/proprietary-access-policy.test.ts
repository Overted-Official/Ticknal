import { describe, expect, it } from 'vitest';
import {
  filterAccessibleSignals,
  isProprietaryOwner,
  isProprietaryStrategy,
  OWNER_EMAIL,
  PROPRIETARY_STRATEGY_IDS,
  resolveProprietaryAccess,
} from './proprietary-access-policy';

describe('proprietary-access-policy', () => {
  it('recognizes all canonical and legacy proprietary strategy identifiers', () => {
    expect(isProprietaryStrategy('typhon')).toBe(true);
    expect(isProprietaryStrategy('cerberus')).toBe(true);
    expect(isProprietaryStrategy('hydra')).toBe(true);
    expect(isProprietaryStrategy('psi')).toBe(true);
    expect(isProprietaryStrategy('psi_v2')).toBe(true);
    expect(isProprietaryStrategy('custom-123')).toBe(false);
  });

  it('restricts ownership strictly to the platform owner email', () => {
    expect(OWNER_EMAIL).toBe('abdelrahman.m.abualola@gmail.com');
    expect(isProprietaryOwner('abdelrahman.m.abualola@gmail.com')).toBe(true);
    expect(isProprietaryOwner('  Abdelrahman.M.Abualola@gmail.com ')).toBe(true);
    expect(isProprietaryOwner('admin@ticknal.com', 'admin')).toBe(false);
    expect(isProprietaryOwner('other@example.com', 'superadmin')).toBe(false);
    expect(isProprietaryOwner(null)).toBe(false);
    expect(isProprietaryOwner(undefined)).toBe(false);
  });

  it('guarantees canView is ONLY true for the platform owner on the strategies page', () => {
    // Owner always has canView: true
    const ownerAccess = resolveProprietaryAccess('abdelrahman.m.abualola@gmail.com', 'admin', null);
    expect(ownerAccess.canView).toBe(true);
    expect(ownerAccess.canReceiveAlerts).toBe(true);

    // Regular user without grant
    const standardUser = resolveProprietaryAccess('user@example.com', 'user', null);
    expect(standardUser.canView).toBe(false);
    expect(standardUser.canReceiveAlerts).toBe(false);

    // Admin user who is not the owner
    const otherAdmin = resolveProprietaryAccess('admin2@ticknal.com', 'admin', null);
    expect(otherAdmin.canView).toBe(false);
    expect(otherAdmin.canReceiveAlerts).toBe(false);

    // User with console toggle ON (enabled: true): canReceiveAlerts: true, BUT canView: false!
    const grantedUser = resolveProprietaryAccess('member@domain.com', 'user', {
      enabled: true,
      notificationsEnabled: true,
    });
    expect(grantedUser.canView).toBe(false);
    expect(grantedUser.canReceiveAlerts).toBe(true);

    // User with grant.enabled = true, notificationsEnabled = false
    const legacyGrant = resolveProprietaryAccess('member2@domain.com', 'user', {
      enabled: true,
      notificationsEnabled: false,
    });
    expect(legacyGrant.canView).toBe(false);
    expect(legacyGrant.canReceiveAlerts).toBe(true);
  });

  it('filters proprietary signals based on canReceiveAlerts', () => {
    const signals = [
      { id: '1', strategy: 'typhon', ticker: 'COMI' },
      { id: '2', strategy: 'cerberus', ticker: 'SWDY' },
      { id: '3', strategy: 'hydra', ticker: 'TMGH' },
      { id: '4', strategy: 'custom-strategy-1', ticker: 'MFPC' },
    ];

    // When alerts are allowed: all signals pass
    const withAlerts = filterAccessibleSignals(signals, true);
    expect(withAlerts).toHaveLength(4);

    // When alerts are disallowed: proprietary strategies are stripped, custom remains
    const withoutAlerts = filterAccessibleSignals(signals, false);
    expect(withoutAlerts).toHaveLength(1);
    expect(withoutAlerts[0].strategy).toBe('custom-strategy-1');
  });
});
