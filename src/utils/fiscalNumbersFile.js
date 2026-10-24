import * as XLSX from "xlsx";

// e-NCF completo: E + tipo (2) + secuencia (10), sin pegarse a otros dígitos
const ENCF_PATTERN = /(?<![A-Z0-9])E(\d{2})(\d{10})(?!\d)/g;
const DMY_PATTERN = /(?<!\d)(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?!\d)/g;
const YMD_PATTERN = /(?<!\d)(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)/g;

const pad = (value) => String(value).padStart(2, "0");

const toDateOnly = (year, month, day) => {
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${pad(month)}-${pad(day)}`;
};

// Excel guarda la fecha como medianoche local, a veces con segundos de
// desfase; sumar medio día evita que caiga en el día anterior
const excelDateToDateOnly = (date) => {
  const safe = new Date(date.getTime() + 12 * 3600 * 1000);
  return toDateOnly(safe.getFullYear(), safe.getMonth() + 1, safe.getDate());
};

const readCell = (cell, numbers, dates) => {
  if (cell === null || cell === undefined) return;

  if (cell instanceof Date) {
    const value = excelDateToDateOnly(cell);
    if (value) dates.push(value);
    return;
  }

  const text = String(cell).toUpperCase();
  const compact = text.replace(/\s+/g, "");

  for (const [, tipo, sequence] of compact.matchAll(ENCF_PATTERN)) {
    numbers.push({ tipoECF: tipo, number: Number(sequence) });
  }

  // En RD las fechas se escriben día/mes/año
  for (const [, day, month, year] of text.matchAll(DMY_PATTERN)) {
    const value = toDateOnly(Number(year), Number(month), Number(day));
    if (value) dates.push(value);
  }

  for (const [, year, month, day] of text.matchAll(YMD_PATTERN)) {
    const value = toDateOnly(Number(year), Number(month), Number(day));
    if (value) dates.push(value);
  }
};

/*
 * Una fila con dos e-NCF del mismo tipo es un rango "desde / hasta".
 * Si trae uno solo (o más de dos), cada número cuenta por sí mismo.
 * La fecha de la fila es la de vencimiento: si hay varias, la mayor.
 */
const rowToRanges = (row) => {
  const numbers = [];
  const dates = [];

  row.forEach((cell) => readCell(cell, numbers, dates));

  if (!numbers.length) return [];

  const expirationDate = dates.length ? dates.sort().at(-1) : null;
  const byType = new Map();

  for (const item of numbers) {
    if (!byType.has(item.tipoECF)) byType.set(item.tipoECF, new Set());
    byType.get(item.tipoECF).add(item.number);
  }

  const ranges = [];

  for (const [tipoECF, set] of byType) {
    const values = [...set].sort((a, b) => a - b);

    if (values.length === 2) {
      ranges.push({ tipoECF, start: values[0], end: values[1], expirationDate });
      continue;
    }

    for (const value of values) {
      ranges.push({ tipoECF, start: value, end: value, expirationDate });
    }
  }

  return ranges;
};

// Junta los números seguidos del mismo tipo y vencimiento en un solo rango
export const mergeRanges = (ranges) => {
  const sorted = [...ranges].sort(
    (a, b) =>
      a.tipoECF.localeCompare(b.tipoECF) ||
      String(a.expirationDate || "").localeCompare(String(b.expirationDate || "")) ||
      a.start - b.start
  );

  const merged = [];

  for (const range of sorted) {
    const last = merged.at(-1);

    if (
      last &&
      last.tipoECF === range.tipoECF &&
      last.expirationDate === range.expirationDate &&
      range.start <= last.end + 1
    ) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }

  return merged;
};

/*
 * Lee el archivo que entregó la DGII (Excel, CSV o texto) y devuelve
 * los rangos de e-NCF que contiene, sin importar en qué columna estén.
 */
export const readFiscalNumbersFile = async (file, knownTypes = []) => {
  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: "array",
    cellDates: true,
  });

  const found = [];

  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false,
    });

    rows.forEach((row) => found.push(...rowToRanges(row)));
  }

  const ignoredTypes = [
    ...new Set(
      found
        .filter((range) => knownTypes.length && !knownTypes.includes(range.tipoECF))
        .map((range) => range.tipoECF)
    ),
  ];

  return {
    ranges: mergeRanges(found.filter((range) => !ignoredTypes.includes(range.tipoECF))),
    ignoredTypes,
  };
};
