import { create } from 'zustand';

interface AuthState {
  token: string | null;
  user: any | null;
  setAuth: (token: string, user: any) => void;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null,
  setAuth: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user });
  },
  logout: async () => {
    try {
      // Import apiCall dynamically to avoid circular dependency if any, or just use fetch
      const token = localStorage.getItem('token');
      if (token) {
        const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8111';
        await fetch(`${BASE_URL}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (e) {
      console.error('Logout error', e);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
  },
  checkAuth: () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
    set({ token, user });
  }
}));

// Listen to custom event from api.ts
window.addEventListener('auth-change', () => {
  useAuthStore.getState().checkAuth();
});
