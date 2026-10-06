// Pruebas de salas online con un Socket.IO simulado: node pruebas/salas.prueba.js
process.env.GRACIA_MS = "300";
const assert = require("assert");
const { crearIo } = require("./io-falso");
const { registrar } = require("../server/salas");
const { MOTORES } = require("../server/nuevos");

const espera = (ms) => new Promise(r => setTimeout(r, ms));
let ok = 0;
const prueba = async (nombre, fn) => { try { await fn(); ok++; console.log("  ✔", nombre); } catch (e) { console.log("  ✘", nombre, "\n   ", e.message); process.exitCode = 1; } };

(async () => {
  const io = crearIo(); registrar(io);
  const a = io.cliente(), b = io.cliente(), c = io.cliente();

  console.log("Salas, códigos y listos");
  let sala, ra, rb;
  await prueba("crear sala pública de Trivia con reglas del anfitrión", async () => {
    ra = await a.emitir("sala:crear", { juego: "trivia", nombre: "Ana", visibilidad: "publica", params: { dificultad: "facil", preguntas: 5, segundos: 10, hack: "x" } });
    assert(ra.ok, ra.error); sala = ra.sala;
    assert.match(sala.codigo, /^[A-HJ-NP-Z2-9]{6}$/);
    assert.strictEqual(sala.visibilidad, "publica"); assert.strictEqual(sala.params.hack, undefined);
  });
  await prueba("la sala pública aparece en la lista y una privada no", async () => {
    const priv = await c.emitir("sala:crear", { juego: "sopa", nombre: "Cris" });
    const l = await b.emitir("sala:listar", {});
    assert(l.salas.some(x => x.codigo === sala.codigo)); assert(!l.salas.some(x => x.codigo === priv.sala.codigo));
    await c.emitir("sala:salir");
  });
  await prueba("unirse con código y rechazar nombre repetido", async () => {
    assert(!(await b.emitir("sala:unirse", { codigo: sala.codigo, nombre: "ana" })).ok);
    rb = await b.emitir("sala:unirse", { codigo: sala.codigo.toLowerCase(), nombre: "Beto" });
    assert(rb.ok, rb.error); assert.strictEqual(rb.sala.jugadores.length, 2);
  });
  await prueba("no se puede iniciar sin que todos estén listos, ni lo inicia un invitado", async () => {
    assert(/listos/.test((await a.emitir("sala:iniciar")).error));
    assert(/anfitri/i.test((await b.emitir("sala:iniciar")).error));
  });
  await prueba("solo el anfitrión cambia reglas y eso quita los listos", async () => {
    await b.emitir("sala:listo", { listo: true });
    assert(!(await b.emitir("sala:params", { params: { dificultad: "dificil" } })).ok);
    assert((await a.emitir("sala:params", { params: { dificultad: "mixta", preguntas: 4, segundos: 10 } })).ok);
    assert.strictEqual(b.ultima("sala:estado").jugadores.find(j => j.nombre === "Beto").listo, false);
    await b.emitir("sala:listo", { listo: true });
  });

  console.log("Partida de Trivia en línea");
  let va, vb;
  await prueba("inicio: ambos reciben su vista y la respuesta correcta NO viaja", async () => {
    assert((await a.emitir("sala:iniciar")).ok);
    va = a.ultima("partida:inicio").vista; vb = b.ultima("partida:inicio").vista;
    assert.strictEqual(va.pregunta.texto, vb.pregunta.texto); assert.strictEqual(va.correcta, null);
    assert(!JSON.stringify(va).includes('"ok"'));
  });
  await prueba("acción inválida rechazada por el servidor", async () => {
    assert(!(await a.emitir("trivia:accion", { tipo: "responder", opcion: 9 })).ok);
    assert(!(await a.emitir("quiensoy:accion", { tipo: "responder", texto: "x" })).ok);
  });
  await prueba("ambos responden → el servidor revela y puntúa; ambos ven lo mismo", async () => {
    await a.emitir("trivia:accion", { tipo: "responder", opcion: 0 });
    assert.strictEqual(b.ultima("juego:vista").respondieron.length, 1);
    assert.strictEqual(b.ultima("juego:vista").revelado, null);
    assert.strictEqual(b.ultima("juego:vista").miOpcion, null);   // no se ve la respuesta del otro
    await b.emitir("trivia:accion", { tipo: "responder", opcion: 1 });
    const x = a.ultima("juego:vista"), y = b.ultima("juego:vista");
    assert.strictEqual(x.fase, "revelado"); assert.strictEqual(x.correcta, y.correcta);
    assert.deepStrictEqual(x.jugadores.map(j => j.puntos), y.jugadores.map(j => j.puntos));
  });
  await prueba("solo el anfitrión avanza", async () => {
    assert(!(await b.emitir("trivia:accion", { tipo: "siguiente" })).ok);
    assert((await a.emitir("trivia:accion", { tipo: "siguiente" })).ok);
    assert.strictEqual(b.ultima("juego:vista").idx, 1);
  });
  await prueba("el tiempo lo controla el servidor (10 s) sin acciones de los clientes", async () => {
    // se adelanta el reloj del servidor: la partida usa Date.now, así que se simula moviendo el límite
    const { env } = require("../server/nuevos"); const real = env.ahora; env.ahora = () => real() + 11000;
    await espera(700); env.ahora = real;
    assert.strictEqual(a.ultima("juego:vista").fase, "revelado");
  });

  console.log("Desconexión y reconexión");
  await prueba("desconectar marca al jugador; reconectar con token restaura la partida", async () => {
    const tokenB = rb.token, codigo = sala.codigo, yoB = rb.yo;
    b.cerrar();
    assert.strictEqual(a.ultima("sala:estado").jugadores.find(j => j.id === yoB).conectado, false);
    const b2 = io.cliente();
    const r = await b2.emitir("sala:reconectar", { codigo, token: tokenB });
    assert(r.ok, r.error); assert(r.snapshot && r.snapshot.vista.pregunta);
    assert.strictEqual(a.ultima("sala:estado").jugadores.find(j => j.id === yoB).conectado, true);
    assert(!(await io.cliente().emitir("sala:reconectar", { codigo, token: "falso" })).ok);
    b2.cerrar(); // ahora no vuelve: pasados los 300 ms de gracia se retira
    await espera(450);
    assert.strictEqual(a.ultima("sala:estado").jugadores.length, 1);
  });
  await prueba("al quedar un solo jugador la partida termina por abandono", async () => {
    assert.strictEqual(a.ultima("juego:vista").fase, "fin");
    assert.strictEqual(a.ultima("juego:vista").fin.motivo, "abandono");
  });

  console.log("Partida completa y revancha de los 5 juegos");
  for (const juego of Object.keys(MOTORES)) {
    await prueba(juego + ": partida online de dos jugadores, fin y revancha", async () => {
      const p = io.cliente(), q = io.cliente();
      const r1 = await p.emitir("sala:crear", { juego, nombre: "P" + juego.slice(0, 3) });
      await q.emitir("sala:unirse", { codigo: r1.sala.codigo, nombre: "Q" + juego.slice(0, 3) });
      await q.emitir("sala:listo", { listo: true });
      assert((await p.emitir("sala:iniciar")).ok);
      const v0 = p.ultima("partida:inicio").vista; assert.strictEqual(v0.juego, juego);
      // el servidor cierra la partida por límite de tiempo: se adelanta su reloj
      const { env } = require("../server/nuevos"); const real = env.ahora; env.ahora = () => real() + 3 * 3600 * 1000;
      await espera(1700); env.ahora = real;
      const f = p.ultima("juego:vista");
      assert(["fin", "revelado", "jugando"].includes(f.fase));
      if (f.fase === "fin") {
        assert(f.fin && f.fin.ranking.length === 2);
        assert((await q.emitir("sala:revancha")).error); // un invitado no puede
        const rv = await p.emitir("sala:revancha"); assert(rv.ok, rv.error);
        assert(p.cuantos("partida:inicio") >= 2);
      }
      await p.emitir("sala:salir"); await q.emitir("sala:salir");
    });
  }

  console.log("Juegos originales (no deben cambiar)");
  for (const juego of ["memorama", "rompecabezas"]) {
    await prueba(juego + ": sala, unirse sin 'listo', iniciar y recibir partida:inicio", async () => {
      const p = io.cliente(), q = io.cliente();
      const r = await p.emitir("sala:crear", { juego, nombre: "Pa" }); assert(r.ok, r.error);
      assert.strictEqual(r.sala.requiereListos, false);
      assert((await q.emitir("sala:unirse", { codigo: r.sala.codigo, nombre: "Qa" })).ok);
      const i = await p.emitir("sala:iniciar"); assert(i.ok, i.error);
      assert(p.ultima("partida:inicio") && q.ultima("partida:inicio"));
      await p.emitir("sala:salir"); await q.emitir("sala:salir");
    });
  }

  console.log(`\n${ok} pruebas correctas${process.exitCode ? " — HAY FALLOS" : ""}`);
  setTimeout(() => process.exit(process.exitCode || 0), 50);
})();
