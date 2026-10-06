/* juegos/sopa.js — Sopa de letras. Selección con ratón/dedo (arrastrar) o teclado (flechas + Enter). */
const SopaLetras = definirJuego({
  id: "sopa",
  cabecera: { ceja: "Juego · Vocabulario", titulo: "Sopa de", enfasis: "letras", subtitulo: "Encuentra el vocabulario de la Independencia de México." },

  ui(ctx, s) {
    const DIRS = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
    let ref = {}, construido = false, terminado = false, cursor = { r: 0, c: 0 }, ancla = null, sel = [], ocupado = false;
    const cuerpo = ctx.cuerpo;

    const celda = (r, c) => ref.celdas[r * ref.tam + c];
    const puedeJugar = (v) => v.fase === "jugando" && !v.pausado && (v.params.formato !== "turnos" || v.activo === s.yo);

    // Línea de selección: se ajusta a la dirección más cercana (horizontal, vertical o diagonal)
    function linea(a, b) {
      const dr = b.r - a.r, dc = b.c - a.c;
      if (!dr && !dc) return [a];
      const k = ((Math.round(Math.atan2(dr, dc) / (Math.PI / 4)) % 8) + 8) % 8, [sr, sc] = DIRS[k];
      let largo = Math.max(Math.abs(dr), Math.abs(dc));
      const dentro = (n) => { const r = a.r + sr * n, c = a.c + sc * n; return r >= 0 && c >= 0 && r < ref.tam && c < ref.tam; };
      while (largo > 0 && !dentro(largo)) largo--;
      return Array.from({ length: largo + 1 }, (_, i) => ({ r: a.r + sr * i, c: a.c + sc * i }));
    }
    function marcarSeleccion(pts) {
      sel.forEach(p => celda(p.r, p.c).classList.remove("sp-sel")); sel = pts;
      sel.forEach(p => celda(p.r, p.c).classList.add("sp-sel"));
    }
    function enviar(pts) {
      if (pts.length < 2 || ocupado) { marcarSeleccion([]); return; }
      const a = pts[0], b = pts[pts.length - 1];
      ocupado = true;
      s.accion({ tipo: "seleccionar", r1: a.r, c1: a.c, r2: b.r, c2: b.c }).then(r => {
        ocupado = false;
        if (!r.ok) { App.toast(r.error); marcarSeleccion([]); return; }
        const clase = r.resultado === "ok" ? "sp-ok" : r.resultado === "repetida" ? "sp-rep" : "sp-no";
        pts.forEach(p => celda(p.r, p.c).classList.add(clase));
        ctx.despues(() => { pts.forEach(p => celda(p.r, p.c).classList.remove("sp-ok", "sp-rep", "sp-no")); }, 600);
        marcarSeleccion([]);
        ref.mensaje.className = "sp-mensaje sp-mensaje--" + r.resultado;
        ref.mensaje.textContent = r.resultado === "ok" ? "¡" + r.palabra + "! +" + r.puntos + " puntos. " + r.def
          : r.resultado === "repetida" ? (r.propia ? "Ya habías encontrado «" + r.palabra + "»: no suma puntos otra vez." : "«" + r.palabra + "» ya la encontró otra persona.")
          : "Esa selección no es una palabra de la lista.";
      });
    }

    function construir(v) {
      cuerpo.innerHTML = ""; ref = { tam: v.tam, celdas: [] }; construido = true;
      const datos = Util.h("div", { class: "jg-datos" });
      ref.pts = Util.h("div", { class: "jg-dato__num", text: "0" }); ref.prog = Util.h("div", { class: "jg-dato__num", text: "" });
      const t = v.params.online ? Sesion.reloj.cuenta(ctx, s, () => ref.fin) : Sesion.reloj.sube(ctx, s, () => ref.inicio, () => ref.pausado);
      datos.append(Util.h("div", { class: "jg-dato" }, ref.prog, Util.h("div", { class: "jg-dato__label", text: "PALABRAS" })),
        Util.h("div", { class: "jg-dato" }, ref.pts, Util.h("div", { class: "jg-dato__label", text: "PUNTOS" })),
        Util.h("div", { class: "jg-dato" }, Util.h("div", { class: "jg-dato__num" }, t), Util.h("div", { class: "jg-dato__label", text: v.params.online ? "TIEMPO RESTANTE" : "TIEMPO" })));
      cuerpo.append(datos);
      const pausa = ctx.botonPausa(); if (pausa) cuerpo.append(Util.h("div", { class: "jg-acciones" }, pausa));
      ref.jug = Util.h("div"); cuerpo.append(ref.jug);
      ref.turno = Util.h("p", { class: "jg-turno", "aria-live": "polite" }); cuerpo.append(ref.turno);

      const panel = Util.h("section", { class: "jg-panel sp-panel" });
      ref.tablero = Util.h("div", { class: "sp-tablero", role: "grid", tabindex: "0", "aria-label": "Tablero de la sopa de letras, " + v.tam + " por " + v.tam + ". Flechas para moverte, Enter para marcar inicio y final de una palabra, Escape para cancelar.",
        style: "grid-template-columns: repeat(" + v.tam + ", 1fr); --n:" + v.tam });
      v.grid.forEach((fila, r) => { for (let c = 0; c < v.tam; c++) {
        const d = Util.h("div", { class: "sp-celda", role: "gridcell", "data-r": r, "data-c": c, text: fila[c], "aria-label": "fila " + (r + 1) + " columna " + (c + 1) + " letra " + fila[c] });
        ref.celdas.push(d); ref.tablero.append(d);
      } });
      panel.append(ref.tablero);
      ref.mensaje = Util.h("p", { class: "sp-mensaje", role: "status", "aria-live": "polite", text: "Arrastra de la primera a la última letra de una palabra." });
      ref.pista = Util.h("button", { class: "boton boton--fantasma-oscuro jg-boton-grande", type: "button", text: "💡 Pista: resaltar la primera letra de una palabra (−" + v.reglas.penalizaPista + ")" });
      ref.pista.addEventListener("click", () => s.accion({ tipo: "pista" }).then(r => { if (!r.ok) App.toast(r.error); }));
      panel.append(ref.mensaje);
      if (v.params.pistas) panel.append(ref.pista);
      ref.lista = Util.h("ul", { class: "sp-lista", "aria-label": "Palabras por encontrar" });
      panel.append(Util.h("h3", { class: "od-sol-titulo", text: "Palabras por encontrar" }), ref.lista);
      cuerpo.append(panel);

      // ratón y dedo
      const celdaDe = (e) => { const el = document.elementFromPoint(e.clientX, e.clientY); return el && el.classList.contains("sp-celda") ? { r: +el.dataset.r, c: +el.dataset.c } : null; };
      let arrastrando = null;
      ref.tablero.addEventListener("pointerdown", (e) => {
        const p = celdaDe(e); if (!p || !puedeJugar(ref.v)) return;
        e.preventDefault(); ref.tablero.setPointerCapture(e.pointerId); arrastrando = p; cursor = p; ancla = null; marcarSeleccion([p]);
      });
      ref.tablero.addEventListener("pointermove", (e) => { if (!arrastrando) return; const p = celdaDe(e); if (p) marcarSeleccion(linea(arrastrando, p)); });
      const suelta = () => { if (!arrastrando) return; arrastrando = null; enviar(sel.slice()); };
      ref.tablero.addEventListener("pointerup", suelta); ref.tablero.addEventListener("pointercancel", () => { arrastrando = null; marcarSeleccion([]); });
      // teclado
      ref.tablero.addEventListener("keydown", (e) => {
        const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
        if (mv) { e.preventDefault(); cursor = { r: Math.min(ref.tam - 1, Math.max(0, cursor.r + mv[0])), c: Math.min(ref.tam - 1, Math.max(0, cursor.c + mv[1])) }; pintarCursor(); if (ancla) marcarSeleccion(linea(ancla, cursor)); }
        else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault(); if (!puedeJugar(ref.v)) return;
          if (!ancla) { ancla = { ...cursor }; marcarSeleccion([ancla]); ref.mensaje.textContent = "Inicio marcado en la letra " + celda(cursor.r, cursor.c).textContent + ". Muévete hasta la última letra y pulsa Enter."; }
          else { const pts = linea(ancla, cursor); ancla = null; enviar(pts); }
        } else if (e.key === "Escape") { ancla = null; marcarSeleccion([]); ref.mensaje.textContent = "Selección cancelada."; }
      });
      ref.tablero.addEventListener("focus", pintarCursor);
      ref.tablero.addEventListener("blur", () => celda(cursor.r, cursor.c).classList.remove("sp-cursor"));
      pintarCursor();
    }
    function pintarCursor() { ref.celdas.forEach(c => c.classList.remove("sp-cursor")); if (document.activeElement === ref.tablero) celda(cursor.r, cursor.c).classList.add("sp-cursor"); ref.tablero.setAttribute("aria-activedescendant", ""); }

    function actualizar(v) {
      ref.v = v; ref.fin = v.limiteFin; ref.inicio = v.inicio; ref.pausado = v.pausado;
      const encontradas = Object.keys(v.hallazgos).length;
      ref.prog.textContent = encontradas + "/" + v.palabras.length;
      ref.pts.textContent = Sesion.puntosDe(v, s.yo);
      if (v.jugadores.length > 1) Sesion.jugadores(ref.jug, v, (j) => (j.palabras || 0) + " palabras");
      ref.turno.textContent = v.params.formato === "turnos" && v.fase === "jugando" ? "Turno de " + (v.jugadores.find(j => j.id === v.activo) || {}).nombre : "";
      // hallazgos coloreados por jugador
      ref.celdas.forEach(c => { c.classList.remove("sp-h0", "sp-h1", "sp-h2", "sp-h3", "sp-pista"); });
      const idx = Object.fromEntries(v.jugadores.map((j, i) => [j.id, i]));
      Object.values(v.hallazgos).forEach(h => h.celdas.forEach(([r, c]) => celda(r, c).classList.add("sp-h" + ((idx[h.por] ?? 0) % 4))));
      (v.mio ? v.mio.pistas : []).forEach(p => celda(p.r, p.c).classList.add("sp-pista"));
      // lista de palabras
      ref.lista.innerHTML = "";
      v.palabras.forEach(w => {
        const h = v.hallazgos[w.id], quien = h && v.jugadores.length > 1 ? " · " + ((v.jugadores.find(j => j.id === h.por) || {}).nombre || "") : "";
        ref.lista.append(Util.h("li", { class: "sp-palabra" + (h ? " sp-palabra--ok" : "") },
          Util.h("span", { text: h ? "✔ " + w.m : "▢ " + "·".repeat(0) + "_ ".repeat(Math.min(w.largo, 3)) + w.largo + " letras" }), h ? Util.h("small", { text: quien + (w.d ? " — " + w.d : "") }) : null));
      });
      const bloq = !puedeJugar(v);
      ref.pista.disabled = bloq || encontradas === v.palabras.length;
      ref.tablero.classList.toggle("sp-tablero--inactivo", bloq);
    }

    return {
      pintar(v) {
        if (v.fase === "fin") {
          actualizar(v); if (terminado) return; terminado = true;
          const yo = v.fin.ranking.find(r => r.id === s.yo) || v.fin.ranking[0];
          return Sesion.fin(ctx, s, v, { icono: "🔤", completo: v.fin.completo, titulo: v.fin.completo ? "¡Sopa completada!" : (v.fin.motivo === "abandono" ? "Partida terminada" : "Se acabó el tiempo"),
            texto: "Encontraron " + v.fin.encontradas + " de " + v.fin.total + " palabras.",
            datos: [["Puntos", yo ? yo.puntos : 0], ["Palabras", v.fin.encontradas + "/" + v.fin.total], ["Tiempo", Util.tiempo(v.fin.segundos)], ...(v.fin.bonus ? [["Bono por tiempo", "+" + v.fin.bonus]] : [])],
            logros: v.fin.logros && v.fin.logros.sinPistas ? ["sopa-sinpistas"] : [] });
        }
        if (!construido) construir(v);
        actualizar(v);
      }
    };
  }
});
