/**
 * Jarnaz Gallery — Cloud Orders + Steadfast
 * -------------------------------------------------------
 * সেটআপ (একবার) — AI Water থেকে আলাদা নতুন প্রজেক্ট বানান:
 * 1) https://script.google.com → New project
 * 2) এই পুরো কোড পেস্ট করুন → Save
 * 3) Run → setup → Allow
 * 4) Deploy → Web app → Execute as: Me · Who has access: Anyone → Deploy
 * 5) /exec URL কপি → Jarnaz Admin → অর্ডার সিঙ্ক → Test Sync → Save
 * 6) ডাউনলোড হওয়া site-config.js হোস্টিংয়ে আপলোড করুন
 *
 * কোড বদলালে: Manage deployments → New version → Deploy
 */

function setup() {
  var sheet = getSheet_();
  getReviewSheet_();
  getReviewFolder_();
  getCatalogFile_();
  Logger.log('OK sheet: ' + sheet.getParent().getUrl());
}

function setSteadfastCredentials() {
  var API_KEY = 'YOUR_STEADFAST_API_KEY';
  var SECRET_KEY = 'YOUR_STEADFAST_SECRET_KEY';
  if (API_KEY.indexOf('YOUR_') === 0 || SECRET_KEY.indexOf('YOUR_') === 0) {
    throw new Error('Use Admin panel Steadfast form, or put keys here and Run again');
  }
  PropertiesService.getScriptProperties().setProperties({
    STEADFAST_API_KEY: String(API_KEY).trim(),
    STEADFAST_SECRET_KEY: String(SECRET_KEY).trim()
  });
  Logger.log('Steadfast credentials saved');
}

function saveSteadfastKeys_(apiKey, secretKey) {
  apiKey = String(apiKey || '').trim();
  secretKey = String(secretKey || '').trim();
  if (!apiKey || !secretKey) {
    throw new Error('API Key and Secret Key are required');
  }
  if (apiKey.indexOf('YOUR_') === 0 || secretKey.indexOf('YOUR_') === 0) {
    throw new Error('Replace placeholder keys with real Steadfast keys');
  }
  PropertiesService.getScriptProperties().setProperties({
    STEADFAST_API_KEY: apiKey,
    STEADFAST_SECRET_KEY: secretKey
  });
}

var SHEET_NAME = 'Orders';
var PROP_SS_ID = 'JARNAZ_ORDERS_SPREADSHEET_ID';
var STEADFAST_API = 'https://portal.packzy.com/api/v1/create_order';
var ORDER_HEADERS = [
  'id', 'createdAt', 'formattedTime', 'name', 'phone', 'address', 'note',
  'productCode', 'size', 'qty', 'combo', 'total', 'status', 'source',
  'confirmedAt', 'steadfastTracking', 'steadfastConsignmentId',
  'courierName', 'consignmentNo', 'courierCharge', 'shippingNote', 'called',
  'paymentMethod', 'paymentStatus', 'courierStatus', 'courierPhone',
  'cancelReason', 'returnStatus', 'returnReason', 'refundStatus',
  'refundAmount', 'refundMethod', 'refundNote', 'returnDate',
  'timeline', 'updatedAt', 'updatedBy'
];

function getSheet_() {
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty(PROP_SS_ID);
  var ss = null;

  if (ssId) {
    try {
      ss = SpreadsheetApp.openById(ssId);
    } catch (e) {
      ss = null;
    }
  }

  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  if (!ss) {
    ss = SpreadsheetApp.create('Jarnaz-Gallery-Orders');
  }

  props.setProperty(PROP_SS_ID, ss.getId());

  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(ORDER_HEADERS);
  } else {
    ensureOrderHeaders_(sheet);
  }
  return sheet;
}

