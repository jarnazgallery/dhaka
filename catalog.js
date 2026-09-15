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
  { code: "SET-01", piece: 2, name: "Floral Top + Daisy Shorts", price: 2040, image: "images/set-01.png" },
  { code: "SET-02", piece: 2, name: "Navy Polka + Pearl Shorts", price: 2040, image: "images/set-02.png" },
  { code: "SET-03", piece: 2, name: "Blue Floral + Pearl Shorts", price: 2040, image: "images/set-03.png" },
  { code: "SET-04", piece: 2, name: "Strawberry Top + Daisy Shorts", price: 2040, image: "images/set-04.png" },
  { code: "SET-05", piece: 2, name: "Navy Floral + Pearl Shorts", price: 2040, image: "images/set-05.png" },
  { code: "SET-06", piece: 2, name: "Pink Bow Top + Pearl Shorts", price: 2040, image: "images/set-06.png" },
  { code: "SET-07", piece: 2, name: "Pink Check + Daisy Shorts", price: 2040, image: "images/set-07.png" },
  { code: "SET-08", piece: 2, name: "Red Check + Daisy Shorts", price: 2040, image: "images/set-08.png" },
  { code: "SET-09", piece: 2, name: "Lilac Check + Pearl Shorts", price: 2040, image: "images/set-09.png" },
  { code: "SET-10", piece: 2, name: "Heart Top + Daisy Shorts", price: 2040, image: "images/set-10.png" },
  { code: "SET-11", piece: 2, name: "Black Check + Daisy Shorts", price: 2040, image: "images/set-11.png" },
  { code: "SET-12", piece: 2, name: "White Bow Top + Pearl Shorts", price: 2040, image: "images/set-12.png" },
];

const FALLBACK_OFFERS = [
  { code: "SET-01", title: "কম্বো অফার ১", price: 2040, piece: 2 },
  { code: "SET-02", title: "কম্বো অফার ২", price: 2040, piece: 2 },
  { code: "SET-04", title: "কম্বো অফার ৩", price: 2040, piece: 2 },
  { code: "SET-07", title: "কম্বো অফার ৪", price: 2040, piece: 2 },
  { code: "SET-10", title: "কম্বো অফার ৫", price: 2690, piece: 3 },
];

let PRODUCTS = FALLBACK_PRODUCTS.slice();
let WHATSAPP = "8801700000000";

function taka(n) {
  return `৳${Number(n).toLocaleString("bn-BD")}`;
}

function findProduct(code) {
  return PRODUCTS.find((p) => p.code === code);
}

async function loadCatalog() {
  try {
    const res = await fetch("/api/catalog");
    if (!res.ok) throw new Error("catalog missing");
    const data = await res.json();
    if (!data.products || !data.products.length) throw new Error("empty");
    PRODUCTS = data.products;
    WHATSAPP = data.whatsapp || WHATSAPP;
    return data;
  } catch (err) {
    PRODUCTS = FALLBACK_PRODUCTS.slice();
    return {
      products: PRODUCTS,
      offers: FALLBACK_OFFERS.slice(),
      whatsapp: WHATSAPP,
    };
  }
}
