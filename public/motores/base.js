/* motores/base.js — utilidades comunes de los motores de juego.
   Los motores son funciones puras sobre un "estado" serializable. Se ejecutan igual en el navegador
   (un jugador y multijugador local) y en el servidor (multijugador online), que es el árbitro oficial.
   env = { ahora(): ms, azar(n): entero en [0, n), banco: contenido educativo } — se inyecta para poder probar con reloj falso. */
(function (raiz, fabrica) {
  const B = fabrica();
  if (typeof module === "object" && module.exports) module.exports = B;
  else { raiz.Motores = raiz.Motores || {}; raiz.Motores.base = B; }
})(typeof self !== "undefined" ? self : this, function () {
  const Base = {
    AVATARES: ["🦅", "🔔", "🌵", "🎺"],

    envNavegador(banco) {
      return { ahora: () => Date.now(), azar: (n) => Math.floor(Math.random() * n), banco };
    },

    clamp(n, min, max, def) { n = Number(n); return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def; },
    entre(valor, permitidos, def) { return permitidos.includes(valor) ? valor : def; },

    barajar(lista, env) {
      const a = lista.slice();
      for (let i = a.length - 1; i > 0; i--) { const j = env.azar(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
      return a;
    },

    // Para comparar respuestas escritas: sin acentos, sin mayúsculas, sin signos
    normalizar(t) {
      return String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
        .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    },

    distancia(a, b) { // Levenshtein
      if (a === b) return 0;
      const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
      for (let i = 1; i <= a.length; i++) {
        let diag = prev[0]; prev[0] = i;
        for (let j = 1; j <= b.length; j++) {
          const tmp = prev[j];
          prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
          diag = tmp;
        }
      }
      return prev[b.length];
    },

    nuevo(juego, params, jugadores, env) {
      return {
        juego, rev: 0, fase: "", params, anfitrion: null, fin: null, pausa: null, t: {}, inicio: env.ahora(),
        jugadores: jugadores.map((j, i) => ({
          id: j.id, nombre: j.nombre, avatar: j.avatar || Base.AVATARES[i % 4],
          puntos: 0, conectado: true, retirado: false
        }))
      };
    },

    cambio(e) { e.rev++; },
    jug(e, id) { return e.jugadores.find(j => j.id === id) || null; },
    esperados(e) { return e.jugadores.filter(j => !j.retirado && j.conectado); },

    // Solo el anfitrión controla las transiciones en línea; en el mismo dispositivo cualquiera puede.
    puedeAvanzar(e, id) { return !e.params.online || id === e.anfitrion; },

    conexion(e, id, conectado) {
      const j = Base.jug(e, id);
      if (j && j.conectado !== conectado) { j.conectado = conectado; Base.cambio(e); }
    },
    retirar(e, id) {
      const j = Base.jug(e, id);
      if (j && !j.retirado) { j.retirado = true; j.conectado = false; Base.cambio(e); }
    },

    // Orden final: más puntos primero; "desempate" (menor es mejor) decide los empates
    ranking(e, desempate) {
      const lista = e.jugadores.map(j => ({ id: j.id, nombre: j.nombre, avatar: j.avatar, puntos: j.puntos, desempate: desempate ? desempate(j) : 0 }));
      return lista.sort((a, b) => b.puntos - a.puntos || a.desempate - b.desempate);
    },
    ganadores(ranking) {
      if (!ranking.length) return [];
      const p = ranking[0];
      return ranking.filter(r => r.puntos === p.puntos && r.desempate === p.desempate).map(r => r.id);
    },

    publicos(e, extra) {
      return e.jugadores.map(j => Object.assign({ id: j.id, nombre: j.nombre, avatar: j.avatar, puntos: j.puntos, conectado: j.conectado, retirado: j.retirado }, extra ? extra(j) : {}));
    },

    // Quita un jugador y devuelve cuántos quedan activos
    activosRestantes(e) { return e.jugadores.filter(j => !j.retirado).length; }
  };
  return Base;
});
