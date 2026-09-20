const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");

const ROOT = __dirname;
const DATA = path.join(ROOT, "data");
const IMAGES = path.join(ROOT, "images");
const PORT = 5500;
const DEFAULT_PASSWORD = "jarnaz123";

const app = express();
app.use(express.json({ limit: "2mb" }));

const tokens = new Map();

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA, file), "utf8"));
  } catch (err) {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.writeFileSync(path.join(DATA, file), JSON.stringify(value, null, 2));
  if (["products.json", "offers.json", "site.json", "reviews.json"].includes(file)) {
    try { publishCatalog(); } catch (_err) {}
  }
}

function hashPassword(password, salt) {
  return crypto.createHash("sha256").update(String(salt) + String(password)).digest("hex");
}

function loadConfig() {
  const file = path.join(DATA, "config.json");
  let config = {};
  if (fs.existsSync(file)) {
    try {
      config = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (err) {
      config = {};
    }
  }
  if (config.algo !== "sha256" || !config.passwordHash || !config.salt) {
    const salt = crypto.randomBytes(16).toString("hex");
    config = {
      algo: "sha256",
      salt,
      passwordHash: hashPassword(DEFAULT_PASSWORD, salt),
      whatsapp: config.whatsapp || "8801735943156",
    };
    fs.writeFileSync(file, JSON.stringify(config, null, 2));
  }
  return config;
}

function saveConfig(config) {
  fs.writeFileSync(path.join(DATA, "config.json"), JSON.stringify(config, null, 2));
}

function normalizeCode(raw) {
  const n = Number(String(raw || "").replace(/\D/g, ""));
  if (!n || n < 1 || n > 999) return "";
  return `SET-${String(n).padStart(2, "0")}`;
}

function firstFreeCode(products) {
  const used = new Set((products || []).map((p) => String(p.code || "").toUpperCase()));
  for (let n = 1; n <= 999; n += 1) {
    const code = `SET-${String(n).padStart(2, "0")}`;
    if (!used.has(code)) return code;
  }
  return "";
}

function nextCode(products) {
  return firstFreeCode(products);
}

function productPriority(product) {
  const n = Number(product && product.priority);
  if (Number.isFinite(n) && n > 0) return n;
  return Number(String((product && product.code) || "").replace(/\D/g, "")) || 9999;
}

function sortProducts(list) {
  return (list || []).slice().sort((a, b) => {
    const pa = productPriority(a);
    const pb = productPriority(b);
    if (pa !== pb) return pa - pb;
    const na = Number(String(a.code || "").replace(/\D/g, "")) || 0;
    const nb = Number(String(b.code || "").replace(/\D/g, "")) || 0;
    if (na !== nb) return na - nb;
    return String(a.code || "").localeCompare(String(b.code || ""));
  });
}

function renameOfferCode(oldCode, nextCodeValue) {
  const offers = readJson("offers.json", []);
  let changed = false;
  offers.forEach((offer) => {
    if (offer.code === oldCode) {
      offer.code = nextCodeValue;
      changed = true;
    }
  });
  if (changed) writeJson("offers.json", offers);
}

function auth(req, res, next) {
  const header = String(req.headers.authorization || req.headers["x-admin-token"] || "");
  const token = header.replace(/^Bearer\s+/i, "").trim() || String(req.body && req.body.token || req.query.token || "");
  if (!token || !tokens.has(token)) {
    return res.status(401).json({ error: "লগইন করুন" });
  }
  next();
}

if (!fs.existsSync(IMAGES)) fs.mkdirSync(IMAGES, { recursive: true });
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });
loadConfig();

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, IMAGES),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
      cb(null, `set-${Date.now()}${ext}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const ok = /^image\//i.test(file.mimetype || "") || /\.(png|jpe?g|webp|gif|heic|heif|bmp)$/i.test(file.originalname || "");
    cb(ok ? null : new Error("শুধু ছবি আপলোড করুন"), ok);
  },
  limits: { fileSize: 15 * 1024 * 1024 },
});

function catalogPayload() {
  const config = loadConfig();
  const site = readJson("site.json", {});
  return {
    products: sortProducts(readJson("products.json", [])),
    offers: readJson("offers.json", []),
    site,
    whatsapp: site.whatsapp || config.whatsapp || "8801735943156",
    reviews: readJson("reviews.json", []),
  };
}

function publishCatalog() {
  fs.writeFileSync(path.join(ROOT, "catalog-data.json"), JSON.stringify(catalogPayload()));
}

app.get("/api/catalog", (_req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.json(catalogPayload());
});

function findSellable(code) {
  const product = readJson("products.json", []).find((p) => p.code === code);
  if (product) return product;
  const offer = readJson("offers.json", []).find((o) => o.code === code);
  if (!offer) return null;
  return {
    code: offer.code,
    name: offer.title || offer.name || "কম্বো অফার",
    price: Number(offer.price || 2040),
    price36: Number(offer.price36 || offer.price || 2040),
    piece: Number(offer.piece || 2),
    image: offer.image || "",
    description: offer.description || "",
  };
}

function firstFreeCombo(offers) {
  const used = new Set((offers || []).map((o) => String(o.code || "").toUpperCase()));
  for (let n = 1; n <= 99; n += 1) {
    const code = `COMBO-${String(n).padStart(2, "0")}`;
    if (!used.has(code)) return code;
  }
  return "";
}

function priceForAge(product, size) {
  const older = ["3-4 year", "4-5 year", "5-6 year"].includes(String(size || ""));
  if (older) return Number(product.price36 || product.price || 2040);
  return Number(product.price || 2040);
}

function makeOrder(body, product, extra) {
  extra = extra || {};
  const qty = Math.max(1, Number(body.qty || 1));
  const order = {
    id: body.id || `JZ-${Date.now().toString().slice(-8)}`,
    productCode: product.code,
    name: String(body.name || "").trim(),
    phone: String(body.phone || "").trim(),
    address: String(body.address || "").trim(),
    size: String(body.size || "").trim(),
    combo: Number(body.combo || product.piece || 2),
    qty,
    total: Number(body.total || priceForAge(product, body.size) * qty),
    status: extra.status || (body.status === "confirmed" ? "confirmed" : "new"),
    source: extra.source || "web",
    createdAt: new Date().toISOString(),
  };
  if (!order.name || !order.phone || !order.address || !order.size) {
    return { error: "সব তথ্য দিন" };
  }
  return { order };
}

app.post("/api/reviews", upload.single("image"), (req, res) => {
  const name = String(req.body.name || "").trim();
  const text = String(req.body.text || "").trim();
  if (!name || !text) return res.status(400).json({ error: "নাম ও কমেন্ট দিন" });
  const review = {
    id: `RV-${Date.now().toString().slice(-8)}`,
    name,
    text,
    image: req.file ? `images/${req.file.filename}` : "",
    status: "confirmed",
    createdAt: new Date().toISOString(),
  };
  const reviews = readJson("reviews.json", []);
  reviews.unshift(review);
  writeJson("reviews.json", reviews);
  res.json(review);
});

app.delete("/api/admin/reviews/:id", auth, (req, res) => {
  const reviews = readJson("reviews.json", []).filter((r) => r.id !== req.params.id);
  writeJson("reviews.json", reviews);
  res.json({ ok: true });
});

app.post("/api/orders", (req, res) => {
  const body = req.body || {};
  const product = findSellable(body.productCode);
  if (!product) return res.status(400).json({ error: "প্রোডাক্ট পাওয়া যায়নি" });
  const made = makeOrder(body, product, { status: "new", source: "web" });
  if (made.error) return res.status(400).json({ error: made.error });
  const orders = readJson("orders.json", []);
  orders.unshift(made.order);
  writeJson("orders.json", orders);
  res.json(made.order);
});
app.post("/api/login", (req, res) => {
  const config = loadConfig();
  const password = String(req.body.password || "");
  const hash = hashPassword(password, config.salt);
  if (hash !== config.passwordHash) {
    return res.status(401).json({ error: "পাসওয়ার্ড ভুল" });
  }
  const token = crypto.randomBytes(24).toString("hex");
  tokens.set(token, Date.now());
  res.json({ token });
});

app.get("/api/admin/me", auth, (_req, res) => res.json({ ok: true }));

app.get("/api/admin/orders", auth, (_req, res) => {
  res.json(readJson("orders.json", []));
});

app.post("/api/admin/orders", auth, (req, res) => {
  const body = req.body || {};
  const product = findSellable(body.productCode);
  if (!product) return res.status(400).json({ error: "প্রোডাক্ট পাওয়া যায়নি" });
  const made = makeOrder(body, product, {
    status: body.status === "new" ? "new" : "confirmed",
    source: "admin",
  });
  if (made.error) return res.status(400).json({ error: made.error });
  const orders = readJson("orders.json", []);
  orders.unshift(made.order);
  writeJson("orders.json", orders);
  res.json(made.order);
});

app.post("/api/admin/orders/:id", auth, (req, res) => {
  const orders = readJson("orders.json", []);
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "অর্ডার নেই" });
  const body = req.body || {};
  const allowed = ["new", "confirmed", "cancelled", "delivered"];
  if (body.status && !allowed.includes(String(body.status))) {
    return res.status(400).json({ error: "স্ট্যাটাস ভুল" });
  }
  ["name", "phone", "address", "size", "note"].forEach((key) => {
    if (body[key] != null) order[key] = String(body[key]).trim();
  });
  if (body.qty != null) order.qty = Math.max(1, Number(body.qty) || 1);
  if (body.productCode) {
    const product = findSellable(body.productCode);
    if (product) {
      order.productCode = product.code;
      order.combo = Number(product.piece || order.combo || 2);
      if (body.total == null) order.total = priceForAge(product, order.size) * order.qty;
    }
  }
  if (body.total != null && body.total !== "") order.total = Number(body.total);
  if (body.status) order.status = String(body.status);
  if (!order.name || !order.phone || !order.address || !order.size) {
    return res.status(400).json({ error: "নাম, মোবাইল, ঠিকানা ও সাইজ দিন" });
  }
  order.updatedAt = new Date().toISOString();
  writeJson("orders.json", orders);
  res.json(order);
});

app.delete("/api/admin/orders/:id", auth, (req, res) => {
  const orders = readJson("orders.json", []).filter((o) => o.id !== req.params.id);
  writeJson("orders.json", orders);
  res.json({ ok: true });
});

function saveOffers(req, res) {
  const list = Array.isArray(req.body) ? req.body : [];
  if (list.length > 10) {
    return res.status(400).json({ error: "১০টার বেশি কম্বো রাখা যাবে না" });
  }
  writeJson("offers.json", list);
  res.json(list);
}

app.put("/api/admin/offers", auth, saveOffers);

app.post("/api/admin/offers-delete", auth, (req, res) => {
  const code = String((req.body && req.body.code) || "").trim();
  if (!code) return res.status(400).json({ error: "কম্বো নম্বর দিন" });
  writeJson("offers.json", readJson("offers.json", []).filter((o) => o.code !== code));
  res.json({ ok: true });
});

app.post("/api/admin/offers/:code", auth, upload.single("image"), (req, res) => {
  const code = decodeURIComponent(req.params.code);
  const offers = readJson("offers.json", []);
  const offer = offers.find((o) => o.code === code);
  if (!offer) return res.status(404).json({ error: "কম্বো নেই" });
  if (req.body.title || req.body.name) offer.title = String(req.body.title || req.body.name || offer.title).trim();
  if (req.body.price) offer.price = Number(req.body.price);
  if (req.body.price36) offer.price36 = Number(req.body.price36);
  if (req.body.piece) offer.piece = Number(req.body.piece);
  if (req.body.description != null) offer.description = String(req.body.description).trim();
  if (req.file) offer.image = `images/${req.file.filename}`;
  writeJson("offers.json", offers);
  res.json(offer);
});

app.post("/api/admin/offers", auth, upload.single("image"), (req, res) => {
  if (req.file || (req.body && req.body.title)) {
    if (!req.file) return res.status(400).json({ error: "কম্বোর ছবি দিন" });
    const offers = readJson("offers.json", []);
    if (offers.length >= 10) return res.status(400).json({ error: "১০টার বেশি কম্বো রাখা যাবে না" });
    const code = firstFreeCombo(offers);
    if (!code) return res.status(400).json({ error: "ফাঁকা কম্বো নম্বর নেই" });
    const offer = {
      code,
      title: String(req.body.title || req.body.name || "কম্বো অফার").trim(),
      price: Number(req.body.price || 2040),
      price36: Number(req.body.price36 || req.body.price || 2040),
      piece: Number(req.body.piece || 2),
      description: String(req.body.description || "").trim(),
      image: `images/${req.file.filename}`,
    };
    offers.unshift(offer);
    writeJson("offers.json", offers);
    return res.json(offer);
  }
  return saveOffers(req, res);
});

function deleteProductByCode(code) {
  const clean = decodeURIComponent(String(code || ""));
  writeJson("products.json", readJson("products.json", []).filter((p) => p.code !== clean));
}

app.post("/api/admin/products-delete", auth, (req, res) => {
  const code = String((req.body && req.body.code) || "").trim();
  if (!code) return res.status(400).json({ error: "প্রোডাক্ট নম্বর দিন" });
  deleteProductByCode(code);
  res.json({ ok: true });
});

app.post("/api/admin/products-order", auth, (req, res) => {
  const codes = Array.isArray(req.body && req.body.codes) ? req.body.codes : [];
  if (!codes.length) return res.status(400).json({ error: "অর্ডার লিস্ট দিন" });
  const products = readJson("products.json", []);
  const rank = {};
  codes.forEach((code, i) => {
    rank[String(code)] = i + 1;
  });
  products.forEach((product) => {
    if (rank[product.code]) product.priority = rank[product.code];
  });
  const sorted = sortProducts(products);
  writeJson("products.json", sorted);
  res.json(sorted);
});

app.post("/api/admin/products", auth, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "ছবি দিন" });
  const products = readJson("products.json", []);
  if (products.length >= 200) return res.status(400).json({ error: "২০০টার বেশি প্রোডাক্ট রাখা যাবে না" });
  const requested = String(req.body.code || "").trim();
  const code = requested ? normalizeCode(requested) : firstFreeCode(products);
  if (!code) return res.status(400).json({ error: "সেট নম্বর ১ থেকে ৯৯৯ দিন, যেমন 13 বা SET-13" });
  if (products.some((p) => p.code === code)) return res.status(400).json({ error: `${code} আগে থেকে আছে` });
  const product = {
    code,
    priority: req.body.priority !== undefined && String(req.body.priority).trim() !== ""
      ? Math.max(1, Number(req.body.priority) || 1)
      : Number(code.replace(/\D/g, "")) || products.length + 1,
    name: String(req.body.name || "নতুন সেট").trim(),
    price: Number(req.body.price || 2040),
    price36: Number(req.body.price36 || req.body.price || 2040),
    piece: Number(req.body.piece || 2),
    description: String(req.body.description || "").trim(),
    image: `images/${req.file.filename}`,
  };
  products.unshift(product);
  writeJson("products.json", sortProducts(products));
  res.json(product);
});

function updateProduct(req, res) {
  const products = readJson("products.json", []);
  const code = decodeURIComponent(req.params.code);
  const product = products.find((p) => p.code === code);
  if (!product) return res.status(404).json({ error: "প্রোডাক্ট নেই" });
  if (req.body.name) product.name = String(req.body.name).trim();
  if (req.body.price) product.price = Number(req.body.price);
  if (req.body.price36) product.price36 = Number(req.body.price36);
  if (req.body.piece) product.piece = Number(req.body.piece);
  if (req.body.description != null) product.description = String(req.body.description).trim();
  if (req.body.priority !== undefined && String(req.body.priority).trim() !== "") {
    product.priority = Math.max(1, Number(req.body.priority) || 1);
  }
  if (req.body.code && String(req.body.code).trim()) {
    const next = normalizeCode(req.body.code);
    if (!next) return res.status(400).json({ error: "সেট নম্বর ১ থেকে ৯৯৯ দিন, যেমন 13 বা SET-13" });
    if (next !== code && products.some((p) => p.code === next)) {
      return res.status(400).json({ error: `${next} আগে থেকে আছে` });
    }
    if (next !== code) {
      product.code = next;
      renameOfferCode(code, next);
    }
  }
  if (req.file) product.image = `images/${req.file.filename}`;
  writeJson("products.json", sortProducts(products));
  res.json(product);
}

app.put("/api/admin/products/:code", auth, upload.single("image"), updateProduct);
app.post("/api/admin/products/:code", auth, upload.single("image"), updateProduct);

app.delete("/api/admin/products/:code", auth, (req, res) => {
  deleteProductByCode(req.params.code);
  res.json({ ok: true });
});

function changePassword(req, res) {
  const password = String(req.body.password || "");
  if (password.length < 6) return res.status(400).json({ error: "কমপক্ষে ৬ অক্ষর" });
  const config = loadConfig();
  config.algo = "sha256";
  config.salt = crypto.randomBytes(16).toString("hex");
  config.passwordHash = hashPassword(password, config.salt);
  saveConfig(config);
  tokens.clear();
  res.json({ ok: true });
}

function saveSite(req, res) {
  let site = {};
  try {
    site = JSON.parse(req.body.site || "{}");
  } catch (err) {
    return res.status(400).json({ error: "সাইট ডাটা ভুল" });
  }
  if (req.file) site.logo = `images/${req.file.filename}`;
  else {
    const prev = readJson("site.json", {});
    if (!site.logo && prev.logo) site.logo = prev.logo;
  }
  writeJson("site.json", site);
  if (site.whatsapp) {
    const config = loadConfig();
    config.whatsapp = String(site.whatsapp).replace(/\D/g, "");
    saveConfig(config);
  }
  res.json(site);
}

app.put("/api/admin/site", auth, upload.single("logo"), saveSite);
app.post("/api/admin/site", auth, upload.single("logo"), saveSite);

app.use("/data", (_req, res) => res.status(404).end());
app.get("/admin", (_req, res) => {
  res.sendFile(path.join(ROOT, "admin.html"));
});
app.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message || "অনুরোধ ব্যর্থ" });
});
app.use(express.static(ROOT));

app.listen(PORT, () => {
  console.log(`Jarnaz Gallery running at http://localhost:${PORT}`);
});
