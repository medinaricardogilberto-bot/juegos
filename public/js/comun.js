/* comun.js — piezas compartidas por los juegos nuevos (Trivia, Ordena la historia, ¿Quién soy?,
   Sopa de letras y El misterio histórico).
   Nada de este archivo depende del servidor: los modos "Un jugador" y "Multijugador local"
   (mismo dispositivo, por turnos) funcionan sin conexión. */
const Datos = window.Datos || (window.Datos = {});

/* ---------- utilidades ---------- */
const Util = {
  AVATARES: ["🦅", "🔔", "🌵", "🎺"],

  barajar(lista) {
    const a = lista.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  },
  tomar(lista, n) { return Util.barajar(lista).slice(0, n); },

  tiempo(s) {
    s = Math.max(0, Math.round(s));
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  },

  // Para comparar respuestas escritas: sin acentos, sin mayúsculas, sin signos
  normalizar(t) {
    return String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  },

  // Crea un elemento. "text" es seguro para texto del usuario; "html" solo con contenido propio.
  h(tag, props, ...hijos) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k === "html") e.innerHTML = v;
      else if (k === "style") e.style.cssText = v;
      else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    hijos.flat().forEach(c => { if (c != null && c !== false) e.append(c instanceof Node ? c : String(c)); });
    return e;
  },

  leer(clave, def) { try { const v = JSON.parse(localStorage.getItem(clave)); return v ?? def; } catch (e) { return def; } },
  guardar(clave, valor) { try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) {} },
  nombreGuardado() { try { return localStorage.getItem("nombreJugador") || ""; } catch (e) { return ""; } }
};

/* ---------- contexto de un juego montado ----------
   Juego.crear(raiz, {...}) dibuja el encabezado común y devuelve un contexto que lleva la cuenta
   de temporizadores y escuchas, para que desmontar() no deje nada corriendo. */
const Juego = {
  crear(raiz, { id, ceja, titulo, enfasis, subtitulo }) {
    const el = Util.h("div", { id: "juego-" + id, class: "jg" });
    const encabezado = Util.h("header", { class: "jg-encabezado" },
      Util.h("p", { class: "ceja", text: ceja }),
      Util.h("h1", {}, titulo + " ", Util.h("em", { text: enfasis })),
      subtitulo ? Util.h("p", { class: "subtitulo", text: subtitulo }) : null);
    const cuerpo = Util.h("div", { class: "jg-cuerpo" });
    el.append(encabezado, cuerpo);
    raiz.innerHTML = "";
    raiz.appendChild(el);

    const timers = new Set(), escuchas = [];
    return {
      id, el, cuerpo, encabezado,
      despues(fn, ms) { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; },
      cada(fn, ms) { const t = setInterval(fn, ms); timers.add(t); return t; },
      parar(t) { clearTimeout(t); clearInterval(t); timers.delete(t); },
      escuchar(obj, ev, fn) { obj.addEventListener(ev, fn); escuchas.push([obj, ev, fn]); },
      limpiarCuerpo() { cuerpo.innerHTML = ""; el.querySelectorAll(".jg-capa").forEach(c => c.remove()); },
      limpiar() {
        timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers.clear();
        escuchas.forEach(([o, e, f]) => o.removeEventListener(e, f)); escuchas.length = 0;
      }
    };
  },

  // Cronómetro que se puede pausar. alCambiar(segundos) se llama cada segundo.
  cronometro(ctx, alCambiar) {
    let seg = 0, t = null;
    const c = {
      get segundos() { return seg; },
      iniciar(desde = 0) { c.parar(); seg = desde; alCambiar && alCambiar(seg); t = ctx.cada(() => { seg++; alCambiar && alCambiar(seg); }, 1000); },
      reanudar() { if (!t) t = ctx.cada(() => { seg++; alCambiar && alCambiar(seg); }, 1000); },
      parar() { if (t) ctx.parar(t); t = null; },
      get activo() { return !!t; }
    };
    return c;
  }
};

