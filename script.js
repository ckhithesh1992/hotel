// Room Data with enhanced details
const rooms = [
    {
        id: 1,
        name: "Deluxe Room (Non-AC)",
        price: 2000,
        image: "images/Delux_Non_AC_Room.png",
        images: [
            "images/Delux_Non_AC_Room.png",
            "images/Passage_02.png",
            "images/Double_Bed_room_view_01.png",
			"images/Bathroom_01.png"
        ],
        features: ["Double Bed", "TV", "WiFi", "Bathroom", "Fan"],
        capacity: 2,
        size: "250 sq ft",
        bedType: "Double Bed",
        roomsAvailable: 8,
        description: "Comfortable deluxe room without air conditioning, perfect for budget-conscious travelers. Features all essential amenities for a pleasant stay in Chikkamagaluru."
    },
    {
        id: 2,
        name: "Deluxe Room (AC)",
        price: 2500,
        image: "images/Delux_AC_Room.png",
        images: [
            "images/Delux_AC_Room.png",
            "images/Passage_02.png",
            "images/Hotel_Lobby.png",
			"images/Bathroom_01.png"
        ],
        features: ["Double Bed", "AC", "TV", "WiFi", "Bathroom"],
        capacity: 2,
        size: "250 sq ft",
        bedType: "Double Bed",
        roomsAvailable: 6,
        description: "Spacious and elegantly designed deluxe room with air conditioning and modern amenities. Perfect for couples seeking comfort during their stay in Chikkamagaluru."
    },
    {
        id: 3,
        name: "Twin Sharing Room",
        price: 2500,
        image: "images/Twin_Sharing_Beds.png",
        images: [
            "images/Twin_Sharing_Beds.png",
            "images/Passage_01.jpg",
			"images/Bathroom_02.png"
        ],
        features: ["Twin Beds", "AC", "TV", "WiFi", "Bathroom"],
        capacity: 2,
        size: "250 sq ft",
        bedType: "Twin Beds",
        roomsAvailable: 8,
        description: "Ideal for friends or colleagues traveling together. Features two separate beds with all modern amenities for a comfortable stay."
    },
    {
        id: 4,
        name: "Quade Suite",
        price: 3500,
        image: "images/Dormitory_Type_I.png",
        images: [
            "images/Dormitory_Type_I.png",
            "images/Bathroom_01.png",
			"images/Passage_02.png"
        ],
        features: ["Multiple Beds", "AC", "TV", "WiFi", "Shared Bathroom"],
        capacity: 4,
        size: "250 sq ft",
        bedType: "Multiple Beds",
        roomsAvailable: 1,
        description: "Spacious dormitory-style accommodation perfect for groups of 4. Features comfortable beds, shared facilities, and secure lockers for your belongings."
    },
    {
        id: 5,
        name: "Seven Wonders",
        price: 4500,
        image: "images/Dormitory_Type_II.png",
        images: [
            "images/Dormitory_Type_II.png",
            "images/Bathroom_01.png",
			"images/Passage_02.png"
        ],
        features: ["Multiple Beds", "AC", "TV", "WiFi", "Shared Bathroom"],
        capacity: "6 to 8",
        size: "450 sq ft",
        bedType: "Multiple Beds",
        roomsAvailable: 1,
        description: "Large dormitory accommodation ideal for groups of 6. Features comfortable sleeping arrangements with all essential amenities for a group stay."
    },
    {
        id: 6,
        name: "Twin Heritage Suite (AC)",
        price: 3000,
        image: "images/Premium_Suite_Room_02.png",
        images: [
            "images/Premium_Suite_Room_02.png",
            "images/Premium_Suite_Room_01.png",
            "images/Bathroom_01.png",
			"images/Passage.png"
        ],
        features: ["King Size Bed", "AC", "TV", "WiFi", "Bathroom"],
        capacity: 2,
        size: "280 sq ft",
        bedType: "King Size Bed",
        roomsAvailable: 2,
        description: "Luxurious premium suite with air conditioning, private balcony, and premium furnishings. Perfect for couples seeking an enhanced experience with extra space and amenities."
    }
];

