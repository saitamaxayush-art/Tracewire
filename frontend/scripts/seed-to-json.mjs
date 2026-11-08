#!/usr/bin/env node
// Parses db/banking_fraud_db.sql and writes one JSON file per table to src/api/mock/.
// Values are copied exactly as written in the SQL. Nothing is retyped or rounded.
//
// Type mapping, matching the MySQL column types:
//   BIGINT            -> string (keeps every digit, JavaScript numbers cannot hold all BIGINTs)
//   DECIMAL           -> number (parsed from the literal, for example 18500.00 -> 18500)
//   BOOLEAN TRUE/FALSE -> true/false
//   NULL              -> null
//   VARCHAR, ENUM, TEXT, DATE, DATETIME -> string exactly as written
//
// AUTO_INCREMENT primary keys that the INSERT omits (anomaly_id, dispute_id, audit_id)
// are numbered 1, 2, 3 ... in insert order, the same values MySQL assigns on a fresh database.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sqlPath = resolve(root, process.argv[2] ?? 'db/banking_fraud_db.sql');
const outDir = resolve(root, 'src/api/mock');

const sql = readFileSync(sqlPath, 'utf8');

/** Strip "-- comment" lines that are outside string literals. */
function stripComments(text) {
  let out = '';
  let inStr = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      out += c;
      if (c === '\\') { out += text[++i] ?? ''; continue; }
      if (c === "'") {
        if (text[i + 1] === "'") { out += text[++i]; continue; }
        inStr = false;
      }
      continue;
    }
    if (c === "'") { inStr = true; out += c; continue; }
    if (c === '-' && text[i + 1] === '-') {
      while (i < text.length && text[i] !== '\n') i++;
      out += '\n';
      continue;
    }
    out += c;
  }
  return out;
}

