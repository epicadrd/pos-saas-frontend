import { useEffect, useMemo, useState } from "react";
import { Building2, Save, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { SUPPORTED_LANGUAGES } from "../../i18n/translations";
import { createPortal } from "react-dom";

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

function SettingsSection({
  title,
  description,
  rows,
  form,
  editing,
  setEditing,
  onChange,
  onSave,
  onCancel,
  saving,
  t,
}) {
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
              {isEditing && row.help && <span>{row.help}</span>}
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
                    {t("settings.buttons.cancel")}
                  </button>

                  <button
                    type="button"
                    className="account-settings-save"
                    onClick={onSave}
                    disabled={saving}
                  >
                    <Save size={16} />
                    {saving
                      ? t("settings.buttons.saving")
                      : t("settings.buttons.save")}
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setEditing(row.name)}>
                  {t("settings.buttons.edit")}
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
  const { refreshSession, language, updateLanguage } = useAuth();
  const { t } = useTranslation();

  const [form, setForm] = useState(emptyForm);
  const [backup, setBackup] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [languageSaving, setLanguageSaving] = useState(false);
  const [changingLanguage, setChangingLanguage] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(language || "es");

  const fieldLabels = useMemo(
    () => ({
      businessName: t("settings.fields.businessName"),
      address: t("settings.fields.address"),
      email: t("settings.fields.email"),
      phone: t("settings.fields.phone"),
      website: t("settings.fields.website"),
      industry: t("settings.fields.industry"),
      legalName: t("settings.fields.legalName"),
      rnc: t("settings.fields.rnc"),
      companyType: t("settings.fields.companyType"),
      legalAddress: t("settings.fields.legalAddress"),
      clientEmail: t("settings.fields.clientEmail"),
      clientAddress: t("settings.fields.clientAddress"),
    }),
    [t]
  );

  const fieldHelp = useMemo(
    () => ({
      legalName: t("settings.help.legalName"),
      rnc: t("settings.help.rnc"),
      companyType: t("settings.help.companyType"),
      legalAddress: t("settings.help.legalAddress"),
    }),
    [t]
  );

  const buildRows = (rows) =>
    rows.map((row) => ({
      ...row,
      label: fieldLabels[row.name],
      help: fieldHelp[row.name],
    }));

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
      alert(error.response?.data?.message || t("settings.errors.load"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    setSelectedLanguage(language || "es");
  }, [language]);

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

  const saveLanguage = async () => {
    try {
      setLanguageSaving(true);

      await updateLanguage(selectedLanguage);

      setChangingLanguage(true);

      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (error) {
      alert(error.response?.data?.message || t("settings.errors.language"));
    } finally {
      setLanguageSaving(false);
    }
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
      alert(error.response?.data?.message || t("settings.errors.save"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="account-settings-loading">
        {t("settings.loading")}
      </div>
    );
  }

  return (
    <>
      {changingLanguage &&
        createPortal(
          <div className="language-switch-overlay">
            <div className="language-switch-card">
              <div className="language-spinner"></div>

              <h3>{t("settings.languageSwitch.title")}</h3>
              <p>{t("settings.languageSwitch.description")}</p>
            </div>
          </div>,
          document.body
        )}

      <div className="account-settings-page">
        <section className="account-settings-hero">
          <div className="account-settings-logo">
            <Building2 size={34} />
          </div>

          <div>
            <span>{t("settings.title")}</span>
            <h2>{t("settings.subtitle")}</h2>
            <p>{t("settings.description")}</p>
          </div>
        </section>

        <section className="account-settings-card">
          <div className="account-settings-card-head">
            <h3>{t("settings.language.title")}</h3>
            <p>{t("settings.language.description")}</p>
          </div>

          <div className="account-settings-row editing">
            <div className="account-settings-label">
              <strong>{t("settings.language.label")}</strong>
              <span>{t("settings.language.help")}</span>
            </div>

            <div className="account-settings-value">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
              >
                {SUPPORTED_LANGUAGES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="account-settings-action">
              <button
                type="button"
                className="account-settings-save"
                onClick={saveLanguage}
                disabled={languageSaving || selectedLanguage === language}
              >
                <Languages size={16} />
                {languageSaving
                  ? t("settings.language.saving")
                  : t("settings.language.save")}
              </button>
            </div>
          </div>
        </section>

        <SettingsSection
          title={t("settings.sections.company.title")}
          description={t("settings.sections.company.description")}
          form={form}
          editing={editing}
          setEditing={setEditing}
          onChange={updateField}
          onSave={saveSettings}
          onCancel={cancelEdit}
          saving={saving}
          t={t}
          rows={buildRows([
            { name: "businessName" },
            { name: "address", type: "textarea" },
            { name: "email" },
            { name: "phone" },
            { name: "website" },
            { name: "industry" },
          ])}
        />

        <SettingsSection
          title={t("settings.sections.legal.title")}
          description={t("settings.sections.legal.description")}
          form={form}
          editing={editing}
          setEditing={setEditing}
          onChange={updateField}
          onSave={saveSettings}
          onCancel={cancelEdit}
          saving={saving}
          t={t}
          rows={buildRows([
            { name: "legalName" },
            { name: "rnc" },
            { name: "companyType" },
            { name: "legalAddress", type: "textarea" },
          ])}
        />

        <SettingsSection
          title={t("settings.sections.client.title")}
          description={t("settings.sections.client.description")}
          form={form}
          editing={editing}
          setEditing={setEditing}
          onChange={updateField}
          onSave={saveSettings}
          onCancel={cancelEdit}
          saving={saving}
          t={t}
          rows={buildRows([
            { name: "clientEmail" },
            { name: "clientAddress", type: "textarea" },
          ])}
        />
      </div>
    </>
  );
}