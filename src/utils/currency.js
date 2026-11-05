/*
 * En RD una factura puede estar en pesos o en dólares. Los recibos y notas
 * de una factura en US$ están en dólares, con la tasa de esa factura.
 *
 * `row` es la factura o el recibo: { currency, exchangeRate }.
 */

const usdRate = (row) =>
  row?.currency === "USD" && Number(row?.exchangeRate) > 0
    ? Number(row.exchangeRate)
    : 0;

// Monto llevado a pesos con la tasa de su factura
export const toDop = (value, row) => {
  const amount = Number(value || 0);
  const rate = usdRate(row);
  return rate ? amount * rate : amount;
};

/*
 * Devuelve formatMoney(value, row?):
 *  - sin row o en pesos: "RD$1,000.00" (o US$ para empresas fuera de RD)
 *  - factura en US$ con tasa: "US$1,000.00 (RD$60,500.00)"
 *  - factura en US$ sin tasa: "US$1,000.00"
 */
export const createMoneyFormatter = (isDO) => {
  const local = new Intl.NumberFormat(isDO ? "es-DO" : "en-US", {
    style: "currency",
    currency: isDO ? "DOP" : "USD",
  });
  const usd = new Intl.NumberFormat("es-DO", { style: "currency", currency: "USD" });

  return (value, row) => {
    const amount = Number(value || 0);

    if (!isDO || row?.currency !== "USD") return local.format(amount);

    const rate = usdRate(row);
    return rate
      ? `${usd.format(amount)} (${local.format(amount * rate)})`
      : usd.format(amount);
  };
};
