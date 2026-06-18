import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Barcode,
  Boxes,
  ClipboardList,
  Edit,
  History,
  Package,
  PackageCheck,
  PackageMinus,
  PackagePlus,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
  Download,
  Upload,
  Camera,
  ImagePlus,
} from "lucide-react";
import { api } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import * as XLSX from "xlsx";
import { isDominicanTenant } from "../../utils/taxConfig";
import es from "../../i18n/locales/es.json";
import en from "../../i18n/locales/en.json";

const emptyForm = {
  name: "",
  sku: "",
  barcode: "",
  description: "",
  category: "",
  unit: "unidad",
  productType: "product",
  trackStock: true,
  costPrice: "",
  salePrice: "",
  stock: "",
  minStock: "",
  imageDataUrl: "",
  showInCatalog: true,
};

const emptyMovementForm = {
  type: "entry",
  quantity: "",
  newStock: "",
  reason: "",
  referenceNumber: "",
};

const normalizeHeader = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

const findValue = (row, aliases) => {
  const entries = Object.entries(row);

  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);

    const found = entries.find(([key]) => normalizeHeader(key) === normalizedAlias);

    if (found) return found[1];
  }

  return "";
};

const parseImportNumber = (value) => {
  if (value === undefined || value === null || value === "") return 0;

  const cleaned = String(value)
    .replace("RD$", "")
    .replace("$", "")
    .replace(/,/g, "")
    .trim();

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : 0;
};

const parseImportInteger = (value) => {
  const number = parseInt(parseImportNumber(value), 10);
  return Number.isFinite(number) ? number : 0;
};

const mapImportRow = (row) => {
  const name = findValue(row, [
    "nombre",
    "producto",
    "descripcion producto",
    "articulo",
    "artículo",
    "item",
    "product",
    "name",
  ]);

  const sku = findValue(row, ["sku", "codigo", "código", "referencia", "ref"]);

  const barcode = findValue(row, [
    "codigo barras",
    "código barras",
    "codigo de barras",
    "código de barras",
    "barcode",
    "ean",
  ]);

  const category = findValue(row, [
    "categoria",
    "categoría",
    "familia",
    "departamento",
    "category",
  ]);

  const description = findValue(row, [
    "descripcion",
    "descripción",
    "detalle",
    "observacion",
    "observación",
  ]);

  const unit = findValue(row, ["unidad", "unidad medida", "unit"]) || "unidad";

  const costPrice = findValue(row, [
    "costo",
    "precio costo",
    "precio compra",
    "cost",
    "costprice",
  ]);

  const salePrice = findValue(row, [
    "precio",
    "precio venta",
    "venta",
    "precio publico",
    "precio público",
    "saleprice",
  ]);

  const stock = findValue(row, [
    "stock",
    "existencia",
    "existencias",
    "cantidad",
    "qty",
    "quantity",
  ]);

  const minStock = findValue(row, [
    "stock minimo",
    "stock mínimo",
    "minimo",
    "mínimo",
    "minstock",
  ]);

  return {
    name: String(name || "").trim(),
    sku: String(sku || "").trim(),
    barcode: String(barcode || "").trim(),
    category: String(category || "").trim(),
    description: String(description || "").trim(),
    unit: String(unit || "unidad").trim(),
    productType: "product",
    trackStock: true,
    costPrice: parseImportNumber(costPrice),
    salePrice: parseImportNumber(salePrice),
    stock: parseImportInteger(stock),
    minStock: parseImportInteger(minStock),
  };
};


const movementBadgeClass = {
  entry: "badge ok",
  return: "badge ok",
  exit: "badge danger",
  waste: "badge danger",
  adjustment: "badge warning",
};

