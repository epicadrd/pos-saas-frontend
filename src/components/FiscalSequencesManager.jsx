import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FileDigit,
  FileSpreadsheet,
  Loader2,
  Plus,
  Power,
  Trash2,
  Upload,
} from "lucide-react";
import { api } from "../api/axios";
import { useConfirm } from "./ConfirmProvider";
import { mergeRanges, readFiscalNumbersFile } from "../utils/fiscalNumbersFile";

const MAX_SEQUENCE = 9999999999;
const LOW_STOCK_RATIO = 0.1;
const LOW_STOCK_MIN = 20;
const EXPIRY_WARNING_DAYS = 30;

const USAGE_STATUS = {
  RESERVED: { label: "Envío sin confirmar", tone: "warning" },
  FAILED: { label: "Error al enviar", tone: "danger" },
  SENT: { label: "Enviado", tone: "info" },
  ACCEPTED: { label: "Aceptado", tone: "success" },
  REJECTED: { label: "Rechazado por la DGII", tone: "danger" },
  VOIDED: { label: "Por anular", tone: "muted" },
};

const formatENcf = (tipo, number) => `E${tipo}${String(number).padStart(10, "0")}`;

// La DGII no les pone vencimiento a E32 ni E34
const NON_EXPIRING_TYPES = ["32", "34"];

