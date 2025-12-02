/* ---------------------- GLOBAL CONFIG ---------------------- */

// Treat this email as admin for dashboard access
const ADMIN_EMAIL = 'onlyvamsi08@gmail.com';

/* ---------------------- GLOBAL STATE ---------------------- */

let currentUser = null;
let cart = [];
let currentOrders = [];

/* ---------------------- CLEAN NAVIGATION SYSTEM ---------------------- */

const API_BASE = (() => {
    if (window.API_BASE_URL) return window.API_BASE_URL.replace(/\/$/, '');

    const isHttp = window.location && window.location.origin && window.location.origin.startsWith('http');
    const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

    if (!isHttp) {
        return 'http://localhost:3000';
    }

    return isLocalHost ? 'http://localhost:3000' : '';
})();

const buildApiUrl = (path) => {
    if (!path.startsWith('/')) {
        path = `/${path}`;
    }

    if (!API_BASE) return path;

    return API_BASE.endsWith('/') ? `${API_BASE.slice(0, -1)}${path}` : `${API_BASE}${path}`;
};

/* ---------------------- LOGIN STATE MANAGEMENT ---------------------- */

// Load user state from localStorage
async function loadUserState() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        // Load cart from database if user is logged in and helper is available
        if (currentUser && currentUser.id && typeof window.loadCartFromDB === 'function') {
            await window.loadCartFromDB();
        } else {
            // Fallback to localStorage cart if no user ID or helper not ready
            const savedCart = localStorage.getItem('cart');
            if (savedCart) {
                cart = JSON.parse(savedCart);
            }
        }
    } else {
        // No user, clear cart
        cart = [];
        saveUserState();
    }
    updateNavigation();
    updateCartCount();
}

// Save user state to localStorage
function saveUserState() {
    if (currentUser) {
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
        localStorage.removeItem('currentUser');
    }
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Update navigation based on login state
function updateNavigation() {
    const isLoggedIn = !!currentUser;
    const isAdmin = isLoggedIn && currentUser && currentUser.email === ADMIN_EMAIL;
    document.getElementById('loginNavBtn').style.display = isLoggedIn ? 'none' : 'inline-block';
    document.getElementById('menuNavBtn').style.display = (isLoggedIn && !isAdmin) ? 'inline-block' : 'none';
    document.getElementById('cartNavBtn').style.display = (isLoggedIn && !isAdmin) ? 'inline-block' : 'none';
    document.getElementById('ordersNavBtn').style.display = (isLoggedIn && !isAdmin) ? 'inline-block' : 'none';
    document.getElementById('profileNavBtn').style.display = isLoggedIn ? 'inline-block' : 'none';
    document.getElementById('logoutBtn').style.display = isLoggedIn ? 'inline-block' : 'none';

    // Admin visibility based on email
    const adminNavBtn = document.getElementById('adminNavBtn');
    if (adminNavBtn) {
        adminNavBtn.style.display = isAdmin ? 'inline-block' : 'none';
    }

    // Show/hide public sections (Home/About/Services/Contact) for admin
    const publicTargets = ['home', 'about', 'services', 'contact'];
    publicTargets.forEach(target => {
        const btn = document.querySelector(`.nav-btn[data-target='${target}']`);
        if (btn) {
            btn.style.display = (isAdmin ? 'none' : 'inline-block');
        }
    });
}

// Update cart count badge
function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCount').textContent = count;
}

// Logout function
async function logout() {
    if (currentUser && currentUser.id) {
        try {
            // Record logout in database
            await fetch(buildApiUrl('/api/logout'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id })
            });
        } catch (err) {
            console.error('Logout API error:', err);
        }
    }
    
    currentUser = null;
    cart = [];
    saveUserState();
    updateNavigation();
    updateCartCount();
    showSection('home');
    Swal.fire({ icon: 'success', title: 'Logged Out', text: 'You have been logged out successfully' });
}

