let selected = null;
let pendingCode = null;
let lastOrder = null;
let selectedSize = "";
let selectedOfferPrice = null;
let offers = [];
let offerIndex = 0;
let offerTimer = null;
let userReviews = [];
let reviewIndex = 0;
let reviewTimer = null;

function visualHTML(product) {
  return `<div class="set-visual"><img src="${htmlEsc(product.image)}" alt="${htmlEsc(product.code)} ${htmlEsc(product.name)}" loading="lazy" decoding="async" /></div>`;
}

function cardHTML(product) {
  const desc = product.description
    ? `<p class="product-desc">${htmlEsc(product.description)}</p>`
    : "";
  const older = product.price36 && Number(product.price36) !== Number(product.price)
    ? `<p class="price-alt">৩–৬ বছর ${taka(product.price36)}</p>`
    : `<p class="price-alt">৩–৬ বছর ${taka(product.price36 || product.price)}</p>`;
  return `
    <article class="product-card" data-code="${htmlEsc(product.code)}" id="card-${htmlEsc(product.code)}">
      ${visualHTML(product)}
      <div class="product-body">
        <p class="product-code">${htmlEsc(product.code)}</p>
        <p class="product-name">${htmlEsc(product.name)}</p>
        ${desc}
        <p class="product-price">${taka(product.price)}</p>
        <p class="price-age">০–৩ বছর</p>
        ${older}
        <button class="order-now" type="button" data-order="${htmlEsc(product.code)}">Order Now</button>
      </div>
    </article>
  `;
}

function renderProducts() {
  PRODUCTS = sortProducts(PRODUCTS);
  const grid = document.getElementById("productGrid");
  if (!PRODUCTS.length) {
    grid.innerHTML = '<p class="empty-pick">এখনো প্রোডাক্ট নেই। একটু পরে আবার দেখুন।</p>';
  } else {
    grid.innerHTML = PRODUCTS.map(cardHTML).join("");
  }
  const count = document.getElementById("productCount");
  if (count) count.textContent = PRODUCTS.length ? `মোট ${PRODUCTS.length} টা সেট` : "এখনো প্রোডাক্ট নেই";
}

function renderSizes(product) {
  const young = SIZES.filter((size) => !isOlderSize(size.value));
  const older = SIZES.filter((size) => isOlderSize(size.value));
  const youngPrice = product ? taka(priceForSize(product, "0-3 m")) : "";
  const olderPrice = product ? taka(priceForSize(product, "3-4 year")) : "";
  const group = (title, items) => `
    <div class="size-group">
      <p class="size-group-title">${title}</p>
      <div class="size-pills">
        ${items
          .map(
            (size) => `
              <button class="size-btn" type="button" data-size="${size.value}">
                <strong>${size.label}</strong>
              </button>
            `
          )
          .join("")}
      </div>
    </div>
  `;
  document.getElementById("sizeGrid").innerHTML =
    group(`০–৩ বছর${youngPrice ? " · " + youngPrice : ""}`, young) +
    group(`৩–৬ বছর${olderPrice ? " · " + olderPrice : ""}`, older);
}

function showStep(step) {
  const isSize = step === 1;
  document.getElementById("stepSize").classList.toggle("is-hidden", !isSize);
  document.getElementById("stepDetails").classList.toggle("is-hidden", isSize);
  document.querySelectorAll(".checkout-step").forEach((el) => {
    const n = Number(el.dataset.step);
    el.classList.toggle("is-active", n === step);
    el.classList.toggle("is-done", n < step);
  });
}

function openSizeModal(code, offerPrice) {
  const product = findProduct(code);
  if (!product) return;
  pendingCode = code;
  selectedOfferPrice = offerPrice || null;
  selectedSize = "";
  document.getElementById("sizeModalMeta").textContent = product.description
    ? `${product.code} · ${product.name} · ${product.description}`
    : `${product.code} · ${product.name}`;
  document.getElementById("checkoutPreview").innerHTML =
    `${visualHTML(product)}<p class="selected-code">${product.code}</p>`;
  document.getElementById("productCode").value = product.code;
  document.getElementById("comboSelect").value = String(product.piece);
  renderSizes(product);
  document.querySelectorAll(".size-btn").forEach((btn) => btn.classList.remove("is-active"));
  showStep(1);
  document.body.classList.add("modal-open");
  document.getElementById("sizeModal").classList.add("is-open");
  document.getElementById("sizeModal").setAttribute("aria-hidden", "false");
}

