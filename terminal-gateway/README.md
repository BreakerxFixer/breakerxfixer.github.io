# Terminal Gateway (Arch Linux Real Sessions)

Servicio WS para sesiones de terminal real sobre contenedores rootless.

## Requisitos

- Node 20+
- Podman rootless configurado
- Imagen `archlinux:latest` accesible

## Variables

- `TERMINAL_GATEWAY_PORT` (default `8788`)
- `PODMAN_BIN` (default `podman`)
- `ARCH_IMAGE` (default `docker.io/library/archlinux:latest`)
- `TERMINAL_SESSION_TTL_MS` (default `1800000`)

## API

- `GET /health`
- `POST /session/start` con body `{ "userId": "<uuid-or-id>" }`
- `WS /ws/terminal?sessionId=<id>`
  - entrada: `{ "type": "command", "command": "ls -la" }`
  - salida: `{ "type": "output", "value": "..." }`

## Seguridad aplicada

- `no-new-privileges`
- `--cap-drop ALL`
- límites de pids/mem/cpu
- cleanup automático de sesiones expiradas

## Despliegue gratis (límites suaves)

- local/dev: estable y sin coste.
- demo pública gratis: usar un único nodo y aceptar límites de concurrencia según recursos.
