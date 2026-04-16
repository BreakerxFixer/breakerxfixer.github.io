# Breaker x Fixer - React Frontend

Nueva capa frontend completa en React/Vite, conectada al backend actual (Supabase + FastAPI).

## Scripts

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`

## Variables de entorno

Copiar `.env.example` a `.env` y configurar:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_FASTAPI_URL`

## Compatibilidad de rutas legacy

El router soporta redirecciones para rutas antiguas:

- `/index.html` -> `/`
- `/ctf.html` -> `/ctf`
- `/season0.html` -> `/season/0`
- `/season1.html` -> `/season/1`
- `/leaderboard.html` -> `/leaderboard`
- `/learn.html` -> `/learn`
- `/writeups.html` -> `/writeups`
- `/aboutus.html` -> `/about`
- `/privacy.html` -> `/privacy`
- `/terminal.html` -> `/terminal`

## Cobertura funcional incluida

- Auth/login/signup/logout con Supabase.
- Perfil, puntos, avatar, borrado de cuenta.
- CTF dashboard con retos reales de backend.
- Season detail con deep-link `?challenge=` y submit flag.
- Leaderboard global/por temporada.
- Sistema social (amistades + requests + chat privado).
- Learn/Terminal integration.
- i18n base EN/ES.
- Tutorial overlay y replay.
