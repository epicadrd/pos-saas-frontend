import { createContext, useContext, useEffect, useState } from "react";
import { api, setAccessToken } from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSession = async () => {
    try {
      const { data } = await api.get("/auth/me");

      setAccessToken(data.accessToken);
      setUser(data.user);
      setTenant(data.tenant);
    } catch (error) {
      setAccessToken(null);
      setUser(null);
      setTenant(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (form) => {
    const { data } = await api.post("/auth/login", form);

    setAccessToken(data.accessToken);
    setUser(data.user);
    setTenant(data.tenant);

    return data;
  };

  const register = async (form) => {
    const { data } = await api.post("/auth/register", form);

    setAccessToken(data.accessToken);
    setUser(data.user);
    setTenant(data.tenant);

    return data;
  };

  const logout = async () => {
    await api.post("/auth/logout");

    setAccessToken(null);
    setUser(null);
    setTenant(null);
  };

  useEffect(() => {
    loadSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        setTenant
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}