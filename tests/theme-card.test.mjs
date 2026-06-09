import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { THEMES } from "../docs/assets/item-model.js";

const siteJs = await readFile(new URL("../docs/assets/site.js", import.meta.url), "utf8");
const siteCss = await readFile(new URL("../docs/assets/site.css", import.meta.url), "utf8");
const indexHtml = await readFile(new URL("../docs/index.html", import.meta.url), "utf8");

test("collection cards receive the complete selected theme palette", () => {
  assert.match(siteJs, /--card-ink:/);
  assert.match(siteJs, /--card-muted:/);
  assert.match(siteJs, /--card-surface:/);
  assert.match(siteJs, /--card-line:/);
});

test("collection card text uses its own theme colors", () => {
  assert.match(siteCss, /\.item-card\s*\{[^}]*color:\s*var\(--card-ink(?:,[^)]+)?\)/s);
  assert.match(siteCss, /\.item-card p\s*\{[^}]*color:\s*var\(--card-muted(?:,[^)]+)?\)/s);
  assert.match(siteCss, /\.item-card \.kicker\s*\{\s*color:\s*var\(--card-muted(?:,[^)]+)?\)/);
  assert.match(siteCss, /\.item-card \.text-action\s*\{[^}]*color:\s*var\(--card-ink(?:,[^)]+)?\)/s);
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
