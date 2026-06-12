import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Package,
  ClipboardList,
  Truck,
  ReceiptText,
  CreditCard,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  AlertTriangle,
  Wallet,
  RefreshCcw,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { getFiscalNumber } from "../utils/fiscalNumber";

const formatMoney = (value) =>
  new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  }).format(Number(value || 0));

const statusLabel = {
  draft: "Borrador",
  issued: "Emitida",
  partial: "Parcial",
  paid: "Pagada",
  cancelled: "Anulada",
};

export default function Dashboard() {
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const role = user?.role || "employee";
  const isEmployee = role === "employee";

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get("/dashboard");
      setData(res.data);
    } catch (error) {
      console.error("Error cargando dashboard:", error);
      alert(error.response?.data?.message || "No se pudo cargar el dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const summary = data?.summary || {};

  const maxTrendValue = useMemo(() => {
    const values = data?.salesTrend?.map((item) => Number(item.total || 0)) || [];
    return Math.max(...values, 1);
  }, [data]);

  const allModules = [
    {
      title: "Facturación",
      text: "Crear, emitir y controlar facturas.",
      icon: FileText,
      url: "/dashboard/facturacion",
      value: summary.invoicesCount || 0,
      label: "facturas",
    },
    {
      title: "Inventario",
      text: "Productos, stock y movimientos.",
      icon: Package,
      url: "/dashboard/inventario",
      value: summary.productsCount || 0,
      label: "productos",
    },
    {
      title: "Cotizaciones",
      text: "Propuestas pendientes y aprobadas.",
      icon: ClipboardList,
      url: "/dashboard/cotizaciones",
      value: summary.quotesPending || 0,
      label: "pendientes",
    },
    {
      title: "Conduces",
      text: "Entregas abiertas y documentos.",
      icon: Truck,
      url: "/dashboard/conduces",
      value: summary.deliveryNotesOpen || 0,
      label: "abiertos",
    },
    {
      title: "Recibos",
      text: "Pagos, abonos y comprobantes.",
      icon: ReceiptText,
      url: "/dashboard/recibos",
      value: summary.receiptsCount || 0,
      label: "recibos",
    },
    {
      title: "Orden de compra",
      text: "Compras pendientes a suplidores.",
      icon: CreditCard,
      url: "/dashboard/ordenes-compra",
      value: summary.purchaseOrdersOpen || 0,
      label: "abiertas",
    },
    {
      title: "Actividad",
      text: "Auditoría de cambios del sistema.",
      icon: Activity,
      url: "/dashboard/activity-log",
      value: data?.recentActivities?.length || 0,
      label: "recientes",
    },
  ];

  const modules = isEmployee
    ? allModules.filter((item) =>
        ["Facturación", "Cotizaciones"].includes(item.title)
      )
    : allModules;

  if (loading) {
    return (
      <div className="dash-loading">
        <RefreshCcw className="dash-spin" />
        <strong>Cargando datos reales del negocio...</strong>
      </div>
    );
  }

  return (
    <div className="dash-page">
      <section className="dash-hero">
        <div>
          <span>Dashboard principal</span>
          <h2>Control real de tu negocio.</h2>
          <p>
            {isEmployee
              ? "Accede rápidamente a las áreas disponibles para tu usuario."
              : "Visualiza ventas, cobros, balances, inventario bajo, facturas recientes y actividad del sistema desde un solo lugar."}
          </p>
        </div>

        <button className="dash-refresh-btn" onClick={loadDashboard}>
          <RefreshCcw size={18} />
          Actualizar
        </button>
      </section>

      {!isEmployee && (
        <>
          <section className="dash-stats-grid">
            <div className="dash-stat-card main">
              <div className="dash-stat-icon">
                <DollarSign />
              </div>
              <span>Ventas hoy</span>
              <strong>{formatMoney(summary.salesToday)}</strong>
              <small>Facturas emitidas hoy</small>
            </div>

            <div className="dash-stat-card">
              <div className="dash-stat-icon">
                <TrendingUp />
              </div>
              <span>Ventas del mes</span>
              <strong>{formatMoney(summary.salesMonth)}</strong>
              <small>Total facturado este mes</small>
            </div>

            <div className="dash-stat-card">
              <div className="dash-stat-icon">
                <Wallet />
              </div>
              <span>Cobrado este mes</span>
              <strong>{formatMoney(summary.collectedMonth)}</strong>
              <small>Recibos pagados</small>
            </div>

            <div className="dash-stat-card danger">
              <div className="dash-stat-icon">
                <AlertTriangle />
              </div>
              <span>Balance pendiente</span>
              <strong>{formatMoney(summary.pendingBalance)}</strong>
              <small>{summary.pendingInvoices || 0} Cuentas por cobrar</small>
            </div>
          </section>

          <section className="dash-business-grid">
            <div className="dash-panel sales-panel">
              <div className="dash-panel-header">
                <div>
                  <h3>Ventas últimos 7 días</h3>
                  <p>Movimiento reciente de facturación</p>
                </div>
              </div>

              <div className="dash-chart">
                {(data?.salesTrend || []).length === 0 ? (
                  <div className="dash-empty-mini">
                    Aún no hay ventas recientes.
                  </div>
                ) : (
                  data.salesTrend.map((item) => {
                    const height = Math.max(
                      (Number(item.total) / maxTrendValue) * 100,
                      8
                    );

                    return (
                      <div className="dash-bar-item" key={item.date}>
                        <div className="dash-bar-track">
                          <div
                            className="dash-bar-fill"
                            style={{ height: `${height}%` }}
                            title={formatMoney(item.total)}
                          />
                        </div>
                        <span>
                          {new Date(`${item.date}T00:00:00`).toLocaleDateString(
                            "es-DO",
                            { day: "2-digit", month: "short" }
                          )}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="dash-panel">
              <div className="dash-panel-header">
                <div>
                  <h3>Resumen operativo</h3>
                  <p>Indicadores clave del sistema</p>
                </div>
              </div>

              <div className="dash-kpi-list">
                <div>
                  <Users size={18} />
                  <span>Clientes activos</span>
                  <strong>{summary.customersCount || 0}</strong>
                </div>

                <div>
                  <Package size={18} />
                  <span>Productos activos</span>
                  <strong>{summary.productsCount || 0}</strong>
                </div>

                <div>
                  <AlertTriangle size={18} />
                  <span>Inventario bajo</span>
                  <strong>{summary.lowStockCount || 0}</strong>
                </div>

                <div>
                  <ReceiptText size={18} />
                  <span>Cobrado hoy</span>
                  <strong>{formatMoney(summary.collectedToday)}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="dash-lists-grid">
            <div className="dash-panel">
              <div className="dash-panel-header">
                <div>
                  <h3>Facturas recientes</h3>
                  <p>Últimas facturas creadas</p>
                </div>

                <Link to="/dashboard/facturacion">
                  Ver todas <ArrowRight size={16} />
                </Link>
              </div>

              <div className="dash-table-list">
                {(data?.recentInvoices || []).length === 0 ? (
                  <div className="dash-empty-mini">
                    No hay facturas todavía.
                  </div>
                ) : (
                  data.recentInvoices.map((invoice) => (
                    <div className="dash-list-row" key={invoice.id}>
                      <div>
                        <strong>{getFiscalNumber(invoice)}</strong>
                        <span>{invoice.customerName}</span>
                      </div>

                      <div className="dash-row-right">
                        <strong>{formatMoney(invoice.total)}</strong>
                        <small className={`dash-badge ${invoice.status}`}>
                          {statusLabel[invoice.status] || invoice.status}
                        </small>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="dash-panel">
              <div className="dash-panel-header">
                <div>
                  <h3>Inventario bajo</h3>
                  <p>Productos que requieren atención</p>
                </div>

                <Link to="/dashboard/inventario">
                  Ver inventario <ArrowRight size={16} />
                </Link>
              </div>

              <div className="dash-table-list">
                {(data?.lowStockProducts || []).length === 0 ? (
                  <div className="dash-success-mini">
                    <CheckCircle2 size={18} />
                    Todo el inventario está saludable.
                  </div>
                ) : (
                  data.lowStockProducts.map((product) => (
                    <div className="dash-list-row" key={product.id}>
                      <div>
                        <strong>{product.name}</strong>
                        <span>{product.sku || "Sin SKU"}</span>
                      </div>

                      <div className="dash-row-right">
                        <strong>{product.stock}</strong>
                        <small>Mín: {product.minStock}</small>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </>
      )}

      <section className="dash-module-grid">
        {modules.map((item) => {
          const Icon = item.icon;

          return (
            <Link to={item.url} key={item.title} className="dash-module-card">
              <div className="dash-module-top">
                <div className="dash-module-icon">
                  <Icon size={24} />
                </div>

                <div className="dash-module-number">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              </div>

              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </Link>
          );
        })}
      </section>

      {!isEmployee && (
        <section className="dash-panel dash-activity-panel">
          <div className="dash-panel-header">
            <div>
              <h3>Actividad reciente</h3>
              <p>Últimos movimientos registrados</p>
            </div>

            <Link to="/dashboard/activity-log">
              Ver actividad <ArrowRight size={16} />
            </Link>
          </div>

          <div className="dash-activity-list">
            {(data?.recentActivities || []).length === 0 ? (
              <div className="dash-empty-mini">
                No hay actividad registrada.
              </div>
            ) : (
              data.recentActivities.map((log) => (
                <div className="dash-activity-row" key={log.id}>
                  <div className="dash-dot" />

                  <div>
                    <strong>{log.description}</strong>
                    <span>
                      {log.user?.name || log.user?.email || "Sistema"} ·{" "}
                      {log.module}
                    </span>
                  </div>

                  <small>
                    {new Date(log.createdAt).toLocaleDateString("es-DO", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </small>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}