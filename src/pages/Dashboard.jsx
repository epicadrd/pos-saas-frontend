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
import { useTranslation } from "react-i18next";
import { api } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { isDominicanTenant } from "../utils/taxConfig";
import { getFiscalNumber } from "../utils/fiscalNumber";

export default function Dashboard() {
  const { user, tenant } = useAuth();
  const { t } = useTranslation();

  const isDO = isDominicanTenant(tenant);
  const locale = isDO ? "es-DO" : "en-US";
  const currency = isDO ? "DOP" : "USD";

  const formatMoney = (value) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(Number(value || 0));

  const statusLabel = {
    draft: t("dashboard.status.draft"),
    issued: t("dashboard.status.issued"),
    partial: t("dashboard.status.partial"),
    paid: t("dashboard.status.paid"),
    cancelled: t("dashboard.status.cancelled"),
  };

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
      alert(error.response?.data?.message || t("dashboard.errors.load"));
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
      key: "invoices",
      title: t("dashboard.modules.invoices.title"),
      text: t("dashboard.modules.invoices.text"),
      icon: FileText,
      url: "/dashboard/facturacion",
      value: summary.invoicesCount || 0,
      label: t("dashboard.modules.invoices.label"),
    },
    {
      key: "inventory",
      title: t("dashboard.modules.inventory.title"),
      text: t("dashboard.modules.inventory.text"),
      icon: Package,
      url: "/dashboard/inventario",
      value: summary.productsCount || 0,
      label: t("dashboard.modules.inventory.label"),
    },
    {
      key: "quotes",
      title: t("dashboard.modules.quotes.title"),
      text: t("dashboard.modules.quotes.text"),
      icon: ClipboardList,
      url: "/dashboard/cotizaciones",
      value: summary.quotesPending || 0,
      label: t("dashboard.modules.quotes.label"),
    },
    {
      key: "deliveryNotes",
      title: t("dashboard.modules.deliveryNotes.title"),
      text: t("dashboard.modules.deliveryNotes.text"),
      icon: Truck,
      url: "/dashboard/conduces",
      value: summary.deliveryNotesOpen || 0,
      label: t("dashboard.modules.deliveryNotes.label"),
    },
    {
      key: "receipts",
      title: t("dashboard.modules.receipts.title"),
      text: t("dashboard.modules.receipts.text"),
      icon: ReceiptText,
      url: "/dashboard/recibos",
      value: summary.receiptsCount || 0,
      label: t("dashboard.modules.receipts.label"),
    },
    {
      key: "purchaseOrders",
      title: t("dashboard.modules.purchaseOrders.title"),
      text: t("dashboard.modules.purchaseOrders.text"),
      icon: CreditCard,
      url: "/dashboard/ordenes-compra",
      value: summary.purchaseOrdersOpen || 0,
      label: t("dashboard.modules.purchaseOrders.label"),
    },
    {
      key: "activity",
      title: t("dashboard.modules.activity.title"),
      text: t("dashboard.modules.activity.text"),
      icon: Activity,
      url: "/dashboard/activity-log",
      value: data?.recentActivities?.length || 0,
      label: t("dashboard.modules.activity.label"),
    },
  ];

  const modules = isEmployee
    ? allModules.filter((item) => ["invoices", "quotes"].includes(item.key))
    : allModules;

  if (loading) {
    return (
      <div className="dash-loading">
        <RefreshCcw className="dash-spin" />
        <strong>{t("dashboard.loading")}</strong>
      </div>
    );
  }

  return (
    <div className="dash-page">
      <section className="dash-hero">
        <div>
          <span>{t("dashboard.hero.eyebrow")}</span>
          <h2>{t("dashboard.hero.title")}</h2>
          <p>
            {isEmployee
              ? t("dashboard.hero.employeeDescription")
              : t("dashboard.hero.description")}
          </p>
        </div>

        <button className="dash-refresh-btn" onClick={loadDashboard}>
          <RefreshCcw size={18} />
          {t("dashboard.actions.refresh")}
        </button>
      </section>

      {!isEmployee && (
        <>
          <section className="dash-stats-grid">
            <div className="dash-stat-card main">
              <div className="dash-stat-icon">
                <DollarSign />
              </div>
              <span>{t("dashboard.stats.salesToday")}</span>
              <strong>{formatMoney(summary.salesToday)}</strong>
              <small>{t("dashboard.stats.salesTodayHint")}</small>
            </div>

            <div className="dash-stat-card">
              <div className="dash-stat-icon">
                <TrendingUp />
              </div>
              <span>{t("dashboard.stats.salesMonth")}</span>
              <strong>{formatMoney(summary.salesMonth)}</strong>
              <small>{t("dashboard.stats.salesMonthHint")}</small>
            </div>

            <div className="dash-stat-card">
              <div className="dash-stat-icon">
                <Wallet />
              </div>
              <span>{t("dashboard.stats.collectedMonth")}</span>
              <strong>{formatMoney(summary.collectedMonth)}</strong>
              <small>{t("dashboard.stats.collectedMonthHint")}</small>
            </div>

            <div className="dash-stat-card danger">
              <div className="dash-stat-icon">
                <AlertTriangle />
              </div>
              <span>{t("dashboard.stats.pendingBalance")}</span>
              <strong>{formatMoney(summary.pendingBalance)}</strong>
              <small>
                {summary.pendingInvoices || 0} {t("dashboard.stats.accountsReceivable")}
              </small>
            </div>
          </section>

          <section className="dash-business-grid">
            <div className="dash-panel sales-panel">
              <div className="dash-panel-header">
                <div>
                  <h3>{t("dashboard.salesTrend.title")}</h3>
                  <p>{t("dashboard.salesTrend.description")}</p>
                </div>
              </div>

              <div className="dash-chart">
                {(data?.salesTrend || []).length === 0 ? (
                  <div className="dash-empty-mini">
                    {t("dashboard.salesTrend.empty")}
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
                          {new Date(`${item.date}T00:00:00`).toLocaleDateString(locale, {
                            day: "2-digit",
                            month: "short",
                          })}
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
                  <h3>{t("dashboard.operationalSummary.title")}</h3>
                  <p>{t("dashboard.operationalSummary.description")}</p>
                </div>
              </div>

              <div className="dash-kpi-list">
                <div>
                  <Users size={18} />
                  <span>{t("dashboard.operationalSummary.activeCustomers")}</span>
                  <strong>{summary.customersCount || 0}</strong>
                </div>

                <div>
                  <Package size={18} />
                  <span>{t("dashboard.operationalSummary.activeProducts")}</span>
                  <strong>{summary.productsCount || 0}</strong>
                </div>

                <div>
                  <AlertTriangle size={18} />
                  <span>{t("dashboard.operationalSummary.lowStock")}</span>
                  <strong>{summary.lowStockCount || 0}</strong>
                </div>

                <div>
                  <ReceiptText size={18} />
                  <span>{t("dashboard.operationalSummary.collectedToday")}</span>
                  <strong>{formatMoney(summary.collectedToday)}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="dash-lists-grid">
            <div className="dash-panel">
              <div className="dash-panel-header">
                <div>
                  <h3>{t("dashboard.recentInvoices.title")}</h3>
                  <p>{t("dashboard.recentInvoices.description")}</p>
                </div>

                <Link to="/dashboard/facturacion">
                  {t("dashboard.actions.viewAll")} <ArrowRight size={16} />
                </Link>
              </div>

              <div className="dash-table-list">
                {(data?.recentInvoices || []).length === 0 ? (
                  <div className="dash-empty-mini">
                    {t("dashboard.recentInvoices.empty")}
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
                  <h3>{t("dashboard.lowStock.title")}</h3>
                  <p>{t("dashboard.lowStock.description")}</p>
                </div>

                <Link to="/dashboard/inventario">
                  {t("dashboard.actions.viewInventory")} <ArrowRight size={16} />
                </Link>
              </div>

              <div className="dash-table-list">
                {(data?.lowStockProducts || []).length === 0 ? (
                  <div className="dash-success-mini">
                    <CheckCircle2 size={18} />
                    {t("dashboard.lowStock.empty")}
                  </div>
                ) : (
                  data.lowStockProducts.map((product) => (
                    <div className="dash-list-row" key={product.id}>
                      <div>
                        <strong>{product.name}</strong>
                        <span>{product.sku || t("dashboard.lowStock.noSku")}</span>
                      </div>

                      <div className="dash-row-right">
                        <strong>{product.stock}</strong>
                        <small>
                          {t("dashboard.lowStock.min")}: {product.minStock}
                        </small>
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
            <Link to={item.url} key={item.key} className="dash-module-card">
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
              <h3>{t("dashboard.activity.title")}</h3>
              <p>{t("dashboard.activity.description")}</p>
            </div>

            <Link to="/dashboard/activity-log">
              {t("dashboard.actions.viewActivity")} <ArrowRight size={16} />
            </Link>
          </div>

          <div className="dash-activity-list">
            {(data?.recentActivities || []).length === 0 ? (
              <div className="dash-empty-mini">
                {t("dashboard.activity.empty")}
              </div>
            ) : (
              data.recentActivities.map((log) => (
                <div className="dash-activity-row" key={log.id}>
                  <div className="dash-dot" />

                  <div>
                    <strong>{log.description}</strong>
                    <span>
                      {log.user?.name || log.user?.email || t("dashboard.activity.system")} ·{" "}
                      {log.module}
                    </span>
                  </div>

                  <small>
                    {new Date(log.createdAt).toLocaleDateString(locale, {
                      day: "2-digit",
                      month: "short",
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