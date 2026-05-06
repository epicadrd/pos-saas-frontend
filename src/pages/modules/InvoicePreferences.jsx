import { useEffect, useState } from "react";
import { ArrowLeft, Percent, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

export default function InvoicePreferences() {
  const navigate = useNavigate();
  const { tenant, setTenant } = useAuth();

  const [form, setForm] = useState({
    invoiceTaxEnabled: true,
    invoiceTaxMode: "global",
    invoiceTaxRate: 18,
  });

  useEffect(() => {
    if (tenant) {
      setForm({
        invoiceTaxEnabled: tenant.invoiceTaxEnabled !== false,
        invoiceTaxMode: tenant.invoiceTaxMode || "global",
        invoiceTaxRate: tenant.invoiceTaxRate || 18,
      });
    }
  }, [tenant]);

  const savePreferences = async () => {
    try {
      const { data } = await api.patch("/auth/tenant", {
        ...tenant,
        invoiceTaxEnabled: form.invoiceTaxEnabled,
        invoiceTaxMode: form.invoiceTaxMode,
        invoiceTaxRate: Number(form.invoiceTaxRate || 0),
      });

      setTenant(data.tenant);
      alert("Preferencias de factura guardadas correctamente");
    } catch (error) {
      alert(error.response?.data?.message || "Error guardando preferencias");
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

          <h1>Preferencias de factura</h1>
          <p>Configura cómo se calculará el ITBIS en tus facturas.</p>
        </div>

        <button className="qb-primary-btn" onClick={savePreferences}>
          <Save size={17} />
          Guardar cambios
        </button>
      </div>

      <div className="qb-table-card qb-preferences-card">
        <div className="qb-preferences-title">
          <Percent size={22} />
          <div>
            <h3>Configuración de ITBIS</h3>
            <p>Define si el impuesto será global o configurable por línea.</p>
          </div>
        </div>

        <label className="qb-preference-switch">
          <input
            type="checkbox"
            checked={form.invoiceTaxEnabled}
            onChange={(e) =>
              setForm({ ...form, invoiceTaxEnabled: e.target.checked })
            }
          />
          Aplicar ITBIS en facturas
        </label>

        <div className="qb-form-grid">
          <label>
            Modo de impuesto
            <select
              value={form.invoiceTaxMode}
              onChange={(e) =>
                setForm({ ...form, invoiceTaxMode: e.target.value })
              }
              disabled={!form.invoiceTaxEnabled}
            >
              <option value="global">Global para toda la factura</option>
              <option value="line">Configurable por producto/línea</option>
            </select>
          </label>

          <label>
            Tasa de ITBIS %
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.invoiceTaxRate}
              onChange={(e) =>
                setForm({ ...form, invoiceTaxRate: e.target.value })
              }
              disabled={!form.invoiceTaxEnabled}
            />
          </label>
        </div>

        <div className="qb-preference-note">
          <strong>Recomendación:</strong> deja “Global” si todos tus productos y
          servicios llevan ITBIS. Usa “Por línea” si algunos conceptos no llevan
          impuesto.
        </div>
      </div>
    </div>
  );
}