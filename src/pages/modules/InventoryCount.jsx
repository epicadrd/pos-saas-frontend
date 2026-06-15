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

const statusLabels = {
  draft: "Borrador",
  completed: "Completado",
  applied: "Aplicado",
};

const statusClasses = {
  draft: "inventory-count-status draft",
  completed: "inventory-count-status completed",
  applied: "inventory-count-status applied",
};

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("es-DO", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
};

const toIntOrEmpty = (value) => {
  if (value === "" || value === null || value === undefined) return "";
  const number = parseInt(value, 10);
  return Number.isFinite(number) && number >= 0 ? number : "";
};

export default function InventoryCount() {
  const { confirm } = useConfirm();

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
      alert(error.response?.data?.message || "Error cargando conteos");
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
      alert(error.response?.data?.message || "Error cargando detalle del conteo");
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
      alert("El nombre del conteo es obligatorio");
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

      alert(data.message || "Conteo creado correctamente");

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
      alert(error.response?.data?.message || "Error creando conteo");
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
            countedStock: value === "" ? "" : String(Math.max(0, parseInt(value, 10) || 0)),
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

      alert(data.message || "Conteo guardado correctamente");

      await loadCounts();
      await loadCountDetail(selectedCount.id);
    } catch (error) {
      alert(error.response?.data?.message || "Error guardando conteo");
    } finally {
      setSaving(false);
    }
  };

  const completeCount = async () => {
    if (summary.pending > 0) {
      const ok = await confirm({
        title: "Hay productos pendientes",
        message: `Todavía tienes ${summary.pending} producto(s) sin contar. ¿Quieres marcarlo como completado de todos modos?`,
        confirmText: "Sí, completar",
        cancelText: "Cancelar",
        variant: "warning",
      });

      if (!ok) return;
    }

    await saveCount("completed");
  };

  const applyCount = async () => {
    if (!selectedCount) return;

    if (summary.pending > 0) {
      alert("No puedes aplicar un conteo con productos pendientes.");
      return;
    }

    const ok = await confirm({
      title: "Aplicar conteo de inventario",
      message:
        "Esto ajustará el stock real de los productos y creará movimientos de inventario. Esta acción no se puede deshacer.",
      confirmText: "Aplicar conteo",
      cancelText: "Cancelar",
      variant: "danger",
    });

    if (!ok) return;

    try {
      setSaving(true);

      await saveCount("completed");

      const { data } = await api.post(`/inventory-counts/${selectedCount.id}/apply`);

      alert(data.message || "Conteo aplicado correctamente");

      await loadCounts();
      await loadCountDetail(selectedCount.id);
    } catch (error) {
      alert(error.response?.data?.message || "Error aplicando conteo");
    } finally {
      setSaving(false);
    }
  };

  const deleteCount = async (count) => {
    const ok = await confirm({
      title: "Eliminar conteo",
      message: `¿Seguro que deseas eliminar "${count.name}"?`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "danger",
    });

    if (!ok) return;

    try {
      const { data } = await api.delete(`/inventory-counts/${count.id}`);

      alert(data.message || "Conteo eliminado correctamente");

      if (selectedCount?.id === count.id) {
        setSelectedCount(null);
        setItems([]);
      }

      await loadCounts();
    } catch (error) {
      alert(error.response?.data?.message || "Error eliminando conteo");
    }
  };

  const disabled = selectedCount?.status === "applied" || saving;

  return (
    <div className="inventory-count-page">
      <div className="inventory-count-header">
        <div>
          <div className="inventory-count-eyebrow">
            <ClipboardCheck size={18} />
            Gestión de inventario
          </div>

          <h1>Conteo de inventario</h1>

          <p>
            Compara el stock del sistema contra el conteo físico y aplica ajustes
            controlados al inventario.
          </p>
        </div>

        <div className="inventory-count-actions">
          <button
            type="button"
            className="inventory-count-btn secondary"
            onClick={loadCounts}
          >
            <RefreshCcw size={18} />
            Actualizar
          </button>

          <button
            type="button"
            className="inventory-count-btn primary"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={18} />
            Nuevo conteo
          </button>
        </div>
      </div>

      <div className="inventory-count-layout">
        <aside className="inventory-count-sidebar">
          <div className="inventory-count-panel-title">
            <ClipboardList size={18} />
            Conteos recientes
          </div>

          {loading ? (
            <div className="inventory-count-empty">Cargando conteos...</div>
          ) : counts.length === 0 ? (
            <div className="inventory-count-empty">
              No hay conteos todavía. Crea el primero.
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
                    <span>{count.countedItems || 0}/{count.totalItems || 0} contados</span>
                    <span>{count.differences || 0} diferencias</span>
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

              <h2>Selecciona o crea un conteo</h2>
              <p>
                Aquí podrás registrar cantidades físicas, ver diferencias y aplicar
                ajustes al inventario.
              </p>

              <button
                type="button"
                className="inventory-count-btn primary"
                onClick={() => setCreateOpen(true)}
              >
                <Plus size={18} />
                Crear conteo
              </button>
            </div>
          ) : detailLoading ? (
            <div className="inventory-count-empty">Cargando detalle...</div>
          ) : (
            <>
              <div className="inventory-count-detail-header">
                <div>
                  <h2>{selectedCount.name}</h2>
                  <p>
                    Creado el {formatDate(selectedCount.createdAt)}
                    {selectedCount.creator?.name
                      ? ` por ${selectedCount.creator.name}`
                      : ""}
                  </p>
                </div>

                <span className={statusClasses[selectedCount.status]}>
                  {statusLabels[selectedCount.status] || selectedCount.status}
                </span>
              </div>

              {selectedCount.notes && (
                <div className="inventory-count-note">
                  <strong>Notas:</strong> {selectedCount.notes}
                </div>
              )}

              <div className="inventory-count-stats">
                <div className="inventory-count-stat">
                  <span>Progreso</span>
                  <strong>{summary.progress}%</strong>
                  <div className="inventory-count-progress">
                    <div style={{ width: `${summary.progress}%` }} />
                  </div>
                </div>

                <div className="inventory-count-stat">
                  <span>Productos</span>
                  <strong>{summary.total}</strong>
                </div>

                <div className="inventory-count-stat">
                  <span>Pendientes</span>
                  <strong>{summary.pending}</strong>
                </div>

                <div className="inventory-count-stat">
                  <span>Diferencias</span>
                  <strong>{summary.differences}</strong>
                </div>

                <div className="inventory-count-stat">
                  <span>Diferencia neta</span>
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
                    placeholder="Buscar producto, SKU, código o categoría..."
                  />
                </div>

                <button
                  type="button"
                  className={onlyDifferences ? "inventory-count-chip active" : "inventory-count-chip"}
                  onClick={() => setOnlyDifferences((prev) => !prev)}
                >
                  Solo diferencias
                </button>

                <button
                  type="button"
                  className={onlyPending ? "inventory-count-chip active" : "inventory-count-chip"}
                  onClick={() => setOnlyPending((prev) => !prev)}
                >
                  Solo pendientes
                </button>
              </div>

              <div className="inventory-count-table-wrap inventory-count-desktop-list">
  <table className="inventory-count-table">
    <thead>
      <tr>
        <th>Producto</th>
        <th>SKU</th>
        <th>Sistema</th>
        <th>Conteo físico</th>
        <th>Diferencia</th>
        <th>Notas</th>
      </tr>
    </thead>

    <tbody>
      {filteredItems.length === 0 ? (
        <tr>
          <td colSpan="6" className="inventory-count-table-empty">
            No hay productos con esos filtros.
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
                  <span>{product.category || "Sin categoría"}</span>
                </div>
              </td>

              <td>{product.sku || "-"}</td>

              <td>
                <strong>{item.systemStock}</strong>{" "}
                <span className="muted">{product.unit || "unidad"}</span>
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
                  <span className="inventory-count-pill pending">Pendiente</span>
                ) : difference === 0 ? (
                  <span className="inventory-count-pill ok">Exacto</span>
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
                  placeholder="Opcional"
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
      No hay productos con esos filtros.
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
              <span>Producto</span>
              <strong>{product.name}</strong>
            </div>

            {difference === null ? (
              <span className="inventory-count-pill pending">Pendiente</span>
            ) : difference === 0 ? (
              <span className="inventory-count-pill ok">Exacto</span>
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
            <span>{product.category || "Sin categoría"}</span>
            <strong>SKU {product.sku || "-"}</strong>
          </div>

          <div className="inventory-count-mobile-grid">
            <div>
              <span>Stock sistema</span>
              <strong>
                {item.systemStock} {product.unit || "unidad"}
              </strong>
            </div>

            <label>
              <span>Conteo físico</span>
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
            <span>Notas</span>
            <input
              type="text"
              disabled={disabled}
              value={item.notes}
              onChange={(e) => updateItem(item.id, "notes", e.target.value)}
              placeholder="Opcional"
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
                  Guardar borrador
                </button>

                <button
                  type="button"
                  className="inventory-count-btn warning"
                  disabled={disabled}
                  onClick={completeCount}
                >
                  <CheckCircle2 size={18} />
                  Marcar completado
                </button>

                <button
                  type="button"
                  className="inventory-count-btn danger"
                  disabled={disabled || summary.pending > 0}
                  onClick={applyCount}
                >
                  <AlertTriangle size={18} />
                  Aplicar ajustes
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
                <h2>Nuevo conteo de inventario</h2>
                <p>
                  Corex tomará una foto del stock actual para compararlo con el
                  conteo físico.
                </p>
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
                Nombre del conteo
                <input
                  value={newCount.name}
                  onChange={(e) =>
                    setNewCount((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ej: Conteo general junio 2026"
                />
              </label>

              <label>
                Notas
                <textarea
                  value={newCount.notes}
                  onChange={(e) =>
                    setNewCount((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Opcional"
                />
              </label>

              <div className="inventory-count-form-grid">
                <label>
                  Categoría exacta
                  <input
                    value={newCount.category}
                    onChange={(e) =>
                      setNewCount((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    placeholder="Opcional"
                  />
                </label>

                <label>
                  Buscar productos
                  <input
                    value={newCount.search}
                    onChange={(e) =>
                      setNewCount((prev) => ({ ...prev, search: e.target.value }))
                    }
                    placeholder="Nombre, SKU o código"
                  />
                </label>
              </div>

              <div className="inventory-count-modal-info">
                <Eye size={18} />
                Si dejas los filtros vacíos, se incluirán todos los productos activos
                que controlan stock.
              </div>

              <div className="inventory-count-modal-actions">
                <button
                  type="button"
                  className="inventory-count-btn secondary"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="inventory-count-btn primary"
                  disabled={creating}
                >
                  <Plus size={18} />
                  {creating ? "Creando..." : "Crear conteo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}