function closeSizeModal() {
  document.body.classList.remove("modal-open");
  document.getElementById("sizeModal").classList.remove("is-open");
  document.getElementById("sizeModal").setAttribute("aria-hidden", "true");
}

function applySize(sizeValue) {
  const size = SIZES.find((item) => item.value === sizeValue);
  if (!size || !pendingCode) return;

  selectedSize = size.value;
  document.getElementById("sizeInput").value = size.value;
  document.querySelectorAll(".size-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.size === size.value);
  });
  setTimeout(goToDetails, 120);
}

function goToDetails() {
  if (!selectedSize || !pendingCode) return;
  if (!document.getElementById("sizeModal").classList.contains("is-open")) return;
  const size = SIZES.find((item) => item.value === selectedSize);
  selectProduct(pendingCode);
  const unit = unitPrice(selected || findProduct(pendingCode), selectedSize);
  document.getElementById("sizePicked").innerHTML =
    `সাইজ: <strong>${size.label}</strong> · ${taka(unit)}`;
  fillRememberedCustomer();
  showStep(2);
  updateTotal();
}

function unitPrice(product, sizeValue) {
  if (isOlderSize(sizeValue)) return priceForSize(product, sizeValue);
  return Number(selectedOfferPrice || priceForSize(product, sizeValue));
}

function updateTotal() {
  const qtyInput = document.querySelector('#orderForm [name="qty"]');
  const qty = Number((qtyInput && qtyInput.value) || 1);
  const product = selected || findProduct(pendingCode);
  const unit = unitPrice(product, selectedSize || document.getElementById("sizeInput").value);
  document.getElementById("totalPrice").textContent = taka(unit * qty);
}

function selectProduct(code) {
  const product = findProduct(code);
  if (!product) return;
  selected = product;

  document.querySelectorAll(".product-card").forEach((card) => {
    card.classList.toggle("is-active", card.dataset.code === code);
  });

  document.getElementById("checkoutPreview").innerHTML =
    `${visualHTML(product)}<p class="selected-code">${product.code}</p>`;
  document.getElementById("productCode").value = product.code;
  document.getElementById("comboSelect").value = String(product.piece);
  updateTotal();
}

const CUST_KEY = "jarnaz-customer";

function rememberCustomer(data) {
  try {
    localStorage.setItem(CUST_KEY, JSON.stringify({
      name: data.name || "",
      phone: data.phone || "",
      address: data.address || "",
    }));
  } catch (err) {}
}

function fillRememberedCustomer() {
  const form = document.getElementById("orderForm");
  if (!form) return;
  try {
    const saved = JSON.parse(localStorage.getItem(CUST_KEY) || "null");
    if (!saved) return;
    if (!form.name.value && saved.name) form.name.value = saved.name;
    if (!form.phone.value && saved.phone) form.phone.value = saved.phone;
    if (!form.address.value && saved.address) form.address.value = saved.address;
  } catch (err) {}
}

function orderId() {
  return `JZ-${Date.now().toString().slice(-8)}`;
}

function cacheSavedOrder(saved) {
  try {
    const local = readLocal(LOCAL_KEYS.orders, []);
    if (!local.some((item) => item.id === saved.id)) {
      local.unshift(saved);
      writeLocal(LOCAL_KEYS.orders, local);
    }
  } catch (err) {}
}

