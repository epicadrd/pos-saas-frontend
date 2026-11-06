export const MAX_CUSTOMER_EMAILS = 5;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Estado inicial: el principal siempre va primero (índice 0). */
export const buildEmailState = (customer) => {
  const list = Array.isArray(customer?.emails) ? customer.emails.filter(Boolean) : [];
  const primary = customer?.email || "";
  const emails = primary && !list.includes(primary) ? [primary, ...list] : list;

  return {
    emails: emails.length ? emails.slice(0, MAX_CUSTOMER_EMAILS) : [""],
    primaryIndex: Math.max(0, emails.indexOf(primary)),
  };
};

/*
 * Convierte el estado del campo en { email, emails } para la API.
 * Devuelve invalid con el primer correo mal escrito, si lo hay.
 */
export const toEmailPayload = ({ emails, primaryIndex }) => {
  const trimmed = emails.map((value) => value.trim().toLowerCase());
  const invalid = trimmed.find((value) => value && !EMAIL_PATTERN.test(value));
  const filled = [...new Set(trimmed.filter(Boolean))];
  const primary = trimmed[primaryIndex] || filled[0] || "";

  return { email: primary, emails: filled, invalid };
};
