import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_APPEARANCE, normalizeAppearance, resolveHeaderLogo } from "../docs/assets/settings-model.js";

test("appearance settings provide complete safe defaults", () => {
  const settings = normalizeAppearance();
  assert.equal(settings.home_headline, DEFAULT_APPEARANCE.home_headline);
  assert.equal(settings.card_columns, "4");
  assert.equal(settings.header_logo, "wordmark-white");
  assert.equal(settings.request_now_label, "Request now");
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

test("main SHIPS header logo follows theme contrast while alternate marks remain selectable", () => {
  const darkLogo = "images/logos/ships-wordmark-black-transparent.png";
  const lightLogo = "images/logos/ships-wordmark-white-transparent.png";
  assert.equal(resolveHeaderLogo(darkLogo, "wordmark-white"), darkLogo);
  assert.equal(resolveHeaderLogo(lightLogo, "wordmark-black"), lightLogo);
  assert.equal(resolveHeaderLogo(darkLogo, "mark-white"), "images/logos/ships-mark-black-transparent.png");
});

test("saved legacy logo choices migrate to the new wordmark and compact marks", () => {
  assert.equal(normalizeAppearance({ header_logo: "ships-white" }).header_logo, "wordmark-white");
  assert.equal(normalizeAppearance({ header_logo: "ships-tag" }).header_logo, "mark-white");
});
