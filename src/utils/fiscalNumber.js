export const getFiscalNumber = (invoice) => {
  return invoice?.eNcf || invoice?.invoiceNumber || "-";
};

export const getFiscalLabel = (invoice) => {
  return invoice?.eNcf ? "e-NCF" : "Factura interna";
};