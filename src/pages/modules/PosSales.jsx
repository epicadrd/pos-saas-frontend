import { useEffect, useMemo, useState } from "react";
import { Eye, Filter, Receipt, Search, X } from "lucide-react";
import { api } from "../../api/axios";
import PosReceipt from "../../components/PosReceipt";
import "../../styles/pos.css";

const paymentLabels = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  check: "Cheque",
  mixed: "Mixto",
};

export default function PosSales() {
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState(null);
  const [registers, setRegisters] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [receiptSale, setReceiptSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    cashRegisterId: "",
    paymentMethod: "all",
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

  const loadSales = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);
      if (filters.cashRegisterId) params.append("cashRegisterId", filters.cashRegisterId);
      if (filters.paymentMethod && filters.paymentMethod !== "all") {
        params.append("paymentMethod", filters.paymentMethod);
      }

      const { data } = await api.get(`/pos/sales?${params.toString()}`);

      setSales(data.sales || []);
      setSummary(data.summary || null);
    } catch (error) {
      alert(error.response?.data?.message || "No se pudieron cargar las ventas POS");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegisters();
  }, []);

  useEffect(() => {
    loadSales();
  }, []);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const applyFilters = (event) => {
    event.preventDefault();
    loadSales();
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      cashRegisterId: "",
      paymentMethod: "all",
    });

    setTimeout(() => {
      loadSales();
    }, 0);
  };

  const openDetail = async (saleId) => {
    try {
      setDetailLoading(true);
      const { data } = await api.get(`/pos/sales/${saleId}`);
      setSelectedSale(data);
    } catch (error) {
      alert(error.response?.data?.message || "No se pudo cargar el detalle");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="pos-page">
      <section className="pos-header">
        <div>
          <span>POS / Caja</span>
          <h2>Ventas POS</h2>
          <p>Consulta las ventas por caja, fecha y método de pago.</p>
        </div>
      </section>

      <section className="pos-summary-grid">
        <article className="pos-summary-card">
          <span>Ventas</span>
          <strong>{summary?.salesCount || 0}</strong>
        </article>

        <article className="pos-summary-card">
          <span>Total vendido</span>
          <strong>{money.format(Number(summary?.total || 0))}</strong>
        </article>

        <article className="pos-summary-card">
          <span>Efectivo</span>
          <strong>{money.format(Number(summary?.byPaymentMethod?.cash || 0))}</strong>
        </article>

        <article className="pos-summary-card">
          <span>Tarjeta</span>
          <strong>{money.format(Number(summary?.byPaymentMethod?.card || 0))}</strong>
        </article>

        <article className="pos-summary-card">
          <span>Transferencia</span>
          <strong>{money.format(Number(summary?.byPaymentMethod?.transfer || 0))}</strong>
        </article>
      </section>

      <form className="pos-panel pos-sales-filters" onSubmit={applyFilters}>
        <div>
          <label>Desde</label>
          <input
            type="date"
            name="dateFrom"
            value={filters.dateFrom}
            onChange={handleFilterChange}
          />
        </div>

        <div>
          <label>Hasta</label>
          <input
            type="date"
            name="dateTo"
            value={filters.dateTo}
            onChange={handleFilterChange}
          />
        </div>

        <div>
          <label>Caja</label>
          <select
            name="cashRegisterId"
            value={filters.cashRegisterId}
            onChange={handleFilterChange}
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
          <label>Método</label>
          <select
            name="paymentMethod"
            value={filters.paymentMethod}
            onChange={handleFilterChange}
          >
            <option value="all">Todos</option>
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="transfer">Transferencia</option>
            <option value="check">Cheque</option>
            <option value="mixed">Mixto</option>
          </select>
        </div>

        <button type="submit" className="primary-btn">
          <Filter size={17} />
          Filtrar
        </button>

        <button type="button" className="danger-btn" onClick={clearFilters}>
          <X size={17} />
          Limpiar
        </button>
      </form>

      <section className="pos-panel">
        {loading ? (
          <p>Cargando ventas...</p>
        ) : sales.length === 0 ? (
          <div className="pos-empty-state">
            <Search size={28} />
            <p>No hay ventas POS para mostrar.</p>
          </div>
        ) : (
          <div className="pos-table-wrap">
            <table className="pos-sales-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Venta</th>
                  <th>Caja</th>
                  <th>Usuario</th>
                  <th>Método</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{formatDate(sale.createdAt)}</td>
                    <td>{sale.saleNumber}</td>
                    <td>{sale.cashRegister?.name || "-"}</td>
                    <td>{sale.user?.name || "-"}</td>
                    <td>{paymentLabels[sale.paymentMethod] || sale.paymentMethod}</td>
                    <td>
                      <strong>{money.format(Number(sale.total || 0))}</strong>
                    </td>
                    <td>
                      <div className="pos-table-actions">
                        <button
                          type="button"
                          className="table-icon-btn"
                          onClick={() => openDetail(sale.id)}
                          disabled={detailLoading}
                          title="Ver detalle"
                        >
                          <Eye size={17} />
                        </button>

                        <button
                          type="button"
                          className="table-icon-btn"
                          onClick={async () => {
                            const { data } = await api.get(`/pos/sales/${sale.id}`);
                            setReceiptSale(data);
                          }}
                          title="Reimprimir ticket"
                        >
                          <Receipt size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedSale && (
        <div className="pos-modal-backdrop" onClick={() => setSelectedSale(null)}>
          <div className="pos-sale-detail-modal" onClick={(event) => event.stopPropagation()}>
            <div className="pos-sale-detail-header">
              <div>
                <span>Detalle de venta</span>
                <h3>{selectedSale.saleNumber}</h3>
                <p>{formatDate(selectedSale.createdAt)}</p>
              </div>

              <button type="button" onClick={() => setSelectedSale(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="pos-sale-detail-info">
              <div>
                <span>Caja</span>
                <strong>{selectedSale.cashRegister?.name || "-"}</strong>
              </div>

              <div>
                <span>Usuario</span>
                <strong>{selectedSale.user?.name || "-"}</strong>
              </div>

              <div>
                <span>Método</span>
                <strong>{paymentLabels[selectedSale.paymentMethod] || selectedSale.paymentMethod}</strong>
              </div>

              <div>
                <span>Total</span>
                <strong>{money.format(Number(selectedSale.total || 0))}</strong>
              </div>
            </div>

            <div className="pos-sale-items">
              <h4>Productos vendidos</h4>

              {selectedSale.items?.map((item) => (
                <div className="pos-sale-item-row" key={item.id}>
                  <div>
                    <strong>{item.productName}</strong>
                    <span>
                      {item.quantity} x {money.format(Number(item.unitPrice || 0))}
                    </span>
                  </div>

                  <strong>{money.format(Number(item.total || 0))}</strong>
                </div>
              ))}
            </div>

            <div className="pos-sale-detail-total">
              <span>Total</span>
              <strong>{money.format(Number(selectedSale.total || 0))}</strong>
            </div>
          <button
              type="button"
              className="primary-btn"
              onClick={() => setReceiptSale(selectedSale)}
            >
              <Receipt size={17} />
              Imprimir ticket
            </button>
          </div>
        </div>
      )}
      {receiptSale && (
          <PosReceipt
            sale={receiptSale}
            onClose={() => setReceiptSale(null)}
          />
        )}
    </div>
  );
}