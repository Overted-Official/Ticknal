import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  calculateUnreadCount,
  isSignalItemUnread,
  getLastReadCheckpoint,
  markNotificationsAsRead,
} from '@/lib/notifications/unread-tracker';

describe('unread-tracker', () => {
  let storageMap = new Map<string, string>();

  beforeEach(() => {
    storageMap.clear();
    const mockStorage = {
      getItem: (key: string) => storageMap.get(key) ?? null,
      setItem: (key: string, val: string) => storageMap.set(key, val),
      removeItem: (key: string) => storageMap.delete(key),
      clear: () => storageMap.clear(),
    };
    (global as any).window = {
      dispatchEvent: () => true,
    };
    (global as any).localStorage = mockStorage;
  });

  afterEach(() => {
    delete (global as any).window;
    delete (global as any).localStorage;
  });

  const sampleNotifications = [
    { id: 10, sentAt: '2026-10-27T10:00:00Z', signalDate: '2026-10-27' },
    { id: 9, sentAt: '2026-10-27T09:00:00Z', signalDate: '2026-10-27' },
    { id: 8, sentAt: '2026-10-27T08:00:00Z', signalDate: '2026-10-27' },
  ];

  it('returns 0 when notification list is null, undefined, or empty', () => {
    expect(calculateUnreadCount(null)).toBe(0);
    expect(calculateUnreadCount(undefined)).toBe(0);
    expect(calculateUnreadCount([])).toBe(0);
  });

  it('returns total count when user has never marked notifications as read before', () => {
    expect(calculateUnreadCount(sampleNotifications)).toBe(3);
  });

  it('returns 0 unread when user marks all notifications as read', () => {
    markNotificationsAsRead(sampleNotifications);
    const cp = getLastReadCheckpoint();
    expect(cp.lastReadId).toBe(10);
    expect(cp.lastReadTime).toBeGreaterThanOrEqual(new Date('2026-10-27T10:00:00Z').getTime());
    expect(calculateUnreadCount(sampleNotifications)).toBe(0);
  });

  it('accurately counts only new signals arriving after checkpoint', () => {
    markNotificationsAsRead(sampleNotifications);

    // Now a new signal arrives with ID 11
    const updatedNotifications = [
      { id: 11, sentAt: '2026-10-27T11:00:00Z', signalDate: '2026-10-27' },
      ...sampleNotifications,
    ];

    expect(calculateUnreadCount(updatedNotifications)).toBe(1);
    expect(isSignalItemUnread(updatedNotifications[0], getLastReadCheckpoint())).toBe(true);
    expect(isSignalItemUnread(updatedNotifications[1], getLastReadCheckpoint())).toBe(false);

    // Another signal arrives with ID 12
    const withTwoNew = [
      { id: 12, sentAt: '2026-10-27T12:00:00Z', signalDate: '2026-10-27' },
      ...updatedNotifications,
    ];
    expect(calculateUnreadCount(withTwoNew)).toBe(2);

    // Mark as read again
    markNotificationsAsRead(withTwoNew);
    expect(calculateUnreadCount(withTwoNew)).toBe(0);
  });
});
