// server.js — servidor de la plataforma (Express + Socket.IO). Sirve public/ y las salas en línea desde un solo dominio.
const path = require("path");
const os = require("os");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const { registrar } = require("./server/salas");

const PUERTO = process.env.PORT || 3000;
const app = express();
const servidor = http.createServer(app);
// ORIGENES_PERMITIDOS: direcciones del sitio (p. ej. https://www.tudominio.com) separadas por comas.
// Vacío = solo el mismo origen (el sitio y el servidor en el mismo dominio, o uso local con npm start).
const origenes = (process.env.ORIGENES_PERMITIDOS || "").split(",").map(x => x.trim()).filter(Boolean);
const io = new Server(servidor, {
  maxHttpBufferSize: 1e4, // mensajes pequeños: evita abusos cuando el servidor está en internet
  cors: origenes.length ? { origin: origenes, methods: ["GET", "POST"] } : undefined
});

// Ruta de comprobación (los servicios en la nube la usan para saber que el servidor está vivo)
app.get("/salud", (_req, res) => {
  if (origenes.length) res.set("Access-Control-Allow-Origin", origenes.includes(_req.get("origin")) ? _req.get("origin") : origenes[0]);
  res.type("text").send("ok");
});

// Página web (carpeta public) y tipografías locales (funcionan sin internet)
app.use(express.static(path.join(__dirname, "public")));
// (las tipografías ya viven en public/fuentes, que se sirve arriba)

registrar(io); // salas y jugadores (server/salas.js)

// Conexiones en tiempo real (por ahora solo contamos jugadores conectados)
io.on("connection", (socket) => {
  console.log("Jugador conectado:", socket.id);
  io.emit("conectados", io.engine.clientsCount);
  socket.on("disconnect", () => {
    console.log("Jugador desconectado:", socket.id);
    io.emit("conectados", io.engine.clientsCount);
  });
});

// "0.0.0.0" = aceptar conexiones de otros dispositivos de la red
servidor.listen(PUERTO, "0.0.0.0", () => {
  console.log("\n  Juegos Educativos — servidor listo\n");
  console.log("  En esta computadora:  http://localhost:" + PUERTO);
  for (const lista of Object.values(os.networkInterfaces())) {
    for (const r of lista) {
      if (r.family === "IPv4" && !r.internal) {
        console.log("  En tu Wi-Fi (otros):  http://" + r.address + ":" + PUERTO);
      }
    }
  }
  console.log("\n  Para detenerlo: Ctrl + C\n");
});
