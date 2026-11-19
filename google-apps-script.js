/**
 * Google Apps Script for Hanuman Heritage Hotel Booking Website
 *
 * Setup / update:
 * 1. Open this script project at script.google.com (project "Hanuman Heritage Bookings API")
 * 2. Replace the code with this file and Save. SHEET_ID below points to the bookings sheet.
 * 3. Deploy → Manage deployments → edit the existing Web App → Version: "New version" → Deploy
 *    (Execute as: Me, Who has access: Anyone). Editing the existing deployment keeps the same URL.
 * 4. If you create a NEW deployment instead, copy its URL into BOOKINGS_SHEET_URL in script.js
 *
 * Every booking request from the website is added as a row with status "Pending Payment".
 * When you receive the UPI payment, change that row's Status to "Confirmed".
 * You also get an email for each new booking request.
 */

// ID of the "Hanuman Heritage Website Bookings" Google Sheet
const SHEET_ID = '1qCEr1_7xYf8aQcWFgBT3T16lRe-IeXQSJPvrLg6mU_s';

const HEADERS = [
  'Booking ID', 'Booking Date', 'Guest Name', 'Phone', 'Email',
  'Check-In', 'Check-Out', 'Adults', 'Children', 'Nights',
  'Rooms', 'Subtotal', 'GST', 'Total', 'Status'
];

// Email that receives a notification for each new booking.
// Leave empty to use the Google account that owns this script.
const NOTIFY_EMAIL = '';

function getSheet_() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doPost(e) {
  try {
    const sheet = getSheet_();
    const data = JSON.parse(e.postData.contents);

    sheet.appendRow([
      data.bookingId || '',
      data.bookingDate || new Date().toISOString(),
      data.guestName || '',
      "'" + (data.guestPhone || ''),   // leading ' keeps the number as text
      data.guestEmail || '',
      data.checkIn || '',
      data.checkOut || '',
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
          'New booking request ' + data.bookingId + ' – ₹' + data.total,
          'New booking request on hanumanheritage.com\n\n' +
          'Booking ID: ' + data.bookingId + '\n' +
          'Guest: ' + data.guestName + '\n' +
          'Phone: ' + data.guestPhone + '\n' +
          'Email: ' + (data.guestEmail || '-') + '\n' +
          'Rooms: ' + data.roomName + '\n' +
          'Guests: ' + data.adults + ' adults, ' + data.children + ' children\n' +
          'Subtotal: ₹' + data.subtotal + '  GST: ₹' + data.gst + '  Total: ₹' + data.total + '\n\n' +
          'Status: ' + (data.status || 'Pending Payment') + '. Check your UPI app for the payment, ' +
          'then mark the booking Confirmed in the sheet and contact the guest.'
        );
      }
    } catch (mailError) {
      // A mail failure should not lose the booking row
      console.error(mailError);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: 'Booking saved successfully' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // Simple health check. Booking data (names, phone numbers) is not exposed publicly.
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
