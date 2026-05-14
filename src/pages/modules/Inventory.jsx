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
  Download
} from "lucide-react";
import { api } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import * as XLSX from "xlsx";

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
};

const emptyMovementForm = {
  type: "entry",
  quantity: "",
  newStock: "",
  reason: "",
  referenceNumber: "",
};

const movementLabels = {
  entry: "Entrada",
  exit: "Salida",
  adjustment: "Ajuste",
  return: "Devolución",
  waste: "Merma",
};

const movementBadgeClass = {
  entry: "badge ok",
  return: "badge ok",
  exit: "badge danger",
  waste: "badge danger",
  adjustment: "badge warning",
};

export default function Inventory() {
  const { user } = useAuth();
   
  const [products, setProducts] = useState([]);

  
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

  const money = new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  });

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
    alert(error.response?.data?.message || "Error cargando productos");
  } finally {
    setLoading(false);
  }
};

  const exportInventoryToExcel = () => {
  if (!products.length) {
    alert("No hay productos para exportar.");
    return;
  }

  const rows = products.map((product) => {
    const isService = product.productType === "service";
    const controlsStock = !isService && product.trackStock !== false;

    return {
      Nombre: product.name || "",
      Tipo: isService ? "Servicio" : "Producto",
      SKU: product.sku || "",
      "Código de barras": product.barcode || "",
      Categoría: product.category || "",
      Unidad: product.unit || "",
      Descripción: product.description || "",
      Costo: Number(product.costPrice || 0),
      "Precio venta": Number(product.salePrice || 0),
      "Controla inventario": controlsStock ? "Sí" : "No",
      Stock: controlsStock ? Number(product.stock || 0) : "",
      "Stock mínimo": controlsStock ? Number(product.minStock || 0) : "",
      Estado: productStatus === "inactive" ? "Inactivo" : "Activo",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `inventario-${today}.xlsx`);
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

  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("El nombre es obligatorio");
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
      alert(error.response?.data?.message || "Error guardando producto");
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
      alert(error.response?.data?.message || "Error cargando movimientos");
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
      alert("Este servicio/producto no controla inventario.");
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
      alert("La cantidad debe ser mayor a cero");
      return;
    }

    if (movementForm.type === "adjustment" && movementForm.newStock === "") {
      alert("Indica el nuevo stock");
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
      alert(error.response?.data?.message || "Error registrando movimiento");
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
      setDeleteError("No se pudo validar el historial del producto.");
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
        error.response?.data?.message || "Error desactivando producto"
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
      alert(error.response?.data?.message || "Error reactivando producto");
    }
  };

  return (
    <div className="inventory-page">
      <section className="inventory-header">
        <div>
          <span>Inventario PRO</span>
          <h2>
            {productStatus === "active"
              ? "Productos, servicios y existencias"
              : "Productos inactivos"}
          </h2>
          <p>
            Controla productos, servicios, stock mínimo, código de barras,
            movimientos manuales y kardex por producto.
          </p>
        </div>

        <div className="inventory-header-actions inventory-header-actions-fixed">
          <button
            type="button"
            className="secondary-btn"
            onClick={exportInventoryToExcel}
          >
            <Download size={18} />
            
            Exportar Excel
          </button>

          <button
            type="button"
            className="secondary-btn"
            onClick={() =>
              setProductStatus(productStatus === "active" ? "inactive" : "active")
            }
          >
            {productStatus === "active" ? "Ver inactivos" : "Ver activos"}
          </button>

          {productStatus === "active" && (
            <button onClick={openCreateModal} className="primary-btn">
              <Plus size={18} />
              Nuevo producto/servicio
            </button>
          )}
        </div>
      </section>

      <section className="inventory-stats">
        <div className="inventory-stat-card">
          <div className="stat-icon"><Package size={22} /></div>
          <div><span>Productos</span><strong>{stats.totalProducts}</strong></div>
        </div>

        <div className="inventory-stat-card">
          <div className="stat-icon"><ClipboardList size={22} /></div>
          <div><span>Servicios</span><strong>{stats.totalServices}</strong></div>
        </div>

        <div className="inventory-stat-card">
          <div className="stat-icon"><AlertTriangle size={22} /></div>
          <div><span>Stock bajo</span><strong>{stats.lowStock}</strong></div>
        </div>

        {user?.role === "master" && (
          <div className="inventory-stat-card">
            <div className="stat-icon">
              <Boxes size={22} />
            </div>

            <div>
              <span>Valor inventario</span>
              <strong>{money.format(stats.inventoryValue)}</strong>
            </div>
          </div>
        )}
      </section>

      <section className="inventory-panel">
        <div className="inventory-toolbar">
          <div>
            <h3>{productStatus === "active" ? "Listado" : "Inactivos"}</h3>
            <p>Busca, filtra, registra movimientos y consulta historial.</p>
          </div>

          <div className="inventory-filters">
            <div className="inventory-search">
              <Search size={18} />
              <input
                placeholder="Buscar nombre, SKU, código de barras o categoría..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="inventory-type-filter"
              value={productTypeFilter}
              onChange={(e) => setProductTypeFilter(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="product">Productos</option>
              <option value="service">Servicios</option>
            </select>
          </div>

          <div className="inventory-pagination">
            <span>
              Mostrando página {pagination.page} de {pagination.totalPages} ·{" "}
              {pagination.total} registros
            </span>

            <div>
              <button
                type="button"
                disabled={pagination.page <= 1 || loading}
                onClick={() => loadProducts(pagination.page - 1)}
              >
                Anterior
              </button>

              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => loadProducts(pagination.page + 1)}
              >
                Siguiente
              </button>
            </div>
          </div>


        </div>

        <div className="inventory-table-wrap">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Producto / Servicio</th>
                <th>SKU</th>
                <th>Código barras</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Costo</th>
                <th>Stock</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="table-empty">Cargando...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan="9" className="table-empty">No hay registros.</td></tr>
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
                            <span>{product.description || (isService ? "Servicio" : "Producto")}</span>
                          </div>
                        </div>
                      </td>

                      <td>{product.sku || "-"}</td>
                      <td>{product.barcode || "-"}</td>
                      <td>{product.category || "-"}</td>
                      <td>{money.format(Number(product.salePrice || 0))}</td>
                      <td>{money.format(Number(product.costPrice || 0))}</td>
                      <td>{controlsStock ? `${product.stock} ${product.unit}` : "No aplica"}</td>
                      <td>
                        {productStatus === "inactive" ? (
                          <span className="badge warning">Inactivo</span>
                        ) : isService ? (
                          <span className="badge neutral">Servicio</span>
                        ) : !controlsStock ? (
                          <span className="badge neutral">Sin control</span>
                        ) : (
                          <span className={isLowStock ? "badge danger" : "badge ok"}>
                            {isLowStock ? "Stock bajo" : "Disponible"}
                          </span>
                        )}
                      </td>

                      <td>
                        <div className="table-actions">
                          {productStatus === "active" && controlsStock && (
                            <button onClick={() => openMovementModal(product)} title="Movimiento">
                              <PackagePlus size={17} />
                            </button>
                          )}

                          <button onClick={() => openMovementsModal(product)} title="Historial">
                            <History size={17} />
                          </button>

                          {productStatus === "active" ? (
                            <>
                              <button onClick={() => openEditModal(product)} title="Editar">
                                <Edit size={17} />
                              </button>
                              <button className="danger-btn" onClick={() => openDeleteModal(product)} title="Desactivar">
                                <Trash2 size={17} />
                              </button>
                            </>
                          ) : (
                            <button className="reactivate-btn" onClick={() => handleReactivate(product)} title="Reactivar">
                              <RotateCcw size={16} /> Reactivar
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
          <div className="product-modal">
            <div className="modal-header">
              <div>
                <span>{editingProduct ? "Editar" : "Nuevo"}</span>
                <h3>{editingProduct ? "Actualizar registro" : "Registrar producto/servicio"}</h3>
              </div>
              <button onClick={closeModal} className="modal-close"><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} className="product-form">
              <div className="form-row">
                <label>Tipo *</label>
                <select name="productType" value={form.productType} onChange={handleChange}>
                  <option value="product">Producto</option>
                  <option value="service">Servicio</option>
                </select>
              </div>

              <div className="form-row checkbox-row">
                <label>Control de inventario</label>
                <label className="switch-line">
                  <input
                    type="checkbox"
                    name="trackStock"
                    checked={form.trackStock}
                    onChange={handleChange}
                    disabled={form.productType === "service"}
                  />
                  <span>{form.trackStock ? "Activo" : "No aplica"}</span>
                </label>
              </div>

              <div className="form-row full">
                <label>Nombre *</label>
                <input name="name" value={form.name} onChange={handleChange} placeholder="Ej: Laptop Dell / Servicio instalación" />
              </div> 


              <div className="form-row">
                <label>Código de barras</label>
                <div className="input-with-icon">
                  <Barcode size={17} />
                  <input name="barcode" value={form.barcode} onChange={handleChange} placeholder="Ej: 7501234567890" />
                </div>
              </div>

              <div className="form-row">
                <label>Categoría</label>
                <input name="category" value={form.category} onChange={handleChange} placeholder="Ej: Tecnología" />
              </div>

              <div className="form-row">
                <label>Unidad</label>
                <select name="unit" value={form.unit} onChange={handleChange}>
                  <option value="unidad">Unidad</option>
                  <option value="caja">Caja</option>
                  <option value="paquete">Paquete</option>
                  <option value="servicio">Servicio</option>
                  <option value="metro">Metro</option>
                  <option value="libra">Libra</option>
                  <option value="hora">Hora</option>
                </select>
              </div>

              {form.productType !== "service" && form.trackStock && (
                <>
                  <div className="form-row">
                    <label>Stock inicial / actual</label>
                    <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} placeholder="0" />
                  </div>

                  <div className="form-row">
                    <label>Stock mínimo</label>
                    <input name="minStock" type="number" min="0" value={form.minStock} onChange={handleChange} placeholder="0" />
                  </div>
                </>
              )}

              <div className="form-row">
                <label>Costo</label>
                <input name="costPrice" type="number" min="0" step="0.01" value={form.costPrice} onChange={handleChange} placeholder="0.00" />
              </div>

              <div className="form-row">
                <label>Precio venta</label>
                <input name="salePrice" type="number" min="0" step="0.01" value={form.salePrice} onChange={handleChange} placeholder="0.00" />
              </div>

              <div className="form-row full">
                <label>Descripción</label>
                <textarea name="description" value={form.description} onChange={handleChange} placeholder="Descripción breve..." />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="cancel-btn">Cancelar</button>
                <button disabled={saving} className="primary-btn">{saving ? "Guardando..." : "Guardar"}</button>
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
                <span>Movimiento manual</span>
                <h3>{movementProduct?.name}</h3>
              </div>
              <button onClick={closeMovementModal} className="modal-close"><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveMovement} className="product-form">
              <div className="movement-current-stock full">
                Stock actual: <strong>{movementProduct?.stock || 0} {movementProduct?.unit}</strong>
              </div>

              <div className="form-row">
                <label>Tipo de movimiento</label>
                <select name="type" value={movementForm.type} onChange={handleMovementChange}>
                  <option value="entry">Entrada</option>
                  <option value="exit">Salida</option>
                  <option value="adjustment">Ajuste</option>
                  <option value="return">Devolución</option>
                  <option value="waste">Merma / pérdida</option>
                </select>
              </div>

              {movementForm.type === "adjustment" ? (
                <div className="form-row">
                  <label>Nuevo stock</label>
                  <input name="newStock" type="number" min="0" value={movementForm.newStock} onChange={handleMovementChange} placeholder="0" />
                </div>
              ) : (
                <div className="form-row">
                  <label>Cantidad</label>
                  <input name="quantity" type="number" min="1" value={movementForm.quantity} onChange={handleMovementChange} placeholder="0" />
                </div>
              )}

              <div className="form-row full">
                <label>Motivo</label>
                <input name="reason" value={movementForm.reason} onChange={handleMovementChange} placeholder="Ej: Compra, merma, conteo físico, devolución..." />
              </div>

              <div className="form-row full">
                <label>Referencia</label>
                <input name="referenceNumber" value={movementForm.referenceNumber} onChange={handleMovementChange} placeholder="Ej: AJ-001 / COMPRA-55 / Nota interna" />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeMovementModal} className="cancel-btn">Cancelar</button>
                <button disabled={savingMovement} className="primary-btn">
                  {savingMovement ? "Registrando..." : "Registrar movimiento"}
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
                <span>Kardex / Historial</span>
                <h3>{selectedProduct?.name}</h3>
              </div>
              <button onClick={closeMovementsModal} className="modal-close"><X size={20} /></button>
            </div>

            <div className="movements-content">
              {loadingMovements ? (
                <div className="table-empty">Cargando movimientos...</div>
              ) : movements.length === 0 ? (
                <div className="table-empty">Este registro no tiene movimientos.</div>
              ) : (
                <table className="movements-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Tipo</th>
                      <th>Cantidad</th>
                      <th>Anterior</th>
                      <th>Nuevo</th>
                      <th>Referencia</th>
                      <th>Motivo</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((movement) => (
                      <tr key={movement.id}>
                        <td>{movement.user?.name || "Sistema"}</td>
                        <td><span className={movementBadgeClass[movement.type] || "badge warning"}>{movementLabels[movement.type] || movement.type}</span></td>
                        <td>{movement.quantity}</td>
                        <td>{movement.previousStock}</td>
                        <td>{movement.newStock}</td>
                        <td>{movement.referenceNumber || movement.referenceType || "-"}</td>
                        <td>{movement.reason}</td>
                        <td>{new Date(movement.createdAt).toLocaleString("es-DO")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div className="modal-overlay">
          <div className="delete-modal">
            <div className="delete-modal-icon"><Trash2 size={28} /></div>
            <h3>Desactivar producto</h3>
            <p>¿Seguro que quieres desactivar <strong>{productToDelete?.name}</strong>?</p>

            {checkingDelete ? (
              <div className="delete-warning">Validando historial...</div>
            ) : deleteMovementsCount > 0 ? (
              <div className="delete-warning">
                Tiene {deleteMovementsCount} movimiento(s). Se ocultará, pero su historial se conserva.
              </div>
            ) : (
              <div className="delete-warning">Se ocultará del inventario. Podrás reactivarlo luego.</div>
            )}

            {deleteError && <div className="delete-error">{deleteError}</div>}

            <div className="delete-actions">
              <button onClick={closeDeleteModal} className="cancel-btn">Cancelar</button>
              <button onClick={confirmDeactivateProduct} disabled={deleting || checkingDelete} className="delete-confirm-btn">
                {deleting ? "Desactivando..." : "Desactivar"}
              </button>
            </div>
          </div>
        </div>
      )}
       

    </div>
  );
}
