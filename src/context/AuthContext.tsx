"use client";

import * as React from "react";
import { ipc } from "@/lib/ipc";

export interface User {
  id: number;
  name: string;
  username: string;
  role: "ADMIN" | "USER";
  active: boolean;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string;
}

export interface AuthState {
  user: User | null;
  permissions: string[] | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = React.createContext<{
  state: AuthState;
  login: (username: string, password: string) => Promise<void>;
  register: (name: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  checkAuth: () => Promise<void>;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({
    user: null,
    permissions: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const checkAuth = React.useCallback(async () => {
    try {
      console.log('[Auth] checkAuth called');
      console.log('[Auth] window.electronAPI:', typeof window.electronAPI);
      console.log('[Auth] ipc.auth:', typeof ipc.auth);

      // Check if we have stored tokens
      const storedRefreshToken = localStorage.getItem('refreshToken');
      const storedAccessToken = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('user');

      if (storedRefreshToken && storedUser) {
        // Try to refresh the access token
        try {
          console.log('[Auth] Attempting refresh with stored token');
          const result = await ipc.auth.refreshAccessToken(storedRefreshToken);
          console.log('[Auth] Refresh result:', result);
          if (result && result.accessToken) {
            const user = JSON.parse(storedUser);
            // Decode JWT to get permissions
            let permissions: string[] = [];
            try {
              const payload = JSON.parse(atob(result.accessToken.split('.')[1]));
              permissions = payload.permissions || [];
            } catch {
              permissions = [];
            }
            setState({
              user,
              permissions,
              accessToken: result.accessToken,
              refreshToken: result.refreshToken || storedRefreshToken,
              isAuthenticated: true,
              isLoading: false,
            });
            // Update localStorage
            localStorage.setItem('accessToken', result.accessToken);
            localStorage.setItem('permissions', JSON.stringify(permissions));
            if (result.refreshToken) {
              localStorage.setItem('refreshToken', result.refreshToken);
            }
            return;
          }
        } catch (e) {
          console.error('[Auth] Refresh failed:', e);
          // Refresh failed, clear storage
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          localStorage.removeItem('permissions');
        }
      }

      // No valid session
      setState({
        user: null,
        permissions: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (err) {
      console.error('[Auth] checkAuth error:', err);
      setState({
        user: null,
        permissions: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  React.useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = React.useCallback(async (username: string, password: string) => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      console.log('[Auth] Login attempt for:', username);
      const result = await ipc.auth.login(username, password);
      console.log('[Auth] Login result:', result);

      if (!result || !result.success) {
        throw new Error(result?.error || 'Invalid username or password');
      }

      const { user, accessToken, refreshToken } = result;

      // Decode JWT to get permissions
      let permissions: string[] = [];
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        permissions = payload.permissions || [];
      } catch {
        permissions = [];
      }

      // Store in localStorage
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('permissions', JSON.stringify(permissions));

      setState({
        user,
        permissions,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('[Auth] Login error:', error);
      setState((s) => ({ ...s, isLoading: false }));
      throw error;
    }
  }, []);

  const register = React.useCallback(async (name: string, username: string, password: string) => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      console.log('[Auth] Register attempt for:', username);
      const result = await ipc.auth.createAdmin({ name, username, password, confirmPassword: password });
      console.log('[Auth] Register result:', result);

      if (!result || !result.success) {
        throw new Error(result?.error || 'Failed to create admin account');
      }

      // After creating admin, log in
      const loginResult = await ipc.auth.login(username, password);
      console.log('[Auth] Post-register login result:', loginResult);

      if (!loginResult || !loginResult.success) {
        throw new Error('Account created but login failed');
      }

      const { user, accessToken, refreshToken } = loginResult;

      // Decode JWT to get permissions
      let permissions: string[] = [];
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        permissions = payload.permissions || [];
      } catch {
        permissions = [];
      }

      // Store in localStorage
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('permissions', JSON.stringify(permissions));

      setState({
        user,
        permissions,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('[Auth] Register error:', error);
      setState((s) => ({ ...s, isLoading: false }));
      throw error;
    }
  }, []);

  const logout = React.useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await ipc.auth.logout(refreshToken).catch(console.error);
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');

    setState({
      user: null,
      permissions: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const refreshAccessToken = React.useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      logout();
      return;
    }

    try {
      const result = await ipc.auth.refreshAccessToken(refreshToken);
      if (result && result.accessToken) {
        // Decode JWT to get permissions
        let permissions: string[] = [];
        try {
          const payload = JSON.parse(atob(result.accessToken.split('.')[1]));
          permissions = payload.permissions || [];
        } catch {
          permissions = [];
        }
        setState((s) => ({ ...s, accessToken: result.accessToken, permissions }));
        localStorage.setItem('accessToken', result.accessToken);
        localStorage.setItem('permissions', JSON.stringify(permissions));
        if (result.refreshToken) {
          localStorage.setItem('refreshToken', result.refreshToken);
          setState((s) => ({ ...s, refreshToken: result.refreshToken }));
        }
      } else {
        logout();
      }
    } catch {
      logout();
    }
  }, [logout]);

  const hasPermission = React.useCallback((permission: string) => {
    return state.permissions?.includes(permission) ?? false;
  }, [state.permissions]);

  const hasAnyPermission = React.useCallback((permissions: string[]) => {
    return permissions.some(p => state.permissions?.includes(p) ?? false);
  }, [state.permissions]);

  const hasAllPermissions = React.useCallback((permissions: string[]) => {
    return permissions.every(p => state.permissions?.includes(p) ?? false);
  }, [state.permissions]);

  return (
    <AuthContext.Provider
      value={{
        state,
        login,
        register,
        logout,
        refreshAccessToken,
        checkAuth,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function usePermissions() {
  const { state, hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();
  return {
    permissions: state.permissions || [],
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}