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
import { useAuth } from "../../context/AuthContext";
import es from "../../i18n/locales/es.json";
import en from "../../i18n/locales/en.json";
import {
  getTaxLabel,
  getTaxRate,
  isDominicanTenant,
} from "../../utils/taxConfig";
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
  const { tenant, language } = useAuth();

  const dictionary = language === "en" ? en : es;

  const t = (path, fallback = "", vars = {}) => {
    let value = path
      .split(".")
      .reduce((acc, key) => acc?.[key], dictionary);

    value = value || fallback || path;

    Object.entries(vars).forEach(([key, val]) => {
      value = String(value).replace(`{{${key}}}`, val);
    });

    return value;
  };

  const isDO = isDominicanTenant(tenant);
  const locale = isDO ? "es-DO" : "en-US";
  const currency = isDO ? "DOP" : "USD";

  const money = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
      }),
    [locale, currency]
  );

  const taxLabel = getTaxLabel(tenant);
  const taxRate = getTaxRate(tenant);

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyOrder);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState([]);

  const filteredOrders = orders.filter((order) => {
    const text = `${order.orderNumber} ${order.supplierName}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (acc, item) => acc + Number(item.quantity || 0) * Number(item.cost || 0),
      0
    );

    const tax = subtotal * (Number(taxRate || 0) / 100);
    const total = subtotal + tax;

    return { subtotal, tax, total };
  }, [items, taxRate]);

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
      alert(
        error.response?.data?.message ||
          t("purchaseOrders.messages.loadError")
      );
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
      setSuppliers(
        Array.isArray(data) ? data.filter((s) => s.isActive !== false) : []
      );
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
    const supplier = suppliers.find(
      (item) => String(item.id) === String(supplierId)
    );

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
      alert(t("purchaseOrders.messages.supplierRequired"));
      return;
    }

    if (!items.length) {
      alert(t("purchaseOrders.messages.itemsRequired"));
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
      alert(t("purchaseOrders.messages.completeItems"));
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
      alert(
        error.response?.data?.message ||
          t("purchaseOrders.messages.createError")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (order, newStatus) => {
    if (newStatus === "received") {
      const ok = await confirm({
        title: t("purchaseOrders.confirm.receiveTitle"),
        message: t("purchaseOrders.confirm.receiveMessage", "", {
          number: order.orderNumber,
        }),
        confirmText: t("purchaseOrders.confirm.receiveButton"),
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
      alert(
        error.response?.data?.message ||
          t("purchaseOrders.messages.statusError")
      );
    }
  };

  const handleDelete = async (order) => {
    const ok = await confirm({
      title: t("purchaseOrders.confirm.deleteTitle"),
      message: t("purchaseOrders.confirm.deleteMessage", "", {
        number: order.orderNumber,
      }),
      confirmText: t("purchaseOrders.confirm.deleteButton"),
      variant: "danger",
    });

    if (!ok) return;

    try {
      await api.delete(`/purchase-orders/${order.id}`);
      loadOrders();
    } catch (error) {
      console.log(error);
      alert(
        error.response?.data?.message ||
          t("purchaseOrders.messages.deleteError")
      );
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: t("purchaseOrders.status.draft"),
      sent: t("purchaseOrders.status.sent"),
      received: t("purchaseOrders.status.received"),
      cancelled: t("purchaseOrders.status.cancelled"),
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
              <h1>${t("purchaseOrders.print.title")}</h1>
              <p>${order.orderNumber}</p>
            </div>
            <div>
              <strong>${t("purchaseOrders.print.date")}:</strong><br/>
              ${new Date(order.createdAt).toLocaleDateString(locale)}
              <br/><br/>
              <strong>${t("purchaseOrders.print.expectedDelivery")}:</strong><br/>
              ${
                order.expectedDate
                  ? new Date(order.expectedDate).toLocaleDateString(locale)
                  : "-"
              }
            </div>
          </div>

          <div class="box">
            <strong>${t("purchaseOrders.print.supplier")}:</strong> ${
      order.supplierName
    }<br/>
            <strong>${t("purchaseOrders.print.rnc")}:</strong> ${
      order.supplierRnc || "-"
    }<br/>
            <strong>${t("purchaseOrders.print.phone")}:</strong> ${
      order.supplierPhone || "-"
    }<br/>
            <strong>${t("purchaseOrders.print.email")}:</strong> ${
      order.supplierEmail || "-"
    }<br/>
            <strong>${t("purchaseOrders.print.status")}:</strong> ${getStatusLabel(
      order.status
    )}
          </div>

          <table>
            <thead>
              <tr>
                <th>${t("purchaseOrders.print.product")}</th>
                <th>${t("purchaseOrders.print.quantity")}</th>
                <th>${t("purchaseOrders.print.cost")}</th>
                <th>${t("purchaseOrders.print.total")}</th>
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
              <span>${t("purchaseOrders.print.subtotal")}</span>
              <strong>${money.format(Number(order.subtotal))}</strong>
            </div>
            <div>
              <span>${taxLabel}</span>
              <strong>${money.format(Number(order.tax))}</strong>
            </div>
            <div class="total">
              <span>${t("purchaseOrders.print.total")}</span>
              <strong>${money.format(Number(order.total))}</strong>
            </div>
          </div>

          ${
            order.notes
              ? `<div class="notes"><strong>${t(
                  "purchaseOrders.print.notes"
                )}:</strong><br/>${order.notes}</div>`
              : ""
          }
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="purchase-page">
      <section className="purchase-header">
        <div>
          <span>{t("purchaseOrders.header.eyebrow")}</span>
          <h2>{t("purchaseOrders.header.title")}</h2>
          <p>{t("purchaseOrders.header.description")}</p>
        </div>

        <button onClick={openModal} className="primary-btn">
          <Plus size={18} />
          {t("purchaseOrders.header.new")}
        </button>
      </section>

      <section className="purchase-stats">
        <div className="purchase-stat-card">
          <div className="stat-icon">
            <ClipboardList size={22} />
          </div>
          <div>
            <span>{t("purchaseOrders.stats.orders")}</span>
            <strong>{stats.totalOrders}</strong>
          </div>
        </div>

        <div className="purchase-stat-card">
          <div className="stat-icon">
            <PackagePlus size={22} />
          </div>
          <div>
            <span>{t("purchaseOrders.stats.totalPurchases")}</span>
            <strong>{money.format(stats.totalAmount)}</strong>
          </div>
        </div>

        <div className="purchase-stat-card">
          <div className="stat-icon">
            <PackagePlus size={22} />
          </div>
          <div>
            <span>{t("purchaseOrders.stats.received")}</span>
            <strong>{stats.received}</strong>
          </div>
        </div>

        <div className="purchase-stat-card">
          <div className="stat-icon">
            <ClipboardList size={22} />
          </div>
          <div>
            <span>{t("purchaseOrders.stats.drafts")}</span>
            <strong>{stats.draft}</strong>
          </div>
        </div>
      </section>

      <section className="purchase-panel">
        <div className="purchase-toolbar">
          <div>
            <h3>{t("purchaseOrders.toolbar.title")}</h3>
            <p>{t("purchaseOrders.toolbar.description")}</p>
          </div>

          <div className="purchase-search">
            <Search size={18} />
            <input
              placeholder={t("purchaseOrders.toolbar.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="purchase-table-wrap">
          <table className="purchase-table">
            <thead>
              <tr>
                <th>{t("purchaseOrders.table.order")}</th>
                <th>{t("purchaseOrders.table.supplier")}</th>
                <th>{t("purchaseOrders.table.date")}</th>
                <th>{t("purchaseOrders.table.expectedDelivery")}</th>
                <th>{t("purchaseOrders.table.subtotal")}</th>
                <th>{taxLabel}</th>
                <th>{t("purchaseOrders.table.total")}</th>
                <th>{t("purchaseOrders.table.createdBy")}</th>
                <th>{t("purchaseOrders.table.status")}</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className="table-empty">
                    {t("purchaseOrders.messages.loading")}
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="10" className="table-empty">
                    {t("purchaseOrders.messages.empty")}
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
                    <td>{new Date(order.createdAt).toLocaleDateString(locale)}</td>
                    <td>
                      {order.expectedDate
                        ? new Date(order.expectedDate).toLocaleDateString(locale)
                        : "-"}
                    </td>
                    <td>{money.format(Number(order.subtotal || 0))}</td>
                    <td>{money.format(Number(order.tax || 0))}</td>
                    <td>
                      <strong>{money.format(Number(order.total || 0))}</strong>
                    </td>
                    <td>{order.creator?.name || t("purchaseOrders.common.system")}</td>
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
                        <option value="draft">
                          {t("purchaseOrders.status.draft")}
                        </option>
                        <option value="sent">
                          {t("purchaseOrders.status.sent")}
                        </option>
                        <option value="received">
                          {t("purchaseOrders.status.received")}
                        </option>
                        <option value="cancelled">
                          {t("purchaseOrders.status.cancelled")}
                        </option>
                      </select>
                    </td>
                    <td>
                      <div className="table-actions">
                        {order.status !== "received" &&
                          order.status !== "cancelled" && (
                            <button
                              type="button"
                              className="receive-order-btn"
                              onClick={() =>
                                handleStatusChange(order, "received")
                              }
                              title={t("purchaseOrders.table.receiveInventory")}
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
                <span>{t("purchaseOrders.modal.eyebrow")}</span>
                <h3>{t("purchaseOrders.modal.title")}</h3>
              </div>

              <button onClick={closeModal} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="purchase-form">
              <div className="purchase-form-grid">
                <div className="form-row full">
                  <label>{t("purchaseOrders.form.supplier")}</label>

                  <select
                    value={
                      suppliers.find((s) => s.name === form.supplierName)?.id ||
                      ""
                    }
                    onChange={handleSupplierSelect}
                  >
                    <option value="">
                      {t("purchaseOrders.form.selectSupplier")}
                    </option>

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
                      <span>{t("purchaseOrders.form.selectedSupplier")}</span>
                      <strong>{form.supplierName}</strong>
                    </div>

                    <div className="supplier-info-grid">
                      <p>
                        <small>{t("purchaseOrders.form.rnc")}</small>
                        {form.supplierRnc || "-"}
                      </p>

                      <p>
                        <small>{t("purchaseOrders.form.phone")}</small>
                        {form.supplierPhone || "-"}
                      </p>

                      <p>
                        <small>{t("purchaseOrders.form.email")}</small>
                        {form.supplierEmail || "-"}
                      </p>
                    </div>

                    {selectedSupplierStats && (
                      <>
                        <div className="supplier-business-grid">
                          <div>
                            <small>
                              {t("purchaseOrders.form.registeredOrders")}
                            </small>
                            <strong>{selectedSupplierStats.totalOrders}</strong>
                          </div>

                          <div>
                            <small>
                              {t("purchaseOrders.form.totalPurchased")}
                            </small>
                            <strong>
                              {money.format(selectedSupplierStats.totalPurchased)}
                            </strong>
                          </div>

                          <div>
                            <small>
                              {t("purchaseOrders.form.pendingOrders")}
                            </small>
                            <strong>{selectedSupplierStats.pendingOrders}</strong>
                          </div>

                          <div>
                            <small>
                              {t("purchaseOrders.form.pendingBalance")}
                            </small>
                            <strong>
                              {money.format(selectedSupplierStats.pendingBalance)}
                            </strong>
                          </div>
                        </div>

                        <div className="supplier-last-orders">
                          <h4>{t("purchaseOrders.form.lastPurchases")}</h4>

                          {selectedSupplierStats.lastOrders.length === 0 ? (
                            <p className="supplier-empty-history">
                              {t("purchaseOrders.form.emptySupplierHistory")}
                            </p>
                          ) : (
                            selectedSupplierStats.lastOrders.map((order) => (
                              <div
                                key={order.id}
                                className="supplier-last-order-row"
                              >
                                <div>
                                  <strong>{order.orderNumber}</strong>
                                  <span>
                                    {new Date(
                                      order.createdAt
                                    ).toLocaleDateString(locale)}{" "}
                                    · {getStatusLabel(order.status)}
                                  </span>
                                </div>

                                <strong>
                                  {money.format(Number(order.total || 0))}
                                </strong>
                              </div>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="form-row full">
                  <label>{t("purchaseOrders.form.expectedDelivery")}</label>

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
                    <h4>{t("purchaseOrders.items.title")}</h4>
                    <p>{t("purchaseOrders.items.description")}</p>
                  </div>

                  <button type="button" onClick={addEmptyItem}>
                    <Plus size={17} />
                    {t("purchaseOrders.items.add")}
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="items-empty">
                    {t("purchaseOrders.items.empty")}
                  </div>
                ) : (
                  <div className="purchase-items-list">
                    {items.map((item, index) => {
                      const lastPurchase = getLastProductPurchase(item.productId);

                      return (
                        <div className="purchase-item-row" key={index}>
                          <select
                            value={item.productId}
                            onChange={(e) =>
                              handleItemChange(index, "productId", e.target.value)
                            }
                          >
                            <option value="">
                              {t("purchaseOrders.items.selectProduct")}
                            </option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} -{" "}
                                {t("purchaseOrders.items.stock")}: {product.stock}
                              </option>
                            ))}
                          </select>

                          <input
                            value={item.productName}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "productName",
                                e.target.value
                              )
                            }
                            placeholder={t("purchaseOrders.items.manualProduct")}
                          />

                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(index, "quantity", e.target.value)
                            }
                            placeholder={t("purchaseOrders.items.quantity")}
                          />

                          <input
                            type="number"
                            step="0.01"
                            value={item.cost}
                            onChange={(e) =>
                              handleItemChange(index, "cost", e.target.value)
                            }
                            placeholder={t("purchaseOrders.items.cost")}
                          />

                          {item.productId && lastPurchase && (
                            <div className="product-last-cost">
                              {t("purchaseOrders.items.lastCost")}:{" "}
                              <strong>
                                {money.format(Number(lastPurchase.cost || 0))}
                              </strong>
                              <br />
                              <span>
                                {lastPurchase.supplierName} ·{" "}
                                {lastPurchase.orderNumber}
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
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="form-row full purchase-notes">
                <label>{t("purchaseOrders.form.notes")}</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder={t("purchaseOrders.form.notesPlaceholder")}
                />
              </div>

              <div className="purchase-summary">
                <div>
                  <span>{t("purchaseOrders.summary.subtotal")}</span>
                  <strong>{money.format(totals.subtotal)}</strong>
                </div>

                <div>
                  <span>{taxLabel}</span>
                  <strong>{money.format(totals.tax)}</strong>
                </div>

                <div className="summary-total">
                  <span>{t("purchaseOrders.summary.total")}</span>
                  <strong>{money.format(totals.total)}</strong>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="cancel-btn">
                  {t("purchaseOrders.form.cancel")}
                </button>

                <button disabled={saving} className="primary-btn">
                  {saving
                    ? t("purchaseOrders.form.saving")
                    : t("purchaseOrders.form.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}