/* ---------- pantalla de configuración (instrucciones + opciones + jugadores) ---------- */
const Config = {
  /* opciones: { instrucciones: [texto], campos: [{ id, etiqueta, opciones: [{ valor, texto, ayuda }] }],
                 modo: "solo" | "local", minJug, maxJug, extraLocal: [campos solo para local], alIniciar(valores, jugadores) } */
  mostrar(ctx, op) {
    ctx.limpiarCuerpo();
    const clave = "config:" + ctx.id;
    const previo = Util.leer(clave, {});
    const valores = {};
    const tarjeta = Util.h("section", { class: "jg-panel jg-config", "aria-labelledby": "jg-config-titulo" });
    tarjeta.append(Util.h("h2", { class: "jg-panel__titulo", id: "jg-config-titulo", text: op.modo === "local" ? "Multijugador local" : "Un jugador" }));

    const como = Util.h("details", { class: "jg-instrucciones", open: true },
      Util.h("summary", { text: "¿Cómo se juega?" }),
      Util.h("ul", {}, op.instrucciones.map(t => Util.h("li", { text: t }))));
    tarjeta.append(como);

    const campos = op.campos.concat(op.modo === "local" ? (op.extraLocal || []) : []);
    campos.forEach(c => {
      const guardado = c.opciones.some(o => String(o.valor) === String(previo[c.id])) ? previo[c.id] : (c.porDefecto ?? c.opciones[0].valor);
      valores[c.id] = guardado;
      const grupo = Util.h("fieldset", { class: "jg-segmentos" }, Util.h("legend", { text: c.etiqueta }));
      const ayuda = Util.h("p", { class: "jg-ayuda" });
      c.opciones.forEach(o => {
        const input = Util.h("input", { type: "radio", name: "cfg-" + c.id, value: String(o.valor) });
        input.checked = String(o.valor) === String(guardado);
        input.addEventListener("change", () => { valores[c.id] = o.valor; ayuda.textContent = o.ayuda || ""; });
        if (input.checked) ayuda.textContent = o.ayuda || "";
        grupo.append(Util.h("label", { class: "jg-segmento" }, input, Util.h("span", { text: o.texto })));
      });
      grupo.append(ayuda);
      tarjeta.append(grupo);
    });

    // Jugadores
    const nombres = Util.leer("nombresLocales", []);
    const zonaJug = Util.h("div", { class: "jg-jugadores-config" });
    let cuantos = op.modo === "local" ? Math.min(op.maxJug || 4, Math.max(op.minJug || 2, previo._jugadores || 2)) : 1;
    const pintarJug = () => {
      zonaJug.innerHTML = "";
      if (op.modo === "local") {
        const sel = Util.h("fieldset", { class: "jg-segmentos" }, Util.h("legend", { text: "Número de jugadores" }));
        for (let n = op.minJug || 2; n <= (op.maxJug || 4); n++) {
          const input = Util.h("input", { type: "radio", name: "cfg-jugadores", value: String(n) });
          input.checked = n === cuantos;
          input.addEventListener("change", () => { cuantos = n; pintarJug(); });
          sel.append(Util.h("label", { class: "jg-segmento" }, input, Util.h("span", { text: String(n) })));
        }
        zonaJug.append(sel);
      }
      for (let i = 0; i < cuantos; i++) {
        const def = op.modo === "local" ? (nombres[i] || "") : Util.nombreGuardado();
        zonaJug.append(Util.h("label", { class: "campo jg-campo" },
          (op.modo === "local" ? Util.AVATARES[i] + " Jugador " + (i + 1) : "Tu nombre (opcional)"),
          Util.h("input", { class: "jg-nombre", maxlength: "16", autocomplete: "off", value: def, placeholder: op.modo === "local" ? "Nombre" : "Ej. Ana" })));
      }
    };
    pintarJug();
    tarjeta.append(zonaJug);

    const error = Util.h("p", { class: "jg-error", role: "alert" });
    const boton = Util.h("button", { class: "boton jg-boton-grande", type: "button", text: "Comenzar" });
    boton.addEventListener("click", () => {
      const lista = [...zonaJug.querySelectorAll(".jg-nombre")].map((inp, i) =>
        inp.value.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 16) || (op.modo === "local" ? "Jugador " + (i + 1) : "Tú"));
      if (op.modo === "local" && new Set(lista.map(n => n.toLowerCase())).size !== lista.length) {
        error.textContent = "Cada jugador necesita un nombre distinto."; return;
      }
      if (op.modo === "local") Util.guardar("nombresLocales", lista);
      else if (lista[0] !== "Tú") { try { localStorage.setItem("nombreJugador", lista[0]); } catch (e) {} }
      Util.guardar(clave, { ...valores, _jugadores: cuantos });
      const jugadores = lista.map((nombre, i) => ({ nombre, avatar: Util.AVATARES[i % 4], puntos: 0 }));
      op.alIniciar(valores, jugadores);
    });
    tarjeta.append(error, boton);

    // Mejores puntuaciones de este dispositivo
    const tabla = Progreso.tabla(ctx.id);
    if (tabla.length) {
      tarjeta.append(Util.h("details", { class: "jg-instrucciones jg-records" },
        Util.h("summary", { text: "Mejores puntuaciones en este dispositivo" }),
        Util.h("ol", {}, tabla.slice(0, 5).map(r => Util.h("li", {}, Util.h("span", { text: r.nombre + (r.modo === "local" ? " 👥" : "") }), Util.h("b", { text: r.puntos + " pts" }))))));
    }
    ctx.cuerpo.append(tarjeta);
    boton.focus({ preventScroll: true });
  }
};

