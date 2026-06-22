import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
  X,
  Ban,
} from "lucide-react";
import { api } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import es from "../../i18n/locales/es.json";
import en from "../../i18n/locales/en.json";
import { useConfirm } from "../../components/ConfirmProvider";

const emptyForm = {
  name: "",
  rnc: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

export default function Suppliers() {
  const { confirm } = useConfirm();
  const { language } = useAuth();

  const dictionary = language === "en" ? en : es;

  const t = (path, fallback = "", vars = {}) => {
    let value = path
      .split(".")
      .reduce((acc, key) => acc?.[key], dictionary);

    value = value || fallback || path;

    Object.entries(vars).forEach(([key, val]) => {
      value = String(value).replace(`{{${key}}}`, val);
    });

    return value;
  };

  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/suppliers");
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (error) {
      alert(error.response?.data?.message || t("suppliers.messages.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const text = `${supplier.name || ""} ${supplier.rnc || ""} ${
        supplier.phone || ""
      } ${supplier.email || ""}`.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && supplier.isActive !== false) ||
        (statusFilter === "inactive" && supplier.isActive === false);

      return matchesSearch && matchesStatus;
    });
  }, [suppliers, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: suppliers.length,
      active: suppliers.filter((s) => s.isActive !== false).length,
      inactive: suppliers.filter((s) => s.isActive === false).length,
      withRnc: suppliers.filter((s) => s.rnc).length,
    };
  }, [suppliers]);

  const openCreateModal = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEditModal = (supplier) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name || "",
      rnc: supplier.rnc || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      notes: supplier.notes || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const saveSupplier = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert(t("suppliers.messages.nameRequired"));
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        await api.put(`/suppliers/${editingId}`, form);
      } else {
        await api.post("/suppliers", form);
      }

      closeModal();
      await loadSuppliers();
    } catch (error) {
      alert(error.response?.data?.message || t("suppliers.messages.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const deactivateSupplier = async (supplier) => {
    const ok = await confirm({
      title: t("suppliers.confirm.deactivateTitle"),
      message: t("suppliers.confirm.deactivateMessage", "", {
        name: supplier.name,
      }),
      confirmText: t("suppliers.confirm.deactivateButton"),
      variant: "danger",
    });

    if (!ok) return;

    try {
      await api.delete(`/suppliers/${supplier.id}`);
      await loadSuppliers();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          t("suppliers.messages.deactivateError")
      );
    }
  };

  const reactivateSupplier = async (supplier) => {
    try {
      await api.put(`/suppliers/${supplier.id}`, {
        ...supplier,
        isActive: true,
      });
      await loadSuppliers();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          t("suppliers.messages.reactivateError")
      );
    }
  };

  const toggleSupplier = async (supplier) => {
    try {
      await api.patch(`/suppliers/${supplier.id}/toggle`);
      await loadSuppliers();
    } catch (error) {
      alert(error.response?.data?.message || t("suppliers.messages.saveError"));
    }
  };

  const deleteSupplier = async (supplier) => {
    const ok = await confirm({
      title: t("suppliers.confirm.deleteTitle"),
      message: t("suppliers.confirm.deleteMessage"),
      confirmText: t("suppliers.confirm.deleteButton"),
      variant: "danger",
    });

    if (!ok) return;

    try {
      await api.delete(`/suppliers/${supplier.id}`);
      await loadSuppliers();
    } catch (error) {
      alert(error.response?.data?.message || t("suppliers.messages.saveError"));
    }
  };

  return (
    <div className="quote-page">
      <section className="quote-header">
        <div>
          <span>{t("suppliers.header.eyebrow")}</span>
          <h2>{t("suppliers.header.title")}</h2>
          <p>{t("suppliers.header.description")}</p>
        </div>

        <button className="primary-btn" onClick={openCreateModal}>
          <Plus size={18} />
          {t("suppliers.header.new")}
        </button>
      </section>

      <section className="quote-stats">
        <div className="quote-stat-card">
          <div className="stat-icon">
            <Users size={22} />
          </div>
          <div>
            <span>{t("suppliers.stats.total")}</span>
            <strong>{stats.total}</strong>
          </div>
        </div>

        <div className="quote-stat-card">
          <div className="stat-icon">
            <CheckCircle size={22} />
          </div>
          <div>
            <span>{t("suppliers.stats.active")}</span>
            <strong>{stats.active}</strong>
          </div>
        </div>

        <div className="quote-stat-card">
          <div className="stat-icon">
            <Building2 size={22} />
          </div>
          <div>
            <span>{t("suppliers.stats.withRnc")}</span>
            <strong>{stats.withRnc}</strong>
          </div>
        </div>

        <div className="quote-stat-card">
          <div className="stat-icon">
            <X size={22} />
          </div>
          <div>
            <span>{t("suppliers.stats.inactive")}</span>
            <strong>{stats.inactive}</strong>
          </div>
        </div>
      </section>

      <section className="quote-panel">
        <div className="quote-toolbar">
          <div>
            <h3>{t("suppliers.toolbar.title")}</h3>
            <p>{t("suppliers.toolbar.description")}</p>
          </div>

          <div className="quote-toolbar-actions">
            <select
              className="quote-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="active">{t("suppliers.filters.active")}</option>
              <option value="inactive">{t("suppliers.filters.inactive")}</option>
              <option value="all">{t("suppliers.filters.all")}</option>
            </select>

            <div className="quote-search">
              <Search size={18} />
              <input
                placeholder={t("suppliers.toolbar.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="quote-table-wrap suppliers-desktop-list">
          <table className="quote-table">
            <thead>
              <tr>
                <th>{t("suppliers.table.supplier")}</th>
                <th>{t("suppliers.table.rnc")}</th>
                <th>{t("suppliers.table.phone")}</th>
                <th>{t("suppliers.table.email")}</th>
                <th>{t("suppliers.table.status")}</th>
                <th>{t("suppliers.table.actions")}</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="table-empty">
                    {t("suppliers.messages.loading")}
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty">
                    {t("suppliers.messages.empty")}
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td>
                      <div className="quote-number-cell">
                        <div className="quote-icon">
                          <Building2 size={18} />
                        </div>
                        <div>
                          <strong>{supplier.name}</strong>
                          {supplier.address && <small>{supplier.address}</small>}
                        </div>
                      </div>
                    </td>

                    <td>{supplier.rnc || "-"}</td>

                    <td>
                      {supplier.phone ? (
                        <span>
                          <Phone size={14} /> {supplier.phone}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td>
                      {supplier.email ? (
                        <span>
                          <Mail size={14} /> {supplier.email}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td>
                      <span
                        className={
                          supplier.isActive === false
                            ? "badge danger"
                            : "badge ok"
                        }
                      >
                        {supplier.isActive === false
                          ? t("suppliers.status.inactive")
                          : t("suppliers.status.active")}
                      </span>
                    </td>

                    <td>
                      <div className="table-actions quote-actions">
                        <button
                          title={t("suppliers.actions.edit")}
                          onClick={() => openEditModal(supplier)}
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          title={
                            supplier.isActive
                              ? t("suppliers.actions.disable")
                              : t("suppliers.actions.reactivate")
                          }
                          onClick={() => toggleSupplier(supplier)}
                        >
                          {supplier.isActive ? (
                            <Ban size={16} />
                          ) : (
                            <CheckCircle size={16} />
                          )}
                        </button>

                        <button
                          className="danger-btn"
                          title={t("suppliers.actions.deleteForever")}
                          onClick={() => deleteSupplier(supplier)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
              <div className="suppliers-mobile-list">
  {loading ? (
    <div className="suppliers-mobile-empty">
      {t("suppliers.messages.loading")}
    </div>
  ) : filteredSuppliers.length ? (
    filteredSuppliers.map((supplier) => (
      <button
        key={supplier.id}
        type="button"
        className="suppliers-mobile-card"
        onClick={() => setSelectedSupplier(supplier)}
      >
        <div className="suppliers-mobile-top">
          <div>
            <span>{t("suppliers.table.supplier")}</span>
            <strong>{supplier.name}</strong>
          </div>

          <span
            className={
              supplier.isActive === false
                ? "badge danger"
                : "badge ok"
            }
          >
            {supplier.isActive === false
              ? t("suppliers.status.inactive")
              : t("suppliers.status.active")}
          </span>
        </div>

        <div className="suppliers-mobile-grid">
          <div>
            <span>{t("suppliers.table.rnc")}</span>
            <strong>{supplier.rnc || "-"}</strong>
          </div>

          <div>
            <span>{t("suppliers.table.phone")}</span>
            <strong>{supplier.phone || "-"}</strong>
          </div>
        </div>

        <div className="suppliers-mobile-footer">
          <span>{supplier.email || "-"}</span>
          <strong>{t("common.viewDetails", "Ver detalle")}</strong>
        </div>
      </button>
    ))
  ) : (
    <div className="suppliers-mobile-empty">
      {t("suppliers.messages.empty")}
    </div>
  )}
</div>

{selectedSupplier && (
  <div
    className="quote-detail-overlay"
    onClick={() => setSelectedSupplier(null)}
  >
    <div
      className="quote-detail-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="quote-detail-header">
        <div>
          <span>{t("suppliers.table.supplier")}</span>
          <h3>{selectedSupplier.name}</h3>
        </div>

        <button
          type="button"
          onClick={() => setSelectedSupplier(null)}
        >
          <X size={20} />
        </button>
      </div>

      <div className="quote-detail-status">
        <span
          className={
            selectedSupplier.isActive === false
              ? "badge danger"
              : "badge ok"
          }
        >
          {selectedSupplier.isActive === false
            ? t("suppliers.status.inactive")
            : t("suppliers.status.active")}
        </span>
      </div>

      <div className="quote-detail-list">
        <div>
          <span>{t("suppliers.table.rnc")}</span>
          <strong>{selectedSupplier.rnc || "-"}</strong>
        </div>

        <div>
          <span>{t("suppliers.table.phone")}</span>
          <strong>{selectedSupplier.phone || "-"}</strong>
        </div>

        <div>
          <span>{t("suppliers.table.email")}</span>
          <strong>{selectedSupplier.email || "-"}</strong>
        </div>

        <div>
          <span>{t("suppliers.fields.address")}</span>
          <strong>{selectedSupplier.address || "-"}</strong>
        </div>

        <div>
          <span>{t("suppliers.fields.notes")}</span>
          <strong>{selectedSupplier.notes || "-"}</strong>
        </div>
      </div>

      <div className="quote-detail-actions">
        <button
          onClick={() => {
            setSelectedSupplier(null);
            openEditModal(selectedSupplier);
          }}
        >
          <Pencil size={16} />
          {t("suppliers.actions.edit")}
        </button>

        <button
          onClick={() => {
            toggleSupplier(selectedSupplier);
            setSelectedSupplier(null);
          }}
        >
          {selectedSupplier.isActive ? (
            <Ban size={16} />
          ) : (
            <CheckCircle size={16} />
          )}

          {selectedSupplier.isActive
            ? t("suppliers.actions.disable")
            : t("suppliers.actions.reactivate")}
        </button>

        <button
          className="danger-btn"
          onClick={() => {
            deleteSupplier(selectedSupplier);
            setSelectedSupplier(null);
          }}
        >
          <Trash2 size={16} />
          {t("suppliers.actions.deleteForever")}
        </button>
      </div>
    </div>
  </div>
)}
      </section>

      {modalOpen && (
        <div className="modal-overlay">
          <div className="quote-modal">
            <div className="modal-header">
              <div>
                <span>
                  {editingId
                    ? t("suppliers.modal.editEyebrow")
                    : t("suppliers.modal.newEyebrow")}
                </span>
                <h3>
                  {editingId
                    ? t("suppliers.modal.editTitle")
                    : t("suppliers.modal.newTitle")}
                </h3>
              </div>

              <button onClick={closeModal} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveSupplier} className="quote-form">
              <div className="quote-form-grid">
                <div className="form-row">
                  <label>{t("suppliers.fields.name")}</label>
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    placeholder={t("suppliers.placeholders.name")}
                  />
                </div>

                <div className="form-row">
                  <label>{t("suppliers.fields.rnc")}</label>
                  <input
                    value={form.rnc}
                    onChange={(e) => setForm({ ...form, rnc: e.target.value })}
                    placeholder={t("suppliers.placeholders.rnc")}
                  />
                </div>

                <div className="form-row">
                  <label>{t("suppliers.fields.phone")}</label>
                  <input
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    placeholder={t("suppliers.placeholders.phone")}
                  />
                </div>

                <div className="form-row">
                  <label>{t("suppliers.fields.email")}</label>
                  <input
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder={t("suppliers.placeholders.email")}
                  />
                </div>

                <div className="form-row full">
                  <label>{t("suppliers.fields.address")}</label>
                  <textarea
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                    placeholder={t("suppliers.placeholders.address")}
                  />
                </div>

                <div className="form-row full">
                  <label>{t("suppliers.fields.notes")}</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    placeholder={t("suppliers.placeholders.notes")}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="cancel-btn">
                  {t("suppliers.actions.cancel")}
                </button>

                <button disabled={saving} className="primary-btn">
                  {saving
                    ? t("suppliers.actions.saving")
                    : editingId
                    ? t("suppliers.actions.saveChanges")
                    : t("suppliers.actions.create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}