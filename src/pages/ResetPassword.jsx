import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Lock, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import AuthLayout, {
  AuthHeader,
  AuthPasswordInput,
} from "../components/AuthLayout";
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

  const lengthOk = form.password.length >= 8;
  const matchOk =
    form.confirmPassword.length > 0 && form.password === form.confirmPassword;

  return (
    <AuthLayout
      asideTitle="Una nueva contraseña, el mismo control."
      asideText="Elige una contraseña segura y vuelve a gestionar tus ventas, inventario y documentos."
    >
      <AuthHeader
        badge="Nueva contraseña"
        badgeIcon={ShieldCheck}
        title="Restablecer contraseña"
        text="Crea una nueva contraseña segura para acceder a Aventra."
      />

      {error && (
        <div className="auth-shell-alert error" role="alert">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-shell-form">
        <AuthPasswordInput
          label="Nueva contraseña"
          icon={Lock}
          name="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          value={form.password}
          onChange={handleChange}
        />
        {form.password && (
          <p className={`auth-shell-hint ${lengthOk ? "ok" : ""}`}>
            {lengthOk ? "✓ Longitud correcta" : "Mínimo 8 caracteres"}
          </p>
        )}

        <AuthPasswordInput
          label="Confirmar contraseña"
          icon={Lock}
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Repite la contraseña"
          value={form.confirmPassword}
          onChange={handleChange}
        />
        {form.confirmPassword && (
          <p className={`auth-shell-hint ${matchOk ? "ok" : "bad"}`}>
            {matchOk ? "✓ Las contraseñas coinciden" : "Las contraseñas no coinciden"}
          </p>
        )}

        <button disabled={loading} className="auth-shell-submit">
          {loading ? (
            <>
              <span className="auth-shell-spinner" />
              Actualizando...
            </>
          ) : (
            <>
              Actualizar contraseña
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      <p className="auth-shell-switch">
        ¿Ya tienes acceso? <Link to="/login">Iniciar sesión</Link>
      </p>
    </AuthLayout>
  );
}