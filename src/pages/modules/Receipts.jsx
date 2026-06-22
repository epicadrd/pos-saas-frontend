import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Printer,
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

  const handlePrint = (receipt) => {
    const html = `
      <html>
        <head>
          <title>${receipt.receiptNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              color: #0f172a;
            }

            .header {
              display: flex;
              justify-content: space-between;
              border-bottom: 2px solid #00bfae;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }

            h1 {
              margin: 0;
              color: #00bfae;
            }

            .box {
              border: 1px solid #e5e7eb;
              border-radius: 14px;
              padding: 18px;
              margin-bottom: 20px;
            }

            .amount {
              background: #eef2ff;
              border-radius: 18px;
              padding: 24px;
              font-size: 28px;
              font-weight: bold;
              color: #00bfae;
              text-align: center;
              margin: 30px 0;
            }

            .signatures {
              display: flex;
              gap: 70px;
              margin-top: 80px;
            }

            .signature {
              flex: 1;
              text-align: center;
              border-top: 1px solid #0f172a;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>${t("receipts.print.title")}</h1>
              <p>${receipt.receiptNumber}</p>
            </div>
            <div>
              <strong>Fecha:</strong><br/>
             ${formatReceiptDate(receipt.receiptDate || receipt.createdAt)}
            </div>
          </div>

          <div class="box">
            <strong>Cliente:</strong> ${receipt.customerName}<br/>
            <strong>Concepto:</strong> ${receipt.concept}<br/>
            <strong>Método:</strong> ${getPaymentMethodLabel(receipt.paymentMethod)}<br/>
            <strong>Referencia:</strong> ${receipt.reference || "-"}<br/>
            ${
              isDO
                ? `<strong>Factura:</strong> ${getFiscalNumber(receipt.Invoice)}`
                : ""
            }
          </div>

          <div class="amount">
            ${money.format(Number(receipt.amount))}
          </div>

          ${
            receipt.notes
              ? `<div class="box"><strong>Notas:</strong><br/>${receipt.notes}</div>`
              : ""
          }

          <div class="signatures">
            <div class="signature">${t("receipts.print.receivedBy")}</div>
            <div class="signature">${t("receipts.print.customer")}</div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
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
        <th>{t("receipts.fields.reference")}</th>
        <th>{t("receipts.fields.amount")}</th>
        <th>{t("receipts.fields.date")}</th>
        <th>{t("receipts.fields.createdBy")}</th>
        <th>{t("receipts.fields.actions")}</th>
      </tr>
    </thead>

    <tbody>
      {loading ? (
        <tr>
          <td colSpan="9" className="table-empty">
            {t("receipts.messages.loading")}
          </td>
        </tr>
      ) : filteredReceipts.length === 0 ? (
        <tr>
          <td colSpan="9" className="table-empty">
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
            {isDO && <td>{getFiscalNumber(receipt.Invoice)}</td>}
            <td>{getPaymentMethodLabel(receipt.paymentMethod)}</td>
            <td>{receipt.reference || "-"}</td>
            <td>
              <strong>{money.format(Number(receipt.amount || 0))}</strong>
            </td>
            <td>{formatReceiptDate(receipt.receiptDate || receipt.createdAt)}</td>
            <td>{receipt.creator?.name || t("receipts.messages.system")}</td>

            <td>
              <div className="table-actions">
                <button onClick={() => handlePrint(receipt)}>
                  <Printer size={17} />
                </button>

                <button
                  className="danger-btn"
                  onClick={() => handleDelete(receipt)}
                >
                  <Trash2 size={18}/>
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
          <Printer size={16} />
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