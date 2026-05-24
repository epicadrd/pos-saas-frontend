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
} from "lucide-react";
import { api } from "../../api/axios";

const initialForm = {
  category: "Operativo",
  description: "",
  supplierId: "",
  supplierName: "",
  supplierRnc: "",
  expenseDate: new Date().toISOString().slice(0, 10),
  paymentMethod: "cash",
  subtotal: "",
  tax: "0",
  total: "",
  notes: "",
  ncf: "",
};

const categories = [
  "Operativo",
  "Nómina",
  "Servicios",
  "Transporte",
  "Materiales",
  "Renta",
  "Marketing",
  "Inventario",
  "Otros",
];

const paymentMethods = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  check: "Cheque",
  credit: "Crédito",
  other: "Otro",
};

const formatMoney = (value) =>
  new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  }).format(Number(value || 0));

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [detailExpense, setDetailExpense] = useState(null);

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

  const loadSuppliers = async () => {
    const { data } = await api.get("/suppliers");
    setSuppliers(Array.isArray(data) ? data : []);
  };

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
      alert(error.response?.data?.message || "No se pudieron cargar los gastos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
    loadExpenses();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
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
      subtotal: expense.subtotal || "",
      tax: expense.tax || "0",
      total: expense.total || "",
      notes: expense.notes || "",
      ncf: expense.ncf || "",
    });

    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const next = {
        ...prev,
        [name]: value,
      };

        if (name === "supplierId") {
        const supplier = suppliers.find((item) => String(item.id) === String(value));

        next.supplierName = supplier?.name || "";
        next.supplierRnc = supplier?.rnc || "";
        }

        if (name === "supplierName" && prev.supplierId) {
        next.supplierId = "";
        next.supplierRnc = "";
        }

      if (name === "subtotal" || name === "tax") {
        next.total = (
          Number(next.subtotal || 0) + Number(next.tax || 0)
        ).toFixed(2);
      }

      return next;
    });
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
      alert(error.response?.data?.message || "No se pudo guardar el gasto");
    } finally {
      setSaving(false);
    }
  };

  const deleteExpense = async (expense) => {
    if (!confirm(`¿Eliminar el gasto ${expense.expenseNumber}?`)) return;

    try {
      await api.delete(`/expenses/${expense.id}`);
      await loadExpenses();
    } catch (error) {
      alert(error.response?.data?.message || "No se pudo eliminar el gasto");
    }
  };

  return (
    <div className="expenses-page">
      <section className="expenses-hero">
        <div>
          <span>Contabilidad</span>
          <h2>Gastos</h2>
        </div>

        <div className="expenses-actions">
          <button className="secondary" onClick={loadExpenses}>
            <RefreshCcw size={18} />
            Actualizar
          </button>

          <button onClick={openCreate}>
            <Plus size={18} />
            Nuevo gasto
          </button>
        </div>
      </section>

      <section className="expenses-stats-grid">
        <div className="expense-stat main">
          <WalletCards />
          <span>Gastos del mes</span>
          <strong>{formatMoney(stats.monthTotal)}</strong>
        </div>

        <div className="expense-stat">
          <span>Pendientes</span>
          <strong>{formatMoney(stats.pendingTotal)}</strong>
        </div>

        <div className="expense-stat">
          <span>Resultado filtrado</span>
          <strong>{formatMoney(totalFiltered)}</strong>
        </div>
      </section>

      <section className="expenses-panel">
        <div className="expenses-filters">
          <div className="expense-search">
            <Search size={17} />
            <input
              placeholder="Buscar gasto, proveedor, NCF o categoría"
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
            Filtrar
          </button>
        </div>

        {loading ? (
          <div className="expenses-empty">Cargando gastos...</div>
        ) : expenses.length === 0 ? (
          <div className="expenses-empty">No hay gastos registrados.</div>
        ) : (
          <div className="expenses-table-wrap">
            <table className="expenses-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Fecha</th>
                  <th>NCF</th>
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th>Proveedor</th>
                  <th>Total</th>
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
                      ).toLocaleDateString("es-DO")}
                    </td>

                    <td>{expense.ncf || "—"}</td>

                    <td>
                      <span className="expense-chip">
                        {expense.category}
                      </span>
                    </td>

                    <td>{expense.description}</td>

                    <td>
                      {expense.supplier?.name ||
                        expense.supplierName ||
                        "—"}
                    </td>

                    <td>
                      <strong>{formatMoney(expense.total)}</strong>
                    </td>

                    <td className="expense-row-actions">
                      <button
                        onClick={() => setDetailExpense(expense)}
                      >
                        <Eye size={16} />
                      </button>

                      <button onClick={() => openEdit(expense)}>
                        <Pencil size={16} />
                      </button>

                      <button
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
                  Detalle del gasto
                </span>

                <h3>{detailExpense.expenseNumber}</h3>
              </div>

              <button
                type="button"
                onClick={() => setDetailExpense(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="expense-detail-summary">
              <div>
                <span>Total</span>
                <strong>{formatMoney(detailExpense.total)}</strong>
              </div>

              <div>
                <span>Fecha</span>
                <strong>
                  {new Date(
                    `${detailExpense.expenseDate}T00:00:00`
                  ).toLocaleDateString("es-DO")}
                </strong>
              </div>

              <div>
                <span>Categoría</span>
                <strong>{detailExpense.category}</strong>
              </div>
            </div>

            <div className="expense-detail-grid">
              <div>
                <span>Descripción</span>
                <strong>{detailExpense.description || "—"}</strong>
              </div>

              <div>
                <span>NCF</span>
                <strong>{detailExpense.ncf || "—"}</strong>
              </div>

              <div>
                <span>Proveedor</span>
                <strong>
                  {detailExpense.supplier?.name ||
                    detailExpense.supplierName ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>RNC proveedor</span>
                <strong>
                  {detailExpense.supplier?.rnc ||
                    detailExpense.supplierRnc ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>Subtotal</span>
                <strong>
                  {formatMoney(detailExpense.subtotal)}
                </strong>
              </div>

              <div>
                <span>ITBIS</span>
                <strong>{formatMoney(detailExpense.tax)}</strong>
              </div>

              <div>
                <span>Notas</span>
                <strong>{detailExpense.notes || "—"}</strong>
              </div>
            </div>

            <div className="expense-modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setDetailExpense(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="expense-modal-backdrop">
          <form className="expense-modal" onSubmit={saveExpense}>
            <div className="expense-modal-header">
              <h3>{editing ? "Editar gasto" : "Nuevo gasto"}</h3>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="expense-form-grid">
              <label>
                Categoría
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Fecha
                <input
                  type="date"
                  name="expenseDate"
                  value={form.expenseDate}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Descripción
                <input
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                NCF de la factura
                <input
                  name="ncf"
                  value={form.ncf}
                  onChange={handleChange}
                  placeholder=""
                />
              </label>

                <label>
                Proveedor
                <input
                    name="supplierName"
                    value={form.supplierName}
                    onChange={handleChange}
                    placeholder="Ej: Comida en la calle, colmado..."
                />
                </label>

              <label>
                RNC proveedor
                <input
                  name="supplierRnc"
                  value={form.supplierRnc}
                  onChange={handleChange}
                />
              </label>

              <label>
                Método
                <select
                  name="paymentMethod"
                  value={form.paymentMethod}
                  onChange={handleChange}
                >
                  {Object.entries(paymentMethods).map(
                    ([key, value]) => (
                      <option key={key} value={key}>
                        {value}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Subtotal
                <input
                  type="number"
                  step="0.01"
                  name="subtotal"
                  value={form.subtotal}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                ITBIS
                <input
                  type="number"
                  step="0.01"
                  name="tax"
                  value={form.tax}
                  onChange={handleChange}
                />
              </label>

              <label>
                Total
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
                Notas
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows="3"
                />
              </label>
            </div>

            <div className="expense-modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </button>

              <button disabled={saving}>
                {saving ? "Guardando..." : "Guardar gasto"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}