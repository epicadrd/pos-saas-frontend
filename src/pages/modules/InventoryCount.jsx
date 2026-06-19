import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Eye,
  Package,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { api } from "../../api/axios";
import { useConfirm } from "../../components/ConfirmProvider";
import { useAuth } from "../../context/AuthContext";
import es from "../../i18n/locales/es.json";
import en from "../../i18n/locales/en.json";

const statusClasses = {
  draft: "inventory-count-status draft",
  completed: "inventory-count-status completed",
  applied: "inventory-count-status applied",
};

const toIntOrEmpty = (value) => {
  if (value === "" || value === null || value === undefined) return "";
  const number = parseInt(value, 10);
  return Number.isFinite(number) && number >= 0 ? number : "";
};

export default function InventoryCount() {
  const { confirm } = useConfirm();
  const { language } = useAuth();

  const dictionary = language === "en" ? en : es;
  const locale = language === "en" ? "en-US" : "es-DO";

  const t = (path, fallback = "", vars = {}) => {
    const value = path
      .split(".")
      .reduce((acc, key) => acc?.[key], dictionary);

    const text = value || fallback || path;

    return Object.entries(vars).reduce(
      (acc, [key, val]) => acc.replaceAll(`{{${key}}}`, val),
      text
    );
  };

  const statusLabels = useMemo(
    () => ({
      draft: t("inventoryCount.status.draft"),
      completed: t("inventoryCount.status.completed"),
      applied: t("inventoryCount.status.applied"),
    }),
    [language]
  );

  const formatDate = (value) => {
    if (!value) return "-";

    return new Date(value).toLocaleDateString(locale, {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
  };

  const [counts, setCounts] = useState([]);
  const [selectedCount, setSelectedCount] = useState(null);
  const [items, setItems] = useState([]);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [newCount, setNewCount] = useState({
    name: "",
    notes: "",
    category: "",
    search: "",
  });

  const [search, setSearch] = useState("");
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [onlyPending, setOnlyPending] = useState(false);

  const loadCounts = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/inventory-counts");
      setCounts(Array.isArray(data) ? data : []);
    } catch (error) {
      alert(t("inventoryCount.messages.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const loadCountDetail = async (id) => {
    try {
      setDetailLoading(true);

      const { data } = await api.get(`/inventory-counts/${id}`);

      setSelectedCount(data);
      setItems(
        (data.items || []).map((item) => ({
          ...item,
          countedStock:
            item.countedStock === null || item.countedStock === undefined
              ? ""
              : String(item.countedStock),
          notes: item.notes || "",
        }))
      );
    } catch (error) {
      alert(t("inventoryCount.messages.loadDetailError"));
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadCounts();
  }, []);

  const summary = useMemo(() => {
    const total = items.length;

    const counted = items.filter(
      (item) => item.countedStock !== "" && item.countedStock !== null
    ).length;

    const pending = total - counted;

    const differences = items.filter((item) => {
      const countedStock = toIntOrEmpty(item.countedStock);
      if (countedStock === "") return false;

      return countedStock - Number(item.systemStock || 0) !== 0;
    }).length;

    const unitsDifference = items.reduce((acc, item) => {
      const countedStock = toIntOrEmpty(item.countedStock);
      if (countedStock === "") return acc;

      return acc + (countedStock - Number(item.systemStock || 0));
    }, 0);

    return {
      total,
      counted,
      pending,
      differences,
      unitsDifference,
      progress: total > 0 ? Math.round((counted / total) * 100) : 0,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    return items.filter((item) => {
      const product = item.product || {};
      const countedStock = toIntOrEmpty(item.countedStock);
      const difference =
        countedStock === "" ? 0 : countedStock - Number(item.systemStock || 0);

      const matchSearch =
        !term ||
        product.name?.toLowerCase().includes(term) ||
        product.sku?.toLowerCase().includes(term) ||
        product.barcode?.toLowerCase().includes(term) ||
        product.category?.toLowerCase().includes(term);

      const matchDifferences = !onlyDifferences || difference !== 0;
      const matchPending =
        !onlyPending || item.countedStock === "" || item.countedStock === null;

      return matchSearch && matchDifferences && matchPending;
    });
  }, [items, search, onlyDifferences, onlyPending]);

  const createCount = async (e) => {
    e.preventDefault();

    if (!newCount.name.trim()) {
      alert(t("inventoryCount.messages.nameRequired"));
      return;
    }

    try {
      setCreating(true);

      const { data } = await api.post("/inventory-counts", {
        name: newCount.name,
        notes: newCount.notes,
        category: newCount.category,
        search: newCount.search,
      });

      alert(t("inventoryCount.messages.created"));

      setCreateOpen(false);
      setNewCount({
        name: "",
        notes: "",
        category: "",
        search: "",
      });

      await loadCounts();

      if (data.count?.id) {
        await loadCountDetail(data.count.id);
      }
    } catch (error) {
      alert(t("inventoryCount.messages.createError"));
    } finally {
      setCreating(false);
    }
  };

  const updateItem = (id, field, value) => {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item;

        if (field === "countedStock") {
          return {
            ...item,
            countedStock:
              value === "" ? "" : String(Math.max(0, parseInt(value, 10) || 0)),
          };
        }

        return {
          ...item,
          [field]: value,
        };
      })
    );
  };

  const saveCount = async (status = "draft") => {
    if (!selectedCount) return;

    try {
      setSaving(true);

      const payload = {
        status,
        items: items.map((item) => ({
          id: item.id,
          countedStock: item.countedStock === "" ? null : Number(item.countedStock),
          notes: item.notes || "",
        })),
      };

      const { data } = await api.put(`/inventory-counts/${selectedCount.id}`, payload);

      alert(t("inventoryCount.messages.saved"));

      await loadCounts();
      await loadCountDetail(selectedCount.id);
    } catch (error) {
      alert(t("inventoryCount.messages.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const completeCount = async () => {
    if (summary.pending > 0) {
      const ok = await confirm({
        title: t("inventoryCount.messages.pendingProducts"),
        message: t("inventoryCount.messages.pendingProductsMessage", "", {
          count: summary.pending,
        }),
        confirmText: t("inventoryCount.confirm.complete"),
        cancelText: t("inventoryCount.actions.cancel"),
        variant: "warning",
      });

      if (!ok) return;
    }

    await saveCount("completed");
  };

  const applyCount = async () => {
    if (!selectedCount) return;

    if (summary.pending > 0) {
      alert(t("inventoryCount.messages.cannotApply"));
      return;
    }

    const ok = await confirm({
      title: t("inventoryCount.confirm.applyTitle"),
      message: t("inventoryCount.confirm.applyMessage"),
      confirmText: t("inventoryCount.confirm.applyButton"),
      cancelText: t("inventoryCount.actions.cancel"),
      variant: "danger",
    });

    if (!ok) return;

    try {
      setSaving(true);

      await saveCount("completed");

      const { data } = await api.post(`/inventory-counts/${selectedCount.id}/apply`);

      alert(t("inventoryCount.messages.applied"));

      await loadCounts();
      await loadCountDetail(selectedCount.id);
    } catch (error) {
      alert(t("inventoryCount.messages.applyError"));
    } finally {
      setSaving(false);
    }
  };

  const deleteCount = async (count) => {
    const ok = await confirm({
      title: t("inventoryCount.confirm.deleteTitle"),
      message: t("inventoryCount.confirm.deleteMessage", "", {
        name: count.name,
      }),
      confirmText: t("inventoryCount.confirm.deleteButton"),
      cancelText: t("inventoryCount.actions.cancel"),
      variant: "danger",
    });

    if (!ok) return;

    try {
      const { data } = await api.delete(`/inventory-counts/${count.id}`);

      alert(t("inventoryCount.messages.deleted"));

      if (selectedCount?.id === count.id) {
        setSelectedCount(null);
        setItems([]);
      }

      await loadCounts();
    } catch (error) {
      alert(t("inventoryCount.messages.deleteError"));
    }
  };

  const disabled = selectedCount?.status === "applied" || saving;

  return (
    <div className="inventory-count-page">
      <div className="inventory-count-header">
        <div>
          <div className="inventory-count-eyebrow">
            <ClipboardCheck size={18} />
            {t("inventoryCount.header.eyebrow")}
          </div>

          <h1>{t("inventoryCount.header.title")}</h1>

          <p>{t("inventoryCount.header.description")}</p>
        </div>

        <div className="inventory-count-actions">
          <button
            type="button"
            className="inventory-count-btn secondary"
            onClick={loadCounts}
          >
            <RefreshCcw size={18} />
            {t("inventoryCount.actions.refresh")}
          </button>

          <button
            type="button"
            className="inventory-count-btn primary"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={18} />
            {t("inventoryCount.actions.newCount")}
          </button>
        </div>
      </div>

      <div className="inventory-count-layout">
        <aside className="inventory-count-sidebar">
          <div className="inventory-count-panel-title">
            <ClipboardList size={18} />
            {t("inventoryCount.sidebar.recentCounts")}
          </div>

          {loading ? (
            <div className="inventory-count-empty">
              {t("inventoryCount.sidebar.loading")}
            </div>
          ) : counts.length === 0 ? (
            <div className="inventory-count-empty">
              {t("inventoryCount.sidebar.empty")}
            </div>
          ) : (
            <div className="inventory-count-list">
              {counts.map((count) => (
                <button
                  type="button"
                  key={count.id}
                  className={
                    selectedCount?.id === count.id
                      ? "inventory-count-card active"
                      : "inventory-count-card"
                  }
                  onClick={() => loadCountDetail(count.id)}
                >
                  <div>
                    <strong>{count.name}</strong>
                    <span>{formatDate(count.createdAt)}</span>
                  </div>

                  <span className={statusClasses[count.status]}>
                    {statusLabels[count.status] || count.status}
                  </span>

                  <div className="inventory-count-card-meta">
                    <span>
                      {count.countedItems || 0}/{count.totalItems || 0}{" "}
                      {language === "en" ? "counted" : "contados"}
                    </span>
                    <span>
                      {count.differences || 0}{" "}
                      {t("inventoryCount.stats.differences").toLowerCase()}
                    </span>
                  </div>

                  {count.status !== "applied" && (
                    <span
                      className="inventory-count-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCount(count);
                      }}
                    >
                      <Trash2 size={15} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="inventory-count-main">
          {!selectedCount ? (
            <div className="inventory-count-hero">
              <div className="inventory-count-hero-icon">
                <Package size={42} />
              </div>

              <h2>{t("inventoryCount.hero.title")}</h2>
              <p>{t("inventoryCount.hero.description")}</p>

              <button
                type="button"
                className="inventory-count-btn primary"
                onClick={() => setCreateOpen(true)}
              >
                <Plus size={18} />
                {t("inventoryCount.actions.createCount")}
              </button>
            </div>
          ) : detailLoading ? (
            <div className="inventory-count-empty">
              {t("inventoryCount.messages.loadingDetail")}
            </div>
          ) : (
            <>
              <div className="inventory-count-detail-header">
                <div>
                  <h2>{selectedCount.name}</h2>
                  <p>
                    {t("inventoryCount.detail.createdOn")}{" "}
                    {formatDate(selectedCount.createdAt)}
                    {selectedCount.creator?.name
                      ? ` ${t("inventoryCount.detail.by")} ${selectedCount.creator.name}`
                      : ""}
                  </p>
                </div>

                <span className={statusClasses[selectedCount.status]}>
                  {statusLabels[selectedCount.status] || selectedCount.status}
                </span>
              </div>

              {selectedCount.notes && (
                <div className="inventory-count-note">
                  <strong>{t("inventoryCount.detail.notes")}:</strong>{" "}
                  {selectedCount.notes}
                </div>
              )}

              <div className="inventory-count-stats">
                <div className="inventory-count-stat">
                  <span>{t("inventoryCount.stats.progress")}</span>
                  <strong>{summary.progress}%</strong>
                  <div className="inventory-count-progress">
                    <div style={{ width: `${summary.progress}%` }} />
                  </div>
                </div>

                <div className="inventory-count-stat">
                  <span>{t("inventoryCount.stats.products")}</span>
                  <strong>{summary.total}</strong>
                </div>

                <div className="inventory-count-stat">
                  <span>{t("inventoryCount.stats.pending")}</span>
                  <strong>{summary.pending}</strong>
                </div>

                <div className="inventory-count-stat">
                  <span>{t("inventoryCount.stats.differences")}</span>
                  <strong>{summary.differences}</strong>
                </div>

                <div className="inventory-count-stat">
                  <span>{t("inventoryCount.stats.netDifference")}</span>
                  <strong className={summary.unitsDifference < 0 ? "danger-text" : "ok-text"}>
                    {summary.unitsDifference > 0 ? "+" : ""}
                    {summary.unitsDifference}
                  </strong>
                </div>
              </div>

              <div className="inventory-count-toolbar">
                <div className="inventory-count-search">
                  <Search size={18} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("inventoryCount.filters.search")}
                  />
                </div>

                <button
                  type="button"
                  className={
                    onlyDifferences
                      ? "inventory-count-chip active"
                      : "inventory-count-chip"
                  }
                  onClick={() => setOnlyDifferences((prev) => !prev)}
                >
                  {t("inventoryCount.filters.onlyDifferences")}
                </button>

                <button
                  type="button"
                  className={
                    onlyPending
                      ? "inventory-count-chip active"
                      : "inventory-count-chip"
                  }
                  onClick={() => setOnlyPending((prev) => !prev)}
                >
                  {t("inventoryCount.filters.onlyPending")}
                </button>
              </div>

              <div className="inventory-count-table-wrap inventory-count-desktop-list">
                <table className="inventory-count-table">
                  <thead>
                    <tr>
                      <th>{t("inventoryCount.table.product")}</th>
                      <th>SKU</th>
                      <th>{t("inventoryCount.table.system")}</th>
                      <th>{t("inventoryCount.table.physicalCount")}</th>
                      <th>{t("inventoryCount.table.difference")}</th>
                      <th>{t("inventoryCount.table.notes")}</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="inventory-count-table-empty">
                          {t("inventoryCount.table.empty")}
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => {
                        const product = item.product || {};
                        const countedStock = toIntOrEmpty(item.countedStock);
                        const difference =
                          countedStock === ""
                            ? null
                            : countedStock - Number(item.systemStock || 0);

                        return (
                          <tr key={item.id}>
                            <td>
                              <div className="inventory-count-product">
                                <strong>{product.name}</strong>
                                <span>
                                  {product.category ||
                                    t("inventoryCount.table.uncategorized")}
                                </span>
                              </div>
                            </td>

                            <td>{product.sku || "-"}</td>

                            <td>
                              <strong>{item.systemStock}</strong>{" "}
                              <span className="muted">
                                {product.unit || t("inventoryCount.table.unit")}
                              </span>
                            </td>

                            <td>
                              <input
                                type="number"
                                min="0"
                                disabled={disabled}
                                value={item.countedStock}
                                onChange={(e) =>
                                  updateItem(item.id, "countedStock", e.target.value)
                                }
                                className="inventory-count-input"
                                placeholder="0"
                              />
                            </td>

                            <td>
                              {difference === null ? (
                                <span className="inventory-count-pill pending">
                                  {t("inventoryCount.table.pending")}
                                </span>
                              ) : difference === 0 ? (
                                <span className="inventory-count-pill ok">
                                  {t("inventoryCount.table.exact")}
                                </span>
                              ) : (
                                <span
                                  className={
                                    difference > 0
                                      ? "inventory-count-pill positive"
                                      : "inventory-count-pill negative"
                                  }
                                >
                                  {difference > 0 ? "+" : ""}
                                  {difference}
                                </span>
                              )}
                            </td>

                            <td>
                              <input
                                type="text"
                                disabled={disabled}
                                value={item.notes}
                                onChange={(e) =>
                                  updateItem(item.id, "notes", e.target.value)
                                }
                                className="inventory-count-note-input"
                                placeholder={t("inventoryCount.table.optional")}
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="inventory-count-mobile-list">
                {filteredItems.length === 0 ? (
                  <div className="inventory-count-mobile-empty">
                    {t("inventoryCount.table.empty")}
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const product = item.product || {};
                    const countedStock = toIntOrEmpty(item.countedStock);
                    const difference =
                      countedStock === ""
                        ? null
                        : countedStock - Number(item.systemStock || 0);

                    return (
                      <div className="inventory-count-mobile-card" key={item.id}>
                        <div className="inventory-count-mobile-top">
                          <div>
                            <span>{t("inventoryCount.table.product")}</span>
                            <strong>{product.name}</strong>
                          </div>

                          {difference === null ? (
                            <span className="inventory-count-pill pending">
                              {t("inventoryCount.table.pending")}
                            </span>
                          ) : difference === 0 ? (
                            <span className="inventory-count-pill ok">
                              {t("inventoryCount.table.exact")}
                            </span>
                          ) : (
                            <span
                              className={
                                difference > 0
                                  ? "inventory-count-pill positive"
                                  : "inventory-count-pill negative"
                              }
                            >
                              {difference > 0 ? "+" : ""}
                              {difference}
                            </span>
                          )}
                        </div>

                        <div className="inventory-count-mobile-meta">
                          <span>
                            {product.category ||
                              t("inventoryCount.table.uncategorized")}
                          </span>
                          <strong>SKU {product.sku || "-"}</strong>
                        </div>

                        <div className="inventory-count-mobile-grid">
                          <div>
                            <span>{t("inventoryCount.table.system")}</span>
                            <strong>
                              {item.systemStock}{" "}
                              {product.unit || t("inventoryCount.table.unit")}
                            </strong>
                          </div>

                          <label>
                            <span>{t("inventoryCount.table.physicalCount")}</span>
                            <input
                              type="number"
                              min="0"
                              disabled={disabled}
                              value={item.countedStock}
                              onChange={(e) =>
                                updateItem(item.id, "countedStock", e.target.value)
                              }
                              placeholder="0"
                            />
                          </label>
                        </div>

                        <label className="inventory-count-mobile-notes">
                          <span>{t("inventoryCount.table.notes")}</span>
                          <input
                            type="text"
                            disabled={disabled}
                            value={item.notes}
                            onChange={(e) => updateItem(item.id, "notes", e.target.value)}
                            placeholder={t("inventoryCount.table.optional")}
                          />
                        </label>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="inventory-count-footer-actions">
                <button
                  type="button"
                  className="inventory-count-btn secondary"
                  disabled={disabled}
                  onClick={() => saveCount("draft")}
                >
                  <Save size={18} />
                  {t("inventoryCount.actions.saveDraft")}
                </button>

                <button
                  type="button"
                  className="inventory-count-btn warning"
                  disabled={disabled}
                  onClick={completeCount}
                >
                  <CheckCircle2 size={18} />
                  {t("inventoryCount.actions.markCompleted")}
                </button>

                <button
                  type="button"
                  className="inventory-count-btn danger"
                  disabled={disabled || summary.pending > 0}
                  onClick={applyCount}
                >
                  <AlertTriangle size={18} />
                  {t("inventoryCount.actions.applyAdjustments")}
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      {createOpen && (
        <div className="inventory-count-modal-overlay">
          <div className="inventory-count-modal">
            <div className="inventory-count-modal-header">
              <div>
                <h2>{t("inventoryCount.modal.title")}</h2>
                <p>{t("inventoryCount.modal.description")}</p>
              </div>

              <button
                type="button"
                className="inventory-count-icon-btn"
                onClick={() => setCreateOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createCount} className="inventory-count-form">
              <label>
                {t("inventoryCount.modal.countName")}
                <input
                  value={newCount.name}
                  onChange={(e) =>
                    setNewCount((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={t("inventoryCount.modal.countPlaceholder")}
                />
              </label>

              <label>
                {t("inventoryCount.modal.notes")}
                <textarea
                  value={newCount.notes}
                  onChange={(e) =>
                    setNewCount((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder={t("inventoryCount.table.optional")}
                />
              </label>

              <div className="inventory-count-form-grid">
                <label>
                  {t("inventoryCount.modal.category")}
                  <input
                    value={newCount.category}
                    onChange={(e) =>
                      setNewCount((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    placeholder={t("inventoryCount.table.optional")}
                  />
                </label>

                <label>
                  {t("inventoryCount.modal.searchProducts")}
                  <input
                    value={newCount.search}
                    onChange={(e) =>
                      setNewCount((prev) => ({ ...prev, search: e.target.value }))
                    }
                    placeholder={t("inventoryCount.modal.searchPlaceholder")}
                  />
                </label>
              </div>

              <div className="inventory-count-modal-info">
                <Eye size={18} />
                {t("inventoryCount.modal.info")}
              </div>

              <div className="inventory-count-modal-actions">
                <button
                  type="button"
                  className="inventory-count-btn secondary"
                  onClick={() => setCreateOpen(false)}
                >
                  {t("inventoryCount.actions.cancel")}
                </button>

                <button
                  type="submit"
                  className="inventory-count-btn primary"
                  disabled={creating}
                >
                  <Plus size={18} />
                  {creating
                    ? t("inventoryCount.actions.creating")
                    : t("inventoryCount.actions.createCount")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}