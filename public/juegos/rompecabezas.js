/* rompecabezas.js — modo "Un jugador" (código original de tu juego, encerrado en un módulo)
   montar(raiz): dibuja el juego dentro de raiz · desmontar(): lo detiene y limpia */
const Rompecabezas = (() => {
  let limpiar = () => {};
  const HTML = `<header class="encabezado">
  <p class="ceja">16 de septiembre · 1810</p>
  <h1>Rompecabezas de la <em>Independencia</em></h1>
  <p class="subtitulo">Arrastra las piezas y encájalas en su lugar para armar la escena.</p>
</header>

<div class="marcador">
  <div class="dato"><div class="dato__num" id="num-piezas">0/12</div><div class="dato__label">Piezas</div></div>
  <div class="dato"><div class="dato__num" id="num-tiempo">00:00</div><div class="dato__label">Tiempo</div></div>
</div>

<div class="controles">
  <button class="boton" id="reiniciar" type="button">Barajar de nuevo</button>
  <button class="boton boton--fantasma" id="alternar-guia" type="button">Ocultar guía</button>
</div>

<div class="campo-envoltura">
  <div class="campo" id="campo">
    <div class="guia" id="guia">
      <div class="guia__imagen" id="guia-imagen"></div>
      <div class="guia__rejilla" aria-hidden="true"></div>
    </div>
    <p class="bandeja-etiqueta">Piezas para armar</p>
    <!-- las piezas se insertan aquí por JS, posicionadas de forma absoluta -->
  </div>
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
    <p class="victoria__texto">Armaste el rompecabezas en <b id="v-tiempo">00:00</b>.</p>
    <button class="victoria__boton" id="v-reiniciar" type="button">Jugar de nuevo</button>
  </div>
</div>`;

  function montar(raiz, opciones) {
    raiz.innerHTML = '<div id="juego-rompecabezas">' + HTML + '</div>';

    /* ======== INICIA CÓDIGO ORIGINAL ======== */

  /* =====================================================
     ESCENA — arte original que se corta en piezas
     ===================================================== */
  function escenaSVG(W, H) {
    let estrellas = "";
    for (let i = 0; i < 46; i++) {
      const x = (Math.sin(i * 12.9) * 43758.5453 % 1 + 1) % 1 * W;
      const y = (Math.sin(i * 78.2) * 12543.9 % 1 + 1) % 1 * (H * .42);
      const r = .6 + ((i * 37) % 10) / 10 * 1.1;
      estrellas += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#f4ead9" opacity="${(.35 + (i % 5) * .12).toFixed(2)}"/>`;
    }

    function cohete(cx, cy, escala, color) {
      let rayos = "";
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI * 2 * i) / 10;
        const x1 = cx + Math.cos(a) * 6 * escala, y1 = cy + Math.sin(a) * 6 * escala;
        const x2 = cx + Math.cos(a) * 22 * escala, y2 = cy + Math.sin(a) * 22 * escala;
        rayos += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${(1.6 * escala).toFixed(2)}" stroke-linecap="round" opacity=".85"/>
                   <circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="${(1.6 * escala).toFixed(2)}" fill="${color}"/>`;
      }
      return `<g>${rayos}</g>`;
    }

    const W2 = W / 2;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <defs>
        <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0a1128"/>
          <stop offset=".55" stop-color="#102a24"/>
          <stop offset="1" stop-color="#1c5c40"/>
        </linearGradient>
        <linearGradient id="campana" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#e3b23c"/><stop offset="1" stop-color="#a3671f"/>
        </linearGradient>
        <linearGradient id="arco" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#efe3ca"/><stop offset="1" stop-color="#c9b78e"/>
        </linearGradient>
        <linearGradient id="banda" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#c23148"/><stop offset="1" stop-color="#7d1a2c"/>
        </linearGradient>
      </defs>

      <rect width="${W}" height="${H}" fill="url(#cielo)"/>
      ${estrellas}
      ${cohete(W * .18, H * .16, 1, "#e3b23c")}
      ${cohete(W * .82, H * .22, .8, "#c23148")}
      ${cohete(W * .5, H * .09, .65, "#f4ead9")}

      <!-- cerros -->
      <path d="M0 ${H * .78} Q ${W * .22} ${H * .68} ${W * .46} ${H * .77} T ${W} ${H * .74} V ${H} H0Z" fill="#0e2d1d"/>
      <path d="M0 ${H * .86} Q ${W * .3} ${H * .8} ${W * .6} ${H * .87} T ${W} ${H * .84} V ${H} H0Z" fill="#081c12"/>

      <!-- poblado -->
      <g fill="#04120b">
        <rect x="${W * .1}" y="${H * .74}" width="${W * .05}" height="${H * .07}"/>
        <rect x="${W * .17}" y="${H * .71}" width="${W * .06}" height="${H * .1}"/>
        <polygon points="${W * .17},${H * .71} ${W * .2},${H * .66} ${W * .23},${H * .71}"/>
        <rect x="${W * .75}" y="${H * .73}" width="${W * .05}" height="${H * .08}"/>
        <rect x="${W * .82}" y="${H * .7}" width="${W * .05}" height="${H * .11}"/>
        <polygon points="${W * .82},${H * .7} ${W * .845},${H * .655} ${W * .87},${H * .7}"/>
      </g>

      <!-- papel picado -->
      <line x1="0" y1="${H * .085}" x2="${W}" y2="${H * .085}" stroke="#8a6a3a" stroke-width="1.5" opacity=".55"/>
      ${Array.from({ length: 9 }, (_, i) => {
        const x = (W / 9) * i + (W / 18);
        const c = ["#c23148", "#f4ead9", "#1c5c40"][i % 3];
        return `<polygon points="${(x - 16).toFixed(1)},${H * .085} ${(x + 16).toFixed(1)},${H * .085} ${x.toFixed(1)},${H * .085 + 30}" fill="${c}" opacity=".92"/>`;
      }).join("")}

      <!-- arco y campana -->
      <path d="M ${W2 - 78} ${H * .62} V ${H * .32} Q ${W2 - 78} ${H * .17} ${W2} ${H * .17} Q ${W2 + 78} ${H * .17} ${W2 + 78} ${H * .32} V ${H * .62}"
            fill="none" stroke="url(#arco)" stroke-width="26" stroke-linecap="round"/>
      <path d="M ${W2 - 65} ${H * .6} V ${H * .33} Q ${W2 - 65} ${H * .2} ${W2} ${H * .2} Q ${W2 + 65} ${H * .2} ${W2 + 65} ${H * .33} V ${H * .6}"
            fill="#132a1f"/>

      <text x="${W2}" y="${H * .27}" text-anchor="middle" font-family="Georgia, 'Fraunces', serif" font-style="italic"
            font-size="${W * .07}" fill="#e3b23c" opacity=".9">¡Viva México!</text>

      <line x1="${W2}" y1="${H * .32}" x2="${W2}" y2="${H * .38}" stroke="#2b2118" stroke-width="4"/>
      <path d="M ${W2 - 30} ${H * .38} C ${W2 - 30} ${H * .34} ${W2 + 30} ${H * .34} ${W2 + 30} ${H * .38}
               C ${W2 + 30} ${H * .5} ${W2 + 15} ${H * .58} ${W2 + 15} ${H * .61}
               L ${W2 - 15} ${H * .61} C ${W2 - 15} ${H * .58} ${W2 - 30} ${H * .5} ${W2 - 30} ${H * .38}Z"
            fill="url(#campana)" stroke="#7a5222" stroke-width="2"/>
      <ellipse cx="${W2}" cy="${H * .61}" rx="17" ry="4" fill="#8a5a22"/>
      <circle cx="${W2}" cy="${H * .655}" r="5" fill="#5a3a12"/>
      <path d="M ${W2 - 20} ${H * .4} Q ${W2 - 10} ${H * .36} ${W2} ${H * .37}" stroke="#fff" stroke-width="2" opacity=".4" fill="none"/>

      <!-- bandera -->
      <rect x="${W * .1}" y="${H * .5}" width="5" height="${H * .34}" fill="#7a5222"/>
      <rect x="${W * .105}" y="${H * .5}" width="${W * .1}" height="${H * .16}" fill="#1c5c40"/>
      <rect x="${W * .205}" y="${H * .5}" width="${W * .1}" height="${H * .16}" fill="#f4ead9"/>
      <rect x="${W * .305}" y="${H * .5}" width="${W * .1}" height="${H * .16}" fill="#a52439"/>
      <circle cx="${W * .255}" cy="${H * .58}" r="9" fill="#8a5a22" opacity=".85"/>

      <!-- nopal -->
      <g fill="#2f7a2a">
        <ellipse cx="${W * .83}" cy="${H * .77}" rx="20" ry="26" transform="rotate(-8 ${W * .83} ${H * .77})"/>
        <ellipse cx="${W * .8}" cy="${H * .69}" rx="15" ry="20" transform="rotate(10 ${W * .8} ${H * .69})"/>
        <ellipse cx="${W * .87}" cy="${H * .66}" rx="13" ry="18" transform="rotate(-12 ${W * .87} ${H * .66})"/>
      </g>
      <circle cx="${W * .865}" cy="${H * .61}" r="4" fill="#a52439"/>
      <circle cx="${W * .885}" cy="${H * .63}" r="3.4" fill="#c23148"/>

      <!-- listón inferior -->
      <path d="M0 ${H * .935} L${W * .12} ${H * .9} L${W * .88} ${H * .9} L${W} ${H * .935} L${W} ${H} L0 ${H}Z" fill="url(#banda)"/>
      <line x1="0" y1="${H * .935}" x2="${W}" y2="${H * .935}" stroke="#e3b23c" stroke-width="2" opacity=".7"/>
      <text x="${W2}" y="${H * .97}" text-anchor="middle" font-family="Georgia, serif" font-size="${W * .052}" letter-spacing="1"
            fill="#f4ead9">16 DE SEPTIEMBRE DE 1810</text>
    </svg>`;
  }

  /* =====================================================
     GENERADOR DE PIEZAS DE ROMPECABEZAS
     ===================================================== */
  const FILAS = 4, COLUMNAS = 3, TOTAL = FILAS * COLUMNAS;
  const UMBRAL_ENCAJE = 22; // px lógicos

  const campo       = document.getElementById("campo");
  const guia        = document.getElementById("guia");
  const guiaImagen  = document.getElementById("guia-imagen");
  const numPiezas    = document.getElementById("num-piezas");
  const numTiempo    = document.getElementById("num-tiempo");
  const victoria      = document.getElementById("victoria");

  let zTope = 10;
  let piezasFijas = 0;
  let segundos = 0;
  let cronometro = null;
  let escala = 1;
  let multi = null; // paso 5: en multijugador, el servidor confirma los encajes

  function formatoTiempo(s) {
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    const r = String(s % 60).padStart(2, "0");
    return `${m}:${r}`;
  }
  function iniciarCronometro() {
    detenerCronometro();
    segundos = 0; numTiempo.textContent = "00:00";
    cronometro = setInterval(() => { segundos++; numTiempo.textContent = formatoTiempo(segundos); }, 1000);
  }
  function detenerCronometro() { if (cronometro) clearInterval(cronometro); cronometro = null; }

  function baraja(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  async function construirRompecabezas(cfg) { // cfg: bordes y orden decididos por el servidor (multijugador)
    // limpia piezas anteriores
    campo.querySelectorAll(".pieza").forEach(p => p.remove());
    victoria.classList.remove("abierta");
    victoria.setAttribute("inert", "");
    piezasFijas = 0; zTope = 10;
    numPiezas.textContent = `0/${TOTAL}`;

    const rectoGuia = guia.getBoundingClientRect();
    const BOARD_W = rectoGuia.width, BOARD_H = rectoGuia.height;
    const PIEZA_L = BOARD_W / COLUMNAS; // piezas cuadradas (3:4 con 3 cols y 4 filas)
    const AMP_L = PIEZA_L * 0.15;
    const SALIENTE_L = AMP_L * 1.9;

    escala = Math.min(window.devicePixelRatio || 1, 2);
    const BW = Math.round(BOARD_W * escala), BH = Math.round(BOARD_H * escala);
    const PZ = Math.round(PIEZA_L * escala);
    const AMP = AMP_L * escala;
    const OV = Math.round(SALIENTE_L * escala);

    // altura de la bandeja (según cuántas piezas caben por fila)
    const cajaL = PIEZA_L + 2 * SALIENTE_L;
    const colsBandeja = Math.max(2, Math.floor(BOARD_W / cajaL));
    const filasBandeja = Math.ceil(TOTAL / colsBandeja);
    const alturaBandeja = filasBandeja * cajaL + 50;
    campo.style.height = (BOARD_H + 60 + alturaBandeja) + "px";

    // lienzo fuente con la escena completa
    const fuente = document.createElement("canvas");
    fuente.width = BW; fuente.height = BH;
    const ctxFuente = fuente.getContext("2d");

    await new Promise(resolve => {
      const img = new Image();
      img.onload = () => { ctxFuente.drawImage(img, 0, 0, BW, BH); resolve(); };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(escenaSVG(480, 640));
    });

    guiaImagen.style.backgroundImage = `url(${fuente.toDataURL("image/jpeg", .85)})`;

    // transformaciones de cada lado (coordenadas de lienzo de pieza, ya con el saliente incluido)
    const T_TOP    = (fx, fy) => ({ x: OV + fx * PZ,        y: OV - fy * AMP });
    const T_RIGHT  = (fx, fy) => ({ x: OV + PZ + fy * AMP,  y: OV + fx * PZ });
    const T_BOTTOM = (fx, fy) => ({ x: OV + PZ - fx * PZ,   y: OV + PZ + fy * AMP });
    const T_LEFT   = (fx, fy) => ({ x: OV - fy * AMP,       y: OV + PZ - fx * PZ });

    function tramoBorde(T, signo) {
      const fin = T(1, 0);
      if (!signo) return `L ${fin.x.toFixed(2)} ${fin.y.toFixed(2)}`;
      const p1 = T(.28, 0), c1 = T(.28, 1.6 * signo), c2 = T(.72, 1.6 * signo), p2 = T(.72, 0);
      return `L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} ` +
             `C ${c1.x.toFixed(2)} ${c1.y.toFixed(2)} ${c2.x.toFixed(2)} ${c2.y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} ` +
             `L ${fin.x.toFixed(2)} ${fin.y.toFixed(2)}`;
    }

    function rutaPieza(arriba, derecha, abajo, izquierda) {
      const ini = T_TOP(0, 0);
      return `M ${ini.x.toFixed(2)} ${ini.y.toFixed(2)} ` +
        tramoBorde(T_TOP, arriba) + " " + tramoBorde(T_RIGHT, derecha) + " " +
        tramoBorde(T_BOTTOM, abajo) + " " + tramoBorde(T_LEFT, izquierda) + " Z";
    }

    // bordes internos aleatorios (compartidos entre piezas vecinas)
    const hBorde = cfg ? cfg.hBorde : Array.from({ length: FILAS - 1 }, () =>
      Array.from({ length: COLUMNAS }, () => (Math.random() < .5 ? 1 : -1)));
    const vBorde = cfg ? cfg.vBorde : Array.from({ length: FILAS }, () =>
      Array.from({ length: COLUMNAS - 1 }, () => (Math.random() < .5 ? 1 : -1)));

    const piezasDatos = [];
    for (let r = 0; r < FILAS; r++) {
      for (let c = 0; c < COLUMNAS; c++) {
        const arriba    = r === 0 ? 0 : -hBorde[r - 1][c];
        const derecha   = c === COLUMNAS - 1 ? 0 : vBorde[r][c];
        const abajo     = r === FILAS - 1 ? 0 : hBorde[r][c];
        const izquierda = c === 0 ? 0 : -vBorde[r][c - 1];
        piezasDatos.push({ r, c, ruta: rutaPieza(arriba, derecha, abajo, izquierda) });
      }
    }

    // posiciones ordenadas (con leve variación) para la bandeja
    const posicionesBandeja = [];
    for (let i = 0; i < TOTAL; i++) {
      const col = i % colsBandeja, fila = Math.floor(i / colsBandeja);
      posicionesBandeja.push({
        left: col * cajaL + (Math.random() * 10 - 5),
        top: BOARD_H + 40 + fila * cajaL + (Math.random() * 10 - 5)
      });
    }
    const ordenBarajado = cfg ? cfg.orden.map(id => piezasDatos[id]) : baraja(piezasDatos);

    ordenBarajado.forEach((dato, i) => {
      const { r, c, ruta } = dato;
      const lienzo = document.createElement("canvas");
      lienzo.width = PZ + 2 * OV; lienzo.height = PZ + 2 * OV;
      const ctxPieza = lienzo.getContext("2d");
      const recorte = new Path2D(ruta);
      ctxPieza.save();
      ctxPieza.clip(recorte);
      ctxPieza.drawImage(fuente, OV - c * PZ, OV - r * PZ);
      ctxPieza.restore();
      ctxPieza.save();
      ctxPieza.strokeStyle = "rgba(255,255,255,.35)";
      ctxPieza.lineWidth = 1.3 * escala;
      ctxPieza.stroke(recorte);
      ctxPieza.restore();

      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "pieza";
      boton.style.width = (PIEZA_L + 2 * SALIENTE_L) + "px";
      boton.style.height = (PIEZA_L + 2 * SALIENTE_L) + "px";
      boton.setAttribute("aria-label", `Pieza ${i + 1} de ${TOTAL}`);
      boton.appendChild(lienzo);

      const objetivo = { left: c * PIEZA_L - SALIENTE_L, top: r * PIEZA_L - SALIENTE_L };
      const pos = posicionesBandeja[i];
      boton.style.left = pos.left + "px";
      boton.style.top = pos.top + "px";
      boton.dataset.solved = "0";
      boton.dataset.id = r * COLUMNAS + c; boton._objetivo = objetivo; // para restaurar piezas al reconectar

      habilitarArrastre(boton, objetivo, r * COLUMNAS + c, PIEZA_L);
      campo.appendChild(boton);
    });

    if (!cfg) iniciarCronometro(); // en multijugador el cronómetro arranca cuando el servidor dice "ya"
  }

  /* =====================================================
     ARRASTRAR Y SOLTAR
     ===================================================== */
  function habilitarArrastre(pieza, objetivo, id, unidad) {
    let offX = 0, offY = 0, activo = false;

    pieza.addEventListener("pointerdown", e => {
      if (pieza.dataset.solved === "1") return;
      activo = true;
      pieza.setPointerCapture(e.pointerId);
      pieza.style.zIndex = ++zTope;
      const rect = pieza.getBoundingClientRect();
      offX = e.clientX - rect.left;
      offY = e.clientY - rect.top;
    });

    pieza.addEventListener("pointermove", e => {
      if (!activo) return;
      const campoRect = campo.getBoundingClientRect();
      const nuevoLeft = e.clientX - campoRect.left - offX;
      const nuevoTop = e.clientY - campoRect.top - offY;
      pieza.style.left = nuevoLeft + "px";
      pieza.style.top = nuevoTop + "px";
    });

    function soltar(e) {
      if (!activo) return;
      activo = false;
      const left = parseFloat(pieza.style.left);
      const top = parseFloat(pieza.style.top);
      const dist = Math.hypot(left - objetivo.left, top - objetivo.top);
      if (dist < UMBRAL_ENCAJE) {
        if (multi) { // multijugador: el servidor valida y confirma el encaje
          multi.encajar(id, (left - objetivo.left) / unidad, (top - objetivo.top) / unidad, () => {
            pieza.style.left = objetivo.left + "px"; pieza.style.top = objetivo.top + "px";
            pieza.dataset.solved = "1"; pieza.classList.add("pieza--fija"); pieza.style.zIndex = 1;
          });
          return;
        }
        pieza.style.left = objetivo.left + "px";
        pieza.style.top = objetivo.top + "px";
        pieza.dataset.solved = "1";
        pieza.classList.add("pieza--fija");
        pieza.style.zIndex = 1;
        piezasFijas++;
        numPiezas.textContent = `${piezasFijas}/${TOTAL}`;
        if (piezasFijas === TOTAL) terminarJuego();
      }
    }
    pieza.addEventListener("pointerup", soltar);
    pieza.addEventListener("pointercancel", soltar);
  }

  function terminarJuego() {
    detenerCronometro();
    document.getElementById("v-tiempo").textContent = formatoTiempo(segundos);
    victoria.removeAttribute("inert");
    victoria.classList.add("abierta");
    document.getElementById("v-reiniciar").focus();
  }

  document.getElementById("reiniciar").onclick = construirRompecabezas;
  document.getElementById("v-reiniciar").onclick = construirRompecabezas;

  let guiaVisible = true;
  document.getElementById("alternar-guia").onclick = function () {
    guiaVisible = !guiaVisible;
    guiaImagen.classList.toggle("oculta", !guiaVisible);
    this.textContent = guiaVisible ? "Ocultar guía" : "Ver guía";
  };
    /* ========= FIN CÓDIGO ORIGINAL ========= */

    limpiar = detenerCronometro;
    if (opciones && opciones.multi) montarMulti(opciones); else construirRompecabezas();

    /* ---------- MULTIJUGADOR (paso 5): carrera con el mismo rompecabezas ---------- */
    function montarMulti(op) {
      const socket = op.multi.socket, yo = op.multi.yo;
      let jugadores = op.inicio.jugadores, terminado = false, cuenta = null, yaLlego = false;
      const escuchas = [];
      const on = (ev, fn) => { socket.on(ev, fn); escuchas.push([ev, fn]); };

      document.getElementById("reiniciar").remove();           // sin "Barajar" en multijugador
      const barra = document.createElement("div");
      barra.className = "rc-barra";
      barra.innerHTML = '<div class="rc-estado" id="rc-estado" role="status"></div><div class="rc-jugadores" id="rc-jugadores"></div>';
      raiz.querySelector(".marcador").after(barra);
      const estado = (t) => { document.getElementById("rc-estado").textContent = t; };

      // El servidor confirma cada encaje (este objeto lo usa habilitarArrastre)
      multi = {
        encajar(id, dx, dy, alAceptar) {
          socket.emit("rompecabezas:encajar", { pieza: id, dx, dy }, (res) => {
            if (res && res.ok) { alAceptar(); numPiezas.textContent = res.fijas + "/" + TOTAL; }
            else if (res) estado(res.error);
          });
        }
      };

      function pintar() {
        const cont = document.getElementById("rc-jugadores");
        cont.innerHTML = "";
        jugadores.forEach((j, i) => {
          const chip = document.createElement("div");
          chip.className = "rc-jugador" + (j.id === yo ? " rc-jugador--yo" : "") + (j.conectado === false ? " rc-jugador--ausente" : "");
          const nom = document.createElement("span");
          nom.textContent = ["🦅", "🔔", "🌵", "🎺"][i % 4] + " " + j.nombre + (j.id === yo ? " (tú)" : "") + (j.lugar ? "  🏁 " + j.lugar + ".º" : "") + (j.conectado === false ? " · desconectado" : "");
          const pts = document.createElement("span");
          pts.className = "rc-jugador__pts"; pts.textContent = j.fijas + "/" + TOTAL + " · " + j.puntos + " pts";
          const prog = document.createElement("div"); prog.className = "rc-prog";
          const rel = document.createElement("div"); rel.style.width = (j.fijas / TOTAL * 100) + "%";
          prog.appendChild(rel); chip.append(nom, pts, prog); cont.appendChild(chip);
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
          l.textContent = (i + 1) + ". " + r.nombre + " — " + r.puntos + " pts (" + r.fijas + "/" + TOTAL + " piezas)";
          txt.appendChild(l);
        });
        const btn = document.getElementById("v-reiniciar");
        if (op.multi.esAnfitrion()) { btn.textContent = "Jugar otra vez"; btn.disabled = false; btn.onclick = () => socket.emit("sala:volver", null, () => {}); }
        else { btn.textContent = "Esperando al anfitrión…"; btn.disabled = true; btn.onclick = null; }
        victoria.removeAttribute("inert"); victoria.classList.add("abierta");
      }

      on("rompecabezas:ya", () => {
        yaLlego = true;
        clearInterval(cuenta);
        const c = document.getElementById("rc-cuenta"); if (c) c.remove();
        campo.classList.remove("rc-bloqueado");
        estado("¡A armar! Encaja tus piezas lo más rápido que puedas.");
        iniciarCronometro();
      });
      on("rompecabezas:progreso", d => {
        jugadores = d.jugadores; pintar();
        const yoj = jugadores.find(j => j.id === yo);
        if (yoj && yoj.lugar && !terminado) { detenerCronometro(); estado("¡Terminaste en el lugar " + yoj.lugar + "! Esperando a los demás…"); }
      });
      on("rompecabezas:fin", fin);

      limpiar = () => { detenerCronometro(); clearInterval(cuenta); escuchas.forEach(([e, f]) => socket.off(e, f)); };

      // Piezas bloqueadas y cuenta regresiva local hasta que el servidor diga "ya"
      campo.classList.add("rc-bloqueado");
      pintar(); estado("Prepárate…");
      construirRompecabezas(op.inicio.config).then(() => {
        // Reconexión: se recuperan las piezas que este jugador ya había encajado
        const ya = op.inicio.fijas || [];
        ya.forEach(id => {
          const b = campo.querySelector('.pieza[data-id="' + id + '"]');
          if (!b) return;
          b.style.left = b._objetivo.left + "px"; b.style.top = b._objetivo.top + "px";
          b.dataset.solved = "1"; b.classList.add("pieza--fija"); b.style.zIndex = 1;
        });
        numPiezas.textContent = ya.length + "/" + TOTAL;
        const tiempo = () => { segundos = op.inicio.segundos || 0; numTiempo.textContent = formatoTiempo(segundos); };
        if (op.inicio.fin) { tiempo(); fin(op.inicio.fin); return; }
        const yoj = jugadores.find(j => j.id === yo);
        if (op.inicio.empezo || yaLlego) {                       // la carrera ya había empezado
          campo.classList.remove("rc-bloqueado");
          if (yoj && yoj.lugar) { tiempo(); estado("¡Terminaste en el lugar " + yoj.lugar + "! Esperando a los demás…"); return; }
          estado("¡A armar! Encaja tus piezas lo más rápido que puedas.");
          if (!yaLlego || op.inicio.empezo) { iniciarCronometro(); tiempo(); } 
          return;
        }
        const num = document.createElement("div");
        num.className = "rc-cuenta"; num.id = "rc-cuenta";
        campo.appendChild(num);
        let n = Math.max(1, Math.ceil((op.inicio.faltan == null ? 3000 : op.inicio.faltan) / 1000));
        num.textContent = n;
        cuenta = setInterval(() => { n--; if (n > 0) num.textContent = n; else { num.textContent = "¡Ya!"; clearInterval(cuenta); } }, 1000);
      });
    }
  }

  function desmontar() { limpiar(); limpiar = () => {}; }

  return { montar, desmontar };
})();
