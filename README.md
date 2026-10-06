# Juegos Educativos · Independencia de México

Plataforma de juegos para aprender la historia de la Independencia de México (1810–1821) jugando, en computadoras, tabletas y celulares.

## Juegos
| Juego | Un jugador | Multijugador local | Multijugador online |
|---|---|---|---|
| 🧩 Rompecabezas | ✅ | ✅ LAN con el servidor del proyecto | ✅ con el servidor del proyecto (`npm start`) |
| 🃏 Memorama | ✅ | ✅ LAN con el servidor del proyecto | ✅ con el servidor del proyecto (`npm start`) |
| ❓ Trivia histórica | ✅ | ✅ mismo dispositivo, por turnos | ✅ salas con código (requiere servidor, ver DESPLIEGUE.md) |
| ⏳ Ordena la historia | ✅ | ✅ mismo dispositivo, misma secuencia | ✅ salas con código (requiere servidor, ver DESPLIEGUE.md) |
| 🎭 ¿Quién soy? | ✅ | ✅ por turnos o ronda simultánea | ✅ salas con código (requiere servidor, ver DESPLIEGUE.md) |
| 🔤 Sopa de letras | ✅ | ✅ mismo tablero, por turnos | ✅ salas con código (requiere servidor, ver DESPLIEGUE.md) |
| 🕯️ El misterio histórico | ✅ con progreso guardado | ✅ cooperativo o competitivo | ✅ salas con código (requiere servidor, ver DESPLIEGUE.md) |

Los juegos nuevos guardan en el dispositivo récords, tabla de puntuaciones, experiencia (con tope diario por juego) e insignias, visibles en el menú.

## Tecnologías
- HTML, CSS y JavaScript sin frameworks ni compilación (`public/`).
- Tipografías locales Fraunces y Karla (`public/fuentes`, licencia OFL).
- Servidor opcional Node.js + Express + Socket.IO (`server.js`, `server/`) para las salas de Memorama y Rompecabezas.
- Se publica en cualquier hosting: archivos estáticos (`public/`) o, para las salas en línea, un servidor Node.js (ver `DESPLIEGUE.md`).

## Ejecutar en tu computadora
```
npm install
npm start
```
Abre http://localhost:3000. Con el servidor encendido funcionan también las salas LAN/online de Memorama y Rompecabezas (ver `GUIA-ONLINE.md`).

Sin servidor: cualquier servidor estático sirve la carpeta `public/` (por ejemplo `npx serve public`); los modos individual y multijugador local de los juegos nuevos funcionan sin conexión.

## Publicar en tu dominio
No depende de ningún servicio en particular. Tres formas, explicadas en `DESPLIEGUE.md`:
1. **Solo archivos**: sube el contenido de `public/` a tu hosting (sin salas en línea).
2. **Servidor Node.js** en tu dominio (VPS, cPanel «Node.js App»…): todo funciona, salas incluidas.
3. **Sitio estático + servidor aparte**: edita `SERVIDOR_URL` en `public/config.js`.

## Contenido educativo
Todo el contenido está separado de la interfaz y se amplía añadiendo objetos:
- `public/datos/trivia.js` — preguntas por categoría y dificultad.
- `public/datos/historia.js` — acontecimientos con fecha y niveles.
- `public/datos/personajes.js` — personajes con pistas progresivas.
- `public/datos/palabras.js` — bancos de palabras por categoría.
- `public/datos/misterios.js` — casos, capítulos, elementos y desafíos (ficción marcada aparte de los hechos documentados).

## Variables de entorno
Ver `.env.example`. Ninguna es obligatoria. La dirección del servidor para un sitio estático se escribe en `public/config.js`.

## Lo que sigue
Ver `PLAN.md` (estado, pendientes y siguientes pasos) y `DESPLIEGUE.md` (publicación).
