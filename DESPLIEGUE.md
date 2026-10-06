# Publicar en tu propio dominio (sin depender de Netlify ni de ningún servicio)

La plataforma son archivos HTML/CSS/JS (carpeta `public/`) y, **solo para las salas en línea**, un servidor Node.js (`server.js`). Todas las rutas son relativas: funciona en la raíz del dominio, en un subdominio o en una subcarpeta (el sitio; el servidor Node conviene en raíz o subdominio).

Elige según lo que incluya tu hosting:

| Tu hosting | Qué obtienes | Qué haces |
|---|---|---|
| **A. Hosting común** (cPanel, Hostinger, GoDaddy…, solo HTML/PHP) | Un jugador + mismo dispositivo en los 7 juegos. **Sin** salas en línea. | Subir el contenido de `public/` |
| **B. Hosting con Node.js** (VPS, cPanel «Setup Node.js App», Railway…) | **Todo**, incluidas salas en línea, en un solo dominio | Subir el proyecto y arrancar `server.js` |
| **C. Sitio estático + servidor aparte** | Todo | Opción A para el sitio + Opción B en un subdominio o servicio gratuito (Render) |

---

## A. Solo archivos estáticos (lo más simple)
1. Sube **el contenido** de la carpeta `public/` (no la carpeta en sí) a `public_html/` (o a la carpeta del dominio), incluido el archivo oculto `.htaccess`. Si usas la ruta del administrador de archivos de cPanel, activa «Mostrar archivos ocultos».
2. Abre tu dominio. Listo. No hay compilación ni variables de entorno.
3. En esta modalidad el indicador dirá «Sin servidor»: es normal; el modo online no está disponible, lo demás sí.

> `.htaccess` es opcional y solo lo entienden Apache/LiteSpeed (la mayoría de los hostings compartidos). Si tu hosting usa otro servidor, bórralo. Para Nginx, ver al final.

## B. Servidor Node.js en tu dominio (todo en uno)
Requisitos: Node.js 18 o superior.

**En un VPS o servidor propio**
```bash
# subir el proyecto (sin node_modules) a /var/www/juegos, luego:
cd /var/www/juegos
npm install --omit=dev
npm install -g pm2
pm2 start server.js --name juegos     # PORT=3000 por defecto; cámbialo con PORT=...
pm2 save && pm2 startup               # arranque automático al reiniciar
```
Pon un proxy inverso con HTTPS delante (ver «Nginx»). Los WebSockets requieren las cabeceras `Upgrade`/`Connection` que incluye el ejemplo.

**En cPanel («Setup Node.js App»)**
1. Sube el proyecto a una carpeta (p. ej. `juegos/`, fuera de `public_html`) y crea la aplicación: *Application root* = esa carpeta, *Startup file* = `server.js`, Node 18+, *Application URL* = tu dominio o subdominio (mejor que subcarpeta).
2. Pulsa **Run NPM Install** y luego **Restart**.
3. Si el hosting no admite WebSockets, Socket.IO cambia solo a *long polling*; las salas siguen funcionando.

No necesitas variables de entorno: `ORIGENES_PERMITIDOS` se deja vacío y `public/config.js` se queda con `SERVIDOR_URL = ""`.

## C. Sitio estático en un dominio y servidor en otro
1. Levanta el servidor como en B, en otra dirección (p. ej. `https://salas.tudominio.com`) o en un servicio gratuito (`render.yaml` es un ejemplo para Render). Comprueba que `https://salas.tudominio.com/salud` responde `ok`.
2. En el servidor define `ORIGENES_PERMITIDOS=https://tudominio.com,https://www.tudominio.com` (las direcciones exactas del sitio, sin `/` final).
3. En el sitio edita `public/config.js` y pon `window.SERVIDOR_URL = "https://salas.tudominio.com";` antes de subirlo (HTTPS obligatorio si el sitio es HTTPS).

## Comprobar
- Abre el sitio en dos dispositivos: el indicador debe decir «Conectado al servidor» (modalidades B y C).
- En uno: juego → *Multijugador online* → **Crear sala**; en el otro, **Unirse** con el código.
- Cierra la pestaña de un jugador y reábrela antes de 60 s: debe volver a la partida.

## Nginx (VPS)
```nginx
server {
  server_name tudominio.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
  }
}
```
Activa HTTPS con `certbot --nginx -d tudominio.com`. Para el sitio estático solo (modalidad A), basta `root /var/www/juegos/public; index index.html;`.

## Notas
- Las salas viven en memoria: si el servidor se reinicia, las partidas en curso se pierden. Récords, experiencia e insignias se guardan en el dispositivo (localStorage).
- Hostings gratuitos como Render duermen el servicio tras ~15 min sin uso; en un VPS o hosting de pago no ocurre.
- Para actualizar: vuelve a subir los archivos que cambiaron (y reinicia la app en B/C).

## Pruebas
```bash
npm test        # reglas de los juegos + salas con Socket.IO simulado (sin red)
npm run test:ui # interfaz en Chromium (requiere: npm i -D playwright && npx playwright install chromium)
```
