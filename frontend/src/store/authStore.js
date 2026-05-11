import { create } from "zustand";
import { authAPI } from "../api/index.js";

export const useAuthStore = create((set) => ({
  user: null,
  isLoading: true,        // true on first load — prevents flashing redirects
  isAuthenticated: false,

  checkAuth: async () => {
    // Only run if not already authenticated (avoids redundant calls)
    try {
      const res = await authAPI.getMe();
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
    } catch {
      // Not logged in — that's fine for public pages
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (credentials) => {
    const res = await authAPI.login(credentials);
    set({ user: res.data.user, isAuthenticated: true });
    return res.data.user;
  },

  register: async (data) => {
    const res = await authAPI.register(data);
    set({ user: res.data.user, isAuthenticated: true });
    return res.data.user;
  },

  logout: async () => {
    await authAPI.logout();
    set({ user: null, isAuthenticated: false });
  },

  updateUser: (updatedUser) => set({ user: updatedUser }),
}));
