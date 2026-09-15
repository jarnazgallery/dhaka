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

function nextCode(products) {
  const nums = products.map((p) => Number(String(p.code).replace(/\D/g, "")) || 0);
  const next = (Math.max(0, ...nums) || 0) + 1;
  return `SET-${String(next).padStart(2, "0")}`;
}

function auth(req, res, next) {
  const token = String(req.headers.authorization || "").replace("Bearer ", "");
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

app.get("/api/catalog", (_req, res) => {
  const config = loadConfig();
  const site = readJson("site.json", {});
  res.json({
    products: readJson("products.json", []),
    offers: readJson("offers.json", []),
    site,
    whatsapp: site.whatsapp || config.whatsapp || "8801735943156",
    reviews: readJson("reviews.json", []),
  });
});

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
    total: Number(body.total || product.price * qty),
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
  const products = readJson("products.json", []);
  const product = products.find((p) => p.code === body.productCode);
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
  const products = readJson("products.json", []);
  const product = products.find((p) => p.code === body.productCode);
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
  const status = String((req.body && req.body.status) || "");
  if (status !== "new" && status !== "confirmed") {
    return res.status(400).json({ error: "স্ট্যাটাস ভুল" });
  }
  order.status = status;
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
  if (list.length < 4 || list.length > 5) {
    return res.status(400).json({ error: "৪ থেকে ৫টা অফার রাখুন" });
  }
  writeJson("offers.json", list);
  res.json(list);
}

app.put("/api/admin/offers", auth, saveOffers);
app.post("/api/admin/offers", auth, saveOffers);

app.post("/api/admin/products", auth, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "ছবি দিন" });
  const products = readJson("products.json", []);
  const product = {
    code: nextCode(products),
    name: String(req.body.name || "নতুন সেট").trim(),
    price: Number(req.body.price || 2040),
    piece: Number(req.body.piece || 2),
    description: String(req.body.description || "").trim(),
    image: `images/${req.file.filename}`,
  };
  products.unshift(product);
  writeJson("products.json", products);
  res.json(product);
});

function updateProduct(req, res) {
  const products = readJson("products.json", []);
  const product = products.find((p) => p.code === req.params.code);
  if (!product) return res.status(404).json({ error: "প্রোডাক্ট নেই" });
  if (req.body.name) product.name = String(req.body.name).trim();
  if (req.body.price) product.price = Number(req.body.price);
  if (req.body.piece) product.piece = Number(req.body.piece);
  if (req.body.description != null) product.description = String(req.body.description).trim();
  if (req.file) product.image = `images/${req.file.filename}`;
  writeJson("products.json", products);
  res.json(product);
}

app.put("/api/admin/products/:code", auth, upload.single("image"), updateProduct);
app.post("/api/admin/products/:code", auth, upload.single("image"), updateProduct);

app.delete("/api/admin/products/:code", auth, (req, res) => {
  const products = readJson("products.json", []).filter((p) => p.code !== req.params.code);
  writeJson("products.json", products);
  const offers = readJson("offers.json", []).filter((o) => o.code !== req.params.code);
  writeJson("offers.json", offers);
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
