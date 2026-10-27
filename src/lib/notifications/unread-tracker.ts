'use client';

import { useState, useEffect, useMemo } from 'react';

export const STORAGE_KEY_LAST_READ_TIME = 'ticknal_notifications_last_read_time';
export const STORAGE_KEY_LAST_READ_ID = 'ticknal_notifications_last_read_id';
export const EVENT_NOTIFICATIONS_READ = 'ticknal:notifications-read';

export interface NotificationSignalSummary {
  id?: number | string;
  sentAt?: string;
  signalDate?: string;
}

export function getLastReadCheckpoint(): { lastReadTime: number; lastReadId: number } {
  if (typeof window === 'undefined') return { lastReadTime: 0, lastReadId: 0 };
  try {
    const timeStr = localStorage.getItem(STORAGE_KEY_LAST_READ_TIME);
    const idStr = localStorage.getItem(STORAGE_KEY_LAST_READ_ID);
    return {
      lastReadTime: timeStr ? Number(timeStr) : 0,
      lastReadId: idStr ? Number(idStr) : 0,
    };
  } catch {
    return { lastReadTime: 0, lastReadId: 0 };
  }
}

export function markNotificationsAsRead(items?: NotificationSignalSummary[]): void {
  if (typeof window === 'undefined') return;
  try {
    const now = Date.now();
    let maxId = 0;
    let maxTime = now;

    if (items && items.length > 0) {
      for (const item of items) {
        const numId = Number(item.id);
        if (Number.isFinite(numId) && numId > maxId) {
          maxId = numId;
        }
        const t = item.sentAt ? new Date(item.sentAt).getTime() : item.signalDate ? new Date(item.signalDate).getTime() : 0;
        if (t > maxTime) {
          maxTime = t;
        }
      }
    }

    localStorage.setItem(STORAGE_KEY_LAST_READ_TIME, String(maxTime));
    if (maxId > 0) {
      localStorage.setItem(STORAGE_KEY_LAST_READ_ID, String(maxId));
    }

    window.dispatchEvent(
      new CustomEvent(EVENT_NOTIFICATIONS_READ, {
        detail: { lastReadTime: maxTime, lastReadId: maxId },
      })
    );
  } catch (err) {
    console.warn('Failed to mark notifications as read in storage:', err);
  }
}

export function isSignalItemUnread(
  item: NotificationSignalSummary,
  checkpoint: { lastReadTime: number; lastReadId: number }
): boolean {
  const { lastReadTime, lastReadId } = checkpoint;
  if (!lastReadTime && !lastReadId) {
    return true;
  }
  const numId = Number(item.id);
  if (lastReadId > 0 && Number.isFinite(numId) && numId > 0) {
    return numId > lastReadId;
  }
  const itemTime = item.sentAt ? new Date(item.sentAt).getTime() : item.signalDate ? new Date(item.signalDate).getTime() : 0;
  if (lastReadTime > 0 && itemTime > 0) {
    return itemTime > lastReadTime;
  }
  return false;
}

export function calculateUnreadCount(
  notifications: NotificationSignalSummary[] | undefined | null,
  checkpoint?: { lastReadTime: number; lastReadId: number }
): number {
  if (!notifications || notifications.length === 0) return 0;
  const cp = checkpoint ?? getLastReadCheckpoint();

  // If the user has never opened notifications before, all current items are unread
  if (!cp.lastReadTime && !cp.lastReadId) {
    return notifications.length;
  }

  return notifications.filter((item) => isSignalItemUnread(item, cp)).length;
}

export function useUnreadNotificationCount(
  notifications: NotificationSignalSummary[] | undefined | null,
  isHeroScene?: boolean
): number {
  const [checkpoint, setCheckpoint] = useState<{ lastReadTime: number; lastReadId: number }>({
    lastReadTime: 0,
    lastReadId: 0,
  });
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setCheckpoint(getLastReadCheckpoint());
    setHasMounted(true);

    const handleUpdate = () => {
      setCheckpoint(getLastReadCheckpoint());
    };

    window.addEventListener(EVENT_NOTIFICATIONS_READ, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(EVENT_NOTIFICATIONS_READ, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return useMemo(() => {
    if (isHeroScene) {
      return notifications?.length ?? 0;
    }
    if (!hasMounted) {
      return 0;
    }
    return calculateUnreadCount(notifications, checkpoint);
  }, [notifications, checkpoint, hasMounted, isHeroScene]);
}
