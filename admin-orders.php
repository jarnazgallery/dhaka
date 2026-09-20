<?php
header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store, no-cache, must-revalidate");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Admin-Token");
header("Access-Control-Allow-Methods: GET, OPTIONS");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
  http_response_code(204);
  exit;
}

$token = "";
if (!empty($_SERVER["HTTP_X_ADMIN_TOKEN"])) $token = $_SERVER["HTTP_X_ADMIN_TOKEN"];
if ($token === "" && !empty($_SERVER["HTTP_AUTHORIZATION"])) {
  $token = preg_replace("/^Bearer\\s+/i", "", $_SERVER["HTTP_AUTHORIZATION"]);
}
if ($token === "" && !empty($_GET["token"])) $token = $_GET["token"];
$token = trim((string)$token);

$dir = __DIR__ . "/data";
$tokens = array();
if (is_file("$dir/tokens.json")) {
  $data = json_decode(@file_get_contents("$dir/tokens.json"), true);
  if (is_array($data)) $tokens = $data;
}
if ($token === "" || $token === "local" || empty($tokens[$token])) {
  http_response_code(401);
  echo json_encode(array("error" => "লগইন করুন"), JSON_UNESCAPED_UNICODE);
  exit;
}

$orders = array();
if (is_file("$dir/orders.json")) {
  $data = json_decode(@file_get_contents("$dir/orders.json"), true);
  if (is_array($data)) $orders = $data;
}
echo json_encode($orders, JSON_UNESCAPED_UNICODE);
