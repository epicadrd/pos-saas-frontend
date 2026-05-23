import { useEffect, useMemo, useState } from "react";
import {
  RefreshCcw,
  BarChart3,
  TrendingUp,
  WalletCards,
  ReceiptText,
  AlertTriangle,
  Package,
} from "lucide-react";
import { api } from "../../api/axios";

const today = new Date().toISOString().slice(0, 10);

const firstDayOfMonth = () => {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
};

const formatMoney = (value) =>
  new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  }).format(Number(value || 0));

const statusLabels = {
  issued: "Emitida",
  partial: "Parcial",
  paid: "Pagada",
  draft: "Borrador",
  cancelled: "Cancelada",
  pending: "Pendiente",
};

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

  const [filters, setFilters] = useState({
    from: firstDayOfMonth(),
    to: today,
  });

  const summary = report?.summary || {};

  const maxCategoryTotal = useMemo(() => {
    const values = report?.charts?.expensesByCategory || [];
    return Math.max(...values.map((item) => Number(item.total || 0)), 1);
  }, [report]);

  const maxSalesDay = useMemo(() => {
    const values = report?.charts?.salesByDay || [];
    return Math.max(...values.map((item) => Number(item.total || 0)), 1);
  }, [report]);

  const maxProductTotal = useMemo(() => {
    const values = report?.charts?.topProducts || [];
    return Math.max(...values.map((item) => Number(item.total || 0)), 1);
  }, [report]);

  const loadReport = async () => {
    try {
      setLoading(true);

      const { data } = await api.get("/reports/overview", {
        params: filters,
      });

      setReport(data);
    } catch (error) {
      alert(error.response?.data?.message || "No se pudieron cargar los reportes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  return (
    <div className="reports-page">
      <section className="reports-hero">
        <div>
          <span>Contabilidad</span>
          <h2>Reportes</h2>
          <p>
            Analiza ventas, cobros, gastos, utilidad estimada, inventario y
            movimientos recientes del negocio.
          </p>
        </div>

        <div className="reports-actions">
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

          <button onClick={loadReport}>
            <RefreshCcw size={18} />
            Actualizar
          </button>
        </div>
      </section>

      {loading ? (
        <div className="reports-empty">Cargando reportes...</div>
      ) : (
        <>
          <section className="reports-stats-grid">
            <div className="report-stat">
              <BarChart3 />
              <span>Ventas</span>
              <strong>{formatMoney(summary.totalSales)}</strong>
              <small>{summary.invoicesCount || 0} facturas</small>
            </div>

            <div className="report-stat">
              <ReceiptText />
              <span>Cobrado</span>
              <strong>{formatMoney(summary.totalCollected)}</strong>
              <small>{summary.receiptsCount || 0} recibos</small>
            </div>

            <div className="report-stat danger">
              <WalletCards />
              <span>Gastos</span>
              <strong>{formatMoney(summary.totalExpenses)}</strong>
              <small>{summary.expensesCount || 0} gastos</small>
            </div>

            <div className="report-stat success">
              <TrendingUp />
              <span>Ganancia estimada</span>
              <strong>{formatMoney(summary.netProfit)}</strong>
              <small>Cobrado - gastos</small>
            </div>

            <div className="report-stat warning">
              <AlertTriangle />
              <span>Cuentas por cobrar</span>
              <strong>{formatMoney(summary.accountsReceivable)}</strong>
              <small>Balance pendiente</small>
            </div>

            <div className="report-stat">
              <Package />
              <span>Gastos pendientes</span>
              <strong>{formatMoney(summary.pendingExpenses)}</strong>
              <small>Estado pendiente</small>
            </div>
          </section>

          <section className="reports-grid-two">
            <div className="reports-panel">
              <div className="reports-panel-header">
                <h3>Ventas por día</h3>
                <span>Facturación del rango</span>
              </div>

              <div className="report-bars">
                {(report?.charts?.salesByDay || []).length === 0 ? (
                  <div className="reports-empty small">No hay ventas en este rango.</div>
                ) : (
                  report.charts.salesByDay.map((item) => (
                    <div className="report-bar-row" key={item.date}>
                      <span>{item.date}</span>

                      <div className="report-bar-track">
                        <div
                          className="report-bar-fill"
                          style={{
                            width: `${(Number(item.total || 0) / maxSalesDay) * 100}%`,
                          }}
                        />
                      </div>

                      <strong>{formatMoney(item.total)}</strong>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="reports-panel">
              <div className="reports-panel-header">
                <h3>Gastos por categoría</h3>
                <span>Distribución de egresos</span>
              </div>

              <div className="report-bars">
                {(report?.charts?.expensesByCategory || []).length === 0 ? (
                  <div className="reports-empty small">No hay gastos en este rango.</div>
                ) : (
                  report.charts.expensesByCategory.map((item) => (
                    <div className="report-bar-row" key={item.category}>
                      <span>{item.category}</span>

                      <div className="report-bar-track">
                        <div
                          className="report-bar-fill expense"
                          style={{
                            width: `${(Number(item.total || 0) / maxCategoryTotal) * 100}%`,
                          }}
                        />
                      </div>

                      <strong>{formatMoney(item.total)}</strong>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="reports-grid-two">
            <div className="reports-panel">
              <div className="reports-panel-header">
                <h3>Productos más vendidos</h3>
                <span>Según facturas emitidas</span>
              </div>

              <div className="report-bars">
                {(report?.charts?.topProducts || []).length === 0 ? (
                  <div className="reports-empty small">No hay productos vendidos.</div>
                ) : (
                  report.charts.topProducts.map((item) => (
                    <div className="report-bar-row" key={item.productName}>
                      <span>{item.productName}</span>

                      <div className="report-bar-track">
                        <div
                          className="report-bar-fill product"
                          style={{
                            width: `${(Number(item.total || 0) / maxProductTotal) * 100}%`,
                          }}
                        />
                      </div>

                      <strong>{formatMoney(item.total)}</strong>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="reports-panel">
              <div className="reports-panel-header">
                <h3>Gastos por proveedor</h3>
                <span>Proveedores con mayor gasto</span>
              </div>

              <div className="reports-list">
                {(report?.charts?.expensesBySupplier || []).length === 0 ? (
                  <div className="reports-empty small">No hay gastos con proveedor.</div>
                ) : (
                  report.charts.expensesBySupplier.map((item) => (
                    <div className="reports-list-item" key={item.supplierId}>
                      <div>
                        <strong>{item.supplierName}</strong>
                        <span>Proveedor</span>
                      </div>

                      <b>{formatMoney(item.total)}</b>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="reports-panel">
            <div className="reports-panel-header">
              <h3>Facturas recientes</h3>
              <span>Últimos movimientos de ventas</span>
            </div>

            <div className="reports-table-wrap">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Cliente</th>
                    <th>Estado</th>
                    <th>Total</th>
                    <th>Balance</th>
                  </tr>
                </thead>

                <tbody>
                  {(report?.tables?.recentInvoices || []).map((invoice) => (
                    <tr key={invoice.id}>
                      <td>{invoice.invoiceNumber}</td>
                      <td>{invoice.customerName}</td>
                      <td>
                        <span className={`report-status ${invoice.status}`}>
                          {statusLabels[invoice.status] || invoice.status}
                        </span>
                      </td>
                      <td>{formatMoney(invoice.total)}</td>
                      <td>{formatMoney(invoice.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="reports-grid-two">
            <div className="reports-panel">
              <div className="reports-panel-header">
                <h3>Gastos recientes</h3>
                <span>Últimos egresos registrados</span>
              </div>

              <div className="reports-list">
                {(report?.tables?.recentExpenses || []).length === 0 ? (
                  <div className="reports-empty small">No hay gastos recientes.</div>
                ) : (
                  report.tables.recentExpenses.map((expense) => (
                    <div className="reports-list-item" key={expense.id}>
                      <div>
                        <strong>{expense.description}</strong>
                        <span>
                          {expense.expenseNumber} · {expense.category}
                        </span>
                      </div>

                      <b>{formatMoney(expense.total)}</b>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="reports-panel">
              <div className="reports-panel-header">
                <h3>Inventario bajo</h3>
                <span>Productos que requieren atención</span>
              </div>

              <div className="reports-list">
                {(report?.tables?.lowStockProducts || []).length === 0 ? (
                  <div className="reports-empty small">No hay productos con stock bajo.</div>
                ) : (
                  report.tables.lowStockProducts.map((product) => (
                    <div className="reports-list-item" key={product.id}>
                      <div>
                        <strong>{product.name}</strong>
                        <span>SKU: {product.sku || "—"}</span>
                      </div>

                      <b>
                        {product.stock}/{product.minStock}
                      </b>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}