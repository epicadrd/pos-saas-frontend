// Tipo de factura de Aventra → tipo de e-CF de la DGII
export const INVOICE_ECF_TYPES = {
  consumer_final: "32",
  credit_fiscal: "31",
  special_regime: "44",
  government: "45",
};

export const ECF_INVOICE_TITLES = {
  consumer_final: "FACTURA DE CONSUMO ELECTRÓNICA",
  credit_fiscal: "FACTURA DE CRÉDITO FISCAL ELECTRÓNICA",
  special_regime: "FACTURA ELECTRÓNICA PARA REGÍMENES ESPECIALES",
  government: "FACTURA ELECTRÓNICA GUBERNAMENTAL",
};

export const ECF_NOTE_TITLES = {
  credit: "NOTA DE CRÉDITO ELECTRÓNICA",
  debit: "NOTA DE DÉBITO ELECTRÓNICA",
};