// Cart Management
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeSlider();
    loadRooms();
    updateCartCount();
    setupBookingForm();
    setupDateValidation();
    setupModalClose();
    
    // Setup room filters
    const priceFilter = document.getElementById('priceFilter');
    const capacityFilter = document.getElementById('capacityFilter');
    const sortFilter = document.getElementById('sortFilter');
    
    if (priceFilter) priceFilter.addEventListener('change', filterRooms);
    if (capacityFilter) capacityFilter.addEventListener('change', filterRooms);
    if (sortFilter) sortFilter.addEventListener('change', filterRooms);
    
    // Update nights calculation
    const checkIn = document.getElementById('checkIn');
    const checkOut = document.getElementById('checkOut');
    const nights = document.getElementById('nights');
    
    [checkIn, checkOut].forEach(input => {
        input.addEventListener('change', function() {
            if (checkIn.value && checkOut.value) {
                const date1 = new Date(checkIn.value);
                const date2 = new Date(checkOut.value);
                const diffTime = Math.abs(date2 - date1);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                nights.value = diffDays > 0 ? diffDays : 1;
            }
        });
    });
});

// Slider Functionality
let currentSlide = 0;
let slideInterval = null;
let slides = [];
let dots = [];

function initializeSlider() {
    slides = document.querySelectorAll('.slide');
    dots = document.querySelectorAll('.dot');
    
    if (slides.length > 0) {
        showSlide(0);
        startAutoSlide();
    }
}

function startAutoSlide() {
    // Clear any existing interval
    if (slideInterval) {
        clearInterval(slideInterval);
    }
    
    // Start auto-slide every 5 seconds
    slideInterval = setInterval(() => {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    }, 5000);
}

function stopAutoSlide() {
    if (slideInterval) {
        clearInterval(slideInterval);
        slideInterval = null;
    }
}

function showSlide(n) {
    // Ensure n is within valid range
    if (n < 0) n = slides.length - 1;
    if (n >= slides.length) n = 0;
    
    currentSlide = n;
    
    // Remove active class from all slides and dots
    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));
    
    // Add active class to current slide and dot
    if (slides[n]) {
        slides[n].classList.add('active');
    }
    if (dots[n]) {
        dots[n].classList.add('active');
    }
}

function changeSlide(direction) {
    // Stop auto-slide when user manually changes slide
    stopAutoSlide();
    
    // Change slide
    currentSlide += direction;
    if (currentSlide >= slides.length) {
        currentSlide = 0;
    } else if (currentSlide < 0) {
        currentSlide = slides.length - 1;
    }
    
    showSlide(currentSlide);
    
    // Restart auto-slide after 5 seconds
    startAutoSlide();
}

function goToSlide(n) {
    // Stop auto-slide when user clicks on dot
    stopAutoSlide();
    
    // Go to specific slide (n is 1-based from HTML)
    currentSlide = n - 1;
    showSlide(currentSlide);
    
    // Restart auto-slide after 5 seconds
    startAutoSlide();
}

// Filtered and sorted rooms
let filteredRooms = [...rooms];
let currentRoomId = null;

