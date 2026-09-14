-- Public agency storefronts and secure reservation requests.
alter table public.agencies add column if not exists portal_slug text;
alter table public.agencies add column if not exists portal_enabled boolean not null default true;
alter table public.agencies add column if not exists portal_title text;

update public.agencies
set portal_slug = lower(trim(both '-' from regexp_replace(code, '[^a-zA-Z0-9]+', '-', 'g')))
where portal_slug is null;

alter table public.agencies alter column portal_slug set not null;
create unique index if not exists agencies_portal_slug_idx on public.agencies(portal_slug);

create table if not exists public.agency_storefront_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  agency_slug text not null,
  agency_name text not null,
  agency_market text not null,
  product_id uuid not null references public.products(id) on delete cascade,
  product_code text not null,
  product_name text not null,
  product_type text not null,
  destination text not null,
  sale_amount numeric(20,6) not null check (sale_amount >= 0),
  currency char(3) not null,
  unit text not null,
  valid_from date not null,
  valid_to date not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  check (valid_to >= valid_from),
  unique (agency_id, product_id, valid_from)
);

create index if not exists storefront_slug_dates_idx
  on public.agency_storefront_items(agency_slug, valid_from, valid_to)
  where is_active;
create index if not exists storefront_tenant_idx on public.agency_storefront_items(tenant_id);
create index if not exists storefront_agency_idx on public.agency_storefront_items(agency_id);
create index if not exists storefront_product_idx on public.agency_storefront_items(product_id);

