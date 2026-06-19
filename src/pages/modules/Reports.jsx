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
import { getFiscalNumber } from "../../utils/fiscalNumber";
import { useAuth } from "../../context/AuthContext";
import es from "../../i18n/locales/es.json";
import en from "../../i18n/locales/en.json";
import { isDominicanTenant } from "../../utils/taxConfig";

const today = new Date().toISOString().slice(0, 10);

const firstDayOfMonth = () => {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
};

export default function Reports() {
  const { tenant, language } = useAuth();
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

  const statusLabels = {
    issued: t("reports.status.issued"),
    partial: t("reports.status.partial"),
    paid: t("reports.status.paid"),
    draft: t("reports.status.draft"),
    cancelled: t("reports.status.cancelled"),
    pending: t("reports.status.pending"),
  };

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

  const [filters, setFilters] = useState({
    from: firstDayOfMonth(),
    to: today,
  });

  const isDO = isDominicanTenant(tenant);

  const formatMoney = (value) =>
    new Intl.NumberFormat(isDO ? "es-DO" : "en-US", {
      style: "currency",
      currency: isDO ? "DOP" : "USD",
    }).format(Number(value || 0));

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
      alert(error.response?.data?.message || t("reports.messages.loadError"));
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
          <span>{t("reports.header.eyebrow")}</span>
          <h2>{t("reports.header.title")}</h2>
          <p>{t("reports.header.description")}</p>
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
            {t("reports.header.refresh")}
          </button>
        </div>
      </section>

      {loading ? (
        <div className="reports-empty">{t("reports.messages.loading")}</div>
      ) : (
        <>
          <section className="reports-stats-grid">
            <div className="report-stat">
              <BarChart3 />
              <span>{t("reports.stats.sales")}</span>
              <strong>{formatMoney(summary.totalSales)}</strong>
              <small>
                {t("reports.stats.invoices", "", {
                  count: summary.invoicesCount || 0,
                })}
              </small>
            </div>

            <div className="report-stat">
              <ReceiptText />
              <span>{t("reports.stats.collected")}</span>
              <strong>{formatMoney(summary.totalCollected)}</strong>
              <small>
                {t("reports.stats.receipts", "", {
                  count: summary.receiptsCount || 0,
                })}
              </small>
            </div>

            <div className="report-stat danger">
              <WalletCards />
              <span>{t("reports.stats.expenses")}</span>
              <strong>{formatMoney(summary.totalExpenses)}</strong>
              <small>
                {t("reports.stats.expenseCount", "", {
                  count: summary.expensesCount || 0,
                })}
              </small>
            </div>

            <div className="report-stat success">
              <TrendingUp />
              <span>{t("reports.stats.netProfit")}</span>
              <strong>{formatMoney(summary.netProfit)}</strong>
              <small>{t("reports.stats.netProfitHint")}</small>
            </div>

            <div className="report-stat warning">
              <AlertTriangle />
              <span>{t("reports.stats.accountsReceivable")}</span>
              <strong>{formatMoney(summary.accountsReceivable)}</strong>
              <small>{t("reports.stats.accountsReceivableHint")}</small>
            </div>

            <div className="report-stat">
              <Package />
              <span>{t("reports.stats.pendingExpenses")}</span>
              <strong>{formatMoney(summary.pendingExpenses)}</strong>
              <small>{t("reports.stats.pendingExpensesHint")}</small>
            </div>
          </section>

          <section className="reports-grid-two">
            <div className="reports-panel">
              <div className="reports-panel-header">
                <h3>{t("reports.charts.salesByDay")}</h3>
                <span>{t("reports.charts.salesByDayHint")}</span>
              </div>

              <div className="report-bars">
                {(report?.charts?.salesByDay || []).length === 0 ? (
                  <div className="reports-empty small">
                    {t("reports.charts.noSales")}
                  </div>
                ) : (
                  report.charts.salesByDay.map((item) => (
                    <div className="report-bar-row" key={item.date}>
                      <span>{item.date}</span>

                      <div className="report-bar-track">
                        <div
                          className="report-bar-fill"
                          style={{
                            width: `${
                              (Number(item.total || 0) / maxSalesDay) * 100
                            }%`,
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
                <h3>{t("reports.charts.expensesByCategory")}</h3>
                <span>{t("reports.charts.expensesByCategoryHint")}</span>
              </div>

              <div className="report-bars">
                {(report?.charts?.expensesByCategory || []).length === 0 ? (
                  <div className="reports-empty small">
                    {t("reports.charts.noExpenses")}
                  </div>
                ) : (
                  report.charts.expensesByCategory.map((item) => (
                    <div className="report-bar-row" key={item.category}>
                      <span>{item.category}</span>

                      <div className="report-bar-track">
                        <div
                          className="report-bar-fill expense"
                          style={{
                            width: `${
                              (Number(item.total || 0) / maxCategoryTotal) * 100
                            }%`,
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
                <h3>{t("reports.charts.topProducts")}</h3>
                <span>{t("reports.charts.topProductsHint")}</span>
              </div>

              <div className="report-bars">
                {(report?.charts?.topProducts || []).length === 0 ? (
                  <div className="reports-empty small">
                    {t("reports.charts.noProducts")}
                  </div>
                ) : (
                  report.charts.topProducts.map((item) => (
                    <div className="report-bar-row" key={item.productName}>
                      <span>{item.productName}</span>

                      <div className="report-bar-track">
                        <div
                          className="report-bar-fill product"
                          style={{
                            width: `${
                              (Number(item.total || 0) / maxProductTotal) * 100
                            }%`,
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
                <h3>{t("reports.charts.expensesBySupplier")}</h3>
                <span>{t("reports.charts.expensesBySupplierHint")}</span>
              </div>

              <div className="reports-list">
                {(report?.charts?.expensesBySupplier || []).length === 0 ? (
                  <div className="reports-empty small">
                    {t("reports.charts.noSupplierExpenses")}
                  </div>
                ) : (
                  report.charts.expensesBySupplier.map((item) => (
                    <div className="reports-list-item" key={item.supplierId}>
                      <div>
                        <strong>{item.supplierName}</strong>
                        <span>{t("reports.charts.supplier")}</span>
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
              <h3>{t("reports.tables.recentInvoices")}</h3>
              <span>{t("reports.tables.recentInvoicesHint")}</span>
            </div>

            <div className="reports-table-wrap">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>{isDO ? "e-NCF" : t("reports.tables.invoiceNumber")}</th>
                    <th>{t("reports.tables.customer")}</th>
                    <th>{t("reports.tables.status")}</th>
                    <th>{t("reports.tables.total")}</th>
                    <th>{t("reports.tables.balance")}</th>
                  </tr>
                </thead>

                <tbody>
                  {(report?.tables?.recentInvoices || []).map((invoice) => (
                    <tr key={invoice.id}>
                      <td>
                        {isDO
                          ? getFiscalNumber(invoice)
                          : invoice.invoiceNumber || invoice.id}
                      </td>
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
                <h3>{t("reports.tables.recentExpenses")}</h3>
                <span>{t("reports.tables.recentExpensesHint")}</span>
              </div>

              <div className="reports-list">
                {(report?.tables?.recentExpenses || []).length === 0 ? (
                  <div className="reports-empty small">
                    {t("reports.tables.noRecentExpenses")}
                  </div>
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
                <h3>{t("reports.tables.lowStock")}</h3>
                <span>{t("reports.tables.lowStockHint")}</span>
              </div>

              <div className="reports-list">
                {(report?.tables?.lowStockProducts || []).length === 0 ? (
                  <div className="reports-empty small">
                    {t("reports.tables.noLowStock")}
                  </div>
                ) : (
                  report.tables.lowStockProducts.map((product) => (
                    <div className="reports-list-item" key={product.id}>
                      <div>
                        <strong>{product.name}</strong>
                        <span>
                          {t("reports.tables.sku")}: {product.sku || "—"}
                        </span>
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