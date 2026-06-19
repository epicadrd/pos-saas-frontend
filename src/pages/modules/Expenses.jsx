import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  RefreshCcw,
  Search,
  Pencil,
  Trash2,
  X,
  WalletCards,
  Eye,
  FileSearch,
} from "lucide-react";
import { api } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import esJson from "../../i18n/locales/es.json";
import enJson from "../../i18n/locales/en.json";
import { getTaxLabel, isDominicanTenant } from "../../utils/taxConfig";
import { useConfirm } from "../../components/ConfirmProvider";
import DatePicker from "react-datepicker";
import { es as datePickerEs } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

const formatDateForDB = (date) => {
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export default function Expenses() {
  const { tenant, language } = useAuth();
  const { confirm } = useConfirm();

  const dictionary = language === "en" ? enJson : esJson;

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

  const categoryOptions = [
    { key: "operational", value: "Operativo" },
    { key: "payroll", value: "Nómina" },
    { key: "services", value: "Servicios" },
    { key: "transport", value: "Transporte" },
    { key: "materials", value: "Materiales" },
    { key: "rent", value: "Renta" },
    { key: "marketing", value: "Marketing" },
    { key: "inventory", value: "Inventario" },
    { key: "other", value: "Otros" },
  ];

  const getCategoryLabel = (category) => {
    const found = categoryOptions.find((item) => item.value === category);
    return found ? t(`expenses.categories.${found.key}`) : category;
  };

  const paymentMethods = {
    cash: t("expenses.paymentMethods.cash"),
    card: t("expenses.paymentMethods.card"),
    transfer: t("expenses.paymentMethods.transfer"),
    check: t("expenses.paymentMethods.check"),
    credit: t("expenses.paymentMethods.credit"),
    other: t("expenses.paymentMethods.other"),
  };

  const initialForm = {
    category: "Operativo",
    description: "",
    supplierId: "",
    supplierName: "",
    supplierRnc: "",
    expenseDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "cash",
    tax: "0",
    total: "",
    notes: "",
    ncf: "",
  };

  const isDO = isDominicanTenant(tenant);
  const locale = isDO ? "es-DO" : "en-US";
  const currency = isDO ? "DOP" : "USD";

  const taxLabel = getTaxLabel(tenant);

  const formatMoney = (value) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(Number(value || 0));

  const [expenses, setExpenses] = useState([]);
  const [detailExpense, setDetailExpense] = useState(null);
  const [dgiiUrl, setDgiiUrl] = useState("");
  const [importingDgii, setImportingDgii] = useState(false);

  const [stats, setStats] = useState({
    monthTotal: 0,
    pendingTotal: 0,
    byCategory: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);

  const [filters, setFilters] = useState({
    search: "",
    category: "",
    supplierId: "",
    from: "",
    to: "",
  });

  const totalFiltered = useMemo(() => {
    return expenses.reduce((sum, item) => sum + Number(item.total || 0), 0);
  }, [expenses]);

  const loadExpenses = async () => {
    try {
      setLoading(true);

      const params = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value)
      );

      const [expensesRes, statsRes] = await Promise.all([
        api.get("/expenses", { params }),
        api.get("/expenses/stats"),
      ]);

      setExpenses(expensesRes.data || []);
      setStats(
        statsRes.data || {
          monthTotal: 0,
          pendingTotal: 0,
          byCategory: [],
        }
      );
    } catch (error) {
      alert(error.response?.data?.message || t("expenses.messages.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const importFromDgii = async () => {
    if (!dgiiUrl.trim()) {
      alert(t("expenses.messages.dgiiUrlRequired"));
      return;
    }

    try {
      setImportingDgii(true);

      const { data } = await api.post("/expenses/import-dgii", {
        url: dgiiUrl.trim(),
      });

      setForm((prev) => ({
        ...prev,
        ...data,
        description: "",
      }));
    } catch (error) {
      alert(error.response?.data?.message || t("expenses.messages.dgiiImportError"));
    } finally {
      setImportingDgii(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setDgiiUrl("");
    setModalOpen(true);
  };

  const openEdit = (expense) => {
    setEditing(expense);

    setForm({
      category: expense.category || "Operativo",
      description: expense.description || "",
      supplierId: expense.supplierId ? String(expense.supplierId) : "",
      supplierName: expense.supplier?.name || expense.supplierName || "",
      supplierRnc: expense.supplier?.rnc || expense.supplierRnc || "",
      expenseDate: expense.expenseDate || new Date().toISOString().slice(0, 10),
      paymentMethod: expense.paymentMethod || "cash",
      tax: expense.tax || "0",
      total: expense.total || "",
      notes: expense.notes || "",
      ncf: expense.ncf || "",
    });

    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const saveExpense = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      const payload = {
        ...form,
        supplierId: form.supplierId || null,
      };

      if (editing) {
        await api.put(`/expenses/${editing.id}`, payload);
      } else {
        await api.post("/expenses", payload);
      }

      setModalOpen(false);
      await loadExpenses();
    } catch (error) {
      if (error.response?.status === 409) {
        await confirm({
          title: t("expenses.messages.duplicateTitle"),
          message:
            error.response?.data?.message ||
            t("expenses.messages.duplicateMessage"),
          confirmText: t("expenses.messages.understood"),
          cancelText: t("expenses.messages.close"),
          variant: "danger",
        });

        return;
      }

      alert(error.response?.data?.message || t("expenses.messages.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const deleteExpense = async (expense) => {
    const ok = await confirm({
      title: t("expenses.confirm.deleteTitle"),
      message: t("expenses.confirm.deleteMessage", "", {
        number: expense.expenseNumber,
      }),
      confirmText: t("expenses.confirm.deleteButton"),
      variant: "danger",
    });

    if (!ok) return;

    try {
      await api.delete(`/expenses/${expense.id}`);
      await loadExpenses();
    } catch (error) {
      alert(error.response?.data?.message || t("expenses.messages.deleteError"));
    }
  };

  return (
    <div className="expenses-page">
      <section className="expenses-hero">
        <div>
          <span>{t("expenses.header.eyebrow")}</span>
          <h2>{t("expenses.header.title")}</h2>
        </div>

        <div className="expenses-actions">
          <button className="secondary" onClick={loadExpenses}>
            <RefreshCcw size={18} />
            {t("expenses.header.refresh")}
          </button>

          <button onClick={openCreate}>
            <Plus size={18} />
            {t("expenses.header.new")}
          </button>
        </div>
      </section>

      <section className="expenses-stats-grid">
        <div className="expense-stat main">
          <WalletCards />
          <span>{t("expenses.stats.monthTotal")}</span>
          <strong>{formatMoney(stats.monthTotal)}</strong>
        </div>

        <div className="expense-stat">
          <span>{t("expenses.stats.pending")}</span>
          <strong>{formatMoney(stats.pendingTotal)}</strong>
        </div>

        <div className="expense-stat">
          <span>{t("expenses.stats.filteredResult")}</span>
          <strong>{formatMoney(totalFiltered)}</strong>
        </div>
      </section>

      <section className="expenses-panel">
        <div className="expenses-filters">
          <div className="expense-search">
            <Search size={17} />
            <input
              placeholder={t("expenses.filters.search")}
              value={filters.search}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  search: e.target.value,
                })
              }
            />
          </div>

          <button className="secondary" onClick={loadExpenses}>
            {t("expenses.filters.filter")}
          </button>
        </div>

        {loading ? (
          <div className="expenses-empty">{t("expenses.messages.loading")}</div>
        ) : expenses.length === 0 ? (
          <div className="expenses-empty">{t("expenses.messages.empty")}</div>
        ) : (
          <div className="expenses-table-wrap">
            <table className="expenses-table">
              <thead>
                <tr>
                  <th>{t("expenses.table.number")}</th>
                  <th>{t("expenses.table.date")}</th>
                  <th>{t("expenses.table.ncf")}</th>
                  <th>{t("expenses.table.category")}</th>
                  <th>{t("expenses.table.description")}</th>
                  <th>{t("expenses.table.issuerName")}</th>
                  <th>{t("expenses.table.total")}</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{expense.expenseNumber}</td>

                    <td>
                      {new Date(
                        `${expense.expenseDate}T00:00:00`
                      ).toLocaleDateString(locale)}
                    </td>

                    <td>{expense.ncf || "—"}</td>

                    <td>
                      <span className="expense-chip">
                        {getCategoryLabel(expense.category)}
                      </span>
                    </td>

                    <td>{expense.description}</td>

                    <td>
                      {expense.supplier?.name || expense.supplierName || "—"}
                    </td>

                    <td>
                      <strong>{formatMoney(expense.total)}</strong>
                    </td>

                    <td className="expense-row-actions">
                      <button
                        title={t("expenses.table.view")}
                        onClick={() => setDetailExpense(expense)}
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        title={t("expenses.table.edit")}
                        onClick={() => openEdit(expense)}
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        title={t("expenses.table.delete")}
                        className="danger"
                        onClick={() => deleteExpense(expense)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detailExpense && (
        <div className="expense-modal-backdrop">
          <div className="expense-modal expense-detail-modal">
            <div className="expense-modal-header">
              <div>
                <span className="expense-detail-kicker">
                  {t("expenses.detail.title")}
                </span>

                <h3>{detailExpense.expenseNumber}</h3>
              </div>

              <button type="button" onClick={() => setDetailExpense(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="expense-detail-summary">
              <div>
                <span>{t("expenses.detail.total")}</span>
                <strong>{formatMoney(detailExpense.total)}</strong>
              </div>

              <div>
                <span>{t("expenses.detail.date")}</span>
                <strong>
                  {new Date(
                    `${detailExpense.expenseDate}T00:00:00`
                  ).toLocaleDateString(locale)}
                </strong>
              </div>

              <div>
                <span>{t("expenses.detail.category")}</span>
                <strong>{getCategoryLabel(detailExpense.category)}</strong>
              </div>
            </div>

            <div className="expense-detail-grid">
              <div>
                <span>{t("expenses.detail.description")}</span>
                <strong>{detailExpense.description || "—"}</strong>
              </div>

              <div>
                <span>{t("expenses.detail.ncf")}</span>
                <strong>{detailExpense.ncf || "—"}</strong>
              </div>

              <div>
                <span>{t("expenses.detail.issuerName")}</span>
                <strong>
                  {detailExpense.supplier?.name ||
                    detailExpense.supplierName ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>{t("expenses.detail.issuerRnc")}</span>
                <strong>
                  {detailExpense.supplier?.rnc ||
                    detailExpense.supplierRnc ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>
                  {t("expenses.detail.taxTotal", "", {
                    taxLabel,
                  })}
                </span>
                <strong>{formatMoney(detailExpense.tax)}</strong>
              </div>

              <div>
                <span>{t("expenses.detail.notes")}</span>
                <strong>{detailExpense.notes || "—"}</strong>
              </div>
            </div>

            <div className="expense-modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setDetailExpense(null)}
              >
                {t("expenses.detail.close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="expense-modal-backdrop">
          <form className="expense-modal" onSubmit={saveExpense}>
            <div className="expense-modal-header">
              <h3>
                {editing ? t("expenses.form.editTitle") : t("expenses.form.newTitle")}
              </h3>

              <button type="button" onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="expense-form-grid">
              <label>
                {t("expenses.form.category")}
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                >
                  {categoryOptions.map((category) => (
                    <option key={category.value} value={category.value}>
                      {t(`expenses.categories.${category.key}`)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                {t("expenses.form.issueDate")}

                <DatePicker
                  selected={
                    form.expenseDate
                      ? new Date(`${form.expenseDate}T00:00:00`)
                      : null
                  }
                  onChange={(date) => {
                    setForm((prev) => ({
                      ...prev,
                      expenseDate: formatDateForDB(date),
                    }));
                  }}
                  dateFormat="d/M/yyyy"
                  locale={isDO ? datePickerEs : undefined}
                  className="expense-datepicker"
                  required
                />
              </label>

              <label>
                {t("expenses.form.description")}
                <input
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                {t("expenses.form.ncf")}
                <input
                  name="ncf"
                  value={form.ncf}
                  onChange={handleChange}
                  placeholder=""
                />
              </label>

              <label>
                {t("expenses.form.issuerName")}
                <input
                  name="supplierName"
                  value={form.supplierName}
                  onChange={handleChange}
                  placeholder={t("expenses.form.issuerNamePlaceholder")}
                />
              </label>

              <label>
                {t("expenses.form.issuerRnc")}
                <input
                  name="supplierRnc"
                  value={form.supplierRnc}
                  onChange={handleChange}
                />
              </label>

              <label>
                {t("expenses.form.paymentMethod")}
                <select
                  name="paymentMethod"
                  value={form.paymentMethod}
                  onChange={handleChange}
                >
                  {Object.entries(paymentMethods).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                {t("expenses.form.taxTotal", "", {
                  taxLabel,
                })}
                <input
                  type="number"
                  step="0.01"
                  name="tax"
                  value={form.tax}
                  onChange={handleChange}
                />
              </label>

              <label>
                {t("expenses.form.totalAmount")}
                <input
                  type="number"
                  step="0.01"
                  name="total"
                  value={form.total}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="full">
                {t("expenses.form.notes")}
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows="3"
                />
              </label>
            </div>

            {!editing && (
              <div className="expense-dgii-import">
                <div className="expense-dgii-header">
                  <div className="expense-dgii-icon">
                    <FileSearch size={22} />
                  </div>

                  <div>
                    <h3>{t("expenses.dgii.title")}</h3>
                    <p>{t("expenses.dgii.description")}</p>
                  </div>
                </div>

                <div className="expense-dgii-field">
                  <label htmlFor="dgii-url">{t("expenses.dgii.label")}</label>

                  <div className="expense-dgii-row">
                    <input
                      id="dgii-url"
                      type="url"
                      value={dgiiUrl}
                      onChange={(e) => setDgiiUrl(e.target.value)}
                      placeholder={t("expenses.dgii.placeholder")}
                    />

                    <button
                      type="button"
                      className="secondary expense-dgii-button"
                      onClick={importFromDgii}
                      disabled={importingDgii || !dgiiUrl.trim()}
                    >
                      {importingDgii
                        ? t("expenses.dgii.importing")
                        : t("expenses.dgii.import")}
                    </button>
                  </div>
                </div>

                <div className="expense-dgii-info">
                  <strong>{t("expenses.dgii.autoData")}</strong>

                  <div className="expense-dgii-tags">
                    <span>{t("expenses.dgii.issuerRnc")}</span>
                    <span>{t("expenses.dgii.ncf")}</span>
                    <span>{t("expenses.dgii.date")}</span>
                    <span>{taxLabel}</span>
                    <span>{t("expenses.dgii.total")}</span>
                  </div>
                </div>

                <small>{t("expenses.dgii.help")}</small>
              </div>
            )}

            <div className="expense-modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setModalOpen(false)}
              >
                {t("expenses.form.cancel")}
              </button>

              <button disabled={saving}>
                {saving ? t("expenses.form.saving") : t("expenses.form.save")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}