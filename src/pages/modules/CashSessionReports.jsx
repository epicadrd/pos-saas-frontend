import { useEffect, useMemo, useState } from "react";
import { Eye, Filter, Printer, X } from "lucide-react";
import { api } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import es from "../../i18n/locales/es.json";
import en from "../../i18n/locales/en.json";
import { getTaxLabel, isDominicanTenant } from "../../utils/taxConfig";
import "../../styles/pos.css";

export default function CashSessionReports() {
  const { tenant, language } = useAuth();

  const dictionary = language === "en" ? en : es;
  const isDO = isDominicanTenant(tenant);
  const locale = isDO ? "es-DO" : "en-US";
  const currency = isDO ? "DOP" : "USD";
  const taxLabel = getTaxLabel(tenant);

  const [registers, setRegisters] = useState([]);
  const [closures, setClosures] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    cashRegisterId: "",
    dateFrom: "",
    dateTo: "",
  });

  const t = (path, fallback = "") => {
    const value = path
      .split(".")
      .reduce((acc, key) => acc?.[key], dictionary);

    return value || fallback || path;
  };

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

    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  };

  const loadRegisters = async () => {
    const { data } = await api.get("/pos/cash-registers");
    setRegisters(data || []);
  };

  const loadClosures = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (filters.cashRegisterId) {
        params.append("cashRegisterId", filters.cashRegisterId);
      }

      if (filters.dateFrom) {
        params.append("dateFrom", filters.dateFrom);
      }

      if (filters.dateTo) {
        params.append("dateTo", filters.dateTo);
      }

      const { data } = await api.get(
        `/pos/sessions/closures?${params.toString()}`
      );

      setClosures(data || []);
    } catch (error) {
      alert(
        error.response?.data?.message ||
          t("pos.cashSessionReports.messages.loadError")
      );
    } finally {
      setLoading(false);
    }
  };

  const openReport = async (sessionId) => {
    try {
      const { data } = await api.get(`/pos/sessions/${sessionId}/report`);
      setSelectedReport(data);
    } catch (error) {
      alert(
        error.response?.data?.message ||
          t("pos.cashSessionReports.messages.openReportError")
      );
    }
  };

  useEffect(() => {
    loadRegisters();
    loadClosures();
  }, []);

  const totals = closures.reduce(
    (acc, session) => {
      acc.totalSales += Number(session.totalSales || 0);
      acc.difference += Number(session.difference || 0);
      acc.expected += Number(session.expectedAmount || 0);
      acc.closed += Number(session.closingAmount || 0);
      return acc;
    },
    { totalSales: 0, difference: 0, expected: 0, closed: 0 }
  );

  return (
    <div className="pos-page">
      <section className="pos-header">
        <div>
          <span>{t("pos.cashSessionReports.eyebrow")}</span>
          <h2>{t("pos.cashSessionReports.title")}</h2>
          <p>{t("pos.cashSessionReports.description")}</p>
        </div>
      </section>

      <section className="pos-summary-grid">
        <article className="pos-summary-card">
          <span>{t("pos.cashSessionReports.stats.closures")}</span>
          <strong>{closures.length}</strong>
        </article>

        <article className="pos-summary-card">
          <span>{t("pos.cashSessionReports.stats.totalSold")}</span>
          <strong>{money.format(totals.totalSales)}</strong>
        </article>

        <article className="pos-summary-card">
          <span>{t("pos.cashSessionReports.stats.expectedCash")}</span>
          <strong>{money.format(totals.expected)}</strong>
        </article>

        <article className="pos-summary-card">
          <span>{t("pos.cashSessionReports.stats.totalDifference")}</span>
          <strong>{money.format(totals.difference)}</strong>
        </article>
      </section>

      <section className="pos-panel">
        <div className="pos-filters">
          <div>
            <label>{t("pos.cashSessionReports.filters.cashRegister")}</label>
            <select
              value={filters.cashRegisterId}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  cashRegisterId: e.target.value,
                }))
              }
            >
              <option value="">{t("pos.cashSessionReports.filters.all")}</option>
              {registers.map((register) => (
                <option key={register.id} value={register.id}>
                  {register.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>{t("pos.cashSessionReports.filters.from")}</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
              }
            />
          </div>

          <div>
            <label>{t("pos.cashSessionReports.filters.to")}</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
              }
            />
          </div>

          <button type="button" className="primary-btn" onClick={loadClosures}>
            <Filter size={17} />
            {t("pos.cashSessionReports.filters.filter")}
          </button>
        </div>
      </section>

      <section className="pos-panel">
        {loading ? (
          <p>{t("pos.cashSessionReports.messages.loading")}</p>
        ) : closures.length === 0 ? (
          <p>{t("pos.cashSessionReports.messages.empty")}</p>
        ) : (
          <>
            <div className="pos-table-wrap cash-closures-desktop">
              <table className="pos-table">
                <thead>
                  <tr>
                    <th>{t("pos.cashSessionReports.table.closure")}</th>
                    <th>{t("pos.cashSessionReports.table.cashRegister")}</th>
                    <th>{t("pos.cashSessionReports.table.user")}</th>
                    <th>{t("pos.cashSessionReports.table.opening")}</th>
                    <th>{t("pos.cashSessionReports.table.expected")}</th>
                    <th>{t("pos.cashSessionReports.table.counted")}</th>
                    <th>{t("pos.cashSessionReports.table.difference")}</th>
                    <th>{t("pos.cashSessionReports.table.totalSold")}</th>
                    <th>{t("pos.cashSessionReports.table.actions")}</th>
                  </tr>
                </thead>

                <tbody>
                  {closures.map((session) => (
                    <tr key={session.id}>
                      <td>
                        <strong>{formatDate(session.closedAt)}</strong>
                      </td>
                      <td>{session.cashRegister?.name || "-"}</td>
                      <td>{session.user?.name || "-"}</td>
                      <td>{money.format(Number(session.openingAmount || 0))}</td>
                      <td>{money.format(Number(session.expectedAmount || 0))}</td>
                      <td>{money.format(Number(session.closingAmount || 0))}</td>
                      <td>
                        <strong>
                          {money.format(Number(session.difference || 0))}
                        </strong>
                      </td>
                      <td>
                        <strong>
                          {money.format(Number(session.totalSales || 0))}
                        </strong>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="table-icon-btn"
                          onClick={() => openReport(session.id)}
                          title={t("pos.cashSessionReports.table.viewReport")}
                        >
                          <Eye size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="cash-closures-mobile">
              {closures.map((session) => (
                <button
                  type="button"
                  key={session.id}
                  className="cash-closure-card"
                  onClick={() => openReport(session.id)}
                >
                  <div className="cash-closure-top">
                    <div>
                      <span>{t("pos.cashSessionReports.mobile.cashClosure")}</span>
                      <strong>
                        {session.cashRegister?.name ||
                          t("pos.cashSessionReports.mobile.cashRegisterFallback")}
                      </strong>
                    </div>

                    <small>{formatDate(session.closedAt)}</small>
                  </div>

                  <div className="cash-closure-user">
                    <span>{t("pos.cashSessionReports.mobile.user")}</span>
                    <strong>{session.user?.name || "-"}</strong>
                  </div>

                  <div className="cash-closure-grid">
                    <div>
                      <span>{t("pos.cashSessionReports.mobile.totalSold")}</span>
                      <strong>{money.format(Number(session.totalSales || 0))}</strong>
                    </div>

                    <div>
                      <span>{t("pos.cashSessionReports.mobile.difference")}</span>
                      <strong>{money.format(Number(session.difference || 0))}</strong>
                    </div>
                  </div>

                  <div className="cash-closure-footer">
                    <span>
                      {t("pos.cashSessionReports.mobile.counted")}{" "}
                      {money.format(Number(session.closingAmount || 0))}
                    </span>
                    <strong>{t("pos.cashSessionReports.mobile.viewReport")}</strong>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {selectedReport && (
        <div
          className="pos-modal-backdrop"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="pos-sale-detail-modal pos-report-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pos-sale-detail-header no-print">
              <div>
                <span>{t("pos.cashSessionReports.report.modalTitle")}</span>
                <h3>
                  {selectedReport.session.cashRegister?.name ||
                    t("pos.cashSessionReports.report.cashRegister")}
                </h3>
                <p>
                  {formatDate(selectedReport.session.openedAt)} -{" "}
                  {formatDate(selectedReport.session.closedAt)}
                </p>
              </div>

              <button type="button" onClick={() => setSelectedReport(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="cash-report-print">
              <div className="cash-report-title">
                <h2>{t("pos.cashSessionReports.report.title")}</h2>
                <p>
                  {t("pos.cashSessionReports.report.cashRegister")}:{" "}
                  {selectedReport.session.cashRegister?.name || "-"}
                </p>
                <p>
                  {t("pos.cashSessionReports.report.user")}:{" "}
                  {selectedReport.session.user?.name || "-"}
                </p>
                <p>
                  {t("pos.cashSessionReports.report.opening")}:{" "}
                  {formatDate(selectedReport.session.openedAt)}
                </p>
                <p>
                  {t("pos.cashSessionReports.report.closure")}:{" "}
                  {formatDate(selectedReport.session.closedAt)}
                </p>
              </div>

              <div className="pos-summary-grid">
                <article className="pos-summary-card">
                  <span>{t("pos.cashSessionReports.report.openingAmount")}</span>
                  <strong>
                    {money.format(Number(selectedReport.summary.openingAmount || 0))}
                  </strong>
                </article>

                <article className="pos-summary-card">
                  <span>{t("pos.cashSessionReports.report.expectedCash")}</span>
                  <strong>
                    {money.format(Number(selectedReport.summary.expectedAmount || 0))}
                  </strong>
                </article>

                <article className="pos-summary-card">
                  <span>{t("pos.cashSessionReports.report.counted")}</span>
                  <strong>
                    {money.format(Number(selectedReport.summary.closingAmount || 0))}
                  </strong>
                </article>

                <article className="pos-summary-card">
                  <span>{t("pos.cashSessionReports.report.difference")}</span>
                  <strong>
                    {money.format(Number(selectedReport.summary.difference || 0))}
                  </strong>
                </article>
              </div>

              <div className="pos-sale-detail-info">
                <div>
                  <span>{t("pos.cashSessionReports.report.sales")}</span>
                  <strong>{selectedReport.summary.salesCount}</strong>
                </div>

                <div>
                  <span>{t("pos.cashSessionReports.report.soldProducts")}</span>
                  <strong>{selectedReport.summary.itemsCount}</strong>
                </div>

                <div>
                  <span>{t("pos.cashSessionReports.report.subtotal")}</span>
                  <strong>
                    {money.format(Number(selectedReport.summary.subtotal || 0))}
                  </strong>
                </div>

                <div>
                  <span>{t("pos.cashSessionReports.report.discounts")}</span>
                  <strong>
                    {money.format(Number(selectedReport.summary.discountTotal || 0))}
                  </strong>
                </div>

                <div>
                  <span>{taxLabel}</span>
                  <strong>
                    {money.format(Number(selectedReport.summary.taxTotal || 0))}
                  </strong>
                </div>

                <div>
                  <span>{t("pos.cashSessionReports.report.totalSold")}</span>
                  <strong>
                    {money.format(Number(selectedReport.summary.totalSales || 0))}
                  </strong>
                </div>

                <div>
                  <span>{t("pos.cashSessionReports.report.cash")}</span>
                  <strong>
                    {money.format(Number(selectedReport.summary.cashSales || 0))}
                  </strong>
                </div>

                <div>
                  <span>{t("pos.cashSessionReports.report.card")}</span>
                  <strong>
                    {money.format(Number(selectedReport.summary.cardSales || 0))}
                  </strong>
                </div>

                <div>
                  <span>{t("pos.cashSessionReports.report.transfer")}</span>
                  <strong>
                    {money.format(Number(selectedReport.summary.transferSales || 0))}
                  </strong>
                </div>

                <div>
                  <span>{t("pos.cashSessionReports.report.check")}</span>
                  <strong>
                    {money.format(Number(selectedReport.summary.checkSales || 0))}
                  </strong>
                </div>
              </div>

              <div className="pos-table-wrap cash-report-sales-desktop">
                <table className="pos-table">
                  <thead>
                    <tr>
                      <th>{t("pos.cashSessionReports.report.time")}</th>
                      <th>{t("pos.cashSessionReports.report.sale")}</th>
                      <th>{t("pos.cashSessionReports.report.method")}</th>
                      <th>{t("pos.cashSessionReports.report.subtotal")}</th>
                      <th>{taxLabel}</th>
                      <th>{t("pos.cashSessionReports.report.total")}</th>
                    </tr>
                  </thead>

                  <tbody>
                    {(selectedReport.sales || []).map((sale) => (
                      <tr key={sale.id}>
                        <td>{formatDate(sale.createdAt)}</td>
                        <td>{sale.saleNumber}</td>
                        <td>{sale.paymentMethod}</td>
                        <td>{money.format(Number(sale.subtotal || 0))}</td>
                        <td>{money.format(Number(sale.taxTotal || 0))}</td>
                        <td>
                          <strong>{money.format(Number(sale.total || 0))}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="cash-report-sales-mobile">
                {(selectedReport.sales || []).map((sale) => (
                  <div className="cash-report-sale-card" key={sale.id}>
                    <div className="cash-report-sale-top">
                      <div>
                        <span>{t("pos.cashSessionReports.report.sale")}</span>
                        <strong>{sale.saleNumber}</strong>
                      </div>

                      <small>{formatDate(sale.createdAt)}</small>
                    </div>

                    <div className="cash-report-sale-grid">
                      <div>
                        <span>{t("pos.cashSessionReports.report.method")}</span>
                        <strong>{sale.paymentMethod}</strong>
                      </div>

                      <div>
                        <span>{t("pos.cashSessionReports.report.subtotal")}</span>
                        <strong>{money.format(Number(sale.subtotal || 0))}</strong>
                      </div>

                      <div>
                        <span>{taxLabel}</span>
                        <strong>{money.format(Number(sale.taxTotal || 0))}</strong>
                      </div>

                      <div>
                        <span>{t("pos.cashSessionReports.report.total")}</span>
                        <strong>{money.format(Number(sale.total || 0))}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="primary-btn no-print"
              onClick={() => window.print()}
            >
              <Printer size={17} />
              {t("pos.cashSessionReports.report.print")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}