const formatDate = (value) => {
  if (!value) return "—";
  if (String(value).startsWith("9999")) return "No vence";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString("es-DO") : "—";

const daysUntil = (dateOnly, today) =>
  Math.round(
    (Date.parse(`${dateOnly}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
      86400000
  );

const number = new Intl.NumberFormat("es-DO");

// Misma regla que el servidor: e-NCF completo o solo la secuencia
const parseSequence = (value, tipo) => {
  const clean = String(value || "").trim().toUpperCase().replace(/[\s-]/g, "");
  if (!clean) return { error: "Requerido" };

  if (/^E\d{12}$/.test(clean)) {
    if (clean.slice(1, 3) !== tipo) {
      return { error: `Este e-NCF es tipo ${clean.slice(1, 3)}, no ${tipo}` };
    }
    return { value: Number(clean.slice(3)) };
  }

  if (/^\d{1,10}$/.test(clean)) return { value: Number(clean) };

  return { error: `Formato inválido. Ej.: E${tipo}0000000001` };
};

const emptyForm = () => ({
  tipoECF: "32",
  start: "",
  end: "",
  expirationDate: "",
});

export default function FiscalSequencesManager() {
  const { confirm } = useConfirm();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [upload, setUpload] = useState(null);
  const [uploadDate, setUploadDate] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setLoadError("");
      const { data: response } = await api.get("/fiscal-sequences");
      setData(response);
      return response;
    } catch (error) {
      setLoadError(
        error.response?.status === 403
          ? "Solo el dueño o un administrador de la empresa puede gestionar los rangos de e-NCF."
          : error.response?.data?.message || "No se pudieron cargar los rangos de e-NCF."
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const types = data?.types || {};
  const environments = data?.environments || [];
  const envLabel = (value) =>
    environments.find((env) => env.value === value)?.label || value;

  const preview = useMemo(() => {
    const start = parseSequence(form.start, form.tipoECF);
    const end = parseSequence(form.end, form.tipoECF);
    const errors = {};

    if (form.start && start.error) errors.start = start.error;
    if (form.end && end.error) errors.end = end.error;

    if (!errors.start && !errors.end && start.value !== undefined && end.value !== undefined) {
      if (start.value < 1) errors.start = "Debe ser mayor que cero";
      else if (end.value > MAX_SEQUENCE) errors.end = "Excede el máximo permitido";
      else if (start.value > end.value) errors.end = "Debe ser mayor o igual al inicial";
    }

    const needsExpiration = !NON_EXPIRING_TYPES.includes(form.tipoECF);

    if (needsExpiration && form.expirationDate && data?.today && form.expirationDate < data.today) {
      errors.expirationDate = "La fecha ya pasó";
    }

    const ready =
      !Object.keys(errors).length &&
      start.value !== undefined &&
      end.value !== undefined &&
      (!needsExpiration || Boolean(form.expirationDate));

    return {
      errors,
      ready,
      count: ready ? end.value - start.value + 1 : 0,
      first: ready ? formatENcf(form.tipoECF, start.value) : null,
      last: ready ? formatENcf(form.tipoECF, end.value) : null,
    };
  }, [form, data?.today]);

  // Avisos para los tipos que Aventra emite en el entorno actual
  const alerts = useMemo(() => {
    if (!data?.currentEnvironment) return [];

    const list = [];

    for (const tipo of ["31", "32"]) {
      const usable = data.sequences.filter(
        (seq) =>
          seq.environment === data.currentEnvironment &&
          seq.tipoECF === tipo &&
          seq.usable
      );
      const remaining = usable.reduce((acc, seq) => acc + seq.remaining, 0);
      const total = usable.reduce((acc, seq) => acc + seq.total, 0);
      const label = `E${tipo} (${types[tipo] || ""})`;

      if (!usable.length) {
        list.push({
          tone: "danger",
          text: `No tienes números ${label} disponibles. Las facturas de este tipo no se podrán emitir como e-CF hasta que registres un rango.`,
        });
        continue;
      }

      if (remaining <= Math.max(LOW_STOCK_MIN, total * LOW_STOCK_RATIO)) {
        list.push({
          tone: "warning",
          text: `Quedan ${number.format(remaining)} números ${label}. Solicita un nuevo rango a la DGII antes de que se agoten.`,
        });
      }

      const soonest = usable
        .map((seq) => seq.expirationDate)
        .sort()[0];
      const days = daysUntil(soonest, data.today);

      if (days <= EXPIRY_WARNING_DAYS) {
        list.push({
          tone: "warning",
          text: `Tu rango ${label} vence el ${formatDate(soonest)} (${days === 0 ? "hoy" : `en ${days} día(s)`}).`,
        });
      }
    }

    return list;
  }, [data, types]);

  const toAnnul = useMemo(() => {
    if (!data) return 0;
    const fromRanges = data.sequences.reduce((acc, seq) => acc + seq.unusedToAnnul, 0);
    const voided = data.incidents.filter((item) => item.status === "VOIDED").length;
    return fromRanges + voided;
  }, [data]);

  const showError = (error, fallback) =>
    setNotice({ tone: "danger", text: error.response?.data?.message || fallback });

  const submit = async (event) => {
    event.preventDefault();
    setNotice(null);

    if (!preview.ready) {
      setNotice({ tone: "danger", text: "Completa el rango y la fecha de vencimiento." });
      return;
    }

    const ok = await confirm({
      title: "Registrar rango de e-NCF",
      message: `Vas a registrar ${number.format(preview.count)} número(s) ${preview.first} a ${preview.last}, tipo ${form.tipoECF} (${types[form.tipoECF]}), ${NON_EXPIRING_TYPES.includes(form.tipoECF) ? "sin vencimiento" : `con vencimiento ${formatDate(form.expirationDate)}`}. Verifica que coincida exactamente con lo que te autorizó la DGII.`,
      confirmText: "Registrar rango",
      variant: "success",
    });

    if (!ok) return;

    try {
      setSaving(true);
      await api.post("/fiscal-sequences", form);
      setForm((current) => ({ ...emptyForm(), tipoECF: current.tipoECF }));
      setNotice({ tone: "success", text: "Rango registrado correctamente." });
      await load();
    } catch (error) {
      showError(error, "No se pudo registrar el rango.");
    } finally {
      setSaving(false);
    }
  };

  const resetUpload = () => {
    setUpload(null);
    setUploadDate("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toPayload = (ranges) =>
    ranges.map((range) => ({
      tipoECF: range.tipoECF,
      start: range.start,
      end: range.end,
      expirationDate: range.expirationDate,
    }));

  // El servidor revisa los rangos sin guardar nada, para mostrar el resumen
  const analyzeUpload = async (fileName, ranges) => {
    setUpload({ fileName, ranges, analyzing: true });

    try {
      const { data: analysis } = await api.post("/fiscal-sequences/import", {
        ranges: toPayload(ranges),
        dryRun: true,
      });
      setUpload({ fileName, ranges, analysis });
    } catch (error) {
      setUpload({
        fileName,
        ranges,
        error: error.response?.data?.message || "No se pudo revisar el archivo.",
      });
    }
  };

  const ACCEPTED_FILE = /\.(xlsx|xls|csv|txt)$/i;

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDragging(true);
  };

  const handleDragLeave = (event) => {
    // Al pasar sobre los elementos internos también se dispara; se ignora
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    if (!ACCEPTED_FILE.test(file.name)) {
      setUpload({
        fileName: file.name,
        error: "Ese archivo no es un Excel. Arrastra el archivo .xlsx, .xls o .csv de la DGII.",
      });
      return;
    }

    processFile(file);
  };

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = async (file) => {
    setNotice(null);
    setUploadDate("");
    setUpload({ fileName: file.name, reading: true });

    try {
      const { ranges, ignoredTypes } = await readFiscalNumbersFile(
        file,
        Object.keys(types)
      );

      if (!ranges.length) {
        setUpload({
          fileName: file.name,
          error:
            "No encontramos números e-NCF en este archivo. Los números deben verse así: E320000000001.",
        });
        return;
      }

      if (ranges.some((range) => !range.expirationDate && !NON_EXPIRING_TYPES.includes(range.tipoECF))) {
        setUpload({ fileName: file.name, ranges, ignoredTypes, needsDate: true });
        return;
      }

      await analyzeUpload(file.name, ranges);
    } catch {
      setUpload({
        fileName: file.name,
        error: "No se pudo leer el archivo. Sube el Excel tal como lo descargaste de la DGII.",
      });
    }
  };

  const applyUploadDate = () => {
    if (!uploadDate) return;

    const ranges = mergeRanges(
      upload.ranges.map((range) => ({
        ...range,
        expirationDate: range.expirationDate || uploadDate,
      }))
    );

    analyzeUpload(upload.fileName, ranges);
  };

  const confirmUpload = async () => {
    const pending = upload.analysis.ranges.filter((range) => !range.alreadyRegistered);

    const ok = await confirm({
      title: "Registrar números e-NCF",
      message: `Se registrarán ${number.format(upload.analysis.newNumbers)} número(s) en ${pending.length} rango(s). Aventra los usará en orden al emitir cada factura, hasta que se agoten.`,
      confirmText: "Registrar números",
      variant: "success",
    });

    if (!ok) return;

    try {
      setSaving(true);
      const { data: result } = await api.post("/fiscal-sequences/import", {
        ranges: toPayload(upload.ranges),
        fileName: upload.fileName,
      });
      resetUpload();
      setNotice({
        tone: "success",
        text: `Listo: se registraron ${number.format(result.newNumbers)} número(s) e-NCF.`,
      });
      await load();
    } catch (error) {
      setUpload({
        ...upload,
        analysis: null,
        error: error.response?.data?.message || "No se pudieron registrar los números.",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleSequence = async (seq) => {
    const enabling = seq.status === "disabled";

    const ok = await confirm({
      title: enabling ? "Activar rango" : "Desactivar rango",
      message: enabling
        ? `El rango ${seq.startENcf} – ${seq.endENcf} volverá a usarse para emitir.`
        : `No se emitirán más números del rango ${seq.startENcf} – ${seq.endENcf}. Los ${number.format(seq.remaining)} número(s) sin usar deberán anularse ante la DGII si no lo reactivas.`,
      confirmText: enabling ? "Activar" : "Desactivar",
      variant: enabling ? "success" : "danger",
    });

    if (!ok) return;

    try {
      setBusyId(seq.id);
      await api.patch(`/fiscal-sequences/${seq.id}/status`, { enabled: enabling });
      await load();
    } catch (error) {
      showError(error, "No se pudo actualizar el rango.");
    } finally {
      setBusyId(null);
    }
  };

  const changeExpiration = async (seq) => {
    const value = window.prompt(
      `Nueva fecha de vencimiento para ${seq.startENcf} – ${seq.endENcf} (AAAA-MM-DD):`,
      seq.expirationDate
    );

    if (!value || value === seq.expirationDate) return;

    try {
      setBusyId(seq.id);
      await api.patch(`/fiscal-sequences/${seq.id}/expiration`, {
        expirationDate: value.trim(),
      });
      await load();
    } catch (error) {
      showError(error, "No se pudo cambiar la fecha.");
    } finally {
      setBusyId(null);
    }
  };

  const removeSequence = async (seq) => {
    const ok = await confirm({
      title: "Eliminar rango",
      message: `Se eliminará el rango ${seq.startENcf} – ${seq.endENcf}. Solo es posible porque todavía no se ha usado ningún número.`,
      confirmText: "Eliminar",
    });

    if (!ok) return;

    try {
      setBusyId(seq.id);
      await api.delete(`/fiscal-sequences/${seq.id}`);
      await load();
    } catch (error) {
      showError(error, "No se pudo eliminar el rango.");
    } finally {
      setBusyId(null);
    }
  };

  const sequenceStatus = (seq) => {
    if (seq.status === "disabled") return { label: "Desactivado", tone: "muted" };
    if (seq.remaining === 0) return { label: "Agotado", tone: "muted" };
    if (seq.expired) return { label: "Vencido", tone: "danger" };
    return { label: "Activo", tone: "success" };
  };

  if (loading) {
    return (
      <div className="qb-table-card qb-preferences-card fiscal-seq-card">
        <p className="fiscal-seq-muted">
          <Loader2 size={16} className="qb-spin" /> Cargando rangos de e-NCF...
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="qb-table-card qb-preferences-card fiscal-seq-card">
        <div className="fiscal-seq-alert fiscal-seq-danger">
          <AlertTriangle size={18} /> {loadError}
        </div>
      </div>
    );
  }

  return (
    <div className="qb-table-card qb-preferences-card fiscal-seq-card">
      <div className="qb-preferences-title">
        <FileDigit size={22} />
        <div>
          <h3>Numeración fiscal (e-NCF)</h3>
          <p>
            Sube el archivo con los números que te autorizó la DGII. Aventra los
            usa en orden al emitir cada factura, hasta que se agoten.
          </p>
        </div>
      </div>

      {!data.currentEnvironment && (
        <div className="qb-preference-note">
          Tu facturación electrónica todavía no está activa. Puedes subir tus números
          ahora; se usarán cuando Aventra la active.
        </div>
      )}

      {alerts.map((alert) => (
        <div key={alert.text} className={`fiscal-seq-alert fiscal-seq-${alert.tone}`}>
          <AlertTriangle size={18} /> {alert.text}
        </div>
      ))}

      {notice && (
        <div className={`fiscal-seq-alert fiscal-seq-${notice.tone}`}>{notice.text}</div>
      )}

      <div className="fiscal-seq-form fiscal-seq-upload">
        <h4>Subir números de la DGII</h4>

        <input
          ref={fileInputRef}
          id="fiscal-seq-file"
          type="file"
          accept=".xlsx,.xls,.csv,.txt"
          className="fiscal-seq-file-input"
          onChange={handleFile}
        />

        {!upload && (
          <label
            htmlFor="fiscal-seq-file"
            className={`fiscal-seq-dropzone${dragging ? " is-dragging" : ""}`}
            onDragEnter={handleDragOver}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload size={26} />
            <strong>
              {dragging
                ? "Suelta el archivo aquí"
                : "Arrastra aquí el Excel que te dio la DGII"}
            </strong>
            <span className="fiscal-seq-muted">
              o haz clic para buscarlo. Aventra encuentra los números e-NCF y sus
              fechas de vencimiento automáticamente.
            </span>
          </label>
        )}

        {upload && (
          <div className="fiscal-seq-upload-body">
            <div className="fiscal-seq-upload-file">
              <FileSpreadsheet size={20} />
              <strong>{upload.fileName}</strong>
              {(upload.reading || upload.analyzing) && (
                <span className="fiscal-seq-muted">
                  <Loader2 size={14} className="qb-spin" /> Revisando...
                </span>
              )}
            </div>

            {upload.error && (
              <div className="fiscal-seq-alert fiscal-seq-danger">
                <AlertTriangle size={18} /> {upload.error}
              </div>
            )}

            {upload.ignoredTypes?.length > 0 && (
              <div className="fiscal-seq-alert fiscal-seq-warning">
                <AlertTriangle size={18} />
                Se ignoraron números de tipo{" "}
                {upload.ignoredTypes.map((tipo) => `E${tipo}`).join(", ")}, que no son
                comprobantes válidos.
              </div>
            )}

            {upload.needsDate && (
              <div className="fiscal-seq-upload-date">
                <span>
                  El archivo no trae la fecha de vencimiento. Escríbela tal como
                  aparece en la autorización de la DGII:
                </span>
                <input
                  type="date"
                  min={data.today}
                  value={uploadDate}
                  onChange={(e) => setUploadDate(e.target.value)}
                />
                <button
                  type="button"
                  className="qb-primary-btn"
                  disabled={!uploadDate}
                  onClick={applyUploadDate}
                >
                  Continuar
                </button>
              </div>
            )}

            {upload.analysis && (
              <>
                <div className="fiscal-seq-table-wrap">
                  <table className="qb-table fiscal-seq-table">
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th>Desde</th>
                        <th>Hasta</th>
                        <th className="num">Cantidad</th>
                        <th>Vence</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upload.analysis.ranges.map((range) => (
                        <tr key={`${range.tipoECF}-${range.rangeStart}`}>
                          <td>
                            <strong>E{range.tipoECF}</strong>
                            <small className="fiscal-seq-muted">{types[range.tipoECF]}</small>
                          </td>
                          <td className="fiscal-seq-mono">{range.startENcf}</td>
                          <td className="fiscal-seq-mono">{range.endENcf}</td>
                          <td className="num">{number.format(range.total)}</td>
                          <td>{formatDate(range.expirationDate)}</td>
                          <td>
                            {range.alreadyRegistered ? (
                              <span className="fiscal-seq-badge fiscal-seq-muted">
                                Ya registrado
                              </span>
                            ) : (
                              <span className="fiscal-seq-badge fiscal-seq-success">Nuevo</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {upload.analysis.newNumbers === 0 && (
                  <div className="fiscal-seq-alert fiscal-seq-info">
                    <CheckCircle2 size={18} /> Todos los números de este archivo ya
                    estaban registrados.
                  </div>
                )}
              </>
            )}

            {!upload.reading && !upload.analyzing && (
              <div className="fiscal-seq-form-footer">
                <button
                  type="button"
                  className="qb-secondary-btn"
                  onClick={resetUpload}
                  disabled={saving}
                >
                  {upload.analysis?.newNumbers > 0 ? "Cancelar" : "Subir otro archivo"}
                </button>

                {upload.analysis?.newNumbers > 0 && (
                  <button
                    type="button"
                    className="qb-primary-btn"
                    disabled={saving}
                    onClick={confirmUpload}
                  >
                    {saving ? (
                      <Loader2 size={16} className="qb-spin" />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    Registrar {number.format(upload.analysis.newNumbers)} número(s)
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <details className="fiscal-seq-manual">
        <summary>Registrar un rango a mano</summary>

      <form className="fiscal-seq-form" onSubmit={submit}>

        <div className="qb-form-grid fiscal-seq-grid">
          <label>
            Tipo de comprobante
            <select
              value={form.tipoECF}
              onChange={(e) => setForm({ ...form, tipoECF: e.target.value })}
            >
              {Object.entries(types).map(([value, label]) => (
                <option key={value} value={value}>
                  E{value} · {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Desde
            <input
              value={form.start}
              onChange={(e) => setForm({ ...form, start: e.target.value })}
              placeholder={`E${form.tipoECF}0000000001`}
              autoComplete="off"
            />
            {preview.errors.start && (
              <small className="fiscal-seq-field-error">{preview.errors.start}</small>
            )}
          </label>

          <label>
            Hasta
            <input
              value={form.end}
              onChange={(e) => setForm({ ...form, end: e.target.value })}
              placeholder={`E${form.tipoECF}0000000500`}
              autoComplete="off"
            />
            {preview.errors.end && (
              <small className="fiscal-seq-field-error">{preview.errors.end}</small>
            )}
          </label>

          {!NON_EXPIRING_TYPES.includes(form.tipoECF) && (
          <label>
            Fecha de vencimiento
            <input
              type="date"
              min={data.today}
              value={form.expirationDate}
              onChange={(e) => setForm({ ...form, expirationDate: e.target.value })}
            />
            {preview.errors.expirationDate && (
              <small className="fiscal-seq-field-error">
                {preview.errors.expirationDate}
              </small>
            )}
          </label>
          )}
        </div>

        <div className="fiscal-seq-form-footer">
          <span className="fiscal-seq-muted">
            {preview.ready
              ? `Se registrarán ${number.format(preview.count)} número(s): ${preview.first} a ${preview.last}`
              : "Escribe el e-NCF completo o solo la secuencia (ej. 1 a 500)."}
          </span>

          <button type="submit" className="qb-primary-btn" disabled={saving || !preview.ready}>
            {saving ? <Loader2 size={16} className="qb-spin" /> : <Plus size={16} />}
            Registrar rango
          </button>
        </div>
      </form>
      </details>

      <div className="fiscal-seq-section">
        <h4>Rangos registrados</h4>

        {data.sequences.length ? (
          <div className="fiscal-seq-table-wrap">
            <table className="qb-table fiscal-seq-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Rango</th>
                  <th>Siguiente</th>
                  <th className="num">Disponibles</th>
                  <th>Vence</th>
                  <th>Estado</th>
                  <th className="actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.sequences.map((seq) => {
                  const status = sequenceStatus(seq);
                  const busy = busyId === seq.id;

                  return (
                    <tr key={seq.id}>
                      <td>
                        <strong>E{seq.tipoECF}</strong>
                        <small className="fiscal-seq-muted">{types[seq.tipoECF]}</small>
                        {seq.environment !== "eCF" && (
                          <small className="fiscal-seq-muted">{envLabel(seq.environment)}</small>
                        )}
                      </td>
                      <td className="fiscal-seq-mono">
                        {seq.startENcf}
                        <br />
                        {seq.endENcf}
                      </td>
                      <td className="fiscal-seq-mono">{seq.nextENcf || "—"}</td>
                      <td className="num">
                        {number.format(seq.remaining)}
                        <small className="fiscal-seq-muted">
                          de {number.format(seq.total)}
                        </small>
                      </td>
                      <td>{formatDate(seq.expirationDate)}</td>
                      <td>
                        <span className={`fiscal-seq-badge fiscal-seq-${status.tone}`}>
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <div className="fiscal-seq-actions">
                          {(seq.status === "disabled" || (seq.usable && seq.remaining > 0)) && (
                            <button
                              type="button"
                              className="qb-icon-action"
                              disabled={busy}
                              onClick={() => toggleSequence(seq)}
                              title={seq.status === "disabled" ? "Activar" : "Desactivar"}
                              aria-label={seq.status === "disabled" ? "Activar" : "Desactivar"}
                            >
                              <Power size={16} />
                            </button>
                          )}
                          {seq.remaining > 0 && !NON_EXPIRING_TYPES.includes(seq.tipoECF) && (
                            <button
                              type="button"
                              className="qb-icon-action"
                              disabled={busy}
                              onClick={() => changeExpiration(seq)}
                              title="Cambiar vencimiento"
                              aria-label="Cambiar vencimiento"
                            >
                              <CalendarClock size={16} />
                            </button>
                          )}
                          {seq.canDelete && (
                            <button
                              type="button"
                              className="qb-icon-danger"
                              disabled={busy}
                              onClick={() => removeSequence(seq)}
                              title="Eliminar"
                              aria-label="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="fiscal-seq-muted">Todavía no has registrado ningún rango.</p>
        )}
      </div>

      {toAnnul > 0 && (
        <div className="fiscal-seq-alert fiscal-seq-warning">
          <AlertTriangle size={18} />
          Tienes {number.format(toAnnul)} número(s) e-NCF que ya no se usarán (rangos
          vencidos o desactivados y documentos anulados antes de enviarse). Deben
          anularse ante la DGII para mantener tu secuencia al día.
        </div>
      )}

      {data.incidents.length > 0 && (
        <div className="fiscal-seq-section">
          <h4>Números que requieren atención</h4>

          <div className="fiscal-seq-table-wrap">
            <table className="qb-table fiscal-seq-table">
              <thead>
                <tr>
                  <th>e-NCF</th>
                  <th>Documento</th>
                  <th>Estado</th>
                  <th>Detalle</th>
                  <th>Actualizado</th>
                </tr>
              </thead>
              <tbody>
                {data.incidents.map((item) => {
                  const status = USAGE_STATUS[item.status] || { label: item.status, tone: "muted" };

                  return (
                    <tr key={item.id}>
                      <td className="fiscal-seq-mono">
                        {item.eNcf}
                        {item.environment !== "eCF" && (
                          <small className="fiscal-seq-muted">{envLabel(item.environment)}</small>
                        )}
                      </td>
                      <td>
                        {item.documentType === "invoice" ? "Factura" : "Venta POS"}{" "}
                        {item.documentNumber}
                        {item.customerName && (
                          <small className="fiscal-seq-muted">{item.customerName}</small>
                        )}
                      </td>
                      <td>
                        <span className={`fiscal-seq-badge fiscal-seq-${status.tone}`}>
                          {item.dgiiStatus && item.status === "SENT"
                            ? item.dgiiStatus
                            : status.label}
                        </span>
                      </td>
                      <td className="fiscal-seq-detail">
                        {item.voidReason || item.lastError || "—"}
                      </td>
                      <td>{formatDateTime(item.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
