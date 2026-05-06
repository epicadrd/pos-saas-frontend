import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  CheckCircle,
  ClipboardList,
  FileText,
  Plus,
  Printer,
  Search,
  Send,
  Truck,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

const emptyForm = {
  customerName: "",
  customerRnc: "",
  customerPhone: "",
  customerEmail: "",
  customerAddress: "",
  customerPurchaseOrder: "",
  warehouseName: "Principal",
  issueDate: new Date().toISOString().slice(0, 10),
  deliveryDate: "",
  driverName: "",
  driverId: "",
  vehiclePlate: "",
  deliveryAddress: "",
  deliveryInstructions: "",
};

const statusLabel = {
  draft: "Borrador",
  issued: "Emitido",
  delivered: "Recibido",
  cancelled: "Anulado",
};

const statusClass = {
  draft: "badge warning",
  issued: "badge info",
  delivered: "badge ok",
  cancelled: "badge danger",
};

export default function DeliveryNotes() {
  const navigate = useNavigate();
  const { tenant } = useAuth();

  const [deliveryNotes, setDeliveryNotes] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const money = new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  });

  const color = tenant?.primaryColor || "#6d4aff";
  const logo = tenant?.logoDataUrl || "";

  const taxRate = Number(tenant?.invoiceTaxRate || 18);
  const taxEnabled = tenant?.invoiceTaxEnabled !== false;
  const taxMode = tenant?.invoiceTaxMode || "global";

  const filteredDeliveryNotes = deliveryNotes.filter((note) => {
    const text = `${note.deliveryNoteNumber} ${note.customerName} ${
      note.customerPurchaseOrder || ""
    }`.toLowerCase();

    const matchesSearch = text.includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || note.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totals = useMemo(() => {
    const subtotal = items.reduce((acc, item) => {
      const qty = Number(item.dispatchedQuantity || 0);
      const price = Number(item.unitPrice || 0);
      const discount = Math.min(Math.max(Number(item.discount || 0), 0), 100);
      const gross = qty * price;

      return acc + Math.max(gross - gross * (discount / 100), 0);
    }, 0);

    const tax = items.reduce((acc, item) => {
      const qty = Number(item.dispatchedQuantity || 0);
      const price = Number(item.unitPrice || 0);
      const discount = Math.min(Math.max(Number(item.discount || 0), 0), 100);
      const gross = qty * price;
      const lineSubtotal = Math.max(gross - gross * (discount / 100), 0);

      const isTaxable =
        taxEnabled && (taxMode === "global" ? true : item.isTaxable !== false);

      return acc + (isTaxable ? lineSubtotal * (taxRate / 100) : 0);
    }, 0);

    return {
      subtotal,
      tax,
      total: subtotal + tax,
    };
  }, [items, taxEnabled, taxMode, taxRate]);

  const stats = useMemo(() => {
    return {
      total: deliveryNotes.length,
      draft: deliveryNotes.filter((d) => d.status === "draft").length,
      issued: deliveryNotes.filter((d) => d.status === "issued").length,
      delivered: deliveryNotes.filter((d) => d.status === "delivered").length,
    };
  }, [deliveryNotes]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [notesRes, productsRes, customersRes] = await Promise.all([
        api.get("/delivery-notes"),
        api.get("/products?status=active&type=all"),
        api.get("/customers"),
      ]);

      setDeliveryNotes(Array.isArray(notesRes.data) ? notesRes.data : []);
      setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
      setCustomers(Array.isArray(customersRes.data) ? customersRes.data : []);
    } catch (error) {
      alert(error.response?.data?.message || "Error cargando conduces");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openModal = () => {
    setForm(emptyForm);
    setItems([]);
    setModalOpen(true);
  };

  const closeModal = () => {
    setForm(emptyForm);
    setItems([]);
    setModalOpen(false);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    if (name === "customerName") {
      const customer = customers.find((c) => c.name === value);

      if (customer) {
        setForm({
          ...form,
          customerName: customer.name || "",
          customerRnc: customer.rnc || "",
          customerPhone: customer.phone || "",
          customerEmail: customer.email || "",
          customerAddress: customer.address || "",
          deliveryAddress: customer.address || "",
        });
        return;
      }
    }

    setForm({ ...form, [name]: value });
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        productId: "",
        productName: "",
        description: "",
        unit: "UND",
        requestedQuantity: 1,
        dispatchedQuantity: 1,
        unitPrice: 0,
        discount: 0,
        isTaxable: true,
      },
    ]);
  };

  const updateItem = (index, field, value) => {
    const copy = [...items];

    if (field === "productId") {
      const product = products.find((p) => String(p.id) === String(value));

      copy[index] = {
        ...copy[index],
        productId: product?.id || "",
        productName: product?.name || "",
        description: product?.description || product?.name || "",
        unit: product?.unit || "UND",
        requestedQuantity: 1,
        dispatchedQuantity: 1,
        unitPrice: Number(product?.salePrice || product?.price || 0),
        discount: 0,
        isTaxable: true,
      };
    } else if (field === "isTaxable") {
      copy[index][field] = value === "true";
    } else {
      copy[index][field] = value;
    }

    setItems(copy);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, itemIndex) => itemIndex !== index));
  };

  const hasStockError = items.some((item) => {
    const product = products.find((p) => String(p.id) === String(item.productId));
    if (!product) return false;

    const isService =
      product.productType === "service" || product.trackStock === false;

    if (isService) return false;

    return Number(item.dispatchedQuantity || 0) > Number(product.stock || 0);
  });

  const saveDeliveryNote = async (status = "draft") => {
    if (!form.customerName.trim()) return alert("El cliente es obligatorio");
    if (!form.customerPurchaseOrder.trim()) {
      return alert("La orden de compra del cliente es obligatoria");
    }

    const cleanItems = items
      .filter((item) => item.productId && Number(item.dispatchedQuantity) > 0)
      .map((item) => ({
        productId: item.productId,
        requestedQuantity: Number(item.requestedQuantity || 1),
        dispatchedQuantity: Number(item.dispatchedQuantity || 1),
        unitPrice: Number(item.unitPrice || 0),
        discount: Number(item.discount || 0),
        description: item.description || "",
        unit: item.unit || "UND",
        isTaxable: item.isTaxable !== false,
      }));

    if (!cleanItems.length) {
      return alert("Agrega al menos un producto");
    }

    if (status === "issued" && hasStockError) {
      return alert("Hay productos con stock insuficiente");
    }

    try {
      setSaving(true);

      await api.post("/delivery-notes", {
        ...form,
        issueDate: form.issueDate || null,
        deliveryDate: form.deliveryDate || null,
        status,
        items: cleanItems,
      });

      closeModal();
      await loadData();
    } catch (error) {
      alert(error.response?.data?.message || "Error guardando conduce");
    } finally {
      setSaving(false);
    }
  };

  const issueNote = async (note) => {
    if (!confirm(`¿Emitir ${note.deliveryNoteNumber}? Esto descontará inventario.`)) {
      return;
    }

    try {
      await api.patch(`/delivery-notes/${note.id}/issue`);
      await loadData();
    } catch (error) {
      alert(error.response?.data?.message || "Error emitiendo conduce");
    }
  };

  const markDelivered = async (note) => {
    const receivedByName = prompt("Nombre de quien recibió:");
    if (!receivedByName) return;

    const receivedById = prompt("Cédula / ID de quien recibió:") || "";

    try {
      await api.patch(`/delivery-notes/${note.id}/delivered`, {
        receivedByName,
        receivedById,
      });

      await loadData();
    } catch (error) {
      alert(error.response?.data?.message || "Error marcando recibido");
    }
  };

  const cancelNote = async (note) => {
    if (!confirm(`¿Anular ${note.deliveryNoteNumber}?`)) return;

    try {
      await api.patch(`/delivery-notes/${note.id}/cancel`);
      await loadData();
    } catch (error) {
      alert(error.response?.data?.message || "Error anulando conduce");
    }
  };

  const convertToInvoice = async (note) => {
    if (!confirm(`¿Convertir ${note.deliveryNoteNumber} a factura?`)) return;

    try {
      await api.post(`/delivery-notes/${note.id}/convert-to-invoice`);
      await loadData();
      alert("Conduce convertido a factura en borrador");
      navigate("/dashboard/facturacion");
    } catch (error) {
      alert(error.response?.data?.message || "Error convirtiendo a factura");
    }
  };

  const printNote = (note) => {
    const html = `
      <html>
        <head>
          <title>${note.deliveryNoteNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #111827; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid ${color}; padding-bottom: 20px; margin-bottom: 25px; }
            h1 { margin: 0; color: ${color}; }
            .box { background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 18px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border-bottom: 1px solid #e5e7eb; padding: 10px; font-size: 13px; text-align: left; }
            th { background: #f8fafc; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 60px; }
            .signature { border-top: 1px solid #111827; padding-top: 10px; text-align: center; }
            .muted { color: #64748b; font-size: 13px; }
          </style>
        </head>

        <body>
          <div class="header">
            <div>
              ${
                logo
                  ? `<img src="${logo}" style="max-width:120px; max-height:80px; object-fit:contain; margin-bottom:12px;" />`
                  : ""
              }
              <h1>CONDUCE</h1>
              <p>${note.deliveryNoteNumber}</p>
              <p class="muted">Documento de entrega. No representa factura fiscal.</p>
            </div>

            <div>
              <strong>${tenant?.businessName || "Mi empresa"}</strong><br/>
              RNC/Cédula: ${tenant?.rnc || "-"}<br/>
              ${tenant?.address || ""}<br/>
              ${tenant?.email || ""}<br/>
              ${tenant?.phone || ""}
            </div>
          </div>

          <div class="box">
            <strong>Cliente:</strong> ${note.customerName || "-"}<br/>
            <strong>RNC:</strong> ${note.customerRnc || "-"}<br/>
            <strong>Teléfono:</strong> ${note.customerPhone || "-"}<br/>
            <strong>Orden de compra:</strong> ${note.customerPurchaseOrder || "-"}<br/>
            <strong>Dirección entrega:</strong> ${note.deliveryAddress || "-"}
          </div>

          <div class="box">
            <strong>Almacén:</strong> ${note.warehouseName || "Principal"}<br/>
            <strong>Chofer:</strong> ${note.driverName || "-"}<br/>
            <strong>Cédula/ID:</strong> ${note.driverId || "-"}<br/>
            <strong>Vehículo/Placa:</strong> ${note.vehiclePlate || "-"}<br/>
            <strong>Fecha emisión:</strong> ${
              note.issueDate ? new Date(note.issueDate).toLocaleDateString("es-DO") : "-"
            }<br/>
            <strong>Fecha entrega:</strong> ${
              note.deliveryDate ? new Date(note.deliveryDate).toLocaleDateString("es-DO") : "-"
            }
          </div>

          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Producto</th>
                <th>Descripción</th>
                <th>Unidad</th>
                <th>Solicitado</th>
                <th>Despachado</th>
              </tr>
            </thead>

            <tbody>
              ${(note.items || [])
                .map(
                  (item) => `
                  <tr>
                    <td>${item.productId || "-"}</td>
                    <td>${item.productName || "-"}</td>
                    <td>${item.description || "-"}</td>
                    <td>${item.unit || "UND"}</td>
                    <td>${item.requestedQuantity || 0}</td>
                    <td>${item.dispatchedQuantity || 0}</td>
                  </tr>
                `
                )
                .join("")}
            </tbody>
          </table>

          ${
            note.deliveryInstructions
              ? `<div class="box" style="margin-top:20px;"><strong>Instrucciones:</strong><br/>${note.deliveryInstructions}</div>`
              : ""
          }

          <div class="signatures">
            <div class="signature">
              Entregado por<br/>
              Nombre / Firma / Cédula
            </div>

            <div class="signature">
              Recibido por<br/>
              Nombre / Firma / Cédula / Sello
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="quote-page">
      <section className="quote-header">
        <div>
          <span>Conduces</span>
          <h2>Despachos y entregas</h2>
          <p>
            Crea conduces, descuenta inventario al emitir y convierte entregas a factura.
          </p>
        </div>

        <button className="primary-btn" onClick={openModal}>
          <Plus size={18} />
          Nuevo conduce
        </button>
      </section>

      <section className="quote-stats">
        <div className="quote-stat-card">
          <div className="stat-icon">
            <ClipboardList size={22} />
          </div>
          <div>
            <span>Total</span>
            <strong>{stats.total}</strong>
          </div>
        </div>

        <div className="quote-stat-card">
          <div className="stat-icon">
            <FileText size={22} />
          </div>
          <div>
            <span>Borradores</span>
            <strong>{stats.draft}</strong>
          </div>
        </div>

        <div className="quote-stat-card">
          <div className="stat-icon">
            <Truck size={22} />
          </div>
          <div>
            <span>Emitidos</span>
            <strong>{stats.issued}</strong>
          </div>
        </div>

        <div className="quote-stat-card">
          <div className="stat-icon">
            <CheckCircle size={22} />
          </div>
          <div>
            <span>Recibidos</span>
            <strong>{stats.delivered}</strong>
          </div>
        </div>
      </section>

      <section className="quote-panel">
        <div className="quote-toolbar">
          <div>
            <h3>Listado de conduces</h3>
            <p>Administra borradores, entregas, anulaciones y facturación.</p>
          </div>

          <div className="quote-toolbar-actions">
            <select
              className="quote-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="draft">Borrador</option>
              <option value="issued">Emitido</option>
              <option value="delivered">Recibido</option>
              <option value="cancelled">Anulado</option>
            </select>

            <div className="quote-search">
              <Search size={18} />
              <input
                placeholder="Buscar conduce..."
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
                <th>Conduce</th>
                <th>Cliente</th>
                <th>OC Cliente</th>
                <th>Entrega</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="table-empty">
                    Cargando conduces...
                  </td>
                </tr>
              ) : filteredDeliveryNotes.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-empty">
                    No hay conduces registrados.
                  </td>
                </tr>
              ) : (
                filteredDeliveryNotes.map((note) => (
                  <tr key={note.id}>
                    <td>
                      <div className="quote-number-cell">
                        <div className="quote-icon">
                          <Truck size={18} />
                        </div>
                        <strong>{note.deliveryNoteNumber}</strong>
                      </div>
                    </td>

                    <td>{note.customerName}</td>
                    <td>{note.customerPurchaseOrder}</td>

                    <td>
                      {note.deliveryDate
                        ? new Date(note.deliveryDate).toLocaleDateString("es-DO")
                        : "-"}
                    </td>

                    <td>{money.format(Number(note.total || 0))}</td>

                    <td>
                      <span className={statusClass[note.status] || "badge warning"}>
                        {statusLabel[note.status] || "Borrador"}
                      </span>
                    </td>

                    <td>
                      <div className="table-actions quote-actions">
                        <button title="Imprimir" onClick={() => printNote(note)}>
                          <Printer size={16} />
                        </button>

                        {note.status === "draft" && (
                          <button title="Emitir" onClick={() => issueNote(note)}>
                            <Send size={16} />
                          </button>
                        )}

                        {note.status === "issued" && (
                          <button
                            title="Marcar recibido"
                            onClick={() => markDelivered(note)}
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}

                        {(note.status === "issued" || note.status === "delivered") &&
                          !note.invoiceId && (
                            <button
                              title="Convertir a factura"
                              onClick={() => convertToInvoice(note)}
                            >
                              <FileText size={16} />
                            </button>
                          )}

                        {note.status !== "cancelled" && !note.invoiceId && (
                          <button
                            className="danger-btn"
                            title="Anular"
                            onClick={() => cancelNote(note)}
                          >
                            <Ban size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
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
                <span>Nuevo conduce</span>
                <h3>Crear conduce</h3>
              </div>

              <button className="modal-close" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <div className="quote-form">
              <div className="quote-form-grid">
                <div className="form-row">
                  <label>Cliente *</label>
                  <input
                    name="customerName"
                    list="delivery-customers"
                    value={form.customerName}
                    onChange={handleFormChange}
                    placeholder="Nombre del cliente"
                  />
                  <datalist id="delivery-customers">
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.name} />
                    ))}
                  </datalist>
                </div>

                <div className="form-row">
                  <label>RNC</label>
                  <input
                    name="customerRnc"
                    value={form.customerRnc}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-row">
                  <label>Teléfono</label>
                  <input
                    name="customerPhone"
                    value={form.customerPhone}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-row">
                  <label>Email</label>
                  <input
                    name="customerEmail"
                    value={form.customerEmail}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-row">
                  <label>Orden compra cliente *</label>
                  <input
                    name="customerPurchaseOrder"
                    value={form.customerPurchaseOrder}
                    onChange={handleFormChange}
                    placeholder="OC-0001"
                  />
                </div>

                <div className="form-row">
                  <label>Almacén</label>
                  <input
                    name="warehouseName"
                    value={form.warehouseName}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-row">
                  <label>Fecha emisión</label>
                  <input
                    type="date"
                    name="issueDate"
                    value={form.issueDate}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-row">
                  <label>Fecha entrega</label>
                  <input
                    type="date"
                    name="deliveryDate"
                    value={form.deliveryDate}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-row">
                  <label>Chofer</label>
                  <input
                    name="driverName"
                    value={form.driverName}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-row">
                  <label>Cédula / ID chofer</label>
                  <input
                    name="driverId"
                    value={form.driverId}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-row">
                  <label>Placa / vehículo</label>
                  <input
                    name="vehiclePlate"
                    value={form.vehiclePlate}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-row full">
                  <label>Dirección entrega</label>
                  <textarea
                    name="deliveryAddress"
                    value={form.deliveryAddress}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-row full">
                  <label>Instrucciones especiales</label>
                  <textarea
                    name="deliveryInstructions"
                    value={form.deliveryInstructions}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              <div className="quote-items-box">
                <div className="items-header">
                  <div>
                    <h4>Productos</h4>
                    <p>Cantidad solicitada vs cantidad despachada.</p>
                  </div>

                  <button type="button" onClick={addItem}>
                    <Plus size={17} />
                    Agregar producto
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="items-empty">
                    No hay productos agregados.
                  </div>
                ) : (
                  <div className="quote-items-list">
                    {items.map((item, index) => {
                      const product = products.find(
                        (p) => String(p.id) === String(item.productId)
                      );

                      const isService =
                        product?.productType === "service" ||
                        product?.trackStock === false;

                      const stockError =
                        product &&
                        !isService &&
                        Number(item.dispatchedQuantity || 0) >
                          Number(product.stock || 0);

                      return (
                        <div className="quote-item-row" key={index}>
                          <select
                            value={item.productId}
                            onChange={(e) =>
                              updateItem(index, "productId", e.target.value)
                            }
                          >
                            <option value="">Producto</option>
                            {products.map((product) => {
                              const service =
                                product.productType === "service" ||
                                product.trackStock === false;

                              return (
                                <option key={product.id} value={product.id}>
                                  {product.name}{" "}
                                  {service ? "(Servicio)" : `(Stock: ${product.stock})`}
                                </option>
                              );
                            })}
                          </select>

                          <input
                            type="number"
                            min="1"
                            value={item.requestedQuantity}
                            onChange={(e) =>
                              updateItem(index, "requestedQuantity", e.target.value)
                            }
                            placeholder="Solicitado"
                          />

                          <input
                            type="number"
                            min="1"
                            value={item.dispatchedQuantity}
                            onChange={(e) =>
                              updateItem(index, "dispatchedQuantity", e.target.value)
                            }
                            placeholder="Despachado"
                          />

                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(index, "unitPrice", e.target.value)
                            }
                            placeholder="Precio"
                          />

                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount}
                            onChange={(e) =>
                              updateItem(index, "discount", e.target.value)
                            }
                            placeholder="Desc. %"
                          />

                          <strong className={stockError ? "text-danger" : ""}>
                            {stockError
                              ? `Stock: ${product.stock}`
                              : money.format(
                                  Number(item.dispatchedQuantity || 0) *
                                    Number(item.unitPrice || 0)
                                )}
                          </strong>

                          <button
                            type="button"
                            className="remove-item-btn"
                            onClick={() => removeItem(index)}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
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
                <button type="button" className="cancel-btn" onClick={closeModal}>
                  Cancelar
                </button>

                <button
                  type="button"
                  className="primary-btn"
                  disabled={saving}
                  onClick={() => saveDeliveryNote("draft")}
                >
                  Guardar borrador
                </button>

                <button
                  type="button"
                  className="primary-btn"
                  disabled={saving || hasStockError}
                  onClick={() => saveDeliveryNote("issued")}
                >
                  Emitir conduce
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}