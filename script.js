// ===== API CONFIGURATION =====
// IMPORTANT: Replace this URL with your Google Apps Script Web App URL
const BASE_URL = "https://script.google.com/macros/s/AKfycbzTYv0qctgrOwoxYOLwu38uD9JI_AKUgw9tiuhnfnFXk-oIQZBxE7pMHeGBn0J7CignXg/exec";

// ===== GLOBAL VARIABLES =====
let cart = [];
let menuItems = [];
let tableNumber = null;
let currentFilter = 'all';

// ===== UTILITY FUNCTIONS =====

// Show loading spinner
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('active');
}

// Hide loading spinner
function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.remove('active');
}

// Show notification
function showNotification(message, type = 'success') {
    alert(message); // Simple alert for now
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}
// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ===== CUSTOMER PAGE FUNCTIONS =====

// Check table number from URL or local storage
function checkTableNumber() {
    const urlParams = new URLSearchParams(window.location.search);
    const tableParam = urlParams.get('table');
    
    if (tableParam) {
        tableNumber = parseInt(tableParam);
        showMenuPage();
    } else {
        const savedTable = localStorage.getItem('tableNumber');
        if (savedTable) {
            tableNumber = parseInt(savedTable);
            showMenuPage();
        }
    }
}

// Set table number manually
function setTableNumber() {
    const input = document.getElementById('table-input');
    const value = parseInt(input.value);
    
    if (value && value > 0) {
        tableNumber = value;
        localStorage.setItem('tableNumber', tableNumber);
        showMenuPage();
    } else {
        showNotification('Please enter a valid table number', 'error');
    }
}

// Show menu page and load menu
function showMenuPage() {
    document.getElementById('table-section').style.display = 'none';
    document.getElementById('menu-container').style.display = 'block';
    document.getElementById('table-display').textContent = tableNumber;
    loadMenu();
}

// Load menu from backend
async function loadMenu() {
    showLoading();
    try {
        const response = await fetch(`${BASE_URL}?action=getMenu`);
        const data = await response.json();
        
        if (data.status === 'success') {
            menuItems = data.data;
            displayMenu();
        } else {
            showNotification('Failed to load menu', 'error');
        }
    } catch (error) {
        console.error('Error loading menu:', error);
        showNotification('Error loading menu. Please check your internet connection.', 'error');
    } finally {
        hideLoading();
    }
}

// Display menu items
function displayMenu() {
    const menuGrid = document.getElementById('menu-grid');
    menuGrid.innerHTML = '';
    
    menuItems.forEach(item => {
        const menuCard = document.createElement('div');
        menuCard.className = 'menu-item';
        
        menuCard.innerHTML = `
            <h3>${item.name}</h3>
            ${item.available === 'no' ? '<span class="unavailable-badge">Unavailable</span>' : ''}
            <span class="price">${formatCurrency(parseFloat(item.price))}</span>
            <button class="btn btn-primary btn-block" 
                    onclick="addToCart('${item.id}', '${item.name}', ${item.price})"
                    ${item.available === 'no' ? 'disabled' : ''}>
                ${item.available === 'no' ? 'Unavailable' : 'Add to Cart'}
            </button>
        `;
        
        menuGrid.appendChild(menuCard);
    });
}

// Add item to cart
function addToCart(id, name, price) {
    const existingItem = cart.find(item => item.id === id);
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            id: id,
            name: name,
            price: parseFloat(price),
            quantity: 1
        });
    }
    
    updateCart();
}

