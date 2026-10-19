import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import AuthLayout, {
  AuthHeader,
  AuthInput,
  AuthPasswordInput,
} from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/axios";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const location = useLocation();
  const successMessage = location.state?.message || "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await login(form);

    const shouldStartTrialCheckout =
        data.tenant?.subscriptionStatus === "inactive" &&
        data.tenant?.trialEligible === true &&
        data.tenant?.trialUsed !== true &&
        data.tenant?.plan &&
        data.tenant?.trialBillingPeriod;

      if (shouldStartTrialCheckout) {
        const { data: checkout } = await api.post(
          "/billing/checkout",
          {
            plan: data.tenant.plan,
            billingPeriod: data.tenant.trialBillingPeriod,
          }
        );

        window.location.assign(checkout.url);
        return;
      }  

    const activeStatuses = ["active", "trialing"];

    const isActive = activeStatuses.includes(data.tenant?.subscriptionStatus);

    if (!isActive) {
      if (data.tenant?.subscriptionStatus === "inactive") {
        navigate("/seleccionar-plan");
        return;
      }

      navigate("/suscripcion-requerida");
      return;
    }
    
navigate("/dashboard");

    } catch (error) {
      const status = error.response?.status;
      const backendMessage = error.response?.data?.message;

      if (status === 429) {
       const retryAfter = error.response?.data?.retryAfter;

        setError(
          retryAfter
            ? `Por seguridad, el acceso fue bloqueado temporalmente. Intenta nuevamente en ${retryAfter}.`
            : "Por seguridad, el acceso fue bloqueado temporalmente. Intenta nuevamente en unos minutos."
        );

        return;
      }
     if (status === 401) {
        const remainingAttempts = error.response?.data?.remainingAttempts;

        if (typeof remainingAttempts === "number" && remainingAttempts > 0) {
          setError(
            `Correo o contraseña incorrectos. Te quedan ${remainingAttempts} intento(s) antes del bloqueo temporal.`
          );
        } else if (remainingAttempts === 0) {
          setError(
            "Demasiados intentos fallidos. El acceso fue bloqueado temporalmente."
          );
        } else {
          setError("Correo o contraseña incorrectos.");
        }

        return;
      }

      if (status === 403) {
        if (error.response?.data?.code === "EMAIL_NOT_VERIFIED") {
          setError(
            "Debes confirmar tu cuenta antes de iniciar sesión. Revisa el enlace que enviamos a tu correo."
          );
          return;
        }

        setError(
          backendMessage || "Tu usuario está desactivado. Contacta al administrador."
        );
        return;
      }

      setError(backendMessage || "No pudimos iniciar sesión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthHeader
        badge="Sistema seguro"
        badgeIcon={ShieldCheck}
        title="Bienvenido de nuevo"
        text="Accede a tu panel para gestionar ventas, inventario y documentos."
      />

      {error && (
        <div className="auth-shell-alert error" role="alert">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="auth-shell-alert success" role="status">
          <CheckCircle2 size={18} />
          {successMessage}
        </div>
      )}

      <form onSubmit={handleLogin} className="auth-shell-form">
        <AuthInput
          label="Correo electrónico"
          icon={Mail}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="ejemplo@empresa.com"
          value={form.email}
          onChange={handleChange}
        />

        <AuthPasswordInput
          label="Contraseña"
          icon={Lock}
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={form.password}
          onChange={handleChange}
        />

        <div className="auth-shell-row">
          <Link to="/forgot-password" className="auth-shell-link">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <button disabled={loading} className="auth-shell-submit">
          {loading ? (
            <>
              <span className="auth-shell-spinner" />
              Entrando...
            </>
          ) : (
            <>
              Iniciar sesión
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      <p className="auth-shell-switch">
        ¿No tienes cuenta? <Link to="/registro">Crear cuenta</Link>
      </p>
    </AuthLayout>
  );
}