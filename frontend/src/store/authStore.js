import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  token: null,
  user: null,
  login: (token, user) => {
    set({ token, user });
    localStorage.setItem('auth-storage', JSON.stringify({ state: { token, user } }));
  },
  logout: () => {
    set({ token: null, user: null });
    localStorage.removeItem('auth-storage');
  },
  updateUser: (user) => set({ user }),
  initialize: () => {
    try {
      const stored = localStorage.getItem('auth-storage');
      if (stored) {
        const { state } = JSON.parse(stored);
        if (state?.token && state?.user) {
          set({ token: state.token, user: state.user });
        }
      }
    } catch (error) {
      console.error('Failed to load auth state:', error);
    }
  },
}));