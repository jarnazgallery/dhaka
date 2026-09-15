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
  return crypto.scryptSync(password, salt, 32).toString("hex");
}

function loadConfig() {
  const file = path.join(DATA, "config.json");
  if (!fs.existsSync(file)) {
    const salt = crypto.randomBytes(16).toString("hex");
    const config = {
      salt,
      passwordHash: hashPassword(DEFAULT_PASSWORD, salt),
      whatsapp: "8801700000000",
    };
    fs.writeFileSync(file, JSON.stringify(config, null, 2));
    return config;
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
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
    const ok = /image\/(png|jpe?g|webp|gif)/i.test(file.mimetype);
    cb(ok ? null : new Error("শুধু ছবি আপলোড করুন"), ok);
  },
  limits: { fileSize: 8 * 1024 * 1024 },
});

app.get("/api/catalog", (_req, res) => {
  const config = loadConfig();
  res.json({
    products: readJson("products.json", []),
    offers: readJson("offers.json", []),
    whatsapp: config.whatsapp || "8801700000000",
  });
});

app.post("/api/orders", (req, res) => {
  const body = req.body || {};
  const products = readJson("products.json", []);
  const product = products.find((p) => p.code === body.productCode);
  if (!product) return res.status(400).json({ error: "প্রোডাক্ট পাওয়া যায়নি" });
  const order = {
    id: body.id || `JZ-${Date.now().toString().slice(-8)}`,
    productCode: product.code,
    name: String(body.name || "").trim(),
    phone: String(body.phone || "").trim(),
    address: String(body.address || "").trim(),
    size: String(body.size || "").trim(),
    combo: Number(body.combo || product.piece || 2),
    qty: Number(body.qty || 1),
    total: Number(body.total || product.price),
    createdAt: new Date().toISOString(),
  };
  if (!order.name || !order.phone || !order.address || !order.size) {
    return res.status(400).json({ error: "সব তথ্য দিন" });
  }
  const orders = readJson("orders.json", []);
  orders.unshift(order);
  writeJson("orders.json", orders);
  res.json(order);
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

app.delete("/api/admin/orders/:id", auth, (req, res) => {
  const orders = readJson("orders.json", []).filter((o) => o.id !== req.params.id);
  writeJson("orders.json", orders);
  res.json({ ok: true });
});

app.put("/api/admin/offers", auth, (req, res) => {
  const list = Array.isArray(req.body) ? req.body : [];
  if (list.length < 4 || list.length > 5) {
    return res.status(400).json({ error: "৪ থেকে ৫টা অফার রাখুন" });
  }
  writeJson("offers.json", list);
  res.json(list);
});

app.post("/api/admin/products", auth, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "ছবি দিন" });
  const products = readJson("products.json", []);
  const product = {
    code: nextCode(products),
    name: String(req.body.name || "নতুন সেট").trim(),
    price: Number(req.body.price || 2040),
    piece: Number(req.body.piece || 2),
    image: `images/${req.file.filename}`,
  };
  products.push(product);
  writeJson("products.json", products);
  res.json(product);
});

app.put("/api/admin/products/:code", auth, upload.single("image"), (req, res) => {
  const products = readJson("products.json", []);
  const product = products.find((p) => p.code === req.params.code);
  if (!product) return res.status(404).json({ error: "প্রোডাক্ট নেই" });
  if (req.body.name) product.name = String(req.body.name).trim();
  if (req.body.price) product.price = Number(req.body.price);
  if (req.body.piece) product.piece = Number(req.body.piece);
  if (req.file) product.image = `images/${req.file.filename}`;
  writeJson("products.json", products);
  res.json(product);
});

app.delete("/api/admin/products/:code", auth, (req, res) => {
  const products = readJson("products.json", []).filter((p) => p.code !== req.params.code);
  writeJson("products.json", products);
  const offers = readJson("offers.json", []).filter((o) => o.code !== req.params.code);
  writeJson("offers.json", offers);
  res.json({ ok: true });
});

app.put("/api/admin/password", auth, (req, res) => {
  const password = String(req.body.password || "");
  if (password.length < 6) return res.status(400).json({ error: "কমপক্ষে ৬ অক্ষর" });
  const config = loadConfig();
  config.salt = crypto.randomBytes(16).toString("hex");
  config.passwordHash = hashPassword(password, config.salt);
  saveConfig(config);
  tokens.clear();
  res.json({ ok: true });
});

app.use("/data", (_req, res) => res.status(404).end());
app.get("/admin", (_req, res) => {
  res.sendFile(path.join(ROOT, "admin.html"));
});
app.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message || "অনুরোধ ব্যর্থ" });
});
app.use(express.static(ROOT));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Jarnaz Gallery running at http://localhost:${PORT}`);
});
