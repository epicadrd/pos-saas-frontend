import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, ArrowRight, ShieldCheck, BarChart3 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

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
    <div className="auth-page">
      <div className="auth-bg"></div>

      <div className="auth-card login-card">
        <div className="auth-brand">
          <div className="brand-icon">
            <BarChart3 size={26} />
          </div>
          <span>Corex</span>
        </div>

        <div className="auth-header">
          <span className="auth-badge">
            <ShieldCheck size={16} />
            Sistema seguro
          </span>

          <h1>Bienvenido de nuevo</h1>
          <p>Accede a tu panel para gestionar ventas, inventario y documentos.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {successMessage && <div className="auth-success">{successMessage}</div>}

        <form onSubmit={handleLogin} className="auth-form">
          <label>Correo electrónico</label>
          <div className="input-group">
            <Mail size={19} />
            <input
              name="email"
              type="email"
              placeholder="ejemplo@empresa.com"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <label>Contraseña</label>
          <div className="input-group">
            <Lock size={19} />
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
            />
          </div>

          <button disabled={loading} className="auth-button">
            {loading ? "Entrando..." : "Iniciar sesión"}
            <ArrowRight size={20} />
          </button>
        </form>

        <p className="auth-switch">
          ¿No tienes cuenta? <Link to="/registro">Crear cuenta</Link>
        </p>
      </div>
    </div>
  );
}