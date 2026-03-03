import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "./queryClient";
import { queryClient } from "./queryClient";

interface AuthUser {
  id: string;
  name: string;
  email?: string | null;
  phone?: string;
  address?: string;
  role: "admin" | "user";
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (credentials: { email?: string; phone?: string; password: string }) => Promise<AuthUser>;
  register: (data: { name: string; email: string; phone?: string; password: string }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; phone?: string; address?: string }) => Promise<AuthUser>;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleToken = params.get("google_token");
    if (googleToken) {
      localStorage.setItem("coupons_hub_token", googleToken);
      window.history.replaceState({}, "", window.location.pathname);
    }
    const storedToken = googleToken || localStorage.getItem("coupons_hub_token");
    if (storedToken) {
      setToken(storedToken);
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${storedToken}` }
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setUser(data); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials: { email?: string; phone?: string; password: string }): Promise<AuthUser> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Login failed");
    }
    const data = await res.json();
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem("coupons_hub_token", data.token);
    queryClient.clear();
    return data.user;
  };

  const register = async (regData: { name: string; email: string; phone?: string; password: string }): Promise<AuthUser> => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(regData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Registration failed");
    }
    const data = await res.json();
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem("coupons_hub_token", data.token);
    return data.user;
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setToken(null);
    localStorage.removeItem("coupons_hub_token");
    queryClient.clear();
  };

  const updateProfile = async (data: { name?: string; phone?: string; address?: string }): Promise<AuthUser> => {
    const storedToken = localStorage.getItem("coupons_hub_token");
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${storedToken}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Update failed");
    }
    const updated = await res.json();
    setUser(updated);
    return updated;
  };

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, register, logout, updateProfile,
      isAdmin: user?.role === "admin",
      isAuthenticated: !!user,
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
