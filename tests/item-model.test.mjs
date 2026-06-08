import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRequestEmail,
  normalizeItem,
  normalizeItems,
  parseLines,
  parseGallery,
} from "../docs/assets/item-model.js";

test("normalizeItem supplies safe defaults and preserves the supported item mode", () => {
  const item = normalizeItem({ title: "Studio Shirt", item_mode: "hybrid" });
  assert.equal(item.title, "Studio Shirt");
  assert.equal(item.item_mode, "hybrid");
  assert.equal(item.theme, "mono");
  assert.deepEqual(item.gallery_urls, []);
});

test("normalizeItem rejects unsupported item modes and themes", () => {
  const item = normalizeItem({ item_mode: "instant-checkout", theme: "unknown" });
  assert.equal(item.item_mode, "regular");
  assert.equal(item.theme, "mono");
});

test("normalizeItems preserves an intentionally empty collection", () => {
  assert.deepEqual(normalizeItems([]), []);
});

test("normalizeItems normalizes every supplied item", () => {
  const items = normalizeItems([{ title: "One" }, { title: "Two", item_mode: "custom" }]);
  assert.equal(items.length, 2);
  assert.equal(items[0].title, "One");
  assert.equal(items[1].item_mode, "custom");
});

test("parseLines removes blank entries and surrounding whitespace", () => {
  assert.deepEqual(parseLines(" Small \n\nMedium\n Large "), ["Small", "Medium", "Large"]);
});

test("parseGallery accepts newline-separated image URLs and removes duplicates", () => {
  assert.deepEqual(parseGallery("one.jpg\ntwo.jpg\none.jpg"), ["one.jpg", "two.jpg"]);
});

test("regular request email asks only for standard ordering choices", () => {
  const email = buildRequestEmail(normalizeItem({
    title: "Green Studio Shirt",
    item_mode: "regular",
    sizes: ["Small", "Medium"],
    colors: ["Green", "Cream"],
  }), "orders@example.com");

  assert.match(email.href, /^mailto:orders@example\.com\?/);
  assert.match(email.body, /Preferred size:/);
  assert.match(email.body, /Preferred color:/);
  assert.doesNotMatch(email.body, /Requested personalization:/);
});

test("custom request email asks for personalization details", () => {
  const email = buildRequestEmail(normalizeItem({
    title: "Named Print",
    item_mode: "custom",
    customization_options: ["Name on front", "Font choice"],
  }), "orders@example.com");

  assert.match(email.subject, /Custom request/);
  assert.match(email.body, /Requested personalization:/);
  assert.match(email.body, /Preferred font or style:/);
});

test("hybrid request email makes customization optional", () => {
  const email = buildRequestEmail(normalizeItem({
    title: "Studio Shirt",
    item_mode: "hybrid",
  }), "orders@example.com");

  assert.match(email.body, /Optional customization request:/);
});
