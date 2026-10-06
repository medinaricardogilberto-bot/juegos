// server/salas.js — salas, jugadores, desconexiones y reconexión.
// Cada jugador recibe un TOKEN secreto (solo él lo conoce). Con el código de sala + su token
// puede volver a entrar aunque recargue la página o pierda el Wi-Fi un momento.
const crypto = require("crypto");
const { crearMotorMemorama } = require("./memorama-motor");
const { crearMotorRompecabezas } = require("./rompecabezas-motor");
const { crearMotorNuevo, sanear, JUEGOS_NUEVOS } = require("./nuevos");

const JUEGOS = ["memorama", "rompecabezas", ...JUEGOS_NUEVOS];
const MAX_JUGADORES = 4;
const MIN_PARA_INICIAR = 2;
const MAX_SALAS = 200; // límite para que el servidor público no se llene de salas
const GRACIA_MS = Number(process.env.GRACIA_MS) || 60000; // tiempo para volver antes de ser retirado
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin O/0/I/1 para no confundir

function registrar(io) {
  const salas = new Map();   // código -> sala
  const enSala = new Map();  // socket.id -> { codigo, jugadorId }
  const motores = { memorama: crearMotorMemorama(io), rompecabezas: crearMotorRompecabezas(io) };
  JUEGOS_NUEVOS.forEach(id => { motores[id] = crearMotorNuevo(io, id); });
  const requiereListos = (juego) => JUEGOS_NUEVOS.includes(juego); // los juegos nuevos piden confirmar "listo" antes de empezar

  const limpiarNombre = (n) => String(n ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 16);
  const limpiarCodigo = (c) => String(c ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

  function codigoNuevo() {
    let c;
    do { c = Array.from({ length: 6 }, () => ALFABETO[crypto.randomInt(ALFABETO.length)]).join(""); }
    while (salas.has(c));
    return c;
  }

  function buscar(socket) {
    const ref = enSala.get(socket.id);
    const sala = ref && salas.get(ref.codigo);
    const jugador = sala && sala.jugadores.find(j => j.id === ref.jugadorId);
    return jugador ? { sala, jugador } : null;
  }

  // Lo que se envía a los navegadores (nunca el token ni datos internos)
  const publico = (s) => ({
    codigo: s.codigo, juego: s.juego, estado: s.estado, anfitrion: s.anfitrion,
    max: MAX_JUGADORES, minimo: MIN_PARA_INICIAR,
    visibilidad: s.visibilidad, params: s.params, requiereListos: requiereListos(s.juego),
    jugadores: s.jugadores.map(j => ({ id: j.id, nombre: j.nombre, puntos: j.puntos, conectado: j.conectado, listo: !!j.listo }))
  });
  const difundir = (s) => io.to(s.codigo).emit("sala:estado", publico(s));
  const avisar = (s, texto) => io.to(s.codigo).emit("sala:aviso", texto);

  function agregar(socket, s, nombre) {
    const j = { id: crypto.randomBytes(4).toString("hex"), token: crypto.randomBytes(16).toString("hex"),
                nombre, puntos: 0, conectado: true, listo: false, socketId: socket.id, timer: null };
    s.jugadores.push(j);
    enSala.set(socket.id, { codigo: s.codigo, jugadorId: j.id });
    socket.join(s.codigo);
    return j;
  }

  // Retira a un jugador de forma definitiva (abandonó o no volvió a tiempo)
  function quitar(s, j, texto) {
    clearTimeout(j.timer); j.timer = null;
    if (j.socketId) enSala.delete(j.socketId);
    const i = s.jugadores.indexOf(j);
    if (i < 0) return;
    s.jugadores.splice(i, 1);
    if (s.jugadores.length === 0) {
      if (motores[s.juego]) motores[s.juego].limpiar(s);
      salas.delete(s.codigo);
      return;
    }
    let msg = texto;
    if (s.anfitrion === j.id) {
      const nuevo = s.jugadores.find(x => x.conectado) || s.jugadores[0];
      s.anfitrion = nuevo.id;
      msg += ` ${nuevo.nombre} es ahora el anfitrión.`;
    }
    avisar(s, msg);
    difundir(s);
    if (motores[s.juego]) motores[s.juego].jugadorSalio(s, j, i);
  }

  function salir(socket) { // el jugador eligió abandonar
    const ref = buscar(socket);
    if (!ref) return;
    socket.leave(ref.sala.codigo);
    quitar(ref.sala, ref.jugador, `${ref.jugador.nombre} ha abandonado la partida.`);
  }

  function desconectar(socket) { // se cayó la conexión: se le guarda su lugar un tiempo
    const ref = buscar(socket);
    enSala.delete(socket.id);
    if (!ref) return;
    const { sala: s, jugador: j } = ref;
    if (j.socketId !== socket.id) return; // ya se reconectó desde otro socket
    j.conectado = false; j.socketId = null;
    let msg = `${j.nombre} se ha desconectado.`;
    if (s.anfitrion === j.id) {
      const otro = s.jugadores.find(x => x.conectado);
      if (otro) { s.anfitrion = otro.id; msg += ` ${otro.nombre} es ahora el anfitrión.`; }
    }
    avisar(s, msg);
    difundir(s);
    const m = motores[s.juego];
    if (m) m.jugadorDesconectado(s, j);
    j.timer = setTimeout(() => {
      j.timer = null;
      if (!j.conectado && s.jugadores.includes(j)) quitar(s, j, `${j.nombre} no volvió a la partida y fue retirado.`);
    }, GRACIA_MS);
    if (j.timer.unref) j.timer.unref();
  }

  io.on("connection", (socket) => {
    const respuesta = (ack) => (typeof ack === "function" ? ack : () => {});
    Object.values(motores).forEach(m => m.eventos(socket, buscar));

    socket.on("sala:crear", (datos, ack) => {
      const responder = respuesta(ack);
      const nombre = limpiarNombre(datos && datos.nombre);
      if (!nombre) return responder({ ok: false, error: "Escribe tu nombre." });
      if (!datos || !JUEGOS.includes(datos.juego)) return responder({ ok: false, error: "Juego no válido." });
      salir(socket);
      if (salas.size >= MAX_SALAS) return responder({ ok: false, error: "El servidor está lleno. Intenta de nuevo en unos minutos." });
      const s = { codigo: codigoNuevo(), juego: datos.juego, estado: "esperando", anfitrion: null, jugadores: [], partida: null,
                  visibilidad: datos.visibilidad === "publica" ? "publica" : "privada", params: sanear(datos.juego, datos.params) };
      salas.set(s.codigo, s);
      const j = agregar(socket, s, nombre);
      s.anfitrion = j.id;
      difundir(s);
      responder({ ok: true, yo: j.id, token: j.token, sala: publico(s) });
    });

    socket.on("sala:unirse", (datos, ack) => {
      const responder = respuesta(ack);
      const nombre = limpiarNombre(datos && datos.nombre);
      const s = salas.get(limpiarCodigo(datos && datos.codigo));
      if (!nombre) return responder({ ok: false, error: "Escribe tu nombre." });
      if (!s) return responder({ ok: false, error: "No existe una sala con ese código." });
      if (s.estado !== "esperando") return responder({ ok: false, error: "Esa partida ya comenzó." });
      if (s.jugadores.length >= MAX_JUGADORES) return responder({ ok: false, error: "La sala está llena." });
      if (s.jugadores.some(j => j.nombre.toLowerCase() === nombre.toLowerCase()))
        return responder({ ok: false, error: "Ya hay un jugador con ese nombre. Elige otro." });
      salir(socket);
      const j = agregar(socket, s, nombre);
      avisar(s, `${j.nombre} se ha unido.`);
      difundir(s);
      responder({ ok: true, yo: j.id, token: j.token, sala: publico(s) });
    });

    // Volver a la sala con el código + token guardados (recarga de página o caída de red)
    socket.on("sala:reconectar", (datos, ack) => {
      const responder = respuesta(ack);
      const s = salas.get(limpiarCodigo(datos && datos.codigo));
      const j = s && datos && typeof datos.token === "string" ? s.jugadores.find(x => x.token === datos.token) : null;
      if (!j) return responder({ ok: false, error: "Esa partida ya no existe o fuiste retirado." });
      const previo = buscar(socket);
      if (previo && previo.jugador !== j) salir(socket);
      if (j.socketId && j.socketId !== socket.id) enSala.delete(j.socketId);
      clearTimeout(j.timer); j.timer = null;
      const estabaAusente = !j.conectado;
      j.conectado = true; j.socketId = socket.id;
      enSala.set(socket.id, { codigo: s.codigo, jugadorId: j.id });
      socket.join(s.codigo);
      if (estabaAusente) avisar(s, `${j.nombre} ha vuelto.`);
      difundir(s);
      const m = motores[s.juego];
      m.jugadorVolvio(s, j);
      responder({ ok: true, yo: j.id, token: j.token, sala: publico(s),
                  snapshot: s.partida && s.estado !== "esperando" ? m.snapshot(s, j) : null });
    });

    // Salas públicas que esperan jugadores (las privadas nunca aparecen aquí)
    socket.on("sala:listar", (datos, ack) => {
      const juego = datos && typeof datos.juego === "string" ? datos.juego : null;
      const lista = [...salas.values()]
        .filter(x => x.visibilidad === "publica" && x.estado === "esperando" && x.jugadores.length < MAX_JUGADORES && (!juego || x.juego === juego))
        .slice(0, 20)
        .map(x => { const a = x.jugadores.find(j => j.id === x.anfitrion); return { codigo: x.codigo, juego: x.juego, anfitrion: a ? a.nombre : "", jugadores: x.jugadores.length, max: MAX_JUGADORES }; });
      respuesta(ack)({ ok: true, salas: lista });
    });

    // Confirmar (o quitar) "estoy listo"
    socket.on("sala:listo", (datos, ack) => {
      const responder = respuesta(ack);
      const ref = buscar(socket);
      if (!ref) return responder({ ok: false, error: "No estás en una sala." });
      if (ref.sala.estado !== "esperando") return responder({ ok: false, error: "La partida ya comenzó." });
      ref.jugador.listo = !!(datos && datos.listo);
      difundir(ref.sala);
      responder({ ok: true });
    });

    // El anfitrión elige las reglas de la partida (todos las ven y deben volver a confirmar "listo")
    socket.on("sala:params", (datos, ack) => {
      const responder = respuesta(ack);
      const ref = buscar(socket);
      if (!ref) return responder({ ok: false, error: "No estás en una sala." });
      const s = ref.sala;
      if (s.anfitrion !== ref.jugador.id) return responder({ ok: false, error: "Solo el anfitrión cambia las reglas." });
      if (s.estado !== "esperando") return responder({ ok: false, error: "La partida ya comenzó." });
      s.params = sanear(s.juego, datos && datos.params);
      if (datos && (datos.visibilidad === "publica" || datos.visibilidad === "privada")) s.visibilidad = datos.visibilidad;
      s.jugadores.forEach(j => { j.listo = false; });
      difundir(s);
      responder({ ok: true });
    });

    socket.on("sala:salir", (_d, ack) => { salir(socket); respuesta(ack)({ ok: true }); });

    socket.on("sala:iniciar", (_d, ack) => {
      const responder = respuesta(ack);
      const ref = buscar(socket);
      if (!ref) return responder({ ok: false, error: "No estás en una sala." });
      const s = ref.sala;
      if (s.anfitrion !== ref.jugador.id) return responder({ ok: false, error: "Solo el anfitrión puede iniciar." });
      if (s.estado !== "esperando") return responder({ ok: false, error: "La partida ya comenzó." });
      if (s.jugadores.filter(j => j.conectado).length < MIN_PARA_INICIAR)
        return responder({ ok: false, error: `Se necesitan al menos ${MIN_PARA_INICIAR} jugadores conectados.` });
      if (requiereListos(s.juego) && s.jugadores.some(j => j.conectado && j.id !== s.anfitrion && !j.listo))
        return responder({ ok: false, error: "Faltan jugadores por confirmar que están listos." });
      s.jugadores.filter(j => !j.conectado).forEach(j => quitar(s, j, `${j.nombre} no estaba conectado y fue retirado.`));
      motores[s.juego].iniciar(s);
      responder({ ok: true });
    });

    // El anfitrión regresa a todos a la sala de espera (para jugar otra vez)
    socket.on("sala:volver", (_d, ack) => {
      const responder = respuesta(ack);
      const ref = buscar(socket);
      if (!ref) return responder({ ok: false, error: "No estás en una sala." });
      const s = ref.sala;
      if (s.anfitrion !== ref.jugador.id) return responder({ ok: false, error: "Solo el anfitrión puede hacerlo." });
      if (s.estado !== "terminada") return responder({ ok: false, error: "La partida aún no termina." });
      motores[s.juego].limpiar(s);
      s.partida = null; s.estado = "esperando";
      s.jugadores.forEach(j => { j.puntos = 0; j.parejas = 0; j.fijas = 0; j.lugar = null; j.listo = false; });
      io.to(s.codigo).emit("partida:cerrar");
      difundir(s);
      responder({ ok: true });
    });

    // Revancha: el anfitrión empieza otra partida con los mismos jugadores y reglas
    socket.on("sala:revancha", (_d, ack) => {
      const responder = respuesta(ack);
      const ref = buscar(socket);
      if (!ref) return responder({ ok: false, error: "No estás en una sala." });
      const s = ref.sala;
      if (s.anfitrion !== ref.jugador.id) return responder({ ok: false, error: "Solo el anfitrión puede pedir la revancha." });
      if (s.estado !== "terminada") return responder({ ok: false, error: "La partida aún no termina." });
      s.jugadores.filter(j => !j.conectado).forEach(j => quitar(s, j, `${j.nombre} no estaba conectado y fue retirado.`));
      if (s.jugadores.length < MIN_PARA_INICIAR) return responder({ ok: false, error: `Se necesitan al menos ${MIN_PARA_INICIAR} jugadores conectados.` });
      motores[s.juego].limpiar(s);
      s.partida = null; s.estado = "esperando";
      s.jugadores.forEach(j => { j.puntos = 0; j.parejas = 0; j.fijas = 0; j.lugar = null; j.listo = true; });
      motores[s.juego].iniciar(s);
      difundir(s);
      responder({ ok: true });
    });

    socket.on("disconnect", () => desconectar(socket));
  });
}

module.exports = { registrar };
