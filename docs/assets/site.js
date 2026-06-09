import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { ORDER_EMAIL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config.js";
import { buildRequestEmail, filterItemsByCollection, getTheme, ITEM_MODES, normalizeCollections, normalizeItem, normalizeItems } from "./item-model.js?v=20260609-service";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const demoItem = normalizeItem({ theme: "mono" });

let items = [];
let collections = [];
let activeCollection = "all";
const views = [...document.querySelectorAll(".view")];
const navButtons = [...document.querySelectorAll("[data-view]")];
const brandLogo = document.getElementById("brand-logo");

function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function applyTheme(item = demoItem) {
  const theme = getTheme(item.theme);
  document.documentElement.style.setProperty("--page-bg", theme.background);
  document.documentElement.style.setProperty("--surface", theme.surface);
  document.documentElement.style.setProperty("--soft", theme.soft);
  document.documentElement.style.setProperty("--ink", theme.ink);
  document.documentElement.style.setProperty("--muted", theme.muted);
  document.documentElement.style.setProperty("--accent", theme.accent);
  brandLogo.src = theme.logo;
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

function itemCard(item) {
  const theme = getTheme(item.theme);
  return `<article class="item-card" data-theme="${escapeHtml(item.theme)}" style="--card-accent:${theme.accent};--card-soft:${theme.soft};--card-surface:${theme.surface};--card-ink:${theme.ink};--card-muted:${theme.muted};--card-line:color-mix(in srgb, ${theme.ink} 16%, transparent)">
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
  const activeName = collections.find((collection) => collection.slug === activeCollection)?.name;
  container.classList.toggle("empty", filteredItems.length === 0);
  container.innerHTML = filteredItems.length
    ? filteredItems.map(itemCard).join("")
    : `<div class="empty-state">
        <span class="kicker">${activeCollection === "all" ? "Nothing currently available" : "This collection is currently empty"}</span>
        <h2>${activeCollection === "all" ? "There are no garments at the moment." : `No garments in ${escapeHtml(activeName || "this collection")} yet.`}</h2>
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
  applyTheme(item);
  const mode = ITEM_MODES[item.item_mode];
  const email = buildRequestEmail(item, ORDER_EMAIL);
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
      <a class="primary-action request-action" href="${escapeHtml(email.href)}">${escapeHtml(mode.label)}</a>
      <p class="fine-print">${escapeHtml(item.production_note)}</p>
    </div>
  </section>
  <section class="options-layout">
    ${listBlock("Available sizes", item.sizes)}
    ${listBlock("Available colors", item.colors)}
    ${listBlock("Supported design options", item.customization_options)}
  </section>
  <section class="request-explainer">
    <span class="kicker nova-scotia-note">Designed in Nova Scotia</span>
    <span class="kicker">Your design request</span>
    <h2>Start with an idea, not a finished file.</h2>
    <p>Send artwork, references, words, or a rough concept. SHIPS confirms what is possible, prepares the design, and reviews the garment, price, production, and delivery details with you before payment.</p>
    <a class="text-action" href="${escapeHtml(email.href)}">Start your design request <span>&nearr;</span></a>
  </section>`;

  document.querySelectorAll("[data-gallery-image]").forEach((button) => button.addEventListener("click", () => {
    document.getElementById("gallery-main-image").src = button.dataset.galleryImage;
    document.querySelectorAll("[data-gallery-image]").forEach((entry) => entry.classList.toggle("active", entry === button));
  }));
}

function bindButtons() {
  document.querySelectorAll("[data-item]").forEach((button) => button.addEventListener("click", () => showItem(button.dataset.item)));
}

function showView(id) {
  const next = document.getElementById(id) ? id : "home";
  if (next === "collection") {
    activeCollection = "all";
    renderCollectionFilters();
    renderCollection();
    bindButtons();
  }
  applyTheme(demoItem);
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
  const [itemResult, collectionResult] = await Promise.all([
    supabase.from("public_shop_items").select("*").order("created_at", { ascending: false }),
    supabase.from("public_shop_collections").select("*").order("sort_order").order("name"),
  ]);
  if (!itemResult.error) items = normalizeItems(itemResult.data);
  if (!collectionResult.error) collections = normalizeCollections(collectionResult.data);
  renderCollectionFilters();
  renderCollection();
  bindButtons();
  const hash = location.hash.slice(1);
  if (hash.startsWith("item/")) showItem(hash.slice(5));
}

navButtons.forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
document.getElementById("year").textContent = new Date().getFullYear();
applyTheme(demoItem);
renderCollectionFilters();
renderCollection();
bindButtons();
const initialHash = location.hash.slice(1);
if (initialHash.startsWith("item/")) showItem(initialHash.slice(5));
else showView(initialHash || "home");
loadItems();