function ensureOrderHeaders_(sheet) {
  var needed = ORDER_HEADERS.length;
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var prefixOk = true;
  var oldLen = 22;
  for (var p = 0; p < Math.min(oldLen, headers.length); p++) {
    if (String(headers[p] || '') && String(headers[p]) !== ORDER_HEADERS[p]) {
      prefixOk = false;
      break;
    }
  }
  if (prefixOk) {
    try {
      if (lastCol < needed) sheet.insertColumnsAfter(Math.max(lastCol, 1), needed - lastCol);
    } catch (colErr) {}
    sheet.getRange(1, 1, 1, needed).setValues([ORDER_HEADERS]);
    return;
  }
  sheet.getRange(1, 1, 1, needed).setValues([ORDER_HEADERS]);
}

function stringifyTimeline_(raw) {
  if (Object.prototype.toString.call(raw) === '[object Array]') {
    return JSON.stringify(raw);
  }
  var text = String(raw || '').trim();
  if (!text) return '[]';
  try {
    var parsed = JSON.parse(text);
    return JSON.stringify(Object.prototype.toString.call(parsed) === '[object Array]' ? parsed : []);
  } catch (err) {
    return '[]';
  }
}

function parseTimeline_(raw) {
  if (Object.prototype.toString.call(raw) === '[object Array]') return raw;
  var text = String(raw || '').trim();
  if (!text) return [];
  try {
    var parsed = JSON.parse(text);
    return Object.prototype.toString.call(parsed) === '[object Array]' ? parsed : [];
  } catch (err) {
    return [];
  }
}

function appendTimeline_(existing, entry) {
  var list = parseTimeline_(existing);
  list.push(entry);
  return list;
}

function orderToRow_(order) {
  return [
    order.id, order.createdAt, order.formattedTime, order.name, order.phone,
    order.address, order.note, order.productCode, order.size, order.qty,
    order.combo, order.total, order.status, order.source,
    order.confirmedAt || '',
    order.steadfastTracking || '', order.steadfastConsignmentId || '',
    order.courierName || '', order.consignmentNo || '',
    order.courierCharge != null ? order.courierCharge : '',
    order.shippingNote || '',
    order.called || '',
    order.paymentMethod || 'COD',
    order.paymentStatus || 'pending',
    order.courierStatus || '',
    order.courierPhone || '',
    order.cancelReason || '',
    order.returnStatus || '',
    order.returnReason || '',
    order.refundStatus || '',
    order.refundAmount != null && order.refundAmount !== '' ? order.refundAmount : '',
    order.refundMethod || '',
    order.refundNote || '',
    order.returnDate || '',
    stringifyTimeline_(order.timeline),
    order.updatedAt || '',
    order.updatedBy || ''
  ];
}

function normalizeBdPhone_(phone) {
  var digits = String(phone || '').replace(/[^0-9]/g, '');
  if (digits.indexOf('880') === 0 && digits.length >= 13) digits = digits.substring(digits.length - 11);
  else if (digits.indexOf('88') === 0 && digits.length >= 12) digits = '0' + digits.substring(digits.length - 10);
  if (digits.length === 10) digits = '0' + digits;
  return digits;
}

