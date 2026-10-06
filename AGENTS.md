# AGENTS.md — guía para futuras sesiones

## Qué es
Plataforma de juegos educativos sobre la Independencia de México. HTML/CSS/JS vanilla en `public/` (sin bundler), servidor opcional Express + Socket.IO en `server.js` + `server/` para las salas de Memorama y Rompecabezas. Es independiente del hosting: `public/` funciona como sitio estático en cualquier servidor y `server.js` sirve todo (más las salas) en cualquier hosting con Node. Ver `DESPLIEGUE.md`.

**Continúa desde `PLAN.md`** (lo pendiente está en la tabla «Pendiente» de ese archivo).

## Estructura
- `public/index.html` — todas las pantallas (menú, modo, sala, juego) y el orden de carga de scripts.
- `public/js/app.js` — navegación; `App.juegos` registra cada juego (`modulo`, `nuevo`). `App.modulo()` resuelve el objeto global del juego (las `const` globales no están en `window`, por eso hay un mapa explícito).
- `public/js/red.js`, `public/js/sala.js` — conexión Socket.IO y salas (solo juegos originales). Sin servidor `io` no existe y se muestran como "Sin servidor".
- `public/js/comun.js` — piezas compartidas de los juegos nuevos: `Util`, `Juego.crear` (contexto con temporizadores rastreados), `Config` (instrucciones + opciones + jugadores), `Cortina` (cambio de turno privado), `Marcador`, `Resultados`, `Progreso` (récords, XP con tope diario, insignias, tabla local).
- `public/juegos/*.js` — un módulo por juego: `const X = (() => ({ montar(raiz, opciones), desmontar() }))()`. Juegos nuevos reciben `opciones.modo` = `"solo"|"local"`.
- `public/datos/*.js` — contenido educativo (`Datos.<clave>`), separado de la interfaz.
- `public/css/` — `base.css` (paleta y tipografía), `menu.css`, `juegos.css` (compartido de juegos nuevos), y un CSS por juego con todos los selectores prefijados `#juego-<id>`.
- `server/` — motores autoritativos de Memorama y Rompecabezas (Socket.IO). `originales/` — HTML originales de referencia, no se sirven.

## Convenciones
- Todo en español; nombres de variables en español como el código original.
- Crear DOM con `Util.h` y `text` (nunca `innerHTML` con texto del usuario).
- En juegos nuevos usar `ctx.despues/ctx.cada/ctx.escuchar` para que `desmontar()` limpie todo.
- Respuestas correctas y nombres a adivinar no se escriben en el DOM antes de revelarse.
- Contenido histórico: solo hechos bien establecidos; lo ficticio del Misterio va marcado como "Ficción".
- No añadir dependencias ni compilación sin necesidad; el sitio debe seguir funcionando sin servidor.

## Decisiones no obvias
- Las tipografías están en `public/fuentes/` y se referencian con ruta relativa (`../fuentes/…` en `base.css`); no uses rutas que empiecen con `/` para recursos del sitio, para que funcione en subcarpetas.
- `public/config.js` se edita a mano (`SERVIDOR_URL`); no hay paso de compilación ni dependencia de ninguna plataforma de hosting.
- "Multijugador local" en los juegos originales significa LAN con el servidor; en los nuevos significa mismo dispositivo por turnos (no necesita red).
- El modo online de los juegos nuevos es real (Socket.IO, `server/nuevos.js`). Sin servidor muestra un aviso, nunca una simulación. Los motores viven en `public/motores` y se ejecutan en navegador y servidor; no los dupliques.
- La experiencia se otorga solo en modo individual y con tope por partida (60) y por juego y día (240) para evitar puntos infinitos.
