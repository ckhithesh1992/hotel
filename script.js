/* Hanuman Heritage — booking site script */

// ===== Hotel settings: change these in one place =====
const GST_RATE = 0.05; // 5% GST on room tariffs
const UPI_ID = "ppr.10900.16102024.00907462@cnrb"; // Canara Bank merchant UPI
const UPI_MERCHANT_CODE = "7399";
const UPI_NAME = "Hanuman Heritage";
const HOTEL_PHONE = "8792564056";
// Google Apps Script web app that writes bookings to the "Hanuman Heritage Website Bookings" sheet
const BOOKINGS_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxR43drfoiqrBjnC-xpoSgcC7wiRX0eh2mwkFbyp0p8esa15Tar8PeXc1TEHl9q8QaZhA/exec';

// Policies shown on the page. Edit the text here.
const POLICIES = [
    { title: 'Check-in and check-out', text: 'Check-in from 12:00 noon, check-out by 11:00 am. Ask us on WhatsApp if you need an early check-in or late check-out.' },
    { title: 'ID at check-in', text: 'Please carry a government photo ID (Aadhaar, driving licence, passport or voter ID) for every adult. Foreign guests need a passport and visa.' },
    { title: 'When your booking is confirmed', text: 'Your rooms are held when you reserve online. The booking is confirmed once we receive your UPI payment and reply on WhatsApp.' },
    { title: 'Cancellations', text: 'Online bookings are non-refundable. You can change your dates once, if rooms are available, by messaging us at least 24 hours before check-in. <a href="refund-policy.html">Read the full policy</a>.' },
    { title: 'GST', text: 'Room prices shown are per room per night. 5% GST is added to the total.' },
    { title: 'Groups and events', text: 'Booking several rooms or the event hall? Message us and we will plan it with you.' }
];

// ===== Rooms =====
// price: per room per night (before GST). guests: maximum guests per room.
const rooms = [
    {
        id: 1, name: 'Deluxe Room (Non-AC)', price: 2000, guests: 2,
        bed: 'Double bed', size: '250 sq ft', stock: 8,
        photos: ['Delux_Non_AC_Room', 'Delux_Non_AC', 'Bathroom_01', 'Passage_02'],
        description: 'A comfortable double room with a ceiling fan. A good choice for couples and solo travellers.',
        features: ['Double bed', 'Fan', 'TV', 'WiFi', 'Attached bathroom']
    },
    {
        id: 2, name: 'Deluxe Room (AC)', price: 2500, guests: 2,
        bed: 'Double bed', size: '250 sq ft', stock: 6,
        photos: ['Delux_AC_Room', 'Bathroom_01', 'Hotel_Lobby', 'Passage_02'],
        description: 'The same double room with air conditioning, for warmer days and a quieter night.',
        features: ['Double bed', 'Air conditioning', 'TV', 'WiFi', 'Attached bathroom']
    },
    {
        id: 3, name: 'Twin Sharing Room', price: 2500, guests: 2,
        bed: 'Two single beds', size: '250 sq ft', stock: 8,
        photos: ['Twin_Sharing_Beds', 'Bathroom_02', 'Passage_01'],
        description: 'Two separate beds, for friends or colleagues travelling together.',
        features: ['Two single beds', 'Air conditioning', 'TV', 'WiFi', 'Attached bathroom']
    },
    {
        id: 6, name: 'Twin Heritage Suite (AC)', price: 3000, guests: 2,
        bed: 'King size bed', size: '280 sq ft', stock: 2,
        photos: ['Premium_Suite_Room_02', 'Premium_Suite_Room_01', 'Heritage_Suite', 'Bathroom_01'],
        description: 'Our largest room for two, with a king size bed and extra space to relax.',
        features: ['King size bed', 'Air conditioning', 'TV', 'WiFi', 'Attached bathroom']
    },
    {
        id: 4, name: 'Quade Suite', price: 3500, guests: 4,
        bed: 'Four beds', size: '250 sq ft', stock: 1,
        photos: ['Dormitory_Type_I', 'Bathroom_01', 'Passage_02'],
        description: 'One room with four beds, for a family or a group of four.',
        features: ['Four beds', 'Air conditioning', 'TV', 'WiFi', 'Bathroom']
    },
    {
        id: 5, name: 'Seven Wonders', price: 4500, guests: 8,
        bed: 'Multiple beds', size: '450 sq ft', stock: 1,
        photos: ['Dormitory_Type_II', 'Bathroom_01', 'Passage_02'],
        description: 'A large family room for 6 to 8 guests, so the whole group stays together.',
        features: ['Beds for 6 to 8', 'Air conditioning', 'TV', 'WiFi', 'Bathroom']
    }
];

