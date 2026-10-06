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
    if (digits.length === 10) digits = "0" + digits;
    return digits;
  }

  function normalizeOrder(order) {
    if (!order || typeof order !== "object") return order;
    const total = Number(order.total != null && order.total !== "" ? order.total : order.totalPrice) || 0;
    let status = String(order.status || "new");
    if (status === "pending") status = "new";
    if (status === "processing" || status === "ready_to_ship") status = "confirmed";
    if (status === "shipped") status = "delivered";
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
    });
  }

  async function parseJsonFromResponse(res) {
    const text = await res.text();
    if (looksLikeLoginHtml(text, res.url || "")) throw cloudAccessError();
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error("API JSON ফেরত দেয়নি — Deploy/URL চেক করুন");
    }
  }

  async function cloudGetList(url) {
    const target = (url || getOrdersApiUrl()).replace(/\/$/, "");
    const res = await fetch(target + (target.includes("?") ? "&" : "?") + "action=list&_=" + Date.now(), {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
      mode: "cors",
    });
    return parseJsonFromResponse(res);
  }

  async function cloudPost(body) {
    const url = getOrdersApiUrl();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      redirect: "follow",
      cache: "no-store",
      mode: "cors",
    });
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

  async function fetchReviewsList() {
    if (!isCloudOrdersApi()) return [];
    const url = getOrdersApiUrl();
    try {
      const res = await fetch(url + (url.includes("?") ? "&" : "?") + "action=reviews&_=" + Date.now(), {
        method: "GET",
        cache: "no-store",
        redirect: "follow",
        mode: "cors",
      });
      const json = await parseJsonFromResponse(res);
      if (json && json.success && Array.isArray(json.reviews)) return json.reviews.map(normalizeReview);
    } catch (err) {}
    try {
      const json = await cloudPost({ action: "reviewList" });
      if (json && json.success && Array.isArray(json.reviews)) return json.reviews.map(normalizeReview);
    } catch (err) {}
    return [];
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

  async function fetchOrdersList() {
    if (!isCloudOrdersApi()) throw new Error("cloud not configured");
    const url = getOrdersApiUrl();
    try {
      const json = await cloudGetList(url);
      if (json && json.success && Array.isArray(json.orders)) {
        return json.orders.map(normalizeOrder);
      }
      throw new Error((json && json.error) || "cloud bad payload");
    } catch (getErr) {
      try {
        const json = await cloudPost({ action: "list" });
        if (json && json.success && Array.isArray(json.orders)) {
          return json.orders.map(normalizeOrder);
        }
      } catch (e) {}
      throw getErr;
    }
  }

  async function findOrdersByPhone(phone) {
    const want = normalizeBdPhone(phone);
    if (want.length < 10) throw new Error("সঠিক মোবাইল দিন, যেমন 017XXXXXXXX");
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
      try {
        const json = await cloudPost({ action: "find", phone: want });
        if (json && json.success && Array.isArray(json.orders)) addAll(json.orders);
      } catch (err) {}
    }
    const lookupBodies = [
      { url: "order-lookup.php" },
      { url: "/api/orders/lookup" },
      { url: "api.php?route=" + encodeURIComponent("orders/lookup") },
    ];
    for (const item of lookupBodies) {
      try {
        const res = await fetch(item.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: want }),
          cache: "no-store",
        });
        const json = await res.json();
        addAll(Array.isArray(json) ? json : json && json.orders);
      } catch (err) {}
    }
    try {
      addAll(JSON.parse(localStorage.getItem("jarnaz-local-orders") || "[]"));
    } catch (err) {}
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

  async function sendOrderToSteadfast(orderId, orderFallback) {
    if (!isCloudOrdersApi()) throw new Error("Order Sync URL লাগবে (Steadfast Apps Script দিয়ে যায়)");
    const json = await cloudPost({
      action: "sendSteadfast",
      id: orderId,
      order: orderFallback || null,
    });
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
    const url = getOrdersApiUrl();
    try {
      const res = await fetch(url + (url.includes("?") ? "&" : "?") + "action=catalog&_=" + Date.now(), {
        method: "GET",
        cache: "no-store",
        redirect: "follow",
        mode: "cors",
      });
      const json = await parseJsonFromResponse(res);
      if (json && json.success && json.catalog) return json.catalog;
    } catch (err) {}
    try {
      const json = await cloudPost({ action: "catalogGet" });
      if (json && json.success && json.catalog) return json.catalog;
    } catch (err) {}
    return null;
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
    saveProductRemote,
    saveOfferRemote,
    saveCatalogRemote,
    deleteProductRemote,
    deleteOfferRemote,
    downloadSiteConfig,
  };
})();
