-- Remove per-row auth lookups from tenant policies and index relational joins.
do $$
declare t text;
begin
  foreach t in array array[
    'activities','agencies','agency_product_rates','booking_services','bookings',
    'contract_rates','contracts','customers','inventory','invoices','operations_tasks',
    'passengers','payments','products','quote_services','quotes','suppliers'
  ] loop
    execute format('drop policy if exists "tenant read" on public.%I', t);
    execute format('create policy "tenant read" on public.%I for select to authenticated using (tenant_id = (select private.current_tenant_id()))', t);
  end loop;
end $$;

drop policy if exists "tenant members read companies" on public.companies;
create policy "tenant members read companies" on public.companies for select to authenticated
using (tenant_id = (select private.current_tenant_id()));
drop policy if exists "members read tenant" on public.tenants;
create policy "members read tenant" on public.tenants for select to authenticated
using (id = (select private.current_tenant_id()));
drop policy if exists "tenant members read offices" on public.offices;
create policy "tenant members read offices" on public.offices for select to authenticated
using (tenant_id = (select private.current_tenant_id()));
drop policy if exists "tenant members read departments" on public.departments;
create policy "tenant members read departments" on public.departments for select to authenticated
using (tenant_id = (select private.current_tenant_id()));
drop policy if exists "tenant members read roles" on public.roles;
create policy "tenant members read roles" on public.roles for select to authenticated
using (tenant_id = (select private.current_tenant_id()));
drop policy if exists "tenant members read audit logs" on public.audit_logs;
create policy "tenant members read audit logs" on public.audit_logs for select to authenticated
using (tenant_id = (select private.current_tenant_id()));

create index if not exists idx_fk_audit_logs_actor_id on public.audit_logs (actor_id);
create index if not exists idx_fk_booking_services_booking_id on public.booking_services (booking_id);
create index if not exists idx_fk_booking_services_product_id on public.booking_services (product_id);
create index if not exists idx_fk_booking_services_tenant_id on public.booking_services (tenant_id);
create index if not exists idx_fk_bookings_agency_id on public.bookings (agency_id);
create index if not exists idx_fk_bookings_customer_id on public.bookings (customer_id);
create index if not exists idx_fk_bookings_quote_id on public.bookings (quote_id);
create index if not exists idx_fk_companies_tenant_id on public.companies (tenant_id);
create index if not exists idx_fk_contract_rates_contract_id on public.contract_rates (contract_id);
create index if not exists idx_fk_contract_rates_tenant_id on public.contract_rates (tenant_id);
create index if not exists idx_fk_customers_tenant_id on public.customers (tenant_id);
create index if not exists idx_fk_departments_company_id on public.departments (company_id);
create index if not exists idx_fk_departments_office_id on public.departments (office_id);
create index if not exists idx_fk_departments_tenant_id on public.departments (tenant_id);
create index if not exists idx_fk_inventory_tenant_id on public.inventory (tenant_id);
create index if not exists idx_fk_invoices_booking_id on public.invoices (booking_id);
create index if not exists idx_fk_offices_company_id on public.offices (company_id);
create index if not exists idx_fk_offices_tenant_id on public.offices (tenant_id);
create index if not exists idx_fk_operations_tasks_booking_id on public.operations_tasks (booking_id);
create index if not exists idx_fk_operations_tasks_tenant_id on public.operations_tasks (tenant_id);
create index if not exists idx_fk_passengers_booking_id on public.passengers (booking_id);
create index if not exists idx_fk_passengers_tenant_id on public.passengers (tenant_id);
create index if not exists idx_fk_payments_invoice_id on public.payments (invoice_id);
create index if not exists idx_fk_payments_tenant_id on public.payments (tenant_id);
create index if not exists idx_fk_profiles_company_id on public.profiles (company_id);
create index if not exists idx_fk_profiles_office_id on public.profiles (office_id);
create index if not exists idx_fk_quote_services_product_id on public.quote_services (product_id);
create index if not exists idx_fk_quote_services_quote_id on public.quote_services (quote_id);
create index if not exists idx_fk_quote_services_tenant_id on public.quote_services (tenant_id);
create index if not exists idx_fk_quotes_agency_id on public.quotes (agency_id);
create index if not exists idx_fk_quotes_customer_id on public.quotes (customer_id);
create index if not exists idx_fk_role_permissions_permission_id on public.role_permissions (permission_id);
create index if not exists idx_fk_user_roles_role_id on public.user_roles (role_id);

