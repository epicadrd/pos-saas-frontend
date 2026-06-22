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
import es from "../../i18n/locales/es.json";
import en from "../../i18n/locales/en.json";
import {
  getTaxLabel,
  getTaxRate,
  isDominicanTenant,
} from "../../utils/taxConfig";
import { useConfirm } from "../../components/ConfirmProvider";

const statusClass = {
  draft: "badge warning",
  issued: "badge info",
  delivered: "badge ok",
  cancelled: "badge danger",
};

export default function DeliveryNotes() {
  const navigate = useNavigate();
  const { tenant, language } = useAuth();
  const { confirm } = useConfirm();

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

  const emptyForm = {
    customerName: "",
    customerRnc: "",
    customerPhone: "",
    customerEmail: "",
    customerAddress: "",
    customerPurchaseOrder: "",
    warehouseName: t("deliveryNotes.common.warehouseDefault"),
    issueDate: new Date().toISOString().slice(0, 10),
    deliveryDate: "",
    driverName: "",
    driverId: "",
    vehiclePlate: "",
    deliveryAddress: "",
    deliveryInstructions: "",
  };

  const statusLabel = {
    draft: t("deliveryNotes.status.draft"),
    issued: t("deliveryNotes.status.issued"),
    delivered: t("deliveryNotes.status.delivered"),
    cancelled: t("deliveryNotes.status.cancelled"),
  };

  const [deliveryNotes, setDeliveryNotes] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDeliveryNote, setSelectedDeliveryNote] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const color = tenant?.primaryColor || "#00bfae";
  const logo = tenant?.logoDataUrl || "";

  const taxLabel = getTaxLabel(tenant);
  const taxRate = getTaxRate(tenant);
  const taxEnabled = Number(taxRate || 0) > 0;
  const taxMode = tenant?.invoiceTaxMode || "global";

  const formatDateOnly = (value) => {
    if (!value) return "-";

    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  };

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
      alert(error.response?.data?.message || t("deliveryNotes.messages.loadError"));
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
        unit: t("deliveryNotes.common.unitDefault"),
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
        unit: product?.unit || t("deliveryNotes.common.unitDefault"),
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
    if (!form.customerName.trim()) {
      return alert(t("deliveryNotes.messages.customerRequired"));
    }

    if (!form.customerPurchaseOrder.trim()) {
      return alert(t("deliveryNotes.messages.purchaseOrderRequired"));
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
        unit: item.unit || t("deliveryNotes.common.unitDefault"),
        isTaxable: item.isTaxable !== false,
      }));

    if (!cleanItems.length) {
      return alert(t("deliveryNotes.messages.itemsRequired"));
    }

    if (status === "issued" && hasStockError) {
      return alert(t("deliveryNotes.messages.stockError"));
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
      alert(error.response?.data?.message || t("deliveryNotes.messages.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const issueNote = async (note) => {
    const ok = await confirm({
      title: t("deliveryNotes.confirm.issueTitle"),
      message: t("deliveryNotes.confirm.issueMessage", "", {
        number: note.deliveryNoteNumber,
      }),
      confirmText: t("deliveryNotes.confirm.issueButton"),
      variant: "danger",
    });

    if (!ok) return;

    try {
      await api.patch(`/delivery-notes/${note.id}/issue`);
      await loadData();
    } catch (error) {
      alert(error.response?.data?.message || t("deliveryNotes.messages.issueError"));
    }
  };

  const markDelivered = async (note) => {
    const receivedByName = prompt(t("deliveryNotes.prompts.receivedByName"));
    if (!receivedByName) return;

    const receivedById = prompt(t("deliveryNotes.prompts.receivedById")) || "";

    try {
      await api.patch(`/delivery-notes/${note.id}/delivered`, {
        receivedByName,
        receivedById,
      });

      await loadData();
    } catch (error) {
      alert(error.response?.data?.message || t("deliveryNotes.messages.deliveredError"));
    }
  };

  const cancelNote = async (note) => {
    const ok = await confirm({
      title: t("deliveryNotes.confirm.cancelTitle"),
      message: t("deliveryNotes.confirm.cancelMessage", "", {
        number: note.deliveryNoteNumber,
      }),
      confirmText: t("deliveryNotes.confirm.cancelButton"),
      variant: "danger",
    });

    if (!ok) return;

    try {
      await api.patch(`/delivery-notes/${note.id}/cancel`);
      await loadData();
    } catch (error) {
      alert(error.response?.data?.message || t("deliveryNotes.messages.cancelError"));
    }
  };

  const convertToInvoice = async (note) => {
    const ok = await confirm({
      title: t("deliveryNotes.confirm.convertTitle"),
      message: t("deliveryNotes.confirm.convertMessage", "", {
        number: note.deliveryNoteNumber,
      }),
      confirmText: t("deliveryNotes.confirm.convertButton"),
      variant: "success",
    });

    if (!ok) return;

    try {
      await api.post(`/delivery-notes/${note.id}/convert-to-invoice`);
      await loadData();
      alert(t("deliveryNotes.messages.convertedSuccess"));
      navigate("/dashboard/facturacion");
    } catch (error) {
      alert(error.response?.data?.message || t("deliveryNotes.messages.convertError"));
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
              <h1>${t("deliveryNotes.print.title")}</h1>
              <p>${note.deliveryNoteNumber}</p>
              <p class="muted">${t("deliveryNotes.print.subtitle")}</p>
            </div>

            <div>
              <strong>${tenant?.businessName || t("deliveryNotes.print.companyFallback")}</strong><br/>
              ${t("deliveryNotes.print.rnc")}: ${tenant?.rnc || "-"}<br/>
              ${tenant?.address || ""}<br/>
              ${tenant?.email || ""}<br/>
              ${tenant?.phone || ""}
            </div>
          </div>

          <div class="box">
            <strong>${t("deliveryNotes.print.customer")}:</strong> ${note.customerName || "-"}<br/>
            <strong>${t("deliveryNotes.print.customerRnc")}:</strong> ${note.customerRnc || "-"}<br/>
            <strong>${t("deliveryNotes.print.phone")}:</strong> ${note.customerPhone || "-"}<br/>
            <strong>${t("deliveryNotes.print.customerPurchaseOrder")}:</strong> ${note.customerPurchaseOrder || "-"}<br/>
            <strong>${t("deliveryNotes.print.deliveryAddress")}:</strong> ${note.deliveryAddress || "-"}
          </div>

          <div class="box">
            <strong>${t("deliveryNotes.print.warehouse")}:</strong> ${note.warehouseName || t("deliveryNotes.print.warehouseFallback")}<br/>
            <strong>${t("deliveryNotes.print.driver")}:</strong> ${note.driverName || "-"}<br/>
            <strong>${t("deliveryNotes.print.driverId")}:</strong> ${note.driverId || "-"}<br/>
            <strong>${t("deliveryNotes.print.vehiclePlate")}:</strong> ${note.vehiclePlate || "-"}<br/>
            <strong>${t("deliveryNotes.print.issueDate")}:</strong> ${formatDateOnly(note.issueDate)}<br/>
            <strong>${t("deliveryNotes.print.deliveryDate")}:</strong> ${formatDateOnly(note.deliveryDate || note.issueDate)}
          </div>

          <table>
            <thead>
              <tr>
                <th>${t("deliveryNotes.print.code")}</th>
                <th>${t("deliveryNotes.print.product")}</th>
                <th>${t("deliveryNotes.print.description")}</th>
                <th>${t("deliveryNotes.print.unit")}</th>
                <th>${t("deliveryNotes.print.requested")}</th>
                <th>${t("deliveryNotes.print.dispatched")}</th>
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
                    <td>${item.unit || t("deliveryNotes.common.unitDefault")}</td>
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
              ? `<div class="box" style="margin-top:20px;"><strong>${t("deliveryNotes.print.instructions")}:</strong><br/>${note.deliveryInstructions}</div>`
              : ""
          }

          <div class="signatures">
            <div class="signature">
              ${t("deliveryNotes.print.deliveredBy")}<br/>
              ${t("deliveryNotes.print.signatureDelivered")}
            </div>

            <div class="signature">
              ${t("deliveryNotes.print.receivedBy")}<br/>
              ${t("deliveryNotes.print.signatureReceived")}
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
          <span>{t("deliveryNotes.header.eyebrow")}</span>
          <h2>{t("deliveryNotes.header.title")}</h2>
          <p>{t("deliveryNotes.header.description")}</p>
        </div>

        <button className="primary-btn" onClick={openModal}>
          <Plus size={18} />
          {t("deliveryNotes.header.new")}
        </button>
      </section>

      <section className="quote-stats">
        <div className="quote-stat-card">
          <div className="stat-icon">
            <ClipboardList size={22} />
          </div>
          <div>
            <span>{t("deliveryNotes.stats.total")}</span>
            <strong>{stats.total}</strong>
          </div>
        </div>

        <div className="quote-stat-card">
          <div className="stat-icon">
            <FileText size={22} />
          </div>
          <div>
            <span>{t("deliveryNotes.stats.drafts")}</span>
            <strong>{stats.draft}</strong>
          </div>
        </div>

        <div className="quote-stat-card">
          <div className="stat-icon">
            <Truck size={22} />
          </div>
          <div>
            <span>{t("deliveryNotes.stats.issued")}</span>
            <strong>{stats.issued}</strong>
          </div>
        </div>

        <div className="quote-stat-card">
          <div className="stat-icon">
            <CheckCircle size={22} />
          </div>
          <div>
            <span>{t("deliveryNotes.stats.delivered")}</span>
            <strong>{stats.delivered}</strong>
          </div>
        </div>
      </section>

      <section className="quote-panel">
        <div className="quote-toolbar">
          <div>
            <h3>{t("deliveryNotes.toolbar.title")}</h3>
            <p>{t("deliveryNotes.toolbar.description")}</p>
          </div>

          <div className="quote-toolbar-actions">
            <select
              className="quote-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{t("deliveryNotes.toolbar.all")}</option>
              <option value="draft">{t("deliveryNotes.status.draft")}</option>
              <option value="issued">{t("deliveryNotes.status.issued")}</option>
              <option value="delivered">{t("deliveryNotes.status.delivered")}</option>
              <option value="cancelled">{t("deliveryNotes.status.cancelled")}</option>
            </select>

            <div className="quote-search">
              <Search size={18} />
              <input
                placeholder={t("deliveryNotes.toolbar.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="quote-table-wrap quote-desktop-list">
          <table className="quote-table">
            <thead>
              <tr>
                <th>{t("deliveryNotes.table.deliveryNote")}</th>
                <th>{t("deliveryNotes.table.customer")}</th>
                <th>{t("deliveryNotes.table.customerPurchaseOrder")}</th>
                <th>{t("deliveryNotes.table.delivery")}</th>
                <th>{t("deliveryNotes.table.total")}</th>
                <th>{t("deliveryNotes.table.status")}</th>
                <th>{t("deliveryNotes.table.createdBy")}</th>
                <th>{t("deliveryNotes.table.actions")}</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="table-empty">
                    {t("deliveryNotes.messages.loading")}
                  </td>
                </tr>
              ) : filteredDeliveryNotes.length === 0 ? (
                <tr>
                  <td colSpan="8" className="table-empty">
                    {t("deliveryNotes.messages.empty")}
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
                    <td>{formatDateOnly(note.deliveryDate || note.issueDate)}</td>

                    <td>{money.format(Number(note.total || 0))}</td>

                    <td>
                      <span className={statusClass[note.status] || "badge warning"}>
                        {statusLabel[note.status] || t("deliveryNotes.status.draft")}
                      </span>
                    </td>

                    <td>{note.creator?.name || t("deliveryNotes.common.system")}</td>

                    <td>
                      <div className="table-actions quote-actions">
                        <button
                          title={t("deliveryNotes.actions.print")}
                          onClick={() => printNote(note)}
                        >
                          <Printer size={16} />
                        </button>

                        {note.status === "draft" && (
                          <button
                            title={t("deliveryNotes.actions.issue")}
                            onClick={() => issueNote(note)}
                          >
                            <Send size={16} />
                          </button>
                        )}

                        {note.status === "issued" && (
                          <button
                            title={t("deliveryNotes.actions.markDelivered")}
                            onClick={() => markDelivered(note)}
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}

                        {(note.status === "issued" || note.status === "delivered") &&
                          !note.invoiceId && (
                            <button
                              title={t("deliveryNotes.actions.convertToInvoice")}
                              onClick={() => convertToInvoice(note)}
                            >
                              <FileText size={16} />
                            </button>
                          )}

                        {note.status !== "cancelled" && !note.invoiceId && (
                          <button
                            className="danger-btn"
                            title={t("deliveryNotes.actions.cancel")}
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
         <div className="quote-mobile-list">
  {loading ? (
    <div className="quote-mobile-empty">
      {t("deliveryNotes.messages.loading")}
    </div>
  ) : filteredDeliveryNotes.length ? (
    filteredDeliveryNotes.map((note) => (
      <button
        type="button"
        key={note.id}
        className="quote-mobile-card"
        onClick={() => setSelectedDeliveryNote(note)}
      >
        <div className="quote-mobile-top">
          <div>
            <span>{t("deliveryNotes.table.deliveryNote")}</span>
            <strong>{note.deliveryNoteNumber}</strong>
          </div>

          <span className={statusClass[note.status] || "badge warning"}>
            {statusLabel[note.status] || t("deliveryNotes.status.draft")}
          </span>
        </div>

        <div className="quote-mobile-client">
          <span>{t("deliveryNotes.table.customer")}</span>
          <strong>{note.customerName || "-"}</strong>
        </div>

        <div className="quote-mobile-money-grid">
          <div>
            <span>{t("deliveryNotes.table.customerPurchaseOrder")}</span>
            <strong>{note.customerPurchaseOrder || "-"}</strong>
          </div>

          <div>
            <span>{t("deliveryNotes.table.total")}</span>
            <strong>{money.format(Number(note.total || 0))}</strong>
          </div>
        </div>

        <div className="quote-mobile-footer">
          <span>
            {t("deliveryNotes.table.delivery")}{" "}
            {formatDateOnly(note.deliveryDate || note.issueDate)}
          </span>
          <strong>Ver detalle</strong>
        </div>
      </button>
    ))
  ) : (
    <div className="quote-mobile-empty">
      {t("deliveryNotes.messages.empty")}
    </div>
  )}
</div>

{selectedDeliveryNote && (
  <div
    className="quote-detail-overlay"
    onClick={() => setSelectedDeliveryNote(null)}
  >
    <div className="quote-detail-modal" onClick={(e) => e.stopPropagation()}>
      <div className="quote-detail-header">
        <div>
          <span>{t("deliveryNotes.table.deliveryNote")}</span>
          <h3>{selectedDeliveryNote.deliveryNoteNumber}</h3>
        </div>

        <button type="button" onClick={() => setSelectedDeliveryNote(null)}>
          <X size={20} />
        </button>
      </div>

      <div className="quote-detail-status">
        <span className={statusClass[selectedDeliveryNote.status] || "badge warning"}>
          {statusLabel[selectedDeliveryNote.status] || t("deliveryNotes.status.draft")}
        </span>
      </div>

      <div className="quote-detail-list">
        <div>
          <span>{t("deliveryNotes.table.customer")}</span>
          <strong>{selectedDeliveryNote.customerName || "-"}</strong>
        </div>

        <div>
          <span>{t("deliveryNotes.table.customerPurchaseOrder")}</span>
          <strong>{selectedDeliveryNote.customerPurchaseOrder || "-"}</strong>
        </div>

        <div>
          <span>{t("deliveryNotes.table.delivery")}</span>
          <strong>
            {formatDateOnly(
              selectedDeliveryNote.deliveryDate || selectedDeliveryNote.issueDate
            )}
          </strong>
        </div>

        <div>
          <span>{t("deliveryNotes.table.total")}</span>
          <strong>{money.format(Number(selectedDeliveryNote.total || 0))}</strong>
        </div>

        <div>
          <span>{t("deliveryNotes.table.createdBy")}</span>
          <strong>
            {selectedDeliveryNote.creator?.name || t("deliveryNotes.common.system")}
          </strong>
        </div>
      </div>

      <div className="quote-detail-actions">
        <button onClick={() => printNote(selectedDeliveryNote)}>
          <Printer size={16} />
          {t("deliveryNotes.actions.print")}
        </button>

        {selectedDeliveryNote.status === "draft" && (
          <button onClick={() => issueNote(selectedDeliveryNote)}>
            <Send size={16} />
            {t("deliveryNotes.actions.issue")}
          </button>
        )}

        {selectedDeliveryNote.status === "issued" && (
          <button onClick={() => markDelivered(selectedDeliveryNote)}>
            <CheckCircle size={16} />
            {t("deliveryNotes.actions.markDelivered")}
          </button>
        )}

        {(selectedDeliveryNote.status === "issued" ||
          selectedDeliveryNote.status === "delivered") &&
          !selectedDeliveryNote.invoiceId && (
            <button onClick={() => convertToInvoice(selectedDeliveryNote)}>
              <FileText size={16} />
              {t("deliveryNotes.actions.convertToInvoice")}
            </button>
          )}

        {selectedDeliveryNote.status !== "cancelled" &&
          !selectedDeliveryNote.invoiceId && (
            <button
              className="danger-btn"
              onClick={() => cancelNote(selectedDeliveryNote)}
            >
              <Ban size={16} />
              {t("deliveryNotes.actions.cancel")}
            </button>
          )}
      </div>
    </div>
  </div>
)}
      </section>

      {modalOpen && (
        <div className="modal-overlay">
          <div className="quote-modal">
            <div className="modal-header">
              <div>
                <span>{t("deliveryNotes.form.modalEyebrow")}</span>
                <h3>{t("deliveryNotes.form.title")}</h3>
              </div>

              <button className="modal-close" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <div className="quote-form">
              <div className="quote-form-grid">
                <div className="form-row">
                  <label>{t("deliveryNotes.form.customer")}</label>
                  <input
                    name="customerName"
                    list="delivery-customers"
                    value={form.customerName}
                    onChange={handleFormChange}
                    placeholder={t("deliveryNotes.form.customerName")}
                  />
                  <datalist id="delivery-customers">
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.name} />
                    ))}
                  </datalist>
                </div>

                <div className="form-row">
                  <label>{t("deliveryNotes.form.rnc")}</label>
                  <input
                    name="customerRnc"
                    value={form.customerRnc}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-row">
                  <label>{t("deliveryNotes.form.phone")}</label>
                  <input
                    name="customerPhone"
                    value={form.customerPhone}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-row">
                  <label>{t("deliveryNotes.form.email")}</label>
                  <input
                    name="customerEmail"
                    value={form.customerEmail}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-row">
                  <label>{t("deliveryNotes.form.customerPurchaseOrder")}</label>
                  <input
                    name="customerPurchaseOrder"
                    value={form.customerPurchaseOrder}
                    onChange={handleFormChange}
                    placeholder={t("deliveryNotes.form.purchaseOrderPlaceholder")}
                  />
                </div>

                <div className="form-row">
                  <label>{t("deliveryNotes.form.warehouse")}</label>
                  <input
                    name="warehouseName"
                    value={form.warehouseName}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-row">
                  <label>{t("deliveryNotes.form.issueDate")}</label>
                  <input
                    type="date"
                    name="issueDate"
                    value={form.issueDate}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-row">
                  <label>{t("deliveryNotes.form.deliveryDate")}</label>
                  <input
                    type="date"
                    name="deliveryDate"
                    value={form.deliveryDate}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-row">
                  <label>{t("deliveryNotes.form.driver")}</label>
                  <input
                    name="driverName"
                    value={form.driverName}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-row">
                  <label>{t("deliveryNotes.form.driverId")}</label>
                  <input
                    name="driverId"
                    value={form.driverId}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-row">
                  <label>{t("deliveryNotes.form.vehiclePlate")}</label>
                  <input
                    name="vehiclePlate"
                    value={form.vehiclePlate}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-row full">
                  <label>{t("deliveryNotes.form.deliveryAddress")}</label>
                  <textarea
                    name="deliveryAddress"
                    value={form.deliveryAddress}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-row full">
                  <label>{t("deliveryNotes.form.deliveryInstructions")}</label>
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
                    <h4>{t("deliveryNotes.items.title")}</h4>
                    <p>{t("deliveryNotes.items.description")}</p>
                  </div>

                  <button type="button" onClick={addItem}>
                    <Plus size={17} />
                    {t("deliveryNotes.items.addProduct")}
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="items-empty">
                    {t("deliveryNotes.items.empty")}
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
                            <option value="">
                              {t("deliveryNotes.items.product")}
                            </option>
                            {products.map((product) => {
                              const service =
                                product.productType === "service" ||
                                product.trackStock === false;

                              return (
                                <option key={product.id} value={product.id}>
                                  {product.name}{" "}
                                  {service
                                    ? `(${t("deliveryNotes.items.service")})`
                                    : `(${t("deliveryNotes.items.stock")}: ${product.stock})`}
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
                            placeholder={t("deliveryNotes.items.requested")}
                          />

                          <input
                            type="number"
                            min="1"
                            value={item.dispatchedQuantity}
                            onChange={(e) =>
                              updateItem(index, "dispatchedQuantity", e.target.value)
                            }
                            placeholder={t("deliveryNotes.items.dispatched")}
                          />

                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(index, "unitPrice", e.target.value)
                            }
                            placeholder={t("deliveryNotes.items.price")}
                          />

                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount}
                            onChange={(e) =>
                              updateItem(index, "discount", e.target.value)
                            }
                            placeholder={t("deliveryNotes.items.discount")}
                          />

                          <strong className={stockError ? "text-danger" : ""}>
                            {stockError
                              ? `${t("deliveryNotes.items.stock")}: ${product.stock}`
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
                  <span>{t("deliveryNotes.summary.subtotal")}</span>
                  <strong>{money.format(totals.subtotal)}</strong>
                </div>

                <div>
                  <span>{taxLabel}</span>
                  <strong>{money.format(totals.tax)}</strong>
                </div>

                <div className="summary-total">
                  <span>{t("deliveryNotes.summary.total")}</span>
                  <strong>{money.format(totals.total)}</strong>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={closeModal}>
                  {t("deliveryNotes.actions.close")}
                </button>

                <button
                  type="button"
                  className="primary-btn"
                  disabled={saving}
                  onClick={() => saveDeliveryNote("draft")}
                >
                  {t("deliveryNotes.actions.saveDraft")}
                </button>

                <button
                  type="button"
                  className="primary-btn"
                  disabled={saving || hasStockError}
                  onClick={() => saveDeliveryNote("issued")}
                >
                  {t("deliveryNotes.actions.issueDeliveryNote")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}