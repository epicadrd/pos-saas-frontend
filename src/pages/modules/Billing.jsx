import { useState } from "react";
import {
  CreditCard,
  CalendarDays,
  ShieldCheck,
  Settings,
  Crown,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/axios";
import "../../styles/Billing.css";

export default function Billing() {
  const { tenant } = useAuth();
  const { t, i18n } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const locale = i18n.language === "en" || tenant?.country === "US" ? "en-US" : "es-DO";

  const planName =
    t(`billing.plans.${tenant?.plan}`, {
      defaultValue: t("billing.plans.none"),
    });

  const statusName =
    t(`billing.status.${tenant?.subscriptionStatus}`, {
      defaultValue: t("billing.status.none"),
    });

  const renewalDate = tenant?.subscriptionCurrentPeriodEnd
    ? new Date(tenant.subscriptionCurrentPeriodEnd).toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      })
    : t("billing.notAvailable");

  const cancelDate = tenant?.subscriptionCancelAt
    ? new Date(tenant.subscriptionCancelAt).toLocaleDateString(locale, {
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
      setError(error.response?.data?.message || t("billing.errors.portal"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="billing-page">
      <div className="billing-hero">
        <h1>{t("billing.title")}</h1>
        <p>{t("billing.description")}</p>
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
                <h3>{t("billing.currentPlan.title")}</h3>
                <p>{t("billing.currentPlan.description")}</p>
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
                <h3>{t("billing.renewal.title")}</h3>
                <p>{t("billing.renewal.description")}</p>
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
                <h3>{t("billing.subscriptionStatus.title")}</h3>
                <p>{t("billing.subscriptionStatus.description")}</p>
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
              <span>{t("billing.stripeConnected")}</span>
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
                <h3>{t("billing.managePayments.title")}</h3>
                <p>{t("billing.managePayments.description")}</p>
              </div>
            </div>
          </div>

          {cancelDate && (
            <div className="billing-cancel-notice">
              <strong>{t("billing.cancelNotice.title")}</strong>
              <span>
                {t("billing.cancelNotice.description", {
                  date: cancelDate,
                })}
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
                ? t("billing.buttons.openingPortal")
                : t("billing.buttons.openPortal")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}