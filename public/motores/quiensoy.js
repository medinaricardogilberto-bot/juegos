/* motores/quiensoy.js — reglas de "¿Quién soy?".
   El nombre del personaje NUNCA aparece en la vista hasta que la ronda se revela. En línea, las pistas las libera
   el servidor a intervalos y las respuestas de los demás no se muestran, solo si acertaron. */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica(require("./base"));
  else { raiz.Motores = raiz.Motores || {}; raiz.Motores.quiensoy = fabrica(raiz.Motores.base); }
})(typeof self !== "undefined" ? self : this, function (Base) {
  const PUNTOS_PISTA = [100, 80, 60, 40, 20];
  const MULT = { facil: 1, intermedia: 1.25, dificil: 1.5 };
  const MAX_FALLOS = 3, PENALIZA_FALLO = 10, REVELADO_MS = 9000;
  const SEG_PISTA = [10, 15, 20, 30];

  const reglas = {
    PUNTOS_PISTA, MAX_FALLOS, PENALIZA_FALLO,
    puntos(pista, dif, fallos) {
      return Math.max(10, Math.round(PUNTOS_PISTA[Math.min(4, Math.max(0, pista - 1))] * (MULT[dif] || 1)) - PENALIZA_FALLO * fallos);
    },
    // ¿La respuesta escrita coincide con algún nombre válido? Tolera acentos, mayúsculas y un error de tecleo en nombres largos.
    coincide(texto, pj) {
      const t = Base.normalizar(texto);
      if (!t || t.length > 60) return false;
      return pj.alias.some(a => {
        const x = Base.normalizar(a);
        return t === x || (x.length >= 6 && t.length >= 6 && Base.distancia(t, x) <= 1);
      });
    }
  };

  function crear(params, jugadores, env) {
    const banco = env.banco.quiensoy.personajes;
    const turnos = params.formato === "turnos", online = !!params.online;
    const dif = Base.entre(params.dificultad, ["facil", "intermedia", "dificil", "mixta"], "mixta");
    const modalidad = params.modalidad === "opciones" ? "opciones" : "escribir";
    const pool = banco.filter(p => dif === "mixta" || p.dif === dif);
    const nJug = jugadores.length;
    const n = Base.clamp(params.rondas, 1, 10, 5);
    let total = Math.min(turnos ? n * nJug : n, pool.length);
    if (turnos) total = Math.floor(total / nJug) * nJug;
    const rango = { facil: 0, intermedia: 1, dificil: 2 };
    let elegidos = Base.barajar(pool, env).slice(0, total);
    if (dif === "mixta") elegidos = elegidos.sort((a, b) => rango[a.dif] - rango[b.dif]);
    const e = Base.nuevo("quiensoy", { formato: turnos ? "turnos" : "simultaneo", online, dificultad: dif, modalidad, rondas: n,
      segundosPista: online ? Base.entre(Number(params.segundosPista), SEG_PISTA, 15) : 0 }, jugadores, env);
    e.personajes = elegidos;
    e.total = elegidos.length;
    e.stats = {}; e.jugadores.forEach(j => { e.stats[j.id] = { aciertos: 0, pistasTotal: 0 }; });
    e.idx = 0;
    iniciarRonda(e, env, banco);
    return e;
  }

  function iniciarRonda(e, env, banco) {
    banco = banco || env.banco.quiensoy.personajes;
    if (e.params.formato === "turnos") {
      let guard = 0;
      while (guard++ < e.total && e.idx < e.total && e.jugadores[e.idx % e.jugadores.length].retirado) e.idx++;
      if (e.idx >= e.total) return terminar(e, env);
      e.activo = e.jugadores[e.idx % e.jugadores.length].id;
    }
    const pj = e.personajes[e.idx];
    let opciones = null;
    if (e.params.modalidad === "opciones") {
      const mismos = banco.filter(p => p.id !== pj.id && p.dif === pj.dif), otros = banco.filter(p => p.id !== pj.id && p.dif !== pj.dif);
      const falsos = Base.barajar(mismos, env).concat(Base.barajar(otros, env)).slice(0, 3);
      opciones = Base.barajar([pj].concat(falsos), env).map(p => p.nombre);
    }
    const ahora = env.ahora();
    const auto = e.params.online;
    e.ronda = { n: e.idx, pj, opciones, pista: 1, t: { inicio: ahora, sigPista: auto ? ahora + e.params.segundosPista * 1000 : null, sigue: null }, jug: {} };
    e.jugadores.forEach(j => { if (!j.retirado) e.ronda.jug[j.id] = { fallos: 0, resuelto: false, rendido: false, agotado: false, puntos: 0, pista: 0, descartadas: [] }; });
    e.fase = "jugando"; e.revelado = null;
    Base.cambio(e);
  }

  const terminado = (s) => s.resuelto || s.rendido || s.agotado;
  const esperados = (e) => e.params.formato === "turnos" ? [Base.jug(e, e.activo)].filter(Boolean) : Base.esperados(e);
  const todosListos = (e) => { const x = esperados(e); return x.length > 0 && x.every(j => e.ronda.jug[j.id] && terminado(e.ronda.jug[j.id])); };

  function cerrarRonda(e, env) {
    const r = e.ronda, por = {};
    Object.keys(r.jug).forEach(id => { const s = r.jug[id]; por[id] = { resuelto: s.resuelto, puntos: s.puntos, pista: s.pista, fallos: s.fallos }; });
    e.revelado = { nombre: r.pj.nombre, rol: r.pj.rol, icono: r.pj.icono, exp: r.pj.exp, pistas: r.pj.pistas, porJugador: por };
    e.fase = "revelado"; e.activo = e.params.formato === "turnos" ? e.activo : null;
    r.t.sigue = e.params.online ? env.ahora() + REVELADO_MS : null;
    Base.cambio(e);
  }

  function avanzar(e, env) { e.idx++; if (e.idx >= e.total) terminar(e, env); else iniciarRonda(e, env); }

  function terminar(e, env) {
    e.fase = "fin"; e.activo = null;
    const ranking = Base.ranking(e, j => e.stats[j.id].pistasTotal - e.stats[j.id].aciertos * 1000).map(r => Object.assign(r, e.stats[r.id]));
    e.fin = { ranking, ganadores: Base.ganadores(ranking), total: e.total, segundos: Math.round((env.ahora() - e.inicio) / 1000),
      logros: { primeraPista: e.primeraPista === true } };
    Base.cambio(e);
  }

  function accion(e, jid, d, env) {
    const j = Base.jug(e, jid);
    if (!j || j.retirado) return { ok: false, error: "No participas en esta partida." };
    if (!d || typeof d !== "object") return { ok: false, error: "Acción no válida." };
    if (e.fase === "fin") return { ok: false, error: "La partida terminó." };
    const r = e.ronda, s = r.jug[jid];

    if (d.tipo === "responder") {
      if (e.fase !== "jugando" || e.pausa) return { ok: false, error: "Ya no se puede responder." };
      if (!s || terminado(s)) return { ok: false, error: "Ya terminaste esta ronda." };
      if (e.params.formato === "turnos" && jid !== e.activo) return { ok: false, error: "No es tu turno." };
      let ok;
      if (e.params.modalidad === "opciones") {
        const i = d.opcion;
        if (!Number.isInteger(i) || i < 0 || i >= r.opciones.length) return { ok: false, error: "Opción no válida." };
        if (s.descartadas.includes(i)) return { ok: false, error: "Esa opción ya está descartada." };
        ok = r.opciones[i] === r.pj.nombre;
        if (!ok) s.descartadas.push(i);
      } else {
        if (typeof d.texto !== "string" || !d.texto.trim()) return { ok: false, error: "Escribe una respuesta." };
        ok = reglas.coincide(d.texto, r.pj);
      }
      if (ok) {
        s.resuelto = true; s.pista = r.pista;
        s.puntos = reglas.puntos(r.pista, r.pj.dif, s.fallos);
        j.puntos += s.puntos; e.stats[jid].aciertos++; e.stats[jid].pistasTotal += r.pista;
        if (r.pista === 1 && s.fallos === 0) e.primeraPista = true;
      } else {
        s.fallos++; e.stats[jid].pistasTotal += 0;
        if (s.fallos >= MAX_FALLOS) s.agotado = true;
      }
      Base.cambio(e);
      if (todosListos(e)) cerrarRonda(e, env);
      return { ok: true, correcta: ok, fallos: s.fallos, agotado: s.agotado };
    }

    if (d.tipo === "pista") {
      if (e.params.online) return { ok: false, error: "En línea las pistas salen solas." };
      if (e.fase !== "jugando" || e.pausa || !s || terminado(s)) return { ok: false, error: "No puedes pedir una pista ahora." };
      if (e.params.formato === "turnos" && jid !== e.activo) return { ok: false, error: "No es tu turno." };
      if (r.pista >= 5) return { ok: false, error: "Ya viste todas las pistas." };
      r.pista++; Base.cambio(e);
      return { ok: true };
    }

    if (d.tipo === "rendirse") {
      if (e.fase !== "jugando" || !s || terminado(s)) return { ok: false, error: "No puedes rendirte ahora." };
      if (e.params.formato === "turnos" && jid !== e.activo) return { ok: false, error: "No es tu turno." };
      s.rendido = true; e.stats[jid].pistasTotal += 5; Base.cambio(e);
      if (todosListos(e)) cerrarRonda(e, env);
      return { ok: true };
    }

    if (d.tipo === "siguiente") {
      if (e.fase !== "revelado") return { ok: false, error: "Aún no se puede avanzar." };
      if (!Base.puedeAvanzar(e, jid)) return { ok: false, error: "Solo el anfitrión avanza." };
      avanzar(e, env); return { ok: true };
    }

    if (d.tipo === "pausar" || d.tipo === "reanudar") {
      // Sin tiempo en solitario: la pausa solo detiene la pantalla (no hay reloj que parar)
      if (e.params.online || e.jugadores.length > 1) return { ok: false, error: "La pausa solo existe en el modo individual." };
      e.pausa = d.tipo === "pausar" && !e.pausa ? env.ahora() : null; Base.cambio(e); return { ok: true };
    }
    return { ok: false, error: "Acción desconocida." };
  }

  function tick(e, env) {
    if (e.pausa) return;
    const ahora = env.ahora(), r = e.ronda;
    if (e.fase === "jugando" && e.params.online) {
      if (r.t.sigPista && ahora >= r.t.sigPista) {
        if (r.pista < 5) { r.pista++; r.t.sigPista = ahora + e.params.segundosPista * 1000; Base.cambio(e); }
        else { // ya salieron todas las pistas y se agotó el último plazo: se cierra la ronda
          Object.keys(r.jug).forEach(id => { const s = r.jug[id]; if (!terminado(s)) { s.rendido = true; e.stats[id].pistasTotal += 5; } });
          cerrarRonda(e, env);
        }
      } else if (todosListos(e)) cerrarRonda(e, env);
    } else if (e.fase === "revelado" && r.t.sigue && ahora >= r.t.sigue) avanzar(e, env);
  }

  function vista(e, jid, env) {
    const r = e.ronda, s = r && r.jug[jid], rev = e.fase === "revelado";
    return {
      juego: "quiensoy", rev: e.rev, ahora: env.ahora(), fase: e.fase, params: e.params, pausado: !!e.pausa, anfitrion: e.anfitrion,
      activo: e.activo || null, idx: e.idx, total: e.total,
      reglas: { puntos: PUNTOS_PISTA, maxFallos: MAX_FALLOS, penalizaFallo: PENALIZA_FALLO },
      ronda: r && e.fase !== "fin" ? { n: r.n, dif: r.pj.dif, pista: r.pista, pistas: r.pj.pistas.slice(0, r.pista), opciones: r.opciones, sigPista: r.t.sigPista, sigue: r.t.sigue } : null,
      mio: s ? { fallos: s.fallos, resuelto: s.resuelto, rendido: s.rendido, agotado: s.agotado, puntos: s.puntos, descartadas: s.descartadas, pista: s.pista } : null,
      estados: r && e.fase !== "fin" ? e.jugadores.filter(j => !j.retirado).map(j => {
        const x = r.jug[j.id]; return { id: j.id, estado: !x ? "fuera" : x.resuelto ? "acerto" : x.agotado ? "agotado" : x.rendido ? "rindio" : "pensando" };
      }) : [],
      revelado: rev ? e.revelado : null,
      jugadores: Base.publicos(e),
      fin: e.fin
    };
  }

  return { id: "quiensoy", reglas, crear, accion, tick, vista, conexion: Base.conexion, salio: (e, jid) => Base.retirar(e, jid) };
});