// Unified section switcher
function showSection(id) {
    // Toggle section visibility + active class for smooth transitions
    document.querySelectorAll("section").forEach(sec => {
        const isTarget = sec.id === id;
        sec.style.display = isTarget ? "block" : "none";
        if (isTarget) {
            sec.classList.add("active");
        } else {
            sec.classList.remove("active");
        }
    });

    // Highlight active nav button
    document.querySelectorAll(".nav-btn").forEach(btn => {
        const target = btn.dataset.target;
        if (target) {
            btn.classList.toggle("active", target === id);
        } else {
            btn.classList.remove("active");
        }
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Header Navigation (Home / About / Services / Contact)
document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        if (btn.id === 'logoutBtn') {
            logout();
        } else if (btn.dataset.target) {
            showSection(btn.dataset.target);
            // Load section-specific data
            if (btn.dataset.target === 'menu') loadMenuItems();
            if (btn.dataset.target === 'cart') renderCart();
            if (btn.dataset.target === 'orders') loadOrders();
            if (btn.dataset.target === 'profile') loadProfile();
            if (btn.dataset.target === 'admin') loadAdminDashboard();
        }
    });
});

// Hero \"View Menu\" button behavior: before login → Services; after login → Menu
const viewMenuBtn = document.getElementById('viewMenuBtn');
if (viewMenuBtn) {
    viewMenuBtn.addEventListener('click', () => {
        if (currentUser) {
            showSection('menu');
            if (typeof loadMenuItems === 'function') loadMenuItems();
        } else {
            showSection('services');
        }
    });
}

// Login/Register Switchers (links inside auth forms)
document.querySelectorAll(".link-switch").forEach(link => {
    link.addEventListener("click", e => {
        e.preventDefault();
        showSection(link.dataset.target);
    });
});

// Hash Navigation Support (example: index.html#login)
if (location.hash) {
    const target = location.hash.replace("#", "");
    if (document.getElementById(target)) {
        showSection(target);
    }
} else {
    // Load user state on page load
    loadUserState().then(() => {
        if (currentUser) {
            const isAdmin = currentUser.email === ADMIN_EMAIL;
            if (isAdmin) {
                showSection("admin");
                if (typeof loadAdminDashboard === 'function') loadAdminDashboard();
            } else {
                showSection("menu");
                if (typeof loadMenuItems === 'function') loadMenuItems();
            }
        } else {
            showSection("home"); // Default page
        }
    });
}

