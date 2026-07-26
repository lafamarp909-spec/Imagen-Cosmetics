const express = require('express');
const path = require('path');

const app = express();
app.use(express.json({ limit: '15mb' })); // el logo va como base64, puede pesar

const PORT = process.env.PORT || 3000;

// Si existe DATABASE_URL (por ejemplo cuando lo subas a Railway con internet),
// usa Postgres en la nube. Si NO existe (negocio sin internet), usa un archivo
// local (imagen.db) en esta misma carpeta. La API es idéntica en ambos casos,
// así que el resto del código nunca cambia.
const usingCloud = !!process.env.DATABASE_URL;
const db = usingCloud ? require('./db-pg') : require('./db-sqlite');

/* ---------------- Productos ---------------- */

app.get('/api/products', async (req, res) => {
  try {
    res.json(await db.getProducts());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo leer el catálogo' });
  }
});

app.put('/api/products/bulk', async (req, res) => {
  const products = req.body.products;
  if (!Array.isArray(products)) return res.status(400).json({ error: 'Formato invalido' });
  try {
    const result = await db.bulkSetProducts(products);
    res.json({ ok: true, count: result.count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo guardar el catálogo' });
  }
});

app.delete('/api/products/:code', async (req, res) => {
  try {
    await db.deleteProduct(req.params.code);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo eliminar el producto' });
  }
});

/* ---------------- Ajustes (logo, negocio, contador) ---------------- */

app.get('/api/settings', async (req, res) => {
  try {
    res.json(await db.getSettings());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo leer la configuracion' });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    await db.updateSettings(req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo guardar la configuracion' });
  }
});

/* ---------------- Documentos (facturas / cotizaciones) ---------------- */

app.get('/api/documents', async (req, res) => {
  const q = (req.query.q || '').trim();
  try {
    res.json(await db.getDocuments(q));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo leer el historial' });
  }
});

app.post('/api/documents', async (req, res) => {
  try {
    await db.insertDocument(req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo guardar el documento' });
  }
});

app.put('/api/documents/:id', async (req, res) => {
  try {
    await db.updateDocument(req.params.id, req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo actualizar el documento' });
  }
});

app.delete('/api/documents/:id', async (req, res) => {
  try {
    await db.deleteDocument(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo eliminar el documento' });
  }
});

/* ---------------- Respaldo ---------------- */
// Sin internet o sin BACKUP_KEY configurada: descarga libre (estás en tu propio computador).
// En Railway, configura la variable BACKUP_KEY y solo se podrá descargar con esa clave.
app.get('/api/backup', (req, res) => {
  const requiredKey = process.env.BACKUP_KEY;
  if (requiredKey) {
    if (req.query.key !== requiredKey) {
      return res.status(401).json({ error: 'Clave de respaldo incorrecta' });
    }
  }
  const filePath = db.getBackupFilePath();
  if (!filePath) {
    return res.status(501).json({ error: 'El respaldo por archivo no aplica en este modo (Postgres). Usa pg_dump desde Railway.' });
  }
  res.download(filePath, 'imagen-cosmetics-respaldo.db');
});

/* ---------------- Archivos estaticos (frontend) ---------------- */
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

db.initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Imagen Cosmetics escuchando en el puerto ${PORT}`);
      if (usingCloud) {
        console.log('Modo: NUBE con Postgres (DATABASE_URL configurada)');
      } else if (process.env.DB_DIR) {
        console.log(`Modo: NUBE con SQLite en volumen (${process.env.DB_DIR})`);
      } else {
        console.log('Modo: LOCAL (sin internet, archivo imagen.db en esta carpeta)');
        console.log(`Abre en el navegador: http://localhost:${PORT}`);
      }
    });
  })
  .catch((err) => {
    console.error('No se pudo iniciar la base de datos:', err);
    process.exit(1);
  });