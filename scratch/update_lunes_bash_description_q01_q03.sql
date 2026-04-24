-- Texto visible del concurso Lunes (sin tocar retos). Ejecutar en Supabase si la fila ya existe.
update public.contests
set
  description = 'Pruebas de scripting Bash (3 retos: Q01, Q02, Q03). Validación desde editor/terminal con submit.',
  updated_at = now()
where slug = 'bash-scripting-2026-interno-admin-beta';
