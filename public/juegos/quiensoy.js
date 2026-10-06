/* juegos/quiensoy.js — ¿Quién soy? Pistas progresivas; el nombre solo aparece cuando la ronda se revela. */
const QuienSoy = definirJuego({
  id: "quiensoy",
  cabecera: { ceja: "Juego · Personajes", titulo: "¿Quién", enfasis: "soy?", subtitulo: "Adivina al personaje de la Independencia con la menor cantidad de pistas." },

  ui(ctx, s) {
    const DIF = { facil: "Fácil", intermedia: "Intermedia", dificil: "Difícil" };
    const ESTADO = { acerto: "✔ acertó", agotado: "✘ sin intentos", rindio: "se rindió", pensando: "pensando…", fuera: "—" };
    let clave = "", ref = {}, terminado = false;
    const cuerpo = ctx.cuerpo;
    const bloqueada = (v) => v.pausado || !v.mio || v.mio.resuelto || v.mio.rendido || v.mio.agotado || (v.params.formato === "turnos" && v.activo !== s.yo);

    const silueta = () => Util.h("div", { class: "qs-silueta", role: "img", "aria-label": "Silueta de un personaje histórico", html:
      '<svg viewBox="0 0 120 140" aria-hidden="true"><circle cx="60" cy="42" r="26"/><path d="M12 140c0-34 22-56 48-56s48 22 48 56z"/></svg><span>?</span>' });

    function construir(v) {
      cuerpo.innerHTML = ""; ref = {};
      const datos = Util.h("div", { class: "jg-datos" });
      ref.pts = Util.h("div", { class: "jg-dato__num", text: "0" });
      datos.append(Util.h("div", { class: "jg-dato" }, Util.h("div", { class: "jg-dato__num", text: (v.idx + 1) + "/" + v.total }), Util.h("div", { class: "jg-dato__label", text: "PERSONAJE" })),
        Util.h("div", { class: "jg-dato" }, ref.pts, Util.h("div", { class: "jg-dato__label", text: "PUNTOS" })));
      ref.valor = Util.h("div", { class: "jg-dato__num", text: "" });
      datos.append(Util.h("div", { class: "jg-dato" }, ref.valor, Util.h("div", { class: "jg-dato__label", text: "VALE AHORA" })));
      cuerpo.append(datos);
      const pausa = ctx.botonPausa(); if (pausa) cuerpo.append(Util.h("div", { class: "jg-acciones" }, pausa));
      ref.jug = Util.h("div"); cuerpo.append(ref.jug);
      ref.turno = Util.h("p", { class: "jg-turno", "aria-live": "polite" }); cuerpo.append(ref.turno);

      const panel = Util.h("section", { class: "jg-panel qs-panel" });
      ref.cabeza = Util.h("div", { class: "qs-cabeza" });
      ref.medallon = silueta(); ref.cabeza.append(ref.medallon);
      ref.titulo = Util.h("div", { class: "qs-titulo" },
        Util.h("span", { class: "jg-etiqueta jg-etiqueta--neutra", text: DIF[v.ronda.dif] }),
        Util.h("h2", { text: "¿Quién soy?" }));
      ref.cabeza.append(ref.titulo);
      panel.append(ref.cabeza);
      ref.pistas = Util.h("ol", { class: "qs-pistas", "aria-live": "polite", "aria-label": "Pistas" }); panel.append(ref.pistas);
      ref.sigPista = Util.h("p", { class: "tr-cuenta" }); panel.append(ref.sigPista);

      ref.zona = Util.h("div", { class: "qs-respuesta" });
      if (v.params.modalidad === "escribir") {
        ref.input = Util.h("input", { class: "qs-input", type: "text", maxlength: "60", autocomplete: "off", autocapitalize: "words", "aria-label": "Nombre del personaje", placeholder: "Escribe el nombre…" });
        ref.enviar = Util.h("button", { class: "boton boton--oscuro", type: "button", text: "Responder" });
        const enviar = () => { const t = ref.input.value.trim(); if (!t) return; ref.input.disabled = true; s.accion({ tipo: "responder", texto: t }).then(r => { ref.input.disabled = false; if (!r.ok) return App.toast(r.error); ref.input.value = ""; ref.input.focus(); }); };
        ref.enviar.addEventListener("click", enviar);
        ref.input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); enviar(); } });
        ref.zona.append(ref.input, ref.enviar);
      } else {
        ref.ops = Util.h("div", { class: "tr-opciones", role: "group", "aria-label": "Elige al personaje" });
        v.ronda.opciones.forEach((t, i) => {
          const b = Util.h("button", { class: "tr-opcion", type: "button", "data-i": i }, Util.h("span", { class: "tr-letra", "aria-hidden": "true", text: "ABCD"[i] }), Util.h("span", { text: t }));
          b.addEventListener("click", () => s.accion({ tipo: "responder", opcion: i }).then(r => { if (!r.ok) App.toast(r.error); }));
          ref.ops.append(b);
        });
        ref.zona.append(ref.ops);
      }
      panel.append(ref.zona);
      ref.estado = Util.h("p", { class: "tr-estado", role: "status" }); panel.append(ref.estado);
      ref.botones = Util.h("div", { class: "qs-botones" });
      ref.otra = Util.h("button", { class: "boton boton--fantasma-oscuro", type: "button", text: "💡 Otra pista" });
      ref.otra.addEventListener("click", () => s.accion({ tipo: "pista" }).then(r => { if (!r.ok) App.toast(r.error); }));
      ref.rendir = Util.h("button", { class: "boton boton--fantasma-oscuro", type: "button", text: "Me rindo" });
      ref.rendir.addEventListener("click", () => { if (confirm("¿Rendirte en este personaje?")) s.accion({ tipo: "rendirse" }).then(r => { if (!r.ok) App.toast(r.error); }); });
      ref.botones.append(ref.otra, ref.rendir); panel.append(ref.botones);
      ref.rev = Util.h("div"); panel.append(ref.rev);
      ref.sig = Util.h("button", { class: "boton boton--oscuro jg-boton-grande", type: "button", hidden: true });
      ref.sig.addEventListener("click", () => s.accion({ tipo: "siguiente" }).then(r => { if (r && !r.ok) App.toast(r.error); }));
      ref.cuenta = Util.h("p", { class: "tr-cuenta" });
      panel.append(ref.sig, ref.cuenta);
      cuerpo.append(panel);
      ref.n = 0;
    }

    function actualizar(v) {
      const rev = v.fase === "revelado", m = v.mio, bloq = bloqueada(v);
      ref.pts.textContent = Sesion.puntosDe(v, s.yo);
      if (v.jugadores.length > 1) {
        const est = Object.fromEntries((v.estados || []).map(e => [e.id, e.estado]));
        Sesion.jugadores(ref.jug, v, (j) => rev ? "" : (ESTADO[est[j.id]] || "—"));
      }
      ref.turno.textContent = v.params.formato === "turnos" && v.fase === "jugando" ? "Turno de " + (v.jugadores.find(j => j.id === v.activo) || {}).nombre : "";
      if (!rev) {
        const pistaN = v.ronda.pista;
        for (; ref.n < v.ronda.pistas.length; ref.n++) {
          const li = Util.h("li", { class: "qs-pista" }, Util.h("span", { class: "qs-pista__n", text: ref.n + 1 }), Util.h("span", { text: v.ronda.pistas[ref.n] }));
          ref.pistas.append(li);
        }
        const mult = v.reglas.puntos[Math.min(4, pistaN - 1)];
        ref.valor.textContent = Math.max(10, Math.round(mult * { facil: 1, intermedia: 1.25, dificil: 1.5 }[v.ronda.dif]) - v.reglas.penalizaFallo * (m ? m.fallos : 0));
        if (v.params.online && v.ronda.sigPista) {
          ref.sp = v.ronda.sigPista;
          if (!ref.spT) ref.spT = ctx.cada(() => { ref.sigPista.textContent = ref.pistaFinal ? "Última pista: el tiempo se acaba pronto." : "Nueva pista en " + Math.max(0, Math.ceil((ref.sp - s.ahora()) / 1000)) + " s"; }, 300);
          ref.pistaFinal = pistaN >= 5;
        }
        const quedan = m ? v.reglas.maxFallos - m.fallos : 0;
        ref.estado.textContent = !m ? "" : m.resuelto ? "¡Correcto! +" + m.puntos + " puntos. Esperando a los demás…" : m.agotado ? "Te quedaste sin intentos. Esperando a los demás…" : m.rendido ? "Te rendiste. Esperando a los demás…"
          : (m.fallos ? "No es esa persona. Te quedan " + quedan + " intentos." : "Tienes " + v.reglas.maxFallos + " intentos (cada fallo resta " + v.reglas.penalizaFallo + ").");
        if (ref.input) { ref.input.disabled = bloq; ref.enviar.disabled = bloq; }
        if (ref.ops) [...ref.ops.children].forEach((b, i) => { b.disabled = bloq || (m && m.descartadas.includes(i)); b.classList.toggle("tr-opcion--mal", !!(m && m.descartadas.includes(i))); });
        ref.otra.hidden = v.params.online; ref.otra.disabled = bloq || pistaN >= 5;
        ref.rendir.disabled = bloq;
        ref.botones.hidden = false;
      } else {
        const r = v.revelado;
        ref.botones.hidden = true; ref.zona.hidden = true; ref.sigPista.textContent = "";
        if (ref.spT) { ctx.parar(ref.spT); ref.spT = null; }
        ref.medallon.replaceWith(ref.medallon = Util.h("div", { class: "qs-medallon", "aria-hidden": "true", text: r.icono }));
        ref.titulo.innerHTML = ""; ref.titulo.append(Util.h("span", { class: "jg-etiqueta jg-etiqueta--hecho", text: r.rol }), Util.h("h2", { text: r.nombre }));
        ref.pistas.innerHTML = ""; r.pistas.forEach((t, i) => ref.pistas.append(Util.h("li", { class: "qs-pista" + (i < v.ronda.pista ? "" : " qs-pista--extra") }, Util.h("span", { class: "qs-pista__n", text: i + 1 }), Util.h("span", { text: t }))));
        const yoR = r.porJugador[s.yo] || r.porJugador[v.activo];
        ref.estado.textContent = yoR ? (yoR.resuelto ? "¡Lo adivinaste con la pista " + yoR.pista + "! +" + yoR.puntos + " puntos" : "Esta vez no lo lograste.") : "";
        ref.rev.innerHTML = "";
        ref.rev.append(Util.h("div", { class: "jg-explicacion" + (yoR && yoR.resuelto ? "" : " jg-explicacion--mal") }, Util.h("strong", { text: "Quién fue" }), Util.h("p", { text: r.exp })));
        if (s.modo !== "solo" && v.jugadores.length > 1) {
          ref.rev.append(Util.h("ul", { class: "tr-resumen" }, v.jugadores.filter(j => !j.retirado && r.porJugador[j.id]).map(j => { const x = r.porJugador[j.id]; return Util.h("li", {}, Util.h("span", { text: j.avatar + " " + j.nombre }), Util.h("b", { text: x.resuelto ? "✔ pista " + x.pista + " · +" + x.puntos : "✘" })); })));
        }
        const soyAnf = s.modo !== "online" || s.esAnfitrion;
        ref.sig.hidden = !soyAnf; ref.sig.textContent = v.idx + 1 >= v.total ? "Ver resultados" : "Siguiente personaje";
        if (v.ronda.sigue) { ref.sigue = v.ronda.sigue; if (!ref.cuentaT) ref.cuentaT = ctx.cada(() => { ref.cuenta.textContent = "Siguiente en " + Math.max(0, Math.ceil((ref.sigue - s.ahora()) / 1000)) + " s"; }, 500); }
      }
    }

    return {
      pintar(v) {
        if (v.fase === "fin") {
          if (terminado) return; terminado = true;
          const yo = v.fin.ranking.find(r => r.id === s.yo) || v.fin.ranking[0];
          return Sesion.fin(ctx, s, v, { icono: "🎭", titulo: "Fin de las adivinanzas",
            texto: yo ? "Adivinaste " + yo.aciertos + " de " + v.fin.total + " personajes." : "",
            datos: [["Puntos", yo ? yo.puntos : 0], ["Aciertos", (yo ? yo.aciertos : 0) + "/" + v.fin.total], ["Tiempo", Util.tiempo(v.fin.segundos)]],
            logros: v.fin.logros && v.fin.logros.primeraPista ? ["quiensoy-primera"] : [] });
        }
        const k = "p" + v.idx + "|" + (v.params.formato === "turnos" ? v.activo : "");
        if (k !== clave) {
          [ref.cuentaT, ref.spT].forEach(t => t && ctx.parar(t));
          clave = k; construir(v);
        }
        actualizar(v);
      }
    };
  }
});
