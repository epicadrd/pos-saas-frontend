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

const emptyReceipt = {
  invoiceId: "",
  customerName: "",
  concept: "Pago de factura",
  amount: "",
  paymentMethod: "cash",
  reference: "",
  notes: "",
  receiptDate: new Date(),
};

export default function Receipts() {
  const { confirm } = useConfirm();
  const { tenant } = useAuth();
const isDO = isDominicanTenant(tenant);
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
      alert(error.response?.data?.message || "Error cargando recibos");
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
    setForm(emptyReceipt);
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
      alert("El cliente es obligatorio");
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      alert("El monto debe ser mayor a 0");
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
      alert(error.response?.data?.message || "Error creando recibo");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (receipt) => {
    const ok = await confirm({
    title: "Eliminar recibo",
    message: `¿Seguro que quieres eliminar el recibo ${receipt.receiptNumber}? Esta acción no se puede deshacer.`,
    confirmText: "Eliminar",
    variant: "danger",
  });

  if (!ok) return;

    try {
      await api.delete(`/receipts/${receipt.id}`);
      loadReceipts();
      loadInvoices();
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || "Error eliminando recibo");
    }
  };

  const getPaymentMethodLabel = (method) => {
    const methods = {
      cash: "Efectivo",
      transfer: "Transferencia",
      card: "Tarjeta",
      check: "Cheque",
      other: "Otro",
      deposit: "Depósito",
    };

    return methods[method] || method;
  };

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
              <h1>${isDO ? "RECIBO DE PAGO" : "PAYMENT RECEIPT"}</h1>
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
            <div class="signature">Recibido por</div>
            <div class="signature">Cliente</div>
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
          <span>Recibos</span>
          <h2>Pagos y abonos</h2>
          <p>
            Registra pagos completos o abonos por cuotas, vinculados a facturas
            pendientes.
          </p>
        </div>

        <button onClick={openModal} className="primary-btn">
          <Plus size={18} />
          Nuevo recibo
        </button>
      </section>

      <section className="receipt-stats">
        <div className="receipt-stat-card">
          <div className="stat-icon">
            <ReceiptText size={22} />
          </div>
          <div>
            <span>Recibos</span>
            <strong>{stats.totalReceipts}</strong>
          </div>
        </div>

        <div className="receipt-stat-card">
          <div className="stat-icon">
            <WalletCards size={22} />
          </div>
          <div>
            <span>Total recibido</span>
            <strong>{money.format(stats.totalReceived)}</strong>
          </div>
        </div>

        <div className="receipt-stat-card">
          <div className="stat-icon">
            <WalletCards size={22} />
          </div>
          <div>
            <span>Efectivo</span>
            <strong>{money.format(stats.cashTotal)}</strong>
          </div>
        </div>

        <div className="receipt-stat-card">
          <div className="stat-icon">
            <WalletCards size={22} />
          </div>
          <div>
            <span>Transferencia</span>
            <strong>{money.format(stats.transferTotal)}</strong>
          </div>
        </div>
      </section>

      <section className="receipt-panel">
        <div className="receipt-toolbar">
          <div>
            <h3>Listado de recibos</h3>
            <p>Busca, imprime o elimina recibos registrados.</p>
          </div>

          <div className="receipt-search">
            <Search size={18} />
            <input
              placeholder="Buscar recibo, cliente o referencia..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
