const SIZES = [
  { value: "0-3 m", label: "0–3 মাস" },
  { value: "3-6 m", label: "3–6 মাস" },
  { value: "6-9 m", label: "6–9 মাস" },
  { value: "9-12 m", label: "9–12 মাস" },
  { value: "1-2 year", label: "1–2 বছর" },
  { value: "2-3 year", label: "2–3 বছর" },
  { value: "3-4 year", label: "3–4 বছর" },
  { value: "4-5 year", label: "4–5 বছর" },
  { value: "5-6 year", label: "5–6 বছর" },
];

const FALLBACK_PRODUCTS = [
  { code: "SET-01", piece: 2, name: "Floral Top + Daisy Shorts", price: 2040, price36: 2040, description: "২ পিস কম্বো। ফ্লোরাল টপ ও ডেইজি শর্টস। নরম কটন।", image: "images/set-01.png" },
  { code: "SET-02", piece: 2, name: "Navy Polka + Pearl Shorts", price: 2040, price36: 2040, description: "২ পিস কম্বো। নেভি পোলকা টপ ও পার্ল শর্টস।", image: "images/set-02.png" },
  { code: "SET-03", piece: 2, name: "Blue Floral + Pearl Shorts", price: 2040, price36: 2040, description: "২ পিস কম্বো। ব্লু ফ্লোরাল টপ ও পার্ল শর্টস।", image: "images/set-03.png" },
  { code: "SET-04", piece: 2, name: "Strawberry Top + Daisy Shorts", price: 2040, price36: 2040, description: "২ পিস কম্বো। স্ট্রবেরি টপ ও ডেইজি শর্টস।", image: "images/set-04.png" },
  { code: "SET-05", piece: 2, name: "Navy Floral + Pearl Shorts", price: 2040, price36: 2040, description: "২ পিস কম্বো। নেভি ফ্লোরাল টপ ও পার্ল শর্টস।", image: "images/set-05.png" },
  { code: "SET-06", piece: 2, name: "Pink Bow Top + Pearl Shorts", price: 2040, price36: 2040, description: "২ পিস কম্বো। পিঙ্ক বো টপ ও পার্ল শর্টস।", image: "images/set-06.png" },
  { code: "SET-07", piece: 2, name: "Pink Check + Daisy Shorts", price: 2040, price36: 2040, description: "২ পিস কম্বো। পিঙ্ক চেক টপ ও ডেইজি শর্টস।", image: "images/set-07.png" },
  { code: "SET-08", piece: 2, name: "Red Check + Daisy Shorts", price: 2040, price36: 2040, description: "২ পিস কম্বো। রেড চেক টপ ও ডেইজি শর্টস।", image: "images/set-08.png" },
  { code: "SET-09", piece: 2, name: "Lilac Check + Pearl Shorts", price: 2040, price36: 2040, description: "২ পিস কম্বো। লাইলাক চেক টপ ও পার্ল শর্টস।", image: "images/set-09.png" },
  { code: "SET-10", piece: 2, name: "Heart Top + Daisy Shorts", price: 2040, price36: 2040, description: "২ পিস কম্বো। হার্ট টপ ও ডেইজি শর্টস।", image: "images/set-10.png" },
  { code: "SET-11", piece: 2, name: "Black Check + Daisy Shorts", price: 2040, price36: 2040, description: "২ পিস কম্বো। ব্ল্যাক চেক টপ ও ডেইজি শর্টস।", image: "images/set-11.png" },
  { code: "SET-12", piece: 2, name: "White Bow Top + Pearl Shorts", price: 2040, price36: 2040, description: "২ পিস কম্বো। হোয়াইট বো টপ ও পার্ল শর্টস।", image: "images/set-12.png" },
];

const FALLBACK_OFFERS = [
  { code: "SET-01", title: "কম্বো অফার ১", price: 2040, piece: 2 },
  { code: "SET-02", title: "কম্বো অফার ২", price: 2040, piece: 2 },
  { code: "SET-04", title: "কম্বো অফার ৩", price: 2040, piece: 2 },
  { code: "SET-07", title: "কম্বো অফার ৪", price: 2040, piece: 2 },
  { code: "SET-10", title: "কম্বো অফার ৫", price: 2690, piece: 3 },
];

