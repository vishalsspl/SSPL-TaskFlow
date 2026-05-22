import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  token: null,
  isInitialized: false,
  user: null,
  login: (token, user) => {
    set({ token, user });
    localStorage.setItem('auth-storage', JSON.stringify({ state: { token, user } }));
  },
  logout: async (apiInstance) => {
    try {
      if (apiInstance) {
        await apiInstance.post('/auth/logout');
      }
    } catch (error) {
      console.error('Failed to log out on server:', error);
    } finally {
      set({ token: null, user: null });
      localStorage.removeItem('auth-storage');
    }
  },
  updateUser: (user) => {
    set((state) => {
      const newState = { ...state, user };
      localStorage.setItem('auth-storage', JSON.stringify({ state: { token: state.token, user: user } }));
      return newState;
    });
  },
  syncUser: async (api) => {
    try {
      const res = await api.get('/auth/me');
      const user = res.data;
      
      // 🔐 DIAGNOSTIC LOG (Visible in Browser Console)
      console.log('🔐 [TaskFlow Permissions] Current Active Features:', user.activeFeatures);
      
      set((state) => {
        localStorage.setItem('auth-storage', JSON.stringify({ state: { token: state.token, user } }));
        return { user };
      });
    } catch (error) {
      console.error('Failed to sync user state:', error);
    }
  },
  initialize: () => {
    try {
      const stored = localStorage.getItem('auth-storage');
      if (stored) {
        const { state } = JSON.parse(stored);
        if (state?.token && state?.user) {
          set({ token: state.token, user: state.user, isInitialized: true });
          return state.token; // Return token for App.jsx sync
        }
      }
    } catch (error) {
      console.error('Failed to load auth state:', error);
    }
    set({ isInitialized: true });
    return null;
  },
}));