import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function Success() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
 const { refreshSession, loading } = useAuth();

  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Activando tu suscripción...");

  useEffect(() => {

    if (loading) return;

    const confirm = async () => {
      try {
        const sessionId = searchParams.get("session_id");

        if (!sessionId) {
          throw new Error("No se encontró la sesión de pago.");
        }

        await api.get(`/billing/checkout-session/${sessionId}`);
        await refreshSession();

        setStatus("success");
        setMessage("Tu suscripción fue activada correctamente.");

        setTimeout(() => {
          navigate("/dashboard");
        }, 1200);
      } catch (error) {
        setStatus("error");
        setMessage(
          error.response?.data?.message ||
            "No pudimos confirmar la suscripción."
        );
      }
    };

    confirm();
  }, [loading]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-green-50 p-6">
      <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
        <h1 className="text-3xl font-black text-green-700">
          {status === "success" ? "Pago realizado" : "Procesando pago"}
        </h1>

        <p className="mt-3 text-slate-600">{message}</p>

        <Link
          to={status === "success" ? "/dashboard" : "/seleccionar-plan"}
          className="mt-6 inline-block rounded-xl bg-green-600 px-6 py-3 font-bold text-white"
        >
          {status === "success" ? "Ir al dashboard" : "Volver a planes"}
        </Link>
      </div>
    </div>
  );
}