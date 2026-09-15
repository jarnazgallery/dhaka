let selected = null;
let pendingCode = null;
let lastOrder = null;
let selectedSize = "";
let selectedOfferPrice = null;
let offers = [];
let offerIndex = 0;
let offerTimer = null;

function visualHTML(product) {
  return `<div class="set-visual"><img src="${product.image}" alt="${product.code} ${product.name}" /></div>`;
}

function cardHTML(product) {
  return `
    <article class="product-card" data-code="${product.code}" id="card-${product.code}">
      ${visualHTML(product)}
      <div class="product-body">
        <p class="product-code">${product.code}</p>
        <p class="product-name">${product.name}</p>
        <p class="product-price">${taka(product.price)}</p>
        <button class="order-now" type="button" data-order="${product.code}">Order Now</button>
      </div>
    </article>
  `;
}

function renderProducts() {
  document.getElementById("productGrid").innerHTML = PRODUCTS.map(cardHTML).join("");
}

function renderSizes() {
  const months = SIZES.filter((size) => size.value.includes("m"));
  const years = SIZES.filter((size) => size.value.includes("year"));
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
    group("মাস অনুযায়ী", months) + group("বছর অনুযায়ী", years);
}

function showStep(step) {
  const isSize = step === 1;
  document.getElementById("stepSize").classList.toggle("is-hidden", !isSize);
  document.getElementById("stepDetails").classList.toggle("is-hidden", isSize);
}

function openSizeModal(code, offerPrice) {
  pendingCode = code;
  selectedOfferPrice = offerPrice || null;
  selectedSize = "";
  const product = findProduct(code);
  document.getElementById("sizeModalMeta").textContent = `${product.code} · ${product.name}`;
  document.getElementById("checkoutPreview").innerHTML =
    `${visualHTML(product)}<p class="selected-code">${product.code}</p>`;
  document.getElementById("productCode").value = product.code;
  document.getElementById("comboSelect").value = String(product.piece);
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
  document.getElementById("sizePicked").innerHTML =
    `সাইজ: <strong>${size.label}</strong>`;
  showStep(2);
  updateTotal();
}

function updateTotal() {
  const qty = Number(document.querySelector('[name="qty"]').value || 1);
  const product = selected || findProduct(pendingCode);
  const unit = selectedOfferPrice || product?.price || 2040;
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
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "অর্ডার সেভ হয়নি");
  }
  return res.json();
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
    <p>${order.name} · ${order.phone}</p>
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
  if (event.target.closest("input, textarea, select, button, label, .size-picked")) return;

  const onDetails = !document.getElementById("stepDetails").classList.contains("is-hidden");
  if (onDetails) {
    showStep(1);
    return;
  }
  closeSizeModal();
});

document.querySelector('[name="qty"]').addEventListener("input", updateTotal);

document.getElementById("orderForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.target);

  if (!form.get("productCode") || !selected) {
    alert("আগে একটি সেটে Order Now চাপুন।");
    return;
  }

  if (!form.get("size")) {
    alert("আগে সাইজ সিলেক্ট করুন।");
    if (selected) openSizeModal(selected.code);
    return;
  }

  const combo = Number(form.get("combo"));
  const qty = Number(form.get("qty"));
  const unit = selectedOfferPrice || selected.price || 2040;
  const order = {
    id: orderId(),
    productCode: form.get("productCode"),
    name: form.get("name").trim(),
    phone: form.get("phone").trim(),
    address: form.get("address").trim(),
    size: form.get("size"),
    combo,
    qty,
    total: unit * qty,
    createdAt: new Date().toISOString(),
  };

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
    .catch((err) => alert(err.message));
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
          <img src="${product.image}" alt="${offer.title} ${offer.code}" />
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
  document.getElementById("offerPrice").textContent = `মাত্র ${taka(offer.price)}`;
}

function startOfferTimer() {
  clearInterval(offerTimer);
  offerTimer = setInterval(() => showOffer(offerIndex + 1), 4000);
}

function bindOfferSlider() {
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

renderSizes();

loadCatalog().then((data) => {
  offers = data.offers || [];
  renderProducts();
  bindOfferSlider();
  updateTotal();
});