// Load Rooms with enhanced design
function loadRooms(roomsToDisplay = filteredRooms) {
    const roomsGrid = document.getElementById('roomsGrid');
    if (!roomsGrid) return;
    
    if (roomsToDisplay.length === 0) {
        roomsGrid.innerHTML = `
            <div class="no-rooms-found">
                <i class="fas fa-search"></i>
                <h3>No rooms found</h3>
                <p>Try adjusting your filters to see more options</p>
            </div>
        `;
        return;
    }
    
    roomsGrid.innerHTML = roomsToDisplay.map(room => `
        <div class="room-card" data-room-id="${room.id}">
            <div class="room-image-container">
                <img src="${room.image}" alt="${room.name}" class="room-image">
                <div class="room-overlay">
                    <button class="btn-view-details" onclick="viewRoomDetails(${room.id})">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
                <div class="room-badge">₹${formatINR(room.price)}/night</div>
            </div>
            <div class="room-details">
                <h3>${room.name}</h3>
                <div class="room-specs">
                    <span><i class="fas fa-users"></i> ${room.capacity} Guests</span>
                    <span><i class="fas fa-ruler-combined"></i> ${room.size}</span>
                    <span><i class="fas fa-bed"></i> ${room.bedType}</span>
                    <span><i class="fas fa-door-open"></i> ${room.roomsAvailable || 'N/A'} Available</span>
                </div>
                <p class="room-short-desc">${room.description.substring(0, 100)}...</p>
                <div class="room-features-preview">
                    ${room.features.slice(0, 4).map(feature => `
                        <span class="feature-tag"><i class="fas fa-check"></i> ${feature}</span>
                    `).join('')}
                    ${room.features.length > 4 ? `<span class="feature-more">+${room.features.length - 4} more</span>` : ''}
                </div>
                <div class="room-actions">
                    <button class="btn-view-details-mobile" onclick="viewRoomDetails(${room.id})">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                    <button class="btn-add-cart" onclick="addToCart(${room.id})">
                        <i class="fas fa-cart-plus"></i> Book Now
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// View Room Details
function viewRoomDetails(roomId) {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    
    currentRoomId = roomId;
    const modal = document.getElementById('roomDetailsModal');
    
    // Set room details
    document.getElementById('modalRoomName').textContent = room.name;
    document.getElementById('modalPrice').textContent = `₹${formatINR(room.price)}`;
    document.getElementById('modalCapacity').textContent = `${room.capacity} Guests`;
    document.getElementById('modalBedType').textContent = room.bedType;
    document.getElementById('modalSize').textContent = room.size;
    document.getElementById('modalRoomsAvailable').textContent = `${room.roomsAvailable || 'N/A'} Rooms Available`;
    document.getElementById('modalDescription').innerHTML = `<p>${room.description}</p>`;
    
    // Set main image
    document.getElementById('modalMainImage').src = room.images[0];
    document.getElementById('modalMainImage').alt = room.name;
    
    // Set thumbnails
    const thumbnailsContainer = document.getElementById('imageThumbnails');
    thumbnailsContainer.innerHTML = room.images.map((img, index) => `
        <img src="${img}" alt="${room.name} - Image ${index + 1}" 
             onclick="changeMainImage('${img}')" 
             class="thumbnail ${index === 0 ? 'active' : ''}">
    `).join('');
    
    // Set amenities
    const amenitiesContainer = document.getElementById('modalAmenities');
    amenitiesContainer.innerHTML = room.features.map(feature => `
        <div class="amenity-item">
            <i class="fas fa-check-circle"></i>
            <span>${feature}</span>
        </div>
    `).join('');
    
    modal.style.display = 'block';
}

// Change main image in modal
function changeMainImage(src) {
    document.getElementById('modalMainImage').src = src;
    document.querySelectorAll('.thumbnail').forEach(thumb => {
        thumb.classList.remove('active');
        if (thumb.src === src || thumb.src.includes(src.split('?')[0])) {
            thumb.classList.add('active');
        }
    });
}

// Book this room
function bookThisRoom() {
    if (currentRoomId) {
        document.getElementById('roomDetailsModal').style.display = 'none';
        addToCart(currentRoomId);
        // Scroll to booking form
        document.getElementById('home').scrollIntoView({ behavior: 'smooth' });
    }
}

// View Gallery
function viewGallery() {
    // Could implement a lightbox gallery here
    alert('Gallery view coming soon!');
}

// Filter Rooms
function filterRooms() {
    const priceFilter = document.getElementById('priceFilter').value;
    const capacityFilter = document.getElementById('capacityFilter').value;
    const sortFilter = document.getElementById('sortFilter').value;
    
    filteredRooms = rooms.filter(room => {
        // Price filter
        if (priceFilter === 'budget' && room.price >= 3000) return false;
        if (priceFilter === 'mid' && (room.price < 3000 || room.price > 6000)) return false;
        if (priceFilter === 'luxury' && room.price <= 6000) return false;
        
        // Capacity filter
        if (capacityFilter === '2' && room.capacity !== 2) return false;
        if (capacityFilter === '3' && room.capacity !== 3) return false;
        if (capacityFilter === '4' && room.capacity < 4) return false;
        
        return true;
    });
    
    // Sort rooms
    if (sortFilter === 'price-low') {
        filteredRooms.sort((a, b) => a.price - b.price);
    } else if (sortFilter === 'price-high') {
        filteredRooms.sort((a, b) => b.price - a.price);
    } else if (sortFilter === 'name') {
        filteredRooms.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    loadRooms(filteredRooms);
}

// Reset Filters
function resetFilters() {
    document.getElementById('priceFilter').value = 'all';
    document.getElementById('capacityFilter').value = 'all';
    document.getElementById('sortFilter').value = 'default';
    filteredRooms = [...rooms];
    loadRooms(filteredRooms);
}

// Setup Booking Form
function setupBookingForm() {
    const form = document.getElementById('quickBookingForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            document.getElementById('rooms').scrollIntoView({ behavior: 'smooth' });
        });
    }
}

// Setup Date Validation
function setupDateValidation() {
    const checkIn = document.getElementById('checkIn');
    const checkOut = document.getElementById('checkOut');
    
    if (checkIn && checkOut) {
        const today = new Date().toISOString().split('T')[0];
        checkIn.setAttribute('min', today);
        checkIn.addEventListener('change', function() {
            if (this.value) {
                const nextDay = new Date(this.value);
                nextDay.setDate(nextDay.getDate() + 1);
                checkOut.setAttribute('min', nextDay.toISOString().split('T')[0]);
            }
        });
    }
}

// ===== Booking & payment settings =====
// Change these in one place if the hotel's details change.
const GST_RATE = 0.05; // 5% GST on room tariffs
const UPI_ID = "ppr.10900.16102024.00907462@cnrb"; // Canara Bank merchant UPI
const UPI_MERCHANT_CODE = "7399";
const UPI_NAME = "Hanuman Heritage";
const HOTEL_PHONE = "8792564056";
// Google Apps Script web-app URL that writes bookings to the Google Sheet
// (see google-apps-script.js). Leave empty to disable.
const BOOKINGS_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxR43drfoiqrBjnC-xpoSgcC7wiRX0eh2mwkFbyp0p8esa15Tar8PeXc1TEHl9q8QaZhA/exec';

// Cart Functions
function nightsBetween(checkIn, checkOut) {
    const diff = new Date(checkOut) - new Date(checkIn);
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

function addToCart(roomId) {
    const checkIn = document.getElementById('checkIn')?.value;
    const checkOut = document.getElementById('checkOut')?.value;
    const adults = parseInt(document.getElementById('adults')?.value || 1);
    const children = parseInt(document.getElementById('children')?.value || 0);

    if (!checkIn || !checkOut) {
        alert('Please select check-in and check-out dates first!');
        document.getElementById('home').scrollIntoView({ behavior: 'smooth' });
        return;
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
        alert('Check-out date must be after the check-in date.');
        document.getElementById('home').scrollIntoView({ behavior: 'smooth' });
        return;
    }

    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    const nights = nightsBetween(checkIn, checkOut);
    const cartItem = {
        id: Date.now(),
        roomId: room.id,
        roomName: room.name,
        price: Number(room.price),
        image: room.image,
        checkIn: checkIn,
        checkOut: checkOut,
        adults: adults,
        children: children,
        nights: nights,
        total: Number(room.price) * nights
    };

    cart.push(cartItem);
    saveCart();
    updateCartCount();
    showCart();
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartCount() {
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        cartCount.textContent = cart.length;
    }
}

function showCart() {
    const modal = document.getElementById('cartModal');
    if (!modal) return;

    modal.style.display = 'block';
    renderCart();
}

function renderCart() {
    const cartItems = document.getElementById('cartItems');
    if (!cartItems) return;

    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; padding: 2rem;">Your cart is empty</p>';
        updateCartSummary();
        return;
    }

    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-details">
                <h4>${item.roomName}</h4>
                <p>Check-in: ${formatDate(item.checkIn)} | Check-out: ${formatDate(item.checkOut)}</p>
                <p>Adults: ${item.adults} | Children: ${item.children} | Nights: ${item.nights}</p>
                <p>₹${formatINR(item.price)} × ${item.nights} night(s) = <strong>₹${formatINR(item.total)}</strong></p>
            </div>
            <div class="cart-item-actions">
                <button class="remove-item" onclick="removeFromCart(${item.id})">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        </div>
    `).join('');

    updateCartSummary();
}

