/* juegos/trivia.js — pantalla de la Trivia histórica (un jugador, turnos locales y salas en línea) */
const Trivia = definirJuego({
  id: "trivia",
  cabecera: { ceja: "Juego · Historia", titulo: "Trivia", enfasis: "histórica", subtitulo: "Pon a prueba lo que sabes de la Independencia de México." },
  preparar: (valores) => Object.assign({}, valores, { vistas: Util.leer("triviaVistas", []) }),

  ui(ctx, s) {
    const CAT = Datos.trivia.categorias, DIF = { facil: "Fácil", intermedia: "Intermedia", dificil: "Difícil" };
    let clave = "", ref = {}, terminado = false;
    const cuerpo = ctx.cuerpo;

    function recordarVista(id) {
      if (s.modo === "online" || !id) return;
      const l = Util.leer("triviaVistas", []).filter(x => x !== id); l.push(id);
      Util.guardar("triviaVistas", l.slice(-80));
    }

    function construir(v) {
      cuerpo.innerHTML = "";
      ref = {};
      const datos = Util.h("div", { class: "jg-datos" });
      ref.num = Util.h("div", { class: "jg-dato__num", text: "" });
      ref.pts = Util.h("div", { class: "jg-dato__num", text: "0" });
      datos.append(Util.h("div", { class: "jg-dato" }, ref.num, Util.h("div", { class: "jg-dato__label", text: "PREGUNTA" })),
        Util.h("div", { class: "jg-dato" }, ref.pts, Util.h("div", { class: "jg-dato__label", text: "PUNTOS" })));
      if (v.finQ) {
        const t = Sesion.reloj.cuenta(ctx, s, () => ref.finQ);
        ref.tiempoBox = Util.h("div", { class: "jg-dato" }, Util.h("div", { class: "jg-dato__num" }, t), Util.h("div", { class: "jg-dato__label", text: "TIEMPO" }));
        datos.append(ref.tiempoBox);
      }
      const pausa = ctx.botonPausa();
      cuerpo.append(datos);
      if (pausa) cuerpo.append(Util.h("div", { class: "jg-acciones" }, pausa));
      ref.jug = Util.h("div"); cuerpo.append(ref.jug);
      ref.turno = Util.h("p", { class: "jg-turno", "aria-live": "polite" }); cuerpo.append(ref.turno);

      const p = v.pregunta;
      const panel = Util.h("section", { class: "jg-panel tr-panel", "aria-live": "polite" });
      panel.append(Util.h("p", { class: "tr-meta" },
        Util.h("span", { class: "jg-etiqueta jg-etiqueta--neutra", text: CAT[p.cat] }), " ",
        Util.h("span", { class: "jg-etiqueta jg-etiqueta--neutra", text: DIF[p.dif] })));
      panel.append(Util.h("h2", { class: "tr-pregunta", id: "tr-pregunta", text: p.texto }));
      ref.ops = Util.h("div", { class: "tr-opciones", role: "group", "aria-labelledby": "tr-pregunta" });
      p.opciones.forEach((t, i) => {
        const b = Util.h("button", { class: "tr-opcion", type: "button", "data-i": i, "aria-keyshortcuts": String(i + 1) },
          Util.h("span", { class: "tr-letra", "aria-hidden": "true", text: "ABCD"[i] }), Util.h("span", { text: t }));
        b.addEventListener("click", () => responder(i));
        ref.ops.append(b);
      });
      panel.append(ref.ops);
      ref.estado = Util.h("p", { class: "tr-estado", role: "status" }); panel.append(ref.estado);
      ref.expl = Util.h("div"); panel.append(ref.expl);
      ref.sig = Util.h("button", { class: "boton boton--oscuro jg-boton-grande", type: "button", text: "Siguiente pregunta", hidden: true });
      ref.sig.addEventListener("click", () => s.accion({ tipo: "siguiente" }).then(r => { if (r && !r.ok) App.toast(r.error); }));
      ref.cuenta = Util.h("p", { class: "tr-cuenta" });
      panel.append(ref.sig, ref.cuenta);
      cuerpo.append(panel);
      recordarVista(p.id);
    }

    function responder(i) {
      if (ref.bloqueado) return;
      ref.bloqueado = true;
      s.accion({ tipo: "responder", opcion: i }).then(r => { if (r && !r.ok) { ref.bloqueado = false; App.toast(r.error); } });
    }

    function actualizar(v) {
      ref.finQ = v.finQ;
      ref.num.textContent = (v.idx + 1) + "/" + v.total;
      ref.pts.textContent = Sesion.puntosDe(v, s.yo);
      if (v.jugadores.length > 1) Sesion.jugadores(ref.jug, v, (j) => (s.modo === "online" && v.fase === "pregunta" && v.respondieron.includes(j.id) ? "✔ respondió" : (j.racha >= 2 ? "🔥" + j.racha : "")) || "·");
      const miTurno = v.params.formato !== "turnos" || v.activo === s.yo;
      const activoNombre = (v.jugadores.find(j => j.id === v.activo) || {}).nombre;
      ref.turno.textContent = v.params.formato === "turnos" && v.fase === "pregunta" ? "Turno de " + activoNombre : "";
      const rev = v.fase === "revelado";
      const mia = rev && v.revelado.porJugador[s.yo];
      [...ref.ops.children].forEach((b, i) => {
        b.disabled = rev || v.miOpcion != null || !miTurno || v.pausado;
        b.classList.toggle("tr-opcion--elegida", v.miOpcion === i && !rev);
        b.classList.toggle("tr-opcion--ok", rev && v.correcta === i);
        b.classList.toggle("tr-opcion--mal", rev && mia && mia.op === i && i !== v.correcta);
        b.classList.toggle("tr-opcion--apagada", rev && v.correcta !== i && !(mia && mia.op === i));
      });
      if (v.miOpcion != null && v.fase === "pregunta") ref.estado.textContent = s.modo === "online" ? "Respuesta enviada. Esperando a los demás…" : "";
      else ref.estado.textContent = "";
      if (rev) {
        const lista = v.params.formato === "turnos" ? [v.jugadores.find(j => j.id === v.activo)] : v.jugadores.filter(j => !j.retirado);
        const r = v.revelado.porJugador;
        const yoR = r[s.yo] || (v.params.formato === "turnos" ? r[v.activo] : null);
        ref.estado.textContent = yoR ? (yoR.ok ? "¡Correcto! +" + yoR.ganado + " puntos" + (yoR.racha >= 2 ? " · racha de " + yoR.racha : "") : (yoR.op == null ? "Se acabó el tiempo." : "Respuesta incorrecta.")) : "";
        ref.expl.innerHTML = "";
        const caja = Util.h("div", { class: "jg-explicacion" + (yoR && yoR.ok ? "" : " jg-explicacion--mal") },
          Util.h("strong", { text: "Respuesta: " + v.pregunta.opciones[v.correcta] }), Util.h("p", { text: v.explicacion }));
        ref.expl.append(caja);
        if (s.modo === "online" && lista.length > 1) {
          ref.expl.append(Util.h("ul", { class: "tr-resumen" }, lista.map(j => {
            const x = r[j.id]; return Util.h("li", {}, Util.h("span", { text: j.avatar + " " + j.nombre }), Util.h("b", { text: x ? (x.ok ? "✔ +" + x.ganado : (x.op == null ? "⏱ sin respuesta" : "✘")) : "—" }));
          })));
        }
        const soyAnf = s.modo !== "online" || s.esAnfitrion;
        ref.sig.hidden = !soyAnf;
        ref.sig.textContent = v.idx + 1 >= v.total ? "Ver resultados" : "Siguiente pregunta";
        if (v.sigue) {
          ref.cuenta.textContent = "";
          if (!ref.cuentaT) ref.cuentaT = ctx.cada(() => { const seg = Math.max(0, Math.ceil((ref.sigue - s.ahora()) / 1000)); ref.cuenta.textContent = "Siguiente en " + seg + " s" + (soyAnf ? " (o pulsa el botón)" : ""); }, 250);
          ref.sigue = v.sigue;
        }
      } else { ref.sig.hidden = true; ref.cuenta.textContent = ""; }
    }

    // Atajos 1–4
    ctx.escuchar(document, "keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || !ref.ops || !/^[1-4]$/.test(e.key)) return;
      const b = ref.ops.children[Number(e.key) - 1];
      if (b && !b.disabled) b.click();
    });

    function final(v) {
      if (terminado) return; terminado = true;
      const yo = v.fin.ranking.find(r => r.id === s.yo) || v.fin.ranking[0];
      const l = v.fin.logros || {};
      Sesion.fin(ctx, s, v, {
        icono: "❓", titulo: v.fin.motivo === "abandono" ? "Partida terminada" : "Fin de la trivia",
        texto: yo ? "Respondiste bien " + yo.correctas + " de " + v.total + " preguntas." : "",
        datos: yo ? [["Puntos", yo.puntos], ["Aciertos", yo.correctas + "/" + v.total], ["Mejor racha", yo.mejorRacha], ["Dificultad", { mixta: "Mixta", facil: "Fácil", intermedia: "Intermedia", dificil: "Difícil" }[v.fin.dificultad]]] : [],
        logros: [l.racha5 && "trivia-racha", l.dificil80 && "trivia-dificil"].filter(Boolean)
      });
    }

    return {
      pintar(v) {
        if (v.fase === "fin") { cuerpo.querySelectorAll("button").forEach(b => b.disabled = true); return final(v); }
        const k = v.fase === "pregunta" || v.fase === "revelado" ? "q" + v.idx : "";
        if (k !== clave) { if (ref.cuentaT) { ctx.parar(ref.cuentaT); ref.cuentaT = null; } clave = k; construir(v); }
        actualizar(v);
      }
    };
  }
});
