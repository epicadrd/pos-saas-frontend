import { useEffect, useState } from "react";
import { Building2, Save, X } from "lucide-react";
import { api } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

const emptyForm = {
  businessName: "",
  legalName: "",
  rnc: "",
  companyType: "",
  address: "",
  legalAddress: "",
  email: "",
  phone: "",
  website: "",
  industry: "",
  clientEmail: "",
  clientAddress: "",
};

const fieldLabels = {
  businessName: "Nombre",
  address: "Dirección",
  email: "Correo electrónico",
  phone: "Teléfono",
  website: "Sitio web",
  industry: "Sector",
  legalName: "Nombre legal de la empresa",
  rnc: "RNC / TAX ID",
  companyType: "Tipo de empresa",
  legalAddress: "Domicilio legal",
  clientEmail: "Correo electrónico del cliente",
  clientAddress: "Dirección del cliente",
};

const fieldHelp = {
  legalName: "Tu nombre comercial registrado. Se usa en formularios fiscales.",
  rnc: "Identificación fiscal de la empresa.",
  companyType: "Ej: Responsabilidad limitada, persona física, etc.",
  legalAddress: "Dirección legal usada para fines fiscales.",
};

function SettingsSection({ title, description, rows, form, editing, setEditing, onChange, onSave, onCancel, saving }) {
  return (
    <section className="account-settings-card">
      <div className="account-settings-card-head">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      {rows.map((row) => {
        const isEditing = editing === row.name;
        const value = form[row.name] || "";

        return (
          <div
            key={row.name}
            className={`account-settings-row ${isEditing ? "editing" : ""}`}
          >
            <div className="account-settings-label">
              <strong>{row.label}</strong>
              {isEditing && fieldHelp[row.name] && <span>{fieldHelp[row.name]}</span>}
            </div>

            <div className="account-settings-value">
              {isEditing ? (
                row.type === "textarea" ? (
                  <textarea
                    value={value}
                    onChange={(e) => onChange(row.name, e.target.value)}
                    rows="3"
                    autoFocus
                  />
                ) : (
                  <input
                    value={value}
                    onChange={(e) => onChange(row.name, e.target.value)}
                    autoFocus
                  />
                )
              ) : (
                <span>{value || "—"}</span>
              )}
            </div>

            <div className="account-settings-action">
              {isEditing ? (
                <div className="account-settings-edit-actions">
                  <button
                    type="button"
                    className="account-settings-cancel"
                    onClick={onCancel}
                    disabled={saving}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    className="account-settings-save"
                    onClick={onSave}
                    disabled={saving}
                  >
                    <Save size={16} />
                    {saving ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setEditing(row.name)}>
                  Editar
                </button>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}

export default function AccountSettings() {
  const { refreshSession } = useAuth();

  const [form, setForm] = useState(emptyForm);
  const [backup, setBackup] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);

  const loadSettings = async () => {
    try {
      setLoading(true);

      const { data } = await api.get("/account-settings");

      const next = {
        ...emptyForm,
        businessName: data.businessName || "",
        legalName: data.legalName || "",
        rnc: data.rnc || "",
        companyType: data.companyType || "",
        address: data.address || "",
        legalAddress: data.legalAddress || "",
        email: data.email || "",
        phone: data.phone || "",
        website: data.website || "",
        industry: data.industry || "",
        clientEmail: data.clientEmail || "",
        clientAddress: data.clientAddress || "",
      };

      setForm(next);
      setBackup(next);
    } catch (error) {
      alert(error.response?.data?.message || "No se pudo cargar la configuración");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateField = (name, value) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const cancelEdit = () => {
    setForm(backup);
    setEditing(null);
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      const { data } = await api.put("/account-settings", form);

      const next = {
        ...form,
        ...data.tenant,
      };

      setForm(next);
      setBackup(next);
      setEditing(null);

      await refreshSession();
    } catch (error) {
      alert(error.response?.data?.message || "No se pudo guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="account-settings-loading">Cargando configuración...</div>;
  }

  return (
    <div className="account-settings-page">
      <section className="account-settings-hero">
        <div className="account-settings-logo">
          <Building2 size={34} />
        </div>

        <div>
          <span>Configuración</span>
          <h2>Cuenta y configuración</h2>
          <p>Administra los datos generales, legales y fiscales de tu empresa.</p>
        </div>
      </section>

      <SettingsSection
        title="Información de la empresa"
        description="Esta información puede usarse con fines de facturación."
        form={form}
        editing={editing}
        setEditing={setEditing}
        onChange={updateField}
        onSave={saveSettings}
        onCancel={cancelEdit}
        saving={saving}
        rows={[
          { name: "businessName", label: fieldLabels.businessName },
          { name: "address", label: fieldLabels.address, type: "textarea" },
          { name: "email", label: fieldLabels.email },
          { name: "phone", label: fieldLabels.phone },
          { name: "website", label: fieldLabels.website },
          { name: "industry", label: fieldLabels.industry },
        ]}
      />

      <SettingsSection
        title="Información legal"
        description="Esta es la información que tu empresa utiliza para fines fiscales."
        form={form}
        editing={editing}
        setEditing={setEditing}
        onChange={updateField}
        onSave={saveSettings}
        onCancel={cancelEdit}
        saving={saving}
        rows={[
          { name: "legalName", label: fieldLabels.legalName },
          { name: "rnc", label: fieldLabels.rnc },
          { name: "companyType", label: fieldLabels.companyType },
          { name: "legalAddress", label: fieldLabels.legalAddress, type: "textarea" },
        ]}
      />

      <SettingsSection
        title="Información de contacto del cliente"
        description="Así es como los clientes se ponen en contacto contigo."
        form={form}
        editing={editing}
        setEditing={setEditing}
        onChange={updateField}
        onSave={saveSettings}
        onCancel={cancelEdit}
        saving={saving}
        rows={[
          { name: "clientEmail", label: fieldLabels.clientEmail },
          { name: "clientAddress", label: fieldLabels.clientAddress, type: "textarea" },
        ]}
      />
    </div>
  );
}