function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    saveCart();
    updateCartCount();
    renderCart();
}

function clearCart() {
    if (confirm('Are you sure you want to clear the cart?')) {
        cart = [];
        saveCart();
        updateCartCount();
        renderCart();
    }
}

function cartTotals(items = cart) {
    const subtotal = items.reduce((sum, item) => sum + Number(item.total), 0);
    const gst = Math.round(subtotal * GST_RATE * 100) / 100;
    const total = Math.round((subtotal + gst) * 100) / 100;
    return { subtotal, gst, total };
}

function updateCartSummary() {
    const { subtotal, gst, total } = cartTotals();
    document.getElementById('subtotal').textContent = `₹${formatINR(subtotal)}`;
    document.getElementById('tax').textContent = `₹${formatINR(gst)}`;
    document.getElementById('total').textContent = `₹${formatINR(total)}`;
}

// Booking Functions
// The guest submits a booking request; it is recorded as "Pending Payment"
// and the hotel confirms it once the UPI payment is received.
async function proceedToBook() {
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    const name = document.getElementById('guestName')?.value.trim() || '';
    const phone = document.getElementById('guestPhone')?.value.trim() || '';
    const email = document.getElementById('customerEmail')?.value.trim() || '';

    if (!name) {
        alert('Please enter your name.');
        document.getElementById('guestName')?.focus();
        return;
    }
    if (!/^[6-9]\d{9}$/.test(phone.replace(/[\s-]/g, '').replace(/^(\+91|0)/, ''))) {
        alert('Please enter a valid 10-digit mobile number.');
        document.getElementById('guestPhone')?.focus();
        return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('Please enter a valid email address, or leave it blank.');
        document.getElementById('customerEmail')?.focus();
        return;
    }

    const { subtotal, gst, total } = cartTotals();
    const booking = {
        id: 'HH' + Date.now(),
        bookingDate: new Date().toISOString(),
        guestName: name,
        guestPhone: phone,
        customerEmail: email,
        items: cart.map(item => ({ ...item })),
        subtotal: subtotal,
        tax: gst,
        total: total,
        status: 'Pending Payment'
    };

    const btn = document.getElementById('confirmBookingBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving booking…'; }

    await saveToGoogleSheets(booking);

    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-lock"></i> Reserve &amp; Pay'; }

    cart = [];
    saveCart();
    updateCartCount();

    document.getElementById('cartModal').style.display = 'none';
    showPayment(booking);
}

