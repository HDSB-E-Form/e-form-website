-- Restrict the Store Department (MRS form) to the departments approved for
-- material requisitions. useStoreDepartmentAccess() reads this setting and
-- gates both the Store menu entry and the MRS form itself.
insert into public.safety_dashboard_settings (key, value)
values (
  'store_department_access',
  jsonb_build_object('allowedDepartments', jsonb_build_array(
    'MAS',
    'Machining Maintenance',
    'Production Machining',
    'Finance',
    'Die Maintenance',
    'Machining Engineering',
    'Production Casting',
    'Manufacturing',
    'PVD',
    'Operation',
    'Secondary',
    'TCED',
    'Engineering Development',
    'Casting Maintenance',
    'Production Engineering'
  ))
)
on conflict (key) do update
set value = excluded.value, updated_at = now();
