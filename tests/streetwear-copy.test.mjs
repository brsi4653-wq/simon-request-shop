import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DEFAULT_APPEARANCE, normalizeAppearance } from "../docs/assets/settings-model.js";

const indexHtml = await readFile(new URL("../docs/index.html", import.meta.url), "utf8");
const siteJs = await readFile(new URL("../docs/assets/site.js", import.meta.url), "utf8");
const itemModel = await readFile(new URL("../docs/assets/item-model.js", import.meta.url), "utf8");
const immediateCopy = `${indexHtml}\n${siteJs}\n${itemModel}`;

test("homepage defaults present SHIPS as an accessible permanent streetwear brand", () => {
  assert.equal(DEFAULT_APPEARANCE.home_kicker, "Independent streetwear / Nova Scotia");
  assert.equal(DEFAULT_APPEARANCE.home_headline, "Streetwear, made to be worn.");
  assert.match(DEFAULT_APPEARANCE.home_intro, /high-quality garments, original design, and clothing made for everyday rotation/i);
  assert.match(indexHtml, /Clothing without artificial scarcity\./);
  assert.match(indexHtml, /Good streetwear should be available to everyone who wants to wear it\./);
});

test("collection and footer use factual Nova Scotia streetwear language", () => {
  assert.equal(DEFAULT_APPEARANCE.collection_title, "Shop SHIPS.");
  assert.equal(DEFAULT_APPEARANCE.collection_intro, "Explore high-quality streetwear designed in Nova Scotia.");
  assert.equal(DEFAULT_APPEARANCE.footer_middle, "Designed in Nova Scotia");
  assert.equal(DEFAULT_APPEARANCE.footer_right, "Independent streetwear");
});

test("saved legacy homepage phrases automatically migrate after upload", () => {
  const migrated = normalizeAppearance({
    home_headline: "Designed, made, and shipped.",
    home_intro: "SHIPS is an independent clothing project based in Nova Scotia, focused on seasonal collections, selected garments, and small-batch releases.",
    collection_title: "Browse the collection.",
    footer_right: "Independent garments and seasonal releases",
  });
  assert.equal(migrated.home_headline, DEFAULT_APPEARANCE.home_headline);
  assert.equal(migrated.home_intro, DEFAULT_APPEARANCE.home_intro);
  assert.equal(migrated.collection_title, DEFAULT_APPEARANCE.collection_title);
  assert.equal(migrated.footer_right, DEFAULT_APPEARANCE.footer_right);
});

test("product and empty states avoid drop culture and artificial exclusivity", () => {
  assert.match(siteJs, /Designed for repeat wear\./);
  assert.match(siteJs, /Nothing available right now\./);
  assert.doesNotMatch(immediateCopy, /Built For The Future|carbon removal|limited runs|small-batch|seasonal releases|disappearing releases/i);
});
