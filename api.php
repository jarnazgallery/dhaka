<?php
error_reporting(0);
header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store, no-cache, must-revalidate");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Admin-Token");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
  http_response_code(204);
  exit;
}

$earlyRoute = isset($_GET["route"]) ? $_GET["route"] : "";
if ($earlyRoute === "health") {
  echo json_encode(array("ok" => true));
  exit;
}
if ($earlyRoute === "catalog") {
  $dir = __DIR__ . "/data";
  $read = function ($file, $fallback) use ($dir) {
    $path = $dir . "/" . $file;
    if (!is_file($path)) return $fallback;
    $data = json_decode(@file_get_contents($path), true);
    return is_array($data) ? $data : $fallback;
  };
  $site = $read("site.json", array());
  $config = $read("config.json", array());
  $products = $read("products.json", array());
  usort($products, function ($a, $b) {
    $pa = (isset($a["priority"]) && intval($a["priority"]) > 0) ? intval($a["priority"]) : intval(preg_replace("/\\D/", "", isset($a["code"]) ? $a["code"] : "0"));
    $pb = (isset($b["priority"]) && intval($b["priority"]) > 0) ? intval($b["priority"]) : intval(preg_replace("/\\D/", "", isset($b["code"]) ? $b["code"] : "0"));
    if ($pa !== $pb) return $pa - $pb;
    return strcmp(isset($a["code"]) ? $a["code"] : "", isset($b["code"]) ? $b["code"] : "");
  });
  echo json_encode(array(
    "products" => $products,
    "offers" => $read("offers.json", array()),
    "site" => $site,
    "whatsapp" => !empty($site["whatsapp"]) ? $site["whatsapp"] : (isset($config["whatsapp"]) ? $config["whatsapp"] : "8801735943156"),
    "reviews" => $read("reviews.json", array()),
  ), JSON_UNESCAPED_UNICODE);
  exit;
}

if (!function_exists("random_bytes")) {
  function random_bytes($n) {
    if (function_exists("openssl_random_pseudo_bytes")) return openssl_random_pseudo_bytes($n);
    $s = "";
    for ($i = 0; $i < $n; $i++) $s .= chr(mt_rand(0, 255));
    return $s;
  }
}
if (!function_exists("hash_equals")) {
  function hash_equals($a, $b) {
    return $a === $b;
  }
}

$ROOT = __DIR__;
$DATA = $ROOT . "/data";
$IMAGES = $ROOT . "/images";
if (!is_dir($DATA)) @mkdir($DATA, 0775, true);
if (!is_dir($IMAGES)) @mkdir($IMAGES, 0775, true);

function read_json($file, $fallback) {
  global $DATA;
  $path = "$DATA/$file";
  if (!is_file($path)) return $fallback;
  $raw = @file_get_contents($path);
  if ($raw === false) return $fallback;
  $data = json_decode($raw, true);
  return is_array($data) ? $data : $fallback;
}

function write_json($file, $value, $strict = true) {
  global $DATA;
  if (!is_dir($DATA)) @mkdir($DATA, 0775, true);
  $path = "$DATA/$file";
  $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
  $ok = @file_put_contents($path, $json);
  if ($ok === false && $strict) fail(500, "data/$file সেভ হয়নি। হোস্টিংয়ে data ফোল্ডার writable করুন (৭৭৫)।");
  return $ok !== false;
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

function price_for_age($product, $size) {
  $older = in_array((string)$size, array("3-4 year", "4-5 year", "5-6 year"), true);
  if ($older) return intval(isset($product["price36"]) ? $product["price36"] : (isset($product["price"]) ? $product["price"] : 2040));
  return intval(isset($product["price"]) ? $product["price"] : 2040);
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
    write_json("config.json", $config, false);
  }
  return $config;
}

function catalog_payload() {
  $site = read_json("site.json", array());
  $config = read_json("config.json", array());
  return array(
    "products" => sort_products(read_json("products.json", array())),
    "offers" => read_json("offers.json", array()),
    "site" => $site,
    "whatsapp" => !empty($site["whatsapp"]) ? $site["whatsapp"] : (isset($config["whatsapp"]) ? $config["whatsapp"] : "8801735943156"),
    "reviews" => read_json("reviews.json", array()),
  );
}

function publish_catalog() {
  global $ROOT;
  $json = json_encode(catalog_payload(), JSON_UNESCAPED_UNICODE);
  if ($json) @file_put_contents($ROOT . "/catalog-data.json", $json);
}

