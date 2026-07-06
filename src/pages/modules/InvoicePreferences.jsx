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
  country: "DO",
  electronicInvoicingEnabled: true,
  usStateTaxRate: 0,
  usCountyTaxRate: 0,
  usCityTaxRate: 0,
});

  useEffect(() => {
    if (tenant) {
      setForm({
        invoiceTaxEnabled: tenant.invoiceTaxEnabled !== false,
        invoiceTaxMode: tenant.invoiceTaxMode || "global",
        invoiceTaxRate: tenant.invoiceTaxRate ?? 18,
        country: tenant.country || "DO",
        electronicInvoicingEnabled: tenant.electronicInvoicingEnabled !== false,
        usStateTaxRate: tenant.usStateTaxRate ?? 0,
        usCountyTaxRate: tenant.usCountyTaxRate ?? 0,
        usCityTaxRate: tenant.usCityTaxRate ?? 0,
      });
    }
  }, [tenant]);

  const savePreferences = async () => {
    try {
      const { data } = await api.patch("/auth/tenant", {
        businessName: tenant?.businessName || "",
        email: tenant?.email || "",
        address: tenant?.address || "",
        rnc: tenant?.rnc || "",
        phone: tenant?.phone || "",

        invoiceTaxEnabled: form.invoiceTaxEnabled,
        invoiceTaxMode: form.invoiceTaxMode,
        invoiceTaxRate: Number(form.invoiceTaxRate || 0),
        country: form.country,
        electronicInvoicingEnabled: form.electronicInvoicingEnabled,
        usStateTaxRate: Number(form.usStateTaxRate || 0),
        usCountyTaxRate: Number(form.usCountyTaxRate || 0),
        usCityTaxRate: Number(form.usCityTaxRate || 0),
      });
      
      setTenant(data.tenant);
      alert("Preferencias fiscales guardadas correctamente");
    } catch (error) {
      alert(error.response?.data?.message || "Error guardando preferencias");
    }
  };

  const usTotalTax =
    Number(form.usStateTaxRate || 0) +
    Number(form.usCountyTaxRate || 0) +
    Number(form.usCityTaxRate || 0);
 
    const taxLabel = form.country === "DO" ? "ITBIS" : "Sales Tax";

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

          <h1>Preferencias fiscales</h1>
          <p>Configura el país y los impuestos que se aplicarán en tus documentos.</p>
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
      <h3>Facturación electrónica</h3>
      <p>
        Activa o desactiva la emisión automática de e-CF para empresas de República Dominicana.
      </p>
    </div>
  </div>

  <div className="qb-preference-switch-row">
    <div>
      <strong>Habilitar facturación electrónica e-CF</strong>
      <small>Cuando esté apagado, Aventra generará facturas normales sin enviar a DGII.</small>
    </div>

    <label className="qb-image-switch">
      <input
        type="checkbox"
        checked={form.electronicInvoicingEnabled}
        onChange={(e) =>
          setForm({
            ...form,
            electronicInvoicingEnabled: e.target.checked,
          })
        }
        disabled={form.country !== "DO"}
      />
      <span>
        <b></b>
      </span>
    </label>
  </div>

  {form.country !== "DO" && (
    <div className="qb-preference-note">
      <strong>Nota:</strong> la facturación electrónica e-CF solo aplica para República Dominicana.
    </div>
  )}

  {form.country === "DO" && !form.electronicInvoicingEnabled && (
    <div className="qb-preference-note">
      <strong>Importante:</strong> si está desactivada, Aventra generará facturas normales sin enviar e-CF.
    </div>
  )}
</div>

      <div className="qb-table-card qb-preferences-card">
        <div className="qb-preferences-title">
          <Percent size={22} />
          <div>
            <h3>Configuración de impuestos</h3>
            <p>
              En República Dominicana se usa {taxLabel}. En Estados Unidos puedes
              configurar impuesto estatal, condado y ciudad.
            </p>
          </div>
        </div>

        <div className="qb-preference-switch-row">
          <div>
            <strong>Aplicar impuestos en documentos</strong>
            <small>Activa o desactiva el cálculo de ITBIS / taxes.</small>
          </div>

          <label className="qb-image-switch">
            <input
              type="checkbox"
              checked={form.invoiceTaxEnabled}
              onChange={(e) =>
                setForm({ ...form, invoiceTaxEnabled: e.target.checked })
              }
            />
            <span>
              <b></b>
            </span>
          </label>
        </div>

        <div className="qb-form-grid">
          <label>
            País
            <select
              value={form.country}
              onChange={(e) =>
                setForm({
                  ...form,
                  country: e.target.value,
                  invoiceTaxRate: e.target.value === "DO" ? 18 : form.invoiceTaxRate,
                })
              }
              disabled={!form.invoiceTaxEnabled}
            >
              <option value="DO">República Dominicana</option>
              <option value="US">Estados Unidos</option>
            </select>
          </label>

          <label>
            Modo de impuesto
            <select
              value={form.invoiceTaxMode}
              onChange={(e) =>
                setForm({ ...form, invoiceTaxMode: e.target.value })
              }
              disabled={!form.invoiceTaxEnabled}
            >
              <option value="global">Global para todo el documento</option>
              <option value="line">Configurable por producto/línea</option>
            </select>
          </label>
        </div>

        {form.country === "DO" ? (
          <div className="qb-form-grid">
            <label>
              {taxLabel} %
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
        ) : (
          <>
            <div className="qb-form-grid">
              <label>
                Impuesto estatal %
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.usStateTaxRate}
                  onChange={(e) =>
                    setForm({ ...form, usStateTaxRate: e.target.value })
                  }
                  disabled={!form.invoiceTaxEnabled}
                />
              </label>

              <label>
                Impuesto del condado %
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.usCountyTaxRate}
                  onChange={(e) =>
                    setForm({ ...form, usCountyTaxRate: e.target.value })
                  }
                  disabled={!form.invoiceTaxEnabled}
                />
              </label>

              <label>
                Impuesto de la ciudad %
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.usCityTaxRate}
                  onChange={(e) =>
                    setForm({ ...form, usCityTaxRate: e.target.value })
                  }
                  disabled={!form.invoiceTaxEnabled}
                />
              </label>
            </div>

            <div className="qb-preference-note">
              <strong>Total Sales Tax:</strong> {usTotalTax.toFixed(2)}%
            </div>
          </>
        )}

        <div className="qb-preference-note">
          <strong>Nota:</strong> estos valores serán usados por Aventra para
          calcular los impuestos según el país de la empresa.
        </div>
      </div>
    </div>
  );
}