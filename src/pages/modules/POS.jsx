import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Search, ShoppingCart, Trash2, X } from "lucide-react";
import { api } from "../../api/axios";
import PosReceipt from "../../components/PosReceipt";
import { useAuth } from "../../context/AuthContext";
import "../../styles/pos.css";
import es from "../../i18n/locales/es.json";
import en from "../../i18n/locales/en.json";
import {
  getTaxRate,
  getTaxLabel,
  isDominicanTenant,
} from "../../utils/taxConfig";

export default function POS() {
  const { tenant, language } = useAuth();
  const dictionary = language === "en" ? en : es;

  const t = (path, fallback = "", vars = {}) => {
    const value = path
      .split(".")
      .reduce((acc, key) => acc?.[key], dictionary);

    const text = value || fallback || path;

    return Object.entries(vars).reduce(
      (acc, [key, val]) => acc.replaceAll(`{{${key}}}`, val),
      text
    );
  };

  const [registers, setRegisters] = useState([]);
  const [session, setSession] = useState(null);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [products, setProducts] = useState([]);
  const [cashRegisterId, setCashRegisterId] = useState("");
  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [discountTotal, setDiscountTotal] = useState("");
  const [receiptType, setReceiptType] = useState("consumer_final");
  const [customerRnc, setCustomerRnc] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [lastSale, setLastSale] = useState(null);

  const isDO = isDominicanTenant(tenant);

  const money = useMemo(
    () =>
      new Intl.NumberFormat(isDO ? "es-DO" : "en-US", {
        style: "currency",
        currency: isDO ? "DOP" : "USD",
      }),
    [isDO]
  );

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
      setProducts(
        Array.isArray(productRes.data)
          ? productRes.data
          : productRes.data?.data || []
      );

      if (sessionRes.data?.id) {
        loadSessionSummary(sessionRes.data.id);
      } else {
        setSessionSummary(null);
      }
    } catch (error) {
      alert(t("pos.errors.load"));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const subtotal = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + Number(item.salePrice || 0) * item.quantity,
      0
    );
  }, [cart]);

  const lineDiscountTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + Number(item.discountAmount || 0), 0);
  }, [cart]);

  const taxEnabled = tenant?.invoiceTaxEnabled !== false;
  const taxRate = getTaxRate(tenant);
  const taxLabel = getTaxLabel(tenant);
  const usTaxBreakdown = {
    stateRate: Number(tenant?.usStateTaxRate || 0),
    countyRate: Number(tenant?.usCountyTaxRate || 0),
    cityRate: Number(tenant?.usCityTaxRate || 0),
  };

  const safeOrderDiscount = Math.min(
    Number(discountTotal || 0),
    Math.max(subtotal - lineDiscountTotal, 0)
  );
  const totalDiscount = lineDiscountTotal + safeOrderDiscount;
  const taxableSubtotal = Math.max(subtotal - totalDiscount, 0);
  const taxTotal = taxEnabled ? taxableSubtotal * (taxRate / 100) : 0;
  const total = taxableSubtotal + taxTotal;
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
      alert(t("pos.errors.openCash"));
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
        `${t("pos.closedSuccessfully")}\n\n` +
          `${t("pos.openingAmount")}: ${money.format(
            Number(summary.openingAmount || 0)
          )}\n` +
          `${t("pos.cashSold")}: ${money.format(
            Number(summary.cashSales || 0)
          )}\n` +
          `${t("pos.card")}: ${money.format(Number(summary.cardSales || 0))}\n` +
          `${t("pos.transfer")}: ${money.format(
            Number(summary.transferSales || 0)
          )}\n` +
          `${t("pos.totalSold")}: ${money.format(
            Number(summary.totalSales || 0)
          )}\n` +
          `${t("pos.expectedCash")}: ${money.format(
            Number(summary.expectedAmount || 0)
          )}\n` +
          `${t("pos.counted")}: ${money.format(
            Number(summary.closingAmount || 0)
          )}\n` +
          `${t("pos.difference")}: ${money.format(
            Number(summary.difference || 0)
          )}`
      );

      setSession(null);
      setSessionSummary(null);
      setCart([]);
      setClosingAmount("");
      setShowCloseModal(false);
      loadData();
    } catch (error) {
      alert(t("pos.errors.closeCash"));
    }
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const exists = prev.find((item) => item.id === product.id);

      if (exists) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...prev, { ...product, quantity: 1, discountAmount: 0 }];
    });
  };

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

  useEffect(() => {
    const code = search.trim();

    if (!code) return;

    const product = products.find((p) => p.barcode && p.barcode.trim() === code);

    if (!product) return;

    addToCart(product);
    setSearch("");
  }, [search, products]);

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
      alert(t("pos.errors.openFirst"));
      return;
    }

    if (cart.length === 0) {
      alert(t("pos.errors.addProducts"));
      return;
    }

    if (
      isDO &&
      receiptType === "credit_fiscal" &&
      (!customerRnc.trim() || !customerName.trim())
    ) {
      alert(t("pos.errors.fiscalRequired"));
      return;
    }

    try {
      const { data } = await api.post("/pos/sales", {
        cashSessionId: session.id,
        paymentMethod,
        amountPaid: paymentMethod === "cash" ? amountPaid : total,
        discountTotal: safeOrderDiscount,
        receiptType: isDO ? receiptType : "consumer_final",
        customerRnc:
          isDO && receiptType === "credit_fiscal" ? customerRnc.trim() : "",
        customerName: isDO
          ? receiptType === "credit_fiscal"
            ? customerName.trim()
            : ""
          : customerName.trim(),
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          discountAmount: Number(item.discountAmount || 0),
        })),
      });

      setLastSale(data.sale);
      alert(t("pos.errors.saleSuccess"));
      setCart([]);
      setAmountPaid("");
      setDiscountTotal("");
      setReceiptType("consumer_final");
      setCustomerRnc("");
      setCustomerName("");
      loadData();
    } catch (error) {
      alert(t("pos.errors.charge"));
    }
  };

  if (!session) {
    return (
      <div className="pos-page">
        <section className="pos-header">
          <div>
            <span>{t("pos.title")}</span>
            <h2>{t("pos.openCash")}</h2>
            <p>{t("pos.openCashDescription")}</p>
          </div>
        </section>

        <form className="pos-panel open-cash-form" onSubmit={openSession}>
          <label>{t("pos.cashRegister")}</label>
          <select
            value={cashRegisterId}
            onChange={(e) => setCashRegisterId(e.target.value)}
            required
          >
            <option value="">{t("pos.selectCashRegister")}</option>
            {registers.map((register) => (
              <option value={register.id} key={register.id}>
                {register.name}
              </option>
            ))}
          </select>

          <label>{t("pos.openingAmount")}</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={openingAmount}
            onChange={(e) => setOpeningAmount(e.target.value)}
            placeholder="0.00"
          />

          <button className="primary-btn" type="submit">
            {t("pos.openCash")}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="pos-page">
      <section className="pos-header">
        <div>
          <span>{t("pos.title")}</span>
          <h2>{session.cashRegister?.name || t("pos.cashOpen")}</h2>
          <p>
            {t("pos.openingAmount")}:{" "}
            {money.format(Number(session.openingAmount || 0))}
          </p>
        </div>

        <div className="close-cash-box">
          <button
            className="danger-btn"
            type="button"
            onClick={() => {
              setClosingAmount(sessionSummary?.expectedAmount || "");
              setShowCloseModal(true);
            }}
          >
            {t("pos.closeCash")}
          </button>
        </div>
      </section>

      {sessionSummary && (
        <section className="pos-summary-grid">
          <article className="pos-summary-card">
            <span>{t("pos.cashSold")}</span>
            <strong>{money.format(Number(sessionSummary.cashSales || 0))}</strong>
          </article>

          <article className="pos-summary-card">
            <span>{t("pos.card")}</span>
            <strong>{money.format(Number(sessionSummary.cardSales || 0))}</strong>
          </article>

          <article className="pos-summary-card">
            <span>{t("pos.transfer")}</span>
            <strong>
              {money.format(Number(sessionSummary.transferSales || 0))}
            </strong>
          </article>

          <article className="pos-summary-card">
            <span>{t("pos.expectedCash")}</span>
            <strong>
              {money.format(Number(sessionSummary.expectedAmount || 0))}
            </strong>
          </article>
        </section>
      )}

      <section className="pos-sale-layout">
        <div className="pos-products-panel">
          <div className="pos-search">
            <Search size={18} />
            <input
              placeholder={t("pos.scanOrSearch")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
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
          <h3>{t("pos.ticket")}</h3>

          {cart.length === 0 ? (
            <p className="empty-ticket">{t("pos.emptyTicket")}</p>
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

                  <label className="ticket-discount-label">
                    {t("pos.productDiscount")}
                  </label>
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
            <span>{t("pos.subtotal")}</span>
            <strong>{money.format(subtotal)}</strong>
          </div>

          <label>{t("pos.generalDiscount")}</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={discountTotal}
            onChange={(e) => setDiscountTotal(e.target.value)}
            placeholder="0.00"
          />

          <div className="ticket-change">
            {t("pos.discounts")}: <strong>{money.format(totalDiscount)}</strong>
          </div>

          {isDO ? (
            <div className="ticket-change">
              {taxLabel} ({taxRate}%): <strong>{money.format(taxTotal)}</strong>
            </div>
          ) : (
            <>
              <div className="ticket-change">
                {t("pos.stateTax")} ({usTaxBreakdown.stateRate}%):
                <strong>
                  {money.format(taxableSubtotal * (usTaxBreakdown.stateRate / 100))}
                </strong>
              </div>

              <div className="ticket-change">
                {t("pos.countyTax")} ({usTaxBreakdown.countyRate}%):
                <strong>
                  {money.format(taxableSubtotal * (usTaxBreakdown.countyRate / 100))}
                </strong>
              </div>

              <div className="ticket-change">
                {t("pos.cityTax")} ({usTaxBreakdown.cityRate}%):
                <strong>
                  {money.format(taxableSubtotal * (usTaxBreakdown.cityRate / 100))}
                </strong>
              </div>

              <div className="ticket-change">
                {t("pos.totalTaxes")} ({taxRate}%):
                <strong>{money.format(taxTotal)}</strong>
              </div>
            </>
          )}

          <div className="ticket-total">
            <span>{t("pos.total")}</span>
            <strong>{money.format(total)}</strong>
          </div>

          {isDO && (
            <>
              <label>{t("pos.invoiceType")}</label>
              <select
                value={receiptType}
                onChange={(e) => {
                  setReceiptType(e.target.value);

                  if (e.target.value === "consumer_final") {
                    setCustomerRnc("");
                    setCustomerName("");
                  }
                }}
              >
                <option value="consumer_final">
                  {t("pos.consumerFinalFiscal")}
                </option>

                <option value="credit_fiscal">{t("pos.creditFiscal")}</option>
              </select>

              {receiptType === "credit_fiscal" && (
                <>
                  <label>{t("pos.customerRnc")}</label>
                  <input
                    value={customerRnc}
                    onChange={(e) => setCustomerRnc(e.target.value)}
                    placeholder={t("pos.customerRnc")}
                  />

                  <label>{t("pos.customerBusinessName")}</label>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={t("pos.customerBusinessName")}
                  />
                </>
              )}
            </>
          )}

          {!isDO && (
            <>
              <label>{t("pos.customerNameOptional")}</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={t("pos.customerName")}
              />
            </>
          )}

          <label>{t("pos.paymentMethod")}</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="cash">{t("pos.cash")}</option>
            <option value="card">{t("pos.card")}</option>
            <option value="transfer">{t("pos.transfer")}</option>
            <option value="check">{t("pos.check")}</option>
            <option value="mixed">{t("pos.mixed")}</option>
          </select>

          {paymentMethod === "cash" && (
            <>
              <label>{t("pos.amountReceived")}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="0.00"
              />

              <div className="ticket-change">
                {t("pos.change")}: <strong>{money.format(change)}</strong>
              </div>
            </>
          )}

          <button className="primary-btn charge-btn" type="button" onClick={charge}>
            {t("pos.charge")}
          </button>
        </aside>
      </section>

      {lastSale && <PosReceipt sale={lastSale} onClose={() => setLastSale(null)} />}

      {showCloseModal && (
        <div
          className="pos-modal-backdrop"
          onClick={() => setShowCloseModal(false)}
        >
          <div className="pos-close-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pos-close-modal-header">
              <div>
                <span>{t("pos.cashCount")}</span>
                <h3>{t("pos.cashClosing")}</h3>
                <p>{session.cashRegister?.name || t("pos.cashOpen")}</p>
              </div>

              <button type="button" onClick={() => setShowCloseModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="pos-close-summary">
              <div>
                <span>{t("pos.openingAmount")}</span>
                <strong>{money.format(Number(session.openingAmount || 0))}</strong>
              </div>

              <div>
                <span>{t("pos.cashSold")}</span>
                <strong>{money.format(Number(sessionSummary?.cashSales || 0))}</strong>
              </div>

              <div>
                <span>{t("pos.expectedCash")}</span>
                <strong>
                  {money.format(Number(sessionSummary?.expectedAmount || 0))}
                </strong>
              </div>

              <div>
                <span>{t("pos.card")}</span>
                <strong>{money.format(Number(sessionSummary?.cardSales || 0))}</strong>
              </div>

              <div>
                <span>{t("pos.transfer")}</span>
                <strong>
                  {money.format(Number(sessionSummary?.transferSales || 0))}
                </strong>
              </div>

              <div>
                <span>{t("pos.totalSold")}</span>
                <strong>{money.format(Number(sessionSummary?.totalSales || 0))}</strong>
              </div>
            </div>

            <label>{t("pos.physicalCashCount")}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={closingAmount}
              onChange={(e) => setClosingAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
            />

            <div className="pos-close-difference">
              <span>{t("pos.difference")}</span>
              <strong>
                {money.format(
                  Number(closingAmount || 0) -
                    Number(sessionSummary?.expectedAmount || 0)
                )}
              </strong>
            </div>

            <div className="pos-close-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowCloseModal(false)}
              >
                {t("pos.cancel")}
              </button>

              <button type="button" className="danger-btn" onClick={closeSession}>
                {t("pos.confirmClose")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}