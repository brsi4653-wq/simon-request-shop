begin;

alter table public.shop_items
  add column if not exists early_access_enabled boolean not null default false;

alter table public.shop_items
  add column if not exists early_access_code text not null default '';

create or replace function public.verify_shop_early_access(p_item_id uuid, p_code text)
returns text
language sql
stable
security definer
set search_path = public
as $function$
  select item.shopify_product_url
  from public.shop_items item
  where item.id = p_item_id
    and item.is_published = true
    and item.availability_status = 'available'
    and item.early_access_enabled = true
    and length(item.early_access_code) > 0
    and lower(trim(item.early_access_code)) = lower(trim(p_code))
  limit 1;
$function$;

revoke all on function public.verify_shop_early_access(uuid, text) from public;
grant execute on function public.verify_shop_early_access(uuid, text) to anon, authenticated;

drop view if exists public.public_shop_items;
create view public.public_shop_items
with (security_barrier = true)
as
select
  item.id,
  item.slug,
  item.title,
  item.eyebrow,
  item.summary,
  item.description,
  item.main_image_url,
  item.gallery_urls,
  item.sizes,
  item.colors,
  item.customization_options,
  item.production_note,
  item.price_note,
  item.item_mode,
  item.request_subject,
  item.request_intro,
  item.theme,
  item.is_featured,
  item.created_at,
  coalesce((
    select jsonb_agg(collection.slug order by collection.sort_order, collection.name)
    from public.shop_item_collections membership
    join public.shop_collections collection on collection.id = membership.collection_id
    where membership.item_id = item.id and collection.is_visible = true
  ), '[]'::jsonb) as collection_slugs,
  case when item.early_access_enabled then '' else item.shopify_product_url end as shopify_product_url,
  item.availability_status,
  item.early_access_enabled
from public.shop_items item
where item.is_published = true;

revoke all on public.public_shop_items from public;
grant select on public.public_shop_items to anon, authenticated;

commit;
