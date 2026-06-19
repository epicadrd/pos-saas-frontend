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
import es from "../../i18n/locales/es.json";
import en from "../../i18n/locales/en.json";
import { isDominicanTenant } from "../../utils/taxConfig";
import { getFiscalNumber } from "../../utils/fiscalNumber";

export default function AccountsReceivable() {
  const { tenant, language } = useAuth();
  const navigate = useNavigate();

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
    issued: t("accountsReceivable.status.issued"),
    partial: t("accountsReceivable.status.partial"),
    paid: t("accountsReceivable.status.paid"),
    cancelled: t("accountsReceivable.status.cancelled"),
    draft: t("accountsReceivable.status.draft"),
  };

  const isDO = isDominicanTenant(tenant);
  const locale = isDO ? "es-DO" : "en-US";
  const currency = isDO ? "DOP" : "USD";

  const formatMoney = (value) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(Number(value || 0));

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
          t("accountsReceivable.messages.loadError")
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
          <span>{t("accountsReceivable.header.eyebrow")}</span>
          <h2>{t("accountsReceivable.header.title")}</h2>
          <p>{t("accountsReceivable.header.description")}</p>
        </div>

        <button onClick={loadAccountsReceivable}>
          <RefreshCcw size={18} />
          {t("accountsReceivable.header.refresh")}
        </button>
      </section>

      <section className="ar-stats-grid">
        <div className="ar-stat main">
          <WalletCards />
          <span>{t("accountsReceivable.stats.totalReceivable")}</span>
          <strong>{formatMoney(summary.totalReceivable)}</strong>
          <small>
            {t("accountsReceivable.stats.openInvoices", "", {
              count: summary.openInvoices || 0,
            })}
          </small>
        </div>

        <div className="ar-stat danger">
          <AlertTriangle />
          <span>{t("accountsReceivable.stats.overdue")}</span>
          <strong>{formatMoney(summary.overdueReceivable)}</strong>
          <small>{t("accountsReceivable.stats.overdueHint")}</small>
        </div>

        <div className="ar-stat success">
          <CalendarClock />
          <span>{t("accountsReceivable.stats.current")}</span>
          <strong>{formatMoney(summary.currentReceivable)}</strong>
          <small>{t("accountsReceivable.stats.currentHint")}</small>
        </div>

        <div className="ar-stat">
          <FileText />
          <span>{t("accountsReceivable.stats.partialInvoices")}</span>
          <strong>{summary.partialInvoices || 0}</strong>
          <small>{t("accountsReceivable.stats.partialHint")}</small>
        </div>
      </section>

      <section className="ar-panel">
        <div className="ar-filters">
          <div className="ar-search">
            <Search size={17} />
            <input
              placeholder={t("accountsReceivable.filters.search")}
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
            <option value="">{t("accountsReceivable.filters.allStatuses")}</option>
            <option value="issued">{t("accountsReceivable.filters.pending")}</option>
            <option value="partial">{t("accountsReceivable.filters.partial")}</option>
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
            <option value="">{t("accountsReceivable.filters.allAging")}</option>
            <option value="overdue">{t("accountsReceivable.filters.overdue")}</option>
            <option value="current">{t("accountsReceivable.filters.current")}</option>
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

          <button onClick={loadAccountsReceivable}>
            {t("accountsReceivable.filters.filter")}
          </button>
        </div>

        {loading ? (
          <div className="ar-empty">
            {t("accountsReceivable.messages.loading")}
          </div>
        ) : invoices.length === 0 ? (
          <div className="ar-empty">
            {t("accountsReceivable.messages.empty")}
          </div>
        ) : (
          <div className="ar-table-wrap">
            <table className="ar-table">
              <thead>
                <tr>
                  <th>{t("accountsReceivable.table.invoice")}</th>
                  <th>{t("accountsReceivable.table.customer")}</th>
                  <th>{t("accountsReceivable.table.issued")}</th>
                  <th>{t("accountsReceivable.table.due")}</th>
                  <th>{t("accountsReceivable.table.total")}</th>
                  <th>{t("accountsReceivable.table.paid")}</th>
                  <th>{t("accountsReceivable.table.balance")}</th>
                  <th>{t("accountsReceivable.table.status")}</th>
                  <th>{t("accountsReceivable.table.progress")}</th>
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
                          {t("accountsReceivable.table.daysOverdue", "", {
                            days: invoice.daysOverdue,
                          })}
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
                            width: `${
                              (Number(invoice.balance || 0) / maxBalance) * 100
                            }%`,
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
                      <small>
                        {t("accountsReceivable.table.paidPercent", "", {
                          percent: Math.round(invoice.paidPercent || 0),
                        })}
                      </small>
                    </td>

                    <td className="ar-actions">
                      <button
                        title={t("accountsReceivable.table.viewInvoice")}
                        onClick={() => navigate("/dashboard/facturacion")}
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        title={t("accountsReceivable.table.registerPayment")}
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
            <h3>{t("accountsReceivable.recentPayments.title")}</h3>
            <span>{t("accountsReceivable.recentPayments.description")}</span>
          </div>

          <div className="ar-list">
            {(data.recentReceipts || []).length === 0 ? (
              <div className="ar-empty small">
                {t("accountsReceivable.recentPayments.empty")}
              </div>
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
            <h3>{t("accountsReceivable.recommendation.title")}</h3>
            <span>{t("accountsReceivable.recommendation.subtitle")}</span>
          </div>

          <div className="ar-note">
            {t("accountsReceivable.recommendation.text")}
          </div>
        </div>
      </section>
    </div>
  );
}