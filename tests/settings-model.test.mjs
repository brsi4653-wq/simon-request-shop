import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_APPEARANCE, normalizeAppearance } from "../docs/assets/settings-model.js";

test("appearance settings provide complete safe defaults", () => {
  const settings = normalizeAppearance();
  assert.equal(settings.home_headline, DEFAULT_APPEARANCE.home_headline);
  assert.equal(settings.card_columns, "4");
  assert.equal(settings.header_logo, "ships-white");
  assert.equal(settings.add_to_cart_label, "Add to cart");
});

test("appearance settings preserve valid choices and reject unsupported choices", () => {
  const settings = normalizeAppearance({
    hero_layout: "centered",
    card_columns: "3",
    corner_style: "rounded",
    motion: "wild",
  });
  assert.equal(settings.hero_layout, "centered");
  assert.equal(settings.card_columns, "3");
  assert.equal(settings.corner_style, "rounded");
  assert.equal(settings.motion, DEFAULT_APPEARANCE.motion);
});

