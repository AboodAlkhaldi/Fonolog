/**
 * Notifications store — single source of truth for the user's inbox.
 *
 * Lifted out of a per-component hook so that the bell badge, the inbox list,
 * and the detail subpage all share state. Marking a notification read in the
 * detail page instantly updates the bell — no logout/login round-trip and no
 * dependence on Supabase Realtime being enabled at the project level.
 *
 * A single Realtime channel (if available) tops up state when new rows arrive
 * from server-side inserts (revenuecat-webhook, send-push, etc.).
 */
import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { NotificationRow } from '@/lib/database.types';

interface NotificationsState {
  userId:        string | null;
  notifications: NotificationRow[];
  unreadCount:   number;
  loading:       boolean;
  channel:       RealtimeChannel | null;

  load:        (userId: string) => Promise<void>;
  reload:      () => Promise<void>;
  markRead:    (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  clear:       () => void;
}

function recomputeUnread(rows: NotificationRow[]): number {
  return rows.filter((n) => !n.read_at).length;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  userId:        null,
  notifications: [],
  unreadCount:   0,
  loading:       true,
  channel:       null,

  load: async (userId) => {
    const current = get();
    // Re-bind realtime subscription when the user changes.
    if (current.userId !== userId) {
      if (current.channel) {
        try { supabase.removeChannel(current.channel); } catch { /* ignore */ }
      }
      set({ userId, notifications: [], unreadCount: 0, loading: true, channel: null });
    }

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    const rows = (data ?? []) as NotificationRow[];
    set({ notifications: rows, unreadCount: recomputeUnread(rows), loading: false });

    // Subscribe once per user. Realtime tops up state for newly created/updated
    // rows that came from the server (push edge fn, webhook, etc).
    if (!get().channel) {
      const ch = supabase
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          () => { void get().reload(); },
        )
        .subscribe();
      set({ channel: ch });
    }
  },

  reload: async () => {
    const id = get().userId;
    if (!id) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(50);
    const rows = (data ?? []) as NotificationRow[];
    set({ notifications: rows, unreadCount: recomputeUnread(rows) });
  },

  markRead: async (id) => {
    const now = new Date().toISOString();
    // Optimistic: update local state immediately so the bell badge drops.
    set((s) => {
      const next = s.notifications.map((n) => n.id === id ? { ...n, read_at: now } : n);
      return { notifications: next, unreadCount: recomputeUnread(next) };
    });
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: now } as any)
      .eq('id', id);
    if (error) {
      // Roll back: re-fetch authoritative state.
      void get().reload();
    }
  },

  markAllRead: async () => {
    const id = get().userId;
    if (!id) return;
    const now = new Date().toISOString();
    set((s) => {
      const next = s.notifications.map((n) => n.read_at ? n : { ...n, read_at: now });
      return { notifications: next, unreadCount: 0 };
    });
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: now } as any)
      .eq('user_id', id)
      .is('read_at', null);
    if (error) void get().reload();
  },

  clear: () => {
    const { channel } = get();
    if (channel) {
      try { supabase.removeChannel(channel); } catch { /* ignore */ }
    }
    set({ userId: null, notifications: [], unreadCount: 0, loading: false, channel: null });
  },
}));
