-- PilotyaSign Pro: business-grade roles and platform identity.

create or replace function public.pilotya_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt()->>'email','')) = 'info@jsinnovia.store';
$$;

create or replace function public.pilotya_can_write(p_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.pilotya_is_super_admin() or exists (
    select 1
    from public.pilotya_memberships m
    where m.tenant_id = p_tenant
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin', 'commercial', 'super_admin')
  );
$$;

create or replace function public.pilotya_add_platform_super_admin_to_tenant()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.pilotya_memberships(tenant_id,user_id,role)
  select new.id,u.id,'super_admin'
  from auth.users u
  where lower(coalesce(u.email,''))='info@jsinnovia.store'
  on conflict (tenant_id,user_id) do update set role='super_admin';
  return new;
end;
$$;

create or replace function public.pilotya_sync_platform_super_admin()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if lower(coalesce(new.email,''))='info@jsinnovia.store' then
    insert into public.pilotya_memberships(tenant_id,user_id,role)
    select t.id,new.id,'super_admin' from public.pilotya_tenants t
    on conflict (tenant_id,user_id) do update set role='super_admin';
  end if;
  return new;
end;
$$;

delete from public.pilotya_memberships m
using auth.users u
where m.user_id=u.id
  and m.role='super_admin'
  and lower(coalesce(u.email,''))='info@jsinnovia.com';

insert into public.pilotya_memberships(tenant_id,user_id,role)
select t.id,u.id,'super_admin'
from public.pilotya_tenants t
cross join auth.users u
where lower(coalesce(u.email,''))='info@jsinnovia.store'
on conflict (tenant_id,user_id) do update set role='super_admin';

drop policy if exists pilotya_activities_all on public.pilotya_activities;
create policy pilotya_activities_select on public.pilotya_activities for select to authenticated using (public.pilotya_has_tenant(tenant_id));
create policy pilotya_activities_insert on public.pilotya_activities for insert to authenticated with check (public.pilotya_can_write(tenant_id));

drop policy if exists pilotya_leads_all on public.pilotya_leads;
create policy pilotya_leads_select on public.pilotya_leads for select to authenticated using (public.pilotya_has_tenant(tenant_id));
create policy pilotya_leads_insert on public.pilotya_leads for insert to authenticated with check (public.pilotya_can_write(tenant_id));
create policy pilotya_leads_update on public.pilotya_leads for update to authenticated using (public.pilotya_can_write(tenant_id)) with check (public.pilotya_can_write(tenant_id));
create policy pilotya_leads_delete on public.pilotya_leads for delete to authenticated using (public.pilotya_has_admin_role(tenant_id));

drop policy if exists pilotya_quotes_all on public.pilotya_quotes;
create policy pilotya_quotes_select on public.pilotya_quotes for select to authenticated using (public.pilotya_has_tenant(tenant_id));
create policy pilotya_quotes_insert on public.pilotya_quotes for insert to authenticated with check (public.pilotya_can_write(tenant_id));
create policy pilotya_quotes_update on public.pilotya_quotes for update to authenticated using (public.pilotya_can_write(tenant_id)) with check (public.pilotya_can_write(tenant_id));
create policy pilotya_quotes_delete on public.pilotya_quotes for delete to authenticated using (public.pilotya_has_admin_role(tenant_id));

drop policy if exists pilotya_contracts_all on public.pilotya_contracts;
create policy pilotya_contracts_select on public.pilotya_contracts for select to authenticated using (public.pilotya_has_tenant(tenant_id));
create policy pilotya_contracts_insert on public.pilotya_contracts for insert to authenticated with check (public.pilotya_can_write(tenant_id));
create policy pilotya_contracts_update on public.pilotya_contracts for update to authenticated using (public.pilotya_can_write(tenant_id)) with check (public.pilotya_can_write(tenant_id));
create policy pilotya_contracts_delete on public.pilotya_contracts for delete to authenticated using (public.pilotya_has_admin_role(tenant_id));

drop policy if exists pilotya_payments_all on public.pilotya_payments;
create policy pilotya_payments_select on public.pilotya_payments for select to authenticated using (public.pilotya_has_tenant(tenant_id));
create policy pilotya_payments_insert on public.pilotya_payments for insert to authenticated with check (public.pilotya_has_admin_role(tenant_id));
create policy pilotya_payments_update on public.pilotya_payments for update to authenticated using (public.pilotya_has_admin_role(tenant_id)) with check (public.pilotya_has_admin_role(tenant_id));
create policy pilotya_payments_delete on public.pilotya_payments for delete to authenticated using (public.pilotya_has_admin_role(tenant_id));

drop policy if exists pilotya_commissions_select on public.pilotya_commissions;
create policy pilotya_commissions_select on public.pilotya_commissions for select to authenticated using (public.pilotya_has_admin_role(tenant_id));

revoke all on function public.pilotya_is_super_admin() from public, anon;
revoke all on function public.pilotya_has_tenant(uuid) from public, anon;
revoke all on function public.pilotya_has_admin_role(uuid) from public, anon;
revoke all on function public.pilotya_can_write(uuid) from public, anon;
grant execute on function public.pilotya_is_super_admin() to authenticated;
grant execute on function public.pilotya_has_tenant(uuid) to authenticated;
grant execute on function public.pilotya_has_admin_role(uuid) to authenticated;
grant execute on function public.pilotya_can_write(uuid) to authenticated;

create index if not exists pilotya_leads_tenant_idx on public.pilotya_leads(tenant_id);
create index if not exists pilotya_quotes_tenant_idx on public.pilotya_quotes(tenant_id);
create index if not exists pilotya_contracts_tenant_idx on public.pilotya_contracts(tenant_id);
create index if not exists pilotya_payments_tenant_idx on public.pilotya_payments(tenant_id);
create index if not exists pilotya_commissions_tenant_idx on public.pilotya_commissions(tenant_id);
create index if not exists pilotya_activities_tenant_idx on public.pilotya_activities(tenant_id);
