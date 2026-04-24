-- =============================================================================
-- Borra todas las puntuaciones / resueltos de concursos (ranking + first-blood
-- implícito en puntos). Ejecutar en Supabase → SQL Editor cuando quieras
-- resetear la tabla de clasificación de concursos.
-- No toca solves CTF ni first_blood de challenges globales.
-- =============================================================================

begin;

delete from public.contest_solves;

commit;
