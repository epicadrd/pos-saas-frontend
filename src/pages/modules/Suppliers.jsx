import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
  X,
  Ban, // 🔥 agrégalo aquí
} from "lucide-react";
import { api } from "../../api/axios";
import { useConfirm } from "../../components/ConfirmProvider";


const emptyForm = {
  name: "",
  rnc: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

export default function Suppliers() {
  const { confirm } = useConfirm();
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/suppliers");
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (error) {
      alert(error.response?.data?.message || "Error cargando proveedores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const text = `${supplier.name || ""} ${supplier.rnc || ""} ${
        supplier.phone || ""
      } ${supplier.email || ""}`.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && supplier.isActive !== false) ||
        (statusFilter === "inactive" && supplier.isActive === false);

      return matchesSearch && matchesStatus;
    });
  }, [suppliers, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: suppliers.length,
      active: suppliers.filter((s) => s.isActive !== false).length,
      inactive: suppliers.filter((s) => s.isActive === false).length,
      withRnc: suppliers.filter((s) => s.rnc).length,
    };
  }, [suppliers]);

  const openCreateModal = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEditModal = (supplier) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name || "",
      rnc: supplier.rnc || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      notes: supplier.notes || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const saveSupplier = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("El nombre del proveedor es obligatorio");
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        await api.put(`/suppliers/${editingId}`, form);
      } else {
        await api.post("/suppliers", form);
      }

      closeModal();
      await loadSuppliers();
    } catch (error) {
      alert(error.response?.data?.message || "Error guardando proveedor");
    } finally {
      setSaving(false);
    }
  };

  const deactivateSupplier = async (supplier) => {
    const ok = await confirm({
      title: "Desactivar proveedor",
      message: `¿Desactivar proveedor "${supplier.name}"?`,
      confirmText: "Desactivar",
      variant: "danger",
    });

    if (!ok) return;

    try {
      await api.delete(`/suppliers/${supplier.id}`);
      await loadSuppliers();
    } catch (error) {
      alert(error.response?.data?.message || "Error desactivando proveedor");
    }
  };

  const reactivateSupplier = async (supplier) => {
    try {
      await api.put(`/suppliers/${supplier.id}`, {
        ...supplier,
        isActive: true,
      });
      await loadSuppliers();
    } catch (error) {
      alert(error.response?.data?.message || "Error reactivando proveedor");
    }
  };

    const toggleSupplier = async (supplier) => {
    await api.patch(`/suppliers/${supplier.id}/toggle`);
    loadSuppliers();
};

    const deleteSupplier = async (supplier) => {
    const ok = await confirm({
      title: "Eliminar proveedor",
      message: "Esto eliminará el proveedor permanentemente. Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      variant: "danger",
    });

    if (!ok) return;

    await api.delete(`/suppliers/${supplier.id}`);
    loadSuppliers();
    };

  return (
    <div className="quote-page">
      <section className="quote-header">
        <div>
          <span>Proveedores</span>
          <h2>Gestión de proveedores</h2>
          <p>
            Registra suplidores, datos fiscales y contactos para futuras órdenes
            de compra.
          </p>
        </div>

        <button className="primary-btn" onClick={openCreateModal}>
          <Plus size={18} />
          Nuevo proveedor
        </button>
      </section>

      <section className="quote-stats">
        <div className="quote-stat-card">
          <div className="stat-icon">
            <Users size={22} />
          </div>
          <div>
            <span>Total proveedores</span>
            <strong>{stats.total}</strong>
          </div>
        </div>

        <div className="quote-stat-card">
          <div className="stat-icon">
            <CheckCircle size={22} />
          </div>
          <div>
            <span>Activos</span>
            <strong>{stats.active}</strong>
          </div>
        </div>

        <div className="quote-stat-card">
          <div className="stat-icon">
            <Building2 size={22} />
          </div>
          <div>
            <span>Con RNC</span>
            <strong>{stats.withRnc}</strong>
          </div>
        </div>

        <div className="quote-stat-card">
          <div className="stat-icon">
            <X size={22} />
          </div>
          <div>
            <span>Inactivos</span>
            <strong>{stats.inactive}</strong>
          </div>
        </div>
      </section>

      <section className="quote-panel">
        <div className="quote-toolbar">
          <div>
            <h3>Listado de proveedores</h3>
            <p>Busca, edita, desactiva o reactiva proveedores.</p>
          </div>

          <div className="quote-toolbar-actions">
            <select
              className="quote-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="all">Todos</option>
            </select>

            <div className="quote-search">
              <Search size={18} />
              <input
                placeholder="Buscar proveedor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="quote-table-wrap">
          <table className="quote-table">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>RNC</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="table-empty">
                    Cargando proveedores...
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty">
                    No hay proveedores registrados.
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td>
                      <div className="quote-number-cell">
                        <div className="quote-icon">
                          <Building2 size={18} />
                        </div>
                        <div>
                          <strong>{supplier.name}</strong>
                          {supplier.address && <small>{supplier.address}</small>}
                        </div>
                      </div>
                    </td>

                    <td>{supplier.rnc || "-"}</td>

                    <td>
                      {supplier.phone ? (
                        <span>
                          <Phone size={14} /> {supplier.phone}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td>
                      {supplier.email ? (
                        <span>
                          <Mail size={14} /> {supplier.email}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td>
                      <span
                        className={
                          supplier.isActive === false
                            ? "badge danger"
                            : "badge ok"
                        }
                      >
                        {supplier.isActive === false ? "Inactivo" : "Activo"}
                      </span>
                    </td>

                    <td>
                      <div className="table-actions quote-actions">
                        <button
                            title="Editar"
                            onClick={() => openEditModal(supplier)}
                        >
                            <Pencil size={16} />
                        </button>

                        <button
                            title={supplier.isActive ? "Inhabilitar" : "Reactivar"}
                            onClick={() => toggleSupplier(supplier)}
                        >
                            {supplier.isActive ? <Ban size={16} /> : <CheckCircle size={16} />}
                        </button>

                        <button
                            className="danger-btn"
                            title="Eliminar definitivamente"
                            onClick={() => deleteSupplier(supplier)}
                        >
                            <Trash2 size={16} />
                        </button>
                        </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && (
        <div className="modal-overlay">
          <div className="quote-modal">
            <div className="modal-header">
              <div>
                <span>{editingId ? "Editar proveedor" : "Nuevo proveedor"}</span>
                <h3>{editingId ? "Actualizar proveedor" : "Registrar proveedor"}</h3>
              </div>

              <button onClick={closeModal} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveSupplier} className="quote-form">
              <div className="quote-form-grid">
                <div className="form-row">
                  <label>Nombre *</label>
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    placeholder="Nombre del proveedor"
                  />
                </div>

                <div className="form-row">
                  <label>RNC</label>
                  <input
                    value={form.rnc}
                    onChange={(e) => setForm({ ...form, rnc: e.target.value })}
                    placeholder="RNC o identificación fiscal"
                  />
                </div>

                <div className="form-row">
                  <label>Teléfono</label>
                  <input
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    placeholder="809-000-0000"
                  />
                </div>

                <div className="form-row">
                  <label>Email</label>
                  <input
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="proveedor@email.com"
                  />
                </div>

                <div className="form-row full">
                  <label>Dirección</label>
                  <textarea
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                    placeholder="Dirección del proveedor"
                  />
                </div>

                <div className="form-row full">
                  <label>Notas</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    placeholder="Condiciones, contacto interno, observaciones..."
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="cancel-btn">
                  Cancelar
                </button>

                <button disabled={saving} className="primary-btn">
                  {saving
                    ? "Guardando..."
                    : editingId
                    ? "Guardar cambios"
                    : "Crear proveedor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}