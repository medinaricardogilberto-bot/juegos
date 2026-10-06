/* app.js — navegación entre pantallas: menú → modo → juego */
const App = {
  juego: null,
  multi: false,
  juegos: {
    rompecabezas: { icono: "🧩", nombre: "Rompecabezas", modulo: "Rompecabezas" },
    memorama:     { icono: "🃏", nombre: "Memorama", modulo: "Memorama" },
    // Juegos nuevos: un jugador y multijugador local (mismo dispositivo) funcionan sin servidor
    trivia:       { icono: "❓", nombre: "Trivia histórica", modulo: "Trivia", nuevo: true },
    ordena:       { icono: "⏳", nombre: "Ordena la historia", modulo: "OrdenaHistoria", nuevo: true },
    quiensoy:     { icono: "🎭", nombre: "¿Quién soy?", modulo: "QuienSoy", nuevo: true },
    sopa:         { icono: "🔤", nombre: "Sopa de letras", modulo: "SopaLetras", nuevo: true },
    misterio:     { icono: "🕯️", nombre: "El misterio histórico", modulo: "Misterio", nuevo: true }
  },
  textosModo: {
    original: { solo: "Sin conexión, como el juego original.", local: "Varias personas en el mismo Wi-Fi.", online: "Jugadores en casas distintas." },
    nuevo:    { solo: "Sin conexión. Guarda tus récords, experiencia e insignias.", local: "De 2 a 4 personas en este mismo dispositivo, por turnos.",
                online: "Salas con código de invitación para jugar a distancia." }
  },

  mostrar(id) {
    document.querySelectorAll(".pantalla").forEach(p => p.classList.toggle("activa", p.id === id));
    window.scrollTo(0, 0);
  },

  elegirJuego(clave) {
    this.juego = clave;
    const j = this.juegos[clave];
    document.getElementById("modo-titulo").textContent = j.icono + " " + j.nombre;
    document.getElementById("aviso").textContent = "";
    const textos = this.textosModo[j.nuevo ? "nuevo" : "original"];
    ["solo", "local", "online"].forEach(m => { document.getElementById("modo-desc-" + m).textContent = textos[m]; });
    this.mostrar("pantalla-modo");
  },

  elegirModo(modo) {
    const aviso = document.getElementById("aviso");
    aviso.textContent = "";
    if (modo === "solo") { this.jugar(); return; }
    if (modo === "local" && this.juegos[this.juego].nuevo) { this.jugar("local"); return; }
    if (!Red.conectado) {
      aviso.textContent = Red.socket
        ? (Red.remoto ? "El servidor de salas está despertando (puede tardar hasta un minuto). Inténtalo de nuevo en unos instantes." : "Sin conexión con el servidor. Se reintentará automáticamente.")
        : "El modo en línea necesita el servidor de salas. Puedes jugar sin conexión en los modos «Un jugador» y «Mismo dispositivo».";
      return;
    }
    Sala.abrir(modo, this.juego);
  },

  // (las constantes globales de cada script no viven en window, por eso se nombran aquí)
  modulo() {
    const m = { Rompecabezas: () => Rompecabezas, Memorama: () => Memorama, Trivia: () => Trivia, OrdenaHistoria: () => OrdenaHistoria,
                QuienSoy: () => QuienSoy, SopaLetras: () => SopaLetras, Misterio: () => Misterio };
    return m[this.juegos[this.juego].modulo]();
  },

  jugar(modo) {
    this.multi = false;
    this.mostrar("pantalla-juego");            // primero se muestra, para que el juego pueda medir su tamaño
    if (this.juegos[this.juego].nuevo) this.modulo().montar(document.getElementById("juego-raiz"), { modo: modo || "solo" });
    else this.modulo().montar(document.getElementById("juego-raiz"));
  },

  toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg; t.classList.add("visible");
    clearTimeout(this._toast);
    this._toast = setTimeout(() => t.classList.remove("visible"), 4500);
  },

  // Volvimos a conectar con la sala (recarga de página o caída de red): se redibuja con el estado real del servidor
  reanudar(res) {
    Sala.yo = res.yo; Sala.datos = res.sala;
    if (this.multi) { this.modulo().desmontar(); document.getElementById("juego-raiz").innerHTML = ""; this.multi = false; }
    if (res.snapshot) return this.iniciarMulti(res.snapshot);
    Sala.pintar(res.sala); Sala.vista("lobby"); this.mostrar("pantalla-sala");
  },

  // La sala ya no existe o nos retiraron
  expulsado(msg) {
    if (this.multi) { this.modulo().desmontar(); document.getElementById("juego-raiz").innerHTML = ""; this.multi = false; }
    Sala.yo = null; Sala.datos = null; Sala.vista("entrada");
    this.mostrar("pantalla-menu"); this.toast(msg);
  },

  // Multijugador: el servidor avisa que la partida comenzó
  iniciarMulti(datos) {
    this.juego = datos.juego; this.multi = true;
    if (this.juegos[datos.juego] && this.juegos[datos.juego].nuevo) this.modulo().desmontar(); // revancha: se vuelve a montar limpio
    this.mostrar("pantalla-juego");
    this.modulo().montar(document.getElementById("juego-raiz"), {
      multi: { socket: Red.socket, yo: Sala.yo, esAnfitrion: () => !!Sala.datos && Sala.datos.anfitrion === Sala.yo },
      inicio: datos
    });
  },

  // El anfitrión pidió jugar otra vez: todos vuelven a la sala de espera
  cerrarPartida() {
    if (!this.multi) return;
    this.modulo().desmontar();
    document.getElementById("juego-raiz").innerHTML = "";
    this.multi = false;
    if (Sala.datos) { Sala.pintar(Sala.datos); Sala.vista("lobby"); }
    this.mostrar("pantalla-sala");
  },

  salirJuego() {
    this.modulo().desmontar();
    document.getElementById("juego-raiz").innerHTML = "";
    if (this.multi) { this.multi = false; Sala.salir(); }
    this.mostrar("pantalla-menu");
    this.pintarProgreso();
  },

  pintarProgreso() { Progreso.pintarResumen(document.getElementById("progreso-menu")); },

  iniciar() {
    document.querySelectorAll("[data-juego]").forEach(b => b.onclick = () => this.elegirJuego(b.dataset.juego));
    document.querySelectorAll("[data-modo]").forEach(b => b.onclick = () => this.elegirModo(b.dataset.modo));
    document.getElementById("volver-menu").onclick = () => this.mostrar("pantalla-menu");
    document.getElementById("volver-juego").onclick = () => {
      if (this.multi && !confirm("¿Abandonar la partida? Saldrás de la sala.")) return;
      this.salirJuego();
    };
    Ambiente.iniciar();
    this.pintarProgreso();
    Sala.iniciar();
    Red.iniciar().then(() => Sala.enlazar());
  }
};
document.addEventListener("DOMContentLoaded", () => App.iniciar());
