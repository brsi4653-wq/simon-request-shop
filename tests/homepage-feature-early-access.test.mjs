import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const indexHtml = await readFile(new URL("../docs/index.html", import.meta.url), "utf8");
const siteJs = await readFile(new URL("../docs/assets/site.js", import.meta.url), "utf8");
const itemModelJs = await readFile(new URL("../docs/assets/item-model.js", import.meta.url), "utf8");
const siteCss = await readFile(new URL("../docs/assets/site.css", import.meta.url), "utf8");
const adminHtml = await readFile(new URL("../docs/admin.html", import.meta.url), "utf8");
const adminJs = await readFile(new URL("../docs/assets/admin.js", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase-shop-home-feature-early-access.sql", import.meta.url), "utf8");

test("homepage contains the catalogue directly below an optional compact featured garment", () => {
  assert.match(indexHtml, /id="homepage-feature"/);
  assert.match(indexHtml, /id="collection-filters"/);
  assert.ok(indexHtml.indexOf('id="homepage-feature"') < indexHtml.indexOf('id="collection-filters"'));
  assert.doesNotMatch(indexHtml, /id="process-section"|id="home-button"|data-view="collection"/);
  assert.doesNotMatch(indexHtml, /<nav aria-label="Main navigation">/);
  assert.match(siteJs, /renderHomepageFeature/);
  assert.match(siteJs, /items\.filter\(\(item\) => !item\.is_featured\)/);
  assert.match(siteCss, /\.homepage-feature/);
});

test("admin supports one homepage featured garment and private early access codes", () => {
  assert.match(adminHtml, /Featured on homepage/);
  assert.match(adminHtml, /name="early_access_enabled"/);
  assert.match(adminHtml, /name="early_access_code"/);
  assert.match(adminJs, /update\(\{ is_featured: false \}\)\.eq\("is_featured", true\)/);
  assert.match(adminJs, /early_access_code/);
});

test("public early-access action verifies through Supabase instead of exposing the checkout URL", () => {
  assert.match(itemModelJs, /GET EARLY WITH A CODE/);
  assert.match(siteJs, /verify_shop_early_access/);
  assert.match(indexHtml, /id="early-access-dialog"/);
  assert.match(migration, /early_access_enabled/i);
  assert.match(migration, /early_access_code/i);
  assert.match(migration, /verify_shop_early_access/i);
  assert.match(migration, /case when item\.early_access_enabled then '' else item\.shopify_product_url end/i);
  assert.doesNotMatch(migration, /delete from public\.shop_items/i);
});

test("early-access dialog can always be closed without submitting a code", () => {
  assert.match(siteJs, /querySelector\("\.dialog-close"\)\.addEventListener\("click"/);
  assert.match(siteJs, /early-access-dialog"\)\.close\(\)/);
});
