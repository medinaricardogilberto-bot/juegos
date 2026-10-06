/* campos.js — opciones e instrucciones de cada juego nuevo.
   Las usan igual la pantalla de configuración (un jugador / mismo dispositivo) y la sala en línea,
   así las reglas se describen en un solo lugar. */
const Campos = (() => {
  const op = (valor, texto, ayuda) => ({ valor, texto, ayuda });
  const dificultad = (extra) => ({ id: "dificultad", etiqueta: "Dificultad", opciones: [
    ...(extra || []), op("facil", "Fácil"), op("intermedia", "Intermedia"), op("dificil", "Difícil")] });
  const cats = Object.entries({ todas: "Todas", personajes: "Personajes", fechas: "Fechas", acontecimientos: "Acontecimientos", lugares: "Lugares", documentos: "Documentos" })
    .map(([v, t]) => op(v, t));
  const bancoSopa = () => (Datos.sopa ? Datos.sopa.categorias : { mezcla: "Mezcla" });

  return {
    trivia: {
      instrucciones: [
        "Lee la pregunta y elige una de las cuatro respuestas.",
        "Responder rápido y encadenar aciertos da más puntos: base por dificultad, hasta +50 % por rapidez y +10 por cada acierto seguido (máx. +50).",
        "Después de cada respuesta verás una explicación histórica.",
        "En multijugador local se juega por turnos en el mismo dispositivo. En línea todos contestan a la vez la misma pregunta."
      ],
      campos(modo) {
        const c = [
          dificultad([op("mixta", "Mixta", "De fácil a difícil, en orden creciente.")]),
          { id: "categoria", etiqueta: "Categoría", opciones: cats },
          { id: "preguntas", etiqueta: "Preguntas", porDefecto: 10, opciones: [op(5, "5"), op(10, "10"), op(15, "15")] }
        ];
        c[0].porDefecto = "mixta";
        if (modo === "online") c.push({ id: "segundos", etiqueta: "Tiempo por pregunta", porDefecto: 20, opciones: [op(10, "10 s"), op(15, "15 s"), op(20, "20 s"), op(30, "30 s"), op(45, "45 s")] });
        else c.push({ id: "segundos", etiqueta: "Tiempo por pregunta", porDefecto: 20, opciones: [op(0, "Sin límite"), op(15, "15 s"), op(20, "20 s"), op(30, "30 s"), op(45, "45 s")] });
        return c;
      }
    },
    ordena: {
      instrucciones: [
        "Arrastra las tarjetas (o usa los botones ▲ ▼, o las teclas ↑ ↓ con la tarjeta enfocada) para ponerlas en orden cronológico, de la más antigua a la más reciente.",
        "Pulsa «Comprobar»: verás qué tarjetas están en su lugar. Tienes 3 intentos por ronda; cada intento fallido resta 10 puntos.",
        "La pista muestra la fecha de una tarjeta, pero resta 15 puntos.",
        "Ganas más puntos con más aciertos, mayor nivel y menos tiempo. En línea todos resuelven la misma secuencia; si hay empate se juega una ronda de desempate."
      ],
      campos(modo) {
        const c = [
          { id: "nivel", etiqueta: "Nivel", porDefecto: "progresivo", opciones: [op("progresivo", "Progresivo", "Una secuencia de cada nivel, de menos a más tarjetas."), op(1, "Nivel 1", "4 tarjetas."), op(2, "Nivel 2", "5 tarjetas."), op(3, "Nivel 3", "6 tarjetas.")] },
          { id: "rondas", etiqueta: "Rondas", porDefecto: 3, opciones: [op(1, "1"), op(2, "2"), op(3, "3")] },
          { id: "pistas", etiqueta: "Pistas", porDefecto: true, opciones: [op(true, "Con pistas (−15)"), op(false, "Sin pistas")] }
        ];
        return c;
      }
    },
    quiensoy: {
      instrucciones: [
        "Adivina qué personaje de la Independencia soy. Empiezas con una pista general; cada pista nueva es más específica pero vale menos puntos (100, 80, 60, 40, 20).",
        "Puedes escribir el nombre o elegir entre cuatro opciones. Tienes 3 intentos por personaje; cada fallo resta 10 puntos.",
        "Al terminar la ronda se revela el personaje con una explicación histórica.",
        "En multijugador local se alternan los turnos (cada quien recibe un personaje distinto). En línea la ronda es simultánea y las pistas aparecen solas cada pocos segundos; las respuestas de los demás no se ven."
      ],
      campos(modo) {
        const c = [
          dificultad([op("mixta", "Mixta")]),
          { id: "modalidad", etiqueta: "Respuesta", porDefecto: "escribir", opciones: [op("escribir", "Escribir", "Teclea el nombre del personaje."), op("opciones", "Elegir", "Cuatro opciones.")] },
          { id: "rondas", etiqueta: "Personajes", porDefecto: 5, opciones: [op(3, "3"), op(5, "5"), op(8, "8")] }
        ];
        c[0].porDefecto = "mixta";
        if (modo === "online") c.push({ id: "segundosPista", etiqueta: "Nueva pista cada", porDefecto: 15, opciones: [op(10, "10 s"), op(15, "15 s"), op(20, "20 s"), op(30, "30 s")] });
        return c;
      }
    },
    sopa: {
      instrucciones: [
        "Encuentra las palabras de la lista. Pueden estar en horizontal, vertical o diagonal (y, en difícil, al revés).",
        "Con el ratón o el dedo: arrastra de la primera a la última letra. Con teclado: mueve el cursor con las flechas, pulsa Enter para marcar el inicio y Enter de nuevo en el final.",
        "Cada palabra vale 10 puntos + 2 por letra. Una pista resalta la primera letra de una palabra pero resta 15 puntos.",
        "En línea todos buscan en el mismo tablero: la primera persona que confirma una palabra se queda con sus puntos. En el mismo dispositivo se alternan los turnos."
      ],
      campos(modo) {
        const cat = Object.entries(bancoSopa()).map(([v, t]) => op(v, t));
        const c = [
          { id: "dificultad", etiqueta: "Tablero", porDefecto: "facil", opciones: [op("facil", "10×10 · fácil"), op("intermedia", "12×12 · media"), op("dificil", "14×14 · difícil")] },
          { id: "categoria", etiqueta: "Tema", porDefecto: "mezcla", opciones: cat },
          { id: "pistas", etiqueta: "Pistas", porDefecto: true, opciones: [op(true, "Con pistas (−15)"), op(false, "Sin pistas")] }
        ];
        if (modo === "online") c.push({ id: "limite", etiqueta: "Tiempo máximo", porDefecto: 300, opciones: [op(180, "3 min"), op(300, "5 min"), op(420, "7 min"), op(600, "10 min")] });
        return c;
      }
    },
    misterio: {
      instrucciones: [
        "Examina los documentos de cada capítulo: cartas, testimonios y notas históricas. Cada uno lleva una etiqueta: Hecho documentado, Tradición o Ficción.",
        "Cuando tengas las pistas necesarias, responde la pregunta del capítulo. Tienes 3 intentos; una pista cuesta 15 puntos.",
        "Al final tomas una decisión (de ficción) que cambia el desenlace del caso.",
        "En línea puedes jugar en equipo (inventario y progreso compartidos; la decisión final se vota) o competir (cada quien resuelve el caso por separado)."
      ],
      campos(modo) {
        const casos = (Datos.misterio ? Datos.misterio.casos : []);
        const c = [{ id: "caso", etiqueta: "Caso", opciones: casos.map(k => op(k.id, k.titulo, k.dificultad + ": " + k.intro.slice(0, 90) + "…")) }];
        if (modo !== "solo") c.push({ id: "modo", etiqueta: "Modalidad", porDefecto: "coop", opciones: [op("coop", "Cooperativo", "El equipo comparte descubrimientos y puntos."), op("comp", "Competitivo", "Cada quien resuelve por su cuenta.")] });
        if (modo === "online") c.push({ id: "limite", etiqueta: "Tiempo máximo", porDefecto: 1200, opciones: [op(600, "10 min"), op(900, "15 min"), op(1200, "20 min"), op(1800, "30 min")] });
        return c;
      }
    }
  };
})();
