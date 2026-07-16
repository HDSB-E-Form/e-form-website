-- Keep the issued petrol card attached to an active vehicle rental.
-- The values are copied into the car's JSON history entry at check-in.
alter table public.cars
  add column if not exists "petrolCardOut" boolean,
  add column if not exists "petrolCardSerialOut" text;
