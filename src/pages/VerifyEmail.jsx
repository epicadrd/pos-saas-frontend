import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { api } from "../api/axios";

export default function VerifyEmail() {
  const { token } = useParams();
  const hasVerified = useRef(false);

  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Confirmando tu cuenta...");

  useEffect(() => {
    if (hasVerified.current) return;
    hasVerified.current = true;

    const verify = async () => {
      try {
        const { data } = await api.get(`/auth/verify-email/${token}`);
        setStatus("success");
        setMessage(data.message || "Cuenta confirmada correctamente. Ya puedes iniciar sesión.");
      } catch (error) {
        setStatus("error");
        setMessage(
          error.response?.data?.message ||
            "No pudimos confirmar tu cuenta. El enlace puede haber expirado."
        );
      }
    };

    verify();
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-bg"></div>

      <div className="auth-card login-card">
        <div className="auth-header center">
          {status === "loading" && <Loader2 size={42} className="spin" />}
          {status === "success" && <CheckCircle2 size={48} color="#22c55e" />}
          {status === "error" && <XCircle size={48} color="#ef4444" />}

          <h1>
            {status === "success"
              ? "Cuenta confirmada"
              : status === "error"
              ? "Enlace inválido"
              : "Confirmando cuenta"}
          </h1>

          <p>{message}</p>
        </div>

        <Link to="/login" className="auth-button">
          {status === "success" ? "Iniciar sesión" : "Ir a iniciar sesión"}
        </Link>
      </div>
    </div>
  );
}