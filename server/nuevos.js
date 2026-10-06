// server/nuevos.js — adaptador de salas para los cinco juegos nuevos.
// Los motores puros viven en public/motores (se comparten con el navegador); aquí el servidor es el árbitro:
// guarda el estado oficial, valida cada acción, controla el reloj y envía a CADA jugador solo su vista
// (nunca respuestas correctas, soluciones ni posiciones de palabras antes de tiempo).
const crypto = require("crypto");
const Base = require("../public/motores/base");

const MOTORES = {
  trivia: require("../public/motores/trivia"),
  ordena: require("../public/motores/ordena"),
  quiensoy: require("../public/motores/quiensoy"),
  sopa: require("../public/motores/sopa"),
  misterio: require("../public/motores/misterio")
};
const BANCO = {
  trivia: require("../public/datos/trivia"),
  ordena: require("../public/datos/ordena"),
  quiensoy: require("../public/datos/quiensoy"),
  sopa: require("../public/datos/sopa"),
  misterio: require("../public/datos/misterio")
};
// Parámetros que el anfitrión puede elegir en la sala (todo lo demás se descarta)
const CLAVES = {
  trivia: ["dificultad", "categoria", "preguntas", "segundos"],
  ordena: ["nivel", "rondas", "pistas"],
  quiensoy: ["dificultad", "modalidad", "rondas", "segundosPista"],
  sopa: ["dificultad", "categoria", "pistas", "limite"],
  misterio: ["caso", "modo", "limite"]
};
const JUEGOS_NUEVOS = Object.keys(MOTORES);
const TICK_MS = 500;
const MAX_ACCIONES_POR_SEG = 15;

const env = { ahora: () => Date.now(), azar: (n) => (n <= 1 ? 0 : crypto.randomInt(n)), banco: BANCO };

function sanear(juego, params) {
  const limpio = {};
  if (!params || typeof params !== "object" || !CLAVES[juego]) return limpio;
  for (const k of CLAVES[juego]) {
    const v = params[k];
    if (typeof v === "string") limpio[k] = v.slice(0, 24);
    else if (typeof v === "number" && Number.isFinite(v)) limpio[k] = v;
    else if (typeof v === "boolean") limpio[k] = v;
  }
  return limpio;
}

function crearMotorNuevo(io, id) {
  const Motor = MOTORES[id];
  const vistaPara = (s, j) => Motor.vista(s.partida.e, j.id, env);

  // Envía a cada jugador conectado SU vista (solo si el estado oficial cambió)
  function difundir(s, forzar) {
    const p = s.partida;
    if (!p || !p.e) return;
    if (!forzar && p.revEnviada === p.e.rev) return;
    p.revEnviada = p.e.rev;
    s.jugadores.forEach(j => { if (j.socketId) io.to(j.socketId).emit("juego:vista", vistaPara(s, j)); });
    if (p.e.fase === "fin" && s.estado !== "terminada") terminarSala(s);
  }

  function terminarSala(s) {
    s.estado = "terminada";
    clearInterval(s.partida.timer); s.partida.timer = null;
    s.partida.e.jugadores.forEach(x => { const j = s.jugadores.find(y => y.id === x.id); if (j) j.puntos = x.puntos; });
  }

  function avanzarTiempo(s) {
    const p = s.partida;
    if (!p || !p.e || p.e.fase === "fin") return;
    p.e.anfitrion = s.anfitrion;
    Motor.tick(p.e, env);
    difundir(s);
  }

  function iniciar(s) {
    const params = Object.assign({}, sanear(id, s.params), { online: true, formato: "simultaneo" });
    const jugadores = s.jugadores.map(j => ({ id: j.id, nombre: j.nombre }));
    const e = Motor.crear(params, jugadores, env);
    e.anfitrion = s.anfitrion;
    s.estado = "jugando";
    s.partida = { e, revEnviada: -1, timer: setInterval(() => avanzarTiempo(s), TICK_MS) };
    if (s.partida.timer.unref) s.partida.timer.unref();
    // "partida:inicio" lleva la primera vista de cada jugador
    s.jugadores.forEach(j => { if (j.socketId) io.to(j.socketId).emit("partida:inicio", { juego: id, vista: vistaPara(s, j) }); });
    s.partida.revEnviada = e.rev;
  }

  function eventos(socket, buscar) {
    socket.on(id + ":accion", (datos, ack) => {
      const responder = typeof ack === "function" ? ack : () => {};
      const ref = buscar(socket);
      if (!ref || ref.sala.juego !== id || !ref.sala.partida || !ref.sala.partida.e) return responder({ ok: false, error: "No estás en una partida de este juego." });
      const ahora = Date.now();
      socket.data = socket.data || {};
      socket.data.acc = (socket.data.acc || []).filter(t => ahora - t < 1000);
      if (socket.data.acc.length >= MAX_ACCIONES_POR_SEG) return responder({ ok: false, error: "Vas demasiado rápido." });
      socket.data.acc.push(ahora);
      const s = ref.sala, e = s.partida.e;
      if (s.estado !== "jugando") return responder({ ok: false, error: "La partida no está activa." });
      e.anfitrion = s.anfitrion;
      let r;
      try { r = Motor.accion(e, ref.jugador.id, datos, env); }
      catch (err) { console.error("Error en " + id + ":", err); r = { ok: false, error: "No se pudo procesar la acción." }; }
      difundir(s);
      responder(r);
    });
  }

  function snapshot(s, j) { return { juego: id, vista: vistaPara(s, j) }; }

  function jugadorDesconectado(s, j) {
    if (!s.partida || !s.partida.e) return;
    Motor.conexion(s.partida.e, j.id, false, env);
    s.partida.e.anfitrion = s.anfitrion;
    difundir(s);
  }
  function jugadorVolvio(s, j) {
    if (!s.partida || !s.partida.e) return;
    Motor.conexion(s.partida.e, j.id, true, env);
    s.partida.e.anfitrion = s.anfitrion;
    difundir(s, true);
  }
  function jugadorSalio(s, j) {
    const p = s.partida;
    if (!p || !p.e || p.e.fase === "fin") return;
    const e = p.e;
    Motor.salio(e, j.id, env);
    e.anfitrion = s.anfitrion;
    if (Base.activosRestantes(e) <= 1) { // se quedó una sola persona: la partida termina
      const ranking = Base.ranking(e);
      const resto = e.jugadores.filter(x => !x.retirado).map(x => x.id);
      e.fase = "fin"; e.activo = null;
      e.fin = Object.assign(e.fin || {}, { ranking, ganadores: resto, motivo: "abandono", segundos: Math.round((Date.now() - e.inicio) / 1000),
        coop: e.params.modo === "coop", equipoPuntos: e.equipo ? e.equipo.puntos : null, total: e.total || e.totalRondas || null, logros: {} });
      Base.cambio(e);
    }
    difundir(s);
  }

  function limpiar(s) {
    if (s.partida && s.partida.timer) { clearInterval(s.partida.timer); s.partida.timer = null; }
  }

  return { iniciar, eventos, snapshot, jugadorDesconectado, jugadorVolvio, jugadorSalio, limpiar };
}

module.exports = { crearMotorNuevo, sanear, JUEGOS_NUEVOS, MOTORES, BANCO, env };
