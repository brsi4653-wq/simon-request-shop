import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const adminHtml = await readFile(new URL("../docs/admin.html", import.meta.url), "utf8");
const siteHtml = await readFile(new URL("../docs/index.html", import.meta.url), "utf8");
const siteJs = await readFile(new URL("../docs/assets/site.js", import.meta.url), "utf8");
const adminJs = await readFile(new URL("../docs/assets/admin.js", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase-shop-stripe-checkout.sql", import.meta.url), "utf8").catch(() => "");
const edgeFunction = await readFile(new URL("../supabase/functions/create-stripe-checkout/index.ts", import.meta.url), "utf8").catch(() => "");

test("admin can enable Stripe checkout and store a CAD price without exposing a secret key", () => {
  assert.match(adminHtml, /name="stripe_checkout_enabled"/);
  assert.match(adminHtml, /name="stripe_price_cad"/);
  assert.match(adminJs, /stripe_price_cents/);
  assert.doesNotMatch(adminHtml + adminJs + siteJs, /sk_test_|sk_live_/);
});

test("public checkout uses a Supabase function and collects purchase details", () => {
  assert.match(siteHtml, /id="stripe-checkout-dialog"/);
  assert.match(siteJs, /create-stripe-checkout/);
  assert.match(siteJs, /data-stripe-checkout/);
  assert.match(siteJs, /checkout-country/);
});

test("Stripe migration exposes only safe public checkout fields", () => {
  assert.match(migration, /stripe_checkout_enabled/i);
  assert.match(migration, /stripe_price_cents/i);
  assert.match(migration, /stripe_currency/i);
  assert.match(migration, /public_shop_items/i);
  assert.doesNotMatch(migration, /delete from public\.shop_items/i);
});

test("Supabase Edge Function creates a Stripe Checkout Session from private environment secrets", () => {
  assert.match(edgeFunction, /Deno\.env\.get\("STRIPE_SECRET_KEY"\)/);
  assert.match(edgeFunction, /https:\/\/api\.stripe\.com\/v1\/checkout\/sessions/);
  assert.match(edgeFunction, /shipping_options/);
  assert.match(edgeFunction, /stripe_price_cents/);
  assert.doesNotMatch(edgeFunction, /sk_test_|sk_live_/);
});
