import { useEffect, useState } from "react";
import "../../styles/ActivityLog.css";
import { Activity, RefreshCcw } from "lucide-react";
import { api } from "../../api/axios";

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/activity-logs");
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      alert(error.response?.data?.message || "Error cargando actividad");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <section className="activity-page">
      <div className="activity-header">
        <div>
          <span>Auditoría</span>
          <h1>Actividad del sistema</h1>
          <p>Visualiza las acciones realizadas por los usuarios.</p>
        </div>

        <button onClick={loadLogs} className="qb-secondary-btn">
          <RefreshCcw size={16} />
          Actualizar
        </button>
      </div>

      <div className="activity-card">
        {loading ? (
          <div className="activity-empty">Cargando actividad...</div>
        ) : logs.length === 0 ? (
          <div className="activity-empty">No hay actividad registrada.</div>
        ) : (
          logs.map((log) => (
            <div className="activity-item" key={log.id}>
              <div className="activity-icon">
                <Activity size={18} />
              </div>

              <div>
                <strong>{log.description}</strong>
                <p>
                  {log.user?.name || "Sistema"} ·{" "}
                  {new Date(log.createdAt).toLocaleString("es-DO")}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}