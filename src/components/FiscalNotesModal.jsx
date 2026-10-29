import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Download, Loader2, Plus, RotateCw, Trash2, X } from "lucide-react";
import { api } from "../api/axios";
import { downloadHtmlAsPdf } from "../utils/downloadPdf";
import { ECF_NOTE_TITLES } from "../utils/ecfTypes";
import "../styles/fiscal-notes.css";

const NOTE_OPTIONS = [
  {
    value: "credit-1",
    noteType: "credit",
    code: "1",
    label: "Nota de crédito: anular toda la factura",
    hint: "Devuelve todo: anula la factura y regresa los productos al inventario.",
  },
  {
    value: "credit-3",
    noteType: "credit",
    code: "3",
    label: "Nota de crédito: devolución o descuento parcial",
    hint: "Rebaja solo una parte. Se descuenta del saldo pendiente de la factura.",
  },
  {
    value: "debit-3",
    noteType: "debit",
    code: "3",
    label: "Nota de débito: cargo adicional",
    hint: "Cobra un monto extra sobre la factura (intereses, cargos olvidados, etc.).",
  },
];

const ITBIS_OPTIONS = [18, 16, 0];

// Las notas van en la moneda de la factura que modifican
const moneyFor = (currency) =>
  new Intl.NumberFormat("es-DO", { style: "currency", currency: currency === "USD" ? "USD" : "DOP" });

const round = (value) => Math.round(Number(value || 0) * 100) / 100;

const lineAmounts = (line) => {
  const subtotal = round(Number(line.quantity || 0) * Number(line.unitPrice || 0));
  const tax = round((subtotal * Number(line.taxRate || 0)) / 100);
  return { subtotal, tax, total: round(subtotal + tax) };
};

const isFailedNote = (note) =>
  !note.appliedAt && /^(error|pendiente)/i.test(String(note.electronicInvoiceStatus || ""));

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);

const formatDate = (isoDate) => {
  const [year, month, day] = String(isoDate || "").split("-");
  return year && month && day ? `${day}-${month}-${year}` : "-";
};

