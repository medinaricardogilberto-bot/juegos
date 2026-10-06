// CONFIGURACIÓN DEL SITIO — se edita a mano, no hay ningún paso de compilación.
//
// SERVIDOR_URL = dirección del servidor de salas (el que ejecuta server.js), para el modo "Multijugador online".
//
//   ""                          → usa el mismo dominio (el sitio lo sirve server.js, p. ej. en un VPS o "Node.js App" de tu hosting)
//                                 Si subiste solo los archivos estáticos y no hay servidor, el modo online dirá "Sin servidor"
//                                 y todos los demás modos (un jugador y mismo dispositivo) funcionan igual.
//   "https://salas.tudominio.com" → el sitio es estático y el servidor de salas está en otra dirección (HTTPS, sin "/" final)
window.SERVIDOR_URL = "";