/* ---------------------- MENU LOADER ---------------------- */
$(document).ready(function () {

    // Services "Load Menu" button behavior:
    // - If NOT logged in → show JSON preview in Services section
    // - If logged in     → go to main Menu section instead
    $("#loadMenu").click(function () {
        if (currentUser) {
            showSection('menu');
            if (typeof loadMenuItems === 'function') loadMenuItems();
            return;
        }

        $("#loader").show();
        $.getJSON("menu.json", function (data) {
            setTimeout(() => {
                $("#loader").hide();
                $("#menuList").empty();
                $.each(data, function (i, item) {
                    $("#menuList").append(
                        `<div class="menu-item">${item.item}<br><span>${item.price}</span></div>`
                    );
                });
            }, 800);
        });
    });

    // Load menu items for logged-in users
    window.loadMenuItems = function() {
        if (!currentUser) return;
        $.getJSON("menu.json", function (data) {
            const container = document.getElementById('menuItemsContainer');
            if (!container) return;
            container.innerHTML = '';
            data.forEach(item => {
                const priceNum = parseInt(item.price.replace('₹', ''));
                const itemId = item.item.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
                const menuCard = document.createElement('div');
                menuCard.className = 'menu-item-card';
                menuCard.innerHTML = `
                    <h3>${item.item}</h3>
                    <p class="item-price">${item.price}</p>
                    <div class="item-controls">
                        <button class="btn-quantity" onclick="updateQuantity('${itemId}', '${item.item}', -1)">-</button>
                        <span class="quantity" id="qty-${itemId}">0</span>
                        <button class="btn-quantity" onclick="updateQuantity('${itemId}', '${item.item}', 1)">+</button>
                    </div>
                    <button class="btn-add-cart" onclick="addToCart('${item.item}', ${priceNum})">Add to Cart</button>
                `;
                container.appendChild(menuCard);
            });
        });
    };

    // Load cart from database (defined globally)
    window.loadCartFromDB = async function() {
        if (!currentUser || !currentUser.id) return;
        
        try {
            const res = await fetch(buildApiUrl(`/api/cart/${currentUser.id}`));
            if (res.ok) {
                const data = await res.json();
                cart = data.items || [];
                saveUserState();
                updateCartCount();
            }
        } catch (err) {
            console.error('Cart load error:', err);
        }
    };
    
    // Add to cart function
    window.addToCart = async function(itemName, price) {
        const existingItem = cart.find(item => item.name === itemName);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ name: itemName, price: price, quantity: 1 });
        }
        saveUserState();
        updateCartCount();
        
        // Save to database if logged in
        if (currentUser && currentUser.id) {
            try {
                await fetch(buildApiUrl('/api/cart'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUser.id, items: cart })
                });
            } catch (err) {
                console.error('Cart save error:', err);
            }
        }
        
        Swal.fire({ icon: 'success', title: 'Added!', text: `${itemName} added to cart`, timer: 1500, showConfirmButton: false });
    };

    // Update quantity function
    window.updateQuantity = function(itemId, itemName, change) {
        const qtyEl = document.getElementById(`qty-${itemId}`);
        if (!qtyEl) return;
        let currentQty = parseInt(qtyEl.textContent) || 0;
        currentQty = Math.max(0, currentQty + change);
        qtyEl.textContent = currentQty;
    };

    // Render cart
    window.renderCart = function() {
        const cartItems = document.getElementById('cartItems');
        const cartSummary = document.getElementById('cartSummary');
        if (!cartItems) return;
        
        if (cart.length === 0) {
            cartItems.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
            if (cartSummary) cartSummary.style.display = 'none';
            return;
        }

        cartItems.innerHTML = '';
        let total = 0;

        cart.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>₹${item.price} × ${item.quantity} = ₹${itemTotal}</p>
                </div>
                <div class="cart-item-controls">
                    <button class="btn-quantity" onclick="updateCartQuantity(${index}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="btn-quantity" onclick="updateCartQuantity(${index}, 1)">+</button>
                    <button class="btn-remove" onclick="removeFromCart(${index})">Remove</button>
                </div>
            `;
            cartItems.appendChild(cartItem);
        });

        if (document.getElementById('cartTotal')) {
            document.getElementById('cartTotal').textContent = total;
        }
        if (cartSummary) cartSummary.style.display = 'block';
    };

    // Update cart quantity
    window.updateCartQuantity = async function(index, change) {
        if (index < 0 || index >= cart.length) return;
        cart[index].quantity = Math.max(0, cart[index].quantity + change);
        if (cart[index].quantity === 0) {
            cart.splice(index, 1);
        }
        saveUserState();
        updateCartCount();
        renderCart();
        
        // Save to database if logged in
        if (currentUser && currentUser.id) {
            try {
                await fetch(buildApiUrl('/api/cart'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUser.id, items: cart })
                });
            } catch (err) {
                console.error('Cart save error:', err);
            }
        }
    };

    // Remove from cart
    window.removeFromCart = async function(index) {
        if (index < 0 || index >= cart.length) return;
        cart.splice(index, 1);
        saveUserState();
        updateCartCount();
        renderCart();
        
        // Save to database if logged in
        if (currentUser && currentUser.id) {
            try {
                await fetch(buildApiUrl('/api/cart'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUser.id, items: cart })
                });
            } catch (err) {
                console.error('Cart save error:', err);
            }
        }
    };

    // Load orders
    window.loadOrders = async function() {
        const container = document.getElementById('ordersContainer');
        if (!container) return;
        
        if (!currentUser || !currentUser.id) {
            container.innerHTML = '<p class="empty-orders">Please login to view orders</p>';
            return;
        }
        
        try {
            const res = await fetch(buildApiUrl(`/api/orders/${currentUser.id}`));
            if (res.ok) {
                const data = await res.json();
                const orders = data.orders || [];
                
                if (orders.length === 0) {
                    container.innerHTML = '<p class="empty-orders">No orders yet. Start ordering from the Menu!</p>';
                    return;
                }
                
                container.innerHTML = '';
                currentOrders = orders;
                orders.forEach(order => {
                    const orderDate = new Date(order.CreatedAt).toLocaleDateString();
                    const orderCard = document.createElement('div');
                    orderCard.className = 'order-card';
                    orderCard.innerHTML = `
                        <div class="order-header">
                            <h3>Order #${order.Id}</h3>
                            <div class="order-meta">
                                <span class="order-date">${orderDate}</span>
                                <span class="order-status ${order.Status.toLowerCase()}">${order.Status}</span>
                            </div>
                        </div>
                        <div class="order-items">
                            ${order.items.map(item => `
                                <div class="order-item">
                                    <span>${item.name}</span>
                                    <span>${item.quantity} × ₹${item.price} = ₹${item.SubTotal}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="order-total">
                            <strong>Total: ₹${order.TotalAmount}</strong>
                        </div>
                        <div class="order-actions">
                            <button class="btn secondary" onclick="showOrderDetails(${order.Id})">Details</button>
                            <button class="btn primary" onclick="reorder(${order.Id})">Order Again</button>
                        </div>
                    `;
                    container.appendChild(orderCard);
                });
            } else {
                container.innerHTML = '<p class="empty-orders">Error loading orders</p>';
            }
        } catch (err) {
            console.error('Orders load error:', err);
            container.innerHTML = '<p class="empty-orders">Error loading orders</p>';
        }
    };

    // Load profile
    window.loadProfile = async function() {
        if (!currentUser) return;

        const isAdmin = currentUser.email === ADMIN_EMAIL;

        if (document.getElementById('userEmail')) {
            document.getElementById('userEmail').textContent = currentUser.email;
        }
        if (document.getElementById('memberSince')) {
            const memberDate = new Date(currentUser.createdAt || currentUser.loginTime);
            document.getElementById('memberSince').textContent = memberDate.toLocaleDateString();
        }

        // Toggle user/admin stats blocks
        const userStatsBlock = document.querySelector('.profile-stats.user-stats');
        const adminStatsBlock = document.querySelector('.profile-stats.admin-stats');
        if (userStatsBlock && adminStatsBlock) {
            userStatsBlock.style.display = isAdmin ? 'none' : 'grid';
            adminStatsBlock.style.display = isAdmin ? 'grid' : 'none';
        }

        // Load stats from database
        if (currentUser.id) {
            try {
                const res = await fetch(buildApiUrl(`/api/user/stats/${currentUser.id}`));
                if (res.ok) {
                    const stats = await res.json();

                    if (!isAdmin) {
                        // Normal user view
                        if (document.getElementById('totalOrders')) {
                            document.getElementById('totalOrders').textContent = stats.totalOrders || 0;
                        }
                        if (document.getElementById('totalSpent')) {
                            document.getElementById('totalSpent').textContent = `₹${stats.totalSpent || 0}`;
                        }
                    } else {
                        // Admin overview in profile
                        const set = (id, value, prefix = '') => {
                            const el = document.getElementById(id);
                            if (el) el.textContent = prefix ? `${prefix}${value}` : value;
                        };
                        set('profileAdminTotalOrders', stats.totalOrders || 0);
                        set('profileAdminTotalRevenue', stats.totalRevenue || 0, '₹');
                        set('profileAdminRevenueToday', stats.revenueToday || 0, '₹');
                        set('profileAdminRevenueMonth', stats.revenueMonth || 0, '₹');
                        set('profileAdminPendingOrders', stats.pendingOrders || 0);
                        set('profileAdminAcceptedOrders', stats.acceptedOrders || 0);
                        set('profileAdminCompletedOrders', stats.completedOrders || 0);
                    }
                }
            } catch (err) {
                console.error('Stats load error:', err);
            }
        }
    };

    // Checkout
    $(document).on('click', '#checkoutBtn', async function() {
        if (cart.length === 0) {
            Swal.fire({ icon: 'warning', title: 'Empty Cart', text: 'Add items to cart first!' });
            return;
        }
        
        if (!currentUser || !currentUser.id) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Please login to place an order' });
            return;
        }
        
        const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        try {
            const res = await fetch(buildApiUrl('/api/orders'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.id,
                    items: cart,
                    totalAmount: totalAmount
                })
            });
            
            if (res.ok) {
                const data = await res.json();
                Swal.fire({
                    icon: 'success',
                    title: 'Order Placed!',
                    text: `Your order #${data.orderId} has been placed successfully. We will contact you soon!`,
                    confirmButtonText: 'OK'
                }).then(() => {
                    cart = [];
                    saveUserState();
                    updateCartCount();
                    renderCart();
                    loadOrders();
                    loadProfile(); // Refresh stats
                });
            } else {
                const error = await res.json();
                Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'Failed to place order' });
            }
        } catch (err) {
            console.error('Checkout error:', err);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Network error. Please try again.' });
        }
    });

    /* ---------------------- CONTACT FORM (single, fixed handler) ---------------------- */

    // Helper: get element by id or fallback to querySelector by name
    function elByIdOrName(form, idOrName) {
        const byId = document.getElementById(idOrName);
        if (byId) return byId;
        return form.querySelector(`[name="${idOrName}"]`);
    }

    const contactForm = document.getElementById("contactForm");

    // If contactForm not found, do nothing (prevents errors)
    if (contactForm) {
        contactForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            // grab inputs (supports either id or name attributes)
            const nameEl = elByIdOrName(contactForm, "name");
            const emailEl = elByIdOrName(contactForm, "email");
            const phoneEl = elByIdOrName(contactForm, "phone") || elByIdOrName(contactForm, "mobile");
            const messageEl = elByIdOrName(contactForm, "message");

            const statusEl = document.getElementById("form-status");

            // defensive checks
            const name = nameEl ? nameEl.value.trim() : "";
            const email = emailEl ? emailEl.value.trim() : "";
            const phone = phoneEl ? phoneEl.value.trim() : "";
            const message = messageEl ? messageEl.value.trim() : "";

            // simple validations
            if (!name || name.length < 3 || !/^[A-Za-z ]+$/.test(name)) {
                // inline status + alert
                if (statusEl) { statusEl.textContent = "Enter a valid name (min 3 letters)."; statusEl.style.color = "red"; }
                Swal.fire({ icon: "error", title: "Validation error", text: "Enter a valid name (min 3 letters, letters only)." });
                return;
            }

            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailPattern.test(email)) {
                if (statusEl) { statusEl.textContent = "Enter a valid email address."; statusEl.style.color = "red"; }
                Swal.fire({ icon: "error", title: "Validation error", text: "Enter a valid email address." });
                return;
            }

            if (!phone || !/^[6-9][0-9]{9}$/.test(phone)) {
                if (statusEl) { statusEl.textContent = "Enter a valid 10-digit phone starting with 6-9."; statusEl.style.color = "red"; }
                // also set phone specific inline message if available
                const phoneError = document.getElementById("phone-error");
                if (phoneError) phoneError.textContent = "Phone must be 10 digits and start with 6-9.";
                Swal.fire({ icon: "error", title: "Validation error", text: "Phone must be 10 digits and start with 6-9." });
                return;
            } else {
                const phoneError = document.getElementById("phone-error");
                if (phoneError) phoneError.textContent = "";
            }

            if (!message || message.length < 10) {
                if (statusEl) { statusEl.textContent = "Message must be at least 10 characters."; statusEl.style.color = "red"; }
                Swal.fire({ icon: "error", title: "Validation error", text: "Message must be at least 10 characters." });
                return;
            }

            // passed validation — show loading Swal
            Swal.fire({
                title: "Sending...",
                text: "Please wait while we submit your message.",
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            try {
                const res = await fetch(buildApiUrl('/api/contact'), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, phone, message })
                });

                const data = await res.json().catch(() => ({}));

                Swal.close();

                if (!res.ok) {
                    throw new Error(data.message || "Server returned an error while submitting.");
                }

                Swal.fire({ icon: "success", title: "Submitted", text: data.message || "Thank you — we'll get back to you soon!" });
                contactForm.reset();
                if (statusEl) {
                    statusEl.textContent = "Message sent successfully!";
                    statusEl.style.color = "green";
                }
                const popup = document.getElementById("popup");
                if (popup) popup.style.display = "flex";

            } catch (err) {
                // network or other failure
                Swal.close();
                Swal.fire({ icon: "error", title: "Error", text: err.message || "Could not submit — check your connection or server." });
                console.error("Contact submit error:", err);
            }
        });
    }
    /* ----- FIX FOR CLEARING MESSAGE ERROR WHILE TYPING ----- */
    const msgInputFix = document.getElementById("message");
    const msgErrorFix = document.getElementById("form-status");

    if (msgInputFix && msgErrorFix) {
        msgInputFix.addEventListener("input", () => {
            if (msgInputFix.value.trim().length >= 10) {
                msgErrorFix.textContent = "";
                msgErrorFix.style.color = "";
            }
        });
    }

    // close popup handler (keeps existing behavior)
    $("#closePopup").click(function () {
        $("#popup").hide();
    });

}); // end document.ready


