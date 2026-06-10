import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const indexHtml = await readFile(new URL("../docs/index.html", import.meta.url), "utf8");
const adminHtml = await readFile(new URL("../docs/admin.html", import.meta.url), "utf8");
const itemModel = await readFile(new URL("../docs/assets/item-model.js", import.meta.url), "utf8");
const siteJs = await readFile(new URL("../docs/assets/site.js", import.meta.url), "utf8");
const resetSql = await readFile(new URL("../supabase-shop-business-reset.sql", import.meta.url), "utf8");
const renewSql = await readFile(new URL("../supabase-shop-full-renew.sql", import.meta.url), "utf8");
const oneLineRenewSql = await readFile(new URL("../RUN-THIS-SHIPS-RENEWAL.sql", import.meta.url), "utf8");
const shopifyMigrationSql = await readFile(new URL("../supabase-shop-shopify-links.sql", import.meta.url), "utf8").catch(() => "");

test("homepage presents SHIPS as an independent clothing brand", () => {
  assert.match(indexHtml, /Designed, made, and shipped\./);
  assert.match(indexHtml, /independent clothing project based in Nova Scotia/i);
  assert.match(indexHtml, /View collection/);
  assert.match(indexHtml, /Browse garments/);
  assert.doesNotMatch(indexHtml, /Your idea|Send us your artwork|Send your idea|We design and ship it|Choose a garment/i);
});

test("image-free listings use a deliberate placeholder instead of the demo product image", () => {
  assert.match(siteJs, /Image coming soon/);
  assert.doesNotMatch(siteJs, /main_image_url \|\| "images\/items\/demo-item\.png"/);
});

test("admin wording describes garments, releases, and garment details", () => {
  assert.match(adminHtml, /manage garments, collections, and releases/i);
  assert.match(adminHtml, />Garment name</);
  assert.match(adminHtml, />Garment type</);
  assert.match(adminHtml, />Garment details/);
  assert.match(adminHtml, />Fulfillment notes/);
  assert.match(adminHtml, /Garment Request Preview/);
  assert.doesNotMatch(adminHtml, /Full custom design|Limited placement customization|Design Request Preview/);
});

test("item modes use brand-first labels while preserving database values", () => {
  assert.match(itemModel, /Collection garment/);
  assert.match(itemModel, /Selected garment/);
  assert.match(itemModel, /Request garment/);
  assert.doesNotMatch(itemModel, /Full custom design|Limited placement customization|Start a custom design/);
});

test("product pages keep custom printing secondary", () => {
  assert.match(siteJs, /Custom print requests may be available for select garments/);
  assert.doesNotMatch(siteJs, /Start with an idea|Send artwork|prepares the design|Start your design request/i);
});

test("catalogue reset deletes old items, excludes McLaren, clears images, and creates the requested collections", () => {
  assert.match(resetSql, /delete from public\.shop_items/i);
  assert.doesNotMatch(resetSql, /McLaren Past v Future/i);
  assert.match(resetSql, /'Pants', 'pants'/);
  assert.match(resetSql, /'T-Shirts', 't-shirts'/);
  assert.match(resetSql, /'Hoodies', 'hoodies'/);
  assert.match(resetSql, /main_image_url[\s\S]*''/i);
  assert.match(resetSql, /gallery_urls[\s\S]*'\[\]'/i);
});

test("full renewal script rebuilds the complete shop and uses standalone garment inserts", () => {
  assert.match(renewSql, /drop table if exists public\.shop_items/i);
  assert.match(renewSql, /create table public\.shop_items/i);
  assert.match(renewSql, /create table public\.shop_collections/i);
  assert.match(renewSql, /create table public\.shop_item_collections/i);
  assert.match(renewSql, /create or replace view public\.public_shop_items/i);
  assert.match(renewSql, /insert into public\.shop_items[\s\S]*'paint-detailed-heavyweight-tee'/i);
  assert.doesNotMatch(renewSql, /\),\s*\(\s*'paint-detailed-heavyweight-tee'/i);
  assert.match(renewSql, /commit;/i);
  assert.match(renewSql, /'Hoodie'/);
  assert.match(renewSql, /'T-Shirt'/);
  assert.match(renewSql, /'Pants'/);
  assert.doesNotMatch(renewSql, /Send SHIPS|Full custom|Limited placement|custom concept/i);
});

test("run-this renewal cannot be accidentally executed as a selected middle line", () => {
  assert.equal(oneLineRenewSql.trim().split(/\r?\n/).length, 1);
  assert.match(oneLineRenewSql, /^begin;/i);
  assert.match(oneLineRenewSql, /'paint-detailed-heavyweight-tee'/i);
  assert.match(oneLineRenewSql, /Sky Fade/i);
  assert.match(oneLineRenewSql, /commit;/i);
});

test("custom domain and GitHub Pages paths remain safe", async () => {
  const cname = await readFile(new URL("../docs/CNAME", import.meta.url), "utf8");
  assert.equal(cname.trim(), "theshipsshop.com");

  const publicFiles = [indexHtml, adminHtml, itemModel, siteJs].join("\n");
  assert.doesNotMatch(publicFiles, /github\.io|\/simon-request-shop\//i);
});

test("admin editor exposes plain Shopify URL and availability controls", () => {
  assert.match(adminHtml, /Shopify Product URL/);
  assert.match(adminHtml, /name="shopify_product_url"/);
  assert.match(adminHtml, /name="availability_status"/);
  for (const status of ["available", "coming-soon", "sold-out", "request-only"]) {
    assert.match(adminHtml, new RegExp(`value="${status}"`));
  }
});

test("shop uses plain Shopify links without Shopify APIs or credentials", () => {
  const publicFiles = [indexHtml, adminHtml, itemModel, siteJs].join("\n");
  assert.match(siteJs, /getProductAction/);
  assert.doesNotMatch(publicFiles, /Storefront API|Shopify API|shopify[_-]token|access[_-]token/i);
});

test("Shopify availability migration preserves existing garments and exposes public fields", () => {
  assert.match(shopifyMigrationSql, /alter table public\.shop_items[\s\S]*shopify_product_url/i);
  assert.match(shopifyMigrationSql, /alter table public\.shop_items[\s\S]*availability_status/i);
  assert.match(shopifyMigrationSql, /request-only/i);
  assert.match(shopifyMigrationSql, /create or replace view public\.public_shop_items/i);
  assert.doesNotMatch(shopifyMigrationSql, /delete from public\.shop_items|drop table public\.shop_items/i);
});
