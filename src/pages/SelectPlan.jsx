import { useState } from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { api } from "../api/axios";

const plans = [
  {
    id: "emprendedor",
    name: "Emprendedor",
    price: "$12",
    description: "Para emprendedores que necesitan facturar y organizarse.",
    features: [
      "Facturación",
      "Cotizaciones",
      "Clientes",
      "1 usuario principal",
      "1 contador/admin",
      "Soporte WhatsApp",
    ],
  },
  {
    id: "pyme",
    name: "PyME",
    price: "$29",
    popular: true,
    description: "Para negocios que necesitan inventario y más control.",
    features: [
      "Todo en Emprendedor",
      "Inventario completo",
      "Hasta 3 usuarios",
      "Conduces",
      "Recibos",
      "Órdenes de compra",
      "Proveedores",
    ],
  },
  {
    id: "empresarial",
    name: "Empresarial",
    price: "$59",
    description: "Para empresas con equipos y operación avanzada.",
    features: [
      "Todo en PyME",
      "Hasta 10 usuarios",
      "Roles avanzados",
      "Registro de actividad",
      "Personalización avanzada",
      "Soporte prioritario",
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

      <div style={{ width: "100%", maxWidth: 1180, padding: "42px 20px" }}>
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
                className="auth-button"
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