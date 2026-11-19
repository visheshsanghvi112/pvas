"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { fetchWithAuth, ensureAuthToken, isTokenExpired, setAuthCookie, clearAuthCookie, getBaseHost } from "@/lib/api";

export type UserRole = "Admin" | "Analyst" | "Viewer";

export interface UserProfile {
  id?: number;
  username: string;
  name: string;
  role: UserRole;
  email: string;
  department: string;
  is_active?: boolean;
}

export interface AuditLogItem {
  id: number;
  timestamp: string;
  username: string;
  role: string;
  action: string;
  target: string;
  details: string;
  ip_address: string;
}

interface UserContextType {
  currentUser: UserProfile;
  authToken: string | null;
  authReady: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  canEditSettings: boolean;
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  login: (u: string, p: string) => Promise<boolean>;
  logout: () => void;
  setUserRole: (r: UserRole) => void;
  usersList: UserProfile[];
  refreshUsers: (tokenOverride?: string | null) => Promise<void>;
  auditLogs: AuditLogItem[];
  refreshAuditLogs: (tokenOverride?: string | null) => Promise<void>;
  updateUserRoleApi: (id: number, role: UserRole) => Promise<boolean>;
  toggleUserActiveApi: (id: number) => Promise<boolean>;
  createUserApi: (payload: { username: string; full_name: string; email: string; department: string; password: string; role: UserRole }) => Promise<boolean>;
}

const defaultGuestUser: UserProfile = {
  id: 0,
  username: "guest",
  name: "Guest User",
  role: "Viewer",
  email: "guest@surveillance.gov",
  department: "Read Only",
  is_active: false,
};

const BASE_HOST = typeof window !== "undefined" ? "" : getBaseHost();
const AUTH_API = `${BASE_HOST}/api/v1/auth`;

