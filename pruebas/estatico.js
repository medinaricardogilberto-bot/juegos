// Servidor estático mínimo para probar la interfaz sin Socket.IO: node pruebas/estatico.js [puerto]
const http = require("http"), fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..", "public");
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg" };
function crear() {
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("no"); }
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
  });
}
module.exports = { crear };
if (require.main === module) crear().listen(Number(process.argv[2]) || 8099, () => console.log("estático en", process.argv[2] || 8099));
