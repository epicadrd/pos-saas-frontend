import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Users } from "lucide-react";
import { api } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import es from "../../i18n/locales/es.json";
import en from "../../i18n/locales/en.json";
import "../../styles/pos.css";

export default function CashRegisters() {
  const { language } = useAuth();
  const dictionary = language === "en" ? en : es;

  const [registers, setRegisters] = useState([]);
  const [users, setUsers] = useState([]);
  const [name, setName] = useState("");
  const [selectedRegister, setSelectedRegister] = useState(null);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loading, setLoading] = useState(true);

  const t = (path, fallback = "", vars = {}) => {
    let value = path
      .split(".")
      .reduce((acc, key) => acc?.[key], dictionary);

    value = value || fallback || path;

    Object.entries(vars).forEach(([key, val]) => {
      value = value.replace(`{{${key}}}`, val);
    });

    return value;
  };

  const loadRegisters = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/pos/cash-registers");
      setRegisters(data || []);
    } catch (error) {
      alert(error.response?.data?.message || t("pos.cashRegistersPage.errors.load"));
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data } = await api.get("/pos/users");
      setUsers(data || []);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    loadRegisters();
    loadUsers();
  }, []);

  const createRegister = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      alert(t("pos.cashRegistersPage.errors.nameRequired"));
      return;
    }

    try {
      await api.post("/pos/cash-registers", { name });
      setName("");
      loadRegisters();
    } catch (error) {
      alert(error.response?.data?.message || t("pos.cashRegistersPage.errors.create"));
    }
  };

  const toggleRegister = async (register) => {
    try {
      await api.put(`/pos/cash-registers/${register.id}`, {
        name: register.name,
        isActive: !register.isActive,
      });

      loadRegisters();
    } catch (error) {
      alert(error.response?.data?.message || t("pos.cashRegistersPage.errors.update"));
    }
  };

  const openAssignmentModal = (register) => {
    setSelectedRegister(register);
    setSelectedUserIds((register.assignedUsers || []).map((user) => user.id));
  };

  const toggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const saveAssignments = async () => {
    if (!selectedRegister) return;

    try {
      await api.put(`/pos/cash-registers/${selectedRegister.id}/users`, {
        userIds: selectedUserIds,
      });

      setSelectedRegister(null);
      setSelectedUserIds([]);
      loadRegisters();
    } catch (error) {
      alert(error.response?.data?.message || t("pos.cashRegistersPage.errors.assign"));
    }
  };

  const assignedLabel = useMemo(() => {
    if (!selectedUserIds.length) {
      return t("pos.cashRegistersPage.noAssignedUsers");
    }

    return t("pos.cashRegistersPage.assignedUsers", "", {
      count: selectedUserIds.length,
    });
  }, [selectedUserIds, language]);

  return (
    <div className="pos-page">
      <section className="pos-header">
        <div>
          <span>{t("pos.cashRegistersPage.eyebrow")}</span>
          <h2>{t("pos.cashRegistersPage.title")}</h2>
          <p>{t("pos.cashRegistersPage.description")}</p>
        </div>
      </section>

      <form className="pos-panel pos-form" onSubmit={createRegister}>
        <input
          placeholder={t("pos.cashRegistersPage.placeholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button className="primary-btn" type="submit">
          <Plus size={17} />
          {t("pos.cashRegistersPage.create")}
        </button>
      </form>

      <section className="pos-panel">
        {loading ? (
          <p>{t("pos.cashRegistersPage.loading")}</p>
        ) : registers.length === 0 ? (
          <p>{t("pos.cashRegistersPage.empty")}</p>
        ) : (
          <div className="cash-register-grid">
            {registers.map((register) => (
              <article className="cash-register-card" key={register.id}>
                <div>
                  <span>{register.code}</span>
                  <h3>{register.name}</h3>
                  <p>
                    {register.isActive
                      ? t("pos.cashRegistersPage.active")
                      : t("pos.cashRegistersPage.inactive")}
                  </p>
                  <small>
                    {t("pos.cashRegistersPage.assignedUsers", "", {
                      count: (register.assignedUsers || []).length,
                    })}
                  </small>
                </div>

                <div className="cash-register-actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => openAssignmentModal(register)}
                  >
                    <Users size={16} />
                    {t("pos.cashRegistersPage.users")}
                  </button>

                  <button
                    type="button"
                    className={register.isActive ? "danger-btn" : "primary-btn"}
                    onClick={() => toggleRegister(register)}
                  >
                    <Save size={16} />
                    {register.isActive
                      ? t("pos.cashRegistersPage.deactivate")
                      : t("pos.cashRegistersPage.activate")}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedRegister && (
        <div className="pos-modal-backdrop" onClick={() => setSelectedRegister(null)}>
          <div
            className="pos-sale-detail-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pos-sale-detail-header">
              <div>
                <span>{t("pos.cashRegistersPage.assignUsers")}</span>
                <h3>{selectedRegister.name}</h3>
                <p>{assignedLabel}</p>
              </div>

              <button type="button" onClick={() => setSelectedRegister(null)}>
                ×
              </button>
            </div>

            <div className="cash-user-list">
              {users.map((user) => (
                <label className="cash-user-row" key={user.id}>
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(user.id)}
                    onChange={() => toggleUser(user.id)}
                  />

                  <div>
                    <strong>{user.name}</strong>
                    <span>
                      {user.email} · {user.role}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            <button
              type="button"
              className="primary-btn charge-btn"
              onClick={saveAssignments}
            >
              {t("pos.cashRegistersPage.saveAssignments")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}