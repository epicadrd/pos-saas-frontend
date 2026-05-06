import { useEffect, useState } from "react";
import { ArrowLeft, Hash, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

export default function InvoiceNumbering() {
  const navigate = useNavigate();
  const { tenant, setTenant } = useAuth();

  const [form, setForm] = useState({
    invoicePrefix: "FAC",
    invoiceNextNumber: 1,
    invoiceDigits: 6,
  });

  useEffect(() => {
    if (tenant) {
      setForm({
        invoicePrefix: tenant.invoicePrefix || "FAC",
        invoiceNextNumber: tenant.invoiceNextNumber || 1,
        invoiceDigits: tenant.invoiceDigits || 6,
      });
    }
  }, [tenant]);

  const preview = `${form.invoicePrefix || "FAC"}-${String(
    form.invoiceNextNumber || 1
  ).padStart(Number(form.invoiceDigits || 6), "0")}`;

  const saveNumbering = async () => {
    try {
      const { data } = await api.patch("/auth/tenant", {
        ...tenant,
        invoicePrefix: form.invoicePrefix.trim().toUpperCase(),
        invoiceNextNumber: Number(form.invoiceNextNumber || 1),
        invoiceDigits: Number(form.invoiceDigits || 6),
      });

      setTenant(data.tenant);
      alert("Numeración guardada correctamente");
    } catch (error) {
      alert(error.response?.data?.message || "Error guardando numeración");
    }
  };

  return (
    <div className="qb-list-page">
      <div className="qb-list-header">
        <div>
          <button
            className="qb-back"
            onClick={() => navigate("/dashboard/facturacion?nueva=1")}
          >
            <ArrowLeft size={18} />
          </button>

          <h1>Numeración de facturas</h1>
          <p>Configura el formato y próximo número de tus facturas.</p>
        </div>

        <button className="qb-primary-btn" onClick={saveNumbering}>
          <Save size={17} />
          Guardar cambios
        </button>
      </div>

      <div className="qb-table-card qb-preferences-card">
        <div className="qb-preferences-title">
          <Hash size={22} />
          <div>
            <h3>Formato de numeración</h3>
            <p>Define cómo se generará el número de cada factura.</p>
          </div>
        </div>

        <div className="qb-form-grid">
          <label>
            Prefijo
            <input
              value={form.invoicePrefix}
              onChange={(e) =>
                setForm({ ...form, invoicePrefix: e.target.value.toUpperCase() })
              }
              placeholder="FAC"
            />
          </label>

          <label>
            Próximo número
            <input
              type="number"
              min="1"
              value={form.invoiceNextNumber}
              onChange={(e) =>
                setForm({ ...form, invoiceNextNumber: e.target.value })
              }
            />
          </label>

          <label>
            Cantidad de dígitos
            <input
              type="number"
              min="3"
              max="10"
              value={form.invoiceDigits}
              onChange={(e) =>
                setForm({ ...form, invoiceDigits: e.target.value })
              }
            />
          </label>
        </div>

        <div className="qb-preference-note">
          <strong>Próxima factura:</strong> {preview}
        </div>
      </div>
    </div>
  );
}