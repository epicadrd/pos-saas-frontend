import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronRight,
  FileText,
  Mail,
  Pencil,
  Plus,
  Search,
  UserX,
  Users,
} from "lucide-react";
import { api } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../components/ConfirmProvider";
import CustomerFormModal from "../../components/CustomerFormModal";

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase() || "?";

export default function Customers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { confirm } = useConfirm();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [modalCustomer, setModalCustomer] = useState(null);

  const canDeactivate = ["master", "admin"].includes(user?.role);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/customers", { params: { status } })
      .then(({ data }) => {
        if (cancelled) return;
        setCustomers(data || []);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.message || t("customers.messages.loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [status, reloadKey, t]);

  const loadCustomers = () => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  const changeStatus = (value) => {
    setLoading(true);
    setStatus(value);
  };

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;

    return customers.filter((customer) =>
      [customer.name, customer.rnc, customer.phone, customer.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [customers, search]);

  const stats = useMemo(
    () => ({
      total: customers.length,
      withRnc: customers.filter((customer) => customer.rnc).length,
      withEmail: customers.filter((customer) => customer.email).length,
    }),
    [customers]
  );

  const openProfile = (customer) => {
    navigate(`/dashboard/clientes/${customer.id}`);
  };

  const handleDeactivate = async (customer) => {
    const ok = await confirm({
      title: t("customers.confirm.deactivateTitle"),
      message: t("customers.confirm.deactivateMessage", { name: customer.name }),
      confirmText: t("customers.confirm.deactivateButton"),
      variant: "danger",
    });

    if (!ok) return;

    try {
      await api.delete(`/customers/${customer.id}`);
      loadCustomers();
    } catch (err) {
      setError(err.response?.data?.message || t("customers.messages.saveError"));
    }
  };

  const handleSaved = () => {
    setModalCustomer(null);
    loadCustomers();
  };

  const renderActions = (customer) => (
    <div className="table-actions" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        title={t("customers.actions.edit")}
        onClick={() => setModalCustomer(customer)}
      >
        <Pencil size={16} />
      </button>

      {canDeactivate && customer.isActive && (
        <button
          type="button"
          className="danger-btn"
          title={t("customers.actions.deactivate")}
          onClick={() => handleDeactivate(customer)}
        >
          <UserX size={16} />
        </button>
      )}

      <button
        type="button"
        title={t("customers.actions.viewProfile")}
        onClick={() => openProfile(customer)}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );

  return (
    <div className="customers-page">
      <section className="page-header customers-header">
        <div>
          <span>{t("customers.eyebrow")}</span>
          <h2>{t("customers.title")}</h2>
          <p>{t("customers.subtitle")}</p>
        </div>

        <button
          type="button"
          className="primary-btn"
          onClick={() => setModalCustomer({})}
        >
          <Plus size={18} />
          {t("customers.newCustomer")}
        </button>
      </section>

      <section className="customers-stats">
        <div className="customers-stat-card">
          <div className="stat-icon">
            <Users size={20} />
          </div>
          <div>
            <span>{t("customers.stats.total")}</span>
            <strong>{stats.total}</strong>
          </div>
        </div>

        <div className="customers-stat-card">
          <div className="stat-icon">
            <FileText size={20} />
          </div>
          <div>
            <span>{t("customers.stats.withRnc")}</span>
            <strong>{stats.withRnc}</strong>
          </div>
        </div>

        <div className="customers-stat-card">
          <div className="stat-icon">
            <Mail size={20} />
          </div>
          <div>
            <span>{t("customers.stats.withEmail")}</span>
            <strong>{stats.withEmail}</strong>
          </div>
        </div>
      </section>

      <section className="customers-panel">
        <div className="customers-toolbar">
          <label className="customers-search">
            <Search size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("customers.searchPlaceholder")}
            />
          </label>

          <select
            className="customers-filter"
            value={status}
            onChange={(e) => changeStatus(e.target.value)}
          >
            <option value="active">{t("customers.filters.active")}</option>
            <option value="inactive">{t("customers.filters.inactive")}</option>
            <option value="all">{t("customers.filters.all")}</option>
          </select>
        </div>

        {error && <div className="customers-error">{error}</div>}

        {loading ? (
          <div className="customers-empty">{t("customers.loading")}</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="customers-empty">{t("customers.empty")}</div>
        ) : (
          <>
            <div className="customers-table-wrap">
              <table className="customers-table">
                <thead>
                  <tr>
                    <th>{t("customers.table.customer")}</th>
                    <th>{t("customers.table.rnc")}</th>
                    <th>{t("customers.table.phone")}</th>
                    <th>{t("customers.table.email")}</th>
                    <th>{t("customers.table.status")}</th>
                    <th>{t("customers.table.actions")}</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} onClick={() => openProfile(customer)}>
                      <td>
                        <div className="customers-person">
                          <span className="customers-avatar">
                            {getInitials(customer.name)}
                          </span>
                          <strong>{customer.name}</strong>
                        </div>
                      </td>
                      <td>{customer.rnc || "—"}</td>
                      <td>{customer.phone || "—"}</td>
                      <td>{customer.email || "—"}</td>
                      <td>
                        <span className={`badge ${customer.isActive ? "ok" : "neutral"}`}>
                          {customer.isActive
                            ? t("customers.status.active")
                            : t("customers.status.inactive")}
                        </span>
                      </td>
                      <td>{renderActions(customer)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="customers-mobile-list">
              {filteredCustomers.map((customer) => (
                <button
                  type="button"
                  key={customer.id}
                  className="customers-mobile-card"
                  onClick={() => openProfile(customer)}
                >
                  <span className="customers-avatar">{getInitials(customer.name)}</span>
                  <div>
                    <strong>{customer.name}</strong>
                    <small>
                      {[customer.rnc, customer.phone].filter(Boolean).join(" · ") ||
                        customer.email ||
                        "—"}
                    </small>
                  </div>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {modalCustomer && (
        <CustomerFormModal
          customer={modalCustomer.id ? modalCustomer : null}
          onClose={() => setModalCustomer(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
