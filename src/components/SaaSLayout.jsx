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
  ShoppingCart,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/axios";
import { hasPlanFeature } from "../utils/plans";
import { useTranslation } from "react-i18next";

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

  const [canUsePos, setCanUsePos] = useState(false);
  const { user, tenant, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const canAccess = (item) => {
  if (!item.roles.includes(user?.role)) return false;

  if (item.feature && !hasPlanFeature(tenant?.plan, item.feature)) {
    return false;
  }

  if (item.requiresCashRegisterAccess && !canUsePos) return false;

  return true;
};
const hasVisibleItems = (items = []) => {
  return items.some((item) => canAccess(item));
};

  const sidebarGroups = [
  {
    key: "billing",
    label: t("layout.billing"),
    icon: FileText,
    items: [
      {
        to: "/dashboard/facturacion",
        label: t("layout.invoices"),
        roles: ["master", "admin", "employee"],
      },
      {
        to: "/dashboard/cotizaciones",
        label: t("layout.quotes"),
        roles: ["master", "admin", "employee"],
      },
      {
        to: "/dashboard/recibos",
        label: t("layout.receipts"),
        roles: ["master", "admin"],
      },
    ],
  },

  {
    key: "inventory",
    label: t("layout.inventoryManagement"),
    icon: Package,
    items: [
      {
        to: "/dashboard/inventario",
        label: t("layout.inventory"),
        roles: ["master", "admin"],
        feature: "inventory",
      },
      {
        to: "/dashboard/conteo-inventario",
        label: t("layout.inventoryCount"),
        roles: ["master", "admin"],
        feature: "inventoryCount",
      },
      {
        to: "/dashboard/catalogo",
        label: t("layout.catalog"),
        roles: ["master", "admin"],
        feature: "catalog",
      },
    ],
  },

  {
    key: "pos",
    label: t("layout.posCash"),
    icon: ShoppingCart,
    items: [
      {
        to: "/dashboard/pos",
        label: t("layout.pos"),
        roles: ["master", "admin", "employee"],
        feature: "pos",
        requiresCashRegisterAccess: true,
      },
      {
        to: "/dashboard/pos/cajas",
        label: t("layout.cashRegisters"),
        roles: ["master"],
        feature: "pos",
      },
      {
        to: "/dashboard/pos/cierres",
        label: t("layout.cashClosings"),
        roles: ["master", "admin"],
        feature: "pos",
      },
      {
        to: "/dashboard/pos/ventas",
        label: t("layout.posSales"),
        roles: ["master", "admin"],
        feature: "pos",
      },
    ],
  },

  {
    key: "operations",
    label: t("layout.operations"),
    icon: Truck,
    items: [
      {
        to: "/dashboard/conduces",
        label: t("layout.deliveryNotes"),
        roles: ["master", "admin"],
        feature: "deliveryNotes",
      },
      {
        to: "/dashboard/ordenes-compra",
        label: t("layout.purchaseOrders"),
        roles: ["master", "admin"],
        feature: "purchaseOrders",
      },
      {
        to: "/dashboard/proveedores",
        label: t("layout.suppliers"),
        roles: ["master", "admin"],
        feature: "suppliers",
      },
    ],
  },

  {
  key: "accounting",
  label: t("layout.accounting"),
  icon: CreditCard,
  items: [
    {
      to: "/dashboard/contabilidad",
      label: t("layout.accountingSummary"),
      roles: ["master", "admin"],
    },
    {
      to: "/dashboard/contabilidad/cuentas-por-cobrar",
      label: t("layout.accountsReceivable"),
      roles: ["master", "admin"],
    },
    {
      to: "/dashboard/contabilidad/cuentas-por-pagar",
      label: t("layout.accountsPayable"),
      roles: ["master", "admin"],
    },
    {
      to: "/dashboard/contabilidad/gastos",
      label: t("layout.expenses"),
      roles: ["master", "admin"],
    },
    {
      to: "/dashboard/contabilidad/reportes",
      label: t("layout.reports"),
      roles: ["master", "admin"],
    },
  ],
},

  {
    key: "administration",
    label: t("layout.administration"),
    icon: Users,
    items: [
      {
        to: "/dashboard/usuarios",
        label: t("layout.users"),
        roles: ["master"],
      },
      {
        to: "/dashboard/activity-log",
        label: t("layout.activityLog"),
        roles: ["master"],
        feature: "activityLog",
      },
    ],
  },
];

  const moduleSearchItems = [
  {
    label: t("layout.cashClosings"),
    group: t("layout.posCash"),
    path: "/dashboard/pos/cierres",
    roles: ["master", "admin"],
    feature: "pos",
  },
  {
    label: t("layout.pos"),
    group: t("layout.posCash"),
    path: "/dashboard/pos",
    roles: ["master", "admin", "employee"],
    feature: "pos",
    requiresCashRegisterAccess: true,
  },
  {
    label: t("sidebar.dashboard"),
    group: t("layout.home"),
    path: "/dashboard",
    roles: ["master", "admin", "employee"],
  },
  {
    label: t("layout.invoices"),
    group: t("layout.billing"),
    path: "/dashboard/facturacion",
    roles: ["master", "admin", "employee"],
  },
  {
    label: t("layout.quotes"),
    group: t("layout.billing"),
    path: "/dashboard/cotizaciones",
    roles: ["master", "admin", "employee"],
  },
  {
    label: t("layout.receipts"),
    group: t("layout.billing"),
    path: "/dashboard/recibos",
    roles: ["master", "admin"],
  },
  {
    label: t("layout.inventory"),
    group: t("layout.inventory"),
    path: "/dashboard/inventario",
    roles: ["master", "admin"],
    feature: "inventory",
  },
  {
    label: t("layout.inventoryCount"),
    group: t("layout.inventoryManagement"),
    path: "/dashboard/conteo-inventario",
    roles: ["master", "admin"],
    feature: "inventoryCount",
  },
  {
    label: t("layout.catalog"),
    group: t("layout.inventoryManagement"),
    path: "/dashboard/catalogo",
    roles: ["master", "admin"],
    feature: "catalog",
  },
  {
    label: t("layout.deliveryNotes"),
    group: t("layout.operations"),
    path: "/dashboard/conduces",
    roles: ["master", "admin"],
    feature: "deliveryNotes",
  },
  {
    label: t("layout.purchaseOrders"),
    group: t("layout.operations"),
    path: "/dashboard/ordenes-compra",
    roles: ["master", "admin"],
    feature: "purchaseOrders",
  },
  {
    label: t("layout.suppliers"),
    group: t("layout.operations"),
    path: "/dashboard/proveedores",
    roles: ["master", "admin"],
    feature: "suppliers",
  },
  {
    label: t("layout.accountingSummary"),
    group: t("layout.accounting"),
    path: "/dashboard/contabilidad",
    roles: ["master", "admin"],
  },
  {
    label: t("layout.accountsReceivable"),
    group: t("layout.accounting"),
    path: "/dashboard/contabilidad/cuentas-por-cobrar",
    roles: ["master", "admin"],
  },
  {
    label: t("layout.accountsPayable"),
    group: t("layout.accounting"),
    path: "/dashboard/contabilidad/cuentas-por-pagar",
    roles: ["master", "admin"],
  },
  {
    label: t("layout.expenses"),
    group: t("layout.accounting"),
    path: "/dashboard/contabilidad/gastos",
    roles: ["master", "admin"],
  },
  {
    label: t("layout.reports"),
    group: t("layout.accounting"),
    path: "/dashboard/contabilidad/reportes",
    roles: ["master", "admin"],
  },
  {
    label: t("layout.billingSettings"),
    group: t("layout.settings"),
    path: "/dashboard/facturacion/billing",
    roles: ["master"],
  },
  {
    label: t("layout.users"),
    group: t("layout.settings"),
    path: "/dashboard/usuarios",
    roles: ["master"],
  },
  {
    label: t("layout.activityLog"),
    group: t("layout.settings"),
    path: "/dashboard/activity-log",
    roles: ["master"],
    feature: "activityLog",
  },
  {
    label: t("layout.accountSettings"),
    group: t("layout.settings"),
    path: "/dashboard/configuracion/cuenta",
    roles: ["master"],
  },
];

  const filteredModules = moduleSearchItems
    .filter((item) => canAccess(item))
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
      label: t("sidebar.dashboard"),
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

  const API_URL = import.meta.env.VITE_API_URL || "https://api.Aventrard.com/api";

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

  useEffect(() => {
  const loadPosAccess = async () => {
    if (!user) return;

    if (user.role === "master") {
      setCanUsePos(true);
      return;
    }

    try {
      const { data } = await api.get("/pos/cash-registers");
      const activeRegisters = (data || []).filter((item) => item.isActive);
      setCanUsePos(activeRegisters.length > 0);
    } catch (error) {
      setCanUsePos(false);
    }
  };

  loadPosAccess();
}, [user]);

  return (
    <div className={`saas-shell ${sidebarCollapsed ? "collapsed" : ""}`}>
      <aside className={`saas-sidebar ${sidebarOpen ? "open" : ""}`}>
        <button
            className="sidebar-toggle-tab"
            onClick={toggleSidebar}
            title={
              sidebarCollapsed
                ? t("layout.openSidebar")
                : t("layout.closeSidebar")
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
            <img src="/IconoAventra.png" alt="Aventra" />
          </div>

          <div>
            <h2>Aventra</h2>
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
            <span>{t("sidebar.dashboard")}</span>
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
                          .filter((item) => canAccess(item))
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
            {t("layout.logout")}
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
            <p>{t("layout.adminPanel")}</p>
          </div>

          <div className="topbar-actions">
            <div className="search-wrapper">
              <div className="search-box">
                <Search size={18} />
                <input
                  placeholder={t("layout.search")}
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
                      {t("layout.searchEmpty")}
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
                    <strong>{t("layout.notifications")}</strong>
                    <span>{notifications.length}</span>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="notification-empty">
                      {t("layout.noNotifications")}
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
                          <strong>{t("layout.lowStock")}</strong>
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
                  title={t("layout.settings")}
                >
                  <Settings size={20} />
                </button>

                {settingsOpen && (
                  <div className="settings-dropdown">
                    <div className="settings-header">
                      <strong>{t("layout.settings")}</strong>
                      <span>{user?.role || t("layout.user")}</span>
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
                          <strong>{t("layout.accountSettings")}</strong>
                          <span>{t("layout.accountSettingsDesc")}</span>
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
                        <strong>{t("layout.billingSettings")}</strong>
                        <span>{t("layout.billingSettingsDesc")}</span>
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
                        <strong>{t("layout.users")}</strong>
                        <span>{t("layout.usersDesc")}</span>
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