function rowsToOrders_(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var orders = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      obj[headers[c]] = row[c];
    }
    obj.phone = normalizeBdPhone_(obj.phone);
    obj.qty = Number(obj.qty) || 1;
    obj.combo = Number(obj.combo) || 2;
    obj.total = Number(obj.total != null && obj.total !== '' ? obj.total : obj.totalPrice) || 0;
    obj.totalPrice = obj.total;
    obj.confirmedAt = obj.confirmedAt || null;
    obj.steadfastTracking = obj.steadfastTracking || '';
    obj.steadfastConsignmentId = obj.steadfastConsignmentId || '';
    obj.courierName = obj.courierName || '';
    obj.consignmentNo = obj.consignmentNo || '';
    obj.courierCharge = obj.courierCharge === '' || obj.courierCharge == null ? '' : Number(obj.courierCharge);
    obj.shippingNote = obj.shippingNote || '';
    obj.paymentMethod = obj.paymentMethod || 'COD';
    obj.paymentStatus = obj.paymentStatus || 'pending';
    obj.courierStatus = obj.courierStatus || '';
    obj.courierPhone = obj.courierPhone || '';
    obj.cancelReason = obj.cancelReason || '';
    obj.returnStatus = obj.returnStatus || '';
    obj.returnReason = obj.returnReason || '';
    obj.refundStatus = obj.refundStatus || '';
    obj.refundMethod = obj.refundMethod || '';
    obj.refundNote = obj.refundNote || '';
    obj.returnDate = obj.returnDate || '';
    obj.updatedAt = obj.updatedAt || '';
    obj.updatedBy = obj.updatedBy || '';
    obj.timeline = parseTimeline_(obj.timeline);
    orders.push(obj);
  }
  orders.sort(function (a, b) {
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });
  return orders;
}

function findRowIndex_(sheet, id) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 1;
  }
  return -1;
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    return {};
  }
}

function matchPhone_(orderPhone, want) {
  return normalizeBdPhone_(orderPhone) === normalizeBdPhone_(want);
}

function findOrdersByPhone_(sheet, phone) {
  var want = normalizeBdPhone_(phone);
  if (want.length < 10) return [];
  var all = rowsToOrders_(sheet);
  var matched = [];
  for (var i = 0; i < all.length; i++) {
    if (matchPhone_(all[i].phone, want)) matched.push(all[i]);
  }
  return matched;
}

var REVIEW_SHEET = 'Reviews';
var PROP_REVIEW_FOLDER = 'JARNAZ_REVIEW_FOLDER_ID';
var REVIEW_HEADERS = ['id', 'createdAt', 'name', 'text', 'image', 'fileId', 'status'];

function getReviewFolder_() {
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty(PROP_REVIEW_FOLDER);
  var folder = null;
  if (folderId) {
    try {
      folder = DriveApp.getFolderById(folderId);
    } catch (e) {
      folder = null;
    }
  }
  if (!folder) {
    folder = DriveApp.createFolder('Jarnaz-Gallery-Reviews');
    props.setProperty(PROP_REVIEW_FOLDER, folder.getId());
  }
  try {
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (shareErr) {}
  return folder;
}

function getReviewSheet_() {
  var ss = getSheet_().getParent();
  var sheet = ss.getSheetByName(REVIEW_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(REVIEW_SHEET);
    sheet.appendRow(REVIEW_HEADERS);
  } else {
    var lastCol = Math.max(sheet.getLastColumn(), REVIEW_HEADERS.length);
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    for (var i = 0; i < REVIEW_HEADERS.length; i++) {
      if (String(headers[i] || '') !== REVIEW_HEADERS[i]) {
        sheet.getRange(1, 1, 1, REVIEW_HEADERS.length).setValues([REVIEW_HEADERS]);
        break;
      }
    }
  }
  return sheet;
}

function reviewImageUrl_(fileId) {
  return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1200';
}

function rowsToReviews_(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var reviews = [];
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var item = {};
    for (var c = 0; c < headers.length; c++) {
      item[String(headers[c] || '')] = row[c];
    }
    if (item.id) reviews.push(item);
  }
  return reviews;
}

function findReviewRow_(sheet, id) {
  var data = sheet.getDataRange().getValues();
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][0]) === String(id)) return r + 1;
  }
  return -1;
}

function createReview_(body) {
  var raw = String(body.imageBase64 || '').replace(/^data:[^;]+;base64,/, '');
  if (!raw) throw new Error('স্ক্রিনশট ছবি দিন');
  var bytes = Utilities.base64Decode(raw);
  var mime = body.mimeType || 'image/jpeg';
  var blob = Utilities.newBlob(bytes, mime, body.fileName || 'review.jpg');
  var file = getReviewFolder_().createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (shareErr) {}
  var review = {
    id: body.id || ('RV-' + String(Date.now()).slice(-8)),
    createdAt: body.createdAt || new Date().toISOString(),
    name: body.name || '',
    text: body.text || '',
    image: reviewImageUrl_(file.getId()),
    fileId: file.getId(),
    status: 'confirmed'
  };
  getReviewSheet_().appendRow([
    review.id, review.createdAt, review.name, review.text,
    review.image, review.fileId, review.status
  ]);
  return review;
}

