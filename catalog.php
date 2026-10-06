<?php
header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store, no-cache, must-revalidate");
$dir = __DIR__ . "/data";
function cat_read($file, $fallback) {
  global $dir;
  $path = $dir . "/" . $file;
  if (!is_file($path)) return $fallback;
  $data = json_decode(@file_get_contents($path), true);
  return is_array($data) ? $data : $fallback;
}
$site = cat_read("site.json", array());
$config = cat_read("config.json", array());
$products = cat_read("products.json", array());
usort($products, function ($a, $b) {
  $pa = (isset($a["priority"]) && intval($a["priority"]) > 0) ? intval($a["priority"]) : intval(preg_replace("/\\D/", "", isset($a["code"]) ? $a["code"] : "0"));
  $pb = (isset($b["priority"]) && intval($b["priority"]) > 0) ? intval($b["priority"]) : intval(preg_replace("/\\D/", "", isset($b["code"]) ? $b["code"] : "0"));
  if ($pa !== $pb) return $pa - $pb;
  return strcmp(isset($a["code"]) ? $a["code"] : "", isset($b["code"]) ? $b["code"] : "");
});
echo json_encode(array(
  "products" => $products,
  "offers" => cat_read("offers.json", array()),
  "site" => $site,
  "whatsapp" => !empty($site["whatsapp"]) ? $site["whatsapp"] : (isset($config["whatsapp"]) ? $config["whatsapp"] : "8801735943156"),
  "reviews" => cat_read("reviews.json", array()),
), JSON_UNESCAPED_UNICODE);
