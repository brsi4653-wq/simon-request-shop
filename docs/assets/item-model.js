export const ORDER_EMAIL = "simon_j_brookes@icloud.com";

export const THEMES = {
  green: {
    name: "Fresh Green",
    logo: "images/logos/ships-main-black.png",
    background: "#f3f8ef",
    surface: "#ffffff",
    soft: "#e2f2dc",
    ink: "#173a24",
    muted: "#5d7564",
    accent: "#72ce54",
  },
  orange: {
    name: "Soft Orange",
    logo: "images/logos/ships-main-black.png",
    background: "#fff5e8",
    surface: "#fffdf8",
    soft: "#ffe4ca",
    ink: "#4a2818",
    muted: "#85614d",
    accent: "#ff8d47",
  },
  blue: {
    name: "Clear Blue",
    logo: "images/logos/ships-main-black.png",
    background: "#f1f9fc",
    surface: "#ffffff",
    soft: "#dceff7",
    ink: "#143644",
    muted: "#5a7782",
    accent: "#38b6ff",
  },
  red: {
    name: "Studio Red",
    logo: "images/logos/ships-main-black.png",
    background: "#fff4f2",
    surface: "#ffffff",
    soft: "#ffe0dc",
    ink: "#491b18",
    muted: "#855b57",
    accent: "#ff3131",
  },
  yellow: {
    name: "Warm Yellow",
    logo: "images/logos/ships-main-black.png",
    background: "#fff9eb",
    surface: "#fffefa",
    soft: "#ffedbd",
    ink: "#49351c",
    muted: "#826e52",
    accent: "#ffae4b",
  },
  mono: {
    name: "Monochrome",
    logo: "images/logos/ships-main-white.png",
    background: "#101010",
    surface: "#181818",
    soft: "#282621",
    ink: "#f7f3e9",
    muted: "#bbb4a8",
    accent: "#f3e5ce",
  },
};

export const ITEM_MODES = {
  regular: {
    name: "Regular item",
    label: "Request this item",
  },
  custom: {
    name: "Custom item",
    label: "Request a custom edition",
  },
  hybrid: {
    name: "Regular with optional customization",
    label: "Request or customize",
  },
};

export function createSlug(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseLines(value = "") {
  if (Array.isArray(value)) return value.map(String).map((line) => line.trim()).filter(Boolean);
  return String(value).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export function parseGallery(value = "") {
  return [...new Set(parseLines(value))];
}

export function normalizeItem(item = {}) {
  const itemMode = ITEM_MODES[item.item_mode] ? item.item_mode : "regular";
  const theme = THEMES[item.theme] ? item.theme : "mono";
  return {
    id: item.id || "",
    slug: item.slug || createSlug(item.title || "untitled-item"),
    title: item.title || "Untitled Item",
    eyebrow: item.eyebrow || "Made to request",
    summary: item.summary || "",
    description: item.description || "",
    main_image_url: item.main_image_url || "",
    gallery_urls: parseGallery(item.gallery_urls),
    sizes: parseLines(item.sizes),
    colors: parseLines(item.colors),
    customization_options: parseLines(item.customization_options),
    production_note: item.production_note || "Final availability, production timing, shipping, and pricing are confirmed personally before payment.",
    price_note: item.price_note || "Final quote confirmed by email",
    item_mode: itemMode,
    request_subject: item.request_subject || "",
    request_intro: item.request_intro || "",
    theme,
    is_featured: Boolean(item.is_featured),
    is_published: Boolean(item.is_published),
  };
}

export function getTheme(themeName) {
  return THEMES[themeName] || THEMES.green;
}

export function buildRequestEmail(rawItem, recipient = ORDER_EMAIL) {
  const item = normalizeItem(rawItem);
  const subjectPrefix = item.item_mode === "custom" ? "Custom request" : "Item request";
  const subject = item.request_subject || `${subjectPrefix}: ${item.title}`;
  const intro = item.request_intro || `Hi Simon,\n\nI'd like to request ${item.title}.`;
  const common = [
    intro,
    "",
    `Item: ${item.title}`,
    "Preferred size:",
    "Preferred color:",
  ];

  if (item.item_mode === "custom") {
    common.push("Requested personalization:", "Preferred font or style:");
  } else if (item.item_mode === "hybrid") {
    common.push("Optional customization request:");
  }

  common.push("Shipping location:", "Extra notes:", "", "Please send me the final quote and payment instructions.");
  const body = common.join("\n");
  return {
    recipient,
    subject,
    body,
    href: `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  };
}
