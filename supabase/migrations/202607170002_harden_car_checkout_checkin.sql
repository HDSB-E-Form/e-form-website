-- Persist the latest returned fuel level and prevent concurrent petrol-card use.

alter table public.cars
add column if not exists "currentFuelLevel" text,
add column if not exists "petrolCardOut" boolean default false,
add column if not exists "petrolCardSerialOut" text;

-- Clear legacy duplicate assignments before enforcing uniqueness. The most
-- recently checked-out vehicle keeps the card; older duplicate rows lose it.
with ranked_cards as (
  select id,
         row_number() over (
           partition by "petrolCardSerialOut"
           order by "lastCheckedOutAt" desc nulls last, id
         ) as position
  from public.cars
  where status = 'checked_out'
    and "petrolCardOut" = true
    and "petrolCardSerialOut" is not null
)
update public.cars as cars
set "petrolCardOut" = false,
    "petrolCardSerialOut" = null
from ranked_cards
where cars.id = ranked_cards.id
  and ranked_cards.position > 1;

create unique index if not exists cars_one_active_petrol_card_idx
on public.cars ("petrolCardSerialOut")
where status = 'checked_out'
  and "petrolCardOut" = true
  and "petrolCardSerialOut" is not null;