/* ---------------------- ADMIN DASHBOARD (FRONTEND) ---------------------- */

async function loadAdminDashboard() {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
        Swal.fire({ icon: 'error', title: 'Access denied', text: 'You are not allowed to view this section.' });
        showSection('home');
        return;
    }

    await Promise.all([
        loadAdminSummary(),
        loadAdminUsers(),
        loadAdminOrders(),
        loadAdminContacts()
    ]);

    const tabs = document.querySelectorAll('.admin-tab');
    const panels = document.querySelectorAll('.admin-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.adminTab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            panels.forEach(panel => {
                panel.classList.toggle('active', panel.id === `admin-${target}`);
            });
        });
    });

    tabs.forEach(t => t.classList.remove('active'));
    const summaryTab = document.querySelector('.admin-tab[data-admin-tab="summary"]');
    if (summaryTab) summaryTab.classList.add('active');
    panels.forEach(p => p.classList.remove('active'));
    const summaryPanel = document.getElementById('admin-summary');
    if (summaryPanel) summaryPanel.classList.add('active');
}

async function loadAdminSummary() {
    try {
        const res = await fetch(buildApiUrl('/api/admin/summary'));
        if (!res.ok) return;
        const data = await res.json();
        const setText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };
        setText('adminTotalUsers', data.totalUsers ?? 0);
        setText('adminTotalOrders', data.totalOrders ?? 0);
        setText('adminTotalRevenue', `₹${data.totalRevenue ?? 0}`);
        setText('adminTotalContacts', data.totalContacts ?? 0);
    } catch (err) {
        console.error('Admin summary error:', err);
    }
}

