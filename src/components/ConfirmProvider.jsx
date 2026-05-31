import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const ConfirmContext = createContext(null);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error("useConfirm debe usarse dentro de ConfirmProvider");
  }

  return context;
};

export default function ConfirmProvider({ children }) {
  const [confirmState, setConfirmState] = useState(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      setConfirmState({
        title: options.title || "Confirmar acción",
        message: options.message || "¿Estás seguro de continuar?",
        confirmText: options.confirmText || "Confirmar",
        cancelText: options.cancelText || "Cancelar",
        variant: options.variant || "danger",
        resolve,
      });
    });
  }, []);

  const close = useCallback((result) => {
    if (confirmState?.resolve) {
      confirmState.resolve(result);
    }

    setConfirmState(null);
  }, [confirmState]);

  const value = useMemo(() => ({ confirm }), [confirm]);

  const isDanger = confirmState?.variant === "danger";

  return (
    <ConfirmContext.Provider value={value}>
      {children}

      {confirmState && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                    isDanger
                      ? "bg-red-50 text-red-600"
                      : "bg-[#00b8a9]/10 text-[#00b8a9]"
                  }`}
                >
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {confirmState.title}
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {confirmState.message}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => close(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => close(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                {confirmState.cancelText}
              </button>

              <button
                type="button"
                onClick={() => close(true)}
                className={`rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm ${
                  isDanger
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[#00b8a9] hover:bg-[#00a79a]"
                }`}
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}