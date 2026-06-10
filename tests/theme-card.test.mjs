import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DEFAULT_GLOBAL_THEME, resolveProductTheme, THEMES } from "../docs/assets/item-model.js";

const siteJs = await readFile(new URL("../docs/assets/site.js", import.meta.url), "utf8");
const siteCss = await readFile(new URL("../docs/assets/site.css", import.meta.url), "utf8");
const indexHtml = await readFile(new URL("../docs/index.html", import.meta.url), "utf8");
const adminHtml = await readFile(new URL("../docs/admin.html", import.meta.url), "utf8");
const adminJs = await readFile(new URL("../docs/assets/admin.js", import.meta.url), "utf8");
const themeSql = await readFile(new URL("../supabase-shop-themes.sql", import.meta.url), "utf8");
const setupSql = await readFile(new URL("../supabase-shop-setup.sql", import.meta.url), "utf8");

test("theme catalogue includes the requested reusable presets", () => {
  assert.equal(DEFAULT_GLOBAL_THEME, "core");
  assert.equal(THEMES.core.name, "Core / Monochrome");
  assert.equal(THEMES.sunfade.name, "Sunfade / Pink White");
  for (const key of ["blue", "orange", "yellow", "green", "red"]) assert.ok(THEMES[key]);
});

test("product themes inherit global unless explicitly selected", () => {
  assert.equal(resolveProductTheme("global", "sunfade"), "sunfade");
  assert.equal(resolveProductTheme("", "blue"), "blue");
  assert.equal(resolveProductTheme("red", "blue"), "red");
});

test("collection cards use the global palette instead of product themes", () => {
  assert.doesNotMatch(siteJs, /--card-accent:/);
  assert.doesNotMatch(siteJs, /--card-ink:/);
  assert.match(siteCss, /\.item-card\s*\{[^}]*background:\s*var\(--soft/s);
});

test("collection card text uses global theme colors", () => {
  assert.match(siteCss, /\.item-card\s*\{[^}]*color:\s*var\(--ink\)/s);
  assert.match(siteCss, /\.item-card p\s*\{[^}]*color:\s*var\(--muted\)/s);
  assert.match(siteCss, /\.item-card \.kicker\s*\{\s*color:\s*var\(--muted\)/);
  assert.match(siteCss, /\.item-card \.text-action\s*\{[^}]*color:\s*var\(--ink\)/s);
});

test("collection cards stay aligned instead of using a staggered offset", () => {
  assert.doesNotMatch(siteCss, /\.item-card:nth-child\([^)]*\)\s*\{\s*transform:\s*translateY/);
});

test("collection uses a four-column product grid on wide screens", () => {
  assert.match(siteCss, /\.item-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s);
});

test("collection images use a stable square area and cards cannot overflow their columns", () => {
  assert.match(siteCss, /\.item-card\s*\{[^}]*min-width:\s*0/s);
  assert.match(siteCss, /\.item-image\s*\{[^}]*aspect-ratio:\s*1\s*\/\s*1/s);
  assert.match(siteCss, /\.item-card h2\s*\{[^}]*overflow-wrap:\s*anywhere/s);
});

test("public page version-pins the paired theme assets", () => {
  assert.match(indexHtml, /assets\/site\.css\?v=[^"]+/);
  assert.match(indexHtml, /assets\/site\.js\?v=[^"]+/);
});

test("public site loads the global theme setting", () => {
  assert.match(siteJs, /public_shop_settings/);
  assert.match(siteJs, /global_theme/);
  assert.match(siteJs, /resolveProductTheme/);
});

test("admin exposes and saves the global theme separately from product themes", () => {
  assert.match(adminHtml, /Global Website Theme/);
  assert.match(adminHtml, /id="global-theme-options"/);
  assert.match(adminJs, /Use Global Theme/);
  assert.match(adminJs, /shop_settings/);
  assert.match(adminJs, /saveGlobalTheme/);
});

test("additive theme SQL creates secure global settings storage", () => {
  assert.match(themeSql, /create table if not exists public\.shop_settings/i);
  assert.match(themeSql, /global_theme/i);
  assert.match(themeSql, /create or replace view public\.public_shop_settings/i);
  assert.match(themeSql, /public\.is_portfolio_admin\(\)/i);
});

test("fresh shop setup includes the global theme system", () => {
  assert.match(setupSql, /create table if not exists public\.shop_settings/i);
  assert.match(setupSql, /public_shop_settings/i);
  assert.match(setupSql, /'global', 'core'/i);
});

test("collection thumbnails fill their square frame without stretching", () => {
  assert.match(siteCss, /\.item-image img\s*\{[^}]*object-fit:\s*cover/s);
  assert.match(siteCss, /\.item-image img\s*\{[^}]*object-position:\s*center/s);
});

test("every theme has readable main and muted card text", () => {
  for (const [name, theme] of Object.entries(THEMES)) {
    assert.ok(contrastRatio(theme.ink, theme.soft) >= 7, `${name} main text contrast`);
    assert.ok(contrastRatio(theme.muted, theme.soft) >= 4.5, `${name} muted text contrast`);
  }
});

function contrastRatio(first, second) {
  const highLow = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return (highLow[0] + 0.05) / (highLow[1] + 0.05);
}

function relativeLuminance(hex) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  return channels
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
}