async function loadAdminUsers() {
    try {
        const res = await fetch(buildApiUrl('/api/admin/users'));
        if (!res.ok) return;
        const data = await res.json();
        const body = document.getElementById('adminUsersBody');
        if (!body) return;
        body.innerHTML = '';
        (data.users || []).forEach(user => {
            const tr = document.createElement('tr');
            const joined = new Date(user.CreatedAt).toLocaleDateString();
            const role = (user.Email === ADMIN_EMAIL) ? 'Admin' : 'User';
            tr.innerHTML = `
                <td>${role}</td>
                <td>${user.Email}</td>
                <td>${joined}</td>
                <td>${user.TotalOrders}</td>
                <td>₹${user.TotalSpent}</td>
            `;
            body.appendChild(tr);
        });
    } catch (err) {
        console.error('Admin users error:', err);
    }
}

async function loadAdminOrders() {
    try {
        const res = await fetch(buildApiUrl('/api/admin/orders'));
        if (!res.ok) return;
        const data = await res.json();
        const body = document.getElementById('adminOrdersBody');
        if (!body) return;
        body.innerHTML = '';
        (data.orders || []).forEach(order => {
            const dateStr = new Date(order.CreatedAt).toLocaleString();
            const tr = document.createElement('tr');

            const statusRaw = order.Status || 'Pending';
            const statusLower = statusRaw.toLowerCase();

            // Build actions based on status
            let actionsHtml = '';
            if (statusRaw === 'Pending') {
                actionsHtml = `
                    <button class="btn secondary btn-xs" onclick="updateOrderStatus(${order.Id}, 'Accepted')">Accept</button>
                    <button class="btn primary btn-xs" onclick="updateOrderStatus(${order.Id}, 'Completed')">Complete</button>
                `;
            } else if (statusRaw === 'Accepted') {
                // Only allow moving to completed
                actionsHtml = `
                    <button class="btn primary btn-xs" onclick="updateOrderStatus(${order.Id}, 'Completed')">Complete</button>
                `;
            } // Completed -> no actions

            tr.innerHTML = `
                <td>${order.Id}</td>
                <td>${order.Email}</td>
                <td>₹${order.TotalAmount}</td>
                <td><span class="order-status-badge ${statusLower}">${statusRaw}</span></td>
                <td>${dateStr}</td>
                <td>${actionsHtml}</td>
            `;
            body.appendChild(tr);
        });
    } catch (err) {
        console.error('Admin orders error:', err);
    }
}

