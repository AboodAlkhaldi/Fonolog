/**
 * Notifications hook — loads the current user's inbox, subscribes to realtime
 * inserts/updates, and exposes mark-as-read helpers.
 *
 * Backed by the `notifications` table (RLS: receiver-only). New rows from
 * send-push or assignment-creation arrive within ~1s via Supabase Realtime.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import type { NotificationRow } from '@/lib/database.types';

interface State {
  notifications: NotificationRow[];
  unreadCount:   number;
  loading:       boolean;
}

export function useNotifications() {
  const userId = useAuth((s) => s.user?.id);
  const [state, setState] = useState<State>({ notifications: [], unreadCount: 0, loading: true });

  const reload = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    const rows = (data ?? []) as NotificationRow[];
    setState({
      notifications: rows,
      unreadCount: rows.filter((n) => !n.read_at).length,
      loading: false,
    });
  }, [userId]);

  // Initial load
  useEffect(() => {
    if (!userId) return;
    reload();
  }, [userId, reload]);

  // Realtime: new + updated rows for this user
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => { reload(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, reload]);

  const markRead = useCallback(async (id: string) => {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() } as any)
      .eq('id', id);
    // optimistic update — realtime will follow up
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() } as any)
      .eq('user_id', userId)
      .is('read_at', null);
    reload();
  }, [userId, reload]);

  return { ...state, reload, markRead, markAllRead };
}
