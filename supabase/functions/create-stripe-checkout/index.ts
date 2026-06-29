const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CheckoutRequest = {
  item_id?: string;
  quantity?: number;
  country?: string;
  size?: string;
  color?: string;
  early_access_code?: string;
};

type ShopItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  main_image_url: string;
  is_published: boolean;
  availability_status: string;
  early_access_enabled: boolean;
  early_access_code: string;
  stripe_checkout_enabled: boolean;
  stripe_price_cents: number;
  stripe_currency: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanSiteUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function normalizeQuantity(value: unknown) {
  const quantity = Math.round(Number(value || 1));
  return Math.min(10, Math.max(1, quantity));
}

function shippingFor(country: string, quantity: number) {
  const extraItems = Math.max(0, quantity - 1);
  if (country === "US") {
    return { label: "United States shipping", amount: 1400 + extraItems * 500, allowedCountries: ["US"] };
  }
  if (country === "INTL") {
    return {
      label: "International shipping",
      amount: 2500 + extraItems * 800,
      allowedCountries: ["CA", "US", "GB", "IE", "FR", "DE", "NL", "AU", "NZ"],
    };
  }
  return { label: "Canada shipping", amount: 900 + extraItems * 300, allowedCountries: ["CA"] };
}

function appendMetadata(params: URLSearchParams, metadata: Record<string, string>) {
  Object.entries(metadata).forEach(([key, value]) => {
    if (value) params.set(`metadata[${key}]`, value.slice(0, 500));
  });
}

async function getShopItem(supabaseUrl: string, serviceRoleKey: string, itemId: string): Promise<ShopItem | null> {
  const url = `${supabaseUrl}/rest/v1/shop_items?id=eq.${encodeURIComponent(itemId)}&select=*`;
  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  if (!response.ok) throw new Error("Could not read garment from Supabase.");
  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function createStripeSession(stripeKey: string, params: URLSearchParams) {
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.message || "Stripe checkout could not be created.");
  }
  return body;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const siteUrl = cleanSiteUrl(Deno.env.get("SITE_URL") || "https://theshipsshop.com");

    if (!stripeKey || !supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Checkout is not configured yet." }, 500);
    }

    const payload = (await request.json()) as CheckoutRequest;
    const itemId = String(payload.item_id || "").trim();
    if (!itemId) return jsonResponse({ error: "Missing garment." }, 400);

    const item = await getShopItem(supabaseUrl, serviceRoleKey, itemId);
    if (!item) return jsonResponse({ error: "Garment not found." }, 404);
    if (!item.is_published || item.availability_status !== "available") {
      return jsonResponse({ error: "This garment is not available for checkout." }, 400);
    }
    if (!item.stripe_checkout_enabled || Number(item.stripe_price_cents) <= 0) {
      return jsonResponse({ error: "Stripe Checkout is not enabled for this garment." }, 400);
    }
    if (item.early_access_enabled) {
      const savedCode = String(item.early_access_code || "").trim().toLowerCase();
      const enteredCode = String(payload.early_access_code || "").trim().toLowerCase();
      if (!savedCode || savedCode !== enteredCode) return jsonResponse({ error: "That release code is not valid." }, 403);
    }

    const quantity = normalizeQuantity(payload.quantity);
    const country = ["CA", "US", "INTL"].includes(String(payload.country)) ? String(payload.country) : "CA";
    const shipping = shippingFor(country, quantity);
    const currency = item.stripe_currency === "cad" ? "cad" : "cad";
    const params = new URLSearchParams();

    params.set("mode", "payment");
    params.set("success_url", `${siteUrl}/?checkout=success`);
    params.set("cancel_url", `${siteUrl}/#item/${encodeURIComponent(item.slug)}`);
    params.set("line_items[0][quantity]", String(quantity));
    params.set("line_items[0][price_data][currency]", currency);
    params.set("line_items[0][price_data][unit_amount]", String(item.stripe_price_cents));
    params.set("line_items[0][price_data][product_data][name]", item.title);
    if (item.summary) params.set("line_items[0][price_data][product_data][description]", item.summary.slice(0, 500));
    if (/^https:\/\//i.test(item.main_image_url || "")) {
      params.set("line_items[0][price_data][product_data][images][0]", item.main_image_url);
    }
    params.set("shipping_address_collection[allowed_countries][0]", shipping.allowedCountries[0]);
    shipping.allowedCountries.slice(1).forEach((allowedCountry, index) => {
      params.set(`shipping_address_collection[allowed_countries][${index + 1}]`, allowedCountry);
    });
    params.set("shipping_options[0][shipping_rate_data][type]", "fixed_amount");
    params.set("shipping_options[0][shipping_rate_data][fixed_amount][amount]", String(shipping.amount));
    params.set("shipping_options[0][shipping_rate_data][fixed_amount][currency]", "cad");
    params.set("shipping_options[0][shipping_rate_data][display_name]", shipping.label);
    params.set("allow_promotion_codes", "true");

    appendMetadata(params, {
      item_id: item.id,
      item_slug: item.slug,
      size: String(payload.size || ""),
      color: String(payload.color || ""),
      shipping_region: country,
    });

    const session = await createStripeSession(stripeKey, params);
    return jsonResponse({ url: session.url });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Checkout failed." }, 500);
  }
});
