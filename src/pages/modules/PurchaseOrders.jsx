import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  PackagePlus,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { api } from "../../api/axios";
import { useConfirm } from "../../components/ConfirmProvider";

const emptyOrder = {
  supplierName: "",
  supplierRnc: "",
  supplierPhone: "",
  supplierEmail: "",
  expectedDate: "",
  status: "draft",
  notes: "",
};

export default function PurchaseOrders() {
  const { confirm } = useConfirm();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyOrder);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState([]);

  const money = new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  });

  const filteredOrders = orders.filter((order) => {
    const text = `${order.orderNumber} ${order.supplierName}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (acc, item) => acc + Number(item.quantity || 0) * Number(item.cost || 0),
      0
    );

    const tax = subtotal * 0.18;
    const total = subtotal + tax;

    return { subtotal, tax, total };
  }, [items]);

  const stats = useMemo(() => {
    const totalOrders = orders.length;

    const totalAmount = orders.reduce(
      (acc, item) => acc + Number(item.total || 0),
      0
    );

    const received = orders.filter((item) => item.status === "received").length;
    const draft = orders.filter((item) => item.status === "draft").length;

    return {
      totalOrders,
      totalAmount,
      received,
      draft,
    };
  }, [orders]);

  const selectedSupplierStats = useMemo(() => {
  if (!form.supplierName) return null;

  const supplierOrders = orders
    .filter((order) => order.supplierName === form.supplierName)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const totalPurchased = supplierOrders.reduce(
    (acc, order) => acc + Number(order.total || 0),
    0
  );

  const pendingOrders = supplierOrders.filter(
    (order) => order.status !== "received" && order.status !== "cancelled"
  );

  const pendingBalance = pendingOrders.reduce(
    (acc, order) => acc + Number(order.total || 0),
    0
  );

  return {
    totalOrders: supplierOrders.length,
    totalPurchased,
    pendingOrders: pendingOrders.length,
    pendingBalance,
    lastOrders: supplierOrders.slice(0, 3),
  };
}, [orders, form.supplierName]);

const getLastProductPurchase = (productId) => {
  if (!productId) return null;

  const matches = [];

  orders.forEach((order) => {
    order.items?.forEach((item) => {
      if (String(item.productId) === String(productId)) {
        matches.push({
          cost: item.cost,
          quantity: item.quantity,
          supplierName: order.supplierName,
          orderNumber: order.orderNumber,
          createdAt: order.createdAt,
        });
      }
    });
  });

  return matches.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )[0];
};

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/purchase-orders");
      setOrders(data);
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || "Error cargando órdenes de compra");
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const { data } = await api.get("/products");
      setProducts(data);
    } catch (error) {
      console.log(error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const { data } = await api.get("/suppliers");
      setSuppliers(Array.isArray(data) ? data.filter((s) => s.isActive !== false) : []);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    loadOrders();
    loadProducts();
    loadSuppliers();
  }, []);

  const openModal = () => {
    setForm(emptyOrder);
    setItems([]);
    setModalOpen(true);
  };

  const closeModal = () => {
    setForm(emptyOrder);
    setItems([]);
    setModalOpen(false);
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

    const handleSupplierSelect = (e) => {
    const supplierId = e.target.value;
    const supplier = suppliers.find((item) => String(item.id) === String(supplierId));

    if (!supplier) {
      setForm({
        ...form,
        supplierName: "",
        supplierRnc: "",
        supplierPhone: "",
        supplierEmail: "",
      });
      return;
    }

    setForm({
      ...form,
      supplierName: supplier.name || "",
      supplierRnc: supplier.rnc || "",
      supplierPhone: supplier.phone || "",
      supplierEmail: supplier.email || "",
    });
  };

  const addEmptyItem = () => {
    setItems([
      ...items,
      {
        productId: "",
        productName: "",
        quantity: 1,
        cost: 0,
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
        cost: Number(product?.costPrice || 0),
        quantity: 1,
      };
    } else {
      newItems[index][field] = value;
    }

    setItems(newItems);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.supplierName.trim()) {
      alert("El suplidor es obligatorio");
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
        quantity: Number(item.quantity),
        cost: Number(item.cost),
      }));

    if (!cleanItems.length) {
      alert("Debes completar los productos agregados");
      return;
    }

    try {
      setSaving(true);

      await api.post("/purchase-orders", {
        ...form,
        items: cleanItems,
      });

      closeModal();
      loadOrders();
      loadProducts();
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || "Error creando orden de compra");
    } finally {
      setSaving(false);
    }
  };

    const handleStatusChange = async (order, newStatus) => {
      if (newStatus === "received") {
        const ok = await confirm({
          title: "Recibir orden",
          message: `¿Seguro que quieres recibir la orden ${order.orderNumber}? Esto aumentará el inventario.`,
          confirmText: "Recibir orden",
          variant: "success",
        });

        if (!ok) return;
      }

      try {
        await api.patch(`/purchase-orders/${order.id}/status`, {
          status: newStatus,
        });

        loadOrders();
        loadProducts();
      } catch (error) {
        console.log(error);
        alert(error.response?.data?.message || "Error cambiando estado");
      }
    };

  const handleDelete = async (order) => {
    const ok = await confirm({
      title: "Eliminar orden",
      message: `¿Seguro que quieres eliminar la orden ${order.orderNumber}? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      variant: "danger",
    });

    if (!ok) return;

    try {
      await api.delete(`/purchase-orders/${order.id}`);
      loadOrders();
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || "Error eliminando orden de compra");
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: "Borrador",
      sent: "Enviada",
      received: "Recibida",
      cancelled: "Cancelada",
    };

    return labels[status] || status;
  };

  const handlePrint = (order) => {
    const html = `
      <html>
        <head>
          <title>${order.orderNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              color: #0f172a;
            }

            .header {
              display: flex;
              justify-content: space-between;
              border-bottom: 2px solid #00bfae;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }

            h1 {
              margin: 0;
              color: #00bfae;
            }

            .box {
              border: 1px solid #e5e7eb;
              border-radius: 14px;
              padding: 18px;
              margin-bottom: 20px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }

            th {
              background: #f1f5f9;
              text-align: left;
              padding: 12px;
              font-size: 12px;
              text-transform: uppercase;
            }

            td {
              padding: 12px;
              border-bottom: 1px solid #e5e7eb;
            }

            .totals {
              margin-left: auto;
              width: 300px;
              margin-top: 25px;
            }

            .totals div {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
            }

            .total {
              font-size: 20px;
              font-weight: bold;
              border-top: 2px solid #0f172a;
              margin-top: 10px;
              padding-top: 12px;
            }

            .notes {
              margin-top: 30px;
              padding: 18px;
              border-radius: 14px;
              background: #f8fafc;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>ORDEN DE COMPRA</h1>
              <p>${order.orderNumber}</p>
            </div>
            <div>
              <strong>Fecha:</strong><br/>
              ${new Date(order.createdAt).toLocaleDateString("es-DO")}<br/><br/>
              <strong>Entrega esperada:</strong><br/>
              ${
                order.expectedDate
                  ? new Date(order.expectedDate).toLocaleDateString("es-DO")
                  : "-"
              }
            </div>
          </div>

          <div class="box">
            <strong>Suplidor:</strong> ${order.supplierName}<br/>
            <strong>RNC:</strong> ${order.supplierRnc || "-"}<br/>
            <strong>Teléfono:</strong> ${order.supplierPhone || "-"}<br/>
            <strong>Email:</strong> ${order.supplierEmail || "-"}<br/>
            <strong>Estado:</strong> ${getStatusLabel(order.status)}
          </div>

          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Costo</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items
                ?.map(
                  (item) => `
                  <tr>
                    <td>${item.productName}</td>
                    <td>${item.quantity}</td>
                    <td>${money.format(Number(item.cost))}</td>
                    <td>${money.format(Number(item.total))}</td>
                  </tr>
                `
                )
                .join("")}
            </tbody>
          </table>

          <div class="totals">
            <div>
              <span>Subtotal</span>
              <strong>${money.format(Number(order.subtotal))}</strong>
            </div>
            <div>
              <span>ITBIS 18%</span>
              <strong>${money.format(Number(order.tax))}</strong>
            </div>
            <div class="total">
              <span>Total</span>
              <strong>${money.format(Number(order.total))}</strong>
            </div>
          </div>

          ${
            order.notes
              ? `<div class="notes"><strong>Notas:</strong><br/>${order.notes}</div>`
              : ""
          }
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="purchase-page">
      <section className="purchase-header">
        <div>
          <span>Orden de compra</span>
          <h2>Compras a suplidores</h2>
          <p>
            Crea órdenes de compra, registra productos solicitados y aumenta el
            inventario cuando la orden sea recibida.
          </p>
        </div>

        <button onClick={openModal} className="primary-btn">
          <Plus size={18} />
          Nueva orden
        </button>
      </section>

      <section className="purchase-stats">
        <div className="purchase-stat-card">
          <div className="stat-icon">
            <ClipboardList size={22} />
          </div>
          <div>
            <span>Órdenes</span>
            <strong>{stats.totalOrders}</strong>
          </div>
        </div>

        <div className="purchase-stat-card">
          <div className="stat-icon">
            <PackagePlus size={22} />
          </div>
          <div>
            <span>Total compras</span>
            <strong>{money.format(stats.totalAmount)}</strong>
          </div>
        </div>

        <div className="purchase-stat-card">
          <div className="stat-icon">
            <PackagePlus size={22} />
          </div>
          <div>
            <span>Recibidas</span>
            <strong>{stats.received}</strong>
          </div>
        </div>

        <div className="purchase-stat-card">
          <div className="stat-icon">
            <ClipboardList size={22} />
          </div>
          <div>
            <span>Borradores</span>
            <strong>{stats.draft}</strong>
          </div>
        </div>
      </section>

      <section className="purchase-panel">
        <div className="purchase-toolbar">
          <div>
            <h3>Listado de órdenes</h3>
            <p>Busca, imprime, recibe o elimina órdenes de compra.</p>
          </div>

          <div className="purchase-search">
            <Search size={18} />
            <input
              placeholder="Buscar orden o suplidor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="purchase-table-wrap">
          <table className="purchase-table">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Suplidor</th>
                <th>Fecha</th>
                <th>Entrega esperada</th>
                <th>Subtotal</th>
                <th>ITBIS</th>
                <th>Total</th>
                <th>Creada por</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className="table-empty">
                    Cargando órdenes de compra...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="10" className="table-empty">
                    No hay órdenes de compra registradas.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <div className="purchase-number-cell">
                        <div className="purchase-icon">
                          <ClipboardList size={18} />
                        </div>
                        <strong>{order.orderNumber}</strong>
                      </div>
                    </td>

                    <td>{order.supplierName}</td>
                    <td>{new Date(order.createdAt).toLocaleDateString("es-DO")}</td>
                    <td>
                      {order.expectedDate
                        ? new Date(order.expectedDate).toLocaleDateString("es-DO")
                        : "-"}
                    </td>
                    <td>{money.format(Number(order.subtotal || 0))}</td>
                    <td>{money.format(Number(order.tax || 0))}</td>
                    <td>
                      <strong>{money.format(Number(order.total || 0))}</strong>
                    </td>
                      <td>{order.creator?.name || "Sistema"}</td>
                    <td>
                      <select
                        className={
                          order.status === "received"
                            ? "status-select ok"
                            : order.status === "cancelled"
                            ? "status-select danger"
                            : order.status === "sent"
                            ? "status-select info"
                            : "status-select warning"
                        }
                        value={order.status}
                        disabled={order.status === "received"}
                        onChange={(e) =>
                          handleStatusChange(order, e.target.value)
                        }
                      >
                        <option value="draft">Borrador</option>
                        <option value="sent">Enviada</option>
                        <option value="received">Recibida</option>
                        <option value="cancelled">Cancelada</option>
                      </select>
                    </td>
                    <td>
                      <div className="table-actions">
                              {order.status !== "received" && order.status !== "cancelled" && (
                                <button
                                  type="button"
                                  className="receive-order-btn"
                                  onClick={() => handleStatusChange(order, "received")}
                                  title="Recibir inventario"
                                >
                                  <PackagePlus size={17} />
                                </button>
                              )}

                              <button onClick={() => handlePrint(order)}>
                                <Printer size={17} />
                              </button>

                              <button
                                className="danger-btn"
                                onClick={() => handleDelete(order)}
                              >
                                <Trash2 size={17} />
                              </button>
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
          <div className="purchase-modal">
            <div className="modal-header">
              <div>
                <span>Nueva orden</span>
                <h3>Crear orden de compra</h3>
              </div>

              <button onClick={closeModal} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="purchase-form">
              <div className="purchase-form-grid">
                <div className="form-row full">
  <label>Suplidor *</label>

  <select
    value={suppliers.find((s) => s.name === form.supplierName)?.id || ""}
    onChange={handleSupplierSelect}
  >
    <option value="">Seleccionar suplidor</option>

    {suppliers.map((supplier) => (
      <option key={supplier.id} value={supplier.id}>
        {supplier.name}
        {supplier.phone ? ` · ${supplier.phone}` : ""}
      </option>
    ))}
  </select>
</div>

{form.supplierName && (
  <div className="selected-supplier-card full">
    <div>
      <span>Suplidor seleccionado</span>
      <strong>{form.supplierName}</strong>
    </div>

    <div className="supplier-info-grid">
      <p>
        <small>RNC</small>
        {form.supplierRnc || "-"}
      </p>

      <p>
        <small>Teléfono</small>
        {form.supplierPhone || "-"}
      </p>

      <p>
        <small>Email</small>
        {form.supplierEmail || "-"}
      </p>
    </div>

    {selectedSupplierStats && (
      <>
        <div className="supplier-business-grid">
          <div>
            <small>Órdenes registradas</small>
            <strong>{selectedSupplierStats.totalOrders}</strong>
          </div>

          <div>
            <small>Total comprado</small>
            <strong>{money.format(selectedSupplierStats.totalPurchased)}</strong>
          </div>

          <div>
            <small>Órdenes pendientes</small>
            <strong>{selectedSupplierStats.pendingOrders}</strong>
          </div>

          <div>
            <small>Balance pendiente</small>
            <strong>{money.format(selectedSupplierStats.pendingBalance)}</strong>
          </div>
        </div>

        <div className="supplier-last-orders">
          <h4>Últimas compras</h4>

          {selectedSupplierStats.lastOrders.length === 0 ? (
            <p className="supplier-empty-history">
              Este suplidor aún no tiene compras registradas.
            </p>
          ) : (
            selectedSupplierStats.lastOrders.map((order) => (
              <div key={order.id} className="supplier-last-order-row">
                <div>
                  <strong>{order.orderNumber}</strong>
                  <span>
                    {new Date(order.createdAt).toLocaleDateString("es-DO")} ·{" "}
                    {getStatusLabel(order.status)}
                  </span>
                </div>

                <strong>{money.format(Number(order.total || 0))}</strong>
              </div>
            ))
          )}
        </div>
      </>
    )}
  </div>
)}

<div className="form-row full">
  <label>Entrega esperada</label>

  <input
    type="date"
    name="expectedDate"
    value={form.expectedDate}
    onChange={handleChange}
  />
</div>
              </div>

              <div className="purchase-items-box">
                <div className="items-header">
                  <div>
                    <h4>Productos a comprar</h4>
                    <p>
                      Agrega productos del inventario o crea líneas con nombre
                      manual.
                    </p>
                  </div>

                  <button type="button" onClick={addEmptyItem}>
                    <Plus size={17} />
                    Agregar producto
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="items-empty">
                    No hay productos agregados a esta orden.
                  </div>
                ) : (
                  <div className="purchase-items-list">
                    {items.map((item, index) => (
                      <div className="purchase-item-row" key={index}>
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
                          value={item.productName}
                          onChange={(e) =>
                            handleItemChange(index, "productName", e.target.value)
                          }
                          placeholder="Producto manual"
                        />

                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(index, "quantity", e.target.value)
                          }
                          placeholder="Cantidad"
                        />

                        <input
                          type="number"
                          step="0.01"
                          value={item.cost}
                          onChange={(e) =>
                            handleItemChange(index, "cost", e.target.value)
                          }
                          placeholder="Costo"
                        />

                        {item.productId && getLastProductPurchase(item.productId) && (
                          <div className="product-last-cost">
                            Último costo:{" "}
                            <strong>
                              {money.format(Number(getLastProductPurchase(item.productId).cost || 0))}
                            </strong>
                            <br />
                            <span>
                              {getLastProductPurchase(item.productId).supplierName} ·{" "}
                              {getLastProductPurchase(item.productId).orderNumber}
                            </span>
                          </div>
                        )}

                        <strong>
                          {money.format(
                            Number(item.quantity || 0) * Number(item.cost || 0)
                          )}
                        </strong>

                        <button
                          type="button"
                          className="remove-item-btn"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-row full purchase-notes">
                <label>Notas</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Condiciones, observaciones, instrucciones al suplidor..."
                />
              </div>

              <div className="purchase-summary">
                <div>
                  <span>Subtotal</span>
                  <strong>{money.format(totals.subtotal)}</strong>
                </div>

                <div>
                  <span>ITBIS 18%</span>
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
                  {saving ? "Guardando..." : "Guardar orden"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}