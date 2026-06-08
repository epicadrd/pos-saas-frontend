import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { api } from "../../api/axios";
import PosReceipt from "../../components/PosReceipt";
import "../../styles/pos.css";

export default function POS() {
  const [registers, setRegisters] = useState([]);
  const [session, setSession] = useState(null);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [products, setProducts] = useState([]);
  const [cashRegisterId, setCashRegisterId] = useState("");
  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [discountTotal, setDiscountTotal] = useState("");
  const [lastSale, setLastSale] = useState(null);


  const money = new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  });

  const loadSessionSummary = async (sessionId) => {
    if (!sessionId) return;

    try {
      const { data } = await api.get(`/pos/sessions/${sessionId}/summary`);
      setSessionSummary(data.summary || null);
    } catch (error) {
      console.log(error);
    }
  };

  const loadData = async () => {
    try {
      const [registerRes, sessionRes, productRes] = await Promise.all([
        api.get("/pos/cash-registers"),
        api.get("/pos/sessions/open"),
        api.get("/products?status=active&type=product"),
      ]);

      setRegisters((registerRes.data || []).filter((item) => item.isActive));
      setSession(sessionRes.data || null);
      setProducts(Array.isArray(productRes.data) ? productRes.data : productRes.data?.data || []);

      if (sessionRes.data?.id) {
        loadSessionSummary(sessionRes.data.id);
      } else {
        setSessionSummary(null);
      }
    } catch (error) {
      alert(error.response?.data?.message || "No se pudo cargar el POS");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      if (!term) return true;

      return (
        product.name?.toLowerCase().includes(term) ||
        product.sku?.toLowerCase().includes(term) ||
        product.barcode?.toLowerCase().includes(term) ||
        product.category?.toLowerCase().includes(term)
      );
    });
  }, [products, search]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + Number(item.salePrice || 0) * item.quantity, 0);
  }, [cart]);

  const lineDiscountTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + Number(item.discountAmount || 0), 0);
  }, [cart]);

  const safeOrderDiscount = Math.min(Number(discountTotal || 0), Math.max(subtotal - lineDiscountTotal, 0));
  const totalDiscount = lineDiscountTotal + safeOrderDiscount;
  const total = Math.max(subtotal - totalDiscount, 0);
  const change = Math.max(Number(amountPaid || 0) - total, 0);

  const openSession = async (e) => {
    e.preventDefault();

    try {
      const { data } = await api.post("/pos/sessions/open", {
        cashRegisterId,
        openingAmount,
      });

      setSession(data.session);
      setCashRegisterId("");
      setOpeningAmount("");
      loadData();
    } catch (error) {
      alert(error.response?.data?.message || "No se pudo abrir la caja");
    }
  };

  const closeSession = async () => {
    if (!session) return;

    try {
      const { data } = await api.post(`/pos/sessions/${session.id}/close`, {
        closingAmount,
      });

      const summary = data.summary;

      alert(
        `Caja cerrada correctamente\n\n` +
        `Monto inicial: ${money.format(Number(summary.openingAmount || 0))}\n` +
        `Efectivo vendido: ${money.format(Number(summary.cashSales || 0))}\n` +
        `Tarjeta: ${money.format(Number(summary.cardSales || 0))}\n` +
        `Transferencia: ${money.format(Number(summary.transferSales || 0))}\n` +
        `Total vendido: ${money.format(Number(summary.totalSales || 0))}\n` +
        `Esperado en efectivo: ${money.format(Number(summary.expectedAmount || 0))}\n` +
        `Contado: ${money.format(Number(summary.closingAmount || 0))}\n` +
        `Diferencia: ${money.format(Number(summary.difference || 0))}`
      );

      setSession(null);
      setSessionSummary(null);
      setCart([]);
      setClosingAmount("");
      loadData();
    } catch (error) {
      alert(error.response?.data?.message || "No se pudo cerrar la caja");
    }
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const exists = prev.find((item) => item.id === product.id);

      if (exists) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [...prev, { ...product, quantity: 1, discountAmount: 0 }];
    });
  };

  const updateQty = (productId, direction) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === productId
          ? { ...item, quantity: Math.max(item.quantity + direction, 1) }
          : item
      )
    );
  };

  const updateItemDiscount = (productId, value) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== productId) return item;

        const lineSubtotal = Number(item.salePrice || 0) * item.quantity;
        const discountAmount = Math.min(Number(value || 0), lineSubtotal);

        return { ...item, discountAmount };
      })
    );
  };

  const removeItem = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const charge = async () => {
    if (!session) {
      alert("Primero debes abrir una caja");
      return;
    }

    if (cart.length === 0) {
      alert("Agrega productos al ticket");
      return;
    }

    try {
      const { data } = await api.post("/pos/sales", {
        cashSessionId: session.id,
        paymentMethod,
        amountPaid: paymentMethod === "cash" ? amountPaid : total,
        discountTotal: safeOrderDiscount,
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          discountAmount: Number(item.discountAmount || 0),
        })),
      });

      setLastSale(data.sale);
      alert("Venta registrada correctamente");
      setCart([]);
      setAmountPaid("");
      setDiscountTotal("");
      loadData();
    } catch (error) {
      alert(error.response?.data?.message || "No se pudo cobrar");
    }
  };

  if (!session) {
    return (
      <div className="pos-page">
        <section className="pos-header">
          <div>
            <span>POS / Caja</span>
            <h2>Abrir caja</h2>
            <p>Selecciona una caja y coloca el monto inicial.</p>
          </div>
        </section>

        <form className="pos-panel open-cash-form" onSubmit={openSession}>
          <label>Caja</label>
          <select
            value={cashRegisterId}
            onChange={(e) => setCashRegisterId(e.target.value)}
            required
          >
            <option value="">Selecciona una caja</option>
            {registers.map((register) => (
              <option value={register.id} key={register.id}>
                {register.name}
              </option>
            ))}
          </select>

          <label>Monto inicial</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={openingAmount}
            onChange={(e) => setOpeningAmount(e.target.value)}
            placeholder="0.00"
          />

          <button className="primary-btn" type="submit">
            Abrir caja
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="pos-page">
      <section className="pos-header">
        <div>
          <span>POS / Caja</span>
          <h2>{session.cashRegister?.name || "Caja abierta"}</h2>
          <p>Monto inicial: {money.format(Number(session.openingAmount || 0))}</p>
        </div>

        <div className="close-cash-box">
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Monto contado"
            value={closingAmount}
            onChange={(e) => setClosingAmount(e.target.value)}
          />
          <button className="danger-btn" type="button" onClick={closeSession}>
            Cerrar caja
          </button>
        </div>
      </section>

      {sessionSummary && (
        <section className="pos-summary-grid">
          <article className="pos-summary-card">
            <span>Efectivo vendido</span>
            <strong>{money.format(Number(sessionSummary.cashSales || 0))}</strong>
          </article>

          <article className="pos-summary-card">
            <span>Tarjeta</span>
            <strong>{money.format(Number(sessionSummary.cardSales || 0))}</strong>
          </article>

          <article className="pos-summary-card">
            <span>Transferencia</span>
            <strong>{money.format(Number(sessionSummary.transferSales || 0))}</strong>
          </article>

          <article className="pos-summary-card">
            <span>Esperado en efectivo</span>
            <strong>{money.format(Number(sessionSummary.expectedAmount || 0))}</strong>
          </article>
        </section>
      )}

      <section className="pos-sale-layout">
        <div className="pos-products-panel">
          <div className="pos-search">
            <Search size={18} />
            <input
              placeholder="Buscar por nombre, SKU o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="pos-products-grid">
            {filteredProducts.map((product) => (
              <button
                type="button"
                className="pos-product-card"
                key={product.id}
                onClick={() => addToCart(product)}
              >
                <div className="pos-product-image">
                  {product.imageDataUrl ? (
                    <img src={product.imageDataUrl} alt={product.name} />
                  ) : (
                    <ShoppingCart size={28} />
                  )}
                </div>

                <strong>{product.name}</strong>
                <span>{money.format(Number(product.salePrice || 0))}</span>
              </button>
            ))}
          </div>
        </div>

        <aside className="pos-ticket">
          <h3>Ticket</h3>

          {cart.length === 0 ? (
            <p className="empty-ticket">No hay productos agregados.</p>
          ) : (
            <div className="ticket-items">
              {cart.map((item) => (
                <div className="ticket-item" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{money.format(Number(item.salePrice || 0))}</span>
                  </div>

                  <div className="ticket-actions">
                    <button type="button" onClick={() => updateQty(item.id, -1)}>
                      <Minus size={14} />
                    </button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => updateQty(item.id, 1)}>
                      <Plus size={14} />
                    </button>
                    <button type="button" onClick={() => removeItem(item.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <label className="ticket-discount-label">Descuento producto</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.discountAmount || ""}
                    onChange={(e) => updateItemDiscount(item.id, e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="ticket-total">
            <span>Subtotal</span>
            <strong>{money.format(subtotal)}</strong>
          </div>

          <label>Descuento general</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={discountTotal}
            onChange={(e) => setDiscountTotal(e.target.value)}
            placeholder="0.00"
          />

          <div className="ticket-change">
            Descuentos: <strong>{money.format(totalDiscount)}</strong>
          </div>

          <div className="ticket-total">
            <span>Total</span>
            <strong>{money.format(total)}</strong>
          </div>

          <label>Método de pago</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="transfer">Transferencia</option>
            <option value="check">Cheque</option>
            <option value="mixed">Mixto</option>
          </select>

          {paymentMethod === "cash" && (
            <>
              <label>Monto recibido</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="0.00"
              />

              <div className="ticket-change">
                Cambio: <strong>{money.format(change)}</strong>
              </div>
            </>
          )}

          <button className="primary-btn charge-btn" type="button" onClick={charge}>
            Cobrar
          </button>
        </aside>
      </section>
       {lastSale && (
          <PosReceipt
            sale={lastSale}
            onClose={() => setLastSale(null)}
          />
        )}
    </div>
  );
}