# Hundir la Flota

Juego naval para Android, creado con Expo, React Native y JavaScript. Incluye despliegue manual de la flota, orientación horizontal o vertical, combate por turnos contra la computadora, registro de impactos y barcos hundidos, y reinicio de partida.

## Requisitos

- Node.js LTS instalado.
- Expo Go instalado en el teléfono Android.
- Teléfono y computadora en la misma red Wi-Fi para la conexión local.

## Ejecutar en Android

Desde PowerShell, abre esta carpeta y ejecuta:

```powershell
npm.cmd install
npx.cmd expo start
```

Expo mostrará un código QR en la terminal o en la página local. Abre Expo Go en Android y escanea el código. Si la red local no permite la conexión, inicia Expo con `npx.cmd expo start --tunnel`.

## Cómo jugar

1. Elige «Horizontal» o «Vertical» y toca una casilla del tablero para desplegar cada barco. Los barcos no pueden superponerse ni salirse del tablero.
2. Cuando los cinco estén desplegados, pulsa «Iniciar combate».
3. Toca una casilla del radar enemigo para disparar. Después responderá la computadora.
4. Los impactos, el agua, los barcos hundidos y las flotas restantes se muestran en pantalla. Al terminar, pulsa «Nueva partida».

## Estructura

- `App.js`: interfaz, flujo de despliegue y turnos.
- `src/game.js`: tablero, flota, colocación y resolución de disparos.
- `app.json`: configuración Expo y paquete Android.
