/* motores/ordena.js — reglas de "Ordena la historia".
   Todos los jugadores de una ronda resuelven la misma secuencia con las tarjetas en el mismo orden inicial.
   El servidor (o el motor local) guarda la solución y solo devuelve aciertos por posición a quien comprueba. */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica(require("./base"));
  else { raiz.Motores = raiz.Motores || {}; raiz.Motores.ordena = fabrica(raiz.Motores.base); }
})(typeof self !== "undefined" ? self : this, function (Base) {
  const MAX_INTENTOS = 3, PENALIZA_PISTA = 15, PENALIZA_INTENTO = 10;
  const REVELADO_MS = 12000;
  const FACTOR_LIMITE_ONLINE = 1.5; // en línea la ronda se cierra a los 1,5 × el tiempo de referencia

  const reglas = {
    MAX_INTENTOS, PENALIZA_PISTA, PENALIZA_INTENTO,
    puntos({ correctas, total, nivel, segundos, limite, pistas, intentosFallidos }) {
      const base = correctas * 10 * nivel;
      const perfecto = correctas === total;
      const bonoPerfecto = perfecto ? 25 * nivel : 0;
      const bonoTiempo = perfecto ? Math.max(0, Math.round(30 * nivel * (1 - segundos / limite))) : 0;
      return Math.max(0, base + bonoPerfecto + bonoTiempo - pistas * PENALIZA_PISTA - intentosFallidos * PENALIZA_INTENTO);
    },
    elegirSecuencias(banco, nivel, rondas, env, excluir) {
      const todas = banco.secuencias;
      const libres = (l) => Base.barajar(l.filter(s => !(excluir || []).includes(s.id)), env);
      if (nivel === "progresivo") {
        const res = [];
        for (let n = 1; n <= rondas; n++) { const c = libres(todas.filter(s => s.nivel === n))[0]; if (c) res.push(c); }
        return res;
      }
      const propias = libres(todas.filter(s => s.nivel === nivel));
      const otras = libres(todas.filter(s => s.nivel !== nivel)).sort((a, b) => Math.abs(a.nivel - nivel) - Math.abs(b.nivel - nivel));
      return propias.concat(otras).slice(0, rondas);
    }
  };

  function crear(params, jugadores, env) {
    const banco = env.banco.ordena;
    const online = !!params.online;
    const nivel = params.nivel === "progresivo" ? "progresivo" : Base.clamp(params.nivel, 1, 3, 1);
    const rondas = Base.clamp(params.rondas, 1, 3, 3);
    const e = Base.nuevo("ordena", {
      formato: params.formato === "turnos" ? "turnos" : "simultaneo", online, nivel, rondas, pistas: params.pistas !== false
    }, jugadores, env);
    e.secuencias = reglas.elegirSecuencias(banco, nivel, rondas, env);
    e.totalRondas = e.secuencias.length;
    e.idx = 0; e.tiempoTotal = {};
    e.jugadores.forEach(j => { e.tiempoTotal[j.id] = 0; });
    iniciarRonda(e, env, e.jugadores.map(j => j.id));
    return e;
  }

  function iniciarRonda(e, env, participantes) {
    const set = e.secuencias[e.idx];
    let baraja = Base.barajar(set.eventos.map(x => x.id), env);
    // La baraja inicial nunca coincide con la solución
    let guard = 0;
    while (guard++ < 10 && baraja.every((id, i) => id === set.eventos[i].id)) baraja = Base.barajar(baraja, env);
    const ahora = env.ahora();
    const limite = env.banco.ordena.limites[set.nivel];
    e.ronda = {
      n: e.idx, set, baraja, participantes, limite,
      t: { inicio: ahora, fin: e.params.online ? ahora + Math.round(limite * FACTOR_LIMITE_ONLINE) * 1000 : null, sigue: null },
      jug: {}
    };
    participantes.forEach(id => {
      e.ronda.jug[id] = { intentos: 0, pistas: 0, fechas: {}, mejor: 0, terminado: false, resuelto: false, ultimo: null, puntos: 0, tiempoMs: 0, inicio: ahora };
    });
    e.activo = e.params.formato === "turnos" ? participantes[0] : null;
    e.fase = "jugando"; e.revelado = null;
    Base.cambio(e);
  }

  const pendientes = (e) => e.ronda.participantes.filter(id => {
    const j = Base.jug(e, id);
    return !e.ronda.jug[id].terminado && j && !j.retirado && (j.conectado || e.params.formato === "turnos");
  });

  function terminarJugador(e, id, env, porTiempo) {
    const r = e.ronda, s = r.jug[id], n = r.set.eventos.length;
    s.terminado = true;
    s.tiempoMs = porTiempo ? Math.max(0, (r.t.fin || env.ahora()) - s.inicio) : env.ahora() - s.inicio;
    const fallidos = s.resuelto ? s.intentos - 1 : s.intentos;
    s.puntos = s.intentos === 0 ? 0 : reglas.puntos({ correctas: s.mejor, total: n, nivel: r.set.nivel, segundos: s.tiempoMs / 1000, limite: r.limite, pistas: s.pistas, intentosFallidos: fallidos });
    Base.jug(e, id).puntos += s.puntos;
    e.tiempoTotal[id] += s.tiempoMs;
  }

  function siguienteTurno(e, env) {
    const quedan = e.ronda.participantes.filter(id => !e.ronda.jug[id].terminado && !Base.jug(e, id).retirado);
    if (!quedan.length) return cerrarRonda(e, env);
    e.activo = quedan[0];
    e.ronda.jug[e.activo].inicio = env.ahora();
    Base.cambio(e);
  }

  function cerrarRonda(e, env, porTiempo) {
    e.ronda.participantes.forEach(id => { if (!e.ronda.jug[id].terminado) terminarJugador(e, id, env, porTiempo); });
    const por = {};
    e.ronda.participantes.forEach(id => { const s = e.ronda.jug[id]; por[id] = { puntos: s.puntos, correctas: s.mejor, intentos: s.intentos, pistas: s.pistas, tiempoMs: s.tiempoMs, resuelto: s.resuelto }; });
    e.revelado = { solucion: e.ronda.set.eventos.map(x => ({ id: x.id, fecha: x.fecha, titulo: x.titulo, desc: x.desc })), explicacion: e.ronda.set.explicacion, porJugador: por };
    e.fase = "revelado";
    e.activo = null;
    e.ronda.t.sigue = e.params.online ? env.ahora() + REVELADO_MS : null;
    Base.cambio(e);
  }

  function siguienteRonda(e, env) {
    e.idx++;
    if (e.idx < e.secuencias.length) return iniciarRonda(e, env, e.jugadores.filter(j => !j.retirado).map(j => j.id));
    // Empate en el primer lugar: una ronda de desempate solo para los empatados (una vez)
    if (!e.desempate) {
      const r = Base.ranking(e);
      const top = r.filter(x => x.puntos === r[0].puntos && !Base.jug(e, x.id).retirado);
      if (top.length > 1 && r[0].puntos > 0) {
        const usados = e.secuencias.map(s => s.id);
        const extra = reglas.elegirSecuencias(env.banco.ordena, 3, 1, env, usados)[0] || reglas.elegirSecuencias(env.banco.ordena, 3, 1, env, [e.secuencias[e.secuencias.length - 1].id])[0];
        e.secuencias.push(extra); e.totalRondas = e.secuencias.length; e.desempate = true;
        return iniciarRonda(e, env, top.map(x => x.id));
      }
    }
    terminar(e, env);
  }

  function terminar(e, env) {
    e.fase = "fin"; e.activo = null;
    const ranking = Base.ranking(e, j => e.tiempoTotal[j.id]).map(r => Object.assign(r, { tiempoMs: e.tiempoTotal[r.id] }));
    e.fin = { ranking, ganadores: Base.ganadores(ranking), rondas: e.totalRondas, desempate: !!e.desempate, segundos: Math.round((env.ahora() - e.inicio) / 1000),
      logros: { perfecto: e.perfectoSinPistas === true } };
    Base.cambio(e);
  }

  function accion(e, jid, d, env) {
    const j = Base.jug(e, jid);
    if (!j || j.retirado) return { ok: false, error: "No participas en esta partida." };
    if (!d || typeof d !== "object") return { ok: false, error: "Acción no válida." };
    if (e.fase === "fin") return { ok: false, error: "La partida terminó." };
    const r = e.ronda, s = r && r.jug[jid];

    if (d.tipo === "comprobar") {
      if (e.fase !== "jugando") return { ok: false, error: "La ronda ya terminó." };
      if (e.pausa) return { ok: false, error: "El juego está en pausa." };
      if (!s) return { ok: false, error: "No participas en esta ronda." };
      if (s.terminado) return { ok: false, error: "Ya terminaste esta ronda." };
      if (e.params.formato === "turnos" && jid !== e.activo) return { ok: false, error: "No es tu turno." };
      const sol = r.set.eventos.map(x => x.id);
      const orden = d.orden;
      if (!Array.isArray(orden) || orden.length !== sol.length || new Set(orden).size !== sol.length || !orden.every(id => sol.includes(id)))
        return { ok: false, error: "El orden enviado no es válido." };
      s.intentos++;
      const aciertos = orden.map((id, i) => id === sol[i]);
      const correctas = aciertos.filter(Boolean).length;
      s.mejor = Math.max(s.mejor, correctas);
      s.resuelto = correctas === sol.length;
      s.ultimo = { orden: orden.slice(), aciertos };
      Base.cambio(e);
      if (s.resuelto || s.intentos >= MAX_INTENTOS) {
        terminarJugador(e, jid, env, false);
        if (s.resuelto && s.pistas === 0 && s.intentos === 1) e.perfectoSinPistas = true;
        if (e.params.formato === "turnos") siguienteTurno(e, env);
        else if (!pendientes(e).length) cerrarRonda(e, env);
      }
      return { ok: true, aciertos, resuelto: s.resuelto, terminado: s.terminado };
    }

    if (d.tipo === "pista") {
      if (!e.params.pistas) return { ok: false, error: "Las pistas están desactivadas." };
      if (e.fase !== "jugando" || !s || s.terminado) return { ok: false, error: "No puedes pedir una pista ahora." };
      if (e.params.formato === "turnos" && jid !== e.activo) return { ok: false, error: "No es tu turno." };
      const ocultas = r.set.eventos.filter(x => !s.fechas[x.id]);
      if (ocultas.length <= 1) return { ok: false, error: "Ya conoces casi todas las fechas." };
      const x = ocultas[env.azar(ocultas.length)];
      s.fechas[x.id] = x.fecha; s.pistas++;
      Base.cambio(e);
      return { ok: true, id: x.id, fecha: x.fecha };
    }

    if (d.tipo === "siguiente") {
      if (e.fase !== "revelado") return { ok: false, error: "Aún no se puede avanzar." };
      if (!Base.puedeAvanzar(e, jid)) return { ok: false, error: "Solo el anfitrión avanza." };
      siguienteRonda(e, env);
      return { ok: true };
    }

    if (d.tipo === "pausar" || d.tipo === "reanudar") {
      if (e.params.online || e.jugadores.length > 1) return { ok: false, error: "La pausa solo existe en el modo individual." };
      if (d.tipo === "pausar" && e.fase === "jugando" && !e.pausa) { e.pausa = env.ahora(); Base.cambio(e); return { ok: true }; }
      if (d.tipo === "reanudar" && e.pausa) {
        const delta = env.ahora() - e.pausa; e.pausa = null;
        r.t.inicio += delta; Object.values(r.jug).forEach(x => { x.inicio += delta; });
        Base.cambio(e); return { ok: true };
      }
      return { ok: false, error: "No se puede pausar ahora." };
    }
    return { ok: false, error: "Acción desconocida." };
  }

  function tick(e, env) {
    if (e.pausa || !e.ronda) return;
    const ahora = env.ahora();
    if (e.fase === "jugando") {
      if (e.ronda.t.fin && ahora >= e.ronda.t.fin) cerrarRonda(e, env, true);
      else if (e.params.formato === "simultaneo" && e.params.online && !pendientes(e).length) cerrarRonda(e, env);
    } else if (e.fase === "revelado" && e.ronda.t.sigue && ahora >= e.ronda.t.sigue) siguienteRonda(e, env);
  }

  function vista(e, jid, env) {
    const r = e.ronda, s = r && r.jug[jid], rev = e.fase === "revelado";
    const fechas = s ? s.fechas : {};
    const cartas = r ? r.baraja.map(id => {
      const x = r.set.eventos.find(y => y.id === id);
      return { id, titulo: x.titulo, desc: x.desc, fecha: fechas[id] || (rev ? x.fecha : null) };
    }) : [];
    return {
      juego: "ordena", rev: e.rev, ahora: env.ahora(), fase: e.fase, params: e.params, pausado: !!e.pausa, anfitrion: e.anfitrion,
      activo: e.activo || null, desempate: !!e.desempate,
      reglas: { maxIntentos: MAX_INTENTOS, penalizaPista: PENALIZA_PISTA, penalizaIntento: PENALIZA_INTENTO },
      ronda: r ? { n: r.n, total: e.totalRondas, nivel: r.set.nivel, titulo: r.set.titulo, cartas, limite: r.limite, inicio: s ? s.inicio : r.t.inicio, fin: r.t.fin, sigue: r.t.sigue, participantes: r.participantes } : null,
      mio: s ? { intentos: s.intentos, pistas: s.pistas, terminado: s.terminado, resuelto: s.resuelto, ultimo: s.ultimo, mejor: s.mejor } : null,
      progreso: r ? r.participantes.map(id => { const x = r.jug[id]; return { id, intentos: x.intentos, correctas: x.mejor, terminado: x.terminado, pistas: x.pistas }; }) : [],
      revelado: rev ? e.revelado : null,
      jugadores: Base.publicos(e),
      fin: e.fin
    };
  }

  return { id: "ordena", reglas, crear, accion, tick, vista, conexion: Base.conexion, salio: (e, jid) => Base.retirar(e, jid) };
});
