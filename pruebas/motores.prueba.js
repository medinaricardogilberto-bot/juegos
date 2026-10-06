// Pruebas de las reglas de los cinco juegos (sin red, sin navegador): node pruebas/motores.prueba.js
const assert = require("assert");
const Base = require("../public/motores/base");
const M = { trivia: require("../public/motores/trivia"), ordena: require("../public/motores/ordena"), quiensoy: require("../public/motores/quiensoy"), sopa: require("../public/motores/sopa"), misterio: require("../public/motores/misterio") };
const BANCO = { trivia: require("../public/datos/trivia"), ordena: require("../public/datos/ordena"), quiensoy: require("../public/datos/quiensoy"), sopa: require("../public/datos/sopa"), misterio: require("../public/datos/misterio") };
let t = 1e6; const env = { ahora: () => t, azar: n => Math.floor(Math.random() * n), banco: BANCO };
let ok = 0; const prueba = (n, f) => { try { f(); ok++; console.log("  ✔", n); } catch (e) { console.log("  ✘", n, "\n    ", e.message); process.exitCode = 1; } };
const J2 = [{ id: "a", nombre: "Ana" }, { id: "b", nombre: "Beto" }];

console.log("Contenido");
prueba("trivia: 4 opciones distintas, categorías y dificultades válidas, ids únicos", () => {
  const ids = new Set(); BANCO.trivia.preguntas.forEach(q => { assert(!ids.has(q.id)); ids.add(q.id); assert.strictEqual(new Set(q.o).size, 4); assert(q.cat in BANCO.trivia.categorias); assert(["facil", "intermedia", "dificil"].includes(q.dif)); assert(q.e.length > 20); });
});
prueba("trivia: hay preguntas suficientes en cada dificultad", () => { for (const d of ["facil", "intermedia", "dificil"]) assert(BANCO.trivia.preguntas.filter(q => q.dif === d).length >= 10, d); });
prueba("ordena: cada secuencia está en orden cronológico y tiene explicación", () => BANCO.ordena.secuencias.forEach(s => { const o = s.eventos.map(e => e.orden); assert(o.every((v, i) => !i || v >= o[i - 1]), s.id); assert(s.explicacion.length > 40); }));
prueba("quiensoy: 5 pistas por personaje y ninguna contiene el nombre completo", () => BANCO.quiensoy.personajes.forEach(p => { assert.strictEqual(p.pistas.length, 5); p.pistas.slice(0, 4).forEach(x => assert(!Base.normalizar(x).includes(Base.normalizar(p.nombre)), p.id + ": " + x)); }));
prueba("misterio: todo documento tiene tipo válido", () => BANCO.misterio.casos.forEach(c => c.capitulos.forEach(k => k.docs.forEach(d => assert(["hecho", "tradicion", "ficcion"].includes(d.tipo))))));

