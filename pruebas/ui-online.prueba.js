// Interfaz online con DOS navegadores (Chromium) conectados a la lógica real del servidor (server/salas.js + motores).
// El transporte Socket.IO se sustituye por un puente en memoria: valida salas, sincronización, listos, revancha y reconexión,
// pero NO la red real ni Socket.IO. Esa parte requiere probarse con el servidor desplegado (ver DESPLIEGUE.md).
process.env.GRACIA_MS = "60000";
const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const { crear } = require("./estatico"); const { crearIo } = require("./io-falso"); const { registrar } = require("../server/salas");
const assert = require("assert");
let ok = 0, fallos = 0;
const prueba = async (n, fn) => { try { await fn(); ok++; console.log("  ✔", n); } catch (e) { fallos++; console.log("  ✘", n, "\n     ", String(e.stack || e.message).split("\n").slice(0, 3).join("\n      ")); } };

const FALSO = `(() => {
  const h = {}; window.__h = h;
  window.__push = (ev, d) => (h[ev] || []).forEach(f => f(d));
  const sock = { connected: false, id: "x",
    on(ev, f) { (h[ev] = h[ev] || []).push(f); }, off(ev, f) { h[ev] = (h[ev] || []).filter(x => x !== f); },
    emit(ev, d, ack) { window.__emit(ev, d === undefined ? null : d).then(r => { if (typeof ack === "function") ack(r); }); } };
  window.io = () => { setTimeout(() => { sock.connected = true; window.__push("connect"); }, 30); return sock; };
})();`;

