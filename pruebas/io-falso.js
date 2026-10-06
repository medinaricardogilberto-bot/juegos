// pruebas/io-falso.js — simula Socket.IO en memoria para probar server/salas.js sin red.
// OJO: prueba la LÓGICA de salas y motores; no sustituye una prueba con navegadores y Socket.IO reales.
const { EventEmitter } = require("events");
function crearIo() {
  const sockets = new Map(), salas = new Map();
  const io = {
    engine: { clientsCount: 0 }, _handlers: {},
    on(ev, fn) { this._handlers[ev] = fn; },
    to(dest) {
      return { emit: (ev, datos) => {
        const objetivos = sockets.has(dest) ? [sockets.get(dest)] : [...(salas.get(dest) || [])].map(id => sockets.get(id)).filter(Boolean);
        objetivos.forEach(s => s._recibir(ev, JSON.parse(JSON.stringify(datos === undefined ? null : datos))));
      } };
    },
    emit(ev, datos) { sockets.forEach(s => s._recibir(ev, datos)); },
    cliente() {
      const id = "s" + (sockets.size + 1) + Math.random().toString(36).slice(2, 6);
      const h = new EventEmitter(); const recibidos = [];
      const s = {
        id, data: {}, _h: {}, recibidos,
        on(ev, fn) { this._h[ev] = fn; },
        join(c) { (salas.get(c) || salas.set(c, new Set()).get(c)).add(id); },
        leave(c) { salas.get(c) && salas.get(c).delete(id); },
        _recibir(ev, d) { recibidos.push([ev, d]); h.emit(ev, d); if (this.alRecibir) this.alRecibir(ev, d); },
        // lado "navegador"
        emitir(ev, datos) { return new Promise(res => { const f = this._h[ev]; if (!f) return res({ ok: false, error: "sin manejador " + ev }); f(JSON.parse(JSON.stringify(datos ?? null)), res); }); },
        ultima(ev) { for (let i = recibidos.length - 1; i >= 0; i--) if (recibidos[i][0] === ev) return recibidos[i][1]; return null; },
        cuantos(ev) { return recibidos.filter(r => r[0] === ev).length; },
        cerrar() { sockets.delete(id); if (this._h.disconnect) this._h.disconnect(); }
      };
      sockets.set(id, s); io.engine.clientsCount++;
      io._handlers.connection(s);
      return s;
    }
  };
  return io;
}
module.exports = { crearIo };
