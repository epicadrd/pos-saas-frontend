export const SUPPORTED_LANGUAGES = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
];

export const translations = {
  en: {
    "Configuración": "Settings",
    "Cuenta y configuración": "Account and settings",
    "Administra los datos generales, legales y fiscales de tu empresa.": "Manage your company’s general, legal, and tax information.",
    "Idioma del sistema": "System language",
    "Selecciona el idioma en el que quieres usar Aventra.": "Select the language you want to use Aventra in.",
    "Idioma": "Language",
    "Guardar idioma": "Save language",
    "Guardando...": "Saving...",
    "Guardar": "Save",
    "Cancelar": "Cancel",
    "Editar": "Edit",
    "Cargando configuración...": "Loading settings...",
    "No se pudo guardar el idioma": "Could not save language",
    "Información de la empresa": "Company information",
    "Información legal": "Legal information",
    "Información de contacto del cliente": "Customer contact information",
    "Nombre": "Name",
    "Dirección": "Address",
    "Correo electrónico": "Email",
    "Teléfono": "Phone",
    "Sitio web": "Website",
    "Sector": "Industry",
    "Dashboard": "Dashboard",
    "Cerrar sesión": "Log out",
    "Facturas": "Invoices",
    "Cotizaciones": "Quotes",
    "Recibos": "Receipts",
    "Inventario": "Inventory",
    "Productos": "Products",
    "Proveedores": "Suppliers",
    "Conduces": "Delivery notes",
    "Órdenes de compra": "Purchase orders",
    "Reportes": "Reports",
    "Gastos": "Expenses",
    "Contabilidad": "Accounting",
    "Cuentas por cobrar": "Accounts receivable",
    "Cuentas por pagar": "Accounts payable",
    "POS": "POS",
    "Cajas": "Cash registers",
    "Ventas POS": "POS sales",
    "Cierres de caja": "Cash closings",
    "Catálogo digital": "Digital catalog",
    "Conteo de inventario": "Inventory count",
    "Buscar": "Search",
    "Estado": "Status",
    "Fecha": "Date",
    "Total": "Total",
    "Cliente": "Customer",
    "Proveedor": "Supplier",
    "Acciones": "Actions",
    "Detalle": "Details",
    "Cerrar": "Close",
    "Imprimir": "Print",
    "Eliminar": "Delete",
    "Activar": "Activate",
    "Desactivar": "Deactivate",
    "Pendiente": "Pending",
    "Pagada": "Paid",
    "Vencida": "Overdue",
    "Anulada": "Canceled",
    "Borrador": "Draft",
  },
};

export const normalizeLanguage = (language) => {
  return SUPPORTED_LANGUAGES.some((item) => item.code === language) ? language : "es";
};

export const translateText = (text, language) => {
  const normalizedLanguage = normalizeLanguage(language);
  if (normalizedLanguage === "es") return text;

  const cleanText = String(text || "").replace(/\s+/g, " ").trim();
  return translations[normalizedLanguage]?.[cleanText] || text;
};