@echo off
rem Inicia el servidor y abre un tunel publico de Cloudflare (Windows).
rem Requisito: haber instalado cloudflared (ver GUIA-ONLINE.md, Opcion A).
cd /d "%~dp0"
where cloudflared >nul 2>nul
if errorlevel 1 (
  echo No se encontro cloudflared. Instalalo con:  winget install --id Cloudflare.cloudflared
  echo y despues cierra y vuelve a abrir esta ventana.
  pause
  exit /b 1
)
echo Iniciando el servidor en otra ventana...
start "Servidor de juegos" cmd /k npm start
timeout /t 4 >nul
echo.
echo Abriendo el tunel publico. Busca abajo una linea con https://....trycloudflare.com
echo Esa es la direccion que debes compartir. Para cerrar todo: Ctrl + C aqui y en la otra ventana.
echo.
cloudflared tunnel --url http://localhost:3000
pause
