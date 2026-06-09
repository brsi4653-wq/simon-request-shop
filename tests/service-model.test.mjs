import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const indexHtml = await readFile(new URL("../docs/index.html", import.meta.url), "utf8");
const adminHtml = await readFile(new URL("../docs/admin.html", import.meta.url), "utf8");
const itemModel = await readFile(new URL("../docs/assets/item-model.js", import.meta.url), "utf8");
const siteJs = await readFile(new URL("../docs/assets/site.js", import.meta.url), "utf8");
const resetSql = await readFile(new URL("../supabase-shop-business-reset.sql", import.meta.url), "utf8");

test("homepage explains the custom design and fulfillment service", () => {
  assert.match(indexHtml, /Your idea\. Designed, made, and shipped\./);
  assert.match(indexHtml, /Choose a garment/);
  assert.match(indexHtml, /Send your idea/);
  assert.match(indexHtml, /We design and ship it/);
});

test("image-free listings use a deliberate placeholder instead of the demo product image", () => {
  assert.match(siteJs, /Image coming soon/);
  assert.doesNotMatch(siteJs, /main_image_url \|\| "images\/items\/demo-item\.png"/);
});

test("admin wording describes garments and supported design options", () => {
  assert.match(adminHtml, />Garment name</);
  assert.match(adminHtml, />Garment category</);
  assert.match(adminHtml, />Supported design options/);
  assert.match(adminHtml, />Fulfillment notes/);
});

test("item modes use the new service-model labels while preserving database values", () => {
  assert.match(itemModel, /Full custom design/);
  assert.match(itemModel, /Limited placement customization/);
  assert.match(itemModel, /Ready-made design/);
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