const FALLBACK_SITE = {
  brand: "Jarnaz Gallery",
  tagline: "Kids Combo Sets",
  whatsapp: "8801735943156",
  phone: "",
  facebook: "",
  instagram: "",
  location: "Pallabi, Mirpur 11",
  footerText: "Kids fashion · Pallabi, Mirpur 11",
  metaDescription: "Jarnaz Gallery বেবি-কিডস কম্বো সেট। প্রতিটি ছবির নিচে নম্বর আছে। Order Now ক্লিক করে সাইজ সিলেক্ট করুন।",
  topbar: "ক্যাশ অন ডেলিভারি · ঢাকায় ১–২ দিন · সাইজ সিলেক্ট করে অর্ডার",
  heroEyebrow: "Combo offer",
  heroTitle: "ছোটদের জন্য\nনির্বাচিত কম্বো",
  offersEnabled: true,
  heroNote: "অর্ডারের আগে সাইজ বেছে নিন · প্রোডাক্ট নম্বর অটো যাবে",
  navCollection: "কালেকশন",
  navReviews: "রিভিউ",
  navHowto: "কিভাবে অর্ডার",
  navOrder: "অর্ডার",
  collectionEyebrow: "Collection",
  collectionTitle: "কালেকশন",
  collectionSubtitle: "ছবির নিচের নম্বর ধরে অর্ডার করুন",
  reviewsEyebrow: "Reviews",
  reviewsTitle: "কাস্টমার রিভিউ",
  howtoEyebrow: "Guide",
  howtoTitle: "কিভাবে অর্ডার করবেন",
  checkoutEyebrow: "Checkout",
  checkoutTitle: "অর্ডার করুন",
  checkoutHint: "Order Now চাপুন, সাইজ সিলেক্ট করলেই অর্ডার ফর্ম খুলবে।",
  payNote: "পেমেন্ট: ক্যাশ অন ডেলিভারি",
  confirmHelp: "অ্যাডমিন এই প্রোডাক্ট নম্বর ও ছবি দেখেই বুঝবে কোন সেট অর্ডার হয়েছে।",
  logo: "",
  trust: [
    { title: "কটন ফ্যাব্রিক", text: "ত্বকের জন্য আরামদায়ক" },
    { title: "ক্যাশ অন ডেলিভারি", text: "সারা বাংলাদেশে" },
    { title: "দ্রুত ডেলিভারি", text: "ঢাকা ১–২ দিন" },
    { title: "সহজ অর্ডার", text: "নম্বর দিয়ে কনফার্ম" },
  ],
  reviews: [
    { text: "SET-04 অর্ডার করেছিলাম, ছবি আর কাপড় একই। সাইজ ঠিক থাকায় পারফেক্ট হয়েছে।", name: "নাবিলা · ঢাকা" },
    { text: "নম্বর দিয়ে অর্ডার করা খুব সহজ। হোয়াটসঅ্যাপে SET নম্বর চলে যায়, ভুল হয় না।", name: "সাদিয়া · চট্টগ্রাম" },
    { text: "৩ পিস কম্বো নিয়েছি দুই বোনের জন্য। কাপড় নরম, কালার উজ্জ্বল।", name: "ফারজানা · সিলেট" },
  ],
  howto: [
    { title: "সেট বেছে নিন", text: "নিচের ছবি থেকে পছন্দের কম্বো দেখুন।" },
    { title: "নম্বর দেখুন", text: "SET-07-এর মতো নম্বর অ্যাডমিন বুঝবে।" },
    { title: "Order Now", text: "চাপুন, সাইজ সিলেক্ট করলেই পরের ধাপে যাবে।" },
    { title: "কনফার্ম করুন", text: "নাম, ফোন ও ঠিকানা দিয়ে অর্ডার শেষ করুন।" },
  ],
};

let PRODUCTS = FALLBACK_PRODUCTS.slice();
let WHATSAPP = "8801735943156";
let API_MODE = "unknown";

const LOCAL_KEYS = {
  products: "jarnaz-local-products",
  offers: "jarnaz-local-offers",
  orders: "jarnaz-local-orders",
  pass: "jarnaz-local-pass",
  site: "jarnaz-local-site",
  reviews: "jarnaz-local-reviews",
};
const DEFAULT_ADMIN_PASSWORD = "jarnaz123";

function taka(n) {
  return `৳${Number(n).toLocaleString("bn-BD")}`;
}

function isOlderSize(sizeValue) {
  return ["3-4 year", "4-5 year", "5-6 year"].includes(String(sizeValue || ""));
}

