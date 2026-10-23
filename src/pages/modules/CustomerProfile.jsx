import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowLeft,
  FileCheck2,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { api } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { isDominicanTenant } from "../../utils/taxConfig";
import { getFiscalNumber } from "../../utils/fiscalNumber";
import CustomerFormModal from "../../components/CustomerFormModal";

const INVOICE_BADGE = {
  issued: "info",
  partial: "warning",
  paid: "ok",
  cancelled: "danger",
};

const QUOTE_BADGE = {
  sent: "info",
  approved: "ok",
  converted: "ok",
  rejected: "danger",
  expired: "warning",
};

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase() || "?";

export default function CustomerProfile() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { tenant } = useAuth();

  // Resultado de la última carga, ligado al id para no mostrar otro cliente
  const [result, setResult] = useState({ id: null, profile: null, error: "" });
  const [reloadKey, setReloadKey] = useState(0);
  const [activeTab, setActiveTab] = useState("invoices");
  const [editing, setEditing] = useState(false);

  const isDO = isDominicanTenant(tenant);
  const locale = isDO ? "es-DO" : "en-US";
  const currency = isDO ? "DOP" : "USD";

  const formatMoney = (value) =>
    new Intl.NumberFormat(locale, { style: "currency", currency }).format(
      Number(value || 0)
    );

  const formatDate = (value) => {
    if (!value) return "—";
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
      ? new Date(`${value}T00:00:00`)
      : new Date(value);

    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
  };

  useEffect(() => {
    let cancelled = false;

    api
      .get(`/customers/${id}/profile`)
      .then(({ data }) => {
        if (!cancelled) setResult({ id, profile: data, error: "" });
      })
      .catch((err) => {
        if (cancelled) return;
        setResult({
          id,
          profile: null,
          error: err.response?.data?.message || t("customers.messages.profileError"),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [id, reloadKey, t]);

  const loading = result.id !== id;
  const profile = loading ? null : result.profile;
  const error = loading ? "" : result.error;

  const loadProfile = () => setReloadKey((key) => key + 1);

  const tabs = useMemo(
    () => [
      { key: "invoices", label: t("customers.profile.tabs.invoices"), count: profile?.invoices.length || 0 },
      { key: "quotes", label: t("customers.profile.tabs.quotes"), count: profile?.quotes.length || 0 },
      { key: "receipts", label: t("customers.profile.tabs.receipts"), count: profile?.receipts.length || 0 },
    ],
    [profile, t]
  );

  if (loading) {
    return (
      <div className="customers-page">
        <div className="customer-profile-state">
          <Loader2 size={28} className="dash-spin" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="customers-page">
        <Link to="/dashboard/clientes" className="customer-back-link">
          <ArrowLeft size={16} />
          {t("customers.actions.back")}
        </Link>
        <div className="customer-profile-state customers-error">{error}</div>
      </div>
    );
  }

  const { customer, summary, invoices, quotes, receipts } = profile;
  const contacts = [
    customer.phone && { icon: Phone, value: customer.phone },
    customer.email && { icon: Mail, value: customer.email },
    customer.address && { icon: MapPin, value: customer.address },
  ].filter(Boolean);

  const renderEmpty = (key) => (
    <div className="customers-empty">{t(`customers.profile.empty.${key}`)}</div>
  );

  const renderInvoices = () =>
    invoices.length === 0 ? (
      renderEmpty("invoices")
    ) : (
      <>
        <div className="customers-table-wrap">
          <table className="customers-table">
            <thead>
              <tr>
                <th>{t("customers.profile.columns.number")}</th>
                <th>{t("customers.profile.columns.date")}</th>
                <th>{t("customers.profile.columns.dueDate")}</th>
                <th className="num">{t("customers.profile.columns.total")}</th>
                <th className="num">{t("customers.profile.columns.paid")}</th>
                <th className="num">{t("customers.profile.columns.balance")}</th>
                <th>{t("customers.profile.columns.status")}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="static">
                  <td><strong>{getFiscalNumber(invoice)}</strong></td>
                  <td>{formatDate(invoice.invoiceDate || invoice.createdAt)}</td>
                  <td className={invoice.isOverdue ? "customer-overdue" : ""}>
                    {formatDate(invoice.dueDate)}
                  </td>
                  <td className="num">{formatMoney(invoice.total)}</td>
                  <td className="num">{formatMoney(invoice.amountPaid)}</td>
                  <td className="num"><strong>{formatMoney(invoice.balance)}</strong></td>
                  <td>
                    <div className="customer-badges">
                      <span className={`badge ${INVOICE_BADGE[invoice.status] || "neutral"}`}>
                        {t(`invoices.status.${invoice.status}`, invoice.status)}
                      </span>
                      {invoice.isOverdue && (
                        <span className="badge danger">{t("customers.profile.overdueTag")}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="customers-mobile-list">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="customers-mobile-card doc">
              <div>
                <strong>{getFiscalNumber(invoice)}</strong>
                <small>{formatDate(invoice.invoiceDate || invoice.createdAt)}</small>
              </div>
              <div className="customer-doc-right">
                <strong>{formatMoney(invoice.total)}</strong>
                <span className={`badge ${invoice.isOverdue ? "danger" : INVOICE_BADGE[invoice.status] || "neutral"}`}>
                  {invoice.isOverdue
                    ? t("customers.profile.overdueTag")
                    : t(`invoices.status.${invoice.status}`, invoice.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </>
    );

  const renderQuotes = () =>
    quotes.length === 0 ? (
      renderEmpty("quotes")
    ) : (
      <>
        <div className="customers-table-wrap">
          <table className="customers-table">
            <thead>
              <tr>
                <th>{t("customers.profile.columns.number")}</th>
                <th>{t("customers.profile.columns.date")}</th>
                <th>{t("customers.profile.columns.validUntil")}</th>
                <th className="num">{t("customers.profile.columns.total")}</th>
                <th>{t("customers.profile.columns.status")}</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.id} className="static">
                  <td><strong>{quote.quoteNumber}</strong></td>
                  <td>{formatDate(quote.createdAt)}</td>
                  <td>{formatDate(quote.validUntil)}</td>
                  <td className="num"><strong>{formatMoney(quote.total)}</strong></td>
                  <td>
                    <span className={`badge ${QUOTE_BADGE[quote.status] || "neutral"}`}>
                      {t(`quotes.status.${quote.status}`, quote.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="customers-mobile-list">
          {quotes.map((quote) => (
            <div key={quote.id} className="customers-mobile-card doc">
              <div>
                <strong>{quote.quoteNumber}</strong>
                <small>{formatDate(quote.createdAt)}</small>
              </div>
              <div className="customer-doc-right">
                <strong>{formatMoney(quote.total)}</strong>
                <span className={`badge ${QUOTE_BADGE[quote.status] || "neutral"}`}>
                  {t(`quotes.status.${quote.status}`, quote.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </>
    );

  const renderReceipts = () =>
    receipts.length === 0 ? (
      renderEmpty("receipts")
    ) : (
      <>
        <div className="customers-table-wrap">
          <table className="customers-table">
            <thead>
              <tr>
                <th>{t("customers.profile.columns.number")}</th>
                <th>{t("customers.profile.columns.date")}</th>
                <th>{t("customers.profile.columns.invoice")}</th>
                <th>{t("customers.profile.columns.concept")}</th>
                <th>{t("customers.profile.columns.method")}</th>
                <th className="num">{t("customers.profile.columns.amount")}</th>
                <th>{t("customers.profile.columns.status")}</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((receipt) => (
                <tr key={receipt.id} className="static">
                  <td><strong>{receipt.receiptNumber}</strong></td>
                  <td>{formatDate(receipt.receiptDate)}</td>
                  <td>{receipt.invoiceNumber || "—"}</td>
                  <td className="customer-concept">{receipt.concept}</td>
                  <td>{t(`receipts.paymentMethods.${receipt.paymentMethod}`, receipt.paymentMethod)}</td>
                  <td className="num"><strong>{formatMoney(receipt.amount)}</strong></td>
                  <td>
                    <span className={`badge ${receipt.status === "paid" ? "ok" : "danger"}`}>
                      {t(`customers.profile.receiptStatus.${receipt.status}`, receipt.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="customers-mobile-list">
          {receipts.map((receipt) => (
            <div key={receipt.id} className="customers-mobile-card doc">
              <div>
                <strong>{receipt.receiptNumber}</strong>
                <small>
                  {formatDate(receipt.receiptDate)}
                  {receipt.invoiceNumber ? ` · ${receipt.invoiceNumber}` : ""}
                </small>
              </div>
              <div className="customer-doc-right">
                <strong>{formatMoney(receipt.amount)}</strong>
                <span className={`badge ${receipt.status === "paid" ? "ok" : "danger"}`}>
                  {t(`customers.profile.receiptStatus.${receipt.status}`, receipt.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </>
    );

  return (
    <div className="customers-page">
      <Link to="/dashboard/clientes" className="customer-back-link">
        <ArrowLeft size={16} />
        {t("customers.actions.back")}
      </Link>

      <section className="customer-profile-hero">
        <div className="customer-profile-identity">
          <span className="customers-avatar large">{getInitials(customer.name)}</span>

          <div>
            <span className="customer-profile-eyebrow">{t("customers.profile.eyebrow")}</span>
            <h2>
              {customer.name}
              {!customer.isActive && (
                <span className="badge neutral">{t("customers.profile.inactiveBadge")}</span>
              )}
            </h2>
            {customer.rnc && <p className="customer-profile-rnc">{customer.rnc}</p>}

            <div className="customer-profile-contacts">
              {contacts.length === 0 ? (
                <span>{t("customers.profile.noContact")}</span>
              ) : (
                contacts.map(({ icon: Icon, value }) => (
                  <span key={value}>
                    <Icon size={14} />
                    {value}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="customer-profile-side">
          <button type="button" className="secondary-btn" onClick={() => setEditing(true)}>
            <Pencil size={16} />
            {t("customers.actions.edit")}
          </button>
          <small>{t("customers.profile.since", { date: formatDate(customer.createdAt) })}</small>
          {summary.lastActivity && (
            <small>
              {t("customers.profile.lastActivity", { date: formatDate(summary.lastActivity) })}
            </small>
          )}
        </div>
      </section>

      <section className="customer-profile-stats">
        <div className="customers-stat-card">
          <div className="stat-icon"><FileText size={20} /></div>
          <div>
            <span>{t("customers.profile.stats.totalInvoiced")}</span>
            <strong>{formatMoney(summary.totalInvoiced)}</strong>
            <small>{t("customers.profile.stats.invoicesCount", { count: summary.invoicesCount })}</small>
          </div>
        </div>

        <div className={`customers-stat-card ${summary.pendingBalance > 0 ? "warn" : ""}`}>
          <div className="stat-icon">
            {summary.overdueCount > 0 ? <AlertTriangle size={20} /> : <Wallet size={20} />}
          </div>
          <div>
            <span>{t("customers.profile.stats.pendingBalance")}</span>
            <strong>{formatMoney(summary.pendingBalance)}</strong>
            <small>
              {summary.overdueCount > 0
                ? t("customers.profile.stats.overdue", { count: summary.overdueCount })
                : t("customers.profile.stats.upToDate")}
            </small>
          </div>
        </div>

        <div className="customers-stat-card">
          <div className="stat-icon"><ReceiptText size={20} /></div>
          <div>
            <span>{t("customers.profile.stats.totalReceived")}</span>
            <strong>{formatMoney(summary.totalReceived)}</strong>
            <small>{t("customers.profile.stats.receiptsCount", { count: summary.receiptsCount })}</small>
          </div>
        </div>

        <div className="customers-stat-card">
          <div className="stat-icon"><FileCheck2 size={20} /></div>
          <div>
            <span>{t("customers.profile.stats.quotes")}</span>
            <strong>{summary.quotesCount}</strong>
            <small>{t("customers.profile.stats.quotesWon", { count: summary.quotesWon })}</small>
          </div>
        </div>
      </section>

      <section className="customers-panel">
        <div className="customer-profile-tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={activeTab === tab.key ? "active" : ""}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              <span>{tab.count}</span>
            </button>
          ))}
        </div>

        {activeTab === "invoices" && renderInvoices()}
        {activeTab === "quotes" && renderQuotes()}
        {activeTab === "receipts" && renderReceipts()}
      </section>

      <p className="customer-profile-note">{t("customers.profile.legacyNote")}</p>

      {editing && (
        <CustomerFormModal
          customer={customer}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            loadProfile();
          }}
        />
      )}
    </div>
  );
}
