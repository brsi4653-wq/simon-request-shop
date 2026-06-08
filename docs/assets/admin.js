import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { ADMIN_EMAIL, ORDER_EMAIL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config.js";
import { buildRequestEmail, createSlug, getTheme, ITEM_MODES, normalizeItem, parseGallery, parseLines, THEMES } from "./item-model.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const form = document.getElementById("item-form");
const message = document.getElementById("editor-message");
const itemList = document.getElementById("item-list");
let items = [];

function isAdmin(user) {
  return user?.email?.toLowerCase() === ADMIN_EMAIL;
}

function setMessage(text = "", isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

function formValue(name) {
  return form.elements[name]?.value?.trim() || "";
}

function linesToText(value) {
  return parseLines(value).join("\n");
}

function renderControls() {
  document.getElementById("theme-options").innerHTML = Object.entries(THEMES)
    .map(([key, theme]) => `<label class="theme-choice"><input type="radio" name="theme" value="${key}" ${key === "mono" ? "checked" : ""} /><span class="theme-swatch" style="background:${theme.accent}"></span>${theme.name}</label>`)
    .join("");
}

function collectItem() {
  return {
    slug: createSlug(formValue("slug") || formValue("title")),
    title: formValue("title") || "Untitled Item",
    eyebrow: formValue("eyebrow") || "Made to request",
    summary: formValue("summary"),
    description: formValue("description"),
    main_image_url: formValue("main_image_url"),
    gallery_urls: parseGallery(formValue("gallery_urls")),
    sizes: parseLines(formValue("sizes")),
    colors: parseLines(formValue("colors")),
    customization_options: parseLines(formValue("customization_options")),
    production_note: formValue("production_note"),
    price_note: formValue("price_note"),
    item_mode: form.elements.item_mode.value,
    request_subject: formValue("request_subject"),
    request_intro: formValue("request_intro"),
    theme: form.elements.theme.value,
    is_published: form.elements.is_published.checked,
    is_featured: form.elements.is_featured.checked,
  };
}

function resetForm() {
  form.reset();
  document.getElementById("item-id").value = "";
  document.getElementById("editor-title").textContent = "New Item";
  document.getElementById("main-preview").hidden = true;
  form.elements.theme.value = "mono";
  form.elements.item_mode.value = "regular";
  setMessage();
  renderPreview();
}

function fillForm(rawItem) {
  const item = normalizeItem(rawItem);
  resetForm();
  document.getElementById("item-id").value = item.id;
  document.getElementById("editor-title").textContent = item.title;
  Object.entries(item).forEach(([key, value]) => {
    if (!form.elements[key] || ["gallery_urls", "sizes", "colors", "customization_options"].includes(key)) return;
    if (form.elements[key].type === "checkbox") form.elements[key].checked = Boolean(value);
    else form.elements[key].value = value ?? "";
  });
  form.elements.gallery_urls.value = linesToText(item.gallery_urls);
  form.elements.sizes.value = linesToText(item.sizes);
  form.elements.colors.value = linesToText(item.colors);
  form.elements.customization_options.value = linesToText(item.customization_options);
  const preview = document.getElementById("main-preview");
  preview.hidden = !item.main_image_url;
  preview.src = item.main_image_url || "";
  document.querySelectorAll(".item-entry").forEach((entry) => entry.classList.toggle("active", entry.dataset.id === item.id));
  renderPreview();
}

function renderList() {
  itemList.innerHTML = items.length
    ? items.map((item) => `<button class="item-entry" data-id="${item.id}"><strong>${item.title}</strong><small>${item.is_published ? "Published" : "Draft"}${item.is_featured ? " / Featured" : ""} / ${ITEM_MODES[item.item_mode]?.name || "Regular item"}</small></button>`).join("")
    : "<p>No items yet.</p>";
  document.querySelectorAll(".item-entry").forEach((button) => button.addEventListener("click", () => fillForm(items.find((item) => item.id === button.dataset.id))));
}

function renderPreview() {
  const item = normalizeItem(collectItem());
  const theme = getTheme(item.theme);
  const email = buildRequestEmail(item, ORDER_EMAIL);
  document.getElementById("editor-preview").innerHTML = `${item.main_image_url ? `<img src="${item.main_image_url}" alt="" />` : "<p>No image yet.</p>"}
    <h3>${item.title}</h3>
    <p>${ITEM_MODES[item.item_mode].name} / Theme: ${theme.name}</p>
    <p>${item.summary || "No summary yet."}</p>
    <pre>${email.body}</pre>`;
}

async function loadItems() {
  const { data, error } = await supabase.from("shop_items").select("*").order("updated_at", { ascending: false });
  if (error) return setMessage("The shop database is not ready yet. Run supabase-shop-setup.sql in Supabase.", true);
  items = (data || []).map(normalizeItem);
  renderList();
  if (items.length) fillForm(items[0]);
  else resetForm();
}

async function uploadFile(file, folder) {
  const extension = file.name.split(".").pop().toLowerCase();
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("shop-media").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return supabase.storage.from("shop-media").getPublicUrl(path).data.publicUrl;
}

async function attachUploads(item) {
  const mainFile = document.getElementById("main-file").files[0];
  if (mainFile) item.main_image_url = await uploadFile(mainFile, item.slug);
  const galleryFiles = [...document.getElementById("gallery-files").files];
  if (galleryFiles.length) {
    const uploaded = [];
    for (const file of galleryFiles) uploaded.push(await uploadFile(file, item.slug));
    item.gallery_urls = [...item.gallery_urls, ...uploaded];
  }
  return item;
}

async function saveItem(event) {
  event.preventDefault();
  setMessage("Saving...");
  try {
    const id = document.getElementById("item-id").value;
    const item = await attachUploads(collectItem());
    if (item.is_featured && !item.is_published) throw new Error("Publish the item before making it featured.");
    if (item.is_featured) {
      const { error } = await supabase.from("shop_items").update({ is_featured: false }).eq("is_featured", true);
      if (error) throw error;
    }
    const result = id
      ? await supabase.from("shop_items").update(item).eq("id", id).select().single()
      : await supabase.from("shop_items").insert(item).select().single();
    if (result.error) throw result.error;
    setMessage(item.is_published ? "Item saved and published." : "Draft saved privately.");
    await loadItems();
    fillForm(result.data);
  } catch (error) {
    setMessage(error.message || "The item could not be saved.", true);
  }
}

async function deleteItem() {
  const id = document.getElementById("item-id").value;
  if (!id || !confirm("Delete this item permanently?")) return;
  const { error } = await supabase.from("shop_items").delete().eq("id", id);
  if (error) return setMessage(error.message, true);
  await loadItems();
}

function duplicateItem() {
  const item = collectItem();
  resetForm();
  Object.entries(item).forEach(([key, value]) => {
    if (!form.elements[key] || ["is_featured", "gallery_urls", "sizes", "colors", "customization_options"].includes(key)) return;
    if (form.elements[key].type === "checkbox") form.elements[key].checked = Boolean(value);
    else form.elements[key].value = value ?? "";
  });
  form.elements.title.value = `${item.title} Copy`;
  form.elements.slug.value = `${item.slug}-copy`;
  form.elements.gallery_urls.value = linesToText(item.gallery_urls);
  form.elements.sizes.value = linesToText(item.sizes);
  form.elements.colors.value = linesToText(item.colors);
  form.elements.customization_options.value = linesToText(item.customization_options);
  form.elements.is_featured.checked = false;
  renderPreview();
}

async function enterAdmin(user) {
  if (!isAdmin(user)) {
    await supabase.auth.signOut();
    document.getElementById("login-message").textContent = "This Google account is not authorized.";
    return;
  }
  document.getElementById("login-panel").hidden = true;
  document.getElementById("admin-app").hidden = false;
  document.getElementById("sign-out").hidden = false;
  document.getElementById("account-label").textContent = user.email;
  await loadItems();
}

renderControls();
resetForm();
form.addEventListener("submit", saveItem);
form.addEventListener("input", () => {
  if (!formValue("slug") && formValue("title")) form.elements.slug.value = createSlug(formValue("title"));
  renderPreview();
});
document.getElementById("new-item").addEventListener("click", resetForm);
document.getElementById("delete-item").addEventListener("click", deleteItem);
document.getElementById("duplicate-item").addEventListener("click", duplicateItem);
document.getElementById("publish-item").addEventListener("click", () => {
  form.elements.is_published.checked = true;
  form.requestSubmit();
});
document.getElementById("google-login").addEventListener("click", () => supabase.auth.signInWithOAuth({
  provider: "google",
  options: { redirectTo: location.href, queryParams: { prompt: "select_account" } },
}));
document.getElementById("sign-out").addEventListener("click", async () => { await supabase.auth.signOut(); location.reload(); });

const { data: { session } } = await supabase.auth.getSession();
if (session?.user) enterAdmin(session.user);
supabase.auth.onAuthStateChange((_event, nextSession) => {
  if (nextSession?.user && document.getElementById("admin-app").hidden) enterAdmin(nextSession.user);
});