const UserContext = createContext<UserContextType>({
  currentUser: defaultGuestUser,
  authToken: null,
  authReady: false,
  isAuthenticated: false,
  isAdmin: false,
  canEditSettings: false,
  isLoginModalOpen: false,
  openLoginModal: () => {},
  closeLoginModal: () => {},
  login: async () => false,
  logout: () => {},
  setUserRole: () => {},
  usersList: [],
  refreshUsers: async () => {},
  auditLogs: [],
  refreshAuditLogs: async () => {},
  updateUserRoleApi: async () => false,
  toggleUserActiveApi: async () => false,
  createUserApi: async () => false,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile>(defaultGuestUser);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  const logout = useCallback(() => {
    setAuthToken(null);
    localStorage.removeItem("pvasf_auth_token");
    localStorage.setItem("pvasf_logged_out", "true");
    clearAuthCookie();
    setCurrentUser(defaultGuestUser);
    setUsersList([]);
    setAuditLogs([]);
    setAuthReady(true);
  }, []);

  const fetchMe = useCallback(async (token: string | null) => {
    let activeTok = token;
    if (!activeTok || isTokenExpired(activeTok)) {
      activeTok = await ensureAuthToken();
    }
    if (!activeTok) {
      setAuthToken(null);
      setCurrentUser(defaultGuestUser);
      setUsersList([]);
      setAuditLogs([]);
      setAuthReady(true);
      return;
    }
    try {
      const res = await fetchWithAuth(`${AUTH_API}/me`);
      if (res.ok) {
        const data = await res.json();
        setAuthToken(activeTok);
        setCurrentUser({
          id: data.id,
          username: data.username,
          name: data.full_name || data.username,
          role: data.role as UserRole,
          email: data.email,
          department: data.department,
          is_active: data.is_active,
        });
        if (data.role !== "Admin") {
          setUsersList([]);
        }
        if (data.role !== "Admin" && data.role !== "Analyst") {
          setAuditLogs([]);
        }
      } else {
        setAuthToken(null);
        setCurrentUser(defaultGuestUser);
        setUsersList([]);
        setAuditLogs([]);
      }
    } catch (e) {
      console.error("Failed to fetch current user profile", e);
    } finally {
      setAuthReady(true);
    }
  }, []);

  const refreshUsers = useCallback(async (_tokenOverride?: string | null) => {
    try {
      const res = await fetchWithAuth(`${AUTH_API}/users`);
      if (res.ok) {
        const data = await res.json();
        setUsersList(
          data.map((u: any) => ({
            id: u.id,
            username: u.username,
            name: u.full_name,
            role: u.role,
            email: u.email,
            department: u.department,
            is_active: u.is_active,
          }))
        );
      }
    } catch (e) {
      console.error("Failed to refresh users", e);
    }
  }, []);

  const refreshAuditLogs = useCallback(async (_tokenOverride?: string | null) => {
    try {
      const res = await fetchWithAuth(`${AUTH_API}/audit-logs?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (e) {
      console.error("Failed to refresh audit logs", e);
    }
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${AUTH_API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        const data = await res.json();
        const token = data.access_token;
        setAuthToken(token);
        localStorage.setItem("pvasf_auth_token", token);
        localStorage.removeItem("pvasf_logged_out");
        setAuthCookie(token);
        const userObj: UserProfile = {
          id: data.user.id,
          username: data.user.username,
          name: data.user.full_name,
          role: data.user.role as UserRole,
          email: data.user.email,
          department: data.user.department,
          is_active: true,
        };
        setCurrentUser(userObj);
        setAuthReady(true);
        if (userObj.role === "Admin") {
          refreshUsers(token);
        } else {
          setUsersList([]);
        }
        if (userObj.role === "Admin" || userObj.role === "Analyst") {
          refreshAuditLogs(token);
        } else {
          setAuditLogs([]);
        }
        return true;
      }
    } catch (e) {
      console.error("Login failed", e);
    }
    return false;
  }, [refreshUsers, refreshAuditLogs]);

  useEffect(() => {
    // Check saved token on mount
    const savedToken = localStorage.getItem("pvasf_auth_token");
    const wasLoggedOut = localStorage.getItem("pvasf_logged_out") === "true";
    if (savedToken && !isTokenExpired(savedToken)) {
      setAuthToken(savedToken);
      fetchMe(savedToken);
    } else if (!wasLoggedOut) {
      // Auto-provision analyst session on initial visit or expired token
      ensureAuthToken().then((tok) => {
        if (tok) {
          setAuthToken(tok);
          fetchMe(tok);
        } else {
          setAuthReady(true);
        }
      });
    } else {
      setAuthReady(true);
    }
  }, [fetchMe]);

  const setUserRole = (_role: UserRole) => {
    // Role state is managed via backend auth token claims
  };

  async function updateUserRoleApi(userId: number, newRole: UserRole): Promise<boolean> {
    try {
      const res = await fetchWithAuth(`${AUTH_API}/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        refreshUsers();
        refreshAuditLogs();
        return true;
      }
    } catch (e) {
      console.error("Failed to update user role", e);
    }
    return false;
  }

  async function toggleUserActiveApi(userId: number): Promise<boolean> {
    try {
      const res = await fetchWithAuth(`${AUTH_API}/users/${userId}/toggle`, {
        method: "PUT",
      });
      if (res.ok) {
        refreshUsers();
        refreshAuditLogs();
        return true;
      }
    } catch (e) {
      console.error("Failed to toggle user status", e);
    }
    return false;
  }

  async function createUserApi(user: {
    username: string;
    email: string;
    full_name: string;
    department: string;
    password: string;
    role: UserRole;
  }): Promise<boolean> {
    try {
      const res = await fetchWithAuth(`${AUTH_API}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });
      if (res.ok) {
        refreshUsers();
        refreshAuditLogs();
        return true;
      }
    } catch (e) {
      console.error("Failed to create user", e);
    }
    return false;
  }

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => setIsLoginModalOpen(false);

  const isAuthenticated = Boolean(currentUser.id && currentUser.id > 0);
  const isAdmin = currentUser.role === "Admin";
  const canEditSettings = currentUser.role === "Admin";

  return (
    <UserContext.Provider
      value={{
        currentUser,
        authToken,
        authReady,
        isAuthenticated,
        isAdmin,
        canEditSettings,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        login,
        logout,
        setUserRole,
        usersList,
        refreshUsers,
        auditLogs,
        refreshAuditLogs,
        updateUserRoleApi,
        toggleUserActiveApi,
        createUserApi,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
