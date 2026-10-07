"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export type UserRole = "guest" | "student" | "admin";

export interface AuthUser {
  name: string;
  email: string;
  role: UserRole;
  initials: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  role: UserRole;
  isGuest: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("certmaster-user");
      if (stored) setUser(JSON.parse(stored));
    } catch {}
  }, []);

  const login = useCallback(async (email: string, _password: string) => {
    const name = email.split("@")[0] || "User";
    const initials = name.slice(0, 2).toUpperCase();
    const u: AuthUser = { name, email, role: "student", initials };
    setUser(u);
    localStorage.setItem("certmaster-user", JSON.stringify(u));
  }, []);

  const loginAsGuest = useCallback(() => {
    const g: AuthUser = { name: "Guest", email: "", role: "guest", initials: "G" };
    setUser(g);
    sessionStorage.setItem("certmaster-guest", "true");
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("certmaster-user");
    sessionStorage.removeItem("certmaster-guest");
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      role: user?.role ?? "guest",
      isGuest: !user || user.role === "guest",
      isAuthenticated: !!user && user.role !== "guest",
      login,
      loginAsGuest,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
