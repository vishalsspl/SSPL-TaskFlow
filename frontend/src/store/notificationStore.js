import { create } from 'zustand';
import api from '@/lib/api';
import { useChatStore } from './chatStore';
import { useAuthStore } from './authStore';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async () => {
    const role = useAuthStore.getState().user?.role;
    const isSuperAdmin = role === 'SUPERADMIN';
    const baseUrl = isSuperAdmin ? '/superadmin/notifications' : '/notifications';

    set({ loading: true });
    try {
      const response = await api.get(baseUrl);
      const notifications = response.data;
      console.log(`[Notification Store Debug] Fetched ${notifications.length} notifications from: ${baseUrl}`);
      const unreadCount = notifications.filter(n => !n.isRead).length;
      set({ notifications, unreadCount, loading: false });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      set({ loading: false });
    }
  },

  addNotification: (notification) => {
    set((state) => {
      const exists = state.notifications.some(n => n.id === notification.id);
      if (exists) return state;
      
      const newNotifications = [notification, ...state.notifications];
      return {
        notifications: newNotifications,
        unreadCount: newNotifications.filter(n => !n.isRead).length,
      };
    });
  },

  markAsRead: async (id) => {
    const role = useAuthStore.getState().user?.role;
    const isSuperAdmin = role === 'SUPERADMIN';
    const baseUrl = isSuperAdmin ? '/superadmin/notifications' : '/notifications';

    try {
      await api.patch(`${baseUrl}/${id}/read`);
      set((state) => {
        const newNotifications = state.notifications.map(n => 
          n.id === id ? { ...n, isRead: true } : n
        );
        return {
          notifications: newNotifications,
          unreadCount: newNotifications.filter(n => !n.isRead).length,
        };
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },

  markAllAsRead: async () => {
    const role = useAuthStore.getState().user?.role;
    const isSuperAdmin = role === 'SUPERADMIN';
    const baseUrl = isSuperAdmin ? '/superadmin/notifications' : '/notifications';

    try {
      await api.patch(`${baseUrl}/read-all`);
      set((state) => {
        const newNotifications = state.notifications.map(n => ({ ...n, isRead: true }));
        return {
          notifications: newNotifications,
          unreadCount: 0,
        };
      });
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  },

  deleteNotification: async (id) => {
    const role = useAuthStore.getState().user?.role;
    const isSuperAdmin = role === 'SUPERADMIN';
    const baseUrl = isSuperAdmin ? '/superadmin/notifications' : '/notifications';

    try {
      await api.delete(`${baseUrl}/${id}`);
      set((state) => {
        const newNotifications = state.notifications.filter(n => n.id !== id);
        return {
          notifications: newNotifications,
          unreadCount: newNotifications.filter(n => !n.isRead).length,
        };
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  },
}));
