import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { api } from "../../api/axios";
import "../../styles/pos.css";

export default function POS() {
  const [registers, setRegisters] = useState([]);
  const [session, setSession] = useState(null);
  const [products, setProducts] = useState([]);
  const [cashRegisterId, setCashRegisterId] = useState("");
  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");

  const money = new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  });

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

  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + Number(item.salePrice || 0) * item.quantity, 0);
  }, [cart]);

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
      await api.post(`/pos/sessions/${session.id}/close`, {
        closingAmount,
      });

      setSession(null);
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

      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQty = (productId, direction) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: Math.max(item.quantity + direction, 1) }
            : item
        )
        .filter((item) => item.quantity > 0)
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
      await api.post("/pos/sales", {
        cashSessionId: session.id,
        paymentMethod,
        amountPaid: paymentMethod === "cash" ? amountPaid : total,
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      });

      alert("Venta registrada correctamente");
      setCart([]);
      setAmountPaid("");
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
                </div>
              ))}
            </div>
          )}

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
    </div>
  );
}