const GALLERY = [
    ['Entrance', 'The hotel entrance at night'],
    ['Hotel_Lobby', 'Lobby'],
    ['Premium_Suite_Room_02', 'Twin Heritage Suite'],
    ['Recepetion_Desk', 'Reception'],
    ['Dinning_Area', 'Dining area'],
    ['Passage', 'Room corridor'],
    ['Delux_AC_Room', 'Deluxe Room (AC)'],
    ['Event_Hall', 'Event hall'],
    ['Hotel_Frount_View', 'Front of the building'],
    ['Elevator', 'Lift lobby'],
    ['Dormitory_Type_II', 'Seven Wonders family room'],
    ['Bathroom_01', 'Bathroom']
];

const img = (stem, small) => `images/web/${stem}${small ? '-sm' : ''}.webp`;

// ===== Booking state =====
let cart = {};          // { roomId: quantity }
let stay = { checkIn: '', checkOut: '', adults: 2, children: 0 };

function loadState() {
    try {
        const saved = JSON.parse(localStorage.getItem('hh-booking') || 'null');
        if (saved && saved.cart && saved.stay) {
            cart = saved.cart;
            stay = saved.stay;
        }
    } catch (e) { /* storage not available */ }
}

function saveState() {
    try { localStorage.setItem('hh-booking', JSON.stringify({ cart, stay })); } catch (e) { /* ignore */ }
}

