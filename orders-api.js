/**
 * Jarnaz Gallery — local PHP/server OR Google Apps Script cloud orders
 */
(() => {
  const STORAGE_KEY = "jarnaz-orders-api";

  function hydrateConfig() {
    window.SITE_CONFIG = window.SITE_CONFIG || {};
    try {
      const saved = String(localStorage.getItem(STORAGE_KEY) || "").trim();
      if (saved && !String(window.SITE_CONFIG.ordersApi || "").trim()) {
        window.SITE_CONFIG.ordersApi = saved;
      }
    } catch (err) {}
  }
  hydrateConfig();

  function getConfiguredOrdersApi() {
    const cfg = window.SITE_CONFIG || {};
    return String(cfg.ordersApi || "").replace(/\s+/g, "").trim();
  }

  function setConfiguredOrdersApi(url) {
    window.SITE_CONFIG = window.SITE_CONFIG || {};
    window.SITE_CONFIG.ordersApi = String(url || "").trim();
    try {
      if (window.SITE_CONFIG.ordersApi) localStorage.setItem(STORAGE_KEY, window.SITE_CONFIG.ordersApi);
      else localStorage.removeItem(STORAGE_KEY);
    } catch (err) {}
    return window.SITE_CONFIG.ordersApi;
  }

  function getOrdersApiUrl() {
    const cloud = getConfiguredOrdersApi();
    return cloud ? cloud.replace(/\/$/, "") : "";
  }

  function isCloudOrdersApi() {
    return /script\.google\.com|macros/i.test(getConfiguredOrdersApi());
  }

  function hasCloudOrdersApi() {
    return !!getConfiguredOrdersApi();
  }

  function looksLikeLoginHtml(text, finalUrl) {
    if (finalUrl && /accounts\.google\.com/i.test(finalUrl)) return true;
    if (!text || typeof text !== "string") return false;
    const t = text.slice(0, 1200).toLowerCase();
    return (
      t.includes("accounts.google.com") ||
      t.includes("sign in to continue") ||
      t.includes("signin/identifier") ||
      (t.includes("google") && t.includes("flowname=weblitesignin"))
    );
  }

  function cloudAccessError() {
    return new Error(
      "Apps Script লগইন চাইছে। Deploy → Who has access = Anyone (Anyone with Google account নয়) → New version Deploy করুন।"
    );
  }

  function normalizeBdPhone(phone) {
    let digits = String(phone || "").replace(/[^0-9]/g, "");
    if (digits.indexOf("880") === 0 && digits.length >= 13) digits = digits.slice(-11);
    else if (digits.indexOf("88") === 0 && digits.length >= 12) digits = "0" + digits.slice(-10);
    if (digits.length === 10) digits = "0" + digits;
    return digits;
  }

  const ORDER_PIPELINE = [
    { id: "pending", label: "Pending", labelBn: "পেন্ডিং" },
    { id: "confirmed", label: "Confirmed", labelBn: "কনফার্ম" },
    { id: "processing", label: "Processing", labelBn: "প্রসেসিং" },
    { id: "ready_to_ship", label: "Ready to Ship", labelBn: "শিপ রেডি" },
    { id: "shipped", label: "Shipped", labelBn: "শিপড" },
    { id: "out_for_delivery", label: "Out for Delivery", labelBn: "ডেলিভারিতে" },
    { id: "delivered", label: "Delivered", labelBn: "ডেলিভার্ড" },
  ];
  const ORDER_EXCEPTIONS = [
    { id: "cancelled", label: "Cancelled", labelBn: "ক্যান্সেল" },
    { id: "return_requested", label: "Return Requested", labelBn: "রিটার্ন রিকোয়েস্ট" },
    { id: "returned", label: "Returned", labelBn: "রিটার্ন" },
    { id: "refunded", label: "Refunded", labelBn: "রিফান্ড" },
  ];
  const ALL_ORDER_STATUSES = ["new"].concat(
    ORDER_PIPELINE.map((s) => s.id),
    ORDER_EXCEPTIONS.map((s) => s.id)
  );
  const ORDER_PATCH_KEYS = [
    "name", "phone", "address", "note", "productCode", "size", "qty", "combo", "total",
    "status", "source", "called", "confirmedAt", "steadfastTracking", "steadfastConsignmentId",
    "courierName", "consignmentNo", "courierCharge", "shippingNote", "courierStatus", "courierPhone",
    "paymentMethod", "paymentStatus", "cancelReason", "returnStatus", "returnReason",
    "refundStatus", "refundAmount", "refundMethod", "refundNote", "returnDate",
    "timeline", "updatedAt", "updatedBy",
  ];

  function canonicalStatus(status) {
    let s = String(status || "new").trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (s === "readytoship") s = "ready_to_ship";
    if (s === "ofd" || s === "outfordelivery") s = "out_for_delivery";
    if (s === "returnrequested") s = "return_requested";
    if (s === "cancel") s = "cancelled";
    if (!ALL_ORDER_STATUSES.includes(s)) s = "new";
    return s;
  }

  function isExceptionStatus(status) {
    const s = canonicalStatus(status);
    return ORDER_EXCEPTIONS.some((item) => item.id === s);
  }

  function pipelineIndex(status) {
    const s = canonicalStatus(status);
    if (s === "new") return 0;
    const idx = ORDER_PIPELINE.findIndex((item) => item.id === s);
    return idx < 0 ? -1 : idx;
  }

  function parseTimeline(raw) {
    if (Array.isArray(raw)) return raw.filter(Boolean).map(normalizeTimelineEntry);
    const text = String(raw || "").trim();
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      return (Array.isArray(parsed) ? parsed : []).filter(Boolean).map(normalizeTimelineEntry);
    } catch (err) {
      return [];
    }
  }

  function normalizeTimelineEntry(entry) {
    if (!entry || typeof entry !== "object") return { at: "", status: "", action: "", by: "", note: String(entry || "") };
    return {
      at: entry.at || entry.createdAt || "",
      status: canonicalStatus(entry.status || "new"),
      action: String(entry.action || ""),
      by: String(entry.by || ""),
      note: String(entry.note || ""),
    };
  }

  function stringifyTimeline(list) {
    return JSON.stringify(parseTimeline(list));
  }

  function appendTimeline(order, entry) {
    const list = parseTimeline(order && order.timeline);
    list.push(normalizeTimelineEntry(Object.assign({
      at: new Date().toISOString(),
      by: "Admin",
    }, entry || {})));
    return list;
  }

  function seedTimeline(order) {
    const existing = parseTimeline(order && order.timeline);
    if (existing.length) return existing;
    return [{
      at: (order && order.createdAt) || new Date().toISOString(),
      status: canonicalStatus(order && order.status),
      action: "order_received",
      by: (order && order.source) === "admin" ? "Admin" : "Customer",
      note: "Order received",
    }];
  }

  function orderTrackingId(order) {
    if (!order) return "";
    return String(order.consignmentNo || order.steadfastTracking || order.trackingId || "").trim();
  }

  function orderCourierName(order) {
    if (!order) return "";
    return String(order.courierName || "").trim();
  }

  function normalizeOrder(order) {
    if (!order || typeof order !== "object") return order;
    const total = Number(order.total != null && order.total !== "" ? order.total : order.totalPrice) || 0;
    const status = canonicalStatus(order.status);
    const paymentMethod = String(order.paymentMethod || "COD").trim() || "COD";
    let paymentStatus = String(order.paymentStatus || "").trim().toLowerCase();
    if (!paymentStatus) paymentStatus = status === "delivered" || status === "refunded" ? (status === "refunded" ? "refunded" : "paid") : "pending";
    if (paymentStatus === "unpaid") paymentStatus = "pending";
    const timeline = seedTimeline(Object.assign({}, order, { status }));
    return Object.assign({}, order, {
      total,
      totalPrice: total,
      phone: normalizeBdPhone(order.phone) || String(order.phone || ""),
      qty: Math.max(1, Number(order.qty) || 1),
      combo: Number(order.combo) || 2,
      productCode: String(order.productCode || ""),
      size: String(order.size || ""),
      status,
      note: order.note || "",
      source: order.source || "web",
      called: order.called || "",
      paymentMethod,
      paymentStatus,
      courierName: orderCourierName(order),
      courierStatus: String(order.courierStatus || "").trim(),
      courierPhone: String(order.courierPhone || "").trim(),
      consignmentNo: orderTrackingId(order),
      steadfastTracking: String(order.steadfastTracking || order.consignmentNo || "").trim(),
      cancelReason: String(order.cancelReason || "").trim(),
      returnStatus: String(order.returnStatus || "").trim(),
      returnReason: String(order.returnReason || "").trim(),
      refundStatus: String(order.refundStatus || "").trim(),
      refundAmount: order.refundAmount === "" || order.refundAmount == null ? "" : Number(order.refundAmount),
      refundMethod: String(order.refundMethod || "").trim(),
      refundNote: String(order.refundNote || "").trim(),
      returnDate: String(order.returnDate || "").trim(),
      timeline,
      updatedAt: order.updatedAt || "",
      updatedBy: order.updatedBy || "",
    });
  }

  async function fetchWithTimeout(url, options, ms) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), Number(ms) || 8000);
    try {
      return await fetch(url, Object.assign({}, options || {}, { signal: ctrl.signal }));
    } catch (err) {
      if (err && (err.name === "AbortError" || /abort/i.test(String(err.message || "")))) {
        throw new Error("সার্ভার দেরি করছে। নেট চেক করে আবার চাপুন।");
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async function parseJsonFromResponse(res) {
    const text = await res.text();
    if (looksLikeLoginHtml(text, res.url || "")) throw cloudAccessError();
    const trimmed = String(text || "").trim();
    if (!trimmed) throw new Error("সার্ভার খালি উত্তর দিয়েছে। আবার চেষ্টা করুন।");
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      throw new Error("API JSON ফেরত দেয়নি — cloud-orders.gs পেস্ট করে New version Deploy করুন।");
    }
  }

  async function cloudGetList(url) {
    const target = (url || getOrdersApiUrl()).replace(/\/$/, "");
    const res = await fetchWithTimeout(target + (target.includes("?") ? "&" : "?") + "action=list&_=" + Date.now(), {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
      mode: "cors",
    }, 8000);
    return parseJsonFromResponse(res);
  }

  async function cloudPost(body, ms) {
    const url = getOrdersApiUrl();
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      redirect: "follow",
      cache: "no-store",
      mode: "cors",
    }, Number(ms) || 18000);
    return parseJsonFromResponse(res);
  }

  async function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || "");
        const comma = text.indexOf(",");
        resolve(comma >= 0 ? text.slice(comma + 1) : text);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function normalizeReview(item) {
    if (!item || typeof item !== "object") return item;
    return {
      id: String(item.id || ""),
      name: String(item.name || ""),
      text: String(item.text || ""),
      image: String(item.image || ""),
      status: "confirmed",
      createdAt: item.createdAt || "",
    };
  }

  const SNAP_KEY = "jarnaz-cloud-snap-v1";
  const SNAP_MS = 15 * 60 * 1000;
  let storefrontInflight = null;
  let catalogInflight = null;

  function readStorefrontSnap(allowStale) {
    try {
      const raw = JSON.parse(localStorage.getItem(SNAP_KEY) || "null");
      if (!raw || !raw.at) return null;
      if (!allowStale && Date.now() - raw.at > SNAP_MS) return null;
      if (!raw.catalog || !Array.isArray(raw.catalog.products) || !raw.catalog.products.length) return null;
      return raw;
    } catch (err) {
      return null;
    }
  }

  function isStorefrontSnapFresh() {
    const snap = readStorefrontSnap(true);
    return !!(snap && Date.now() - snap.at < SNAP_MS);
  }

  function writeStorefrontSnap(catalog, reviews) {
    try {
      localStorage.setItem(SNAP_KEY, JSON.stringify({
        at: Date.now(),
        catalog: catalog || null,
        reviews: Array.isArray(reviews) ? reviews : [],
      }));
    } catch (err) {}
  }

  function cloudActionUrl(action, extra) {
    const url = getOrdersApiUrl();
    const params = ["action=" + encodeURIComponent(action), "_=" + Date.now()];
    Object.keys(extra || {}).forEach((key) => {
      if (extra[key] == null || extra[key] === "") return;
      params.push(encodeURIComponent(key) + "=" + encodeURIComponent(extra[key]));
    });
    return url + (url.includes("?") ? "&" : "?") + params.join("&");
  }

  async function cloudGetAction(action, extra, ms) {
    const res = await fetchWithTimeout(cloudActionUrl(action, extra), {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
      mode: "cors",
    }, Number(ms) || 7000);
    return parseJsonFromResponse(res);
  }

  async function fetchReviewsList() {
    if (!isCloudOrdersApi()) return [];
    try {
      const json = await cloudGetAction("reviews", null, 7000);
      if (json && json.success && Array.isArray(json.reviews)) return json.reviews.map(normalizeReview);
    } catch (err) {}
    try {
      const json = await cloudPost({ action: "reviewList" }, 8000);
      if (json && json.success && Array.isArray(json.reviews)) return json.reviews.map(normalizeReview);
    } catch (err) {}
    throw new Error("reviews fetch failed");
  }

  async function createReviewRemote(payload) {
    if (!isCloudOrdersApi()) throw new Error("cloud not configured");
    const file = payload && payload.file;
    if (!file) throw new Error("স্ক্রিনশট দিন");
    const imageBase64 = await blobToBase64(file);
    if (!imageBase64) throw new Error("ছবি পড়া যায়নি");
    const json = await cloudPost({
      action: "reviewCreate",
      name: payload.name || "",
      text: payload.text || "",
      imageBase64,
      mimeType: file.type || "image/jpeg",
      fileName: file.name || "review.jpg",
    });
    if (json && json.success && json.review && json.review.image) return normalizeReview(json.review);
    throw new Error((json && json.error) || "ক্লাউডে রিভিউ সেভ হয়নি। cloud-orders.gs নতুন করে Deploy করুন।");
  }

  async function deleteReviewRemote(id) {
    if (!isCloudOrdersApi()) throw new Error("cloud not configured");
    const json = await cloudPost({ action: "reviewDelete", id: id });
    if (json && json.success) return json;
    throw new Error((json && json.error) || "ডিলিট হয়নি");
  }

  function ordersFromCloudJson(json) {
    if (json && json.success && Array.isArray(json.orders)) return json.orders.map(normalizeOrder);
    throw new Error((json && json.error) || "cloud bad payload");
  }

  async function fetchOrdersList() {
    if (!isCloudOrdersApi()) throw new Error("cloud not configured");
    const url = getOrdersApiUrl();
    try {
      return ordersFromCloudJson(await cloudGetList(url));
    } catch (err) {
      return ordersFromCloudJson(await cloudPost({ action: "list" }, 10000));
    }
  }

  async function findOrdersByPhone(phone) {
    const want = normalizeBdPhone(phone);
    if (!/^01[0-9]{9}$/.test(want)) throw new Error("সঠিক মোবাইল দিন, যেমন 017XXXXXXXX");
    const merged = [];
    const seen = new Set();
    function addAll(list) {
      (list || []).forEach((order) => {
        const item = normalizeOrder(order);
        if (!item || !item.id || seen.has(item.id)) return;
        if (normalizeBdPhone(item.phone) !== want) return;
        seen.add(item.id);
        merged.push(item);
      });
    }
    if (isCloudOrdersApi()) {
      const url = getOrdersApiUrl();
      try {
        const res = await fetchWithTimeout(
          url + (url.includes("?") ? "&" : "?") + "action=find&phone=" + encodeURIComponent(want) + "&_=" + Date.now(),
          { method: "GET", cache: "no-store", redirect: "follow", mode: "cors" },
          8000
        );
        const json = await parseJsonFromResponse(res);
        if (json && json.success && Array.isArray(json.orders)) addAll(json.orders);
      } catch (err) {}
      if (!merged.length) {
        try {
          const json = await cloudPost({ action: "find", phone: want }, 10000);
          if (json && json.success && Array.isArray(json.orders)) addAll(json.orders);
        } catch (err) {}
      }
    } else {
      const lookupBodies = [
        { url: "order-lookup.php" },
        { url: "/api/orders/lookup" },
        { url: "api.php?route=" + encodeURIComponent("orders/lookup") },
      ];
      await Promise.all(
        lookupBodies.map(async (item) => {
          try {
            const res = await fetchWithTimeout(item.url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone: want }),
              cache: "no-store",
            }, 1500);
            const json = await res.json();
            addAll(Array.isArray(json) ? json : json && json.orders);
          } catch (err) {}
        })
      );
    }
    if (!isCloudOrdersApi()) {
      try {
        addAll(JSON.parse(localStorage.getItem("jarnaz-local-orders") || "[]"));
      } catch (err) {}
    }
    merged.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    return merged;
  }

  async function createOrderRemote(orderPayload) {
    if (!isCloudOrdersApi()) throw new Error("cloud not configured");
    const json = await cloudPost(Object.assign({ action: "create" }, orderPayload));
    if (json && json.success && json.order) return normalizeOrder(json.order);
    throw new Error((json && json.error) || "cloud create bad payload");
  }

  async function updateOrderRemote(orderId, nextStatusOrPatch) {
    if (!isCloudOrdersApi()) throw new Error("cloud not configured");
    const patch =
      typeof nextStatusOrPatch === "string"
        ? { status: nextStatusOrPatch }
        : nextStatusOrPatch || {};
    if (patch.timeline && Array.isArray(patch.timeline)) patch.timeline = stringifyTimeline(patch.timeline);
    const json = await cloudPost(Object.assign({ action: "update", id: orderId }, patch));
    if (json && json.success) return json.order ? normalizeOrder(json.order) : true;
    throw new Error((json && json.error) || "cloud update bad");
  }

  async function deleteOrderRemote(orderId) {
    if (!isCloudOrdersApi()) throw new Error("cloud not configured");
    const json = await cloudPost({ action: "delete", id: orderId });
    if (json && json.success) return true;
    throw new Error((json && json.error) || "cloud delete bad");
  }

  async function testCloudConnection(overrideUrl) {
    const configured = String(overrideUrl || getConfiguredOrdersApi() || "").trim();
    if (!configured) return { ok: false, message: "আগে ordersApi URL বসান" };
    const prev = getConfiguredOrdersApi();
    setConfiguredOrdersApi(configured);
    try {
      let json = null;
      try {
        json = await cloudGetList(configured.replace(/\/$/, ""));
      } catch (getErr) {
        const res = await fetch(configured.replace(/\/$/, ""), {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "list" }),
          redirect: "follow",
          cache: "no-store",
          mode: "cors",
        });
        const text = await res.text();
        if (looksLikeLoginHtml(text, res.url || "")) {
          return {
            ok: false,
            message:
              "❌ লগইন পেজ আসছে। Deploy-এ Who has access = Anyone দিন (Google account ওয়ালা নয়), তারপর New version → Deploy।",
          };
        }
        try {
          json = JSON.parse(text);
        } catch (e) {
          return { ok: false, message: "❌ " + (getErr && getErr.message ? getErr.message : "JSON আসেনি") };
        }
      }
      if (json && json.success && Array.isArray(json.orders)) {
        return {
          ok: true,
          message: "✅ Sync কাজ করছে — অর্ডার: " + json.orders.length + "টি",
          count: json.orders.length,
        };
      }
      return { ok: false, message: "❌ " + ((json && json.error) || "অজানা রেসপন্স") };
    } catch (err) {
      return { ok: false, message: "❌ " + (err && err.message ? err.message : String(err)) };
    } finally {
      if (overrideUrl && prev !== configured) setConfiguredOrdersApi(prev);
    }
  }

  function slimCourierOrder(order) {
    if (!order || typeof order !== "object") return null;
    return {
      id: order.id,
      name: order.name,
      phone: normalizeBdPhone(order.phone) || order.phone,
      address: order.address,
      note: order.note || "",
      productCode: order.productCode,
      size: order.size,
      qty: order.qty,
      total: order.total,
      status: order.status,
    };
  }

  async function sendOrderToSteadfast(orderId, orderFallback) {
    if (!isCloudOrdersApi()) throw new Error("Order Sync URL লাগবে (Steadfast Apps Script দিয়ে যায়)");
    const json = await cloudPost({
      action: "sendSteadfast",
      id: orderId,
      order: slimCourierOrder(orderFallback),
    }, 45000);
    if (json && json.success) {
      if (json.order) json.order = normalizeOrder(json.order);
      return json;
    }
    throw new Error((json && json.error) || "Steadfast পাঠানো ব্যর্থ");
  }

  async function steadfastConfigured() {
    if (!isCloudOrdersApi()) return false;
    try {
      const json = await cloudPost({ action: "steadfastStatus" });
      return !!(json && json.success && json.configured);
    } catch (e) {
      return false;
    }
  }

  async function setSteadfastCredentials(apiKey, secretKey) {
    if (!isCloudOrdersApi()) throw new Error("আগে Order Sync URL সেট করুন");
    const json = await cloudPost({
      action: "setSteadfastCredentials",
      apiKey: String(apiKey || "").trim(),
      secretKey: String(secretKey || "").trim(),
    });
    if (json && json.success) return json;
    throw new Error((json && json.error) || "Failed to save Steadfast keys");
  }

  async function fetchCatalogRemote() {
    if (!isCloudOrdersApi()) return null;
    if (catalogInflight) return catalogInflight;
    catalogInflight = (async () => {
      try {
        const json = await cloudGetAction("catalog", null, 7000);
        if (json && json.success && json.catalog) return json.catalog;
      } catch (err) {}
      try {
        const json = await cloudPost({ action: "catalogGet" }, 8000);
        if (json && json.success && json.catalog) return json.catalog;
      } catch (err) {}
      return null;
    })();
    try {
      return await catalogInflight;
    } finally {
      catalogInflight = null;
    }
  }

  async function fetchStorefront() {
    if (!isCloudOrdersApi()) return null;
    if (storefrontInflight) return storefrontInflight;
    storefrontInflight = (async () => {
      let catalog = null;
      let reviews = null;
      try {
        const json = await cloudGetAction("catalog", null, 7000);
        if (json && json.success && json.catalog && Array.isArray(json.catalog.products)) {
          catalog = json.catalog;
          if (Array.isArray(json.reviews)) reviews = json.reviews.map(normalizeReview);
        }
      } catch (err) {}
      if (!catalog) {
        try {
          const json = await cloudPost({ action: "catalogGet" }, 8000);
          if (json && json.success && json.catalog && Array.isArray(json.catalog.products)) {
            catalog = json.catalog;
            if (Array.isArray(json.reviews)) reviews = json.reviews.map(normalizeReview);
          }
        } catch (err) {}
      }
      if (!Array.isArray(reviews)) {
        try {
          reviews = await fetchReviewsList();
        } catch (err) {
          reviews = null;
        }
      }
      if (catalog) {
        const keep = Array.isArray(reviews) ? reviews : ((readStorefrontSnap() || {}).reviews || []);
        writeStorefrontSnap(catalog, keep);
      }
      return { catalog, reviews };
    })();
    try {
      return await storefrontInflight;
    } finally {
      storefrontInflight = null;
    }
  }

  function cloudItemPayload(item) {
    if (!item || typeof item !== "object") return item;
    const out = Object.assign({}, item);
    if (/^data:/i.test(String(out.image || ""))) delete out.image;
    return out;
  }

  async function saveProductRemote(payload) {
    if (!isCloudOrdersApi()) throw new Error("cloud not configured");
    const body = {
      action: "productUpsert",
      product: cloudItemPayload(payload.product || {}),
      oldCode: payload.oldCode || (payload.product && payload.product.code) || "",
      seedProducts: (payload.seedProducts || []).map(cloudItemPayload),
      seedOffers: (payload.seedOffers || []).map(cloudItemPayload),
    };
    if (payload.file) {
      body.imageBase64 = await blobToBase64(payload.file);
      body.mimeType = payload.file.type || "image/jpeg";
      body.fileName = payload.file.name || "product.jpg";
    }
    const json = await cloudPost(body);
    if (json && json.success && json.product) return json.product;
    throw new Error((json && json.error) || "প্রোডাক্ট ক্লাউডে সেভ হয়নি। cloud-orders.gs নতুন করে Deploy করুন।");
  }

  async function saveOfferRemote(payload) {
    if (!isCloudOrdersApi()) throw new Error("cloud not configured");
    const body = {
      action: "offerUpsert",
      offer: cloudItemPayload(payload.offer || {}),
      oldCode: payload.oldCode || (payload.offer && payload.offer.code) || "",
      seedProducts: (payload.seedProducts || []).map(cloudItemPayload),
      seedOffers: (payload.seedOffers || []).map(cloudItemPayload),
    };
    if (payload.file) {
      body.imageBase64 = await blobToBase64(payload.file);
      body.mimeType = payload.file.type || "image/jpeg";
      body.fileName = payload.file.name || "offer.jpg";
    }
    const json = await cloudPost(body);
    if (json && json.success && json.offer) return json.offer;
    throw new Error((json && json.error) || "কম্বো ক্লাউডে সেভ হয়নি।");
  }

  async function saveCatalogRemote(payload) {
    if (!isCloudOrdersApi()) throw new Error("cloud not configured");
    const json = await cloudPost({
      action: "catalogSave",
      products: (payload.products || []).map(cloudItemPayload),
      offers: (payload.offers || []).map(cloudItemPayload),
      seedProducts: (payload.seedProducts || payload.products || []).map(cloudItemPayload),
      seedOffers: (payload.seedOffers || payload.offers || []).map(cloudItemPayload),
    });
    if (json && json.success) return json.catalog || json;
    throw new Error((json && json.error) || "ক্যাটালগ সেভ হয়নি");
  }

  async function deleteProductRemote(code) {
    if (!isCloudOrdersApi()) throw new Error("cloud not configured");
    const json = await cloudPost({ action: "productDelete", code: code });
    if (json && json.success) return json;
    throw new Error((json && json.error) || "ডিলিট হয়নি");
  }

  async function deleteOfferRemote(code) {
    if (!isCloudOrdersApi()) throw new Error("cloud not configured");
    const json = await cloudPost({ action: "offerDelete", code: code });
    if (json && json.success) return json;
    throw new Error((json && json.error) || "ডিলিট হয়নি");
  }

  function downloadSiteConfig(cfg) {
    const data = Object.assign({}, window.SITE_CONFIG || {}, cfg || {});
    const text = "window.SITE_CONFIG = " + JSON.stringify(data, null, 2) + ";\n";
    const blob = new Blob([text], { type: "text/javascript" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "site-config.js";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

  window.OrdersAPI = {
    getConfiguredOrdersApi,
    setConfiguredOrdersApi,
    getOrdersApiUrl,
    isCloudOrdersApi,
    hasCloudOrdersApi,
    normalizeOrder,
    normalizeBdPhone,
    canonicalStatus,
    parseTimeline,
    stringifyTimeline,
    appendTimeline,
    seedTimeline,
    pipelineIndex,
    isExceptionStatus,
    orderTrackingId,
    orderCourierName,
    ORDER_PIPELINE,
    ORDER_EXCEPTIONS,
    ALL_ORDER_STATUSES,
    ORDER_PATCH_KEYS,
    fetchOrdersList,
    findOrdersByPhone,
    createOrderRemote,
    updateOrderRemote,
    deleteOrderRemote,
    testCloudConnection,
    sendOrderToSteadfast,
    steadfastConfigured,
    setSteadfastCredentials,
    fetchReviewsList,
    createReviewRemote,
    deleteReviewRemote,
    fetchCatalogRemote,
    fetchStorefront,
    readStorefrontSnap,
    isStorefrontSnapFresh,
    saveProductRemote,
    saveOfferRemote,
    saveCatalogRemote,
    deleteProductRemote,
    deleteOfferRemote,
    downloadSiteConfig,
  };
})();
