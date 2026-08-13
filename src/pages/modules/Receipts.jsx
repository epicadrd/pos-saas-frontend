import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Download,
  ReceiptText,
  Search,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import { api } from "../../api/axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useConfirm } from "../../components/ConfirmProvider";
import { getFiscalNumber } from "../../utils/fiscalNumber";
import { isDominicanTenant } from "../../utils/taxConfig";
import { useAuth } from "../../context/AuthContext";
import es from "../../i18n/locales/es.json";
import en from "../../i18n/locales/en.json";
import { downloadHtmlAsPdf } from "../../utils/downloadPdf";

const emptyReceipt = {
  invoiceId: "",
  customerName: "",
  concept: "",
  amount: "",
  paymentMethod: "cash",
  reference: "",
  notes: "",
  receiptDate: new Date(),
};

export default function Receipts() {
  const { confirm } = useConfirm();
  const { tenant, language } = useAuth();
  const receiptColor = tenant?.primaryColor || "#00bfae";
  const receiptLogo = tenant?.logoDataUrl || "";
  const isDO = isDominicanTenant(tenant);
  const dictionary = language === "en" ? en : es;

  const t = (path, fallback, vars = {}) => {
    const value = path
      .split(".")
      .reduce((acc, key) => acc?.[key], dictionary);

    const text = value || fallback || path;

    return Object.entries(vars).reduce(
      (acc, [key, val]) => acc.replaceAll(`{{${key}}}`, val),
      text
    );
};
  const [receipts, setReceipts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyReceipt);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const money = useMemo(
  () =>
    new Intl.NumberFormat(
      isDO ? "es-DO" : "en-US",
      {
        style: "currency",
        currency: isDO ? "DOP" : "USD",
      }
    ),
  [isDO]
);

  const formatReceiptDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString(
    isDO ? "es-DO" : "en-US"
  );
};

  const filteredReceipts = receipts.filter((receipt) => {
    const text = `${receipt.receiptNumber} ${receipt.customerName} ${receipt.reference || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const pendingInvoices = invoices.filter(
    (invoice) =>
      invoice.status !== "paid" &&
      invoice.status !== "cancelled" &&
      Number(invoice.balance || invoice.total || 0) > 0
  );

  const stats = useMemo(() => {
    const totalReceipts = receipts.length;

    const totalReceived = receipts.reduce(
      (acc, item) => acc + Number(item.amount || 0),
      0
    );

    const cashTotal = receipts
      .filter((item) => item.paymentMethod === "cash")
      .reduce((acc, item) => acc + Number(item.amount || 0), 0);

    const transferTotal = receipts
      .filter((item) => item.paymentMethod === "transfer")
      .reduce((acc, item) => acc + Number(item.amount || 0), 0);

    return {
      totalReceipts,
      totalReceived,
      cashTotal,
      transferTotal,
    };
  }, [receipts]);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/receipts");
      setReceipts(data);
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || t("receipts.messages.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const loadInvoices = async () => {
    try {
      const { data } = await api.get("/invoices");
      setInvoices(data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    loadReceipts();
    loadInvoices();
  }, []);

  const openModal = () => {
  setForm({
    ...emptyReceipt,
    concept: t("receipts.placeholders.defaultConcept"),
  });

  setModalOpen(true);
};

  const closeModal = () => {
    setForm(emptyReceipt);
    setModalOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "invoiceId") {
      const invoice = invoices.find((item) => String(item.id) === String(value));

      if (invoice) {
        setForm({
          ...form,
          invoiceId: value,
          customerName: invoice.customerName,
          concept: `Pago a factura ${getFiscalNumber(invoice)}`,
          amount: invoice.balance || invoice.total || "",
        });
        return;
      }
    }

    setForm({
      ...form,
      [name]: value,
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.customerName.trim()) {
      alert(t("receipts.messages.customerRequired"));
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      alert(t("receipts.messages.amountGreaterThanZero"));
      return;
    }

    try {
      setSaving(true);

     await api.post("/receipts", {
        ...form,
        receiptDate: form.receiptDate
          ? form.receiptDate.toISOString().split("T")[0]
          : null,
        invoiceId: form.invoiceId || null,
        amount: Number(form.amount),
        status: "paid",
      });

      closeModal();
      loadReceipts();
      loadInvoices();
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || t("receipts.messages.createError"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (receipt) => {
   const ok = await confirm({
      title: t("receipts.confirm.deleteTitle"),
      message: t("receipts.confirm.deleteMessage", "", {
        number: receipt.receiptNumber,
      }),
      confirmText: t("receipts.confirm.deleteButton"),
      variant: "danger",
  });

  if (!ok) return;

    try {
      await api.delete(`/receipts/${receipt.id}`);
      loadReceipts();
      loadInvoices();
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || t("receipts.messages.deleteError"));
    }
  };

  const getPaymentMethodLabel = (method) =>
  t(`receipts.paymentMethods.${method}`, method);

  const handlePrint = async (receipt) => {
  try {
    const receiptDate = formatReceiptDate(
      receipt.receiptDate || receipt.createdAt
    );

    const html = `
      <!DOCTYPE html>

      <html>
        <head>
          <meta charset="UTF-8" />

          <title>${receipt.receiptNumber}</title>

          <style>
            body {
              margin: 0;
              padding: 30px 40px;
              box-sizing: border-box;
              font-family: Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
            }

            *,
            *::before,
            *::after {
              box-sizing: border-box;
            }

            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 30px;
              padding-bottom: 15px;
              border-bottom: 2px solid ${receiptColor};
            }

            .brand {
              min-width: 0;
            }

            .logo {
              display: block;
              max-width: 120px;
              max-height: 75px;
              object-fit: contain;
              margin-bottom: 8px;
            }

            h1 {
              margin: 0;
              color: ${receiptColor};
              font-size: 27px;
              line-height: 1.15;
            }

            .receipt-number {
              margin: 5px 0 0;
              color: #475569;
              font-size: 13px;
              font-weight: 700;
            }

            .date {
              min-width: 150px;
              text-align: right;
              font-size: 13px;
              line-height: 1.45;
            }

            .company-info {
              display: flex;
              align-items: center;
              flex-wrap: wrap;
              gap: 5px 18px;
              padding: 10px 2px 12px;
              margin-bottom: 12px;
              color: #475569;
              font-size: 11px;
              line-height: 1.3;
            }

            .company-info span {
              display: inline-flex;
              align-items: center;
            }

            .company-info .company-name {
              color: #0f172a;
              font-weight: 700;
            }

            .box {
              margin-bottom: 16px;
              padding: 15px 17px;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              background: #f8fafc;
              font-size: 13px;
              line-height: 1.7;
              page-break-inside: avoid;
            }

            .amount {
              margin: 20px 0;
              padding: 20px;
              border-radius: 14px;
              background: ${receiptColor}14;
              color: ${receiptColor};
              text-align: center;
              font-size: 28px;
              font-weight: 700;
              page-break-inside: avoid;
            }

            .notes {
              white-space: pre-wrap;
              overflow-wrap: anywhere;
            }

            .signatures {
              display: flex;
              gap: 60px;
              margin-top: 65px;
              page-break-inside: avoid;
            }

            .signature {
              flex: 1;
              padding-top: 9px;
              border-top: 1px solid #0f172a;
              text-align: center;
              color: #475569;
              font-size: 12px;
            }

            .document-footer {
              margin-top: 28px;
              padding-top: 8px;
              border-top: 1px solid #e5e7eb;
              color: #64748b;
              font-size: 10px;
            }
          </style>
        </head>

        <body>
          <div class="header">
            <div class="brand">
              ${
                receiptLogo
                  ? `
                    <img
                      class="logo"
                      src="${receiptLogo}"
                      alt="Logo de la empresa"
                    />
                  `
                  : ""
              }

              <h1>${t("receipts.print.title")}</h1>

              <p class="receipt-number">
                ${receipt.receiptNumber}
              </p>
            </div>

            <div class="date">
              <strong>Fecha:</strong><br/>
              ${receiptDate}
            </div>
          </div>

          <div class="company-info">
            <span class="company-name">
              ${tenant?.businessName || "Mi empresa"}
            </span>

            ${
              isDO && tenant?.rnc
                ? `
                  <span>
                    <strong>RNC/Cédula:</strong>&nbsp;
                    ${tenant.rnc}
                  </span>
                `
                : ""
            }

            ${
              tenant?.phone
                ? `
                  <span>
                    <strong>Teléfono:</strong>&nbsp;
                    ${tenant.phone}
                  </span>
                `
                : ""
            }

            ${
              tenant?.email
                ? `
                  <span>
                    <strong>Email:</strong>&nbsp;
                    ${tenant.email}
                  </span>
                `
                : ""
            }

            ${
              tenant?.address
                ? `
                  <span>
                    <strong>Dirección:</strong>&nbsp;
                    ${tenant.address}
                  </span>
                `
                : ""
            }
          </div>

          <div class="box">
            <strong>Cliente:</strong>
            ${receipt.customerName || "-"}
            <br/>

            <strong>Concepto:</strong>
            ${receipt.concept || "-"}
            <br/>

            <strong>Método:</strong>
            ${getPaymentMethodLabel(receipt.paymentMethod)}
            <br/>

            <strong>Referencia:</strong>
            ${receipt.reference || "-"}
            <br/>

            ${
              isDO && receipt.Invoice
                ? `
                  <strong>Factura:</strong>
                  ${getFiscalNumber(receipt.Invoice)}
                `
                : ""
            }
          </div>

          <div class="amount">
            ${money.format(Number(receipt.amount || 0))}
          </div>

          ${
            receipt.notes
              ? `
                <div class="box notes">
                  <strong>Notas:</strong><br/>
                  ${receipt.notes}
                </div>
              `
              : ""
          }

          <div class="signatures">
            <div class="signature">
              ${t("receipts.print.receivedBy")}
            </div>

            <div class="signature">
              ${t("receipts.print.customer")}
            </div>
          </div>

          <div class="document-footer">
            ${tenant?.businessName || "Mi empresa"}
          </div>
        </body>
      </html>
    `;

    await downloadHtmlAsPdf(
      html,
      receipt.receiptNumber
    );
  } catch (error) {
    console.error(
      "Error descargando el recibo:",
      error
    );

    alert(
      "No se pudo descargar el recibo. Inténtalo nuevamente."
    );
  }
};

  return (
    <div className="receipt-page">
      <section className="receipt-header">
        <div>
          <span>{t("receipts.title")}</span>
          <h2>{t("receipts.subtitle")}</h2>
          <p>{t("receipts.description")}</p>
        </div>

        <button onClick={openModal} className="primary-btn">
          <Plus size={18} />
          {t("receipts.actions.newReceipt")}
        </button>
      </section>

      <section className="receipt-stats">
        <div className="receipt-stat-card">
          <div className="stat-icon">
            <ReceiptText size={22} />
          </div>
          <div>
            <span>{t("receipts.title")}</span>
            <strong>{stats.totalReceipts}</strong>
          </div>
        </div>

        <div className="receipt-stat-card">
          <div className="stat-icon">
            <WalletCards size={22} />
          </div>
          <div>
            <span>{t("receipts.stats.totalReceived")}</span>
            <strong>{money.format(stats.totalReceived)}</strong>
          </div>
        </div>

        <div className="receipt-stat-card">
          <div className="stat-icon">
            <WalletCards size={22} />
          </div>
          <div>
            <span>{t("receipts.stats.cash")}</span>
            <strong>{money.format(stats.cashTotal)}</strong>
          </div>
        </div>

        <div className="receipt-stat-card">
          <div className="stat-icon">
            <WalletCards size={22} />
          </div>
          <div>
            <span>{t("receipts.stats.transfer")}</span>
            <strong>{money.format(stats.transferTotal)}</strong>
          </div>
        </div>
      </section>

      <section className="receipt-panel">
        <div className="receipt-toolbar">
          <div>
            <h3>{t("receipts.messages.toolbarTitle")}</h3>
            <p>{t("receipts.messages.toolbarDescription")}</p>
          </div>

          <div className="receipt-search">
            <Search size={18} />
            <input
              placeholder={t("receipts.placeholders.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="receipt-table-wrap receipt-desktop-list">
  <table className="receipt-table">
    <thead>
      <tr>
        <th>{t("receipts.fields.receipt")}</th>
        <th>{t("receipts.fields.customer")}</th>
        {isDO && <th>{t("receipts.fields.invoice")}</th>}
        <th>{t("receipts.fields.method")}</th>
        <th>{t("receipts.fields.amount")}</th>
        <th>{t("receipts.fields.date")}</th>
        <th>{t("receipts.fields.actions")}</th>
      </tr>
    </thead>

    <tbody>
      {loading ? (
        <tr>
          <td colSpan={isDO ? 7 : 6} className="table-empty">
            {t("receipts.messages.loading")}
          </td>
        </tr>
      ) : filteredReceipts.length === 0 ? (
        <tr>
          <td colSpan={isDO ? 7 : 6} className="table-empty">
            {t("receipts.messages.empty")}
          </td>
        </tr>
      ) : (
        filteredReceipts.map((receipt) => (
          <tr key={receipt.id}>
            <td>
              <div className="receipt-number-cell">
                <div className="receipt-icon">
                  <ReceiptText size={18} />
                </div>

                <strong>{receipt.receiptNumber}</strong>
              </div>
            </td>

            <td>{receipt.customerName}</td>

            {isDO && (
              <td>{getFiscalNumber(receipt.Invoice)}</td>
            )}

            <td>
              {getPaymentMethodLabel(receipt.paymentMethod)}
            </td>

            <td>
              <strong>
                {money.format(Number(receipt.amount || 0))}
              </strong>
            </td>

            <td>
              {formatReceiptDate(
                receipt.receiptDate || receipt.createdAt
              )}
            </td>

            <td>
              <div className="table-actions">
                <button
                  type="button"
                  onClick={() => handlePrint(receipt)}
                  aria-label={t("receipts.actions.print")}
                  title={t("receipts.actions.print")}
                >
                  <Download size={17} />
                </button>

                <button
                  type="button"
                  className="danger-btn"
                  onClick={() => handleDelete(receipt)}
                  aria-label={t("receipts.actions.delete")}
                  title={t("receipts.actions.delete")}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</div>


<div className="receipt-mobile-list">
  {loading ? (
    <div className="receipt-mobile-empty">Cargando recibos...</div>
  ) : filteredReceipts.length ? (
    filteredReceipts.map((receipt) => (
      <button
        type="button"
        key={receipt.id}
        className="receipt-mobile-card"
        onClick={() => setSelectedReceipt(receipt)}
      >
        <div className="receipt-mobile-top">
          <div>
            <span>{t("receipts.fields.receipt")}</span>
            <strong>{receipt.receiptNumber}</strong>
          </div>

          <small>{formatReceiptDate(receipt.receiptDate || receipt.createdAt)}</small>
        </div>

        <div className="receipt-mobile-client">
          <span>{t("receipts.fields.customer")}</span>
          <strong>
            {receipt.customerName || t("receipts.messages.noCustomer")}
          </strong>
        </div>

        <div className="receipt-mobile-money-grid">
          <div>
            <span>{t("receipts.fields.amount")}</span>
            <strong>{money.format(Number(receipt.amount || 0))}</strong>
          </div>

          <div>
            <span>{t("receipts.fields.method")}</span>
            <strong>{getPaymentMethodLabel(receipt.paymentMethod)}</strong>
          </div>
        </div>

        {isDO ? (
          <span>
            {t("receipts.fields.invoice")} {getFiscalNumber(receipt.Invoice)}
          </span>
        ) : (
          <span>{getPaymentMethodLabel(receipt.paymentMethod)}</span>
        )}
      </button>
    ))
  ) : (
    <div className="receipt-mobile-empty">
      {t("receipts.messages.empty")}
    </div>
  )}
</div>

{selectedReceipt && (
  <div
    className="receipt-detail-overlay"
    onClick={() => setSelectedReceipt(null)}
  >
    <div
      className="receipt-detail-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="receipt-detail-header">
        <div>
          <span>{t("receipts.detail.title")}</span>
          <h3>{selectedReceipt.receiptNumber}</h3>
        </div>

        <button type="button" onClick={() => setSelectedReceipt(null)}>
          <X size={20} />
        </button>
      </div>

      <div className="receipt-detail-list">
        <div>
          <span>{t("receipts.fields.customer")}</span>
          <strong>{selectedReceipt.customerName || t("receipts.messages.noCustomer")}</strong>
        </div>

        {isDO && (
          <div>
            <span>{t("receipts.fields.invoice")}</span>
            <strong>{getFiscalNumber(selectedReceipt.Invoice)}</strong>
          </div>
        )}

        <div>
          <span>{t("receipts.fields.concept")}</span>
          <strong>{selectedReceipt.concept || "-"}</strong>
        </div>

        <div>
          <span>{t("receipts.fields.method")}</span>
          <strong>{getPaymentMethodLabel(selectedReceipt.paymentMethod)}</strong>
        </div>

        <div>
          <span>{t("receipts.fields.reference")}</span>
          <strong>{selectedReceipt.reference || "-"}</strong>
        </div>

        <div>
          <span>{t("receipts.fields.amount")}</span>
          <strong>{money.format(Number(selectedReceipt.amount || 0))}</strong>
        </div>

        <div>
          <span>{t("receipts.fields.date")}</span>
          <strong>
            {formatReceiptDate(selectedReceipt.receiptDate || selectedReceipt.createdAt)}
          </strong>
        </div>

        <div>
          <span>{t("receipts.fields.createdBy")}</span>
          <strong>
            {selectedReceipt.creator?.name || t("receipts.messages.system")}
          </strong>
        </div>

        {selectedReceipt.notes && (
          <div>
            <span>{t("receipts.fields.notes")}</span>
            <strong>{selectedReceipt.notes}</strong>
          </div>
        )}
      </div>

      <div className="receipt-detail-actions">
        <button
          type="button"
          className="receipt-action-btn receipt-primary-action"
          onClick={() => handlePrint(selectedReceipt)}
        >
          <Download size={16} />
          {t("receipts.actions.print")}
        </button>

        <button
          type="button"
          className="receipt-danger-action"
          onClick={() => {
            handleDelete(selectedReceipt);
            setSelectedReceipt(null);
          }}
        >
          <Trash2 size={16} />
          {t("receipts.actions.delete")}
        </button>
      </div>
    </div>
  </div>
)}
      </section>

      {modalOpen && (
        <div className="modal-overlay">
          <div className="receipt-modal">
            <div className="modal-header">
              <div>
                <span>{t("receipts.actions.newReceipt")}</span>
                <h3>{t("receipts.subtitle")}</h3>
              </div>

              <button onClick={closeModal} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="receipt-form">
              <div className="receipt-form-grid">
                {isDO && (
                <div className="form-row full">
                  <label>{t("receipts.fields.pendingInvoice")}</label>
                  <select
                    name="invoiceId"
                    value={form.invoiceId}
                    onChange={handleChange}
                  >
                    <option value="">
                      {t("receipts.messages.unlinkedInvoice")}
                    </option>
                    {pendingInvoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {getFiscalNumber(invoice)} - {invoice.customerName} - {t("receipts.messages.pending")}:{" "}
                        {money.format(Number(invoice.balance || 0))}
                      </option>
                    ))}
                  </select>
                </div>
                )}

                <div className="form-row">
                  <label>{t("receipts.fields.customerRequired")}</label>
                  <input
                    name="customerName"
                    value={form.customerName}
                    onChange={handleChange}
                    placeholder={t("receipts.placeholders.customerName")}
                  />
                </div>

                <div className="form-row">
                  <label>{t("receipts.fields.amountReceivedRequired")}</label>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-row">
                  <label>{t("receipts.fields.date")}</label>
                  <DatePicker
                    selected={form.receiptDate}
                    onChange={(date) =>
                      setForm({
                        ...form,
                        receiptDate: date,
                      })
                    }
                    dateFormat={isDO ? "dd/MM/yyyy" : "MM/dd/yyyy"}
                    className="date-picker-input"
                  />
                </div>

                <div className="form-row">
                  <label>{t("receipts.fields.paymentMethod")}</label>
                  <select
                    name="paymentMethod"
                    value={form.paymentMethod}
                    onChange={handleChange}
                  >
                    <option value="cash">{t("receipts.paymentMethods.cash")}</option>
                    <option value="transfer">{t("receipts.paymentMethods.transfer")}</option>
                    <option value="card">{t("receipts.paymentMethods.card")}</option>
                    <option value="check">{t("receipts.paymentMethods.check")}</option>
                    <option value="deposit">{t("receipts.paymentMethods.deposit")}</option>
                    <option value="other">{t("receipts.paymentMethods.other")}</option>
                  </select>
                </div>

                <div className="form-row">
                  <label>{t("receipts.fields.reference")}</label>
                  <input
                    name="reference"
                    value={form.reference}
                    onChange={handleChange}
                    placeholder={t("receipts.placeholders.reference")}
                  />
                </div>

                <div className="form-row full">
                  <label>{t("receipts.fields.concept")}</label>
                  <input
                    name="concept"
                    value={form.concept}
                    onChange={handleChange}
                    placeholder={t("receipts.placeholders.concept")}
                  />
                </div>

                <div className="form-row full">
                  <label>{t("receipts.fields.notes")}</label>
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    placeholder={t("receipts.placeholders.notes")}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="cancel-btn">
                  {t("receipts.actions.cancel")}
                </button>

                <button disabled={saving} className="primary-btn">
                  {
                    saving
                      ? t("receipts.actions.saving")
                      : t("receipts.actions.saveReceipt")
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}