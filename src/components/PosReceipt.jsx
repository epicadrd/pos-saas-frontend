import { useEffect, useState } from "react";
import { Printer, X } from "lucide-react";
import QRCode from "qrcode";
import { useAuth } from "../context/AuthContext";
import es from "../i18n/locales/es.json";
import en from "../i18n/locales/en.json";
import {
  getTaxRate,
  getTaxLabel,
  isDominicanTenant,
} from "../utils/taxConfig";

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

const formatDate = (value, language = "es") => {
  if (!value) return "-";

  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "es-DO", {
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
  const { language } = useAuth();
  const dictionary = language === "en" ? en : es;
  const [qrDataUrl, setQrDataUrl] = useState("");

  const t = (path, fallback = "") => {
    const value = path
      .split(".")
      .reduce((acc, key) => acc?.[key], dictionary);

    return value || fallback || path;
  };

  if (!sale) return null;

  const tenant = sale.tenant || {};
  const taxLabel = getTaxLabel(tenant);
  const isDO = isDominicanTenant(tenant);
  const taxRate = getTaxRate(tenant);

  const paymentLabels = {
    cash: t("pos.cash").toUpperCase(),
    card: t("pos.card").toUpperCase(),
    transfer: t("pos.transfer").toUpperCase(),
    check: t("pos.check").toUpperCase(),
    mixed: t("pos.mixed").toUpperCase(),
  };

  const receiptTypeLabels = {
    consumer_final: t("pos.receipt.consumerFinal").toUpperCase(),
    credit_fiscal: t("pos.receipt.creditFiscal").toUpperCase(),
  };

  const getReceiptTypeLabel = (type) =>
    receiptTypeLabels[type] || receiptTypeLabels.consumer_final;

  const usTaxBreakdown = {
    stateRate: Number(tenant?.usStateTaxRate || 0),
    countyRate: Number(tenant?.usCountyTaxRate || 0),
    cityRate: Number(tenant?.usCityTaxRate || 0),
  };

  const getTaxAmount = (rate, base = 0) =>
    Math.round(
      (Number(base || 0) * (Number(rate || 0) / 100) + Number.EPSILON) * 100
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
            <span>{t("pos.receipt.modalTitle")}</span>
            <h3>{sale.saleNumber}</h3>
          </div>

          <button type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="receipt-print-area">
          <div className="receipt-ticket">
            <div className="receipt-center">
              <h2>{tenant.businessName || "Aventra POS"}</h2>

              {isDO && tenant.rnc && <p>{t("pos.receipt.rnc")}: {tenant.rnc}</p>}
              {tenant.phone && <p>{t("pos.receipt.phone")}: {tenant.phone}</p>}
              {tenant.address && <p>{tenant.address}</p>}
            </div>

            <div className="receipt-separator" />

            <div className="receipt-center">
              <h3 className="receipt-type-title">
                {isDO
                  ? getReceiptTypeLabel(receiptType)
                  : t("pos.receipt.saleReceipt").toUpperCase()}
              </h3>
            </div>

            <div className="receipt-info-block receipt-info-lines">
              {isDO && <p>e-NCF: {getFiscalNumber(sale)}</p>}

              {isDO && receiptType === "credit_fiscal" && (
                <>
                  {sale.customerRnc && (
                    <p>{t("pos.receipt.customerRnc")}: {sale.customerRnc}</p>
                  )}
                  {sale.customerName && (
                    <p>
                      {t("pos.receipt.customerBusinessName")}: {sale.customerName}
                    </p>
                  )}
                </>
              )}

              {!isDO && sale.customerName && (
                <p>{t("pos.receipt.customer")}: {sale.customerName}</p>
              )}

              <p>
                {t("pos.receipt.issueDate")}:{" "}
                {formatDate(sale.createdAt, language)}
              </p>
            </div>

            <div className="receipt-separator" />

            <div className="receipt-info-block">
              <p>
                <span>{t("pos.receipt.cashRegister")}:</span>
                <strong>{sale.cashRegister?.name || "-"}</strong>
              </p>

              <p>
                <span>{t("pos.receipt.cashier")}:</span>
                <strong>{sale.user?.name || "-"}</strong>
              </p>

              <p>
                <span>{t("pos.receipt.payment")}:</span>
                <strong>
                  {paymentLabels[sale.paymentMethod] || sale.paymentMethod || "-"}
                </strong>
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
                      <span>
                        {t("pos.receipt.discountShort")}:{" "}
                        {formatMoney(item.discountAmount, tenant)}
                      </span>
                    )}
                  </div>

                  <strong className="receipt-item-total">
                    {formatMoney(item.total, tenant)}
                  </strong>
                </div>
              ))}
            </div>

            <div className="receipt-separator" />

            <div className="receipt-totals">
              <p>
                <span>{t("pos.receipt.subtotal")}</span>
                <strong>{formatMoney(sale.subtotal, tenant)}</strong>
              </p>

              <p>
                <span>{t("pos.receipt.discount")}</span>
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
                    <span>
                      {t("pos.receipt.stateTax")} ({usTaxBreakdown.stateRate}%)
                    </span>
                    <strong>
                      {formatMoney(
                        getTaxAmount(usTaxBreakdown.stateRate, sale.subtotal),
                        tenant
                      )}
                    </strong>
                  </p>

                  <p>
                    <span>
                      {t("pos.receipt.countyTax")} ({usTaxBreakdown.countyRate}%)
                    </span>
                    <strong>
                      {formatMoney(
                        getTaxAmount(usTaxBreakdown.countyRate, sale.subtotal),
                        tenant
                      )}
                    </strong>
                  </p>

                  <p>
                    <span>
                      {t("pos.receipt.cityTax")} ({usTaxBreakdown.cityRate}%)
                    </span>
                    <strong>
                      {formatMoney(
                        getTaxAmount(usTaxBreakdown.cityRate, sale.subtotal),
                        tenant
                      )}
                    </strong>
                  </p>

                  <p>
                    <span>{t("pos.receipt.totalTaxes")} ({taxRate}%)</span>
                    <strong>{formatMoney(sale.taxTotal, tenant)}</strong>
                  </p>
                </>
              )}

              <p className="receipt-total-line">
                <span>{t("pos.receipt.total")}</span>
                <strong>{formatMoney(sale.total, tenant)}</strong>
              </p>

              <p>
                <span>{t("pos.receipt.paid")}</span>
                <strong>{formatMoney(sale.amountPaid, tenant)}</strong>
              </p>

              <p>
                <span>{t("pos.receipt.change")}</span>
                <strong>{formatMoney(sale.changeAmount, tenant)}</strong>
              </p>
            </div>

            <div className="receipt-separator" />

            <div className="receipt-center">
              <p>{t("pos.receipt.totalItems")} {items.length}</p>
            </div>

            {isDO && qrDataUrl && (
              <div className="receipt-qr">
                <img src={qrDataUrl} alt={t("pos.receipt.qrAlt")} />
                <p>{t("pos.receipt.scanQr")}</p>
              </div>
            )}

            <div className="receipt-separator" />

            <div className="receipt-footer">
              <p>{t("pos.receipt.thanks")}</p>
              <small>{t("pos.receipt.issuedBy")}</small>
            </div>
          </div>
        </div>

        <div className="receipt-modal-actions no-print">
          <button type="button" className="primary-btn" onClick={handlePrint}>
            <Printer size={18} />
            {t("pos.receipt.print")}
          </button>

          <button type="button" className="danger-btn" onClick={onClose}>
            {t("pos.receipt.close")}
          </button>
        </div>
      </div>
    </div>
  );
}