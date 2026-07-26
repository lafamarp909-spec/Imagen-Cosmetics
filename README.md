# Imagen Cosmetics · Facturación

App de facturación/cotización con catálogo, lector de código, importación de Excel,
historial de clientes (con cédula), PDF, impresión y envío por WhatsApp.

**Funciona sin internet.** Los datos (productos, clientes/documentos, logo, datos
del negocio) se guardan en un archivo en el propio computador de la tienda
(`imagen.db`). No se pierden aunque apagues el computador, y no necesitas
conexión para usar la app en el día a día.

Cuando el negocio sí tenga internet, si quieres que quede disponible desde
cualquier lugar (celular, otra sede, etc.) puedes subirlo a Railway — no hay
que cambiar ni una línea de código, solo agregar la base de datos en la nube
(ver más abajo).

## Estructura

- `server.js` — servidor Express con la API.
- `db-sqlite.js` — guarda los datos en un archivo local (`imagen.db`). Se usa
  automáticamente cuando **no** hay conexión configurada.
- `db-pg.js` — guarda los datos en PostgreSQL en la nube. Se usa automáticamente
  cuando existe la variable `DATABASE_URL` (por ejemplo en Railway).
- `public/index.html` — la app (frontend), no cambia entre los dos modos.
- `package.json` — dependencias (`express`, `better-sqlite3`, `pg`).

## Uso en el negocio (SIN internet) — paso a paso

Necesitas hacer esto **una sola vez**, y para ese primer paso sí necesitas
internet un momento (puede ser el celular en modo datos, o cualquier wifi
cercano, solo para instalar). Después de eso, el programa funciona 100%
sin conexión, todos los días.

1. **Instalar Node.js** en el computador de la tienda (una sola vez):
   descárgalo de https://nodejs.org (elige la versión "LTS") e instálalo
   como cualquier programa de Windows/Mac.
2. Copia esta carpeta completa (`imagen-cosmetics-app`) al computador de la
   tienda, por ejemplo al Escritorio.
3. Abre una terminal (en Windows: busca "cmd" o "PowerShell"; en Mac: "Terminal")
   y entra a la carpeta:
   ```bash
   cd Escritorio/imagen-cosmetics-app
   ```
4. Instala las dependencias (esto sí necesita internet, se hace una sola vez):
   ```bash
   npm install
   ```
5. Descarga las 3 librerías que usan "Importar Excel" y "Descargar PDF"
   (una sola vez, con internet) siguiendo las instrucciones del archivo
   `public/vendor/LEEME.txt`. Sin este paso, esos dos botones no van a
   funcionar (el resto de la app sí funciona igual).
6. Inicia el programa:
   ```bash
   npm start
   ```
   Verás un mensaje como `Imagen Cosmetics escuchando en el puerto 3000` y
   `Modo: LOCAL (sin internet, archivo imagen.db)`.
6. Abre el navegador (Chrome, Edge, etc.) y entra a:
   ```
   http://localhost:3000
   ```
   Ahí está la app, funcionando sin necesidad de internet.

### Para usarlo todos los días

Nada de terminal ni comandos: solo haz doble clic en
`Abrir-Imagen-Cosmetics.bat` (Windows) o `Abrir-Imagen-Cosmetics.command`
(Mac). Eso abre el programa solo y lo muestra en el navegador. Deja ese
ícono en el escritorio para que sea igual de fácil que abrir cualquier
otro programa.

Si vas a entregarle el computador a alguien que no sabe de tecnología,
haz tú toda la instalación (pasos 1-6 de arriba) primero, deja el ícono
en el escritorio, y a él solo enséñale a hacer doble clic ahí. En el
archivo `LEEME-PRIMERO.txt` dejé instrucciones sin tecnicismos, pensadas
para esa persona.

### Usarlo desde el celular u otro computador de la misma tienda (sin internet)

Mientras estén conectados a la **misma red wifi local** (aunque esa red no
tenga salida a internet, solo sirve para conectar los aparatos entre sí),
puedes entrar desde el celular usando la IP del computador en vez de
`localhost`, por ejemplo `http://192.168.1.5:3000`. Si necesitas ayuda para
encontrar esa dirección, dímelo y te explico cómo verla en tu computador.

