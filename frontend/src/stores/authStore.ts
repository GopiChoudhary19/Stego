import { create } from 'zustand';
import api from '@/lib/api';
import type { AuthResponse, User } from '@/lib/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authStep: 'form' | 'otp';
  tempAuthData: AuthResponse | null;
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
  tempAuthData: null,

  setAuthStep: (step) => set({ authStep: step }),

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{ data: AuthResponse }>('/api/auth/login', { email, password });
      // Don't set tokens yet, wait for OTP
      set({ 
        tempAuthData: res.data.data,
        authStep: 'otp',
        isLoading: false 
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (name, email, password, phone, role) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{ data: AuthResponse }>('/api/auth/register', { name, email, password, phone, role });
      set({ 
        tempAuthData: res.data.data,
        authStep: 'otp',
        isLoading: false 
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  verifyOtp: async (email, code) => {
    set({ isLoading: true });
    try {
      await api.post('/api/auth/verify-otp', { email, code });
      
      const { tempAuthData } = useAuthStore.getState();
      if (!tempAuthData) throw new Error("No session data found");

      localStorage.setItem('accessToken', tempAuthData.accessToken);
      localStorage.setItem('refreshToken', tempAuthData.refreshToken);
      
      set({
        user: { 
          id: tempAuthData.userId, 
          name: tempAuthData.name, 
          email: tempAuthData.email, 
          phone: '', 
          role: tempAuthData.role, 
          createdAt: '' 
        },
        isAuthenticated: true,
        isLoading: false,
        authStep: 'form',
        tempAuthData: null
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false, authStep: 'form', tempAuthData: null });
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
