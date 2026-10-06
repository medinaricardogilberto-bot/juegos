// server/rompecabezas-motor.js — rompecabezas multijugador (carrera).
// Todos arman el MISMO rompecabezas (mismos bordes y mismo orden de piezas, decididos aquí).
// El servidor valida cada encaje, lleva el progreso y reparte los puntos.
const crypto = require("crypto");

const FILAS = 4, COLUMNAS = 3, TOTAL = FILAS * COLUMNAS;
const PUNTOS_PIEZA = 10;                 // por cada pieza encajada
const BONUS_LUGAR = [100, 60, 30, 10];   // 1.º, 2.º, 3.º, resto
const TIEMPO_BASE = 120;                 // bonus por tiempo = máx(0, 120 − segundos)
const CUENTA_ATRAS = 3000;               // ms antes de poder mover piezas
const TOLERANCIA = 0.25;                 // distancia máxima al lugar correcto (en "piezas")
const MIN_ENTRE_ENCAJES = 400;           // ms; un humano no encaja dos piezas más rápido
const GRACIA_TRAS_PRIMERO = 90000;       // ms que tienen los demás cuando alguien termina

function barajar(lista) {
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const lado = () => (crypto.randomInt(2) ? 1 : -1);

function crearMotorRompecabezas(io) {
  const emitir = (s, ev, d) => io.to(s.codigo).emit(ev, d);
  const resumen = (s) => s.jugadores.map(j => ({ id: j.id, nombre: j.nombre, puntos: j.puntos, fijas: j.fijas || 0, lugar: j.lugar || null, conectado: j.conectado !== false }));
  const todosTerminaron = (s) => s.jugadores.every(j => j.lugar);

  function iniciar(s) {
    s.jugadores.forEach(j => { j.puntos = 0; j.fijas = 0; j.lugar = null; j.segundos = null; });
    s.estado = "jugando";
    const config = {
      hBorde: Array.from({ length: FILAS - 1 }, () => Array.from({ length: COLUMNAS }, lado)),
      vBorde: Array.from({ length: FILAS }, () => Array.from({ length: COLUMNAS - 1 }, lado)),
      orden: barajar([...Array(TOTAL).keys()])
    };
    const p = s.partida = { config, arranque: Date.now() + CUENTA_ATRAS, fijasPor: {}, ultimo: {}, terminaron: 0, timerYa: null, timerCierre: null };
    s.jugadores.forEach(j => { p.fijasPor[j.id] = new Set(); });
    emitir(s, "partida:inicio", { juego: "rompecabezas", total: TOTAL, config, cuenta: CUENTA_ATRAS, jugadores: resumen(s) });
    p.timerYa = setTimeout(() => { p.timerYa = null; emitir(s, "rompecabezas:ya", {}); }, CUENTA_ATRAS);
  }

  function limpiar(s) {
    if (!s.partida) return;
    clearTimeout(s.partida.timerYa); clearTimeout(s.partida.timerCierre);
    s.partida.timerYa = s.partida.timerCierre = null;
  }

  function terminar(s, motivo) {
    limpiar(s);
    s.estado = "terminada";
    const ranking = resumen(s).sort((a, b) => b.puntos - a.puntos);
    const max = ranking[0].puntos;
    s.partida.fin = {
      ranking, motivo: motivo || "completo",
      ganadores: motivo === "abandono" ? [ranking[0].id] : ranking.filter(r => r.puntos === max).map(r => r.id)
    };
    emitir(s, "rompecabezas:fin", s.partida.fin);
  }

  function encajar(s, jugadorId, datos) {
    const p = s.partida, ahora = Date.now();
    const jugador = s.jugadores.find(j => j.id === jugadorId);
    if (s.juego !== "rompecabezas" || !p || !jugador || s.estado !== "jugando") return { ok: false, error: "La partida no está activa." };
    if (ahora < p.arranque) return { ok: false, error: "Todavía no empieza." };
    if (jugador.lugar) return { ok: false, error: "Ya terminaste." };
    const { pieza, dx, dy } = datos || {};
    if (!Number.isInteger(pieza) || pieza < 0 || pieza >= TOTAL) return { ok: false, error: "Pieza no válida." };
    if (typeof dx !== "number" || typeof dy !== "number" || !Number.isFinite(dx) || !Number.isFinite(dy)) return { ok: false, error: "Posición no válida." };
    if (p.fijasPor[jugadorId].has(pieza)) return { ok: false, error: "Esa pieza ya está colocada." };
    if (Math.hypot(dx, dy) > TOLERANCIA) return { ok: false, error: "La pieza no está en su lugar." };
    if (ahora - (p.ultimo[jugadorId] || 0) < MIN_ENTRE_ENCAJES) return { ok: false, error: "Demasiado rápido." };

    p.ultimo[jugadorId] = ahora;
    p.fijasPor[jugadorId].add(pieza);
    jugador.fijas = p.fijasPor[jugadorId].size;
    jugador.puntos += PUNTOS_PIEZA;

    let lugar = null;
    if (jugador.fijas === TOTAL) {
      lugar = jugador.lugar = ++p.terminaron;
      jugador.segundos = Math.round((ahora - p.arranque) / 1000);
      jugador.puntos += (BONUS_LUGAR[lugar - 1] ?? BONUS_LUGAR[3]) + Math.max(0, TIEMPO_BASE - jugador.segundos);
      if (lugar === 1 && !todosTerminaron(s)) p.timerCierre = setTimeout(() => terminar(s), GRACIA_TRAS_PRIMERO);
    }
    emitir(s, "rompecabezas:progreso", { jugadores: resumen(s) });
    if (todosTerminaron(s)) terminar(s);
    return { ok: true, fijas: jugador.fijas, lugar };
  }

  function jugadorSalio(s, jugador) {
    const p = s.partida;
    if (!p || s.estado !== "jugando") return;
    delete p.fijasPor[jugador.id];
    if (s.jugadores.length === 1) return terminar(s, "abandono");
    emitir(s, "rompecabezas:progreso", { jugadores: resumen(s) });
    if (todosTerminaron(s)) terminar(s);
  }

  function jugadorDesconectado(s) { if (s.partida) emitir(s, "rompecabezas:progreso", { jugadores: resumen(s) }); }
  function jugadorVolvio(s) { if (s.partida) emitir(s, "rompecabezas:progreso", { jugadores: resumen(s) }); }

  // Estado actual para redibujar el rompecabezas al reconectar
  function snapshot(s, jugador) {
    const p = s.partida, ahora = Date.now();
    return {
      juego: "rompecabezas", total: TOTAL, config: p.config, jugadores: resumen(s),
      fijas: p.fijasPor[jugador.id] ? [...p.fijasPor[jugador.id]] : [],
      empezo: ahora >= p.arranque, faltan: Math.max(0, p.arranque - ahora),
      segundos: jugador.lugar ? jugador.segundos : Math.max(0, Math.round((ahora - p.arranque) / 1000)),
      fin: p.fin || null
    };
  }

  function eventos(socket, buscar) {
    socket.on("rompecabezas:encajar", (datos, ack) => {
      const responder = typeof ack === "function" ? ack : () => {};
      const ref = buscar(socket);
      if (!ref) return responder({ ok: false, error: "No estás en una sala." });
      responder(encajar(ref.sala, ref.jugador.id, datos));
    });
  }

  return { iniciar, encajar, jugadorSalio, jugadorDesconectado, jugadorVolvio, snapshot, limpiar, eventos };
}

module.exports = { crearMotorRompecabezas };
