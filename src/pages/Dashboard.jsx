import {
  FileText,
  Package,
  ClipboardList,
  Truck,
  ReceiptText,
  CreditCard,
  TrendingUp,
  Users,
  DollarSign,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const modules = [
    {
      title: "Facturación",
      text: "Crear y administrar facturas.",
      icon: FileText,
      url: "/dashboard/facturacion",
    },
    {
      title: "Inventario",
      text: "Control de productos y existencias.",
      icon: Package,
      url: "/dashboard/inventario",
    },
    {
      title: "Cotizaciones",
      text: "Generar propuestas para clientes.",
      icon: ClipboardList,
      url: "/dashboard/cotizaciones",
    },
    {
      title: "Conduces",
      text: "Documentos de entrega.",
      icon: Truck,
      url: "/dashboard/conduces",
    },
    {
      title: "Recibos",
      text: "Recibos de pago y abonos.",
      icon: ReceiptText,
      url: "/dashboard/recibos",
    },
    {
      title: "Orden de compra",
      text: "Compras a suplidores.",
      icon: CreditCard,
      url: "/dashboard/ordenes-compra",
    },
  ];

  return (
    <div>
      <section className="hero-panel">
        <div>
          <span>Dashboard principal</span>
          <h2>Gestiona tu negocio desde un solo lugar.</h2>
          <p>
            Facturación, inventario, cotizaciones, conduces, recibos y órdenes
            de compra en una estructura SaaS profesional.
          </p>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <DollarSign />
          <div>
            <span>Ventas hoy</span>
            <strong>RD$0.00</strong>
          </div>
        </div>

        <div className="stat-card">
          <TrendingUp />
          <div>
            <span>Facturas</span>
            <strong>0</strong>
          </div>
        </div>

        <div className="stat-card">
          <Package />
          <div>
            <span>Productos</span>
            <strong>0</strong>
          </div>
        </div>

        <div className="stat-card">
          <Users />
          <div>
            <span>Clientes</span>
            <strong>0</strong>
          </div>
        </div>
      </section>

      <section className="module-grid">
        {modules.map((item) => {
          const Icon = item.icon;

          return (
            <Link to={item.url} key={item.title} className="module-card">
              <div className="module-icon">
                <Icon size={24} />
              </div>

              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}