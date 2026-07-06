import { useState } from "react";
import {
  AlertTriangle,
  CreditCard,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { api } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import "../styles/subscription-required.css";
import { useNavigate } from "react-router-dom";



export default function SubscriptionRequired() {
  const navigate = useNavigate();
  const { tenant, refreshSession } = useAuth();

  const STATUS_MESSAGES = {
  inactive: {
    title: "Tu suscripción no está activa",
    text: "Para continuar usando Aventra, debes seleccionar o reactivar un plan.",
  },

  canceled: {
    title: "Tu suscripción fue cancelada",
    text: `Tu suscripción permanecerá activa hasta el ${
      tenant?.subscriptionCurrentPeriodEnd
        ? new Date(
            tenant.subscriptionCurrentPeriodEnd
          ).toLocaleDateString("es-DO", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "fin del período actual"
    }. Después de esa fecha, el acceso al sistema será suspendido.`,
  },

  past_due: {
    title: "Pago vencido",
    text: "No pudimos procesar el pago de tu suscripción. Realiza el pago pendiente para recuperar el acceso al sistema.",
  },

  unpaid: {
    title: "Pago pendiente",
    text: "Tu suscripción tiene pagos pendientes. Actualiza tu método de pago para recuperar el acceso.",
  },

  incomplete: {
    title: "Pago incompleto",
    text: "Tu suscripción no fue completada correctamente. Revisa tu método de pago o selecciona un plan nuevamente.",
  },

  incomplete_expired: {
    title: "Pago expirado",
    text: "El intento de pago expiró. Selecciona un plan nuevamente para activar tu cuenta.",
  },

  paused: {
    title: "Suscripción pausada",
    text: "Tu suscripción está pausada. Adminístrala desde Stripe para recuperar el acceso.",
  },
};


  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const status = tenant?.subscriptionStatus || "inactive";
  const content = STATUS_MESSAGES[status] || STATUS_MESSAGES.inactive;

  const openBillingPortal = async () => {
    try {
      setError("");
      setLoading(true);

      const { data } = await api.post("/billing/portal");
      window.location.href = data.url;
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "No pudimos abrir el portal de facturación."
      );
    } finally {
      setLoading(false);
    }
  };

 const retryPayment = async () => {
  try {
    setError("");
    setLoading(true);

    const { data } = await api.post("/billing/retry-payment");

    await refreshSession();

    alert(data.message || "Pago realizado correctamente.");

    navigate("/dashboard", { replace: true });
  } catch (error) {
    setError(
      error.response?.data?.message ||
        "No pudimos procesar el pago. Verifica tu método de pago."
    );
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="subscription-required-page">
      <div className="subscription-required-bg"></div>

      <div className="subscription-required-card">
        <div className="subscription-required-icon">
          <ShieldAlert size={42} />
        </div>

        <span className="subscription-required-badge">
          <AlertTriangle size={16} />
          Acceso suspendido
        </span>

        <h1>{content.title}</h1>

        <p>{content.text}</p>

        <div className="subscription-required-info">
          <div>
            <span>Empresa</span>
            <strong>{tenant?.businessName || "Mi empresa"}</strong>
          </div>

          <div>
            <span>Estado actual</span>
            <strong>{status}</strong>
          </div>
        </div>

        {error && <div className="subscription-required-error">{error}</div>}

            <div className="subscription-required-actions">
            {["past_due", "unpaid"].includes(status) ? (
                <>
                <button onClick={retryPayment} disabled={loading}>
                    <CreditCard size={18} />
                    {loading ? "Procesando..." : "Pagar ahora"}
                    <ArrowRight size={18} />
                </button>

                <button
                    type="button"
                    className="secondary-btn"
                    onClick={openBillingPortal}
                >
                    Actualizar método de pago
                </button>
                </>
            ) : (
                <button
                type="button"
                onClick={() => navigate("/seleccionar-plan")}
                >
                Elegir nuevo plan
                </button>
            )}
            </div>

        <small>
        Desde el portal de Stripe puedes realizar pagos pendientes, actualizar tu
        tarjeta, ver facturas o reactivar tu suscripción de forma segura.
        </small>
      </div>
    </div>
  );
}