// ===== Helpers =====
function formatINR(amount) {
    return Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatDate(dateString) {
    if (!dateString) return '';
    const d = new Date(dateString + (dateString.length === 10 ? 'T00:00:00' : ''));
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isoDate(d) {
    const tz = d.getTimezoneOffset() * 60000;
    return new Date(d - tz).toISOString().slice(0, 10);
}

function nights() {
    if (!stay.checkIn || !stay.checkOut) return 0;
    const diff = new Date(stay.checkOut) - new Date(stay.checkIn);
    return Math.max(0, Math.round(diff / 86400000));
}

function totalGuests() {
    return (Number(stay.adults) || 0) + (Number(stay.children) || 0);
}

function cartRooms() {
    return Object.entries(cart)
        .filter(([, q]) => q > 0)
        .map(([id, q]) => ({ room: rooms.find(r => r.id === Number(id)), qty: q }))
        .filter(x => x.room);
}

function roomCount() {
    return cartRooms().reduce((s, x) => s + x.qty, 0);
}

function capacity() {
    return cartRooms().reduce((s, x) => s + x.qty * x.room.guests, 0);
}

function totals() {
    const n = Math.max(1, nights());
    const subtotal = cartRooms().reduce((s, x) => s + x.room.price * x.qty * n, 0);
    const gst = Math.round(subtotal * GST_RATE * 100) / 100;
    return { nights: n, subtotal, gst, total: Math.round((subtotal + gst) * 100) / 100 };
}

let toastTimer;
function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-visible'), 2600);
}

// ===== Search bar =====
function setupSearch() {
    const ci = document.getElementById('checkIn');
    const co = document.getElementById('checkOut');
    const ad = document.getElementById('adults');
    const ch = document.getElementById('children');
    const today = isoDate(new Date());
    ci.min = today;

    if (!stay.checkIn || stay.checkIn < today) {
        const t = new Date();
        const t2 = new Date(); t2.setDate(t2.getDate() + 1);
        stay.checkIn = isoDate(t);
        stay.checkOut = isoDate(t2);
    }
    ci.value = stay.checkIn;
    co.value = stay.checkOut;
    ad.value = stay.adults;
    ch.value = stay.children;
    co.min = nextDay(stay.checkIn);

    const onDates = () => {
        stay.checkIn = ci.value;
        co.min = nextDay(ci.value);
        if (ci.value && (!co.value || co.value <= ci.value)) {
            co.value = nextDay(ci.value);
        }
        stay.checkOut = co.value;
        onStayChange();
    };
    const onGuests = () => {
        if (ad.value !== '') stay.adults = Math.max(1, parseInt(ad.value) || 1);
        if (ch.value !== '') stay.children = Math.max(0, parseInt(ch.value) || 0);
        onStayChange();
    };
    ['input', 'change'].forEach(ev => {
        ci.addEventListener(ev, onDates);
        co.addEventListener(ev, () => { stay.checkOut = co.value; onStayChange(); });
        ad.addEventListener(ev, onGuests);
        ch.addEventListener(ev, onGuests);
    });
    ad.addEventListener('blur', () => { ad.value = stay.adults; });
    ch.addEventListener('blur', () => { ch.value = stay.children; });

    document.getElementById('searchForm').addEventListener('submit', e => {
        e.preventDefault();
        if (validateStay()) {
            document.getElementById('rooms').scrollIntoView({ behavior: 'smooth' });
        }
    });
    onStayChange();
}

function nextDay(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    return isoDate(d);
}

function validateStay() {
    const note = document.getElementById('stayNote');
    if (!stay.checkIn || !stay.checkOut) {
        note.textContent = 'Choose your check-in and check-out dates.';
        note.classList.add('is-error');
        return false;
    }
    if (nights() < 1) {
        note.textContent = 'Check-out must be at least one day after check-in.';
        note.classList.add('is-error');
        return false;
    }
    note.classList.remove('is-error');
    return true;
}

let lastStayKey = '';
function onStayChange() {
    // Redraw only when something actually changed, so a tap on a room
    // right after editing a field is not lost to a redraw.
    const key = JSON.stringify(stay);
    if (key === lastStayKey) return;
    lastStayKey = key;
    const note = document.getElementById('stayNote');
    if (validateStay()) {
        const n = nights();
        const g = totalGuests();
        note.textContent = `${n} night${n > 1 ? 's' : ''}, ${g} guest${g > 1 ? 's' : ''}. ${g > 2 ? 'Pick rooms below until everyone has a bed.' : ''}`;
    }
    saveState();
    renderRooms();
    renderCart();
}

// ===== Rooms =====
function renderRooms() {
    const list = document.getElementById('roomList');
    const n = nights();
    const g = totalGuests();
    const intro = document.getElementById('roomsIntro');
    intro.textContent = n > 0
        ? `Prices for ${formatDate(stay.checkIn)} to ${formatDate(stay.checkOut)}, ${n} night${n > 1 ? 's' : ''}. 5% GST is added at checkout.`
        : 'Prices are per room per night. 5% GST is added at checkout.';

    list.innerHTML = rooms.map(room => {
        const qty = cart[room.id] || 0;
        const stayPrice = n > 0 ? `<span class="price-stay">₹${formatINR(room.price * n)} for ${n} night${n > 1 ? 's' : ''}</span>` : '';
        const fit = room.guests >= g || g === 0
            ? `Sleeps ${room.guests === 8 ? '6 to 8' : room.guests}`
            : `Sleeps ${room.guests === 8 ? '6 to 8' : room.guests}. Add ${Math.ceil(g / room.guests)} rooms for ${g} guests`;
        return `
        <article class="room" id="room-${room.id}">
            <button type="button" class="room-photo" data-room-photos="${room.id}" aria-label="See ${room.photos.length} photos of the ${escapeHTML(room.name)}">
                <img src="${img(room.photos[0], true)}" srcset="${img(room.photos[0], true)} 640w, ${img(room.photos[0])} 1600w" sizes="(max-width: 980px) 100vw, 380px" alt="${escapeHTML(room.name)}" loading="lazy">
                <span class="count"><i class="fas fa-images" aria-hidden="true"></i> ${room.photos.length}</span>
            </button>
            <div class="room-info">
                <h3>${escapeHTML(room.name)}</h3>
                <p class="room-meta">${room.bed}, ${room.size}</p>
                <p class="room-desc">${room.description}</p>
                <ul class="room-features">
                    ${room.features.map(f => `<li><i class="fas fa-check" aria-hidden="true"></i>${f}</li>`).join('')}
                </ul>
            </div>
            <div class="room-buy">
                <div class="price">
                    <span class="price-amount">₹${formatINR(room.price)}</span>
                    <span class="price-unit">per room per night</span>
                    ${stayPrice}
                </div>
                ${qty > 0 ? `
                <div>
                    <div class="qty" role="group" aria-label="Number of ${escapeHTML(room.name)} rooms">
                        <button type="button" data-qty="${room.id}" data-step="-1" aria-label="Remove one room">−</button>
                        <output aria-live="polite">${qty}</output>
                        <button type="button" data-qty="${room.id}" data-step="1" aria-label="Add one room" ${qty >= room.stock ? 'disabled' : ''}>+</button>
                    </div>
                    <p class="fit-note">${qty} room${qty > 1 ? 's' : ''} selected</p>
                </div>` : `
                <div>
                    <button type="button" class="btn btn-primary" data-add="${room.id}">Select room</button>
                    <p class="fit-note">${fit}</p>
                </div>`}
            </div>
        </article>`;
    }).join('');
}

function changeQty(roomId, step) {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    if (!validateStay()) {
        document.getElementById('top').scrollIntoView({ behavior: 'smooth' });
        document.getElementById('checkIn').focus();
        return;
    }
    const q = Math.min(room.stock, Math.max(0, (cart[roomId] || 0) + step));
    cart[roomId] = q;
    if (q === 0) delete cart[roomId];
    saveState();
    renderRooms();
    renderCart();
    if (step > 0) toast(`${room.name} added. ${capacityMessage(true)}`);
}

function capacityMessage(short) {
    const cap = capacity();
    const g = totalGuests();
    if (cap === 0) return '';
    if (cap >= g) return short ? 'Everyone has a bed.' : `These rooms sleep ${cap}, enough for your ${g} guest${g > 1 ? 's' : ''}.`;
    const missing = g - cap;
    return short ? `Add beds for ${missing} more.` : `These rooms sleep ${cap}. You have ${g} guests, so add room for ${missing} more.`;
}

// ===== Booking summary =====
function renderCart() {
    const items = cartRooms();
    const box = document.getElementById('cartItems');
    const t = totals();
    const n = nights();

    document.getElementById('stayLine').textContent = n > 0
        ? `${formatDate(stay.checkIn)} to ${formatDate(stay.checkOut)}, ${n} night${n > 1 ? 's' : ''}, ${totalGuests()} guest${totalGuests() > 1 ? 's' : ''}`
        : '';

    box.innerHTML = items.length === 0
        ? '<p class="cart-empty">No rooms selected yet. Choose a room from the list to continue.</p>'
        : items.map(({ room, qty }) => `
            <div class="cart-item">
                <img src="${img(room.photos[0], true)}" alt="">
                <div>
                    <h3>${qty} × ${escapeHTML(room.name)}</h3>
                    <p>₹${formatINR(room.price)} × ${qty} room${qty > 1 ? 's' : ''} × ${t.nights} night${t.nights > 1 ? 's' : ''}</p>
                </div>
                <div class="line-total">₹${formatINR(room.price * qty * t.nights)}</div>
            </div>`).join('');

    document.getElementById('subtotal').textContent = `₹${formatINR(t.subtotal)}`;
    document.getElementById('tax').textContent = `₹${formatINR(t.gst)}`;
    document.getElementById('total').textContent = `₹${formatINR(t.total)}`;

    const capNote = document.getElementById('capacityNote');
    capNote.textContent = items.length ? capacityMessage(false) : '';
    capNote.classList.toggle('is-error', items.length > 0 && capacity() < totalGuests());

    // Action bar
    const bar = document.getElementById('actionBar');
    const count = roomCount();
    bar.classList.toggle('has-items', count > 0);
    document.getElementById('abBookLabel').textContent = count > 0
        ? `Review ${count} room${count > 1 ? 's' : ''}, ₹${formatINR(t.total)}`
        : 'Book a room';
}

function clearCart() {
    cart = {};
    saveState();
    renderRooms();
    renderCart();
}

// ===== Dialogs =====
let lastFocus = null;
function openSheet(id) {
    lastFocus = document.activeElement;
    document.getElementById('toast').classList.remove('is-visible');
    const el = document.getElementById(id);
    el.hidden = false;
    document.body.style.overflow = 'hidden';
    const focusable = el.querySelector('input, button, a');
    if (focusable) focusable.focus();
}

function closeSheet(el) {
    el.hidden = true;
    if (![...document.querySelectorAll('.sheet, .lightbox')].some(s => !s.hidden)) {
        document.body.style.overflow = '';
    }
    if (lastFocus) lastFocus.focus();
}

function showCart() {
    renderCart();
    document.getElementById('formError').textContent = '';
    openSheet('cartModal');
}

// ===== Reserve =====
// The guest submits a booking request; it is recorded as "Pending Payment"
// and the hotel confirms it once the UPI payment is received.
async function proceedToBook() {
    const err = document.getElementById('formError');
    err.textContent = '';
    const items = cartRooms();

    if (items.length === 0) { err.textContent = 'Choose at least one room.'; return; }
    if (!validateStay()) { err.textContent = 'Check your dates: check-out must be after check-in.'; return; }
    if (capacity() < totalGuests()) {
        err.textContent = `These rooms sleep ${capacity()}, but you have ${totalGuests()} guests. Add another room or change the number of guests.`;
        return;
    }

    const name = document.getElementById('guestName').value.trim();
    const phone = document.getElementById('guestPhone').value.trim();
    const email = document.getElementById('customerEmail').value.trim();

    if (!name) { err.textContent = 'Enter your full name.'; document.getElementById('guestName').focus(); return; }
    if (!/^[6-9]\d{9}$/.test(phone.replace(/[\s-]/g, '').replace(/^(\+91|0)/, ''))) {
        err.textContent = 'Enter a 10-digit mobile number so we can confirm your booking.';
        document.getElementById('guestPhone').focus();
        return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        err.textContent = 'Check your email address, or leave it blank.';
        document.getElementById('customerEmail').focus();
        return;
    }

    const t = totals();
    const booking = {
        id: 'HH' + Date.now(),
        bookingDate: new Date().toISOString(),
        guestName: name,
        guestPhone: phone,
        customerEmail: email,
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        nights: t.nights,
        adults: Number(stay.adults),
        children: Number(stay.children),
        items: items.map(({ room, qty }) => ({ roomName: room.name, qty, price: room.price, total: room.price * qty * t.nights })),
        subtotal: t.subtotal,
        tax: t.gst,
        total: t.total,
        status: 'Pending Payment'
    };

    const btn = document.getElementById('confirmBookingBtn');
    btn.disabled = true;
    btn.textContent = 'Reserving…';

    await saveToGoogleSheets(booking);

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-lock" aria-hidden="true"></i> Reserve &amp; pay';

    cart = {};
    saveState();
    renderRooms();
    renderCart();

    document.getElementById('cartModal').hidden = true;
    showPayment(booking);
}

// Google Sheets integration
async function saveToGoogleSheets(booking) {
    if (!BOOKINGS_SHEET_URL) return;

    const data = {
        bookingId: booking.id,
        bookingDate: booking.bookingDate,
        guestName: booking.guestName,
        guestPhone: booking.guestPhone,
        guestEmail: booking.customerEmail,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        adults: booking.adults,
        children: booking.children,
        nights: booking.nights,
        roomName: booking.items.map(i => `${i.qty} × ${i.roomName}`).join('; '),
        subtotal: booking.subtotal,
        gst: booking.tax,
        total: booking.total,
        status: booking.status
    };

    try {
        // text/plain keeps this a "simple" request so Apps Script accepts it without a CORS preflight
        // Never keep the guest waiting more than 6 seconds on a slow connection
        await Promise.race([
            fetch(BOOKINGS_SHEET_URL, {
                method: 'POST',
                mode: 'no-cors',
                keepalive: true,
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(data)
            }),
            new Promise(resolve => setTimeout(resolve, 6000))
        ]);
    } catch (error) {
        console.error('Error saving booking:', error);
    }
}

// ===== Payment =====
let currentBooking = null;

function upiQuery(booking) {
    // Keep '@' unencoded and use %20 for spaces: some UPI apps reject '%40' or '+'
    return `pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&mc=${UPI_MERCHANT_CODE}` +
        `&am=${booking.total.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Booking ' + booking.id)}`;
}

function upiLinkFor(booking) {
    return `upi://pay?${upiQuery(booking)}`;
}

// Android opens the exact app by package name; iPhone uses each app's own link.
// Google Pay and Paytm are left out: they refused payments started from the website
// to this Canara merchant UPI ID (tested 19 Nov 2026). PhonePe and BHIM work.
const UPI_APPS = [
    { id: 'phonepe', name: 'PhonePe', android: 'com.phonepe.app', ios: 'phonepe://pay' },
    { id: 'bhim', name: 'BHIM', android: 'in.org.npci.upiapp', ios: 'bhim://upi/pay' }
];

function upiAppLink(app, booking) {
    const q = upiQuery(booking);
    if (/Android/i.test(navigator.userAgent)) {
        return `intent://pay?${q}#Intent;scheme=upi;package=${app.android};end`;
    }
    return `${app.ios}?${q}`;
}

function renderUpiAppButtons(booking) {
    const box = document.getElementById('upiAppButtons');
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const qrHeading = document.getElementById('qrHeading');
    if (!isMobile) {
        box.hidden = true;
        qrHeading.textContent = 'Scan with any UPI app on your phone';
        return;
    }
    const isAndroid = /Android/i.test(navigator.userAgent);
    box.innerHTML = `<h3>Pay ₹${formatINR(booking.total)} with your UPI app</h3>
        <div class="upi-apps">
            ${UPI_APPS.map(app => `<a class="upi-app-btn upi-${app.id}" href="${upiAppLink(app, booking)}">${app.name}</a>`).join('')}
            ${isAndroid ? `<a class="upi-app-btn upi-other" href="${upiLinkFor(booking)}">Other UPI app</a>` : ''}
        </div>`;
    box.hidden = false;
    qrHeading.textContent = 'Or scan from another phone';
}

function showPayment(booking) {
    currentBooking = booking;
    document.getElementById('payBookingId').textContent = booking.id;
    document.getElementById('payAmount').textContent = `₹${formatINR(booking.total)}`;
    document.getElementById('payUpiId').textContent = UPI_ID;
    renderUpiAppButtons(booking);

    const msg = encodeURIComponent(
        `Hello Hanuman Heritage, I have paid ₹${formatINR(booking.total)} for booking ${booking.id} (${booking.guestName}, ${formatDate(booking.checkIn)} to ${formatDate(booking.checkOut)}). Please confirm my booking.`
    );
    document.getElementById('whatsappConfirmBtn').href = `https://wa.me/91${HOTEL_PHONE}?text=${msg}`;
    openSheet('paymentModal');
}

function printBill() {
    const b = currentBooking;
    if (!b) return;
    const w = window.open('', '_blank');
    if (!w) { toast('Allow pop-ups to print the booking slip.'); return; }
    w.document.write(`
        <html><head><title>Booking ${b.id} - Hanuman Heritage</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #1D1F1C; }
            h1 { color: #1E4535; margin: 0; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            th, td { padding: 8px; text-align: left; border-bottom: 1px solid #D9DDD6; }
            th { background: #1E4535; color: #fff; }
            .r { text-align: right; }
            .total td { font-weight: bold; font-size: 1.1em; }
        </style></head><body>
        <h1>Hanuman Heritage</h1>
        <p>Jyothinagar Main Road, next to Abharan Jewellers, Chikkamagaluru, Karnataka 577101<br>Phone: +91 ${HOTEL_PHONE}</p>
        <h2>Booking request (confirmed after payment)</h2>
        <p><strong>Booking ID:</strong> ${b.id}<br>
        <strong>Guest:</strong> ${escapeHTML(b.guestName)}, ${escapeHTML(b.guestPhone)}<br>
        <strong>Stay:</strong> ${formatDate(b.checkIn)} to ${formatDate(b.checkOut)}, ${b.nights} night(s), ${b.adults} adult(s), ${b.children} child(ren)</p>
        <table>
            <tr><th>Room</th><th class="r">Rooms</th><th class="r">Price/night</th><th class="r">Amount</th></tr>
            ${b.items.map(i => `<tr><td>${i.roomName}</td><td class="r">${i.qty}</td><td class="r">₹${formatINR(i.price)}</td><td class="r">₹${formatINR(i.total)}</td></tr>`).join('')}
            <tr><td colspan="3" class="r">Subtotal</td><td class="r">₹${formatINR(b.subtotal)}</td></tr>
            <tr><td colspan="3" class="r">GST (${GST_RATE * 100}%)</td><td class="r">₹${formatINR(b.tax)}</td></tr>
            <tr class="total"><td colspan="3" class="r">Total</td><td class="r">₹${formatINR(b.total)}</td></tr>
        </table>
        <p>Pay to UPI ID ${UPI_ID}. Your booking is confirmed once we receive the payment.</p>
        </body></html>`);
    w.document.close();
    w.print();
}

// ===== Gallery and photo viewer =====
let lbPhotos = [];
let lbIndex = 0;

function renderGallery() {
    document.getElementById('galleryGrid').innerHTML = GALLERY.map(([stem, cap], i) => `
        <button type="button" data-gallery="${i}" aria-label="Open photo: ${cap}">
            <img src="${img(stem, true)}" alt="${cap}" loading="lazy">
        </button>`).join('');
}

function openLightbox(photos, index) {
    lbPhotos = photos;
    lbIndex = index;
    showLightboxPhoto();
    lastFocus = document.activeElement;
    const lb = document.getElementById('lightbox');
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    lb.querySelector('.lb-close').focus();
}

function showLightboxPhoto() {
    const [stem, cap] = lbPhotos[lbIndex];
    const im = document.getElementById('lbImg');
    im.src = img(stem);
    im.alt = cap;
    document.getElementById('lbCaption').textContent = `${cap} (${lbIndex + 1} of ${lbPhotos.length})`;
    const multi = lbPhotos.length > 1;
    document.querySelectorAll('.lb-nav').forEach(b => { b.hidden = !multi; });
}

function stepLightbox(d) {
    lbIndex = (lbIndex + d + lbPhotos.length) % lbPhotos.length;
    showLightboxPhoto();
}

// ===== Wire up =====
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    document.getElementById('year').textContent = new Date().getFullYear();

    document.getElementById('policyList').innerHTML = POLICIES.map(p =>
        `<div><dt>${p.title}</dt><dd>${p.text}</dd></div>`).join('');

    renderGallery();
    setupSearch();

    document.getElementById('roomList').addEventListener('click', e => {
        const add = e.target.closest('[data-add]');
        const q = e.target.closest('[data-qty]');
        const photo = e.target.closest('[data-room-photos]');
        if (add) changeQty(Number(add.dataset.add), 1);
        if (q) changeQty(Number(q.dataset.qty), Number(q.dataset.step));
        if (photo) {
            const room = rooms.find(r => r.id === Number(photo.dataset.roomPhotos));
            openLightbox(room.photos.map(s => [s, room.name]), 0);
        }
    });

    document.getElementById('galleryGrid').addEventListener('click', e => {
        const b = e.target.closest('[data-gallery]');
        if (b) openLightbox(GALLERY, Number(b.dataset.gallery));
    });

    document.getElementById('abBook').addEventListener('click', () => {
        if (roomCount() > 0) showCart();
        else document.getElementById('rooms').scrollIntoView({ behavior: 'smooth' });
    });

    document.querySelectorAll('[data-close]').forEach(b =>
        b.addEventListener('click', () => closeSheet(b.closest('.sheet, .lightbox'))));

    document.querySelectorAll('.sheet').forEach(s =>
        s.addEventListener('click', e => { if (e.target === s) closeSheet(s); }));

    document.getElementById('lightbox').addEventListener('click', e => {
        if (e.target.id === 'lightbox') closeSheet(e.currentTarget);
    });
    document.querySelector('.lb-prev').addEventListener('click', () => stepLightbox(-1));
    document.querySelector('.lb-next').addEventListener('click', () => stepLightbox(1));

    document.addEventListener('keydown', e => {
        const lb = document.getElementById('lightbox');
        if (!lb.hidden) {
            if (e.key === 'ArrowLeft') stepLightbox(-1);
            if (e.key === 'ArrowRight') stepLightbox(1);
        }
        if (e.key === 'Escape') {
            const open = [...document.querySelectorAll('.sheet, .lightbox')].filter(s => !s.hidden).pop();
            if (open) closeSheet(open);
        }
    });

    // Swipe in the photo viewer
    let touchX = null;
    const lbEl = document.getElementById('lightbox');
    lbEl.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
    lbEl.addEventListener('touchend', e => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 50) stepLightbox(dx < 0 ? 1 : -1);
        touchX = null;
    });
});