create table if not exists public.public_booking_requests (
  id uuid primary key,
  reference text not null unique,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete restrict,
  agency_slug text not null,
  product_id uuid not null references public.products(id) on delete restrict,
  service_date date not null,
  adults integer not null check (adults >= 1 and adults <= 50),
  children integer not null default 0 check (children >= 0 and children <= 50),
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  email text not null check (char_length(email) between 5 and 254),
  phone text,
  notes text,
  unit_price numeric(20,6) not null check (unit_price >= 0),
  total_amount numeric(20,6) not null check (total_amount >= 0),
  currency char(3) not null,
  unit text not null,
  status text not null default 'NEW' check (status in ('NEW','QUOTED','REJECTED','CANCELLED')),
  quote_id uuid references public.quotes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists booking_requests_tenant_status_idx
  on public.public_booking_requests(tenant_id, status, created_at desc);
create index if not exists booking_requests_agency_idx on public.public_booking_requests(agency_id);
create index if not exists booking_requests_product_idx on public.public_booking_requests(product_id);
create index if not exists booking_requests_quote_idx on public.public_booking_requests(quote_id);

create schema if not exists private;

create or replace function private.refresh_storefront_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.agency_storefront_items where agency_id = old.agency_id and product_id = old.product_id and valid_from = old.valid_from;
    return old;
  end if;

  insert into public.agency_storefront_items (
    tenant_id, agency_id, agency_slug, agency_name, agency_market,
    product_id, product_code, product_name, product_type, destination,
    sale_amount, currency, unit, valid_from, valid_to, is_active, updated_at
  )
  select
    r.tenant_id, a.id, a.portal_slug, a.name, a.market,
    p.id, p.code, p.name, p.type, p.destination,
    r.sale_amount, r.currency, r.unit, r.valid_from, r.valid_to,
    (a.status = 'ACTIVE' and a.portal_enabled and p.status = 'ACTIVE'), now()
  from public.agency_product_rates r
  join public.agencies a on a.id = r.agency_id and a.tenant_id = r.tenant_id
  join public.products p on p.id = r.product_id and p.tenant_id = r.tenant_id
  where r.id = new.id
  on conflict (agency_id, product_id, valid_from) do update set
    tenant_id = excluded.tenant_id,
    agency_slug = excluded.agency_slug,
    agency_name = excluded.agency_name,
    agency_market = excluded.agency_market,
    product_code = excluded.product_code,
    product_name = excluded.product_name,
    product_type = excluded.product_type,
    destination = excluded.destination,
    sale_amount = excluded.sale_amount,
    currency = excluded.currency,
    unit = excluded.unit,
    valid_to = excluded.valid_to,
    is_active = excluded.is_active,
    updated_at = now();
  return new;
end;
$$;

create or replace function private.refresh_storefront_agency()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.agency_storefront_items s set
    agency_slug = new.portal_slug,
    agency_name = new.name,
    agency_market = new.market,
    is_active = (new.status = 'ACTIVE' and new.portal_enabled and p.status = 'ACTIVE'),
    updated_at = now()
  from public.products p
  where s.agency_id = new.id and p.id = s.product_id;
  return new;
end;
$$;

create or replace function private.refresh_storefront_product()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.agency_storefront_items s set
    product_code = new.code,
    product_name = new.name,
    product_type = new.type,
    destination = new.destination,
    is_active = (new.status = 'ACTIVE' and a.status = 'ACTIVE' and a.portal_enabled),
    updated_at = now()
  from public.agencies a
  where s.product_id = new.id and a.id = s.agency_id;
  return new;
end;
$$;

drop trigger if exists sync_storefront_rate on public.agency_product_rates;
create trigger sync_storefront_rate after insert or update or delete on public.agency_product_rates
for each row execute function private.refresh_storefront_rate();
drop trigger if exists sync_storefront_agency on public.agencies;
create trigger sync_storefront_agency after update of code, name, market, status, portal_slug, portal_enabled on public.agencies
for each row execute function private.refresh_storefront_agency();
drop trigger if exists sync_storefront_product on public.products;
create trigger sync_storefront_product after update of code, name, type, destination, status on public.products
for each row execute function private.refresh_storefront_product();

insert into public.agency_storefront_items (
  tenant_id, agency_id, agency_slug, agency_name, agency_market,
  product_id, product_code, product_name, product_type, destination,
  sale_amount, currency, unit, valid_from, valid_to, is_active
)
select
  r.tenant_id, a.id, a.portal_slug, a.name, a.market,
  p.id, p.code, p.name, p.type, p.destination,
  r.sale_amount, r.currency, r.unit, r.valid_from, r.valid_to,
  (a.status = 'ACTIVE' and a.portal_enabled and p.status = 'ACTIVE')
from public.agency_product_rates r
join public.agencies a on a.id = r.agency_id and a.tenant_id = r.tenant_id
join public.products p on p.id = r.product_id and p.tenant_id = r.tenant_id
on conflict (agency_id, product_id, valid_from) do update set
  agency_slug = excluded.agency_slug,
  agency_name = excluded.agency_name,
  agency_market = excluded.agency_market,
  product_code = excluded.product_code,
  product_name = excluded.product_name,
  product_type = excluded.product_type,
  destination = excluded.destination,
  sale_amount = excluded.sale_amount,
  currency = excluded.currency,
  unit = excluded.unit,
  valid_to = excluded.valid_to,
  is_active = excluded.is_active,
  updated_at = now();

create or replace function private.prepare_public_booking_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.agency_storefront_items%rowtype;
  quantity integer;
begin
  select * into item
  from public.agency_storefront_items
  where agency_slug = new.agency_slug
    and product_id = new.product_id
    and is_active
    and new.service_date between valid_from and valid_to
  order by valid_from desc
  limit 1;

  if item.id is null then
    raise exception 'El servicio o la tarifa ya no están disponibles para esa fecha';
  end if;

  quantity := case when item.unit = 'PER_PERSON' then new.adults + new.children else 1 end;
  new.reference := 'WEB-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(new.id::text, '-', ''), 1, 6));
  new.tenant_id := item.tenant_id;
  new.agency_id := item.agency_id;
  new.unit_price := item.sale_amount;
  new.total_amount := item.sale_amount * quantity;
  new.currency := item.currency;
  new.unit := item.unit;
  new.status := 'NEW';
  new.quote_id := null;
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists prepare_public_booking_request on public.public_booking_requests;
create trigger prepare_public_booking_request before insert on public.public_booking_requests
for each row execute function private.prepare_public_booking_request();

revoke all on function private.refresh_storefront_rate() from public, anon, authenticated;
revoke all on function private.refresh_storefront_agency() from public, anon, authenticated;
revoke all on function private.refresh_storefront_product() from public, anon, authenticated;
revoke all on function private.prepare_public_booking_request() from public, anon, authenticated;

alter table public.agency_storefront_items enable row level security;
alter table public.public_booking_requests enable row level security;

drop policy if exists "public reads active storefront" on public.agency_storefront_items;
create policy "public reads active storefront" on public.agency_storefront_items
for select to anon using (is_active and current_date between valid_from and valid_to);
drop policy if exists "tenant reads storefront" on public.agency_storefront_items;
create policy "tenant reads storefront" on public.agency_storefront_items
for select to authenticated using (tenant_id = (select private.current_tenant_id()));

drop policy if exists "public submits booking request" on public.public_booking_requests;
create policy "public submits booking request" on public.public_booking_requests
for insert to anon with check (
  status = 'NEW'
  and exists (
    select 1 from public.agency_storefront_items s
    where s.agency_slug = public_booking_requests.agency_slug
      and s.product_id = public_booking_requests.product_id
      and s.agency_id = public_booking_requests.agency_id
      and s.tenant_id = public_booking_requests.tenant_id
      and s.is_active
      and public_booking_requests.service_date between s.valid_from and s.valid_to
  )
);
drop policy if exists "tenant reads booking requests" on public.public_booking_requests;
create policy "tenant reads booking requests" on public.public_booking_requests
for select to authenticated using (tenant_id = (select private.current_tenant_id()));
drop policy if exists "tenant updates booking requests" on public.public_booking_requests;
create policy "tenant updates booking requests" on public.public_booking_requests
for update to authenticated
using (tenant_id = (select private.current_tenant_id()))
with check (tenant_id = (select private.current_tenant_id()));

revoke all on public.agency_storefront_items from public, anon, authenticated;
grant select on public.agency_storefront_items to anon, authenticated;
revoke all on public.public_booking_requests from public, anon, authenticated;
grant insert (id, agency_slug, product_id, service_date, adults, children, customer_name, email, phone, notes)
  on public.public_booking_requests to anon;
grant select, update on public.public_booking_requests to authenticated;

