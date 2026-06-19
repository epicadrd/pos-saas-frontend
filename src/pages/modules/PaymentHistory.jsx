import { useEffect, useMemo, useState } from "react";
import { Calendar, FileText, Search, Wallet, X } from "lucide-react";
import { api } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import es from "../../i18n/locales/es.json";
import en from "../../i18n/locales/en.json";
import { getTaxLabel, isDominicanTenant } from "../../utils/taxConfig";
import { getFiscalNumber } from "../../utils/fiscalNumber";

export default function PaymentHistory() {
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

  const [invoices, setInvoices] = useState([]);
  const [month, setMonth] = useState(
    String(new Date().getMonth() + 1).padStart(2, "0")
  );
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const isDO = isDominicanTenant(tenant);
  const locale = isDO ? "es-DO" : "en-US";
  const currency = isDO ? "DOP" : "USD";
  const taxLabel = getTaxLabel(tenant);

  const money = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
      }),
    [locale, currency]
  );

  const formatDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString(locale);
  };

  const loadInvoices = async () => {
    try {
      const { data } = await api.get("/invoices");
      setInvoices(data);
    } catch (error) {
      alert(
        error.response?.data?.message ||
          t("paymentHistory.messages.loadError")
      );
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const paidInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      if (invoice.status !== "paid") return false;

      const date = new Date(invoice.createdAt);
      const invoiceMonth = String(date.getMonth() + 1).padStart(2, "0");
      const invoiceYear = String(date.getFullYear());

      const matchDate = invoiceMonth === month && invoiceYear === year;

      const text = `${getFiscalNumber(invoice)} ${
        invoice.customerName || ""
      }`.toLowerCase();
      const matchSearch = text.includes(search.toLowerCase());

      return matchDate && matchSearch;
    });
  }, [invoices, month, year, search]);

  const totals = useMemo(() => {
    return paidInvoices.reduce(
      (acc, invoice) => {
        acc.subtotal += Number(invoice.subtotal || 0);
        acc.tax += Number(invoice.tax || 0);
        acc.total += Number(invoice.total || 0);
        acc.amountPaid += Number(invoice.amountPaid || 0);
        return acc;
      },
      { subtotal: 0, tax: 0, total: 0, amountPaid: 0 }
    );
  }, [paidInvoices]);

  const months = [
    ["01", t("paymentHistory.months.01")],
    ["02", t("paymentHistory.months.02")],
    ["03", t("paymentHistory.months.03")],
    ["04", t("paymentHistory.months.04")],
    ["05", t("paymentHistory.months.05")],
    ["06", t("paymentHistory.months.06")],
    ["07", t("paymentHistory.months.07")],
    ["08", t("paymentHistory.months.08")],
    ["09", t("paymentHistory.months.09")],
    ["10", t("paymentHistory.months.10")],
    ["11", t("paymentHistory.months.11")],
    ["12", t("paymentHistory.months.12")],
  ];

  return (
    <div className="payment-history-page">
      <div className="payment-history-header">
        <div>
          <h1>{t("paymentHistory.header.title")}</h1>
          <p>
            {t("paymentHistory.header.description", "", {
              taxLabel,
            })}
          </p>
        </div>
      </div>

      <div className="payment-history-filters">
        <div className="payment-search">
          <Search size={18} />
          <input
            placeholder={t("paymentHistory.filters.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select value={year} onChange={(e) => setYear(e.target.value)}>
          {[2024, 2025, 2026, 2027, 2028].map((item) => (
            <option key={item} value={String(item)}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="payment-stats-grid">
        <div className="payment-stat-card">
          <div className="payment-stat-icon">
            <Wallet size={22} />
          </div>
          <div>
            <span>{t("paymentHistory.stats.totalCollected")}</span>
            <strong>{money.format(totals.amountPaid)}</strong>
          </div>
        </div>

        <div className="payment-stat-card">
          <div className="payment-stat-icon">
            <FileText size={22} />
          </div>
          <div>
            <span>{t("paymentHistory.stats.subtotal")}</span>
            <strong>{money.format(totals.subtotal)}</strong>
          </div>
        </div>

        <div className="payment-stat-card">
          <div className="payment-stat-icon">
            <Calendar size={22} />
          </div>
          <div>
            <span>{taxLabel}</span>
            <strong>{money.format(totals.tax)}</strong>
          </div>
        </div>

        <div className="payment-stat-card">
          <div className="payment-stat-icon">
            <FileText size={22} />
          </div>
          <div>
            <span>{t("paymentHistory.stats.paidInvoices")}</span>
            <strong>{paidInvoices.length}</strong>
          </div>
        </div>
      </div>

      <div className="payment-table-card payment-history-desktop">
        <table className="payment-table">
          <thead>
            <tr>
              <th>{t("paymentHistory.table.invoice")}</th>
              <th>{t("paymentHistory.table.customer")}</th>
              <th>{t("paymentHistory.table.date")}</th>
              <th>{t("paymentHistory.table.subtotal")}</th>
              <th>{taxLabel}</th>
              <th>{t("paymentHistory.table.total")}</th>
              <th>{t("paymentHistory.table.paid")}</th>
            </tr>
          </thead>

          <tbody>
            {paidInvoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{getFiscalNumber(invoice)}</td>
                <td>{invoice.customerName}</td>
                <td>{formatDate(invoice.createdAt)}</td>
                <td>{money.format(Number(invoice.subtotal || 0))}</td>
                <td>{money.format(Number(invoice.tax || 0))}</td>
                <td>{money.format(Number(invoice.total || 0))}</td>
                <td>
                  <strong>
                    {money.format(Number(invoice.amountPaid || 0))}
                  </strong>
                </td>
              </tr>
            ))}

            {!paidInvoices.length && (
              <tr>
                <td colSpan="7" className="payment-empty">
                  {t("paymentHistory.table.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="payment-history-mobile">
        {paidInvoices.length ? (
          paidInvoices.map((invoice) => (
            <button
              type="button"
              key={invoice.id}
              className="payment-mobile-card"
              onClick={() => setSelectedInvoice(invoice)}
            >
              <div className="payment-mobile-card-top">
                <div>
                  <span>{t("paymentHistory.mobile.invoice")}</span>
                  <strong>{getFiscalNumber(invoice)}</strong>
                </div>

                <small>{formatDate(invoice.createdAt)}</small>
              </div>

              <div className="payment-mobile-client">
                <span>{t("paymentHistory.mobile.customer")}</span>
                <strong>
                  {invoice.customerName || t("paymentHistory.mobile.noCustomer")}
                </strong>
              </div>

              <div className="payment-mobile-money-grid">
                <div>
                  <span>{t("paymentHistory.mobile.total")}</span>
                  <strong>{money.format(Number(invoice.total || 0))}</strong>
                </div>

                <div>
                  <span>{t("paymentHistory.mobile.paid")}</span>
                  <strong>
                    {money.format(Number(invoice.amountPaid || 0))}
                  </strong>
                </div>
              </div>

              <div className="payment-mobile-footer">
                <span>
                  {taxLabel} {money.format(Number(invoice.tax || 0))}
                </span>
                <strong>{t("paymentHistory.mobile.viewDetail")}</strong>
              </div>
            </button>
          ))
        ) : (
          <div className="payment-mobile-empty">
            {t("paymentHistory.table.empty")}
          </div>
        )}
      </div>

      {selectedInvoice && (
        <div
          className="payment-detail-overlay"
          onClick={() => setSelectedInvoice(null)}
        >
          <div
            className="payment-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="payment-detail-header">
              <div>
                <span>{t("paymentHistory.detail.title")}</span>
                <h3>{getFiscalNumber(selectedInvoice)}</h3>
              </div>

              <button type="button" onClick={() => setSelectedInvoice(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="payment-detail-list">
              <div>
                <span>{t("paymentHistory.detail.customer")}</span>
                <strong>
                  {selectedInvoice.customerName ||
                    t("paymentHistory.detail.noCustomer")}
                </strong>
              </div>

              <div>
                <span>{t("paymentHistory.detail.date")}</span>
                <strong>{formatDate(selectedInvoice.createdAt)}</strong>
              </div>

              <div>
                <span>{t("paymentHistory.detail.subtotal")}</span>
                <strong>
                  {money.format(Number(selectedInvoice.subtotal || 0))}
                </strong>
              </div>

              <div>
                <span>{taxLabel}</span>
                <strong>
                  {money.format(Number(selectedInvoice.tax || 0))}
                </strong>
              </div>

              <div>
                <span>{t("paymentHistory.detail.total")}</span>
                <strong>
                  {money.format(Number(selectedInvoice.total || 0))}
                </strong>
              </div>

              <div>
                <span>{t("paymentHistory.detail.paid")}</span>
                <strong>
                  {money.format(Number(selectedInvoice.amountPaid || 0))}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}