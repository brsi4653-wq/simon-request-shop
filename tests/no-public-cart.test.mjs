import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const indexHtml = read("../docs/index.html");
const adminHtml = read("../docs/admin.html");
const siteJs = read("../docs/assets/site.js");
const settingsModel = read("../docs/assets/settings-model.js");

test("the published website has no active cart interface or cart runtime", () => {
  assert.doesNotMatch(indexHtml, /data-view="cart"|id="cart-count"|id="cart-items"/);
  assert.doesNotMatch(siteJs, /cart-model|data-add-cart|renderCart|bindCartButtons|localStorage/);
  assert.doesNotMatch(adminHtml, /add_to_cart_label|cart_request_label|Footer And Cart Wording/);
  assert.doesNotMatch(settingsModel, /add_to_cart_label|cart_request_label/);
  const retiredCartPlaceholder = read("../docs/assets/cart-model.js");
  assert.match(retiredCartPlaceholder, /Retired feature placeholder/);
  assert.doesNotMatch(retiredCartPlaceholder, /export function|localStorage|addCartItem/);
});

test("direct checkout and request behavior remain active", () => {
  assert.match(siteJs, /getProductAction/);
  assert.match(siteJs, /primary-action request-action/);
});

test("the retired cart implementation remains available in the archive", () => {
  for (const file of [
    "../archive/cart-feature/README.md",
    "../archive/cart-feature/cart-model.js",
    "../archive/cart-feature/site-with-cart.js",
    "../archive/cart-feature/index-with-cart.html",
    "../archive/cart-feature/site-with-cart.css",
  ]) assert.equal(existsSync(new URL(file, import.meta.url)), true);
});
