import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

export const ToastContext = createContext(null);

const getType = (message = "") => {
  const text = String(message).toLowerCase();

  if (
    text.includes("error") ||
    text.includes("no se pudo") ||
    text.includes("obligatorio") ||
    text.includes("inválido") ||
    text.includes("insuficiente")
  ) {
    return "error";
  }

  if (
    text.includes("correctamente") ||
    text.includes("guardad") ||
    text.includes("cread") ||
    text.includes("actualizad") ||
    text.includes("copiado") ||
    text.includes("convertid")
  ) {
    return "success";
  }

  return "info";
};

const styles = {
  success: {
    icon: CheckCircle,
    bar: "bg-emerald-500",
    iconColor: "text-emerald-500",
  },
  error: {
    icon: AlertCircle,
    bar: "bg-red-500",
    iconColor: "text-red-500",
  },
  info: {
    icon: Info,
    bar: "bg-sky-500",
    iconColor: "text-sky-500",
  },
};

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message, type) => {
    const id = crypto.randomUUID();

    const toast = {
      id,
      message: String(message || "Acción realizada"),
      type: type || getType(message),
    };

    setToasts((current) => [...current, toast]);

    setTimeout(() => {
      removeToast(id);
    }, 4200);
  }, [removeToast]);

  useEffect(() => {
    const originalAlert = window.alert;

    window.alert = (message) => {
      showToast(message);
    };

    return () => {
      window.alert = originalAlert;
    };
  }, [showToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="fixed right-4 top-4 z-[9999] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3">
        {toasts.map((toast) => {
          const current = styles[toast.type] || styles.info;
          const Icon = current.icon;

          return (
            <div
              key={toast.id}
              className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 pr-10 shadow-xl"
            >
              <div className={`absolute left-0 top-0 h-full w-1.5 ${current.bar}`} />

              <div className="flex gap-3">
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${current.iconColor}`} />

                <p className="text-sm font-medium text-slate-800">
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="absolute right-3 top-3 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Cerrar notificación"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}