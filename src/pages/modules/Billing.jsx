import { useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  CreditCard,
  Crown,
  Settings,
  ShieldCheck,
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

  const locale =
    i18n.language === "en" || tenant?.country === "US"
      ? "en-US"
      : "es-DO";

  const planName = t(`billing.plans.${tenant?.plan}`, {
    defaultValue: t("billing.plans.none"),
  });

  const statusKey = tenant?.subscriptionStatus || "none";

  const statusName = t(`billing.status.${statusKey}`, {
    defaultValue: t("billing.status.none"),
  });

  const renewalDate = tenant?.subscriptionCurrentPeriodEnd
    ? new Date(
        tenant.subscriptionCurrentPeriodEnd,
      ).toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      })
    : t("billing.notAvailable");

  const cancelDate = tenant?.subscriptionCancelAt
    ? new Date(tenant.subscriptionCancelAt).toLocaleDateString(
        locale,
        {
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "UTC",
        },
      )
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
          t("billing.errors.portal"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="billing-page">
      <header className="billing-hero">
        <div className="billing-hero-content">
          <span className="billing-hero-kicker">
            <ShieldCheck size={16} />
            {t("billing.kicker")}
          </span>

          <h1>{t("billing.title")}</h1>
          <p>{t("billing.description")}</p>
        </div>

        <div
          className="billing-hero-decoration"
          aria-hidden="true"
        >
          <CreditCard size={72} strokeWidth={1.25} />
        </div>
      </header>

      {error && (
        <div
          className="auth-error billing-error"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="billing-layout">
        <section className="billing-card billing-plan-card">
          <div className="billing-card-top">
            <div className="billing-card-title">
              <div className="billing-icon">
                <Crown size={22} />
              </div>

              <div>
                <span className="billing-label">
                  {t("billing.currentPlan.title")}
                </span>

                <p>
                  {t("billing.currentPlan.description")}
                </p>
              </div>
            </div>

            <span
              className={`billing-status billing-status-${statusKey}`}
            >
              <span className="billing-status-dot"></span>
              {statusName}
            </span>
          </div>

          <div className="billing-plan-name">
            <span>
              {t("billing.currentPlan.label")}
            </span>

            <strong>{planName}</strong>
          </div>

          <div className="billing-summary">
            <div className="billing-summary-item">
              <div className="billing-summary-icon">
                <CalendarDays size={20} />
              </div>

              <div>
                <span>
                  {t("billing.renewal.title")}
                </span>

                <strong>{renewalDate}</strong>

                <small>
                  {t("billing.renewal.description")}
                </small>
              </div>
            </div>

            <div className="billing-summary-item">
              <div className="billing-summary-icon">
                <ShieldCheck size={20} />
              </div>

              <div>
                <span>
                  {t(
                    "billing.subscriptionStatus.title",
                  )}
                </span>

                <strong>{statusName}</strong>

                <small>
                  {t(
                    "billing.subscriptionStatus.description",
                  )}
                </small>
              </div>
            </div>
          </div>

          {cancelDate && (
            <div className="billing-cancel-notice">
              <strong>
                {t("billing.cancelNotice.title")}
              </strong>

              <span>
                {t(
                  "billing.cancelNotice.description",
                  {
                    date: cancelDate,
                  },
                )}
              </span>
            </div>
          )}
        </section>

        <aside className="billing-card billing-manage-card">
          <div className="billing-manage-icon">
            <Settings size={25} />
          </div>

          <div className="billing-manage-copy">
            <span className="billing-label">
              {t(
                "billing.managePayments.eyebrow",
              )}
            </span>

            <h2>
              {t("billing.managePayments.title")}
            </h2>

            <p>
              {t(
                "billing.managePayments.description",
              )}
            </p>
          </div>

          <div className="billing-manage-features">
            <div>
              <span>
                <Check
                  size={13}
                  strokeWidth={3}
                />
              </span>

              {t(
                "billing.managePayments.features.paymentMethod",
              )}
            </div>

            <div>
              <span>
                <Check
                  size={13}
                  strokeWidth={3}
                />
              </span>

              {t(
                "billing.managePayments.features.invoices",
              )}
            </div>

            <div>
              <span>
                <Check
                  size={13}
                  strokeWidth={3}
                />
              </span>

              {t(
                "billing.managePayments.features.plan",
              )}
            </div>
          </div>

          <button
            type="button"
            className="billing-btn"
            onClick={openBillingPortal}
            disabled={loading}
          >
            {loading
              ? t(
                  "billing.buttons.openingPortal",
                )
              : t(
                  "billing.buttons.openPortal",
                )}

            {!loading && (
              <ArrowUpRight size={19} />
            )}
          </button>

          <small className="billing-secure-note">
            <ShieldCheck size={15} />
            {t("billing.securePortal")}
          </small>
        </aside>
      </div>
    </div>
  );
}