function priceForSize(product, sizeValue) {
  if (!product) return 2040;
  if (isOlderSize(sizeValue)) return Number(product.price36 || product.price || 2040);
  return Number(product.price || 2040);
}

function htmlEsc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mergeSite(extra) {
  const merged = Object.assign({}, FALLBACK_SITE, extra || {});
  merged.trust = extra && extra.trust && extra.trust.length ? extra.trust : FALLBACK_SITE.trust.slice();
  merged.reviews = extra && extra.reviews && extra.reviews.length ? extra.reviews : FALLBACK_SITE.reviews.slice();
  merged.howto = extra && extra.howto && extra.howto.length ? extra.howto : FALLBACK_SITE.howto.slice();
  merged.offersEnabled = extra && extra.offersEnabled === false ? false : true;
  return merged;
}

function brandHTML(name) {
  const parts = String(name || "Jarnaz Gallery").trim().split(/\s+/);
  if (parts.length < 2) return htmlEsc(parts.join(" "));
  const last = parts.pop();
  return `${htmlEsc(parts.join(" "))} <em>${htmlEsc(last)}</em>`;
}

function fillBrand(el, site) {
  if (!el) return;
  if (site.logo) {
    el.innerHTML = `<img class="brand-logo" src="${htmlEsc(site.logo)}" alt="${htmlEsc(site.brand)}" />`;
  } else {
    el.innerHTML = brandHTML(site.brand);
  }
}

function displayPhone(digits) {
  const n = String(digits || "").replace(/\D/g, "");
  if (n.startsWith("880")) return "0" + n.slice(3);
  if (n.startsWith("88")) return "0" + n.slice(2);
  return n;
}

function applySite(raw) {
  SITE = mergeSite(raw);
  let phone = String(SITE.whatsapp || WHATSAPP).replace(/\D/g, "");
  if (phone.startsWith("0")) phone = "88" + phone;
  WHATSAPP = phone || WHATSAPP;

  const text = {
    topbar: SITE.topbar,
    heroEyebrow: SITE.heroEyebrow,
    heroNote: SITE.heroNote,
    navCollection: SITE.navCollection,
    navReviews: SITE.navReviews,
    navHowto: SITE.navHowto,
    navOrder: SITE.navOrder,
    collectionEyebrow: SITE.collectionEyebrow,
    collectionTitle: SITE.collectionTitle,
    collectionSubtitle: SITE.collectionSubtitle,
    reviewsEyebrow: SITE.reviewsEyebrow,
    reviewsTitle: SITE.reviewsTitle,
    howtoEyebrow: SITE.howtoEyebrow,
    howtoTitle: SITE.howtoTitle,
    checkoutEyebrow: SITE.checkoutEyebrow,
    checkoutTitle: SITE.checkoutTitle,
    checkoutHint: SITE.checkoutHint,
    payNoteText: SITE.payNote,
    confirmHelp: SITE.confirmHelp,
    footerText: SITE.footerText,
  };
  Object.keys(text).forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text[id] || "";
  });

  const heroTitle = document.getElementById("heroTitle");
  if (heroTitle) heroTitle.innerHTML = htmlEsc(SITE.heroTitle).replace(/\n/g, "<br>");

  fillBrand(document.getElementById("brandLogo"), SITE);
  fillBrand(document.getElementById("footerBrand"), SITE);
  fillBrand(document.getElementById("adminBrand"), SITE);

  const trust = document.getElementById("trustRow");
  if (trust) {
    trust.innerHTML = SITE.trust
      .map((item) => `<div class="trust-item"><strong>${htmlEsc(item.title)}</strong><span>${htmlEsc(item.text)}</span></div>`)
      .join("");
  }

  const howto = document.getElementById("howtoList");
  if (howto) {
    howto.innerHTML = SITE.howto
      .map((item) => `<li><strong>${htmlEsc(item.title)}</strong> ${htmlEsc(item.text)}</li>`)
      .join("");
  }

  const links = document.getElementById("footerLinks");
  if (links) {
    const items = [];
    if (SITE.phone) items.push(`<a href="tel:${htmlEsc(SITE.phone)}">${htmlEsc(SITE.phone)}</a>`);
    if (SITE.facebook) items.push(`<a href="${htmlEsc(SITE.facebook)}" target="_blank" rel="noopener">Facebook</a>`);
    if (SITE.instagram) items.push(`<a href="${htmlEsc(SITE.instagram)}" target="_blank" rel="noopener">Instagram</a>`);
    links.innerHTML = items.join("");
  }

  const shownPhone = displayPhone(WHATSAPP);
  const waHref = WHATSAPP ? `https://wa.me/${WHATSAPP}` : "#";
  const waFloat = document.getElementById("waFloat");
  if (waFloat) {
    waFloat.href = waHref;
    waFloat.textContent = "WhatsApp";
  }
  const footerWa = document.getElementById("footerWhatsapp");
  if (footerWa) {
    footerWa.href = waHref;
    footerWa.textContent = shownPhone ? `WhatsApp: ${shownPhone}` : "WhatsApp";
  }
  const footerLoc = document.getElementById("footerLocation");
  if (footerLoc) footerLoc.textContent = SITE.location || "";

  if (SITE.brand) document.title = `${SITE.brand} — ${SITE.tagline || "Kids Combo Sets"}`;
  const meta = document.querySelector('meta[name="description"]');
  if (meta && SITE.metaDescription) meta.setAttribute("content", SITE.metaDescription);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle && SITE.brand) ogTitle.setAttribute("content", `${SITE.brand} — ${SITE.tagline || "Kids Combo Sets"}`);
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc && SITE.metaDescription) ogDesc.setAttribute("content", SITE.metaDescription);

  const json = document.getElementById("businessJson");
  if (json) {
    json.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Store",
      name: SITE.brand || "Jarnaz Gallery",
      description: SITE.metaDescription || SITE.tagline || "",
      address: { "@type": "PostalAddress", addressLocality: SITE.location || "Pallabi, Mirpur 11", addressCountry: "BD" },
      telephone: WHATSAPP ? "+" + WHATSAPP : "",
      url: "https://jarnazgallery.com/",
    });
  }

  document.body.classList.toggle("offers-off", SITE.offersEnabled === false);
}