async function saveOrder(order) {
  const payload = window.OrdersAPI && OrdersAPI.normalizeOrder ? OrdersAPI.normalizeOrder(order) : order;
  if (window.OrdersAPI && OrdersAPI.hasCloudOrdersApi()) {
    try {
      const saved = await OrdersAPI.createOrderRemote(payload);
      saved.savedOnServer = true;
      cacheSavedOrder(saved);
      return saved;
    } catch (cloudErr) {}
  }
  try {
    const result = await apiCall("orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!result.ok) throw new Error((result.data && result.data.error) || "অর্ডার সেভ হয়নি");
    const saved = Object.assign({}, payload, result.data || {});
    saved.savedOnServer = API_MODE === "php" || API_MODE === "server";
    if (!saved.savedOnServer) {
      throw new Error("অর্ডার সার্ভারে যায়নি। একটু পরে আবার চেষ্টা করুন, অথবা WhatsApp-এ পাঠান।");
    }
    cacheSavedOrder(saved);
    return saved;
  } catch (err) {
    if (err.code === "NO_API") {
      throw new Error("অর্ডার সার্ভারে যায়নি। একটু পরে আবার চেষ্টা করুন, অথবা WhatsApp-এ পাঠান।");
    }
    throw err;
  }
}

function validBdPhone(phone) {
  return /^01[0-9]{9}$/.test(String(phone || "").replace(/\s/g, ""));
}

function setOrderError(message) {
  const el = document.getElementById("orderFormError");
  if (el) el.textContent = message || "";
}

function waLink(order) {
  const text = [
    "নতুন অর্ডার — Jarnaz Gallery",
    `অর্ডার আইডি: ${order.id}`,
    `প্রোডাক্ট নম্বর: ${order.productCode}`,
    `সাইজ: ${order.size}`,
    `পরিমাণ: ${order.qty}`,
    `মোট: ${taka(order.total)}`,
    `নাম: ${order.name}`,
    `মোবাইল: ${order.phone}`,
    `ঠিকানা: ${order.address}`,
    order.note ? `নোট: ${order.note}` : "",
  ].filter(Boolean).join("\n");
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
}

function showConfirm(order) {
  lastOrder = order;
  const product = findProduct(order.productCode);
  const size = (SIZES.find((item) => item.value === order.size) || {}).label || order.size;
  const onServer = order.savedOnServer !== false && (
    API_MODE === "php" ||
    API_MODE === "server" ||
    order.savedOnServer ||
    (window.OrdersAPI && OrdersAPI.hasCloudOrdersApi())
  );
  document.getElementById("confirmTitle").textContent = "অর্ডার সফল হয়েছে";
  document.getElementById("receipt").innerHTML = `
    <div class="success-badge" aria-hidden="true">✓</div>
    <p class="success-lead">আপনার অর্ডার আমরা পেয়েছি</p>
    <p class="receipt-id">অর্ডার আইডি <strong>${htmlEsc(order.id)}</strong></p>
    ${product ? visualHTML(product) : ""}
    <p class="receipt-code">${htmlEsc(order.productCode)}</p>
    ${product ? `<p class="receipt-name">${htmlEsc(product.name)}</p>` : ""}
    <div class="receipt-grid">
      <p>সাইজ <strong>${htmlEsc(size)}</strong></p>
      <p>পরিমাণ <strong>${htmlEsc(order.qty)} সেট</strong></p>
      <p>মোট <strong>${taka(order.total)}</strong></p>
      <p>পেমেন্ট <strong>ক্যাশ অন ডেলিভারি</strong></p>
    </div>
    <p class="receipt-customer"><strong>${htmlEsc(order.name)}</strong> · ${htmlEsc(order.phone)}</p>
    <p class="receipt-addr">${htmlEsc(order.address)}</p>
    ${order.note ? `<p class="receipt-addr">নোট: ${htmlEsc(order.note)}</p>` : ""}
    <p class="receipt-status ${onServer ? "is-ok" : "is-warn"}">${
      onServer
        ? "অ্যাডমিন এই অর্ডার দেখতে পাবেন। শীঘ্রই ফোন করে কনফার্ম করা হবে।"
        : "অর্ডার সেভ হয়েছে। WhatsApp-এ পাঠালে অ্যাডমিন নিশ্চিত পাবেন।"
    }</p>
  `;
  const help = document.getElementById("confirmHelp");
  if (help) {
    help.textContent = "ধন্যবাদ। ক্যাশ অন ডেলিভারি · ঢাকায় সাধারণত ১–২ দিন।";
  }
  document.body.classList.add("modal-open");
  document.getElementById("confirmModal").classList.add("is-open");
  document.getElementById("confirmModal").setAttribute("aria-hidden", "false");
}

document.addEventListener("click", (event) => {
  const orderBtn = event.target.closest("[data-order]");
  if (orderBtn) {
    openSizeModal(orderBtn.dataset.order);
    return;
  }

  const sizeBtn = event.target.closest("[data-size]");
  if (sizeBtn) {
    applySize(sizeBtn.dataset.size);
    return;
  }

  const checkout = document.getElementById("sizeModal");
  if (!checkout.classList.contains("is-open")) return;
  if (event.target.closest("input, textarea, select, button, label, .size-picked, .checkout-toolbar")) return;

  const onDetails = !document.getElementById("stepDetails").classList.contains("is-hidden");
  if (onDetails) {
    showStep(1);
    return;
  }
  closeSizeModal();
});

const qtyInput = document.querySelector('#orderForm [name="qty"]');
if (qtyInput) qtyInput.addEventListener("input", updateTotal);
function bumpQty(delta) {
  const input = document.querySelector('#orderForm [name="qty"]');
  if (!input) return;
  input.value = String(Math.min(10, Math.max(1, Number(input.value || 1) + delta)));
  updateTotal();
}
const qtyMinus = document.getElementById("qtyMinus");
const qtyPlus = document.getElementById("qtyPlus");
if (qtyMinus) qtyMinus.addEventListener("click", () => bumpQty(-1));
if (qtyPlus) qtyPlus.addEventListener("click", () => bumpQty(1));

document.getElementById("orderForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const submit = document.getElementById("orderSubmit");
  setOrderError("");

  if (!form.get("productCode") || !selected) {
    setOrderError("আগে একটি সেটে Order Now চাপুন।");
    return;
  }

  if (!form.get("size")) {
    setOrderError("আগে সাইজ সিলেক্ট করুন।");
    if (selected) openSizeModal(selected.code);
    return;
  }

  const name = form.get("name").trim();
  const phone = form.get("phone").trim();
  const address = form.get("address").trim();
  const note = String(form.get("note") || "").trim();
  if (!name || !address) {
    setOrderError("নাম ও সম্পূর্ণ ঠিকানা দিন।");
    return;
  }
  if (!validBdPhone(phone)) {
    setOrderError("সঠিক মোবাইল দিন, যেমন 017XXXXXXXX");
    return;
  }
  rememberCustomer({ name, phone, address });

  const combo = Number(form.get("combo"));
  const qty = Number(form.get("qty"));
  const unit = unitPrice(selected, form.get("size"));
  const order = {
    id: orderId(),
    productCode: form.get("productCode"),
    name,
    phone,
    address,
    note,
    size: form.get("size"),
    combo,
    qty,
    total: unit * qty,
    status: "new",
    source: "web",
    createdAt: new Date().toISOString(),
  };

  if (submit) {
    submit.disabled = true;
    submit.textContent = "অর্ডার যাচ্ছে...";
  }
  saveOrder(order)
    .then((saved) => {
      closeSizeModal();
      showConfirm(saved);
      event.target.reset();
      document.getElementById("productCode").value = saved.productCode;
      document.getElementById("sizeInput").value = saved.size;
      document.getElementById("comboSelect").value = String(saved.combo);
      showStep(1);
      updateTotal();
    })
    .catch((err) => setOrderError(err.message))
    .finally(() => {
      if (submit) {
        submit.disabled = false;
        submit.textContent = "অর্ডার কনফার্ম করুন";
      }
    });
});

