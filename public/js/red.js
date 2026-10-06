/* red.js — conexión con el servidor y luz de estado.
   Si config.js define SERVIDOR_URL (sitio estático en un dominio y servidor de salas en otro) el cliente de
   Socket.IO se carga desde ese servidor; si no, se usa el mismo origen (server.js sirviendo todo, p. ej. npm start). */
const Red = {
  socket: null,
  conectado: false,
  remoto: false,
  poner(clase, msg) {
    const caja = document.getElementById("estado"), texto = document.getElementById("estado-texto");
    caja.className = "estado " + clase; texto.textContent = msg;
  },
  cargar(src) {
    return new Promise((ok, fallo) => {
      const s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = () => fallo(new Error("no carga"));
      document.head.appendChild(s);
    });
  },
  async iniciar() {
    const url = (window.SERVIDOR_URL || "").replace(/\/+$/, "");
    this.remoto = !!url;
    if (url && typeof io === "undefined") {
      this.poner("estado--no", "Conectando con el servidor de salas…");
      try { await Promise.race([this.cargar(url + "/socket.io/socket.io.js"), new Promise((_, no) => setTimeout(() => no(new Error("tiempo")), 20000))]); }
      catch (e) { this.poner("estado--no", "Servidor de salas no disponible · modos sin conexión disponibles"); return; }
    }
    if (typeof io === "undefined") { this.poner("estado--no", "Sin servidor · modos sin conexión disponibles"); return; }
    this.socket = url ? io(url, { transports: ["websocket", "polling"] }) : io();
    const texto = document.getElementById("estado-texto");
    this.socket.on("connect", () => { this.conectado = true; this.poner("estado--si", "Conectado al servidor"); });
    this.socket.on("disconnect", () => { this.conectado = false; this.poner("estado--no", "Sin conexión · reconectando…"); });
    this.socket.on("connect_error", () => { if (!this.conectado) this.poner("estado--no", this.remoto ? "Despertando el servidor… puede tardar hasta un minuto" : "Sin conexión · reconectando…"); });
    this.socket.on("conectados", (n) => {
      if (this.conectado) texto.textContent = "Conectado · " + n + (n === 1 ? " jugador en línea" : " jugadores en línea");
    });
  }
};
