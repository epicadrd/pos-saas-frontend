import { useEffect, useMemo, useState } from "react";
import { Eye, Filter, Printer, X } from "lucide-react";
import { api } from "../../api/axios";
import "../../styles/pos.css";

export default function CashSessionReports() {
  const [registers, setRegisters] = useState([]);
  const [closures, setClosures] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    cashRegisterId: "",
    dateFrom: "",
    dateTo: "",
  });

  const money = useMemo(
    () =>
      new Intl.NumberFormat("es-DO", {
        style: "currency",
        currency: "DOP",
      }),
    []
  );

  const formatDate = (value) => {
    if (!value) return "-";

    return new Intl.DateTimeFormat("es-DO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  };

  const loadRegisters = async () => {
    const { data } = await api.get("/pos/cash-registers");
    setRegisters(data || []);
  };

  const loadClosures = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (filters.cashRegisterId) params.append("cashRegisterId", filters.cashRegisterId);
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);

      const { data } = await api.get(`/pos/sessions/closures?${params.toString()}`);
      setClosures(data || []);
    } catch (error) {
      alert(error.response?.data?.message || "No se pudo cargar el historial de cierres");
    } finally {
      setLoading(false);
    }
  };

  const openReport = async (sessionId) => {
    try {
      const { data } = await api.get(`/pos/sessions/${sessionId}/report`);
      setSelectedReport(data);
    } catch (error) {
      alert(error.response?.data?.message || "No se pudo abrir el reporte");
    }
  };

  useEffect(() => {
    loadRegisters();
    loadClosures();
  }, []);

  const totals = closures.reduce(
    (acc, session) => {
      acc.totalSales += Number(session.totalSales || 0);
      acc.difference += Number(session.difference || 0);
      acc.expected += Number(session.expectedAmount || 0);
      acc.closed += Number(session.closingAmount || 0);
      return acc;
    },
    { totalSales: 0, difference: 0, expected: 0, closed: 0 }
  );

  return (
    <div className="pos-page">
      <section className="pos-header">
        <div>
          <span>POS / Caja</span>
          <h2>Historial de cierres y arqueos</h2>
          <p>Reportes por caja basados en el arqueo de cada cierre.</p>
        </div>
      </section>

      <section className="pos-summary-grid">
        <article className="pos-summary-card">
          <span>Cierres</span>
          <strong>{closures.length}</strong>
        </article>

        <article className="pos-summary-card">
          <span>Total vendido</span>
          <strong>{money.format(totals.totalSales)}</strong>
        </article>

        <article className="pos-summary-card">
          <span>Esperado efectivo</span>
          <strong>{money.format(totals.expected)}</strong>
        </article>

        <article className="pos-summary-card">
          <span>Diferencia total</span>
          <strong>{money.format(totals.difference)}</strong>
        </article>
      </section>

      <section className="pos-panel">
        <div className="pos-filters">
          <div>
            <label>Caja</label>
            <select
              value={filters.cashRegisterId}
              onChange={(e) => setFilters((prev) => ({ ...prev, cashRegisterId: e.target.value }))}
            >
              <option value="">Todas</option>
              {registers.map((register) => (
                <option key={register.id} value={register.id}>
                  {register.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Desde</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
            />
          </div>

          <div>
            <label>Hasta</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
            />
          </div>

          <button type="button" className="primary-btn" onClick={loadClosures}>
            <Filter size={17} />
            Filtrar
          </button>
        </div>
      </section>

      <section className="pos-panel">
        {loading ? (
          <p>Cargando cierres...</p>
        ) : closures.length === 0 ? (
          <p>No hay cierres de caja para mostrar.</p>
        ) : (
          <div className="pos-table-wrap">
            <table className="pos-table">
              <thead>
                <tr>
                  <th>Cierre</th>
                  <th>Caja</th>
                  <th>Usuario</th>
                  <th>Inicial</th>
                  <th>Esperado</th>
                  <th>Contado</th>
                  <th>Diferencia</th>
                  <th>Total vendido</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {closures.map((session) => (
                  <tr key={session.id}>
                    <td><strong>{formatDate(session.closedAt)}</strong></td>
                    <td>{session.cashRegister?.name || "-"}</td>
                    <td>{session.user?.name || "-"}</td>
                    <td>{money.format(Number(session.openingAmount || 0))}</td>
                    <td>{money.format(Number(session.expectedAmount || 0))}</td>
                    <td>{money.format(Number(session.closingAmount || 0))}</td>
                    <td>
                      <strong>{money.format(Number(session.difference || 0))}</strong>
                    </td>
                    <td>
                      <strong>{money.format(Number(session.totalSales || 0))}</strong>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="table-icon-btn"
                        onClick={() => openReport(session.id)}
                        title="Ver reporte"
                      >
                        <Eye size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedReport && (
        <div className="pos-modal-backdrop" onClick={() => setSelectedReport(null)}>
          <div className="pos-sale-detail-modal pos-report-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pos-sale-detail-header no-print">
              <div>
                <span>Reporte de cierre</span>
                <h3>{selectedReport.session.cashRegister?.name || "Caja"}</h3>
                <p>
                  {formatDate(selectedReport.session.openedAt)} -{" "}
                  {formatDate(selectedReport.session.closedAt)}
                </p>
              </div>

              <button type="button" onClick={() => setSelectedReport(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="cash-report-print">
              <div className="cash-report-title">
                <h2>Reporte de arqueo de caja</h2>
                <p>Caja: {selectedReport.session.cashRegister?.name || "-"}</p>
                <p>Usuario: {selectedReport.session.user?.name || "-"}</p>
                <p>Apertura: {formatDate(selectedReport.session.openedAt)}</p>
                <p>Cierre: {formatDate(selectedReport.session.closedAt)}</p>
              </div>

              <div className="pos-summary-grid">
                <article className="pos-summary-card">
                  <span>Monto inicial</span>
                  <strong>{money.format(Number(selectedReport.summary.openingAmount || 0))}</strong>
                </article>

                <article className="pos-summary-card">
                  <span>Esperado efectivo</span>
                  <strong>{money.format(Number(selectedReport.summary.expectedAmount || 0))}</strong>
                </article>

                <article className="pos-summary-card">
                  <span>Contado</span>
                  <strong>{money.format(Number(selectedReport.summary.closingAmount || 0))}</strong>
                </article>

                <article className="pos-summary-card">
                  <span>Diferencia</span>
                  <strong>{money.format(Number(selectedReport.summary.difference || 0))}</strong>
                </article>
              </div>

              <div className="pos-sale-detail-info">
                <div>
                  <span>Ventas</span>
                  <strong>{selectedReport.summary.salesCount}</strong>
                </div>

                <div>
                  <span>Productos vendidos</span>
                  <strong>{selectedReport.summary.itemsCount}</strong>
                </div>

                <div>
                  <span>Subtotal</span>
                  <strong>{money.format(Number(selectedReport.summary.subtotal || 0))}</strong>
                </div>

                <div>
                  <span>Descuentos</span>
                  <strong>{money.format(Number(selectedReport.summary.discountTotal || 0))}</strong>
                </div>

                <div>
                  <span>ITBIS</span>
                  <strong>{money.format(Number(selectedReport.summary.taxTotal || 0))}</strong>
                </div>

                <div>
                  <span>Total vendido</span>
                  <strong>{money.format(Number(selectedReport.summary.totalSales || 0))}</strong>
                </div>

                <div>
                  <span>Efectivo</span>
                  <strong>{money.format(Number(selectedReport.summary.cashSales || 0))}</strong>
                </div>

                <div>
                  <span>Tarjeta</span>
                  <strong>{money.format(Number(selectedReport.summary.cardSales || 0))}</strong>
                </div>

                <div>
                  <span>Transferencia</span>
                  <strong>{money.format(Number(selectedReport.summary.transferSales || 0))}</strong>
                </div>

                <div>
                  <span>Cheque</span>
                  <strong>{money.format(Number(selectedReport.summary.checkSales || 0))}</strong>
                </div>
              </div>

              <div className="pos-table-wrap">
                <table className="pos-table">
                  <thead>
                    <tr>
                      <th>Hora</th>
                      <th>Venta</th>
                      <th>Método</th>
                      <th>Subtotal</th>
                      <th>ITBIS</th>
                      <th>Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedReport.sales.map((sale) => (
                      <tr key={sale.id}>
                        <td>{formatDate(sale.createdAt)}</td>
                        <td>{sale.saleNumber}</td>
                        <td>{sale.paymentMethod}</td>
                        <td>{money.format(Number(sale.subtotal || 0))}</td>
                        <td>{money.format(Number(sale.taxTotal || 0))}</td>
                        <td>
                          <strong>{money.format(Number(sale.total || 0))}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button type="button" className="primary-btn no-print" onClick={() => window.print()}>
              <Printer size={17} />
              Imprimir reporte
            </button>
          </div>
        </div>
      )}
    </div>
  );
}