async function loadAdminContacts() {
    try {
        const res = await fetch(buildApiUrl('/api/admin/contacts'));
        if (!res.ok) return;
        const data = await res.json();
        const body = document.getElementById('adminContactsBody');
        if (!body) return;
        body.innerHTML = '';
        (data.contacts || []).forEach(msg => {
            const dateStr = new Date(msg.CreatedAt).toLocaleString();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${msg.Id}</td>
                <td>${msg.Name}</td>
                <td>${msg.Email}</td>
                <td>${msg.Phone}</td>
                <td class="admin-message-cell">${msg.Message}</td>
                <td>${dateStr}</td>
            `;
            body.appendChild(tr);
        });
    } catch (err) {
        console.error('Admin contacts error:', err);
    }
}

// Admin: update order status
async function updateOrderStatus(orderId, newStatus) {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
        Swal.fire({ icon: 'error', title: 'Access denied', text: 'Only admin can change order status.' });
        return;
    }

    const pretty = newStatus === 'Accepted' ? 'Order Accepted' :
                   newStatus === 'Completed' ? 'Order Completed' : newStatus;

    const result = await Swal.fire({
        icon: 'question',
        title: 'Change order status?',
        text: `Set status to "${pretty}" for order #${orderId}?`,
        showCancelButton: true,
        confirmButtonText: 'Yes, update',
        cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
        const res = await fetch(buildApiUrl(`/api/admin/orders/${orderId}/status`), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            throw new Error(data.message || 'Failed to update status');
        }

        Swal.fire({ icon: 'success', title: 'Updated', text: data.message || 'Order status updated.' });
        // Refresh admin data and user-facing orders
        loadAdminOrders();
        loadAdminSummary();
        if (typeof loadOrders === 'function') loadOrders();
    } catch (err) {
        console.error('Order status update error:', err);
        Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'Could not update order status.' });
    }
}


