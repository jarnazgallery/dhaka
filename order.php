<?php
header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store, no-cache, must-revalidate");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
  http_response_code(204);
  exit;
}
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  http_response_code(405);
  echo json_encode(array("error" => "শুধু অর্ডার পাঠানো যাবে"));
  exit;
}

$body = json_decode(file_get_contents("php://input"), true);
if (!is_array($body)) $body = $_POST;
if (!is_array($body)) $body = array();

$name = trim((string)(isset($body["name"]) ? $body["name"] : ""));
$phone = trim((string)(isset($body["phone"]) ? $body["phone"] : ""));
$address = trim((string)(isset($body["address"]) ? $body["address"] : ""));
$size = trim((string)(isset($body["size"]) ? $body["size"] : ""));
$code = trim((string)(isset($body["productCode"]) ? $body["productCode"] : ""));
if ($name === "" || $phone === "" || $address === "" || $size === "" || $code === "") {
  http_response_code(400);
  echo json_encode(array("error" => "নাম, মোবাইল, ঠিকানা, সাইজ ও প্রোডাক্ট দিন"), JSON_UNESCAPED_UNICODE);
  exit;
}

$dir = __DIR__ . "/data";
if (!is_dir($dir)) @mkdir($dir, 0775, true);
$path = $dir . "/orders.json";
$orders = array();
if (is_file($path)) {
  $data = json_decode(@file_get_contents($path), true);
  if (is_array($data)) $orders = $data;
}

$order = array(
  "id" => isset($body["id"]) && $body["id"] !== "" ? $body["id"] : ("JZ-" . substr((string)round(microtime(true) * 1000), -8)),
  "productCode" => $code,
  "name" => $name,
  "phone" => $phone,
  "address" => $address,
  "size" => $size,
  "combo" => intval(isset($body["combo"]) ? $body["combo"] : 2),
  "qty" => max(1, intval(isset($body["qty"]) ? $body["qty"] : 1)),
  "total" => intval(isset($body["total"]) ? $body["total"] : 0),
  "status" => "new",
  "source" => isset($body["source"]) ? $body["source"] : "web",
  "createdAt" => date("c"),
);
array_unshift($orders, $order);
@file_put_contents($path, json_encode($orders, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
echo json_encode($order, JSON_UNESCAPED_UNICODE);
