"use client";

import React, { createContext, useContext, useState } from "react";

export type UserRole = "Admin" | "Analyst" | "Viewer";

export interface UserProfile {
  name: string;
  role: UserRole;
  email: string;
  department: string;
}

interface UserContextType {
  currentUser: UserProfile;
  setUserRole: (role: UserRole) => void;
  isAdmin: boolean;
  canEditSettings: boolean;
}

const defaultUser: UserProfile = {
  name: "Sanskar",
  role: "Admin",
  email: "sanskar@surveillance.gov",
  department: "Market Conduct & Compliance"
};

const UserContext = createContext<UserContextType>({
  currentUser: defaultUser,
  setUserRole: () => {},
  isAdmin: true,
  canEditSettings: true
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile>(defaultUser);

  const setUserRole = (role: UserRole) => {
    setCurrentUser((prev) => ({ ...prev, role }));
  };

  const isAdmin = currentUser.role === "Admin";
  const canEditSettings = currentUser.role === "Admin";

  return (
    <UserContext.Provider value={{ currentUser, setUserRole, isAdmin, canEditSettings }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
