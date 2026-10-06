/* motores/sopa.js — reglas de la Sopa de letras.
   El tablero se genera una vez (en el servidor, en línea). Las selecciones se validan leyendo las letras del tablero,
   no lo que diga el cliente. La posición de las palabras nunca se envía: solo el tablero y la lista de palabras. */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica(require("./base"));
  else { raiz.Motores = raiz.Motores || {}; raiz.Motores.sopa = fabrica(raiz.Motores.base); }
})(typeof self !== "undefined" ? self : this, function (Base) {
  const PENALIZA_PISTA = 15;
  const LIMITES_ONLINE = [180, 300, 420, 600];

  const reglas = {
    PENALIZA_PISTA,
    puntosPalabra(largo) { return 10 + 2 * largo; },
    // Bonificación por tiempo (solo individual): referencia de 25 s por palabra
    bonusTiempo(segundos, palabras) { return Math.max(0, Math.round(10 * palabras * (1 - segundos / (palabras * 25)))); },

    // Coloca las palabras en un tablero tam×tam. Devuelve { grid: [filas], colocadas: [{t,r,c,dr,dc}] }
    generar(palabras, tam, dirs, env) {
      const letras = palabras.join("");
      for (let intento = 0; intento < 40; intento++) {
        const g = Array.from({ length: tam }, () => Array(tam).fill(""));
        const colocadas = [];
        let todas = true;
        for (const t of palabras.slice().sort((a, b) => b.length - a.length)) {
          let puesta = false;
          for (let k = 0; k < 250 && !puesta; k++) {
            const [dr, dc] = dirs[env.azar(dirs.length)];
            const r = env.azar(tam), c = env.azar(tam);
            const rf = r + dr * (t.length - 1), cf = c + dc * (t.length - 1);
            if (rf < 0 || rf >= tam || cf < 0 || cf >= tam) continue;
            let cabe = true;
            for (let i = 0; i < t.length && cabe; i++) { const x = g[r + dr * i][c + dc * i]; if (x && x !== t[i]) cabe = false; }
            if (!cabe) continue;
            for (let i = 0; i < t.length; i++) g[r + dr * i][c + dc * i] = t[i];
            colocadas.push({ t, r, c, dr, dc }); puesta = true;
          }
          if (!puesta) { todas = false; break; }
        }
        if (!todas) continue;
        for (let r = 0; r < tam; r++) for (let c = 0; c < tam; c++) if (!g[r][c]) g[r][c] = letras[env.azar(letras.length)];
        return { grid: g.map(f => f.join("")), colocadas };
      }
      return null;
    },

    // Lee la línea recta entre dos celdas. Devuelve null si no es una línea horizontal, vertical o diagonal.
    linea(grid, r1, c1, r2, c2) {
      const tam = grid.length;
      if (![r1, c1, r2, c2].every(Number.isInteger) || [r1, c1, r2, c2].some(x => x < 0 || x >= tam)) return null;
      const dr = r2 - r1, dc = c2 - c1;
      if (!(dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc)) || (dr === 0 && dc === 0)) return null;
      const largo = Math.max(Math.abs(dr), Math.abs(dc)) + 1, sr = Math.sign(dr), sc = Math.sign(dc);
      const celdas = [];
      for (let i = 0; i < largo; i++) celdas.push([r1 + sr * i, c1 + sc * i]);
      return { celdas, texto: celdas.map(([r, c]) => grid[r][c]).join("") };
    }
  };

  function crear(params, jugadores, env) {
    const banco = env.banco.sopa;
    const nivelId = Base.entre(params.dificultad, Object.keys(banco.niveles), "facil");
    const nivel = banco.niveles[nivelId];
    const cat = params.categoria in banco.categorias ? params.categoria : "mezcla";
    const online = !!params.online;
    const base = cat === "mezcla" ? [].concat(...Object.values(banco.bancos)) : banco.bancos[cat];
    const candidatas = Base.barajar(base.filter(w => w.t.length <= nivel.tam - 1), env);
    // Palabras que se solapan o están contenidas en otras confunden: se evitan
    const elegidas = [];
    for (const w of candidatas) {
      if (elegidas.length >= nivel.palabras) break;
      if (elegidas.some(x => x.t.includes(w.t) || w.t.includes(x.t))) continue;
      elegidas.push(w);
    }
    const tab = reglas.generar(elegidas.map(w => w.t), nivel.tam, nivel.dirs, env);
    if (!tab) throw new Error("No se pudo generar el tablero");
    const e = Base.nuevo("sopa", {
      formato: params.formato === "turnos" ? "turnos" : "simultaneo", online, dificultad: nivelId, categoria: cat, pistas: params.pistas !== false,
      limite: online ? Base.entre(Number(params.limite), LIMITES_ONLINE, 300) : 0
    }, jugadores, env);
    e.grid = tab.grid; e.colocadas = tab.colocadas; e.tam = nivel.tam;
    e.palabras = elegidas.map((w, i) => ({ id: "w" + i, t: w.t, m: w.m, d: w.d, largo: w.t.length }));
    e.hallazgos = {};
    e.stats = {}; e.jugadores.forEach(j => { e.stats[j.id] = { palabras: 0, pistas: 0, fallos: 0, pistasCeldas: [] }; });
    e.t = { inicio: env.ahora(), fin: online ? env.ahora() + e.params.limite * 1000 : null };
    e.activo = e.params.formato === "turnos" ? e.jugadores[0].id : null;
    e.fase = "jugando";
    return e;
  }

  const siguiente = (e, id) => {
    const vivos = e.jugadores.filter(j => !j.retirado);
    const i = vivos.findIndex(j => j.id === id);
    return vivos[(i + 1) % vivos.length].id;
  };

  function terminar(e, env, motivo) {
    e.fase = "fin"; e.activo = null;
    const seg = Math.round((env.ahora() - e.inicio - (e.pausaTotal || 0)) / 1000);
    const completo = Object.keys(e.hallazgos).length === e.palabras.length;
    if (completo && e.jugadores.length === 1 && !e.params.online) e.jugadores[0].puntos += (e.bonus = reglas.bonusTiempo(seg, e.palabras.length));
    const ranking = Base.ranking(e, j => -e.stats[j.id].palabras).map(r => Object.assign(r, { palabras: e.stats[r.id].palabras, pistas: e.stats[r.id].pistas }));
    e.fin = { ranking, ganadores: Base.ganadores(ranking), segundos: seg, completo, motivo: motivo || (completo ? "completo" : "tiempo"),
      encontradas: Object.keys(e.hallazgos).length, total: e.palabras.length, bonus: e.bonus || 0,
      logros: { sinPistas: completo && Object.values(e.stats).every(s => s.pistas === 0) } };
    Base.cambio(e);
  }

  function accion(e, jid, d, env) {
    const j = Base.jug(e, jid);
    if (!j || j.retirado) return { ok: false, error: "No participas en esta partida." };
    if (!d || typeof d !== "object") return { ok: false, error: "Acción no válida." };
    if (e.fase !== "jugando") return { ok: false, error: "La partida terminó." };
    if (e.pausa) return { ok: false, error: "El juego está en pausa." };
    if (e.t.fin && env.ahora() >= e.t.fin) { terminar(e, env); return { ok: false, error: "Se acabó el tiempo." }; }
    if (e.params.formato === "turnos" && jid !== e.activo) return { ok: false, error: "No es tu turno." };

    if (d.tipo === "seleccionar") {
      const ln = reglas.linea(e.grid, d.r1, d.c1, d.r2, d.c2);
      if (!ln) return { ok: false, error: "Selecciona una línea recta." };
      const inverso = ln.texto.split("").reverse().join("");
      const p = e.palabras.find(w => w.t === ln.texto || w.t === inverso);
      const st = e.stats[jid];
      if (!p) {
        st.fallos++;
        if (e.params.formato === "turnos") e.activo = siguiente(e, jid);
        Base.cambio(e);
        return { ok: true, resultado: "no" };
      }
      const previo = e.hallazgos[p.id];
      if (previo) return { ok: true, resultado: "repetida", por: previo.por, propia: previo.por === jid, palabra: p.m };
      const pts = reglas.puntosPalabra(p.largo);
      e.hallazgos[p.id] = { por: jid, celdas: ln.celdas, ms: env.ahora() - e.inicio };
      j.puntos += pts; st.palabras++;
      Base.cambio(e);
      if (Object.keys(e.hallazgos).length === e.palabras.length) terminar(e, env);
      return { ok: true, resultado: "ok", palabra: p.m, def: p.d, puntos: pts, id: p.id };
    }

    if (d.tipo === "pista") {
      if (!e.params.pistas) return { ok: false, error: "Las pistas están desactivadas." };
      const st = e.stats[jid];
      const pend = e.palabras.filter(w => !e.hallazgos[w.id] && !st.pistasCeldas.some(x => x.id === w.id));
      if (!pend.length) return { ok: false, error: "No quedan pistas por mostrar." };
      const w = pend[env.azar(pend.length)];
      const col = e.colocadas.find(x => x.t === w.t);
      st.pistasCeldas.push({ id: w.id, r: col.r, c: col.c });
      st.pistas++; j.puntos = Math.max(0, j.puntos - PENALIZA_PISTA);
      Base.cambio(e);
      return { ok: true, r: col.r, c: col.c };
    }

    if (d.tipo === "pausar" || d.tipo === "reanudar") {
      if (e.params.online || e.jugadores.length > 1) return { ok: false, error: "La pausa solo existe en el modo individual." };
      if (d.tipo === "pausar" && !e.pausa) { e.pausa = env.ahora(); Base.cambio(e); return { ok: true }; }
      if (d.tipo === "reanudar" && e.pausa) { const delta = env.ahora() - e.pausa; e.pausa = null; e.pausaTotal = (e.pausaTotal || 0) + delta; Base.cambio(e); return { ok: true }; }
      return { ok: false, error: "No se puede pausar ahora." };
    }
    return { ok: false, error: "Acción desconocida." };
  }

  function tick(e, env) {
    if (e.pausa || e.fase !== "jugando") return;
    if (e.t.fin && env.ahora() >= e.t.fin) terminar(e, env);
  }

  function vista(e, jid, env) {
    const st = e.stats[jid];
    return {
      juego: "sopa", rev: e.rev, ahora: env.ahora(), fase: e.fase, params: e.params, pausado: !!e.pausa, anfitrion: e.anfitrion,
      activo: e.activo || null, tam: e.tam, grid: e.grid, inicio: e.inicio + (e.pausaTotal || 0), limiteFin: e.t.fin,
      palabras: e.palabras.map(w => ({ id: w.id, m: w.m, largo: w.largo, d: e.hallazgos[w.id] ? w.d : null })),
      hallazgos: e.hallazgos,
      mio: st ? { pistas: st.pistasCeldas.filter(x => !e.hallazgos[x.id]), usadas: st.pistas, palabras: st.palabras, fallos: st.fallos } : null,
      reglas: { penalizaPista: PENALIZA_PISTA },
      jugadores: Base.publicos(e, j => ({ palabras: e.stats[j.id].palabras })),
      fin: e.fin
    };
  }

  return { id: "sopa", reglas, crear, accion, tick, vista, conexion: Base.conexion, salio: (e, jid) => Base.retirar(e, jid) };
});
