# Estado del proyecto y hoja de ruta

Arquitectura: **sitio estático (`public/`) + servidor opcional Express/Socket.IO (`server.js`)**, sin depender de ninguna plataforma de hosting (ver `DESPLIEGUE.md`).

## Hecho en el código
| Parte | Estado |
|---|---|
| Memorama y Rompecabezas (individual, local, online) | Conservados sin cambios de reglas. Verificado: montan en el navegador y sus salas online responden. |
| 5 juegos nuevos: Trivia, Ordena la historia, ¿Quién soy?, Sopa de letras, El misterio histórico | Implementados con modo individual, mismo dispositivo (turnos con cortina) y online. |
| Contenido separado del código | `public/datos/*.js` (43 preguntas, 6 secuencias, 13 personajes, 49 palabras, 2 casos). Ampliable añadiendo objetos. |
| Reglas en motores puros compartidos | `public/motores/*.js` se ejecutan igual en el navegador y en el servidor. |
| Salas online | Código único, públicas/privadas + lista, «listo», reglas del anfitrión, anfitrión, reconexión (60 s), abandono, revancha, validación de cada acción en el servidor, límite de acciones por segundo. |
| Progreso local | Récords, tabla de puntuaciones del dispositivo, experiencia (tope por partida y por día) e insignias. |
| Despliegue | Independiente del hosting: `public/config.js` (manual), `public/.htaccess`, `render.yaml` (ejemplo), `.env.example`, `DESPLIEGUE.md`. |

## Pendiente / requiere configuración externa
1. 👤 Subir al dominio propio (pasos en `DESPLIEGUE.md`).
2. Probar con Socket.IO real entre dos dispositivos: en el entorno de desarrollo no hubo red para instalar `socket.io`, así que las pruebas usaron un transporte simulado en memoria con la lógica real del servidor.
3. **Cuentas y clasificaciones globales persistentes** (Supabase u otro): no implementadas. Hoy el progreso vive en el dispositivo y las salas en memoria. Sería una segunda fase sin tocar lo anterior.
4. Retratos de personajes: «¿Quién soy?» usa siluetas y emojis. El campo `imagen` queda previsto en `datos/quiensoy.js` para añadir retratos con licencia adecuada.
5. Revisión histórica del contenido por una persona experta antes de usarlo en clase.
6. Pantallas de Memorama y Rompecabezas no se rediseñaron.
