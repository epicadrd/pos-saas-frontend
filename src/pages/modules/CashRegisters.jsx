import { useEffect, useState } from "react";
import { Plus, Save } from "lucide-react";
import { api } from "../../api/axios";
import "../../styles/pos.css";

export default function CashRegisters() {
  const [registers, setRegisters] = useState([]);
  const [name, setName] = useState("");
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

  useEffect(() => {
    loadRegisters();
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

  return (
    <div className="pos-page">
      <section className="pos-header">
        <div>
          <span>POS / Caja</span>
          <h2>Cajas</h2>
          <p>Crea las cajas que usará cada punto de venta.</p>
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
                </div>

                <button
                  type="button"
                  className={register.isActive ? "danger-btn" : "primary-btn"}
                  onClick={() => toggleRegister(register)}
                >
                  <Save size={16} />
                  {register.isActive ? "Desactivar" : "Activar"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}