### Respaldo de la información

Todos los datos quedan en un solo archivo: `imagen.db` (dentro de la misma
carpeta del programa). Para respaldarlo, basta con copiar ese archivo a un
USB o a Drive de vez en cuando.

## Cuando ya tengan internet: subir a Railway (opcional)

### Opción recomendada para tu caso: todo en un solo repositorio, sin Postgres

Así los datos quedan guardados en un disco propio de Railway (un
"Volumen"), separado del código. Cuando subas actualizaciones de código
desde otra ciudad (`git push`), los datos **no se borran** — y no dependes
de un servicio de base de datos aparte que se pueda "caer" por su cuenta.

1. Crea una cuenta en https://railway.app y sube este proyecto a un
   repositorio de GitHub.
2. En Railway: **New Project → Deploy from GitHub repo** y selecciona
   este repositorio.
3. Entra al servicio que se creó → pestaña **Settings → Volumes** → **+ New
   Volume**. Como "Mount path" pon `/data`.
4. En **Variables**, agrega una variable `DB_DIR` con el valor `/data`
   (así el programa guarda el archivo `imagen.db` dentro del volumen, no
   en el código).
5. Agrega también una variable `BACKUP_KEY` con una clave que tú
   inventes (por ejemplo `imagen2026seguro`). Esa clave protege el botón
   de "Descargar respaldo" de la app, para que nadie más que tú pueda
   bajarse toda tu información desde internet.
6. Verifica que el **Start Command** sea `npm start` (Railway lo detecta
   solo desde `package.json`).
7. Railway te da una URL pública. Ábrela y listo.

De ahí en adelante, cada vez que quieras actualizar la app desde otra
ciudad, solo subes los cambios a GitHub (`git push`) y Railway
redespliega el código — el volumen con tus datos queda intacto.

**Importante — ninguna nube es 100% a prueba de todo:** si algún día
borras el proyecto completo de Railway (no solo dejas de pagar, sino que
lo eliminas), el volumen se borra con él, igual que pasaría con
cualquier otro proveedor. Por eso conviene bajar de vez en cuando una
copia del archivo `imagen.db` a tu computador — con la CLI de Railway
puedes hacerlo en un minuto. Si quieres, te dejo armado un botón dentro
de la misma app para descargar ese respaldo con un clic, sin usar la
terminal.

### Alternativa: Postgres como servicio aparte

1. Crea una cuenta en https://railway.app (gratis para empezar).
2. Sube este proyecto a un repositorio de GitHub (o usa la CLI de Railway,
   ver abajo).
3. En Railway: **New Project → Deploy from GitHub repo** y selecciona este
   repositorio.
4. En el mismo proyecto, haz clic en **+ New → Database → Add PostgreSQL**.
   Railway crea automáticamente la variable `DATABASE_URL` y la conecta a tu
   servicio — en cuanto exista esa variable, el programa cambia solo al modo
   nube (`db-pg.js`), sin tocar código.
5. Verifica que el servicio tenga como **Start Command**: `npm start`
   (Railway normalmente lo detecta solo desde `package.json`).
6. Railway te da una URL pública (algo como `imagen-cosmetics.up.railway.app`).
   Ábrela y listo — ya queda corriendo 24/7, aunque cierres tu computador.

### Alternativa: desde tu computador con la CLI (sin GitHub)

```bash
npm install -g @railway/cli
railway login
cd imagen-cosmetics-app
railway init
railway up
```
Luego en el dashboard de Railway agrega el plugin de **PostgreSQL** al mismo
proyecto (paso 4 arriba) para que `DATABASE_URL` quede disponible.

## Notas

- El catálogo se sincroniza completo cada vez que agregas, editas, borras o
  importas un Excel — así que al volver a importar el mismo archivo, los
  productos que ya existen (por código, o por nombre si el Excel no trae
  código) se **actualizan en vez de duplicarse**.
- El historial de documentos (facturas/cotizaciones) queda guardado con la
  cédula del cliente para poder buscarlo después.
- El logo se guarda dentro de la misma base de datos (local o en la nube),
  no se necesita almacenamiento de archivos aparte.
