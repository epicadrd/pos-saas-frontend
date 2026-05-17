import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Success from "./pages/Success";
import Cancel from "./pages/Cancel";
import ProtectedRoute from "./components/ProtectedRoute";
import SaaSLayout from "./components/SaaSLayout";
import Inventory from "./pages/modules/Inventory";
import Invoices from "./pages/modules/Invoices";
import Quotes from "./pages/modules/Quotes";
import Receipts from "./pages/modules/Receipts";
import PurchaseOrders from "./pages/modules/PurchaseOrders";
import PaymentHistory from "./pages/modules/PaymentHistory";
import InvoiceCustomization from "./pages/modules/InvoiceCustomization";
import InvoicePreferences from "./pages/modules/InvoicePreferences";
import InvoiceNumbering from "./pages/modules/InvoiceNumbering";
import Suppliers from "./pages/modules/Suppliers";
import DeliveryNotes from "./pages/modules/DeliveryNotes";
import UsersManagement from "./pages/modules/UsersManagement";
import RoleRoute from "./components/RoleRoute";
import ActivityLog from "./pages/modules/ActivityLog";
import VerifyEmail from "./pages/VerifyEmail";
import SelectPlan from "./pages/SelectPlan";
import SubscriptionRoute from "./components/SubscriptionRoute";
import Billing from "./pages/modules/Billing";
import SubscriptionRequired from "./pages/SubscriptionRequired";
import AccountingSummary from "./pages/modules/AccountingSummary";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" />} />

      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />
      <Route path="/verificar-correo/:token" element={<VerifyEmail />} />

      <Route path="/seleccionar-plan" element={ <ProtectedRoute><SelectPlan /></ProtectedRoute>}/>
      <Route path="/suscripcion-requerida"element={<ProtectedRoute><SubscriptionRequired /></ProtectedRoute>}/>

      <Route path="/dashboard"element={<ProtectedRoute><SubscriptionRoute><SaaSLayout /></SubscriptionRoute></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="facturacion" element={<Invoices />} />
        <Route path="facturacion/historial-pagos" element={<PaymentHistory />} />
        <Route path="cotizaciones" element={<Quotes />} />
        <Route path="facturacion/personalizacion" element={<InvoiceCustomization />}/>
        <Route path="facturacion/preferencias" element={<InvoicePreferences />}/>
        <Route path="facturacion/numeracion" element={<InvoiceNumbering />} />
        <Route path="activity-log" element={<ActivityLog />} />        
        <Route path="usuarios"element={<RoleRoute allowedRoles={["master"]}><UsersManagement /></RoleRoute>}/>
        <Route path="facturacion/billing"element={<RoleRoute allowedRoles={["master"]}><Billing /></RoleRoute>}/>
        <Route path="inventario" element={<RoleRoute allowedRoles={["master", "admin"]}><Inventory /></RoleRoute>}/>
        <Route path="conduces" element={<RoleRoute allowedRoles={["master", "admin"]}><DeliveryNotes /></RoleRoute>}/>
        <Route path="recibos" element={<RoleRoute allowedRoles={["master", "admin"]}><Receipts /></RoleRoute>}/>
        <Route path="ordenes-compra"element={<RoleRoute allowedRoles={["master", "admin"]}><PurchaseOrders /></RoleRoute>}/>
        <Route path="proveedores" element={<RoleRoute allowedRoles={["master", "admin"]}><Suppliers /></RoleRoute>}/>
        <Route path="contabilidad" element={<RoleRoute allowedRoles={["master", "admin"]}><AccountingSummary /></RoleRoute>}/>
      
      </Route>

      <Route path="/success" element={<Success />} />
      <Route path="/cancel" element={<Cancel />} />
    </Routes>
  );
}

export default App;