/* ---------------------- AUTHENTICATION (LOGIN & REGISTER) ---------------------- */

const loaderOverlay = document.getElementById('auth-loader');

function showAuthLoader(show = true) {
    if (!loaderOverlay) return;
    loaderOverlay.style.display = show ? 'flex' : 'none';
}

/* ---------------------- REGISTER ---------------------- */

const regFormEl = document.getElementById('regForm');
if (regFormEl) {
    regFormEl.addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = document.getElementById('regEmail').value.trim();
        const pass = document.getElementById('regPassword').value.trim();
        const cpass = document.getElementById('regConfirm').value.trim();
        const msgEl = document.getElementById('regMsg');

        msgEl.textContent = '';

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const passPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/;

        if (!emailPattern.test(email)) {
            msgEl.textContent = 'Enter a valid email.';
            return;
        }
        if (!passPattern.test(pass)) {
            msgEl.innerHTML = "Password must be 8+ chars, 1 uppercase, 1 lowercase, 1 number.";
            return;
        }
        if (pass !== cpass) {
            msgEl.textContent = 'Passwords do not match.';
            return;
        }

        try {
            showAuthLoader(true);

            const res = await fetch(buildApiUrl('/api/register'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: pass })
            });

            const data = await res.json().catch(() => ({}));
            showAuthLoader(false);

            if (res.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Registered Successfully',
                    text: data.message || 'Account created'
                }).then(() => showSection("login"));
            } else {
                Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Registration failed' });
            }

        } catch (err) {
            showAuthLoader(false);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Network/server error.' });
        }
    });
}