console.log("Trivia");
prueba("puntos: más por rapidez, dificultad y racha (con tope)", () => {
  const P = M.trivia.reglas.puntos;
  assert(P({ dif: "facil", restanteMs: 10000, totalMs: 10000, racha: 1 }) > P({ dif: "facil", restanteMs: 0, totalMs: 10000, racha: 1 }));
  assert(P({ dif: "dificil", restanteMs: 0, totalMs: 0, racha: 1 }) > P({ dif: "facil", restanteMs: 0, totalMs: 0, racha: 1 }));
  assert.strictEqual(P({ dif: "facil", restanteMs: 0, totalMs: 0, racha: 99 }), 100 + 50);
});
prueba("selección: sin repetir dentro de la partida y prefiere no vistas", () => {
  for (let i = 0; i < 30; i++) { const e = M.trivia.crear({ dificultad: "mixta", preguntas: 15 }, [{ id: "a", nombre: "A" }], env); assert.strictEqual(new Set(e.preguntas.map(q => q.id)).size, e.preguntas.length); }
  const vistas = BANCO.trivia.preguntas.slice(0, 30).map(q => q.id);
  const e = M.trivia.crear({ dificultad: "mixta", preguntas: 10, vistas }, [{ id: "a", nombre: "A" }], env);
  assert(e.preguntas.filter(q => vistas.includes(q.id)).length < 10);
});
prueba("la respuesta correcta no está en la vista hasta revelar; el tiempo agotado cierra la pregunta", () => {
  const e = M.trivia.crear({ dificultad: "facil", preguntas: 5, segundos: 10, online: true }, J2, env);
  assert.strictEqual(M.trivia.vista(e, "a", env).correcta, null);
  t += 11000; M.trivia.tick(e, env); const v = M.trivia.vista(e, "a", env); assert.strictEqual(v.fase, "revelado"); assert(v.correcta >= 0);
  assert.deepStrictEqual(Object.values(v.revelado.porJugador).map(x => x.ganado), [0, 0]);
});
prueba("turnos: solo responde quien tiene el turno; no se puede responder dos veces", () => {
  const e = M.trivia.crear({ dificultad: "facil", preguntas: 4, formato: "turnos", segundos: 0 }, J2, env);
  assert(!M.trivia.accion(e, "b", { tipo: "responder", opcion: 0 }, env).ok);
  assert(M.trivia.accion(e, "a", { tipo: "responder", opcion: 0 }, env).ok); assert(!M.trivia.accion(e, "a", { tipo: "responder", opcion: 1 }, env).ok);
});
prueba("opción fuera de rango o texto raro se rechaza", () => { const e = M.trivia.crear({ dificultad: "facil" }, J2, env); for (const o of [-1, 4, "1", null, 1.5]) assert(!M.trivia.accion(e, "a", { tipo: "responder", opcion: o }, env).ok); });

console.log("Ordena");
prueba("puntos: perfecto > parcial; pistas e intentos restan; nunca negativo", () => {
  const P = M.ordena.reglas.puntos, b = { total: 4, nivel: 1, segundos: 10, limite: 90, pistas: 0, intentosFallidos: 0 };
  assert(P({ ...b, correctas: 4 }) > P({ ...b, correctas: 2 })); assert(P({ ...b, correctas: 4, pistas: 2 }) === P({ ...b, correctas: 4 }) - 30); assert(P({ ...b, correctas: 0, pistas: 5, intentosFallidos: 3 }) >= 0);
});
prueba("la baraja inicial nunca es la solución y no se aceptan órdenes inventados", () => {
  for (let i = 0; i < 40; i++) { const e = M.ordena.crear({ nivel: 1, rondas: 1 }, J2, env); const sol = e.ronda.set.eventos.map(x => x.id); assert(!e.ronda.baraja.every((x, k) => x === sol[k])); }
  const e = M.ordena.crear({ nivel: 1, rondas: 1 }, J2, env); assert(!M.ordena.accion(e, "a", { tipo: "comprobar", orden: ["x", "y"] }, env).ok);
  const sol = e.ronda.set.eventos.map(x => x.id); assert(!M.ordena.accion(e, "a", { tipo: "comprobar", orden: [sol[0], sol[0], sol[1], sol[2]] }, env).ok);
});
prueba("3 intentos fallidos terminan al jugador; la solución no está en la vista hasta revelar", () => {
  const e = M.ordena.crear({ nivel: 1, rondas: 1, online: true }, J2, env); const sol = e.ronda.set.eventos.map(x => x.id), mal = sol.slice().reverse();
  for (let i = 0; i < 3; i++) M.ordena.accion(e, "a", { tipo: "comprobar", orden: mal }, env);
  assert(M.ordena.vista(e, "a", env).mio.terminado); assert(!JSON.stringify(M.ordena.vista(e, "a", env)).includes("Grito de Dolores") || M.ordena.vista(e, "a", env).ronda.cartas.every(c => c.fecha === null));
});
prueba("empate en puntos → ronda de desempate solo para los empatados", () => {
  const e = M.ordena.crear({ nivel: 1, rondas: 1, online: true }, J2, env); e.anfitrion = "a"; const sol = e.ronda.set.eventos.map(x => x.id);
  M.ordena.accion(e, "a", { tipo: "comprobar", orden: sol }, env); M.ordena.accion(e, "b", { tipo: "comprobar", orden: sol }, env); // mismos puntos (mismo tiempo simulado)
  assert.strictEqual(e.fase, "revelado"); assert(!M.ordena.accion(e, "b", { tipo: "siguiente" }, env).ok); M.ordena.accion(e, "a", { tipo: "siguiente" }, env);
  assert(e.desempate && e.fase === "jugando" && e.totalRondas === 2);
});