// Google Sheets Integration
async function saveToGoogleSheets(booking) {
    if (!BOOKINGS_SHEET_URL) {
        console.log('Google Sheets integration not configured.');
        return;
    }

    const data = {
        bookingId: booking.id,
        bookingDate: booking.bookingDate,
        guestName: booking.guestName,
        guestPhone: booking.guestPhone,
        guestEmail: booking.customerEmail,
        checkIn: booking.items[0].checkIn,
        checkOut: booking.items[0].checkOut,
        adults: booking.items.reduce((s, i) => s + i.adults, 0),
        children: booking.items.reduce((s, i) => s + i.children, 0),
        nights: booking.items[0].nights,
        roomName: booking.items.map(i => `${i.roomName} (${formatDate(i.checkIn)} – ${formatDate(i.checkOut)}, ${i.nights}N)`).join('; '),
        subtotal: booking.subtotal,
        gst: booking.tax,
        total: booking.total,
        status: booking.status
    };

    try {
        // text/plain keeps this a "simple" request so Apps Script accepts it without CORS preflight
        await fetch(BOOKINGS_SHEET_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(data)
        });
    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
    }
}

// Payment Functions
let currentBooking = null;

function upiLinkFor(booking) {
    // Keep '@' unencoded and use %20 for spaces — some UPI apps reject '%40' or '+'
    return `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&mc=${UPI_MERCHANT_CODE}` +
        `&am=${booking.total.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Booking ' + booking.id)}`;
}

