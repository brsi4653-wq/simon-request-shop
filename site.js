import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { ORDER_EMAIL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config.js";
import { buildRequestEmail, getTheme, ITEM_MODES, normalizeItem, normalizeItems } from "./item-model.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const demoItem = normalizeItem({
  slug: "studio-edition",
  title: "Studio Edition",
  eyebrow: "First study / demo piece",
  summary: "A clean made-to-request piece shown here as the first test of the studio system.",
  description: "This temporary listing demonstrates how each item can have its own atmosphere, gallery, available options, and personal request process. Replace it with the first real piece when it is ready.",
  main_image_url: "images/items/demo-item.png",
  gallery_urls: ["images/items/demo-item.png"],
  sizes: ["Small", "Medium", "Large", "Additional sizes by request"],
  colors: ["Fresh green", "Cream", "A different color may be requested"],
  customization_options: ["Optional name or short phrase", "Font and placement discussed by email"],
  item_mode: "hybrid",
  theme: "mono",
  is_featured: true,
  is_published: true,
});

let items = [];
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

function itemCard(item) {
  const theme = getTheme(item.theme);
  return `<article class="item-card" style="--card-accent:${theme.accent};--card-soft:${theme.soft};--card-surface:${theme.surface};--card-ink:${theme.ink};--card-muted:${theme.muted};--card-line:color-mix(in srgb, ${theme.ink} 16%, transparent)">
    <button class="item-image" data-item="${escapeHtml(item.slug)}" aria-label="Open ${escapeHtml(item.title)}">
      <img src="${escapeHtml(item.main_image_url || "images/items/demo-item.png")}" alt="${escapeHtml(item.title)}" />
    </button>
    <div class="item-card-copy">
      <span class="kicker">${escapeHtml(item.eyebrow)}</span>
      <h2>${escapeHtml(item.title)}</h2>
      <p>${escapeHtml(item.summary)}</p>
      <button class="text-action" data-item="${escapeHtml(item.slug)}">View piece <span>↗</span></button>
    </div>
  </article>`;
}

function renderHome() {
  const featured = items.find((item) => item.is_featured) || items[0];
  document.getElementById("featured-item").innerHTML = featured ? `<div class="featured-inner">
    <div class="featured-copy">
      <span class="kicker">Featured request</span>
      <h2>${escapeHtml(featured.title)}</h2>
      <p>${escapeHtml(featured.summary)}</p>
      <button class="primary-action" data-item="${escapeHtml(featured.slug)}">See the piece</button>
    </div>
    <button class="featured-image" data-item="${escapeHtml(featured.slug)}" aria-label="Open ${escapeHtml(featured.title)}">
      <img src="${escapeHtml(featured.main_image_url || "images/items/demo-item.png")}" alt="${escapeHtml(featured.title)}" />
    </button>
  </div>` : `<div class="empty-state">
    <span class="kicker">The collection is currently empty</span>
    <h2>No items are available right now.</h2>
    <p>We apologize. New pieces will appear here when they are ready.</p>
  </div>`;
}

function renderCollection() {
  const container = document.getElementById("item-grid");
  container.classList.toggle("empty", items.length === 0);
  container.innerHTML = items.length
    ? items.map(itemCard).join("")
    : `<div class="empty-state">
        <span class="kicker">Nothing currently available</span>
        <h2>There are no items at the moment.</h2>
        <p>We apologize. Please check back later for the next release.</p>
      </div>`;
}

function renderDetail(item) {
  applyTheme(item);
  const mode = ITEM_MODES[item.item_mode];
  const email = buildRequestEmail(item, ORDER_EMAIL);
  const images = [item.main_image_url, ...item.gallery_urls].filter(Boolean);
  document.getElementById("item-detail").innerHTML = `<section class="detail-hero">
    <div class="detail-gallery">
      <div class="gallery-main"><img id="gallery-main-image" src="${escapeHtml(images[0] || "images/items/demo-item.png")}" alt="${escapeHtml(item.title)}" /></div>
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
    ${listBlock(item.item_mode === "regular" ? "Design notes" : "Customization possibilities", item.customization_options)}
  </section>
  <section class="request-explainer">
    <span class="kicker">Why requests?</span>
    <h2>No anonymous checkout. No guessing.</h2>
    <p>Each request is confirmed personally before production, so sizing, color, customization, price, and delivery details are clear before payment.</p>
    <a class="text-action" href="${escapeHtml(email.href)}">Open your request email <span>↗</span></a>
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
  const { data, error } = await supabase.from("public_shop_items").select("*").order("created_at", { ascending: false });
  if (!error) items = normalizeItems(data);
  renderHome();
  renderCollection();
  bindButtons();
  const hash = location.hash.slice(1);
  if (hash.startsWith("item/")) showItem(hash.slice(5));
}

navButtons.forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
document.getElementById("year").textContent = new Date().getFullYear();
applyTheme(demoItem);
renderHome();
renderCollection();
bindButtons();
const initialHash = location.hash.slice(1);
if (initialHash.startsWith("item/")) showItem(initialHash.slice(5));
else showView(initialHash || "home");
loadItems();