let SITE = mergeSite();

function findProduct(code) {
  return PRODUCTS.find((p) => p.code === code);
}

function parseJsonSafe(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    const err = new Error("সার্ভার JSON দেয়নি");
    err.code = "NOT_JSON";
    throw err;
  }
  return JSON.parse(trimmed);
}

async function apiCall(route, options = {}) {
  const clean = String(route).replace(/^\/+/, "").replace(/^api\//, "");
  const method = String((options && options.method) || "GET").toUpperCase();
  const opts = Object.assign({}, options || {});
  opts.headers = Object.assign({}, opts.headers || {});
  const adminToken = opts.headers.Authorization || opts.headers.authorization || "";
  if (adminToken && !opts.headers["X-Admin-Token"]) {
    opts.headers["X-Admin-Token"] = String(adminToken).replace(/^Bearer\s+/i, "");
  }
  const bust = clean === "catalog" && method === "GET" ? "t=" + Date.now() : "";
  const attempts = [
    { url: "/api/" + clean + (bust ? "?" + bust : ""), options: opts },
    { url: "api.php?route=" + encodeURIComponent(clean) + (bust ? "&" + bust : ""), options: opts },
  ];
  if (clean === "catalog" && method === "GET") {
    attempts.push({ url: "catalog-data.json?" + bust, options: { method: "GET" } });
  }
  if (method !== "GET" && method !== "POST") {
    attempts.push({
      url: "api.php?route=" + encodeURIComponent(clean) + "&_method=" + method,
      options: Object.assign({}, opts, { method: "POST" }),
    });
  }

  let sawHtml = false;
  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt.url, attempt.options);
      const text = await res.text();
      const data = parseJsonSafe(text);
      if (attempt.url.indexOf("catalog-data.json") === 0) API_MODE = "file";
      else API_MODE = attempt.url.indexOf("api.php") === 0 ? "php" : "server";
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      if (err.code === "NOT_JSON") sawHtml = true;
    }
  }
  const err = new Error(sawHtml ? "NO_API" : "সার্ভারে সংযোগ হয়নি");
  err.code = "NO_API";
  throw err;
}

function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const data = JSON.parse(raw);
    return data == null ? fallback : data;
  } catch (err) {
    return fallback;
  }
}

function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function localCatalog() {
  const site = mergeSite(readLocal(LOCAL_KEYS.site, null));
  return {
    products: readLocal(LOCAL_KEYS.products, FALLBACK_PRODUCTS.slice()),
    offers: readLocal(LOCAL_KEYS.offers, FALLBACK_OFFERS.slice()),
    site,
    whatsapp: site.whatsapp || WHATSAPP,
    reviews: readLocal(LOCAL_KEYS.reviews, []),
  };
}

