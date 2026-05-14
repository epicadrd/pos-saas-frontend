import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  BarChart3,
  FileText,
  Package,
  ClipboardList,
  Truck,
  ReceiptText,
  CreditCard,
  LogOut,
  Menu,
  Search,
  Bell,
  AlertTriangle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/axios";
import { Users } from "lucide-react";

export default function SaaSLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const { user, tenant, logout } = useAuth();
  const navigate = useNavigate();

const links = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: BarChart3,
    end: true,
    roles: ["master", "admin", "employee"],
  },
  {
    to: "/dashboard/facturacion",
    label: "Facturación",
    icon: FileText,
    roles: ["master", "admin", "employee"],
  },
  {
    to: "/dashboard/facturacion/billing",
    label: "Plan y suscripción",
    icon: CreditCard,
    roles: ["master", "admin"],
  },
  {
    to: "/dashboard/inventario",
    label: "Inventario",
    icon: Package,
    roles: ["master", "admin"],
  },
  {
    to: "/dashboard/cotizaciones",
    label: "Cotizaciones",
    icon: ClipboardList,
    roles: ["master", "admin", "employee"],
  },
  {
    to: "/dashboard/conduces",
    label: "Conduces",
    icon: Truck,
    roles: ["master", "admin"],
  },
  {
    to: "/dashboard/recibos",
    label: "Recibos",
    icon: ReceiptText,
    roles: ["master", "admin"],
  },
  {
    to: "/dashboard/ordenes-compra",
    label: "Orden de compra",
    icon: CreditCard,
    roles: ["master", "admin"],
  },
  {
    to: "/dashboard/proveedores",
    label: "Proveedores",
    icon: Users,
    roles: ["master", "admin"],
  },
  {
    to: "/dashboard/usuarios",
    label: "Usuarios",
    icon: Users,
    roles: ["master"],
  },
];

  const loadNotifications = async () => {
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data);
    } catch (error) {
      console.log("Error cargando notificaciones:", error);
    }
  };

  useEffect(() => {
  loadNotifications();

  const eventSource = new EventSource(
    "http://localhost:8080/api/notifications/stream",
    {
      withCredentials: true,
    }
  );

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    setNotifications(data);
  };

  eventSource.onerror = () => {
    console.log("Reconectando notificaciones...");
  };

  return () => {
    eventSource.close();
  };
}, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
  return localStorage.getItem("sidebarCollapsed") === "true";
  });

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", newState);
  };

  return (
    <div className={`saas-shell ${sidebarCollapsed ? "collapsed" : ""}`}>
      <aside className={`saas-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <BarChart3 size={24} />
          </div>
          <div>
            <h2>Corex</h2>
            <span>Business</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {links
            .filter((item) => item.roles.includes(user?.role))
            .map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    isActive ? "sidebar-link active" : "sidebar-link"
                  }
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-mini">
            <div className="avatar">{user?.name?.charAt(0) || "U"}</div>
            <div>
              <strong>{user?.name || "Usuario"}</strong>
              <span>{user?.role || "Admin"}</span>
            </div>
          </div>

          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="saas-main">
        <header className="saas-topbar">
          <button className="mobile-menu" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>

          <button
            className="sidebar-ribbon-btn"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? "Mostrar menú" : "Ocultar menú"}
          >
            {sidebarCollapsed ? "❯" : "❮"}
          </button>

          <div>
            <h1>{tenant?.businessName || "Mi empresa"}</h1>
            <p>Panel administrativo</p>
          </div>

          <div className="topbar-actions">
            <div className="search-box">
              <Search size={18} />
              <input placeholder="Buscar..." />
            </div>

            <div className="notification-wrapper">
              <button
                className="icon-btn notification-btn"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="notification-count">
                    {notifications.length}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <strong>Notificaciones</strong>
                    <span>{notifications.length}</span>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="notification-empty">
                      No hay alertas por ahora.
                    </div>
                  ) : (
                    notifications.map((item, index) => (
                      <div className="notification-item" key={index}>
                        <div className="notification-icon">
                          <AlertTriangle size={17} />
                        </div>

                        <div>
                          <strong>Stock bajo</strong>
                          <p>{item.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="saas-content">
          <Outlet />
        </main>
      </div>

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}