(async () => {
  const io = crearIo(); registrar(io);
  const srv = crear().listen(0); const url = "http://localhost:" + srv.address().port + "/";
  const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  const errores = [];

  async function jugador(nombre) {
    const ctx = await nav.newContext({ viewport: { width: 1000, height: 1000 } }), p = await ctx.newPage();
    const J = { p, nombre, sock: null };
    p.on("pageerror", e => errores.push(nombre + ": " + e.message));
    const conectar = async () => {                 // cada carga de página abre un "socket" nuevo del servidor
      if (J.sock) J.sock.cerrar();
      J.sock = io.cliente(); J.sock.alRecibir = (ev, d) => p.evaluate(([e, x]) => window.__push && window.__push(e, x), [ev, d]).catch(() => {});
    };
    await p.exposeFunction("__emit", (ev, d) => J.sock.emitir(ev, d));
    await p.addInitScript(FALSO);
    p.on("framenavigated", async (f) => { if (f === p.mainFrame()) await conectar(); });
    await conectar();
    J.ir = async () => { await p.goto(url); await p.waitForFunction(() => document.querySelector("#estado.estado--si")); };
    J.desconectar = () => J.sock.cerrar();
    return J;
  }
  const A = await jugador("Ana"), B = await jugador("Beto");
  const nuevaSala = async (juego) => {
    for (const J of [A, B]) { await J.ir(); }
    await A.p.click('[data-juego="' + juego + '"]'); await A.p.click('[data-modo="online"]');
    await A.p.fill("#sala-nombre", "Ana"); await A.p.click("#sala-crear"); await A.p.waitForSelector("#lobby-codigo:not(:empty)");
    const codigo = await A.p.textContent("#lobby-codigo");
    await B.p.click('[data-juego="' + juego + '"]'); await B.p.click('[data-modo="online"]');
    await B.p.fill("#sala-nombre", "Beto"); await B.p.fill("#sala-codigo", codigo); await B.p.click("#sala-unirse"); await B.p.waitForSelector("#lobby-codigo:not(:empty)");
    return codigo;
  };
  const arrancar = async () => {
    await B.p.click("#lobby-listo"); await A.p.waitForFunction(() => !document.getElementById("lobby-iniciar").disabled);
    await A.p.click("#lobby-iniciar"); await A.p.waitForSelector("#juego-raiz .jg"); await B.p.waitForSelector("#juego-raiz .jg");
  };
  const salir = async () => { for (const J of [A, B]) { await J.p.evaluate(() => { try { Sala.salir(); } catch (e) {} }); } };

  console.log("Sala y lobby");
  await prueba("crear sala pública, verla en la lista, unirse y listos", async () => {
    await A.ir(); await B.ir();
    await A.p.click('[data-juego="trivia"]'); await A.p.click('[data-modo="online"]'); await A.p.fill("#sala-nombre", "Ana"); await A.p.check("#sala-publica"); await A.p.click("#sala-crear");
    await A.p.waitForSelector("#lobby-codigo:not(:empty)"); assert(/pública/.test(await A.p.textContent("#lobby-visibilidad")));
    await B.p.click('[data-juego="trivia"]'); await B.p.click('[data-modo="online"]'); await B.p.waitForSelector("#sala-lista li button");
    await B.p.fill("#sala-nombre", "Beto"); await B.p.click("#sala-lista li button"); await B.p.waitForSelector("#lobby-codigo:not(:empty)");
    assert.strictEqual(await A.p.locator("#lobby-jugadores li").count(), 2);
    assert(await A.p.locator("#lobby-iniciar").isDisabled());                 // falta confirmar "listo"
    assert(await B.p.locator("#lobby-reglas select").first().isDisabled());   // solo el anfitrión cambia reglas
    await A.p.selectOption('#lobby-reglas [data-campo="preguntas"]', "5"); await A.p.selectOption('#lobby-reglas [data-campo="segundos"]', "10");
    await B.p.waitForFunction(() => document.querySelector('#lobby-reglas [data-campo="preguntas"]').value === "5");
    await B.p.click("#lobby-listo"); await A.p.waitForFunction(() => !document.getElementById("lobby-iniciar").disabled);
    await A.p.click("#lobby-iniciar"); await A.p.waitForSelector("#juego-raiz .tr-opcion"); await B.p.waitForSelector("#juego-raiz .tr-opcion");
  });

  console.log("Trivia online");
  await prueba("ambos ven la misma pregunta; responden; ambos ven la misma respuesta correcta y el marcador", async () => {
    const q = async (J) => J.p.textContent("#tr-pregunta");
    assert.strictEqual(await q(A), await q(B));
    assert.strictEqual(await A.p.locator(".tr-opcion--ok").count(), 0);          // no se adelanta la respuesta
    await A.p.locator(".tr-opcion").nth(0).click();
    await B.p.waitForFunction(() => /respondió/.test(document.querySelector(".jg-marcador-jug").textContent));
    assert.strictEqual(await B.p.locator(".tr-opcion--elegida").count(), 0);     // la elección ajena no se ve
    await B.p.locator(".tr-opcion").nth(1).click();
    await A.p.waitForSelector(".jg-explicacion"); await B.p.waitForSelector(".jg-explicacion");
    const ok_ = async (J) => J.p.locator(".tr-opcion").evaluateAll(l => l.findIndex(x => x.classList.contains("tr-opcion--ok")));
    assert.strictEqual(await ok_(A), await ok_(B)); assert(await ok_(A) >= 0);
    assert.strictEqual(await A.p.textContent(".jg-marcador-jug"), await A.p.textContent(".jg-marcador-jug"));
    assert(await B.p.locator(".tr-panel .jg-boton-grande").isHidden());          // solo el anfitrión avanza
    await A.p.click(".tr-panel .jg-boton-grande"); await B.p.waitForFunction(() => /2\/5/.test(document.querySelector(".jg-datos").textContent));
  });
  await prueba("desconexión de Beto: Ana lo ve; Beto recarga y vuelve a la partida (reconexión)", async () => {
    B.desconectar();
    await A.p.waitForFunction(() => /sin conexión/.test(document.querySelector(".jg-marcador-jug").textContent));
    await B.p.reload(); await B.p.waitForSelector("#juego-raiz .tr-opcion", { timeout: 8000 });
    await A.p.waitForFunction(() => !/sin conexión/.test(document.querySelector(".jg-marcador-jug").textContent));
    assert(/2\/5/.test(await B.p.textContent(".jg-datos")));
  });
  await prueba("terminar la trivia, resultados idénticos y revancha solo para el anfitrión", async () => {
    for (let i = 2; i <= 5; i++) {
      for (const J of [A, B]) { await J.p.waitForSelector(".tr-opcion:not([disabled])"); await J.p.locator(".tr-opcion").first().click(); }
      await A.p.waitForSelector(".jg-explicacion"); await A.p.click(".tr-panel .jg-boton-grande"); await A.p.waitForTimeout(120);
    }
    await A.p.waitForSelector(".jg-resultado"); await B.p.waitForSelector(".jg-resultado");
    assert.strictEqual(await A.p.textContent(".jg-resultado__ranking"), await B.p.textContent(".jg-resultado__ranking"));
    assert(/Revancha/.test(await A.p.textContent(".jg-resultado__botones"))); assert(!/Revancha/.test(await B.p.textContent(".jg-resultado__botones")));
    assert(/Esperando/.test(await B.p.textContent(".jg-resultado")));
    await A.p.click(".jg-resultado__botones button:first-child"); await A.p.waitForSelector(".tr-opcion"); await B.p.waitForSelector(".tr-opcion");
    assert(/1\/5/.test(await B.p.textContent(".jg-datos")));
  });
  await salir();

  console.log("Ordena la historia online");
  await prueba("ambos reciben las mismas tarjetas barajadas; resolver; ven la solución y el desempate/resultado", async () => {
    await nuevaSala("ordena"); await A.p.selectOption('#lobby-reglas [data-campo="rondas"]', "1"); await A.p.selectOption('#lobby-reglas [data-campo="nivel"]', "1");
    await arrancar(); await A.p.waitForSelector(".od-carta"); await B.p.waitForSelector(".od-carta");
    const t = async (J) => J.p.locator(".od-carta strong").allTextContents();
    assert.deepStrictEqual(await t(A), await t(B));
    // la solución se calcula en la página con el banco (no con datos del servidor)
    const resolver = async (J) => { const orden = await J.p.evaluate(() => { const titulos = [...document.querySelectorAll(".od-carta strong")].map(x => x.textContent); const set = Datos.ordena.secuencias.find(s => titulos.every(t => s.eventos.some(e => e.titulo === t)) && s.eventos.length === titulos.length); return set.eventos.map(e => e.titulo); }); for (let i = 0; i < orden.length; i++) { const actual = await J.p.locator(".od-carta strong").allTextContents(); const k = actual.indexOf(orden[i]); for (let m = k; m > i; m--) await J.p.locator(".od-carta").nth(m).locator(".od-mov").first().click(); } await J.p.click(".od-panel .boton--oscuro"); };
    await resolver(A);
    await A.p.waitForFunction(() => /Terminaste|Intentos/.test(document.querySelector(".od-panel").textContent));
    assert(await B.p.locator(".od-panel .od-fecha").count() === 0);              // nada de fechas ajenas
    await resolver(B);
    await A.p.waitForSelector(".od-sol"); await B.p.waitForSelector(".od-sol");
    assert.strictEqual(await A.p.locator(".od-sol li").count(), 4);
  });
  await salir();

  console.log("¿Quién soy? online");
  await prueba("las pistas salen solas, el nombre no viaja y se acierta escribiendo", async () => {
    await nuevaSala("quiensoy"); await A.p.selectOption('#lobby-reglas [data-campo="dificultad"]', "facil"); await A.p.selectOption('#lobby-reglas [data-campo="rondas"]', "3"); await A.p.selectOption('#lobby-reglas [data-campo="segundosPista"]', "10");
    await arrancar(); await A.p.waitForSelector(".qs-pista");
    assert.strictEqual(await A.p.locator(".qs-pista").count(), 1);
    const nombre = await A.p.evaluate(() => { const p = document.querySelector(".qs-pista span:last-child").textContent; return Datos.quiensoy.personajes.find(x => x.pistas[0] === p).nombre; });
    assert(!(await A.p.content()).includes(nombre));
    await A.p.fill(".qs-input", nombre.toUpperCase()); await A.p.keyboard.press("Enter");
    await B.p.waitForFunction(() => /acertó/.test(document.querySelector(".jg-marcador-jug").textContent));
    assert.strictEqual(await B.p.locator(".qs-input").isEnabled(), true);        // Beto sigue jugando
    await B.p.fill(".qs-input", nombre); await B.p.keyboard.press("Enter");
    await A.p.waitForSelector(".jg-explicacion"); await B.p.waitForSelector(".jg-explicacion");
  });
  await salir();

  console.log("Sopa de letras online");
  await prueba("mismo tablero; un hallazgo sincroniza a ambos y no puntúa dos veces", async () => {
    await nuevaSala("sopa"); await arrancar(); await A.p.waitForSelector(".sp-celda"); await B.p.waitForSelector(".sp-celda");
    assert.strictEqual(await A.p.locator(".sp-tablero").innerText(), await B.p.locator(".sp-tablero").innerText());
    const buscar = (J) => J.p.evaluate(() => { const n = Math.sqrt(document.querySelectorAll(".sp-celda").length), g = [...document.querySelectorAll(".sp-celda")].map(c => c.textContent); const out = []; for (const w of [].concat(...Object.values(Datos.sopa.bancos)).map(x => x.t)) for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) for (const [dr, dc] of [[0,1],[1,0]]) { let ok = true; for (let i = 0; i < w.length && ok; i++) { const rr = r + dr * i, cc = c + dc * i; if (rr >= n || cc >= n || g[rr * n + cc] !== w[i]) ok = false; } if (ok) out.push([r, c, r + dr * (w.length - 1), c + dc * (w.length - 1)]); } return out; });
    const arrastrar = async (J, [r1, c1, r2, c2]) => { const n = 10; const a = await J.p.locator(".sp-celda").nth(r1 * n + c1).boundingBox(), b = await J.p.locator(".sp-celda").nth(r2 * n + c2).boundingBox(); await J.p.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await J.p.mouse.down(); await J.p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 4 }); await J.p.mouse.up(); await J.p.waitForTimeout(120); };
    const L = await buscar(A); const real = []; for (const l of L) { await arrastrar(A, l); if (/!/.test(await A.p.textContent(".sp-mensaje")) && /\+\d+ puntos/.test(await A.p.textContent(".sp-mensaje"))) { real.push(l); break; } }
    assert(real.length === 1, "no se halló ninguna palabra");
    await B.p.waitForFunction(() => document.querySelector(".sp-palabra--ok"));
    const ptsA = await A.p.textContent(".jg-marcador-jug");
    await arrastrar(B, real[0]); assert(/ya la encontró otra persona/.test(await B.p.textContent(".sp-mensaje")));
    await arrastrar(A, real[0]); assert(/no suma puntos otra vez/.test(await A.p.textContent(".sp-mensaje")));
    assert.strictEqual(await A.p.textContent(".jg-marcador-jug"), ptsA);        // sin puntos repetidos
    assert.strictEqual(await A.p.locator(".sp-palabra--ok").count(), await B.p.locator(".sp-palabra--ok").count());
  });
  await salir();

  console.log("El misterio histórico online");
  await prueba("equipo cooperativo: documentos compartidos, voto final y resultado igual para ambos", async () => {
    await nuevaSala("misterio"); await A.p.selectOption('#lobby-reglas [data-campo="caso"]', "corregidora"); await A.p.selectOption('#lobby-reglas [data-campo="modo"]', "coop");
    await arrancar(); await A.p.waitForSelector(".mi-doc--sellado"); await B.p.waitForSelector(".mi-doc--sellado");
    await A.p.locator(".mi-doc--sellado").first().click();
    await B.p.waitForSelector(".mi-doc--abierto");                               // Beto ve lo que Ana descubrió
    assert(/Descubierto por Ana/.test(await B.p.textContent(".mi-doc--abierto")));
    for (let cap = 0; cap < 3; cap++) {
      for (let k = 0; k < 3; k++) { const J = k % 2 ? B : A; const b = J.p.locator(".mi-doc--sellado:not([disabled])").first(); if (await b.count()) await b.click(); await A.p.waitForTimeout(80); }
      const dato = await A.p.evaluate((c) => Datos.misterio.casos[0].capitulos[c].pregunta, cap);
      if (dato.tipo === "texto") { await B.p.fill(".qs-input", dato.respuestas[0]); await B.p.keyboard.press("Enter"); } else await B.p.locator(".mi-pregunta .tr-opcion").nth(dato.correcta).click();
      await A.p.waitForSelector(".mi-panel .jg-boton-grande"); await A.p.click(".mi-panel .jg-boton-grande"); await A.p.waitForTimeout(100);
    }
    await A.p.waitForSelector(".mi-panel .tr-opcion"); await B.p.waitForSelector(".mi-panel .tr-opcion");
    await A.p.locator(".mi-panel .tr-opcion").nth(0).click(); await B.p.locator(".mi-panel .tr-opcion").nth(0).click();
    await A.p.waitForSelector(".jg-resultado"); await B.p.waitForSelector(".jg-resultado");
    assert.strictEqual(await A.p.locator(".jg-resultado__datos").innerText(), await B.p.locator(".jg-resultado__datos").innerText());
    assert(/Final: El mensajero/.test(await B.p.textContent(".jg-resultado")));
  });

  await prueba("ningún error de JavaScript en ninguna de las dos páginas", async () => { assert.deepStrictEqual(errores, []); });
  console.log("\n" + ok + " correctas, " + fallos + " con fallo");
  await nav.close(); srv.close(); process.exit(fallos ? 1 : 0);
})();