async function loadCatalog() {
  try {
    const result = await apiCall("catalog");
    if (!result.ok || !result.data || !Array.isArray(result.data.products)) throw new Error("empty");
    PRODUCTS = result.data.products;
    SITE = mergeSite(result.data.site);
    WHATSAPP = SITE.whatsapp || result.data.whatsapp || WHATSAPP;
    applySite(SITE);
    return Object.assign({}, result.data, { site: SITE, whatsapp: WHATSAPP });
  } catch (err) {
    const local = localCatalog();
    PRODUCTS = local.products;
    SITE = local.site;
    WHATSAPP = local.whatsapp || WHATSAPP;
    API_MODE = "local";
    applySite(SITE);
    return local;
  }
}

function localNextCode(products) {
  const nums = products.map((p) => Number(String(p.code).replace(/\D/g, "")) || 0);
  const next = (Math.max(0, ...nums) || 0) + 1;
  return `SET-${String(next).padStart(2, "0")}`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function localLogin(password) {
  const saved = localStorage.getItem(LOCAL_KEYS.pass);
  if (password !== DEFAULT_ADMIN_PASSWORD && password !== saved) {
    throw new Error("পাসওয়ার্ড ভুল");
  }
  API_MODE = "local";
  return { token: "local" };
}

async function handleLocalAdmin(route, options) {
  const method = String((options && options.method) || "GET").toUpperCase();
  const catalog = localCatalog();
  let products = catalog.products;
  let offers = catalog.offers;
  let orders = readLocal(LOCAL_KEYS.orders, []);

  if (route === "admin/me" && method === "GET") return { ok: true };
  if (route === "reviews" && method === "POST") {
    const form = options.body;
    const imageFile = form.get("image");
    const review = {
      id: "RV-" + String(Date.now()).slice(-8),
      name: String(form.get("name") || "").trim(),
      text: String(form.get("text") || "").trim(),
      image: imageFile && imageFile.size ? await fileToDataUrl(imageFile) : "",
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
    if (!review.name || !review.text) throw new Error("নাম ও কমেন্ট দিন");
    const list = readLocal(LOCAL_KEYS.reviews, []);
    list.unshift(review);
    writeLocal(LOCAL_KEYS.reviews, list);
    return review;
  }

  const reviewMatch = route.match(/^admin\/reviews\/(.+)$/);
  if (reviewMatch && method === "DELETE") {
    const id = decodeURIComponent(reviewMatch[1]);
    writeLocal(LOCAL_KEYS.reviews, readLocal(LOCAL_KEYS.reviews, []).filter((r) => r.id !== id));
    return { ok: true };
  }
  if (route === "catalog" && method === "GET") return catalog;
  if (route === "admin/orders" && method === "GET") return orders;

  if (route === "admin/site" && (method === "PUT" || method === "POST")) {
    const form = options.body;
    let site = {};
    try {
      site = JSON.parse(form.get("site") || "{}");
    } catch (err) {
      throw new Error("সাইট ডাটা ভুল");
    }
    const logo = form.get("logo");
    if (logo && logo.size) site.logo = await fileToDataUrl(logo);
    else if (!site.logo) site.logo = catalog.site.logo || "";
    site = mergeSite(site);
    writeLocal(LOCAL_KEYS.site, site);
    return site;
  }

  if (route === "orders" && method === "POST") {
    const body = JSON.parse(options.body);
    body.status = "new";
    body.source = "web";
    if (!body.id) body.id = "JZ-" + String(Date.now()).slice(-8);
    orders.unshift(body);
    writeLocal(LOCAL_KEYS.orders, orders);
    return body;
  }

  if (route === "admin/orders" && method === "POST") {
    const body = JSON.parse(options.body);
    const product = products.find((p) => p.code === body.productCode) || PRODUCTS[0];
    if (!product) throw new Error("প্রোডাক্ট পাওয়া যায়নি");
    const qty = Math.max(1, Number(body.qty || 1));
    const order = {
      id: "JZ-" + String(Date.now()).slice(-8),
      productCode: product.code,
      name: String(body.name || "").trim(),
      phone: String(body.phone || "").trim(),
      address: String(body.address || "").trim(),
      size: String(body.size || "").trim(),
      combo: Number(product.piece || 2),
      qty,
      total: Number(body.total || priceForSize(product, body.size) * qty),
      status: body.status === "new" ? "new" : "confirmed",
      source: "admin",
      createdAt: new Date().toISOString(),
    };
    if (!order.name || !order.phone || !order.address || !order.size) throw new Error("সব তথ্য দিন");
    orders.unshift(order);
    writeLocal(LOCAL_KEYS.orders, orders);
    return order;
  }

  if (route === "admin/offers" && (method === "PUT" || method === "POST")) {
    offers = JSON.parse(options.body);
    writeLocal(LOCAL_KEYS.offers, offers);
    return offers;
  }

  if (route === "admin/products" && method === "POST") {
    const form = options.body;
    const imageFile = form.get("image");
    const product = {
      code: localNextCode(products),
      name: String(form.get("name") || "নতুন সেট").trim(),
      price: Number(form.get("price") || 2040),
      price36: Number(form.get("price36") || form.get("price") || 2040),
      piece: Number(form.get("piece") || 2),
      description: String(form.get("description") || "").trim(),
      image: imageFile ? await fileToDataUrl(imageFile) : "images/set-01.png",
    };
    products.unshift(product);
    writeLocal(LOCAL_KEYS.products, products);
    return product;
  }

  const productMatch = route.match(/^admin\/products\/(.+)$/);
  if (productMatch && (method === "PUT" || method === "POST")) {
    const code = decodeURIComponent(productMatch[1]);
    const product = products.find((p) => p.code === code);
    if (!product) throw new Error("প্রোডাক্ট নেই");
    const form = options.body;
    const name = form.get("name");
    const price = form.get("price");
    const price36 = form.get("price36");
    const piece = form.get("piece");
    const imageFile = form.get("image");
    if (name) product.name = String(name).trim();
    if (price) product.price = Number(price);
    if (price36) product.price36 = Number(price36);
    if (piece) product.piece = Number(piece);
    if (form.has("description")) product.description = String(form.get("description") || "").trim();
    if (imageFile && imageFile.size) product.image = await fileToDataUrl(imageFile);
    writeLocal(LOCAL_KEYS.products, products);
    return product;
  }

  if (productMatch && method === "DELETE") {
    const code = decodeURIComponent(productMatch[1]);
    products = products.filter((p) => p.code !== code);
    offers = offers.filter((o) => o.code !== code);
    writeLocal(LOCAL_KEYS.products, products);
    writeLocal(LOCAL_KEYS.offers, offers);
    return { ok: true };
  }

  const orderMatch = route.match(/^admin\/orders\/(.+)$/);
  if (orderMatch && (method === "POST" || method === "PUT")) {
    const id = decodeURIComponent(orderMatch[1]);
    const body = JSON.parse(options.body || "{}");
    const order = orders.find((o) => o.id === id);
    if (!order) throw new Error("অর্ডার নেই");
    const allowed = ["new", "confirmed", "cancelled", "delivered"];
    if (body.status && !allowed.includes(body.status)) throw new Error("স্ট্যাটাস ভুল");
    ["name", "phone", "address", "size", "note"].forEach((key) => {
      if (body[key] != null) order[key] = String(body[key]).trim();
    });
    if (body.qty != null) order.qty = Math.max(1, Number(body.qty) || 1);
    if (body.productCode) {
      const product = products.find((p) => p.code === body.productCode);
      if (product) {
        order.productCode = product.code;
        order.combo = Number(product.piece || order.combo || 2);
        if (body.total == null) order.total = priceForSize(product, order.size) * order.qty;
      }
    }
    if (body.total != null && body.total !== "") order.total = Number(body.total);
    if (body.status) order.status = body.status;
    if (!order.name || !order.phone || !order.address || !order.size) throw new Error("নাম, মোবাইল, ঠিকানা ও সাইজ দিন");
    order.updatedAt = new Date().toISOString();
    writeLocal(LOCAL_KEYS.orders, orders);
    return order;
  }
  if (orderMatch && method === "DELETE") {
    const id = decodeURIComponent(orderMatch[1]);
    writeLocal(LOCAL_KEYS.orders, orders.filter((o) => o.id !== id));
    return { ok: true };
  }

  if (route === "admin/password" && (method === "PUT" || method === "POST")) {
    const body = JSON.parse(options.body);
    if (!body.password || String(body.password).length < 6) throw new Error("কমপক্ষে ৬ অক্ষর");
    localStorage.setItem(LOCAL_KEYS.pass, String(body.password));
    return { ok: true };
  }

  throw new Error("কাজ হয়নি");
}
