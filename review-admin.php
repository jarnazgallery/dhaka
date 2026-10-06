<?php
header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store, no-cache, must-revalidate");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Admin-Token");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
  http_response_code(204);
  exit;
}

$ROOT = __DIR__;
$DIR = $ROOT . "/data";
$IMAGES = $ROOT . "/images";
if (!is_dir($DIR)) @mkdir($DIR, 0775, true);
if (!is_dir($IMAGES)) @mkdir($IMAGES, 0775, true);

function ra_read($file, $fallback) {
  global $DIR;
  $path = $DIR . "/" . $file;
  if (!is_file($path)) return $fallback;
  $data = json_decode(@file_get_contents($path), true);
  return is_array($data) ? $data : $fallback;
}

function ra_write($file, $value) {
  global $DIR;
  $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
  if ($json === false || @file_put_contents($DIR . "/" . $file, $json) === false) {
    http_response_code(500);
    echo json_encode(array("error" => "সেভ হয়নি। data ফোল্ডার 775 করুন।"), JSON_UNESCAPED_UNICODE);
    exit;
  }
}

function ra_publish() {
  global $ROOT, $DIR;
  $site = ra_read("site.json", array());
  $config = ra_read("config.json", array());
  $payload = array(
    "products" => ra_read("products.json", array()),
    "offers" => ra_read("offers.json", array()),
    "site" => $site,
    "whatsapp" => !empty($site["whatsapp"]) ? $site["whatsapp"] : (isset($config["whatsapp"]) ? $config["whatsapp"] : "8801735943156"),
    "reviews" => ra_read("reviews.json", array()),
  );
  @file_put_contents($ROOT . "/catalog-data.json", json_encode($payload, JSON_UNESCAPED_UNICODE));
}

function ra_fail($code, $msg) {
  http_response_code($code);
  echo json_encode(array("error" => $msg), JSON_UNESCAPED_UNICODE);
  exit;
}

function ra_token() {
  $token = "";
  if (!empty($_SERVER["HTTP_X_ADMIN_TOKEN"])) $token = $_SERVER["HTTP_X_ADMIN_TOKEN"];
  if ($token === "" && !empty($_SERVER["HTTP_AUTHORIZATION"])) {
    $token = preg_replace("/^Bearer\\s+/i", "", $_SERVER["HTTP_AUTHORIZATION"]);
  }
  if ($token === "" && !empty($_POST["token"])) $token = $_POST["token"];
  if ($token === "" && !empty($_GET["token"])) $token = $_GET["token"];
  return trim((string)$token);
}

function ra_authed() {
  $token = ra_token();
  $tokens = ra_read("tokens.json", array());
  if ($token !== "" && $token !== "local" && !empty($tokens[$token])) return true;
  $password = "";
  if (!empty($_POST["password"])) $password = (string)$_POST["password"];
  if ($password === "" && !empty($_GET["password"])) $password = (string)$_GET["password"];
  $config = ra_read("config.json", array());
  $salt = isset($config["salt"]) ? $config["salt"] : "";
  $hash = hash("sha256", $salt . $password);
  return $password !== "" && !empty($config["passwordHash"]) && $config["passwordHash"] === $hash;
}

if (!ra_authed()) ra_fail(401, "লগইন করুন");

$action = isset($_GET["action"]) ? $_GET["action"] : (isset($_POST["action"]) ? $_POST["action"] : "");
$method = $_SERVER["REQUEST_METHOD"];
if (!empty($_GET["_method"])) $method = strtoupper($_GET["_method"]);
$id = isset($_GET["id"]) ? $_GET["id"] : (isset($_POST["id"]) ? $_POST["id"] : "");

if ($action === "delete" || $method === "DELETE") {
  if ($id === "") ra_fail(400, "রিভিউ আইডি দিন");
  $reviews = ra_read("reviews.json", array());
  $next = array();
  foreach ($reviews as $item) {
    if (!is_array($item) || (isset($item["id"]) ? $item["id"] : "") === $id) {
      if (is_array($item) && !empty($item["image"]) && strpos($item["image"], "images/") === 0) {
        $img = $ROOT . "/" . $item["image"];
        if (is_file($img)) @unlink($img);
      }
      continue;
    }
    $next[] = $item;
  }
  ra_write("reviews.json", $next);
  ra_publish();
  echo json_encode(array("ok" => true), JSON_UNESCAPED_UNICODE);
  exit;
}

if ($method === "GET") {
  echo json_encode(array("reviews" => ra_read("reviews.json", array())), JSON_UNESCAPED_UNICODE);
  exit;
}

if ($method !== "POST") ra_fail(405, "POST লাগবে");

if (empty($_FILES["image"]["tmp_name"]) || !is_uploaded_file($_FILES["image"]["tmp_name"])) {
  ra_fail(400, "ফোন স্ক্রিনশট আপলোড করুন");
}
if (!empty($_FILES["image"]["error"]) && $_FILES["image"]["error"] !== UPLOAD_ERR_OK) {
  ra_fail(400, "ছবি আপলোড হয়নি। আবার চেষ্টা করুন।");
}
$ext = strtolower(pathinfo(isset($_FILES["image"]["name"]) ? $_FILES["image"]["name"] : "shot.jpg", PATHINFO_EXTENSION));
if ($ext === "") $ext = "jpg";
if (!in_array($ext, array("png", "jpg", "jpeg", "webp", "gif", "heic", "heif", "bmp"), true)) {
  ra_fail(400, "শুধু ছবি আপলোড করুন");
}
$filename = "review-" . round(microtime(true) * 1000) . "." . $ext;
if (!move_uploaded_file($_FILES["image"]["tmp_name"], "$IMAGES/$filename")) {
  ra_fail(500, "ছবি সেভ হয়নি। images ফোল্ডার writable করুন।");
}

$review = array(
  "id" => "RV-" . substr((string)round(microtime(true) * 1000), -8),
  "name" => trim((string)(isset($_POST["name"]) ? $_POST["name"] : "")),
  "text" => trim((string)(isset($_POST["text"]) ? $_POST["text"] : "")),
  "image" => "images/" . $filename,
  "status" => "confirmed",
  "createdAt" => date("c"),
);
$reviews = ra_read("reviews.json", array());
array_unshift($reviews, $review);
ra_write("reviews.json", $reviews);
ra_publish();
echo json_encode($review, JSON_UNESCAPED_UNICODE);