/* ---------- cortina: tapa la pantalla al cambiar de jugador (respuestas privadas) ---------- */
const Cortina = {
  mostrar(ctx, { titulo, texto, boton = "Estoy listo · mostrar" }) {
    return new Promise(resolve => {
      const btn = Util.h("button", { class: "boton jg-boton-grande", type: "button", text: boton });
      const capa = Util.h("div", { class: "jg-capa jg-cortina", role: "dialog", "aria-modal": "true", "aria-label": titulo },
        Util.h("div", { class: "jg-cortina__caja" },
          Util.h("p", { class: "ceja", text: "Cambio de turno" }),
          Util.h("h2", { text: titulo }),
          texto ? Util.h("p", { text: texto }) : null, btn));
      btn.addEventListener("click", () => { capa.remove(); resolve(); });
      ctx.el.append(capa);
      btn.focus();
    });
  }
};

/* ---------- marcador de jugadores ---------- */
const Marcador = {
  pintar(cont, jugadores, activo = -1, detalle) {
    cont.innerHTML = "";
    cont.classList.add("jg-marcador-jug");
    jugadores.forEach((j, i) => {
      cont.append(Util.h("div", { class: "jg-chip" + (i === activo ? " jg-chip--activo" : ""), "aria-current": i === activo ? "true" : null },
        Util.h("span", { text: j.avatar + " " + j.nombre }),
        Util.h("span", { class: "jg-chip__pts", text: (detalle ? detalle(j) + " · " : "") + j.puntos + " pts" })));
    });
  }
};

