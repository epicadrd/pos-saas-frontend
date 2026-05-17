import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  ReceiptText,
  RefreshCcw,
} from "lucide-react";
import { api } from "../../api/axios";

const formatMoney = (value) =>
  new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  }).format(Number(value || 0));

export default function AccountingSummary() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const res = await api.get("/accounting/summary");
      setData(res.data);
    } catch (error) {
      alert(error.response?.data?.message || "No se pudo cargar contabilidad");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const summary = data?.summary || {};

  const maxTrendValue = useMemo(() => {
    const values = data?.cashFlowTrend?.map((item) => Number(item.total || 0)) || [];
    return Math.max(...values, 1);
  }, [data]);

  if (loading) {
    return (
      <div className="accounting-loading">
        <RefreshCcw className="dash-spin" />
        <strong>Cargando resumen contable...</strong>
      </div>
    );
  }

  return (
    <div className="accounting-page">
      <section className="accounting-hero">
        <div>
          <span>Contabilidad</span>
          <h2>Resumen contable</h2>
          <p>
            Visualiza ingresos, cobros, balances pendientes y salud financiera
            general del negocio.
          </p>
        </div>

        <button onClick={loadSummary}>
          <RefreshCcw size={18} />
          Actualizar
        </button>
      </section>

      <section className="accounting-stats-grid">
        <div className="accounting-card main">
          <Wallet />
          <span>Ingresos del mes</span>
          <strong>{formatMoney(summary.incomeMonth)}</strong>
          <small>Total facturado este mes</small>
        </div>

        <div className="accounting-card">
          <ReceiptText />
          <span>Cobrado este mes</span>
          <strong>{formatMoney(summary.collectedMonth)}</strong>
          <small>Recibos pagados</small>
        </div>

        <div className="accounting-card success">
          <TrendingUp />
          <span>Ganancia estimada</span>
          <strong>{formatMoney(summary.netProfit)}</strong>
          <small>Ingresos cobrados - gastos</small>
        </div>

        <div className="accounting-card danger">
          <AlertTriangle />
          <span>Cuentas por cobrar</span>
          <strong>{formatMoney(summary.accountsReceivable)}</strong>
          <small>{summary.openInvoices || 0} facturas pendientes</small>
        </div>
      </section>

      <section className="accounting-grid">
        <div className="accounting-panel">
          <div className="accounting-panel-header">
            <div>
              <h3>Flujo de caja reciente</h3>
              <p>Cobros recibidos en los últimos 7 días</p>
            </div>
          </div>

          <div className="accounting-chart">
            {(data?.cashFlowTrend || []).length === 0 ? (
              <div className="accounting-empty">Aún no hay cobros recientes.</div>
            ) : (
              data.cashFlowTrend.map((item) => {
                const height = Math.max(
                  (Number(item.total) / maxTrendValue) * 100,
                  8
                );

                return (
                  <div className="accounting-bar-item" key={item.date}>
                    <div className="accounting-bar-track">
                      <div
                        className="accounting-bar-fill"
                        style={{ height: `${height}%` }}
                        title={formatMoney(item.total)}
                      />
                    </div>
                    <span>
                      {new Date(`${item.date}T00:00:00`).toLocaleDateString(
                        "es-DO",
                        { day: "2-digit", month: "short" }
                      )}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="accounting-panel">
          <div className="accounting-panel-header">
            <div>
              <h3>Estado financiero</h3>
              <p>Indicadores rápidos</p>
            </div>
          </div>

          <div className="accounting-kpi-list">
            <div>
              <span>Gastos registrados</span>
              <strong>{formatMoney(summary.expensesMonth)}</strong>
            </div>

            <div>
              <span>Cuentas por pagar</span>
              <strong>{formatMoney(summary.accountsPayable)}</strong>
            </div>

            <div>
              <span>Facturas vencidas</span>
              <strong>{formatMoney(summary.overdueReceivable)}</strong>
            </div>

            <div>
              <span>Órdenes pendientes</span>
              <strong>{summary.openPurchaseOrders || 0}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="accounting-panel">
        <div className="accounting-panel-header">
          <div>
            <h3>Últimos cobros</h3>
            <p>Recibos más recientes registrados</p>
          </div>
        </div>

        <div className="accounting-table-list">
          {(data?.recentReceipts || []).length === 0 ? (
            <div className="accounting-empty">No hay recibos registrados.</div>
          ) : (
            data.recentReceipts.map((receipt) => (
              <div className="accounting-row" key={receipt.id}>
                <div>
                  <strong>{receipt.receiptNumber}</strong>
                  <span>{receipt.customerName}</span>
                </div>

                <div>
                  <strong>{formatMoney(receipt.amount)}</strong>
                  <small>{receipt.paymentMethod}</small>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}