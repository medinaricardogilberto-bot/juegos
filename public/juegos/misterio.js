/* juegos/misterio.js — El misterio histórico. Cada documento muestra si es hecho, tradición o ficción. */
const Misterio = definirJuego({
  id: "misterio",
  cabecera: { ceja: "Juego · Investigación", titulo: "El misterio", enfasis: "histórico", subtitulo: "Investiga documentos, resuelve acertijos y descubre qué pasó." },
  sinPausa: false,

  ui(ctx, s) {
    const ETIQ = { hecho: ["Hecho documentado", "jg-etiqueta--hecho"], tradicion: ["Tradición popular", "jg-etiqueta--neutra"], ficcion: ["Ficción del juego", "jg-etiqueta--ficcion"] };
    const RANGO = { oro: "🥇 Detective de oro", plata: "🥈 Detective de plata", bronce: "🥉 Detective de bronce" };
    let ref = {}, terminado = false, construido = false, abiertoInv = false;
    const cuerpo = ctx.cuerpo;
    const bloqueada = (v) => v.pausado || v.fase !== "jugando" || (v.params.formato === "turnos" && v.activo !== s.yo);
    const nombre = (v, id) => (v.nombres && v.nombres[id]) || "";

    const etiqueta = (tipo) => Util.h("span", { class: "jg-etiqueta " + ETIQ[tipo][1], text: ETIQ[tipo][0] });
    function tarjetaDoc(v, d, bloq) {
      if (!d.examinado) {
        const b = Util.h("button", { class: "mi-doc mi-doc--sellado", type: "button", disabled: bloq }, Util.h("span", { class: "mi-sello", "aria-hidden": "true", text: "✉" }), Util.h("span", {}, Util.h("strong", { text: d.titulo }), Util.h("small", { text: "Pulsa para examinarlo (+" + v.reglas.puntosDoc + " pts)" })));
        b.addEventListener("click", () => s.accion({ tipo: "examinar", doc: d.id }).then(r => { if (!r.ok) App.toast(r.error); }));
        return b;
      }
      return Util.h("article", { class: "mi-doc mi-doc--abierto" },
        Util.h("header", {}, Util.h("strong", { text: d.titulo }), etiqueta(d.tipo)),
        Util.h("blockquote", { text: d.texto }),
        Util.h("p", { class: "mi-nota", text: d.nota + (v.modo === "coop" && v.jugadores.length > 1 && d.por ? " Descubierto por " + nombre(v, d.por) + "." : "") }));
    }

    function pintar(v) {
      // se conservan el texto escrito y el foco entre actualizaciones
      const previo = ref.input ? { valor: ref.input.value, foco: document.activeElement === ref.input } : null;
      cuerpo.innerHTML = ""; ref = {};
      const bloq = bloqueada(v), coop = v.modo === "coop";
      const datos = Util.h("div", { class: "jg-datos" });
      const tiempo = v.params.online ? Sesion.reloj.cuenta(ctx, s, () => v.limiteFin) : null;
      datos.append(
        Util.h("div", { class: "jg-dato" }, Util.h("div", { class: "jg-dato__num", text: Math.min(v.cap + 1, v.caso.capitulos) + "/" + v.caso.capitulos }), Util.h("div", { class: "jg-dato__label", text: "CAPÍTULO" })),
        Util.h("div", { class: "jg-dato" }, Util.h("div", { class: "jg-dato__num", text: v.puntos }), Util.h("div", { class: "jg-dato__label", text: coop ? "PUNTOS DEL EQUIPO" : "PUNTOS" })),
        tiempo ? Util.h("div", { class: "jg-dato" }, Util.h("div", { class: "jg-dato__num" }, tiempo), Util.h("div", { class: "jg-dato__label", text: "TIEMPO RESTANTE" })) : null);
      cuerpo.append(datos);
      const pausa = ctx.botonPausa(); if (pausa) cuerpo.append(Util.h("div", { class: "jg-acciones" }, pausa));
      if (v.jugadores.length > 1) {
        const j = Util.h("div"); cuerpo.append(j);
        Sesion.jugadores(j, v, (x) => { if (!coop) { const p = v.progreso.find(q => q.id === x.id); return p ? (p.terminado ? "✔ terminó" : "cap. " + (p.cap + 1)) : ""; } const a = v.aportes && v.aportes[x.id]; return a ? a.docs + " docs" : ""; });
      }
      if (v.params.formato === "turnos" && v.fase === "jugando") cuerpo.append(Util.h("p", { class: "jg-turno", "aria-live": "polite", text: "Turno de " + nombre(v, v.activo) }));

      const panel = Util.h("section", { class: "jg-panel mi-panel" });
      panel.append(Util.h("h2", { class: "mi-caso", text: v.caso.titulo }));
      panel.append(Util.h("details", { class: "mi-aviso", open: v.cap === 0 && v.sub === "investigar" && Object.keys(v.capitulo ? {} : {}).length === 0 },
        Util.h("summary", { text: "¿Qué es real y qué es ficción?" }),
        Util.h("p", { text: v.caso.aviso }),
        Util.h("p", { class: "mi-leyenda" }, etiqueta("hecho"), " ", etiqueta("tradicion"), " ", etiqueta("ficcion"))));
      if (v.cap === 0 && v.sub === "investigar" && !v.inventario.length) panel.append(Util.h("p", { class: "mi-intro", text: v.caso.intro }));

      if (v.sub === "terminado") {
        panel.append(Util.h("div", { class: "jg-explicacion" }, Util.h("strong", { text: v.final ? v.final.titulo : "Caso terminado" }), Util.h("p", { text: v.final ? v.final.texto : "" }),
          Util.h("p", { class: "mi-nota", text: "Esperando a que " + (coop ? "termine el equipo" : "los demás jugadores terminen") + "…" })));
      } else if (v.capitulo) {
        const c = v.capitulo;
        panel.append(Util.h("h3", { class: "od-sol-titulo", text: "Capítulo " + (v.cap + 1) + ": " + c.titulo }), Util.h("p", { class: "mi-escena", text: c.escena }));
        const docs = Util.h("div", { class: "mi-docs" }); c.docs.forEach(d => docs.append(tarjetaDoc(v, d, bloq || v.sub !== "investigar"))); panel.append(docs);

        if (v.sub === "investigar") {
          const p = c.pregunta, faltan = p.requiere.filter(r => !r.examinado);
          const q = Util.h("div", { class: "mi-pregunta" }, Util.h("h3", { id: "mi-q", text: p.texto }));
          if (faltan.length) q.append(Util.h("p", { class: "mi-nota", text: "Antes de responder, examina: " + faltan.map(r => r.titulo).join(", ") + "." }));
          if (p.pista) q.append(Util.h("p", { class: "jg-explicacion", text: "💡 " + p.pista }));
          if (p.tipo === "opciones") {
            const ops = Util.h("div", { class: "tr-opciones", role: "group", "aria-labelledby": "mi-q" });
            p.opciones.forEach((t, i) => {
              const b = Util.h("button", { class: "tr-opcion" + (v.descartadas.includes(i) ? " tr-opcion--mal" : ""), type: "button", disabled: bloq || faltan.length > 0 || v.descartadas.includes(i) }, Util.h("span", { class: "tr-letra", "aria-hidden": "true", text: "ABCD"[i] }), Util.h("span", { text: t }));
              b.addEventListener("click", () => s.accion({ tipo: "responder", opcion: i }).then(r => { if (!r.ok) App.toast(r.error); }));
              ops.append(b);
            });
            q.append(ops);
          } else {
            ref.input = Util.h("input", { class: "qs-input", type: "text", maxlength: "40", autocomplete: "off", "aria-labelledby": "mi-q", disabled: bloq || faltan.length > 0, placeholder: "Tu respuesta…" });
            const ok = Util.h("button", { class: "boton boton--oscuro", type: "button", text: "Responder", disabled: bloq || faltan.length > 0 });
            const enviar = () => { const t = ref.input.value.trim(); if (t) s.accion({ tipo: "responder", texto: t }).then(r => { if (!r.ok) App.toast(r.error); else if (!r.correcta) ref.input.value = ""; }); };
            ok.addEventListener("click", enviar); ref.input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); enviar(); } });
            q.append(Util.h("div", { class: "qs-respuesta" }, ref.input, ok));
          }
          q.append(Util.h("p", { class: "tr-estado", role: "status", text: v.fallos ? "Respuesta incorrecta. Intentos restantes: " + (v.reglas.maxFallos - v.fallos) + "." : "Tienes " + v.reglas.maxFallos + " intentos (cada fallo resta " + v.reglas.penalizaFallo + " puntos)." }));
          if (!p.pista) { const pb = Util.h("button", { class: "boton boton--fantasma-oscuro", type: "button", text: "💡 Pedir una pista (−" + v.reglas.penalizaPista + ")", disabled: bloq }); pb.addEventListener("click", () => s.accion({ tipo: "pista" }).then(r => { if (!r.ok) App.toast(r.error); })); q.append(pb); }
          panel.append(q);
        }
        if (v.sub === "explicacion" && v.explicacion) {
          const e = v.explicacion;
          panel.append(Util.h("div", { class: "jg-explicacion" + (e.acerto ? "" : " jg-explicacion--mal") }, Util.h("strong", { text: e.acerto ? "¡Correcto! +" + e.puntos + " puntos" : "No lo lograste. La respuesta era: " + e.correcta }), Util.h("p", { text: e.texto })));
          const b = Util.h("button", { class: "boton boton--oscuro jg-boton-grande", type: "button", text: v.cap + 1 >= v.caso.capitulos && !c.decision ? "Cerrar el caso" : "Continuar", disabled: bloq });
          b.addEventListener("click", () => s.accion({ tipo: "continuar" }).then(r => { if (!r.ok) App.toast(r.error); })); panel.append(b);
        }
        if (v.sub === "decision" && c.decision) {
          const bloqD = bloq, votando = !!v.votos;
          panel.append(Util.h("div", { class: "jg-explicacion" }, Util.h("strong", { text: "Decisión final" }), Util.h("p", { text: c.decision.texto })));
          c.decision.opciones.forEach((o, i) => {
            const b = Util.h("button", { class: "tr-opcion", type: "button", disabled: bloqD }, Util.h("span", { class: "tr-letra", "aria-hidden": "true", text: "ABC"[i] }), Util.h("span", { text: o.texto }));
            b.addEventListener("click", () => s.accion({ tipo: "decidir", opcion: i }).then(r => { if (!r.ok) App.toast(r.error); else if (r.voto) App.toast("Voto enviado."); }));
            panel.append(b);
          });
          if (votando) {
            ref.voto = Util.h("p", { class: "tr-cuenta", role: "status" }); panel.append(ref.voto);
            const act = () => { ref.voto.textContent = v.votos.length + " de " + v.jugadores.filter(j => !j.retirado && j.conectado).length + " han votado · se decide en " + Math.max(0, Math.ceil((v.votoFin - s.ahora()) / 1000)) + " s (empate: decide el anfitrión)"; };
            act(); ctx.cada(() => { if (ref.voto && ref.voto.isConnected) act(); }, 500);
          }
        }
      }

      // Registro de descubrimientos
      const inv = Util.h("details", { class: "mi-inventario", open: abiertoInv },
        Util.h("summary", { text: "🎒 Inventario de pistas (" + v.inventario.length + ")" }),
        v.inventario.length ? Util.h("ul", {}, v.inventario.map(d => Util.h("li", {}, Util.h("strong", { text: d.titulo }), " ", etiqueta(d.tipo), Util.h("small", { text: d.texto })))) : Util.h("p", { class: "mi-nota", text: "Aún no has examinado documentos." }));
      inv.addEventListener("toggle", () => { abiertoInv = inv.open; });
      panel.append(inv);
      cuerpo.append(panel);
      if (previo && ref.input) { ref.input.value = previo.valor; if (previo.foco) ref.input.focus(); }
    }

    return {
      pintar(v) {
        if (v.fase === "fin") {
          pintar(v);
          if (terminado) return; terminado = true;
          const f = v.fin, yo = f.ranking.find(r => r.id === s.yo) || f.ranking[0], total = f.coop ? f.equipoPuntos : (yo ? yo.puntos : 0);
          const extra = Util.h("div", { class: "mi-finales" },
            ...f.finales.map(x => Util.h("div", { class: "jg-explicacion" }, Util.h("strong", { text: x.titulo }), Util.h("p", { text: x.texto }))),
            Util.h("p", { class: "mi-nota", text: "Recuerda: lo marcado como «Ficción» fue inventado para el juego; los hechos documentados sí ocurrieron." }));
          return Sesion.fin(ctx, s, v, { icono: "🕯️", completo: f.motivo === "completo", titulo: f.motivo === "tiempo" ? "Se acabó el tiempo" : f.motivo === "abandono" ? "Partida terminada" : "Caso resuelto",
            texto: RANGO[f.rango] + ".", extra,
            datos: [[f.coop ? "Puntos del equipo" : "Puntos", total + "/" + f.max], ["Tiempo", Util.tiempo(f.segundos)]],
            logros: f.logros && f.logros.casoCompleto ? ["misterio-caso"] : [] });
        }
        construido = true; pintar(v);
      }
    };
  }
});
