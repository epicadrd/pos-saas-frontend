import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowRight, BarChart3, ShieldCheck } from "lucide-react";
import { api } from "../api/axios";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

  try {
    const { data } = await api.post("/auth/forgot-password", {
        email,
    });

    setError("");
    setMessage(data.message);
    } catch (error) {
    setMessage("");

    setError(
        error.response?.data?.message ||
        "No pudimos procesar la solicitud. Intenta nuevamente."
    );
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
            Recuperación segura
          </span>

          <h1>Recuperar contraseña</h1>
          <p>
            Escribe tu correo y te enviaremos un enlace para crear una nueva
            contraseña.
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>Correo electrónico</label>

          <div className="input-group">
            <Mail size={19} />
            <input
              type="email"
              placeholder="ejemplo@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button disabled={loading} className="auth-button">
            {loading ? "Enviando..." : "Enviar enlace"}
            <ArrowRight size={20} />
          </button>
        </form>

        <p className="auth-switch">
          ¿Recordaste tu contraseña? <Link to="/login">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}