function bearer_token() {
  $header = isset($_SERVER["HTTP_AUTHORIZATION"]) ? $_SERVER["HTTP_AUTHORIZATION"] : "";
  if ($header === "" && !empty($_SERVER["HTTP_X_ADMIN_TOKEN"])) $header = $_SERVER["HTTP_X_ADMIN_TOKEN"];
  if ($header === "" && function_exists("apache_request_headers")) {
    $headers = apache_request_headers();
    if (isset($headers["Authorization"])) $header = $headers["Authorization"];
    elseif (isset($headers["authorization"])) $header = $headers["authorization"];
    elseif (isset($headers["X-Admin-Token"])) $header = $headers["X-Admin-Token"];
  }
  if ($header === "" && !empty($_POST["token"])) $header = $_POST["token"];
  if ($header === "" && !empty($_GET["token"])) $header = $_GET["token"];
  return trim(preg_replace("/^Bearer\\s+/i", "", $header));
}

function require_auth() {
  $token = bearer_token();
  $tokens = read_json("tokens.json", array());
  if ($token === "" || empty($tokens[$token])) fail(401, "লগইন করুন");
}

function normalize_code($raw) {
  $n = intval(preg_replace("/\\D/", "", (string)$raw));
  if ($n < 1 || $n > 999) return "";
  return "SET-" . str_pad((string)$n, 2, "0", STR_PAD_LEFT);
}

function first_free_code($products) {
  $used = array();
  foreach ($products as $p) {
    $used[strtoupper(isset($p["code"]) ? $p["code"] : "")] = true;
  }
  for ($n = 1; $n <= 999; $n++) {
    $code = "SET-" . str_pad((string)$n, 2, "0", STR_PAD_LEFT);
    if (empty($used[$code])) return $code;
  }
  return "";
}

function next_code($products) {
  return first_free_code($products);
}

function product_priority($p) {
  if (isset($p["priority"]) && intval($p["priority"]) > 0) return intval($p["priority"]);
  $n = intval(preg_replace("/\\D/", "", isset($p["code"]) ? $p["code"] : "0"));
  return $n > 0 ? $n : 9999;
}

function sort_products($products) {
  usort($products, function ($a, $b) {
    $pa = product_priority($a);
    $pb = product_priority($b);
    if ($pa !== $pb) return $pa - $pb;
    $na = intval(preg_replace("/\\D/", "", isset($a["code"]) ? $a["code"] : "0"));
    $nb = intval(preg_replace("/\\D/", "", isset($b["code"]) ? $b["code"] : "0"));
    if ($na !== $nb) return $na - $nb;
    return strcmp(isset($a["code"]) ? $a["code"] : "", isset($b["code"]) ? $b["code"] : "");
  });
  return $products;
}

function code_taken($products, $code, $except) {
  foreach ($products as $p) {
    $c = isset($p["code"]) ? $p["code"] : "";
    if ($c === $code && $c !== $except) return true;
  }
  return false;
}

function rename_offer_code($old, $new) {
  $offers = read_json("offers.json", array());
  $changed = false;
  for ($i = 0; $i < count($offers); $i++) {
    if ((isset($offers[$i]["code"]) ? $offers[$i]["code"] : "") !== $old) continue;
    $offers[$i]["code"] = $new;
    $changed = true;
  }
  if ($changed) write_json("offers.json", $offers);
}

