/* sala.js — pantalla de salas: crear, unirse, lista de jugadores */
const Sala = {
  yo: null, datos: null, modo: "local", juego: "memorama",
  avatares: ["🦅", "🔔", "🌵", "🎺"],
  el(id) { return document.getElementById(id); },

  abrir(modo, juego) {
    this.modo = modo; this.juego = juego;
    const j = App.juegos[juego];
    this.el("sala-ceja").textContent = modo === "local" ? "Multijugador local" : "Multijugador online";
    this.el("sala-titulo").textContent = j.icono + " " + j.nombre;
    this.el("sala-error").textContent = "";
    this.vista("entrada");
    const nuevo = !!j.nuevo;
    this.el("sala-opciones-crear").hidden = !nuevo;
    this.el("sala-publicas").hidden = !nuevo;
    if (nuevo) this.listar();
    App.mostrar("pantalla-sala");
  },

  // Salas públicas abiertas del juego elegido
  listar() {
    if (!Red.socket) return;
    const ul = this.el("sala-lista");
    Red.socket.emit("sala:listar", { juego: this.juego }, (r) => {
      ul.innerHTML = "";
      const salas = r && r.ok ? r.salas : [];
      if (!salas.length) { const li = document.createElement("li"); li.className = "lista-salas__vacia"; li.textContent = "No hay salas públicas abiertas. ¡Crea una!"; ul.append(li); return; }
      salas.forEach(x => {
        const li = document.createElement("li");
        const t = document.createElement("span"); t.textContent = "Sala de " + x.anfitrion + " · " + x.jugadores + "/" + x.max;
        const b = document.createElement("button"); b.type = "button"; b.className = "boton boton--oscuro"; b.textContent = "Unirse";
        b.onclick = () => this.entrar("sala:unirse", { codigo: x.codigo, nombre: this.nombre() });
        li.append(t, b); ul.append(li);
      });
    });
  },

  vista(cual) {
    this.el("sala-entrada").hidden = cual !== "entrada";
    this.el("sala-lobby").hidden = cual !== "lobby";
  },

  error(msg) { this.el("sala-error").textContent = msg || ""; },

  nombre() {
    const n = this.el("sala-nombre").value.trim();
    try { localStorage.setItem("nombreJugador", n); } catch (e) {}
    return n;
  },

  entrar(evento, datos) {
    this.error("");
    Red.socket.emit(evento, datos, (res) => {
      if (!res || !res.ok) return this.error(res ? res.error : "Sin respuesta del servidor.");
      this.yo = res.yo;
      this.guardar(res.sala.codigo, res.token);
      this.el("lobby-aviso").textContent = "";
      this.pintar(res.sala);
      this.vista("lobby");
    });
  },

  pintar(s) {
    this.datos = s;
    const j = App.juegos[s.juego];
    this.el("lobby-juego").textContent = j.icono + " " + j.nombre;
    this.el("lobby-codigo").textContent = s.codigo;
    this.el("lobby-visibilidad").textContent = s.visibilidad === "publica" ? "· pública" : "· privada";

    const lista = this.el("lobby-jugadores");
    lista.innerHTML = "";
    s.jugadores.forEach((p, i) => {
      const li = document.createElement("li");
      li.className = "jugador" + (p.conectado ? "" : " jugador--ausente");
      const av = document.createElement("span"); av.className = "jugador__avatar"; av.textContent = this.avatares[i % 4];
      const nom = document.createElement("span"); nom.className = "jugador__nombre";
      nom.textContent = p.nombre + (p.id === this.yo ? " (tú)" : "") + (p.conectado ? "" : " · desconectado");
      li.append(av, nom);
      if (p.id === s.anfitrion) { const c = document.createElement("span"); c.title = "Anfitrión"; c.textContent = "👑"; li.append(c); }
      else if (s.requiereListos) { const c = document.createElement("span"); c.className = "jugador__listo"; c.textContent = p.listo ? "✔ listo" : "⏳ no listo"; li.append(c); }
      lista.appendChild(li);
    });
    this.el("lobby-cupo").textContent = s.jugadores.length + " de " + s.max + " jugadores";

    const btn = this.el("lobby-iniciar");
    const soyAnfitrion = s.anfitrion === this.yo;
    const faltan = s.requiereListos ? s.jugadores.filter(p => p.conectado && p.id !== s.anfitrion && !p.listo).length : 0;
    btn.hidden = !soyAnfitrion;
    btn.disabled = s.jugadores.length < s.minimo || faltan > 0;
    this.el("lobby-espera").textContent = soyAnfitrion
      ? (s.jugadores.length < s.minimo ? "Esperando al menos " + s.minimo + " jugadores…" : faltan ? "Esperando a que " + faltan + (faltan === 1 ? " jugador confirme" : " jugadores confirmen") + " que está listo…" : "Todo listo.")
      : (s.requiereListos ? "Revisa las reglas y pulsa «Estoy listo». El anfitrión iniciará la partida." : "Esperando a que el anfitrión inicie la partida…");
    const listoBtn = this.el("lobby-listo");
    const yoJ = s.jugadores.find(p => p.id === this.yo);
    listoBtn.hidden = !(s.requiereListos && !soyAnfitrion);
    listoBtn.textContent = yoJ && yoJ.listo ? "✔ Listo (pulsa para cancelar)" : "Estoy listo";
    listoBtn.setAttribute("aria-pressed", yoJ && yoJ.listo ? "true" : "false");
    this.pintarReglas(s, soyAnfitrion);

    const host = location.hostname;
    this.el("lobby-pista").textContent = (host === "localhost" || host === "127.0.0.1")
      ? "Los demás deben abrir la dirección de Wi-Fi que muestra la terminal (http://192.168…)."
      : "Los demás deben abrir: " + location.origin;
  },

  // Reglas: el anfitrión las elige; los demás las ven
  pintarReglas(s, soyAnfitrion) {
    const caja = this.el("lobby-reglas");
    const A = typeof Campos !== "undefined" ? Campos[s.juego] : null;
    caja.hidden = !A;
    if (!A) return;
    const campos = A.campos("online");
    const firma = JSON.stringify([s.params, s.visibilidad, soyAnfitrion, s.codigo]);
    if (caja.dataset.firma === firma) return;
    caja.dataset.firma = firma; caja.innerHTML = "";
    const titulo = document.createElement("p"); titulo.className = "panel__etiqueta"; titulo.textContent = "Reglas de la partida"; caja.append(titulo);
    const actual = {};
    campos.forEach(c => {
      const v = s.params && c.id in s.params ? s.params[c.id] : (c.porDefecto ?? c.opciones[0].valor);
      actual[c.id] = v;
      const fila = document.createElement("label"); fila.className = "campo lobby-regla";
      const et = document.createElement("span"); et.textContent = c.etiqueta;
      const sel = document.createElement("select"); sel.disabled = !soyAnfitrion; sel.setAttribute("aria-label", c.etiqueta);
      c.opciones.forEach(o => { const op = document.createElement("option"); op.value = String(o.valor); op.textContent = o.texto; if (String(o.valor) === String(v)) op.selected = true; sel.append(op); });
      sel.onchange = () => {
        const params = {};
        campos.forEach(k => { const el = caja.querySelector('[data-campo="' + k.id + '"]'); const o = k.opciones.find(x => String(x.valor) === el.value); params[k.id] = o ? o.valor : k.opciones[0].valor; });
        Red.socket.emit("sala:params", { params, visibilidad: s.visibilidad }, (r) => { if (r && !r.ok) this.el("lobby-aviso").textContent = r.error; });
      };
      sel.dataset.campo = c.id;
      fila.append(et, sel); caja.append(fila);
    });
    if (soyAnfitrion) {
      const f = document.createElement("label"); f.className = "campo campo--check";
      const ck = document.createElement("input"); ck.type = "checkbox"; ck.checked = s.visibilidad === "publica";
      ck.onchange = () => Red.socket.emit("sala:params", { params: s.params, visibilidad: ck.checked ? "publica" : "privada" }, () => {});
      f.append(ck, document.createTextNode(" Sala pública"));
      caja.append(f);
    }
  },

  salir() {
    if (Red.socket) Red.socket.emit("sala:salir", null, () => {});
    this.borrar();
    this.yo = null; this.datos = null;
    this.vista("entrada");
  },

  // Sesión de la sala: se guarda en ESTA pestaña (sobrevive a recargar la página)
  guardar(codigo, token) { try { sessionStorage.setItem("sesionSala", JSON.stringify({ codigo, token })); } catch (e) {} },
  borrar() { try { sessionStorage.removeItem("sesionSala"); } catch (e) {} },

  // Al conectar (o reconectar) se intenta volver a la sala con código + token
  reintentar() {
    let g = null;
    try { g = JSON.parse(sessionStorage.getItem("sesionSala")); } catch (e) {}
    if (!g || !g.codigo || !g.token) return;
    Red.socket.emit("sala:reconectar", g, (res) => {
      if (res && res.ok) return App.reanudar(res);
      this.borrar();
      if (this.yo || App.multi) App.expulsado(res ? res.error : "Se perdió la partida.");
    });
  },

  // Parte que no depende del servidor: se enlaza al cargar la página
  iniciar() {
    try { this.el("sala-nombre").value = localStorage.getItem("nombreJugador") || ""; } catch (e) {}
    this.el("sala-crear").onclick = () => {
      const nuevo = App.juegos[this.juego].nuevo;
      this.entrar("sala:crear", { juego: this.juego, nombre: this.nombre(), visibilidad: nuevo && this.el("sala-publica").checked ? "publica" : "privada" });
    };
    this.el("sala-unirse").onclick = () => this.entrar("sala:unirse", { codigo: this.el("sala-codigo").value, nombre: this.nombre() });
    this.el("sala-actualizar").onclick = () => this.listar();
    this.el("sala-volver").onclick = () => App.mostrar("pantalla-modo");
    this.el("lobby-salir").onclick = () => this.salir();
    this.el("lobby-copiar").onclick = async () => {
      const c = this.datos ? this.datos.codigo : "";
      try { await navigator.clipboard.writeText(c); App.toast("Código " + c + " copiado."); } catch (e) { App.toast("Código: " + c); }
    };
    this.el("lobby-listo").onclick = () => {
      const yoJ = this.datos && this.datos.jugadores.find(p => p.id === this.yo);
      Red.socket.emit("sala:listo", { listo: !(yoJ && yoJ.listo) }, () => {});
    };
    this.el("lobby-iniciar").onclick = () => {
      Red.socket.emit("sala:iniciar", null, (res) => { this.el("lobby-aviso").textContent = res && res.error ? res.error : ""; });
    };
  },

  // Parte que necesita el servidor: se enlaza cuando Red.iniciar() ya tiene el socket
  enlazar() {
    if (!Red.socket) return;
    Red.socket.on("sala:estado", (s) => { if (this.yo) this.pintar(s); });
    Red.socket.on("sala:aviso", (t) => { if (!this.yo) return; if (App.multi) App.toast(t); else this.el("lobby-aviso").textContent = t; });
    Red.socket.on("connect", () => this.reintentar());
    Red.socket.on("partida:inicio", (d) => { if (this.yo) App.iniciarMulti(d); });
    Red.socket.on("partida:cerrar", () => App.cerrarPartida());
    // Si se cae la conexión NO se sale: Socket.IO reintenta solo y "connect" nos devuelve a la sala.
    Red.socket.on("disconnect", () => { if (this.yo && App.multi) App.toast("Se perdió la conexión. Reconectando…"); });
    if (Red.socket.connected) this.reintentar();
  }
};
