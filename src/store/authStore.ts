import { create } from "zustand";
import type { User, UserRole, LoginRequest } from "../types.js";
import { authApi } from "../lib/api.js";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  login: (data: LoginRequest) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User) => void;
  clearError: () => void;
  checkAuth: () => Promise<boolean>;
  initialize: () => void;
}

const getUserFromStorage = (): User | null => {
  try {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: getUserFromStorage(),
  token: localStorage.getItem("token"),
  isAuthenticated: !!localStorage.getItem("token") && !!getUserFromStorage(),
  loading: false,
  error: null,
  initialized: false,

  initialize: () => {
    set({ initialized: true });
  },

  login: async (data: LoginRequest) => {
    set({ loading: true, error: null });
    try {
      const response = await authApi.login(data);
      if (response.success && response.data) {
        const { token, user } = response.data;
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        set({
          user,
          token,
          isAuthenticated: true,
          loading: false,
        });
        return true;
      } else {
        set({ error: response.error || "登录失败", loading: false });
        return false;
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "登录失败",
        loading: false,
      });
      return false;
    }
  },

  logout: () => {
    authApi.logout();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  setUser: (user: User) => {
    set({ user });
    localStorage.setItem("user", JSON.stringify(user));
  },

  clearError: () => set({ error: null }),

  checkAuth: async () => {
    const token = localStorage.getItem("token");
    const storedUser = getUserFromStorage();
    
    if (!token || !storedUser) {
      authApi.logout();
      set({ isAuthenticated: false, user: null, token: null });
      return false;
    }

    try {
      const response = await authApi.getCurrentUser();
      
      if (response.success && response.data) {
        const freshUser = response.data;
        localStorage.setItem("user", JSON.stringify(freshUser));
        set({ user: freshUser, isAuthenticated: true, token });
        return true;
      } else {
        authApi.logout();
        set({ isAuthenticated: false, user: null, token: null });
        return false;
      }
    } catch {
      set({ isAuthenticated: true, user: storedUser, token });
      return true;
    }
  },
}));

export const hasRole = (user: User | null, roles: UserRole[]): boolean => {
  if (!user) return false;
  return roles.includes(user.role);
};

export const roleLabels: Record<UserRole, string> = {
  farmer: "养殖户",
  technician: "技术人员",
  admin: "管理员",
  finance: "财务",
};