export default function FiscalNotesModal({ invoice, tenant, onClose, onChanged }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [option, setOption] = useState("credit-1");
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState([]);
  const [saving, setSaving] = useState(false);
  const [retryingId, setRetryingId] = useState(null);
  const [message, setMessage] = useState(null);

  const money = moneyFor(invoice.currency);
  const exemptOnly = invoice.invoiceType === "special_regime";
  const selected = NOTE_OPTIONS.find((item) => item.value === option);
  const isFullCancel = option === "credit-1";
  const invoiceCancelled = invoice.status === "cancelled";

  const defaultRate = exemptOnly
    ? 0
    : Number(invoice.items?.find((item) => Number(item.tax) > 0)?.taxRate || 0) || 0;

  const invoiceLines = () =>
    (invoice.items || []).map((item) => ({
      productName: item.productName || "Producto",
      quantity: Number(item.quantity || 1),
      unitPrice: round(Number(item.subtotal || 0) / Math.max(Number(item.quantity || 1), 1)),
      taxRate: item.isTaxable === false || Number(item.tax) === 0 ? 0 : Number(item.taxRate || 0),
    }));

  const emptyLine = () => ({ productName: "", quantity: 1, unitPrice: "", taxRate: defaultRate });

  const loadNotes = async () => {
    try {
      const { data } = await api.get("/fiscal-notes", { params: { invoiceId: invoice.id } });
      setNotes(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [invoice.id]);

  useEffect(() => {
    setLines(option === "debit-3" ? [emptyLine()] : option === "credit-3" ? invoiceLines() : []);
  }, [option]);

  const totals = useMemo(() => {
    const source = isFullCancel ? null : lines;
    if (!source) {
      return { subtotal: Number(invoice.subtotal || 0), tax: Number(invoice.tax || 0), total: Number(invoice.total || 0) };
    }
    return source.reduce(
      (acc, line) => {
        const amounts = lineAmounts(line);
        return {
          subtotal: round(acc.subtotal + amounts.subtotal),
          tax: round(acc.tax + amounts.tax),
          total: round(acc.total + amounts.total),
        };
      },
      { subtotal: 0, tax: 0, total: 0 }
    );
  }, [lines, isFullCancel, invoice]);

  const updateLine = (index, field, value) => {
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, [field]: value } : line))
    );
  };

  const submit = async () => {
    setMessage(null);

    if (reason.trim().length < 3) {
      setMessage({ type: "error", text: "Escribe la razón de la nota (por ejemplo: devolución de mercancía)." });
      return;
    }

    const cleanLines = lines.filter((line) => Number(line.quantity) > 0 && Number(line.unitPrice) > 0);

    if (!isFullCancel && !cleanLines.length) {
      setMessage({ type: "error", text: "Agrega al menos una línea con cantidad y precio." });
      return;
    }

    try {
      setSaving(true);
      const { data } = await api.post("/fiscal-notes", {
        invoiceId: invoice.id,
        noteType: selected.noteType,
        modificationCode: selected.code,
        reason: reason.trim(),
        items: isFullCancel ? [] : cleanLines,
      });

      setMessage({
        type: "success",
        text: `${data.message}. e-NCF ${data.note?.eNcf || ""}`.trim(),
      });
      setReason("");
      await loadNotes();
      onChanged?.();
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "No se pudo crear la nota." });
      await loadNotes();
    } finally {
      setSaving(false);
    }
  };

  const retry = async (note) => {
    try {
      setRetryingId(note.id);
      setMessage(null);
      await api.post(`/fiscal-notes/${note.id}/emit`);
      setMessage({ type: "success", text: "Nota enviada correctamente." });
      onChanged?.();
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "No se pudo enviar la nota." });
    } finally {
      setRetryingId(null);
      await loadNotes();
    }
  };

  const printNote = async (note) => {
    const qrDataUrl = note.dgiiQrUrl
      ? await QRCode.toDataURL(note.dgiiQrUrl, { margin: 1, width: 220 })
      : null;
    const title = ECF_NOTE_TITLES[note.noteType];
    const color = tenant?.primaryColor || "#00a99d";

    const rows = (note.lines || [])
      .map(
        (line) => `
          <tr>
            <td>${escapeHtml(line.productName)}</td>
            <td>${Number(line.quantity)}</td>
            <td>${money.format(Number(line.unitPrice))}</td>
            <td>${line.taxRate ? `${line.taxRate}%` : "Exento"}</td>
            <td>${money.format(Number(line.total))}</td>
          </tr>`
      )
      .join("");

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; padding: 28px; font-size: 13px; }
            .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 3px solid ${color}; padding-bottom: 14px; }
            h1 { margin: 0 0 8px; color: ${color}; font-size: 20px; }
            p { margin: 3px 0; }
            .box { background: #f8fafc; padding: 12px 16px; border-radius: 10px; margin: 16px 0; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border-bottom: 1px solid #e5e7eb; padding: 9px; text-align: left; }
            th { background: #f8fafc; }
            .totals { margin-left: auto; width: 280px; margin-top: 14px; }
            .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
            .totals .total { font-weight: bold; font-size: 15px; border-top: 1px solid #cbd5e1; padding-top: 8px; }
            .qr { text-align: center; margin-top: 22px; font-size: 11px; color: #475569; }
            .qr img { width: 110px; height: 110px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              ${tenant?.logoDataUrl ? `<img src="${tenant.logoDataUrl}" style="max-width:120px;max-height:70px;object-fit:contain;margin-bottom:10px;" />` : ""}
              <h1>${title}</h1>
              <p><strong>e-NCF:</strong> ${escapeHtml(note.eNcf || "Pendiente")}</p>
              ${note.noteType === "debit" && note.sequenceExpirationDate ? `<p><strong>Fecha de vencimiento de la secuencia:</strong> ${formatDate(note.sequenceExpirationDate)}</p>` : ""}
              <p><strong>Fecha:</strong> ${formatDate(note.noteDate)}</p>
            </div>
            <div>
              <strong>${escapeHtml(tenant?.legalName || tenant?.businessName || "")}</strong><br/>
              ${escapeHtml(tenant?.address || "")}<br/>
              RNC: ${escapeHtml(tenant?.rnc || "-")}<br/>
              ${escapeHtml(tenant?.phone || "")}
            </div>
          </div>

          <div class="box">
            <strong>Cliente:</strong> ${escapeHtml(note.customerName || "Consumidor final")}<br/>
            <strong>RNC/Cédula:</strong> ${escapeHtml(note.customerRnc || "-")}<br/>
            <strong>Comprobante modificado:</strong> ${escapeHtml(note.referenceENcf)} del ${formatDate(note.referenceDate)}<br/>
            <strong>Motivo:</strong> ${escapeHtml(note.reason)}
          </div>

          <table>
            <thead><tr><th>Descripción</th><th>Cant.</th><th>Precio</th><th>ITBIS</th><th>Total</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>

          <div class="totals">
            <div><span>Subtotal</span><strong>${money.format(Number(note.subtotal))}</strong></div>
            <div><span>ITBIS</span><strong>${money.format(Number(note.tax))}</strong></div>
            <div class="total"><span>Total</span><strong>${money.format(Number(note.total))}</strong></div>
            ${
              note.currency === "USD" && Number(note.exchangeRate) > 0
                ? `<div><span>Tasa de cambio</span><strong>RD$ ${Number(note.exchangeRate).toFixed(2)} por US$ 1</strong></div>`
                : ""
            }
          </div>

          ${
            qrDataUrl
              ? `<div class="qr">
                  <img src="${qrDataUrl}" alt="Código QR" />
                  <p>Consulte este comprobante en la DGII</p>
                  ${note.securityCode ? `<p><strong>Código de seguridad:</strong> ${escapeHtml(note.securityCode)}</p>` : ""}
                  ${note.signedDate ? `<p><strong>Fecha de firma digital:</strong> ${escapeHtml(note.signedDate)}</p>` : ""}
                </div>`
              : ""
          }
        </body>
      </html>`;

    await downloadHtmlAsPdf(html, note.eNcf || `nota-${note.id}`);
  };

  return (
    <div
      className="qb-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div className="qb-quick-product-modal fiscal-notes-modal" role="dialog" aria-modal="true">
        <div className="qb-modal-head">
          <div>
            <span>Notas de crédito y débito</span>
            <h3>Factura {invoice.eNcf}</h3>
            <p>
              {invoice.customerName || "Consumidor final"} · Total {money.format(Number(invoice.total || 0))}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="fiscal-notes-body">
          {message && <div className={`fiscal-notes-message is-${message.type}`}>{message.text}</div>}

          {loading ? (
            <p className="fiscal-notes-muted">Cargando notas...</p>
          ) : notes.length > 0 ? (
            <div className="fiscal-notes-list">
              {notes.map((note) => (
                <div key={note.id} className="fiscal-notes-item">
                  <div>
                    <strong>
                      {note.noteType === "credit" ? "Nota de crédito" : "Nota de débito"} {note.eNcf || ""}
                    </strong>
                    <small>
                      {formatDate(note.noteDate)} · {note.reason} · {note.electronicInvoiceStatus || "Pendiente"}
                    </small>
                  </div>
                  <b>{money.format(Number(note.total))}</b>
                  <div className="fiscal-notes-item-actions">
                    {note.eNcf && !isFailedNote(note) && (
                      <button type="button" className="qb-secondary-btn" onClick={() => printNote(note)}>
                        <Download size={15} /> PDF
                      </button>
                    )}
                    {isFailedNote(note) && (
                      <button
                        type="button"
                        className="qb-secondary-btn"
                        disabled={retryingId === note.id}
                        onClick={() => retry(note)}
                      >
                        {retryingId === note.id ? <Loader2 size={15} className="qb-spin" /> : <RotateCw size={15} />}
                        Reintentar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {invoiceCancelled ? (
            <p className="fiscal-notes-muted">Esta factura ya está anulada.</p>
          ) : (
            <>
              <h4>Nueva nota</h4>

              <div className="fiscal-notes-options">
                {NOTE_OPTIONS.map((item) => (
                  <label key={item.value} className={option === item.value ? "is-selected" : ""}>
                    <input
                      type="radio"
                      name="fiscal-note-option"
                      value={item.value}
                      checked={option === item.value}
                      onChange={() => setOption(item.value)}
                    />
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.hint}</small>
                    </span>
                  </label>
                ))}
              </div>

              <label className="fiscal-notes-field">
                Razón
                <input
                  value={reason}
                  maxLength={90}
                  placeholder={isFullCancel ? "Ej.: Factura emitida por error" : "Ej.: Devolución de 2 unidades"}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>

              {!isFullCancel && (
                <div className="fiscal-notes-lines">
                  <div className="fiscal-notes-line is-head">
                    <span>Descripción</span>
                    <span>Cant.</span>
                    <span>Precio (sin ITBIS)</span>
                    <span>ITBIS</span>
                    <span />
                  </div>

                  {lines.map((line, index) => (
                    <div key={index} className="fiscal-notes-line">
                      <input
                        value={line.productName}
                        maxLength={80}
                        placeholder="Descripción"
                        onChange={(event) => updateLine(index, "productName", event.target.value)}
                      />
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={line.quantity}
                        onChange={(event) => updateLine(index, "quantity", event.target.value)}
                      />
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={line.unitPrice}
                        onChange={(event) => updateLine(index, "unitPrice", event.target.value)}
                      />
                      <select
                        value={line.taxRate}
                        disabled={exemptOnly}
                        onChange={(event) => updateLine(index, "taxRate", Number(event.target.value))}
                      >
                        {ITBIS_OPTIONS.map((rate) => (
                          <option key={rate} value={rate}>
                            {rate ? `${rate}%` : "Exento"}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="fiscal-notes-remove"
                        aria-label="Quitar línea"
                        onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}

                  <button type="button" className="qb-secondary-btn" onClick={() => setLines((current) => [...current, emptyLine()])}>
                    <Plus size={15} /> Agregar línea
                  </button>
                </div>
              )}

              <div className="fiscal-notes-totals">
                <span>Subtotal {money.format(totals.subtotal)}</span>
                <span>ITBIS {money.format(totals.tax)}</span>
                <strong>Total de la nota {money.format(totals.total)}</strong>
              </div>
            </>
          )}
        </div>

        <div className="qb-modal-actions">
          <button type="button" className="qb-secondary-btn" onClick={onClose} disabled={saving}>
            Cerrar
          </button>
          {!invoiceCancelled && (
            <button type="button" className="qb-primary-btn" onClick={submit} disabled={saving}>
              {saving ? <Loader2 size={16} className="qb-spin" /> : null}
              {saving ? "Enviando a la DGII..." : "Emitir nota"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
