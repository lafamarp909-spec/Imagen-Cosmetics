// Base de datos en la NUBE (Postgres/Railway). Solo se usa si existe la
// variable de entorno DATABASE_URL. Misma "forma" de funciones que db-sqlite.js
// para que server.js no tenga que cambiar nada.
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: !process.env.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false }
    : false,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price NUMERIC NOT NULL,
      iva NUMERIC NOT NULL DEFAULT 19
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id INT PRIMARY KEY DEFAULT 1,
      logo TEXT,
      business JSONB DEFAULT '{}'::jsonb,
      doc_counter INT DEFAULT 1,
      pin TEXT DEFAULT '1379'
    );
  `);
  // Migración: si la tabla ya existía de antes, puede que le falte la columna 'pin'.
  await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS pin TEXT DEFAULT '1379';`);
  await pool.query(`INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      doc_number TEXT,
      mode TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      client_name TEXT,
      client_cedula TEXT,
      client_phone TEXT,
      items JSONB,
      subtotal NUMERIC,
      iva_total NUMERIC,
      total NUMERIC
    );
  `);
  console.log('Base de datos en la nube (Postgres) lista.');
}

async function getProducts() {
  const { rows } = await pool.query('SELECT code, name, price::float, iva::float FROM products ORDER BY name ASC');
  return rows;
}

async function bulkSetProducts(products) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM products');
    for (const p of products) {
      if (!p.code || !p.name) continue;
      await client.query(
        'INSERT INTO products (code, name, price, iva) VALUES ($1,$2,$3,$4)',
        [String(p.code), String(p.name), Number(p.price) || 0, Number(p.iva) || 19]
      );
    }
    await client.query('COMMIT');
    return { count: products.length };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deleteProduct(code) {
  await pool.query('DELETE FROM products WHERE code = $1', [code]);
}

async function getSettings() {
  const { rows } = await pool.query('SELECT logo, business, doc_counter, pin FROM settings WHERE id = 1');
  const row = rows[0] || {};
  return {
    logo: row.logo || null,
    business: row.business || {},
    docCounter: row.doc_counter || 1,
    pin: row.pin || '1379',
  };
}

async function updateSettings({ logo, business, docCounter, pin }) {
  const sets = [];
  const values = [];
  let i = 1;
  if (logo !== undefined) { sets.push(`logo = $${i++}`); values.push(logo); }
  if (business !== undefined) { sets.push(`business = $${i++}`); values.push(JSON.stringify(business)); }
  if (docCounter !== undefined) { sets.push(`doc_counter = $${i++}`); values.push(docCounter); }
  if (pin !== undefined) { sets.push(`pin = $${i++}`); values.push(pin); }
  if (sets.length === 0) return;
  await pool.query(`UPDATE settings SET ${sets.join(', ')} WHERE id = 1`, values);
}

async function getDocuments(q) {
  // Sin límite: se puede ver todo el historial completo.
  if (q) {
    const { rows } = await pool.query(
      `SELECT * FROM documents WHERE client_cedula ILIKE $1 OR client_name ILIKE $1 ORDER BY created_at DESC`,
      [`%${q}%`]
    );
    return rows;
  }
  const { rows } = await pool.query('SELECT * FROM documents ORDER BY created_at DESC');
  return rows;
}

async function insertDocument(doc) {
  await pool.query(
    `INSERT INTO documents (doc_number, mode, client_name, client_cedula, client_phone, items, subtotal, iva_total, total)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [doc.docNumber, doc.mode, doc.clientName, doc.clientCedula, doc.clientPhone, JSON.stringify(doc.items), doc.subtotal, doc.ivaTotal, doc.total]
  );
}

async function updateDocument(id, doc) {
  await pool.query(
    `UPDATE documents SET client_name = $1, client_cedula = $2, client_phone = $3, items = $4, subtotal = $5, iva_total = $6, total = $7
     WHERE id = $8`,
    [doc.clientName, doc.clientCedula, doc.clientPhone, JSON.stringify(doc.items), doc.subtotal, doc.ivaTotal, doc.total, id]
  );
}

async function deleteDocument(id) {
  await pool.query('DELETE FROM documents WHERE id = $1', [id]);
}

/* ---------------- Respaldo ---------------- */

function getBackupFilePath() {
  // En modo Postgres el respaldo se hace con pg_dump desde Railway,
  // no con la descarga de un archivo.
  return null;
}

module.exports = {
  initDb, getProducts, bulkSetProducts, deleteProduct,
  getSettings, updateSettings, getDocuments, insertDocument,
  updateDocument, deleteDocument,
  getBackupFilePath,
};