import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileMinus, FilePlus, FileText, Loader2, Search } from "lucide-react";
import { api } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import FiscalNotesModal from "../../components/FiscalNotesModal";
import { toDop } from "../../utils/currency";
import {
  downloadFiscalNotePdf,
  formatNoteDate,
  isFailedNote,
  noteMoneyFor,
} from "../../utils/fiscalNotePdf";

/*
 * Lista de todas las notas de crédito (E34) y débito (E33) de la empresa.
 * Cada nota se crea y se reintenta desde su factura; aquí se consultan,
 * se descargan y se abre la factura para ver sus notas.
 */

const NOTE_TYPE_LABELS = {
  credit: "Nota de crédito",
  debit: "Nota de débito",
};

// Estado ante la DGII a partir del texto que guarda la nota
const getNoteStatus = (note) => {
  const text = String(note.electronicInvoiceStatus || "").trim();
  const lower = text.toLowerCase();

  if (lower.startsWith("aceptado")) return { key: "accepted", label: text, badge: "ok" };
  if (lower.startsWith("rechazado")) return { key: "rejected", label: text, badge: "danger" };
  if (isFailedNote(note)) return { key: "failed", label: "No enviada", badge: "warning" };

  return { key: "processing", label: text || "En proceso", badge: "info" };
};

const STATUS_FILTERS = [
  { value: "", label: "Todos los estados" },
  { value: "accepted", label: "Aceptadas" },
  { value: "processing", label: "En proceso" },
  { value: "rejected", label: "Rechazadas" },
  { value: "failed", label: "No enviadas" },
];

const TYPE_FILTERS = [
  { value: "", label: "Crédito y débito" },
  { value: "credit", label: "Notas de crédito" },
  { value: "debit", label: "Notas de débito" },
];

const pesos = new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" });