document.getElementById("checkoutClose").addEventListener("click", closeSizeModal);
document.getElementById("checkoutBack").addEventListener("click", () => {
  const onDetails = !document.getElementById("stepDetails").classList.contains("is-hidden");
  if (onDetails) showStep(1);
  else closeSizeModal();
});

const navToggle = document.getElementById("navToggle");
const siteNav = document.getElementById("siteNav");
if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const open = siteNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  siteNav.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      siteNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (document.getElementById("sizeModal").classList.contains("is-open")) closeSizeModal();
  if (document.getElementById("confirmModal").classList.contains("is-open")) {
    document.body.classList.remove("modal-open");
    document.getElementById("confirmModal").classList.remove("is-open");
  }
  if (siteNav) {
    siteNav.classList.remove("is-open");
    if (navToggle) navToggle.setAttribute("aria-expanded", "false");
  }
});

document.getElementById("closeModal").addEventListener("click", () => {
  document.body.classList.remove("modal-open");
  document.getElementById("confirmModal").classList.remove("is-open");
});

document.getElementById("waBtn").addEventListener("click", () => {
  if (!lastOrder) return;
  window.open(waLink(lastOrder), "_blank");
});

document.getElementById("copyOrderId").addEventListener("click", async () => {
  if (!lastOrder) return;
  const btn = document.getElementById("copyOrderId");
  try {
    await navigator.clipboard.writeText(lastOrder.id);
    btn.textContent = "কপি হয়েছে";
  } catch (err) {
    btn.textContent = lastOrder.id;
  }
  setTimeout(() => { btn.textContent = "অর্ডার আইডি কপি"; }, 1600);
});

document.getElementById("goTrackBtn").addEventListener("click", () => {
  document.body.classList.remove("modal-open");
  document.getElementById("confirmModal").classList.remove("is-open");
  if (lastOrder && lastOrder.phone) {
    const input = document.getElementById("trackPhone");
    if (input) input.value = lastOrder.phone;
  }
  const section = document.getElementById("track");
  if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
  if (lastOrder && lastOrder.phone) lookupCustomerOrders();
});

