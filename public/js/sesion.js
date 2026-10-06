/* sesion.js — une los motores de juego con la interfaz, igual para los tres modos:
     · "solo" y "local": el motor corre en este navegador (sin conexión).
     · "online": el motor corre en el servidor; el navegador solo recibe su "vista" y envía acciones.
   Cada juego dibuja SIEMPRE a partir de una vista, sin saber en qué modo está. */
const Sesion = (() => {
  const BANCO = () => ({ trivia: Datos.trivia, ordena: Datos.ordena, quiensoy: Datos.quiensoy, sopa: Datos.sopa, misterio: Datos.misterio });

  function base(ctx, id) {
    const oyentes = new Set();
    let ultimaRev = -1;
    const s = {
      id, modo: "solo", vista: null, offset: 0, yo: null, esAnfitrion: true,
      ahora() { return Date.now() + s.offset; },
      suscribir(fn) { oyentes.add(fn); },
      _recibir(v) { // acepta solo vistas más nuevas (los mensajes de red pueden llegar desordenados)
        if (v.rev < ultimaRev) return;
        ultimaRev = v.rev; s.offset = v.ahora - Date.now(); s.vista = v;
        oyentes.forEach(fn => fn(v));
      },
      cerrar() {}
    };
    return s;
  }

  // ---- un jugador / mismo dispositivo ----
  function local(ctx, id, params, jugadores) {
    const Motor = Motores[id], env = Motores.base.envNavegador(BANCO());
    const s = base(ctx, id);
    const multi = jugadores.length > 1;
    s.modo = multi ? "local" : "solo";
    const lista = jugadores.map((j, i) => ({ id: "j" + (i + 1), nombre: j.nombre, avatar: j.avatar }));
    const e = Motor.crear(Object.assign({}, params, { online: false, formato: multi ? "turnos" : "simultaneo" }), lista, env);
    s.estado = e;
    const quien = () => e.activo || lista[0].id;
    s.yo = quien();
    const emitir = () => { s.yo = quien(); s._recibir(Motor.vista(e, s.yo, env)); };
    let rev = -1;
    s.accion = (d) => {
      const r = Motor.accion(e, quien(), d, env);
      if (e.rev !== rev) { rev = e.rev; emitir(); }
      return Promise.resolve(r);
    };
    ctx.cada(() => { Motor.tick(e, env); if (e.rev !== rev) { rev = e.rev; emitir(); } }, 250);
    rev = e.rev; emitir();
    return s;
  }

  // ---- salas en línea ----
  function online(ctx, id, multi, vistaInicial) {
    const s = base(ctx, id);
    s.modo = "online"; s.yo = multi.yo;
    Object.defineProperty(s, "esAnfitrion", { get: () => multi.esAnfitrion() });
    const sock = multi.socket;
    const alVista = (v) => { if (v && v.juego === id) s._recibir(v); };
    sock.on("juego:vista", alVista);
    s.cerrar = () => sock.off("juego:vista", alVista);
    s.accion = (d) => new Promise(res => {
      const t = setTimeout(() => res({ ok: false, error: "El servidor no respondió. Revisa tu conexión." }), 8000);
      sock.emit(id + ":accion", d, (r) => { clearTimeout(t); res(r || { ok: false, error: "Sin respuesta." }); });
    });
    s._recibir(vistaInicial);
    return s;
  }

  // ---- piezas de interfaz comunes ----
  const reloj = {
    // Texto de cuenta regresiva que se actualiza solo; devuelve el nodo
    cuenta(ctx, s, hasta) {
      const n = Util.h("span", { class: "jg-reloj", text: "" });
      const act = () => { const seg = Math.max(0, Math.ceil((hasta() - s.ahora()) / 1000)); n.textContent = Util.tiempo(seg); n.classList.toggle("jg-reloj--alerta", seg <= 5); };
      act(); ctx.cada(() => { if (n.isConnected) act(); }, 250);
      return n;
    },
    sube(ctx, s, desde, pausado) {
      const n = Util.h("span", { class: "jg-reloj", text: "00:00" });
      ctx.cada(() => { if (n.isConnected && !(pausado && pausado())) n.textContent = Util.tiempo((s.ahora() - desde()) / 1000); }, 500);
      return n;
    }
  };

  // Franja con los jugadores: puntos, quién juega y quién está desconectado
  function jugadores(cont, v, extra) {
    const lista = v.jugadores.filter(j => !j.retirado);
    const idx = lista.findIndex(j => j.id === v.activo);
    Marcador.pintar(cont, lista.map(j => Object.assign({}, j, { nombre: j.nombre + (j.conectado === false ? " (sin conexión)" : "") })), idx, extra);
  }

  // Puntos de quien ve la pantalla (en solitario, el único jugador)
  const puntosDe = (v, yo) => { const j = v.jugadores.find(x => x.id === yo); return j ? j.puntos : 0; };

  // ---- cierre de partida común: progreso en este dispositivo, resultados y revancha ----
  function fin(ctx, s, v, op) {
    const f = v.fin, ranking = f.ranking || [];
    const mejor = ranking[0] ? ranking[0].puntos : 0;
    let progreso = null;
    if (s.modo !== "online" && !s._registrado) {
      s._registrado = true;
      progreso = Progreso.registrar(s.id, { puntos: mejor, completo: op.completo !== false, modo: s.modo, jugadores: ranking.map(r => ({ nombre: r.nombre, puntos: r.puntos })), logros: op.logros || [] });
    }
    const ganadores = ranking.filter(r => (f.ganadores || []).includes(r.id));
    let texto = op.texto;
    if (ranking.length > 1) {
      if (f.motivo === "abandono") texto = "Los demás jugadores salieron de la partida.";
      texto = (ganadores.length > 1 ? "Empate entre " + ganadores.map(g => g.nombre).join(" y ") + ". " : ganadores.length ? "Gana " + ganadores[0].nombre + ". " : "") + (texto || "");
    }
    const o = { icono: op.icono, titulo: op.titulo, texto, datos: op.datos, ranking: ranking.length > 1 ? ranking : null, extra: op.extra, progreso };
    if (s.modo === "online") {
      if (s.esAnfitrion) {
        o.textoReintentar = "Revancha";
        o.alReintentar = () => { Red.socket.emit("sala:revancha", null, (r) => { if (r && !r.ok) App.toast(r.error); }); return false; }; // la capa se cierra cuando llega la nueva partida
      } else o.nota = "Esperando a que el anfitrión pida la revancha…";
    } else o.alReintentar = () => ctx.reiniciar();
    Resultados.mostrar(ctx, o);
  }

  // ---- montaje común de un juego ----
  /* def: { id, cabecera: {ceja, titulo, enfasis, subtitulo}, ui(ctx, s) → { pintar(v) } } */
  function montar(def, raiz, opciones) {
    const ctx = Juego.crear(raiz, Object.assign({ id: def.id }, def.cabecera));
    let sesion = null, cierre = [];
    ctx.pantalla = { ayuda: Campos[def.id] };
    ctx.s = () => sesion;

    const arrancar = (s) => {
      sesion = s; ctx.sesion = s;
      ctx.limpiarCuerpo();
      const ui = def.ui(ctx, s);
      let turnoVisto = null, esperando = null;
      const entregar = (v) => ui.pintar(v);
      const alVista = (v) => {
        pausaUI(v);
        const hayCortina = s.modo === "local" && v.fase !== "fin" && v.activo && v.activo !== turnoVisto;
        if (esperando) { esperando = v; return; }
        if (hayCortina) {
          turnoVisto = v.activo; esperando = v;
          const nombre = (v.jugadores.find(j => j.id === v.activo) || {}).nombre || "";
          Cortina.mostrar(ctx, { titulo: "Turno de " + nombre, texto: "Pasa el dispositivo a " + nombre + ". Que nadie más mire la pantalla.", boton: "Soy " + nombre + " · empezar" })
            .then(() => { const ult = esperando; esperando = null; entregar(s.vista && s.vista.rev >= ult.rev ? s.vista : ult); });
          return;
        }
        entregar(v);
      };
      // Pausa (solo en modo individual)
      let capaPausa = null;
      const pausaUI = (v) => {
        if (s.modo !== "solo") return;
        if (v.pausado && !capaPausa) {
          const b = Util.h("button", { class: "boton jg-boton-grande", type: "button", text: "Continuar" });
          capaPausa = Util.h("div", { class: "jg-capa jg-cortina", role: "dialog", "aria-modal": "true", "aria-label": "Juego en pausa" },
            Util.h("div", { class: "jg-cortina__caja" }, Util.h("h2", { text: "Juego en pausa" }), Util.h("p", { text: "El tiempo está detenido." }), b));
          b.addEventListener("click", () => s.accion({ tipo: "reanudar" }));
          ctx.el.append(capaPausa); b.focus();
        } else if (!v.pausado && capaPausa) { capaPausa.remove(); capaPausa = null; }
      };
      ctx.botonPausa = () => s.modo === "solo" && !def.sinPausa
        ? Util.h("button", { class: "boton boton--fantasma jg-pausa", type: "button", text: "⏸ Pausar", onclick: () => s.accion({ tipo: "pausar" }) }) : null;
      s.suscribir(alVista);
      cierre.push(() => s.cerrar());
      if (s.modo === "local") { const v = s.vista; turnoVisto = null; alVista(v); } else alVista(s.vista);
    };

    const mostrarConfig = () => {
      cierre.forEach(f => f()); cierre = []; ctx.limpiar(); ctx.limpiarCuerpo();
      const modo = opciones && opciones.modo === "local" ? "local" : "solo";
      const A = Campos[def.id];
      Config.mostrar(ctx, {
        instrucciones: A.instrucciones, campos: A.campos(modo), modo, minJug: 2, maxJug: 4,
        alIniciar: (valores, jugadores) => {
          try { arrancar(local(ctx, def.id, def.preparar ? def.preparar(valores, jugadores) : valores, jugadores)); }
          catch (e) { console.error(e); App.toast("No se pudo crear la partida. Intenta con otras opciones."); }
        }
      });
    };
    ctx.reiniciar = mostrarConfig;

    if (opciones && opciones.multi) arrancar(online(ctx, def.id, opciones.multi, opciones.inicio.vista));
    else mostrarConfig();
    return { desmontar() { cierre.forEach(f => f()); ctx.limpiar(); } };
  }

  return { local, online, reloj, jugadores, puntosDe, fin, montar };
})();

// Cada juego es un módulo con montar() / desmontar(), igual que Memorama y Rompecabezas
function definirJuego(def) {
  let activo = null;
  return {
    montar(raiz, opciones) { if (activo) activo.desmontar(); activo = Sesion.montar(def, raiz, opciones || {}); },
    desmontar() { if (activo) { activo.desmontar(); activo = null; } }
  };
}
