/* motores/trivia.js — reglas de la Trivia histórica (un jugador, turnos en un dispositivo y salas online). */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica(require("./base"));
  else { raiz.Motores = raiz.Motores || {}; raiz.Motores.trivia = fabrica(raiz.Motores.base); }
})(typeof self !== "undefined" ? self : this, function (Base) {
  const BASE_PUNTOS = { facil: 100, intermedia: 150, dificil: 200 };
  const RANGO = { facil: 0, intermedia: 1, dificil: 2 };
  const REVELADO_MS = 8000;       // en línea, tiempo antes de pasar solo a la siguiente pregunta
  const SEGUNDOS_ONLINE = [10, 15, 20, 30, 45];

  const reglas = {
    BASE_PUNTOS,
    // Puntos de una respuesta correcta: base por dificultad + hasta 50 % por rapidez + bonificación de racha (máx. 50)
    puntos({ dif, restanteMs, totalMs, racha }) {
      let p = BASE_PUNTOS[dif] || 100;
      if (totalMs > 0) p += Math.round(p * 0.5 * Math.max(0, Math.min(1, restanteMs / totalMs)));
      p += Math.min(50, Math.max(0, racha - 1) * 10);
      return p;
    },
    // Elige preguntas sin repetir; prefiere las que el dispositivo no ha visto (vistas)
    elegir(pool, total, mixta, vistas, env) {
      const vistos = new Set(vistas || []);
      const tomar = (lista, n) => {
        const nuevas = Base.barajar(lista.filter(q => !vistos.has(q.id)), env);
        const viejas = Base.barajar(lista.filter(q => vistos.has(q.id)), env);
        return nuevas.concat(viejas).slice(0, n);
      };
      if (!mixta) return tomar(pool, total);
      const por = d => pool.filter(q => q.dif === d);
      const f = Math.ceil(total * 0.4), m = Math.ceil(total * 0.35), d = Math.max(0, total - f - m);
      let sel = tomar(por("facil"), f).concat(tomar(por("intermedia"), m), tomar(por("dificil"), d));
      if (sel.length < total) { // faltaron de alguna dificultad: se completa con las demás
        const usados = new Set(sel.map(q => q.id));
        sel = sel.concat(tomar(pool.filter(q => !usados.has(q.id)), total - sel.length));
      }
      return sel.sort((a, b) => RANGO[a.dif] - RANGO[b.dif]);
    }
  };

  function preparar(q, env) {
    const ops = Base.barajar(q.o.map((t, i) => ({ t, ok: i === 0 })), env);
    return { id: q.id, cat: q.cat, dif: q.dif, texto: q.q, opciones: ops.map(o => o.t), correcta: ops.findIndex(o => o.ok), explicacion: q.e };
  }

  function crear(params, jugadores, env) {
    const banco = env.banco.trivia;
    const turnos = params.formato === "turnos";
    const online = !!params.online;
    const dif = Base.entre(params.dificultad, ["facil", "intermedia", "dificil", "mixta"], "mixta");
    const cat = params.categoria in banco.categorias ? params.categoria : "todas";
    const pool = banco.preguntas.filter(q => (cat === "todas" || q.cat === cat) && (dif === "mixta" || q.dif === dif));
    const nJug = jugadores.length;
    const n = Base.clamp(params.preguntas, 3, 20, 10);
    let total = Math.min(turnos ? n * nJug : n, pool.length);
    if (turnos) total = Math.floor(total / nJug) * nJug;
    const seg = online ? Base.entre(Number(params.segundos), SEGUNDOS_ONLINE, 20) : Base.clamp(params.segundos, 0, 60, 0);

    const e = Base.nuevo("trivia", { formato: turnos ? "turnos" : "simultaneo", online, dificultad: dif, categoria: cat, preguntas: n, segundos: seg }, jugadores, env);
    e.preguntas = reglas.elegir(pool, total, dif === "mixta", params.vistas, env).map(q => preparar(q, env));
    e.total = e.preguntas.length;
    e.stats = {}; e.rachas = {};
    e.jugadores.forEach(j => { e.stats[j.id] = { correctas: 0, respondidas: 0, mejorRacha: 0, tiempoMs: 0 }; e.rachas[j.id] = 0; });
    e.idx = 0;
    iniciarPregunta(e, env);
    return e;
  }

  function iniciarPregunta(e, env) {
    // En turnos se salta a los jugadores que ya se fueron
    if (e.params.formato === "turnos") {
      let guard = 0;
      while (guard++ < e.total && e.idx < e.total && e.jugadores[e.idx % e.jugadores.length].retirado) e.idx++;
      if (e.idx >= e.total) return terminar(e, env);
      e.activo = e.jugadores[e.idx % e.jugadores.length].id;
    }
    e.fase = "pregunta";
    e.t.inicioQ = env.ahora();
    e.t.finQ = e.params.segundos > 0 ? e.t.inicioQ + e.params.segundos * 1000 : null;
    e.t.sigue = null;
    e.respuestas = {}; e.revelado = null;
    Base.cambio(e);
  }

  const esperados = (e) => e.params.formato === "turnos" ? [Base.jug(e, e.activo)].filter(Boolean) : Base.esperados(e);

  function cerrar(e, env) {
    const q = e.preguntas[e.idx];
    const total = e.params.segundos * 1000;
    const por = {};
    const quienes = e.params.formato === "turnos" ? [Base.jug(e, e.activo)] : e.jugadores.filter(j => !j.retirado);
    quienes.forEach(j => {
      const r = e.respuestas[j.id];
      const st = e.stats[j.id];
      let ganado = 0, ok = false;
      if (r) {
        st.respondidas++; st.tiempoMs += r.ms;
        ok = r.op === q.correcta;
      }
      if (ok) {
        e.rachas[j.id]++; st.correctas++; st.mejorRacha = Math.max(st.mejorRacha, e.rachas[j.id]);
        ganado = reglas.puntos({ dif: q.dif, restanteMs: total ? Math.max(0, total - r.ms) : 0, totalMs: total, racha: e.rachas[j.id] });
        j.puntos += ganado;
      } else {
        e.rachas[j.id] = 0;
        if (!r) st.tiempoMs += total || 0;
      }
      por[j.id] = { op: r ? r.op : null, ok, ganado, racha: e.rachas[j.id] };
    });
    e.revelado = { porJugador: por };
    e.fase = "revelado";
    e.t.sigue = e.params.online ? env.ahora() + REVELADO_MS : null;
    Base.cambio(e);
  }

  function avanzar(e, env) {
    e.idx++;
    if (e.idx >= e.total) terminar(e, env); else iniciarPregunta(e, env);
  }

  function terminar(e, env) {
    e.fase = "fin";
    const ranking = Base.ranking(e, j => -e.stats[j.id].correctas * 1e7 + e.stats[j.id].tiempoMs).map(r => Object.assign(r, e.stats[r.id]));
    // Los empates se rompen por aciertos y luego por rapidez; "ganadores" incluye solo a quienes siguen igualados en todo
    const g = ranking.length ? ranking.filter(r => r.puntos === ranking[0].puntos && r.desempate === ranking[0].desempate).map(r => r.id) : [];
    const yo = ranking[0];
    e.fin = { ranking, ganadores: g, total: e.total, segundos: Math.round((env.ahora() - e.inicio) / 1000), dificultad: e.params.dificultad,
      logros: { racha5: ranking.some(r => r.mejorRacha >= 5), dificil80: e.params.dificultad === "dificil" && yo && e.total > 0 && yo.correctas / e.total >= 0.8 } };
    Base.cambio(e);
  }

  function accion(e, jid, d, env) {
    const j = Base.jug(e, jid);
    if (!j || j.retirado) return { ok: false, error: "No participas en esta partida." };
    if (!d || typeof d !== "object") return { ok: false, error: "Acción no válida." };
    if (e.fase === "fin") return { ok: false, error: "La partida terminó." };
    if (d.tipo === "responder") {
      if (e.pausa) return { ok: false, error: "El juego está en pausa." };
      if (e.fase !== "pregunta") return { ok: false, error: "Ya no se puede responder." };
      const ahora = env.ahora();
      if (e.t.finQ && ahora >= e.t.finQ) { cerrar(e, env); return { ok: false, error: "Se acabó el tiempo." }; }
      if (e.params.formato === "turnos" && jid !== e.activo) return { ok: false, error: "No es tu turno." };
      if (e.respuestas[jid]) return { ok: false, error: "Ya respondiste." };
      const op = d.opcion;
      if (!Number.isInteger(op) || op < 0 || op > 3) return { ok: false, error: "Opción no válida." };
      e.respuestas[jid] = { op, ms: ahora - e.t.inicioQ };
      Base.cambio(e);
      if (esperados(e).every(x => e.respuestas[x.id])) cerrar(e, env);
      return { ok: true };
    }
    if (d.tipo === "siguiente") {
      if (e.fase !== "revelado") return { ok: false, error: "Aún no se puede avanzar." };
      if (!Base.puedeAvanzar(e, jid)) return { ok: false, error: "Solo el anfitrión avanza." };
      avanzar(e, env);
      return { ok: true };
    }
    if (d.tipo === "pausar" || d.tipo === "reanudar") {
      if (e.params.online || e.jugadores.length > 1) return { ok: false, error: "La pausa solo existe en el modo individual." };
      if (d.tipo === "pausar" && e.fase === "pregunta" && !e.pausa) { e.pausa = env.ahora(); Base.cambio(e); return { ok: true }; }
      if (d.tipo === "reanudar" && e.pausa) {
        const delta = env.ahora() - e.pausa; e.pausa = null;
        e.t.inicioQ += delta; if (e.t.finQ) e.t.finQ += delta;
        Base.cambio(e); return { ok: true };
      }
      return { ok: false, error: "No se puede pausar ahora." };
    }
    return { ok: false, error: "Acción desconocida." };
  }

  function tick(e, env) {
    if (e.pausa) return;
    const ahora = env.ahora();
    if (e.fase === "pregunta" && e.t.finQ && ahora >= e.t.finQ) cerrar(e, env);
    else if (e.fase === "pregunta" && esperados(e).length && esperados(e).every(x => e.respuestas[x.id])) cerrar(e, env);
    else if (e.fase === "revelado" && e.t.sigue && ahora >= e.t.sigue) avanzar(e, env);
  }

  function vista(e, jid, env) {
    const q = e.fase === "fin" ? null : e.preguntas[e.idx];
    const rev = e.fase === "revelado";
    return {
      juego: "trivia", rev: e.rev, ahora: env.ahora(), fase: e.fase, idx: e.idx, total: e.total, activo: e.activo || null,
      params: e.params, pausado: !!e.pausa, anfitrion: e.anfitrion,
      pregunta: q ? { id: q.id, texto: q.texto, opciones: q.opciones, cat: q.cat, dif: q.dif } : null,
      correcta: rev ? q.correcta : null, explicacion: rev ? q.explicacion : null,
      finQ: e.t.finQ, sigue: e.t.sigue,
      miOpcion: e.respuestas && e.respuestas[jid] ? e.respuestas[jid].op : null,
      respondieron: e.respuestas ? Object.keys(e.respuestas) : [],
      revelado: rev ? e.revelado : null,
      jugadores: Base.publicos(e, j => ({ racha: e.rachas[j.id] || 0 })),
      fin: e.fin
    };
  }

  return {
    id: "trivia", reglas, crear, accion, tick, vista,
    conexion: Base.conexion, salio: (e, jid) => Base.retirar(e, jid)
  };
});