function trackStatusLabel(status) {
  return { new: "নতুন", confirmed: "কনফার্ম", delivered: "ডেলিভারি হয়েছে", cancelled: "ক্যান্সেল" }[status] || "নতুন";
}

function trackCard(order) {
  const status = order.status || "new";
  const size = (SIZES.find((item) => item.value === order.size) || {}).label || order.size;
  return `
    <article class="track-card">
      <div class="track-card-top">
        <span class="status-pill is-${htmlEsc(status)}">${trackStatusLabel(status)}</span>
        <strong>${taka(order.total)}</strong>
      </div>
      <h3>${htmlEsc(order.productCode)} · ${htmlEsc(size)}</h3>
      <p>${htmlEsc(order.qty)} সেট · ${htmlEsc(order.name)}</p>
      <p class="track-id">${htmlEsc(order.id)}</p>
    </article>
  `;
}

async function lookupCustomerOrders() {
  const phone = document.getElementById("trackPhone").value.trim();
  const err = document.getElementById("trackError");
  const out = document.getElementById("trackResults");
  const submit = document.getElementById("trackSubmit");
  err.textContent = "";
  if (!validBdPhone(phone)) {
    err.textContent = "সঠিক মোবাইল দিন, যেমন 017XXXXXXXX";
    return;
  }
  if (submit) {
    submit.disabled = true;
    submit.textContent = "খোঁজা হচ্ছে...";
  }
  out.innerHTML = '<p class="empty-pick">অর্ডার খোঁজা হচ্ছে...</p>';
  try {
    const list = window.OrdersAPI && OrdersAPI.findOrdersByPhone
      ? await OrdersAPI.findOrdersByPhone(phone)
      : [];
    if (!list.length) {
      out.innerHTML = '<p class="empty-pick">এই নম্বরে কোনো অর্ডার পাওয়া যায়নি।</p>';
      return;
    }
    out.innerHTML = list.map(trackCard).join("");
  } catch (error) {
    err.textContent = error.message || "ট্র্যাক করা যায়নি";
    out.innerHTML = "";
  } finally {
    if (submit) {
      submit.disabled = false;
      submit.textContent = "স্ট্যাটাস দেখুন";
    }
  }
}

document.getElementById("trackForm").addEventListener("submit", (event) => {
  event.preventDefault();
  lookupCustomerOrders();
});

document.getElementById("confirmModal").addEventListener("click", (event) => {
  if (event.target.id === "confirmModal") {
    document.body.classList.remove("modal-open");
    event.target.classList.remove("is-open");
  }
});

function currentOffer() {
  return offers[offerIndex];
}

function renderOfferSlider() {
  offers = (OFFERS || offers || []).filter((offer) => offer && offer.image);
  if (!offers.length) {
    document.body.classList.add("offers-off");
    return;
  }
  if (SITE.offersEnabled !== false) document.body.classList.remove("offers-off");
  const track = document.getElementById("offerTrack");
  const dots = document.getElementById("offerDots");
  track.innerHTML = offers
    .map(
      (offer) => `
        <div class="offer-slide">
          <img src="${htmlEsc(offer.image)}" alt="${htmlEsc(offer.title || offer.code)}" />
        </div>
      `
    )
    .join("");
  dots.innerHTML = offers
    .map((_, i) => `<button type="button" class="dot" data-dot="${i}" aria-label="অফার ${i + 1}"></button>`)
    .join("");
  showOffer(0);
}

function showOffer(index) {
  if (!offers.length) return;
  offerIndex = (index + offers.length) % offers.length;
  const track = document.getElementById("offerTrack");
  track.style.transform = `translateX(-${offerIndex * 100}%)`;
  document.querySelectorAll(".offer-dots .dot").forEach((dot, i) => {
    dot.classList.toggle("is-active", i === offerIndex);
  });
  const offer = currentOffer();
  if (!offer) return;
  document.getElementById("offerTitle").textContent = `${offer.title || "কম্বো অফার"} · ${offer.code}`;
  document.getElementById("offerPrice").textContent = `মাত্র ${taka(offer.price)} · ০–৩ বছর`;
}

function startOfferTimer() {
  clearInterval(offerTimer);
  if (SITE.offersEnabled === false) return;
  offerTimer = setInterval(() => showOffer(offerIndex + 1), 4000);
}