export default function FiscalNotes() {
  const navigate = useNavigate();
  const { tenant } = useAuth();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);
  const [openingId, setOpeningId] = useState(null);
  const [noteInvoice, setNoteInvoice] = useState(null);

  const loadNotes = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get("/fiscal-notes");
      setNotes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudieron cargar las notas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const filteredNotes = useMemo(() => {
    const term = search.trim().toLowerCase();

    return notes.filter((note) => {
      if (typeFilter && note.noteType !== typeFilter) return false;
      if (statusFilter && getNoteStatus(note).key !== statusFilter) return false;
      if (!term) return true;

      return [note.eNcf, note.referenceENcf, note.customerName, note.customerRnc, note.reason]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [notes, search, typeFilter, statusFilter]);

  // Los montos en US$ se suman en pesos con la tasa de su factura
  const stats = useMemo(() => {
    const accepted = filteredNotes.filter((note) => getNoteStatus(note).key === "accepted");

    return {
      credited: accepted
        .filter((note) => note.noteType === "credit")
        .reduce((acc, note) => acc + toDop(note.total, note), 0),
      debited: accepted
        .filter((note) => note.noteType === "debit")
        .reduce((acc, note) => acc + toDop(note.total, note), 0),
      count: filteredNotes.length,
      failed: filteredNotes.filter((note) => getNoteStatus(note).key === "failed").length,
    };
  }, [filteredNotes]);

  const downloadPdf = async (note) => {
    try {
      setDownloadingId(note.id);
      await downloadFiscalNotePdf(note, tenant);
    } finally {
      setDownloadingId(null);
    }
  };

  // Abre la factura con sus notas (ahí se reintenta o se crea otra)
  const openInvoice = async (note) => {
    try {
      setOpeningId(note.id);
      const { data } = await api.get(`/invoices/${note.invoiceId}`);
      setNoteInvoice(data.invoice || data);
    } catch (err) {
      alert(err.response?.data?.message || "No se pudo abrir la factura de esta nota.");
    } finally {
      setOpeningId(null);
    }
  };

  const renderStatus = (note) => {
    const status = getNoteStatus(note);
    return <span className={`badge ${status.badge}`}>{status.label}</span>;
  };

  const renderActions = (note) => (
    <div className="fiscal-notes-page-actions">
      {note.eNcf && !isFailedNote(note) && (
        <button
          type="button"
          className="qb-secondary-btn"
          disabled={downloadingId === note.id}
          onClick={(event) => {
            event.stopPropagation();
            downloadPdf(note);
          }}
        >
          {downloadingId === note.id ? <Loader2 size={15} className="qb-spin" /> : <Download size={15} />}
          PDF
        </button>
      )}

      <button
        type="button"
        className="qb-secondary-btn"
        disabled={openingId === note.id}
        onClick={(event) => {
          event.stopPropagation();
          openInvoice(note);
        }}
      >
        {openingId === note.id ? <Loader2 size={15} className="qb-spin" /> : <FileText size={15} />}
        {isFailedNote(note) ? "Reintentar" : "Ver factura"}
      </button>
    </div>
  );

  return (
    <div className="payment-history-page fiscal-notes-page">
      <div className="payment-history-header">
        <div>
          <button
            type="button"
            className="fiscal-notes-page-back"
            onClick={() => navigate("/dashboard/facturacion")}
          >
            <ArrowLeft size={16} /> Facturación
          </button>
          <h1>Notas de crédito y débito</h1>
          <p>
            Todas las notas de crédito (E34) y débito (E33) de tu empresa. Para crear una nota
            nueva, abre la factura que quieres modificar.
          </p>
        </div>
      </div>

      <div className="payment-history-filters">
        <div className="payment-search">
          <Search size={18} />
          <input
            placeholder="Buscar por e-NCF, factura, cliente o motivo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          {TYPE_FILTERS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_FILTERS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="payment-stats-grid">
        <div className="payment-stat-card">
          <div className="payment-stat-icon">
            <FileMinus size={22} />
          </div>
          <div>
            <span>Acreditado (aceptadas)</span>
            <strong>{pesos.format(stats.credited)}</strong>
          </div>
        </div>

        <div className="payment-stat-card">
          <div className="payment-stat-icon">
            <FilePlus size={22} />
          </div>
          <div>
            <span>Debitado (aceptadas)</span>
            <strong>{pesos.format(stats.debited)}</strong>
          </div>
        </div>

        <div className="payment-stat-card">
          <div className="payment-stat-icon">
            <FileText size={22} />
          </div>
          <div>
            <span>Notas</span>
            <strong>{stats.count}</strong>
          </div>
        </div>

        <div className="payment-stat-card">
          <div className="payment-stat-icon">
            <FileText size={22} />
          </div>
          <div>
            <span>Sin enviar a la DGII</span>
            <strong>{stats.failed}</strong>
          </div>
        </div>
      </div>

      {error && <div className="fiscal-notes-page-error">{error}</div>}

      <div className="payment-table-card payment-history-desktop">
        <table className="payment-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>e-NCF</th>
              <th>Tipo</th>
              <th>Factura modificada</th>
              <th>Cliente</th>
              <th>Motivo</th>
              <th>Total</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {filteredNotes.map((note) => (
              <tr key={note.id}>
                <td>{formatNoteDate(note.noteDate)}</td>
                <td><strong>{note.eNcf || "—"}</strong></td>
                <td>{NOTE_TYPE_LABELS[note.noteType] || note.noteType}</td>
                <td>{note.referenceENcf}</td>
                <td>{note.customerName || "Consumidor final"}</td>
                <td className="fiscal-notes-page-reason">{note.reason}</td>
                <td>
                  <strong>{noteMoneyFor(note.currency).format(Number(note.total || 0))}</strong>
                </td>
                <td>{renderStatus(note)}</td>
                <td>{renderActions(note)}</td>
              </tr>
            ))}

            {!filteredNotes.length && (
              <tr>
                <td colSpan="9" className="payment-empty">
                  {loading
                    ? "Cargando notas..."
                    : notes.length
                      ? "Ninguna nota coincide con la búsqueda."
                      : "Todavía no tienes notas de crédito ni de débito."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="payment-history-mobile">
        {filteredNotes.length ? (
          filteredNotes.map((note) => (
            <div key={note.id} className="payment-mobile-card">
              <div className="payment-mobile-card-top">
                <div>
                  <span>{NOTE_TYPE_LABELS[note.noteType] || note.noteType}</span>
                  <strong>{note.eNcf || "Sin e-NCF"}</strong>
                </div>
                <small>{formatNoteDate(note.noteDate)}</small>
              </div>

              <div className="payment-mobile-client">
                <span>Factura {note.referenceENcf}</span>
                <strong>{note.customerName || "Consumidor final"}</strong>
              </div>

              <div className="payment-mobile-money-grid">
                <div>
                  <span>Total</span>
                  <strong>{noteMoneyFor(note.currency).format(Number(note.total || 0))}</strong>
                </div>
                <div>
                  <span>Estado</span>
                  <strong>{renderStatus(note)}</strong>
                </div>
              </div>

              <div className="payment-mobile-footer">
                <span className="fiscal-notes-page-reason">{note.reason}</span>
              </div>

              {renderActions(note)}
            </div>
          ))
        ) : (
          <div className="payment-mobile-empty">
            {loading
              ? "Cargando notas..."
              : notes.length
                ? "Ninguna nota coincide con la búsqueda."
                : "Todavía no tienes notas de crédito ni de débito."}
          </div>
        )}
      </div>

      {noteInvoice && (
        <FiscalNotesModal
          invoice={noteInvoice}
          tenant={tenant}
          onClose={() => setNoteInvoice(null)}
          onChanged={loadNotes}
        />
      )}
    </div>
  );
}
