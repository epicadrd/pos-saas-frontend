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
import "../../styles/UsersManagement.css";
import { useConfirm } from "../../components/ConfirmProvider";

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "employee",
};

export default function UsersManagement() {
  const { user } = useAuth();
  const { confirm } = useConfirm();
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
      alert(error.response?.data?.message || "Error cargando usuarios");
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
      alert("Completa nombre, correo y contraseña");
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
      alert(error.response?.data?.message || "Error creando usuario");
    } finally {
      setSaving(false);
    }
  };

  const deactivateUser = async (selectedUser) => {
    if (selectedUser.role === "master") {
      alert("No puedes desactivar el usuario master");
      return;
    }

    const ok = await confirm({
      title: "Desactivar usuario",
      message: `¿Seguro que deseas desactivar a ${selectedUser.name}?`,
      confirmText: "Desactivar",
      variant: "danger",
    });

    if (!ok) return;

    try {
      await api.patch(`/users/${selectedUser.id}/deactivate`);
      await loadUsers();
    } catch (error) {
      alert(error.response?.data?.message || "Error desactivando usuario");
    }
  };

  if (user?.role !== "master") {
    return (
      <section className="users-page">
        <div className="users-denied">
          <ShieldCheck size={42} />
          <h2>Acceso restringido</h2>
          <p>Solo el usuario master puede gestionar usuarios.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="users-page">
      <div className="users-header">
        <div>
          <span className="users-kicker">Equipo</span>
          <h1>Usuarios</h1>
          <p>Crea administradores y empleados para esta empresa.</p>
        </div>

        <button className="users-primary-btn" onClick={() => setModalOpen(true)}>
          <Plus size={18} />
          Nuevo usuario
        </button>
      </div>

      <div className="users-stats">
        <div className="users-stat-card">
          <Users size={22} />
          <div>
            <strong>{stats.total}</strong>
            <span>Total usuarios</span>
          </div>
        </div>

        <div className="users-stat-card">
          <UserCheck size={22} />
          <div>
            <strong>{stats.active}</strong>
            <span>Activos</span>
          </div>
        </div>

        <div className="users-stat-card">
          <ShieldCheck size={22} />
          <div>
            <strong>{stats.admins}</strong>
            <span>Admins</span>
          </div>
        </div>

        <div className="users-stat-card">
          <Users size={22} />
          <div>
            <strong>{stats.employees}</strong>
            <span>Employees</span>
          </div>
        </div>
      </div>

      <div className="users-table-card">
        <div className="users-table-head">
          <h3>Miembros del equipo</h3>

          <button className="users-secondary-btn" onClick={loadUsers}>
            <RefreshCcw size={16} />
            Actualizar
          </button>
        </div>

        {loading ? (
          <div className="users-empty">Cargando usuarios...</div>
        ) : users.length === 0 ? (
          <div className="users-empty">No hay usuarios creados.</div>
        ) : (
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Creado</th>
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
                        {item.role}
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
                        {item.isActive === false ? "Inactivo" : "Activo"}
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
                          Desactivar
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
                <h2>Nuevo usuario</h2>
                <p>Solo puedes crear admin o employee.</p>
              </div>

              <button onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="users-form">
              <label>
                Nombre
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="Ej: María López"
                />
              </label>

              <label>
                Correo
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  placeholder="usuario@empresa.com"
                />
              </label>

              <label>
                Contraseña temporal
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="Mínimo recomendado 8 caracteres"
                />
              </label>

              <label>
                Rol
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value })
                  }
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </label>

              <div className="users-modal-actions">
                <button
                  type="button"
                  className="users-secondary-btn"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="users-primary-btn"
                  disabled={saving}
                >
                  {saving ? "Guardando..." : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}