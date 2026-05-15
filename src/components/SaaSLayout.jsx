import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  BarChart3,
  FileText,
  Package,
  Truck,
  CreditCard,
  LogOut,
  Menu,
  Search,
  Bell,
  AlertTriangle,
  Settings,
  ChevronDown,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/axios";

export default function SaaSLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);

  const settingsRef = useRef(null);
  const sidebarMenusRef = useRef(null);

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
      to: "/dashboard/inventario",
      label: "Inventario",
      icon: Package,
      roles: ["master", "admin"],
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
      `${import.meta.env.VITE_API_URL}/notifications/stream`,
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target)
      ) {
        setSettingsOpen(false);
      }

      if (
        sidebarMenusRef.current &&
        !sidebarMenusRef.current.contains(event.target)
      ) {
        setOpenMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
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
          <NavLink
            to="/dashboard"
            end
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              isActive ? "sidebar-link active" : "sidebar-link"
            }
          >
            <BarChart3 size={20} />
            <span>Dashboard</span>
          </NavLink>

          <div ref={sidebarMenusRef}>
            {/* FACTURACIÓN */}

            <div className="sidebar-group">
              <button
                type="button"
                className="sidebar-group-btn"
                onClick={() =>
                  setOpenMenu((prev) =>
                    prev === "billing" ? null : "billing"
                  )
                }
              >
                <span className="sidebar-group-left">
                  <FileText size={20} />
                  <span>Facturación</span>
                </span>

                <ChevronDown
                  size={16}
                  className={openMenu === "billing" ? "rotate-180" : ""}
                />
              </button>

              {openMenu === "billing" && (
                <div className="sidebar-submenu">
                  <NavLink
                    to="/dashboard/facturacion"
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      isActive
                        ? "sidebar-sublink active"
                        : "sidebar-sublink"
                    }
                  >
                    Facturas
                  </NavLink>

                  <NavLink
                    to="/dashboard/cotizaciones"
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      isActive
                        ? "sidebar-sublink active"
                        : "sidebar-sublink"
                    }
                  >
                    Cotizaciones
                  </NavLink>

                  {(user?.role === "master" ||
                    user?.role === "admin") && (
                    <NavLink
                      to="/dashboard/recibos"
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        isActive
                          ? "sidebar-sublink active"
                          : "sidebar-sublink"
                      }
                    >
                      Recibos
                    </NavLink>
                  )}
                </div>
              )}
            </div>

            {/* OPERACIONES */}

            <div className="sidebar-group">
              <button
                type="button"
                className="sidebar-group-btn"
                onClick={() =>
                  setOpenMenu((prev) =>
                    prev === "operations" ? null : "operations"
                  )
                }
              >
                <span className="sidebar-group-left">
                  <Truck size={20} />
                  <span>Operaciones</span>
                </span>

                <ChevronDown
                  size={16}
                  className={openMenu === "operations" ? "rotate-180" : ""}
                />
              </button>

              {openMenu === "operations" && (
                <div className="sidebar-submenu">
                  <NavLink
                    to="/dashboard/conduces"
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      isActive
                        ? "sidebar-sublink active"
                        : "sidebar-sublink"
                    }
                  >
                    Conduces
                  </NavLink>

                  <NavLink
                    to="/dashboard/ordenes-compra"
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      isActive
                        ? "sidebar-sublink active"
                        : "sidebar-sublink"
                    }
                  >
                    Órdenes de compra
                  </NavLink>

                  <NavLink
                    to="/dashboard/proveedores"
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      isActive
                        ? "sidebar-sublink active"
                        : "sidebar-sublink"
                    }
                  >
                    Proveedores
                  </NavLink>
                </div>
              )}
            </div>

            {/* CONTABILIDAD */}

            <div className="sidebar-group">
              <button
                type="button"
                className="sidebar-group-btn"
                onClick={() =>
                  setOpenMenu((prev) =>
                    prev === "accounting" ? null : "accounting"
                  )
                }
              >
                <span className="sidebar-group-left">
                  <CreditCard size={20} />
                  <span>Contabilidad</span>
                </span>

                <ChevronDown
                  size={16}
                  className={openMenu === "accounting" ? "rotate-180" : ""}
                />
              </button>

              {openMenu === "accounting" && (
                <div className="sidebar-submenu">
                  <NavLink
                    to="/dashboard/contabilidad"
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      isActive
                        ? "sidebar-sublink active"
                        : "sidebar-sublink"
                    }
                  >
                    Resumen contable
                  </NavLink>

                  <NavLink
                    to="/dashboard/contabilidad/cuentas-por-cobrar"
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      isActive
                        ? "sidebar-sublink active"
                        : "sidebar-sublink"
                    }
                  >
                    Cuentas por cobrar
                  </NavLink>

                  <NavLink
                    to="/dashboard/contabilidad/cuentas-por-pagar"
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      isActive
                        ? "sidebar-sublink active"
                        : "sidebar-sublink"
                    }
                  >
                    Cuentas por pagar
                  </NavLink>

                  <NavLink
                    to="/dashboard/contabilidad/gastos"
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      isActive
                        ? "sidebar-sublink active"
                        : "sidebar-sublink"
                    }
                  >
                    Gastos
                  </NavLink>

                  <NavLink
                    to="/dashboard/contabilidad/reportes"
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      isActive
                        ? "sidebar-sublink active"
                        : "sidebar-sublink"
                    }
                  >
                    Reportes
                  </NavLink>
                </div>
              )}
            </div>
          </div>

          {links
            .filter(
              (item) =>
                item.roles.includes(user?.role) &&
                item.to !== "/dashboard"
            )
            .map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    isActive
                      ? "sidebar-link active"
                      : "sidebar-link"
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
            <div className="avatar">
              {user?.name?.charAt(0) || "U"}
            </div>

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
          <button
            className="mobile-menu"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>

          <button
            className="sidebar-ribbon-btn"
            onClick={toggleSidebar}
            title={
              sidebarCollapsed
                ? "Mostrar menú"
                : "Ocultar menú"
            }
          >
            {sidebarCollapsed ? (
                <PanelLeftOpen size={18} />
              ) : (
                <PanelLeftClose size={18} />
              )}
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
                onClick={() =>
                  setNotificationsOpen(!notificationsOpen)
                }
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
                      <div
                        className="notification-item"
                        key={index}
                      >
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

            <div
              className="settings-wrapper"
              ref={settingsRef}
            >
              <button
                className="icon-btn settings-btn"
                onClick={() =>
                  setSettingsOpen(!settingsOpen)
                }
                title="Configuración"
              >
                <Settings size={20} />
              </button>

              {settingsOpen && (
                <div className="settings-dropdown">
                  <div className="settings-header">
                    <strong>Configuración</strong>
                    <span>{user?.role || "Usuario"}</span>
                  </div>

                  {(user?.role === "master" ||
                    user?.role === "admin") && (
                    <button
                      className="settings-item"
                      onClick={() => {
                        setSettingsOpen(false);
                        navigate(
                          "/dashboard/facturacion/billing"
                        );
                      }}
                    >
                      <CreditCard size={18} />

                      <div>
                        <strong>
                          Plan y suscripción
                        </strong>

                        <span>
                          Gestionar pagos y plan actual
                        </span>
                      </div>

                      <ChevronDown size={16} />
                    </button>
                  )}

                  {user?.role === "master" && (
                    <button
                      className="settings-item"
                      onClick={() => {
                        setSettingsOpen(false);
                        navigate("/dashboard/usuarios");
                      }}
                    >
                      <Users size={18} />

                      <div>
                        <strong>Usuarios</strong>

                        <span>
                          Administrar accesos del equipo
                        </span>
                      </div>

                      <ChevronDown size={16} />
                    </button>
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
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}