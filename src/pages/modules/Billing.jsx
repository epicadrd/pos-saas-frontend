import { useState } from "react";
import {
  CreditCard,
  CalendarDays,
  ShieldCheck,
  Settings,
  Crown,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/axios";
import "../../styles/Billing.css";

const PLAN_LABELS = {
  emprendedor: "Emprendedor",
  pyme: "PyME",
  empresarial: "Empresarial",
};

const STATUS_LABELS = {
  active: "Activa",
  trialing: "En prueba",
  past_due: "Pago pendiente",
  canceled: "Cancelada",
  inactive: "Inactiva",
};

export default function Billing() {
  const { tenant, refreshSession } = useAuth();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const planName = PLAN_LABELS[tenant?.plan] || "Sin plan";

  const statusName =
    STATUS_LABELS[tenant?.subscriptionStatus] || "Sin estado";

const renewalDate = tenant?.subscriptionCurrentPeriodEnd
  ? new Date(tenant.subscriptionCurrentPeriodEnd).toLocaleDateString("es-DO", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    })
  : "No disponible";

  const cancelDate = tenant?.subscriptionCancelAt
  ? new Date(tenant.subscriptionCancelAt).toLocaleDateString("es-DO", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    })
  : null;

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

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await refreshSession();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="billing-page">
      <div className="billing-hero">
        <h1>Plan y suscripción</h1>

        <p>
          Administra tu suscripción, método de pago y estado de facturación
          desde tu portal seguro conectado con Stripe.
        </p>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <div className="billing-grid">
        <div className="billing-card">
          <div className="billing-card-header">
            <div className="billing-card-title">
              <div className="billing-icon">
                <Crown size={22} />
              </div>

              <div>
                <h3>Plan actual</h3>
                <p>Tu plan activo actualmente</p>
              </div>
            </div>
          </div>

          <div className="billing-plan">
            <strong>{planName}</strong>

            <div className="billing-badge">{statusName}</div>
          </div>
        </div>

        <div className="billing-card">
          <div className="billing-card-header">
            <div className="billing-card-title">
              <div className="billing-icon">
                <CalendarDays size={22} />
              </div>

              <div>
                <h3>Próxima renovación</h3>
                <p>Fecha estimada de renovación</p>
              </div>
            </div>
          </div>

          <div className="billing-renew">{renewalDate}</div>
        </div>

        <div className="billing-card">
          <div className="billing-card-header">
            <div className="billing-card-title">
              <div className="billing-icon">
                <ShieldCheck size={22} />
              </div>

              <div>
                <h3>Estado de suscripción</h3>
                <p>Información de facturación</p>
              </div>
            </div>
          </div>

          <div className="billing-info">
            <div className="billing-info-item">
              <ShieldCheck size={18} />
              <span>{statusName}</span>
            </div>

            <div className="billing-info-item">
              <CreditCard size={18} />
              <span>Stripe conectado</span>
            </div>
          </div>
        </div>
      </div>

      <div className="billing-grid">
        <div className="billing-card">
          <div className="billing-card-header">
            <div className="billing-card-title">
              <div className="billing-icon">
                <CreditCard size={22} />
              </div>

              <div>
                <h3>Administrar pagos</h3>

                <p>
                  Actualiza tu tarjeta, descarga facturas o cambia tu plan
                  directamente desde Stripe.
                </p>
              </div>
            </div>
          </div>

            {cancelDate && (
            <div className="billing-cancel-notice">
                <strong>Suscripción programada para cancelarse</strong>
                <span>
                Tu suscripción seguirá activa hasta el {cancelDate}. Después de esa fecha,
                el acceso al sistema será suspendido.
                </span>
            </div>
            )}

          <div className="billing-actions">
            <button
              className="billing-btn billing-btn-primary"
              onClick={openBillingPortal}
              disabled={loading}
            >
              <Settings size={18} />

              {loading
                ? "Abriendo portal..."
                : "Abrir portal de Stripe"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}