import { useEffect, useMemo, useState } from "react";
import {
  RefreshCcw,
  Search,
  AlertTriangle,
  Truck,
  WalletCards,
  CalendarClock,
  Eye,
  PackageCheck,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { isDominicanTenant } from "../../utils/taxConfig";
import { useConfirm } from "../../components/ConfirmProvider";


const statusLabels = {
  draft: "Borrador",
  sent: "Enviada",
  received: "Recibida",
  cancelled: "Cancelada",
  paid: "Pagada",
};

export default function AccountsPayable() {
    const { tenant } = useAuth();

  const isDO = isDominicanTenant(tenant);
  const locale = isDO ? "es-DO" : "en-US";
  const currency = isDO ? "DOP" : "USD";

  const formatMoney = (value) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(Number(value || 0));
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(true);

  const [data, setData] = useState({
    summary: {},
    purchaseOrders: [],
    suppliers: [],
  });

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    aging: "",
    supplierId: "",
    from: "",
    to: "",
  });

  const summary = data.summary || {};
  const purchaseOrders = data.purchaseOrders || [];
  const suppliers = data.suppliers || [];
  const [selectedPayment, setSelectedPayment] = useState(null);

  const maxBalance = useMemo(() => {
    return Math.max(
      ...purchaseOrders.map((item) => Number(item.payableBalance || item.total || 0)),
      1
    );
  }, [purchaseOrders]);

  const loadAccountsPayable = async () => {
    try {
      setLoading(true);

      const params = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value)
      );

      const { data } = await api.get("/accounts-payable", {
        params,
      });

      setData(data);
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "No se pudieron cargar las cuentas por pagar"
      );
    } finally {
      setLoading(false);
    }
  };

 const markAsPaid = async (order) => {
  const ok = await confirm({
  title: "Marcar orden como pagada",
  message: `¿Marcar como pagada la orden ${order.orderNumber}?`,
  confirmText: "Marcar como pagada",
  variant: "success",
});

if (!ok) return;

  try {
    await api.patch(`/accounts-payable/${order.id}/mark-paid`);
    setSelectedPayment(null);
    await loadAccountsPayable();
  } catch (error) {
    alert(error.response?.data?.message || "No se pudo marcar como pagada");
  }
};

  useEffect(() => {
    loadAccountsPayable();
  }, []);

  return (
    <div className="accounts-payable-page">
      <section className="ap-hero">
        <div>
          <span>Contabilidad</span>
          <h2>Cuentas por pagar</h2>
          <p>
            Controla órdenes de compra pendientes, proveedores, vencimientos y
            compromisos de pago.
          </p>
        </div>

        <button onClick={loadAccountsPayable}>
          <RefreshCcw size={18} />
          Actualizar
        </button>
      </section>

      <section className="ap-stats-grid">
        <div className="ap-stat main">
          <WalletCards />
          <span>Total por pagar</span>
          <strong>{formatMoney(summary.totalPayable)}</strong>
          <small>{summary.openOrders || 0} órdenes abiertas</small>
        </div>

        <div className="ap-stat danger">
          <AlertTriangle />
          <span>Vencido</span>
          <strong>{formatMoney(summary.overduePayable)}</strong>
          <small>Órdenes fuera de plazo</small>
        </div>

        <div className="ap-stat success">
          <CalendarClock />
          <span>No vencido</span>
          <strong>{formatMoney(summary.currentPayable)}</strong>
          <small>Balance vigente</small>
        </div>

        <div className="ap-stat">
          <PackageCheck />
          <span>Órdenes recibidas</span>
          <strong>{summary.receivedOrders || 0}</strong>
          <small>Pendientes de cerrar/pagar</small>
        </div>
      </section>

      <section className="ap-panel">
        <div className="ap-filters">
          <div className="ap-search">
            <Search size={17} />
            <input
              placeholder="Buscar orden, proveedor o RNC"
              value={filters.search}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  search: e.target.value,
                })
              }
            />
          </div>

          <select
            value={filters.supplierId}
            onChange={(e) =>
              setFilters({
                ...filters,
                supplierId: e.target.value,
              })
            }
          >
            <option value="">Todos los proveedores</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) =>
              setFilters({
                ...filters,
                status: e.target.value,
              })
            }
          >
            <option value="">Todos los estados</option>
            <option value="sent">Enviada</option>
            <option value="received">Recibida</option>
          </select>

          <select
            value={filters.aging}
            onChange={(e) =>
              setFilters({
                ...filters,
                aging: e.target.value,
              })
            }
          >
            <option value="">Todas</option>
            <option value="overdue">Vencidas</option>
            <option value="current">No vencidas</option>
          </select>

          <input
            type="date"
            value={filters.from}
            onChange={(e) =>
              setFilters({
                ...filters,
                from: e.target.value,
              })
            }
          />

          <input
            type="date"
            value={filters.to}
            onChange={(e) =>
              setFilters({
                ...filters,
                to: e.target.value,
              })
            }
          />

          <button onClick={loadAccountsPayable}>Filtrar</button>
        </div>

        {loading ? (
          <div className="ap-empty">Cargando cuentas por pagar...</div>
        ) : purchaseOrders.length === 0 ? (
          <div className="ap-empty">
            No hay órdenes pendientes por pagar.
          </div>
        ) : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Proveedor</th>
                  <th>Fecha</th>
                  <th>Vence</th>
                  <th>Total</th>
                  <th>Balance</th>
                  <th>Estado</th>
                  <th>Referencia</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {purchaseOrders.map((order) => (
                  <tr
                    key={order.id}
                    className={order.isOverdue ? "is-overdue" : ""}
                  >
                    <td>
                      <strong>{order.orderNumber}</strong>
                      {order.isOverdue && (
                        <small className="ap-overdue-text">
                          {order.daysOverdue} días vencida
                        </small>
                      )}
                    </td>

                    <td>
                      <strong>
                        {order.supplier?.name || order.supplierName || "—"}
                      </strong>
                      <small>
                        {order.supplier?.phone ||
                          order.supplier?.email ||
                          order.supplierRnc ||
                          "—"}
                      </small>
                    </td>

                    <td>
                    {order.orderDate
                      ? new Date(order.orderDate).toLocaleDateString(locale)
                      : "—"}
                  </td>

                  <td>
                    {order.dueDate
                      ? new Date(order.dueDate).toLocaleDateString(locale)
                      : "—"}
                  </td>
                    <td>{formatMoney(order.total)}</td>

                    <td>
                      <strong>{formatMoney(order.payableBalance)}</strong>
                      <div className="ap-balance-bar">
                        <div
                          style={{
                            width: `${
                              (Number(order.payableBalance || 0) / maxBalance) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </td>

                    <td>
                      <span className={`ap-status ${order.status}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </td>

                    <td>{order.reference || "—"}</td>

                    <td className="ap-actions">
                      <button
                        title="Ver detalle"
                        onClick={() => setSelectedPayment(order)}
                        >
                        <Eye size={16} />
                      </button>

                      <button
                        title="Marcar como pagada"
                        onClick={() => markAsPaid(order)}
                        >
                        <PackageCheck size={16} />
                      </button>

                      <button
                        title="Ir a gastos"
                        onClick={() => navigate("/dashboard/contabilidad/gastos")}
                      >
                        <Truck size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="ap-grid-two">
        <div className="ap-panel">
          <div className="ap-panel-header">
            <h3>Proveedores involucrados</h3>
            <span>Filtro rápido por proveedor</span>
          </div>

          <div className="ap-list">
            {suppliers.length === 0 ? (
              <div className="ap-empty small">No hay proveedores registrados.</div>
            ) : (
              suppliers.slice(0, 8).map((supplier) => (
                <button
                  type="button"
                  className="ap-list-item clickable"
                  key={supplier.id}
                  onClick={() =>
                    setFilters({
                      ...filters,
                      supplierId: String(supplier.id),
                    })
                  }
                >
                  <div>
                    <strong>{supplier.name}</strong>
                    <span>{supplier.rnc || supplier.phone || supplier.email || "—"}</span>
                  </div>

                  <b>Filtrar</b>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="ap-panel">
          <div className="ap-panel-header">
            <h3>Recomendación</h3>
            <span>Uso práctico</span>
          </div>

          <div className="ap-note">
            Este módulo se alimenta de órdenes de compra enviadas o recibidas.
            Más adelante podemos agregar pagos parciales a proveedores para que
            el balance por pagar sea exacto.
          </div>
        </div>
      </section>

      {selectedPayment && (
  <div className="ap-modal-backdrop">
    <div className="ap-modal">
      <div className="ap-modal-header">
        <div>
          <span>Detalle de cuenta por pagar</span>
          <h3>{selectedPayment.orderNumber}</h3>
        </div>

        <button type="button" onClick={() => setSelectedPayment(null)}>
          <X size={18} />
        </button>
      </div>

      <div className="ap-detail-grid">
        <div>
          <span>Proveedor</span>
          <strong>
            {selectedPayment.supplier?.name || selectedPayment.supplierName || "—"}
          </strong>
        </div>

        <div>
          <span>RNC</span>
          <strong>
            {selectedPayment.supplier?.rnc || selectedPayment.supplierRnc || "—"}
          </strong>
        </div>

        <div>
          <span>Fecha</span>
          <strong>
            {selectedPayment.orderDate
              ? new Date(selectedPayment.orderDate).toLocaleDateString(locale)
              : "—"}
          </strong>
        </div>

        <div>
          <span>Vence</span>
          <strong>
            {selectedPayment.dueDate
              ? new Date(selectedPayment.dueDate).toLocaleDateString(locale)
              : "—"}
          </strong>
        </div>

        <div>
          <span>Total</span>
          <strong>{formatMoney(selectedPayment.total)}</strong>
        </div>

        <div>
          <span>Balance</span>
          <strong>{formatMoney(selectedPayment.payableBalance)}</strong>
        </div>

        <div>
          <span>Estado</span>
          <strong>{statusLabels[selectedPayment.status] || selectedPayment.status}</strong>
        </div>

        <div>
          <span>Referencia</span>
          <strong>{selectedPayment.reference || "—"}</strong>
        </div>
      </div>

      <div className="ap-modal-actions">
        <button
          type="button"
          onClick={() => markAsPaid(selectedPayment)}
        >
          <PackageCheck size={16} />
          Marcar como pagada
        </button>

        <button
          type="button"
          className="secondary"
          onClick={() => setSelectedPayment(null)}
        >
          Cerrar
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}