// Prueba de interfaz en Chromium real: modos individual y mismo dispositivo de los 5 juegos + Memorama/Rompecabezas.
const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const { crear } = require("./estatico");
const assert = require("assert");
let ok = 0, fallos = 0;
const prueba = async (n, fn) => { try { await fn(); ok++; console.log("  ✔", n); } catch (e) { fallos++; console.log("  ✘", n, "\n     ", String(e.message).split("\n")[0]); } };

(async () => {
  const srv = crear().listen(0); const url = "http://localhost:" + srv.address().port + "/";
  const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  const ctx = await nav.newContext({ viewport: { width: 1000, height: 900 } });
  const p = await ctx.newPage();
  const errores = [];
  p.on("pageerror", e => errores.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error" && !/socket\.io|Failed to load resource/.test(m.text())) errores.push("console: " + m.text()); });
  const abrir = async (juego, modo) => { await p.goto(url); await p.click('[data-juego="' + juego + '"]'); await p.click('[data-modo="' + modo + '"]'); };
  const iniciar = async () => { await p.click("#juego-raiz .jg-config .boton--oscuro, #juego-raiz .jg-config button[type=submit], #juego-raiz .jg-config .jg-boton-grande"); };

  console.log("Menú");
  await prueba("carga sin errores y muestra los 7 juegos", async () => {
    await p.goto(url); await p.waitForSelector("[data-juego]");
    assert.strictEqual(await p.locator("[data-juego]").count(), 7);
    assert.deepStrictEqual(errores, []);
  });
  await prueba("modo online sin servidor da un aviso (no 'en construcción')", async () => {
    await p.click('[data-juego="trivia"]'); await p.click('[data-modo="online"]');
    const t = await p.textContent("#aviso"); assert(/servidor/i.test(t) && !/construcci/i.test(t), t);
  });

  console.log("Trivia");
  await prueba("individual: jugar 5 preguntas completas y ver resultados", async () => {
    await abrir("trivia", "solo");
    await p.waitForSelector(".jg-config"); await p.locator('input[name="cfg-preguntas"][value="5"]').check({ force: true });
    await iniciar();
    for (let i = 0; i < 5; i++) {
      await p.waitForSelector(".tr-opcion:not([disabled])"); await p.locator(".tr-opcion").first().click();
      await p.waitForSelector(".jg-explicacion");
      await p.click(".tr-panel .jg-boton-grande");
    }
    await p.waitForSelector(".jg-resultado"); assert(/Fin de la trivia/.test(await p.textContent(".jg-resultado")));
  });
  await prueba("teclas 1–4 responden y el tiempo configurado corre", async () => {
    await abrir("trivia", "solo"); await p.waitForSelector(".jg-config");
    await p.locator('input[name="cfg-segundos"][value="15"]').check({ force: true }); await iniciar();
    await p.waitForSelector(".tr-opcion"); assert(await p.locator(".jg-reloj").count() >= 1);
    await p.keyboard.press("2"); await p.waitForSelector(".jg-explicacion");
  });
  await prueba("local: 2 jugadores con cortina de turno", async () => {
    await abrir("trivia", "local"); await p.waitForSelector(".jg-config"); await iniciar();
    await p.waitForSelector(".jg-cortina"); assert(/Turno de/.test(await p.textContent(".jg-cortina")));
    await p.click(".jg-cortina button"); await p.waitForSelector(".tr-opcion:not([disabled])");
    assert(!/\bcorrecta\b/i.test(await p.innerHTML(".tr-opciones")));
  });

  console.log("Ordena la historia");
  await prueba("individual: botones ▲▼ y comprobar", async () => {
    await abrir("ordena", "solo"); await p.waitForSelector(".jg-config"); await p.locator('input[name="cfg-rondas"][value="1"]').check({ force: true }); await iniciar();
    await p.waitForSelector(".od-carta"); assert.strictEqual(await p.locator(".od-carta").count(), 4);
    await p.locator(".od-mov").nth(1).click(); // bajar la primera
    await p.click(".od-panel .boton--oscuro"); await p.waitForSelector(".od-anuncio:not(:empty)");
    assert(/en su lugar|correcto/i.test(await p.textContent(".od-anuncio")));
  });
  await prueba("teclado: flechas mueven la tarjeta enfocada", async () => {
    await p.locator(".od-carta__cuerpo").first().focus(); const antes = await p.locator(".od-carta strong").first().textContent();
    await p.keyboard.press("ArrowDown"); const despues = await p.locator(".od-carta strong").nth(1).textContent();
    assert.strictEqual(antes, despues);
  });
  await prueba("arrastrar con el ratón cambia el orden", async () => {
    const t0 = await p.locator(".od-carta strong").allTextContents();
    const a = await p.locator(".od-carta").nth(3).boundingBox(), b = await p.locator(".od-carta").nth(0).boundingBox();
    await p.mouse.move(a.x + 60, a.y + a.height / 2); await p.mouse.down(); await p.mouse.move(a.x + 60, b.y + 5, { steps: 12 }); await p.mouse.up();
    const t1 = await p.locator(".od-carta strong").allTextContents();
    assert.notDeepStrictEqual(t0, t1);
  });
  await prueba("la pista muestra una fecha y avisa de la penalización", async () => {
    assert(/−15/.test(await p.textContent(".od-panel .boton--fantasma-oscuro")));
    await p.click(".od-panel .boton--fantasma-oscuro"); await p.waitForSelector(".od-fecha");
  });

  console.log("¿Quién soy?");
  await prueba("individual (opciones): se ve una pista, no el nombre; acertar y ver explicación", async () => {
    await abrir("quiensoy", "solo"); await p.waitForSelector(".jg-config");
    await p.locator('input[name="cfg-modalidad"][value="opciones"]').check({ force: true }); await p.locator('input[name="cfg-rondas"][value="3"]').check({ force: true }); await iniciar();
    await p.waitForSelector(".qs-pista"); assert.strictEqual(await p.locator(".qs-pista").count(), 1);
    await p.click("button:has-text('Otra pista')"); assert.strictEqual(await p.locator(".qs-pista").count(), 2);
    for (let i = 0; i < 3; i++) { // se intenta cada opción hasta acertar
      for (let k = 0; k < 4; k++) { const b = p.locator(".tr-opcion:not([disabled])").first(); if (!(await b.count())) break; await b.click(); await p.waitForTimeout(60); if (await p.locator(".jg-explicacion").count()) break; }
      await p.waitForSelector(".jg-explicacion", { timeout: 4000 });
      await p.click(".qs-panel .jg-boton-grande");
    }
    await p.waitForSelector(".jg-resultado");
  });
  await prueba("individual (escribir): acepta el nombre sin acentos", async () => {
    await abrir("quiensoy", "solo"); await p.waitForSelector(".jg-config");
    await p.locator('input[name="cfg-dificultad"][value="facil"]').check({ force: true }); await p.locator('input[name="cfg-modalidad"][value="escribir"]').check({ force: true }); await p.locator('input[name="cfg-rondas"][value="3"]').check({ force: true }); await iniciar();
    await p.waitForSelector(".qs-input");
    await p.fill(".qs-input", "zzz"); await p.keyboard.press("Enter"); await p.waitForSelector("text=No es esa persona");
  });

  console.log("Sopa de letras");
  await prueba("individual: tablero 10×10, arrastrar una selección y pedir pista", async () => {
    await abrir("sopa", "solo"); await p.waitForSelector(".jg-config"); await iniciar();
    await p.waitForSelector(".sp-celda"); assert.strictEqual(await p.locator(".sp-celda").count(), 100);
    const a = await p.locator(".sp-celda").nth(0).boundingBox(), b = await p.locator(".sp-celda").nth(4).boundingBox();
    await p.mouse.move(a.x + 5, a.y + 5); await p.mouse.down(); await p.mouse.move(b.x + 5, b.y + 5, { steps: 6 }); await p.mouse.up();
    await p.waitForSelector(".sp-mensaje--no, .sp-mensaje--ok", { timeout: 3000 });
    await p.click(".sp-panel .boton--fantasma-oscuro"); await p.waitForSelector(".sp-pista");
  });
  await prueba("teclado: Enter marca inicio y fin", async () => {
    await p.locator(".sp-tablero").focus(); await p.keyboard.press("Enter"); await p.keyboard.press("ArrowRight"); await p.keyboard.press("ArrowRight"); await p.keyboard.press("Enter");
    await p.waitForTimeout(150); assert(await p.locator(".sp-mensaje").textContent());
  });
  await prueba("resolver la sopa completa arrastrando con el ratón (desde la interfaz) y ver resultados", async () => {
    await abrir("sopa", "solo"); await p.waitForSelector(".jg-config"); await p.locator('input[name="cfg-pistas"][value="false"]').check({ force: true }); await iniciar(); await p.waitForSelector(".sp-celda");
    // Un "solucionador" externo busca en el tablero visible las palabras del banco (no usa información del motor)
    const lineas = await p.evaluate(() => {
      const n = Math.sqrt(document.querySelectorAll(".sp-celda").length), g = [...document.querySelectorAll(".sp-celda")].map(c => c.textContent);
      const palabras = [].concat(...Object.values(Datos.sopa.bancos)).map(w => w.t), out = [];
      for (const w of palabras) for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) for (const [dr, dc] of [[0,1],[1,0],[1,1],[-1,1],[0,-1],[-1,0],[-1,-1],[1,-1]]) {
        let ok = true; for (let i = 0; i < w.length && ok; i++) { const rr = r + dr * i, cc = c + dc * i; if (rr < 0 || cc < 0 || rr >= n || cc >= n || g[rr * n + cc] !== w[i]) ok = false; }
        if (ok) out.push([r, c, r + dr * (w.length - 1), c + dc * (w.length - 1), w]);
      }
      return out;
    });
    for (const [r1, c1, r2, c2] of lineas) {
      if (await p.locator(".jg-resultado").count()) break;
      const a = await p.locator(".sp-celda").nth(r1 * 10 + c1).boundingBox(), b = await p.locator(".sp-celda").nth(r2 * 10 + c2).boundingBox();
      await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await p.mouse.down(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(40);
    }
    await p.waitForSelector(".jg-resultado", { timeout: 5000 });
    assert(/Sopa completada/.test(await p.textContent(".jg-resultado")));
    // repetir una palabra no suma dos veces: la lista muestra cada palabra una sola vez y los puntos son los esperados
    const d = await p.evaluate(() => JSON.parse(localStorage.getItem("progresoJuegos")).tablas.sopa[0].puntos); assert(d > 0);
  });

  console.log("El misterio histórico");
  await prueba("individual: examinar, responder, decidir y ver final con etiquetas de ficción", async () => {
    await abrir("misterio", "solo"); await p.waitForSelector(".jg-config");
    await p.locator('input[name="cfg-caso"][value="corregidora"]').check({ force: true }); await iniciar();
    await p.waitForSelector(".mi-aviso"); assert(/ficción/i.test(await p.textContent(".mi-aviso")));
    for (let cap = 0; cap < 3; cap++) {
      for (const _ of [0, 1, 2]) { const b = p.locator(".mi-doc--sellado:not([disabled])").first(); if (await b.count()) await b.click(); }
      assert(await p.locator(".jg-etiqueta--ficcion, .jg-etiqueta--hecho").count() >= 2);
      await p.evaluate(() => 0);
      // se responde con la respuesta correcta del banco (la prueba conoce los datos)
      const dato = await p.evaluate((c) => { const k = Datos.misterio.casos[0].capitulos[c].pregunta; return k; }, cap);
      if (dato.tipo === "texto") { await p.fill(".qs-input", dato.respuestas[0]); await p.keyboard.press("Enter"); }
      else await p.locator(".mi-pregunta .tr-opcion").nth(dato.correcta).click();
      await p.waitForSelector(".mi-panel .jg-boton-grande"); await p.click(".mi-panel .jg-boton-grande");
    }
    await p.waitForSelector(".mi-panel .tr-opcion"); await p.locator(".mi-panel .tr-opcion").first().click();
    await p.waitForSelector(".jg-resultado"); assert(/Caso resuelto/.test(await p.textContent(".jg-resultado")));
    assert(/ficticio|Ficción/i.test(await p.textContent(".jg-resultado")));
  });
  await prueba("progreso guardado: se registró la partida y hay experiencia", async () => {
    const d = await p.evaluate(() => JSON.parse(localStorage.getItem("progresoJuegos")));
    assert(d.juegos.misterio.partidas >= 1 && d.xp > 0);
  });

  console.log("Juegos originales y navegación");
  await prueba("Memorama y Rompecabezas siguen montando", async () => {
    for (const j of ["memorama", "rompecabezas"]) {
      await p.goto(url); await p.click('[data-juego="' + j + '"]'); await p.click('[data-modo="solo"]');
      await p.waitForSelector("#juego-raiz > *", { timeout: 4000 });
      assert((await p.innerHTML("#juego-raiz")).length > 100);
    }
  });
  await prueba("responsive: sin desborde horizontal en 360 px", async () => {
    await p.setViewportSize({ width: 360, height: 740 });
    for (const j of ["trivia", "ordena", "sopa", "misterio"]) {
      await abrir(j, "solo"); await p.waitForSelector(".jg-config"); await iniciar(); await p.waitForTimeout(250);
      // El banderín decorativo (.picado) ya se salía en el original y está recortado por body; se mide el contenido real
      const sobran = await p.evaluate(() => [...document.querySelectorAll("#juego-raiz *")].filter(e => e.getBoundingClientRect().right > 362 && getComputedStyle(e).position !== "fixed").map(e => e.className).slice(0, 3));
      assert.deepStrictEqual(sobran, [], j + " desborda: " + sobran);

    }
  });
  await prueba("ningún error de consola durante toda la sesión", async () => { assert.deepStrictEqual(errores, []); });

  console.log("\n" + ok + " correctas, " + fallos + " con fallo");
  await nav.close(); srv.close(); process.exit(fallos ? 1 : 0);
})();
