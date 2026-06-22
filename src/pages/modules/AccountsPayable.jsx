import { useEffect, useMemo, useState } from "react";
import {
  RefreshCcw,
  Search,
  AlertTriangle,
  Truck,
  WalletCards,
  CalendarClock,
  Eye,
  PackageCheck,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import es from "../../i18n/locales/es.json";
import en from "../../i18n/locales/en.json";
import { isDominicanTenant } from "../../utils/taxConfig";
import { useConfirm } from "../../components/ConfirmProvider";

export default function AccountsPayable() {
  const { tenant, language } = useAuth();
  const navigate = useNavigate();
  const { confirm } = useConfirm();

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
    draft: t("accountsPayable.status.draft"),
    sent: t("accountsPayable.status.sent"),
    received: t("accountsPayable.status.received"),
    cancelled: t("accountsPayable.status.cancelled"),
    paid: t("accountsPayable.status.paid"),
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
    purchaseOrders: [],
    suppliers: [],
  });

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    aging: "",
    supplierId: "",
    from: "",
    to: "",
  });

  const [selectedPayment, setSelectedPayment] = useState(null);

  const summary = data.summary || {};
  const purchaseOrders = data.purchaseOrders || [];
  const suppliers = data.suppliers || [];

  const maxBalance = useMemo(() => {
    return Math.max(
      ...purchaseOrders.map((item) =>
        Number(item.payableBalance || item.total || 0)
      ),
      1
    );
  }, [purchaseOrders]);

  const loadAccountsPayable = async () => {
    try {
      setLoading(true);

      const params = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value)
      );

      const { data } = await api.get("/accounts-payable", {
        params,
      });

      setData(data);
    } catch (error) {
      alert(
        error.response?.data?.message ||
          t("accountsPayable.messages.loadError")
      );
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (order) => {
    const ok = await confirm({
      title: t("accountsPayable.confirm.markPaidTitle"),
      message: t("accountsPayable.confirm.markPaidMessage", "", {
        number: order.orderNumber,
      }),
      confirmText: t("accountsPayable.confirm.markPaidButton"),
      variant: "success",
    });

    if (!ok) return;

    try {
      await api.patch(`/accounts-payable/${order.id}/mark-paid`);
      setSelectedPayment(null);
      await loadAccountsPayable();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          t("accountsPayable.messages.markPaidError")
      );
    }
  };

  useEffect(() => {
    loadAccountsPayable();
  }, []);

  return (
    <div className="accounts-payable-page">
      <section className="ap-hero">
        <div>
          <span>{t("accountsPayable.header.eyebrow")}</span>
          <h2>{t("accountsPayable.header.title")}</h2>
          <p>{t("accountsPayable.header.description")}</p>
        </div>

        <button onClick={loadAccountsPayable}>
          <RefreshCcw size={18} />
          {t("accountsPayable.header.refresh")}
        </button>
      </section>

      <section className="ap-stats-grid">
        <div className="ap-stat main">
          <WalletCards />
          <span>{t("accountsPayable.stats.totalPayable")}</span>
          <strong>{formatMoney(summary.totalPayable)}</strong>
          <small>
            {t("accountsPayable.stats.openOrders", "", {
              count: summary.openOrders || 0,
            })}
          </small>
        </div>

        <div className="ap-stat danger">
          <AlertTriangle />
          <span>{t("accountsPayable.stats.overdue")}</span>
          <strong>{formatMoney(summary.overduePayable)}</strong>
          <small>{t("accountsPayable.stats.overdueHint")}</small>
        </div>

        <div className="ap-stat success">
          <CalendarClock />
          <span>{t("accountsPayable.stats.current")}</span>
          <strong>{formatMoney(summary.currentPayable)}</strong>
          <small>{t("accountsPayable.stats.currentHint")}</small>
        </div>

        <div className="ap-stat">
          <PackageCheck />
          <span>{t("accountsPayable.stats.receivedOrders")}</span>
          <strong>{summary.receivedOrders || 0}</strong>
          <small>{t("accountsPayable.stats.receivedHint")}</small>
        </div>
      </section>

      <section className="ap-panel">
        <div className="ap-filters">
          <div className="ap-search">
            <Search size={17} />
            <input
              placeholder={t("accountsPayable.filters.search")}
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
            value={filters.supplierId}
            onChange={(e) =>
              setFilters({
                ...filters,
                supplierId: e.target.value,
              })
            }
          >
            <option value="">{t("accountsPayable.filters.allSuppliers")}</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) =>
              setFilters({
                ...filters,
                status: e.target.value,
              })
            }
          >
            <option value="">{t("accountsPayable.filters.allStatuses")}</option>
            <option value="sent">{t("accountsPayable.filters.sent")}</option>
            <option value="received">{t("accountsPayable.filters.received")}</option>
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
            <option value="">{t("accountsPayable.filters.allAging")}</option>
            <option value="overdue">{t("accountsPayable.filters.overdue")}</option>
            <option value="current">{t("accountsPayable.filters.current")}</option>
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

          <button onClick={loadAccountsPayable}>
            {t("accountsPayable.filters.filter")}
          </button>
        </div>

        {loading ? (
          <div className="ap-empty">
            {t("accountsPayable.messages.loading")}
          </div>
        ) : purchaseOrders.length === 0 ? (
          <div className="ap-empty">{t("accountsPayable.messages.empty")}</div>
        ) : (
          <div className="ap-table-wrap ap-desktop-list">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>{t("accountsPayable.table.order")}</th>
                  <th>{t("accountsPayable.table.supplier")}</th>
                  <th>{t("accountsPayable.table.date")}</th>
                  <th>{t("accountsPayable.table.due")}</th>
                  <th>{t("accountsPayable.table.total")}</th>
                  <th>{t("accountsPayable.table.balance")}</th>
                  <th>{t("accountsPayable.table.status")}</th>
                  <th>{t("accountsPayable.table.reference")}</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {purchaseOrders.map((order) => (
                  <tr
                    key={order.id}
                    className={order.isOverdue ? "is-overdue" : ""}
                  >
                    <td>
                      <strong>{order.orderNumber}</strong>
                      {order.isOverdue && (
                        <small className="ap-overdue-text">
                          {t("accountsPayable.table.daysOverdue", "", {
                            days: order.daysOverdue,
                          })}
                        </small>
                      )}
                    </td>

                    <td>
                      <strong>
                        {order.supplier?.name || order.supplierName || "—"}
                      </strong>
                      <small>
                        {order.supplier?.phone ||
                          order.supplier?.email ||
                          order.supplierRnc ||
                          "—"}
                      </small>
                    </td>

                    <td>
                      {order.orderDate
                        ? new Date(order.orderDate).toLocaleDateString(locale)
                        : "—"}
                    </td>

                    <td>
                      {order.dueDate
                        ? new Date(order.dueDate).toLocaleDateString(locale)
                        : "—"}
                    </td>

                    <td>{formatMoney(order.total)}</td>

                    <td>
                      <strong>{formatMoney(order.payableBalance)}</strong>
                      <div className="ap-balance-bar">
                        <div
                          style={{
                            width: `${
                              (Number(order.payableBalance || 0) / maxBalance) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </td>

                    <td>
                      <span className={`ap-status ${order.status}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </td>

                    <td>{order.reference || "—"}</td>

                    <td className="ap-actions">
                      <button
                        title={t("accountsPayable.table.viewDetail")}
                        onClick={() => setSelectedPayment(order)}
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        title={t("accountsPayable.table.markPaid")}
                        onClick={() => markAsPaid(order)}
                      >
                        <PackageCheck size={16} />
                      </button>

                      <button
                        title={t("accountsPayable.table.goToExpenses")}
                        onClick={() => navigate("/dashboard/contabilidad/gastos")}
                      >
                        <Truck size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="ap-mobile-list">
  {!loading &&
    purchaseOrders.map((order) => (
      <button
        type="button"
        key={order.id}
        className={`ap-mobile-card ${order.isOverdue ? "is-overdue" : ""}`}
        onClick={() => setSelectedPayment(order)}
      >
        <div className="ap-mobile-top">
          <div>
            <span>{t("accountsPayable.table.order")}</span>
            <strong>{order.orderNumber}</strong>
          </div>

          <span className={`ap-status ${order.status}`}>
            {statusLabels[order.status] || order.status}
          </span>
        </div>

        <div className="ap-mobile-supplier">
          <span>{t("accountsPayable.table.supplier")}</span>
          <strong>
            {order.supplier?.name || order.supplierName || "—"}
          </strong>
        </div>

        <div className="ap-mobile-money-grid">
          <div>
            <span>{t("accountsPayable.table.total")}</span>
            <strong>{formatMoney(order.total)}</strong>
          </div>

          <div>
            <span>{t("accountsPayable.table.balance")}</span>
            <strong>{formatMoney(order.payableBalance)}</strong>
          </div>
        </div>

        {order.isOverdue && (
          <div className="ap-mobile-overdue">
            {t("accountsPayable.table.daysOverdue", "", {
              days: order.daysOverdue,
            })}
          </div>
        )}

        <div className="ap-mobile-footer">
          <span>
            {order.dueDate
              ? new Date(order.dueDate).toLocaleDateString(locale)
              : "—"}
          </span>

          <strong>Ver detalle</strong>
        </div>
      </button>
    ))}
</div>
      </section>

      <section className="ap-grid-two">
        <div className="ap-panel">
          <div className="ap-panel-header">
            <h3>{t("accountsPayable.suppliersPanel.title")}</h3>
            <span>{t("accountsPayable.suppliersPanel.description")}</span>
          </div>

          <div className="ap-list">
            {suppliers.length === 0 ? (
              <div className="ap-empty small">
                {t("accountsPayable.messages.noSuppliers")}
              </div>
            ) : (
              suppliers.slice(0, 8).map((supplier) => (
                <button
                  type="button"
                  className="ap-list-item clickable"
                  key={supplier.id}
                  onClick={() =>
                    setFilters({
                      ...filters,
                      supplierId: String(supplier.id),
                    })
                  }
                >
                  <div>
                    <strong>{supplier.name}</strong>
                    <span>{supplier.rnc || supplier.phone || supplier.email || "—"}</span>
                  </div>

                  <b>{t("accountsPayable.suppliersPanel.filter")}</b>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="ap-panel">
          <div className="ap-panel-header">
            <h3>{t("accountsPayable.recommendation.title")}</h3>
            <span>{t("accountsPayable.recommendation.subtitle")}</span>
          </div>

          <div className="ap-note">
            {t("accountsPayable.recommendation.text")}
          </div>
        </div>
      </section>

      {selectedPayment && (
        <div className="ap-modal-backdrop">
          <div className="ap-modal">
            <div className="ap-modal-header">
              <div>
                <span>{t("accountsPayable.detail.title")}</span>
                <h3>{selectedPayment.orderNumber}</h3>
              </div>

              <button type="button" onClick={() => setSelectedPayment(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="ap-detail-grid">
              <div>
                <span>{t("accountsPayable.detail.supplier")}</span>
                <strong>
                  {selectedPayment.supplier?.name ||
                    selectedPayment.supplierName ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>{t("accountsPayable.detail.rnc")}</span>
                <strong>
                  {selectedPayment.supplier?.rnc ||
                    selectedPayment.supplierRnc ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>{t("accountsPayable.detail.date")}</span>
                <strong>
                  {selectedPayment.orderDate
                    ? new Date(selectedPayment.orderDate).toLocaleDateString(locale)
                    : "—"}
                </strong>
              </div>

              <div>
                <span>{t("accountsPayable.detail.due")}</span>
                <strong>
                  {selectedPayment.dueDate
                    ? new Date(selectedPayment.dueDate).toLocaleDateString(locale)
                    : "—"}
                </strong>
              </div>

              <div>
                <span>{t("accountsPayable.detail.total")}</span>
                <strong>{formatMoney(selectedPayment.total)}</strong>
              </div>

              <div>
                <span>{t("accountsPayable.detail.balance")}</span>
                <strong>{formatMoney(selectedPayment.payableBalance)}</strong>
              </div>

              <div>
                <span>{t("accountsPayable.detail.status")}</span>
                <strong>
                  {statusLabels[selectedPayment.status] || selectedPayment.status}
                </strong>
              </div>

              <div>
                <span>{t("accountsPayable.detail.reference")}</span>
                <strong>{selectedPayment.reference || "—"}</strong>
              </div>
            </div>

            <div className="ap-modal-actions">
              <button type="button" onClick={() => markAsPaid(selectedPayment)}>
                <PackageCheck size={16} />
                {t("accountsPayable.detail.markPaid")}
              </button>

              <button
                type="button"
                className="secondary"
                onClick={() => setSelectedPayment(null)}
              >
                {t("accountsPayable.detail.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}