console.log("¿Quién soy?");
prueba("más pistas = menos puntos; fallos restan; mínimo 10", () => { const P = M.quiensoy.reglas.puntos; assert(P(1, "facil", 0) > P(3, "facil", 0)); assert(P(1, "facil", 2) === 80); assert(P(5, "facil", 3) >= 10); });
prueba("acepta alias sin acentos/mayúsculas y un error de tecleo en nombres largos; rechaza lo demás", () => {
  const pj = BANCO.quiensoy.personajes.find(p => p.id === "hidalgo"), C = M.quiensoy.reglas.coincide;
  assert(C("MIGUEL HIDALGO", pj)); assert(C("hidalgo", pj)); assert(C("miguel hidalgoo", pj)); assert(!C("morelos", pj)); assert(!C("", pj)); assert(!C("a".repeat(200), pj));
});
prueba("en línea las pistas las libera el servidor y el nombre no está en la vista", () => {
  const e = M.quiensoy.crear({ dificultad: "facil", rondas: 3, online: true, segundosPista: 10 }, J2, env);
  assert(!JSON.stringify(M.quiensoy.vista(e, "a", env)).includes(e.ronda.pj.nombre)); t += 10100; M.quiensoy.tick(e, env); assert.strictEqual(M.quiensoy.vista(e, "a", env).ronda.pista, 2);
  assert(!M.quiensoy.accion(e, "a", { tipo: "pista" }, env).ok);
});
prueba("3 fallos agotan al jugador", () => { const e = M.quiensoy.crear({ dificultad: "facil", rondas: 3, online: true }, J2, env); for (let i = 0; i < 3; i++) M.quiensoy.accion(e, "a", { tipo: "responder", texto: "nadie" + i }, env); assert(M.quiensoy.vista(e, "a", env).mio.agotado); assert(!M.quiensoy.accion(e, "a", { tipo: "responder", texto: "x" }, env).ok); });

console.log("Sopa");
prueba("tableros de todas las dificultades y temas contienen todas sus palabras en línea recta", () => {
  for (const d of ["facil", "intermedia", "dificil"]) for (const c of ["personajes", "lugares", "conceptos", "mezcla"]) for (let k = 0; k < 15; k++) {
    const e = M.sopa.crear({ dificultad: d, categoria: c }, [{ id: "a", nombre: "A" }], env); assert.strictEqual(e.palabras.length, BANCO.sopa.niveles[d].palabras);
    e.colocadas.forEach(p => { const ln = M.sopa.reglas.linea(e.grid, p.r, p.c, p.r + p.dr * (p.t.length - 1), p.c + p.dc * (p.t.length - 1)); assert.strictEqual(ln.texto, p.t); });
  }
});
prueba("puntos de una palabra solo una vez por tablero; selección al revés vale; líneas torcidas no", () => {
  const e = M.sopa.crear({ dificultad: "facil", online: true }, J2, env), p = e.colocadas[0], f = p.t.length - 1;
  assert.strictEqual(M.sopa.accion(e, "a", { tipo: "seleccionar", r1: p.r + p.dr * f, c1: p.c + p.dc * f, r2: p.r, c2: p.c }, env).resultado, "ok");
  const pts = e.jugadores[0].puntos;
  assert.strictEqual(M.sopa.accion(e, "a", { tipo: "seleccionar", r1: p.r, c1: p.c, r2: p.r + p.dr * f, c2: p.c + p.dc * f }, env).resultado, "repetida");
  assert.strictEqual(M.sopa.accion(e, "b", { tipo: "seleccionar", r1: p.r, c1: p.c, r2: p.r + p.dr * f, c2: p.c + p.dc * f }, env).resultado, "repetida");
  assert.strictEqual(e.jugadores[0].puntos, pts); assert.strictEqual(e.jugadores[1].puntos, 0);
  assert(!M.sopa.accion(e, "a", { tipo: "seleccionar", r1: 0, c1: 0, r2: 1, c2: 3 }, env).ok);
  assert(!M.sopa.accion(e, "a", { tipo: "seleccionar", r1: -1, c1: 0, r2: 1, c2: 3 }, env).ok);
});
prueba("la vista no revela dónde están las palabras; las pistas son por jugador y cuestan puntos", () => {
  const e = M.sopa.crear({ dificultad: "facil", online: true, pistas: true }, J2, env); const v = M.sopa.vista(e, "a", env);
  assert(!("colocadas" in v)); assert(v.palabras.every(w => !("t" in w)));
  assert(M.sopa.accion(e, "a", { tipo: "pista" }, env).ok); assert.strictEqual(M.sopa.vista(e, "b", env).mio.pistas.length, 0);
});
prueba("el tiempo máximo termina la partida", () => { const e = M.sopa.crear({ dificultad: "facil", online: true, limite: 180 }, J2, env); t += 181000; M.sopa.tick(e, env); assert.strictEqual(e.fase, "fin"); });

