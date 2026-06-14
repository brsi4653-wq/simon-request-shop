import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { ORDER_EMAIL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config.js?v=20260612-purchase-email";
import { DEFAULT_GLOBAL_THEME, filterItemsByCollection, getProductAction, getTheme, normalizeCollections, normalizeItems, resolveProductTheme, toPublicGarmentCopy } from "./item-model.js?v=20260614-early-access";
import { normalizeAppearance, resolveHeaderLogo } from "./settings-model.js?v=20260612-readable-logo";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let items = [];
let collections = [];
let activeCollection = "all";
let globalTheme = DEFAULT_GLOBAL_THEME;
let homepageSettings = { hero_media_type: "icon", hero_icon_style: "orbit-shop", hero_image_url: "", hero_product_id: "" };
let appearance = normalizeAppearance();
const views = [...document.querySelectorAll(".view")];
const navButtons = [...document.querySelectorAll("[data-view]")];
const brandLogo = document.getElementById("brand-logo");
const heroVisual = document.getElementById("hero-visual");

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
  brandLogo.src = resolveHeaderLogo(theme.logo, appearance.header_logo);
}

function applyAppearance() {
  const root = document.documentElement;
  ["hero_layout", "hero_height", "hero_image_fit", "header_logo_size", "card_columns", "card_image_fit", "corner_style", "typography", "spacing", "motion"]
    .forEach((key) => root.setAttribute(`data-${key.replaceAll("_", "-")}`, appearance[key]));
  document.getElementById("home-kicker").textContent = appearance.home_kicker;
  document.getElementById("home-headline").textContent = appearance.home_headline;
  document.getElementById("home-intro").textContent = appearance.home_intro;
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

function productActionMarkup(item, className = "primary-action request-action") {
  const action = getProductAction(item, ORDER_EMAIL);
  if (action.disabled) return `<button class="${className}" type="button" disabled>${escapeHtml(action.label)}</button>`;
  if (action.type === "early-access") {
    return `<button class="${className}" type="button" data-early-access="${escapeHtml(item.id)}">${escapeHtml(action.label)}</button>`;
  }
  return `<a class="${className}" href="${escapeHtml(action.href)}">${escapeHtml(action.type === "email" ? appearance.request_now_label : action.label)}</a>`;
}

function renderHomepageFeature() {
  const container = document.getElementById("homepage-feature");
  const featured = items.find((item) => item.is_featured);
  container.hidden = !featured;
  if (!featured) {
    container.innerHTML = "";
    return;
  }
  const item = toPublicGarmentCopy(featured);
  container.innerHTML = `<div class="homepage-feature-inner">
    <button class="homepage-feature-image" data-item="${escapeHtml(item.slug)}" aria-label="Open ${escapeHtml(item.title)}">
      ${item.main_image_url ? `<img src="${escapeHtml(item.main_image_url)}" alt="${escapeHtml(item.title)}" />` : imagePlaceholder(item.title)}
    </button>
    <div class="homepage-feature-copy">
      <span class="kicker">Homepage feature / ${escapeHtml(item.eyebrow)}</span>
      <h2>${escapeHtml(item.title)}</h2>
      <p class="summary">${escapeHtml(item.summary)}</p>
      <p>${escapeHtml(item.description)}</p>
      <div class="price-note">${escapeHtml(item.price_note)}</div>
      <div class="detail-actions">${productActionMarkup(item)}</div>
      <button class="text-action" data-item="${escapeHtml(item.slug)}">View garment details <span>&nearr;</span></button>
    </div>
  </div>`;
}

function renderCollection() {
  const container = document.getElementById("item-grid");
  const regularItems = items.filter((item) => !item.is_featured);
  const filteredItems = filterItemsByCollection(regularItems, activeCollection);
  const activeName = collections.find((collection) => collection.slug === activeCollection)?.name;
  container.classList.toggle("empty", filteredItems.length === 0);
  container.innerHTML = filteredItems.length
    ? filteredItems.map(itemCard).join("")
    : `<div class="empty-state">
        <span class="kicker">${activeCollection === "all" ? "Nothing currently available" : "This collection is currently empty"}</span>
        <h2>${activeCollection === "all" ? "There are no other garments at the moment." : `No garments in ${escapeHtml(activeName || "this collection")} yet.`}</h2>
        <p>We apologize. Please check back later for the next available garment.</p>
      </div>`;
}

function renderCollectionFilters() {
  const container = document.getElementById("collection-filters");
  container.innerHTML = [
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
  const primaryAction = productActionMarkup(item);
  const secondaryAction = action.disabled
    ? `<span class="availability-note">${escapeHtml(action.label)}</span>`
    : action.type === "early-access"
      ? ""
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
      <div class="detail-actions">${primaryAction}</div>
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
  bindEarlyAccessButtons();
}

function bindButtons() {
  document.querySelectorAll("[data-item]").forEach((button) => button.addEventListener("click", () => showItem(button.dataset.item)));
  bindEarlyAccessButtons();
}

function bindEarlyAccessButtons() {
  document.querySelectorAll("[data-early-access]").forEach((button) => button.addEventListener("click", () => {
    document.getElementById("early-access-item-id").value = button.dataset.earlyAccess;
    document.getElementById("early-access-code").value = "";
    document.getElementById("early-access-message").textContent = "";
    document.getElementById("early-access-dialog").showModal();
  }));
}

function showView(id) {
  const next = document.getElementById(id) ? id : "home";
  applyTheme(globalTheme);
  views.forEach((view) => view.classList.toggle("active", view.id === next));
  navButtons.forEach((button) => button.classList.toggle("active", button.dataset.view === next));
  history.replaceState(null, "", `#${next}`);
  scrollTo({ top: 0, behavior: "smooth" });
}

function showItem(slug) {
  const item = items.find((entry) => entry.slug === slug);
  if (!item) return showView("home");
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
  renderHomepageFeature();
  renderCollectionFilters();
  renderCollection();
  bindButtons();
  const hash = location.hash.slice(1);
  if (hash.startsWith("item/")) showItem(hash.slice(5));
}

navButtons.forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
document.querySelector(".dialog-close").addEventListener("click", (event) => {
  event.preventDefault();
  document.getElementById("early-access-dialog").close();
});
document.getElementById("early-access-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (event.submitter?.classList.contains("dialog-close")) {
    document.getElementById("early-access-dialog").close();
    return;
  }
  const message = document.getElementById("early-access-message");
  const itemId = document.getElementById("early-access-item-id").value;
  const code = document.getElementById("early-access-code").value;
  message.textContent = "Checking code...";
  const { data, error } = await supabase.rpc("verify_shop_early_access", { p_item_id: itemId, p_code: code });
  if (error || !data) {
    message.textContent = "That code is not valid for this release.";
    return;
  }
  location.href = data;
});
document.getElementById("year").textContent = new Date().getFullYear();
applyTheme(globalTheme);
applyAppearance();
renderHeroVisual();
renderHomepageFeature();
renderCollectionFilters();
renderCollection();
bindButtons();
const initialHash = location.hash.slice(1);
if (initialHash.startsWith("item/")) showItem(initialHash.slice(5));
else showView(initialHash || "home");
loadItems();
