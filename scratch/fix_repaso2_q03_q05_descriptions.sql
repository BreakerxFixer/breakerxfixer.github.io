-- Alinea Q01–Q05 con runRepasoStrictHarness (terminal.html).
-- Slugs explicitos O concurso cuyo slug contenga "repaso" y el titulo sea tipo Repaso Abierto
-- (nunca usar solo el titulo: un slug "general-abierto" renombrado a "Repaso 1 Abierto" no debe actualizarse).
-- Titulos de reto: "Ejercicio k/5" = k-esimo reto dentro del pack (no el numero del concurso).

begin;

update public.contest_challenges cc
set
  title = case cc.code
    when 'Q01' then 'Ejercicio 1/5 — archivo más antiguo'
    when 'Q02' then 'Ejercicio 2/5 — scripts ejecutables'
    when 'Q03' then 'Ejercicio 3/5 — copia de respaldo con fecha'
    when 'Q04' then 'Ejercicio 4/5 — ficheros escribibles por otros'
    when 'Q05' then 'Ejercicio 5/5 — menú de notas'
    else cc.title
  end,
  description = case cc.code
    when 'Q01' then
      'Recibe por argumento ($1; el validador lo inyecta) la ruta de un directorio. Solo archivos regulares en ese directorio (sin subdirectorios, sin recursión). Debes obtener el fichero cuya fecha de modificación es la más antigua y escribir solo su nombre de archivo. Formato de salida final obligatorio: una sola línea que empiece exactamente por el prefijo Q01: (es la letra Q de «que», no la letra O; dígitos 0 y 1; dos puntos) seguida del nombre. Pista: find con -maxdepth 1, -type f y orden por tiempo.'
    when 'Q02' then
      'Recibe por argumento ($1) la ruta de un directorio. Cuenta únicamente archivos regulares con extensión .sh en ese directorio (no recursivo) que tengan permiso de ejecución para usuario, grupo u otros. Formato de salida final obligatorio: Q02: <entero>.'
    when 'Q03' then
      'Crea en /home/entity/ctf/ un fichero vacío cuyo nombre siga exactamente el patrón backup-AAAAMMDD.tar.gz, usando la fecha actual del sistema (AAAAMMDD con date +%Y%m%d). La salida debe incluir el mismo nombre creado. Formato de salida final obligatorio: Q03: <nombre_creado>.'
    when 'Q04' then
      'Recibe por argumento ($1) la ruta de un directorio. Cuenta archivos regulares en ese directorio (no recursivo) que tengan permiso de escritura para «otros» (bit o+w). Formato de salida final obligatorio: Q04: <entero>.'
    when 'Q05' then
      'Script interactivo con read y bucle. Primero pide la ruta del fichero de notas. Menú con case: opción 1 pide una nota y la añade al fichero solo si esa línea exacta no existe ya; opción 3 muestra el número de notas distintas (p. ej. sort | uniq | wc -l) con prefijo Q05: o etiqueta Total; opción 4 termina el script. Debe tolerar opciones inválidas sin romperse. Formato exigido al contar: línea con Q05: <entero>.'
    else cc.description
  end
from public.contests c
where c.id = cc.contest_id
  and cc.code in ('Q01', 'Q02', 'Q03', 'Q04', 'Q05')
  and coalesce(lower(cc.solve_mode), '') = 'bash_checker'
  and (
    c.slug in (
      'bash-scripting-2026-repaso-2-abierto',
      'bash-scripting-2024-repaso-2-abierto'
    )
    or (
      lower(trim(coalesce(c.slug, ''))) like '%repaso%'
      and lower(trim(coalesce(c.title, ''))) like '%repaso%'
      and (
        lower(trim(coalesce(c.title, ''))) like '%abierto%'
        or lower(trim(coalesce(c.title, ''))) like '%open%'
      )
    )
  );

commit;

select c.slug, c.title, cc.code, cc.title as challenge_title, left(cc.description, 100) as description_preview
from public.contest_challenges cc
join public.contests c on c.id = cc.contest_id
where cc.code in ('Q01', 'Q02', 'Q03', 'Q04', 'Q05')
  and coalesce(lower(cc.solve_mode), '') = 'bash_checker'
  and (
    c.slug in (
      'bash-scripting-2026-repaso-2-abierto',
      'bash-scripting-2024-repaso-2-abierto'
    )
    or (
      lower(trim(coalesce(c.slug, ''))) like '%repaso%'
      and lower(trim(coalesce(c.title, ''))) like '%repaso%'
      and (
        lower(trim(coalesce(c.title, ''))) like '%abierto%'
        or lower(trim(coalesce(c.title, ''))) like '%open%'
      )
    )
  )
order by c.slug, cc.position;

-- Si general-abierto quedo con enunciados de repaso: restaurar con seed_concursos_2026_04_24.sql (set B, flag).