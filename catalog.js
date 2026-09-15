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

let PRODUCTS = [];
let WHATSAPP = "8801700000000";

function taka(n) {
  return `৳${Number(n).toLocaleString("bn-BD")}`;
}

function findProduct(code) {
  return PRODUCTS.find((p) => p.code === code);
}

async function loadCatalog() {
  const data = await fetch("/api/catalog").then((res) => res.json());
  PRODUCTS = data.products || [];
  WHATSAPP = data.whatsapp || WHATSAPP;
  return data;
}
