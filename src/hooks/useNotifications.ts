/**
 * Notifications hook — thin wrapper around the shared notifications store.
 *
 * Every component that needs notifications data (bell, inbox list, detail
 * subpage) goes through this hook. State lives in `useNotificationsStore`
 * so mutations from one screen show up in the others instantly without a
 * round-trip to Supabase Realtime.
 */
import { useEffect } from 'react';
import { useAuth } from '@/store/auth';
import { useNotificationsStore } from '@/store/notifications';

export function useNotifications() {
  const userId        = useAuth((s) => s.user?.id);
  const notifications = useNotificationsStore((s) => s.notifications);
  const unreadCount   = useNotificationsStore((s) => s.unreadCount);
  const loading       = useNotificationsStore((s) => s.loading);
  const load          = useNotificationsStore((s) => s.load);
  const reload        = useNotificationsStore((s) => s.reload);
  const markRead      = useNotificationsStore((s) => s.markRead);
  const markAllRead   = useNotificationsStore((s) => s.markAllRead);

  useEffect(() => {
    if (!userId) return;
    void load(userId);
  }, [userId, load]);

  return { notifications, unreadCount, loading, reload, markRead, markAllRead };
}
