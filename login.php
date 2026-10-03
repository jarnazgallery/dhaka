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
  echo json_encode(array("error" => "লগইন POST করতে হবে"));
  exit;
}

$body = json_decode(file_get_contents("php://input"), true);
if (!is_array($body)) $body = $_POST;
if (!is_array($body)) $body = array();
$password = (string)(isset($body["password"]) ? $body["password"] : "");

$dir = __DIR__ . "/data";
$config = array();
if (is_file("$dir/config.json")) {
  $data = json_decode(@file_get_contents("$dir/config.json"), true);
  if (is_array($data)) $config = $data;
}
$salt = isset($config["salt"]) ? $config["salt"] : "";
$hash = hash("sha256", $salt . $password);
$ok = !empty($config["passwordHash"]) && $config["passwordHash"] === $hash;
if (!$ok) {
  http_response_code(401);
  echo json_encode(array("error" => "পাসওয়ার্ড ভুল"), JSON_UNESCAPED_UNICODE);
  exit;
}

$token = bin2hex(function_exists("random_bytes") ? random_bytes(24) : openssl_random_pseudo_bytes(24));
$tokens = array();
if (is_file("$dir/tokens.json")) {
  $data = json_decode(@file_get_contents("$dir/tokens.json"), true);
  if (is_array($data)) $tokens = $data;
}
$tokens[$token] = time();
if (!is_dir($dir)) @mkdir($dir, 0775, true);
@file_put_contents("$dir/tokens.json", json_encode($tokens, JSON_UNESCAPED_UNICODE));
echo json_encode(array("token" => $token));