function save_upload($key) {
  global $IMAGES;
  if (!empty($_FILES[$key]["error"]) && $_FILES[$key]["error"] !== UPLOAD_ERR_OK) {
    if ($_FILES[$key]["error"] === UPLOAD_ERR_INI_SIZE || $_FILES[$key]["error"] === UPLOAD_ERR_FORM_SIZE) {
      fail(400, "ছবি খুব বড়। ৮ এমবির নিচে দিন।");
    }
    fail(400, "ছবি আপলোড হয়নি। আবার চেষ্টা করুন।");
  }
  if (empty($_FILES[$key]["tmp_name"]) || !is_uploaded_file($_FILES[$key]["tmp_name"])) return null;
  if (!is_dir($IMAGES) && !@mkdir($IMAGES, 0775, true)) fail(500, "images ফোল্ডার তৈরি হয়নি");
  $name = isset($_FILES[$key]["name"]) ? $_FILES[$key]["name"] : "image.png";
  $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
  if ($ext === "") $ext = "png";
  if (!in_array($ext, array("png", "jpg", "jpeg", "webp", "gif", "heic", "heif", "bmp"), true)) fail(400, "শুধু ছবি আপলোড করুন");
  $filename = "set-" . round(microtime(true) * 1000) . "." . $ext;
  if (!move_uploaded_file($_FILES[$key]["tmp_name"], "$IMAGES/$filename")) fail(400, "ছবি সেভ হয়নি। images ফোল্ডার writable করুন।");
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

if ($route === "health" && $method === "GET") {
  ok(array("ok" => true));
}

if ($route === "catalog" && $method === "GET") {
  ok(catalog_payload());
}

$config = load_config();

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
    "total" => intval(isset($body["total"]) ? $body["total"] : (price_for_age($product, isset($body["size"]) ? $body["size"] : "") * intval(isset($body["qty"]) ? $body["qty"] : 1))),
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
    "total" => intval(isset($body["total"]) ? $body["total"] : (price_for_age($product, isset($body["size"]) ? $body["size"] : "") * $qty)),
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
  $allowed = array("new", "confirmed", "cancelled", "delivered");
  if (isset($body["status"]) && $body["status"] !== "" && !in_array($body["status"], $allowed, true)) {
    fail(400, "স্ট্যাটাস ভুল");
  }
  $orders = read_json("orders.json", array());
  $saved = null;
  $products = read_json("products.json", array());
  for ($i = 0; $i < count($orders); $i++) {
    if ((isset($orders[$i]["id"]) ? $orders[$i]["id"] : "") !== $id) continue;
    foreach (array("name", "phone", "address", "size", "note") as $key) {
      if (isset($body[$key])) $orders[$i][$key] = trim((string)$body[$key]);
    }
    if (isset($body["qty"])) $orders[$i]["qty"] = max(1, intval($body["qty"]));
    if (!empty($body["productCode"])) {
      foreach ($products as $p) {
        if ((isset($p["code"]) ? $p["code"] : "") !== $body["productCode"]) continue;
        $orders[$i]["productCode"] = $p["code"];
        $orders[$i]["combo"] = intval(isset($p["piece"]) ? $p["piece"] : 2);
        if (!isset($body["total"])) {
          $orders[$i]["total"] = price_for_age($p, isset($orders[$i]["size"]) ? $orders[$i]["size"] : "") * intval($orders[$i]["qty"]);
        }
        break;
      }
    }
    if (isset($body["total"]) && $body["total"] !== "") $orders[$i]["total"] = intval($body["total"]);
    if (!empty($body["status"])) $orders[$i]["status"] = $body["status"];
    if (trim((string)(isset($orders[$i]["name"]) ? $orders[$i]["name"] : "")) === "" ||
        trim((string)(isset($orders[$i]["phone"]) ? $orders[$i]["phone"] : "")) === "" ||
        trim((string)(isset($orders[$i]["address"]) ? $orders[$i]["address"] : "")) === "" ||
        trim((string)(isset($orders[$i]["size"]) ? $orders[$i]["size"] : "")) === "") {
      fail(400, "নাম, মোবাইল, ঠিকানা ও সাইজ দিন");
    }
    $orders[$i]["updatedAt"] = date("c");
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
  publish_catalog();
  ok($list);
}

if ($route === "admin/products-order" && ($method === "POST" || $method === "PUT")) {
  require_auth();
  $body = json_input();
  $codes = isset($body["codes"]) ? $body["codes"] : array();
  if (!is_array($codes) || !count($codes)) fail(400, "অর্ডার লিস্ট দিন");
  $products = read_json("products.json", array());
  $rank = array();
  foreach ($codes as $i => $code) $rank[(string)$code] = $i + 1;
  for ($i = 0; $i < count($products); $i++) {
    $c = isset($products[$i]["code"]) ? $products[$i]["code"] : "";
    if (isset($rank[$c])) $products[$i]["priority"] = $rank[$c];
  }
  $products = sort_products($products);
  write_json("products.json", $products);
  publish_catalog();
  ok($products);
}

if ($route === "admin/products" && $method === "POST") {
  require_auth();
  $image = save_upload("image");
  if (!$image) fail(400, "ছবি দিন");
  $products = read_json("products.json", array());
  if (count($products) >= 200) fail(400, "২০০টার বেশি প্রোডাক্ট রাখা যাবে না");
  $requested = isset($_POST["code"]) ? trim((string)$_POST["code"]) : "";
  $code = $requested !== "" ? normalize_code($requested) : first_free_code($products);
  if ($code === "") fail(400, "সেট নম্বর ১ থেকে ৯৯৯ দিন, যেমন 13 বা SET-13");
  if (code_taken($products, $code, "")) fail(400, $code . " আগে থেকে আছে");
  $priority = (isset($_POST["priority"]) && $_POST["priority"] !== "")
    ? max(1, intval($_POST["priority"]))
    : intval(preg_replace("/\\D/", "", $code));
  $product = array(
    "code" => $code,
    "priority" => $priority,
    "name" => trim((string)(isset($_POST["name"]) ? $_POST["name"] : "নতুন সেট")),
    "price" => intval(isset($_POST["price"]) ? $_POST["price"] : 2040),
    "price36" => intval(isset($_POST["price36"]) ? $_POST["price36"] : (isset($_POST["price"]) ? $_POST["price"] : 2040)),
    "piece" => intval(isset($_POST["piece"]) ? $_POST["piece"] : 2),
    "description" => trim((string)(isset($_POST["description"]) ? $_POST["description"] : "")),
    "image" => $image,
  );
  array_unshift($products, $product);
  write_json("products.json", sort_products($products));
  publish_catalog();
  ok($product);
}

if (preg_match("#^admin/products/(.+)$#", $route, $m) && ($method === "PUT" || $method === "POST")) {
  require_auth();
  $code = rawurldecode($m[1]);
  $products = read_json("products.json", array());
  $found = false;
  $saved = null;
  for ($i = 0; $i < count($products); $i++) {
    if ((isset($products[$i]["code"]) ? $products[$i]["code"] : "") !== $code) continue;
    $found = true;
    if (!empty($_POST["name"])) $products[$i]["name"] = trim((string)$_POST["name"]);
    if (!empty($_POST["price"])) $products[$i]["price"] = intval($_POST["price"]);
    if (!empty($_POST["price36"])) $products[$i]["price36"] = intval($_POST["price36"]);
    if (!empty($_POST["piece"])) $products[$i]["piece"] = intval($_POST["piece"]);
    if (isset($_POST["description"])) $products[$i]["description"] = trim((string)$_POST["description"]);
    if (isset($_POST["priority"]) && $_POST["priority"] !== "") {
      $products[$i]["priority"] = max(1, intval($_POST["priority"]));
    }
    if (isset($_POST["code"]) && trim((string)$_POST["code"]) !== "") {
      $next = normalize_code($_POST["code"]);
      if ($next === "") fail(400, "সেট নম্বর ১ থেকে ৯৯৯ দিন, যেমন 13 বা SET-13");
      if (code_taken($products, $next, $code)) fail(400, $next . " আগে থেকে আছে");
      if ($next !== $code) {
        $products[$i]["code"] = $next;
        rename_offer_code($code, $next);
      }
    }
    $image = save_upload("image");
    if ($image) $products[$i]["image"] = $image;
    $saved = $products[$i];
    break;
  }
  if (!$found) fail(404, "প্রোডাক্ট নেই");
  write_json("products.json", sort_products($products));
  publish_catalog();
  ok($saved);
}

function delete_product($code) {
  $code = rawurldecode((string)$code);
  write_json("products.json", without_code(read_json("products.json", array()), "code", $code));
  write_json("offers.json", without_code(read_json("offers.json", array()), "code", $code));
  publish_catalog();
}

if ($route === "admin/products-delete" && $method === "POST") {
  require_auth();
  $body = json_input();
  $code = isset($body["code"]) ? trim((string)$body["code"]) : "";
  if ($code === "") fail(400, "প্রোডাক্ট নম্বর দিন");
  delete_product($code);
  ok(array("ok" => true));
}

if (preg_match("#^admin/products/(.+)$#", $route, $m) && $method === "DELETE") {
  require_auth();
  delete_product($m[1]);
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
  publish_catalog();
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
  publish_catalog();
  ok($review);
}

if (preg_match("#^admin/reviews/(.+)$#", $route, $m) && $method === "DELETE") {
  require_auth();
  write_json("reviews.json", without_code(read_json("reviews.json", array()), "id", $m[1]));
  ok(array("ok" => true));
}

fail(404, "API পাওয়া যায়নি");