/* ---------- pantalla final ---------- */
const Resultados = {
  /* { titulo, texto, datos: [[etiqueta, valor]], ranking: [jugadores], extra: Node, progreso, alReintentar, textoReintentar } */
  mostrar(ctx, op) {
    const tarjeta = Util.h("div", { class: "jg-resultado__tarjeta" });
    tarjeta.append(Util.h("div", { class: "jg-resultado__icono", "aria-hidden": "true", text: op.icono || "🏆" }),
      Util.h("h2", { class: "jg-resultado__titulo", id: "jg-res-titulo", text: op.titulo }));
    if (op.texto) tarjeta.append(Util.h("p", { class: "jg-resultado__texto", text: op.texto }));
    if (op.datos && op.datos.length) {
      tarjeta.append(Util.h("dl", { class: "jg-resultado__datos" },
        op.datos.map(([k, v]) => Util.h("div", {}, Util.h("dt", { text: k }), Util.h("dd", { text: String(v) })))));
    }
    if (op.ranking && op.ranking.length > 1) {
      const orden = op.ranking.slice().sort((a, b) => b.puntos - a.puntos || (a.desempate ?? 0) - (b.desempate ?? 0));
      tarjeta.append(Util.h("ol", { class: "jg-resultado__ranking" },
        orden.map((j, i) => Util.h("li", { class: i === 0 ? "jg-ganador" : "" },
          Util.h("span", { text: j.avatar + " " + j.nombre }), Util.h("b", { text: j.puntos + " pts" })))));
    }
    if (op.progreso) {
      const p = op.progreso, lineas = [];
      if (p.xp > 0) lineas.push("+" + p.xp + " de experiencia");
      if (p.limite) lineas.push("Alcanzaste el límite diario de experiencia en este juego");
      if (p.record) lineas.push("¡Nuevo récord personal!");
      p.insignias.forEach(i => lineas.push("Insignia nueva: " + i.icono + " " + i.nombre));
      if (lineas.length) tarjeta.append(Util.h("ul", { class: "jg-resultado__logros" }, lineas.map(t => Util.h("li", { text: t }))));
    }
    if (op.extra) tarjeta.append(op.extra);
    if (op.nota) tarjeta.append(Util.h("p", { class: "jg-resultado__texto jg-resultado__nota", role: "status", text: op.nota }));
    const reintentar = op.alReintentar ? Util.h("button", { class: "boton jg-boton-grande", type: "button", text: op.textoReintentar || "Jugar de nuevo" }) : null;
    const menu = Util.h("button", { class: "boton boton--fantasma-oscuro jg-boton-grande", type: "button", text: "Volver al menú" });
    tarjeta.append(Util.h("div", { class: "jg-resultado__botones" }, reintentar, menu));
    const capa = Util.h("div", { class: "jg-capa jg-resultado", role: "dialog", "aria-modal": "true", "aria-labelledby": "jg-res-titulo" }, tarjeta);
    if (reintentar) reintentar.addEventListener("click", () => { if (op.alReintentar() !== false) capa.remove(); });
    menu.addEventListener("click", () => App.salirJuego());
    ctx.el.querySelectorAll(".jg-resultado").forEach(c => c.remove());
    ctx.el.append(capa);
    (reintentar || menu).focus();
  }
};