/* ---------------------- LOGIN ---------------------- */

const loginFormEl = document.getElementById('loginForm');
if (loginFormEl) {
    // Toggle email field usability when "Login as Admin" is checked
    const adminToggle = document.getElementById('isAdminLogin');
    if (adminToggle) {
        adminToggle.addEventListener('change', () => {
            const emailInputEl = document.getElementById('loginEmail');
            if (!emailInputEl) return;
            if (adminToggle.checked) {
                emailInputEl.value = '';
                emailInputEl.disabled = true;
                emailInputEl.placeholder = 'Admin email hidden';
            } else {
                emailInputEl.disabled = false;
                emailInputEl.placeholder = 'you@example.com';
            }
        });
    }

    loginFormEl.addEventListener('submit', async function (e) {
        e.preventDefault();

        const emailInput = document.getElementById('loginEmail').value.trim();
        const pass = document.getElementById('loginPassword').value.trim();
        const isAdminLogin = document.getElementById('isAdminLogin')?.checked;
        const msgEl = document.getElementById('loginMsg');

        msgEl.textContent = '';

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // For normal users, validate email. For admin login, email field is ignored.
        if (!isAdminLogin) {
            if (!emailPattern.test(emailInput)) {
                msgEl.textContent = 'Enter a valid email.';
                return;
            }
        }
        if (pass.length < 8) {
            msgEl.textContent = 'Password must be 8 characters minimum.';
            return;
        }

        // Use hardcoded admin email for admin login, otherwise entered email
        const loginEmail = isAdminLogin ? ADMIN_EMAIL : emailInput;

        try {
            showAuthLoader(true);

            const res = await fetch(buildApiUrl('/api/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: loginEmail, password: pass })
            });

            const data = await res.json().catch(() => ({}));
            showAuthLoader(false);

            if (res.ok) {
                // Set user state with data from server
                currentUser = {
                    id: data.user.id,
                    email: data.user.email,
                    createdAt: data.user.createdAt,
                    loginTime: new Date().toISOString()
                };
                saveUserState();
                updateNavigation();
                
                // Load cart from database
                loadCartFromDB();
                
                Swal.fire({ icon: 'success', title: 'Welcome!', text: data.message || 'Login successful' })
                    .then(() => {
                        const isAdmin = currentUser.email === ADMIN_EMAIL;
                        if (isAdmin) {
                            showSection('profile');
                            if (typeof loadProfile === 'function') loadProfile();
                        } else {
                            showSection('menu');
                            if (typeof loadMenuItems === 'function') loadMenuItems();
                        }
                    });
            } else {
                Swal.fire({ icon: 'error', title: 'Login Failed', text: data.message || 'Invalid credentials' });
            }

        } catch (err) {
            showAuthLoader(false);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Network/server error.' });
        }
    });
}