function deleteReview_(id) {
  var sheet = getReviewSheet_();
  var row = findReviewRow_(sheet, id);
  if (row < 0) throw new Error('রিভিউ পাওয়া যায়নি');
  var fileId = String(sheet.getRange(row, 6).getValue() || '');
  if (fileId) {
    try { DriveApp.getFileById(fileId).setTrashed(true); } catch (e) {}
  }
  sheet.deleteRow(row);
}

var PROP_CATALOG_FILE = 'JARNAZ_CATALOG_FILE_ID';

function getCatalogFile_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(PROP_CATALOG_FILE);
  var file = null;
  if (id) {
    try {
      file = DriveApp.getFileById(id);
    } catch (e) {
      file = null;
    }
  }
  if (!file) {
    file = getReviewFolder_().createFile(
      'jarnaz-catalog.json',
      '{"products":[],"offers":[],"site":null}',
      MimeType.PLAIN_TEXT
    );
    props.setProperty(PROP_CATALOG_FILE, file.getId());
  }
  return file;
}

function readCatalog_() {
  try {
    var data = JSON.parse(getCatalogFile_().getBlob().getDataAsString() || '{}');
    return {
      products: data.products && data.products.length ? data.products : [],
      offers: data.offers && data.offers.length ? data.offers : [],
      site: data.site || null,
      updatedAt: data.updatedAt || ''
    };
  } catch (err) {
    return { products: [], offers: [], site: null, updatedAt: '' };
  }
}

function writeCatalog_(data) {
  var out = {
    products: data.products || [],
    offers: data.offers || [],
    site: data.site || null,
    updatedAt: new Date().toISOString()
  };
  getCatalogFile_().setContent(JSON.stringify(out));
  return out;
}

function saveCatalogImage_(body) {
  var raw = String(body.imageBase64 || '').replace(/^data:[^;]+;base64,/, '');
  if (!raw) return '';
  var bytes = Utilities.base64Decode(raw);
  var blob = Utilities.newBlob(bytes, body.mimeType || 'image/jpeg', body.fileName || 'item.jpg');
  var file = getReviewFolder_().createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (shareErr) {}
  return 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1200';
}

function seedCatalog_(cat, body) {
  if ((!cat.products || !cat.products.length) && body.seedProducts && body.seedProducts.length) {
    cat.products = body.seedProducts;
  }
  if ((!cat.offers || !cat.offers.length) && body.seedOffers && body.seedOffers.length) {
    cat.offers = body.seedOffers;
  }
  return cat;
}

