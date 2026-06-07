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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/axios";

export default function SaaSLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const settingsRef = useRef(null);
  const sidebarMenusRef = useRef(null);

  const [notifications, setNotifications] = useState([]);

  const { user, tenant, logout } = useAuth();
  const navigate = useNavigate();

  const canAccess = (roles = []) => {
  return roles.includes(user?.role);
  };

  const hasVisibleItems = (items = []) => {
    return items.some((item) => canAccess(item.roles));
  };

  const sidebarGroups = [
  {
    key: "billing",
    label: "Facturación",
    icon: FileText,
    items: [
      {
        to: "/dashboard/facturacion",
        label: "Facturas",
        roles: ["master", "admin", "employee"],
      },
      {
        to: "/dashboard/cotizaciones",
        label: "Cotizaciones",
        roles: ["master", "admin", "employee"],
      },
      {
        to: "/dashboard/recibos",
        label: "Recibos",
        roles: ["master", "admin"],
      },
    ],
  },
  {
  key: "inventory",
  label: "Gestión de inventario",
  icon: Package,
  items: [
    {
      to: "/dashboard/inventario",
      label: "Inventario",
      roles: ["master", "admin"],
    },
    {
      to: "/dashboard/conteo-inventario",
      label: "Conteo de inventario",
      roles: ["master", "admin"],
    },
  ],
},
  {
    key: "operations",
    label: "Operaciones",
    icon: Truck,
    items: [
      {
        to: "/dashboard/conduces",
        label: "Conduces",
        roles: ["master", "admin"],
      },
      {
        to: "/dashboard/ordenes-compra",
        label: "Órdenes de compra",
        roles: ["master", "admin"],
      },
      {
        to: "/dashboard/proveedores",
        label: "Proveedores",
        roles: ["master", "admin"],
      },
    ],
  },
  {
    key: "accounting",
    label: "Contabilidad",
    icon: CreditCard,
    items: [
      {
        to: "/dashboard/contabilidad",
        label: "Resumen contable",
        roles: ["master", "admin"],
      },
      {
        to: "/dashboard/contabilidad/cuentas-por-cobrar",
        label: "Cuentas por cobrar",
        roles: ["master", "admin"],
      },
      {
        to: "/dashboard/contabilidad/cuentas-por-pagar",
        label: "Cuentas por pagar",
        roles: ["master", "admin"],
      },
      {
        to: "/dashboard/contabilidad/gastos",
        label: "Gastos",
        roles: ["master", "admin"],
      },
      {
        to: "/dashboard/contabilidad/reportes",
        label: "Reportes",
        roles: ["master", "admin"],
      },
    ],
  },
];

  const moduleSearchItems = [
  {
    label: "Dashboard",
    group: "Inicio",
    path: "/dashboard",
    roles: ["master", "admin", "employee"],
  },
  {
    label: "Facturas",
    group: "Facturación",
    path: "/dashboard/facturacion",
    roles: ["master", "admin", "employee"],
  },
  {
    label: "Cotizaciones",
    group: "Facturación",
    path: "/dashboard/cotizaciones",
    roles: ["master", "admin", "employee"],
  },
  {
    label: "Recibos",
    group: "Facturación",
    path: "/dashboard/recibos",
    roles: ["master", "admin"],
  },
  {
    label: "Inventario",
    group: "Inventario",
    path: "/dashboard/inventario",
    roles: ["master", "admin"],
  },
  {
    label: "Conteo de inventario",
    group: "Gestión de inventario",
    path: "/dashboard/conteo-inventario",
    roles: ["master", "admin"],
  },
  {
    label: "Conduces",
    group: "Operaciones",
    path: "/dashboard/conduces",
    roles: ["master", "admin"],
  },
  {
    label: "Órdenes de compra",
    group: "Operaciones",
    path: "/dashboard/ordenes-compra",
    roles: ["master", "admin"],
  },
  {
    label: "Proveedores",
    group: "Operaciones",
    path: "/dashboard/proveedores",
    roles: ["master", "admin"],
  },
  {
    label: "Resumen contable",
    group: "Contabilidad",
    path: "/dashboard/contabilidad",
    roles: ["master", "admin"],
  },
  {
    label: "Cuentas por cobrar",
    group: "Contabilidad",
    path: "/dashboard/contabilidad/cuentas-por-cobrar",
    roles: ["master", "admin"],
  },
  {
    label: "Cuentas por pagar",
    group: "Contabilidad",
    path: "/dashboard/contabilidad/cuentas-por-pagar",
    roles: ["master", "admin"],
  },
  {
    label: "Gastos",
    group: "Contabilidad",
    path: "/dashboard/contabilidad/gastos",
    roles: ["master", "admin"],
  },
  {
    label: "Reportes",
    group: "Contabilidad",
    path: "/dashboard/contabilidad/reportes",
    roles: ["master", "admin"],
  },
  {
    label: "Plan y suscripción",
    group: "Configuración",
    path: "/dashboard/facturacion/billing",
    roles: ["master"],
  },
  {
    label: "Usuarios",
    group: "Configuración",
    path: "/dashboard/usuarios",
    roles: ["master"],
  },
  {
    label: "Cuenta y configuración",
    group: "Configuración",
    path: "/dashboard/configuracion/cuenta",
    roles: ["master"],
  },
];

  const filteredModules = moduleSearchItems
    .filter((item) => item.roles.includes(user?.role))
    .filter((item) => {
      const term = searchTerm.trim().toLowerCase();

      if (!term) return false;

      return (
        item.label.toLowerCase().includes(term) ||
        item.group.toLowerCase().includes(term)
      );
    })
    .slice(0, 8);

  const goToModule = (path) => {
    setSearchTerm("");
    setSearchOpen(false);
    setSidebarOpen(false);
    navigate(path);
  };

  const links = [
    {
      to: "/dashboard",
      label: "Dashboard",
      icon: BarChart3,
      end: true,
      roles: ["master", "admin", "employee"],
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

  const API_URL = import.meta.env.VITE_API_URL || "https://api.corexrd.com/api";

 /*  useEffect(() => {
    loadNotifications();
    
    const eventSource = new EventSource(`${API_URL}/notifications/stream`, {
      withCredentials: true,
    });

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
  }, []); */

  useEffect(() => {
  loadNotifications();
}, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target)
      ) {
        setSettingsOpen(false);
      }

      // No cerramos los menús del sidebar con clicks fuera,
      // porque al usar el scroll del navegador se cerraban solos.
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
        <button
          className="sidebar-toggle-tab"
          onClick={toggleSidebar}
          title={
            sidebarCollapsed
              ? "Abrir barra de navegación lateral"
              : "Cerrar barra de navegación lateral"
          }
        >
          {sidebarCollapsed ? (
            <ChevronRight size={18} />
          ) : (
            <ChevronLeft size={18} />
          )}
        </button>
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
            {sidebarGroups
              .filter((group) => hasVisibleItems(group.items))
              .map((group) => {
                const Icon = group.icon;

                return (
                  <div className="sidebar-group" key={group.key}>
                    <button
                      type="button"
                      className="sidebar-group-btn"
                      onClick={() =>
                        setOpenMenu((prev) =>
                          prev === group.key ? null : group.key
                        )
                      }
                    >
                      <span className="sidebar-group-left">
                        <Icon size={20} />
                        <span>{group.label}</span>
                      </span>

                      <ChevronDown
                        size={16}
                        className={openMenu === group.key ? "rotate-180" : ""}
                      />
                    </button>

                    {openMenu === group.key && (
                      <div className="sidebar-submenu">
                        {group.items
                          .filter((item) => canAccess(item.roles))
                          .map((item) => (
                            <NavLink
                              key={item.to}
                              to={item.to}
                              onClick={() => setSidebarOpen(false)}
                              className={({ isActive }) =>
                                isActive
                                  ? "sidebar-sublink active"
                                  : "sidebar-sublink"
                              }
                            >
                              {item.label}
                            </NavLink>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
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

          <div>
            <h1>{tenant?.businessName || "Mi empresa"}</h1>
            <p>Panel administrativo</p>
          </div>

          <div className="topbar-actions">
            <div className="search-wrapper">
              <div className="search-box">
                <Search size={18} />
                <input
                  placeholder="Buscar módulo..."
                  value={searchTerm}
                  onFocus={() => setSearchOpen(true)}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setSearchOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && filteredModules.length > 0) {
                      goToModule(filteredModules[0].path);
                    }

                    if (e.key === "Escape") {
                      setSearchOpen(false);
                    }
                  }}
                />
              </div>

              {searchOpen && searchTerm.trim() && (
                <div className="search-suggestions">
                  {filteredModules.length === 0 ? (
                    <div className="search-empty">
                      No encontramos ese módulo.
                    </div>
                  ) : (
                    filteredModules.map((item) => (
                      <button
                        key={item.path}
                        type="button"
                        className="search-suggestion-item"
                        onMouseDown={() => goToModule(item.path)}
                      >
                        <div>
                          <strong>{item.label}</strong>
                          <span>{item.group}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
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

            {user?.role === "master" && (
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

                    <button
                        className="settings-item"
                        onClick={() => {
                          setSettingsOpen(false);
                          navigate("/dashboard/configuracion/cuenta");
                        }}
                      >
                        <Settings size={18} />

                        <div>
                          <strong>Cuenta y configuración</strong>
                          <span>Datos legales y fiscales de la empresa</span>
                        </div>

                        <ChevronDown size={16} />
                    </button>

                    <button
                      className="settings-item"
                      onClick={() => {
                        setSettingsOpen(false);
                        navigate("/dashboard/facturacion/billing");
                      }}
                    >
                      <CreditCard size={18} />

                      <div>
                        <strong>Plan y suscripción</strong>
                        <span>Gestionar pagos y plan actual</span>
                      </div>

                      <ChevronDown size={16} />
                    </button>

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
                        <span>Administrar accesos del equipo</span>
                      </div>

                      <ChevronDown size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}
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