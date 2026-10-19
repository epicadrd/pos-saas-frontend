import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  MailCheck,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import AuthLayout, { AuthHeader, AuthInput } from "../components/AuthLayout";
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
    <AuthLayout
      asideTitle="Recupera el acceso en segundos."
      asideText="Te enviaremos un enlace seguro a tu correo para que crees una nueva contraseña y sigas trabajando."
    >
      <AuthHeader
        badge="Recuperación segura"
        badgeIcon={ShieldCheck}
        title="Recuperar contraseña"
        text="Escribe tu correo y te enviaremos un enlace para crear una nueva contraseña."
      />

      {error && (
        <div className="auth-shell-alert error" role="alert">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {message && (
        <div className="auth-shell-alert success" role="status">
          <MailCheck size={18} />
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-shell-form">
        <AuthInput
          label="Correo electrónico"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="ejemplo@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button disabled={loading} className="auth-shell-submit">
          {loading ? (
            <>
              <span className="auth-shell-spinner" />
              Enviando...
            </>
          ) : (
            <>
              Enviar enlace
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      <p className="auth-shell-switch">
        <Link to="/login">
          <ArrowLeft size={15} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          Volver a iniciar sesión
        </Link>
      </p>
    </AuthLayout>
  );
}