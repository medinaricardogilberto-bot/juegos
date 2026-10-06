/* ambiente.js — cielo, papel picado y cohetes (tomado de tus juegos) */
const Ambiente = {
  iniciar() {
    const cielo = document.getElementById("cielo");
    const picado = document.getElementById("picado");
    for (let i = 0; i < 18; i++) picado.appendChild(document.createElement("span"));
    for (let i = 0; i < 36; i++) {
      const e = document.createElement("i");
      e.className = "estrella";
      e.style.cssText = `--x:${(Math.random()*100).toFixed(1)}%;--y:${(Math.random()*55).toFixed(1)}%;` +
        `--z:${(1+Math.random()*2).toFixed(1)}px;--d:${(2.5+Math.random()*3).toFixed(1)}s;--r:${(-Math.random()*4).toFixed(1)}s`;
      cielo.appendChild(e);
    }
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (let i = 0; i < 5; i++) {
        const c = document.createElement("i");
        c.className = "cohete";
        c.style.cssText = `--x:${(8+Math.random()*84).toFixed(1)}%;--d:${(4+Math.random()*3).toFixed(1)}s;--r:${(-Math.random()*6).toFixed(1)}s`;
        cielo.appendChild(c);
      }
    }
  }
};
