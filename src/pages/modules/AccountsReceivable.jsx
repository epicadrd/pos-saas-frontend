import { useEffect, useMemo, useState } from "react";
import {
  RefreshCcw,
  Search,
  AlertTriangle,
  FileText,
  WalletCards,
  CalendarClock,
  Eye,
  ReceiptText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { isDominicanTenant } from "../../utils/taxConfig";
import { getFiscalNumber } from "../../utils/fiscalNumber";


const statusLabels = {
  issued: "Pendiente",
  partial: "Parcial",
  paid: "Pagada",
  cancelled: "Cancelada",
  draft: "Borrador",
};

export default function AccountsReceivable() {
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

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    summary: {},
    invoices: [],
    collectionByDay: [],
    recentReceipts: [],
  });

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    aging: "",
    from: "",
    to: "",
  });

  const invoices = data.invoices || [];
  const summary = data.summary || {};

  const maxBalance = useMemo(() => {
    return Math.max(...invoices.map((item) => Number(item.balance || 0)), 1);
  }, [invoices]);

  const loadAccountsReceivable = async () => {
    try {
      setLoading(true);

      const params = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value)
      );

      const { data } = await api.get("/accounts-receivable", {
        params,
      });

      setData(data);
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "No se pudieron cargar las cuentas por cobrar"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccountsReceivable();
  }, []);

  const goToReceipt = (invoice) => {
    navigate("/dashboard/recibos", {
      state: {
        invoiceId: invoice.id,
        customerName: invoice.customerName,
        balance: invoice.balance,
      },
    });
  };

  return (
    <div className="accounts-receivable-page">
      <section className="ar-hero">
        <div>
          <span>Contabilidad</span>
          <h2>Cuentas por cobrar</h2>
          <p>
            Controla facturas pendientes, balances vencidos y pagos recibidos por
            cliente.
          </p>
        </div>

        <button onClick={loadAccountsReceivable}>
          <RefreshCcw size={18} />
          Actualizar
        </button>
      </section>

      <section className="ar-stats-grid">
        <div className="ar-stat main">
          <WalletCards />
          <span>Total por cobrar</span>
          <strong>{formatMoney(summary.totalReceivable)}</strong>
          <small>{summary.openInvoices || 0} facturas abiertas</small>
        </div>

        <div className="ar-stat danger">
          <AlertTriangle />
          <span>Vencido</span>
          <strong>{formatMoney(summary.overdueReceivable)}</strong>
          <small>Facturas fuera de plazo</small>
        </div>

        <div className="ar-stat success">
          <CalendarClock />
          <span>No vencido</span>
          <strong>{formatMoney(summary.currentReceivable)}</strong>
          <small>Balance vigente</small>
        </div>

        <div className="ar-stat">
          <FileText />
          <span>Facturas parciales</span>
          <strong>{summary.partialInvoices || 0}</strong>
          <small>Con pagos aplicados</small>
        </div>
      </section>

      <section className="ar-panel">
        <div className="ar-filters">
          <div className="ar-search">
            <Search size={17} />
            <input
              placeholder="Buscar factura, cliente, RNC, teléfono o email"
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
            value={filters.status}
            onChange={(e) =>
              setFilters({
                ...filters,
                status: e.target.value,
              })
            }
          >
            <option value="">Todos los estados</option>
            <option value="issued">Pendiente</option>
            <option value="partial">Parcial</option>
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

          <button onClick={loadAccountsReceivable}>Filtrar</button>
        </div>

        {loading ? (
          <div className="ar-empty">Cargando cuentas por cobrar...</div>
        ) : invoices.length === 0 ? (
          <div className="ar-empty">
            No hay facturas pendientes por cobrar.
          </div>
        ) : (
          <div className="ar-table-wrap">
            <table className="ar-table">
              <thead>
                <tr>
                  <th>Factura</th>
                  <th>Cliente</th>
                  <th>Emisión</th>
                  <th>Vence</th>
                  <th>Total</th>
                  <th>Pagado</th>
                  <th>Balance</th>
                  <th>Estado</th>
                  <th>Progreso</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className={invoice.isOverdue ? "is-overdue" : ""}
                  >
                    <td>
                      <strong>{getFiscalNumber(invoice)}</strong>
                      {invoice.isOverdue && (
                        <small className="ar-overdue-text">
                          {invoice.daysOverdue} días vencida
                        </small>
                      )}
                    </td>

                    <td>
                      <strong>{invoice.customerName}</strong>
                      <small>{invoice.customerPhone || invoice.customerEmail || "—"}</small>
                    </td>

                    <td>
                      {invoice.invoiceDate
                        ? new Date(invoice.invoiceDate).toLocaleDateString(locale)
                        : "—"}
                    </td>

                    <td>
                      {invoice.dueDate
                        ? new Date(invoice.dueDate).toLocaleDateString(locale)
                        : "—"}
                    </td>
                    <td>{formatMoney(invoice.total)}</td>
                    <td>{formatMoney(invoice.amountPaid)}</td>

                    <td>
                      <strong>{formatMoney(invoice.balance)}</strong>
                      <div className="ar-balance-bar">
                        <div
                          style={{
                            width: `${(Number(invoice.balance || 0) / maxBalance) * 100}%`,
                          }}
                        />
                      </div>
                    </td>

                    <td>
                      <span className={`ar-status ${invoice.status}`}>
                        {statusLabels[invoice.status] || invoice.status}
                      </span>
                    </td>

                    <td>
                      <div className="ar-progress">
                        <div
                          style={{
                            width: `${invoice.paidPercent || 0}%`,
                          }}
                        />
                      </div>
                      <small>{Math.round(invoice.paidPercent || 0)}% pagado</small>
                    </td>

                    <td className="ar-actions">
                      <button
                        title="Ver factura"
                        onClick={() => navigate("/dashboard/facturacion")}
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        title="Registrar pago"
                        onClick={() => goToReceipt(invoice)}
                      >
                        <ReceiptText size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="ar-grid-two">
        <div className="ar-panel">
          <div className="ar-panel-header">
            <h3>Pagos recientes</h3>
            <span>Últimos recibos registrados</span>
          </div>

          <div className="ar-list">
            {(data.recentReceipts || []).length === 0 ? (
              <div className="ar-empty small">No hay pagos recientes.</div>
            ) : (
              data.recentReceipts.map((receipt) => (
                <div className="ar-list-item" key={receipt.id}>
                  <div>
                    <strong>{receipt.customerName}</strong>
                    <span>
                      {receipt.receiptNumber} · {receipt.paymentMethod}
                    </span>
                  </div>

                  <b>{formatMoney(receipt.amount)}</b>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="ar-panel">
          <div className="ar-panel-header">
            <h3>Recomendación</h3>
            <span>Uso práctico</span>
          </div>

          <div className="ar-note">
            Prioriza cobrar primero las facturas vencidas y las de mayor balance.
            Este módulo se alimenta automáticamente de facturas emitidas o
            parcialmente pagadas.
          </div>
        </div>
      </section>
    </div>
  );
}