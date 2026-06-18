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
import { useTranslation } from "react-i18next";
import { useConfirm } from "../../components/ConfirmProvider";
import {
  getTaxRate,
  getTaxLabel,
  isDominicanTenant,
} from "../../utils/taxConfig";

const emptyQuote = {
  customerName: "",
  customerRnc: "",
  customerPhone: "",
  customerEmail: "",
  validUntil: "",
  status: "draft",
  notes: "",
};

const getStatusLabel = (status, t) =>
  ({
    draft: t("quotes.status.draft"),
    sent: t("quotes.status.sent"),
    approved: t("quotes.status.approved"),
    rejected: t("quotes.status.rejected"),
    expired: t("quotes.status.expired"),
    converted: t("quotes.status.converted"),
  }[status] || t("quotes.status.draft"));

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
  const { t } = useTranslation();
  const quoteColor = tenant?.primaryColor || "#00bfae";
  const quoteLogo = tenant?.logoDataUrl || "";
  const [editingQuoteId, setEditingQuoteId] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);

  const isDO = isDominicanTenant(tenant);
  const locale = isDO ? "es-DO" : "en-US";

  const money = new Intl.NumberFormat(
    locale,
    {
      style: "currency",
      currency: isDO ? "DOP" : "USD",
    }
  );

  const todayString = new Date().toISOString().slice(0, 10);

  const taxRate = getTaxRate(tenant);
  const taxLabel = getTaxLabel(tenant);

  const usTaxBreakdown = {
    stateRate: Number(tenant?.usStateTaxRate || 0),
    countyRate: Number(tenant?.usCountyTaxRate || 0),
    cityRate: Number(tenant?.usCityTaxRate || 0),
  };

  const getTaxAmount = (rate, base = 0) =>
    Math.round(
      (
        Number(base || 0) *
        (Number(rate || 0) / 100) +
        Number.EPSILON
      ) *
        100
    ) / 100;

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
      return acc + (item.isTaxable === false ? 0 : lineSubtotal * (taxRate / 100));
    }, 0);

    return {
      subtotal,
      tax,
      total: subtotal + tax,
    };
  }, [items, taxRate]);

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
      alert(error.response?.data?.message || t("quotes.messages.loadError"));
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
      alert(t("quotes.messages.customerRequired"));
      return;
    }

    if (!items.length) {
      alert(t("quotes.messages.itemsRequired"));
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
      alert(t("quotes.messages.completeItems"));
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
      alert(error.response?.data?.message || t("quotes.messages.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuote = async (quote) => {
  const ok = await confirm({
    title: t("quotes.confirm.deleteTitle"),
    message: t("quotes.confirm.deleteMessage", {
      number: quote.quoteNumber,
    }),
    confirmText: t("quotes.confirm.deleteButton"),
    variant: "danger",
  });

  if (!ok) return;

  try {
    await api.delete(`/quotes/${quote.id}`);
    loadQuotes();
  } catch (error) {
    console.log(error);
    alert(error.response?.data?.message || t("quotes.messages.deleteError"));
  }
};

  const handleStatus = async (quote, status) => {
    try {
      await api.patch(`/quotes/${quote.id}/status`, { status });
      loadQuotes();
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || t("quotes.messages.statusError"));
    }
  };

  const handleConvertToInvoice = async (quote) => {
  const ok = await confirm({
    title: t("quotes.confirm.convertTitle"),
    message: t("quotes.confirm.convertMessage", {
      number: quote.quoteNumber,
    }),
    confirmText: t("quotes.confirm.convertButton"),
    variant: "success",
  });

  if (!ok) return;

  try {
    await api.post(`/quotes/${quote.id}/convert-to-invoice`);
    await loadQuotes();
    alert(t("quotes.messages.convertedSuccess"));
    navigate("/dashboard/facturacion");
  } catch (error) {
    console.log(error);
    alert(error.response?.data?.message || t("quotes.messages.convertError"));
  }
};

  const copyWhatsAppMessage = async (quote) => {
  const text = t("quotes.whatsapp.message", {
    number: quote.quoteNumber,
    total: money.format(Number(quote.total || 0)),
    validUntil: quote.validUntil
      ? new Date(quote.validUntil).toLocaleDateString(locale)
      : t("quotes.messages.availability"),
  });

  try {
    await navigator.clipboard.writeText(text);
    alert(t("quotes.messages.whatsappCopied"));
  } catch {
    alert(text);
  }
};

  const openEditQuote = (quote) => {
  if (quote.status === "converted") {
    alert(t("quotes.messages.convertedCannotEdit"));
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
          <h1>${t("quotes.print.title")}</h1>
          <p>${quote.quoteNumber}</p>
          <p class="muted">${t("quotes.messages.quoteNotFiscal")}</p>
        </div>

        <div>
          <strong>${tenant?.businessName || t("quotes.print.companyFallback")}</strong><br/>
          ${tenant?.address || ""}<br/>
          ${isDO ? `RNC/Cédula: ${tenant?.rnc || "-"}<br/>` : ""}
          ${tenant?.email || ""}<br/>
          ${tenant?.phone || ""}<br/><br/>
          <strong>${t("quotes.print.date")}:</strong> ${new Date(quote.createdAt).toLocaleDateString(locale)}<br/>
          <strong>${t("quotes.print.validUntil")}:</strong> ${
            quote.validUntil
              ? new Date(quote.validUntil).toLocaleDateString(locale)
              : "-"
          }
        </div>
      </div>

          <div class="box">
            <strong>${t("quotes.print.customer")}:</strong> ${quote.customerName}<br/>
            ${isDO ? `<strong>${t("quotes.print.rnc")}:</strong> ${quote.customerRnc || "-"}<br/>` : ""}
            <strong>${t("quotes.print.phone")}:</strong> ${quote.customerPhone || "-"}<br/>
            <strong>${t("quotes.print.email")}:</strong> ${quote.customerEmail || "-"}
          </div>

          <table>
            <thead>
              <tr>
               <th>${t("quotes.fields.product")}</th>
                <th>${t("quotes.fields.quantityShort")}</th>
                <th>${t("quotes.fields.price")}</th>
                <th>${t("quotes.fields.discountShort")}</th>
                <th>${t("quotes.fields.subtotal")}</th>
                <th>${taxLabel}</th>
                <th>${t("quotes.fields.total")}</th>
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
              <span>${t("quotes.fields.subtotal")}</span>
              <strong>${money.format(Number(quote.subtotal || 0))}</strong>
            </div>
            ${
  isDO
    ? `
      <div>
        <span>${taxLabel} (${taxRate}%)</span>
        <strong>${money.format(Number(quote.tax || 0))}</strong>
      </div>
    `
    : `
      <div>
        <span>${t("quotes.tax.state")} (${usTaxBreakdown.stateRate}%)</span>
        <strong>${money.format(getTaxAmount(usTaxBreakdown.stateRate, Number(quote.subtotal || 0)))}</strong>
      </div>

      <div>
        <span>${t("quotes.tax.county")} (${usTaxBreakdown.countyRate}%)</span>
        <strong>${money.format(getTaxAmount(usTaxBreakdown.countyRate, Number(quote.subtotal || 0)))}</strong>
      </div>

      <div>
        <span>${t("quotes.tax.city")} (${usTaxBreakdown.cityRate}%)</span>
        <strong>${money.format(getTaxAmount(usTaxBreakdown.cityRate, Number(quote.subtotal || 0)))}</strong>
      </div>

      <div>
        <span>${t("quotes.tax.total")} (${taxRate}%)</span>
        <strong>${money.format(Number(quote.tax || 0))}</strong>
      </div>
    `
}
            <div class="total">
              <span>${t("quotes.fields.total")}</span>
              <strong>${money.format(Number(quote.total || 0))}</strong>
            </div>
          </div>

          ${
            quote.notes
              ? `<div class="notes"><strong>${t("quotes.print.notes")}:</strong><br/>${quote.notes}</div>`
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
          <span>{t("quotes.title")}</span>
          <h2>{t("quotes.subtitle")}</h2>
          <p>{t("quotes.description")}</p>
        </div>

        <button onClick={openModal} className="primary-btn">
          <Plus size={18} />
          {t("quotes.actions.newQuote")}
        </button>
      </section>

      <section className="quote-stats">
        <div className="quote-stat-card">
          <div className="stat-icon">
            <ClipboardList size={22} />
          </div>
          <div>
            <span>{t("quotes.title")}</span>
            <strong>{stats.totalQuotes}</strong>
          </div>
        </div>

        <div className="quote-stat-card">
          <div className="stat-icon">
            <FileText size={22} />
          </div>
          <div>
            <span>{t("quotes.fields.total")}</span>
            <strong>{money.format(stats.totalAmount)}</strong>
          </div>
        </div>

        <div className="quote-stat-card">
          <div className="stat-icon">
            <CheckCircle size={22} />
          </div>
          <div>
            <span>{t("quotes.status.approved")}</span>
            <strong>{stats.approvedQuotes}</strong>
          </div>
        </div>

        <div className="quote-stat-card">
          <div className="stat-icon">
            <ClipboardList size={22} />
          </div>
          <div>
            <span>{t("quotes.status.draft")}</span>
            <strong>{stats.draftQuotes}</strong>
          </div>
        </div>
      </section>

      <section className="quote-panel">
        <div className="quote-toolbar">
          <div>
            <h3>{t("quotes.title")}</h3>
            <p>{t("quotes.messages.toolbarDescription")}</p>
          </div>

          <div className="quote-toolbar-actions">
            <select
              className="quote-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{t("quotes.filters.all")}</option>
              <option value="draft">{t("quotes.status.draft")}</option>
              <option value="sent">{t("quotes.status.sent")}</option>
              <option value="approved">{t("quotes.status.approved")}</option>
              <option value="rejected">{t("quotes.status.rejected")}</option>
              <option value="expired">{t("quotes.status.expired")}</option>
              <option value="converted">{t("quotes.status.converted")}</option>
            </select>

            <div className="quote-search">
              <Search size={18} />
              <input
                placeholder={t("quotes.placeholders.search")}
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
        <th>{t("quotes.title")}</th>
        <th>{t("quotes.fields.customer")}</th>
        <th>{t("quotes.fields.date")}</th>
        <th>{t("quotes.fields.validUntil")}</th>
        <th>{t("quotes.fields.subtotal")}</th>
        <th>{isDO ? taxLabel : t("quotes.tax.total")}</th>
        <th>{t("quotes.fields.total")}</th>
        <th>{t("quotes.fields.status")}</th>
        <th>{t("quotes.fields.createdBy")}</th>
        <th>{t("common.actions")}</th>
      </tr>
    </thead>

    <tbody>
      {loading ? (
        <tr>
          <td colSpan="10" className="table-empty">
            {t("quotes.messages.loading")}
          </td>
        </tr>
      ) : filteredQuotes.length === 0 ? (
        <tr>
          <td colSpan="10" className="table-empty">
            {t("quotes.messages.empty")}
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
              <td>{new Date(quote.createdAt).toLocaleDateString(locale)}</td>
              <td>
                {quote.validUntil
                  ? new Date(quote.validUntil).toLocaleDateString(locale)
                  : "-"}
              </td>
              <td>{money.format(Number(quote.subtotal || 0))}</td>
              <td>{money.format(Number(quote.tax || 0))}</td>
              <td>
                <strong>{money.format(Number(quote.total || 0))}</strong>
              </td>
              <td>
                <span className={statusClass[status] || "badge warning"}>
                  {getStatusLabel(status, t)}
                </span>
              </td>
              <td>{quote.creator?.name || t("common.system")}</td>

              <td>
                <div className="table-actions quote-actions">
                  {status !== "converted" && status !== "expired" && (
                    <>
                      <button title={t("quotes.actions.markSent")}onClick={() => handleStatus(quote, "sent")}>
                        <Send size={16} />
                      </button>

                      <button title={t("quotes.actions.approve")} onClick={() => handleStatus(quote, "approved")}>
                        <CheckCircle size={16} />
                      </button>

                      <button title={t("quotes.actions.reject")}onClick={() => handleStatus(quote, "rejected")}>
                        <XCircle size={16} />
                      </button>
                    </>
                  )}

                  <button title={t("quotes.actions.copyWhatsapp")} onClick={() => copyWhatsAppMessage(quote)}>
                    <Copy size={16} />
                  </button>

                  {status !== "converted" && (
                    <button title={t("quotes.actions.edit")} onClick={() => openEditQuote(quote)}>
                      <Pencil size={16} />
                    </button>
                  )}

                  <button title={t("quotes.actions.print")} onClick={() => handlePrint(quote)}>
                    <Printer size={16} />
                  </button>

                  {status !== "converted" && status !== "expired" && (
                    <button title={t("quotes.actions.convertToInvoice")} onClick={() => handleConvertToInvoice(quote)}>
                      <FilePlus2 size={16} />
                    </button>
                  )}

                  {status !== "converted" && (
                    <button className="danger-btn" title={t("quotes.actions.delete")} onClick={() => handleDeleteQuote(quote)}>
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

<div className="quote-mobile-list">
  {loading ? (
    <div className="quote-mobile-empty">{t("quotes.messages.loading")}</div>
  ) : filteredQuotes.length ? (
    filteredQuotes.map((quote) => {
      const status = getStatus(quote);

      return (
        <button
          type="button"
          key={quote.id}
          className="quote-mobile-card"
          onClick={() => setSelectedQuote(quote)}
        >
          <div className="quote-mobile-top">
            <div>
              <span>{t("quotes.fields.quote")}</span>
              <strong>{quote.quoteNumber}</strong>
            </div>

            <span className={statusClass[status] || "badge warning"}>
              {getStatusLabel(status, t)}
            </span>
          </div>

          <div className="quote-mobile-client">
            <span>{t("quotes.fields.customer")}</span>
            <strong>{quote.customerName || t("quotes.messages.noCustomer")}</strong>
          </div>

          <div className="quote-mobile-money-grid">
            <div>
              <span>{t("quotes.fields.subtotal")}</span>
              <strong>{money.format(Number(quote.subtotal || 0))}</strong>
            </div>

            <div>
              <span>{t("quotes.fields.total")}</span>
              <strong>{money.format(Number(quote.total || 0))}</strong>
            </div>
          </div>

          <div className="quote-mobile-footer">
            <span>
              {t("quotes.fields.validUntil")}{" "}
              {quote.validUntil
                ? new Date(quote.validUntil).toLocaleDateString(locale)
                : "-"}
            </span>
            <strong>{t("quotes.actions.viewDetail")}</strong>
          </div>
        </button>
      );
    })
  ) : (
    <div className="quote-mobile-empty">{t("quotes.messages.empty")}</div>
  )}
</div>

{selectedQuote && (
  <div className="quote-detail-overlay" onClick={() => setSelectedQuote(null)}>
    <div className="quote-detail-modal" onClick={(e) => e.stopPropagation()}>
      <div className="quote-detail-header">
        <div>
          <span>{t("quotes.detail.title")}</span>
          <h3>{selectedQuote.quoteNumber}</h3>
        </div>

        <button type="button" onClick={() => setSelectedQuote(null)}>
          <X size={20} />
        </button>
      </div>

      <div className="quote-detail-status">
        <span className={statusClass[getStatus(selectedQuote)] || "badge warning"}>
          {getStatusLabel(getStatus(selectedQuote), t)}
        </span>
      </div>

      <div className="quote-detail-list">
        <div>
          <span>{t("quotes.fields.customer")}</span>
          <strong>{selectedQuote.customerName || t("quotes.messages.noCustomer")}</strong>
        </div>

        <div>
          <span>{t("quotes.fields.date")}</span>
          <strong>{new Date(selectedQuote.createdAt).toLocaleDateString(locale)}</strong>
        </div>

        <div>
          <span>{t("quotes.fields.validUntil")}</span>
          <strong>
            {selectedQuote.validUntil
              ? new Date(selectedQuote.validUntil).toLocaleDateString(locale)
              : "-"}
          </strong>
        </div>

        <div>
          <span>{t("quotes.fields.subtotal")}</span>
          <strong>{money.format(Number(selectedQuote.subtotal || 0))}</strong>
        </div>

        {isDO ? (
  <div>
    <span>{taxLabel}</span>
    <strong>{money.format(Number(selectedQuote.tax || 0))}</strong>
  </div>
) : (
  <>
    <div>
      <span>{t("quotes.tax.state")}</span>
      <strong>
        {money.format(
          getTaxAmount(
            usTaxBreakdown.stateRate,
            Number(selectedQuote.subtotal || 0)
          )
        )}
      </strong>
    </div>

    <div>
      <span>{t("quotes.tax.county")}</span>
      <strong>
        {money.format(
          getTaxAmount(
            usTaxBreakdown.countyRate,
            Number(selectedQuote.subtotal || 0)
          )
        )}
      </strong>
    </div>

    <div>
      <span>{t("quotes.tax.city")}</span>
      <strong>
        {money.format(
          getTaxAmount(
            usTaxBreakdown.cityRate,
            Number(selectedQuote.subtotal || 0)
          )
        )}
      </strong>
    </div>

    <div>
      <span>{t("quotes.tax.total")}</span>
      <strong>{money.format(Number(selectedQuote.tax || 0))}</strong>
    </div>
  </>
)}

        <div>
          <span>{t("quotes.fields.total")}</span>
          <strong>{money.format(Number(selectedQuote.total || 0))}</strong>
        </div>

        <div>
          <span>{t("quotes.fields.createdBy")}</span>
          <strong>{selectedQuote.creator?.name || t("quotes.messages.system")}</strong>
        </div>
      </div>

      <div className="quote-detail-actions">
        {getStatus(selectedQuote) !== "converted" &&
          getStatus(selectedQuote) !== "expired" && (
            <>
              <button type="button" className="quote-action-btn" onClick={() => handleStatus(selectedQuote, "sent")}>
                <Send size={16} />
                {t("quotes.actions.markSent")}
              </button>

              <button type="button" className="quote-action-btn" onClick={() => handleStatus(selectedQuote, "approved")}>
                <CheckCircle size={16} />
                {t("quotes.actions.approve")}
              </button>

              <button type="button" className="quote-action-btn" onClick={() => handleStatus(selectedQuote, "rejected")}>
                <XCircle size={16} />
                {t("quotes.actions.reject")}
              </button>
            </>
          )}

        <button type="button" className="quote-action-btn" onClick={() => copyWhatsAppMessage(selectedQuote)}>
          <Copy size={16} />
          {t("quotes.actions.copyWhatsapp")}
        </button>

        {getStatus(selectedQuote) !== "converted" && (
          <button
            type="button"
            className="quote-action-btn"
            onClick={() => {
              openEditQuote(selectedQuote);
              setSelectedQuote(null);
            }}
          >
            <Pencil size={16} />
            {t("quotes.actions.edit")}
          </button>
        )}

        <button type="button" className="quote-action-btn" onClick={() => handlePrint(selectedQuote)}>
          <Printer size={16} />
          {t("quotes.actions.print")}
        </button>

        {getStatus(selectedQuote) !== "converted" &&
          getStatus(selectedQuote) !== "expired" && (
            <button
              type="button"
              className="quote-action-btn quote-primary-action"
              onClick={() => {
                handleConvertToInvoice(selectedQuote);
                setSelectedQuote(null);
              }}
            >
              <FilePlus2 size={16} />
              {t("quotes.actions.convertToInvoice")}
            </button>
          )}

        {getStatus(selectedQuote) !== "converted" && (
          <button
            type="button"
            className="quote-danger-action"
            onClick={() => {
              handleDeleteQuote(selectedQuote);
              setSelectedQuote(null);
            }}
          >
            <Trash2 size={16} />
            {t("quotes.actions.delete")}
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
                <span>{t("quotes.actions.newQuote")}</span>
                <h3>{t("quotes.actions.createQuote")}</h3>
              </div>

              <button onClick={closeModal} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveQuote} className="quote-form">
              <div className="quote-form-grid">
  <div className="form-row">
    <label>{t("quotes.fields.customer")} *</label>

    <input
      name="customerName"
      list="quote-customers"
      value={quoteForm.customerName}
      onChange={handleQuoteChange}
      placeholder={t("quotes.placeholders.customerName")}
    />

    <datalist id="quote-customers">
      {customers.map((customer) => (
        <option key={customer.id} value={customer.name} />
      ))}
    </datalist>
  </div>

  {isDO && (
    <div className="form-row">
      <label>{t("quotes.fields.rnc")}</label>

      <input
        name="customerRnc"
        value={quoteForm.customerRnc}
        onChange={handleQuoteChange}
        placeholder={t("quotes.placeholders.rnc")}
      />
    </div>
  )}

  <div className="form-row">
    <label>{t("quotes.fields.phone")}</label>

    <input
      name="customerPhone"
      value={quoteForm.customerPhone}
      onChange={handleQuoteChange}
      placeholder={t("quotes.placeholders.phone")}
    />
  </div>

  <div className="form-row">
    <label>{t("quotes.fields.email")}</label>

    <input
      name="customerEmail"
      value={quoteForm.customerEmail}
      onChange={handleQuoteChange}
      placeholder={t("quotes.placeholders.email")}
    />
  </div>

  <div className="form-row">
    <label>{t("quotes.fields.validUntil")}</label>

    <input
      name="validUntil"
      type="date"
      min={todayString}
      value={quoteForm.validUntil}
      onChange={handleQuoteChange}
    />
  </div>

  <div className="form-row">
    <label>{t("quotes.fields.status")}</label>

    <select
      name="status"
      value={quoteForm.status}
      onChange={handleQuoteChange}
    >
      <option value="draft">{t("quotes.status.draft")}</option>
      <option value="sent">{t("quotes.status.sent")}</option>
      <option value="approved">{t("quotes.status.approved")}</option>
      <option value="rejected">{t("quotes.status.rejected")}</option>
    </select>
  </div>
</div>

              <div className="quote-items-box">
                <div className="items-header">
                  <div>
                    <h4>{t("quotes.items.title")}</h4>
                    <p>{t("quotes.messages.productsDescription")}</p>
                  </div>

                  <button type="button" onClick={addEmptyItem}>
                    <Plus size={17} />
                    {t("quotes.actions.addLine")}
                  </button>
                </div>

                {items.length === 0 ? (
  <div className="items-empty">
    {t("quotes.messages.noProducts")}
  </div>
) : (
  <>
    <div className="quote-items-list">
      {items.map((item, index) => {
        const gross = Number(item.quantity || 0) * Number(item.price || 0);
        const discount = Math.min(Math.max(Number(item.discount || 0), 0), 100);
        const subtotal = Math.max(gross - gross * (discount / 100), 0);
        const tax =
          item.isTaxable === false
            ? 0
            : subtotal * (taxRate / 100);
        const total = subtotal + tax;

        return (
          <div className="quote-item-row" key={index}>
  <div>
    <small>{t("quotes.items.productService")}</small>

    <input
      type="text"
      list={`quote-products-${index}`}
      value={item.productName || ""}
      onChange={(e) => {
        const value = e.target.value;

        const selectedProduct = products.find(
          (product) =>
            product.name.trim().toLowerCase() ===
            value.trim().toLowerCase()
        );

        if (selectedProduct) {
          handleItemChange(index, "productId", selectedProduct.id);
        } else {
          const copy = [...items];

          copy[index] = {
            ...copy[index],
            productId: "",
            productName: value,
          };

          setItems(copy);
        }
      }}
      placeholder={t("quotes.placeholders.product")}
    />

    <datalist id={`quote-products-${index}`}>
      {products.map((product) => (
        <option key={product.id} value={product.name} />
      ))}
    </datalist>
  </div>

  <div>
    <small>{t("quotes.fields.quantity")}</small>

    <input
      type="number"
      min="1"
      value={item.quantity}
      onChange={(e) =>
        handleItemChange(index, "quantity", e.target.value)
      }
      placeholder={t("quotes.fields.quantity")}
    />
  </div>

  <div>
    <small>{t("quotes.fields.price")}</small>

    <input
      type="number"
      step="0.01"
      value={item.price}
      onChange={(e) =>
        handleItemChange(index, "price", e.target.value)
      }
      placeholder={t("quotes.fields.price")}
    />
  </div>

  <div>
    <small>{t("quotes.fields.discount")} %</small>

    <input
      type="number"
      step="0.01"
      min="0"
      max="100"
      value={item.discount}
      onChange={(e) =>
        handleItemChange(index, "discount", e.target.value)
      }
      placeholder={`${t("quotes.fields.discount")} %`}
    />
  </div>

  <div>
    <small>{taxLabel}</small>

    <select
      value={item.isTaxable === false ? "false" : "true"}
      onChange={(e) =>
        handleItemChange(index, "isTaxable", e.target.value)
      }
    >
      <option value="true">
        {t("quotes.tax.with", { taxLabel })}
      </option>

      <option value="false">
        {t("quotes.tax.without", { taxLabel })}
      </option>
    </select>
  </div>

  <div>
    <small>{t("quotes.fields.total")}</small>
    <strong>{money.format(total)}</strong>
  </div>

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

    <div className="quote-mobile-items">
      {items.map((item, index) => {
        const gross = Number(item.quantity || 0) * Number(item.price || 0);
        const discount = Math.min(Math.max(Number(item.discount || 0), 0), 100);
        const subtotal = Math.max(gross - gross * (discount / 100), 0);
        const tax =
            item.isTaxable === false
              ? 0
              : subtotal * (taxRate / 100);
        const total = subtotal + tax;

        return (
          <div className="quote-mobile-item-card" key={index}>
            <div className="quote-mobile-item-head">
              <h4>{t("quotes.fields.product")} #{index + 1}</h4>

              <button type="button" onClick={() => removeItem(index)}>
                <Trash2 size={16} />
              </button>
            </div>

            <div className="quote-mobile-item-grid">
              <label>
            {t("quotes.items.productService")}

  <input
    type="text"
    list={`quote-products-mobile-${index}`}
    value={item.productName || ""}
    onChange={(e) => {
      const value = e.target.value;

      const selectedProduct = products.find(
        (product) =>
          product.name.trim().toLowerCase() ===
          value.trim().toLowerCase()
      );

      if (selectedProduct) {
        handleItemChange(index, "productId", selectedProduct.id);
      } else {
        const copy = [...items];

        copy[index] = {
          ...copy[index],
          productId: "",
          productName: value,
        };

        setItems(copy);
      }
    }}
    placeholder={t("quotes.placeholders.product")}
  />

  <datalist id={`quote-products-mobile-${index}`}>
    {products.map((product) => (
      <option key={product.id} value={product.name} />
    ))}
  </datalist>
</label>
              <div className="quote-mobile-item-row-2">
                <label>
                  {t("quotes.fields.quantity")}
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                  />
                </label>

                <label>
                  {t("quotes.fields.price")}
                  <input
                    type="number"
                    step="0.01"
                    value={item.price}
                    onChange={(e) => handleItemChange(index, "price", e.target.value)}
                  />
                </label>
              </div>

              <div className="quote-mobile-item-row-2">
                <label>
                  {t("quotes.fields.discount")} %
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={item.discount}
                    onChange={(e) => handleItemChange(index, "discount", e.target.value)}
                  />
                </label>

                <label>
                  {taxLabel}
                  <select
                    value={item.isTaxable === false ? "false" : "true"}
                    onChange={(e) => handleItemChange(index, "isTaxable", e.target.value)}
                  >
                    <option value="true">
                      {t("quotes.tax.with", { taxLabel })}
                    </option>

                    <option value="false">
                      {t("quotes.tax.without", { taxLabel })}
                    </option>
                  </select>
                </label>
              </div>
            </div>

            <div className="quote-mobile-item-total">
              <p>
                <span>{t("quotes.fields.subtotal")}</span>
                <strong>{money.format(subtotal)}</strong>
              </p>

              <p>
                <span>{taxLabel}</span>
                <strong>{money.format(tax)}</strong>
              </p>

              <p className="big">
                <span>{t("quotes.fields.total")}</span>
                <strong>{money.format(total)}</strong>
              </p>
            </div>
          </div>
        );
      })}
    </div>
  </>
)}
              </div>

              <div className="form-row full quote-notes">
                <label>{t("quotes.fields.notes")}</label>
                <textarea
                  name="notes"
                  value={quoteForm.notes}
                  onChange={handleQuoteChange}
                  placeholder={t("quotes.placeholders.notes")}
                />
              </div>

              <div className="quote-summary">
  <div>
    <span>{t("quotes.fields.subtotal")}</span>
    <strong>{money.format(totals.subtotal)}</strong>
  </div>

  {isDO ? (
    <div>
      <span>{taxLabel} ({taxRate}%)</span>
      <strong>{money.format(totals.tax)}</strong>
    </div>
  ) : (
    <>
      <div>
        <span>{t("quotes.tax.state")} ({usTaxBreakdown.stateRate}%)</span>
        <strong>{money.format(getTaxAmount(usTaxBreakdown.stateRate, totals.subtotal))}</strong>
      </div>

      <div>
        <span>{t("quotes.tax.county")} ({usTaxBreakdown.countyRate}%)</span>
        <strong>{money.format(getTaxAmount(usTaxBreakdown.countyRate, totals.subtotal))}</strong>
      </div>

      <div>
        <span>{t("quotes.tax.city")} ({usTaxBreakdown.cityRate}%)</span>
        <strong>{money.format(getTaxAmount(usTaxBreakdown.cityRate, totals.subtotal))}</strong>
      </div>

      <div>
        <span>{t("quotes.tax.total")} ({taxRate}%)</span>
        <strong>{money.format(totals.tax)}</strong>
      </div>
    </>
  )}

  <div className="summary-total">
    <span>{t("quotes.fields.total")}</span>
    <strong>{money.format(totals.total)}</strong>
  </div>
</div>

              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="cancel-btn">
                  {t("quotes.actions.cancel")}
                </button>

                <button disabled={saving} className="primary-btn">
                  {saving ? t("quotes.actions.saving") : t("quotes.actions.saveQuote")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}