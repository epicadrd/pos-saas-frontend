import { useEffect, useMemo, useState } from "react";
import { Calendar, FileText, Search, Wallet, X } from "lucide-react";
import { api } from "../../api/axios";
import { getFiscalNumber } from "../../utils/fiscalNumber";

export default function PaymentHistory() {
  const [invoices, setInvoices] = useState([]);
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const money = new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  });

  const loadInvoices = async () => {
    const { data } = await api.get("/invoices");
    setInvoices(data);
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const paidInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      if (invoice.status !== "paid") return false;

      const date = new Date(invoice.createdAt);
      const invoiceMonth = String(date.getMonth() + 1).padStart(2, "0");
      const invoiceYear = String(date.getFullYear());

      const matchDate = invoiceMonth === month && invoiceYear === year;

      const text = `${getFiscalNumber(invoice)} ${invoice.customerName}`.toLowerCase();
      const matchSearch = text.includes(search.toLowerCase());

      return matchDate && matchSearch;
    });
  }, [invoices, month, year, search]);

  const totals = useMemo(() => {
    return paidInvoices.reduce(
      (acc, invoice) => {
        acc.subtotal += Number(invoice.subtotal || 0);
        acc.tax += Number(invoice.tax || 0);
        acc.total += Number(invoice.total || 0);
        acc.amountPaid += Number(invoice.amountPaid || 0);
        return acc;
      },
      { subtotal: 0, tax: 0, total: 0, amountPaid: 0 }
    );
  }, [paidInvoices]);

  const months = [
    ["01", "Enero"],
    ["02", "Febrero"],
    ["03", "Marzo"],
    ["04", "Abril"],
    ["05", "Mayo"],
    ["06", "Junio"],
    ["07", "Julio"],
    ["08", "Agosto"],
    ["09", "Septiembre"],
    ["10", "Octubre"],
    ["11", "Noviembre"],
    ["12", "Diciembre"],
  ];

  return (
    <div className="payment-history-page">
      <div className="payment-history-header">
        <div>
          <h1>Historial de pagos</h1>
          <p>Consulta facturas pagadas, total cobrado e ITBIS por mes.</p>
        </div>
      </div>

      <div className="payment-history-filters">
        <div className="payment-search">
          <Search size={18} />
          <input
            placeholder="Buscar factura o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select value={year} onChange={(e) => setYear(e.target.value)}>
          {[2024, 2025, 2026, 2027, 2028].map((item) => (
            <option key={item} value={String(item)}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="payment-stats-grid">
        <div className="payment-stat-card">
          <div className="payment-stat-icon">
            <Wallet size={22} />
          </div>
          <div>
            <span>Total cobrado</span>
            <strong>{money.format(totals.amountPaid)}</strong>
          </div>
        </div>

        <div className="payment-stat-card">
          <div className="payment-stat-icon">
            <FileText size={22} />
          </div>
          <div>
            <span>Subtotal</span>
            <strong>{money.format(totals.subtotal)}</strong>
          </div>
        </div>

        <div className="payment-stat-card">
          <div className="payment-stat-icon">
            <Calendar size={22} />
          </div>
          <div>
            <span>ITBIS</span>
            <strong>{money.format(totals.tax)}</strong>
          </div>
        </div>

        <div className="payment-stat-card">
          <div className="payment-stat-icon">
            <FileText size={22} />
          </div>
          <div>
            <span>Facturas pagadas</span>
            <strong>{paidInvoices.length}</strong>
          </div>
        </div>
      </div>

      <div className="payment-table-card payment-history-desktop">
  <table className="payment-table">
    <thead>
      <tr>
        <th>Factura</th>
        <th>Cliente</th>
        <th>Fecha</th>
        <th>Subtotal</th>
        <th>ITBIS</th>
        <th>Total</th>
        <th>Pagado</th>
      </tr>
    </thead>

    <tbody>
      {paidInvoices.map((invoice) => (
        <tr key={invoice.id}>
          <td>{getFiscalNumber(invoice)}</td>
          <td>{invoice.customerName}</td>
          <td>{new Date(invoice.createdAt).toLocaleDateString("es-DO")}</td>
          <td>{money.format(Number(invoice.subtotal || 0))}</td>
          <td>{money.format(Number(invoice.tax || 0))}</td>
          <td>{money.format(Number(invoice.total || 0))}</td>
          <td>
            <strong>{money.format(Number(invoice.amountPaid || 0))}</strong>
          </td>
        </tr>
      ))}

      {!paidInvoices.length && (
        <tr>
          <td colSpan="7" className="payment-empty">
            No hay facturas pagadas en este mes.
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>

<div className="payment-history-mobile">
  {paidInvoices.length ? (
    paidInvoices.map((invoice) => (
      <button
        type="button"
        key={invoice.id}
        className="payment-mobile-card"
        onClick={() => setSelectedInvoice(invoice)}
      >
        <div className="payment-mobile-card-top">
          <div>
            <span>Factura</span>
            <strong>{getFiscalNumber(invoice)}</strong>
          </div>

          <small>{new Date(invoice.createdAt).toLocaleDateString("es-DO")}</small>
        </div>

        <div className="payment-mobile-client">
          <span>Cliente</span>
          <strong>{invoice.customerName || "Sin cliente"}</strong>
        </div>

        <div className="payment-mobile-money-grid">
          <div>
            <span>Total</span>
            <strong>{money.format(Number(invoice.total || 0))}</strong>
          </div>

          <div>
            <span>Pagado</span>
            <strong>{money.format(Number(invoice.amountPaid || 0))}</strong>
          </div>
        </div>

        <div className="payment-mobile-footer">
          <span>ITBIS {money.format(Number(invoice.tax || 0))}</span>
          <strong>Ver detalle</strong>
        </div>
      </button>
    ))
  ) : (
    <div className="payment-mobile-empty">
      No hay facturas pagadas en este mes.
    </div>
  )}
</div>

{selectedInvoice && (
  <div className="payment-detail-overlay" onClick={() => setSelectedInvoice(null)}>
    <div className="payment-detail-modal" onClick={(e) => e.stopPropagation()}>
      <div className="payment-detail-header">
        <div>
          <span>Detalle del pago</span>
          <h3>{getFiscalNumber(selectedInvoice)}</h3>
        </div>

        <button type="button" onClick={() => setSelectedInvoice(null)}>
          <X size={20} />
        </button>
      </div>

      <div className="payment-detail-list">
        <div>
          <span>Cliente</span>
          <strong>{selectedInvoice.customerName || "Sin cliente"}</strong>
        </div>

        <div>
          <span>Fecha</span>
          <strong>
            {new Date(selectedInvoice.createdAt).toLocaleDateString("es-DO")}
          </strong>
        </div>

        <div>
          <span>Subtotal</span>
          <strong>{money.format(Number(selectedInvoice.subtotal || 0))}</strong>
        </div>

        <div>
          <span>ITBIS</span>
          <strong>{money.format(Number(selectedInvoice.tax || 0))}</strong>
        </div>

        <div>
          <span>Total</span>
          <strong>{money.format(Number(selectedInvoice.total || 0))}</strong>
        </div>

        <div>
          <span>Pagado</span>
          <strong>{money.format(Number(selectedInvoice.amountPaid || 0))}</strong>
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );
}