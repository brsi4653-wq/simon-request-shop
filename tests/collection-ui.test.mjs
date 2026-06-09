import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const adminHtml = await readFile(new URL("../docs/admin.html", import.meta.url), "utf8");
const adminJs = await readFile(new URL("../docs/assets/admin.js", import.meta.url), "utf8");
const indexHtml = await readFile(new URL("../docs/index.html", import.meta.url), "utf8");
const siteJs = await readFile(new URL("../docs/assets/site.js", import.meta.url), "utf8");
const migrationSql = await readFile(new URL("../supabase-shop-collections-migration.sql", import.meta.url), "utf8");

test("admin exposes collection management and item assignment controls", () => {
  assert.match(adminHtml, /id="new-collection"/);
  assert.match(adminHtml, /id="collection-manager"/);
  assert.match(adminHtml, /id="item-collection-options"/);
});

test("admin saves item collection memberships separately from item content", () => {
  assert.match(adminJs, /shop_item_collections/);
  assert.match(adminJs, /saveItemCollections/);
});

test("public collection page has filter controls and Nova Scotia language", () => {
  assert.match(indexHtml, /id="collection-filters"/);
  assert.match(indexHtml, /Designed in Nova Scotia/);
  assert.match(siteJs, /filterItemsByCollection/);
});

test("collection migration never updates or deletes existing shop items", () => {
  assert.doesNotMatch(migrationSql, /\bupdate\s+public\.shop_items\b/i);
  assert.doesNotMatch(migrationSql, /\bdelete\s+from\s+public\.shop_items\b/i);
});
