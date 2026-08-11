"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

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
  isAdmin: boolean;
  canEditSettings: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setUserRole: (role: UserRole) => void;
  usersList: UserProfile[];
  refreshUsers: () => Promise<void>;
  auditLogs: AuditLogItem[];
  refreshAuditLogs: () => Promise<void>;
  updateUserRoleApi: (userId: number, newRole: UserRole) => Promise<boolean>;
  toggleUserActiveApi: (userId: number) => Promise<boolean>;
  createUserApi: (user: { username: string; email: string; full_name: string; department: string; password: string; role: UserRole }) => Promise<boolean>;
}

const defaultGuestUser: UserProfile = {
  id: 0,
  username: "guest_viewer",
  name: "Guest / Unauthenticated User",
  role: "Viewer",
  email: "guest@surveillance.gov",
  department: "Public / Read Only",
  is_active: false,
};

const BASE_HOST = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : "http://127.0.0.1:8000";
const AUTH_API = `${BASE_HOST}/api/v1/auth`;

const UserContext = createContext<UserContextType>({
  currentUser: defaultGuestUser,
  authToken: null,
  isAdmin: false,
  canEditSettings: false,
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
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  useEffect(() => {
    // Check saved token on mount
    const savedToken = localStorage.getItem("pvasf_auth_token");
    if (savedToken) {
      setAuthToken(savedToken);
      fetchMe(savedToken);
    }
  }, []);

  async function fetchMe(token: string | null) {
    if (!token) {
      setCurrentUser(defaultGuestUser);
      return;
    }
    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${AUTH_API}/me`, { headers });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser({
          id: data.id,
          username: data.username,
          name: data.full_name || data.username,
          role: data.role as UserRole,
          email: data.email,
          department: data.department,
          is_active: data.is_active,
        });
      } else {
        logout();
      }
    } catch (e) {
      console.error("Failed to fetch current user profile", e);
    }
  }

  async function login(username: string, password: string): Promise<boolean> {
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
        refreshUsers(token);
        refreshAuditLogs(token);
        return true;
      }
    } catch (e) {
      console.error("Login failed", e);
    }
    return false;
  }

  function logout() {
    setAuthToken(null);
    localStorage.removeItem("pvasf_auth_token");
    setCurrentUser(defaultGuestUser);
  }

  const setUserRole = (role: UserRole) => {
    // Role state is managed via backend auth token claims
  };

  async function refreshUsers(tokenOverride?: string | null) {
    try {
      const activeTok = tokenOverride !== undefined ? tokenOverride : authToken;
      const headers: Record<string, string> = {};
      if (activeTok) headers["Authorization"] = `Bearer ${activeTok}`;
      const res = await fetch(`${AUTH_API}/users`, { headers });
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
  }

  async function refreshAuditLogs(tokenOverride?: string | null) {
    try {
      const activeTok = tokenOverride !== undefined ? tokenOverride : authToken;
      const headers: Record<string, string> = {};
      if (activeTok) headers["Authorization"] = `Bearer ${activeTok}`;
      const res = await fetch(`${AUTH_API}/audit-logs?limit=100`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (e) {
      console.error("Failed to refresh audit logs", e);
    }
  }

  async function updateUserRoleApi(userId: number, newRole: UserRole): Promise<boolean> {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
      const res = await fetch(`${AUTH_API}/users/${userId}/role`, {
        method: "PUT",
        headers,
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
      const headers: Record<string, string> = {};
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
      const res = await fetch(`${AUTH_API}/users/${userId}/toggle`, {
        method: "PUT",
        headers,
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
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
      const res = await fetch(`${AUTH_API}/users`, {
        method: "POST",
        headers,
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

  const isAdmin = currentUser.role === "Admin";
  const canEditSettings = currentUser.role === "Admin";

  return (
    <UserContext.Provider
      value={{
        currentUser,
        authToken,
        isAdmin,
        canEditSettings,
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
