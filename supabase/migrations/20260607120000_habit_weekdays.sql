-- ------------------------------------------------------------
-- Habitudes hebdomadaires : jours de la semaine ciblés
-- ------------------------------------------------------------
-- Pour une habitude de période « week », on peut désormais préciser les
-- jours exacts où elle doit être réalisée (ex. lundi / mercredi / vendredi).
-- Encodage : tableau d'entiers 0..6 où 0 = lundi … 6 = dimanche
-- (cohérent avec la convention (getDay()+6)%7 utilisée côté client).
-- NULL ou tableau vide = aucun jour précis (habitude « x fois par semaine »).

alter table public.habits
  add column weekdays smallint[]
  check (
    weekdays is null
    or weekdays <@ array[0,1,2,3,4,5,6]::smallint[]
  );
