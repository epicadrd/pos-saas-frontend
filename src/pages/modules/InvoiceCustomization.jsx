import { useEffect, useState } from "react";
import { ImagePlus, Save, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

export default function InvoiceCustomization() {
  const navigate = useNavigate();
  const { tenant, setTenant } = useAuth();

  const [form, setForm] = useState({
    logoDataUrl: "",
    primaryColor: "#00bfae",
  });

  useEffect(() => {
    if (tenant) {
      setForm({
        logoDataUrl: tenant.logoDataUrl || "",
        primaryColor: tenant.primaryColor || "#00bfae",
      });
    }
  }, [tenant]);

  const handleLogoChange = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  const maxSize = 2 * 1024 * 1024; // 2MB

  if (!allowedTypes.includes(file.type)) {
    alert("Solo puedes subir logos en formato PNG, JPG, JPEG o WEBP.");
    e.target.value = "";
    return;
  }

  if (file.size > maxSize) {
    alert("El logo no puede pesar más de 2MB.");
    e.target.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    setForm((prev) => ({
      ...prev,
      logoDataUrl: reader.result,
    }));
  };

  reader.readAsDataURL(file);
};

  const saveCustomization = async () => {
    try {
      const { data } = await api.patch("/auth/tenant", {
        ...tenant,
        logoDataUrl: form.logoDataUrl,
        primaryColor: form.primaryColor,
      });

      setTenant(data.tenant);
      alert("Personalización guardada correctamente");
    } catch (error) {
      alert(error.response?.data?.message || "Error guardando personalización");
    }
  };

  return (
    <div className="qb-list-page">
      <div className="qb-list-header">
        <div>
          <button className="qb-back" onClick={() => navigate("/dashboard/facturacion?nueva=1")}>
            <ArrowLeft size={18} />
          </button>

          <h1>Personalización de factura</h1>
          <p>Configura el logo y color principal que aparecerán en tus facturas.</p>
        </div>

        <button className="qb-primary-btn" onClick={saveCustomization}>
          <Save size={17} />
          Guardar cambios
        </button>
      </div>

      <div className="qb-customization-layout">
        <div className="qb-table-card qb-customization-card">
          <h3>Logo de la empresa</h3>

          <label className="qb-logo-upload">
            <input type="file" accept="image/*" onChange={handleLogoChange} />
            <ImagePlus size={22} />
            <span>Subir logo</span>
          </label>

          {form.logoDataUrl && (
            <button
              className="qb-secondary-btn"
              onClick={() => setForm({ ...form, logoDataUrl: "" })}
            >
              Quitar logo
            </button>
          )}

          <h3>Color principal</h3>

          <div className="qb-color-row">
            <input
              type="color"
              value={form.primaryColor}
              onChange={(e) =>
                setForm({ ...form, primaryColor: e.target.value })
              }
            />

            <input
              value={form.primaryColor}
              onChange={(e) =>
                setForm({ ...form, primaryColor: e.target.value })
              }
            />
          </div>
        </div>

        <div className="qb-invoice-preview-card">
          <div
            className="qb-preview-header"
            style={{ borderColor: form.primaryColor }}
          >
            <div>
              <h2 style={{ color: form.primaryColor }}>FACTURA</h2>
              <p>FAC-000001</p>
            </div>

            <div className="qb-preview-logo">
              {form.logoDataUrl ? (
                <img src={form.logoDataUrl} alt="Logo" />
              ) : (
                <span>Logo</span>
              )}
            </div>
          </div>

          <div className="qb-preview-company">
            <strong>{tenant?.businessName || "Mi empresa"}</strong>
            <p>{tenant?.address || "Dirección de la empresa"}</p>
            <p>RNC/Cédula: {tenant?.rnc || "No configurado"}</p>
          </div>

          <table className="qb-preview-table">
            <thead>
              <tr style={{ background: form.primaryColor }}>
                <th>Producto</th>
                <th>Cant.</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>Producto de ejemplo</td>
                <td>1</td>
                <td>RD$ 1,180.00</td>
              </tr>
            </tbody>
          </table>

          <div className="qb-preview-total">
            <span>Total</span>
            <strong style={{ color: form.primaryColor }}>RD$ 1,180.00</strong>
          </div>
        </div>
      </div>
    </div>
  );
}