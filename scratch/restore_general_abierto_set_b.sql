-- Restaura el concurso bash-scripting-2026-general-abierto al "set B" del seed
-- scratch/seed_concursos_2026_04_24.sql (enunciados LAB B1–B8, modo flag, respuestas cortas).
-- Úsalo si "Repaso 1" era en realidad este slug renombrado o si quedó con textos de repaso Q01–Q05.
--
-- NO toca bash-scripting-2026-repaso-2-abierto.
-- Si tu "Repaso 1 Abierto" tiene OTRO slug, cambia el WHERE del CTE `target` abajo.

begin;

create extension if not exists pgcrypto;

with target as (
  select id
  from public.contests
  where slug = 'bash-scripting-2026-general-abierto'
  limit 1
)
update public.contests c
set
  title = 'Concurso Bash Scripting — General Abierto',
  description = 'Concurso general abierto (set B): mismo estilo de scripting Bash, preguntas distintas al set A.',
  updated_at = now()
from target t
where c.id = t.id;

delete from public.contest_challenge_secrets s
using public.contest_challenges cc
join public.contests c on c.id = cc.contest_id
where c.slug = 'bash-scripting-2026-general-abierto'
  and s.challenge_id = cc.id;

with target as (
  select id from public.contests where slug = 'bash-scripting-2026-general-abierto' limit 1
),
payload (code, pos, title, description, answer) as (
  values
    (
      'Q01',
      1,
      'Bash scripting 1 / 8',
      '[LAB B1] Construye un script de inventario por extensión que cuente archivos .txt dentro de un árbol de directorios.',
      'find'
    ),
    (
      'Q02',
      2,
      'Bash scripting 2 / 8',
      '[LAB B2] Construye un script de backup que comprima una carpeta en formato tar.gz con nombre de salida controlado.',
      'tar -czf'
    ),
    (
      'Q03',
      3,
      'Bash scripting 3 / 8',
      '[LAB B3] Construye un script de supervisión que verifique si un proceso está activo por nombre exacto.',
      'pgrep -x'
    ),
    (
      'Q04',
      4,
      'Bash scripting 4 / 8',
      '[LAB B4] Construye un script de búsqueda que localice una cadena en archivos .txt e incluya referencia de línea.',
      'grep -n'
    ),
    (
      'Q05',
      5,
      'Bash scripting 5 / 8',
      '[LAB B5] Construye un script de limpieza que elimine archivos .tmp con antigüedad superior a 7 días en un directorio.',
      'find'
    ),
    (
      'Q06',
      6,
      'Bash scripting 6 / 8',
      '[LAB B6] Construye un script con menú interactivo para ejecutar acciones numeradas en bucle hasta salida explícita.',
      'case'
    ),
    (
      'Q07',
      7,
      'Bash scripting 7 / 8',
      '[LAB B7] Construye un script calculadora Bash que procese operaciones aritméticas básicas por entrada de usuario.',
      '*'
    ),
    (
      'Q08',
      8,
      'Bash scripting 8 / 8',
      '[LAB B8] Construye un script de procesamiento CSV que extraiga la primera columna de un archivo delimitado por comas.',
      'cut -d, -f1'
    )
)
update public.contest_challenges cc
set
  title = p.title,
  description = p.description,
  position = p.pos,
  points = 100,
  category = 'Bash',
  difficulty = 'Easy',
  content_focus = 'bash',
  solve_mode = 'flag',
  is_enabled = true
from payload p
join target t on true
where cc.contest_id = t.id
  and cc.code = p.code;

insert into public.contest_challenge_secrets (challenge_id, flag_hash)
select
  cc.id,
  crypt(trim(p.answer), gen_salt('bf'::text))
from public.contest_challenges cc
join public.contests c on c.id = cc.contest_id
join (
  values
    ('Q01', 'find'),
    ('Q02', 'tar -czf'),
    ('Q03', 'pgrep -x'),
    ('Q04', 'grep -n'),
    ('Q05', 'find'),
    ('Q06', 'case'),
    ('Q07', '*'),
    ('Q08', 'cut -d, -f1')
) as p(code, answer) on p.code = cc.code
where c.slug = 'bash-scripting-2026-general-abierto';

commit;

-- Comprobación
select c.slug, c.title, cc.code, cc.title as challenge_title, cc.solve_mode, left(cc.description, 72) as desc_preview
from public.contest_challenges cc
join public.contests c on c.id = cc.contest_id
where c.slug = 'bash-scripting-2026-general-abierto'
order by cc.position;