/** Split on semicolons that are outside string literals. */
function splitStatements(text) {
  const parts = [];
  let cur = '';
  let inStr = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      cur += c;
      if (c === '\\') { cur += text[++i] ?? ''; continue; }
      if (c === "'") {
        if (text[i + 1] === "'") { cur += text[++i]; continue; }
        inStr = false;
      }
      continue;
    }
    if (c === "'") { inStr = true; cur += c; continue; }
    if (c === ';') { if (cur.trim()) parts.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

/** Split a comma list at depth 0, outside strings. */
function splitTopLevel(text) {
  const parts = [];
  let cur = '';
  let depth = 0;
  let inStr = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      cur += c;
      if (c === '\\') { cur += text[++i] ?? ''; continue; }
      if (c === "'") {
        if (text[i + 1] === "'") { cur += text[++i]; continue; }
        inStr = false;
      }
      continue;
    }
    if (c === "'") { inStr = true; cur += c; continue; }
    if (c === '(') depth++;
    if (c === ')') depth--;
    if (c === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function parseCreate(stmt) {
  const m = stmt.match(/^CREATE\s+TABLE\s+`?(\w+)`?\s*\(([\s\S]*)\)\s*$/i);
  if (!m) return null;
  const [, table, body] = m;
  const columns = [];
  for (const def of splitTopLevel(body)) {
    if (/^(FOREIGN|PRIMARY|UNIQUE|KEY|INDEX|CONSTRAINT)\b/i.test(def)) continue;
    const cm = def.match(/^`?(\w+)`?\s+(\w+)/);
    if (!cm) continue;
    const [, name, rawType] = cm;
    const type = rawType.toUpperCase();
    const autoIncrement = /AUTO_INCREMENT/i.test(def);
    let enumValues = null;
    if (type === 'ENUM') {
      const inner = def.slice(def.indexOf('(') + 1, def.lastIndexOf(')'));
      enumValues = splitTopLevel(inner).map(unquote);
    }
    columns.push({ name, type, autoIncrement, nullable: !/NOT\s+NULL/i.test(def) && !/PRIMARY\s+KEY/i.test(def), enumValues });
  }
  return { table, columns };
}

function unquote(lit) {
  const s = lit.trim();
  if (s.startsWith("'") && s.endsWith("'")) {
    return s.slice(1, -1).replace(/''/g, "'").replace(/\\(.)/g, '$1');
  }
  return s;
}

function convert(lit, col) {
  const s = lit.trim();
  if (/^NULL$/i.test(s)) return null;
  if (s.startsWith("'")) {
    const v = unquote(s);
    if (col.type === 'DECIMAL') return Number(v);
    return v;
  }
  if (col.type === 'BOOLEAN' || col.type === 'BOOL' || col.type === 'TINYINT') {
    if (/^TRUE$/i.test(s)) return true;
    if (/^FALSE$/i.test(s)) return false;
    return s !== '0';
  }
  if (col.type === 'BIGINT') return s;
  if (col.type === 'DECIMAL' || col.type === 'INT' || col.type === 'FLOAT' || col.type === 'DOUBLE') {
    const n = Number(s);
    if (Number.isNaN(n)) throw new Error(`Not a number: ${s} for ${col.name}`);
    return n;
  }
  return s;
}

function parseInsert(stmt, schemas) {
  const m = stmt.match(/^INSERT\s+INTO\s+`?(\w+)`?\s*\(([\s\S]*?)\)\s*VALUES\s*([\s\S]*)$/i);
  if (!m) return null;
  const [, table, colList, valuesPart] = m;
  const schema = schemas.get(table);
  if (!schema) throw new Error(`INSERT into unknown table ${table}`);
  const names = colList.split(',').map((c) => c.trim().replace(/`/g, ''));
  const tuples = splitTopLevel(valuesPart);
  const autoCol = schema.columns.find((c) => c.autoIncrement && !names.includes(c.name));
  const rows = tuples.map((tuple, i) => {
    const inner = tuple.trim().replace(/^\(/, '').replace(/\)$/, '');
    const vals = splitTopLevel(inner);
    if (vals.length !== names.length) {
      throw new Error(`${table} row ${i + 1}: ${vals.length} values for ${names.length} columns`);
    }
    const row = {};
    if (autoCol) row[autoCol.name] = String(i + 1);
    names.forEach((name, j) => {
      const col = schema.columns.find((c) => c.name === name);
      if (!col) throw new Error(`${table}: unknown column ${name}`);
      row[name] = convert(vals[j], col);
    });
    // Columns omitted from the INSERT that are nullable become null.
    for (const col of schema.columns) {
      if (!(col.name in row)) row[col.name] = col.nullable ? null : undefined;
    }
    return row;
  });
  return { table, rows };
}

const statements = splitStatements(stripComments(sql));
const schemas = new Map();
const data = new Map();
for (const stmt of statements) {
  if (/^CREATE\s+TABLE/i.test(stmt)) {
    const s = parseCreate(stmt);
    if (s) schemas.set(s.table, s);
  } else if (/^INSERT\s+INTO/i.test(stmt)) {
    const ins = parseInsert(stmt, schemas);
    if (ins) data.set(ins.table, [...(data.get(ins.table) ?? []), ...ins.rows]);
  }
}

const fileNames = {
  Customers: 'customers.json',
  Accounts: 'accounts.json',
  Transactions: 'transactions.json',
  Anomaly_Patterns: 'anomaly_patterns.json',
  Dispute_Logs: 'dispute_logs.json',
  Audit_Trail: 'audit_trail.json',
};

mkdirSync(outDir, { recursive: true });
for (const [table, file] of Object.entries(fileNames)) {
  const rows = data.get(table);
  if (!rows) throw new Error(`No rows found for ${table}`);
  writeFileSync(resolve(outDir, file), JSON.stringify(rows, null, 2) + '\n');
  console.log(`${table.padEnd(18)} ${String(rows.length).padStart(4)} rows -> src/api/mock/${file}`);
}

// Record the ENUM definitions too, so src/constants/enums.ts can be checked against the SQL.
const enums = {};
for (const [table, s] of schemas) {
  for (const c of s.columns) if (c.enumValues) enums[`${table}.${c.name}`] = c.enumValues;
}
writeFileSync(resolve(outDir, 'schema_enums.json'), JSON.stringify(enums, null, 2) + '\n');
console.log(`ENUM definitions     -> src/api/mock/schema_enums.json`);
