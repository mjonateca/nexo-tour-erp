-- Rebrand the existing demo tenant without discarding its working data.
update public.tenants
set name = 'Nexo Tour', slug = 'nexo-tour'
where id = '00000000-0000-4000-8000-000000000001';

update public.companies
set name = 'Nexo Tour'
where tenant_id = '00000000-0000-4000-8000-000000000001';
