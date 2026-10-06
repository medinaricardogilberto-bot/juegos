// server/memorama-motor.js — reglas del memorama multijugador.
// El servidor es el árbitro: baraja, valida cada volteo, controla turnos y puntos.
// Los clientes NUNCA reciben qué hay en una carta boca abajo.
const crypto = require("crypto");

const ICONOS = ["campana", "bandera", "escudo", "cura", "canon", "antorcha", "cohetes", "listón"]; // mismos id que en el cliente
const PUNTOS_PAREJA = 10;
const ESPERA_ACIERTO = 500;  // un poco más que la animación del cliente (420 ms)
const ESPERA_FALLO = 1100;   // un poco más que la animación del cliente (1050 ms)

function barajar(lista) {
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function crearMotorMemorama(io) {
  const emitir = (s, ev, datos) => io.to(s.codigo).emit(ev, datos);
  const resumen = (s) => s.jugadores.map(j => ({ id: j.id, nombre: j.nombre, puntos: j.puntos, parejas: j.parejas || 0, conectado: j.conectado !== false }));
  // Siguiente jugador CONECTADO (así un jugador ausente no traba la partida)
  const siguiente = (s, id) => {
    const n = s.jugadores.length, i = s.jugadores.findIndex(j => j.id === id);
    for (let k = 1; k <= n; k++) {
      const cand = s.jugadores[(i + k) % n];
      if (cand.conectado !== false) return cand.id;
    }
    return s.jugadores[(i + 1) % n].id;
  };

  function iniciar(s) {
    const mazo = barajar([...ICONOS, ...ICONOS]);
    s.jugadores.forEach(j => { j.puntos = 0; j.parejas = 0; });
    s.estado = "jugando";
    s.partida = {
      mazo, estados: mazo.map(() => "oculta"), volteadas: [], resolviendo: false,
      intentos: 0, parejas: 0, inicio: Date.now(), timer: null,
      turnoId: s.jugadores[crypto.randomInt(s.jugadores.length)].id
    };
    emitir(s, "partida:inicio", { juego: "memorama", total: mazo.length, turno: s.partida.turnoId, jugadores: resumen(s) });
  }

  function terminar(s, motivo) {
    const p = s.partida;
    clearTimeout(p.timer); p.timer = null;
    s.estado = "terminada";
    const ranking = resumen(s).sort((a, b) => b.puntos - a.puntos);
    const max = ranking[0].puntos;
    p.fin = {
      ranking, motivo: motivo || "completo",
      ganadores: motivo === "abandono" ? [ranking[0].id] : ranking.filter(r => r.puntos === max).map(r => r.id),
      intentos: p.intentos, segundos: Math.round((Date.now() - p.inicio) / 1000)
    };
    emitir(s, "memorama:fin", p.fin);
  }

  // Todas las comprobaciones de seguridad están aquí.
  function voltear(s, jugadorId, indice) {
    const p = s.partida;
    if (s.juego !== "memorama" || !p || s.estado !== "jugando") return { ok: false, error: "La partida no está activa." };
    if (p.turnoId !== jugadorId) return { ok: false, error: "No es tu turno." };
    if (p.resolviendo) return { ok: false, error: "Espera un momento." };
    if (!Number.isInteger(indice) || indice < 0 || indice >= p.mazo.length) return { ok: false, error: "Carta no válida." };
    if (p.estados[indice] !== "oculta") return { ok: false, error: "Esa carta ya está volteada." };

    p.estados[indice] = "volteada";
    p.volteadas.push(indice);
    emitir(s, "memorama:volteada", { indice, icono: p.mazo[indice] });

    if (p.volteadas.length === 2) {
      const [a, b] = p.volteadas;
      const acierto = p.mazo[a] === p.mazo[b];
      const jugador = s.jugadores.find(j => j.id === jugadorId);
      p.volteadas = []; p.resolviendo = true; p.intentos++;
      if (acierto) {
        p.estados[a] = p.estados[b] = "acertada"; p.parejas++;
        jugador.puntos += PUNTOS_PAREJA; jugador.parejas++;
      } else {
        p.estados[a] = p.estados[b] = "oculta";
      }
      emitir(s, "memorama:resultado", { acierto, indices: [a, b], jugadorId, intentos: p.intentos, parejas: p.parejas, jugadores: resumen(s) });

      p.timer = setTimeout(() => {
        p.timer = null; p.resolviendo = false;
        if (p.parejas === p.mazo.length / 2) return terminar(s);
        const jug = s.jugadores.find(j => j.id === jugadorId);
        if (p.turnoId === jugadorId && (!acierto || !jug || jug.conectado === false)) p.turnoId = siguiente(s, jugadorId); // fallo (o jugador ausente): pasa el turno
        emitir(s, "memorama:turno", { turno: p.turnoId });                             // acierto: sigue el mismo
      }, acierto ? ESPERA_ACIERTO : ESPERA_FALLO);
    }
    return { ok: true };
  }

  // Un jugador salió a media partida (el paso 6 agregará reconexión)
  function jugadorSalio(s, jugador, indice) {
    const p = s.partida;
    if (!p || s.estado !== "jugando") return;
    if (s.jugadores.length === 1) return terminar(s, "abandono");
    if (p.volteadas.length === 1) { // dejó una carta a medias: se oculta
      const i = p.volteadas[0]; p.estados[i] = "oculta"; p.volteadas = [];
      emitir(s, "memorama:ocultar", { indices: [i] });
    }
    if (p.turnoId === jugador.id) {
      p.turnoId = s.jugadores[indice % s.jugadores.length].id;
      if (!p.resolviendo) emitir(s, "memorama:turno", { turno: p.turnoId });
    }
    emitir(s, "memorama:jugadores", { jugadores: resumen(s) });
  }

  // Se cayó la conexión de un jugador: si era su turno, se pasa al siguiente conectado
  function jugadorDesconectado(s, jugador) {
    const p = s.partida;
    if (!p || s.estado !== "jugando") return;
    if (p.turnoId === jugador.id) {
      if (p.volteadas.length === 1) {
        const i = p.volteadas[0]; p.estados[i] = "oculta"; p.volteadas = [];
        emitir(s, "memorama:ocultar", { indices: [i] });
      }
      p.turnoId = siguiente(s, jugador.id);
      if (!p.resolviendo) emitir(s, "memorama:turno", { turno: p.turnoId });
    }
    emitir(s, "memorama:jugadores", { jugadores: resumen(s) });
  }
  function jugadorVolvio(s) { if (s.partida) emitir(s, "memorama:jugadores", { jugadores: resumen(s) }); }

  // Estado actual para redibujar el tablero al reconectar (las cartas ocultas NO se revelan)
  function snapshot(s) {
    const p = s.partida;
    return {
      juego: "memorama", total: p.mazo.length, turno: p.turnoId, jugadores: resumen(s),
      cartas: p.estados.map((e, i) => (e === "oculta" ? null : { estado: e, icono: p.mazo[i] })),
      intentos: p.intentos, parejas: p.parejas,
      segundos: p.fin ? p.fin.segundos : Math.round((Date.now() - p.inicio) / 1000), fin: p.fin || null
    };
  }

  function limpiar(s) { if (s.partida) { clearTimeout(s.partida.timer); s.partida.timer = null; } }

  function eventos(socket, buscar) {
    socket.on("memorama:voltear", (datos, ack) => {
      const responder = typeof ack === "function" ? ack : () => {};
      const ref = buscar(socket);
      if (!ref) return responder({ ok: false, error: "No estás en una sala." });
      responder(voltear(ref.sala, ref.jugador.id, datos && datos.indice));
    });
  }

  return { iniciar, voltear, jugadorSalio, jugadorDesconectado, jugadorVolvio, snapshot, limpiar, eventos };
}

module.exports = { crearMotorMemorama };
