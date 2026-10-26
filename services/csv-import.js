// Role: turns the text of an uploaded CSV file into entry bodies for the entries route.
// Pure function, no database: the route validates each body with the SAME rules as the
// form (validateEntryInput + calculateCo2), so an import can never bypass validation.
//
// Accepted files
// - Header row required. Columns: category, amount, unit, entry_date (or "date"), note (optional);
//   German names work too: Kategorie, Menge, Einheit, Datum, Notiz.
//   Other columns (id, co2_kg from our own export) are ignored: CO2 is always recalculated.
// - Comma OR semicolon separated (German Excel saves CSV with ";").
// - With ";" files, German numbers ("1.500,5") and dates ("15.03.2026") are converted.
// - Category can be the key ("natural_gas") or the label shown in the app ("Natural gas").
// - Units are kept exactly as written: matching stays case-sensitive (MWh vs mWh).

const MAX_ROWS = 1000;
const HEADER_ALIASES = {
  category: 'category', amount: 'amount', unit: 'unit', entry_date: 'entry_date', date: 'entry_date', note: 'note', notes: 'note',
  kategorie: 'category', menge: 'amount', einheit: 'unit', datum: 'entry_date', notiz: 'note', bemerkung: 'note',   // German Excel headers
};
const REQUIRED = ['category', 'amount', 'unit', 'entry_date'];

// Picks the separator from the header line: more semicolons than commas means ";".
function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const count = (ch) => firstLine.split(ch).length - 1;
  return count(';') > count(',') ? ';' : ',';
}

// RFC 4180 parser: quoted fields, "" inside quotes, separators and line breaks inside quotes.
function parseCsv(text, delimiter) {
  const records = [];
  let field = '', record = [], inQuotes = false, line = 1, recordLine = 1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else {
        if (c === '\n') line++;
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      record.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      record.push(field); records.push({ line: recordLine, cells: record });
      field = ''; record = []; line++; recordLine = line;
    } else {
      field += c;
    }
  }
  if (inQuotes) throw new Error(`Line ${recordLine}: a quoted value is not closed`);
  if (field !== '' || record.length) { record.push(field); records.push({ line: recordLine, cells: record }); }
  return records.filter((r) => r.cells.some((c) => c.trim() !== ''));   // skip empty lines
}

// German number format only for ";" files, where "," is the decimal separator.
function normalizeAmount(raw, delimiter) {
  const s = raw.trim().replace(/\s/g, '');
  if (delimiter === ';') {
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return s.replace(/\./g, '').replace(',', '.');   // 1.500,5
    if (/^-?\d+,\d+$/.test(s)) return s.replace(',', '.');                                        // 1,5
  }
  return s;
}

// 15.03.2026 -> 2026-03-15; anything else is passed on unchanged (the validator decides).
function normalizeDate(raw) {
  const s = raw.trim();
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : s;
}

const normalizeCategory = (raw) => raw.trim().toLowerCase().replace(/\s+/g, '_');

// Our export prefixes notes starting with = + - @ with ' (formula protection); undo that.
const normalizeNote = (raw) => raw.replace(/^'(?=[=+\-@\t\r])/, '').trim();

/**
 * Returns { rows: [{ line, body }], errors: [{ line, message }] }.
 * `errors` here are problems with the FILE (missing columns, too many rows);
 * problems with individual VALUES are found later by the normal entry validation.
 */
function csvToEntries(text) {
  if (typeof text !== 'string' || text.trim() === '') return { rows: [], errors: [{ line: 0, message: 'The file is empty' }] };
  const clean = text.replace(/^﻿/, '');                 // Excel adds a byte-order mark
  const delimiter = detectDelimiter(clean);
  let records;
  try { records = parseCsv(clean, delimiter); } catch (err) { return { rows: [], errors: [{ line: 0, message: err.message }] }; }
  if (records.length === 0) return { rows: [], errors: [{ line: 0, message: 'The file is empty' }] };

  const header = records[0].cells.map((h) => HEADER_ALIASES[h.trim().toLowerCase()] || null);
  const missing = REQUIRED.filter((col) => !header.includes(col));
  if (missing.length) {
    return { rows: [], errors: [{ line: records[0].line, message: `Missing column(s): ${missing.join(', ')}. Expected a header row like: category,amount,unit,entry_date,note` }] };
  }
  const data = records.slice(1);
  if (data.length === 0) return { rows: [], errors: [{ line: 0, message: 'The file has a header but no entries' }] };
  if (data.length > MAX_ROWS) return { rows: [], errors: [{ line: 0, message: `Too many rows: at most ${MAX_ROWS} entries per import` }] };

  const rows = data.map(({ line, cells }) => {
    const get = (col) => { const i = header.indexOf(col); return i >= 0 && cells[i] !== undefined ? cells[i] : ''; };
    return {
      line,
      body: {
        category: normalizeCategory(get('category')),
        amount: normalizeAmount(get('amount'), delimiter),
        unit: get('unit').trim(),
        entry_date: normalizeDate(get('entry_date')),
        note: normalizeNote(get('note')),
      },
    };
  });
  return { rows, errors: [] };
}

module.exports = { csvToEntries, parseCsv, detectDelimiter, normalizeAmount, normalizeDate, MAX_ROWS };