function upsertCatalogItem_(list, incoming, oldCode, imageUrl) {
  var code = String((incoming && incoming.code) || oldCode || '');
  if (!code) throw new Error('কোড লাগবে');
  var found = -1;
  var want = String(oldCode || code);
  for (var i = 0; i < list.length; i++) {
    if (String(list[i].code) === want) {
      found = i;
      break;
    }
  }
  var item = found >= 0 ? list[found] : {};
  item.code = code;
  if (incoming.name != null) item.name = incoming.name;
  if (incoming.title != null) item.title = incoming.title;
  if (incoming.price != null && incoming.price !== '') item.price = Number(incoming.price);
  if (incoming.price36 != null && incoming.price36 !== '') item.price36 = Number(incoming.price36);
  if (incoming.piece != null && incoming.piece !== '') item.piece = Number(incoming.piece);
  if (incoming.priority != null && incoming.priority !== '') item.priority = Number(incoming.priority);
  if (incoming.description != null) item.description = incoming.description;
  if (imageUrl) item.image = imageUrl;
  else if (incoming.image && String(incoming.image).indexOf('data:') !== 0) item.image = incoming.image;
  if (found >= 0) list[found] = item;
  else list.unshift(item);
  return item;
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action) : '';
    var phone = (e && e.parameter && e.parameter.phone) ? String(e.parameter.phone) : '';
    if (action === 'boot' || action === 'storefront') {
      return jsonOut_({
        success: true,
        catalog: readCatalog_(),
        reviews: rowsToReviews_(getReviewSheet_())
      });
    }
    if (action === 'reviews' || action === 'reviewList') {
      return jsonOut_({ success: true, reviews: rowsToReviews_(getReviewSheet_()) });
    }
    if (action === 'catalog' || action === 'catalogGet') {
      return jsonOut_({
        success: true,
        catalog: readCatalog_(),
        reviews: rowsToReviews_(getReviewSheet_())
      });
    }
    var sheet = getSheet_();
    if (action === 'find' && phone) {
      return jsonOut_({ success: true, orders: findOrdersByPhone_(sheet, phone) });
    }
    return jsonOut_({ success: true, orders: rowsToOrders_(sheet) });
  } catch (err) {
    return jsonOut_({ success: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var body = parseBody_(e);
    var action = body.action || 'create';

    if (action === 'boot' || action === 'storefront' || action === 'catalog' || action === 'catalogGet') {
      return jsonOut_({
        success: true,
        catalog: readCatalog_(),
        reviews: rowsToReviews_(getReviewSheet_())
      });
    }
    if (action === 'reviewList' || action === 'reviews') {
      return jsonOut_({ success: true, reviews: rowsToReviews_(getReviewSheet_()) });
    }

    var sheet = getSheet_();

    if (action === 'list') {
      return jsonOut_({ success: true, orders: rowsToOrders_(sheet) });
    }

    if (action === 'find') {
      return jsonOut_({ success: true, orders: findOrdersByPhone_(sheet, body.phone) });
    }

    if (action === 'reviewCreate') {
      try {
        var made = createReview_(body);
        return jsonOut_({ success: true, review: made });
      } catch (revErr) {
        return jsonOut_({ success: false, error: String(revErr.message || revErr) });
      }
    }

    if (action === 'reviewDelete') {
      try {
        deleteReview_(body.id);
        return jsonOut_({ success: true, message: 'মুছে ফেলা হয়েছে' });
      } catch (delErr) {
        return jsonOut_({ success: false, error: String(delErr.message || delErr) });
      }
    }

    if (action === 'catalogSave') {
      var cur = seedCatalog_(readCatalog_(), body);
      if (body.products) cur.products = body.products;
      if (body.offers) cur.offers = body.offers;
      if (body.site) cur.site = body.site;
      return jsonOut_({ success: true, catalog: writeCatalog_(cur) });
    }

    if (action === 'productUpsert') {
      try {
        var catP = seedCatalog_(readCatalog_(), body);
        var imageP = body.imageBase64 ? saveCatalogImage_(body) : '';
        var product = upsertCatalogItem_(catP.products, body.product || {}, body.oldCode, imageP);
        writeCatalog_(catP);
        return jsonOut_({ success: true, product: product, catalog: catP });
      } catch (pErr) {
        return jsonOut_({ success: false, error: String(pErr.message || pErr) });
      }
    }

    if (action === 'productDelete') {
      var catDel = seedCatalog_(readCatalog_(), body);
      var delCode = String(body.code || '');
      var nextP = [];
      for (var pi = 0; pi < catDel.products.length; pi++) {
        if (String(catDel.products[pi].code) !== delCode) nextP.push(catDel.products[pi]);
      }
      catDel.products = nextP;
      return jsonOut_({ success: true, catalog: writeCatalog_(catDel) });
    }

    if (action === 'offerUpsert') {
      try {
        var catO = seedCatalog_(readCatalog_(), body);
        var imageO = body.imageBase64 ? saveCatalogImage_(body) : '';
        var offer = upsertCatalogItem_(catO.offers, body.offer || body.product || {}, body.oldCode, imageO);
        writeCatalog_(catO);
        return jsonOut_({ success: true, offer: offer, catalog: catO });
      } catch (oErr) {
        return jsonOut_({ success: false, error: String(oErr.message || oErr) });
      }
    }

    if (action === 'offerDelete') {
      var catOd = seedCatalog_(readCatalog_(), body);
      var delOffer = String(body.code || '');
      var nextO = [];
      for (var oi = 0; oi < catOd.offers.length; oi++) {
        if (String(catOd.offers[oi].code) !== delOffer) nextO.push(catOd.offers[oi]);
      }
      catOd.offers = nextO;
      return jsonOut_({ success: true, catalog: writeCatalog_(catOd) });
    }

    if (action === 'create') {
      var now = new Date();
      var total = Number(body.total != null ? body.total : body.totalPrice) || 0;
      var order = {
        id: body.id || ('JZ-' + Math.floor(100000 + Math.random() * 900000)),
        createdAt: body.createdAt || now.toISOString(),
        formattedTime: body.formattedTime || Utilities.formatDate(now, 'Asia/Dhaka', 'yyyy-MM-dd HH:mm:ss'),
        name: body.name || '',
        phone: normalizeBdPhone_(body.phone),
        address: body.address || '',
        note: body.note || '',
        productCode: body.productCode || '',
        size: body.size || '',
        qty: Number(body.qty) || 1,
        combo: Number(body.combo) || 2,
        total: total,
        status: body.status || 'new',
        source: body.source || 'web',
        confirmedAt: body.confirmedAt || '',
        steadfastTracking: '',
        steadfastConsignmentId: '',
        courierName: body.courierName || '',
        consignmentNo: '',
        courierCharge: '',
        shippingNote: '',
        called: '',
        paymentMethod: body.paymentMethod || 'COD',
        paymentStatus: body.paymentStatus || 'pending',
        courierStatus: '',
        courierPhone: '',
        cancelReason: '',
        returnStatus: '',
        returnReason: '',
        refundStatus: '',
        refundAmount: '',
        refundMethod: '',
        refundNote: '',
        returnDate: '',
        timeline: stringifyTimeline_(body.timeline || [{
          at: body.createdAt || now.toISOString(),
          status: body.status || 'new',
          action: 'order_received',
          by: (body.source === 'admin') ? 'Admin' : 'Customer',
          note: 'Order received'
        }]),
        updatedAt: now.toISOString(),
        updatedBy: body.updatedBy || (body.source === 'admin' ? 'Admin' : 'Customer')
      };
      if (!order.name || !order.phone || !order.address || !order.productCode || !order.size) {
        return jsonOut_({ success: false, error: 'নাম, মোবাইল, ঠিকানা, প্রোডাক্ট ও সাইজ দিন' });
      }
      sheet.appendRow(orderToRow_(order));
      return jsonOut_({ success: true, order: order, message: 'অর্ডার সেভ হয়েছে' });
    }

    if (action === 'update') {
      var id = body.id;
      var row = findRowIndex_(sheet, id);
      if (row < 0) return jsonOut_({ success: false, error: 'অর্ডার পাওয়া যায়নি' });
      var orders = rowsToOrders_(sheet);
      var existing = null;
      for (var i = 0; i < orders.length; i++) {
        if (String(orders[i].id) === String(id)) existing = orders[i];
      }
      if (!existing) return jsonOut_({ success: false, error: 'অর্ডার পাওয়া যায়নি' });

      var prevStatus = String(existing.status || 'new');
      var patchKeys = [
        'name', 'phone', 'address', 'note', 'productCode', 'size', 'source',
        'called', 'steadfastTracking', 'steadfastConsignmentId', 'courierName',
        'consignmentNo', 'shippingNote', 'paymentMethod', 'paymentStatus',
        'courierStatus', 'courierPhone', 'cancelReason', 'returnStatus',
        'returnReason', 'refundStatus', 'refundMethod', 'refundNote', 'returnDate',
        'updatedBy'
      ];
      for (var pk = 0; pk < patchKeys.length; pk++) {
        if (body[patchKeys[pk]] !== undefined) existing[patchKeys[pk]] = body[patchKeys[pk]];
      }
      if (body.status) {
        existing.status = body.status;
        if (body.status === 'confirmed' && !existing.confirmedAt) {
          existing.confirmedAt = new Date().toISOString();
        }
        if (body.status === 'delivered' && (!existing.paymentStatus || existing.paymentStatus === 'pending') && String(existing.paymentMethod || 'COD') === 'COD') {
          existing.paymentStatus = 'paid';
        }
        if (body.status === 'refunded') existing.paymentStatus = 'refunded';
      }
      if (body.qty !== undefined) existing.qty = Number(body.qty) || 1;
      if (body.combo !== undefined) existing.combo = Number(body.combo) || 2;
      if (body.total !== undefined) existing.total = Number(body.total) || 0;
      if (body.totalPrice !== undefined && body.total === undefined) existing.total = Number(body.totalPrice) || 0;
      if (body.courierCharge !== undefined) existing.courierCharge = body.courierCharge;
      if (body.refundAmount !== undefined) existing.refundAmount = body.refundAmount;
      if (body.timeline !== undefined) {
        existing.timeline = stringifyTimeline_(body.timeline);
      } else if (body.status && String(body.status) !== prevStatus) {
        existing.timeline = stringifyTimeline_(appendTimeline_(existing.timeline, {
          at: new Date().toISOString(),
          status: body.status,
          action: body.timelineAction || ('status_' + body.status),
          by: body.updatedBy || 'Admin',
          note: body.timelineNote || body.cancelReason || body.returnReason || ('Status → ' + body.status)
        }));
      }
      existing.updatedAt = new Date().toISOString();
      if (!existing.updatedBy) existing.updatedBy = body.updatedBy || 'Admin';

      sheet.getRange(row, 1, 1, ORDER_HEADERS.length).setValues([orderToRow_(existing)]);
      return jsonOut_({ success: true, order: existing });
    }

    if (action === 'delete') {
      var delId = body.id;
      var delRow = findRowIndex_(sheet, delId);
      if (delRow < 0) return jsonOut_({ success: false, error: 'অর্ডার পাওয়া যায়নি' });
      sheet.deleteRow(delRow);
      return jsonOut_({ success: true, message: 'মুছে ফেলা হয়েছে' });
    }

    if (action === 'steadfastStatus') {
      var sProps = PropertiesService.getScriptProperties();
      return jsonOut_({
        success: true,
        configured: !!(sProps.getProperty('STEADFAST_API_KEY') && sProps.getProperty('STEADFAST_SECRET_KEY'))
      });
    }

    if (action === 'setSteadfastCredentials') {
      try {
        saveSteadfastKeys_(body.apiKey, body.secretKey);
      } catch (credErr) {
        return jsonOut_({ success: false, error: String(credErr.message || credErr) });
      }
      return jsonOut_({
        success: true,
        configured: true,
        message: 'Steadfast API keys saved securely on server'
      });
    }

    if (action === 'sendSteadfast') {
      var sfProps = PropertiesService.getScriptProperties();
      var apiKey = sfProps.getProperty('STEADFAST_API_KEY');
      var secretKey = sfProps.getProperty('STEADFAST_SECRET_KEY');
      if (!apiKey || !secretKey) {
        return jsonOut_({
          success: false,
          error: 'Steadfast API Key not set. Open Admin → অর্ডার সিঙ্ক → Steadfast and save keys.'
        });
      }

      var sfOrders = rowsToOrders_(sheet);
      var sfOrder = null;
      for (var si = 0; si < sfOrders.length; si++) {
        if (String(sfOrders[si].id) === String(body.id)) sfOrder = sfOrders[si];
      }
      if (!sfOrder && body.order) sfOrder = body.order;
      if (!sfOrder) return jsonOut_({ success: false, error: 'অর্ডার পাওয়া যায়নি' });

      var phone11 = normalizeBdPhone_(sfOrder.phone);
      if (phone11.length !== 11) {
        return jsonOut_({ success: false, error: 'মোবাইল নম্বর ১১ ডিজিট হতে হবে (01XXXXXXXXX)' });
      }

      var invoice = String(sfOrder.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
      if (!invoice) invoice = 'JZ-' + Date.now();

      var itemDesc = [
        sfOrder.productCode || 'Jarnaz set',
        sfOrder.size ? ('সাইজ ' + sfOrder.size) : '',
        (sfOrder.qty || 1) + ' সেট'
      ].filter(Boolean).join(' · ');

      var payload = {
        invoice: invoice,
        recipient_name: String(sfOrder.name || '').substring(0, 100),
        recipient_phone: phone11,
        recipient_address: String(sfOrder.address || '').substring(0, 250),
        cod_amount: Number(sfOrder.total) || 0,
        note: String(sfOrder.note || '').substring(0, 480),
        item_description: itemDesc.substring(0, 250),
        total_lot: Number(sfOrder.qty) || 1,
        delivery_type: 0
      };

      var sfRes = UrlFetchApp.fetch(STEADFAST_API, {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'Api-Key': apiKey,
          'Secret-Key': secretKey
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });

      var sfCode = sfRes.getResponseCode();
      var sfText = sfRes.getContentText();
      var sfJson = {};
      try { sfJson = JSON.parse(sfText); } catch (parseErr) {
        return jsonOut_({ success: false, error: 'Steadfast invalid response: ' + sfText });
      }

      if (sfCode >= 400 || (sfJson.status && Number(sfJson.status) >= 400)) {
        return jsonOut_({
          success: false,
          error: (sfJson.message || sfJson.error || ('Steadfast error ' + sfCode))
        });
      }

      var consignment = sfJson.consignment || sfJson.data || {};
      var tracking = consignment.tracking_code || sfJson.tracking_code || '';
      var consignmentId = consignment.consignment_id || sfJson.consignment_id || '';

      sfOrder.steadfastTracking = tracking;
      sfOrder.steadfastConsignmentId = String(consignmentId || '');
      sfOrder.courierName = 'Steadfast';
      sfOrder.consignmentNo = tracking || sfOrder.consignmentNo || '';
      sfOrder.courierStatus = 'consignment_created';
      sfOrder.updatedAt = new Date().toISOString();
      sfOrder.updatedBy = 'Admin';
      sfOrder.timeline = stringifyTimeline_(appendTimeline_(sfOrder.timeline, {
        at: new Date().toISOString(),
        status: sfOrder.status,
        action: 'sent_to_courier',
        by: 'Admin',
        note: 'Order sent to Steadfast' + (tracking ? (' · ' + tracking) : '')
      }));

      var sfRow = findRowIndex_(sheet, sfOrder.id);
      if (sfRow > 0) {
        sheet.getRange(sfRow, 1, 1, ORDER_HEADERS.length).setValues([orderToRow_(sfOrder)]);
      }

      return jsonOut_({
        success: true,
        message: 'Steadfast-এ পাঠানো হয়েছে',
        order: sfOrder,
        tracking: tracking,
        consignmentId: consignmentId,
        steadfast: sfJson
      });
    }

    return jsonOut_({ success: false, error: 'Unknown action' });
  } catch (err) {
    return jsonOut_({ success: false, error: String(err) });
  }
}