// Update cart display
function updateCart() {
    const cartCount = document.getElementById('cart-count');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    
    // Update cart count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    // Update cart items
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-header">
                    <h4>${item.name}</h4>
                    <span class="cart-item-price">${formatCurrency(item.price * item.quantity)}</span>
                </div>
                <div class="cart-item-controls">
                    <div class="quantity-control">
                        <button class="quantity-btn" onclick="decreaseQuantity('${item.id}')">-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="quantity-btn" onclick="increaseQuantity('${item.id}')">+</button>
                    </div>
                    <span class="remove-btn" onclick="removeFromCart('${item.id}')">🗑️ Remove</span>
                </div>
            </div>
        `).join('');
    }
    
    // Update cart total
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = formatCurrency(total);
}

// Increase item quantity
function increaseQuantity(id) {
    const item = cart.find(item => item.id === id);
    if (item) {
        item.quantity++;
        updateCart();
    }
}

// Decrease item quantity
function decreaseQuantity(id) {
    const item = cart.find(item => item.id === id);
    if (item && item.quantity > 1) {
        item.quantity--;
        updateCart();
    }
}

// Remove item from cart
function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCart();
}

// Toggle cart sidebar
function toggleCart() {
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    
    cartSidebar.classList.toggle('active');
    cartOverlay.classList.toggle('active');
}

// Place order
async function placeOrder() {
    if (cart.length === 0) {
        showNotification('Your cart is empty', 'error');
        return;
    }
    
    if (!tableNumber) {
        showNotification('Table number is missing', 'error');
        return;
    }
    
    showLoading();
    
    const orderData = {
        table: tableNumber,
        items: cart.map(item => `${item.name} x${item.quantity}`).join(', '),
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        status: 'pending',
        time: new Date().toISOString()
    };
    
    try {
        const response = await fetch(`${BASE_URL}?action=placeOrder`, {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showNotification('Order placed successfully! 🎉');
            cart = [];
            updateCart();
            toggleCart();
        } else {
            showNotification('Failed to place order', 'error');
        }
    } catch (error) {
        console.error('Error placing order:', error);
        showNotification('Error placing order. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// ===== CHEF DASHBOARD FUNCTIONS =====

// Load chef orders
async function loadChefOrders() {
    try {
        const response = await fetch(`${BASE_URL}?action=getOrders`);
        const data = await response.json();
        
        if (data.status === 'success') {
            displayChefOrders(data.data);
        }
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// Display chef orders
function displayChefOrders(orders) {
    const ordersGrid = document.getElementById('orders-grid');
    
    // Filter orders based on current filter
    let filteredOrders = orders;
    if (currentFilter !== 'all') {
        filteredOrders = orders.filter(order => order.status === currentFilter);
    }
    
    if (filteredOrders.length === 0) {
        ordersGrid.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No orders found</p>';
        return;
    }
    
    ordersGrid.innerHTML = filteredOrders.map(order => `
        <div class="order-card">
            <div class="order-header">
                <span class="table-number">Table ${order.table}</span>
                <span class="order-time">${formatDate(order.time)}</span>
            </div>
            <div class="order-items">
                <h4>Items:</h4>
                <ul>
                    ${order.items.split(', ').map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
            <div class="order-total">
                Total: <span>${formatCurrency(parseFloat(order.total))}</span>
            </div>
            <span class="status-badge status-${order.status}">${order.status}</span>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                ${order.status === 'pending' ? `
                    <button class="btn btn-warning btn-sm" onclick="updateOrderStatus('${order.id}', 'preparing')">
                        Start Preparing
                    </button>
                ` : ''}
                ${order.status === 'preparing' ? `
                    <button class="btn btn-success btn-sm" onclick="updateOrderStatus('${order.id}', 'ready')">
                        Mark Ready
                    </button>
                ` : ''}
                ${order.status === 'ready' ? `
                    <span style="color: #28a745; font-weight: 600;">✓ Order Ready</span>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Filter orders
function filterOrders(status) {
    currentFilter = status;
    
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadChefOrders();
}

// Update order status
async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await fetch(`${BASE_URL}?action=updateStatus`, {
            method: 'POST',
            body: JSON.stringify({
                id: orderId,
                status: newStatus
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            loadChefOrders(); // Refresh orders
        }
    } catch (error) {
        console.error('Error updating status:', error);
    }
}

// ===== ADMIN DASHBOARD FUNCTIONS =====

// Switch tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Load sales data
async function loadSalesData() {
    showLoading();
    try {
        const response = await fetch(`${BASE_URL}?action=getOrders`);
        const data = await response.json();
        
        if (data.status === 'success') {
            calculateSales(data.data);
        }
    } catch (error) {
        console.error('Error loading sales:', error);
    } finally {
        hideLoading();
    }
}

// Calculate sales
function calculateSales(orders) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    
    let todaySales = 0;
    let weeklySales = 0;
    let monthlySales = 0;
    let yearlySales = 0;
    
    orders.forEach(order => {
        const orderDate = new Date(order.time);
        const amount = parseFloat(order.total);
        
        if (orderDate >= today) {
            todaySales += amount;
        }
        if (orderDate >= weekAgo) {
            weeklySales += amount;
        }
        if (orderDate >= monthStart) {
            monthlySales += amount;
        }
        if (orderDate >= yearStart) {
            yearlySales += amount;
        }
    });
    
    document.getElementById('sales-today').textContent = formatCurrency(todaySales);
    document.getElementById('sales-weekly').textContent = formatCurrency(weeklySales);
    document.getElementById('sales-monthly').textContent = formatCurrency(monthlySales);
    document.getElementById('sales-yearly').textContent = formatCurrency(yearlySales);
}

// Get sales by date
async function getSalesByDate() {
    const dateInput = document.getElementById('custom-date');
    const selectedDate = dateInput.value;
    
    if (!selectedDate) {
        showNotification('Please select a date', 'error');
        return;
    }
    
    showLoading();
    try {
        const response = await fetch(`${BASE_URL}?action=getOrders`);
        const data = await response.json();
        
        if (data.status === 'success') {
            const selected = new Date(selectedDate);
            const nextDay = new Date(selected.getTime() + 24 * 60 * 60 * 1000);
            
            let customSales = 0;
            
            data.data.forEach(order => {
                const orderDate = new Date(order.time);
                if (orderDate >= selected && orderDate < nextDay) {
                    customSales += parseFloat(order.total);
                }
            });
            
            document.getElementById('sales-custom').textContent = formatCurrency(customSales);
        }
    } catch (error) {
        console.error('Error getting sales by date:', error);
    } finally {
        hideLoading();
    }
}

// ===== MENU MANAGEMENT FUNCTIONS =====

// Load menu management
async function loadMenuManagement() {
    showLoading();
    try {
        const response = await fetch(`${BASE_URL}?action=getMenu`);
        const data = await response.json();
        
        if (data.status === 'success') {
            displayMenuManagement(data.data);
        }
    } catch (error) {
        console.error('Error loading menu:', error);
    } finally {
        hideLoading();
    }
}

// Display menu management
function displayMenuManagement(items) {
    const grid = document.getElementById('menu-management-grid');
    
    grid.innerHTML = items.map(item => `
        <div class="menu-management-item">
            <h3>${item.name}</h3>
            <span class="price">${formatCurrency(parseFloat(item.price))}</span>
            
            <div class="toggle-switch">
                <label class="switch">
                    <input type="checkbox" ${item.available === 'yes' ? 'checked' : ''} 
                           onchange="toggleAvailability('${item.id}', this.checked)">
                    <span class="slider"></span>
                </label>
                <span>${item.available === 'yes' ? 'Available' : 'Unavailable'}</span>
            </div>
            
            <div class="menu-item-actions">
                <button class="btn btn-secondary btn-sm" onclick="openEditModal('${item.id}', '${item.name}', ${item.price})">
                    Edit
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteMenuItem('${item.id}')">
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Add menu item
async function addMenuItem(event) {
    event.preventDefault();
    
    const name = document.getElementById('item-name').value;
    const price = document.getElementById('item-price').value;
    
    showLoading();
    try {
        const response = await fetch(`${BASE_URL}?action=addMenu`, {
            method: 'POST',
            body: JSON.stringify({
                name: name,
                price: parseFloat(price),
                available: 'yes'
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showNotification('Menu item added successfully!');
            document.getElementById('item-name').value = '';
            document.getElementById('item-price').value = '';
            loadMenuManagement();
        } else {
            showNotification('Failed to add item', 'error');
        }
    } catch (error) {
        console.error('Error adding item:', error);
        showNotification('Error adding item', 'error');
    } finally {
        hideLoading();
    }
}

// Open edit modal
function openEditModal(id, name, price) {
    document.getElementById('edit-item-id').value = id;
    document.getElementById('edit-item-name').value = name;
    document.getElementById('edit-item-price').value = price;
    
    document.getElementById('edit-modal').classList.add('active');
    document.getElementById('modal-overlay').classList.add('active');
}

// Close edit modal
function closeEditModal() {
    document.getElementById('edit-modal').classList.remove('active');
    document.getElementById('modal-overlay').classList.remove('active');
}

// Update menu item
async function updateMenuItem(event) {
    event.preventDefault();
    
    const id = document.getElementById('edit-item-id').value;
    const name = document.getElementById('edit-item-name').value;
    const price = document.getElementById('edit-item-price').value;
    
    showLoading();
    try {
        const response = await fetch(`${BASE_URL}?action=updateMenu`, {
            method: 'POST',
            body: JSON.stringify({
                id: id,
                name: name,
                price: parseFloat(price)
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showNotification('Menu item updated successfully!');
            closeEditModal();
            loadMenuManagement();
        } else {
            showNotification('Failed to update item', 'error');
        }
    } catch (error) {
        console.error('Error updating item:', error);
        showNotification('Error updating item', 'error');
    } finally {
        hideLoading();
    }
}

// Toggle availability
async function toggleAvailability(id, isAvailable) {
    try {
        const response = await fetch(`${BASE_URL}?action=updateMenu`, {
            method: 'POST',
            body: JSON.stringify({
                id: id,
                available: isAvailable ? 'yes' : 'no'
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            loadMenuManagement();
        }
    } catch (error) {
        console.error('Error toggling availability:', error);
    }
}

// Delete menu item
async function deleteMenuItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }
    
    showLoading();
    try {
        const response = await fetch(`${BASE_URL}?action=deleteMenu`, {
            method: 'POST',
            body: JSON.stringify({ id: id })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showNotification('Menu item deleted successfully!');
            loadMenuManagement();
        } else {
            showNotification('Failed to delete item', 'error');
        }
    } catch (error) {
        console.error('Error deleting item:', error);
        showNotification('Error deleting item', 'error');
    } finally {
        hideLoading();
    }
}

// ===== QR CODE GENERATOR FUNCTIONS =====

// Generate QR codes
function generateQRCodes(event) {
    event.preventDefault();
    
    const numTables = parseInt(document.getElementById('num-tables').value);
    
    if (!numTables || numTables < 1 || numTables > 100) {
        showNotification('Please enter a valid number of tables (1-100)', 'error');
        return;
    }
    
    const qrGrid = document.getElementById('qr-grid');
    qrGrid.innerHTML = '';
    
    // Get base URL (current page URL without query params)
    const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
    
    for (let i = 1; i <= numTables; i++) {
        const qrCard = document.createElement('div');
        qrCard.className = 'qr-card';
        
        const qrUrl = `${baseUrl}?table=${i}`;
        
        qrCard.innerHTML = `
            <h3>Table ${i}</h3>
            <div class="qr-code" id="qr-${i}"></div>
            <button class="btn btn-primary btn-sm" onclick="downloadQR('qr-${i}', 'Table-${i}')">
                Download QR
            </button>
        `;
        
        qrGrid.appendChild(qrCard);
        
        // Generate QR code
        new QRCode(document.getElementById(`qr-${i}`), {
            text: qrUrl,
            width: 150,
            height: 150,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }
    
    showNotification(`Generated QR codes for ${numTables} tables!`);
}

// Download QR code
function downloadQR(qrId, filename) {
    const qrElement = document.getElementById(qrId);
    const canvas = qrElement.querySelector('canvas');
    
    if (canvas) {
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = url;
        link.click();
    }
}