/* ---------- progreso, récords, experiencia e insignias (guardados en este dispositivo) ---------- */
const Progreso = {
  CLAVE: "progresoJuegos",
  XP_MAX_PARTIDA: 60,      // experiencia máxima por partida
  XP_MAX_DIA: 240,         // por juego y por día: repetir sin parar no da experiencia infinita
  JUEGOS: ["trivia", "ordena", "quiensoy", "sopa", "misterio"],
  INSIGNIAS: {
    primera:            { icono: "🎖️", nombre: "Primer paso", desc: "Termina tu primera partida." },
    explorador:         { icono: "🧭", nombre: "Explorador", desc: "Juega los cinco juegos nuevos." },
    "trivia-racha":     { icono: "🔥", nombre: "Racha imparable", desc: "Acierta 5 preguntas seguidas en la Trivia." },
    "trivia-dificil":   { icono: "📜", nombre: "Historiador", desc: "Acierta el 80 % en la Trivia difícil." },
    "ordena-perfecto":  { icono: "⏳", nombre: "Cronista", desc: "Ordena una secuencia perfecta sin pistas." },
    "quiensoy-primera": { icono: "🦅", nombre: "Ojo de águila", desc: "Adivina un personaje con la primera pista." },
    "sopa-sinpistas":   { icono: "🔍", nombre: "Buscador", desc: "Completa una sopa de letras sin pistas." },
    "misterio-caso":    { icono: "🕯️", nombre: "Detective insurgente", desc: "Resuelve un caso completo del Misterio." }
  },

  datos() {
    const d = Util.leer(this.CLAVE, null) || {};
    return { xp: d.xp || 0, juegos: d.juegos || {}, insignias: d.insignias || [], diario: d.diario || { fecha: "", porJuego: {} }, tablas: d.tablas || {} };
  },
  nivel(xp) { return 1 + Math.floor(xp / 250); },
  tabla(juego) { return this.datos().tablas[juego] || []; },

  /* registrar(juego, { puntos, completo, modo: "solo"|"local", jugadores: [{nombre, puntos}], logros: [ids] })
     → { xp, record, limite, insignias: [insignias nuevas] } */
  registrar(juego, r) {
    const d = this.datos(), hoy = new Date().toISOString().slice(0, 10);
    if (d.diario.fecha !== hoy) d.diario = { fecha: hoy, porJuego: {} };
    const g = d.juegos[juego] || (d.juegos[juego] = { partidas: 0, mejor: 0, completas: 0 });
    const res = { xp: 0, record: false, limite: false, insignias: [] };
    g.partidas++;
    if (r.completo) g.completas++;

    // Tabla de puntuaciones del dispositivo (incluye a cada jugador del modo local)
    const tabla = d.tablas[juego] || (d.tablas[juego] = []);
    (r.jugadores || []).forEach(j => tabla.push({ nombre: j.nombre, puntos: j.puntos, modo: r.modo, fecha: hoy }));
    tabla.sort((a, b) => b.puntos - a.puntos);
    tabla.length = Math.min(tabla.length, 10);

    // La experiencia, el récord y las insignias son del jugador individual
    if (r.modo === "solo") {
      if (r.puntos > g.mejor) { res.record = g.mejor > 0; g.mejor = r.puntos; }
      if (r.completo) {
        const ganado = d.diario.porJuego[juego] || 0;
        const xp = Math.min(this.XP_MAX_PARTIDA, Math.round(Math.max(0, r.puntos) / 20), this.XP_MAX_DIA - ganado);
        res.xp = Math.max(0, xp);
        res.limite = ganado + res.xp >= this.XP_MAX_DIA;
        d.diario.porJuego[juego] = ganado + res.xp;
        d.xp += res.xp;
      }
      const nuevas = (r.logros || []).slice();
      if (r.completo) nuevas.push("primera");
      if (this.JUEGOS.every(j => d.juegos[j] && d.juegos[j].partidas > 0)) nuevas.push("explorador");
      nuevas.forEach(id => {
        if (this.INSIGNIAS[id] && !d.insignias.includes(id)) { d.insignias.push(id); res.insignias.push(this.INSIGNIAS[id]); }
      });
    }
    Util.guardar(this.CLAVE, d);
    return res;
  },

  // Panel "Mi progreso" del menú principal
  pintarResumen(cont) {
    const d = this.datos();
    cont.innerHTML = "";
    const nivel = this.nivel(d.xp), dentro = d.xp % 250;
    cont.append(
      Util.h("div", { class: "pm-cabeza" },
        Util.h("div", {}, Util.h("p", { class: "pm-etiqueta", text: "Mi progreso en este dispositivo" }),
          Util.h("p", { class: "pm-nivel", text: "Nivel " + nivel + " · " + d.xp + " XP" })),
        Util.h("div", { class: "pm-barra", role: "progressbar", "aria-label": "Experiencia para el siguiente nivel", "aria-valuemin": "0", "aria-valuemax": "250", "aria-valuenow": String(dentro) },
          Util.h("div", { style: "width:" + (dentro / 2.5) + "%" }))),
      Util.h("ul", { class: "pm-insignias", "aria-label": "Insignias" },
        Object.entries(this.INSIGNIAS).map(([id, i]) => {
          const tiene = d.insignias.includes(id);
          return Util.h("li", { class: tiene ? "pm-insignia pm-insignia--si" : "pm-insignia", title: i.nombre + ": " + i.desc },
            Util.h("span", { "aria-hidden": "true", text: tiene ? i.icono : "🔒" }),
            Util.h("span", { class: "pm-insignia__nombre", text: i.nombre + (tiene ? "" : " (bloqueada)") }));
        })));
  }
};
