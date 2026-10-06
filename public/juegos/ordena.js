/* juegos/ordena.js — Ordena la historia. Reordenar con arrastre (ratón o dedo), botones ▲▼ o teclado (↑ ↓). */
const OrdenaHistoria = definirJuego({
  id: "ordena",
  cabecera: { ceja: "Juego · Cronología", titulo: "Ordena la", enfasis: "historia", subtitulo: "Pon los acontecimientos en el orden en que ocurrieron." },

  ui(ctx, s) {
    let clave = "", ref = {}, orden = [], marcas = {}, terminado = false;
    const cuerpo = ctx.cuerpo;
    const bloqueada = (v) => v.pausado || !v.mio || v.mio.terminado || v.fase !== "jugando" || (v.params.formato === "turnos" && v.activo !== s.yo);

    function mover(id, delta, v) {
      const i = orden.indexOf(id), j = i + delta;
      if (i < 0 || j < 0 || j >= orden.length) return;
      orden.splice(i, 1); orden.splice(j, 0, id);
      marcas = {}; pintarLista(v);
      const el = ref.lista.querySelector('[data-id="' + id + '"]'); if (el) el.querySelector(".od-carta__cuerpo").focus();
      ref.anuncio.textContent = "Movida a la posición " + (j + 1) + " de " + orden.length;
    }

    function pintarLista(v) {
      const mapa = Object.fromEntries(v.ronda.cartas.map(c => [c.id, c]));
      const bloq = bloqueada(v);
      ref.lista.innerHTML = "";
      orden.forEach((id, i) => {
        const c = mapa[id];
        const fecha = c.fecha ? Util.h("span", { class: "od-fecha", text: "📅 " + c.fecha }) : null;
        const sube = Util.h("button", { class: "od-mov", type: "button", "aria-label": "Subir «" + c.titulo + "»", text: "▲", disabled: bloq || i === 0 });
        const baja = Util.h("button", { class: "od-mov", type: "button", "aria-label": "Bajar «" + c.titulo + "»", text: "▼", disabled: bloq || i === orden.length - 1 });
        sube.addEventListener("click", () => mover(id, -1, v)); baja.addEventListener("click", () => mover(id, 1, v));
        const cuerpoC = Util.h("div", { class: "od-carta__cuerpo", tabindex: bloq ? "-1" : "0", role: "group", "aria-label": "Posición " + (i + 1) + " de " + orden.length + ": " + c.titulo + ". Usa las flechas arriba y abajo para moverla." },
          Util.h("strong", { text: c.titulo }), Util.h("span", { class: "od-desc", text: c.desc }), fecha);
        cuerpoC.addEventListener("keydown", (e) => {
          if (bloq) return;
          if (e.key === "ArrowUp") { e.preventDefault(); mover(id, -1, v); }
          if (e.key === "ArrowDown") { e.preventDefault(); mover(id, 1, v); }
        });
        const asa = Util.h("span", { class: "od-asa", "aria-hidden": "true", text: "⠿" });
        const li = Util.h("li", { class: "od-carta" + (marcas[id] === true ? " od-carta--ok" : marcas[id] === false ? " od-carta--mal" : ""), "data-id": id },
          Util.h("span", { class: "od-pos", "aria-hidden": "true", text: i + 1 }), asa, cuerpoC, Util.h("span", { class: "od-movs" }, sube, baja));
        if (!bloq) arrastrar(li, asa, id, v);
        ref.lista.append(li);
      });
    }

    // Arrastre con punteros (ratón, lápiz y dedo)
    function arrastrar(li, asa, id, v) {
      asa.style.touchAction = "none";
      li.addEventListener("pointerdown", (e) => {
        if (e.target.closest("button") || (e.pointerType !== "mouse" && !e.target.closest(".od-asa"))) return; // en pantallas táctiles se arrastra desde el asa
        e.preventDefault();
        const lista = ref.lista, y0 = e.clientY;
        li.setPointerCapture(e.pointerId);
        li.classList.add("od-carta--arrastre");
        let top0 = li.getBoundingClientRect().top;
        const mueve = (ev) => {
          const otros = [...lista.children].filter(x => x !== li);
          const y = ev.clientY;
          for (const o of otros) {
            const r = o.getBoundingClientRect(), mitad = r.top + r.height / 2;
            const antes = o.compareDocumentPosition(li) & Node.DOCUMENT_POSITION_FOLLOWING; // o va después de li
            if (antes && y > mitad) lista.insertBefore(li, o.nextSibling);
            else if (!antes && y < mitad) lista.insertBefore(li, o);
          }
          li.style.transform = "";
          const base = li.getBoundingClientRect().top;
          li.style.transform = "translateY(" + (y - y0 - (base - top0)) + "px)";
        };
        const suelta = () => {
          li.removeEventListener("pointermove", mueve); li.removeEventListener("pointerup", suelta); li.removeEventListener("pointercancel", suelta);
          orden = [...lista.children].map(x => x.dataset.id);
          marcas = {}; pintarLista(v);
          ref.anuncio.textContent = "Orden actualizado";
        };
        li.addEventListener("pointermove", mueve); li.addEventListener("pointerup", suelta); li.addEventListener("pointercancel", suelta);
      });
    }

    function construir(v) {
      cuerpo.innerHTML = ""; ref = {};
      const r = v.ronda;
      orden = r.cartas.map(c => c.id); marcas = {};
      const datos = Util.h("div", { class: "jg-datos" });
      ref.pts = Util.h("div", { class: "jg-dato__num", text: "0" });
      const t = v.params.online ? Sesion.reloj.cuenta(ctx, s, () => ref.fin) : Sesion.reloj.sube(ctx, s, () => ref.inicio, () => ref.pausado || (ref.v && ref.v.mio && ref.v.mio.terminado));
      datos.append(
        Util.h("div", { class: "jg-dato" }, Util.h("div", { class: "jg-dato__num", text: (r.n + 1) + "/" + r.total }), Util.h("div", { class: "jg-dato__label", text: v.desempate ? "DESEMPATE" : "RONDA" })),
        Util.h("div", { class: "jg-dato" }, ref.pts, Util.h("div", { class: "jg-dato__label", text: "PUNTOS" })),
        Util.h("div", { class: "jg-dato" }, Util.h("div", { class: "jg-dato__num" }, t), Util.h("div", { class: "jg-dato__label", text: v.params.online ? "TIEMPO RESTANTE" : "TIEMPO" })));
      cuerpo.append(datos);
      const pausa = ctx.botonPausa(); if (pausa) cuerpo.append(Util.h("div", { class: "jg-acciones" }, pausa));
      ref.jug = Util.h("div"); cuerpo.append(ref.jug);
      ref.turno = Util.h("p", { class: "jg-turno", "aria-live": "polite" }); cuerpo.append(ref.turno);

      const panel = Util.h("section", { class: "jg-panel od-panel" });
      panel.append(Util.h("p", { class: "tr-meta" }, Util.h("span", { class: "jg-etiqueta jg-etiqueta--neutra", text: "Nivel " + r.nivel }), " ", Util.h("span", { class: "jg-etiqueta jg-etiqueta--neutra", text: r.titulo })));
      panel.append(Util.h("p", { class: "od-eje" }, Util.h("span", { text: "▲ Más antiguo" }), Util.h("span", { text: "Más reciente ▼" })));
      ref.lista = Util.h("ol", { class: "od-lista", "aria-label": "Acontecimientos por ordenar" });
      panel.append(ref.lista);
      ref.anuncio = Util.h("p", { class: "od-anuncio", role: "status", "aria-live": "polite" });
      ref.estado = Util.h("p", { class: "tr-estado", role: "status" });
      ref.comprobar = Util.h("button", { class: "boton boton--oscuro jg-boton-grande", type: "button", text: "Comprobar orden" });
      ref.pista = Util.h("button", { class: "boton boton--fantasma-oscuro jg-boton-grande", type: "button", text: "" });
      ref.comprobar.addEventListener("click", () => {
        ref.comprobar.disabled = true;
        s.accion({ tipo: "comprobar", orden }).then(res => {
          if (!res.ok) { App.toast(res.error); return; }
          marcas = {}; orden.forEach((id, i) => { marcas[id] = res.aciertos[i]; });
          pintarLista(ref.v);
          const n = res.aciertos.filter(Boolean).length;
          ref.anuncio.textContent = res.resuelto ? "¡Orden correcto!" : n + " de " + orden.length + " en su lugar.";
        });
      });
      ref.pista.addEventListener("click", () => s.accion({ tipo: "pista" }).then(res => { if (!res.ok) App.toast(res.error); }));
      panel.append(ref.anuncio, ref.estado, ref.comprobar, ref.pista);
      ref.sol = Util.h("div"); panel.append(ref.sol);
      ref.sig = Util.h("button", { class: "boton boton--oscuro jg-boton-grande", type: "button", hidden: true });
      ref.sig.addEventListener("click", () => s.accion({ tipo: "siguiente" }).then(res => { if (res && !res.ok) App.toast(res.error); }));
      ref.cuenta = Util.h("p", { class: "tr-cuenta" });
      panel.append(ref.sig, ref.cuenta);
      cuerpo.append(panel);
      pintarLista(v);
    }

    function actualizar(v) {
      ref.v = v; ref.fin = v.ronda.fin; ref.inicio = v.ronda.inicio; ref.pausado = v.pausado;
      ref.pts.textContent = Sesion.puntosDe(v, s.yo);
      if (v.jugadores.length > 1) Sesion.jugadores(ref.jug, v, (j) => { const p = v.progreso.find(x => x.id === j.id); return p ? (p.terminado ? "✔ terminó" : p.intentos + " intento" + (p.intentos === 1 ? "" : "s")) : "—"; });
      ref.turno.textContent = v.params.formato === "turnos" && v.fase === "jugando" ? "Turno de " + (v.jugadores.find(j => j.id === v.activo) || {}).nombre : "";
      const m = v.mio, rv = v.fase === "revelado";
      // La lista cambia si el servidor reveló fechas (pistas) para mí
      const mapa = Object.fromEntries(v.ronda.cartas.map(c => [c.id, c]));
      const firma = v.ronda.cartas.map(c => c.fecha || "").join("|") + "|" + bloqueada(v);
      if (firma !== ref.firma) { ref.firma = firma; if (orden.every(id => mapa[id])) pintarLista(v); }
      const bloq = bloqueada(v);
      ref.comprobar.disabled = bloq;
      const dispPistas = v.params.pistas && m && !m.terminado && !rv && v.ronda.cartas.filter(c => !c.fecha).length > 1;
      ref.pista.hidden = !v.params.pistas || rv; ref.pista.disabled = bloq || !dispPistas;
      ref.pista.textContent = "💡 Pista: mostrar una fecha (−" + v.reglas.penalizaPista + " puntos)";
      ref.comprobar.hidden = rv;
      if (m && !rv) {
        const quedan = v.reglas.maxIntentos - m.intentos;
        ref.estado.textContent = m.terminado ? "Terminaste esta ronda. Esperando a los demás…" : "Intentos disponibles: " + quedan + " de " + v.reglas.maxIntentos + " (cada intento fallido resta " + v.reglas.penalizaIntento + ")";
      }
      if (rv) {
        ref.estado.textContent = "";
        ref.lista.querySelectorAll("button").forEach(b => b.disabled = true);
        ref.sol.innerHTML = "";
        const r = v.revelado;
        ref.sol.append(Util.h("h3", { class: "od-sol-titulo", text: "Orden correcto" }),
          Util.h("ol", { class: "od-sol" }, r.solucion.map(x => Util.h("li", {}, Util.h("b", { text: x.fecha }), " — ", x.titulo, Util.h("span", { class: "od-desc", text: x.desc })))),
          Util.h("div", { class: "jg-explicacion" }, Util.h("strong", { text: "Para recordar" }), Util.h("p", { text: r.explicacion })));
        const filas = v.ronda.participantes.map(id => { const j = v.jugadores.find(x => x.id === id), x = r.porJugador[id]; return x ? Util.h("li", {}, Util.h("span", { text: j.avatar + " " + j.nombre }), Util.h("b", { text: x.correctas + " aciertos · +" + x.puntos })) : null; });
        if (filas.length > 1 || s.modo !== "solo") ref.sol.append(Util.h("ul", { class: "tr-resumen" }, filas));
        const soyAnf = s.modo !== "online" || s.esAnfitrion;
        ref.sig.hidden = !soyAnf;
        ref.sig.textContent = v.ronda.n + 1 >= v.ronda.total && !v.desempate ? "Ver resultados" : "Siguiente ronda";
        if (v.ronda.sigue) { ref.sigue = v.ronda.sigue; if (!ref.cuentaT) ref.cuentaT = ctx.cada(() => { ref.cuenta.textContent = "Siguiente ronda en " + Math.max(0, Math.ceil((ref.sigue - s.ahora()) / 1000)) + " s"; }, 500); }
      }
    }

    return {
      pintar(v) {
        if (v.fase === "fin") {
          if (terminado) return; terminado = true;
          const yo = v.fin.ranking.find(r => r.id === s.yo) || v.fin.ranking[0];
          return Sesion.fin(ctx, s, v, { icono: "⏳", titulo: "Fin de la cronología",
            texto: v.fin.desempate ? "Se resolvió con una ronda de desempate." : "Completaste " + v.fin.rondas + (v.fin.rondas === 1 ? " ronda." : " rondas."),
            datos: [["Puntos", yo ? yo.puntos : 0], ["Rondas", v.fin.rondas], ["Tiempo total", Util.tiempo(v.fin.segundos)]],
            logros: v.fin.logros && v.fin.logros.perfecto ? ["ordena-perfecto"] : [] });
        }
        const k = "r" + v.ronda.n + "|" + (v.params.formato === "turnos" ? v.activo : "") + "|" + (v.desempate ? "d" : "") + "|" + (v.fase === "revelado" ? "r" : "j");
        if (k !== clave) { if (ref.cuentaT) { ctx.parar(ref.cuentaT); ref.cuentaT = null; } const eraRev = clave.endsWith("|r"); const mismaRonda = clave.split("|")[0] === k.split("|")[0]; clave = k; if (!(mismaRonda && !eraRev && v.fase === "revelado")) construir(v); }
        actualizar(v);
      }
    };
  }
});