console.log("Misterio");
prueba("no se responde sin examinar las pistas requeridas ni se repiten puntos de documentos", () => {
  const e = M.misterio.crear({ caso: "corregidora", online: true, modo: "comp" }, J2, env);
  assert(!M.misterio.accion(e, "a", { tipo: "responder", opcion: 0 }, env).ok);
  assert(M.misterio.accion(e, "a", { tipo: "examinar", doc: "c1a" }, env).ok); const p = e.jugadores[0].puntos; assert(!M.misterio.accion(e, "a", { tipo: "examinar", doc: "c1a" }, env).ok); assert.strictEqual(e.jugadores[0].puntos, p);
  assert(!M.misterio.accion(e, "a", { tipo: "examinar", doc: "t1a" }, env).ok);                // un documento de otro caso/capítulo
});
prueba("los documentos sin examinar no envían su texto ni la respuesta", () => {
  const e = M.misterio.crear({ caso: "corregidora", online: true, modo: "coop" }, J2, env); const s = JSON.stringify(M.misterio.vista(e, "a", env));
  assert(!s.includes("Pliego sin firma\",\"examinado\":false,\"por\":null,\"tipo\":\"")); assert(!s.includes("Han descubierto")); assert(!s.includes("correcta"));
});
prueba("cooperativo: el equipo comparte progreso y la votación decide el final (empate → anfitrión)", () => {
  const e = M.misterio.crear({ caso: "corregidora", online: true, modo: "coop" }, J2, env); e.anfitrion = "a"; const caso = BANCO.misterio.casos[0];
  caso.capitulos.forEach((C, i) => { C.docs.forEach((d, k) => M.misterio.accion(e, k % 2 ? "b" : "a", { tipo: "examinar", doc: d.id }, env)); const q = C.pregunta; M.misterio.accion(e, "b", q.tipo === "texto" ? { tipo: "responder", texto: q.respuestas[0] } : { tipo: "responder", opcion: q.correcta }, env); M.misterio.accion(e, "a", { tipo: "continuar" }, env); });
  M.misterio.accion(e, "a", { tipo: "decidir", opcion: 1 }, env); M.misterio.accion(e, "b", { tipo: "decidir", opcion: 2 }, env);
  assert.strictEqual(e.fase, "fin"); assert.strictEqual(e.fin.finales[0].id, "escribano"); assert(e.fin.coop && e.fin.equipoPuntos > 0);
});
prueba("modo competitivo: cada jugador tiene su propio progreso", () => {
  const e = M.misterio.crear({ caso: "corregidora", online: true, modo: "comp" }, J2, env); M.misterio.accion(e, "a", { tipo: "examinar", doc: "c1a" }, env);
  assert.strictEqual(M.misterio.vista(e, "b", env).inventario.length, 0); assert.strictEqual(M.misterio.vista(e, "a", env).inventario.length, 1);
});
prueba("un caso solo cooperativo fuerza el modo cooperativo", () => { const e = M.misterio.crear({ caso: "trigarante", modo: "comp", online: true }, J2, env); assert.strictEqual(e.params.modo, "coop"); });

console.log("\n" + ok + " pruebas correctas" + (process.exitCode ? " — HAY FALLOS" : ""));
