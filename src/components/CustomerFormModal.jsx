import { useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "../api/axios";

const emptyCustomer = {
  name: "",
  rnc: "",
  phone: "",
  email: "",
  address: "",
};

export default function CustomerFormModal({ customer, onClose, onSaved }) {
  const { t } = useTranslation();
  const isEditing = Boolean(customer?.id);

  const [form, setForm] = useState(() => ({
    ...emptyCustomer,
    ...(customer
      ? {
          name: customer.name || "",
          rnc: customer.rnc || "",
          phone: customer.phone || "",
          email: customer.email || "",
          address: customer.address || "",
        }
      : {}),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError(t("customers.messages.nameRequired"));
      return;
    }

    try {
      setSaving(true);

      const { data } = isEditing
        ? await api.put(`/customers/${customer.id}`, form)
        : await api.post("/customers", form);

      onSaved(data.customer);
    } catch (err) {
      setError(err.response?.data?.message || t("customers.messages.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="product-modal customers-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span>{t("customers.form.eyebrow")}</span>
            <h3>
              {isEditing ? t("customers.form.editTitle") : t("customers.form.newTitle")}
            </h3>
          </div>

          <button type="button" className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form className="product-form" onSubmit={handleSubmit}>
          {error && <div className="customers-form-error full">{error}</div>}

          <div className="form-row full">
            <label>{t("customers.form.name")}</label>
            <input name="name" value={form.name} onChange={handleChange} autoFocus />
          </div>

          <div className="form-row">
            <label>{t("customers.form.rnc")}</label>
            <input name="rnc" value={form.rnc} onChange={handleChange} />
          </div>

          <div className="form-row">
            <label>{t("customers.form.phone")}</label>
            <input name="phone" type="tel" value={form.phone} onChange={handleChange} />
          </div>

          <div className="form-row full">
            <label>{t("customers.form.email")}</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} />
          </div>

          <div className="form-row full">
            <label>{t("customers.form.address")}</label>
            <textarea name="address" value={form.address} onChange={handleChange} />
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              {t("customers.form.cancel")}
            </button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? t("customers.form.saving") : t("customers.form.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
