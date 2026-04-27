-- Fix rápido: corrige solo los enunciados Q03/Q04/Q05 de Repaso 2
-- No borra retos ni toca solves.

begin;

update public.contest_challenges cc
set description = case cc.code
  when 'Q03' then '[LAB R3] Pre-lunes (log parser): recibe ruta de un archivo de logs y un nivel (INFO, WARN o ERROR). Normaliza el nivel con tr, valida formato con grep -E y cuenta coincidencias exactas del nivel. Salida final obligatoria: Q03: <total_lineas_nivel>. Herramientas obligatorias: tr, grep -E y grep -c.'
  when 'Q04' then '[LAB R4] Pre-lunes (simulador de intentos): genera 10 números aleatorios entre 1 y 6 con RANDOM dentro de un while. Cuenta cuántos son pares y cuántos impares. Salida final obligatoria: Q04: <pares>|<impares>. Herramientas obligatorias: while y RANDOM.'
  when 'Q05' then '[LAB R5] Pre-lunes (agenda de comandos): crea un menú en bucle con case para gestionar tareas en tareas.txt: añadir, completar, listar pendientes y salir. El formato de tarea es id:descripcion:estado y el estado inicial es PENDIENTE. Salida final obligatoria: Q05: <pendientes>. Herramientas obligatorias: case, grep -E y grep -c.'
  else cc.description
end
from public.contests c
where c.id = cc.contest_id
  and c.slug = 'bash-scripting-2026-repaso-2-abierto'
  and cc.code in ('Q03', 'Q04', 'Q05');

commit;

-- Verificación rápida
select c.slug, cc.code, cc.title, cc.description
from public.contest_challenges cc
join public.contests c on c.id = cc.contest_id
where c.slug = 'bash-scripting-2026-repaso-2-abierto'
  and cc.code in ('Q03', 'Q04', 'Q05')
order by cc.position;
