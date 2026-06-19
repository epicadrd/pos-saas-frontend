import { useEffect, useState } from "react";
import "../../styles/ActivityLog.css";
import { Activity, RefreshCcw } from "lucide-react";
import { api } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import es from "../../i18n/locales/es.json";
import en from "../../i18n/locales/en.json";

export default function ActivityLog() {
  const { language } = useAuth();

  const dictionary = language === "en" ? en : es;

  const t = (path, fallback = "") => {
    const value = path
      .split(".")
      .reduce((acc, key) => acc?.[key], dictionary);

    return value || fallback || path;
  };

  const locale = language === "en" ? "en-US" : "es-DO";

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/activity-logs");
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      alert(error.response?.data?.message || t("activityLog.messages.loadError"));
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
          <span>{t("activityLog.header.eyebrow")}</span>
          <h1>{t("activityLog.header.title")}</h1>
          <p>{t("activityLog.header.description")}</p>
        </div>

        <button onClick={loadLogs} className="qb-secondary-btn">
          <RefreshCcw size={16} />
          {t("activityLog.header.refresh")}
        </button>
      </div>

      <div className="activity-card">
        {loading ? (
          <div className="activity-empty">{t("activityLog.messages.loading")}</div>
        ) : logs.length === 0 ? (
          <div className="activity-empty">{t("activityLog.messages.empty")}</div>
        ) : (
          logs.map((log) => (
            <div className="activity-item" key={log.id}>
              <div className="activity-icon">
                <Activity size={18} />
              </div>

              <div>
                <strong>{log.description}</strong>
                <p>
                  {log.user?.name || t("activityLog.common.system")} ·{" "}
                  {new Date(log.createdAt).toLocaleString(locale)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}