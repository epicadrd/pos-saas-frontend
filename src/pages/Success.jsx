import { Link } from "react-router-dom";

export default function Success() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-green-50 p-6">
      <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
        <h1 className="text-3xl font-black text-green-700">
          Pago realizado exitosamente
        </h1>
        <p className="mt-3 text-slate-600">
          Tu suscripción fue procesada. Estamos activando tu cuenta.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-block rounded-xl bg-green-600 px-6 py-3 font-bold text-white"
        >
          Volver al dashboard
        </Link>
      </div>
    </div>
  );
}