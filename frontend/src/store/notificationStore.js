import { create } from 'zustand';
import client from '../api/client';

export const useNotificationStore = create((set, get) => ({
  items: [],
  unreadCount: 0,
  loading: false,

  reset: () => set({ items: [], unreadCount: 0, loading: false }),

  fetch: async () => {
    set({ loading: true });
    try {
      const { data } = await client.get('/notifications');
      const list = Array.isArray(data) ? data : [];
      const unreadCount = list.filter((n) => !n.is_read).length;
      set({ items: list, unreadCount, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  markRead: async (ids) => {
    if (!Array.isArray(ids) || !ids.length) return;
    try {
      await client.post('/notifications/mark-read', { ids });
      await get().fetch();
    } catch {
      /* ignore */
    }
  },

  markAllRead: async () => {
    try {
      await client.post('/notifications/mark-read', { all: true });
      await get().fetch();
    } catch {
      /* ignore */
    }
  },
}));
