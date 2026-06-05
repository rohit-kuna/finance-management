export function normalizeWorkbookName(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeWorkbookHeaderName(value: string) {
  return normalizeWorkbookName(value).replace(/[^a-z0-9]+/g, "");
}

export function buildWorkbookHeaderIndex(headers: string[]) {
  const headerIndex = new Map<string, number>();

  headers.forEach((header, index) => {
    const normalized = normalizeWorkbookHeaderName(header);
    if (!headerIndex.has(normalized)) {
      headerIndex.set(normalized, index);
    }
  });

  return headerIndex;
}

export function resolveWorkbookHeaderIndex(headerIndex: Map<string, number>, headerName: string) {
  const normalized = normalizeWorkbookHeaderName(headerName);
  const index = headerIndex.get(normalized);
  return index === undefined ? null : index;
}

export function resolveWorkbookRowValue(
  values: string[],
  headerIndex: Map<string, number>,
  headerName: string
) {
  const index = resolveWorkbookHeaderIndex(headerIndex, headerName);
  if (index === null) return "";

  return values[index] ?? "";
}

export function findUniqueNormalizedMatch<T extends { name: string; id: string | number }>(
  records: T[],
  value: string
) {
  const normalizedValue = normalizeWorkbookName(value);
  const matches = records.filter((record) => normalizeWorkbookName(record.name) === normalizedValue);

  if (matches.length === 1) {
    return {
      match: matches[0] ?? null,
      isAmbiguous: false,
    };
  }

  return {
    match: null,
    isAmbiguous: matches.length > 1,
  };
}
