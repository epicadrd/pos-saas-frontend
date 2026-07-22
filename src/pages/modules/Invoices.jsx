import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Ban,
  ChevronDown,
  CircleCheck,
  FileText,
  Loader2,
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
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import { getFiscalNumber } from "../../utils/fiscalNumber";
import {
  getTaxRate,
  getTaxLabel,
  isDominicanTenant,
} from "../../utils/taxConfig";


const emptyForm = {
  customerName: "",
  customerRnc: "",
  customerPhone: "",
  customerEmail: "",
  invoiceType: "consumer_final",
  electronicInvoicingEnabled: false,
  status: "draft",
  amountPaid: "",
  terms: "payment_30_days",
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  notes: "",
  applyRetentions: false,
};

export default function Invoices() {
  const { t } = useTranslation();
  
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
  const [ecfRequestStatus, setEcfRequestStatus] = useState("not_requested");
  const [loadingEcfRequest, setLoadingEcfRequest] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const adminMenuRef = useRef(null);
  const actionsMenuRef = useRef(null);
  const customerSuggestionsRef = useRef(null);

  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    businessName: "",
    email: "",
    address: "",
    rnc: "",
    phone: "",
  });

const isDO = isDominicanTenant(tenant);

const tenantPlan = String(tenant?.plan || "").toLowerCase();

const hasInventoryPlan = ["pyme", "empresarial", "pro", "enterprise"].includes(
  tenantPlan
);

const isStarterPlan = ["emprendedor", "starter"].includes(tenantPlan);

const isManualInvoiceItem = (item) =>
  !item.productId &&
  Boolean(String(item.productName || item.description || "").trim());

const canUseElectronicInvoicing =
  ecfRequestStatus === "active";

const electronicInvoicingActive =
  isDO &&
  canUseElectronicInvoicing &&
  form.electronicInvoicingEnabled === true;

const shouldPrintElectronicInvoice = (invoice = {}) =>
  isDO &&
  invoice?.electronicInvoicingEnabled !== false &&
  Boolean(invoice?.eNcf || invoice?.dgiiQrUrl || invoice?.electronicInvoiceStatus);

const money = new Intl.NumberFormat(isDO ? "es-DO" : "en-US", {
  style: "currency",
  currency: isDO ? "DOP" : "USD",
});

  const taxEnabled = tenant?.invoiceTaxEnabled !== false;
  const taxMode = tenant?.invoiceTaxMode || "global";
  const taxRate = getTaxRate(tenant);
  const taxLabel = getTaxLabel(tenant);
  const usTaxBreakdown = {
  stateRate: Number(tenant?.usStateTaxRate || 0),
  countyRate: Number(tenant?.usCountyTaxRate || 0),
  cityRate: Number(tenant?.usCityTaxRate || 0),
};

