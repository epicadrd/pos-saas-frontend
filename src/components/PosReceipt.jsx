import { useEffect, useState } from "react";
import { Printer, X } from "lucide-react";
import QRCode from "qrcode";
import {
  getTaxRate,
  getTaxLabel,
  isDominicanTenant,
} from "../utils/taxConfig";

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

const formatMoney = (value, tenant = {}) => {
  const isDO = isDominicanTenant(tenant);

  return new Intl.NumberFormat(isDO ? "es-DO" : "en-US", {
    style: "currency",
    currency: isDO ? "DOP" : "USD",
  }).format(Number(value || 0));
};

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


export default function PosReceipt({ sale, onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState("");

  if (!sale) return null;

  const tenant = sale.tenant || {};
  const taxLabel = getTaxLabel(tenant);
  const isDO = isDominicanTenant(tenant);
  const taxRate = getTaxRate(tenant);

  const usTaxBreakdown = {
    stateRate: Number(tenant?.usStateTaxRate || 0),
    countyRate: Number(tenant?.usCountyTaxRate || 0),
    cityRate: Number(tenant?.usCityTaxRate || 0),
  };

  const getTaxAmount = (rate, base = 0) =>
    Math.round(
      (
        Number(base || 0) *
        (Number(rate || 0) / 100) +
        Number.EPSILON
      ) *
        100
    ) / 100;
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

              {isDO && tenant.rnc && <p>RNC: {tenant.rnc}</p>}
              {tenant.phone && <p>Tel: {tenant.phone}</p>}
              {tenant.address && <p>{tenant.address}</p>}
            </div>

            <div className="receipt-separator" />

            <div className="receipt-center">
              <h3 className="receipt-type-title">
                {isDO ? getReceiptTypeLabel(receiptType) : "COMPROBANTE DE VENTA"}
              </h3>
            </div>

            <div className="receipt-info-block receipt-info-lines">
              {isDO && <p>e-NCF: {getFiscalNumber(sale)}</p>}

              {isDO && receiptType === "credit_fiscal" && (
                <>
                  {sale.customerRnc && <p>RNC Comprador: {sale.customerRnc}</p>}
                  {sale.customerName && <p>Razón social comprador: {sale.customerName}</p>}
                </>
              )}

              {!isDO && sale.customerName && <p>Cliente: {sale.customerName}</p>}

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
                      {item.quantity} x {formatMoney(item.unitPrice, tenant)}
                    </span>

                    {Number(item.discountAmount || 0) > 0 && (
                      <span>Desc: {formatMoney(item.discountAmount, tenant)}</span>
                    )}
                  </div>

                  <strong className="receipt-item-total">{formatMoney(item.total, tenant)}</strong>
                </div>
              ))}
            </div>

            <div className="receipt-separator" />

            <div className="receipt-totals">
              <p>
                <span>SUBTOTAL</span>
                <strong>{formatMoney(sale.subtotal, tenant)}</strong>
              </p>

              <p>
                <span>DESCUENTO</span>
                <strong>{formatMoney(sale.discountTotal, tenant)}</strong>
              </p>

              {isDO ? (
  <p>
    <span>{taxLabel} ({taxRate}%)</span>
    <strong>{formatMoney(sale.taxTotal, tenant)}</strong>
  </p>
) : (
  <>
    <p>
      <span>State Tax ({usTaxBreakdown.stateRate}%)</span>
      <strong>
        {formatMoney(
          getTaxAmount(usTaxBreakdown.stateRate, sale.subtotal),
          tenant
        )}
      </strong>
    </p>

    <p>
      <span>County Tax ({usTaxBreakdown.countyRate}%)</span>
      <strong>
        {formatMoney(
          getTaxAmount(usTaxBreakdown.countyRate, sale.subtotal),
          tenant
        )}
      </strong>
    </p>

    <p>
      <span>City Tax ({usTaxBreakdown.cityRate}%)</span>
      <strong>
        {formatMoney(
          getTaxAmount(usTaxBreakdown.cityRate, sale.subtotal),
          tenant
        )}
      </strong>
    </p>

    <p>
      <span>Total Taxes ({taxRate}%)</span>
      <strong>{formatMoney(sale.taxTotal, tenant)}</strong>
    </p>
  </>
)}

              <p className="receipt-total-line">
                <span>TOTAL</span>
                <strong>{formatMoney(sale.total, tenant)}</strong>
              </p>

              <p>
                <span>PAGADO</span>
                <strong>{formatMoney(sale.amountPaid, tenant)}</strong>
              </p>

              <p>
                <span>CAMBIO</span>
                <strong>{formatMoney(sale.changeAmount, tenant)}</strong>
              </p>
            </div>

            <div className="receipt-separator" />

            <div className="receipt-center">
              <p>TOTAL ITEMS {items.length}</p>
            </div>

            {isDO && qrDataUrl && (
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