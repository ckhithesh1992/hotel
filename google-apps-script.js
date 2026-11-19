/**
 * Google Apps Script for the Hanuman Heritage booking website
 * Project: "Hanuman Heritage Bookings API" (script.google.com, account hanumanheritage@gmail.com)
 *
 * - doPost: the website sends each booking here; it is added to the "Bookings" tab
 *   with status "Pending Payment", and you get an email.
 * - Razorpay: action "createOrder" saves the booking and creates a Razorpay order with the
 *   price worked out here (never trusted from the browser); action "verifyPayment" checks
 *   Razorpay's signature and marks the booking Confirmed. Keys live in Project Settings →
 *   Script Properties: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET (never in the website code).
 * - testRazorpay: run from the editor to check the keys work (also grants permission
 *   to contact Razorpay the first time).
 * - setupDashboard: run once from the editor (select it, click Run) to build the
 *   "Dashboard" tab, the status dropdown and colours. Safe to run again.
 *
 * After changing this code: Save, then Deploy → Manage deployments → edit (pencil)
 * → Version: New version → Deploy. Editing the existing deployment keeps the same URL.
 */

// ID of the "Hanuman Heritage Website Bookings" Google Sheet
const SHEET_ID = '1qCEr1_7xYf8aQcWFgBT3T16lRe-IeXQSJPvrLg6mU_s';
const BOOKINGS_TAB = 'Bookings';
const DASHBOARD_TAB = 'Dashboard';

const HEADERS = [
  'Booking ID', 'Booking Date', 'Guest Name', 'Phone', 'Email',
  'Check-In', 'Check-Out', 'Adults', 'Children', 'Nights',
  'Rooms', 'Subtotal', 'GST', 'Total', 'Status',
  'Amount Received', 'UPI Ref / UTR', 'Notes', 'Payment Method', 'Razorpay Order ID'
];
const COL = { status: 15, received: 16, ref: 17, method: 19, order: 20 };

// Room prices per night before GST. Keep in step with the website (script.js).
const ROOMS = {
  1: { name: 'Deluxe Room (Non-AC)', price: 2000 },
  2: { name: 'Deluxe Room (AC)', price: 2500 },
  3: { name: 'Twin Sharing Room', price: 2500 },
  4: { name: 'Quade Suite', price: 3500 },
  5: { name: 'Seven Wonders', price: 4500 },
  6: { name: 'Twin Heritage Suite (AC)', price: 3000 }
};
const GST_RATE = 0.05;

const STATUSES = ['Pending Payment', 'Confirmed', 'Checked In', 'Checked Out', 'Cancelled', 'No Show'];

// Email that receives a notification for each new booking.
// Leave empty to use the Google account that owns this script.
const NOTIFY_EMAIL = '';

function getBookingsSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(BOOKINGS_TAB);
  if (!sheet) {
    sheet = ss.getSheets()[0];
    sheet.setName(BOOKINGS_TAB);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function toDate_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') return value;
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : value;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ success: false, error: 'Bad request' });
  }
  try {
    if (data.action === 'createOrder') return json_(createOrder_(data));
    if (data.action === 'verifyPayment') return json_(verifyPayment_(data));
    saveBooking_(data);
    return json_({ success: true });
  } catch (error) {
    console.error(error);
    return json_({ success: false, error: String(error && error.message || error) });
  }
}

function saveBooking_(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getBookingsSheet_();

    sheet.appendRow([
      data.bookingId || '',
      data.bookingDate ? new Date(data.bookingDate) : new Date(),
      data.guestName || '',
      "'" + (data.guestPhone || ''),   // leading ' keeps the number as text
      data.guestEmail || '',
      toDate_(data.checkIn),
      toDate_(data.checkOut),
      data.adults || 0,
      data.children || 0,
      data.nights || 0,
      data.roomName || '',
      data.subtotal || 0,
      data.gst || 0,
      data.total || 0,
      data.status || 'Pending Payment'
    ]);

    try {
      const to = NOTIFY_EMAIL || Session.getEffectiveUser().getEmail();
      if (to) {
        MailApp.sendEmail(
          to,
          'New booking ' + data.bookingId + ' – ₹' + data.total + ' – ' + (data.guestName || ''),
          'New booking request on hanumanheritage.com\n\n' +
          'Booking ID: ' + data.bookingId + '\n' +
          'Guest: ' + data.guestName + '\n' +
          'Phone: ' + data.guestPhone + '\n' +
          'Email: ' + (data.guestEmail || '-') + '\n' +
          'Stay: ' + data.checkIn + ' to ' + data.checkOut + ' (' + data.nights + ' nights)\n' +
          'Rooms: ' + data.roomName + '\n' +
          'Guests: ' + data.adults + ' adults, ' + data.children + ' children\n' +
          'Subtotal: ₹' + data.subtotal + '  GST: ₹' + data.gst + '  Total: ₹' + data.total + '\n\n' +
          'Status: Pending Payment. When the UPI payment arrives, set Status to Confirmed in the ' +
          'Bookings tab, fill in Amount Received and the UPI reference, and message the guest.'
        );
      }
    } catch (mailError) {
      console.error(mailError); // a mail failure must not lose the booking row
    }

    return sheet.getLastRow();
  } finally {
    lock.releaseLock();
  }
}

