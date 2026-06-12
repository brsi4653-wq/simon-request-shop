import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { ORDER_EMAIL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config.js?v=20260612-purchase-email";
import { DEFAULT_GLOBAL_THEME, filterItemsByCollection, getProductAction, getTheme, normalizeCollections, normalizeItems, resolveProductTheme, toPublicGarmentCopy } from "./item-model.js?v=20260612-featured-catalogue";
import { addCartItem, buildCartRequestEmail, canAddToCart, cartQuantity, CART_STORAGE_KEY, normalizeCart, reconcileCart, removeCartItem, updateCartItem } from "./cart-model.js?v=20260611";
import { HEADER_LOGOS, normalizeAppearance } from "./settings-model.js?v=20260611";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let items = [];
let collections = [];
let activeCollection = "featured";
let globalTheme = DEFAULT_GLOBAL_THEME;
let homepageSettings = { hero_media_type: "icon", hero_icon_style: "orbit-shop", hero_image_url: "", hero_product_id: "" };
let appearance = normalizeAppearance();
let cart = loadCart();
const views = [...document.querySelectorAll(".view")];
const navButtons = [...document.querySelectorAll("[data-view]")];
const brandLogo = document.getElementById("brand-logo");
const heroVisual = document.getElementById("hero-visual");

function loadCart() {
  try {
    return normalizeCart(JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]"));
  } catch {
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // The cart still works for this page when browser storage is unavailable.
  }
  renderCart();
}

function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function applyTheme(themeName = globalTheme) {
  const theme = getTheme(themeName);
  document.documentElement.style.setProperty("--page-bg", theme.background);
  document.documentElement.style.setProperty("--surface", theme.surface);
  document.documentElement.style.setProperty("--soft", theme.soft);
  document.documentElement.style.setProperty("--ink", theme.ink);
  document.documentElement.style.setProperty("--muted", theme.muted);
  document.documentElement.style.setProperty("--accent", theme.accent);
  brandLogo.src = HEADER_LOGOS[appearance.header_logo] || theme.logo;
}

function applyAppearance() {
  const root = document.documentElement;
  ["hero_layout", "hero_height", "hero_image_fit", "header_logo_size", "card_columns", "card_image_fit", "corner_style", "typography", "spacing", "motion"]
    .forEach((key) => root.setAttribute(`data-${key.replaceAll("_", "-")}`, appearance[key]));
  document.getElementById("home-kicker").textContent = appearance.home_kicker;
  document.getElementById("home-headline").textContent = appearance.home_headline;
  document.getElementById("home-intro").textContent = appearance.home_intro;
  document.getElementById("home-button").textContent = appearance.home_button_label;
  document.getElementById("process-section").hidden = !appearance.show_process;
  document.getElementById("collection-kicker").textContent = appearance.collection_kicker;
  document.getElementById("collection-title").textContent = appearance.collection_title;
  document.getElementById("collection-intro").textContent = appearance.collection_intro;
  document.getElementById("footer-middle").textContent = appearance.footer_middle;
  document.getElementById("footer-right").textContent = appearance.footer_right;
  applyTheme(globalTheme);
}

function listBlock(title, values) {
  if (!values?.length) return "";
  return `<section class="option-block"><span class="kicker">${escapeHtml(title)}</span><ul>${values.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul></section>`;
}

function imagePlaceholder(title) {
  return `<div class="image-placeholder" role="img" aria-label="${escapeHtml(title)} image coming soon">
    <span class="kicker">Garment preview</span>
    <strong>Image coming soon</strong>
  </div>`;
}

function renderHeroVisual() {
  if (!heroVisual) return;
  const selectedProduct = items.find((item) => item.id === homepageSettings.hero_product_id);
  if (homepageSettings.hero_media_type === "product" && selectedProduct?.main_image_url) {
    heroVisual.className = "hero-art hero-cover";
    heroVisual.innerHTML = `<button data-item="${escapeHtml(selectedProduct.slug)}" aria-label="View ${escapeHtml(selectedProduct.title)}"><img src="${escapeHtml(selectedProduct.main_image_url)}" alt="${escapeHtml(selectedProduct.title)}" /></button>`;
    return;
  }
  if (homepageSettings.hero_media_type === "image" && homepageSettings.hero_image_url) {
    heroVisual.className = "hero-art hero-cover";
    heroVisual.innerHTML = `<img src="${escapeHtml(homepageSettings.hero_image_url)}" alt="" />`;
    return;
  }
  const style = homepageSettings.hero_icon_style || "orbit-shop";
  const imageByStyle = {
    "orbit-shop": "images/logos/the-ships-shop-display.png",
    "orbit-ships": "images/logos/ships-main-white-display.png",
    "orbit-tag": "images/logos/ships-tag-display.png",
    "plain-shop": "images/logos/the-ships-shop-display.png",
    "plain-ships": "images/logos/ships-main-white-display.png",
  };
  const plain = style.startsWith("plain-");
  heroVisual.className = `hero-art hero-icon-style-${style}`;
  heroVisual.innerHTML = `${plain ? "" : '<span class="orbit orbit-one"></span><span class="orbit orbit-two"></span>'}${imageByStyle[style] ? `<img src="${imageByStyle[style]}" alt="" />` : ""}`;
}

function itemCard(item) {
  item = toPublicGarmentCopy(item);
  return `<article class="item-card">
    <button class="item-image" data-item="${escapeHtml(item.slug)}" aria-label="Open ${escapeHtml(item.title)}">
      ${item.main_image_url ? `<img src="${escapeHtml(item.main_image_url)}" alt="${escapeHtml(item.title)}" />` : imagePlaceholder(item.title)}
    </button>
    <div class="item-card-copy">
      <span class="kicker">${escapeHtml(item.eyebrow)}</span>
      <h2>${escapeHtml(item.title)}</h2>
      <p>${escapeHtml(item.summary)}</p>
      <button class="text-action" data-item="${escapeHtml(item.slug)}">View garment <span>&nearr;</span></button>
    </div>
  </article>`;
}

function renderCollection() {
  const container = document.getElementById("item-grid");
  const filteredItems = filterItemsByCollection(items, activeCollection);
  const activeName = activeCollection === "featured"
    ? "Featured"
    : collections.find((collection) => collection.slug === activeCollection)?.name;
  container.classList.toggle("empty", filteredItems.length === 0);
  container.innerHTML = filteredItems.length
    ? filteredItems.map(itemCard).join("")
    : `<div class="empty-state">
        <span class="kicker">${activeCollection === "all" ? "Nothing currently available" : "This collection is currently empty"}</span>
        <h2>${activeCollection === "all" ? "There are no garments at the moment." : activeCollection === "featured" ? "No featured garments currently available." : `No garments in ${escapeHtml(activeName || "this collection")} yet.`}</h2>
        <p>We apologize. Please check back later for the next available garment.</p>
      </div>`;
}

function renderCollectionFilters() {
  const container = document.getElementById("collection-filters");
  container.innerHTML = [
    { name: "Featured", slug: "featured" },
    { name: "All", slug: "all" },
    ...collections,
  ].map((collection) => `<button type="button" data-collection="${escapeHtml(collection.slug)}" class="${collection.slug === activeCollection ? "active" : ""}">${escapeHtml(collection.name)}</button>`).join("");
  container.querySelectorAll("[data-collection]").forEach((button) => button.addEventListener("click", () => {
    activeCollection = button.dataset.collection;
    renderCollectionFilters();
    renderCollection();
    bindButtons();
  }));
}

function renderDetail(item) {
  item = toPublicGarmentCopy(item);
  applyTheme(resolveProductTheme(item.theme, globalTheme));
  const action = getProductAction(item, ORDER_EMAIL);
  const cartAllowed = canAddToCart(item);
  const primaryAction = action.disabled
    ? `<button class="primary-action request-action" type="button" disabled>${escapeHtml(action.label)}</button>`
    : `<a class="primary-action request-action" href="${escapeHtml(action.href)}">${escapeHtml(action.type === "email" ? appearance.request_now_label : action.label)}</a>`;
  const cartAction = cartAllowed
    ? `<button class="secondary-action add-cart-action" type="button" data-add-cart="${escapeHtml(item.id || item.slug)}">${escapeHtml(appearance.add_to_cart_label)}</button>`
    : "";
  const secondaryAction = action.disabled
    ? `<span class="availability-note">${escapeHtml(action.label)}</span>`
    : `<a class="text-action" href="${escapeHtml(action.href)}">${action.type === "shopify" ? "Buy this garment" : "Inquire about this garment"} <span>&nearr;</span></a>`;
  const images = [item.main_image_url, ...item.gallery_urls].filter(Boolean);
  document.getElementById("item-detail").innerHTML = `<section class="detail-hero">
    <div class="detail-gallery">
      <div class="gallery-main">${images.length ? `<img id="gallery-main-image" src="${escapeHtml(images[0])}" alt="${escapeHtml(item.title)}" />` : imagePlaceholder(item.title)}</div>
      ${images.length > 1 ? `<div class="gallery-strip">${images.map((url, index) => `<button class="${index === 0 ? "active" : ""}" data-gallery-image="${escapeHtml(url)}"><img src="${escapeHtml(url)}" alt="View ${index + 1} of ${escapeHtml(item.title)}" /></button>`).join("")}</div>` : ""}
    </div>
    <div class="detail-copy">
      <span class="kicker">${escapeHtml(item.eyebrow)}</span>
      <h1>${escapeHtml(item.title)}</h1>
      <p class="summary">${escapeHtml(item.summary)}</p>
      <p>${escapeHtml(item.description)}</p>
      <div class="price-note">${escapeHtml(item.price_note)}</div>
      <div class="detail-actions">${primaryAction}${cartAction}</div>
      <p class="fine-print">${escapeHtml(item.production_note)}</p>
    </div>
  </section>
  <section class="options-layout">
    ${listBlock("Available sizes", item.sizes)}
    ${listBlock("Available colors", item.colors)}
    ${listBlock("Garment details", item.customization_options)}
  </section>
  <section class="request-explainer">
    <span class="kicker nova-scotia-note">Designed in Nova Scotia</span>
    <span class="kicker">Selected releases</span>
    <h2>Produced individually.</h2>
    <p>SHIPS releases selected garments and seasonal collections in small quantities. Availability, final pricing, and delivery details are confirmed personally. Custom print requests may be available for select garments.</p>
    ${secondaryAction}
  </section>`;

  document.querySelectorAll("[data-gallery-image]").forEach((button) => button.addEventListener("click", () => {
    document.getElementById("gallery-main-image").src = button.dataset.galleryImage;
    document.querySelectorAll("[data-gallery-image]").forEach((entry) => entry.classList.toggle("active", entry === button));
  }));
  bindCartButtons();
}

function renderCart() {
  const count = cartQuantity(cart);
  document.getElementById("cart-count").textContent = count;
  document.getElementById("cart-summary-title").textContent = count ? `${count} garment${count === 1 ? "" : "s"} in your request.` : "No garments yet.";
  const requestLink = document.getElementById("request-cart");
  requestLink.textContent = appearance.cart_request_label;
  requestLink.href = count ? buildCartRequestEmail(cart, ORDER_EMAIL).href : "#";
  requestLink.setAttribute("aria-disabled", count ? "false" : "true");
  document.getElementById("cart-items").innerHTML = cart.length ? cart.map((entry) => {
    const item = items.find((candidate) => String(candidate.id || candidate.slug) === entry.id);
    const sizes = item?.sizes || [];
    const colors = item?.colors || [];
    return `<article class="cart-entry" data-cart-id="${escapeHtml(entry.id)}">
      <div class="cart-entry-image">${entry.image ? `<img src="${escapeHtml(entry.image)}" alt="${escapeHtml(entry.title)}" />` : imagePlaceholder(entry.title)}</div>
      <div class="cart-entry-copy">
        <span class="kicker">Request item</span>
        <h2>${escapeHtml(entry.title)}</h2>
        <div class="cart-fields">
          <label>Quantity<input data-cart-field="quantity" type="number" min="1" value="${entry.quantity}" /></label>
          <label>Preferred size${sizes.length ? `<select data-cart-field="size"><option value="">Choose size</option>${sizes.map((size) => `<option ${size === entry.size ? "selected" : ""}>${escapeHtml(size)}</option>`).join("")}</select>` : `<input data-cart-field="size" value="${escapeHtml(entry.size)}" />`}</label>
          <label>Preferred color${colors.length ? `<select data-cart-field="color"><option value="">Choose color</option>${colors.map((color) => `<option ${color === entry.color ? "selected" : ""}>${escapeHtml(color)}</option>`).join("")}</select>` : `<input data-cart-field="color" value="${escapeHtml(entry.color)}" />`}</label>
          <label class="cart-notes">Notes<textarea data-cart-field="notes" rows="3">${escapeHtml(entry.notes)}</textarea></label>
        </div>
        <button class="text-action" type="button" data-remove-cart="${escapeHtml(entry.id)}">Remove</button>
      </div>
    </article>`;
  }).join("") : `<div class="empty-state"><span class="kicker">Combined garment request</span><h2>Your cart is empty.</h2><p>Add garments from their product pages to request several pieces in one email.</p></div>`;

  document.querySelectorAll("[data-cart-id]").forEach((entry) => {
    entry.querySelectorAll("[data-cart-field]").forEach((field) => field.addEventListener("change", () => {
      const values = {};
      entry.querySelectorAll("[data-cart-field]").forEach((input) => values[input.dataset.cartField] = input.value);
      cart = updateCartItem(cart, entry.dataset.cartId, values);
      saveCart();
    }));
  });
  document.querySelectorAll("[data-remove-cart]").forEach((button) => button.addEventListener("click", () => {
    cart = removeCartItem(cart, button.dataset.removeCart);
    saveCart();
  }));
}

function bindCartButtons() {
  document.querySelectorAll("[data-add-cart]").forEach((button) => button.addEventListener("click", () => {
    const item = items.find((entry) => String(entry.id || entry.slug) === button.dataset.addCart);
    if (!item || !canAddToCart(item)) return;
    cart = addCartItem(cart, item);
    saveCart();
    button.textContent = "Added";
  }));
}

function bindButtons() {
  document.querySelectorAll("[data-item]").forEach((button) => button.addEventListener("click", () => showItem(button.dataset.item)));
}

function showView(id) {
  const next = document.getElementById(id) ? id : "home";
  if (next === "collection") {
    activeCollection = "featured";
    renderCollectionFilters();
    renderCollection();
    bindButtons();
  }
  if (next === "cart") renderCart();
  applyTheme(globalTheme);
  views.forEach((view) => view.classList.toggle("active", view.id === next));
  navButtons.forEach((button) => button.classList.toggle("active", button.dataset.view === next));
  history.replaceState(null, "", `#${next}`);
  scrollTo({ top: 0, behavior: "smooth" });
}

function showItem(slug) {
  const item = items.find((entry) => entry.slug === slug);
  if (!item) return showView("collection");
  renderDetail(item);
  views.forEach((view) => view.classList.toggle("active", view.id === "item-detail"));
  navButtons.forEach((button) => button.classList.remove("active"));
  history.replaceState(null, "", `#item/${slug}`);
  scrollTo({ top: 0, behavior: "smooth" });
}

async function loadItems() {
  const [itemResult, collectionResult, settingResult] = await Promise.all([
    supabase.from("public_shop_items").select("*").order("created_at", { ascending: false }),
    supabase.from("public_shop_collections").select("*").order("sort_order").order("name"),
    supabase.from("public_shop_settings").select("*").eq("id", "global").maybeSingle(),
  ]);
  if (!itemResult.error) items = normalizeItems(itemResult.data);
  cart = reconcileCart(cart, items);
  saveCart();
  if (!collectionResult.error) collections = normalizeCollections(collectionResult.data);
  if (!settingResult.error && getTheme(settingResult.data?.global_theme)) globalTheme = settingResult.data?.global_theme || DEFAULT_GLOBAL_THEME;
  if (!settingResult.error && settingResult.data) homepageSettings = {
    hero_media_type: settingResult.data.hero_media_type || "icon",
    hero_icon_style: settingResult.data.hero_icon_style || "orbit-shop",
    hero_image_url: settingResult.data.hero_image_url || "",
    hero_product_id: settingResult.data.hero_product_id || "",
  };
  if (!settingResult.error && settingResult.data) appearance = normalizeAppearance(settingResult.data.appearance_config);
  applyTheme(globalTheme);
  applyAppearance();
  renderHeroVisual();
  renderCollectionFilters();
  renderCollection();
  bindButtons();
  renderCart();
  const hash = location.hash.slice(1);
  if (hash.startsWith("item/")) showItem(hash.slice(5));
}

navButtons.forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
document.getElementById("year").textContent = new Date().getFullYear();
document.getElementById("clear-cart").addEventListener("click", () => {
  cart = [];
  saveCart();
});
applyTheme(globalTheme);
applyAppearance();
renderHeroVisual();
renderCollectionFilters();
renderCollection();
bindButtons();
renderCart();
const initialHash = location.hash.slice(1);
if (initialHash.startsWith("item/")) showItem(initialHash.slice(5));
else showView(initialHash || "home");
loadItems();
