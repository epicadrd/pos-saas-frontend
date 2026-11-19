import QRCode from "qrcode";
import { downloadHtmlAsPdf } from "./downloadPdf";
import { ECF_NOTE_TITLES } from "./ecfTypes";

/*
 * PDF de una nota de crédito (E34) o débito (E33). Lo usan el modal de
 * notas de cada factura y la lista general de notas.
 */

// Las notas van en la moneda de la factura que modifican
export const noteMoneyFor = (currency) =>
  new Intl.NumberFormat("es-DO", { style: "currency", currency: currency === "USD" ? "USD" : "DOP" });

const moneyFor = noteMoneyFor;

export const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);

// "2026-11-19" -> "19-11-2026"
export const formatNoteDate = (isoDate) => {
  const [year, month, day] = String(isoDate || "").split("-");
  return year && month && day ? `${day}-${month}-${year}` : "-";
};

const formatDate = formatNoteDate;

// La nota no llegó a la DGII y se puede reintentar
export const isFailedNote = (note) =>
  !note.appliedAt && /^(error|pendiente)/i.test(String(note.electronicInvoiceStatus || ""));

export const downloadFiscalNotePdf = async (note, tenant) => {
  const money = moneyFor(note.currency);
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
