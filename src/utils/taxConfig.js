export const getTenantCountry = (tenant) => tenant?.country || "DO";

export const isDominicanTenant = (tenant) => getTenantCountry(tenant) === "DO";

export const getTaxRate = (tenant) => {
  if (tenant?.invoiceTaxEnabled === false) return 0;

  if (isDominicanTenant(tenant)) {
    return Number(tenant?.invoiceTaxRate || 18);
  }

  return (
    Number(tenant?.usStateTaxRate || 0) +
    Number(tenant?.usCountyTaxRate || 0) +
    Number(tenant?.usCityTaxRate || 0)
  );
};

export const getTaxLabel = (tenant) => {
  return isDominicanTenant(tenant) ? "ITBIS" : "Impuestos";
};