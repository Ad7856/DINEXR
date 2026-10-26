-- Phase 3: atomic order creation, public customization read, integrity checks.
create sequence if not exists order_number_seq;
create unique index if not exists orders_token_hash_key on orders (tracking_token_hash);
alter table orders add constraint orders_total_check check (total = subtotal + tax + service_charge);

-- Customizations must be readable for the public menu (only for available dishes).
create policy cust_read on dish_customizations for select
  using (exists (select 1 from dishes d where d.id = dish_id and d.is_available));

-- Creates order + items + first history row in ONE transaction. Idempotent per (restaurant, key).
create or replace function create_order(p jsonb)
returns table (out_order_id uuid, out_order_number text, out_duplicate boolean)
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_num text; v_rid uuid := (p->>'restaurant_id')::uuid;
begin
  select o.id, o.order_number into v_id, v_num from orders o
    where o.restaurant_id = v_rid and o.idempotency_key = p->>'idempotency_key';
  if found then return query select v_id, v_num, true; return; end if;

  v_num := 'DX-' || lpad(nextval('order_number_seq')::text, 6, '0');
  insert into orders (restaurant_id, table_id, order_number, mode, customer_name, customer_phone, notes,
                      subtotal, tax, service_charge, total, idempotency_key, tracking_token_hash)
  values (v_rid, (p->>'table_id')::uuid, v_num, (p->>'mode')::order_mode, p->>'customer_name', p->>'customer_phone',
          p->>'notes', (p->>'subtotal')::int, (p->>'tax')::int, (p->>'service_charge')::int, (p->>'total')::int,
          p->>'idempotency_key', p->>'tracking_token_hash')
  returning id into v_id;

  insert into order_items (order_id, dish_id, name_snapshot, unit_price, quantity, customizations, instructions)
  select v_id, (i->>'dish_id')::uuid, i->>'name', (i->>'unit_price')::int, (i->>'quantity')::int,
         coalesce(i->'customizations', '[]'::jsonb), i->>'instructions'
  from jsonb_array_elements(p->'items') i;

  insert into order_status_history (order_id, status) values (v_id, 'pending');
  return query select v_id, v_num, false;
exception when unique_violation then
  select o.id, o.order_number into v_id, v_num from orders o
    where o.restaurant_id = v_rid and o.idempotency_key = p->>'idempotency_key';
  return query select v_id, v_num, true;
end $$;
revoke all on function create_order(jsonb) from public, anon, authenticated;
grant execute on function create_order(jsonb) to service_role;
