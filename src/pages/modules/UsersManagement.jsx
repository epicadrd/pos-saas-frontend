import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Users,
  ShieldCheck,
  UserCheck,
  Ban,
  RefreshCcw,
  X,
} from "lucide-react";
import { api } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import es from "../../i18n/locales/es.json";
import en from "../../i18n/locales/en.json";
import "../../styles/UsersManagement.css";
import { useConfirm } from "../../components/ConfirmProvider";

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "employee",
};

export default function UsersManagement() {
  const { user, language } = useAuth();
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

  const getRoleLabel = (role) => {
    const labels = {
      master: t("usersManagement.roles.master"),
      admin: t("usersManagement.roles.admin"),
      employee: t("usersManagement.roles.employee"),
    };

    return labels[role] || role;
  };

  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/users");
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      alert(
        error.response?.data?.message ||
          t("usersManagement.messages.loadError")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.isActive !== false).length,
      admins: users.filter((u) => u.role === "admin").length,
      employees: users.filter((u) => u.role === "employee").length,
    };
  }, [users]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      alert(t("usersManagement.messages.required"));
      return;
    }

    try {
      setSaving(true);

      await api.post("/users", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });

      setForm(emptyForm);
      setModalOpen(false);
      await loadUsers();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          t("usersManagement.messages.createError")
      );
    } finally {
      setSaving(false);
    }
  };

  const deactivateUser = async (selectedUser) => {
    if (selectedUser.role === "master") {
      alert(t("usersManagement.messages.cannotDeactivateMaster"));
      return;
    }

    const ok = await confirm({
      title: t("usersManagement.confirm.deactivateTitle"),
      message: t("usersManagement.confirm.deactivateMessage", "", {
        name: selectedUser.name,
      }),
      confirmText: t("usersManagement.confirm.deactivateButton"),
      variant: "danger",
    });

    if (!ok) return;

    try {
      await api.patch(`/users/${selectedUser.id}/deactivate`);
      await loadUsers();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          t("usersManagement.messages.deactivateError")
      );
    }
  };

  if (user?.role !== "master") {
    return (
      <section className="users-page">
        <div className="users-denied">
          <ShieldCheck size={42} />
          <h2>{t("usersManagement.accessDenied.title")}</h2>
          <p>{t("usersManagement.accessDenied.description")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="users-page">
      <div className="users-header">
        <div>
          <span className="users-kicker">
            {t("usersManagement.header.eyebrow")}
          </span>
          <h1>{t("usersManagement.header.title")}</h1>
          <p>{t("usersManagement.header.description")}</p>
        </div>

        <button className="users-primary-btn" onClick={() => setModalOpen(true)}>
          <Plus size={18} />
          {t("usersManagement.header.new")}
        </button>
      </div>

      <div className="users-stats">
        <div className="users-stat-card">
          <Users size={22} />
          <div>
            <strong>{stats.total}</strong>
            <span>{t("usersManagement.stats.total")}</span>
          </div>
        </div>

        <div className="users-stat-card">
          <UserCheck size={22} />
          <div>
            <strong>{stats.active}</strong>
            <span>{t("usersManagement.stats.active")}</span>
          </div>
        </div>

        <div className="users-stat-card">
          <ShieldCheck size={22} />
          <div>
            <strong>{stats.admins}</strong>
            <span>{t("usersManagement.stats.admins")}</span>
          </div>
        </div>

        <div className="users-stat-card">
          <Users size={22} />
          <div>
            <strong>{stats.employees}</strong>
            <span>{t("usersManagement.stats.employees")}</span>
          </div>
        </div>
      </div>

      <div className="users-table-card">
        <div className="users-table-head">
          <h3>{t("usersManagement.table.title")}</h3>

          <button className="users-secondary-btn" onClick={loadUsers}>
            <RefreshCcw size={16} />
            {t("usersManagement.table.refresh")}
          </button>
        </div>

        {loading ? (
          <div className="users-empty">
            {t("usersManagement.messages.loading")}
          </div>
        ) : users.length === 0 ? (
          <div className="users-empty">
            {t("usersManagement.messages.empty")}
          </div>
        ) : (
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>{t("usersManagement.table.user")}</th>
                  <th>{t("usersManagement.table.email")}</th>
                  <th>{t("usersManagement.table.role")}</th>
                  <th>{t("usersManagement.table.status")}</th>
                  <th>{t("usersManagement.table.created")}</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {users.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="users-person">
                        <div className="users-avatar">
                          {item.name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <strong>{item.name}</strong>
                          <span>ID #{item.id}</span>
                        </div>
                      </div>
                    </td>

                    <td>{item.email}</td>

                    <td>
                      <span className={`users-role ${item.role}`}>
                        {getRoleLabel(item.role)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={
                          item.isActive === false
                            ? "users-status inactive"
                            : "users-status active"
                        }
                      >
                        {item.isActive === false
                          ? t("usersManagement.status.inactive")
                          : t("usersManagement.status.active")}
                      </span>
                    </td>

                    <td>
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString()
                        : "-"}
                    </td>

                    <td className="users-actions">
                      {item.role !== "master" && item.isActive !== false && (
                        <button
                          className="users-danger-btn"
                          onClick={() => deactivateUser(item)}
                        >
                          <Ban size={15} />
                          {t("usersManagement.actions.deactivate")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="users-modal-overlay">
          <div className="users-modal">
            <div className="users-modal-head">
              <div>
                <h2>{t("usersManagement.modal.title")}</h2>
                <p>{t("usersManagement.modal.description")}</p>
              </div>

              <button onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="users-form">
              <label>
                {t("usersManagement.fields.name")}
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder={t("usersManagement.placeholders.name")}
                />
              </label>

              <label>
                {t("usersManagement.fields.email")}
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  placeholder={t("usersManagement.placeholders.email")}
                />
              </label>

              <label>
                {t("usersManagement.fields.password")}
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder={t("usersManagement.placeholders.password")}
                />
              </label>

              <label>
                {t("usersManagement.fields.role")}
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value })
                  }
                >
                  <option value="employee">
                    {t("usersManagement.roles.employee")}
                  </option>
                  <option value="admin">
                    {t("usersManagement.roles.admin")}
                  </option>
                </select>
              </label>

              <div className="users-modal-actions">
                <button
                  type="button"
                  className="users-secondary-btn"
                  onClick={() => setModalOpen(false)}
                >
                  {t("usersManagement.actions.cancel")}
                </button>

                <button
                  type="submit"
                  className="users-primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? t("usersManagement.actions.saving")
                    : t("usersManagement.actions.create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}