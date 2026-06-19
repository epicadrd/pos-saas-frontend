import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  ReceiptText,
  RefreshCcw,
} from "lucide-react";
import { api } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import es from "../../i18n/locales/es.json";
import en from "../../i18n/locales/en.json";
import { isDominicanTenant } from "../../utils/taxConfig";

export default function AccountingSummary() {
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

  const isDO = isDominicanTenant(tenant);
  const locale = isDO ? "es-DO" : "en-US";
  const currency = isDO ? "DOP" : "USD";

  const formatMoney = (value) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(Number(value || 0));

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const res = await api.get("/accounting/summary");
      setData(res.data);
    } catch (error) {
      alert(
        error.response?.data?.message ||
          t("accountingSummary.messages.loadError")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const summary = data?.summary || {};

  const maxTrendValue = useMemo(() => {
    const values = data?.cashFlowTrend?.map((item) => Number(item.total || 0)) || [];
    return Math.max(...values, 1);
  }, [data]);

  if (loading) {
    return (
      <div className="accounting-loading">
        <RefreshCcw className="dash-spin" />
        <strong>{t("accountingSummary.loading")}</strong>
      </div>
    );
  }

  return (
    <div className="accounting-page">
      <section className="accounting-hero">
        <div>
          <span>{t("accountingSummary.header.eyebrow")}</span>
          <h2>{t("accountingSummary.header.title")}</h2>
          <p>{t("accountingSummary.header.description")}</p>
        </div>

        <button onClick={loadSummary}>
          <RefreshCcw size={18} />
          {t("accountingSummary.header.refresh")}
        </button>
      </section>

      <section className="accounting-stats-grid">
        <div className="accounting-card main">
          <Wallet />
          <span>{t("accountingSummary.stats.incomeMonth")}</span>
          <strong>{formatMoney(summary.incomeMonth)}</strong>
          <small>{t("accountingSummary.stats.incomeMonthHint")}</small>
        </div>

        <div className="accounting-card">
          <ReceiptText />
          <span>{t("accountingSummary.stats.collectedMonth")}</span>
          <strong>{formatMoney(summary.collectedMonth)}</strong>
          <small>{t("accountingSummary.stats.collectedMonthHint")}</small>
        </div>

        <div className="accounting-card success">
          <TrendingUp />
          <span>{t("accountingSummary.stats.netProfit")}</span>
          <strong>{formatMoney(summary.netProfit)}</strong>
          <small>{t("accountingSummary.stats.netProfitHint")}</small>
        </div>

        <div className="accounting-card danger">
          <AlertTriangle />
          <span>{t("accountingSummary.stats.accountsReceivable")}</span>
          <strong>{formatMoney(summary.accountsReceivable)}</strong>
          <small>
            {t("accountingSummary.stats.pendingInvoices", "", {
              count: summary.openInvoices || 0,
            })}
          </small>
        </div>
      </section>

      <section className="accounting-grid">
        <div className="accounting-panel">
          <div className="accounting-panel-header">
            <div>
              <h3>{t("accountingSummary.cashFlow.title")}</h3>
              <p>{t("accountingSummary.cashFlow.description")}</p>
            </div>
          </div>

          <div className="accounting-chart">
            {(data?.cashFlowTrend || []).length === 0 ? (
              <div className="accounting-empty">
                {t("accountingSummary.cashFlow.empty")}
              </div>
            ) : (
              data.cashFlowTrend.map((item) => {
                const height = Math.max(
                  (Number(item.total) / maxTrendValue) * 100,
                  8
                );

                return (
                  <div className="accounting-bar-item" key={item.date}>
                    <div className="accounting-bar-track">
                      <div
                        className="accounting-bar-fill"
                        style={{ height: `${height}%` }}
                        title={formatMoney(item.total)}
                      />
                    </div>
                    <span>
                      {new Date(`${item.date}T00:00:00`).toLocaleDateString(
                        locale,
                        { day: "2-digit", month: "short" }
                      )}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="accounting-panel">
          <div className="accounting-panel-header">
            <div>
              <h3>{t("accountingSummary.financialStatus.title")}</h3>
              <p>{t("accountingSummary.financialStatus.description")}</p>
            </div>
          </div>

          <div className="accounting-kpi-list">
            <div>
              <span>{t("accountingSummary.financialStatus.expenses")}</span>
              <strong>{formatMoney(summary.expensesMonth)}</strong>
            </div>

            <div>
              <span>{t("accountingSummary.financialStatus.accountsPayable")}</span>
              <strong>{formatMoney(summary.accountsPayable)}</strong>
            </div>

            <div>
              <span>{t("accountingSummary.financialStatus.overdueReceivable")}</span>
              <strong>{formatMoney(summary.overdueReceivable)}</strong>
            </div>

            <div>
              <span>{t("accountingSummary.financialStatus.openPurchaseOrders")}</span>
              <strong>{summary.openPurchaseOrders || 0}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="accounting-panel">
        <div className="accounting-panel-header">
          <div>
            <h3>{t("accountingSummary.recentReceipts.title")}</h3>
            <p>{t("accountingSummary.recentReceipts.description")}</p>
          </div>
        </div>

        <div className="accounting-table-list">
          {(data?.recentReceipts || []).length === 0 ? (
            <div className="accounting-empty">
              {t("accountingSummary.recentReceipts.empty")}
            </div>
          ) : (
            data.recentReceipts.map((receipt) => (
              <div className="accounting-row" key={receipt.id}>
                <div>
                  <strong>{receipt.receiptNumber}</strong>
                  <span>{receipt.customerName}</span>
                </div>

                <div>
                  <strong>{formatMoney(receipt.amount)}</strong>
                  <small>{receipt.paymentMethod}</small>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}