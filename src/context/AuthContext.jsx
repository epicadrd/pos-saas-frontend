import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api, setAccessToken } from "../api/axios";
import { normalizeLanguage } from "../i18n/translations";

const AuthContext = createContext(null);

const publicRoutes = [
  "/login",
  "/registro",
  "/registro-prueba",
  "/forgot-password",
  "/reset-password",
];

const isPublicRoute = (pathname) => {
  return (
    publicRoutes.includes(pathname) ||
    pathname.startsWith("/verificar-correo") ||
    pathname.startsWith("/reset-password")
  );
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState(() => {
    return normalizeLanguage(localStorage.getItem("Aventra_language") || "es");
  });
  const location = useLocation();

  const clearSession = () => {
    setAccessToken(null);
    setUser(null);
    setTenant(null);
  };

  const loadSession = async () => {
    try {
      const { data } = await api.get("/auth/me");

      setAccessToken(data.accessToken);
      setUser(data.user);
      setTenant(data.tenant);
      const savedLanguage = normalizeLanguage(data.user?.preferredLanguage || "es");
      setLanguage(savedLanguage);
      localStorage.setItem("Aventra_language", savedLanguage);
    } catch (error) {
      clearSession();
    } finally {
      setLoading(false);
    }
  };

  const login = async (form) => {
    const { data } = await api.post("/auth/login", form);

    setAccessToken(data.accessToken);
    setUser(data.user);
    setTenant(data.tenant);
    const savedLanguage = normalizeLanguage(data.user?.preferredLanguage || "es");
    setLanguage(savedLanguage);
    localStorage.setItem("Aventra_language", savedLanguage);

    return data;
  };

  const register = async (form, { trial = false } = {}) => {
    const endpoint = trial
      ? "/auth/register-trial"
      : "/auth/register";

    const { data } = await api.post(endpoint, form);

    return data;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearSession();
    }
  };

  useEffect(() => {
    if (isPublicRoute(location.pathname)) {
      setLoading(false);
      return;
    }

    loadSession();

    const handleForcedLogout = () => {
      clearSession();
    };

    window.addEventListener("auth:logout", handleForcedLogout);

    return () => {
      window.removeEventListener("auth:logout", handleForcedLogout);
    };
  }, [location.pathname]);

  const refreshSession = async () => {
    const { data } = await api.get("/auth/me");

    setAccessToken(data.accessToken);
    setUser(data.user);
    setTenant(data.tenant);
    const savedLanguage = normalizeLanguage(data.user?.preferredLanguage || "es");
    setLanguage(savedLanguage);
    localStorage.setItem("Aventra_language", savedLanguage); 
    return data;
  };

const updateLanguage = async (nextLanguage) => {
  const selectedLanguage = normalizeLanguage(nextLanguage);

  const { data } = await api.patch("/auth/language", {
    language: selectedLanguage,
  });

  if (data.user) {
    setUser(data.user);
  }

  setLanguage(selectedLanguage);
  localStorage.setItem("Aventra_language", selectedLanguage);

  return data;
};

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
        setTenant,
        clearSession,
        refreshSession,
        language,
        setLanguage,
        updateLanguage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}