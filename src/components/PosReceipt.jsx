import { useEffect, useState } from "react";
import { Printer, X } from "lucide-react";
import QRCode from "qrcode";

const paymentLabels = {
  cash: "EFECTIVO",
  card: "TARJETA",
  transfer: "TRANSFERENCIA",
  check: "CHEQUE",
  mixed: "MIXTO",
};

const receiptTypeLabels = {
  consumer_final: "FACTURA DE CONSUMO FISCAL ELECTRONICA",
  credit_fiscal: "FACTURA DE CREDITO FISCAL ELECTRONICA",
};

const getReceiptTypeLabel = (type) =>
  receiptTypeLabels[type] || receiptTypeLabels.consumer_final;

const getReceiptQrTarget = (sale) => {
  if (sale?.dgiiQrUrl) return sale.dgiiQrUrl;
  return `${window.location.origin}/public/pos-receipt/${sale.saleNumber}`;
};

const formatMoney = (value) =>
  `RD$${Number(value || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(value));
};

const getExpirationDate = (value) => {
  const date = value ? new Date(value) : new Date();
  const year = date.getFullYear();

  return `31/12/${year}`;
};

const getFiscalNumber = (sale) => {
  return (
    sale?.eCf ||
    sale?.ecf ||
    sale?.ecfNumber ||
    sale?.eNcf ||
    sale?.encf ||
    sale?.ncf ||
    sale?.saleNumber ||
    "-"
  );
};

const getFiscalLabel = (sale) => {
  if (sale?.eCf || sale?.ecf || sale?.ecfNumber) return "e-CF";
  if (sale?.eNcf || sale?.encf || sale?.ncf) return "e-NCF";
  return "No. venta";
};

export default function PosReceipt({ sale, onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState("");

  if (!sale) return null;

  const tenant = sale.tenant || {};
  const items = sale.items || [];
  const receiptType = sale.receiptType || sale.invoiceType || "consumer_final";

  useEffect(() => {
    const generateQr = async () => {
      if (!sale) return;

      const qrValue = getReceiptQrTarget(sale);

      const qr = await QRCode.toDataURL(qrValue, {
        width: 135,
        margin: 1,
      });

      setQrDataUrl(qr);
    };

    generateQr();
  }, [sale]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="receipt-modal-backdrop" onClick={onClose}>
      <div className="receipt-modal" onClick={(event) => event.stopPropagation()}>
        <div className="receipt-modal-header no-print">
          <div>
            <span>Comprobante POS</span>
            <h3>{sale.saleNumber}</h3>
          </div>

          <button type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="receipt-print-area">
          <div className="receipt-ticket">
            <div className="receipt-center">
              <h2>{tenant.businessName || "COREX POS"}</h2>

              {tenant.rnc && <p>RNC: {tenant.rnc}</p>}
              {tenant.phone && <p>Tel: {tenant.phone}</p>}
              {tenant.address && <p>{tenant.address}</p>}
            </div>

            <div className="receipt-separator" />

            <div className="receipt-center">
              <h3 className="receipt-type-title">{getReceiptTypeLabel(receiptType)}</h3>
            </div>

            <div className="receipt-info-block receipt-info-lines">
              <p>e-NCF: {getFiscalNumber(sale)}</p>

              {receiptType === "credit_fiscal" && (
                <>
                  {sale.customerRnc && <p>RNC Comprador: {sale.customerRnc}</p>}
                  {sale.customerName && <p>Razón social comprador: {sale.customerName}</p>}
                </>
              )}

              <p>Fecha emisión: {formatDate(sale.createdAt)}</p>
            </div>

            <div className="receipt-separator" />

            <div className="receipt-info-block">
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
                <strong>{paymentLabels[sale.paymentMethod] || sale.paymentMethod || "-"}</strong>
              </p>
            </div>

            <div className="receipt-separator" />

            <div className="receipt-items">
              {items.map((item) => (
                <div className="receipt-item" key={item.id}>
                  <div className="receipt-item-name">
                    <strong>{item.productName}</strong>
                    <span>
                      {item.quantity} x {formatMoney(item.unitPrice)}
                    </span>

                    {Number(item.discountAmount || 0) > 0 && (
                      <span>Desc: {formatMoney(item.discountAmount)}</span>
                    )}
                  </div>

                  <strong className="receipt-item-total">{formatMoney(item.total)}</strong>
                </div>
              ))}
            </div>

            <div className="receipt-separator" />

            <div className="receipt-totals">
              <p>
                <span>SUBTOTAL</span>
                <strong>{formatMoney(sale.subtotal)}</strong>
              </p>

              <p>
                <span>DESCUENTO</span>
                <strong>{formatMoney(sale.discountTotal)}</strong>
              </p>

              <p>
                <span>ITBIS</span>
                <strong>{formatMoney(sale.taxTotal)}</strong>
              </p>

              <p className="receipt-total-line">
                <span>TOTAL</span>
                <strong>{formatMoney(sale.total)}</strong>
              </p>

              <p>
                <span>PAGADO</span>
                <strong>{formatMoney(sale.amountPaid)}</strong>
              </p>

              <p>
                <span>CAMBIO</span>
                <strong>{formatMoney(sale.changeAmount)}</strong>
              </p>
            </div>

            <div className="receipt-separator" />

            <div className="receipt-center">
              <p>TOTAL ITEMS {items.length}</p>
            </div>

            {qrDataUrl && (
              <div className="receipt-qr">
                <img src={qrDataUrl} alt="QR del comprobante" />
                <p>Escanee para consultar</p>
              </div>
            )}

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
            Imprimir
          </button>

          <button type="button" className="danger-btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}