// ===== Razorpay =====
function rzpKeys_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('RAZORPAY_KEY_ID');
  const secret = props.getProperty('RAZORPAY_KEY_SECRET');
  if (!id || !secret) throw new Error('Razorpay keys are not set in Script Properties');
  return { id: id.trim(), secret: secret.trim() };
}

function rzpFetch_(method, path, payload) {
  const k = rzpKeys_();
  const res = UrlFetchApp.fetch('https://api.razorpay.com/v1' + path, {
    method: method,
    contentType: 'application/json',
    payload: payload ? JSON.stringify(payload) : undefined,
    headers: { Authorization: 'Basic ' + Utilities.base64Encode(k.id + ':' + k.secret) },
    muteHttpExceptions: true
  });
  const body = JSON.parse(res.getContentText() || '{}');
  if (res.getResponseCode() >= 300) {
    throw new Error('Razorpay: ' + ((body.error && body.error.description) || res.getResponseCode()));
  }
  return body;
}

function nightsBetween_(a, b) {
  const d1 = toDate_(a), d2 = toDate_(b);
  if (!(d1 instanceof Date) || !(d2 instanceof Date)) throw new Error('Invalid dates');
  const n = Math.round((d2 - d1) / 86400000);
  if (n < 1 || n > 60) throw new Error('Invalid number of nights');
  return n;
}

// Works out the price on the server from room IDs, quantities and dates.
function price_(data) {
  const nights = nightsBetween_(data.checkIn, data.checkOut);
  let subtotal = 0;
  const parts = [];
  (data.items || []).forEach(it => {
    const room = ROOMS[Number(it.roomId)];
    const qty = Math.floor(Number(it.qty));
    if (!room || !(qty >= 1 && qty <= 10)) throw new Error('Invalid room selection');
    subtotal += room.price * qty * nights;
    parts.push(qty + ' × ' + room.name);
  });
  if (!parts.length) throw new Error('No rooms selected');
  const gst = Math.round(subtotal * GST_RATE * 100) / 100;
  const total = Math.round((subtotal + gst) * 100) / 100;
  return { nights: nights, subtotal: subtotal, gst: gst, total: total, roomName: parts.join('; ') };
}

function createOrder_(data) {
  const p = price_(data);
  const bookingId = String(data.bookingId || ('HH' + Date.now())).replace(/[^A-Za-z0-9-]/g, '').slice(0, 30);
  const row = saveBooking_({
    bookingId: bookingId,
    bookingDate: data.bookingDate,
    guestName: String(data.guestName || '').slice(0, 80),
    guestPhone: String(data.guestPhone || '').slice(0, 20),
    guestEmail: String(data.guestEmail || '').slice(0, 120),
    checkIn: data.checkIn,
    checkOut: data.checkOut,
    adults: Number(data.adults) || 0,
    children: Number(data.children) || 0,
    nights: p.nights,
    roomName: p.roomName,
    subtotal: p.subtotal,
    gst: p.gst,
    total: p.total,
    status: 'Pending Payment'
  });

  let order = null;
  try {
    order = rzpFetch_('post', '/orders', {
      amount: Math.round(p.total * 100),
      currency: 'INR',
      receipt: bookingId,
      notes: { booking_id: bookingId, guest: String(data.guestName || '').slice(0, 80) }
    });
    getBookingsSheet_().getRange(row, COL.order).setValue(order.id);
  } catch (err) {
    console.error(err); // booking is saved; the guest can still pay by UPI
    return { success: true, bookingId: bookingId, total: p.total, orderId: null, error: String(err.message || err) };
  }
  return { success: true, bookingId: bookingId, total: p.total, orderId: order.id, keyId: rzpKeys_().id };
}

