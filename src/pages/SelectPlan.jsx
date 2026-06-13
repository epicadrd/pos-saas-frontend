import { useState } from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { api } from "../api/axios";

const plans = [
  {
    id: "emprendedor",
    name: "Emprendedor",
    price: "$20",
    description: "Para negocios que necesitan facturar y organizarse.",
    features: ["Facturas", "Cotizaciones", "Recibos", "Contabilidad", "2 usuarios", "e-CF"],
  },
  {
    id: "pyme",
    name: "PyME",
    price: "$45",
    popular: true,
    description: "Para negocios que necesitan inventario, catálogo y punto de venta.",
    features: [
      "Todo lo del plan Emprendedor",
      "Inventario completo",
      "Catálogo digital",
      "1 punto de venta con hardware",
      "3 usuarios",
      "Registro de actividades por usuario",
    ],
  },
  {
    id: "empresarial",
    name: "Pro",
    price: "$94",
    description: "Para empresas con operaciones más completas.",
    features: [
      "Todo lo del plan PyME",
      "6 usuarios",
      "2 puntos de venta con hardware",
      "Conduces",
      "Órdenes de compra",
      "Gestión de proveedores",
    ],
  },
];

export default function SelectPlan() {
  const [loadingPlan, setLoadingPlan] = useState("");
  const [error, setError] = useState("");

  const handleCheckout = async (plan) => {
    try {
      setError("");
      setLoadingPlan(plan);

      const { data } = await api.post("/billing/checkout", { plan });
      window.location.href = data.url;
    } catch (error) {
      setError(error.response?.data?.message || "No pudimos iniciar el pago.");
    } finally {
      setLoadingPlan("");
    }
  };

  return (
    <div className="auth-page select-plan-page">
      <div className="auth-bg"></div>

      <main className="select-plan-container">
        <header className="select-plan-header">
          <h1>Elige tu plan</h1>
          <p>Selecciona un plan para activar tu cuenta y continuar.</p>
        </header>

        {error && <div className="auth-error">{error}</div>}

        <section className="select-plan-grid">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`select-plan-card ${plan.popular ? "popular" : ""}`}
            >
              {plan.popular && <div className="plan-badge">Más recomendado</div>}

              <div>
                <h2>{plan.name}</h2>
                <p>{plan.description}</p>
              </div>

              <div className="select-plan-price">
                <strong>{plan.price}</strong>
                <span>USD/mes</span>
              </div>

              <div className="select-plan-features">
                {plan.features.map((feature) => (
                  <div key={feature} className="select-plan-feature">
                    <CheckCircle2 size={20} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={!!loadingPlan}
                className="plan-button"
              >
                {loadingPlan === plan.id ? (
                  <>
                    <span className="button-spinner"></span>
                    Preparando pago...
                  </>
                ) : (
                  <>
                    Elegir plan
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}