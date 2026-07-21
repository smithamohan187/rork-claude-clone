// Service layer — wraps expo-document-picker + papaparse for CSV invite uploads.
// Screens/hooks never import these packages directly.
import Papa from 'papaparse';

export interface ParsedCsvRow {
  name: string;
  email: string;
  phone: string;
}

export type CsvRowStatus = 'valid' | 'invalid' | 'skipped-duplicate';

export interface CsvPreviewRow extends ParsedCsvRow {
  status: CsvRowStatus;
  reason?: string;
}

const MAX_ROWS = 500;

const isValidEmail = (s: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

const isValidPhone = (s: string): boolean => {
  const stripped = s.trim().replace(/[\s\-().]/g, '');
  return /^\+?[1-9]\d{6,14}$/.test(stripped);
};

/** Opens the native/web document picker and returns the picked file's name + text content, or null if cancelled/unavailable. */
export async function pickCsvFile(): Promise<{ fileName: string; text: string } | null> {
  const DocumentPicker = await import('expo-document-picker').catch(() => null);
  if (!DocumentPicker) return null;

  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'text/plain'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const response = await fetch(asset.uri);
  const text = await response.text();
  return { fileName: asset.name ?? 'upload.csv', text };
}

/** Parses raw CSV text into { name, email, phone } rows using the required header row. */
export function parseCsvText(text: string): { rows: ParsedCsvRow[]; headerError?: string } {
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
  const lines = parsed.data;
  if (lines.length === 0) return { rows: [] };

  const header = lines[0].map((h) => h.trim().toLowerCase());
  const nameIdx = header.indexOf('name');
  const emailIdx = header.indexOf('email');
  const phoneIdx = header.indexOf('phone');

  if (nameIdx === -1) {
    return { rows: [], headerError: 'Missing required "name" column in header' };
  }

  const dataLines = lines.slice(1, 1 + MAX_ROWS);
  const rows: ParsedCsvRow[] = dataLines.map((cols) => ({
    name: (cols[nameIdx] ?? '').trim(),
    email: emailIdx >= 0 ? (cols[emailIdx] ?? '').trim() : '',
    phone: phoneIdx >= 0 ? (cols[phoneIdx] ?? '').trim() : '',
  }));

  return { rows };
}

/**
 * Applies the parsing/dedup spec to raw rows for preview purposes:
 * name required; email/phone validated if present; at least one required;
 * in-file dedup on identifier (phone wins over email when both present).
 */
export function validateCsvRows(rows: ParsedCsvRow[]): CsvPreviewRow[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    if (!row.name) {
      return { ...row, status: 'invalid', reason: 'Missing name' };
    }
    const hasEmail = row.email.length > 0;
    const hasPhone = row.phone.length > 0;
    const emailValid = hasEmail ? isValidEmail(row.email) : true;
    const phoneValid = hasPhone ? isValidPhone(row.phone) : true;

    if (hasEmail && !emailValid) {
      return { ...row, status: 'invalid', reason: 'Invalid email format' };
    }
    if (hasPhone && !phoneValid) {
      return { ...row, status: 'invalid', reason: 'Invalid phone format' };
    }
    if (!hasEmail && !hasPhone) {
      return { ...row, status: 'invalid', reason: 'At least one of email or phone is required' };
    }

    const identifier = hasPhone ? row.phone : row.email.toLowerCase();
    if (seen.has(identifier)) {
      return { ...row, status: 'skipped-duplicate', reason: 'Duplicate within file' };
    }
    seen.add(identifier);

    return { ...row, status: 'valid' };
  });
}
