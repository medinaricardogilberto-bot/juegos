# Jugar a distancia (jugadores en casas distintas)

Tu servidor Node.js vive en tu computadora, detrás del router de tu casa, y desde fuera nadie puede entrar. Hay dos formas gratuitas de resolverlo.

| | **A) Túnel de Cloudflare** | **B) Render (hosting gratis)** |
|---|---|---|
| Costo | Gratis, sin cuenta | Gratis (plan Free) |
| ¿Tu compu debe estar encendida? | **Sí**, mientras se juega | No |
| Dirección | Cambia cada vez | Fija (`https://tu-nombre.onrender.com`) |
| Dificultad | Baja (2 comandos) | Media (GitHub + Render) |
| Ideal para | Jugar hoy con familia o alumnos | Dejarlo disponible siempre |

---

## Opción A: Túnel de Cloudflare (la más rápida)

Un "túnel rápido" te da una dirección pública `https://palabras-al-azar.trycloudflare.com` que apunta a tu computadora. No requiere cuenta ni abrir puertos en el router.

### 1. Instalar cloudflared (una sola vez)
Abre una terminal (cmd o PowerShell) y ejecuta:

    winget install --id Cloudflare.cloudflared

Cierra la terminal y ábrela de nuevo. Comprueba:

    cloudflared --version

(Si `winget` no existe en tu Windows, descarga `cloudflared-windows-amd64.exe` desde la sección *Downloads* de la documentación de Cloudflare Tunnel y ponle de nombre `cloudflared.exe` en una carpeta que esté en tu PATH.)

### 2. Levantar todo
**Forma fácil:** haz doble clic en `iniciar-online.bat`. Abre el servidor en una ventana y el túnel en otra.

**Forma manual (dos terminales dentro de la carpeta del proyecto):**

    Terminal 1:  npm start
    Terminal 2:  cloudflared tunnel --url http://localhost:3000

### 3. Encontrar tu dirección
En la terminal del túnel busca una línea con `https://....trycloudflare.com`. **Esa** es la dirección para tus jugadores.

### 4. Jugar
1. Tú entras a esa dirección (no a `localhost`), eliges juego → **Multijugador online** → Crear partida.
2. Envías por WhatsApp la dirección y el código de sala.
3. Los demás abren la dirección, eligen **Multijugador online** → Unirse.

### 5. Comprobar que de verdad funciona a distancia
Abre la dirección en tu celular **con datos móviles** (apaga el Wi-Fi). Si carga y puedes unirte, ya es accesible desde cualquier lugar.

### Cosas que debes saber
- La dirección **cambia cada vez** que inicias el túnel.
- El túnel se cierra al presionar `Ctrl + C` o apagar la computadora.
- Los túneles rápidos son para pruebas y uso personal: no tienen garantía de disponibilidad ni autenticación.
- Si alguna vez configuraste un túnel con nombre y tienes un `config.yml` en la carpeta `.cloudflared` de tu usuario, el túnel rápido puede no funcionar hasta que lo renombres.

---

## Opción B: Render (siempre disponible, sin tu computadora)

### 1. Subir el proyecto a GitHub
Crea una cuenta en github.com y un repositorio nuevo (por ejemplo `juegos-educativos`). El archivo `.gitignore` ya evita subir `node_modules`.

Con Git instalado, dentro de la carpeta del proyecto:

    git init
    git add .
    git commit -m "Juegos educativos"
    git branch -M main
    git remote add origin https://github.com/TU-USUARIO/juegos-educativos.git
    git push -u origin main

(Alternativa sin comandos: instala **GitHub Desktop**, elige *Add local repository* y pulsa *Publish*.)

### 2. Crear el servicio en Render
1. Entra a render.com e inicia sesión con tu cuenta de GitHub.
2. **New → Web Service** y elige tu repositorio.
3. Configura:
   - **Runtime / Language:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** **Free**
4. **Create Web Service** y espera a que el despliegue diga *Live*.
5. Tu dirección será algo como `https://juegos-educativos.onrender.com`.

(No necesitas configurar el puerto: el servidor ya usa el que Render le asigna. Si Render te pide una ruta de comprobación de salud, usa `/salud`.)

### Limitaciones del plan gratuito (según la documentación de Render)
- El servicio **se apaga tras 15 minutos sin tráfico** y vuelve a encenderse con la siguiente visita o conexión. Ese primer arranque tarda alrededor de un minuto.
- Incluye **750 horas de instancia al mes**.
- Render puede **reiniciar** un servicio gratuito en cualquier momento.
- **Importante para este proyecto:** las salas viven en la memoria del servidor. Si el servicio se apaga o reinicia, **las partidas en curso se pierden** y los jugadores regresan al menú con un aviso.

### Consejos de uso
- Abre la dirección **uno o dos minutos antes** de jugar para despertarlo.
- Para actualizar el juego, sube los cambios a GitHub; Render normalmente vuelve a desplegar solo (si no, *Manual Deploy → Deploy latest commit*).

---

## Cómo jugar en la misma casa (LAN)
Al ejecutar `npm start`, la terminal muestra una línea `En tu Wi-Fi (otros): http://192.168.x.x:3000`. Ábrela en los otros dispositivos conectados al mismo Wi-Fi. Si Windows pregunta por el firewall, permite **redes privadas**.

## Problemas frecuentes
- **"No se puede acceder" desde afuera:** ¿estás usando la dirección `trycloudflare.com` / `onrender.com` y no `localhost`?
- **El punto de estado dice "Sin conexión":** el servidor se apagó o está despertando (Render). Espera y recarga.
- **Alguien se desconecta:** tiene 60 segundos para volver; al recargar la página regresa solo a su sala.
- **Otra red no ve la dirección 192.168.x.x:** esa dirección solo sirve dentro de la misma red; para otras redes usa A o B.

## Seguridad básica
El servidor valida turnos y movimientos, pero es un proyecto educativo: no tiene cuentas ni contraseñas. No compartas la dirección pública en lugares abiertos y detén el túnel al terminar.