function showPayment(booking) {
    currentBooking = booking;
    document.getElementById('payBookingId').textContent = booking.id;
    document.getElementById('payAmount').textContent = `₹${formatINR(booking.total)}`;
    document.getElementById('payUpiId').textContent = UPI_ID;

    const upiBtn = document.getElementById('openUpiAppBtn');
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (upiBtn) {
        upiBtn.href = upiLinkFor(booking);
        upiBtn.style.display = isMobile ? 'inline-flex' : 'none';
    }

    const msg = encodeURIComponent(
        `Hello Hanuman Heritage, I have paid ₹${formatINR(booking.total)} for booking ${booking.id} (${booking.guestName}). Please confirm my booking.`
    );
    const wa = document.getElementById('whatsappConfirmBtn');
    if (wa) wa.href = `https://wa.me/91${HOTEL_PHONE}?text=${msg}`;

    document.getElementById('paymentModal').style.display = 'block';
}

function printBill() {
    const booking = currentBooking;
    if (!booking) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Booking ${booking.id} - Hanuman Heritage</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .header h1 { color: #c9a961; }
                    .bill-details { margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                    th { background-color: #c9a961; color: white; }
                    .total-row { font-weight: bold; font-size: 1.2em; }
                    .footer { margin-top: 30px; text-align: center; color: #666; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Hanuman Heritage</h1>
                    <p>Jyothinagar Main Road, Next to Abharan Jewelers<br>Chikkamagaluru, Karnataka 577101<br>Phone: ${HOTEL_PHONE}</p>
                    <h3>Booking Request (Pending Payment Confirmation)</h3>
                </div>
                <div class="bill-details">
                    <p><strong>Booking ID:</strong> ${booking.id}</p>
                    <p><strong>Date:</strong> ${formatDate(booking.bookingDate)}</p>
                    <p><strong>Guest:</strong> ${escapeHTML(booking.guestName)} | ${escapeHTML(booking.guestPhone)}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Room</th>
                            <th>Check-in</th>
                            <th>Check-out</th>
                            <th>Nights</th>
                            <th>Price/Night</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${booking.items.map(item => `
                            <tr>
                                <td>${item.roomName}</td>
                                <td>${formatDate(item.checkIn)}</td>
                                <td>${formatDate(item.checkOut)}</td>
                                <td>${item.nights}</td>
                                <td>₹${formatINR(item.price)}</td>
                                <td>₹${formatINR(item.total)}</td>
                            </tr>
                        `).join('')}
                        <tr>
                            <td colspan="5" style="text-align: right;"><strong>Subtotal:</strong></td>
                            <td><strong>₹${formatINR(booking.subtotal)}</strong></td>
                        </tr>
                        <tr>
                            <td colspan="5" style="text-align: right;"><strong>GST (${GST_RATE * 100}%):</strong></td>
                            <td><strong>₹${formatINR(booking.tax)}</strong></td>
                        </tr>
                        <tr class="total-row">
                            <td colspan="5" style="text-align: right;"><strong>Total:</strong></td>
                            <td><strong>₹${formatINR(booking.total)}</strong></td>
                        </tr>
                    </tbody>
                </table>
                <div class="footer">
                    <p>Your booking is confirmed once the hotel receives your payment.</p>
                    <p>Thank you for choosing Hanuman Heritage!</p>
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// Utility Functions
function formatINR(amount) {
    return Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function scrollToContact() {
    document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
}

// Modal Close Functions
function setupModalClose() {
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.close');
    
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    window.addEventListener('click', function(event) {
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// Cart Icon Click
const cartIcon = document.querySelector('.cart-icon');
if (cartIcon) {
    cartIcon.addEventListener('click', function() {
        if (cart.length === 0) {
            alert('Your cart is empty. Please add rooms to your cart first.');
            return;
        }
        showCart();
    });
}

// Mobile Menu Toggle
document.querySelector('.hamburger')?.addEventListener('click', function() {
    document.querySelector('.nav-menu').classList.toggle('active');
});

// Smooth Scrolling for Navigation Links
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId.startsWith('#')) {
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
                document.querySelector('.nav-menu').classList.remove('active');
            }
        }
    });
});

// Update active nav link on scroll
window.addEventListener('scroll', function() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + current) {
            link.classList.add('active');
        }
    });
});