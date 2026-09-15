<?php
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
  http_response_code(204);
  exit;
}

$ROOT = __DIR__;
$DATA = $ROOT . "/data";
$IMAGES = $ROOT . "/images";
if (!is_dir($DATA)) mkdir($DATA, 0775, true);
if (!is_dir($IMAGES)) mkdir($IMAGES, 0775, true);

function read_json($file, $fallback) {
  global $DATA;
  $path = "$DATA/$file";
  if (!is_file($path)) return $fallback;
  $data = json_decode(file_get_contents($path), true);
  return is_array($data) ? $data : $fallback;
}

function write_json($file, $value) {
  global $DATA;
  file_put_contents("$DATA/$file", json_encode($value, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

function json_input() {
  $raw = file_get_contents("php://input");
  $data = json_decode($raw, true);
  return is_array($data) ? $data : array();
}

function fail($code, $msg) {
  http_response_code($code);
  echo json_encode(array("error" => $msg), JSON_UNESCAPED_UNICODE);
  exit;
}

function ok($value) {
  echo json_encode($value, JSON_UNESCAPED_UNICODE);
  exit;
}

function hash_password($password, $salt) {
  return hash("sha256", $salt . $password);
}

function load_config() {
  $config = read_json("config.json", array());
  if (empty($config["algo"]) || $config["algo"] !== "sha256") {
    $salt = bin2hex(random_bytes(16));
    $config = array(
      "algo" => "sha256",
      "salt" => $salt,
      "passwordHash" => hash_password("jarnaz123", $salt),
      "whatsapp" => isset($config["whatsapp"]) ? $config["whatsapp"] : "8801735943156",
    );
    write_json("config.json", $config);
  }
  return $config;
}

function bearer_token() {
  $header = isset($_SERVER["HTTP_AUTHORIZATION"]) ? $_SERVER["HTTP_AUTHORIZATION"] : "";
  if ($header === "" && function_exists("apache_request_headers")) {
    $headers = apache_request_headers();
    if (isset($headers["Authorization"])) $header = $headers["Authorization"];
    elseif (isset($headers["authorization"])) $header = $headers["authorization"];
  }
  return trim(preg_replace("/^Bearer\\s+/i", "", $header));
}

function require_auth() {
  $token = bearer_token();
  $tokens = read_json("tokens.json", array());
  if ($token === "" || empty($tokens[$token])) fail(401, "লগইন করুন");
}

function next_code($products) {
  $max = 0;
  foreach ($products as $p) {
    $n = intval(preg_replace("/\\D/", "", isset($p["code"]) ? $p["code"] : "0"));
    if ($n > $max) $max = $n;
  }
  return "SET-" . str_pad((string)($max + 1), 2, "0", STR_PAD_LEFT);
}

function save_upload($key) {
  global $IMAGES;
  if (empty($_FILES[$key]["tmp_name"]) || !is_uploaded_file($_FILES[$key]["tmp_name"])) return null;
  $name = isset($_FILES[$key]["name"]) ? $_FILES[$key]["name"] : "image.png";
  $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
  if ($ext === "") $ext = "png";
  if (!in_array($ext, array("png", "jpg", "jpeg", "webp", "gif", "heic", "heif", "bmp"), true)) fail(400, "শুধু ছবি আপলোড করুন");
  $filename = "set-" . round(microtime(true) * 1000) . "." . $ext;
  if (!move_uploaded_file($_FILES[$key]["tmp_name"], "$IMAGES/$filename")) fail(400, "ছবি সেভ হয়নি");
  return "images/$filename";
}

function without_code($list, $key, $value) {
  $out = array();
  foreach ($list as $item) {
    if ((isset($item[$key]) ? $item[$key] : "") !== $value) $out[] = $item;
  }
  return $out;
}

$route = isset($_GET["route"]) ? $_GET["route"] : "";
if ($route === "") {
  $path = parse_url(isset($_SERVER["REQUEST_URI"]) ? $_SERVER["REQUEST_URI"] : "", PHP_URL_PATH);
  if (preg_match("#/api/(.+)$#", $path, $m)) $route = $m[1];
}
$route = trim($route, "/");
$method = $_SERVER["REQUEST_METHOD"];
if (!empty($_GET["_method"])) $method = strtoupper($_GET["_method"]);

$config = load_config();

if ($route === "catalog" && $method === "GET") {
  $site = read_json("site.json", array());
  ok(array(
    "products" => read_json("products.json", array()),
    "offers" => read_json("offers.json", array()),
    "site" => $site,
    "whatsapp" => !empty($site["whatsapp"]) ? $site["whatsapp"] : (isset($config["whatsapp"]) ? $config["whatsapp"] : "8801735943156"),
    "reviews" => read_json("reviews.json", array()),
  ));
}

if ($route === "orders" && $method === "POST") {
  $body = json_input();
  $products = read_json("products.json", array());
  $code = isset($body["productCode"]) ? $body["productCode"] : "";
  $product = null;
  foreach ($products as $p) {
    if ((isset($p["code"]) ? $p["code"] : "") === $code) $product = $p;
  }
  if (!$product) fail(400, "প্রোডাক্ট পাওয়া যায়নি");
  $order = array(
    "id" => isset($body["id"]) ? $body["id"] : ("JZ-" . substr((string)round(microtime(true) * 1000), -8)),
    "productCode" => $product["code"],
    "name" => trim((string)(isset($body["name"]) ? $body["name"] : "")),
    "phone" => trim((string)(isset($body["phone"]) ? $body["phone"] : "")),
    "address" => trim((string)(isset($body["address"]) ? $body["address"] : "")),
    "size" => trim((string)(isset($body["size"]) ? $body["size"] : "")),
    "combo" => intval(isset($body["combo"]) ? $body["combo"] : (isset($product["piece"]) ? $product["piece"] : 2)),
    "qty" => intval(isset($body["qty"]) ? $body["qty"] : 1),
    "total" => intval(isset($body["total"]) ? $body["total"] : (isset($product["price"]) ? $product["price"] : 0)),
    "status" => "new",
    "source" => "web",
    "createdAt" => date("c"),
  );
  if ($order["name"] === "" || $order["phone"] === "" || $order["address"] === "" || $order["size"] === "") {
    fail(400, "সব তথ্য দিন");
  }
  $orders = read_json("orders.json", array());
  array_unshift($orders, $order);
  write_json("orders.json", $orders);
  ok($order);
}

if ($route === "login" && $method === "POST") {
  $body = json_input();
  $password = (string)(isset($body["password"]) ? $body["password"] : "");
  $hash = hash_password($password, $config["salt"]);
  if (!hash_equals($config["passwordHash"], $hash)) fail(401, "পাসওয়ার্ড ভুল");
  $token = bin2hex(random_bytes(24));
  $tokens = read_json("tokens.json", array());
  $tokens[$token] = time();
  write_json("tokens.json", $tokens);
  ok(array("token" => $token));
}

if ($route === "admin/me" && $method === "GET") {
  require_auth();
  ok(array("ok" => true));
}

if ($route === "admin/orders" && $method === "GET") {
  require_auth();
  ok(read_json("orders.json", array()));
}

if ($route === "admin/orders" && $method === "POST") {
  require_auth();
  $body = json_input();
  $products = read_json("products.json", array());
  $code = isset($body["productCode"]) ? $body["productCode"] : "";
  $product = null;
  foreach ($products as $p) {
    if ((isset($p["code"]) ? $p["code"] : "") === $code) $product = $p;
  }
  if (!$product) fail(400, "প্রোডাক্ট পাওয়া যায়নি");
  $status = (isset($body["status"]) && $body["status"] === "new") ? "new" : "confirmed";
  $qty = max(1, intval(isset($body["qty"]) ? $body["qty"] : 1));
  $order = array(
    "id" => "JZ-" . substr((string)round(microtime(true) * 1000), -8),
    "productCode" => $product["code"],
    "name" => trim((string)(isset($body["name"]) ? $body["name"] : "")),
    "phone" => trim((string)(isset($body["phone"]) ? $body["phone"] : "")),
    "address" => trim((string)(isset($body["address"]) ? $body["address"] : "")),
    "size" => trim((string)(isset($body["size"]) ? $body["size"] : "")),
    "combo" => intval(isset($product["piece"]) ? $product["piece"] : 2),
    "qty" => $qty,
    "total" => intval(isset($body["total"]) ? $body["total"] : ($product["price"] * $qty)),
    "status" => $status,
    "source" => "admin",
    "createdAt" => date("c"),
  );
  if ($order["name"] === "" || $order["phone"] === "" || $order["address"] === "" || $order["size"] === "") {
    fail(400, "সব তথ্য দিন");
  }
  $orders = read_json("orders.json", array());
  array_unshift($orders, $order);
  write_json("orders.json", $orders);
  ok($order);
}

if (preg_match("#^admin/orders/(.+)$#", $route, $m) && ($method === "POST" || $method === "PUT")) {
  require_auth();
  $id = $m[1];
  $body = json_input();
  $status = isset($body["status"]) ? $body["status"] : "";
  if ($status !== "new" && $status !== "confirmed") fail(400, "স্ট্যাটাস ভুল");
  $orders = read_json("orders.json", array());
  $saved = null;
  for ($i = 0; $i < count($orders); $i++) {
    if ((isset($orders[$i]["id"]) ? $orders[$i]["id"] : "") !== $id) continue;
    $orders[$i]["status"] = $status;
    $saved = $orders[$i];
    break;
  }
  if (!$saved) fail(404, "অর্ডার নেই");
  write_json("orders.json", $orders);
  ok($saved);
}

if (preg_match("#^admin/orders/(.+)$#", $route, $m) && $method === "DELETE") {
  require_auth();
  write_json("orders.json", without_code(read_json("orders.json", array()), "id", $m[1]));
  ok(array("ok" => true));
}

if ($route === "admin/offers" && ($method === "PUT" || $method === "POST")) {
  require_auth();
  $list = json_input();
  if (count($list) < 4 || count($list) > 5) fail(400, "৪ থেকে ৫টা অফার রাখুন");
  write_json("offers.json", $list);
  ok($list);
}

if ($route === "admin/products" && $method === "POST") {
  require_auth();
  $image = save_upload("image");
  if (!$image) fail(400, "ছবি দিন");
  $products = read_json("products.json", array());
  $product = array(
    "code" => next_code($products),
    "name" => trim((string)(isset($_POST["name"]) ? $_POST["name"] : "নতুন সেট")),
    "price" => intval(isset($_POST["price"]) ? $_POST["price"] : 2040),
    "piece" => intval(isset($_POST["piece"]) ? $_POST["piece"] : 2),
    "description" => trim((string)(isset($_POST["description"]) ? $_POST["description"] : "")),
    "image" => $image,
  );
  array_unshift($products, $product);
  write_json("products.json", $products);
  ok($product);
}

if (preg_match("#^admin/products/(.+)$#", $route, $m) && ($method === "PUT" || $method === "POST")) {
  require_auth();
  $code = $m[1];
  $products = read_json("products.json", array());
  $found = false;
  $saved = null;
  for ($i = 0; $i < count($products); $i++) {
    if ((isset($products[$i]["code"]) ? $products[$i]["code"] : "") !== $code) continue;
    $found = true;
    if (!empty($_POST["name"])) $products[$i]["name"] = trim((string)$_POST["name"]);
    if (!empty($_POST["price"])) $products[$i]["price"] = intval($_POST["price"]);
    if (!empty($_POST["piece"])) $products[$i]["piece"] = intval($_POST["piece"]);
    if (isset($_POST["description"])) $products[$i]["description"] = trim((string)$_POST["description"]);
    $image = save_upload("image");
    if ($image) $products[$i]["image"] = $image;
    $saved = $products[$i];
    break;
  }
  if (!$found) fail(404, "প্রোডাক্ট নেই");
  write_json("products.json", $products);
  ok($saved);
}

if (preg_match("#^admin/products/(.+)$#", $route, $m) && $method === "DELETE") {
  require_auth();
  $code = $m[1];
  write_json("products.json", without_code(read_json("products.json", array()), "code", $code));
  write_json("offers.json", without_code(read_json("offers.json", array()), "code", $code));
  ok(array("ok" => true));
}

if ($route === "admin/password" && ($method === "PUT" || $method === "POST")) {
  require_auth();
  $body = json_input();
  $password = (string)(isset($body["password"]) ? $body["password"] : "");
  if (strlen($password) < 6) fail(400, "কমপক্ষে ৬ অক্ষর");
  $config["salt"] = bin2hex(random_bytes(16));
  $config["algo"] = "sha256";
  $config["passwordHash"] = hash_password($password, $config["salt"]);
  write_json("config.json", $config);
  write_json("tokens.json", array());
  ok(array("ok" => true));
}

if ($route === "admin/site" && ($method === "PUT" || $method === "POST")) {
  require_auth();
  $site = json_decode(isset($_POST["site"]) ? $_POST["site"] : "{}", true);
  if (!is_array($site)) fail(400, "সাইট ডাটা ভুল");
  $logo = save_upload("logo");
  if ($logo) $site["logo"] = $logo;
  elseif (empty($site["logo"])) {
    $prev = read_json("site.json", array());
    if (!empty($prev["logo"])) $site["logo"] = $prev["logo"];
  }
  write_json("site.json", $site);
  if (!empty($site["whatsapp"])) {
    $config["whatsapp"] = preg_replace("/\\D/", "", $site["whatsapp"]);
    write_json("config.json", $config);
  }
  ok($site);
}

if ($route === "reviews" && $method === "POST") {
  $name = trim((string)(isset($_POST["name"]) ? $_POST["name"] : ""));
  $text = trim((string)(isset($_POST["text"]) ? $_POST["text"] : ""));
  if ($name === "" || $text === "") fail(400, "নাম ও কমেন্ট দিন");
  $image = save_upload("image");
  $review = array(
    "id" => "RV-" . substr((string)round(microtime(true) * 1000), -8),
    "name" => $name,
    "text" => $text,
    "image" => $image ? $image : "",
    "status" => "confirmed",
    "createdAt" => date("c"),
  );
  $reviews = read_json("reviews.json", array());
  array_unshift($reviews, $review);
  write_json("reviews.json", $reviews);
  ok($review);
}

if (preg_match("#^admin/reviews/(.+)$#", $route, $m) && $method === "DELETE") {
  require_auth();
  write_json("reviews.json", without_code(read_json("reviews.json", array()), "id", $m[1]));
  ok(array("ok" => true));
}

fail(404, "API পাওয়া যায়নি");
