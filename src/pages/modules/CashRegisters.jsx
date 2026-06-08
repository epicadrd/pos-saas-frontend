import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Users } from "lucide-react";
import { api } from "../../api/axios";
import "../../styles/pos.css";

export default function CashRegisters() {
  const [registers, setRegisters] = useState([]);
  const [users, setUsers] = useState([]);
  const [name, setName] = useState("");
  const [selectedRegister, setSelectedRegister] = useState(null);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRegisters = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/pos/cash-registers");
      setRegisters(data || []);
    } catch (error) {
      alert(error.response?.data?.message || "No se pudieron cargar las cajas");
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
      alert("Coloca el nombre de la caja");
      return;
    }

    try {
      await api.post("/pos/cash-registers", { name });
      setName("");
      loadRegisters();
    } catch (error) {
      alert(error.response?.data?.message || "No se pudo crear la caja");
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
      alert(error.response?.data?.message || "No se pudo actualizar la caja");
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
      alert(error.response?.data?.message || "No se pudieron asignar los usuarios");
    }
  };

  const assignedLabel = useMemo(() => {
    if (!selectedUserIds.length) return "Ningún usuario asignado";
    return `${selectedUserIds.length} usuario(s) asignado(s)`;
  }, [selectedUserIds]);

  return (
    <div className="pos-page">
      <section className="pos-header">
        <div>
          <span>POS / Caja</span>
          <h2>Cajas</h2>
          <p>Crea cajas y asigna cuáles usuarios pueden abrirlas.</p>
        </div>
      </section>

      <form className="pos-panel pos-form" onSubmit={createRegister}>
        <input
          placeholder="Ej: Caja Principal"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button className="primary-btn" type="submit">
          <Plus size={17} />
          Crear caja
        </button>
      </form>

      <section className="pos-panel">
        {loading ? (
          <p>Cargando cajas...</p>
        ) : registers.length === 0 ? (
          <p>No hay cajas creadas.</p>
        ) : (
          <div className="cash-register-grid">
            {registers.map((register) => (
              <article className="cash-register-card" key={register.id}>
                <div>
                  <span>{register.code}</span>
                  <h3>{register.name}</h3>
                  <p>{register.isActive ? "Activa" : "Inactiva"}</p>
                  <small>
                    {(register.assignedUsers || []).length} usuario(s) asignado(s)
                  </small>
                </div>

                <div className="cash-register-actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => openAssignmentModal(register)}
                  >
                    <Users size={16} />
                    Usuarios
                  </button>

                  <button
                    type="button"
                    className={register.isActive ? "danger-btn" : "primary-btn"}
                    onClick={() => toggleRegister(register)}
                  >
                    <Save size={16} />
                    {register.isActive ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedRegister && (
        <div className="pos-modal-backdrop" onClick={() => setSelectedRegister(null)}>
          <div className="pos-sale-detail-modal" onClick={(event) => event.stopPropagation()}>
            <div className="pos-sale-detail-header">
              <div>
                <span>Asignar usuarios</span>
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
                    <span>{user.email} · {user.role}</span>
                  </div>
                </label>
              ))}
            </div>

            <button type="button" className="primary-btn charge-btn" onClick={saveAssignments}>
              Guardar asignaciones
            </button>
          </div>
        </div>
      )}
    </div>
  );
}