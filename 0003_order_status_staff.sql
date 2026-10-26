-- Phase 4A: status changes only via a validated RPC; kitchen can read table labels; realtime for orders.

-- Staff could otherwise PATCH orders directly with their JWT and skip transition rules.
drop policy if exists ord_staff_upd on orders;

create policy tbl_staff_read on restaurant_tables for select
  using (is_member(restaurant_id, '{owner,manager,kitchen}'));

create or replace function update_order_status(
  p_order uuid, p_restaurant uuid, p_to order_status, p_expected order_status, p_actor uuid, p_reason text)
returns text language plpgsql security definer set search_path = public as $$
declare cur order_status;
begin
  select status into cur from orders where id = p_order and restaurant_id = p_restaurant for update;
  if not found then return 'not_found'; end if;
  if cur <> p_expected then return 'conflict'; end if;
  if not ((cur = 'pending'   and p_to in ('accepted','cancelled'))
       or (cur = 'accepted'  and p_to in ('preparing','cancelled'))
       or (cur = 'preparing' and p_to in ('ready','cancelled'))
       or (cur = 'ready'     and p_to = 'served')) then return 'invalid'; end if;
  if p_to = 'cancelled' and coalesce(btrim(p_reason), '') = '' then return 'reason_required'; end if;
  update orders set status = p_to,
    cancel_reason = case when p_to = 'cancelled' then left(btrim(p_reason), 300) else cancel_reason end
  where id = p_order;
  insert into order_status_history (order_id, status, changed_by) values (p_order, p_to, p_actor);
  return 'ok';
end $$;
revoke all on function update_order_status(uuid, uuid, order_status, order_status, uuid, text) from public, anon, authenticated;
grant execute on function update_order_status(uuid, uuid, order_status, order_status, uuid, text) to service_role;

do $$ begin
  alter publication supabase_realtime add table orders;
exception when duplicate_object then null; when undefined_object then null;
end $$;
