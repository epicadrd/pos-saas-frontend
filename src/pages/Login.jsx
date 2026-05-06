import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight, ShieldCheck, BarChart3 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(form);
      navigate("/dashboard");
    } catch (error) {
      setError(error.response?.data?.message || "Error iniciando sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg"></div>

      <div className="auth-card login-card">
        <div className="auth-brand">
          <div className="brand-icon">
            <BarChart3 size={26} />
          </div>
          <span>POS Épico</span>
        </div>

        <div className="auth-header">
          <span className="auth-badge">
            <ShieldCheck size={16} />
            Sistema seguro
          </span>

          <h1>Bienvenido de nuevo</h1>
          <p>Accede a tu panel para gestionar ventas, inventario y documentos.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleLogin} className="auth-form">
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

          <button disabled={loading} className="auth-button">
            {loading ? "Entrando..." : "Iniciar sesión"}
            <ArrowRight size={20} />
          </button>
        </form>

        <p className="auth-switch">
          ¿No tienes cuenta? <Link to="/registro">Crear cuenta</Link>
        </p>
      </div>
    </div>
  );
}