import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import { api } from "../api/axios";

const plans = [
  {
    id: "emprendedor",
    name: "Básico",
    monthlyPrice: 20,
    annualPrice: 200,
    eyebrow: "Para comenzar",
    description:
      "Las herramientas esenciales para facturar y organizar tu negocio.",
    features: [
      "Facturas, cotizaciones y recibos",
      "Contabilidad del negocio",
      "Hasta 2 usuarios",
      "Facturación electrónica (e-CF)",
    ],
  },
  {
    id: "pyme",
    name: "PyME",
    monthlyPrice: 35,
    annualPrice: 350,
    popular: true,
    eyebrow: "Para crecer",
    description:
      "Controla tus ventas, inventario y operación desde un solo lugar.",
    features: [
      "Todo lo incluido en Básico",
      "Inventario completo",
      "Catálogo digital",
      "1 punto de venta con hardware",
      "Hasta 3 usuarios",
      "Registro de actividad por usuario",
    ],
  },
  {
    id: "empresarial",
    name: "Pro",
    monthlyPrice: 55,
    annualPrice: 550,
    eyebrow: "Para escalar",
    description:
      "Más capacidad y control para empresas con operaciones avanzadas.",
    features: [
      "Todo lo incluido en PyME",
      "Hasta 6 usuarios",
      "2 puntos de venta con hardware",
      "Conduces",
      "Órdenes de compra",
      "Gestión de proveedores",
    ],
  },
];

export default function SelectPlan() {
  const [billingPeriod, setBillingPeriod] = useState("monthly");
  const [loadingPlan, setLoadingPlan] = useState("");
  const [error, setError] = useState("");

  const handleCheckout = async (plan) => {
    try {
      setError("");
      setLoadingPlan(plan);

      const { data } = await api.post("/billing/checkout", {
        plan,
        billingPeriod,
      });

      window.location.href = data.url;
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "No pudimos iniciar el pago.",
      );
    } finally {
      setLoadingPlan("");
    }
  };

  return (
    <div className="auth-page select-plan-page">
      <div className="auth-bg" aria-hidden="true"></div>

      <main className="select-plan-container">
        <div className="select-plan-brand" aria-label="Aventra">
          <span className="select-plan-brand-mark">
            <Sparkles size={18} strokeWidth={2.4} />
          </span>

          <span>Aventra</span>
        </div>

        <header className="select-plan-header">
          <span className="select-plan-kicker">
            Un plan para cada etapa
          </span>

          <h1>Elige el plan ideal para tu negocio</h1>

          <p>
            Activa tu cuenta y comienza a gestionar tu empresa con las
            herramientas que realmente necesitas.
          </p>
        </header>

        <div
          className="select-plan-billing-toggle"
          role="group"
          aria-label="Modalidad de pago"
        >
          <button
            type="button"
            className={billingPeriod === "monthly" ? "active" : ""}
            onClick={() => setBillingPeriod("monthly")}
            aria-pressed={billingPeriod === "monthly"}
            disabled={Boolean(loadingPlan)}
          >
            Mensual
          </button>

          <button
            type="button"
            className={billingPeriod === "annual" ? "active" : ""}
            onClick={() => setBillingPeriod("annual")}
            aria-pressed={billingPeriod === "annual"}
            disabled={Boolean(loadingPlan)}
          >
            Anual
            <span>2 meses gratis</span>
          </button>
        </div>

        {error && (
          <div className="auth-error select-plan-error" role="alert">
            {error}
          </div>
        )}

        <section className="select-plan-grid">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`select-plan-card ${
                plan.popular ? "popular" : ""
              }`}
            >
              {plan.popular && (
                <div className="plan-badge">
                  <BadgeCheck size={15} />
                  Más popular
                </div>
              )}

              <div className="select-plan-card-heading">
                <span className="select-plan-eyebrow">
                  {plan.eyebrow}
                </span>

                <h2>{plan.name}</h2>
                <p>{plan.description}</p>
              </div>

              <div
                className="select-plan-price"
                key={`${plan.id}-${billingPeriod}`}
              >
                <span className="select-plan-currency">$</span>

                <strong>
                  {billingPeriod === "annual"
                    ? plan.annualPrice
                    : plan.monthlyPrice}
                </strong>

                <span className="select-plan-period">
                  <small>USD</small>
                  / {billingPeriod === "annual" ? "año" : "mes"}
                </span>
              </div>

              {billingPeriod === "annual" && (
                <div className="select-plan-annual-note">
                  Equivale a{" "}
                  <strong>
                    US${(plan.annualPrice / 12).toFixed(2)}
                  </strong>{" "}
                  al mes
                </div>
              )}

              <div
                className="select-plan-divider"
                aria-hidden="true"
              ></div>

              <div className="select-plan-features">
                {plan.features.map((feature) => (
                  <div
                    key={feature}
                    className="select-plan-feature"
                  >
                    <span className="select-plan-check">
                      <Check size={14} strokeWidth={3} />
                    </span>

                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleCheckout(plan.id)}
                disabled={Boolean(loadingPlan)}
                className="plan-button"
              >
                {loadingPlan === plan.id ? (
                  <>
                    <span className="button-spinner"></span>
                    Preparando pago...
                  </>
                ) : (
                  <>
                    Elegir {plan.name}{" "}
                    {billingPeriod === "annual" ? "anual" : ""}
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </article>
          ))}
        </section>

        <footer className="select-plan-footer">
          <span>
            <LockKeyhole size={16} />
            Pago seguro y protegido
          </span>
        </footer>
      </main>
    </div>
  );
}