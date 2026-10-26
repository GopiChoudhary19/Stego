import { create } from 'zustand';
import api from '@/lib/api';
import type { AuthResponse, User } from '@/lib/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authStep: 'form' | 'otp';
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone: string, role: string) => Promise<void>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  setAuthStep: (step: 'form' | 'otp') => void;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: typeof window !== 'undefined' && !!localStorage.getItem('accessToken'),
  isLoading: false,
  authStep: 'form',

  setAuthStep: (step) => set({ authStep: step }),

  // step 1: the server checks the password and emails a code; it issues no tokens yet
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      await api.post('/api/auth/login', { email, password });
      set({ authStep: 'otp', isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (name, email, password, phone, role) => {
    set({ isLoading: true });
    try {
      await api.post('/api/auth/register', { name, email, password, phone, role });
      set({ authStep: 'otp', isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // step 2: a correct code is exchanged for the access and refresh tokens
  verifyOtp: async (email, code) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{ data: AuthResponse }>('/api/auth/verify-otp', { email, code });
      const auth = res.data.data;

      localStorage.setItem('accessToken', auth.accessToken);
      localStorage.setItem('refreshToken', auth.refreshToken);

      set({
        user: {
          id: auth.userId,
          name: auth.name,
          email: auth.email,
          phone: '',
          role: auth.role,
          createdAt: ''
        },
        isAuthenticated: true,
        isLoading: false,
        authStep: 'form',
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false, authStep: 'form' });
  },

  loadUser: async () => {
    try {
      const res = await api.get('/api/users/me');
      set({ user: res.data.data, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },
}));
