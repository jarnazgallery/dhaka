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

function orderId() {
  return `JZ-${Date.now().toString().slice(-8)}`;
}

async function saveOrder(order) {
  try {
    const result = await apiCall("orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
    if (!result.ok) throw new Error((result.data && result.data.error) || "অর্ডার সেভ হয়নি");
    return result.data;
  } catch (err) {
    if (err.code !== "NO_API") throw err;
    const orders = readLocal(LOCAL_KEYS.orders, []);
    orders.unshift(order);
    writeLocal(LOCAL_KEYS.orders, orders);
    return order;
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
  ].join("\n");
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
}

function showConfirm(order) {
  lastOrder = order;
  const product = findProduct(order.productCode);
  document.getElementById("receipt").innerHTML = `
    ${visualHTML(product)}
    <p class="receipt-code">${order.productCode}</p>
    <p>সাইজ: <strong>${order.size}</strong> · ${order.qty} সেট</p>
    <p>মোট: <strong>${taka(order.total)}</strong></p>
    <p>অর্ডার আইডি: ${order.id}</p>
    <p>${htmlEsc(order.name)} · ${htmlEsc(order.phone)}</p>
    <p>${htmlEsc(order.address)}</p>
  `;
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
  if (!name || !address) {
    setOrderError("নাম ও সম্পূর্ণ ঠিকানা দিন।");
    return;
  }
  if (!validBdPhone(phone)) {
    setOrderError("সঠিক মোবাইল দিন, যেমন 017XXXXXXXX");
    return;
  }

  const combo = Number(form.get("combo"));
  const qty = Number(form.get("qty"));
  const unit = unitPrice(selected, form.get("size"));
  const order = {
    id: orderId(),
    productCode: form.get("productCode"),
    name,
    phone,
    address,
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
  document.getElementById("confirmModal").classList.remove("is-open");
  if (siteNav) {
    siteNav.classList.remove("is-open");
    if (navToggle) navToggle.setAttribute("aria-expanded", "false");
  }
});

document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("confirmModal").classList.remove("is-open");
});

document.getElementById("waBtn").addEventListener("click", () => {
  if (!lastOrder) return;
  window.open(waLink(lastOrder), "_blank");
});

document.getElementById("confirmModal").addEventListener("click", (event) => {
  if (event.target.id === "confirmModal") {
    event.target.classList.remove("is-open");
  }
});

function currentOffer() {
  return offers[offerIndex];
}

function renderOfferSlider() {
  const valid = offers.filter((offer) => findProduct(offer.code));
  offers = valid.length ? valid : PRODUCTS.slice(0, 4).map((p, i) => ({
    code: p.code,
    title: `কম্বো অফার ${i + 1}`,
    price: p.price,
    piece: p.piece,
  }));
  if (!offers.length) return;
  const track = document.getElementById("offerTrack");
  const dots = document.getElementById("offerDots");
  track.innerHTML = offers
    .map((offer) => {
      const product = findProduct(offer.code);
      return `
        <div class="offer-slide">
          <img src="${htmlEsc(product.image)}" alt="${htmlEsc(offer.title)} ${htmlEsc(offer.code)}" />
        </div>
      `;
    })
    .join("");
  dots.innerHTML = offers
    .map((_, i) => `<button type="button" class="dot" data-dot="${i}" aria-label="অফার ${i + 1}"></button>`)
    .join("");
  showOffer(0);
}

function showOffer(index) {
  offerIndex = (index + offers.length) % offers.length;
  const track = document.getElementById("offerTrack");
  track.style.transform = `translateX(-${offerIndex * 100}%)`;
  document.querySelectorAll(".offer-dots .dot").forEach((dot, i) => {
    dot.classList.toggle("is-active", i === offerIndex);
  });
  const offer = currentOffer();
  document.getElementById("offerTitle").textContent = `${offer.title} · ${offer.code}`;
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
    document.getElementById("comboSelect").value = String(offer.piece);
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
  if (userReviews.length) return userReviews;
  return (SITE.reviews || []).map((item, i) => ({
    id: "site-" + i,
    name: item.name,
    text: item.text,
    image: "",
  }));
}

function renderReviewSlider() {
  const items = reviewList();
  const track = document.getElementById("reviewTrack");
  const dots = document.getElementById("reviewDots");
  if (!track || !dots || !items.length) return;
  track.innerHTML = items
    .map(
      (item) => `
        <article class="review-slide">
          ${item.image ? `<img src="${htmlEsc(item.image)}" alt="${htmlEsc(item.name)}" />` : ""}
          <p>“${htmlEsc(item.text)}”</p>
          <span>${htmlEsc(item.name)}</span>
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

async function saveReview(formData) {
  try {
    const result = await apiCall("reviews", { method: "POST", body: formData });
    if (!result.ok) throw new Error((result.data && result.data.error) || "রিভিউ সেভ হয়নি");
    return result.data;
  } catch (err) {
    if (err.code !== "NO_API") throw err;
    return handleLocalAdmin("reviews", { method: "POST", body: formData });
  }
}

document.getElementById("reviewForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const note = document.getElementById("reviewNote");
  note.textContent = "";
  try {
    const saved = await saveReview(new FormData(event.target));
    userReviews.unshift(saved);
    event.target.reset();
    renderReviewSlider();
    startReviewTimer();
    note.textContent = "রিভিউ যোগ হয়েছে। নিচে স্লাইডে দেখুন।";
  } catch (err) {
    note.textContent = err.message;
  }
});

renderSizes();

loadCatalog().then((data) => {
  offers = data.offers || [];
  userReviews = data.reviews || [];
  renderProducts();
  bindOfferSlider();
  bindReviewSlider();
  updateTotal();
});
