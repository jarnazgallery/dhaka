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
  'courierName', 'consignmentNo', 'courierCharge', 'shippingNote', 'called'
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
  var lastCol = Math.max(sheet.getLastColumn(), needed);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  for (var i = 0; i < needed; i++) {
    if (String(headers[i] || '') !== ORDER_HEADERS[i]) {
      sheet.getRange(1, 1, 1, needed).setValues([ORDER_HEADERS]);
      break;
    }
  }
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
    order.called || ''
  ];
}

function normalizeBdPhone_(phone) {
  var digits = String(phone || '').replace(/[^0-9]/g, '');
  if (digits.indexOf('88') === 0 && digits.length >= 13) digits = digits.substring(digits.length - 11);
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

function doGet(e) {
  try {
    var sheet = getSheet_();
    var action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action) : '';
    var phone = (e && e.parameter && e.parameter.phone) ? String(e.parameter.phone) : '';
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
    var sheet = getSheet_();

    if (action === 'list') {
      return jsonOut_({ success: true, orders: rowsToOrders_(sheet) });
    }

    if (action === 'find') {
      return jsonOut_({ success: true, orders: findOrdersByPhone_(sheet, body.phone) });
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
        courierName: '',
        consignmentNo: '',
        courierCharge: '',
        shippingNote: '',
        called: ''
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

      if (body.status) {
        existing.status = body.status;
        if (body.status === 'confirmed' && !existing.confirmedAt) {
          existing.confirmedAt = new Date().toISOString();
        }
      }
      if (body.name !== undefined) existing.name = body.name;
      if (body.phone !== undefined) existing.phone = body.phone;
      if (body.address !== undefined) existing.address = body.address;
      if (body.note !== undefined) existing.note = body.note;
      if (body.productCode !== undefined) existing.productCode = body.productCode;
      if (body.size !== undefined) existing.size = body.size;
      if (body.qty !== undefined) existing.qty = Number(body.qty) || 1;
      if (body.combo !== undefined) existing.combo = Number(body.combo) || 2;
      if (body.total !== undefined) existing.total = Number(body.total) || 0;
      if (body.totalPrice !== undefined && body.total === undefined) existing.total = Number(body.totalPrice) || 0;
      if (body.source !== undefined) existing.source = body.source;
      if (body.steadfastTracking !== undefined) existing.steadfastTracking = body.steadfastTracking;
      if (body.steadfastConsignmentId !== undefined) existing.steadfastConsignmentId = body.steadfastConsignmentId;
      if (body.courierName !== undefined) existing.courierName = body.courierName;
      if (body.consignmentNo !== undefined) existing.consignmentNo = body.consignmentNo;
      if (body.courierCharge !== undefined) existing.courierCharge = body.courierCharge;
      if (body.shippingNote !== undefined) existing.shippingNote = body.shippingNote;
      if (body.called !== undefined) existing.called = body.called;

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
      sfOrder.courierName = sfOrder.courierName || 'Steadfast';
      sfOrder.consignmentNo = tracking || sfOrder.consignmentNo || '';
      if (sfOrder.status === 'confirmed' || sfOrder.status === 'new') {
        sfOrder.status = 'delivered';
      }

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
