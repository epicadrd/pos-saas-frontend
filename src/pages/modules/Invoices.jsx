import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Ban,
  ChevronDown,
  FileText,
  Mail,
  MoreVertical,
  Phone,
  Plus,
  Printer,
  Save,
  Settings,
  Trash2,
  X,
  BarChart,
} from "lucide-react";
import { api } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { useSearchParams } from "react-router-dom";
import { useConfirm } from "../../components/ConfirmProvider";
import QRCode from "qrcode";



const emptyForm = {
  customerName: "",
  customerRnc: "",
  customerPhone: "",
  customerEmail: "",
  invoiceType: "consumer_final",
  status: "draft",
  amountPaid: "",
  terms: "Pago en 30 días",
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  notes: "",
};

export default function Invoices() {
  
  const { confirm } = useConfirm();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { tenant, setTenant } = useAuth();

  const invoiceColor = tenant?.primaryColor || "#00bfae";
  const invoiceLogo = tenant?.logoDataUrl || "";

  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  const [newCustomer, setNewCustomer] = useState({
    name: "",
    rnc: "",
    phone: "",
    email: "",
    address: "",
  });

  const [view, setView] = useState("list");
  const [activeTab, setActiveTab] = useState("edit");
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [editingInvoiceNumber, setEditingInvoiceNumber] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState([]);

  const [saving, setSaving] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef(null);
  const actionsMenuRef = useRef(null);

  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    businessName: "",
    email: "",
    address: "",
    rnc: "",
    phone: "",
  });

  const money = new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  });

  const taxEnabled = tenant?.invoiceTaxEnabled !== false;
  const taxMode = tenant?.invoiceTaxMode || "global";
  const taxRate = Number(tenant?.invoiceTaxRate || 18);

  const invoiceTypeLabels = {
  consumer_final: "FACTURA PARA CONSUMIDOR FINAL",
  credit_fiscal: "FACTURA DE CRÉDITO FISCAL",
  };

  const getInvoiceTypeLabel = (type) => {
    return invoiceTypeLabels[type] || invoiceTypeLabels.consumer_final;
  };

  const getInvoiceQrTarget = (invoice) => {
    if (invoice?.dgiiQrUrl) return invoice.dgiiQrUrl;

    return `${window.location.origin}/public/invoice/${invoice.invoiceNumber}`;
  };

  const invoiceNumberPreview =
    editingInvoiceNumber || `FAC-${Date.now().toString().slice(-8)}`;

  const filteredCustomers = customers.filter((customer) => {
    const search = form.customerName.toLowerCase().trim();

    if (!search) return true;

    return (
      customer.name?.toLowerCase().includes(search) ||
      customer.rnc?.toLowerCase().includes(search) ||
      customer.phone?.toLowerCase().includes(search)
    );
  });

  const totals = useMemo(() => {
    const subtotal = items.reduce((acc, item) => {
      const lineSubtotal = Math.max(
        Number(item.quantity || 0) * Number(item.price || 0) -
          Number(item.discount || 0),
        0
      );

      return acc + lineSubtotal;
    }, 0);

    const tax = items.reduce((acc, item) => {
      const lineSubtotal = Math.max(
        Number(item.quantity || 0) * Number(item.price || 0) -
          Number(item.discount || 0),
        0
      );

      const isTaxable =
        taxEnabled && (taxMode === "global" ? true : item.isTaxable !== false);

      return acc + (isTaxable ? lineSubtotal * (taxRate / 100) : 0);
    }, 0);

    const total = Math.round((subtotal + tax + Number.EPSILON) * 100) / 100;
    const paid = form.status === "paid" ? total : Number(form.amountPaid || 0);
    const balance = total - paid;

    return {
    subtotal: Math.round((subtotal + Number.EPSILON) * 100) / 100, tax: Math.round((tax + Number.EPSILON) * 100) / 100, total, paid, balance: Math.round((balance + Number.EPSILON) * 100) / 100,};
    }, [items, form.amountPaid, form.status, taxEnabled, taxMode, taxRate]);

  useEffect(() => {
  loadData();
}, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const invoiceRes = await api.get("/invoices");
      setInvoices(Array.isArray(invoiceRes.data) ? invoiceRes.data : []);

      try {
        const productRes = await api.get("/products?status=active&type=all");
        setProducts(Array.isArray(productRes.data) ? productRes.data : []);
      } catch (error) {
        console.error("Error cargando productos:", error);
        setProducts([]);
      }

      try {
        const customerRes = await api.get("/customers");
        setCustomers(Array.isArray(customerRes.data) ? customerRes.data : []);
      } catch (error) {
        console.error("Error cargando clientes:", error);
        setCustomers([]);
      }
    } catch (error) {
      console.error("Error cargando facturas:", error);
      alert(error.response?.data?.message || "Error cargando facturas");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  if (searchParams.get("nueva") === "1") {
    resetInvoiceForm();
    setView("create");
  }
}, [searchParams]);

  useEffect(() => {
    if (tenant) {
      setCompanyForm({
        businessName: tenant.businessName || "",
        email: tenant.email || "",
        address: tenant.address || "",
        rnc: tenant.rnc || "",
        phone: tenant.phone || "",
      });
    }
  }, [tenant]);

  useEffect(() => {
  const handleClickOutside = (event) => {
    if (
      adminMenuRef.current &&
      !adminMenuRef.current.contains(event.target)
    ) {
      setAdminMenuOpen(false);
    }

    if (
      actionsMenuRef.current &&
      !actionsMenuRef.current.contains(event.target)
    ) {
      setActionsOpen(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);

  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, []);

  const resetInvoiceForm = () => {
    setForm(emptyForm);
    setItems([]);
    setEditingInvoiceId(null);
    setEditingInvoiceNumber(null);
    setActiveTab("edit");
    setActionsOpen(false);
    setAdminMenuOpen(false);
  };

  const addLine = () => {
    setItems([
      ...items,
      {
        productId: "",
        description: "",
        quantity: 1,
        unit: "UND",
        price: 0,
        discount: 0,
        isTaxable: tenant?.invoiceTaxEnabled !== false,
        taxRate: Number(tenant?.invoiceTaxRate || 18),
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
        description: product?.description || product?.name || "",
        quantity: 1,
        unit: product?.unit || "UND",
        price: Number(product?.salePrice || product?.price || 0),
        discount: 0,
        isTaxable: tenant?.invoiceTaxEnabled !== false,
        taxRate: Number(tenant?.invoiceTaxRate || 18),
      };
    } else {
      copy[index][field] = value;
    }

    setItems(copy);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const selectCustomer = (customerId) => {
    if (customerId === "new") {
      setCustomerModalOpen(true);
      return;
    }

    const customer = customers.find((c) => String(c.id) === String(customerId));
    if (!customer) return;

    setForm({
      ...form,
      customerName: customer.name || "",
      customerRnc: customer.rnc || "",
      customerPhone: customer.phone || "",
      customerEmail: customer.email || "",
    });
  };

  const saveCustomer = async () => {
    if (!newCustomer.name.trim()) {
      alert("El nombre del cliente es obligatorio");
      return;
    }

    try {
      const { data } = await api.post("/customers", newCustomer);
      await loadData();

      setForm({
        ...form,
        customerName: data.customer?.name || "",
        customerRnc: data.customer?.rnc || "",
        customerPhone: data.customer?.phone || "",
        customerEmail: data.customer?.email || "",
      });

      setNewCustomer({
        name: "",
        rnc: "",
        phone: "",
        email: "",
        address: "",
      });

      setCustomerModalOpen(false);
    } catch (error) {
      alert(error.response?.data?.message || "Error creando cliente");
    }
  };

  const hasStockError = items.some((item) => {
    const product = products.find((p) => String(p.id) === String(item.productId));
    if (!product) return false;

    const isService =
      product.productType === "service" || product.trackStock === false;

    if (isService) return false;

    return Number(item.quantity || 0) > Number(product.stock || 0);
  });

  const saveInvoice = async (status = "issued") => {
    if (!form.customerName.trim()) {
      alert("Debes seleccionar o escribir un cliente.");
      return;
    }

    const cleanItems = items
      .filter((item) => item.productId && Number(item.quantity) > 0)
      .map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        price: Number(item.price),
        discount: Number(item.discount || 0),
        description: item.description || "",
        isTaxable: item.isTaxable !== false,
      }));

    if (!cleanItems.length) {
      alert("Agrega al menos un producto o servicio.");
      return;
    }

    if (status !== "draft" && hasStockError) {
      alert("Hay productos con stock insuficiente.");
      return;
    }

    try {
      setSaving(true);

      if (editingInvoiceId && status === "draft") {
        await api.put(`/invoices/${editingInvoiceId}/draft`, {
          customerName: form.customerName,
          customerRnc: form.customerRnc,
          customerPhone: form.customerPhone,
          customerEmail: form.customerEmail,
          invoiceType: form.invoiceType,
          invoiceDate: form.invoiceDate || null,
          dueDate: form.dueDate || null,
          terms: form.terms,
          notes: form.notes,
          items: cleanItems,
        });
      } else {
       const { data } = await api.post("/invoices", {
          customerName: form.customerName,
          customerRnc: form.customerRnc,
          customerPhone: form.customerPhone,
          customerEmail: form.customerEmail,
          invoiceType: form.invoiceType,
          invoiceDate: form.invoiceDate || null,
          dueDate: form.dueDate || null,
          terms: form.terms,
          notes: form.notes,
          status,
          amountPaid:
            status === "paid" ? totals.total : Number(form.amountPaid || 0),
          items: cleanItems,
        });

        if (status !== "draft") {
          handlePrintInvoice({
            ...data.invoice,
            items: cleanItems.map((item) => {
              const product = products.find(
                (p) => String(p.id) === String(item.productId)
              );

              return {
                ...item,
                product,
                unitPrice: item.price,
              };
            }),
          });
        }
      }

      await loadData();
      resetInvoiceForm();
      setView("create");
      addLine();
    } catch (error) {
      alert(error.response?.data?.message || "Error guardando factura");
    } finally {
      setSaving(false);
    }
  };

  const cancelInvoice = async (invoice) => {
    const ok = await confirm({
      title: "Anular factura",
      message: `¿Anular ${invoice.invoiceNumber}? Esto devolverá el inventario.`,
      confirmText: "Anular",
      variant: "danger",
    });

    if (!ok) return;

    try {
      await api.patch(`/invoices/${invoice.id}/cancel`);
      await loadData();
    } catch (error) {
      alert(error.response?.data?.message || "Error anulando factura");
    }
  };

  const loadDraft = (invoice) => {
    setActiveTab("edit");
    setEditingInvoiceId(invoice.id);
    setEditingInvoiceNumber(invoice.invoiceNumber);
    

    setForm({
      ...emptyForm,
      customerName: invoice.customerName || "",
      customerRnc: invoice.customerRnc || "",
      customerPhone: invoice.customerPhone || "",
      customerEmail: invoice.customerEmail || "",
      invoiceType: invoice.invoiceType || "consumer_final",
      amountPaid: invoice.amountPaid || "",
      invoiceDate: invoice.invoiceDate || new Date().toISOString().slice(0, 10),
      dueDate: invoice.dueDate || "",
      terms: invoice.terms || "Pago en 30 días",
      notes: invoice.notes || "",
    });

    setItems(
      (invoice.items || []).map((item) => ({
        productId: item.productId,
        description: item.description || "",
        quantity: item.quantity,
        price: Number(item.unitPrice ?? item.price ?? 0),
        discount: item.discount || 0,
        unit: item.unit || "UND",
        isTaxable: item.isTaxable !== false,
        taxRate: Number(item.taxRate || tenant?.invoiceTaxRate || 18),
      }))
    );
  };

  const deleteDraft = async (invoice) => {
    const ok = await confirm({
      title: "Eliminar borrador",
      message: "¿Eliminar este borrador? Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      variant: "danger",
    });

    if (!ok) return;

    try {
      await api.delete(`/invoices/${invoice.id}`);
      await loadData();

      if (editingInvoiceId === invoice.id) {
        resetInvoiceForm();
      }
    } catch (error) {
      alert(error.response?.data?.message || "Error eliminando borrador");
    }
  };

  const issueDraft = async (invoice) => {
    const ok = await confirm({
      title: "Emitir factura",
      message: `¿Emitir el borrador ${invoice.invoiceNumber}?`,
      confirmText: "Emitir",
      variant: "success",
    });

    if (!ok) return;

    try {
      await api.patch(`/invoices/${invoice.id}/issue`, {
        amountPaid: 0,
      });

      await loadData();

      if (editingInvoiceId === invoice.id) {
        resetInvoiceForm();
        setView("list");
      }
    } catch (error) {
      alert(error.response?.data?.message || "Error emitiendo borrador");
    }
  };

  const getInvoiceLineValues = (item) => {
    const quantity = Number(item.quantity || 0);
    const price = Number(item.unitPrice || item.price || 0);
    const discount = Number(item.discount || 0);

    const lineSubtotal = Math.max(quantity * price - discount, 0);

    const isTaxable =
      taxEnabled && (taxMode === "global" ? true : item.isTaxable !== false);

    const lineTax = isTaxable ? lineSubtotal * (taxRate / 100) : 0;
    const lineTotal = lineSubtotal + lineTax;

    return {
      quantity,
      price,
      discount,
      lineSubtotal,
      isTaxable,
      lineTax,
      lineTotal,
    };
  };

const buildInvoiceQrValue = (invoice) => {
  return getInvoiceQrTarget(invoice);
};



  const handlePrintInvoice = async (invoice) => {
    const invoiceItems = invoice.items || [];
    const qrDataUrl = await QRCode.toDataURL(buildInvoiceQrValue(invoice), {
      width: 150,
      margin: 1,
    });

    const html = `
      <html>
        <head>
          <title>Factura ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #111827; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid ${invoiceColor}; padding-bottom: 20px; margin-bottom: 30px; }
            h1 { margin: 0; color: ${invoiceColor}; }
            table { width: 100%; border-collapse: collapse; margin-top: 25px; }
            th, td { border-bottom: 1px solid #e5e7eb; padding: 12px; text-align: left; font-size: 14px; }
            th { background: #f8fafc; }
            .box { background: #f8fafc; padding: 18px; border-radius: 12px; margin-bottom: 20px; }
            .totals { margin-left: auto; width: 320px; margin-top: 25px; }
            .totals div { display: flex; justify-content: space-between; padding: 8px 0; }
            .total { font-size: 20px; font-weight: bold; border-top: 2px solid #111827; margin-top: 10px; padding-top: 12px; }
            .qr-section { margin-top: 35px; text-align: center; }
            .qr-section img { width: 130px; height: 130px; }
            .qr-section p { margin: 8px 0 0; font-size: 12px; color: #374151; }
          </style>
        </head>

        <body>
          <div class="header">
            <div>
              ${
                invoiceLogo
                  ? `<img src="${invoiceLogo}" style="max-width:120px; max-height:80px; object-fit:contain; margin-bottom:12px;" />`
                  : ""
              }
              <h1>${getInvoiceTypeLabel(invoice.invoiceType)}</h1>
              <p>${invoice.invoiceNumber}</p>
            </div>

            <div>
              <strong>${tenant?.businessName || "Mi empresa"}</strong><br/>
              ${tenant?.address || ""}<br/>
              RNC/Cédula: ${tenant?.rnc || "-"}<br/>
              ${tenant?.email || ""}<br/>
              ${tenant?.phone || ""}
            </div>
          </div>

          <div class="box">
            <strong>Cliente:</strong> ${invoice.customerName || "-"}<br/>
            <strong>RNC/Cédula:</strong> ${invoice.customerRnc || "-"}<br/>
            <strong>Teléfono:</strong> ${invoice.customerPhone || "-"}<br/>
            <strong>Email:</strong> ${invoice.customerEmail || "-"}<br/><br/>

            <strong>Fecha de factura:</strong> ${invoice.invoiceDate || "-"}<br/>
            <strong>Fecha de vencimiento:</strong> ${invoice.dueDate || "-"}
          </div>

          <table>
            <thead>
              <tr>
                <th>Producto/Servicio</th>
                <th>Cantidad</th>
                <th>Precio</th>
                <th>Descuento</th>
                <th>Subtotal</th>
                ${taxMode === "line" ? "<th>ITBIS</th>" : ""}
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              ${
                invoiceItems.length
                 
                  ? invoiceItems
                      .map((item) => {
                        const values = getInvoiceLineValues(item);

                        return `
                          <tr>
                            <td>${item.description || item.product?.name || "-"}</td>
                            <td>${values.quantity}</td>
                            <td>${money.format(values.price)}</td>
                            <td>${money.format(values.discount)}</td>
                            <td>${money.format(values.lineSubtotal)}</td>
                            ${
                              taxMode === "line"
                                ? `<td>${values.isTaxable ? money.format(values.lineTax) : "-"}</td>`
                                : ""
                            }
                            <td>${money.format(values.lineTotal)}</td>
                          </tr>
                        `;
                      })
                      .join("")
                  : `
                    <tr>
                      <td colspan="${taxMode === "line" ? 7 : 6}">
                        No hay productos registrados en esta factura.
                      </td>
                    </tr>
                  `
              }
            </tbody>
          </table>

          <div class="totals">
            <div><span>Subtotal</span><strong>${money.format(Number(invoice.subtotal || 0))}</strong></div>
            <div><span>ITBIS (${taxRate}%)</span><strong>${money.format(Number(invoice.tax || 0))}</strong></div>
            <div class="total"><span>Total</span><strong>${money.format(Number(invoice.total || 0))}</strong></div>
            <div><span>Pagado</span><strong>${money.format(Number(invoice.amountPaid || 0))}</strong></div>
            <div><span>Pendiente</span><strong>${money.format(Number(invoice.balance || 0))}</strong></div>
          </div>

          <div class="qr-section">
            <img src="${qrDataUrl}" alt="Código QR de la factura" />
            <p>Escanee para consultar esta factura</p>
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

  const handlePrintDraft = async () => {
  const qrDataUrl = await QRCode.toDataURL(
    `${window.location.origin}/public/invoice/${invoiceNumberPreview}`,
    {
      width: 150,
      margin: 1,
    }
  );  
 
    const html = `
      <html>
        <head>
          <title>Factura ${invoiceNumberPreview}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #111827; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid ${invoiceColor}; padding-bottom: 20px; margin-bottom: 30px; }
            h1 { margin: 0; color: ${invoiceColor}; }
            table { width: 100%; border-collapse: collapse; margin-top: 25px; }
            th, td { border-bottom: 1px solid #e5e7eb; padding: 12px; text-align: left; font-size: 14px; }
            th { background: #f8fafc; }
            .box { background: #f8fafc; padding: 18px; border-radius: 12px; margin-bottom: 20px; }
            .totals { margin-left: auto; width: 320px; margin-top: 25px; }
            .totals div { display: flex; justify-content: space-between; padding: 8px 0; }
            .total { font-size: 20px; font-weight: bold; border-top: 2px solid #111827; margin-top: 10px; padding-top: 12px; }
            .qr-section { margin-top: 35px; text-align: center; }
            .qr-section img { width: 130px; height: 130px; }
            .qr-section p { margin: 8px 0 0; font-size: 12px; color: #374151; }
          </style>
        </head>

        <body>
          <div class="header">
            <div>
              ${
                invoiceLogo
                  ? `<img src="${invoiceLogo}" style="max-width:120px; max-height:80px; object-fit:contain; margin-bottom:12px;" />`
                  : ""
              }
              <h1>${getInvoiceTypeLabel(form.invoiceType)}</h1>
              <p>${invoiceNumberPreview}</p>
            </div>

            <div>
              <strong>${tenant?.businessName || "Mi empresa"}</strong><br/>
              ${tenant?.address || ""}<br/>
              RNC/Cédula: ${tenant?.rnc || "-"}<br/>
              ${tenant?.email || ""}<br/>
              ${tenant?.phone || ""}
            </div>
          </div>

          <div class="box">
            <strong>Cliente:</strong> ${form.customerName || "-"}<br/>
            <strong>RNC/Cédula:</strong> ${form.customerRnc || "-"}<br/>
            <strong>Teléfono:</strong> ${form.customerPhone || "-"}<br/>
            <strong>Email:</strong> ${form.customerEmail || "-"}<br/><br/>

            <strong>Fecha de factura:</strong> ${form.invoiceDate || "-"}<br/>
            <strong>Fecha de vencimiento:</strong> ${form.dueDate || "-"}
          </div>

          <table>
            <thead>
              <tr>
                <th>Producto/Servicio</th>
                <th>Cantidad</th>
                <th>Precio</th>
                <th>Descuento</th>
                <th>Subtotal</th>
                ${taxMode === "line" ? "<th>ITBIS</th>" : ""}
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              ${
                items.length
                  ? items
                      .map((item) => {
                        const product = products.find(
                          (p) => String(p.id) === String(item.productId)
                        );

                        const values = getInvoiceLineValues(item);

                        return `
                          <tr>
                            <td>${product?.name || item.description || "-"}</td>
                            <td>${values.quantity}</td>
                            <td>${money.format(values.price)}</td>
                            <td>${money.format(values.discount)}</td>
                            <td>${money.format(values.lineSubtotal)}</td>
                            ${
                              taxMode === "line"
                                ? `<td>${values.isTaxable ? money.format(values.lineTax) : "-"}</td>`
                                : ""
                            }
                            <td>${money.format(values.lineTotal)}</td>
                          </tr>
                        `;
                      })
                      .join("")
                  : `
                    <tr>
                      <td colspan="${taxMode === "line" ? 7 : 6}">
                        No hay productos registrados.
                      </td>
                    </tr>
                  `
              }
            </tbody>
          </table>

          <div class="totals">
            <div><span>Subtotal</span><strong>${money.format(totals.subtotal)}</strong></div>
            <div><span>ITBIS (${taxRate}%)</span><strong>${money.format(totals.tax)}</strong></div>
            <div class="total"><span>Total</span><strong>${money.format(totals.total)}</strong></div>
            <div><span>Pagado</span><strong>${money.format(totals.paid)}</strong></div>
            <div><span>Pendiente</span><strong>${money.format(totals.balance)}</strong></div>
          </div>

          <div class="qr-section">
            <img src="${qrDataUrl}" alt="Código QR de la factura" />
            <p>Escanee para consultar esta factura</p>
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

  const drafts = invoices.filter((invoice) => invoice.status === "draft");

  const getInvoiceStatusLabel = (status) => {
    if (status === "issued") return "Emitida";
    if (status === "draft") return "Borrador";
    if (status === "paid") return "Pagada";
    if (status === "partial") return "Parcial";
    if (status === "cancelled") return "Anulada";
    return "Sin estado";
  };

  const markAsPaid = async (invoice) => {
    const ok = await confirm({
      title: "Marcar factura como pagada",
      message: `¿Marcar ${invoice.invoiceNumber} como pagada?`,
      confirmText: "Marcar como pagada",
      variant: "success",
    });

    if (!ok) return;

    try {
      await api.patch(`/invoices/${invoice.id}/mark-paid`);
      await loadData();
    } catch (error) {
      alert(error.response?.data?.message || "Error marcando factura como pagada");
    }
  };

  const saveCompany = async () => {
    if (!companyForm.businessName.trim()) {
      alert("El nombre de la empresa es obligatorio");
      return;
    }

    try {
      const { data } = await api.patch("/auth/tenant", companyForm);

      setTenant(data.tenant);
      setCompanyModalOpen(false);

      alert("Empresa actualizada correctamente");
    } catch (error) {
      alert(error.response?.data?.message || "Error actualizando empresa");
    }
  };

  if (view === "list") {
    return (
      <div className="qb-list-page">
        <div className="qb-list-header">
          <div>
            <h1>Facturas</h1>
            <p>Gestiona tus facturas, balances e inventario facturado.</p>
          </div>

          <div className="qb-header-actions">
            <button
              className="qb-secondary-btn"
              onClick={() => navigate("/dashboard/facturacion/historial-pagos")}
            >
              <BarChart size={16} />
              Historial de pagos
            </button>

            <button
              className="qb-secondary-btn"
              onClick={() => {
                resetInvoiceForm();
                setView("create");
                setActiveTab("drafts");
              }}
            >
              <FileText size={16} />
              Borradores
            </button>

            <button
              className="qb-primary-btn"
              onClick={() => {
                resetInvoiceForm();
                setView("create");
              }}
            >
              <Plus size={18} />
              Nueva factura
            </button>
          </div>
        </div>

        <div className="qb-table-card">
          <table className="qb-table">
            <thead>
              <tr>
                <th>Factura</th>
                <th>Cliente</th>
                <th>Subtotal</th>
                <th>ITBIS</th>
                <th>Total</th>
                <th>Pagado</th>
                <th>Pendiente</th>
                <th>Estado</th>
                <th>Creada por</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className="qb-empty">
                    Cargando facturas...
                  </td>
                </tr>
              ) : invoices.length ? (
                invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.invoiceNumber}</td>
                    <td>{invoice.customerName}</td>
                    <td>{money.format(Number(invoice.subtotal || 0))}</td>
                    <td>{money.format(Number(invoice.tax || 0))}</td>
                    <td>{money.format(Number(invoice.total || 0))}</td>
                    <td>{money.format(Number(invoice.amountPaid || 0))}</td>
                    <td>{money.format(Number(invoice.balance || 0))}</td>

                    <td>
                      
                      <span className={`qb-status qb-${invoice.status}`}>
                        {getInvoiceStatusLabel(invoice.status)}
                      </span>
                    </td>
                        <td>{invoice.creator?.name || "Sistema"}</td>
                    <td>
                      <div className="qb-actions-cell">
                        <button
                          className="qb-secondary-btn"
                          onClick={() => handlePrintInvoice(invoice)}
                        >
                          <Printer size={16} />
                          Imprimir
                        </button>

                        {invoice.status !== "paid" &&
                          invoice.status !== "cancelled" &&
                          invoice.status !== "draft" && (
                            <button
                              className="qb-secondary-btn"
                              onClick={() => markAsPaid(invoice)}
                            >
                              Marcar pagada
                            </button>
                          )}

                        {invoice.status !== "cancelled" &&
                          invoice.status !== "draft" && (
                            <button
                              className="qb-icon-danger"
                              onClick={() => cancelInvoice(invoice)}
                            >
                              <Ban size={16} />
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="qb-empty">
                    No hay facturas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="qb-invoice-page">
      <div className="qb-topbar">
        <div>
          <button
            className="qb-back"
            onClick={() => {
              resetInvoiceForm();
              setView("list");
            }}
          >
            ←
          </button>

          <span>Facturación / Facturas / Nueva factura</span>

          <h1>
            Factura {invoiceNumberPreview}
            <small>{editingInvoiceId ? "Editando borrador" : "Borrador"}</small>
          </h1>
        </div>

        <div className="qb-top-actions">
          <div className="qb-actions-menu-wrap" ref={adminMenuRef}>
            <button onClick={() => setAdminMenuOpen(!adminMenuOpen)}>
              <Settings size={17} />
              Administrar
              <ChevronDown size={16} />
            </button>

            {adminMenuOpen && (
              <div className="qb-actions-menu">
                <button
                  type="button"
                  onClick={() => {
                    setAdminMenuOpen(false);
                    setCompanyModalOpen(true);
                  }}
                >
                  <Settings size={16} />
                  Editar empresa
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdminMenuOpen(false);
                    navigate("/dashboard/facturacion/personalizacion?nueva=1");
                  }}
                >
                  <Settings size={16} />
                  Personalización
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdminMenuOpen(false);
                    navigate("/dashboard/facturacion/preferencias?nueva=1");
                  }}
                >
                  <Settings size={16} />
                  Preferencias de factura
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdminMenuOpen(false);
                    navigate("/dashboard/facturacion/numeracion");
                  }}
                >
                  <Settings size={16} />
                  Numeración
                </button>

                <button type="button" disabled>
                  <Settings size={16} />
                  Comprobantes fiscales
                </button>
              </div>
            )}
          </div>

          <div className="qb-actions-menu-wrap" ref={actionsMenuRef}>
            <button onClick={() => setActionsOpen(!actionsOpen)}>
              <MoreVertical size={17} />
              Acciones
              <ChevronDown size={16} />
            </button>

            {actionsOpen && (
              <div className="qb-actions-menu">
                <button
                  type="button"
                  onClick={() => {
                    setActionsOpen(false);
                    handlePrintDraft();
                  }}
                >
                  <Printer size={16} />
                  Imprimir o descargar
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setActionsOpen(false);
                    saveInvoice("draft");
                  }}
                >
                  <Save size={16} />
                  Guardar borrador
                </button>

                <button
                  type="button"
                  disabled={saving || hasStockError}
                  onClick={() => {
                    setActionsOpen(false);
                    saveInvoice("issued");
                  }}
                >
                  <FileText size={16} />
                  Emitir factura
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              resetInvoiceForm();
              setView("list");
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="qb-tabs">
        <button
          className={activeTab === "edit" ? "active" : ""}
          onClick={() => setActiveTab("edit")}
        >
          Editar
        </button>

        <button
          className={activeTab === "drafts" ? "active" : ""}
          onClick={() => setActiveTab("drafts")}
        >
          Borradores
        </button>

        <button onClick={() => navigate("/dashboard/facturacion/historial-pagos")}>
          Historial de pagos
        </button>
      </div>

      {activeTab === "drafts" ? (
        <div className="qb-table-card">
          <table className="qb-table">
            <thead>
              <tr>
                <th>Factura</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {drafts.length ? (
                drafts.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.invoiceNumber}</td>
                    <td>{invoice.customerName}</td>
                    <td>{money.format(Number(invoice.total || 0))}</td>
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="qb-secondary-btn"
                          onClick={() => loadDraft(invoice)}
                        >
                          Editar
                        </button>

                        <button
                          className="qb-secondary-btn"
                          onClick={() => issueDraft(invoice)}
                        >
                          Emitir
                        </button>

                        <button
                          className="qb-icon-danger"
                          onClick={() => deleteDraft(invoice)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="qb-empty">
                    No hay borradores.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="qb-layout">
          <main className="qb-document">
            <section className="qb-company">
              <div>
                <h2>FACTURA</h2>
                <strong>{tenant?.businessName || "Mi empresa"}</strong>
                <p>{tenant?.address || "Dirección no configurada"}</p>
                <p>RNC/Cédula: {tenant?.rnc || "No configurado"}</p>
                <a onClick={() => setCompanyModalOpen(true)}>Editar empresa</a>
              </div>

              <div className="qb-company-contact">
                <p>
                  <Mail size={15} /> {tenant?.email || "correo@empresa.com"}
                </p>
                <p>
                  <Phone size={15} /> {tenant?.phone || "Teléfono no configurado"}
                </p>
              </div>

              <div className="qb-logo-box">
                {invoiceLogo ? (
                  <img src={invoiceLogo} alt="Logo empresa" />
                ) : (
                  <>
                    <span>Mi</span>
                    <small>EMPRESA</small>
                  </>
                )}
              </div>
            </section>

            <section className="qb-client-zone">
              <div className="qb-client-left">
                <select
                  className="qb-client-select"
                  onChange={(e) => selectCustomer(e.target.value)}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Agregar o seleccionar cliente
                  </option>

                  <option value="new">+ Agregar nuevo cliente</option>

                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>

                <div className="qb-form-grid">
                  <label className="qb-customer-search-wrap">
                    Cliente *
                    <input
                      value={form.customerName}
                      onFocus={() => setShowCustomerSuggestions(true)}
                      onChange={(e) => {
                        setForm({
                          ...form,
                          customerName: e.target.value,
                          customerRnc: "",
                          customerPhone: "",
                          customerEmail: "",
                        });
                        setShowCustomerSuggestions(true);
                      }}
                      placeholder="Buscar cliente..."
                    />

                    {showCustomerSuggestions && (
                      <div className="qb-customer-suggestions">
                        <button
                          type="button"
                          className="qb-customer-suggestion add"
                          onMouseDown={() => {
                            setShowCustomerSuggestions(false);
                            setCustomerModalOpen(true);
                          }}
                        >
                          + Agregar nuevo cliente
                        </button>

                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map((customer) => (
                            <button
                              type="button"
                              key={customer.id}
                              className="qb-customer-suggestion"
                              onMouseDown={() => {
                                selectCustomer(customer.id);
                                setShowCustomerSuggestions(false);
                              }}
                            >
                              <strong>{customer.name}</strong>
                              <span>
                                {customer.rnc || "Sin RNC"} ·{" "}
                                {customer.phone || "Sin teléfono"}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="qb-customer-empty">
                            No se encontraron clientes
                          </div>
                        )}
                      </div>
                    )}
                  </label>

                  <label>
                    RNC / Cédula
                    <input
                      value={form.customerRnc}
                      onChange={(e) =>
                        setForm({ ...form, customerRnc: e.target.value })
                      }
                      placeholder="RNC o cédula"
                    />
                  </label>

                  <label>
                    Correo electrónico
                    <input
                      value={form.customerEmail}
                      onChange={(e) =>
                        setForm({ ...form, customerEmail: e.target.value })
                      }
                      placeholder="correo@ejemplo.com"
                    />
                  </label>

                  <label>
                    Teléfono
                    <input
                      value={form.customerPhone}
                      onChange={(e) =>
                        setForm({ ...form, customerPhone: e.target.value })
                      }
                      placeholder="809-000-0000"
                    />
                  </label>
                </div>
              </div>

              <div className="qb-client-right">
                <label>
                  N.º de factura
                  <input value={invoiceNumberPreview} disabled />
                </label>

                <label>
                  Tipo de factura
                  <select
                    value={form.invoiceType}
                    onChange={(e) =>
                      setForm({ ...form, invoiceType: e.target.value })
                    }
                  >
                    <option value="consumer_final">Consumidor final</option>
                    <option value="credit_fiscal">Crédito fiscal</option>
                  </select>
                </label>

                <label>
                  Términos
                  <select
                    value={form.terms}
                    onChange={(e) => setForm({ ...form, terms: e.target.value })}
                  >
                    <option>Pago en 30 días</option>
                    <option>Pago inmediato</option>
                    <option>Pago en 15 días</option>
                  </select>
                </label>

                <label>
                  Fecha de factura
                  <input
                    type="date"
                    value={form.invoiceDate}
                    onChange={(e) =>
                      setForm({ ...form, invoiceDate: e.target.value })
                    }
                  />
                </label>

                <label>
                  Fecha de vencimiento
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm({ ...form, dueDate: e.target.value })
                    }
                  />
                </label>
              </div>
            </section>

            <section className="qb-items-card">
              <div className="qb-items-head">
                <h3>Productos y servicios</h3>
                <button onClick={addLine}>
                  <Plus size={16} />
                  Agregar línea
                </button>
              </div>

              <table className="qb-items-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Producto / Servicio</th>
                    <th>Descripción</th>
                    <th>Cantidad</th>
                    <th>Unidad</th>
                    <th>Precio</th>
                    <th>Descuento</th>
                    <th>Subtotal</th>
                    {taxMode === "line" && <th>Aplica ITBIS</th>}
                    <th>ITBIS</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {items.length ? (
                    items.map((item, index) => {
                      const product = products.find(
                        (p) => String(p.id) === String(item.productId)
                      );

                      const isService =
                        product?.productType === "service" ||
                        product?.trackStock === false;

                      const lineSubtotal = Math.max(
                        Number(item.quantity || 0) * Number(item.price || 0) -
                          Number(item.discount || 0),
                        0
                      );

                      const isTaxable =
                        taxEnabled &&
                        (taxMode === "global" ? true : item.isTaxable !== false);

                      const lineTax = isTaxable
                        ? lineSubtotal * (taxRate / 100)
                        : 0;

                      const lineTotal = lineSubtotal + lineTax;

                      const stockError =
                        product &&
                        !isService &&
                        Number(item.quantity || 0) > Number(product.stock || 0);

                      return (
                        <tr
                          key={index}
                          className={stockError ? "stock-error-row" : ""}
                        >
                          <td>{index + 1}</td>

                          <td>
                            <select
                              value={item.productId}
                              onChange={(e) =>
                                updateItem(index, "productId", e.target.value)
                              }
                            >
                              <option value="">Selecciona producto/servicio</option>

                              {products.map((product) => {
                                const service =
                                  product.productType === "service" ||
                                  product.trackStock === false;

                                return (
                                  <option key={product.id} value={product.id}>
                                    {product.name}{" "}
                                    {service
                                      ? "(Servicio)"
                                      : `(Stock: ${product.stock})`}
                                  </option>
                                );
                              })}
                            </select>

                            {product && (
                              <small className={isService ? "service-label" : ""}>
                                {isService
                                  ? "Servicio"
                                  : stockError
                                  ? `Stock insuficiente: ${product.stock}`
                                  : `Disponible: ${product.stock}`}
                              </small>
                            )}
                          </td>

                          <td>
                            <input
                              value={item.description}
                              onChange={(e) =>
                                updateItem(index, "description", e.target.value)
                              }
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(index, "quantity", e.target.value)
                              }
                            />
                          </td>

                          <td>{item.unit}</td>

                          <td>
                            <input
                              type="number"
                              value={item.price}
                              onChange={(e) =>
                                updateItem(index, "price", e.target.value)
                              }
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              value={item.discount}
                              onChange={(e) =>
                                updateItem(index, "discount", e.target.value)
                              }
                            />
                          </td>

                          <td>{money.format(lineSubtotal)}</td>

                          {taxMode === "line" && (
                            <td>
                              <select
                                value={item.isTaxable === false ? "no" : "yes"}
                                onChange={(e) =>
                                  updateItem(
                                    index,
                                    "isTaxable",
                                    e.target.value === "yes"
                                  )
                                }
                              >
                                <option value="yes">Sí</option>
                                <option value="no">No</option>
                              </select>
                            </td>
                          )}

                          <td>{money.format(lineTax)}</td>

                          <td>
                            <strong>{money.format(lineTotal)}</strong>
                          </td>

                          <td>
                            <button
                              className="qb-trash"
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={taxMode === "line" ? 12 : 11}
                        className="qb-empty"
                      >
                        Agrega productos o servicios para construir la factura.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            <section className="qb-bottom-area">
              <textarea
                placeholder="Notas adicionales para esta factura..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />

              <div className="qb-totals">
                <div className="qb-bottom-actions">
                  <button
                    type="button"
                    className="qb-secondary-btn"
                    disabled={saving}
                    onClick={() => saveInvoice("draft")}
                  >
                    <Save size={16} />
                    Guardar borrador
                  </button>

                  <button
                    type="button"
                    className="qb-primary-btn"
                    disabled={saving || hasStockError}
                    onClick={() => setPreviewModalOpen(true)}
                  >
                    <FileText size={16} />
                    Emitir factura
                  </button>
                </div>

                <p>
                  <span>Subtotal</span>
                  <strong>{money.format(totals.subtotal)}</strong>
                </p>

                <p>
                  <span>ITBIS ({taxRate}%)</span>
                  <strong>{money.format(totals.tax)}</strong>
                </p>

                <p className="big">
                  <span>Total</span>
                  <strong>{money.format(totals.total)}</strong>
                </p>

                <p className="pending">
                  <span>Pendiente</span>
                  <strong>{money.format(totals.balance)}</strong>
                </p>
              </div>
            </section>
          </main>

          
        </div>
      )}

      {customerModalOpen && (
        <div className="qb-modal-overlay">
          <div className="qb-customer-modal">
            <div className="qb-modal-head">
              <div>
                <span>Nuevo cliente</span>
                <h3>Agregar cliente</h3>
              </div>

              <button onClick={() => setCustomerModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="qb-customer-grid">
              <label>
                Nombre *
                <input
                  value={newCustomer.name}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, name: e.target.value })
                  }
                  placeholder="Nombre del cliente"
                />
              </label>

              <label>
                RNC / Cédula
                <input
                  value={newCustomer.rnc}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, rnc: e.target.value })
                  }
                  placeholder="RNC o cédula"
                />
              </label>

              <label>
                Teléfono
                <input
                  value={newCustomer.phone}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, phone: e.target.value })
                  }
                  placeholder="809-000-0000"
                />
              </label>

              <label>
                Email
                <input
                  value={newCustomer.email}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, email: e.target.value })
                  }
                  placeholder="cliente@email.com"
                />
              </label>

              <label className="full">
                Dirección
                <textarea
                  value={newCustomer.address}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, address: e.target.value })
                  }
                  placeholder="Dirección del cliente"
                />
              </label>
            </div>

            <div className="qb-modal-actions">
              <button
                className="qb-secondary-btn"
                onClick={() => setCustomerModalOpen(false)}
              >
                Cancelar
              </button>

              <button className="qb-primary-btn" onClick={saveCustomer}>
                Guardar cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {companyModalOpen && (
        <div className="qb-modal-overlay">
          <div className="qb-customer-modal">
            <div className="qb-modal-head">
              <div>
                <span>Empresa</span>
                <h3>Editar empresa</h3>
              </div>

              <button onClick={() => setCompanyModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="qb-customer-grid">
              <label>
                Nombre de empresa *
                <input
                  value={companyForm.businessName}
                  onChange={(e) =>
                    setCompanyForm({
                      ...companyForm,
                      businessName: e.target.value,
                    })
                  }
                  placeholder="Nombre de la empresa"
                />
              </label>

              <label>
                Correo
                <input
                  value={companyForm.email}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, email: e.target.value })
                  }
                  placeholder="empresa@email.com"
                />
              </label>

              <label>
                RNC / Cédula
                <input
                  value={companyForm.rnc}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, rnc: e.target.value })
                  }
                  placeholder="RNC o cédula"
                />
              </label>

              <label>
                Teléfono
                <input
                  value={companyForm.phone}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, phone: e.target.value })
                  }
                  placeholder="809-000-0000"
                />
              </label>

              <label className="full">
                Dirección
                <textarea
                  value={companyForm.address}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, address: e.target.value })
                  }
                  placeholder="Dirección de la empresa"
                />
              </label>
            </div>

            <div className="qb-modal-actions">
              <button
                className="qb-secondary-btn"
                onClick={() => setCompanyModalOpen(false)}
              >
                Cancelar
              </button>

              <button className="qb-primary-btn" onClick={saveCompany}>
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}


      {previewModalOpen && (
  <div className="qb-modal-overlay">
    <div className="qb-invoice-preview-modal">
      <div className="qb-modal-head">
        <div>
          <span>Vista previa</span>
          <h3>¿Seguro que deseas emitir esta factura?</h3>
        </div>

        <button onClick={() => setPreviewModalOpen(false)}>
          <X size={20} />
        </button>
      </div>

      <div className="qb-preview-body">
        <div className="qb-preview-header">
          <div>
            <h2>{getInvoiceTypeLabel(form.invoiceType)}</h2>
            <p>{invoiceNumberPreview}</p>
          </div>

          <div>
            <strong>{tenant?.businessName || "Mi empresa"}</strong>
            <p>{tenant?.address || "Dirección no configurada"}</p>
            <p>RNC/Cédula: {tenant?.rnc || "-"}</p>
            <p>{tenant?.email || ""}</p>
            <p>{tenant?.phone || ""}</p>
          </div>
        </div>

        <div className="qb-preview-client">
          <strong>Cliente:</strong> {form.customerName || "-"} <br />
          <strong>RNC/Cédula:</strong> {form.customerRnc || "-"} <br />
          <strong>Teléfono:</strong> {form.customerPhone || "-"} <br />
          <strong>Email:</strong> {form.customerEmail || "-"} <br />
          <strong>Fecha:</strong> {form.invoiceDate || "-"} <br />
          <strong>Vencimiento:</strong> {form.dueDate || "-"}
        </div>

        <table className="qb-preview-table">
          <thead>
            <tr>
              <th>Producto / Servicio</th>
              <th>Cant.</th>
              <th>Precio</th>
              <th>Desc.</th>
              <th>ITBIS</th>
              <th>Total</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item, index) => {
              const product = products.find(
                (p) => String(p.id) === String(item.productId)
              );

              const lineSubtotal = Math.max(
                Number(item.quantity || 0) * Number(item.price || 0) -
                  Number(item.discount || 0),
                0
              );

              const isTaxable =
                taxEnabled &&
                (taxMode === "global" ? true : item.isTaxable !== false);

              const lineTax = isTaxable ? lineSubtotal * (taxRate / 100) : 0;
              const lineTotal = lineSubtotal + lineTax;

              return (
                <tr key={index}>
                  <td>{product?.name || item.description || "-"}</td>
                  <td>{item.quantity || 0}</td>
                  <td>{money.format(Number(item.price || 0))}</td>
                  <td>{money.format(Number(item.discount || 0))}</td>
                  <td>{money.format(lineTax)}</td>
                  <td>{money.format(lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="qb-preview-totals">
          <p>
            <span>Subtotal</span>
            <strong>{money.format(totals.subtotal)}</strong>
          </p>

          <p>
            <span>ITBIS ({taxRate}%)</span>
            <strong>{money.format(totals.tax)}</strong>
          </p>

          <p className="big">
            <span>Total</span>
            <strong>{money.format(totals.total)}</strong>
          </p>

          <p>
            <span>Pendiente</span>
            <strong>{money.format(totals.balance)}</strong>
          </p>
        </div>
      </div>

      <div className="qb-modal-actions">
        <button
          className="qb-secondary-btn"
          onClick={() => setPreviewModalOpen(false)}
        >
          Volver a editar
        </button>

        <button
          className="qb-primary-btn"
          disabled={saving}
          onClick={() => {
            setPreviewModalOpen(false);
            saveInvoice("issued");
          }}
        >
          <FileText size={16} />
          Sí, emitir factura
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}