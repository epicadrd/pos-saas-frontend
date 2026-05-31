import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  ClipboardList,
  Copy,
  FileText,
  FilePlus2,
  Plus,
  Printer,
  Search,
  Send,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/axios";
import { Pencil } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../components/ConfirmProvider";

const emptyQuote = {
  customerName: "",
  customerRnc: "",
  customerPhone: "",
  customerEmail: "",
  validUntil: "",
  status: "draft",
  notes: "",
};

const statusLabel = {
  draft: "Borrador",
  sent: "Enviada",
  approved: "Aprobada",
  rejected: "Rechazada",
  expired: "Vencida",
  converted: "Convertida",
};

const statusClass = {
  draft: "badge warning",
  sent: "badge info",
  approved: "badge ok",
  rejected: "badge danger",
  expired: "badge danger",
  converted: "badge ok",
};

export default function Quotes() {
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [quoteForm, setQuoteForm] = useState(emptyQuote);
  const [items, setItems] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { tenant } = useAuth();
  const quoteColor = tenant?.primaryColor || "#00bfae";
  const quoteLogo = tenant?.logoDataUrl || "";
  const [editingQuoteId, setEditingQuoteId] = useState(null);

  const money = new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  });

  const todayString = new Date().toISOString().slice(0, 10);

  const getStatus = (quote) => quote.effectiveStatus || quote.status || "draft";

  const filteredQuotes = quotes.filter((quote) => {
    const text = `${quote.quoteNumber} ${quote.customerName} ${quote.customerRnc || ""}`.toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || getStatus(quote) === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totals = useMemo(() => {
    const subtotal = items.reduce((acc, item) => {
      const gross = Number(item.quantity || 0) * Number(item.price || 0);
      const discountPercent = Math.min(Math.max(Number(item.discount || 0), 0), 100);
      return acc + Math.max(gross - gross * (discountPercent / 100), 0);
    }, 0);

    const tax = items.reduce((acc, item) => {
      const gross = Number(item.quantity || 0) * Number(item.price || 0);
      const discountPercent = Math.min(Math.max(Number(item.discount || 0), 0), 100);
      const lineSubtotal = Math.max(gross - gross * (discountPercent / 100), 0);
      return acc + (item.isTaxable === false ? 0 : lineSubtotal * 0.18);
    }, 0);

    return {
      subtotal,
      tax,
      total: subtotal + tax,
    };
  }, [items]);

  const stats = useMemo(() => {
    return {
      totalQuotes: quotes.length,
      totalAmount: quotes.reduce((acc, item) => acc + Number(item.total || 0), 0),
      approvedQuotes: quotes.filter((item) => getStatus(item) === "approved").length,
      draftQuotes: quotes.filter((item) => getStatus(item) === "draft").length,
    };
  }, [quotes]);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/quotes");
      setQuotes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || "Error cargando cotizaciones");
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const { data } = await api.get("/products?status=active&type=all");
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log(error);
      setProducts([]);
    }
  };

  const loadCustomers = async () => {
    try {
      const { data } = await api.get("/customers");
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log(error);
      setCustomers([]);
    }
  };

  useEffect(() => {
    loadQuotes();
    loadProducts();
    loadCustomers();
  }, []);

  const openModal = () => {
    setEditingQuoteId(null);
    setQuoteForm({
      ...emptyQuote,
      validUntil: "",
    });
    setItems([]);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setQuoteForm(emptyQuote);
    setItems([]);
    setEditingQuoteId(null);
  };

  const handleQuoteChange = (e) => {
    const { name, value } = e.target;

    if (name === "customerName") {
      const customer = customers.find((item) => item.name === value);

      if (customer) {
        setQuoteForm({
          ...quoteForm,
          customerName: customer.name || "",
          customerRnc: customer.rnc || "",
          customerPhone: customer.phone || "",
          customerEmail: customer.email || "",
        });
        return;
      }
    }

    setQuoteForm({
      ...quoteForm,
      [name]: value,
    });
  };

  const addEmptyItem = () => {
    setItems([
      ...items,
      {
        productId: "",
        productName: "",
        description: "",
        quantity: 1,
        price: 0,
        discount: 0,
        isTaxable: true,
      },
    ]);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];

    if (field === "productId") {
      const product = products.find((item) => String(item.id) === String(value));

      newItems[index] = {
        ...newItems[index],
        productId: product?.id || "",
        productName: product?.name || "",
        description: product?.description || "",
        price: Number(product?.salePrice || 0),
        quantity: 1,
        discount: 0,
        isTaxable: true,
      };
    } else if (field === "isTaxable") {
      newItems[index][field] = value === "true";
    } else {
      newItems[index][field] = value;
    }

    setItems(newItems);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSaveQuote = async (e) => {
    e.preventDefault();

    if (!quoteForm.customerName.trim()) {
      alert("El nombre del cliente es obligatorio");
      return;
    }

    if (!items.length) {
      alert("Debes agregar al menos un producto");
      return;
    }

    const cleanItems = items
      .filter((item) => item.productName && Number(item.quantity) > 0)
      .map((item) => ({
        productId: item.productId || null,
        productName: item.productName,
        description: item.description || "",
        quantity: Number(item.quantity),
        price: Number(item.price),
        discount: Number(item.discount || 0),
        isTaxable: item.isTaxable !== false,
      }));

    if (!cleanItems.length) {
      alert("Debes completar los productos agregados");
      return;
    }

    try {
      setSaving(true);

      if (editingQuoteId) {
          await api.put(`/quotes/${editingQuoteId}`, {
            ...quoteForm,
            items: cleanItems,
          });
        } else {
          await api.post("/quotes", {
            ...quoteForm,
            items: cleanItems,
          });
      }

      closeModal();
      loadQuotes();
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || "Error creando cotización");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuote = async (quote) => {

    const ok = await confirm({
        title: "Eliminar cotización",
        message: `¿Seguro que quieres eliminar la cotización ${quote.quoteNumber}? Esta acción no se puede deshacer.`,
        confirmText: "Eliminar",
        variant: "danger",
      });

      if (!ok) return;

    try {
      await api.delete(`/quotes/${quote.id}`);
      loadQuotes();
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || "Error eliminando cotización");
    }
  };

  const handleStatus = async (quote, status) => {
    try {
      await api.patch(`/quotes/${quote.id}/status`, { status });
      loadQuotes();
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || "Error actualizando estado");
    }
  };

  const handleConvertToInvoice = async (quote) => {
  const ok = await confirm({
      title: "Convertir a factura",
      message: `¿Convertir la cotización ${quote.quoteNumber} a factura en borrador?`,
      confirmText: "Convertir",
      variant: "success",
    });

    if (!ok) return;

    try {
      await api.post(`/quotes/${quote.id}/convert-to-invoice`);
      await loadQuotes();
      alert("Cotización convertida a factura en borrador");
      navigate("/dashboard/facturacion");
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || "Error convirtiendo a factura");
    }
  };

  const copyWhatsAppMessage = async (quote) => {
    const text = `Hola, te compartimos la cotización ${quote.quoteNumber} por ${money.format(
      Number(quote.total || 0)
    )}. Válida hasta: ${
      quote.validUntil
        ? new Date(quote.validUntil).toLocaleDateString("es-DO")
        : "según disponibilidad"
    }.`;

    try {
      await navigator.clipboard.writeText(text);
      alert("Mensaje copiado para WhatsApp");
    } catch {
      alert(text);
    }
  };

  const openEditQuote = (quote) => {
  if (quote.status === "converted") {
    alert("No puedes editar una cotización convertida");
    return;
  }

  setEditingQuoteId(quote.id);

  setQuoteForm({
    customerName: quote.customerName || "",
    customerRnc: quote.customerRnc || "",
    customerPhone: quote.customerPhone || "",
    customerEmail: quote.customerEmail || "",
    validUntil: quote.validUntil ? quote.validUntil.slice(0, 10) : "",
    status: quote.status || "draft",
    notes: quote.notes || "",
  });

  setItems(
    (quote.items || []).map((item) => ({
      productId: item.productId || "",
      productName: item.productName || "",
      description: item.description || "",
      quantity: item.quantity || 1,
      price: item.price || 0,
      discount: item.discount || 0,
      isTaxable: item.isTaxable !== false,
    }))
  );

  setModalOpen(true);
};

  const handlePrint = (quote) => {
   const html = `
  <html>
    <head>
      <title>${quote.quoteNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #111827; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid ${quoteColor}; padding-bottom: 20px; margin-bottom: 30px; }
        h1 { margin: 0; color: ${quoteColor}; }
        .box { background: #f8fafc; padding: 18px; border-radius: 12px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 25px; }
        th, td { border-bottom: 1px solid #e5e7eb; padding: 12px; text-align: left; font-size: 14px; }
        th { background: #f8fafc; }
        .totals { margin-left: auto; width: 320px; margin-top: 25px; }
        .totals div { display: flex; justify-content: space-between; padding: 8px 0; }
        .total { font-size: 20px; font-weight: bold; border-top: 2px solid #111827; margin-top: 10px; padding-top: 12px; }
        .notes { margin-top: 30px; padding: 18px; border-radius: 14px; background: #f8fafc; }
        .muted { color: #64748b; font-size: 13px; }
      </style>
    </head>

    <body>
      <div class="header">
        <div>
          ${
            quoteLogo
              ? `<img src="${quoteLogo}" style="max-width:120px; max-height:80px; object-fit:contain; margin-bottom:12px;" />`
              : ""
          }
          <h1>COTIZACIÓN</h1>
          <p>${quote.quoteNumber}</p>
          <p class="muted">Esta cotización no representa factura fiscal.</p>
        </div>

        <div>
          <strong>${tenant?.businessName || "Mi empresa"}</strong><br/>
          ${tenant?.address || ""}<br/>
          RNC/Cédula: ${tenant?.rnc || "-"}<br/>
          ${tenant?.email || ""}<br/>
          ${tenant?.phone || ""}<br/><br/>
          <strong>Fecha:</strong> ${new Date(quote.createdAt).toLocaleDateString("es-DO")}<br/>
          <strong>Válida hasta:</strong> ${
            quote.validUntil
              ? new Date(quote.validUntil).toLocaleDateString("es-DO")
              : "-"
          }
        </div>
      </div>

          <div class="box">
            <strong>Cliente:</strong> ${quote.customerName}<br/>
            <strong>RNC:</strong> ${quote.customerRnc || "-"}<br/>
            <strong>Teléfono:</strong> ${quote.customerPhone || "-"}<br/>
            <strong>Email:</strong> ${quote.customerEmail || "-"}
          </div>

          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cant.</th>
                <th>Precio</th>
                <th>Desc.</th>
                <th>Subtotal</th>
                <th>ITBIS</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${(quote.items || [])
                .map(
                  (item) => `
                  <tr>
                    <td>${item.productName}</td>
                    <td>${item.quantity}</td>
                    <td>${money.format(Number(item.price || 0))}</td>
                    <td>${Number(item.discount || 0)}%</td>
                    <td>${money.format(Number(item.subtotal || 0))}</td>
                    <td>${money.format(Number(item.tax || 0))}</td>
                    <td>${money.format(Number(item.total || 0))}</td>
                  </tr>
                `
                )
                .join("")}
            </tbody>
          </table>

          <div class="totals">
            <div>
              <span>Subtotal</span>
              <strong>${money.format(Number(quote.subtotal || 0))}</strong>
            </div>
            <div>
              <span>ITBIS</span>
              <strong>${money.format(Number(quote.tax || 0))}</strong>
            </div>
            <div class="total">
              <span>Total</span>
              <strong>${money.format(Number(quote.total || 0))}</strong>
            </div>
          </div>

          ${
            quote.notes
              ? `<div class="notes"><strong>Notas:</strong><br/>${quote.notes}</div>`
              : ""
          }
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="quote-page">
      <section className="quote-header">
        <div>
          <span>Cotizaciones</span>
          <h2>Propuestas comerciales</h2>
          <p>
            Crea cotizaciones profesionales, maneja aprobación, vencimiento,
            impresión y conversión directa a factura.
          </p>
        </div>

        <button onClick={openModal} className="primary-btn">
          <Plus size={18} />
          Nueva cotización
        </button>
      </section>

      <section className="quote-stats">
        <div className="quote-stat-card">
          <div className="stat-icon">
            <ClipboardList size={22} />
          </div>
          <div>
            <span>Cotizaciones</span>
            <strong>{stats.totalQuotes}</strong>
          </div>
        </div>

        <div className="quote-stat-card">
          <div className="stat-icon">
            <FileText size={22} />
          </div>
          <div>
            <span>Total cotizado</span>
            <strong>{money.format(stats.totalAmount)}</strong>
          </div>
        </div>

        <div className="quote-stat-card">
          <div className="stat-icon">
            <CheckCircle size={22} />
          </div>
          <div>
            <span>Aprobadas</span>
            <strong>{stats.approvedQuotes}</strong>
          </div>
        </div>

        <div className="quote-stat-card">
          <div className="stat-icon">
            <ClipboardList size={22} />
          </div>
          <div>
            <span>Borradores</span>
            <strong>{stats.draftQuotes}</strong>
          </div>
        </div>
      </section>

      <section className="quote-panel">
        <div className="quote-toolbar">
          <div>
            <h3>Listado de cotizaciones</h3>
            <p>Busca, cambia estados, imprime o convierte cotizaciones.</p>
          </div>

          <div className="quote-toolbar-actions">
            <select
              className="quote-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="draft">Borrador</option>
              <option value="sent">Enviada</option>
              <option value="approved">Aprobada</option>
              <option value="rejected">Rechazada</option>
              <option value="expired">Vencida</option>
              <option value="converted">Convertida</option>
            </select>

            <div className="quote-search">
              <Search size={18} />
              <input
                placeholder="Buscar cotización o cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="quote-table-wrap">
          <table className="quote-table">
            <thead>
              <tr>
                <th>Cotización</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Válida hasta</th>
                <th>Subtotal</th>
                <th>ITBIS</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Creada por</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className="table-empty">
                    Cargando cotizaciones...
                  </td>
                </tr>
              ) : filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan="10" className="table-empty">
                    No hay cotizaciones registradas.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((quote) => {
                  const status = getStatus(quote);

                  return (
                    <tr key={quote.id}>
                      <td>
                        <div className="quote-number-cell">
                          <div className="quote-icon">
                            <ClipboardList size={18} />
                          </div>
                          <strong>{quote.quoteNumber}</strong>
                        </div>
                      </td>

                      <td>{quote.customerName}</td>

                      <td>
                        {new Date(quote.createdAt).toLocaleDateString("es-DO")}
                      </td>

                      <td>
                        {quote.validUntil
                          ? new Date(quote.validUntil).toLocaleDateString("es-DO")
                          : "-"}
                      </td>

                      <td>{money.format(Number(quote.subtotal || 0))}</td>
                      <td>{money.format(Number(quote.tax || 0))}</td>

                      <td>
                        <strong>{money.format(Number(quote.total || 0))}</strong>
                      </td>

                      <td>
                        <span className={statusClass[status] || "badge warning"}>
                          {statusLabel[status] || "Borrador"}
                        </span>
                      </td>
                          <td>{quote.creator?.name || "Sistema"}</td>
                      <td>
                        <div className="table-actions quote-actions">
                          {status !== "converted" && status !== "expired" && (
                            <>
                              <button
                                title="Marcar enviada"
                                onClick={() => handleStatus(quote, "sent")}
                              >
                                <Send size={16} />
                              </button>

                              <button
                                title="Aprobar"
                                onClick={() => handleStatus(quote, "approved")}
                              >
                                <CheckCircle size={16} />
                              </button>

                              <button
                                title="Rechazar"
                                onClick={() => handleStatus(quote, "rejected")}
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}

                          <button
                            title="Copiar mensaje WhatsApp"
                            onClick={() => copyWhatsAppMessage(quote)}
                          >
                            <Copy size={16} />
                          </button>

                          {status !== "converted" && (
                              <button title="Editar" onClick={() => openEditQuote(quote)}>
                                <Pencil size={16} />
                              </button>
                          )}

                          <button title="Imprimir" onClick={() => handlePrint(quote)}>
                            <Printer size={16} />
                          </button>

                          {status !== "converted" && status !== "expired" && (
                            <button
                              title="Convertir a factura"
                              onClick={() => handleConvertToInvoice(quote)}
                            >
                              <FilePlus2 size={16} />
                            </button>
                          )}

                          {status !== "converted" && (
                            <button
                              className="danger-btn"
                              title="Eliminar"
                              onClick={() => handleDeleteQuote(quote)}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && (
        <div className="modal-overlay">
          <div className="quote-modal">
            <div className="modal-header">
              <div>
                <span>Nueva cotización</span>
                <h3>Crear cotización</h3>
              </div>

              <button onClick={closeModal} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveQuote} className="quote-form">
              <div className="quote-form-grid">
                <div className="form-row">
                  <label>Cliente *</label>
                  <input
                    name="customerName"
                    list="quote-customers"
                    value={quoteForm.customerName}
                    onChange={handleQuoteChange}
                    placeholder="Nombre del cliente"
                  />
                  <datalist id="quote-customers">
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.name} />
                    ))}
                  </datalist>
                </div>

                <div className="form-row">
                  <label>RNC / Cédula</label>
                  <input
                    name="customerRnc"
                    value={quoteForm.customerRnc}
                    onChange={handleQuoteChange}
                    placeholder="RNC o cédula"
                  />
                </div>

                <div className="form-row">
                  <label>Teléfono</label>
                  <input
                    name="customerPhone"
                    value={quoteForm.customerPhone}
                    onChange={handleQuoteChange}
                    placeholder="809-000-0000"
                  />
                </div>

                <div className="form-row">
                  <label>Email</label>
                  <input
                    name="customerEmail"
                    value={quoteForm.customerEmail}
                    onChange={handleQuoteChange}
                    placeholder="cliente@email.com"
                  />
                </div>

                <div className="form-row">
                  <label>Válida hasta</label>
                  <input
                    name="validUntil"
                    type="date"
                    min={todayString}
                    value={quoteForm.validUntil}
                    onChange={handleQuoteChange}
                  />
                </div>

                <div className="form-row">
                  <label>Estado</label>
                  <select
                    name="status"
                    value={quoteForm.status}
                    onChange={handleQuoteChange}
                  >
                    <option value="draft">Borrador</option>
                    <option value="sent">Enviada</option>
                    <option value="approved">Aprobada</option>
                    <option value="rejected">Rechazada</option>
                  </select>
                </div>
              </div>

              <div className="quote-items-box">
                <div className="items-header">
                  <div>
                    <h4>Productos</h4>
                    <p>Agrega productos desde tu inventario. No descuenta stock.</p>
                  </div>

                  <button type="button" onClick={addEmptyItem}>
                    <Plus size={17} />
                    Agregar producto
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="items-empty">
                    No hay productos agregados a esta cotización.
                  </div>
                ) : (
                  <div className="quote-items-list">
                    {items.map((item, index) => {
                      const gross =
                        Number(item.quantity || 0) * Number(item.price || 0);
                      const discount = Math.min(
                        Math.max(Number(item.discount || 0), 0),
                        100
                      );
                      const subtotal = Math.max(gross - gross * (discount / 100), 0);
                      const tax = item.isTaxable === false ? 0 : subtotal * 0.18;
                      const total = subtotal + tax;

                      return (
                        <div className="quote-item-row" key={index}>
                          <select
                            value={item.productId}
                            onChange={(e) =>
                              handleItemChange(index, "productId", e.target.value)
                            }
                          >
                            <option value="">Seleccionar producto</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} - Stock: {product.stock}
                              </option>
                            ))}
                          </select>

                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(index, "quantity", e.target.value)
                            }
                            placeholder="Cant."
                          />

                          <input
                            type="number"
                            step="0.01"
                            value={item.price}
                            onChange={(e) =>
                              handleItemChange(index, "price", e.target.value)
                            }
                            placeholder="Precio"
                          />

                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={item.discount}
                            onChange={(e) =>
                              handleItemChange(index, "discount", e.target.value)
                            }
                            placeholder="Desc. %"
                          />

                          <select
                            value={item.isTaxable === false ? "false" : "true"}
                            onChange={(e) =>
                              handleItemChange(index, "isTaxable", e.target.value)
                            }
                          >
                            <option value="true">Con ITBIS</option>
                            <option value="false">Sin ITBIS</option>
                          </select>

                          <strong>{money.format(total)}</strong>

                          <button
                            type="button"
                            className="remove-item-btn"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="form-row full quote-notes">
                <label>Notas / términos</label>
                <textarea
                  name="notes"
                  value={quoteForm.notes}
                  onChange={handleQuoteChange}
                  placeholder="Condiciones, tiempo de entrega, observaciones..."
                />
              </div>

              <div className="quote-summary">
                <div>
                  <span>Subtotal</span>
                  <strong>{money.format(totals.subtotal)}</strong>
                </div>

                <div>
                  <span>ITBIS</span>
                  <strong>{money.format(totals.tax)}</strong>
                </div>

                <div className="summary-total">
                  <span>Total</span>
                  <strong>{money.format(totals.total)}</strong>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="cancel-btn">
                  Cancelar
                </button>

                <button disabled={saving} className="primary-btn">
                  {saving ? "Guardando..." : "Guardar cotización"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}