<div className="receipt-table-wrap receipt-desktop-list">
  <table className="receipt-table">
    <thead>
      <tr>
        <th>Recibo</th>
        <th>Cliente</th>
        {isDO && <th>Factura</th>}
        <th>Método</th>
        <th>Referencia</th>
        <th>Monto</th>
        <th>Fecha</th>
        <th>Creado por</th>
        <th>Acciones</th>
      </tr>
    </thead>

    <tbody>
      {loading ? (
        <tr>
          <td colSpan="9" className="table-empty">
            Cargando recibos...
          </td>
        </tr>
      ) : filteredReceipts.length === 0 ? (
        <tr>
          <td colSpan="9" className="table-empty">
            No hay recibos registrados.
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
            <td>{receipt.creator?.name || "Sistema"}</td>

            <td>
              <div className="table-actions">
                <button onClick={() => handlePrint(receipt)}>
                  <Printer size={17} />
                </button>

                <button
                  className="danger-btn"
                  onClick={() => handleDelete(receipt)}
                >
                  <Trash2 size={17} />
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
            <span>Recibo</span>
            <strong>{receipt.receiptNumber}</strong>
          </div>

          <small>{formatReceiptDate(receipt.receiptDate || receipt.createdAt)}</small>
        </div>

        <div className="receipt-mobile-client">
          <span>Cliente</span>
          <strong>{receipt.customerName || "Sin cliente"}</strong>
        </div>

        <div className="receipt-mobile-money-grid">
          <div>
            <span>Monto</span>
            <strong>{money.format(Number(receipt.amount || 0))}</strong>
          </div>

          <div>
            <span>Método</span>
            <strong>{getPaymentMethodLabel(receipt.paymentMethod)}</strong>
          </div>
        </div>

        {isDO ? (
          <span>Factura {getFiscalNumber(receipt.Invoice)}</span>
        ) : (
          <span>{getPaymentMethodLabel(receipt.paymentMethod)}</span>
        )}
      </button>
    ))
  ) : (
    <div className="receipt-mobile-empty">No hay recibos registrados.</div>
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
          <span>Detalle del recibo</span>
          <h3>{selectedReceipt.receiptNumber}</h3>
        </div>

        <button type="button" onClick={() => setSelectedReceipt(null)}>
          <X size={20} />
        </button>
      </div>

      <div className="receipt-detail-list">
        <div>
          <span>Cliente</span>
          <strong>{selectedReceipt.customerName || "Sin cliente"}</strong>
        </div>

        {isDO && (
          <div>
            <span>Factura</span>
            <strong>{getFiscalNumber(selectedReceipt.Invoice)}</strong>
          </div>
        )}

        <div>
          <span>Concepto</span>
          <strong>{selectedReceipt.concept || "-"}</strong>
        </div>

        <div>
          <span>Método</span>
          <strong>{getPaymentMethodLabel(selectedReceipt.paymentMethod)}</strong>
        </div>

        <div>
          <span>Referencia</span>
          <strong>{selectedReceipt.reference || "-"}</strong>
        </div>

        <div>
          <span>Monto</span>
          <strong>{money.format(Number(selectedReceipt.amount || 0))}</strong>
        </div>

        <div>
          <span>Fecha</span>
          <strong>
            {formatReceiptDate(selectedReceipt.receiptDate || selectedReceipt.createdAt)}
          </strong>
        </div>

        <div>
          <span>Creado por</span>
          <strong>{selectedReceipt.creator?.name || "Sistema"}</strong>
        </div>

        {selectedReceipt.notes && (
          <div>
            <span>Notas</span>
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
          Imprimir
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
          Eliminar
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
                <span>Nuevo recibo</span>
                <h3>Registrar pago</h3>
              </div>

              <button onClick={closeModal} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="receipt-form">
              <div className="receipt-form-grid">
                {isDO && (
                <div className="form-row full">
                  <label>Factura pendiente</label>
                  <select
                    name="invoiceId"
                    value={form.invoiceId}
                    onChange={handleChange}
                  >
                    <option value="">Sin vincular a factura</option>
                    {pendingInvoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {getFiscalNumber(invoice)} - {invoice.customerName} - Pendiente:{" "}
                        {money.format(Number(invoice.balance || 0))}
                      </option>
                    ))}
                  </select>
                </div>
                )}

                <div className="form-row">
                  <label>Cliente *</label>
                  <input
                    name="customerName"
                    value={form.customerName}
                    onChange={handleChange}
                    placeholder="Nombre del cliente"
                  />
                </div>

                <div className="form-row">
                  <label>Monto recibido *</label>
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
                  <label>Fecha</label>
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
                  <label>Método de pago</label>
                  <select
                    name="paymentMethod"
                    value={form.paymentMethod}
                    onChange={handleChange}
                  >
                    <option value="cash">Efectivo</option>
                    <option value="transfer">Transferencia</option>
                    <option value="card">Tarjeta</option>
                    <option value="check">Cheque</option>
                    <option value="deposit">Depósito</option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                <div className="form-row">
                  <label>Referencia</label>
                  <input
                    name="reference"
                    value={form.reference}
                    onChange={handleChange}
                    placeholder="No. transferencia / voucher"
                  />
                </div>

                <div className="form-row full">
                  <label>Concepto</label>
                  <input
                    name="concept"
                    value={form.concept}
                    onChange={handleChange}
                    placeholder="Concepto del pago"
                  />
                </div>

                <div className="form-row full">
                  <label>Notas</label>
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="Observaciones del pago..."
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="cancel-btn">
                  Cancelar
                </button>

                <button disabled={saving} className="primary-btn">
                  {saving ? "Guardando..." : "Guardar recibo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}