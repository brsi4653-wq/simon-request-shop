import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { HEADER_LOGOS } from "../docs/assets/settings-model.js";
import { THEMES } from "../docs/assets/item-model.js";

const indexHtml = await readFile(new URL("../docs/index.html", import.meta.url), "utf8");
const adminHtml = await readFile(new URL("../docs/admin.html", import.meta.url), "utf8");
const siteJs = await readFile(new URL("../docs/assets/site.js", import.meta.url), "utf8");

test("browser and search favicons use the current compact SHIPS mark", async () => {
  const favicon = await readFile(new URL("../docs/favicon.png", import.meta.url));
  const currentMark = await readFile(new URL("../docs/images/logos/ships-favicon.png", import.meta.url));

  assert.deepEqual(favicon, currentMark);
  assert.match(indexHtml, /favicon\.png\?v=20260620-ships-s-dot/);
  assert.match(indexHtml, /apple-touch-icon/);
  assert.match(adminHtml, /favicon\.png\?v=20260620-ships-s-dot/);
});

test("new full and compact SHIPS marks are available in both contrast variants", async () => {
  const expected = [
    "ships-wordmark-black-transparent.png",
    "ships-wordmark-white-transparent.png",
    "ships-mark-black-transparent.png",
    "ships-mark-white-transparent.png",
  ];
  for (const name of expected) await access(new URL(`../docs/images/logos/${name}`, import.meta.url));
  assert.equal(HEADER_LOGOS["wordmark-black"], "images/logos/ships-wordmark-black-transparent.png");
  assert.equal(HEADER_LOGOS["wordmark-white"], "images/logos/ships-wordmark-white-transparent.png");
  assert.equal(HEADER_LOGOS["mark-black"], "images/logos/ships-mark-black-transparent.png");
  assert.equal(HEADER_LOGOS["mark-white"], "images/logos/ships-mark-white-transparent.png");
});

test("public and admin branding no longer reference the retired logo set", () => {
  const source = indexHtml + adminHtml + siteJs;
  assert.doesNotMatch(source, /ships-main-|ships-tag-display|the-ships-shop-display/);
  assert.match(indexHtml, /ships-wordmark-white-transparent\.png/);
  assert.match(adminHtml, /ships-wordmark-black-transparent\.png/);
  assert.match(indexHtml, /favicon\.ico\?v=20260620-ships-s-dot/);
});

test("core website palette is sharp neutral black and white without cream", () => {
  assert.equal(THEMES.core.background, "#0b0b0b");
  assert.equal(THEMES.core.surface, "#141414");
  assert.equal(THEMES.core.ink, "#f5f5f3");
  assert.equal(THEMES.core.accent, "#ffffff");
  assert.equal(THEMES.core.logo, "images/logos/ships-wordmark-white-transparent.png");
});
