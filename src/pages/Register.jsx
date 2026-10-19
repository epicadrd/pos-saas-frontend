import { useState } from "react";
import {
  useNavigate,
  Link,
  useSearchParams,
} from "react-router-dom";
import {
  Building2,
  Mail,
  Lock,
  Phone,
  User,
  FileText,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CalendarCheck,
  CreditCard,
  LayoutDashboard,
  Users,
} from "lucide-react";
import AuthLayout, {
  AuthHeader,
  AuthInput,
  AuthPasswordInput,
} from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";

const TRIAL_HIGHLIGHTS = [
  {
    icon: CalendarCheck,
    title: "15 días completos",
    text: "Acceso a las funciones de tu plan desde el primer día.",
  },
  {
    icon: CreditCard,
    title: "Hoy pagas US$0",
    text: "El primer cobro llega al terminar la prueba.",
  },
  {
    icon: LayoutDashboard,
    title: "Todo en un panel",
    text: "Ventas, inventario, facturas y reportes conectados.",
  },
  {
    icon: Users,
    title: "Tu equipo incluido",
    text: "Invita usuarios y asigna roles a cada uno.",
  },
];

export default function Register({ trial = false }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();
  const selectedPlan = searchParams.get("plan") || "";
  const selectedBillingPeriod = searchParams.get("billing") || "";

  const [form, setForm] = useState({
    businessName: "",
    rnc: "",
    phone: "",
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await register(
        {
          ...form,
          ...(trial
            ? {
                plan: selectedPlan,
                billingPeriod: selectedBillingPeriod,
              }
            : {}),
        },
        { trial }
      );
      navigate("/login", {
        state: {
          message: data.message,
          email: form.email,
        },
      });
    } catch (error) {
      setError(error.response?.data?.message || "Error creando la cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      wide
      {...(trial
        ? {
            asideTitle: "Prueba Aventra 15 días sin costo.",
            asideText:
              "Configura tu empresa en minutos y explora todas las herramientas antes de pagar.",
            highlights: TRIAL_HIGHLIGHTS,
          }
        : {
            asideTitle: "Tu empresa lista para vender hoy.",
          })}
    >
      <AuthHeader
        badge={trial ? "15 días gratis" : "Nuevo SaaS POS"}
        badgeIcon={Sparkles}
        title={trial ? "Comienza tu prueba gratis" : "Crea tu cuenta"}
        text={
          trial
            ? "Crea tu cuenta, confirma tu correo y registra tu tarjeta. Hoy pagas US$0."
            : "Registra tu empresa y empieza a controlar tus operaciones."
        }
      />

      {error && (
        <div className="auth-shell-alert error" role="alert">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="auth-shell-form">
        <div className="auth-shell-grid">
          <AuthInput
            label="Empresa"
            icon={Building2}
            name="businessName"
            autoComplete="organization"
            placeholder="Nombre empresa"
            value={form.businessName}
            onChange={handleChange}
          />

          <AuthInput
            label="RNC"
            icon={FileText}
            name="rnc"
            placeholder="RNC"
            value={form.rnc}
            onChange={handleChange}
          />

          <AuthInput
            label="Teléfono"
            icon={Phone}
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="809-000-0000"
            value={form.phone}
            onChange={handleChange}
          />

          <AuthInput
            label="Nombre admin"
            icon={User}
            name="name"
            autoComplete="name"
            placeholder="Tu nombre"
            value={form.name}
            onChange={handleChange}
          />

          <AuthInput
            className="full"
            label="Correo electrónico"
            icon={Mail}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="ejemplo@empresa.com"
            value={form.email}
            onChange={handleChange}
          />

          <AuthPasswordInput
            className="full"
            label="Contraseña"
            icon={Lock}
            name="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
          />
        </div>

        <button disabled={loading} className="auth-shell-submit">
          {loading ? (
            <>
              <span className="auth-shell-spinner" />
              Creando cuenta...
            </>
          ) : (
            <>
              Crear cuenta
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      <p className="auth-shell-switch">
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </AuthLayout>
  );
}