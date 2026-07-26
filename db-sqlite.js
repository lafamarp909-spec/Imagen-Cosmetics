// Base de datos con archivo simple (SQLite). Sirve tanto para correr sin
// internet en el computador de la tienda, como en Railway usando un
// "Volumen" (disco que persiste aparte del código, así los datos no se
// pierden cada vez que subes una actualización).
//
// Ruta del archivo:
// - Local (sin internet): queda en esta misma carpeta ("imagen.db").
// - Railway: define la variable de entorno DB_DIR apuntando a la carpeta
//   del volumen (por ejemplo "/data"), y el archivo se guarda ahí.
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dbDir = process.env.DB_DIR || __dirname;
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const dbPath = path.join(dbDir, 'imagen.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      iva REAL NOT NULL DEFAULT 19
    );
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      logo TEXT,
      business TEXT DEFAULT '{}',
      doc_counter INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_number TEXT,
      mode TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      client_name TEXT,
      client_cedula TEXT,
      client_phone TEXT,
      items TEXT,
      subtotal REAL,
      iva_total REAL,
      total REAL
    );
  `);
  db.prepare(`INSERT OR IGNORE INTO settings (id) VALUES (1)`).run();
  console.log('Base de datos local lista (archivo: ' + dbPath + ')');
  return Promise.resolve();
}

/* ---------------- Productos ---------------- */

function getProducts() {
  const rows = db.prepare('SELECT code, name, price, iva FROM products ORDER BY name ASC').all();
  return Promise.resolve(rows);
}

function bulkSetProducts(products) {
  const insert = db.prepare('INSERT INTO products (code, name, price, iva) VALUES (?,?,?,?)');
  const tx = db.transaction((items) => {
    db.prepare('DELETE FROM products').run();
    for (const p of items) {
      if (!p.code || !p.name) continue;
      insert.run(String(p.code), String(p.name), Number(p.price) || 0, Number(p.iva) || 19);
    }
  });
  tx(products);
  return Promise.resolve({ count: products.length });
}

function deleteProduct(code) {
  db.prepare('DELETE FROM products WHERE code = ?').run(code);
  return Promise.resolve();
}

/* ---------------- Ajustes ---------------- */

function getSettings() {
  const row = db.prepare('SELECT logo, business, doc_counter FROM settings WHERE id = 1').get() || {};
  return Promise.resolve({
    logo: row.logo || null,
    business: row.business ? JSON.parse(row.business) : {},
    docCounter: row.doc_counter || 1,
  });
}

function updateSettings({ logo, business, docCounter }) {
  const sets = [];
  const values = [];
  if (logo !== undefined) { sets.push('logo = ?'); values.push(logo); }
  if (business !== undefined) { sets.push('business = ?'); values.push(JSON.stringify(business)); }
  if (docCounter !== undefined) { sets.push('doc_counter = ?'); values.push(docCounter); }
  if (sets.length === 0) return Promise.resolve();
  values.push(1);
  db.prepare(`UPDATE settings SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return Promise.resolve();
}

/* ---------------- Documentos (facturas / cotizaciones) ---------------- */

function getDocuments(q) {
  let rows;
  if (q) {
    rows = db.prepare(
      `SELECT * FROM documents WHERE client_cedula LIKE ? OR client_name LIKE ? ORDER BY created_at DESC LIMIT 100`
    ).all(`%${q}%`, `%${q}%`);
  } else {
    rows = db.prepare('SELECT * FROM documents ORDER BY created_at DESC LIMIT 50').all();
  }
  rows = rows.map((r) => ({ ...r, items: r.items ? JSON.parse(r.items) : [] }));
  return Promise.resolve(rows);
}

function insertDocument(doc) {
  db.prepare(
    `INSERT INTO documents (doc_number, mode, client_name, client_cedula, client_phone, items, subtotal, iva_total, total)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run(
    doc.docNumber, doc.mode, doc.clientName, doc.clientCedula, doc.clientPhone,
    JSON.stringify(doc.items), doc.subtotal, doc.ivaTotal, doc.total
  );
  return Promise.resolve();
}

/* ---------------- Respaldo ---------------- */

function getBackupFilePath() {
  // Cierra cualquier escritura pendiente del WAL antes de copiar el archivo,
  // para que el respaldo quede completo y consistente.
  db.pragma('wal_checkpoint(TRUNCATE)');
  return dbPath;
}

module.exports = {
  initDb, getProducts, bulkSetProducts, deleteProduct,
  getSettings, updateSettings, getDocuments, insertDocument,
  getBackupFilePath,
};
