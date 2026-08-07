import { createContext, useContext, useEffect, useState } from "react";
import Cookies from "js-cookie";
import { authApi } from "@/lib/api";

interface User {
  userId: string;
  email: string;
  displayName: string;
  token: string;
}
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get("token");
    const userData = Cookies.get("user");
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {
        // ignore
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    const d = res.data;
    const u: User = {
      userId: d.user_id,
      email: d.email,
      displayName: d.display_name,
      token: d.token,
    };
    Cookies.set("token", u.token, { expires: 1 });
    Cookies.set("user", JSON.stringify(u), { expires: 1 });
    setUser(u);
  };

  const register = async (email: string, password: string, displayName: string) => {
    const res = await authApi.register({ email, password, display_name: displayName });
    const d = res.data;
    const u: User = {
      userId: d.user_id,
      email: d.email,
      displayName: d.display_name,
      token: d.token,
    };
    Cookies.set("token", u.token, { expires: 1 });
    Cookies.set("user", JSON.stringify(u), { expires: 1 });
    setUser(u);
  };

  const loginAsGuest = async () => {
    const res = await authApi.guest();
    const d = res.data;
    const u: User = { userId: d.user_id, email: d.email, displayName: d.display_name, token: d.token };
    Cookies.set("token", u.token, { expires: 1 });
    Cookies.set("user", JSON.stringify(u), { expires: 1 });
    setUser(u);
  };

  const logout = () => {
    Cookies.remove("token");
    Cookies.remove("user");
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, loginAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};
