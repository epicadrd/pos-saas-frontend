import { useEffect, useMemo, useState } from "react";
import { Eye, Filter, Receipt, Search, X } from "lucide-react";
import { api } from "../../api/axios";
import PosReceipt from "../../components/PosReceipt";
import { useAuth } from "../../context/AuthContext";
import es from "../../i18n/locales/es.json";
import en from "../../i18n/locales/en.json";
import { isDominicanTenant } from "../../utils/taxConfig";
import "../../styles/pos.css";

export default function PosSales() {
  const { tenant, language } = useAuth();

  const dictionary = language === "en" ? en : es;
  const isDO = isDominicanTenant(tenant);
  const locale = isDO ? "es-DO" : "en-US";
  const currency = isDO ? "DOP" : "USD";

  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState(null);
  const [registers, setRegisters] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [receiptSale, setReceiptSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    cashRegisterId: "",
    paymentMethod: "all",
  });

  const t = (path, fallback = "") => {
    const value = path
      .split(".")
      .reduce((acc, key) => acc?.[key], dictionary);

    return value || fallback || path;
  };

  const paymentLabels = {
    cash: t("pos.salesPage.payment.cash"),
    card: t("pos.salesPage.payment.card"),
    transfer: t("pos.salesPage.payment.transfer"),
    check: t("pos.salesPage.payment.check"),
    mixed: t("pos.salesPage.payment.mixed"),
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

  const loadSales = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);
      if (filters.cashRegisterId) {
        params.append("cashRegisterId", filters.cashRegisterId);
      }

      if (filters.paymentMethod && filters.paymentMethod !== "all") {
        params.append("paymentMethod", filters.paymentMethod);
      }

      const { data } = await api.get(`/pos/sales?${params.toString()}`);

      setSales(data.sales || []);
      setSummary(data.summary || null);
    } catch (error) {
      alert(
        error.response?.data?.message ||
          t("pos.salesPage.messages.loadError")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegisters();
    loadSales();
  }, []);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const applyFilters = (event) => {
    event.preventDefault();
    loadSales();
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      cashRegisterId: "",
      paymentMethod: "all",
    });

    setTimeout(() => {
      loadSales();
    }, 0);
  };

  const openDetail = async (saleId) => {
    try {
      setDetailLoading(true);
      const { data } = await api.get(`/pos/sales/${saleId}`);
      setSelectedSale(data);
    } catch (error) {
      alert(
        error.response?.data?.message ||
          t("pos.salesPage.messages.detailError")
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const openReceipt = async (saleId) => {
    const { data } = await api.get(`/pos/sales/${saleId}`);
    setReceiptSale(data);
  };

  return (
    <div className="pos-page">
      <section className="pos-header">
        <div>
          <span>{t("pos.salesPage.eyebrow")}</span>
          <h2>{t("pos.salesPage.title")}</h2>
          <p>{t("pos.salesPage.description")}</p>
        </div>
      </section>

      <section className="pos-summary-grid">
        <article className="pos-summary-card">
          <span>{t("pos.salesPage.stats.sales")}</span>
          <strong>{summary?.salesCount || 0}</strong>
        </article>

        <article className="pos-summary-card">
          <span>{t("pos.salesPage.stats.totalSold")}</span>
          <strong>{money.format(Number(summary?.total || 0))}</strong>
        </article>

        <article className="pos-summary-card">
          <span>{t("pos.salesPage.stats.cash")}</span>
          <strong>
            {money.format(Number(summary?.byPaymentMethod?.cash || 0))}
          </strong>
        </article>

        <article className="pos-summary-card">
          <span>{t("pos.salesPage.stats.card")}</span>
          <strong>
            {money.format(Number(summary?.byPaymentMethod?.card || 0))}
          </strong>
        </article>

        <article className="pos-summary-card">
          <span>{t("pos.salesPage.stats.transfer")}</span>
          <strong>
            {money.format(Number(summary?.byPaymentMethod?.transfer || 0))}
          </strong>
        </article>
      </section>

      <form className="pos-panel pos-sales-filters" onSubmit={applyFilters}>
        <div>
          <label>{t("pos.salesPage.filters.from")}</label>
          <input
            type="date"
            name="dateFrom"
            value={filters.dateFrom}
            onChange={handleFilterChange}
          />
        </div>

        <div>
          <label>{t("pos.salesPage.filters.to")}</label>
          <input
            type="date"
            name="dateTo"
            value={filters.dateTo}
            onChange={handleFilterChange}
          />
        </div>

        <div>
          <label>{t("pos.salesPage.filters.cashRegister")}</label>
          <select
            name="cashRegisterId"
            value={filters.cashRegisterId}
            onChange={handleFilterChange}
          >
            <option value="">
              {t("pos.salesPage.filters.allCashRegisters")}
            </option>
            {registers.map((register) => (
              <option key={register.id} value={register.id}>
                {register.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>{t("pos.salesPage.filters.method")}</label>
          <select
            name="paymentMethod"
            value={filters.paymentMethod}
            onChange={handleFilterChange}
          >
            <option value="all">{t("pos.salesPage.filters.all")}</option>
            <option value="cash">{paymentLabels.cash}</option>
            <option value="card">{paymentLabels.card}</option>
            <option value="transfer">{paymentLabels.transfer}</option>
            <option value="check">{paymentLabels.check}</option>
            <option value="mixed">{paymentLabels.mixed}</option>
          </select>
        </div>

        <button type="submit" className="primary-btn">
          <Filter size={17} />
          {t("pos.salesPage.filters.filter")}
        </button>

        <button type="button" className="danger-btn" onClick={clearFilters}>
          <X size={17} />
          {t("pos.salesPage.filters.clear")}
        </button>
      </form>

      <section className="pos-panel">
        {loading ? (
          <p>{t("pos.salesPage.messages.loading")}</p>
        ) : sales.length === 0 ? (
          <div className="pos-empty-state">
            <Search size={28} />
            <p>{t("pos.salesPage.messages.empty")}</p>
          </div>
        ) : (
          <div className="pos-table-wrap pos-sales-desktop-list">
            <table className="pos-sales-table">
              <thead>
                <tr>
                  <th>{t("pos.salesPage.table.date")}</th>
                  <th>{t("pos.salesPage.table.sale")}</th>
                  <th>{t("pos.salesPage.table.cashRegister")}</th>
                  <th>{t("pos.salesPage.table.user")}</th>
                  <th>{t("pos.salesPage.table.method")}</th>
                  <th>{t("pos.salesPage.table.total")}</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{formatDate(sale.createdAt)}</td>
                    <td>{sale.saleNumber}</td>
                    <td>{sale.cashRegister?.name || "-"}</td>
                    <td>{sale.user?.name || "-"}</td>
                    <td>
                      {paymentLabels[sale.paymentMethod] || sale.paymentMethod}
                    </td>
                    <td>
                      <strong>{money.format(Number(sale.total || 0))}</strong>
                    </td>
                    <td>
                      <div className="pos-table-actions">
                        <button
                          type="button"
                          className="table-icon-btn"
                          onClick={() => openDetail(sale.id)}
                          disabled={detailLoading}
                          title={t("pos.salesPage.table.viewDetail")}
                        >
                          <Eye size={17} />
                        </button>

                        <button
                          type="button"
                          className="table-icon-btn"
                          onClick={() => openReceipt(sale.id)}
                          title={t("pos.salesPage.table.reprintTicket")}
                        >
                          <Receipt size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
              <div className="pos-sales-mobile-list">
  {!loading &&
    sales.map((sale) => (
      <button
        type="button"
        key={sale.id}
        className="pos-sale-mobile-card"
        onClick={() => openDetail(sale.id)}
        disabled={detailLoading}
      >
        <div className="pos-sale-mobile-top">
          <div>
            <span>{t("pos.salesPage.table.sale")}</span>
            <strong>{sale.saleNumber}</strong>
          </div>

          <strong>{money.format(Number(sale.total || 0))}</strong>
        </div>

        <div className="pos-sale-mobile-grid">
          <div>
            <span>{t("pos.salesPage.table.cashRegister")}</span>
            <strong>{sale.cashRegister?.name || "-"}</strong>
          </div>

          <div>
            <span>{t("pos.salesPage.table.method")}</span>
            <strong>
              {paymentLabels[sale.paymentMethod] || sale.paymentMethod}
            </strong>
          </div>
        </div>

        <div className="pos-sale-mobile-footer">
          <span>{formatDate(sale.createdAt)}</span>

          <button
            type="button"
            className="pos-sale-ticket-btn"
            onClick={(event) => {
              event.stopPropagation();
              openReceipt(sale.id);
            }}
          >
            <Receipt size={16} />
            {t("pos.salesPage.table.reprintTicket")}
          </button>
        </div>
      </button>
    ))}
</div>
      </section>

      {selectedSale && (
        <div
          className="pos-modal-backdrop"
          onClick={() => setSelectedSale(null)}
        >
          <div
            className="pos-sale-detail-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pos-sale-detail-header">
              <div>
                <span>{t("pos.salesPage.detail.title")}</span>
                <h3>{selectedSale.saleNumber}</h3>
                <p>{formatDate(selectedSale.createdAt)}</p>
              </div>

              <button type="button" onClick={() => setSelectedSale(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="pos-sale-detail-info">
              <div>
                <span>{t("pos.salesPage.detail.cashRegister")}</span>
                <strong>{selectedSale.cashRegister?.name || "-"}</strong>
              </div>

              <div>
                <span>{t("pos.salesPage.detail.user")}</span>
                <strong>{selectedSale.user?.name || "-"}</strong>
              </div>

              <div>
                <span>{t("pos.salesPage.detail.method")}</span>
                <strong>
                  {paymentLabels[selectedSale.paymentMethod] ||
                    selectedSale.paymentMethod}
                </strong>
              </div>

              <div>
                <span>{t("pos.salesPage.detail.total")}</span>
                <strong>{money.format(Number(selectedSale.total || 0))}</strong>
              </div>
            </div>

            <div className="pos-sale-items">
              <h4>{t("pos.salesPage.detail.soldProducts")}</h4>

              {selectedSale.items?.map((item) => (
                <div className="pos-sale-item-row" key={item.id}>
                  <div>
                    <strong>{item.productName}</strong>
                    <span>
                      {item.quantity} x{" "}
                      {money.format(Number(item.unitPrice || 0))}
                    </span>
                  </div>

                  <strong>{money.format(Number(item.total || 0))}</strong>
                </div>
              ))}
            </div>

            <div className="pos-sale-detail-total">
              <span>{t("pos.salesPage.detail.total")}</span>
              <strong>{money.format(Number(selectedSale.total || 0))}</strong>
            </div>

            <button
              type="button"
              className="primary-btn"
              onClick={() => setReceiptSale(selectedSale)}
            >
              <Receipt size={17} />
              {t("pos.salesPage.detail.printTicket")}
            </button>
          </div>
        </div>
      )}

      {receiptSale && (
        <PosReceipt sale={receiptSale} onClose={() => setReceiptSale(null)} />
      )}
    </div>
  );
}