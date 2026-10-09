"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi } from "@/lib/api";

export type UserRole = "guest" | "student" | "admin";

export interface AuthUser {
  id?: string;
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
  register: (name: string, email: string, password: string) => Promise<void>;
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

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    const u: AuthUser = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role as UserRole,
      initials: data.user.initials,
    };
    localStorage.setItem("certmaster-token", data.accessToken);
    localStorage.setItem("certmaster-user", JSON.stringify(u));
    setUser(u);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const data = await authApi.register(name, email, password);
    const u: AuthUser = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role as UserRole,
      initials: data.user.initials,
    };
    localStorage.setItem("certmaster-token", data.accessToken);
    localStorage.setItem("certmaster-user", JSON.stringify(u));
    setUser(u);
  }, []);

  const loginAsGuest = useCallback(() => {
    const g: AuthUser = { name: "Guest", email: "", role: "guest", initials: "G" };
    setUser(g);
    sessionStorage.setItem("certmaster-guest", "true");
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("certmaster-user");
    localStorage.removeItem("certmaster-token");
    sessionStorage.removeItem("certmaster-guest");
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      role: user?.role ?? "guest",
      isGuest: !user || user.role === "guest",
      isAuthenticated: !!user && user.role !== "guest",
      login,
      register,
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