function bindOfferSlider() {
  if (SITE.offersEnabled === false) {
    clearInterval(offerTimer);
    return;
  }
  renderOfferSlider();
  startOfferTimer();

  document.getElementById("offerPrev").addEventListener("click", () => {
    showOffer(offerIndex - 1);
    startOfferTimer();
  });
  document.getElementById("offerNext").addEventListener("click", () => {
    showOffer(offerIndex + 1);
    startOfferTimer();
  });
  document.getElementById("offerDots").addEventListener("click", (event) => {
    const dot = event.target.closest("[data-dot]");
    if (!dot) return;
    showOffer(Number(dot.dataset.dot));
    startOfferTimer();
  });
  document.getElementById("offerOrderNow").addEventListener("click", () => {
    const offer = currentOffer();
    if (!offer) return;
    document.getElementById("comboSelect").value = String(offer.piece || 2);
    openSizeModal(offer.code, offer.price);
  });

  const slider = document.getElementById("offerSlider");
  let startX = 0;
  slider.addEventListener("touchstart", (event) => {
    startX = event.changedTouches[0].clientX;
    clearInterval(offerTimer);
  }, { passive: true });
  slider.addEventListener("touchend", (event) => {
    const diff = event.changedTouches[0].clientX - startX;
    if (Math.abs(diff) > 40) {
      showOffer(offerIndex + (diff < 0 ? 1 : -1));
    }
    startOfferTimer();
  }, { passive: true });
}

function reviewList() {
  return (userReviews || []).filter((item) => item && item.image);
}

function renderReviewSlider() {
  const items = reviewList();
  const track = document.getElementById("reviewTrack");
  const dots = document.getElementById("reviewDots");
  const slider = document.getElementById("reviewSlider");
  const empty = document.getElementById("reviewEmpty");
  if (!track || !dots) return;
  if (!items.length) {
    if (slider) slider.classList.add("is-hidden");
    if (empty) empty.classList.remove("is-hidden");
    track.innerHTML = "";
    dots.innerHTML = "";
    return;
  }
  if (slider) slider.classList.remove("is-hidden");
  if (empty) empty.classList.add("is-hidden");
  track.innerHTML = items
    .map(
      (item) => `
        <article class="review-slide is-shot">
          <img src="${htmlEsc(item.image)}" alt="${htmlEsc(item.name || "কাস্টমার রিভিউ")}" />
          ${item.name ? `<span>${htmlEsc(item.name)}</span>` : ""}
        </article>`
    )
    .join("");
  dots.innerHTML = items
    .map((_, i) => `<button type="button" class="dot" data-review-dot="${i}" aria-label="রিভিউ ${i + 1}"></button>`)
    .join("");
  showReview(0);
}

function showReview(index) {
  const items = reviewList();
  if (!items.length) return;
  reviewIndex = (index + items.length) % items.length;
  document.getElementById("reviewTrack").style.transform = `translateX(-${reviewIndex * 100}%)`;
  document.querySelectorAll("#reviewDots .dot").forEach((dot, i) => {
    dot.classList.toggle("is-active", i === reviewIndex);
  });
}

function startReviewTimer() {
  clearInterval(reviewTimer);
  const items = reviewList();
  if (items.length < 2) return;
  reviewTimer = setInterval(() => showReview(reviewIndex + 1), 4000);
}

function bindReviewSlider() {
  renderReviewSlider();
  startReviewTimer();
  document.getElementById("reviewPrev").addEventListener("click", () => {
    showReview(reviewIndex - 1);
    startReviewTimer();
  });
  document.getElementById("reviewNext").addEventListener("click", () => {
    showReview(reviewIndex + 1);
    startReviewTimer();
  });
  document.getElementById("reviewDots").addEventListener("click", (event) => {
    const dot = event.target.closest("[data-review-dot]");
    if (!dot) return;
    showReview(Number(dot.dataset.reviewDot));
    startReviewTimer();
  });
  const slider = document.getElementById("reviewSlider");
  let startX = 0;
  slider.addEventListener("touchstart", (event) => {
    startX = event.changedTouches[0].clientX;
    clearInterval(reviewTimer);
  }, { passive: true });
  slider.addEventListener("touchend", (event) => {
    const diff = event.changedTouches[0].clientX - startX;
    if (Math.abs(diff) > 40) showReview(reviewIndex + (diff < 0 ? 1 : -1));
    startReviewTimer();
  }, { passive: true });
}

renderSizes();

loadCatalog().then((data) => {
  offers = data.offers || OFFERS || [];
  userReviews = data.reviews || [];
  renderProducts();
  bindOfferSlider();
  bindReviewSlider();
  updateTotal();
});
