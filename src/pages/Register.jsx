import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Building2,
  Mail,
  Lock,
  Phone,
  User,
  FileText,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

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
      const data = await register(form);
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
    <div className="auth-page register-page">
      <div className="auth-bg"></div>

      <div className="auth-card register-card">
        <div className="auth-brand center">
          <div className="brand-icon">
            <Sparkles size={26} />
          </div>
          <span>Aventra</span>
        </div>

        <div className="auth-header center">
          <span className="auth-badge">Nuevo SaaS POS</span>
          <h1>Crea tu cuenta</h1>
          <p>Registra tu empresa y empieza a controlar tus operaciones.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleRegister} className="auth-form">
          <div className="form-grid">
            <div>
              <label>Empresa</label>
              <div className="input-group">
                <Building2 size={19} />
                <input
                  name="businessName"
                  placeholder="Nombre empresa"
                  value={form.businessName}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label>RNC</label>
              <div className="input-group">
                <FileText size={19} />
                <input
                  name="rnc"
                  placeholder="RNC"
                  value={form.rnc}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label>Teléfono</label>
              <div className="input-group">
                <Phone size={19} />
                <input
                  name="phone"
                  placeholder="809-000-0000"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label>Nombre admin</label>
              <div className="input-group">
                <User size={19} />
                <input
                  name="name"
                  placeholder="Tu nombre"
                  value={form.name}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="full">
              <label>Correo electrónico</label>
              <div className="input-group">
                <Mail size={19} />
                <input
                  name="email"
                  type="email"
                  placeholder="ejemplo@empresa.com"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="full">
              <label>Contraseña</label>
              <div className="input-group">
                <Lock size={19} />
                <input
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <button disabled={loading} className="auth-button">
            {loading ? "Creando cuenta..." : "Crear cuenta"}
            <ArrowRight size={20} />
          </button>
        </form>

        <p className="auth-switch">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}