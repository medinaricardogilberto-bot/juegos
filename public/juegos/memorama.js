/* memorama.js — modo "Un jugador" (código original de tu juego, encerrado en un módulo)
   montar(raiz): dibuja el juego dentro de raiz · desmontar(): lo detiene y limpia */
const Memorama = (() => {
  let limpiar = () => {};
  const HTML = `<header class="encabezado">
  <p class="ceja">16 de septiembre · Grito de Dolores</p>
  <h1>Memorama de la <em>Independencia</em></h1>
  <p class="subtitulo">Voltea las cartas y encuentra las ocho parejas de símbolos patrios.</p>
</header>

<div class="marcador">
  <div class="dato"><div class="dato__num" id="num-intentos">0</div><div class="dato__label">Intentos</div></div>
  <div class="dato"><div class="dato__num" id="num-parejas">0/8</div><div class="dato__label">Parejas</div></div>
  <div class="dato"><div class="dato__num" id="num-tiempo">00:00</div><div class="dato__label">Tiempo</div></div>
</div>

<button class="reiniciar" id="reiniciar" type="button">Barajar de nuevo</button>

<div class="tablero-envoltura">
  <div class="tablero" id="tablero" role="grid" aria-label="Tablero del memorama"></div>
</div>

<div class="victoria" id="victoria" role="dialog" aria-modal="true" aria-labelledby="victoria-titulo" inert>
  <div class="victoria__tarjeta">
    <svg class="victoria__icono" viewBox="0 0 64 64" aria-hidden="true">
      <path fill="#c98a3b" d="M32 4c-9 0-13 8-13 15 0 5 2 8 4 10-1 2-3 3-5 3v4h28v-4c-2 0-4-1-5-3 2-2 4-5 4-10 0-7-4-15-13-15Z"/>
      <path fill="#7a5222" d="M17 36h30l3 8H14l3-8Z"/>
      <rect x="12" y="44" width="40" height="6" rx="1" fill="#e3b23c"/>
      <rect x="8" y="50" width="48" height="6" rx="1" fill="#a52439"/>
    </svg>
    <h2 class="victoria__titulo" id="victoria-titulo">¡Viva México!</h2>
    <p class="victoria__texto">Completaste las 8 parejas en <b id="v-intentos">0</b> intentos y <b id="v-tiempo">00:00</b>.</p>
    <button class="victoria__boton" id="v-reiniciar" type="button">Jugar de nuevo</button>
  </div>
</div>`;

  function montar(raiz, opciones) {
    raiz.innerHTML = '<div id="juego-memorama">' + HTML + '</div>';

    /* ======== INICIA CÓDIGO ORIGINAL ======== */

  /* =====================================================
     ICONOGRAFÍA — ocho símbolos, dibujados en SVG propio
     ===================================================== */
  const ICONOS = [
    { id: "campana", nombre: "La campana",
      svg: `<svg viewBox="0 0 64 64"><path fill="#c98a3b" d="M32 6c-2 0-3 1-3 3v2c-9 2-14 10-14 20 0 6-2 9-5 12h44c-3-3-5-6-5-12 0-10-5-18-14-20V9c0-2-1-3-3-3Z"/>
        <rect x="24" y="43" width="16" height="5" rx="1" fill="#7a5222"/>
        <circle cx="32" cy="53" r="4" fill="#7a5222"/></svg>` },

    { id: "bandera", nombre: "La bandera",
      svg: `<svg viewBox="0 0 64 64"><rect x="16" y="8" width="4" height="48" fill="#7a5222"/>
        <rect x="20" y="10" width="10" height="26" fill="#1c5c40"/>
        <rect x="30" y="10" width="10" height="26" fill="#f4ead9"/>
        <rect x="40" y="10" width="10" height="26" fill="#a52439"/>
        <circle cx="35" cy="23" r="4" fill="#c98a3b"/></svg>` },

    { id: "escudo", nombre: "El escudo",
      svg: `<svg viewBox="0 0 64 64"><path fill="#1c5c40" d="M14 28c6 6 6 16 18 24 12-8 12-18 18-24-4-10-10-16-18-20-8 4-14 10-18 20Z" opacity=".18"/>
        <path fill="#4a7d2c" d="M28 40c-4 4-4 10-2 14h12c2-4 2-10-2-14-2 2-6 2-8 0Z"/>
        <path fill="#c98a3b" d="M20 26c2-6 6-10 12-10s10 4 12 10c-2 4-3 8-2 12-3 1-5 3-6 6-2-1-4-1-6 0-1-3-3-5-6-6 1-4 0-8-4-12Z"/>
        <path fill="#7a5222" d="M31 16c-3 4-4 9-2 13l3-2 3 2c2-4 1-9-2-13Z"/></svg>` },

    { id: "cura", nombre: "El caudillo",
      svg: `<svg viewBox="0 0 64 64"><path fill="#2b2118" d="M16 30c0-10 7-16 16-16s16 6 16 16c-3-2-8-3-16-3s-13 1-16 3Z"/>
        <circle cx="32" cy="30" r="12" fill="#e3b799"/>
        <path fill="#f4ead9" d="M20 44c2-6 6-9 12-9s10 3 12 9l-2 10H22l-2-10Z"/>
        <rect x="30" y="22" width="4" height="4" fill="#2b2118"/></svg>` },

    { id: "canon", nombre: "El cañón",
      svg: `<svg viewBox="0 0 64 64"><rect x="10" y="42" width="44" height="6" rx="2" fill="#7a5222"/>
        <circle cx="16" cy="50" r="6" fill="#2b2118"/><circle cx="34" cy="50" r="6" fill="#2b2118"/>
        <path fill="#4a4a4a" d="M14 40c0-9 7-18 20-18l14 6-4 8-16-4c-5 0-8 4-8 8h-6Z"/>
        <circle cx="47" cy="30" r="4" fill="#2b2118"/></svg>` },

    { id: "antorcha", nombre: "La antorcha",
      svg: `<svg viewBox="0 0 64 64"><path fill="#e3b23c" d="M32 6c4 6 9 11 9 18 0 6-4 10-9 10s-9-4-9-10c0-7 5-12 9-18Z"/>
        <path fill="#a52439" d="M32 12c2 4 5 7 5 12 0 4-2 7-5 7s-5-3-5-7c0-5 3-8 5-12Z"/>
        <rect x="29" y="34" width="6" height="24" rx="2" fill="#7a5222"/>
        <rect x="24" y="56" width="16" height="4" rx="1" fill="#4a3216"/></svg>` },

    { id: "cohetes", nombre: "Los cohetes",
      svg: `<svg viewBox="0 0 64 64"><g stroke-width="2" fill="none">
        <path stroke="#e3b23c" d="M32 30V8"/><path stroke="#a52439" d="M20 34 10 16"/><path stroke="#1c5c40" d="M44 34 54 16"/>
        <path stroke="#e3b23c" d="M32 30 24 16"/><path stroke="#a52439" d="M32 30 40 16"/></g>
        <circle cx="32" cy="8" r="3" fill="#e3b23c"/><circle cx="10" cy="16" r="2.4" fill="#a52439"/>
        <circle cx="54" cy="16" r="2.4" fill="#1c5c40"/><circle cx="24" cy="16" r="2.2" fill="#e3b23c"/><circle cx="40" cy="16" r="2.2" fill="#e3b23c"/>
        <path fill="#7a5222" d="M28 32h8l3 26h-14l3-26Z"/></svg>` },

    { id: "listón", nombre: "1810",
      svg: `<svg viewBox="0 0 64 64"><path fill="#1c5c40" d="M8 20h16v14L16 40 8 34Z"/>
        <path fill="#a52439" d="M56 20H40v14l8 6 8-6Z"/>
        <rect x="16" y="18" width="32" height="20" rx="2" fill="#f4ead9"/>
        <text x="32" y="32" text-anchor="middle" font-family="Georgia, serif" font-size="11" font-weight="700" fill="#7a5222">1810</text></svg>` }
  ];

  /* =====================================================
     DORSO — motivo repetido de papel picado
     ===================================================== */
  const DORSO_SVG = `<svg viewBox="0 0 64 64"><path fill="#e3b23c" d="M32 6 40 24 58 26 44 38 48 56 32 46 16 56 20 38 6 26 24 24Z" opacity=".9"/></svg>`;

  /* =====================================================
     ESTADO Y LÓGICA DEL JUEGO
     ===================================================== */
  const tablero      = document.getElementById("tablero");
  const numIntentos   = document.getElementById("num-intentos");
  const numParejas    = document.getElementById("num-parejas");
  const numTiempo     = document.getElementById("num-tiempo");
  const victoria       = document.getElementById("victoria");

  let volteadas = [];
  let bloqueado = false;
  let intentos = 0;
  let parejas = 0;
  let segundos = 0;
  let cronometro = null;

  function baraja(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function formatoTiempo(s) {
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    const r = String(s % 60).padStart(2, "0");
    return `${m}:${r}`;
  }

  function iniciarCronometro() {
    detenerCronometro();
    segundos = 0;
    numTiempo.textContent = "00:00";
    cronometro = setInterval(() => {
      segundos++;
      numTiempo.textContent = formatoTiempo(segundos);
    }, 1000);
  }
  function detenerCronometro() { if (cronometro) clearInterval(cronometro); cronometro = null; }

  function crearCarta(icono, indice) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "carta__boton";
    boton.setAttribute("role", "gridcell");
    boton.setAttribute("aria-label", "Carta boca abajo");
    boton.dataset.id = icono.id;
    boton.dataset.indice = indice;

    boton.innerHTML = `
      <span class="carta__cara carta__dorso">${DORSO_SVG}</span>
      <span class="carta__cara carta__frente">
        ${icono.svg}
        <span class="carta__nombre">${icono.nombre}</span>
      </span>`;

    boton.addEventListener("click", () => voltear(boton, icono));
    return boton;
  }

  function construirTablero() {
    tablero.innerHTML = "";
    volteadas = []; bloqueado = false; intentos = 0; parejas = 0;
    numIntentos.textContent = "0";
    numParejas.textContent = "0/8";

    const mazo = baraja([...ICONOS, ...ICONOS]);
    mazo.forEach((icono, i) => {
      const carta = document.createElement("div");
      carta.className = "carta";
      carta.appendChild(crearCarta(icono, i));
      tablero.appendChild(carta);
    });

    iniciarCronometro();
  }

  function voltear(boton, icono) {
    if (bloqueado) return;
    const envoltura = boton.closest(".carta");
    if (envoltura.classList.contains("carta--volteada") || envoltura.classList.contains("carta--acertada")) return;

    envoltura.classList.add("carta--volteada");
    boton.setAttribute("aria-label", icono.nombre);
    volteadas.push({ envoltura, boton, icono });

    if (volteadas.length === 2) {
      intentos++;
      numIntentos.textContent = intentos;
      bloqueado = true;

      const [a, b] = volteadas;
      if (a.icono.id === b.icono.id) {
        setTimeout(() => {
          a.envoltura.classList.add("carta--acertada");
          b.envoltura.classList.add("carta--acertada");
          a.boton.disabled = b.boton.disabled = true;
          parejas++;
          numParejas.textContent = `${parejas}/8`;
          volteadas = [];
          bloqueado = false;
          if (parejas === ICONOS.length) terminarJuego();
        }, 420);
      } else {
        setTimeout(() => {
          a.envoltura.classList.add("carta--tambaleo");
          b.envoltura.classList.add("carta--tambaleo");
        }, 550);
        setTimeout(() => {
          a.envoltura.classList.remove("carta--volteada", "carta--tambaleo");
          b.envoltura.classList.remove("carta--volteada", "carta--tambaleo");
          a.boton.setAttribute("aria-label", "Carta boca abajo");
          b.boton.setAttribute("aria-label", "Carta boca abajo");
          volteadas = [];
          bloqueado = false;
        }, 1050);
      }
    }
  }

  function terminarJuego() {
    detenerCronometro();
    document.getElementById("v-intentos").textContent = intentos;
    document.getElementById("v-tiempo").textContent = formatoTiempo(segundos);
    victoria.removeAttribute("inert");
    victoria.classList.add("abierta");
    document.getElementById("v-reiniciar").focus();
  }

  function reiniciarJuego() {
    victoria.classList.remove("abierta");
    victoria.setAttribute("inert", "");
    construirTablero();
  }

  document.getElementById("reiniciar").onclick = reiniciarJuego;
  document.getElementById("v-reiniciar").onclick = reiniciarJuego;
    /* ========= FIN CÓDIGO ORIGINAL ========= */

    limpiar = detenerCronometro;
    if (opciones && opciones.multi) montarMulti(opciones); else construirTablero();

    /* ---------- MULTIJUGADOR (paso 4): el servidor decide, aquí solo se dibuja ---------- */
    function montarMulti(op) {
      const socket = op.multi.socket, yo = op.multi.yo;
      const AVATARES = ["🦅", "🔔", "🌵", "🎺"];
      let jugadores = op.inicio.jugadores, turno = op.inicio.turno, terminado = false;
      const escuchas = [], pendientes = [], cartas = [];
      const on = (ev, fn) => { socket.on(ev, fn); escuchas.push([ev, fn]); };
      const luego = (fn, ms) => pendientes.push(setTimeout(fn, ms));

      document.getElementById("reiniciar").remove();           // en multijugador no se baraja desde el navegador
      const barra = document.createElement("div");
      barra.className = "mm-barra";
      barra.innerHTML = '<div class="mm-turno" id="mm-turno" role="status"></div><div class="mm-jugadores" id="mm-jugadores"></div>';
      raiz.querySelector(".marcador").after(barra);
      numParejas.textContent = "0/" + op.inicio.total / 2;

      // Tablero: mismas cartas y animaciones, pero sin saber qué hay debajo
      tablero.innerHTML = "";
      for (let i = 0; i < op.inicio.total; i++) {
        const carta = document.createElement("div");
        carta.className = "carta";
        const boton = document.createElement("button");
        boton.type = "button"; boton.className = "carta__boton";
        boton.setAttribute("role", "gridcell"); boton.setAttribute("aria-label", "Carta boca abajo");
        boton.innerHTML = '<span class="carta__cara carta__dorso">' + DORSO_SVG + '</span><span class="carta__cara carta__frente"></span>';
        boton.addEventListener("click", () => {
          if (terminado || turno !== yo) return;
          socket.emit("memorama:voltear", { indice: i }, () => {});
        });
        carta.appendChild(boton); tablero.appendChild(carta);
        cartas.push({ carta, boton });
      }

      function mostrar(i, id) {
        const icono = ICONOS.find(x => x.id === id), c = cartas[i];
        c.boton.querySelector(".carta__frente").innerHTML = icono.svg + '<span class="carta__nombre">' + icono.nombre + '</span>';
        c.carta.classList.add("carta--volteada");
        c.boton.setAttribute("aria-label", icono.nombre);
      }
      function ocultar(i) {
        cartas[i].carta.classList.remove("carta--volteada", "carta--tambaleo");
        cartas[i].boton.setAttribute("aria-label", "Carta boca abajo");
      }

      function pintar() {
        const de = jugadores.find(j => j.id === turno), mio = turno === yo;
        const t = document.getElementById("mm-turno");
        t.textContent = mio ? "🟢 Tu turno" : "🔴 Esperando turno… juega " + (de ? de.nombre : "");
        t.classList.toggle("mm-turno--mio", mio);
        tablero.classList.toggle("mm-bloqueado", !mio || terminado);
        const cont = document.getElementById("mm-jugadores");
        cont.innerHTML = "";
        jugadores.forEach((j, i) => {
          const chip = document.createElement("div");
          chip.className = "mm-jugador" + (j.id === turno ? " mm-jugador--turno" : "") + (j.conectado === false ? " mm-jugador--ausente" : "");
          const nom = document.createElement("span");
          nom.textContent = AVATARES[i % 4] + " " + j.nombre + (j.id === yo ? " (tú)" : "") + (j.conectado === false ? " · desconectado" : "");
          const pts = document.createElement("span");
          pts.className = "mm-jugador__pts"; pts.textContent = j.puntos + " pts";
          chip.append(nom, pts); cont.appendChild(chip);
        });
      }

      function fin(d) {
        terminado = true; detenerCronometro(); jugadores = d.ranking; pintar();
        const nombres = d.ranking.filter(r => d.ganadores.includes(r.id)).map(r => r.nombre).join(" y ");
        document.getElementById("victoria-titulo").textContent = d.ganadores.includes(yo) ? "¡Viva México, ganaste!" : "Ganó " + nombres;
        const txt = victoria.querySelector(".victoria__texto");
        txt.textContent = d.motivo === "abandono" ? "Los demás jugadores abandonaron la partida." : "";
        d.ranking.forEach((r, i) => {
          const l = document.createElement("div");
          l.textContent = (i + 1) + ". " + r.nombre + " — " + r.puntos + " pts (" + r.parejas + " parejas)";
          txt.appendChild(l);
        });
        const btn = document.getElementById("v-reiniciar");
        if (op.multi.esAnfitrion()) { btn.textContent = "Jugar otra vez"; btn.disabled = false; btn.onclick = () => socket.emit("sala:volver", null, () => {}); }
        else { btn.textContent = "Esperando al anfitrión…"; btn.disabled = true; }
        victoria.removeAttribute("inert"); victoria.classList.add("abierta");
      }

      on("memorama:volteada", d => mostrar(d.indice, d.icono));
      on("memorama:resultado", d => {
        jugadores = d.jugadores; numIntentos.textContent = d.intentos;
        const [a, b] = d.indices;
        if (d.acierto) {
          luego(() => {
            [a, b].forEach(i => { cartas[i].carta.classList.add("carta--acertada"); cartas[i].boton.disabled = true; });
            numParejas.textContent = d.parejas + "/" + cartas.length / 2; pintar();
          }, 420);
        } else {
          luego(() => [a, b].forEach(i => cartas[i].carta.classList.add("carta--tambaleo")), 550);
          luego(() => [a, b].forEach(ocultar), 1050);
        }
      });
      on("memorama:ocultar", d => d.indices.forEach(ocultar));
      on("memorama:turno", d => { turno = d.turno; pintar(); });
      on("memorama:jugadores", d => { jugadores = d.jugadores; pintar(); });
      on("memorama:fin", fin);

      limpiar = () => { detenerCronometro(); escuchas.forEach(([e, f]) => socket.off(e, f)); pendientes.forEach(clearTimeout); };
      // Reconexión: se redibuja el tablero con el estado real que manda el servidor
      if (op.inicio.cartas) op.inicio.cartas.forEach((c, i) => {
        if (!c) return;
        mostrar(i, c.icono);
        if (c.estado === "acertada") { cartas[i].carta.classList.add("carta--acertada"); cartas[i].boton.disabled = true; }
      });
      numIntentos.textContent = op.inicio.intentos || 0;
      numParejas.textContent = (op.inicio.parejas || 0) + "/" + op.inicio.total / 2;
      pintar();
      iniciarCronometro();
      segundos = op.inicio.segundos || 0; numTiempo.textContent = formatoTiempo(segundos);
      if (op.inicio.fin) fin(op.inicio.fin);
    }
  }

  function desmontar() { limpiar(); limpiar = () => {}; }

  return { montar, desmontar };
})();
