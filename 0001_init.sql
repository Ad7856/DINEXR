-- AR Menu: core schema. Money = integer paise (minor units).
create extension if not exists pgcrypto;

create type member_role as enum ('platform_admin','owner','manager','kitchen');
create type order_status as enum ('pending','accepted','preparing','ready','served','cancelled');
create type order_mode as enum ('dine_in','takeaway');

create table restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  name text not null, description text, logo_url text,
  phone text, address text, currency text not null default 'INR',
  is_ordering_enabled boolean not null default true,
  takeaway_enabled boolean not null default false,
  theme jsonb not null default '{}', opening_hours jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table restaurant_settings (
  restaurant_id uuid primary key references restaurants on delete cascade,
  tax_bps int not null default 500 check (tax_bps between 0 and 10000),
  service_charge_bps int not null default 0 check (service_charge_bps between 0 and 10000)
);
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text, created_at timestamptz not null default now()
);
create table restaurant_members (
  restaurant_id uuid references restaurants on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role member_role not null,
  primary key (restaurant_id, user_id)
);
create table categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants on delete cascade,
  name text not null, sort_order int not null default 0,
  unique (restaurant_id, name)
);
create table dishes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants on delete cascade,
  category_id uuid references categories on delete set null,
  name text not null, description text,
  price int not null check (price >= 0),
  discounted_price int check (discounted_price >= 0 and discounted_price <= price),
  image_url text, ingredients text[] not null default '{}', allergens text[] not null default '{}',
  is_veg boolean not null, is_available boolean not null default true,
  is_featured boolean not null default false, prep_minutes int,
  model_glb_url text, model_usdz_url text, model_width_mm int, model_depth_mm int, -- set dims only if verified
  created_at timestamptz not null default now()
);
create index on dishes (restaurant_id, category_id);
create table dish_customizations (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid not null references dishes on delete cascade,
  group_name text not null, option_name text not null,
  price_delta int not null default 0 check (price_delta >= 0)
);
create table restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants on delete cascade,
  code text not null check (code ~ '^[a-z0-9-]{2,30}$'), label text not null,
  is_active boolean not null default true,
  unique (restaurant_id, code)
);
create table orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants,
  table_id uuid references restaurant_tables,
  order_number text not null, mode order_mode not null default 'dine_in',
  status order_status not null default 'pending',
  customer_name text, customer_phone text, notes text, cancel_reason text,
  subtotal int not null, tax int not null, service_charge int not null, total int not null,
  idempotency_key text not null, tracking_token_hash text not null,
  created_at timestamptz not null default now(),
  unique (restaurant_id, order_number), unique (restaurant_id, idempotency_key)
);
create index on orders (restaurant_id, status, created_at desc);
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders on delete cascade,
  dish_id uuid references dishes on delete set null,
  name_snapshot text not null, unit_price int not null, quantity int not null check (quantity between 1 and 50),
  customizations jsonb not null default '[]', instructions text
);
create table order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references orders on delete cascade,
  status order_status not null, changed_by uuid, created_at timestamptz not null default now()
);

-- RLS: public customers use server routes (service role, server-only); staff use JWT.
create function is_member(rid uuid, roles member_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from restaurant_members m where m.restaurant_id = rid
    and m.user_id = auth.uid() and (m.role = any(roles) or m.role = 'platform_admin'));
$$;

do $$ declare t text; begin
  foreach t in array array['restaurants','restaurant_settings','profiles','restaurant_members','categories',
    'dishes','dish_customizations','restaurant_tables','orders','order_items','order_status_history']
  loop execute format('alter table %I enable row level security', t); end loop;
end $$;

create policy menu_read on categories for select using (true);
create policy menu_read on dishes for select using (is_available or is_member(restaurant_id, '{owner,manager}'));
create policy rest_read on restaurants for select using (true);
create policy rest_write on restaurants for update using (is_member(id, '{owner}'));
create policy settings_rw on restaurant_settings for all using (is_member(restaurant_id, '{owner}'));
create policy cat_write on categories for all using (is_member(restaurant_id, '{owner,manager}'));
create policy dish_write on dishes for all using (is_member(restaurant_id, '{owner,manager}'));
create policy cust_rw on dish_customizations for all
  using (exists (select 1 from dishes d where d.id = dish_id and is_member(d.restaurant_id, '{owner,manager}')));
create policy tbl_rw on restaurant_tables for all using (is_member(restaurant_id, '{owner,manager}'));
create policy mem_read on restaurant_members for select using (user_id = auth.uid() or is_member(restaurant_id, '{owner}'));
create policy prof_self on profiles for all using (id = auth.uid());
create policy ord_staff on orders for select using (is_member(restaurant_id, '{owner,manager,kitchen}'));
create policy ord_staff_upd on orders for update using (is_member(restaurant_id, '{owner,manager,kitchen}'));
create policy oi_staff on order_items for select
  using (exists (select 1 from orders o where o.id = order_id and is_member(o.restaurant_id, '{owner,manager,kitchen}')));
create policy hist_staff on order_status_history for select
  using (exists (select 1 from orders o where o.id = order_id and is_member(o.restaurant_id, '{owner,manager,kitchen}')));
-- No anon policies on orders/order_items: customers track via a server route that checks the tracking token.
