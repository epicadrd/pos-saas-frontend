import { useState } from "react";
import {
  BarChart3,
  Boxes,
  Eye,
  EyeOff,
  Receipt,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";

const DEFAULT_HIGHLIGHTS = [
  {
    icon: ShoppingCart,
    title: "Punto de venta ágil",
    text: "Cobra en segundos y controla tus cajas.",
  },
  {
    icon: Boxes,
    title: "Inventario en tiempo real",
    text: "Existencias, conteos y movimientos al día.",
  },
  {
    icon: Receipt,
    title: "Facturación con comprobantes",
    text: "Facturas, cotizaciones y conduces en un solo lugar.",
  },
  {
    icon: BarChart3,
    title: "Reportes claros",
    text: "Decide con datos de ventas, gastos y cuentas.",
  },
];

export default function AuthLayout({
  asideTitle = "Gestiona tu negocio desde un solo lugar.",
  asideText = "Ventas, inventario, facturación y reportes conectados para que tu equipo trabaje sin fricción.",
  highlights = DEFAULT_HIGHLIGHTS,
  wide = false,
  children,
}) {
  return (
    <div className="auth-shell">
      <aside className="auth-shell-aside">
        <div className="auth-shell-aside-glow" aria-hidden="true" />

        <div className="auth-shell-logo">
          <img src="/Aventra.png" alt="" />
          <span>Aventra</span>
        </div>

        <div className="auth-shell-aside-copy">
          <h2>{asideTitle}</h2>
          <p>{asideText}</p>
        </div>

        <ul className="auth-shell-highlights">
          {highlights.map(({ icon: Icon, title, text }) => (
            <li key={title}>
              <span className="auth-shell-highlight-icon">
                <Icon size={18} />
              </span>
              <div>
                <strong>{title}</strong>
                <small>{text}</small>
              </div>
            </li>
          ))}
        </ul>

        <div className="auth-shell-aside-foot">
          <ShieldCheck size={16} />
          Acceso seguro para ti y tu equipo
        </div>
      </aside>

      <main className="auth-shell-main">
        <div className={`auth-shell-content${wide ? " wide" : ""}`}>
          <div className="auth-shell-logo mobile">
            <img src="/IconoAventra.png" alt="" />
            <span>Aventra</span>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}

export function AuthHeader({ badge, badgeIcon: BadgeIcon, title, text }) {
  return (
    <div className="auth-shell-header">
      {badge && (
        <span className="auth-shell-badge">
          {BadgeIcon && <BadgeIcon size={14} />}
          {badge}
        </span>
      )}
      <h1>{title}</h1>
      {text && <p>{text}</p>}
    </div>
  );
}

export function AuthInput({ label, icon: Icon, className = "", ...inputProps }) {
  return (
    <label className={`auth-shell-input ${className}`}>
      <span className="auth-shell-label">{label}</span>
      <span className="auth-shell-control">
        {Icon && <Icon size={18} />}
        <input {...inputProps} />
      </span>
    </label>
  );
}

export function AuthPasswordInput({ label, icon: Icon, className = "", ...inputProps }) {
  const [visible, setVisible] = useState(false);

  return (
    <label className={`auth-shell-input ${className}`}>
      <span className="auth-shell-label">{label}</span>
      <span className="auth-shell-control">
        {Icon && <Icon size={18} />}
        <input {...inputProps} type={visible ? "text" : "password"} />
        <button
          type="button"
          className="auth-shell-eye"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  );
}
