alter table public.safety_dashboard_remarks
  drop constraint if exists safety_dashboard_remarks_dashboard_check;

alter table public.safety_dashboard_remarks
  add constraint safety_dashboard_remarks_dashboard_check
  check (dashboard in ('final_discharge', 'mixing', 'waste_inventory'));
