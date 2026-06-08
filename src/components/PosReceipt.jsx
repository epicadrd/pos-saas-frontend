import { Printer, X } from "lucide-react";

const paymentLabels = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  check: "Cheque",
  mixed: "Mixto",
};

const formatMoney = (value) =>
  new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("es-DO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
};

export default function PosReceipt({ sale, onClose }) {
  if (!sale) return null;

  const tenant = sale.tenant || {};
  const items = sale.items || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="receipt-modal-backdrop" onClick={onClose}>
      <div className="receipt-modal" onClick={(event) => event.stopPropagation()}>
        <div className="receipt-modal-header no-print">
          <div>
            <span>Ticket POS</span>
            <h3>{sale.saleNumber}</h3>
          </div>

          <button type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="receipt-print-area">
          <div className="receipt-ticket">
            <div className="receipt-business">
              <h2>{tenant.businessName || "Corex POS"}</h2>

              {tenant.rnc && <p>RNC: {tenant.rnc}</p>}
              {tenant.phone && <p>Tel: {tenant.phone}</p>}
              {tenant.address && <p>{tenant.address}</p>}
            </div>

            <div className="receipt-separator" />

            <div className="receipt-info">
              <p>
                <span>Ticket:</span>
                <strong>{sale.saleNumber}</strong>
              </p>
              <p>
                <span>Fecha:</span>
                <strong>{formatDate(sale.createdAt)}</strong>
              </p>
              <p>
                <span>Caja:</span>
                <strong>{sale.cashRegister?.name || "-"}</strong>
              </p>
              <p>
                <span>Cajero:</span>
                <strong>{sale.user?.name || "-"}</strong>
              </p>
              <p>
                <span>Pago:</span>
                <strong>{paymentLabels[sale.paymentMethod] || sale.paymentMethod}</strong>
              </p>
            </div>

            <div className="receipt-separator" />

            <div className="receipt-items">
              {items.map((item) => (
                <div className="receipt-item" key={item.id}>
                  <div>
                    <strong>{item.productName}</strong>
                    <span>
                      {item.quantity} x {formatMoney(item.unitPrice)}
                    </span>
                    {Number(item.discountAmount || 0) > 0 && (
                      <span>Desc: {formatMoney(item.discountAmount)}</span>
                    )}
                  </div>

                  <strong>{formatMoney(item.total)}</strong>
                </div>
              ))}
            </div>

            <div className="receipt-separator" />

            <div className="receipt-totals">
                <p>
                    <span>Subtotal</span>
                    <strong>{formatMoney(sale.subtotal)}</strong>
                </p>
                
                <p>
                    <span>ITBIS</span>
                    <strong>{formatMoney(sale.taxTotal)}</strong>
                </p>

                <p>
                    <span>Descuento</span>
                    <strong>{formatMoney(sale.discountTotal)}</strong>
                </p>


                <p className="receipt-total-line">
                    <span>Total</span>
                    <strong>{formatMoney(sale.total)}</strong>
                </p>

                <p>
                    <span>Pagado</span>
                    <strong>{formatMoney(sale.amountPaid)}</strong>
                </p>

                <p>
                    <span>Cambio</span>
                    <strong>{formatMoney(sale.changeAmount)}</strong>
                </p>
            </div>

            <div className="receipt-separator" />

            <div className="receipt-footer">
              <p>Gracias por su compra</p>
              <small>Emitido desde Corex</small>
            </div>
          </div>
        </div>

        <div className="receipt-modal-actions no-print">
          <button type="button" className="primary-btn" onClick={handlePrint}>
            <Printer size={18} />
            Imprimir / Guardar PDF
          </button>

          <button type="button" className="danger-btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}