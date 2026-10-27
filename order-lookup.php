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
  echo json_encode(array("error" => "POST লাগবে"), JSON_UNESCAPED_UNICODE);
  exit;
}

$body = json_decode(file_get_contents("php://input"), true);
if (!is_array($body)) $body = $_POST;
if (!is_array($body)) $body = array();

function lookup_phone($phone) {
  $digits = preg_replace("/\\D/", "", (string)$phone);
  if (strpos($digits, "880") === 0 && strlen($digits) >= 13) $digits = substr($digits, -11);
  if (strlen($digits) === 10) $digits = "0" . $digits;
  return $digits;
}

$want = lookup_phone(isset($body["phone"]) ? $body["phone"] : "");
if (strlen($want) < 10) {
  http_response_code(400);
  echo json_encode(array("error" => "সঠিক মোবাইল দিন"), JSON_UNESCAPED_UNICODE);
  exit;
}

$orders = array();
$path = __DIR__ . "/data/orders.json";
if (is_file($path)) {
  $data = json_decode(@file_get_contents($path), true);
  if (is_array($data)) $orders = $data;
}

$matched = array();
foreach ($orders as $order) {
  if (!is_array($order)) continue;
  if (lookup_phone(isset($order["phone"]) ? $order["phone"] : "") === $want) {
    $matched[] = $order;
  }
}
echo json_encode(array("orders" => $matched), JSON_UNESCAPED_UNICODE);
