create extension if not exists pgcrypto;

create or replace function public.is_portfolio_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as 'select lower(coalesce(auth.jwt() ->> ''email'', '''')) = ''simon_j_brookes@icloud.com''';

create table if not exists public.shop_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null default 'Untitled Item',
  eyebrow text not null default 'Made to request',
  summary text not null default '',
  description text not null default '',
  main_image_url text not null default '',
  gallery_urls jsonb not null default '[]'::jsonb,
  sizes jsonb not null default '[]'::jsonb,
  colors jsonb not null default '[]'::jsonb,
  customization_options jsonb not null default '[]'::jsonb,
  production_note text not null default '',
  price_note text not null default 'Final quote confirmed by email',
  item_mode text not null default 'regular' check (item_mode in ('regular', 'custom', 'hybrid')),
  request_subject text not null default '',
  request_intro text not null default '',
  theme text not null default 'mono' check (theme in ('green', 'orange', 'blue', 'red', 'yellow', 'mono')),
  is_published boolean not null default false,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_shop_item_updated_at()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

drop trigger if exists shop_items_updated_at on public.shop_items;
create trigger shop_items_updated_at
before update on public.shop_items
for each row execute function public.set_shop_item_updated_at();

alter table public.shop_items enable row level security;

drop policy if exists "shop admin reads items" on public.shop_items;
create policy "shop admin reads items" on public.shop_items for select to authenticated
using (public.is_portfolio_admin());

drop policy if exists "shop admin creates items" on public.shop_items;
create policy "shop admin creates items" on public.shop_items for insert to authenticated
with check (public.is_portfolio_admin());

drop policy if exists "shop admin updates items" on public.shop_items;
create policy "shop admin updates items" on public.shop_items for update to authenticated
using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());

drop policy if exists "shop admin deletes items" on public.shop_items;
create policy "shop admin deletes items" on public.shop_items for delete to authenticated
using (public.is_portfolio_admin());

revoke all on public.shop_items from anon, authenticated;
grant select, insert, update, delete on public.shop_items to authenticated;
grant execute on function public.is_portfolio_admin() to authenticated;

drop view if exists public.public_shop_items;
create view public.public_shop_items
with (security_barrier = true)
as
select
  id, slug, title, eyebrow, summary, description, main_image_url, gallery_urls,
  sizes, colors, customization_options, production_note, price_note, item_mode,
  request_subject, request_intro, theme, is_featured, created_at
from public.shop_items
where is_published = true;

revoke all on public.public_shop_items from public;
grant select on public.public_shop_items to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shop-media', 'shop-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "shop admin uploads media" on storage.objects;
create policy "shop admin uploads media" on storage.objects for insert to authenticated
with check (bucket_id = 'shop-media' and public.is_portfolio_admin());

drop policy if exists "shop admin updates media" on storage.objects;
create policy "shop admin updates media" on storage.objects for update to authenticated
using (bucket_id = 'shop-media' and public.is_portfolio_admin())
with check (bucket_id = 'shop-media' and public.is_portfolio_admin());

drop policy if exists "shop admin deletes media" on storage.objects;
create policy "shop admin deletes media" on storage.objects for delete to authenticated
using (bucket_id = 'shop-media' and public.is_portfolio_admin());

insert into public.shop_items (
  slug, title, eyebrow, summary, description, main_image_url, gallery_urls,
  sizes, colors, customization_options, production_note, price_note,
  item_mode, theme, is_published, is_featured
)
values (
  'studio-edition',
  'Studio Edition',
  'First study / demo piece',
  'A clean made-to-request piece shown here as the first test of the studio system.',
  'This temporary listing demonstrates the item system. Replace it with the first real piece when it is ready.',
  'images/items/demo-item.png',
  '["images/items/demo-item.png"]'::jsonb,
  '["Small", "Medium", "Large", "Additional sizes by request"]'::jsonb,
  '["Fresh green", "Cream", "A different color may be requested"]'::jsonb,
  '["Optional name or short phrase", "Font and placement discussed by email"]'::jsonb,
  'Final availability, production timing, shipping, and pricing are confirmed personally before payment.',
  'Final quote confirmed by email',
  'hybrid',
  'mono',
  false,
  false
)
on conflict (slug) do nothing;

select 'shop setup completed successfully' as result;