const getTaxAmount = (rate, base = totals.subtotal) => {
  return Math.round((Number(base || 0) * (Number(rate || 0) / 100) + Number.EPSILON) * 100) / 100;
};

  const invoiceTypeLabels = {
  consumer_final: t("invoices.invoiceTypes.consumerFinalFiscal"),
  credit_fiscal: t("invoices.invoiceTypes.creditFiscal"),
};

  const getInvoiceTypeLabel = (type) => {
  if (!isDO) return t("invoices.common.invoice").toUpperCase();

  return invoiceTypeLabels[type] || invoiceTypeLabels.consumer_final;
};

  

  const getTipoECFByInvoiceType = (invoiceType) => {
  return invoiceType === "credit_fiscal" ? "31" : "32";
  };

 const getFiscalInvoiceNumber = (invoice) => {
  return (
    invoice?.eNcf ||
    invoice?.invoiceNumber ||
    t("invoices.common.pending")
  );
};

  const getFiscalInvoiceTitle = (invoiceType) => {
    return invoiceType === "credit_fiscal"
      ? "FACTURA DE CRÉDITO FISCAL ELECTRÓNICA"
      : "FACTURA DE CONSUMO FISCAL ELECTRÓNICA";
  };

  const getInvoiceQrTarget = (invoice) => {
    if (invoice?.dgiiQrUrl) return invoice.dgiiQrUrl;

    return `${window.location.origin}/public/invoice/${invoice.invoiceNumber}`;
  };

  const invoiceNumberPreview =
  editingInvoiceNumber ||
  `${isDO ? "FAC" : "INV"}-${Date.now().toString().slice(-8)}`;

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

  const applyRetentions = form.applyRetentions === true;
  const itbisRetention = applyRetentions ? tax : 0;
  const isrRetention = applyRetentions ? subtotal * 0.15 : 0;
  const totalRetentions = itbisRetention + isrRetention;

  const total =
    Math.round((subtotal + tax - totalRetentions + Number.EPSILON) * 100) / 100;

  const paid = form.status === "paid" ? total : Number(form.amountPaid || 0);
  const balance = total - paid;

  return {
    subtotal: Math.round((subtotal + Number.EPSILON) * 100) / 100,
    tax: Math.round((tax + Number.EPSILON) * 100) / 100,
    itbisRetention: Math.round((itbisRetention + Number.EPSILON) * 100) / 100,
    isrRetention: Math.round((isrRetention + Number.EPSILON) * 100) / 100,
    totalRetentions: Math.round((totalRetentions + Number.EPSILON) * 100) / 100,
    total,
    paid,
    balance: Math.round((balance + Number.EPSILON) * 100) / 100,
  };
}, [
  items,
  form.amountPaid,
  form.status,
  form.applyRetentions,
  taxEnabled,
  taxMode,
  taxRate,
]);
  useEffect(() => {
  loadData();
}, []);

 const loadData = async () => {
  try {
    setLoading(true);

    const invoiceRes = await api.get("/invoices");

    setInvoices(
      Array.isArray(invoiceRes.data)
        ? invoiceRes.data
        : []
    );

    try {
      const productRes = await api.get(
        "/products?status=active&type=all"
      );

      setProducts(
        Array.isArray(productRes.data)
          ? productRes.data
          : []
      );
    } catch (error) {
      console.error(
        "Error cargando productos:",
        error
      );

      setProducts([]);
    }

    try {
      const customerRes = await api.get("/customers");

      setCustomers(
        Array.isArray(customerRes.data)
          ? customerRes.data
          : []
      );
    } catch (error) {
      console.error(
        "Error cargando clientes:",
        error
      );

      setCustomers([]);
    }

    // Consultar el estado de la solicitud e-CF
    try {
      setLoadingEcfRequest(true);

      const ecfRequestRes = await api.get(
        "/electronic-invoicing/request"
      );

      const requestStatus =
        ecfRequestRes.data?.request?.status ||
        "not_requested";

      const requestIsActive =
        requestStatus === "active";

      setEcfRequestStatus(requestStatus);

      setForm((prev) => ({
        ...prev,
        electronicInvoicingEnabled:
          requestIsActive &&
          tenant?.electronicInvoicingEnabled === true,
      }));
    } catch (error) {
      console.error(
        "Error consultando la solicitud e-CF:",
        error
      );

      setEcfRequestStatus("not_requested");

      setForm((prev) => ({
        ...prev,
        electronicInvoicingEnabled: false,
      }));
    } finally {
      setLoadingEcfRequest(false);
    }
  } catch (error) {
    console.error(
      "Error cargando facturas:",
      error
    );

    alert(
      error.response?.data?.message ||
        t("invoices.messages.loadError")
    );

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

  const resetInvoiceForm = () => {
  setForm({
    ...emptyForm,
    electronicInvoicingEnabled:
      canUseElectronicInvoicing &&
      tenant?.electronicInvoicingEnabled === true,
  });

  setItems([]);
  setEditingInvoiceId(null);
  setEditingInvoiceNumber(null);
  setActiveTab("edit");
  setActionsOpen(false);
  setAdminMenuOpen(false);
};

  useEffect(() => {
  const handleClickOutside = (event) => {
    if (
      customerSuggestionsRef.current &&
      !customerSuggestionsRef.current.contains(event.target)
    ) {
      setShowCustomerSuggestions(false);
    }
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

 const toggleElectronicInvoicingPreference = async () => {
  if (loadingEcfRequest) {
    return;
  }

  if (!canUseElectronicInvoicing) {
    alert(
      "El switch e-CF estará disponible cuando tu solicitud de facturación electrónica sea aceptada."
    );
    return;
  }

  const previousValue =
    form.electronicInvoicingEnabled === true;

  const nextValue = !previousValue;

  setForm((prev) => ({
    ...prev,
    electronicInvoicingEnabled: nextValue,
  }));

  try {
    const { data } = await api.patch("/auth/tenant", {
      businessName: tenant?.businessName || "",
      email: tenant?.email || "",
      address: tenant?.address || "",
      rnc: tenant?.rnc || "",
      phone: tenant?.phone || "",
      primaryColor:
        tenant?.primaryColor || "#6d4aff",
      invoicePrefix:
        tenant?.invoicePrefix || "FAC",
      invoiceTaxEnabled:
        tenant?.invoiceTaxEnabled !== false,
      invoiceTaxMode:
        tenant?.invoiceTaxMode || "global",
      invoiceTaxRate: Number(
        tenant?.invoiceTaxRate ?? 18
      ),
      country: tenant?.country || "DO",
      electronicInvoicingEnabled: nextValue,
      usStateTaxRate: Number(
        tenant?.usStateTaxRate || 0
      ),
      usCountyTaxRate: Number(
        tenant?.usCountyTaxRate || 0
      ),
      usCityTaxRate: Number(
        tenant?.usCityTaxRate || 0
      ),
      invoiceNextNumber:
        tenant?.invoiceNextNumber || 1,
      invoiceDigits:
        tenant?.invoiceDigits || 6,
    });

    setTenant(data.tenant);
  } catch (error) {
    setForm((prev) => ({
      ...prev,
      electronicInvoicingEnabled: previousValue,
    }));

    alert(
      error.response?.data?.message ||
        "No se pudo guardar la preferencia de facturación electrónica."
    );
  }
};

  const addLine = () => {
    setItems([
      ...items,
      {
        productId: "",
        productName: "",
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
        productName: product?.name || "",
        description: product?.description || "",
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
      alert(t("invoices.fields.customerNameRequired"));
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
      alert(error.response?.data?.message || t("invoices.messages.createCustomerError"));
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
      alert(t("invoices.messages.customerRequired"));
      return;
    }

    if (electronicInvoicingActive && form.invoiceType === "credit_fiscal" && !form.customerRnc.trim()) {
      alert(t("invoices.messages.creditFiscalRncRequired"));
      return;
    }

    const cleanItems = items
      .filter((item) => (item.productId || item.productName || item.description) && Number(item.quantity) > 0)
      .map((item) => ({
        productId: item.productId,
        productName: item.productName || item.description || "",
        quantity: Number(item.quantity),
        price: Number(item.price),
        discount: Number(item.discount || 0),
        description: item.description || "",
        isTaxable: item.isTaxable !== false,
      }));

    if (!cleanItems.length) {
      alert(t("invoices.messages.itemsRequired"));
      return;
    }

    if (status !== "draft" && hasStockError) {
      alert(t("invoices.messages.stockError"));
      return;
    }

    try {
      setSaving(true);

        if (status !== "draft") {
          setPreviewModalOpen(false);
      }

      if (editingInvoiceId && status === "draft") {
        await api.put(`/invoices/${editingInvoiceId}/draft`, {
          customerName: form.customerName,
          customerRnc: form.customerRnc,
          customerPhone: form.customerPhone,
          customerEmail: form.customerEmail,
          invoiceType: form.invoiceType,
          electronicInvoicingEnabled: electronicInvoicingActive,
          applyRetentions: form.applyRetentions === true,
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
          electronicInvoicingEnabled: electronicInvoicingActive,
          applyRetentions: form.applyRetentions === true,
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
          const invoiceWithItems = {
            ...data.invoice,
            electronicInvoicingEnabled: electronicInvoicingActive,
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
          };

          if (electronicInvoicingActive) {
            const fiscalInvoice = await emitElectronicInvoice(invoiceWithItems);
            handlePrintInvoice(fiscalInvoice);
          } else {
            handlePrintInvoice({
              ...invoiceWithItems,
              electronicInvoicingEnabled: false,
            });
          }

        }
      }

      await loadData();
      resetInvoiceForm();
      setView("create");
      addLine();
    } catch (error) {
      alert(error.response?.data?.message || t("invoices.messages.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const cancelInvoice = async (invoice) => {
    const ok = await confirm({
      title: t("invoices.confirm.cancelTitle"),
      message: t("invoices.confirm.cancelMessage", { number: getFiscalNumber(invoice) }),
      confirmText: t("invoices.actions.cancelInvoice"),
      variant: "danger",
    });

    if (!ok) return;

    try {
      await api.patch(`/invoices/${invoice.id}/cancel`);
      await loadData();
    } catch (error) {
      alert(error.response?.data?.message || t("invoices.messages.cancelError"));
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
      electronicInvoicingEnabled:
      canUseElectronicInvoicing &&
      tenant?.electronicInvoicingEnabled === true &&
      invoice.electronicInvoicingEnabled === true,
      amountPaid: invoice.amountPaid || "",
      invoiceDate: invoice.invoiceDate || new Date().toISOString().slice(0, 10),
      dueDate: invoice.dueDate || "",
      terms: invoice.terms || "payment_30_days",
      notes: invoice.notes || "",
      applyRetentions: invoice.applyRetentions === true,
    });

    setItems(
      (invoice.items || []).map((item) => ({
        productId: item.productId || "",
        productName: item.productName || item.product?.name || item.description || "",
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
      title: t("invoices.confirm.deleteDraftTitle"),
      message: t("invoices.confirm.deleteDraftMessage"),
      confirmText: t("invoices.actions.delete"),
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
      alert(error.response?.data?.message || t("invoices.messages.deleteDraftError"));
    }
  };

  const issueDraft = async (invoice) => {
    const ok = await confirm({
      title: t("invoices.confirm.issueTitle"),
      message: t("invoices.confirm.issueMessage", { number: invoice.invoiceNumber }),
      confirmText: t("invoices.actions.issue"),
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
      alert(error.response?.data?.message || t("invoices.messages.issueDraftError"));
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

const emitElectronicInvoice = async (invoice) => {
  if (!electronicInvoicingActive) {
    return {
      ...invoice,
      electronicInvoicingEnabled: false,
    };
  }

  if (!isDO) {
    return invoice;
  }

  const tipoeCF = getTipoECFByInvoiceType(invoice.invoiceType);

  const { data } = await api.post(
    `/electronic-invoices/invoice/${invoice.id}/emit`,
    {
      tipoeCF,
    }
  );

  return {
    ...invoice,
    eNcf:
      data.electronicInvoice?.eNcf ||
      data.response?.ecf ||
      data.response?.ncf ||
      invoice.eNcf,
    tipoeCF,
    dgiiQrUrl:
      data.electronicInvoice?.qrUrl ||
      data.response?.qr_url ||
      invoice.dgiiQrUrl,
    electronicInvoiceStatus:
      data.electronicInvoice?.status ||
      data.response?.status ||
      "Enviado",
  };
};

const printHtml = (html) => {
  const iframe = document.createElement("iframe");

  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";

  document.body.appendChild(iframe);

  const iframeWindow = iframe.contentWindow;
  const iframeDocument = iframeWindow.document;

  iframeDocument.open();
  iframeDocument.write(html);
  iframeDocument.close();

  iframe.onload = () => {
    iframeWindow.focus();
    iframeWindow.print();

    iframeWindow.onafterprint = () => {
      document.body.removeChild(iframe);
    };

    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 3000);
  };
};

  const handlePrintInvoice = async (invoice) => {
    const invoiceItems = invoice.items || [];
    const invoiceElectronic = shouldPrintElectronicInvoice(invoice);
    const qrDataUrl = invoiceElectronic
      ? await QRCode.toDataURL(buildInvoiceQrValue(invoice), {
          width: 150,
          margin: 1,
        })
      : "";

    const html = `
      <html>
        <head>
          <title>${getFiscalInvoiceNumber(invoice)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 26px 40px; color: #111827; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid ${invoiceColor}; padding-bottom: 14px; margin-bottom: 18px; }
            h1 { margin: 0; color: ${invoiceColor}; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border-bottom: 1px solid #e5e7eb; padding: 12px; text-align: left; font-size: 14px; }
            th { background: #f8fafc; }
            .box { background: #f8fafc; padding: 12px 16px; border-radius: 10px; margin-bottom: 14px; }
            .invoice-footer {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 28px;
              margin-top: 14px;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .notes-box {
              flex: 1;
              min-width: 0;
              max-width: 360px;
              min-height: 0;
              white-space: pre-wrap;
              overflow-wrap: anywhere;
              word-break: break-word;
              font-size: 12px;
              line-height: 1.35;
            }

            .totals {
              width: 280px;
              margin-top: 0;
              margin-left: 0;
              flex-shrink: 0;
            }
            .totals div { display: flex; justify-content: space-between; padding: 5px 0; }
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
              <h1>${invoiceElectronic ? getFiscalInvoiceTitle(invoice.invoiceType) : t("invoices.preview.invoiceTitle")}</h1>

                ${
                  invoiceElectronic
                    ? `<p><strong>e-NCF:</strong> ${getFiscalInvoiceNumber(invoice)}</p>`
                    : ""
                }
            </div>

            <div>
              <strong>${tenant?.businessName || t("invoices.company.myCompany")}</strong><br/>
              ${tenant?.address || ""}<br/>
              ${isDO ? `${t("invoices.preview.rncId")}: ${tenant?.rnc || "-" }<br/>` : ""}
              ${tenant?.email || ""}<br/>
              ${tenant?.phone || ""}
            </div>
          </div>

          <div class="box">
            <strong>${t("invoices.fields.customer")}:</strong> ${invoice.customerName || "-"}<br/>
            ${isDO ? `<strong>${t("invoices.preview.rncId")}:</strong> ${invoice.customerRnc || "-"}<br/>` : ""}
            <strong>${t("invoices.fields.phone")}:</strong> ${invoice.customerPhone || "-"}<br/>
            <strong>${t("invoices.fields.emailShort")}:</strong> ${invoice.customerEmail || "-"}<br/><br/>

            <strong>${t("invoices.fields.invoiceDate")}:</strong> ${invoice.invoiceDate || "-"}<br/>
            <strong>${t("invoices.fields.dueDate")}:</strong> ${invoice.dueDate || "-"}
             
          </div>

          <table>
            <thead>
              <tr>
                <th>${t("invoices.print.productService")}</th>
                <th>${t("invoices.items.quantity")}</th>
                <th>${t("invoices.items.price")}</th>
                <th>${t("invoices.items.discount")}</th>
                <th>${t("invoices.fields.subtotal")}</th>
               ${taxMode === "line" ? `<th>${taxLabel}</th>` : ""}
                <th>${t("invoices.fields.total")}</th>
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
                            <td>${item.productName || item.product?.name || item.description || "-"}</td>
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
                        ${t("invoices.print.emptyInvoiceItems")}
                      </td>
                    </tr>
                  `
              }
            </tbody>
          </table>

<div class="invoice-footer">

  <div class="notes-box">
    ${
      invoice.notes
        ? `<strong>Notas:</strong><br/><br/>${invoice.notes}`
        : ""
    }
  </div>

  <div class="totals">
  <div><span>${t("invoices.fields.subtotal")}</span><strong>${money.format(Number(invoice.subtotal || 0))}</strong></div>

  ${
    isDO
      ? `<div><span>${taxLabel} (${taxRate}%)</span><strong>${money.format(Number(invoice.tax || 0))}</strong></div>`
      : `
        <div><span>State Tax (${usTaxBreakdown.stateRate}%)</span><strong>${money.format(getTaxAmount(usTaxBreakdown.stateRate, Number(invoice.subtotal || 0)))}</strong></div>
        <div><span>County Tax (${usTaxBreakdown.countyRate}%)</span><strong>${money.format(getTaxAmount(usTaxBreakdown.countyRate, Number(invoice.subtotal || 0)))}</strong></div>
        <div><span>City Tax (${usTaxBreakdown.cityRate}%)</span><strong>${money.format(getTaxAmount(usTaxBreakdown.cityRate, Number(invoice.subtotal || 0)))}</strong></div>
        <div><span>Total Taxes (${taxRate}%)</span><strong>${money.format(Number(invoice.tax || 0))}</strong></div>
      `
  }

  ${
    Number(invoice.totalRetentions || 0) > 0
      ? `
        <div><span>Retención ITBIS 100%</span><strong>- ${money.format(Number(invoice.itbisRetention || 0))}</strong></div>
        <div><span>Retención ISR 15%</span><strong>- ${money.format(Number(invoice.isrRetention || 0))}</strong></div>
        <div><span>Total retenciones</span><strong>- ${money.format(Number(invoice.totalRetentions || 0))}</strong></div>
      `
      : ""
  }

  <div class="total"><span>${t("invoices.fields.total")}</span><strong>${money.format(Number(invoice.total || 0))}</strong></div>
  <div><span>${t("invoices.fields.paid")}</span><strong>${money.format(Number(invoice.amountPaid || 0))}</strong></div>
  <div><span>${t("invoices.fields.balance")}</span><strong>${money.format(Number(invoice.balance || 0))}</strong></div>
</div>
</div>


          ${
            invoiceElectronic
              ? `
                <div class="qr-section">
                  <img src="${qrDataUrl}" alt="${t("invoices.print.qrAlt")}" />
                  <p>${t("invoices.print.scanQr")}</p>
                </div>
              `
              : ""
          }
        </body>
      </html>
    `;

  printHtml(html);
};

const handlePrintDraft = async () => {
  const draftElectronic = electronicInvoicingActive;
  const qrDataUrl = draftElectronic
    ? await QRCode.toDataURL(
        `${window.location.origin}/public/invoice/${invoiceNumberPreview}`,
        {
          width: 150,
          margin: 1,
        }
      )
    : "";  
 
    const html = `
      <html>
        <head>
          <title>${t("invoices.common.invoice")} ${invoiceNumberPreview}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 26px 40px; color: #111827; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid ${invoiceColor}; padding-bottom: 14px; margin-bottom: 18px; }
            h1 { margin: 0; color: ${invoiceColor}; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border-bottom: 1px solid #e5e7eb; padding: 12px; text-align: left; font-size: 14px; }
            th { background: #f8fafc; }
            .box {
              background: #f8fafc;
              padding: 12px 16px;
              border-radius: 10px;
              margin-bottom: 14px;
            }
            .invoice-footer {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 28px;
              margin-top: 14px;
              break-inside: auto;
              page-break-inside: auto;
            }

            .notes-box {
              flex: 1;
              min-width: 0;
              max-width: 360px;
              min-height: 0;
              white-space: pre-wrap;
              overflow-wrap: anywhere;
              word-break: break-word;
              font-size: 12px;
              line-height: 1.35;
            }

            .totals {
              width: 320px;
              margin-top: 0;
              margin-left: 0;
              flex-shrink: 0;
            }

.totals div {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
}.total { font-size: 20px; font-weight: bold; border-top: 2px solid #111827; margin-top: 10px; padding-top: 12px; }
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
    <h1>${draftElectronic ? getInvoiceTypeLabel(form.invoiceType) : t("invoices.preview.invoiceTitle")}</h1>

    ${
      draftElectronic
        ? `<p>${invoiceNumberPreview}</p>`
        : `<p>${t("invoices.common.invoice")} # ${invoiceNumberPreview}</p>`
    }
  </div>

            <div>
              <strong>${tenant?.businessName || t("invoices.company.myCompany")}</strong><br/>
              ${tenant?.address || ""}<br/>
              ${isDO ? `${t("invoices.preview.rncId")}: ${tenant?.rnc || "-"}<br/>` : ""}
              ${tenant?.email || ""}<br/>
              ${tenant?.phone || ""}
            </div>
          </div>

          <div class="box">
            <strong>${t("invoices.fields.customer")}:</strong> ${form.customerName || "-"}<br/>
            ${isDO ? `<strong>${t("invoices.preview.rncId")}:</strong> ${form.customerRnc || "-"}<br/>` : ""}
            <strong>${t("invoices.fields.phone")}:</strong> ${form.customerPhone || "-"}<br/>
            <strong>${t("invoices.fields.emailShort")}:</strong> ${form.customerEmail || "-"}<br/><br/>

            <strong>${t("invoices.fields.invoiceDate")}:</strong> ${form.invoiceDate || "-"}<br/>
            <strong>${t("invoices.fields.dueDate")}:</strong> ${form.dueDate || "-"}
          </div>

          <table>
            <thead>
              <tr>
                <th>${t("invoices.print.productService")}</th>
                <th>${t("invoices.items.quantity")}</th>
                <th>${t("invoices.items.price")}</th>
                <th>${t("invoices.items.discount")}</th>
                <th>${t("invoices.fields.subtotal")}</th>
                ${taxMode === "line" ? `<th>${taxLabel}</th>` : ""}
                <th>${t("invoices.fields.total")}</th>
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
                            <td>${item.productName || product?.name || item.description || "-"}</td>
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
                        ${t("invoices.print.emptyItems")}
                      </td>
                    </tr>
                  `
              }
            </tbody>
          </table>

          <div class="invoice-footer">

            <div class="notes-box">
              ${
                form.notes
                  ? `<strong>Notas:</strong><br/><br/>${form.notes}`
                  : ""
              }
            </div>

            <div class="totals">
            <div><span>${t("invoices.fields.subtotal")}</span><strong>${money.format(totals.subtotal)}</strong></div>

            ${
              isDO
                ? `<div><span>${taxLabel} (${taxRate}%)</span><strong>${money.format(totals.tax)}</strong></div>`
                : `
                  <div><span>${t("invoices.print.stateTax")} (${usTaxBreakdown.stateRate}%)</span><strong>${money.format(getTaxAmount(usTaxBreakdown.stateRate))}</strong></div>
                  <div><span>${t("invoices.print.countyTax")} (${usTaxBreakdown.countyRate}%)</span><strong>${money.format(getTaxAmount(usTaxBreakdown.countyRate))}</strong></div>
                  <div><span>${t("invoices.print.cityTax")} (${usTaxBreakdown.cityRate}%)</span><strong>${money.format(getTaxAmount(usTaxBreakdown.cityRate))}</strong></div>
                  <div><span>${t("invoices.print.totalTaxes")} (${taxRate}%)</span><strong>${money.format(totals.tax)}</strong></div>
                `
            }

            ${
              form.applyRetentions
                ? `
                  <div><span>Retención ITBIS 100%</span><strong>- ${money.format(totals.itbisRetention)}</strong></div>
                  <div><span>Retención ISR 15%</span><strong>- ${money.format(totals.isrRetention)}</strong></div>
                  <div><span>Total retenciones</span><strong>- ${money.format(totals.totalRetentions)}</strong></div>
                `
                : ""
            }

            <div class="total"><span>${t("invoices.fields.total")}</span><strong>${money.format(totals.total)}</strong></div>
            <div><span>${t("invoices.fields.paid")}</span><strong>${money.format(totals.paid)}</strong></div>
            <div><span>${t("invoices.fields.balance")}</span><strong>${money.format(totals.balance)}</strong></div>
          </div>
          </div>

          ${
            draftElectronic
              ? `
                <div class="qr-section">
                  <img src="${qrDataUrl}" alt="${t("invoices.print.qrAlt")}" />
                  <p>Escanee para consultar esta factura</p>
                </div>
              `
              : ""
          }
        </body>
      </html>
    `;

   printHtml(html);
  }
  const drafts = invoices.filter((invoice) => invoice.status === "draft");

  const getInvoiceStatusLabel = (status) => {
    return t(`invoices.status.${status}`, t("invoices.status.none"));
  };

  const markAsPaid = async (invoice) => {
    const ok = await confirm({
      title: t("invoices.confirm.markPaidTitle"),
      message: t("invoices.confirm.markPaidMessage", { number: getFiscalNumber(invoice) }),
      confirmText: t("invoices.actions.markPaid"),
      variant: "success",
    });

    if (!ok) return;

    try {
      await api.patch(`/invoices/${invoice.id}/mark-paid`);
      await loadData();
    } catch (error) {
      alert(error.response?.data?.message || t("invoices.messages.markPaidError"));
    }
  };

  const saveCompany = async () => {
    if (!companyForm.businessName.trim()) {
      alert(t("invoices.fields.companyNameRequired"));
      return;
    }

    try {
      const { data } = await api.patch("/auth/tenant", companyForm);

      setTenant(data.tenant);
      setCompanyModalOpen(false);

      alert(t("invoices.messages.companyUpdated"));
    } catch (error) {
      alert(error.response?.data?.message || t("invoices.messages.updateCompanyError"));
    }
  };

  if (view === "list") {
    return (
      <div
        className="qb-list-page"
        style={{ "--invoice-color": invoiceColor }}
      >
        <div className="qb-list-header">
          <div>
            <h1>{t("invoices.list.title")}</h1>
            <p>{t("invoices.list.description")}</p>
          </div>

          <div className="qb-header-actions">
            <button
              className="qb-secondary-btn"
              onClick={() => navigate("/dashboard/facturacion/historial-pagos")}
            >
              <BarChart size={16} />
              {t("invoices.actions.paymentHistory")}
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
              {t("invoices.actions.drafts")}
            </button>

            <button
              className="qb-primary-btn"
              onClick={() => {
                resetInvoiceForm();
                setView("create");
              }}
            >
              <Plus size={18} />
              {t("invoices.actions.newInvoice")}
            </button>
          </div>
        </div>

        <div className="qb-table-card qb-invoices-desktop">
  <table className="qb-table">
    <thead>
      <tr>
        <th>{isDO ? "E-NCF | No." : t("invoices.fields.invoiceNumber")}</th>
        <th>{t("invoices.fields.customer")}</th>
        <th>{t("invoices.fields.taxes")}</th>
        <th>{t("invoices.fields.total")}</th>
        <th>{t("invoices.fields.status")}</th>
        <th>{t("invoices.fields.actions")}</th>
      </tr>
    </thead>

    <tbody>
      {loading ? (
        <tr>
          <td colSpan="6" className="qb-empty">
            {t("invoices.messages.loading")}
          </td>
        </tr>
      ) : invoices.length ? (
        invoices.map((invoice) => (
          <tr key={invoice.id}>
            <td>
              <strong>{getFiscalInvoiceNumber(invoice)}</strong>
            </td>
            <td>{invoice.customerName}</td>
            <td>{money.format(Number(invoice.tax || 0))}</td>
            <td>{money.format(Number(invoice.total || 0))}</td>

            <td>
              <span className={`qb-status qb-${invoice.status}`}>
                {getInvoiceStatusLabel(invoice.status)}
              </span>
            </td>


            <td>
              <div className="qb-actions-cell">
                <button
                  className="qb-secondary-btn"
                  onClick={() => handlePrintInvoice(invoice)}
                >
                  <Printer size={16} />
                  {t("invoices.actions.print")}
                </button>

                {invoice.status !== "paid" &&
                  invoice.status !== "cancelled" &&
                  invoice.status !== "draft" && (
                    <button
                        type="button"
                        className="qb-icon-action qb-icon-paid"
                        onClick={() => markAsPaid(invoice)}
                        title={t("invoices.actions.markPaid")}
                        aria-label={t("invoices.actions.markPaid")}
                      >
                        <CircleCheck size={18} />
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
          <td colSpan="6" className="qb-empty">
            {t("invoices.messages.empty")}
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>

<div className="qb-invoices-mobile">
  {loading ? (
    <div className="qb-mobile-empty">{t("invoices.messages.loading")}</div>
  ) : invoices.length ? (
    invoices.map((invoice) => (
      <button
        type="button"
        key={invoice.id}
        className="qb-invoice-mobile-card"
        onClick={() => setSelectedInvoice(invoice)}
      >
        <div className="qb-mobile-card-top">
          <div>
            <span className="qb-mobile-label">{t("invoices.common.invoice")}</span>
            <strong>{getFiscalInvoiceNumber(invoice)}</strong>
          </div>

          <span className={`qb-status qb-${invoice.status}`}>
            {getInvoiceStatusLabel(invoice.status)}
          </span>
        </div>

        <div className="qb-mobile-client">
          <span>{t("invoices.fields.customer")}</span>
          <strong>{invoice.customerName || t("invoices.common.noCustomer")}</strong>
        </div>

        <div className="qb-mobile-money-grid">
          <div>
            <span>{t("invoices.fields.total")}</span>
            <strong>{money.format(Number(invoice.total || 0))}</strong>
          </div>

          <div>
            <span>{t("invoices.fields.balance")}</span>
            <strong>{money.format(Number(invoice.balance || 0))}</strong>
          </div>
        </div>

        <div className="qb-mobile-card-footer">
          <span>{t("invoices.fields.createdBy")} {invoice.creator?.name || t("invoices.common.system")}</span>
          <strong>{t("invoices.actions.viewDetail")}</strong>
        </div>
      </button>
    ))
  ) : (
    <div className="qb-mobile-empty">{t("invoices.messages.empty")}</div>
  )}
</div>

{selectedInvoice && (
  <div className="qb-mobile-detail-overlay" onClick={() => setSelectedInvoice(null)}>
    <div className="qb-mobile-detail-modal" onClick={(e) => e.stopPropagation()}>
      <div className="qb-mobile-detail-header">
        <div>
          <span>{t("invoices.detail.title")}</span>
          <h3>{getFiscalInvoiceNumber(selectedInvoice)}</h3>
        </div>

        <button type="button" onClick={() => setSelectedInvoice(null)}>
          <X size={20} />
        </button>
      </div>

      <div className="qb-mobile-detail-status">
        <span className={`qb-status qb-${selectedInvoice.status}`}>
          {getInvoiceStatusLabel(selectedInvoice.status)}
        </span>
      </div>

      <div className="qb-mobile-detail-list">
        <div>
          <span>{t("invoices.fields.customer")}</span>
          <strong>{selectedInvoice.customerName || t("invoices.common.noCustomer")}</strong>
        </div>

        <div>
          <span>{t("invoices.fields.subtotal")}</span>
          <strong>{money.format(Number(selectedInvoice.subtotal || 0))}</strong>
        </div>

        <div>
          <span>{taxLabel}</span>
          <strong>{money.format(Number(selectedInvoice.tax || 0))}</strong>
        </div>

        <div>
          <span>{t("invoices.fields.total")}</span>
          <strong>{money.format(Number(selectedInvoice.total || 0))}</strong>
        </div>

        <div>
          <span>{t("invoices.fields.paid")}</span>
          <strong>{money.format(Number(selectedInvoice.amountPaid || 0))}</strong>
        </div>

        <div>
          <span>{t("invoices.fields.balance")}</span>
          <strong>{money.format(Number(selectedInvoice.balance || 0))}</strong>
        </div>

        <div>
          <span>{t("invoices.fields.createdBy")}</span>
          <strong>{selectedInvoice.creator?.name || t("invoices.common.system")}</strong>
        </div>
      </div>

      <div className="qb-mobile-detail-actions">
        <button
          type="button"
          className="qb-primary-btn"
          onClick={() => handlePrintInvoice(selectedInvoice)}
        >
          <Printer size={16} />
          {t("invoices.actions.print")}
        </button>

        {selectedInvoice.status !== "paid" &&
          selectedInvoice.status !== "cancelled" &&
          selectedInvoice.status !== "draft" && (
            <button
              type="button"
              className="qb-secondary-btn"
              onClick={() => {
                markAsPaid(selectedInvoice);
                setSelectedInvoice(null);
              }}
            >
              {t("invoices.actions.markPaid")}
            </button>
          )}

        {selectedInvoice.status !== "cancelled" &&
          selectedInvoice.status !== "draft" && (
            <button
              type="button"
              className="qb-mobile-danger-btn"
              onClick={() => {
                cancelInvoice(selectedInvoice);
                setSelectedInvoice(null);
              }}
            >
              <Ban size={16} />
              {t("invoices.actions.cancelInvoice")}
            </button>
          )}
      </div>
    </div>
  </div>
)}
      </div>
    );
  }

  return (
    <div
        className="qb-invoice-page"
        style={{ "--invoice-color": invoiceColor }}
      >
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

          <span>
            {t("invoices.breadcrumb.newInvoice")}
          </span>

          <h1>
            {editingInvoiceId
              ? getFiscalNumber({
                  eNcf: form.eNcf,
                  invoiceNumber: editingInvoiceNumber,
                })
              : t("invoices.actions.newInvoice")}
          </h1>

          <small>
            {editingInvoiceId ? t("invoices.messages.editingDraft") : t("invoices.common.draft")}
          </small>
        </div>

        <div className="qb-top-actions">
          <div className="qb-actions-menu-wrap" ref={adminMenuRef}>
            <button onClick={() => setAdminMenuOpen(!adminMenuOpen)}>
              <Settings size={17} />
              {t("invoices.actions.manage")}
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
                  {t("invoices.actions.editCompany")}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdminMenuOpen(false);
                    navigate("/dashboard/facturacion/personalizacion?nueva=1");
                  }}
                >
                  <Settings size={16} />
                  {t("invoices.actions.customization")}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdminMenuOpen(false);
                    navigate("/dashboard/facturacion/preferencias?nueva=1");
                  }}
                >
                  <Settings size={16} />
                  {t("invoices.actions.invoicePreferences")}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdminMenuOpen(false);
                    navigate("/dashboard/facturacion/numeracion");
                  }}
                >
                  <Settings size={16} />
                  {t("invoices.actions.numbering")}
                </button>
              </div>
            )}
          </div>

          <div className="qb-actions-menu-wrap" ref={actionsMenuRef}>
            <button onClick={() => setActionsOpen(!actionsOpen)}>
              <MoreVertical size={17} />
              {t("invoices.fields.actions")}
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
                  {t("invoices.actions.printOrDownload")}
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
                  {t("invoices.actions.saveDraft")}
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
                  {t("invoices.actions.issueInvoice")}
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
          {t("invoices.actions.edit")}
        </button>

        <button
          className={activeTab === "drafts" ? "active" : ""}
          onClick={() => setActiveTab("drafts")}
        >
          {t("invoices.actions.drafts")}
        </button>

        <button onClick={() => navigate("/dashboard/facturacion/historial-pagos")}>
          {t("invoices.actions.paymentHistory")}
        </button>
      </div>

      {activeTab === "drafts" ? (
  <>
    <div className="qb-table-card qb-drafts-desktop">
      <table className="qb-table">
        <thead>
          <tr>
            <th>{t("invoices.common.invoice")}</th>
            <th>{t("invoices.fields.customer")}</th>
            <th>{t("invoices.fields.total")}</th>
            <th>{t("invoices.fields.actions")}</th>
          </tr>
        </thead>

        <tbody>
          {drafts.length ? (
            drafts.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.invoiceNumber || t("invoices.common.draft")}</td>
                <td>{invoice.customerName || t("invoices.common.noCustomer")}</td>
                <td>{money.format(Number(invoice.total || 0))}</td>
                <td>
                  <div className="qb-actions-cell">
                    <button
                      className="qb-secondary-btn"
                      onClick={() => loadDraft(invoice)}
                    >
                      {t("invoices.actions.edit")}
                    </button>

                    <button
                      className="qb-secondary-btn"
                      onClick={() => issueDraft(invoice)}
                    >
                      {t("invoices.actions.issue")}
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
                {t("invoices.messages.noDrafts")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    <div className="qb-drafts-mobile">
      {drafts.length ? (
        drafts.map((invoice) => (
          <button
            type="button"
            key={invoice.id}
            className="qb-draft-mobile-card"
            onClick={() => setSelectedDraft(invoice)}
          >
            <div className="qb-mobile-card-top">
              <div>
                <span className="qb-mobile-label">{t("invoices.common.draft")}</span>
                <strong>{invoice.invoiceNumber || t("invoices.common.noNumber")}</strong>
              </div>

              <span className="qb-status qb-draft">{t("invoices.common.draft")}</span>
            </div>

            <div className="qb-mobile-client">
              <span>{t("invoices.fields.customer")}</span>
              <strong>{invoice.customerName || t("invoices.common.noCustomer")}</strong>
            </div>

            <div className="qb-mobile-money-grid">
              <div>
                <span>{t("invoices.fields.subtotal")}</span>
                <strong>{money.format(Number(invoice.subtotal || 0))}</strong>
              </div>

              <div>
                <span>{t("invoices.fields.total")}</span>
                <strong>{money.format(Number(invoice.total || 0))}</strong>
              </div>
            </div>

            <div className="qb-mobile-card-footer">
              <span>{taxLabel} {money.format(Number(invoice.tax || 0))}</span>
              <strong>{t("invoices.actions.viewDetail")}</strong>
            </div>
          </button>
        ))
      ) : (
        <div className="qb-mobile-empty">{t("invoices.messages.noDrafts")}</div>
      )}
    </div>

    {selectedDraft && (
      <div
        className="qb-mobile-detail-overlay"
        onClick={() => setSelectedDraft(null)}
      >
        <div
          className="qb-mobile-detail-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="qb-mobile-detail-header">
            <div>
              <span>{t("invoices.detail.draftTitle")}</span>
              <h3>{selectedDraft.invoiceNumber || t("invoices.common.noNumber")}</h3>
            </div>

            <button type="button" onClick={() => setSelectedDraft(null)}>
              <X size={20} />
            </button>
          </div>

          <div className="qb-mobile-detail-status">
            <span className="qb-status qb-draft">{t("invoices.common.draft")}</span>
          </div>

          <div className="qb-mobile-detail-list">
            <div>
              <span>{t("invoices.fields.customer")}</span>
              <strong>{selectedDraft.customerName || t("invoices.common.noCustomer")}</strong>
            </div>

            <div>
              <span>{t("invoices.fields.subtotal")}</span>
              <strong>{money.format(Number(selectedDraft.subtotal || 0))}</strong>
            </div>

            <div>
              <span>{taxLabel}</span>
              <strong>{money.format(Number(selectedDraft.tax || 0))}</strong>
            </div>

            <div>
              <span>{t("invoices.fields.total")}</span>
              <strong>{money.format(Number(selectedDraft.total || 0))}</strong>
            </div>

            <div>
              <span>{t("invoices.fields.paid")}</span>
              <strong>{money.format(Number(selectedDraft.amountPaid || 0))}</strong>
            </div>

            <div>
              <span>{t("invoices.fields.balance")}</span>
              <strong>{money.format(Number(selectedDraft.balance || 0))}</strong>
            </div>
          </div>

          <div className="qb-mobile-detail-actions">
            <button
              type="button"
              className="qb-primary-btn"
              onClick={() => {
                loadDraft(selectedDraft);
                setSelectedDraft(null);
              }}
            >
              {t("invoices.actions.editDraft")}
            </button>

            <button
              type="button"
              className="qb-secondary-btn"
              onClick={() => {
                issueDraft(selectedDraft);
                setSelectedDraft(null);
              }}
            >
              {t("invoices.actions.issueInvoice")}
            </button>

            <button
              type="button"
              className="qb-mobile-danger-btn"
              onClick={() => {
                deleteDraft(selectedDraft);
                setSelectedDraft(null);
              }}
            >
              <Trash2 size={16} />
              {t("invoices.actions.delete")}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
) : (
        <div className="qb-layout">
          <main className="qb-document">
            <section className="qb-company">
              <div>
                <h2 style={{ color: invoiceColor }}>
                  {t("invoices.common.invoice").toUpperCase()}
                </h2>
                <strong>{tenant?.businessName || t("invoices.company.myCompany")}</strong>
                <p>{tenant?.address || t("invoices.company.addressNotSet")}</p>
                {isDO && <p>{t("invoices.fields.rncId")}: {tenant?.rnc || t("invoices.common.notSet")}</p>}
                <a
                  onClick={() => setCompanyModalOpen(true)}
                  style={{ color: invoiceColor }}
                >
                  {t("invoices.actions.editCompany")}
                </a>
              </div>

              <div className="qb-company-contact">
                <p>
                  {tenant?.email || t("invoices.placeholders.companyEmail")}
                </p>
                <p>
                  <Phone size={15} /> {tenant?.phone || t("invoices.company.phoneNotSet")}
                </p>
              </div>

              <div className="qb-logo-box">
                {invoiceLogo ? (
                  <img src={invoiceLogo} alt={t("invoices.company.logoAlt")} />
                ) : (
                  <>
                    <span style={{ color: invoiceColor }}>{t("invoices.company.myCompany").split(" ")[0]}</span>
                    <small style={{ color: invoiceColor }}>
                      {t("invoices.company.title").toUpperCase()}
                    </small>
                  </>
                )}
              </div>
            </section>

            <section className="qb-client-zone">
              <div className="qb-client-left">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                    marginBottom: "14px",
                  }}
                >
                  <select
                    className="qb-client-select"
                    onChange={(e) => selectCustomer(e.target.value)}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      {t("invoices.customer.addOrSelect")}
                    </option>

                    <option value="new">{t("invoices.customer.addNew")}</option>

                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>

                  {isDO && (
                  <button
                    type="button"
                    onClick={toggleElectronicInvoicingPreference}
                    disabled={
                      loadingEcfRequest ||
                      !canUseElectronicInvoicing
                    }
                    aria-pressed={electronicInvoicingActive}
                    title={
                      loadingEcfRequest
                        ? "Consultando estado de la solicitud e-CF"
                        : canUseElectronicInvoicing
                        ? "Activar o desactivar la facturación electrónica"
                        : "Disponible cuando la solicitud e-CF sea aceptada"
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "10px",
                      height: "46px",
                      alignSelf: "flex-start",
                      padding: "0 12px",
                      border: "1px solid #dbe3ef",
                      borderRadius: "14px",
                      background: canUseElectronicInvoicing
                        ? "#ffffff"
                        : "#f1f5f9",
                      color: canUseElectronicInvoicing
                        ? "#0f172a"
                        : "#94a3b8",
                      fontSize: "12px",
                      fontWeight: 900,
                      cursor: canUseElectronicInvoicing
                        ? "pointer"
                        : "not-allowed",
                      opacity: loadingEcfRequest ? 0.7 : 1,
                    }}
                  >
    <span>e-CF</span>

    <span
      style={{
        width: "42px",
        height: "22px",
        borderRadius: "999px",
        padding: "2px",
        background: electronicInvoicingActive
          ? "var(--invoice-color, #00bfae)"
          : "#cbd5e1",
        transition: "0.2s ease",
        boxSizing: "border-box",
      }}
    >
      <span
        style={{
          display: "block",
          width: "18px",
          height: "18px",
          borderRadius: "999px",
          background: "#ffffff",
          boxShadow:
            "0 2px 6px rgba(15,23,42,0.18)",
          transform: electronicInvoicingActive
            ? "translateX(20px)"
            : "translateX(0)",
          transition: "0.2s ease",
        }}
      />
    </span>
  </button>
)}

                  {isDO && (
  <button
    type="button"
    onClick={() =>
      setForm((prev) => ({
        ...prev,
        applyRetentions: !prev.applyRetentions,
      }))
    }
    aria-pressed={form.applyRetentions === true}
    title="Aplicar retención del 100% del ITBIS y 15% de ISR"
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      height: "46px",
      alignSelf: "flex-start",
      padding: "0 12px",
      border: "1px solid #dbe3ef",
      borderRadius: "14px",
      background: "#ffffff",
      color: "#0f172a",
      fontSize: "12px",
      fontWeight: 900,
      cursor: "pointer",
    }}
  >
    <span>Retenciones</span>

    <span
      style={{
        width: "42px",
        height: "22px",
        borderRadius: "999px",
        padding: "2px",
        background:
          form.applyRetentions === true
            ? "var(--invoice-color, #00bfae)"
            : "#cbd5e1",
        transition: "0.2s ease",
        boxSizing: "border-box",
      }}
    >
      <span
        style={{
          display: "block",
          width: "18px",
          height: "18px",
          borderRadius: "999px",
          background: "#ffffff",
          boxShadow: "0 2px 6px rgba(15,23,42,0.18)",
          transform:
            form.applyRetentions === true
              ? "translateX(20px)"
              : "translateX(0)",
          transition: "0.2s ease",
        }}
      />
    </span>
  </button>
)}
                </div>

                <div className="qb-form-grid">
                  <label className="qb-customer-search-wrap" ref={customerSuggestionsRef}>
                    {t("invoices.fields.customerRequired")}
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
                      placeholder={t("invoices.placeholders.searchCustomer")}
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
                          {t("invoices.customer.addNew")}
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
                                {customer.rnc || t("invoices.common.noRnc")} ·{" "}
                                {customer.phone || t("invoices.common.noPhone")}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="qb-customer-empty">
                            {t("invoices.messages.noCustomersFound")}
                          </div>
                        )}
                      </div>
                    )}
                  </label>

                  {isDO && (
                    <label>
                      {t("invoices.fields.rncIdSpaced")}
                      <input
                        value={form.customerRnc}
                        onChange={(e) =>
                          setForm({ ...form, customerRnc: e.target.value })
                        }
                        placeholder={t("invoices.placeholders.rncId")}
                      />
                    </label>
                  )}

                  <label>
                    {t("invoices.fields.email")}
                    <input
                      value={form.customerEmail}
                      onChange={(e) =>
                        setForm({ ...form, customerEmail: e.target.value })
                      }
                      placeholder={t("invoices.placeholders.emailExample")}
                    />
                  </label>

                  <label>
                    {t("invoices.fields.phone")}
                    <input
                      value={form.customerPhone}
                      onChange={(e) =>
                        setForm({ ...form, customerPhone: e.target.value })
                      }
                      placeholder={t("invoices.placeholders.phoneExample")}
                    />
                  </label>
                </div>
              </div>

              <div className="qb-client-right">
                <label>
                  {t("invoices.fields.invoiceNumber")}
                  <input value={invoiceNumberPreview} disabled />
                </label>

                {isDO && (
                  <label>
                    {t("invoices.fields.invoiceType")}
                    <select
                      value={form.invoiceType}
                      onChange={(e) =>
                        setForm({ ...form, invoiceType: e.target.value })
                      }
                    >
                      <option value="consumer_final">{t("invoices.invoiceTypes.consumerFinal")}</option>
                      <option value="credit_fiscal">{t("invoices.invoiceTypes.creditFiscalShort")}</option>
                    </select>
                  </label>
                )}

                <label>
                  {t("invoices.fields.terms")}
                  <select
                    value={form.terms}
                    onChange={(e) => setForm({ ...form, terms: e.target.value })}
                  >
                    <option value="payment_30_days">{t("invoices.terms.payment30")}</option>
                    <option value="immediate_payment">{t("invoices.terms.immediate")}</option>
                    <option value="payment_15_days">{t("invoices.terms.payment15")}</option>
                  </select>
                </label>

                <label>
                  {t("invoices.fields.invoiceDate")}
                  <input
                    type="date"
                    value={form.invoiceDate}
                    onChange={(e) =>
                      setForm({ ...form, invoiceDate: e.target.value })
                    }
                  />
                </label>

                <label>
                  {t("invoices.fields.dueDate")}
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
    <h3>{t("invoices.items.title")}</h3>
      <button
        type="button"
        onClick={addLine}
        style={{
          color: invoiceColor,
          borderColor: invoiceColor,
        }}
      >
        <Plus size={16} />
        {t("invoices.items.addProductOrService")}
      </button>
  </div>

 <div className="qb-items-table-wrapper">
  <table
  className={`qb-items-table qb-invoice-items-table ${
    taxMode === "line" ? "qb-has-line-tax" : ""
  }`}
>
    <colgroup>
      <col className="qb-col-number" />
      <col className="qb-col-product" />
      <col className="qb-col-description" />
      <col className="qb-col-quantity" />
      <col className="qb-col-unit" />
      <col className="qb-col-price" />
      <col className="qb-col-discount" />

      {taxMode === "line" && <col className="qb-col-taxable" />}

      <col className="qb-col-total" />
      <col className="qb-col-actions" />
    </colgroup>

    <thead>
      <tr>
        <th>#</th>

        <th>{t("invoices.items.productService")}</th>

        <th>{t("invoices.items.description")}</th>

        <th>{t("invoices.items.quantity")}</th>

        <th title={t("invoices.items.unit")}>{t("invoices.items.unit")}</th>

        <th>{t("invoices.items.price")}</th>

        <th>{t("invoices.items.discount")}</th>

        {taxMode === "line" && (
          <th>{t("invoices.items.appliesTax", { taxLabel })}</th>
        )}

        <th>{t("invoices.fields.total")}</th>

        <th aria-label={t("invoices.common.actions") || "Acciones"}></th>
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
              <td className="qb-line-number">{index + 1}</td>

              <td>
                <input
                  type="text"
                  list={`invoice-products-${index}`}
                  value={item.productName ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;

                    const selectedProduct = products.find(
                      (currentProduct) =>
                        currentProduct.name.trim().toLowerCase() ===
                        value.trim().toLowerCase()
                    );

                    if (selectedProduct) {
                      updateItem(
                        index,
                        "productId",
                        selectedProduct.id
                      );
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
                  placeholder={t(
                    "invoices.placeholders.productOrService"
                  )}
                />

                <datalist id={`invoice-products-${index}`}>
                  {products.map((currentProduct) => (
                    <option
                      key={currentProduct.id}
                      value={currentProduct.name}
                    />
                  ))}
                </datalist>

                {product && (
                  <small className={isService ? "service-label" : ""}>
                    {isService
                      ? t("invoices.items.service")
                      : stockError
                      ? t("invoices.items.insufficientStock", {
                          stock: product.stock,
                        })
                      : t("invoices.items.available", {
                          stock: product.stock,
                        })}
                  </small>
                )}
              </td>

              <td>
                <input
                  type="text"
                  value={item.description ?? ""}
                  onChange={(e) =>
                    updateItem(index, "description", e.target.value)
                  }
                  placeholder={t("invoices.items.description")}
                />
              </td>

              <td>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(index, "quantity", e.target.value)
                  }
                  aria-label={t("invoices.items.quantity")}
                />
              </td>

              <td className="qb-unit-cell">
                {item.unit || "UND"}
              </td>

              <td>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.price}
                  onChange={(e) =>
                    updateItem(index, "price", e.target.value)
                  }
                  aria-label={t("invoices.items.price")}
                />
              </td>

              <td>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.discount}
                  onChange={(e) =>
                    updateItem(index, "discount", e.target.value)
                  }
                  aria-label={t("invoices.items.discount")}
                />
              </td>

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
                    aria-label={t("invoices.items.appliesTax", {
                      taxLabel,
                    })}
                  >
                    <option value="yes">
                      {t("invoices.common.yes")}
                    </option>

                    <option value="no">
                      {t("invoices.common.no")}
                    </option>
                  </select>
                </td>
              )}

              <td className="qb-line-total">
                <strong>{money.format(lineTotal)}</strong>

                {taxEnabled && lineTax > 0 && (
                  <small>
                    {taxLabel}: {money.format(lineTax)}
                  </small>
                )}
              </td>

              <td className="qb-actions-cell">
                <button
                  type="button"
                  className="qb-trash"
                  onClick={() => removeItem(index)}
                  aria-label={`Eliminar producto ${index + 1}`}
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          );
        })
      ) : (
        <tr>
          <td
            colSpan={taxMode === "line" ? 10 : 9}
            className="qb-empty"
          >
            {t("invoices.messages.addItemsToBuild")}
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>

  <div className="qb-mobile-items">
    {items.length ? (
      items.map((item, index) => {
        const product = products.find(
          (p) => String(p.id) === String(item.productId)
        );

        const isService =
          product?.productType === "service" || product?.trackStock === false;

        const lineSubtotal = Math.max(
          Number(item.quantity || 0) * Number(item.price || 0) -
            Number(item.discount || 0),
          0
        );

        const isTaxable =
          taxEnabled && (taxMode === "global" ? true : item.isTaxable !== false);

        const lineTax = isTaxable ? lineSubtotal * (taxRate / 100) : 0;
        const lineTotal = lineSubtotal + lineTax;

        const stockError =
          product &&
          !isService &&
          Number(item.quantity || 0) > Number(product.stock || 0);

        return (
          <div
            className={`qb-mobile-item-card ${
              stockError ? "qb-mobile-item-error" : ""
            }`}
            key={index}
          >
            <div className="qb-mobile-item-head">
              <h4>{t("invoices.items.productNumber", { number: index + 1 })}</h4>

              <button type="button" onClick={() => removeItem(index)}>
                <Trash2 size={16} />
              </button>
            </div>

            <div className="qb-mobile-item-grid">
              <label>
                {t("invoices.items.productService")}
                <input
                  type="text"
                  list={`invoice-products-mobile-${index}`}
                  value={item.productName ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;

                    const selectedProduct = products.find(
                      (product) =>
                        product.name.trim().toLowerCase() ===
                        value.trim().toLowerCase()
                    );

                    if (selectedProduct) {
                      updateItem(index, "productId", selectedProduct.id);
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
                  placeholder={t("invoices.placeholders.productOrService")}
                />

                <datalist id={`invoice-products-mobile-${index}`}>
                  {products.map((product) => (
                    <option key={product.id} value={product.name} />
                  ))}
                </datalist>
              </label>

              {product && (
                <small className={stockError ? "qb-stock-warning" : ""}>
                  {isService
                    ? t("invoices.items.service")
                    : stockError
                    ? t("invoices.items.insufficientStock", { stock: product.stock })
                    : t("invoices.items.available", { stock: product.stock })}
                </small>
              )}
              {hasInventoryPlan && isManualInvoiceItem(item) && (
                <small className="manual-invoice-item-note">
                  {t("invoices.items.manualNoInventory")}
                </small>
              )}


              <label>
                {t("invoices.items.description")}
                <input
                  value={item.description}
                  onChange={(e) =>
                    updateItem(index, "description", e.target.value)
                  }
                  placeholder={t("invoices.placeholders.productDescription")}
                />
              </label>

              <div className="qb-mobile-item-row-2">
                <label>
                  {t("invoices.items.quantity")}
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, "quantity", e.target.value)
                    }
                  />
                </label>

                <label>
                  {t("invoices.items.price")}
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) =>
                      updateItem(index, "price", e.target.value)
                    }
                  />
                </label>
              </div>

              <div className="qb-mobile-item-row-2">
                <label>
                  {t("invoices.items.discount")}
                  <input
                    type="number"
                    value={item.discount}
                    onChange={(e) =>
                      updateItem(index, "discount", e.target.value)
                    }
                  />
                </label>

                <label>
                  {t("invoices.items.unit")}
                  <input value={item.unit || "UND"} disabled />
                </label>
              </div>

              {taxMode === "line" && (
                <label>
                  {t("invoices.items.appliesTax", { taxLabel })}
                  <select
                    value={item.isTaxable === false ? "no" : "yes"}
                    onChange={(e) =>
                      updateItem(index, "isTaxable", e.target.value === "yes")
                    }
                  >
                    <option value="yes">{t("invoices.common.yes")}</option>
                    <option value="no">{t("invoices.common.no")}</option>
                  </select>
                </label>
              )}
            </div>

            <div className="qb-mobile-item-total">
              <p>
                <span>{t("invoices.fields.subtotal")}</span>
                <strong>{money.format(lineSubtotal)}</strong>
              </p>

              <p>
                <span>{taxLabel}</span>
                <strong>{money.format(lineTax)}</strong>
              </p>

              <p className="big">
                <span>{t("invoices.fields.total")}</span>
                <strong>{money.format(lineTotal)}</strong>
              </p>
            </div>
          </div>
        );
      })
    ) : (
      <div className="qb-mobile-empty">
        {t("invoices.messages.addItemsToBuild")}
      </div>
    )}

    <button
      type="button"
      className="qb-secondary-btn qb-mobile-add-line"
      onClick={addLine}
    >
      <Plus size={16} />
      Agregar producto o servicio
    </button>
  </div>
</section>

            <section className="qb-bottom-area">
              <textarea
                placeholder={t("invoices.placeholders.notes")}
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
                    {t("invoices.actions.saveDraft")}
                  </button>

                  <button
                    type="button"
                    className="qb-primary-btn"
                    disabled={saving || hasStockError}
                    onClick={() => setPreviewModalOpen(true)}
                  >
                    <FileText size={16} />
                    {t("invoices.actions.issueInvoice")}
                  </button>
                </div>

                <p>
                  <span>{t("invoices.fields.subtotal")}</span>
                  <strong>{money.format(totals.subtotal)}</strong>
                </p>

                {isDO ? (
                <p>
                  <span>{taxLabel} ({taxRate}%)</span>
                  <strong>{money.format(totals.tax)}</strong>
                </p>
              ) : (
                <>
                  <p>
                    <span>{t("invoices.print.stateTax")} ({usTaxBreakdown.stateRate}%)</span>
                    <strong>{money.format(getTaxAmount(usTaxBreakdown.stateRate))}</strong>
                  </p>

                  <p>
                    <span>{t("invoices.print.countyTax")} ({usTaxBreakdown.countyRate}%)</span>
                    <strong>{money.format(getTaxAmount(usTaxBreakdown.countyRate))}</strong>
                  </p>

                  <p>
                    <span>{t("invoices.print.cityTax")} ({usTaxBreakdown.cityRate}%)</span>
                    <strong>{money.format(getTaxAmount(usTaxBreakdown.cityRate))}</strong>
                  </p>

                  <p>
                    <span>{t("invoices.print.totalTaxes")} ({taxRate}%)</span>
                    <strong>{money.format(totals.tax)}</strong>
                  </p>
                </>
              )}

                <p className="big">
                  <span>{t("invoices.fields.total")}</span>
                  <strong>{money.format(totals.total)}</strong>
                </p>

                <p className="pending">
                  <span>{t("invoices.fields.balance")}</span>
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
                <span>{t("invoices.customer.newCustomer")}</span>
                <h3>{t("invoices.customer.addCustomer")}</h3>
              </div>

              <button onClick={() => setCustomerModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="qb-customer-grid">
              <label>
                {t("invoices.fields.nameRequired")}
                <input
                  value={newCustomer.name}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, name: e.target.value })
                  }
                  placeholder={t("invoices.placeholders.customerName")}
                />
              </label>

              <label>
                {t("invoices.fields.rncIdSpaced")}
                <input
                  value={newCustomer.rnc}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, rnc: e.target.value })
                  }
                  placeholder={t("invoices.placeholders.rncId")}
                />
              </label>

              <label>
                {t("invoices.fields.phone")}
                <input
                  value={newCustomer.phone}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, phone: e.target.value })
                  }
                  placeholder="809-000-0000"
                />
              </label>

              <label>
                {t("invoices.fields.emailShort")}
                <input
                  value={newCustomer.email}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, email: e.target.value })
                  }
                  placeholder="cliente@email.com"
                />
              </label>

              <label className="full">
                {t("invoices.fields.address")}
                <textarea
                  value={newCustomer.address}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, address: e.target.value })
                  }
                  placeholder={t("invoices.placeholders.customerAddress")}
                />
              </label>
            </div>

            <div className="qb-modal-actions">
              <button
                className="qb-secondary-btn"
                onClick={() => setCustomerModalOpen(false)}
              >
                {t("invoices.actions.cancel")}
              </button>

              <button className="qb-primary-btn" onClick={saveCustomer}>
                {t("invoices.actions.save")} {t("invoices.fields.customer").toLowerCase()}
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
                <span>{t("invoices.company.title")}</span>
                <h3>{t("invoices.actions.editCompany")}</h3>
              </div>

              <button onClick={() => setCompanyModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="qb-customer-grid">
              <label>
                {t("invoices.fields.companyNameRequired")}
                <input
                  value={companyForm.businessName}
                  onChange={(e) =>
                    setCompanyForm({
                      ...companyForm,
                      businessName: e.target.value,
                    })
                  }
                  placeholder={t("invoices.placeholders.companyName")}
                />
              </label>

              <label>
                {t("invoices.fields.emailShort")}
                <input
                  value={companyForm.email}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, email: e.target.value })
                  }
                  placeholder="empresa@email.com"
                />
              </label>

              {isDO && (
                <label>
                  {t("invoices.fields.rncIdSpaced")}
                  <input
                    value={companyForm.rnc}
                    onChange={(e) =>
                      setCompanyForm({
                        ...companyForm,
                        rnc: e.target.value,
                      })
                    }
                    placeholder={t("invoices.placeholders.rncId")}
                  />
                </label>
              )}

              <label>
                {t("invoices.fields.phone")}
                <input
                  value={companyForm.phone}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, phone: e.target.value })
                  }
                  placeholder="809-000-0000"
                />
              </label>

              <label className="full">
                {t("invoices.fields.address")}
                <textarea
                  value={companyForm.address}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, address: e.target.value })
                  }
                  placeholder={t("invoices.placeholders.companyAddress")}
                />
              </label>
            </div>

            <div className="qb-modal-actions">
              <button
                className="qb-secondary-btn"
                onClick={() => setCompanyModalOpen(false)}
              >
                {t("invoices.actions.cancel")}
              </button>

              <button className="qb-primary-btn" onClick={saveCompany}>
                {t("invoices.actions.save")}
              </button>
            </div>
          </div>
        </div>
      )}


      {previewModalOpen && (
          <div
            className="qb-modal-overlay"
            style={{ "--invoice-color": invoiceColor }}
          >
            <div
              className="qb-invoice-preview-modal"
              style={{ "--invoice-color": invoiceColor }}
            >
              <div className="qb-modal-head">
                <div>
                  <span>{t("invoices.preview.title")}</span>
                  <h3>{t("invoices.preview.confirmTitle")}</h3>
                </div>

                <button onClick={() => setPreviewModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="qb-preview-body">
                <div className="qb-preview-header">
                  <div>
                    <h2 style={{ color: invoiceColor }}>
                      {electronicInvoicingActive
                        ? getFiscalInvoiceTitle(form.invoiceType)
                        : t("invoices.preview.invoiceTitle")}
                    </h2>

                      {electronicInvoicingActive && (
                      <p>
                        <strong>{t("invoices.preview.eNcf")}:</strong>{" "}
                        {t("invoices.preview.willGenerate")}
                      </p>
                    )}
                  </div>

                  <div>
                    <strong>{tenant?.businessName || t("invoices.company.myCompany")}</strong>
                    <p>{tenant?.address || t("invoices.company.addressNotSet")}</p>
                    {isDO && (
                      <p>{t("invoices.preview.rncId")}: {tenant?.rnc || "-"}</p>
                    )}
                    <p>{tenant?.email || ""}</p>
                    <p>{tenant?.phone || ""}</p>
                  </div>
                </div>

               <div className="qb-preview-client">
                  <strong>{t("invoices.fields.customer")}:</strong> {form.customerName || "-"} <br />
                  {isDO && (
                    <>
                      <strong>{t("invoices.preview.rncId")}:</strong> {form.customerRnc || "-"} <br />
                    </>
                  )}
                  <strong>{t("invoices.fields.phone")}:</strong> {form.customerPhone || "-"} <br />
                  <strong>{t("invoices.fields.emailShort")}:</strong> {form.customerEmail || "-"} <br />
                  <strong>{t("invoices.fields.date")}:</strong> {form.invoiceDate || "-"} <br />
                  <strong>{t("invoices.fields.due")}: </strong> {form.dueDate || "-"}

                </div>

                <table
                  className="qb-preview-table"
                  style={{ "--invoice-color": invoiceColor }}
                >
                  <thead>
                    <tr>
                      <th>{t("invoices.items.productService")}</th>
                      <th>{t("invoices.items.qtyShort")}</th>
                      <th>{t("invoices.items.price")}</th>
                      <th>{t("invoices.items.discountShort")}</th>
                      <th>{t("invoices.fields.taxes")}</th>
                      <th>{t("invoices.fields.total")}</th>
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

           <div className="qb-preview-footer">
  <div className="qb-preview-notes">
    {form.notes?.trim() && (
      <>
        <strong>Notas</strong>
        <hr />
        <p>{form.notes}</p>
      </>
    )}
  </div>

  <div className="qb-preview-totals">
    <p>
      <span>{t("invoices.fields.subtotal")}</span>
      <strong>{money.format(totals.subtotal)}</strong>
    </p>

    <p>
      <span>{taxLabel} ({taxRate}%)</span>
      <strong>{money.format(totals.tax)}</strong>
    </p>

    {form.applyRetentions && (
      <>
        <p>
          <span>Retención ITBIS 100%</span>
          <strong>- {money.format(totals.itbisRetention)}</strong>
        </p>

        <p>
          <span>Retención ISR 15%</span>
          <strong>- {money.format(totals.isrRetention)}</strong>
        </p>

        <p>
          <span>Total retenciones</span>
          <strong>- {money.format(totals.totalRetentions)}</strong>
        </p>
      </>
    )}

    <p className="big">
      <span>{t("invoices.fields.total")}</span>
      <strong>{money.format(totals.total)}</strong>
    </p>

    <p>
      <span>{t("invoices.fields.balance")}</span>
      <strong>{money.format(totals.balance)}</strong>
    </p>
  </div>
</div>
</div>

            <div className="qb-modal-actions">
                <button
                  className="qb-secondary-btn"
                  onClick={() => setPreviewModalOpen(false)}
                >
                  {t("invoices.actions.backToEdit")}
                </button>

                <button
                    type="button"
                    className="qb-primary-btn"
                    style={{
                      backgroundColor: invoiceColor,
                      borderColor: invoiceColor,
                    }}
                    disabled={saving || hasStockError}
                    onClick={() => saveInvoice("issued")}
                  >
                  {saving ? <Loader2 size={16} className="qb-spin" /> : <FileText size={16} />}
                  {saving
                    ? electronicInvoicingActive
                      ? "Emitiendo e-CF..."
                      : "Generando factura..."
                    : electronicInvoicingActive
                    ? "Emitir e-CF"
                    : "Generar factura"}
                </button>
              </div>
            </div>
          </div>
        )}
        {saving && (
          <div className="qb-saving-overlay">
            <div className="qb-saving-box">
              <div className="qb-saving-loader">
                <Loader2 size={34} className="qb-spin" />
              </div>

              <strong>
                {electronicInvoicingActive
                  ? "Emitiendo e-CF..."
                  : "Generando factura..."}
              </strong>

              <p>
                {electronicInvoicingActive
                  ? "Estamos generando la factura electrónica y enviándola a la DGII."
                  : "Estamos generando la factura. Esto puede tardar unos segundos."}
              </p>
            </div>
          </div>
        )}
    </div>
  );
}