function hex_(bytes) {
  return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

function findRowByOrder_(sheet, orderId) {
  const last = sheet.getLastRow();
  if (last < 2) return 0;
  const ids = sheet.getRange(2, COL.order, last - 1, 1).getValues();
  for (let i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0]) === orderId) return i + 2;
  }
  return 0;
}

function verifyPayment_(data) {
  const orderId = String(data.razorpay_order_id || '');
  const paymentId = String(data.razorpay_payment_id || '');
  const signature = String(data.razorpay_signature || '');
  const expected = hex_(Utilities.computeHmacSha256Signature(orderId + '|' + paymentId, rzpKeys_().secret));
  if (!orderId || !paymentId || expected !== signature) {
    return { success: false, error: 'Payment could not be verified' };
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getBookingsSheet_();
    const row = findRowByOrder_(sheet, orderId);
    if (!row) return { success: false, error: 'Booking not found for this payment' };
    let amount = '';
    let method = 'Razorpay';
    try {
      const pay = rzpFetch_('get', '/payments/' + encodeURIComponent(paymentId));
      amount = (pay.amount || 0) / 100;
      method = 'Razorpay ' + (pay.method || '');
    } catch (err) { console.error(err); }
    sheet.getRange(row, COL.status).setValue('Confirmed');
    sheet.getRange(row, COL.received).setValue(amount);
    sheet.getRange(row, COL.ref).setValue(paymentId);
    sheet.getRange(row, COL.method).setValue(method.trim());
    const bookingId = sheet.getRange(row, 1).getValue();
    try {
      const to = NOTIFY_EMAIL || Session.getEffectiveUser().getEmail();
      MailApp.sendEmail(to, 'Paid: booking ' + bookingId + ' – ₹' + amount,
        'Razorpay payment received for booking ' + bookingId + '.\nPayment ID: ' + paymentId +
        '\nThe booking is now Confirmed in your dashboard. Message the guest to welcome them.');
    } catch (err) { console.error(err); }
    return { success: true, bookingId: bookingId, status: 'Confirmed' };
  } finally {
    lock.releaseLock();
  }
}

// Run from the editor to check the keys (first run asks for permission to contact Razorpay).
function testRazorpay() {
  const res = rzpFetch_('get', '/orders?count=1');
  Logger.log('Razorpay keys work. Mode: ' + (rzpKeys_().id.indexOf('rzp_live_') === 0 ? 'LIVE' : 'TEST') +
             '. Orders visible: ' + (res.count || 0));
}

// Run from the editor any time: marks Pending bookings as Confirmed if Razorpay shows them paid
// (covers a guest who paid but closed the page before the website could confirm).
function checkPendingPayments() {
  const sheet = getBookingsSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return;
  const rows = sheet.getRange(2, 1, last - 1, COL.order).getValues();
  rows.forEach((r, i) => {
    const orderId = r[COL.order - 1];
    if (!orderId || r[COL.status - 1] !== 'Pending Payment') return;
    const pays = rzpFetch_('get', '/orders/' + orderId + '/payments');
    const paid = (pays.items || []).filter(p => p.status === 'captured')[0];
    if (paid) {
      const row = i + 2;
      sheet.getRange(row, COL.status).setValue('Confirmed');
      sheet.getRange(row, COL.received).setValue(paid.amount / 100);
      sheet.getRange(row, COL.ref).setValue(paid.id);
      sheet.getRange(row, COL.method).setValue('Razorpay ' + paid.method);
      Logger.log('Confirmed ' + r[0]);
    }
  });
}

