import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SubscriptionRoute({ children }) {
  const { tenant } = useAuth();
  const location = useLocation();

  const allowedPaths = [
    "/dashboard/facturacion/billing",
    "/suscripcion-requerida",
  ];

  if (allowedPaths.includes(location.pathname)) {
    return children;
  }

  const activeStatuses = ["active", "trialing"];

  const isActive = activeStatuses.includes(tenant?.subscriptionStatus);

  if (!isActive) {
    return <Navigate to="/suscripcion-requerida" replace />;
  }

  return children;
}