export default function Inventory() {
  const { user, tenant, language } = useAuth();
  const dictionary = language === "en" ? en : es;

  const t = (path, fallback = path, vars = {}) => {
    const value = path
      .split(".")
      .reduce((acc, key) => acc?.[key], dictionary);

    const text = value || fallback || path;

    return Object.entries(vars).reduce(
      (acc, [key, val]) => acc.replaceAll(`{{${key}}}`, val),
      text
    );
  };

  const getMovementLabel = (type) =>
    t(`inventory.movements.types.${type}`, type);

  const getProductTypeLabel = (type) =>
    type === "service" ? t("inventory.common.service") : t("inventory.common.product");

  const getStatusLabel = ({ isService, controlsStock, isLowStock }) => {
    if (productStatus === "inactive") return t("inventory.status.inactive");
    if (isService) return t("inventory.common.service");
    if (!controlsStock) return t("inventory.status.noControl");
    return isLowStock ? t("inventory.status.lowStock") : t("inventory.status.available");
  };
  const isDO = isDominicanTenant(tenant);
  const locale = isDO ? "es-DO" : "en-US";
  const currency = isDO ? "DOP" : "USD";
   
  const [products, setProducts] = useState([]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(true);

  
  const [pagination, setPagination] = useState({
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 1,
});

const [inventorySummary, setInventorySummary] = useState({
  totalProducts: 0,
  totalServices: 0,
  lowStock: 0,
  inventoryValue: 0,
});
  const [search, setSearch] = useState("");
  const [productStatus, setProductStatus] = useState("active");
  const [productTypeFilter, setProductTypeFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [movementsModalOpen, setMovementsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedInventoryProduct, setSelectedInventoryProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [movementProduct, setMovementProduct] = useState(null);
  const [movementForm, setMovementForm] = useState(emptyMovementForm);
  const [savingMovement, setSavingMovement] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleteMovementsCount, setDeleteMovementsCount] = useState(0);
  const [checkingDelete, setCheckingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

 const money = useMemo(
  () =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }),
  [locale, currency]
);

const formatDate = (value) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
};

const stats = useMemo(() => {
  return {
    totalProducts: inventorySummary.totalProducts || 0,
    totalServices: inventorySummary.totalServices || 0,
    totalStock: 0,
    inventoryValue: inventorySummary.inventoryValue || 0,
    lowStock: inventorySummary.lowStock || 0,
  };
}, [inventorySummary]);

const loadProducts = async (pageToLoad = pagination.page) => {
  try {
    setLoading(true);

    const params = new URLSearchParams({
      search,
      status: productStatus,
      type: productTypeFilter,
      paginated: "true",
      page: pageToLoad,
      limit: pagination.limit,
    });

    const { data } = await api.get(`/products?${params.toString()}`);

    setProducts(data.data || []);
    setPagination(data.pagination || {
      page: 1,
      limit: 25,
      total: 0,
      totalPages: 1,
    });
    setInventorySummary(data.summary || {
      totalProducts: 0,
      totalServices: 0,
      lowStock: 0,
      inventoryValue: 0,
    });
  } catch (error) {
    console.log(error);
    alert(error.response?.data?.message || t("inventory.messages.loadError"));
  } finally {
    setLoading(false);
  }
};

 const exportInventoryToExcel = () => {
  if (!products.length) {
    alert(t("inventory.messages.noProductsToExport"));
    return;
  }

  const rows = products.map((product) => {
    const isService = product.productType === "service";
    const controlsStock = !isService && product.trackStock !== false;

    return {
      [t("inventory.export.name")]: product.name || "",
      [t("inventory.export.type")]: getProductTypeLabel(product.productType),
      SKU: product.sku || "",
      [t("inventory.export.barcode")]: product.barcode || "",
      [t("inventory.export.category")]: product.category || "",
      [t("inventory.export.unit")]: product.unit || "",
      [t("inventory.export.description")]: product.description || "",
      [t("inventory.export.cost")]: Number(product.costPrice || 0),
      [t("inventory.export.salePrice")]: Number(product.salePrice || 0),
      [t("inventory.export.controlsStock")]: controlsStock ? t("inventory.common.yes") : t("inventory.common.no"),
      Stock: controlsStock ? Number(product.stock || 0) : "",
      [t("inventory.export.minStock")]: controlsStock ? Number(product.minStock || 0) : "",
      [t("inventory.export.status")]: productStatus === "inactive" ? t("inventory.status.inactive") : t("inventory.status.active"),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, t("inventory.title"));

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${t("inventory.export.filePrefix")}-${today}.xlsx`);
};

const confirmImportInventory = async () => {
  const validRows = importRows.filter((row) => row.name);

  if (!validRows.length) {
    alert(t("inventory.messages.noValidProducts"));
    return;
  }

  try {
    setImporting(true);

    const { data } = await api.post("/products/import", {
      products: validRows,
      updateExisting,
    });

    alert(
      t("inventory.messages.importCompleted", "", { created: data.created, updated: data.updated, skipped: data.skipped })
    );

    setImportModalOpen(false);
    setImportRows([]);
    setImportErrors([]);
    await loadProducts(1);
  } catch (error) {
    console.log(error);
    alert(error.response?.data?.message || t("inventory.messages.importError"));
  } finally {
    setImporting(false);
  }
};

const handleImportFile = async (event) => {
  const file = event.target.files?.[0];

  event.target.value = "";

  if (!file) return;

  const maxImportSize = 3 * 1024 * 1024;

  if (file.size > maxImportSize) {
    alert(t("inventory.messages.fileTooLarge"));
    return;
  }

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const jsonRows = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
    });

    const mappedRows = jsonRows
      .map(mapImportRow)
      .filter((row) =>
        Object.values(row).some((value) => String(value || "").trim() !== "")
      );

    const errors = mappedRows
      .map((row, index) => {
        if (!row.name) {
          return {
            row: index + 2,
            message: t("inventory.messages.missingProductName"),
          };
        }

        return null;
      })
      .filter(Boolean);

    setImportRows(mappedRows);
    setImportErrors(errors);
    setImportModalOpen(true);
  } catch (error) {
    console.log(error);
    alert(t("inventory.messages.readFileError"));
  }
};



  useEffect(() => {
  const timer = setTimeout(() => {
    loadProducts(1);
  }, 350);

  return () => clearTimeout(timer);
}, [search, productStatus, productTypeFilter]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (product) => {
    const productType = product.productType || "product";

    setEditingProduct(product);
    setForm({
      name: product.name || "",
      sku: product.sku || "",
      barcode: product.barcode || "",
      description: product.description || "",
      category: product.category || "",
      unit: product.unit || "unidad",
      productType,
      trackStock: productType === "service" ? false : product.trackStock !== false,
      costPrice: product.costPrice || "",
      salePrice: product.salePrice || "",
      stock: product.stock || "",
      minStock: product.minStock || "",
      imageDataUrl: product.imageDataUrl || "",
      showInCatalog: product.showInCatalog !== false,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProduct(null);
    setForm(emptyForm);
  };

  

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "productType") {
      const isService = value === "service";
      setForm((prev) => ({
        ...prev,
        productType: value,
        trackStock: isService ? false : true,
        unit: isService ? "servicio" : prev.unit === "servicio" ? "unidad" : prev.unit,
        stock: isService ? "0" : prev.stock,
        minStock: isService ? "0" : prev.minStock,
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resizeImageToDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const maxSize = 900;
        let { width, height } = img;

        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };

      img.onerror = reject;
      img.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const handleProductImageChange = async (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert(t("inventory.messages.invalidImage"));
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert(t("inventory.messages.imageTooLarge"));
    return;
  }

  try {
    const imageDataUrl = await resizeImageToDataUrl(file);

    setForm((prev) => ({
      ...prev,
      imageDataUrl,
    }));
  } catch (error) {
    console.log(error);
    alert(t("inventory.messages.imageProcessError"));
  }
};

const removeProductImage = () => {
  setForm((prev) => ({
    ...prev,
    imageDataUrl: "",
  }));
};

  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert(t("inventory.messages.nameRequired"));
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...form,
        stock: form.productType === "service" || !form.trackStock ? 0 : form.stock,
        minStock:
          form.productType === "service" || !form.trackStock ? 0 : form.minStock,
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
      } else {
        await api.post("/products", payload);
      }

      closeModal();
      loadProducts();
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || t("inventory.messages.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const loadMovements = async (product) => {
    const { data } = await api.get(`/products/${product.id}/movements`);
    setMovements(data);
  };

  const openMovementsModal = async (product) => {
    try {
      setSelectedProduct(product);
      setMovementsModalOpen(true);
      setLoadingMovements(true);
      await loadMovements(product);
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || t("inventory.messages.loadMovementsError"));
    } finally {
      setLoadingMovements(false);
    }
  };

  const closeMovementsModal = () => {
    setMovementsModalOpen(false);
    setSelectedProduct(null);
    setMovements([]);
  };

  const openMovementModal = (product) => {
    if (product.productType === "service" || product.trackStock === false) {
      alert(t("inventory.messages.noInventoryControl"));
      return;
    }

    setMovementProduct(product);
    setMovementForm(emptyMovementForm);
    setMovementModalOpen(true);
  };

  const closeMovementModal = () => {
    setMovementModalOpen(false);
    setMovementProduct(null);
    setMovementForm(emptyMovementForm);
  };

  const handleMovementChange = (e) => {
    const { name, value } = e.target;
    setMovementForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveMovement = async (e) => {
    e.preventDefault();
    if (!movementProduct) return;

    if (movementForm.type !== "adjustment" && Number(movementForm.quantity) <= 0) {
      alert(t("inventory.messages.quantityGreaterThanZero"));
      return;
    }

    if (movementForm.type === "adjustment" && movementForm.newStock === "") {
      alert(t("inventory.messages.newStockRequired"));
      return;
    }

    try {
      setSavingMovement(true);
      await api.post(`/products/${movementProduct.id}/movements`, movementForm);
      closeMovementModal();
      loadProducts();

      if (selectedProduct?.id === movementProduct.id) {
        await loadMovements(movementProduct);
      }
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || t("inventory.messages.saveMovementError"));
    } finally {
      setSavingMovement(false);
    }
  };

  const openDeleteModal = async (product) => {
    try {
      setProductToDelete(product);
      setDeleteModalOpen(true);
      setDeleteError("");
      setCheckingDelete(true);

      const { data } = await api.get(`/products/${product.id}/movements`);
      setDeleteMovementsCount(data.length);
    } catch (error) {
      console.log(error);
      setDeleteError(t("inventory.messages.validateHistoryError"));
    } finally {
      setCheckingDelete(false);
    }
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setProductToDelete(null);
    setDeleteMovementsCount(0);
    setDeleteError("");
  };

  const confirmDeactivateProduct = async () => {
    if (!productToDelete) return;

    try {
      setDeleting(true);
      await api.delete(`/products/${productToDelete.id}`);
      closeDeleteModal();
      loadProducts();
    } catch (error) {
      console.log(error);
      setDeleteError(
        error.response?.data?.message || t("inventory.messages.deactivateError")
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleReactivate = async (product) => {
    try {
      await api.patch(`/products/${product.id}/reactivate`);
      loadProducts();
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || t("inventory.messages.reactivateError"));
    }
  };

  return (
    <div className="inventory-page">
      <section className="inventory-header">
        <div>
          <span>{t("inventory.eyebrow")}</span>
          <h2>
            {productStatus === "active"
              ? t("inventory.activeTitle")
              : t("inventory.inactiveTitle")}
          </h2>
          <p>{t("inventory.description")}</p>
        </div>

        <div className="inventory-header-actions inventory-header-actions-fixed">

          <label className="secondary-btn import-inventory-btn">
            <Upload size={18} />
            {t("inventory.actions.importExcel")}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportFile}
              hidden
            />
          </label>
          <button
            type="button"
            className="secondary-btn"
            onClick={exportInventoryToExcel}
          >
            <Download size={18} />
            
            {t("inventory.actions.exportExcel")}
          </button>

          <button
            type="button"
            className="secondary-btn"
            onClick={() =>
              setProductStatus(productStatus === "active" ? "inactive" : "active")
            }
          >
            {productStatus === "active" ? t("inventory.actions.viewInactive") : t("inventory.actions.viewActive")}
          </button>

          {productStatus === "active" && (
            <button onClick={openCreateModal} className="primary-btn">
              <Plus size={18} />
              {t("inventory.actions.newProductService")}
            </button>
          )}
        </div>
      </section>

      <section className="inventory-stats">
        <div className="inventory-stat-card">
          <div className="stat-icon"><Package size={22} /></div>
          <div><span>{t("inventory.stats.products")}</span><strong>{stats.totalProducts}</strong></div>
        </div>

        <div className="inventory-stat-card">
          <div className="stat-icon"><ClipboardList size={22} /></div>
          <div><span>{t("inventory.stats.services")}</span><strong>{stats.totalServices}</strong></div>
        </div>

        <div className="inventory-stat-card">
          <div className="stat-icon"><AlertTriangle size={22} /></div>
          <div><span>{t("inventory.stats.lowStock")}</span><strong>{stats.lowStock}</strong></div>
        </div>

        {user?.role === "master" && (
          <div className="inventory-stat-card">
            <div className="stat-icon">
              <Boxes size={22} />
            </div>

            <div>
              <span>{t("inventory.stats.inventoryValue")}</span>
              <strong>{money.format(stats.inventoryValue)}</strong>
            </div>
          </div>
        )}
      </section>

      <section className="inventory-panel">
        <div className="inventory-toolbar">
          <div>
            <h3>{productStatus === "active" ? t("inventory.toolbar.list") : t("inventory.toolbar.inactive")}</h3>
            <p>{t("inventory.toolbar.description")}</p>
          </div>

          <div className="inventory-filters">
            <div className="inventory-search">
              <Search size={18} />
              <input
                placeholder={t("inventory.placeholders.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="inventory-type-filter"
              value={productTypeFilter}
              onChange={(e) => setProductTypeFilter(e.target.value)}
            >
              <option value="all">{t("inventory.filters.all")}</option>
              <option value="product">{t("inventory.stats.products")}</option>
              <option value="service">{t("inventory.stats.services")}</option>
            </select>
          </div>

          <div className="inventory-pagination">
            <span>
              {t("inventory.pagination.showing", "", { page: pagination.page, totalPages: pagination.totalPages, total: pagination.total })}
            </span>

            <div>
              <button
                type="button"
                disabled={pagination.page <= 1 || loading}
                onClick={() => loadProducts(pagination.page - 1)}
              >
                {t("inventory.pagination.previous")}
              </button>

              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => loadProducts(pagination.page + 1)}
              >
                {t("inventory.pagination.next")}
              </button>
            </div>
          </div>


        </div>

        <div className="inventory-table-wrap inventory-desktop-list">
  <table className="inventory-table">
    <thead>
      <tr>
        <th>{t("inventory.fields.productService")}</th>
        <th>SKU</th>
        <th>{t("inventory.fields.barcode")}</th>
        <th>{t("inventory.fields.category")}</th>
        <th>{t("inventory.fields.price")}</th>
        <th>{t("inventory.fields.cost")}</th>
        <th>Stock</th>
        <th>{t("inventory.fields.status")}</th>
        <th></th>
      </tr>
    </thead>

    <tbody>
      {loading ? (
        <tr><td colSpan="9" className="table-empty">{t("inventory.messages.loading")}</td></tr>
      ) : products.length === 0 ? (
        <tr><td colSpan="9" className="table-empty">{t("inventory.messages.empty")}</td></tr>
      ) : (
        products.map((product) => {
          const isService = product.productType === "service";
          const controlsStock = !isService && product.trackStock !== false;
          const isLowStock =
            controlsStock &&
            Number(product.stock || 0) <= Number(product.minStock || 0);

          return (
            <tr key={product.id}>
              <td>
                <div className="product-cell">
                  <div className="product-icon">
                    {isService ? <ClipboardList size={18} /> : <Package size={18} />}
                  </div>
                  <div>
                    <strong>{product.name}</strong>
                    <span>{product.description || getProductTypeLabel(product.productType)}</span>
                  </div>
                </div>
              </td>

              <td>{product.sku || "-"}</td>
              <td>{product.barcode || "-"}</td>
              <td>{product.category || "-"}</td>
              <td>{money.format(Number(product.salePrice || 0))}</td>
              <td>{money.format(Number(product.costPrice || 0))}</td>
              <td>{controlsStock ? `${product.stock} ${product.unit}` : t("inventory.status.notApplicable")}</td>
              <td>
                {productStatus === "inactive" ? (
                  <span className="badge warning">{t("inventory.status.inactive")}</span>
                ) : isService ? (
                  <span className="badge neutral">{t("inventory.common.service")}</span>
                ) : !controlsStock ? (
                  <span className="badge neutral">{t("inventory.status.noControl")}</span>
                ) : (
                  <span className={isLowStock ? "badge danger" : "badge ok"}>
                    {isLowStock ? t("inventory.status.lowStock") : t("inventory.status.available")}
                  </span>
                )}
              </td>

              <td>
                <div className="table-actions">
                  {productStatus === "active" && controlsStock && (
                    <button onClick={() => openMovementModal(product)} title={t("inventory.actions.movement")}>
                      <PackagePlus size={17} />
                    </button>
                  )}

                  <button onClick={() => openMovementsModal(product)} title={t("inventory.actions.history")}>
                    <History size={17} />
                  </button>

                  {productStatus === "active" ? (
                    <>
                      <button onClick={() => openEditModal(product)} title={t("inventory.actions.edit")}>
                        <Edit size={17} />
                      </button>
                      <button className="danger-btn" onClick={() => openDeleteModal(product)} title={t("inventory.actions.deactivate")}>
                        <Trash2 size={17} />
                      </button>
                    </>
                  ) : (
                    <button className="reactivate-btn" onClick={() => handleReactivate(product)} title={t("inventory.actions.reactivate")}>
                      <RotateCcw size={16} /> {t("inventory.actions.reactivate")}
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

<div className="inventory-mobile-list">
  {loading ? (
    <div className="inventory-mobile-empty">{t("inventory.messages.loadingProducts")}</div>
  ) : products.length ? (
    products.map((product) => {
      const isService = product.productType === "service";
      const controlsStock = !isService && product.trackStock !== false;
      const isLowStock =
        controlsStock &&
        Number(product.stock || 0) <= Number(product.minStock || 0);

      return (
        <button
          type="button"
          key={product.id}
          className="inventory-mobile-card"
          onClick={() => setSelectedInventoryProduct(product)}
        >
          <div className="inventory-mobile-top">
            <div className="inventory-mobile-product-main">
              <div className="product-icon">
                {isService ? <ClipboardList size={18} /> : <Package size={18} />}
              </div>

              <div>
                <span>{getProductTypeLabel(product.productType)}</span>
                <strong>{product.name}</strong>
              </div>
            </div>

            {productStatus === "inactive" ? (
              <span className="badge warning">{t("inventory.status.inactive")}</span>
            ) : isService ? (
              <span className="badge neutral">{t("inventory.common.service")}</span>
            ) : !controlsStock ? (
              <span className="badge neutral">{t("inventory.status.noControl")}</span>
            ) : (
              <span className={isLowStock ? "badge danger" : "badge ok"}>
                {isLowStock ? t("inventory.status.lowStock") : t("inventory.status.available")}
              </span>
            )}
          </div>

          <div className="inventory-mobile-description">
            {product.description || product.category || t("inventory.messages.noDescription")}
          </div>

          <div className="inventory-mobile-money-grid">
            <div>
              <span>{t("inventory.fields.price")}</span>
              <strong>{money.format(Number(product.salePrice || 0))}</strong>
            </div>

            <div>
              <span>Stock</span>
              <strong>{controlsStock ? `${product.stock} ${product.unit}` : t("inventory.status.notApplicable")}</strong>
            </div>
          </div>

          <div className="inventory-mobile-footer">
            <span>SKU {product.sku || "-"}</span>
            <strong>{t("inventory.actions.viewDetail")}</strong>
          </div>
        </button>
      );
    })
  ) : (
    <div className="inventory-mobile-empty">{t("inventory.messages.empty")}</div>
  )}
</div>

{selectedInventoryProduct && (
  <div
    className="inventory-detail-overlay"
    onClick={() => setSelectedInventoryProduct(null)}
  >
    <div
      className="inventory-detail-modal"
      onClick={(e) => e.stopPropagation()}
    >
      {(() => {
        const product = selectedInventoryProduct;
        const isService = product.productType === "service";
        const controlsStock = !isService && product.trackStock !== false;
        const isLowStock =
          controlsStock &&
          Number(product.stock || 0) <= Number(product.minStock || 0);

        return (
          <>
            <div className="inventory-detail-header">
              <div>
                <span>{t("inventory.detail.title")}</span>
                <h3>{product.name}</h3>
              </div>

              <button type="button" onClick={() => setSelectedInventoryProduct(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="inventory-detail-status">
              {productStatus === "inactive" ? (
                <span className="badge warning">{t("inventory.status.inactive")}</span>
              ) : isService ? (
                <span className="badge neutral">{t("inventory.common.service")}</span>
              ) : !controlsStock ? (
                <span className="badge neutral">{t("inventory.status.noControl")}</span>
              ) : (
                <span className={isLowStock ? "badge danger" : "badge ok"}>
                  {isLowStock ? t("inventory.status.lowStock") : t("inventory.status.available")}
                </span>
              )}
            </div>

            <div className="inventory-detail-list">
              <div>
                <span>{t("inventory.fields.type")}</span>
                <strong>{getProductTypeLabel(product.productType)}</strong>
              </div>

              <div>
                <span>{t("inventory.fields.description")}</span>
                <strong>{product.description || "-"}</strong>
              </div>

              <div>
                <span>SKU</span>
                <strong>{product.sku || "-"}</strong>
              </div>

              <div>
                <span>{t("inventory.fields.barcode")}</span>
                <strong>{product.barcode || "-"}</strong>
              </div>

              <div>
                <span>{t("inventory.fields.category")}</span>
                <strong>{product.category || "-"}</strong>
              </div>

              <div>
                <span>{t("inventory.fields.salePrice")}</span>
                <strong>{money.format(Number(product.salePrice || 0))}</strong>
              </div>

              <div>
                <span>{t("inventory.fields.cost")}</span>
                <strong>{money.format(Number(product.costPrice || 0))}</strong>
              </div>

              <div>
                <span>Stock</span>
                <strong>{controlsStock ? `${product.stock} ${product.unit}` : t("inventory.status.notApplicable")}</strong>
              </div>

              <div>
                <span>{t("inventory.fields.minStock")}</span>
                <strong>{controlsStock ? `${product.minStock || 0} ${product.unit}` : t("inventory.status.notApplicable")}</strong>
              </div>
            </div>

            <div className="inventory-detail-actions">
              {productStatus === "active" && controlsStock && (
                <button
                  type="button"
                  className="inventory-action-btn inventory-primary-action"
                  onClick={() => {
                    openMovementModal(product);
                    setSelectedInventoryProduct(null);
                  }}
                >
                  <PackagePlus size={16} />
                  {t("inventory.actions.movement")}
                </button>
              )}

              <button
                type="button"
                className="inventory-action-btn"
                onClick={() => {
                  openMovementsModal(product);
                  setSelectedInventoryProduct(null);
                }}
              >
                <History size={16} />
                {t("inventory.actions.history")}
              </button>

              {productStatus === "active" ? (
                <>
                  <button
                    type="button"
                    className="inventory-action-btn"
                    onClick={() => {
                      openEditModal(product);
                      setSelectedInventoryProduct(null);
                    }}
                  >
                    <Edit size={16} />
                    {t("inventory.actions.edit")}
                  </button>

                  <button
                    type="button"
                    className="inventory-danger-action"
                    onClick={() => {
                      openDeleteModal(product);
                      setSelectedInventoryProduct(null);
                    }}
                  >
                    <Trash2 size={16} />
                    {t("inventory.actions.deactivate")}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="inventory-action-btn inventory-primary-action"
                  onClick={() => {
                    handleReactivate(product);
                    setSelectedInventoryProduct(null);
                  }}
                >
                  <RotateCcw size={16} />
                  {t("inventory.actions.reactivate")}
                </button>
              )}
            </div>
          </>
        );
      })()}
    </div>
  </div>
)}
      </section>

      {modalOpen && (
        <div className="modal-overlay">
          <div className="product-modal">
            <div className="modal-header">
              <div>
                <span>{editingProduct ? t("inventory.actions.edit") : t("inventory.actions.new")}</span>
                <h3>{editingProduct ? t("inventory.form.updateTitle") : t("inventory.form.createTitle")}</h3>
              </div>
              <button onClick={closeModal} className="modal-close"><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} className="product-form">

              <div className="form-row full">
  <label>{t("inventory.form.productImage")}</label>

  <div className="product-image-uploader">
    <div className="product-image-preview">
      {form.imageDataUrl ? (
        <img src={form.imageDataUrl} alt={t("inventory.common.product")} />
      ) : (
        <ImagePlus size={36} />
      )}
    </div>

    <div className="product-image-actions">
      <label className="secondary-btn">
        <Upload size={17} />
        {t("inventory.actions.uploadImage")}
        <input
          type="file"
          accept="image/*"
          onChange={handleProductImageChange}
          hidden
        />
      </label>

      <label className="secondary-btn">
        <Camera size={17} />
        {t("inventory.actions.takePhoto")}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleProductImageChange}
          hidden
        />
      </label>

      {form.imageDataUrl && (
        <button type="button" className="cancel-btn" onClick={removeProductImage}>
          {t("inventory.actions.removeImage")}
        </button>
      )}
    </div>
  </div>
</div>

<div className="form-row checkbox-row">
  <label>{t("inventory.form.showInCatalog")}</label>
  <label className="switch-line">
    <input
      type="checkbox"
      name="showInCatalog"
      checked={form.showInCatalog}
      onChange={handleChange}
      disabled={form.productType === "service"}
    />
    <span>{form.showInCatalog ? t("inventory.status.visible") : t("inventory.status.hidden")}</span>
  </label>
</div>
              <div className="form-row">
                <label>{t("inventory.fields.typeRequired")}</label>
                <select name="productType" value={form.productType} onChange={handleChange}>
                  <option value="product">{t("inventory.common.product")}</option>
                  <option value="service">{t("inventory.common.service")}</option>
                </select>
              </div>

              <div className="form-row checkbox-row">
                <label>{t("inventory.form.inventoryControl")}</label>
                <label className="switch-line">
                  <input
                    type="checkbox"
                    name="trackStock"
                    checked={form.trackStock}
                    onChange={handleChange}
                    disabled={form.productType === "service"}
                  />
                  <span>{form.trackStock ? t("inventory.status.active") : t("inventory.status.notApplicable")}</span>
                </label>
              </div>

              <div className="form-row full">
                <label>{t("inventory.fields.nameRequired")}</label>
                <input name="name" value={form.name} onChange={handleChange} placeholder={t("inventory.placeholders.name")} />
              </div> 


              <div className="form-row">
                <label>{t("inventory.fields.barcode")}</label>
                <div className="input-with-icon">
                  <Barcode size={17} />
                  <input name="barcode" value={form.barcode} onChange={handleChange} placeholder={t("inventory.placeholders.barcode")} />
                </div>
              </div>

              <div className="form-row">
                <label>{t("inventory.fields.category")}</label>
                <input name="category" value={form.category} onChange={handleChange} placeholder={t("inventory.placeholders.category")} />
              </div>

              <div className="form-row">
                <label>{t("inventory.fields.unit")}</label>
                <select name="unit" value={form.unit} onChange={handleChange}>
                  <option value="unidad">{t("inventory.units.unit")}</option>
                  <option value="caja">{t("inventory.units.box")}</option>
                  <option value="paquete">{t("inventory.units.package")}</option>
                  <option value="servicio">{t("inventory.units.service")}</option>
                  <option value="metro">{t("inventory.units.meter")}</option>
                  <option value="libra">{t("inventory.units.pound")}</option>
                  <option value="hora">{t("inventory.units.hour")}</option>
                </select>
              </div>

              {form.productType !== "service" && form.trackStock && (
                <>
                  <div className="form-row">
                    <label>{t("inventory.fields.initialStock")}</label>
                    <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} placeholder="0" />
                  </div>

                  <div className="form-row">
                    <label>{t("inventory.fields.minStock")}</label>
                    <input name="minStock" type="number" min="0" value={form.minStock} onChange={handleChange} placeholder="0" />
                  </div>
                </>
              )}

              <div className="form-row">
                <label>{t("inventory.fields.cost")}</label>
                <input name="costPrice" type="number" min="0" step="0.01" value={form.costPrice} onChange={handleChange} placeholder="0.00" />
              </div>

              <div className="form-row">
                <label>{t("inventory.fields.salePrice")}</label>
                <input name="salePrice" type="number" min="0" step="0.01" value={form.salePrice} onChange={handleChange} placeholder="0.00" />
              </div>

              <div className="form-row full">
                <label>{t("inventory.fields.description")}</label>
                <textarea name="description" value={form.description} onChange={handleChange} placeholder={t("inventory.placeholders.description")} />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="cancel-btn">{t("inventory.actions.cancel")}</button>
                <button disabled={saving} className="primary-btn">{saving ? t("inventory.actions.saving") : t("inventory.actions.save")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {movementModalOpen && (
        <div className="modal-overlay">
          <div className="movement-form-modal">
            <div className="modal-header">
              <div>
                <span>{t("inventory.movements.manual")}</span>
                <h3>{movementProduct?.name}</h3>
              </div>
              <button onClick={closeMovementModal} className="modal-close"><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveMovement} className="product-form">
              <div className="movement-current-stock full">
                {t("inventory.movements.currentStock")}: <strong>{movementProduct?.stock || 0} {movementProduct?.unit}</strong>
              </div>

              <div className="form-row">
                <label>{t("inventory.movements.type")}</label>
                <select name="type" value={movementForm.type} onChange={handleMovementChange}>
                  <option value="entry">{t("inventory.movements.types.entry")}</option>
                  <option value="exit">{t("inventory.movements.types.exit")}</option>
                  <option value="adjustment">{t("inventory.movements.types.adjustment")}</option>
                  <option value="return">{t("inventory.movements.types.return")}</option>
                  <option value="waste">{t("inventory.movements.types.waste")}</option>
                </select>
              </div>

              {movementForm.type === "adjustment" ? (
                <div className="form-row">
                  <label>{t("inventory.movements.newStock")}</label>
                  <input name="newStock" type="number" min="0" value={movementForm.newStock} onChange={handleMovementChange} placeholder="0" />
                </div>
              ) : (
                <div className="form-row">
                  <label>{t("inventory.movements.quantity")}</label>
                  <input name="quantity" type="number" min="1" value={movementForm.quantity} onChange={handleMovementChange} placeholder="0" />
                </div>
              )}

              <div className="form-row full">
                <label>{t("inventory.movements.reason")}</label>
                <input name="reason" value={movementForm.reason} onChange={handleMovementChange} placeholder={t("inventory.placeholders.reason")} />
              </div>

              <div className="form-row full">
                <label>{t("inventory.movements.reference")}</label>
                <input name="referenceNumber" value={movementForm.referenceNumber} onChange={handleMovementChange} placeholder={t("inventory.placeholders.reference")} />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeMovementModal} className="cancel-btn">{t("inventory.actions.cancel")}</button>
                <button disabled={savingMovement} className="primary-btn">
                  {savingMovement ? t("inventory.actions.registering") : t("inventory.actions.registerMovement")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {movementsModalOpen && (
        <div className="modal-overlay">
          <div className="movements-modal">
            <div className="modal-header">
              <div>
                <span>{t("inventory.movements.historyTitle")}</span>
                <h3>{selectedProduct?.name}</h3>
              </div>
              <button onClick={closeMovementsModal} className="modal-close"><X size={20} /></button>
            </div>

            <div className="movements-content">
              {loadingMovements ? (
                <div className="table-empty">{t("inventory.messages.loadingMovements")}</div>
              ) : movements.length === 0 ? (
                <div className="table-empty">{t("inventory.messages.noMovements")}</div>
              ) : (
                <>
  <table className="movements-table movements-desktop-table">
    <thead>
      <tr>
        <th>{t("inventory.movements.user")}</th>
        <th>{t("inventory.fields.type")}</th>
        <th>{t("inventory.movements.quantity")}</th>
        <th>{t("inventory.pagination.previous")}</th>
        <th>{t("inventory.movements.new")}</th>
        <th>{t("inventory.movements.reference")}</th>
        <th>{t("inventory.movements.reason")}</th>
        <th>{t("inventory.movements.date")}</th>
      </tr>
    </thead>

    <tbody>
      {movements.map((movement) => (
        <tr key={movement.id}>
          <td>{movement.user?.name || t("inventory.common.system")}</td>
          <td>
            <span className={movementBadgeClass[movement.type] || "badge warning"}>
              {getMovementLabel(movement.type)}
            </span>
          </td>
          <td>{movement.quantity}</td>
          <td>{movement.previousStock}</td>
          <td>{movement.newStock}</td>
          <td>{movement.referenceNumber || movement.referenceType || "-"}</td>
          <td>{movement.reason}</td>
          <td>{formatDate(movement.createdAt)}</td>
        </tr>
      ))}
    </tbody>
  </table>

  <div className="movements-mobile-list">
    {movements.map((movement) => (
      <div className="movement-mobile-card" key={movement.id}>
        <div className="movement-mobile-top">
          <div>
            <span>{t("inventory.actions.movement")}</span>
            <strong>
              {getMovementLabel(movement.type)}
            </strong>
          </div>

          <span className={movementBadgeClass[movement.type] || "badge warning"}>
            {getMovementLabel(movement.type)}
          </span>
        </div>

        <div className="movement-mobile-grid">
          <div>
            <span>{t("inventory.movements.user")}</span>
            <strong>{movement.user?.name || t("inventory.common.system")}</strong>
          </div>

          <div>
            <span>{t("inventory.movements.quantity")}</span>
            <strong>{movement.quantity}</strong>
          </div>

          <div>
            <span>{t("inventory.movements.previousStock")}</span>
            <strong>{movement.previousStock}</strong>
          </div>

          <div>
            <span>{t("inventory.movements.newStock")}</span>
            <strong>{movement.newStock}</strong>
          </div>

          <div>
            <span>{t("inventory.movements.reference")}</span>
            <strong>{movement.referenceNumber || movement.referenceType || "-"}</strong>
          </div>

          <div>
            <span>{t("inventory.movements.date")}</span>
            <strong>{formatDate(movement.createdAt)}</strong>
          </div>
        </div>

        <div className="movement-mobile-reason">
          <span>{t("inventory.movements.reason")}</span>
          <strong>{movement.reason || "-"}</strong>
        </div>
      </div>
    ))}
  </div>
</>
              )}
            </div>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div className="modal-overlay">
          <div className="delete-modal">
            <div className="delete-modal-icon"><Trash2 size={28} /></div>
            <h3>{t("inventory.delete.title")}</h3>
            <p>{t("inventory.delete.question")} <strong>{productToDelete?.name}</strong>?</p>

            {checkingDelete ? (
              <div className="delete-warning">{t("inventory.delete.validating")}</div>
            ) : deleteMovementsCount > 0 ? (
              <div className="delete-warning">
                {t("inventory.delete.hasMovements", "", { count: deleteMovementsCount })}
              </div>
            ) : (
              <div className="delete-warning">{t("inventory.delete.noMovements")}</div>
            )}

            {deleteError && <div className="delete-error">{deleteError}</div>}

            <div className="delete-actions">
              <button onClick={closeDeleteModal} className="cancel-btn">{t("inventory.actions.cancel")}</button>
              <button onClick={confirmDeactivateProduct} disabled={deleting || checkingDelete} className="delete-confirm-btn">
                {deleting ? t("inventory.actions.deactivating") : t("inventory.actions.deactivate")}
              </button>
            </div>
          </div>
        </div>
      )}

{importModalOpen && (
  <div className="modal-overlay">
    <div className="import-inventory-modal">
      <div className="modal-header">
        <div>
          <span>{t("inventory.import.title")}</span>
          <h3>{t("inventory.import.preview")}</h3>
        </div>

        <button
          type="button"
          onClick={() => setImportModalOpen(false)}
          className="modal-close"
        >
          <X size={20} />
        </button>
      </div>

      <div className="import-summary-grid">
        <div>
          <span>{t("inventory.import.rowsDetected")}</span>
          <strong>{importRows.length}</strong>
        </div>

        <div>
          <span>{t("inventory.import.validProducts")}</span>
          <strong>{importRows.filter((row) => row.name).length}</strong>
        </div>

        <div>
          <span>{t("inventory.import.withErrors")}</span>
          <strong>{importErrors.length}</strong>
        </div>
      </div>

      <label className="import-update-option">
        <input
          type="checkbox"
          checked={updateExisting}
          onChange={(e) => setUpdateExisting(e.target.checked)}
        />
        {t("inventory.import.updateExisting")}
      </label>

      {importErrors.length > 0 && (
        <div className="import-errors">
          <strong>{t("inventory.import.detectedErrors")}</strong>

          {importErrors.slice(0, 8).map((error) => (
            <p key={`${error.row}-${error.message}`}>
              {t("inventory.import.rowError", "", { row: error.row, message: error.message })}
            </p>
          ))}
        </div>
      )}

      <div className="import-preview-table">
        <table>
          <thead>
            <tr>
              <th>{t("inventory.common.product")}</th>
              <th>SKU</th>
              <th>{t("inventory.fields.barcode")}</th>
              <th>{t("inventory.fields.category")}</th>
              <th>Stock</th>
              <th>{t("inventory.fields.cost")}</th>
              <th>{t("inventory.fields.price")}</th>
            </tr>
          </thead>

          <tbody>
            {importRows.slice(0, 10).map((row, index) => (
              <tr key={`${row.name}-${index}`}>
                <td>{row.name || "—"}</td>
                <td>{row.sku || "—"}</td>
                <td>{row.barcode || "—"}</td>
                <td>{row.category || "—"}</td>
                <td>{row.stock}</td>
                <td>{money.format(Number(row.costPrice || 0))}</td>
                <td>{money.format(Number(row.salePrice || 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="modal-actions">
        <button
          type="button"
          onClick={() => setImportModalOpen(false)}
          className="cancel-btn"
        >
          {t("inventory.actions.cancel")}
        </button>

        <button
          type="button"
          className="primary-btn"
          disabled={importing || importRows.filter((row) => row.name).length === 0}
          onClick={confirmImportInventory}
        >
          {importing ? t("inventory.actions.importing") : t("inventory.actions.confirmImport")}
        </button>
      </div>
    </div>
  </div>
)}       

    </div>
  );
}