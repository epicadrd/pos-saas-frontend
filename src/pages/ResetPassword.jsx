import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Lock, ArrowRight, BarChart3, ShieldCheck } from "lucide-react";
import { api } from "../api/axios";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      setLoading(false);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.post(`/auth/reset-password/${token}`, {
        password: form.password,
      });

      navigate("/login", {
        state: {
          message:
            data.message ||
            "Contraseña actualizada correctamente. Ya puedes iniciar sesión.",
        },
      });
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "No pudimos restablecer la contraseña. El enlace puede haber expirado."
      );
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
          <span>Corex</span>
        </div>

        <div className="auth-header">
          <span className="auth-badge">
            <ShieldCheck size={16} />
            Nueva contraseña
          </span>

          <h1>Restablecer contraseña</h1>
          <p>Crea una nueva contraseña segura para acceder a Corex.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>Nueva contraseña</label>

          <div className="input-group">
            <Lock size={19} />
            <input
              name="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={form.password}
              onChange={handleChange}
            />
          </div>

          <label>Confirmar contraseña</label>

          <div className="input-group">
            <Lock size={19} />
            <input
              name="confirmPassword"
              type="password"
              placeholder="Repite la contraseña"
              value={form.confirmPassword}
              onChange={handleChange}
            />
          </div>

          <button disabled={loading} className="auth-button">
            {loading ? "Actualizando..." : "Actualizar contraseña"}
            <ArrowRight size={20} />
          </button>
        </form>

        <p className="auth-switch">
          ¿Ya tienes acceso? <Link to="/login">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}