function doGet(e) {
  // Health check only. Booking data is never served publicly.
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Builds the dashboard. Run once from the editor; safe to run again.
 */
function setupDashboard() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const b = getBookingsSheet_();

  // --- Bookings tab: headers, formats, dropdown, colours ---
  b.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight('bold').setBackground('#1E4535').setFontColor('#FFFFFF');
  b.setFrozenRows(1);
  b.setFrozenColumns(1);

  // Convert any text dates from older rows into real dates
  const last = Math.max(b.getLastRow(), 2);
  if (b.getLastRow() > 1) {
    const rng = b.getRange(2, 6, b.getLastRow() - 1, 2);
    rng.setValues(rng.getValues().map(r => [toDate_(r[0]), toDate_(r[1])]));
    const bd = b.getRange(2, 2, b.getLastRow() - 1, 1);
    bd.setValues(bd.getValues().map(r => [r[0] && typeof r[0] === 'string' && /^\d{4}-/.test(r[0]) ? new Date(r[0]) : r[0]]));
  }

  const maxRows = Math.max(b.getMaxRows(), 1000);
  if (b.getMaxRows() < maxRows) b.insertRowsAfter(b.getMaxRows(), maxRows - b.getMaxRows());
  b.getRange(2, 2, maxRows - 1, 1).setNumberFormat('dd mmm yyyy, hh:mm');
  b.getRange(2, 6, maxRows - 1, 2).setNumberFormat('ddd, dd mmm yyyy');
  b.getRange(2, 12, maxRows - 1, 3).setNumberFormat('₹#,##0.00');
  b.getRange(2, 16, maxRows - 1, 1).setNumberFormat('₹#,##0.00');

  const statusRange = b.getRange(2, 15, maxRows - 1, 1);
  statusRange.setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(true).build()
  );

  const colours = {
    'Pending Payment': '#FCE8C3',
    'Confirmed': '#D4EDDA',
    'Checked In': '#CFE2FF',
    'Checked Out': '#E2E3E5',
    'Cancelled': '#F8D7DA',
    'No Show': '#F8D7DA'
  };
  const rowRange = b.getRange(2, 1, maxRows - 1, HEADERS.length);
  const rules = Object.keys(colours).map(s =>
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$O2="' + s + '"')
      .setBackground(colours[s])
      .setRanges([rowRange])
      .build()
  );
  b.setConditionalFormatRules(rules);
  b.setColumnWidths(1, 1, 140);
  b.setColumnWidth(3, 170);
  b.setColumnWidth(11, 280);
  b.setColumnWidth(15, 140);
  b.setColumnWidth(18, 220);

  // --- Dashboard tab ---
  let d = ss.getSheetByName(DASHBOARD_TAB);
  if (d) d.clear(); else d = ss.insertSheet(DASHBOARD_TAB, 0);
  d.setHiddenGridlines(true);
  ss.setActiveSheet(d);
  ss.moveActiveSheet(1);

  const B = "'" + BOOKINGS_TAB + "'!";
  const live = 'ISNUMBER(MATCH(' + B + 'O2:O,{"Confirmed";"Checked In";"Checked Out"},0))';
  const active = '(' + B + 'O2:O<>"Cancelled")*(' + B + 'O2:O<>"No Show")*(' + B + 'A2:A<>"")';

  d.getRange('A1').setValue('Hanuman Heritage – bookings dashboard')
    .setFontSize(18).setFontWeight('bold').setFontColor('#1E4535');
  d.getRange('A2').setFormula('="Updated "&TEXT(NOW(),"ddd, dd mmm yyyy, hh:mm")&". Change a booking\'s Status in the Bookings tab."')
    .setFontColor('#5B615A');

  const cards = [
    ['Arrivals today', '=SUMPRODUCT((' + B + 'F2:F=TODAY())*' + active + ')'],
    ['Departures today', '=SUMPRODUCT((' + B + 'G2:G=TODAY())*' + active + ')'],
    ['Staying tonight (bookings)', '=SUMPRODUCT((' + B + 'F2:F<=TODAY())*(' + B + 'G2:G>TODAY())*' + active + ')'],
    ['Awaiting payment', '=COUNTIF(' + B + 'O2:O,"Pending Payment")'],
    ['Awaiting payment (₹)', '=SUMIF(' + B + 'O2:O,"Pending Payment",' + B + 'N2:N)'],
    ['Confirmed revenue this month (₹)', '=SUMPRODUCT((TEXT(' + B + 'F2:F,"yyyy-mm")=TEXT(TODAY(),"yyyy-mm"))*' + live + '*' + B + 'N2:N)'],
    ['Confirmed bookings this month', '=SUMPRODUCT((TEXT(' + B + 'F2:F,"yyyy-mm")=TEXT(TODAY(),"yyyy-mm"))*' + live + ')'],
    ['Payments received this month (₹)', '=SUMPRODUCT((TEXT(' + B + 'F2:F,"yyyy-mm")=TEXT(TODAY(),"yyyy-mm"))*IFERROR(--(' + B + 'P2:P),0))']
  ];
  cards.forEach((c, i) => {
    const col = 1 + (i % 4) * 2;
    const row = 4 + Math.floor(i / 4) * 3;
    d.getRange(row, col).setValue(c[0]).setFontColor('#5B615A');
    d.getRange(row + 1, col).setFormula(c[1]).setFontSize(20).setFontWeight('bold').setFontColor('#4A2F1E')
      .setNumberFormat(c[0].indexOf('₹') >= 0 ? '₹#,##0' : '0');
  });

  // Section: awaiting payment
  d.getRange('A11').setValue('Awaiting payment – check your UPI app, then set Status to Confirmed')
    .setFontWeight('bold').setFontSize(13).setFontColor('#1E4535');
  const listHead = ['Booking ID', 'Guest', 'Phone', 'Check-in', 'Check-out', 'Rooms', 'Total', 'Status'];
  d.getRange(12, 1, 1, listHead.length).setValues([listHead]).setFontWeight('bold').setBackground('#F3F4F1');
  const cols = '{' + [B + 'A2:A', B + 'C2:C', B + 'D2:D', B + 'F2:F', B + 'G2:G', B + 'K2:K', B + 'N2:N', B + 'O2:O'].join(',') + '}';
  d.getRange('A13').setFormula('=IFERROR(SORT(FILTER(' + cols + ',' + B + 'O2:O="Pending Payment"),4,TRUE),"Nothing waiting for payment")');

  // Section: upcoming stays
  d.getRange('A26').setValue('Upcoming and current stays (next 30 days)')
    .setFontWeight('bold').setFontSize(13).setFontColor('#1E4535');
  d.getRange(27, 1, 1, listHead.length).setValues([listHead]).setFontWeight('bold').setBackground('#F3F4F1');
  d.getRange('A28').setFormula('=IFERROR(SORT(FILTER(' + cols + ',' + B + 'G2:G>=TODAY(),' + B + 'F2:F<=TODAY()+30,' +
    B + 'O2:O<>"Cancelled",' + B + 'O2:O<>"No Show",' + B + 'A2:A<>""),4,TRUE),"No stays in the next 30 days")');

  // Section: month by month (by check-in month)
  d.getRange('J11').setValue('Month by month (by check-in date)')
    .setFontWeight('bold').setFontSize(13).setFontColor('#1E4535');
  d.getRange('J12:M12').setValues([['Month', 'Confirmed bookings', 'Confirmed revenue (₹)', 'Cancelled']])
    .setFontWeight('bold').setBackground('#F3F4F1');
  for (let i = 0; i < 12; i++) {
    const r = 13 + i;
    d.getRange(r, 10).setFormula('=EOMONTH(TODAY(),' + (i - 6) + ')').setNumberFormat('mmm yyyy');
    const m = 'TEXT(' + B + 'F2:F,"yyyy-mm")=TEXT(J' + r + ',"yyyy-mm")';
    d.getRange(r, 11).setFormula('=SUMPRODUCT((' + m + ')*' + live + ')');
    d.getRange(r, 12).setFormula('=SUMPRODUCT((' + m + ')*' + live + '*' + B + 'N2:N)').setNumberFormat('₹#,##0');
    d.getRange(r, 13).setFormula('=SUMPRODUCT((' + m + ')*(' + B + 'O2:O="Cancelled"))');
  }

  d.getRange('D13:D60').setNumberFormat('ddd, dd mmm');
  d.getRange('E13:E60').setNumberFormat('ddd, dd mmm');
  d.getRange('G13:G60').setNumberFormat('₹#,##0');
  d.setColumnWidth(1, 150);
  d.setColumnWidth(2, 170);
  d.setColumnWidth(3, 110);
  d.setColumnWidths(4, 2, 110);
  d.setColumnWidth(6, 260);
  d.setColumnWidth(7, 90);
  d.setColumnWidth(8, 130);
  d.setColumnWidth(9, 30);
  d.setColumnWidth(10, 100);
  d.setColumnWidths(11, 3, 150);

  SpreadsheetApp.flush();
  return 'Dashboard ready';
}
