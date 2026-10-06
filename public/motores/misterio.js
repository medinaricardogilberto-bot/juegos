/* motores/misterio.js — reglas de "El misterio histórico".
   modo "comp": cada jugador avanza por su cuenta (en el mismo dispositivo, por turnos de capítulo).
   modo "coop": el equipo comparte documentos, inventario y progreso; las decisiones finales se votan en línea.
   El servidor nunca envía la respuesta correcta antes de que el capítulo se resuelva. */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica(require("./base"));
  else { raiz.Motores = raiz.Motores || {}; raiz.Motores.misterio = fabrica(raiz.Motores.base); }
})(typeof self !== "undefined" ? self : this, function (Base) {
  const PUNTOS_DOC = 5, PUNTOS_PREGUNTA = 100, PENALIZA_FALLO = 25, PENALIZA_PISTA = 15, MAX_FALLOS = 3, VOTO_MS = 30000;
  const LIMITES_ONLINE = [600, 900, 1200, 1800];

  const reglas = {
    PUNTOS_DOC, PUNTOS_PREGUNTA, PENALIZA_FALLO, PENALIZA_PISTA, MAX_FALLOS,
    puntosPregunta(fallos, pistas) { return Math.max(10, Math.max(25, PUNTOS_PREGUNTA - PENALIZA_FALLO * fallos) - PENALIZA_PISTA * pistas); },
    maximo(caso) {
      return caso.capitulos.reduce((s, c) => s + PUNTOS_PREGUNTA + PUNTOS_DOC * c.docs.length + (c.decision ? Math.max(...c.decision.opciones.map(o => o.puntos)) : 0), 0);
    },
    rango(puntos, max) { const f = puntos / max; return f >= 0.8 ? "oro" : f >= 0.55 ? "plata" : "bronce"; },
    respuestaCorrecta(preg, d) {
      if (preg.tipo === "texto") { const t = Base.normalizar(d.texto); return !!t && t.length <= 40 && preg.respuestas.some(r => Base.normalizar(r) === t); }
      return Number.isInteger(d.opcion) && d.opcion === preg.correcta;
    }
  };

  const nuevoProgreso = () => ({ cap: 0, sub: "investigar", examinados: {}, fallos: 0, descartadas: [], pistas: 0, puntos: 0, decision: null, final: null, tiempoMs: null, ultima: null });

  function crear(params, jugadores, env) {
    const banco = env.banco.misterio;
    const caso = banco.casos.find(c => c.id === params.caso) || banco.casos[0];
    const solo = jugadores.length === 1;
    const modo = solo ? "comp" : (caso.modos.includes(params.modo) ? params.modo : caso.modos[0]);
    const online = !!params.online;
    const e = Base.nuevo("misterio", {
      formato: params.formato === "turnos" ? "turnos" : "simultaneo", online, caso: caso.id, modo,
      limite: online ? Base.entre(Number(params.limite), LIMITES_ONLINE, 1200) : 0
    }, jugadores, env);
    e.caso = caso;
    e.t = { fin: online ? env.ahora() + e.params.limite * 1000 : null, voto: null };
    e.votos = {};
    if (modo === "coop") { e.equipo = nuevoProgreso(); e.aportes = {}; e.jugadores.forEach(j => { e.aportes[j.id] = { docs: 0, aciertos: 0 }; }); }
    else { e.progreso = {}; e.jugadores.forEach(j => { e.progreso[j.id] = nuevoProgreso(); }); }
    e.activo = e.params.formato === "turnos" ? e.jugadores[0].id : null;
    e.fase = "jugando";
    return e;
  }

  const prog = (e, jid) => e.params.modo === "coop" ? e.equipo : e.progreso[jid];
  const cap = (e, P) => e.caso.capitulos[P.cap];
  // Suma puntos a quien corresponde: en equipo, al marcador del equipo y a la contribución del jugador
  function sumar(e, jid, n) {
    const P = prog(e, jid); P.puntos += n;
    const j = Base.jug(e, jid);
    if (e.params.modo === "coop") { j.puntos += n; } else j.puntos = P.puntos;
  }

  function pasarTurno(e) {
    if (e.params.formato !== "turnos") return;
    const vivos = e.jugadores.filter(j => !j.retirado);
    const i = vivos.findIndex(j => j.id === e.activo);
    for (let k = 1; k <= vivos.length; k++) {
      const c = vivos[(i + k) % vivos.length];
      if (e.params.modo === "coop" || !e.progreso[c.id].final) { e.activo = c.id; return; }
    }
  }

  function terminar(e, env, motivo) {
    e.fase = "fin"; e.activo = null;
    const coop = e.params.modo === "coop";
    const max = reglas.maximo(e.caso);
    const seg = Math.round((env.ahora() - e.inicio) / 1000);
    const ps = coop ? [e.equipo] : Object.values(e.progreso);
    const ranking = Base.ranking(e, j => { const t = coop ? e.equipo.tiempoMs : e.progreso[j.id].tiempoMs; return t == null ? 1e12 : t; })
      .map(r => Object.assign(r, coop ? e.aportes[r.id] : { final: e.progreso[r.id].final }));
    const equipoP = coop ? e.equipo.puntos : null;
    const finalesVistos = [...new Set(ps.map(p => p.final).filter(Boolean))];
    e.fin = { ranking, coop, ganadores: coop ? ranking.map(r => r.id) : Base.ganadores(ranking), equipoPuntos: equipoP, max, segundos: seg,
      motivo: motivo || "completo", finales: finalesVistos.map(id => e.caso.finales.find(f => f.id === id)).filter(Boolean),
      rango: reglas.rango(coop ? equipoP : (ranking[0] ? ranking[0].puntos : 0), max),
      logros: { casoCompleto: ps.some(p => p.sub === "terminado") } };
    Base.cambio(e);
  }

  function revisarFin(e, env) {
    if (e.fase !== "jugando") return;
    if (e.params.modo === "coop") { if (e.equipo.sub === "terminado") terminar(e, env); return; }
    const vivos = e.jugadores.filter(j => !j.retirado);
    if (vivos.length && vivos.every(j => e.progreso[j.id].sub === "terminado")) terminar(e, env);
  }

  function avanzarCapitulo(e, P, env) {
    if (P.cap + 1 < e.caso.capitulos.length) {
      P.cap++; P.sub = "investigar"; P.fallos = 0; P.descartadas = []; P.pistas = 0; P.ultima = null;
    } else { // sin decisión final: se usa el primer final del caso
      P.sub = "terminado"; P.final = e.caso.finales[0].id; P.tiempoMs = env.ahora() - e.inicio;
    }
  }

  function resolverDecision(e, P, indice, env) {
    const dec = cap(e, P).decision, op = dec.opciones[indice];
    P.decision = indice; P.puntos += op.puntos;
    if (e.params.modo === "coop") { /* los puntos de decisión son del equipo */ } else Base.jug(e, e.activo || Object.keys(e.progreso).find(id => e.progreso[id] === P)).puntos = P.puntos;
    P.final = op.final; P.sub = "terminado"; P.tiempoMs = env.ahora() - e.inicio;
    e.votos = {}; e.t.voto = null;
  }

  function resolverVotos(e, env) {
    const P = e.equipo, n = cap(e, P).decision.opciones.length;
    const cuenta = Array(n).fill(0);
    Object.values(e.votos).forEach(v => { cuenta[v]++; });
    const max = Math.max(...cuenta);
    let ganadoras = cuenta.map((c, i) => c === max ? i : -1).filter(i => i >= 0);
    if (ganadoras.length > 1 && e.votos[e.anfitrion] != null && ganadoras.includes(e.votos[e.anfitrion])) ganadoras = [e.votos[e.anfitrion]];
    resolverDecision(e, P, ganadoras[0], env);
    Base.cambio(e);
    revisarFin(e, env);
  }

  function accion(e, jid, d, env) {
    const j = Base.jug(e, jid);
    if (!j || j.retirado) return { ok: false, error: "No participas en esta partida." };
    if (!d || typeof d !== "object") return { ok: false, error: "Acción no válida." };
    if (e.fase !== "jugando") return { ok: false, error: "La partida terminó." };
    if (d.tipo === "pausar" || d.tipo === "reanudar") {
      if (e.params.online || e.jugadores.length > 1) return { ok: false, error: "La pausa solo existe en el modo individual." };
      e.pausa = d.tipo === "pausar" && !e.pausa ? env.ahora() : null; Base.cambio(e); return { ok: true };
    }
    if (e.pausa) return { ok: false, error: "El juego está en pausa." };
    if (e.params.formato === "turnos" && jid !== e.activo) return { ok: false, error: "No es tu turno." };
    const P = prog(e, jid), C = cap(e, P);

    if (d.tipo === "examinar") {
      if (P.sub !== "investigar") return { ok: false, error: "Ya terminaste este capítulo." };
      const doc = C.docs.find(x => x.id === d.doc);
      if (!doc) return { ok: false, error: "Ese documento no está en este capítulo." };
      if (P.examinados[doc.id]) return { ok: false, error: "Ya examinaste ese documento." };
      P.examinados[doc.id] = jid;
      sumar(e, jid, PUNTOS_DOC);
      if (e.aportes) e.aportes[jid].docs++;
      Base.cambio(e);
      return { ok: true, doc: { id: doc.id, tipo: doc.tipo, titulo: doc.titulo, texto: doc.texto, nota: doc.nota } };
    }

    if (d.tipo === "pista") {
      if (P.sub !== "investigar") return { ok: false, error: "No puedes pedir una pista ahora." };
      if (P.pistas >= 1) return { ok: false, error: "Ya usaste la pista de este capítulo." };
      P.pistas++; Base.cambio(e); return { ok: true, pista: C.pregunta.pista };
    }

    if (d.tipo === "responder") {
      if (P.sub !== "investigar") return { ok: false, error: "Este capítulo ya se resolvió." };
      const faltan = (C.pregunta.requiere || []).filter(id => !P.examinados[id]);
      if (faltan.length) return { ok: false, error: "Antes de responder, examina: " + faltan.map(id => C.docs.find(x => x.id === id).titulo).join(", ") + "." };
      if (C.pregunta.tipo === "opciones" && (!Number.isInteger(d.opcion) || d.opcion < 0 || d.opcion >= C.pregunta.opciones.length)) return { ok: false, error: "Opción no válida." };
      if (C.pregunta.tipo === "opciones" && P.descartadas.includes(d.opcion)) return { ok: false, error: "Esa opción ya está descartada." };
      if (C.pregunta.tipo === "texto" && (typeof d.texto !== "string" || !d.texto.trim())) return { ok: false, error: "Escribe una respuesta." };
      const ok = reglas.respuestaCorrecta(C.pregunta, d);
      const correcta = C.pregunta.tipo === "texto" ? C.pregunta.respuestas[0] : C.pregunta.opciones[C.pregunta.correcta];
      if (ok) {
        const pts = reglas.puntosPregunta(P.fallos, P.pistas);
        sumar(e, jid, pts); if (e.aportes) e.aportes[jid].aciertos++;
        P.sub = "explicacion"; P.ultima = { cap: P.cap, acerto: true, correcta, texto: C.pregunta.explicacion, puntos: pts };
        Base.cambio(e);
        return { ok: true, correcta: true, puntos: pts };
      }
      P.fallos++;
      if (C.pregunta.tipo === "opciones") P.descartadas.push(d.opcion);
      if (P.fallos >= MAX_FALLOS) { P.sub = "explicacion"; P.ultima = { cap: P.cap, acerto: false, correcta, texto: C.pregunta.explicacion, puntos: 0 }; }
      if (e.params.formato === "turnos" && e.params.modo === "coop") pasarTurno(e);
      Base.cambio(e);
      return { ok: true, correcta: false, fallos: P.fallos, agotado: P.sub === "explicacion" };
    }

    if (d.tipo === "continuar") {
      if (P.sub !== "explicacion") return { ok: false, error: "Todavía no puedes continuar." };
      if (C.decision) {
        P.sub = "decision";
        if (e.params.modo === "coop" && e.params.online && e.jugadores.filter(x => !x.retirado).length > 1) e.t.voto = env.ahora() + VOTO_MS;
      } else avanzarCapitulo(e, P, env);
      if (e.params.formato === "turnos") pasarTurno(e);
      Base.cambio(e); revisarFin(e, env);
      return { ok: true };
    }

    if (d.tipo === "decidir") {
      if (P.sub !== "decision") return { ok: false, error: "Todavía no hay una decisión que tomar." };
      const n = C.decision.opciones.length;
      if (!Number.isInteger(d.opcion) || d.opcion < 0 || d.opcion >= n) return { ok: false, error: "Opción no válida." };
      if (e.t.voto) { // votación del equipo en línea
        e.votos[jid] = d.opcion; Base.cambio(e);
        if (Base.esperados(e).every(x => e.votos[x.id] != null)) resolverVotos(e, env);
        return { ok: true, voto: true };
      }
      resolverDecision(e, P, d.opcion, env);
      const idJugador = jid; if (e.params.modo === "comp") Base.jug(e, idJugador).puntos = P.puntos;
      if (e.params.formato === "turnos") pasarTurno(e);
      Base.cambio(e); revisarFin(e, env);
      return { ok: true };
    }
    return { ok: false, error: "Acción desconocida." };
  }

  function tick(e, env) {
    if (e.pausa || e.fase !== "jugando") return;
    const ahora = env.ahora();
    if (e.t.fin && ahora >= e.t.fin) return terminar(e, env, "tiempo");
    if (e.t.voto && ahora >= e.t.voto) resolverVotos(e, env);
  }

  function vista(e, jid, env) {
    const coop = e.params.modo === "coop";
    const P = coop ? e.equipo : (e.progreso[jid] || e.progreso[e.activo] || Object.values(e.progreso)[0]);
    const C = e.caso.capitulos[Math.min(P.cap, e.caso.capitulos.length - 1)];
    const inventario = [];
    e.caso.capitulos.forEach((c, i) => c.docs.forEach(dc => {
      if (P.examinados[dc.id]) inventario.push({ id: dc.id, cap: i, tipo: dc.tipo, titulo: dc.titulo, texto: dc.texto, nota: dc.nota, por: P.examinados[dc.id] });
    }));
    const examinado = (id) => !!P.examinados[id];
    const terminado = P.sub === "terminado";
    const nombresPorId = {}; e.jugadores.forEach(x => { nombresPorId[x.id] = x.nombre; });
    return {
      juego: "misterio", rev: e.rev, ahora: env.ahora(), fase: e.fase, params: e.params, pausado: !!e.pausa, anfitrion: e.anfitrion,
      activo: e.activo || null, modo: e.params.modo,
      reglas: { puntosDoc: PUNTOS_DOC, penalizaFallo: PENALIZA_FALLO, penalizaPista: PENALIZA_PISTA, maxFallos: MAX_FALLOS },
      caso: { id: e.caso.id, titulo: e.caso.titulo, intro: e.caso.intro, aviso: e.caso.aviso, capitulos: e.caso.capitulos.length },
      cap: P.cap, sub: P.sub, fallos: P.fallos, pistasUsadas: P.pistas, puntos: P.puntos, descartadas: P.descartadas,
      capitulo: terminado ? null : {
        titulo: C.titulo, escena: C.escena,
        docs: C.docs.map(dc => ({ id: dc.id, titulo: dc.titulo, examinado: examinado(dc.id), por: P.examinados[dc.id] || null,
          tipo: examinado(dc.id) ? dc.tipo : null, texto: examinado(dc.id) ? dc.texto : null, nota: examinado(dc.id) ? dc.nota : null })),
        pregunta: { tipo: C.pregunta.tipo, texto: C.pregunta.texto, opciones: C.pregunta.opciones || null, pista: P.pistas > 0 ? C.pregunta.pista : null,
          requiere: (C.pregunta.requiere || []).map(id => ({ id, titulo: C.docs.find(x => x.id === id).titulo, examinado: examinado(id) })) },
        decision: P.sub === "decision" ? { texto: C.decision.texto, opciones: C.decision.opciones.map(o => ({ texto: o.texto })) } : null
      },
      explicacion: P.sub === "explicacion" || P.sub === "decision" ? P.ultima : null,
      votos: e.t.voto ? Object.keys(e.votos) : null, votoFin: e.t.voto,
      inventario,
      final: terminado ? (e.caso.finales.find(f => f.id === P.final) || null) : null,
      progreso: coop ? [] : e.jugadores.filter(x => !x.retirado).map(x => { const p = e.progreso[x.id]; return { id: x.id, cap: p.cap, sub: p.sub, puntos: p.puntos, terminado: p.sub === "terminado" }; }),
      aportes: coop ? e.aportes : null, nombres: nombresPorId,
      limiteFin: e.t.fin,
      jugadores: Base.publicos(e),
      fin: e.fin
    };
  }

  return { id: "misterio", reglas, crear, accion, tick, vista, conexion: Base.conexion, salio: (e, jid) => Base.retirar(e, jid) };
});
