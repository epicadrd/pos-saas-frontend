import { useState } from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { api } from "../api/axios";

const plans = [
  {
    id: "emprendedor",
    name: "Emprendedor",
    price: "$20",
    description: "Para negocios que necesitan facturar y organizarse.",
    features: [
      "Facturas",
      "Cotizaciones",
      "Recibos",
      "Contabilidad",
      "2 usuarios",
      "e-CF",
    ],
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
      setError(
        error.response?.data?.message || "No pudimos iniciar el pago."
      );
    } finally {
      setLoadingPlan("");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg"></div>

      <div
        style={{
          width: "100%",
          maxWidth: 1180,
          padding: "42px 20px",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 34 }}>
          <h1 style={{ color: "white", fontSize: 44, marginBottom: 10 }}>
            Elige tu plan
          </h1>
          <p style={{ color: "#cbd5e1", fontSize: 18 }}>
            Selecciona un plan para activar tu cuenta y continuar.
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 22,
          }}
        >
          {plans.map((plan) => (
            <div
              key={plan.id}
              style={{
                background: plan.popular
                  ? "linear-gradient(135deg, #2563eb, #00bfae)"
                  : "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: 28,
                padding: 28,
                color: "white",
              }}
            >
              {plan.popular && (
                <div style={{ marginBottom: 16, fontWeight: 800 }}>
                  Más recomendado
                </div>
              )}

              <h2 style={{ fontSize: 28 }}>{plan.name}</h2>
              <p style={{ color: "#e2e8f0", minHeight: 48 }}>
                {plan.description}
              </p>

              <div style={{ margin: "22px 0" }}>
                <span style={{ fontSize: 42, fontWeight: 900 }}>
                  {plan.price}
                </span>
                <span style={{ color: "#cbd5e1" }}> USD/mes</span>
              </div>

              <div style={{ display: "grid", gap: 12, marginBottom: 28 }}>
                {plan.features.map((feature) => (
                  <div key={feature} style={{ display: "flex", gap: 10 }}>
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
                    Preparando pago seguro...
                    </>
                ) : (
                    <>
                    Elegir plan
                    <ArrowRight size={20} />
                    </>
                )}
                </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}