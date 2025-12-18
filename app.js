// ============================================
// CRM System - Main Application Logic
// ============================================

// Supabase Configuration
const SUPABASE_URL = 'https://abqracafkjerlcemqnva.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFicXJhY2Fma2plcmxjZW1xbnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDk1NTYsImV4cCI6MjA4MDMyNTU1Nn0.WejWdsYxqC7ESs3C8UkGhWUpnDJ7xD5j4-n9BKRE7rE';

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Login Logic
function handleLogin(event) {
    event.preventDefault();
    const password = document.getElementById('password').value;
    
    if (password === '3737') {
        sessionStorage.setItem('isLoggedIn', 'true');
        document.getElementById('login-modal').classList.remove('active');
        // Initialize app only after login
        initializeApp();
    } else {
        alert('סיסמה שגויה');
        document.getElementById('password').value = '';
        document.getElementById('password').focus();
    }
}

// Global state
let products = [];
let customers = [];
let contacts = [];
let suppliers = [];
let supplierOrders = [];
let dealItems = [];
let itemCounter = 0;

// Pagination Global State
// Pagination Global State
const ROW_OPTIONS = [10, 25, 50, 100];
const paginationState = {
    audit: { page: 1, limit: 50 },
    activities: { page: 1, limit: 50 },
    contacts: { page: 1, limit: 50 },
    deals: { page: 1, limit: 50 },
    customers: { page: 1, limit: 50 },
    products: { page: 1, limit: 50 },
    suppliers: { page: 1, limit: 50 },
    'supplier-orders': { page: 1, limit: 50 }
};

// View State (cards vs table)
const viewState = {
    activities: 'table', // 'cards' or 'table'
    customers: 'table',
    products: 'table',
    deals: 'table',
    contacts: 'table'
};

// Helper to render pagination controls
// Helper to render pagination controls
function renderPagination(totalItems, currentPage, viewName) {
    const limit = paginationState[viewName]?.limit || 10;
    const totalPages = Math.ceil(totalItems / limit);
    
    if (totalItems === 0) return '';
    
    return `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-color); flex-wrap: wrap; gap: 1rem;">
            <div style="color: var(--text-tertiary); font-size: 0.85rem;">
                סה"כ ${totalItems} רשומות
            </div>
            
            <div style="display: flex; align-items: center; gap: 1rem;">
                <button class="btn btn-secondary btn-sm" onclick="changePage('${viewName}', ${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>➡️ הקודם</button>
                <span style="font-size: 0.9rem; color: var(--text-secondary);">עמוד ${currentPage} מתוך ${totalPages}</span>
                <button class="btn btn-secondary btn-sm" onclick="changePage('${viewName}', ${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>הבא ⬅️</button>
            </div>
        </div>
    `;
}

function changeRowsPerPage(viewName, newLimit) {
    paginationState[viewName].limit = parseInt(newLimit);
    paginationState[viewName].page = 1; // Reset to first page
    refreshView(viewName);
}

function toggleView(viewName, mode) {
    viewState[viewName] = mode;
    
    // Update active button state
    const cardBtn = document.getElementById(`${viewName}-view-cards`);
    const tableBtn = document.getElementById(`${viewName}-view-table`);
    
    if (cardBtn && tableBtn) {
        if (mode === 'cards') {
            cardBtn.style.background = 'var(--text-primary)';
            cardBtn.style.color = 'var(--bg-primary)';
            tableBtn.style.background = 'transparent';
            tableBtn.style.color = 'var(--text-primary)';
        } else {
            tableBtn.style.background = 'var(--text-primary)';
            tableBtn.style.color = 'var(--bg-primary)';
            cardBtn.style.background = 'transparent';
            cardBtn.style.color = 'var(--text-primary)';
        }
    }
    
    refreshView(viewName);
}

function refreshView(viewName) {
    switch (viewName) {
        case 'customers':
            filterCustomers(true); // preserve page mostly, but limit changed
            break;
        case 'contacts':
            filterContacts(true);
            break;
        case 'activities':
            loadActivities(true);
            break;
        case 'deals':
            loadDealsHistory(true);
            break;
        case 'products':
            displayProducts(true); // Need to update displayProducts to accept arg
            break;
        case 'audit':
            loadAuditLog();
            break;
    }
}

async function changePage(viewName, newPage) {
    if (newPage < 1) return;
    paginationState[viewName].page = newPage;
    
    switch (viewName) {
        case 'customers':
            displayCustomers(); // No filters yet
            break;
        case 'contacts':
            filterContacts(true);
            break;
        case 'activities':
            loadActivities(true);
            break;
        case 'deals':
            loadDealsHistory(true);
            break;
        case 'audit':
            loadAuditLog(); // Server-side handles page from state
            break;
    }
    
    // Scroll to top of list
    const container = document.getElementById(`${viewName}-list`) || document.getElementById('auditlog-list');
    if (container) {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in (sessionStorage persists until tab close)
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        document.getElementById('login-modal').classList.remove('active');
        initializeApp();
    } else {
        // Ensure login modal is visible
        document.getElementById('login-modal').classList.add('active');
    }
});

async function initializeApp() {
    console.log('🚀 CRM System initializing...');
    
    // Setup tab navigation
    setupTabs();
    
    // Load initial data
    await loadProducts();
    await loadCustomers();
    await checkSchemaCapabilities();
    
    // Load dashboard data (default tab)
    // Default is now deals, no specific load needed as it's a form
    // await loadThisWeek();
    
    // Initialize with one empty deal item (status is already set to 'Closed' in HTML/resetForm)
    if (products.length > 0) {
        addDealItem();
    } else {
        updateEmptyState();
    }
    
    console.log('✅ CRM System ready!');
}

async function checkSchemaCapabilities() {
    window.crmCapabilities = { contactInActivity: false, editTracking: false };
    
    // Check contact_id in activities
    try {
        const { error } = await supabaseClient.from('activities').select('contact_id').limit(0);
        if (!error) {
            window.crmCapabilities.contactInActivity = true;
            console.log('✅ Capability detected: Activities support contact linking');
        } else {
            console.warn('⚠️ Capability missing: activity.contact_id (Run migration add_contact_id_to_activities.sql)');
        }
    } catch(e) {}

    // Check edited_at in activities
    try {
        const { error } = await supabaseClient.from('activities').select('edited_at').limit(0);
        if (!error) {
            window.crmCapabilities.editTracking = true;
            console.log('✅ Capability detected: Activities support edit tracking');
        }
    } catch(e) {}
}

// ============================================
// Tab Navigation
// ============================================

function setupTabs() {
    const navSelect = document.getElementById('main-navigation');
    if (!navSelect) return;
    
    // Initial display based on default selection (or current state if preserved)
    const handleNavigation = (tabName) => {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        // Show selected tab content
        const target = document.getElementById(`${tabName}-tab`);
        if (target) {
            target.classList.remove('hidden');
        } else {
            console.warn(`Tab content not found for: ${tabName}`);
        }
        
        // Load data for specific tabs
        if (tabName === 'customers') {
            displayCustomers();
        } else if (tabName === 'products') {
            displayProducts();
        } else if (tabName === 'suppliers') {
            filterSuppliers();
        } else if (tabName === 'supplier-orders') {
            loadSupplierOrders();
        } else if (tabName === 'history') {
            loadDealsHistory();
        } else if (tabName === 'activities') {
            loadActivities();
        } else if (tabName === 'contacts') {
            displayContacts();
        } else if (tabName === 'thisweek') {
            loadThisWeek();
        } else if (tabName === 'auditlog') {
            loadAuditLog();
        } else if (tabName === 'reports') {
            loadReports();
        } else if (tabName === 'search') {
            document.getElementById('global-search-input')?.focus();
        }
        
        // Scroll to top
        window.scrollTo(0, 0);
    };
    
    navSelect.addEventListener('change', (e) => {
        handleNavigation(e.target.value);
    });
    
    // Trigger initially for the default value
    handleNavigation(navSelect.value);
}

function navigateSection(direction) {
    const navSelect = document.getElementById('main-navigation');
    if (!navSelect) return;
    
    const currentIndex = navSelect.selectedIndex;
    const totalOptions = navSelect.options.length;
    let newIndex = currentIndex + direction;
    
    // Bounds check
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= totalOptions) newIndex = totalOptions - 1;
    
    if (newIndex !== currentIndex) {
        navSelect.selectedIndex = newIndex;
        // Manually trigger change event
        const event = new Event('change');
        navSelect.dispatchEvent(event);
    }
}

// ============================================
// Data Loading Functions
// ============================================

async function loadProducts() {
    try {
        const { data, error } = await supabaseClient
            .from('products')
            .select('*')
            .eq('active', true)
            .order('category', { ascending: true })
            .order('product_name', { ascending: true });
        
        if (error) throw error;
        
        products = (data || []).map(p => {
            if (p.image_url && !p.image_url.startsWith('http') && !p.image_url.startsWith('data:')) {
                // Ensure we don't duplicate 'images/' if it's already in the path and the base might have it (though base is catalog/)
                // Just Clean leading slash
                const cleanPath = p.image_url.startsWith('/') ? p.image_url.substring(1) : p.image_url;
                return {
                    ...p,
                    image_url: `https://anfialuminium.github.io/catalog/${cleanPath}`
                };
            }
            return p;
        });
        console.log(`✅ Loaded ${products.length} products`);
        
    } catch (error) {
        console.error('❌ Error loading products:', error);
        showAlert('שגיאה בטעינת מוצרים', 'error');
    }
}

async function loadCustomers() {
    try {
        // Try to load with primary contact (requires contacts table)
        let data, error;
        
        try {
            const result = await supabaseClient
                .from('customers')
                .select(`
                    *,
                    primary_contact:contacts!customers_primary_contact_id_fkey (
                        contact_id,
                        contact_name,
                        phone,
                        email,
                        role
                    )
                `)
                .eq('active', true)
                .order('business_name');
            
            data = result.data;
            error = result.error;
            
            // If there's an error (table doesn't exist), fallback to simple query
            if (error) {
                throw error;
            }
        } catch (joinError) {
            // Fallback: load without primary contact join
            console.log('ℹ️ Loading customers without contacts join (contacts table may not exist yet)');
            const result = await supabaseClient
                .from('customers')
                .select('*')
                .eq('active', true)
                .order('business_name');
            
            data = result.data;
            error = result.error;
        }
        
        if (error) throw error;
        
        customers = data || [];
        console.log(`✅ Loaded ${customers.length} customers`);
        
        // Populate customer dropdown
        setupCustomerSearch();
        populateCityFilter();
        
    } catch (error) {
        console.error('❌ Error loading customers:', error);
        showAlert('שגיאה בטעינת לקוחות', 'error');
    }
}


function setupCustomerSearch() {
    const searchInput = document.getElementById('customer-search-input');
    const resultsContainer = document.getElementById('customer-search-results');
    const hiddenInput = document.getElementById('customer-select');
    
    if (!searchInput || !resultsContainer || !hiddenInput) return;
    
    // Handle input
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        
        if (query.length < 1) {
            resultsContainer.innerHTML = '';
            resultsContainer.classList.add('hidden');
            return;
        }
        
        const filtered = customers.filter(c => 
            c.business_name.toLowerCase().includes(query) || 
            (c.contact_name && c.contact_name.toLowerCase().includes(query)) ||
            (c.phone && c.phone.includes(query))
        );
        
        resultsContainer.innerHTML = '';
        
        if (filtered.length === 0) {
            resultsContainer.innerHTML = '<div class="search-result-empty">לא נמצאו לקוחות</div>';
        } else {
            filtered.forEach(c => {
                const div = document.createElement('div');
                div.className = 'search-result-item';
                div.innerHTML = `
                    <div style="font-weight: 500;">${c.business_name}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">
                        👤 ${c.contact_name || 'ללא איש קשר'} 
                        ${c.phone ? `| 📞 ${c.phone}` : ''}
                        ${c.city ? `| 📍 ${c.city}` : ''}
                    </div>
                `;
                div.onclick = () => {
                    selectCustomer(c);
                };
                resultsContainer.appendChild(div);
            });
        }
        
        resultsContainer.classList.remove('hidden');
    });
    
    // Handle blur (hide results)
    searchInput.addEventListener('blur', () => {
        setTimeout(() => {
            resultsContainer.classList.add('hidden');
        }, 200);
    });
    
    // Handle focus (show results if value exists or show recent)
    searchInput.addEventListener('focus', () => {
        if (searchInput.value.length >= 1) {
             searchInput.dispatchEvent(new Event('input'));
        } else {
            // Show recent/all customers (limit to 10)
            const recent = customers.slice(0, 10);
            resultsContainer.innerHTML = '';
            recent.forEach(c => {
                const div = document.createElement('div');
                div.className = 'search-result-item';
                div.innerHTML = `
                    <div style="font-weight: 500;">${c.business_name}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">
                        👤 ${c.contact_name || 'ללא איש קשר'} 
                        ${c.phone ? `| 📞 ${c.phone}` : ''}
                        ${c.city ? `| 📍 ${c.city}` : ''}
                    </div>
                `;
                div.onclick = () => {
                    selectCustomer(c);
                };
                resultsContainer.appendChild(div);
            });
            resultsContainer.classList.remove('hidden');
        }
    });

    // Clear selection if input is cleared manually
    searchInput.addEventListener('change', () => {
         if (!searchInput.value) {
             hiddenInput.value = '';
         }
    });
}

function selectCustomer(customer) {
    const searchInput = document.getElementById('customer-search-input');
    const resultsContainer = document.getElementById('customer-search-results');
    const hiddenInput = document.getElementById('customer-select');
    
    if (!customer) return;
    
    hiddenInput.value = customer.customer_id;
    searchInput.value = customer.business_name;
    resultsContainer.classList.add('hidden');
}

// ============================================
// Deal Items Management
// ============================================

function addDealItem() {
    if (products.length === 0) {
        showAlert('אנא טען מוצרים תחילה', 'warning');
        return;
    }
    
    const itemId = `item-${itemCounter++}`;
    const item = {
        id: itemId,
        product_id: '',
        quantity: 1,
        unit_price: 0,
        color: '',
        size: '',
        requires_color: false,
        requires_size: false
    };
    
    dealItems.push(item);
    renderDealItems();
    updateEmptyState();
}

function renderDealItems() {
    const tbody = document.getElementById('items-tbody');
    tbody.innerHTML = '';
    
    dealItems.forEach((item, index) => {
        const row = createItemRow(item, index);
        tbody.appendChild(row);
    });
    
    calculateTotal();
}

function createItemRow(item, index) {
    const tr = document.createElement('tr');
    tr.className = 'item-row';
    tr.id = item.id;
    
    // Product selection
    const productCell = document.createElement('td');
    const productSelect = document.createElement('select');
    productSelect.className = 'form-select';
    productSelect.innerHTML = '<option value="">-- בחר מוצר --</option>';
    
    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.product_id;
        option.textContent = product.product_name;
        option.dataset.price = product.price || 0;
        option.dataset.requiresColor = product.requires_color;
        option.dataset.requiresSize = product.requires_size;
        
        if (product.product_id === item.product_id) {
            option.selected = true;
        }
        
        productSelect.appendChild(option);
    });
    
    productSelect.addEventListener('change', (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        item.product_id = e.target.value;
        item.unit_price = parseFloat(selectedOption.dataset.price) || 0;
        item.requires_color = selectedOption.dataset.requiresColor === 'true';
        item.requires_size = selectedOption.dataset.requiresSize === 'true';
        
        renderDealItems();
    });
    
    productCell.appendChild(productSelect);
    
    // Quantity
    const quantityCell = document.createElement('td');
    const quantityInput = document.createElement('input');
    quantityInput.type = 'number';
    quantityInput.className = 'form-input';
    quantityInput.value = item.quantity;
    quantityInput.min = '0.01';
    quantityInput.step = '0.01';
    quantityInput.style.width = '100px';
    quantityInput.addEventListener('input', (e) => {
        item.quantity = parseFloat(e.target.value) || 0;
        calculateTotal();
    });
    quantityCell.appendChild(quantityInput);
    
    // Unit Price
    const priceCell = document.createElement('td');
    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.className = 'form-input';
    priceInput.value = item.unit_price;
    priceInput.min = '0';
    priceInput.step = '0.01';
    priceInput.style.width = '120px';
    priceInput.addEventListener('input', (e) => {
        item.unit_price = parseFloat(e.target.value) || 0;
        calculateTotal();
    });
    priceCell.appendChild(priceInput);
    
    // Color
    const colorCell = document.createElement('td');
    if (item.requires_color) {
        // Find the full product object to check category/name
        const product = products.find(p => p.product_id === item.product_id);
        const isBrush = product && (
            (product.category && product.category.includes('מברשות')) || 
            (product.product_name && product.product_name.includes('מברשת'))
        );

        if (isBrush) {
             const colorSelect = document.createElement('select');
             colorSelect.className = 'form-select';
             colorSelect.style.width = '100px';
             
             const standardColors = ['שחור', 'לבן'];
             const colors = [...standardColors];
             
             // If item has a custom color not in standard list, include it
             if (item.color && !standardColors.includes(item.color)) {
                 colors.push(item.color);
             }
             
             colors.push('אחר...');
             
             if (!item.color) {
                 const defaultOption = document.createElement('option');
                 defaultOption.value = '';
                 defaultOption.textContent = 'בחר';
                 colorSelect.appendChild(defaultOption);
             }

             colors.forEach(color => {
                 const option = document.createElement('option');
                 option.value = color;
                 option.textContent = color;
                 if (item.color === color) option.selected = true;
                 if (color === 'אחר...') {
                     option.style.fontWeight = 'bold';
                     option.style.color = 'var(--primary-color)';
                 }
                 colorSelect.appendChild(option);
             });

             colorSelect.addEventListener('change', (e) => {
                 if (e.target.value === 'אחר...') {
                     const customColor = prompt('הזן צבע חדש:');
                     if (customColor && customColor.trim()) {
                         item.color = customColor.trim();
                         // We need to re-render to show the new custom color in the dropdown
                         renderDealItems();
                     } else {
                         // Reset to previous value if cancelled
                         e.target.value = item.color || '';
                     }
                 } else {
                     item.color = e.target.value;
                 }
             });
             colorCell.appendChild(colorSelect);
        } else {
            const colorInput = document.createElement('input');
            colorInput.type = 'text';
            colorInput.className = 'form-input';
            colorInput.value = item.color;
            colorInput.placeholder = 'צבע';
            colorInput.style.width = '100px';
            colorInput.addEventListener('input', (e) => {
                item.color = e.target.value;
            });
            colorCell.appendChild(colorInput);
        }
    } else {
        colorCell.textContent = '-';
        colorCell.style.textAlign = 'center';
        colorCell.style.color = 'var(--text-tertiary)';
    }
    
    // Size
    const sizeCell = document.createElement('td');
    if (item.requires_size) {
        // Find the full product object to check category/name
        const product = products.find(p => p.product_id === item.product_id);
        const isBrush = product && (
            (product.category && product.category.includes('מברשות')) || 
            (product.product_name && product.product_name.includes('מברשת'))
        );
        const isMesh = isMeshProduct(product);

        if (isBrush) {
             const sizeSelect = document.createElement('select');
             sizeSelect.className = 'form-select';
             sizeSelect.style.width = '100px';
             
             const sizes = ['12', '15', '20'];
             
             // Add default empty option if no size selected yet
             if (!item.size) {
                 const defaultOption = document.createElement('option');
                 defaultOption.value = '';
                 defaultOption.textContent = 'בחר';
                 sizeSelect.appendChild(defaultOption);
             }

             sizes.forEach(size => {
                 const option = document.createElement('option');
                 option.value = size;
                 option.textContent = size;
                 if (item.size === size) option.selected = true;
                 sizeSelect.appendChild(option);
             });

             sizeSelect.addEventListener('change', (e) => {
                 item.size = e.target.value;
                 renderDealItems(); // Re-render to update total
             });
             sizeCell.appendChild(sizeSelect);
        } else if (isMesh) {
             const sizeSelect = document.createElement('select');
             sizeSelect.className = 'form-select';
             sizeSelect.style.width = '100px';
             
             // Sizes for meshes
             const sizes = ['0.50', '0.60', '0.70', '0.80', '0.90', '1.00', '1.10', '1.20', '1.50', '1.80', '2.00', '2.50'];
             
             // Add default empty option if no size selected yet
             if (!item.size) {
                 const defaultOption = document.createElement('option');
                 defaultOption.value = '';
                 defaultOption.textContent = 'בחר';
                 sizeSelect.appendChild(defaultOption);
             }

             sizes.forEach(size => {
                 const option = document.createElement('option');
                 option.value = size;
                 option.textContent = size;
                 if (item.size === size) option.selected = true;
                 sizeSelect.appendChild(option);
             });

             sizeSelect.addEventListener('change', (e) => {
                 item.size = e.target.value;
                 renderDealItems(); // Re-render to update total
             });
             sizeCell.appendChild(sizeSelect);
        } else {
            const sizeInput = document.createElement('input');
            sizeInput.type = 'text';
            sizeInput.className = 'form-input';
            sizeInput.value = item.size;
            sizeInput.placeholder = 'מידה';
            sizeInput.style.width = '100px';
            sizeInput.addEventListener('input', (e) => {
                item.size = e.target.value;
                // If it becomes a mesh product somehow (dynamic?), we should re-render?
                // But generally text input means no special calculation unless we parse numbers from text.
                // For now, only dropdown triggers the mesh logic confidently.
                // But the helper `isMeshProduct` checks the PRODUCT, not the input type.
                // So if user types "0.80" in text input for a Mesh (if logic fails to show dropdown), it should work.
                // We should add `renderDealItems` on blur or change to update totals.
                calculateTotal(); // Update global total at least
            });
            // Update row total on change?
            sizeInput.addEventListener('change', () => {
                 renderDealItems();
            });
            sizeCell.appendChild(sizeInput);
        }
    } else {
        sizeCell.textContent = '-';
        sizeCell.style.textAlign = 'center';
        sizeCell.style.color = 'var(--text-tertiary)';
    }
    
    // Total
    const totalCell = document.createElement('td');
    
    // Calculate total with mesh logic
    let quantityMultiplier = 1;
    const product = products.find(p => p.product_id === item.product_id);
    
    if (product && isMeshProduct(product)) {
        const sizeVal = parseFloat(item.size);
        if (!isNaN(sizeVal) && sizeVal > 0) {
            quantityMultiplier = sizeVal;
        }
    }
    
    const total = item.quantity * quantityMultiplier * item.unit_price;
    totalCell.textContent = `₪${total.toFixed(2)}`;
    totalCell.style.fontWeight = '600';
    
    // Actions
    const actionsCell = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger btn-icon';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = 'מחק פריט';
    deleteBtn.addEventListener('click', () => {
        removeDealItem(index);
    });
    actionsCell.appendChild(deleteBtn);
    
    tr.appendChild(productCell);
    tr.appendChild(quantityCell);
    tr.appendChild(priceCell);
    tr.appendChild(colorCell);
    tr.appendChild(sizeCell);
    tr.appendChild(totalCell);
    tr.appendChild(actionsCell);
    
    return tr;
}

function removeDealItem(index) {
    dealItems.splice(index, 1);
    renderDealItems();
    updateEmptyState();
}

function updateEmptyState() {
    const emptyState = document.getElementById('empty-state');
    const table = document.getElementById('items-table');
    
    if (dealItems.length === 0) {
        emptyState.classList.remove('hidden');
        table.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden');
        table.classList.remove('hidden');
    }
}

function isMeshProduct(product) {
    if (!product) return false;
    const name = (product.product_name || '').toLowerCase();
    const category = (product.category || '').toLowerCase();
    
    // Exclude brushes (since 'מברשת' contains 'רשת')
    if (name.includes('מברשת') || category.includes('מברשות')) return false;
    
    return name.includes('רשת') || category.includes('רשת');
}

// ============================================
// Calculations
// ============================================

function calculateTotal() {
    const subtotal = dealItems.reduce((sum, item) => {
        const product = products.find(p => p.product_id === item.product_id);
        let quantityMultiplier = 1;
        
        if (product && isMeshProduct(product)) {
            const sizeVal = parseFloat(item.size);
            if (!isNaN(sizeVal) && sizeVal > 0) {
                quantityMultiplier = sizeVal;
            }
        }
        
        return sum + (item.quantity * quantityMultiplier * item.unit_price);
    }, 0);
    
    const discountPercentage = parseFloat(document.getElementById('discount-percentage').value) || 0;
    const discountAmount = subtotal * (discountPercentage / 100);
    const finalTotal = subtotal - discountAmount;
    
    document.getElementById('subtotal').textContent = `₪${subtotal.toFixed(2)}`;
    document.getElementById('discount-amount').textContent = `₪${discountAmount.toFixed(2)}`;
    document.getElementById('final-total').textContent = `₪${finalTotal.toFixed(2)}`;
}

// ============================================
// Save Deal
// ============================================

async function saveDeal(status = null) {
    try {
        // Check if we're editing an existing deal
        const editDealId = document.getElementById('deals-tab').dataset.editDealId;
        
        // Validation
        const customerId = document.getElementById('customer-select').value;
        if (!customerId) {
            showAlert('אנא בחר לקוח', 'warning');
            return null;
        }
        
        if (dealItems.length === 0) {
            showAlert('אנא הוסף לפחות מוצר אחד', 'warning');
            return null;
        }
        
        // Validate required fields for each item
        for (const item of dealItems) {
            if (!item.product_id) {
                showAlert('אנא בחר מוצר לכל השורות', 'warning');
                return null;
            }
            
            if (item.requires_color && !item.color) {
                showAlert('אנא הזן צבע למוצרים הדורשים זאת', 'warning');
                return null;
            }
            
            if (item.requires_size && !item.size) {
                showAlert('אנא הזן מידה למוצרים הדורשים זאת', 'warning');
                return null;
            }
        }
        
        const dealStatus = status || document.getElementById('deal-status').value;
        const dealNotes = document.getElementById('deal-notes').value;
        const discountPercentage = parseFloat(document.getElementById('discount-percentage').value) || 0;
        
        console.log('💾 Saving deal:', { editDealId, dealStatus, customerId });
        
        const subtotal = dealItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const discountAmount = subtotal * (discountPercentage / 100);
        const finalAmount = subtotal - discountAmount;
        
        if (editDealId) {
            // Get old items BEFORE deleting them for audit log
            const { data: oldItems } = await supabaseClient
                .from('deal_items')
                .select(`
                    *,
                    products (product_name)
                `)
                .eq('deal_id', editDealId);
            
            // Get old deal data for comparison
            const { data: oldDealData } = await supabaseClient
                .from('deals')
                .select('*')
                .eq('deal_id', editDealId)
                .single();
            
            // Update existing deal
            const { data: updatedDeal, error: dealError } = await supabaseClient
                .from('deals')
                .update({
                    customer_id: customerId,
                    deal_status: dealStatus,
                    total_amount: subtotal,
                    discount_percentage: discountPercentage,
                    discount_amount: discountAmount,
                    final_amount: finalAmount,
                    notes: dealNotes,
                    closed_at: dealStatus === 'זכייה' || dealStatus === 'הפסד' ? new Date().toISOString() : null
                })
                .eq('deal_id', editDealId)
                .select();
            
            console.log('🔄 Update result:', { updatedDeal, dealError });

            if (dealError) throw dealError;
            
            if (!updatedDeal || updatedDeal.length === 0) {
                throw new Error('העסקה לא נמצאה או שלא ניתן לעדכן אותה (אולי נמחקה?)');
            }
            
            // Delete existing items
            const { error: deleteError } = await supabaseClient
                .from('deal_items')
                .delete()
                .eq('deal_id', editDealId);
            
            if (deleteError) throw deleteError;
            
            // Insert updated items
            const itemsToInsert = dealItems.map(item => ({
                deal_id: editDealId,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                color: item.color || null,
                size: item.size || null
            }));
            
            const { error: itemsError } = await supabaseClient
                .from('deal_items')
                .insert(itemsToInsert);
            
            if (itemsError) throw itemsError;
            
            // Build detailed change description for audit log
            const customerName = customers.find(c => c.customer_id === customerId)?.business_name || 'לקוח';
            const changes = [];
            
            // Compare deal-level changes
            if (oldDealData) {
                if (oldDealData.deal_status !== dealStatus) {
                    changes.push(`סטטוס: ${oldDealData.deal_status} ← ${dealStatus}`);
                }
                if (Math.abs((oldDealData.final_amount || 0) - finalAmount) > 0.01) {
                    changes.push(`סכום: ₪${(oldDealData.final_amount || 0).toFixed(0)} ← ₪${finalAmount.toFixed(0)}`);
                }
                if (Math.abs((oldDealData.discount_percentage || 0) - discountPercentage) > 0.01) {
                    changes.push(`הנחה: ${oldDealData.discount_percentage || 0}% ← ${discountPercentage}%`);
                }
            }
            
            // Compare items changes
            const oldItemsMap = {};
            (oldItems || []).forEach(item => {
                const key = item.product_id;
                oldItemsMap[key] = item;
            });
            
            const newItemsMap = {};
            dealItems.forEach(item => {
                const key = item.product_id;
                newItemsMap[key] = item;
            });
            
            // Find added, removed, and modified items
            const itemChanges = [];
            
            // Check for removed items
            Object.keys(oldItemsMap).forEach(productId => {
                if (!newItemsMap[productId]) {
                    const oldItem = oldItemsMap[productId];
                    const productName = oldItem.products?.product_name || 'מוצר';
                    itemChanges.push(`🗑️ הוסר: ${productName} (${oldItem.quantity} יח' ב-₪${oldItem.unit_price})`);
                }
            });
            
            // Check for added items
            Object.keys(newItemsMap).forEach(productId => {
                if (!oldItemsMap[productId]) {
                    const newItem = newItemsMap[productId];
                    const product = products.find(p => p.product_id === productId);
                    const productName = product?.product_name || 'מוצר';
                    itemChanges.push(`➕ נוסף: ${productName} (${newItem.quantity} יח' ב-₪${newItem.unit_price})`);
                }
            });
            
            // Check for modified items
            Object.keys(newItemsMap).forEach(productId => {
                if (oldItemsMap[productId]) {
                    const oldItem = oldItemsMap[productId];
                    const newItem = newItemsMap[productId];
                    const product = products.find(p => p.product_id === productId);
                    const productName = product?.product_name || oldItem.products?.product_name || 'מוצר';
                    
                    const itemModifications = [];
                    if (oldItem.quantity !== newItem.quantity) {
                        itemModifications.push(`כמות: ${oldItem.quantity} ← ${newItem.quantity}`);
                    }
                    if (Math.abs(oldItem.unit_price - newItem.unit_price) > 0.01) {
                        itemModifications.push(`מחיר: ₪${oldItem.unit_price} ← ₪${newItem.unit_price}`);
                    }
                    if ((oldItem.color || '') !== (newItem.color || '')) {
                        itemModifications.push(`צבע: ${oldItem.color || '-'} ← ${newItem.color || '-'}`);
                    }
                    if ((oldItem.size || '') !== (newItem.size || '')) {
                        itemModifications.push(`מידה: ${oldItem.size || '-'} ← ${newItem.size || '-'}`);
                    }
                    
                    if (itemModifications.length > 0) {
                        itemChanges.push(`✏️ ${productName}: ${itemModifications.join(', ')}`);
                    }
                }
            });
            
            // Build description
            let description = `עדכון עסקה בסכום ₪${finalAmount.toFixed(0)}`;
            if (changes.length > 0 || itemChanges.length > 0) {
                description = changes.length > 0 
                    ? changes.join(' | ') 
                    : `עדכון עסקה`;
            }
            
            // Build old and new values for detailed log
            const oldValue = {
                status: oldDealData?.deal_status,
                total: oldDealData?.final_amount,
                discount: oldDealData?.discount_percentage,
                items: (oldItems || []).map(i => ({
                    product: i.products?.product_name || i.product_id,
                    quantity: i.quantity,
                    price: i.unit_price,
                    color: i.color,
                    size: i.size
                }))
            };
            
            const newValue = {
                status: dealStatus,
                total: finalAmount,
                discount: discountPercentage,
                items: dealItems.map(i => {
                    const product = products.find(p => p.product_id === i.product_id);
                    return {
                        product: product?.product_name || i.product_id,
                        quantity: i.quantity,
                        price: i.unit_price,
                        color: i.color,
                        size: i.size
                    };
                }),
                itemChanges: itemChanges
            };
            
            // Log the action with detailed changes
            logAction('update', 'deal', editDealId, `עסקה - ${customerName}`, description, oldValue, newValue);
            
            showAlert('✅ העסקה עודכנה בהצלחה!', 'success');
            
        } else {
            // Insert new deal
            const { data: dealData, error: dealError } = await supabaseClient
                .from('deals')
                .insert({
                    customer_id: customerId,
                    deal_status: dealStatus,
                    total_amount: subtotal,
                    discount_percentage: discountPercentage,
                    discount_amount: discountAmount,
                    final_amount: finalAmount,
                    notes: dealNotes,
                    closed_at: dealStatus === 'זכייה' || dealStatus === 'הפסד' ? new Date().toISOString() : null
                })
                .select()
                .single();
            
            if (dealError) throw dealError;
            
            // Insert deal items
            const itemsToInsert = dealItems.map(item => ({
                deal_id: dealData.deal_id,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                color: item.color || null,
                size: item.size || null
            }));
            
            const { error: itemsError } = await supabaseClient
                .from('deal_items')
                .insert(itemsToInsert);
            
            if (itemsError) throw itemsError;
            
            
            // Log the action
            const customerNameNew = customers.find(c => c.customer_id === customerId)?.business_name || 'לקוח';
            logAction('create', 'deal', dealData.deal_id, `עסקה - ${customerNameNew}`, `יצירת עסקה חדשה בסכום ₪${finalAmount.toFixed(0)}`);
            
            showAlert('✅ העסקה נשמרה בהצלחה!', 'success');

            // Open the deal details
            await viewDealDetails(dealData.deal_id);
            resetForm();
            return dealData.deal_id;
        }
        
        // Reload deals history to reflect changes
        const currentTab = document.querySelector('.nav-tab.active')?.dataset.tab;
        if (currentTab === 'history') {
            await loadDealsHistory();
        }

        // For existing deals, also open details
        if (editDealId) {
            await viewDealDetails(editDealId);
            resetForm(); 
            return editDealId;
        } else {
             setTimeout(() => {
                resetForm();
            }, 1500);
        }
        
    } catch (error) {
        console.error('❌ Error saving deal:', error);
        showAlert('שגיאה בשמירת העסקה: ' + error.message, 'error');
        return null; // Ensure we return null on error
    }
}

async function saveAndExportDeal() {
    try {
        const dealId = await saveDeal();
        
        if (dealId) {
            // Open quote template with deal ID
            const url = `quote-template.html?dealId=${dealId}`;
            window.open(url, '_blank');
        }
    } catch (error) {
        console.error('❌ Error in saveAndExportDeal:', error);
        showAlert('שגיאה בייצוא להצעת מחיר', 'error');
    }
}

// ============================================
// Customer Management
// ============================================
function prepareNewCustomer() {
    // Clear form fields
    const form = document.getElementById('customer-form');
    form.reset();
    delete form.dataset.customerId;
    delete form.dataset.contactId;
    
    // Reset title
    document.querySelector('#customer-modal .modal-header h2').textContent = 'לקוח חדש';
    
    // Hide sections
    const dealsSection = document.getElementById('customer-deals-section');
    if (dealsSection) dealsSection.style.display = 'none';
    
    const historySection = document.getElementById('customer-history-section');
    if (historySection) historySection.style.display = 'none';
    
    openNewCustomerModal();
}

function openNewCustomerModal() {
    setupMentionAutocomplete('new-notes');
    document.getElementById('customer-modal').classList.add('active');
}

function closeCustomerModal() {
    const modal = document.getElementById('customer-modal');
    const form = document.getElementById('customer-form');
    
    modal.classList.remove('active');
    form.reset();
    delete form.dataset.customerId;
    delete form.dataset.contactId;
    
    // Reset modal title
    document.querySelector('#customer-modal .modal-header h2').textContent = 'לקוח חדש';
    
    // Hide history section
    const historySection = document.getElementById('customer-history-section');
    if (historySection) {
        historySection.style.display = 'none';
        document.getElementById('customer-notes-history').innerHTML = '';
    }
}

async function saveCustomer(event) {
    event.preventDefault();
    
    try {
        const customerId = document.getElementById('customer-form').dataset.customerId;
        
        // Get contact details
        const contactName = document.getElementById('new-contact-name').value.trim();
        const contactRole = document.getElementById('new-contact-role')?.value.trim() || '';
        const contactPhone = document.getElementById('new-phone').value.trim();
        const contactEmail = document.getElementById('new-email').value.trim();
        
        const customerData = {
            business_name: document.getElementById('new-business-name').value,
            city: document.getElementById('new-city').value || null,
            customer_type: document.getElementById('new-customer-type').value || null,
            source: document.getElementById('new-source').value || null,
            notes: document.getElementById('new-notes').value || null,
            // Keep legacy fields for backwards compatibility
            contact_name: contactName || null,
            phone: contactPhone || null,
            email: contactEmail || null
        };
        
        let result;
        if (customerId) {
            // Update existing customer
            result = await supabaseClient
                .from('customers')
                .update(customerData)
                .eq('customer_id', customerId)
                .select()
                .single();
        } else {
            // Create new customer
            result = await supabaseClient
                .from('customers')
                .insert(customerData)
                .select()
                .single();
        }
        
        if (result.error) throw result.error;
        
        const savedCustomer = result.data;
        
        // Handle Contact (Create or Update)
        if (contactName) {
            const existingContactId = document.getElementById('customer-form').dataset.contactId;
            const contactData = {
                contact_name: contactName,
                role: contactRole || null,
                phone: contactPhone || null,
                email: contactEmail || null,
                customer_id: savedCustomer.customer_id
            };
            
            if (customerId && existingContactId) {
                // Update existing primary contact
                console.log('Updating existing contact:', existingContactId);
                const { error: updateContactError } = await supabaseClient
                    .from('contacts')
                    .update(contactData)
                    .eq('contact_id', existingContactId);
                    
                if (updateContactError) {
                    console.warn('Error updating contact:', updateContactError);
                } else {
                     loadContacts(); // Refresh contacts list
                }
            } else {
                // Create new contact (for new customer OR existing customer without linked contact)
                console.log('Creating new contact for:', savedCustomer.business_name);
                contactData.created_by = localStorage.getItem('crm_username') || 'משתמש מערכת';
                
                const { data: newContact, error: contactError } = await supabaseClient
                    .from('contacts')
                    .insert(contactData)
                    .select()
                    .single();
                
                if (contactError) {
                    console.error('Error creating contact:', contactError);
                    showAlert('הלקוח נשמר אך הייתה שגיאה ביצירת איש הקשר: ' + contactError.message, 'warning');
                } else if (newContact) {
                    // Set as primary contact
                    await supabaseClient
                        .from('customers')
                        .update({ primary_contact_id: newContact.contact_id })
                        .eq('customer_id', savedCustomer.customer_id);
                    
                    console.log('✅ Created and linked primary contact');
                    loadContacts(); // Refresh contacts list
                }
            }
        }
        
        // Log the action
        logAction(
            customerId ? 'update' : 'create',
            'customer',
            savedCustomer.customer_id,
            savedCustomer.business_name,
            customerId ? 'עדכון פרטי לקוח' : 'יצירת לקוח חדש'
        );
        
        showAlert(customerId ? '✅ הלקוח עודכן בהצלחה!' : '✅ הלקוח נשמר בהצלחה!', 'success');
        
        // Reload customers and select the new/updated one if on deals tab
        await loadCustomers();
        
        const currentTab = document.querySelector('.nav-tab.active')?.dataset.tab;
        if (currentTab === 'customers') {
            displayCustomers();
        } else if (!customerId) {
            // Only select if it's a new customer and we're on deals tab
            document.getElementById('customer-select').value = savedCustomer.customer_id;
            const searchInput = document.getElementById('customer-search-input');
            if (searchInput) searchInput.value = savedCustomer.business_name;
        }
        
        closeCustomerModal();
        
    } catch (error) {
        console.error('❌ Error saving customer:', error);
        showAlert('שגיאה בשמירת הלקוח: ' + error.message, 'error');
    }
}

// ============================================
// Display Functions
// ============================================

async function displayCustomers() {
    const container = document.getElementById('customers-list');
    container.innerHTML = '<div class="spinner"></div>';
    
    await loadCustomers();
    
    // Check if there are no customers at all (before filtering)
    if (customers.length === 0) {
        container.innerHTML = '<p class="text-center" style="padding: 2rem; color: var(--text-tertiary);">אין לקוחות במערכת</p>';
        return;
    }

    // Apply filters and display (preserve page state on reload/tab switch)
    filterCustomers(true);
}

function filterCustomers(preservePage = false) {
    const container = document.getElementById('customers-list');
    
    // Get filter values
    const searchQuery = document.getElementById('filter-customer-list-search')?.value.toLowerCase() || '';
    const typeFilter = document.getElementById('filter-customer-type')?.value || '';
    const sourceFilter = document.getElementById('filter-customer-source')?.value.toLowerCase() || '';
    const cityFilter = document.getElementById('filter-customer-city')?.value.toLowerCase() || '';
    const sortBy = document.getElementById('filter-customer-sort')?.value || 'city';
    
    // Filter customers
    let filteredCustomers = customers.filter(customer => {
        // Search filter (Business Name, Contact Name, City, Phone)
        const businessName = customer.business_name?.toLowerCase() || '';
        const contactName = customer.primary_contact?.contact_name?.toLowerCase() || customer.contact_name?.toLowerCase() || '';
        const city = customer.city?.toLowerCase() || '';
        const phone = customer.primary_contact?.phone || customer.phone || '';
        const source = customer.source?.toLowerCase() || '';
        
        const matchesSearch = !searchQuery || 
            businessName.includes(searchQuery) || 
            contactName.includes(searchQuery) || 
            city.includes(searchQuery) ||
            phone.includes(searchQuery);
            
        // Type filter
        const matchesType = !typeFilter || customer.customer_type === typeFilter;
        
        // Source filter
        const matchesSource = !sourceFilter || source.includes(sourceFilter);

        // City filter
        const matchesCity = !cityFilter || city.includes(cityFilter);
        
        return matchesSearch && matchesType && matchesSource && matchesCity;
    });
    
    // Sort customers
    filteredCustomers.sort((a, b) => {
        switch (sortBy) {
            case 'name-asc':
                return a.business_name.localeCompare(b.business_name, 'he');
            case 'name-desc':
                return b.business_name.localeCompare(a.business_name, 'he');
            case 'city':
                return (a.city || '').localeCompare(b.city || '', 'he');
            case 'newest':
                return new Date(b.created_at) - new Date(a.created_at);
            case 'oldest':
                return new Date(a.created_at) - new Date(b.created_at);
            default:
                return 0;
        }
    });
    
    // Reset page if filtering
    if (!preservePage) {
        paginationState.customers.page = 1;
    }
    
    // Pagination logic
    const page = paginationState.customers.page;
    const limit = paginationState.customers.limit || 10;
    const start = (page - 1) * limit;
    const pagedCustomers = filteredCustomers.slice(start, start + limit);
    
    // Render
    if (filteredCustomers.length === 0) {
        container.innerHTML = `
            <div class="text-center" style="padding: 3rem; color: var(--text-tertiary);">
                <p style="font-size: 1.2rem;">🔍 לא נמצאו לקוחות</p>
                <p>נסה לשנות את הפילטרים</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';

    if (viewState.customers === 'table') {
        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-responsive';
        tableContainer.innerHTML = `
            <table class="items-table" style="width: 100%;">
                <thead>
                    <tr>
                        <th>שם העסק</th>
                        <th>איש קשר</th>
                        <th>טלפון</th>
                        <th>כתובת</th>
                        <th>סוג</th>
                        <th>מקור</th>
                        <th>פעולות</th>
                    </tr>
                </thead>
                <tbody>
                    ${pagedCustomers.map(customer => {
                        const typeBadgeClass = {
                            'חנות': 'badge-new',
                            'קבלן': 'badge-won',
                            'מחסן': 'badge-pending',
                            'מפעל': 'badge-lost',
                            'אחר': 'badge-pending'
                        }[customer.customer_type] || 'badge-new';

                        const primaryContact = customer.primary_contact;
                        const contactName = primaryContact?.contact_name || customer.contact_name || '-';
                        const contactId = primaryContact?.contact_id || customer.primary_contact_id;
                        const contactPhone = primaryContact?.phone || customer.phone || '-';

                        return `
                        <tr>
                            <td><strong>${customer.business_name}</strong></td>
                            <td>
                                ${contactId && contactName !== '-' 
                                    ? `<a href="javascript:void(0)" onclick="viewContactDetails('${contactId}')" style="font-weight: 500;">${contactName}</a>`
                                    : contactName}
                            </td>
                            <td>${contactPhone !== '-' ? contactPhone.split(',').map(p => {
                                const clean = p.replace(/[^\d+]/g, '');
                                return clean.length > 6 ? `<a href="tel:${clean}">${p.trim()}</a>` : p.trim();
                            }).join(', <br>') : '-'}</td>
                            <td>${customer.city || '-'}</td>
                            <td>${customer.customer_type ? `<span class="badge ${typeBadgeClass}">${customer.customer_type}</span>` : '-'}</td>
                            <td>${customer.source || '-'}</td>
                            <td>
                                <div style="display: flex; gap: 0.5rem;">
                                    <button class="btn btn-sm btn-primary btn-icon" onclick="viewCustomerDetails('${customer.customer_id}')" title="פרטים">👁️</button>
                                    <button class="btn btn-sm btn-secondary btn-icon" onclick='editCustomer(${JSON.stringify(customer).replace(/'/g, "&apos;")})' title="ערוך">✏️</button>
                                    <button class="btn btn-sm btn-danger btn-icon" onclick="deleteCustomer('${customer.customer_id}')" title="מחק">🗑️</button>
                                </div>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        container.appendChild(tableContainer);
    } else {
        const grid = document.createElement('div');
        grid.className = 'deals-grid';
        
        pagedCustomers.forEach(customer => {
            const card = document.createElement('div');
            card.className = 'deal-card';
            
            const typeBadgeClass = {
                'חנות': 'badge-new',
                'קבלן': 'badge-won',
                'מחסן': 'badge-pending',
                'מפעל': 'badge-lost',
                'אחר': 'badge-pending'
            }[customer.customer_type] || 'badge-new';
            
            // Get primary contact info
            const primaryContact = customer.primary_contact;
            const contactName = primaryContact?.contact_name || customer.contact_name || 'ללא איש קשר';
            const contactPhone = primaryContact?.phone || customer.phone || '-';
            const contactEmail = primaryContact?.email || customer.email || '-';
            const contactRole = primaryContact?.role || '';
            
            card.innerHTML = `
                <div class="deal-card-header">
                    <div>
                        <div class="deal-card-title">${customer.business_name}</div>
                        <div class="deal-card-date">
                            👤 ${contactName}${contactRole ? ` (${contactRole})` : ''}
                        </div>
                    </div>
                    ${customer.customer_type ? `<span class="badge ${typeBadgeClass}">${customer.customer_type}</span>` : ''}
                </div>
                <div class="deal-card-body">
                    <div class="deal-card-info">
                        <span class="deal-card-label">טלפון:</span>
                        <span class="deal-card-value">
                            ${contactPhone !== '-' ? `
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span style="color: var(--text-primary);">${contactPhone}</span>
                                    <a href="tel:${contactPhone}" title="התקשר">
                                        <img src="images/call.png" alt="Call" style="width: 16px; height: 16px; vertical-align: middle;">
                                    </a>
                                    <a href="https://wa.me/${contactPhone.replace(/\D/g, '').replace(/^0/, '972')}" target="_blank" title="שלח הודעה בווטסאפ">
                                        <img src="images/whatsapp.png" alt="WhatsApp" style="width: 20px; height: 20px; vertical-align: middle;">
                                    </a>
                                </div>
                            ` : '<span class="deal-card-value">-</span>'}
                        </span>
                    </div>
                    <div class="deal-card-info">
                        <span class="deal-card-label">אימייל:</span>
                        <span class="deal-card-value">
                            ${contactEmail !== '-' ? `
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <a href="mailto:${contactEmail}" style="color: var(--primary-color); direction: ltr; text-align: right; display: inline-block;">${contactEmail}</a>
                                    <img src="images/copy.png" alt="Copy" style="cursor: pointer; width: 14px; height: 14px;" onclick="copyToClipboard('${contactEmail}')" title="העתק אימייל">
                                </div>
                            ` : '-'}
                        </span>
                    </div>
                    <div class="deal-card-info">
                        <span class="deal-card-label">כתובת:</span>
                        <span class="deal-card-value">${customer.city || '-'}</span>
                    </div>
                    ${customer.source ? `
                        <div class="deal-card-info">
                            <span class="deal-card-label">מקור:</span>
                            <span class="deal-card-value">${customer.source}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="deal-card-footer">
                    <div class="deal-card-actions" style="margin-right: auto;">
                        <button class="btn btn-primary btn-icon" onclick="viewCustomerDetails('${customer.customer_id}')" title="צפה בפרטים והערות">
                            👁️
                        </button>
                        <button class="btn btn-secondary btn-icon" onclick='editCustomer(${JSON.stringify(customer).replace(/'/g, "&apos;")})' title="ערוך">
                            ✏️
                        </button>
                        <button class="btn btn-danger btn-icon" onclick="deleteCustomer('${customer.customer_id}')" title="מחק">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
            
            grid.appendChild(card);
        });
        container.appendChild(grid);
    }
    
    container.innerHTML += renderPagination(filteredCustomers.length, page, 'customers');
}

// ============================================
// Customer Management
// ============================================

function editCustomer(customer) {
    // Populate the modal with customer data
    document.getElementById('new-business-name').value = customer.business_name || '';
    document.getElementById('new-contact-name').value = customer.contact_name || '';
    const roleField = document.getElementById('new-contact-role');
    if (roleField) {
        // Try to get role from primary contact object if it exists
        if (customer.primary_contact && customer.primary_contact.role) {
            roleField.value = customer.primary_contact.role;
        } else {
            roleField.value = '';
        }
    }
    document.getElementById('new-phone').value = customer.phone || '';
    document.getElementById('new-email').value = customer.email || '';
    document.getElementById('new-city').value = customer.city || '';
    document.getElementById('new-customer-type').value = customer.customer_type || '';
    document.getElementById('new-source').value = customer.source || '';
    document.getElementById('new-notes').value = customer.notes || '';
    
    // Store customer ID and Contact ID for update
    const form = document.getElementById('customer-form');
    form.dataset.customerId = customer.customer_id;
    if (customer.primary_contact_id) {
        form.dataset.contactId = customer.primary_contact_id;
    } else {
        delete form.dataset.contactId;
    }
    
    // Change modal title
    document.querySelector('#customer-modal .modal-header h2').textContent = 'ערוך לקוח';
    
    // Show and load deals
    const dealsSection = document.getElementById('customer-deals-section');
    if (dealsSection) {
        dealsSection.style.display = 'block';
        loadCustomerDeals(customer.customer_id, 'customer-deals-list');
    }

    // Show and load history
    const historySection = document.getElementById('customer-history-section');
    if (historySection) {
        historySection.style.display = 'block';
        loadCustomerNotesHistory(customer.customer_id, 'customer-notes-history');
    }
    
    openNewCustomerModal();
}

async function loadCustomerNotesHistory(customerId, containerId = 'customer-notes-history') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '<div class="spinner"></div>';
    
    try {
        // Fetch activities for this customer
        const { data: activities, error } = await supabaseClient
            .from('activities')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        if (!activities || activities.length === 0) {
            container.innerHTML = '<p style="color: var(--text-tertiary); text-align: center;">אין היסטוריית הערות או פעילויות</p>';
            return;
        }
        
        container.innerHTML = activities.map(activity => {
            const createdDate = new Date(activity.created_at).toLocaleString('he-IL');
            const activityDate = activity.activity_date ? new Date(activity.activity_date).toLocaleString('he-IL') : null;
            const type = activity.activity_type || 'כללי';
            
            // Determine source label and icon based on type
            let sourceLabel = 'פעילות';
            let icon = '📅';
            
            if (type === 'הערה') {
                sourceLabel = 'הערה';
                icon = '📝';
            } else if (type === 'שיחה') {
                sourceLabel = 'שיחה';
                icon = '📞';
            } else if (type === 'מייל') {
                sourceLabel = 'מייל';
                icon = '📧';
            } else if (type === 'פגישה') {
                sourceLabel = 'פגישה';
                icon = '🤝';
            }
            
            return `
                <div style="padding: 0.75rem; border-bottom: 1px solid var(--border-color); font-size: 0.9rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                        <span style="font-weight: 600; color: var(--primary-color);">
                            ${icon} ${sourceLabel}: ${type}
                        </span>
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                             <span style="color: var(--text-tertiary); font-size: 0.8rem;">${createdDate}</span>
                             <button onclick="editActivity('${activity.activity_id}')" type="button" style="background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0 4px;" title="ערוך">✏️</button>
                             <button onclick="deleteActivity('${activity.activity_id}')" type="button" style="background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0 4px;" title="מחק">🗑️</button>
                        </div>
                    </div>
                    <div style="color: var(--text-primary); white-space: pre-wrap;">${formatActivityText(activity.description || '-')}</div>
                    <div style="margin-top: 0.5rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: var(--text-tertiary);">
                        <span>
                            ${activityDate && type !== 'הערה' ? `<strong>מועד הפעילות:</strong> ${activityDate}` : ''}
                        </span>
                        <span>נכתב ע"י: ${activity.created_by || 'מערכת'}</span>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading customer notes history:', error);
        container.innerHTML = '<p style="color: var(--error-color);">שגיאה בטעינת היסטוריה</p>';
    }
}

function deleteCustomer(customerId) {
    showConfirmModal('מחיקת לקוח', 'האם אתה בטוח שברצונך למחוק לקוח זה? פעולה זו תמחק גם את כל העסקאות הקשורות אליו.', async () => {
        try {
            const { error } = await supabaseClient
                .from('customers')
                .delete()
                .eq('customer_id', customerId);
            
            if (error) throw error;
            
            // Log the action
            const deletedCustomer = customers.find(c => c.customer_id === customerId);
            logAction('delete', 'customer', customerId, deletedCustomer?.business_name || 'לקוח', 'מחיקת לקוח');
            
            showAlert('✅ הלקוח נמחק בהצלחה', 'success');
            
            await loadCustomers();
            displayCustomers();
            
        } catch (error) {
            console.error('❌ Error deleting customer:', error);
            showAlert('שגיאה במחיקת הלקוח: ' + error.message, 'error');
        }
    });
}

// ============================================
// Customer Details & Notes
// ============================================

async function switchToEditCustomer(customerId) {
    closeCustomerDetailsModal();
    // Try to find it in global customers first
    let customer = customers.find(c => c.customer_id === customerId);
    
    if (!customer) {
        try {
            const { data } = await supabaseClient.from('customers').select('*').eq('customer_id', customerId).single();
            customer = data;
        } catch (e) {
            console.error('Error fetching customer for edit:', e);
            showAlert('שגיאה בטעינת לקוח לעריכה', 'error');
            return;
        }
    }
    
    if (customer) {
        // Prepare for edit format if needed, but editCustomer usually takes the object directly
        editCustomer(customer);
    }
}

async function viewCustomerDetails(customerId) {
    // Create or get modal
    let modal = document.getElementById('customer-details-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'customer-details-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h2>👤 פרטי לקוח</h2>
                    <button class="modal-close" onclick="closeCustomerDetailsModal()">✕</button>
                </div>
                <div id="customer-details-content">
                    <div class="spinner"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    modal.classList.add('active');
    modal.dataset.currentCustomerId = customerId;
    
    // Load customer details
    try {
        const { data: customer, error } = await supabaseClient
            .from('customers')
            .select(`
                *,
                primary_contact:contacts!customers_primary_contact_id_fkey (
                    contact_id,
                    contact_name,
                    phone,
                    email,
                    role
                )
            `)
            .eq('customer_id', customerId)
            .single();
        
        if (error) throw error;
        
        const typeBadgeClass = {
            'חנות': 'badge-new',
            'קבלן': 'badge-won',
            'מחסן': 'badge-pending',
            'מפעל': 'badge-lost',
            'אחר': 'badge-pending'
        }[customer.customer_type] || 'badge-new';
        
        document.getElementById('customer-details-content').innerHTML = `
            <div style="margin-bottom: 2rem;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <h3 style="margin: 0; color: var(--primary-color);">${customer.business_name}</h3>
                            ${customer.customer_type ? `<span class="badge ${typeBadgeClass}">${customer.customer_type}</span>` : ''}
                        </div>
                    </div>
                    <button class="btn btn-sm btn-secondary" onclick="switchToEditCustomer('${customer.customer_id}')">✏️ ערוך פרטים</button>
                </div>

                ${customer.primary_contact ? `
                <div style="background: var(--bg-secondary); border: 1px solid var(--primary-color); border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                         <h4 style="margin: 0; color: var(--primary-color); font-size: 1rem;">⭐ איש קשר מוביל</h4>
                         <button class="btn btn-sm btn-secondary" style="font-size: 0.8rem; padding: 0.2rem 0.5rem;" onclick="viewContactDetails('${customer.primary_contact.contact_id}'); closeCustomerDetailsModal();">פרטים מלאים ➡️</button>
                    </div>
                    <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                        <div class="deal-card-info">
                            <span class="deal-card-label">שם:</span>
                            <span class="deal-card-value font-medium">${customer.primary_contact.contact_name}</span>
                        </div>
                        <div class="deal-card-info">
                            <span class="deal-card-label">תפקיד:</span>
                            <span class="deal-card-value">${customer.primary_contact.role || '-'}</span>
                        </div>
                        <div class="deal-card-info">
                            <span class="deal-card-label">טלפון:</span>
                            <span class="deal-card-value">
                                 ${customer.primary_contact.phone ? `
                                     <div style="display: flex; align-items: center; gap: 0.5rem;">
                                         <a href="tel:${customer.primary_contact.phone}">${customer.primary_contact.phone}</a>
                                          <a href="https://wa.me/${customer.primary_contact.phone.replace(/\D/g, '').replace(/^0/, '972')}" target="_blank" title="ווטסאפ">
                                            <img src="images/whatsapp.png" style="width: 16px;">
                                        </a>
                                     </div>
                                 ` : '-'}
                            </span>
                        </div>
                        <div class="deal-card-info">
                            <span class="deal-card-label">אימייל:</span>
                            <span class="deal-card-value">
                                 ${customer.primary_contact.email ? `<a href="mailto:${customer.primary_contact.email}">${customer.primary_contact.email}</a>` : '-'}
                            </span>
                        </div>
                    </div>
                </div>
                ` : ''}

                <div class="form-grid">
                    ${(!customer.primary_contact && customer.contact_name) ? `
                    <div class="deal-card-info">
                        <span class="deal-card-label">איש קשר (עסק):</span>
                        <span class="deal-card-value">
                            ${customer.contact_name || '-'}
                        </span>
                    </div>
                    ` : ''}

                    ${(!customer.primary_contact || (customer.phone && customer.phone !== customer.primary_contact.phone)) ? `
                    <div class="deal-card-info">
                        <span class="deal-card-label">טלפון (עסק):</span>
                        <span class="deal-card-value">
                            ${customer.phone ? `
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span style="color: var(--text-primary);">${customer.phone}</span>
                                    <a href="tel:${customer.phone}" title="התקשר">
                                        <img src="images/call.png" alt="Call" style="width: 16px; height: 16px; vertical-align: middle;">
                                    </a>
                                </div>
                            ` : '-'}
                        </span>
                    </div>
                    ` : ''}

                    ${(!customer.primary_contact || (customer.email && customer.email !== customer.primary_contact.email)) ? `
                    <div class="deal-card-info">
                        <span class="deal-card-label">אימייל (עסק):</span>
                        <span class="deal-card-value">
                            ${customer.email ? `
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <a href="mailto:${customer.email}" style="color: var(--primary-color); direction: ltr; text-align: right; display: inline-block;">${customer.email}</a>
                                    <img src="images/copy.png" alt="Copy" style="cursor: pointer; width: 14px; height: 14px;" onclick="copyToClipboard('${customer.email}')" title="העתק אימייל">
                                </div>
                            ` : '-'}
                        </span>
                    </div>
                    ` : ''}

                    <div class="deal-card-info">
                        <span class="deal-card-label">כתובת:</span>
                        <span class="deal-card-value">${customer.city || '-'}</span>
                    </div>
                    ${customer.source ? `
                        <div class="deal-card-info">
                            <span class="deal-card-label">מקור:</span>
                            <span class="deal-card-value">${customer.source}</span>
                        </div>
                    ` : ''}
                    ${customer.notes ? `
                        <div class="deal-card-info" style="grid-column: 1 / -1;">
                            <span class="deal-card-label">הערות כלליות:</span>
                            <span class="deal-card-value">${customer.notes}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <hr style="border: none; border-top: 1px solid var(--border-color); margin: 1.5rem 0;">
            
            <!-- Primary Contact Section -->
            <div style="margin-bottom: 1.5rem;">
                <h4 style="margin-bottom: 1rem;">⭐ בחירת איש קשר מוביל</h4>
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <select id="customer-primary-contact" class="form-select" style="flex: 1;">
                        <option value="">-- ללא איש קשר מוביל --</option>
                    </select>
                    <button type="button" class="btn btn-primary" onclick="savePrimaryContact('${customerId}')">💾 שמור</button>
                </div>
                <div id="customer-contacts-list" style="margin-top: 1rem;">
                    <div class="spinner"></div>
                </div>
            </div>
            
            <hr style="border: none; border-top: 1px solid var(--border-color); margin: 1.5rem 0;">
            
            <!-- Add Note Section -->
            <div style="margin-bottom: 1.5rem;">
                <h4 style="margin-bottom: 1rem;">📝 הוסף הערה חדשה</h4>
                <form onsubmit="addCustomerNote(event, '${customerId}')">
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <textarea id="customer-new-note" class="form-textarea" rows="4" 
                                  placeholder="הקלד הערה חדשה..." required></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary">💾 שמור הערה</button>
                </form>
            </div>
            
            <!-- Deals Section -->
            <div style="margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                <h4 style="margin-bottom: 0.5rem; color: var(--text-secondary);">💼 עסקאות</h4>
                <div id="view-customer-deals-list" style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 6px; padding: 1rem; max-height: 200px; overflow-y: auto;">
                    <div class="spinner"></div>
                </div>
            </div>
            
            <!-- Notes History Section -->
            <div style="margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                <h4 style="margin-bottom: 0.5rem; color: var(--text-secondary);">📜 היסטוריית הערות ופעילויות</h4>
                <div id="view-customer-notes-history" style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 6px; padding: 1rem; max-height: 300px; overflow-y: auto;">
                    <div class="spinner"></div>
                </div>
            </div>
        `;
        
        // Load contacts for this customer
        loadCustomerContacts(customerId, customer.primary_contact_id);
        
        // Load customer deals
        loadCustomerDeals(customerId, 'view-customer-deals-list');

        // Load notes
        // Load history instead of just notes
        loadCustomerNotesHistory(customerId, 'view-customer-notes-history');

        setupMentionAutocomplete('customer-new-note');
        
    } catch (error) {
        console.error('❌ Error loading customer details:', error);
        document.getElementById('customer-details-content').innerHTML = `
            <div class="alert alert-error">שגיאה בטעינת פרטי הלקוח: ${error.message}</div>
        `;
    }
}

function closeCustomerDetailsModal() {
    const modal = document.getElementById('customer-details-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    
    // Navigate back to contact if history exists
    if (window.returnToContactId) {
        const contactId = window.returnToContactId;
        window.returnToContactId = null;
        viewContactDetails(contactId);
        return;
    }

    // Navigate back to activity if history exists
    if (window.returnToActivityId) {
        const activityId = window.returnToActivityId;
        window.returnToActivityId = null;
        viewActivityDetails(activityId);
    }
}

async function loadCustomerContacts(customerId, primaryContactId) {
    const select = document.getElementById('customer-primary-contact');
    const container = document.getElementById('customer-contacts-list');
    
    select.innerHTML = '<option value="">-- ללא איש קשר מוביל --</option>';
    container.innerHTML = '<div class="spinner"></div>';
    
    try {
        const { data: customerContacts, error } = await supabaseClient
            .from('contacts')
            .select('*')
            .eq('customer_id', customerId)
            .order('contact_name');
        
        if (error) throw error;
        
        if (!customerContacts || customerContacts.length === 0) {
            container.innerHTML = `
                <p style="color: var(--text-tertiary); text-align: center;">
                    אין אנשי קשר משויכים ללקוח זה. 
                    <button class="btn btn-sm btn-primary" onclick="openContactModalForCustomer('${customerId}')" style="margin-right: 0.5rem;">
                        ➕ הוסף איש קשר
                    </button>
                </p>
            `;
            return;
        }
        
        // Populate dropdown
        customerContacts.forEach(contact => {
            const option = document.createElement('option');
            option.value = contact.contact_id;
            option.textContent = `${contact.contact_name}${contact.role ? ` (${contact.role})` : ''}`;
            if (contact.contact_id === primaryContactId) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        // Display contacts list
        container.innerHTML = `
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                אנשי קשר משויכים (${customerContacts.length}):
            </p>
            ${customerContacts.map(c => `
                <div style="display: inline-block; background: var(--bg-secondary); padding: 0.3rem 0.6rem; border-radius: 15px; margin: 0.2rem; font-size: 0.85rem; cursor: pointer;" onclick="viewContactDetails('${c.contact_id}')">
                    👤 ${c.contact_name}${c.role ? ` - ${c.role}` : ''}
                    ${c.contact_id === primaryContactId ? '<span style="color: var(--primary-color);">⭐</span>' : ''}
                </div>
            `).join('')}
            <button class="btn btn-sm btn-secondary" onclick="openContactModalForCustomer('${customerId}')" style="margin-top: 0.5rem;">
                ➕ הוסף איש קשר
            </button>
        `;
        
    } catch (error) {
        console.error('❌ Error loading customer contacts:', error);
        container.innerHTML = '<p style="color: var(--error-color);">שגיאה בטעינת אנשי קשר</p>';
    }
}

function openContactModalForCustomer(customerId) {
    openContactModal();
    // Set the customer dropdown to this customer
    setTimeout(() => {
        document.getElementById('contact-customer').value = customerId;
    }, 100);
}

async function savePrimaryContact(customerId) {
    const contactId = document.getElementById('customer-primary-contact').value || null;
    
    try {
        const { error } = await supabaseClient
            .from('customers')
            .update({ primary_contact_id: contactId })
            .eq('customer_id', customerId);
        
        if (error) throw error;
        
        showAlert('✅ איש הקשר המוביל עודכן בהצלחה', 'success');
        
        // Reload customers to update cards
        await loadCustomers();
        displayCustomers();
        
        // Refresh the current modal
        viewCustomerDetails(customerId);
        
    } catch (error) {
        console.error('❌ Error saving primary contact:', error);
        showAlert('שגיאה בשמירת איש הקשר המוביל: ' + error.message, 'error');
    }
}

async function loadCustomerNotes(customerId) {
    const container = document.getElementById('customer-notes-list');
    container.innerHTML = '<div class="spinner"></div>';
    
    try {
        const { data: notes, error } = await supabaseClient
            .from('activities')
            .select('*')
            .eq('customer_id', customerId)
            .is('deal_id', null)
            .eq('activity_type', 'הערה')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!notes || notes.length === 0) {
            container.innerHTML = '<p style="color: var(--text-tertiary); text-align: center;">אין הערות עבור לקוח זה</p>';
            return;
        }
        
        container.innerHTML = notes.map(note => {
            const isEditing = container.dataset.editingId == note.activity_id;
            
            if (isEditing) {
                return `
                <div class="note-item" style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem;">
                    <textarea id="edit-customer-note-${note.activity_id}" class="form-textarea" rows="3" style="width: 100%; margin-bottom: 0.5rem;" required>${note.description}</textarea>
                    <div style="display: flex; gap: 0.5rem;">
                        <button onclick="saveCustomerNoteEdit('${note.activity_id}')" class="btn btn-sm btn-primary">💾 שמור</button>
                        <button onclick="cancelCustomerNoteEdit()" class="btn btn-sm btn-secondary">ביטול</button>
                    </div>
                </div>`;
            }

            const createdDate = new Date(note.created_at).toLocaleString('he-IL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const editedInfo = note.edited_at ? `
                <small style="color: var(--text-tertiary); display: block; margin-top: 0.25rem;">
                    נערך ב-${new Date(note.edited_at).toLocaleString('he-IL')} על ידי ${note.edited_by || 'לא ידוע'}
                </small>
            ` : '';
            
            return `
                <div class="note-item" style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <p style="margin: 0 0 0.5rem 0;">${note.description}</p>
                            <small style="color: var(--text-tertiary);">
                                ${createdDate} | ${note.created_by || 'משתמש מערכת'}
                            </small>
                            ${editedInfo}
                        </div>
                        <div style="display: flex; gap: 0.5rem; margin-right: 1rem;">
                            <button class="btn btn-sm btn-secondary" onclick="editCustomerNote('${note.activity_id}')" title="ערוך">✏️</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteCustomerNote('${note.activity_id}')" title="מחק">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('❌ Error loading customer notes:', error);
        container.innerHTML = `<div class="alert alert-error">שגיאה בטעינת הערות: ${error.message}</div>`;
    }
}

async function addCustomerNote(event, customerId) {
    event.preventDefault();
    
    const noteText = document.getElementById('customer-new-note').value.trim();
    if (!noteText) return;
    
    const author = localStorage.getItem('crm_username') || 'משתמש מערכת';
    
    try {
        const { error } = await supabaseClient
            .from('activities')
            .insert({
                customer_id: customerId,
                activity_type: 'הערה',
                description: noteText,
                created_by: author
            });
        
        if (error) throw error;
        
        // Log action
        const customerName = document.getElementById('customer-business-name')?.textContent || 'לקוח';
        logAction('create', 'note', customerId, customerName, `הערה חדשה: ${noteText}`);
        
        document.getElementById('customer-new-note').value = '';
        showAlert('✅ ההערה נוספה בהצלחה', 'success');
        loadCustomerNotes(customerId);
        
    } catch (error) {
        console.error('❌ Error adding customer note:', error);
        showAlert('שגיאה בהוספת ההערה: ' + error.message, 'error');
    }
}

function editCustomerNote(activityId) {
    const container = document.getElementById('customer-notes-list');
    if (container) {
        const customerId = document.getElementById('customer-details-modal').dataset.currentCustomerId;
        container.dataset.editingId = activityId;
        loadCustomerNotes(customerId);
    }
}

function cancelCustomerNoteEdit() {
    const container = document.getElementById('customer-notes-list');
    if (container) {
        delete container.dataset.editingId;
        const customerId = document.getElementById('customer-details-modal').dataset.currentCustomerId;
        loadCustomerNotes(customerId);
    }
}

async function saveCustomerNoteEdit(activityId) {
    const input = document.getElementById(`edit-customer-note-${activityId}`);
    const newText = input.value.trim();
    
    if (!newText) {
        showAlert('אנא הזן תוכן להערה', 'warning');
        return;
    }
    
    const editor = localStorage.getItem('crm_username') || 'משתמש מערכת';
    
    try {
        const { error } = await supabaseClient
            .from('activities')
            .update({
                description: newText,
                edited_at: new Date().toISOString(),
                edited_by: editor
            })
            .eq('activity_id', activityId);
        
        if (error) throw error;
        
        // Log action
        const customerId = document.getElementById('customer-details-modal').dataset.currentCustomerId;
        const customerName = document.getElementById('customer-business-name')?.textContent || 'לקוח';
        logAction('update', 'note', activityId, customerName, `עדכון הערה: ${newText}`);
        
        showAlert('✅ ההערה עודכנה בהצלחה', 'success');
        
        const container = document.getElementById('customer-notes-list');
        delete container.dataset.editingId;
        
        loadCustomerNotes(customerId);
        
    } catch (error) {
        console.error('❌ Error editing customer note:', error);
        showAlert('שגיאה בעריכת ההערה: ' + error.message, 'error');
    }
}

function deleteCustomerNote(activityId) {
    showConfirmModal('מחיקת הערה', 'האם אתה בטוח שברצונך למחוק הערה זו?', async () => {
        try {
            const { error } = await supabaseClient
                .from('activities')
                .delete()
                .eq('activity_id', activityId);
            
            if (error) throw error;
            
            // Log action
            const customerName = document.getElementById('customer-business-name')?.textContent || 'לקוח';
            // We used activityId as ID, but entity name context helps
            logAction('delete', 'note', activityId, customerName, 'מחיקת הערה');
            
            showAlert('✅ ההערה נמחקה בהצלחה', 'success');
            
            const customerId = document.getElementById('customer-details-modal').dataset.currentCustomerId;
            loadCustomerNotes(customerId);
            
        } catch (error) {
            console.error('❌ Error deleting customer note:', error);
            showAlert('שגיאה במחיקת ההערה: ' + error.message, 'error');
        }
    });
}

// ============================================
// Contacts Management
// ============================================

async function loadContacts() {
    try {
        // First, try simple query to load contacts
        const { data, error } = await supabaseClient
            .from('contacts')
            .select('*')
            .order('contact_name', { ascending: true });
        
        if (error) throw error;
        
        // Enrich with customer names
        contacts = data || [];
        
        // Add customer info for each contact
        for (let contact of contacts) {
            if (contact.customer_id) {
                const customer = customers.find(c => c.customer_id === contact.customer_id);
                if (customer) {
                    contact.customers = {
                        customer_id: customer.customer_id,
                        business_name: customer.business_name
                    };
                }
            }
        }
        
        console.log(`✅ Loaded ${contacts.length} contacts`);
    } catch (error) {
        console.error('❌ Error loading contacts:', error.message || error);
        // Check if table doesn't exist
        if (error.message?.includes('does not exist') || error.code === '42P01' || error.code === 'PGRST116') {
            console.log('ℹ️ Contacts table does not exist yet. Please run the migration: create_contacts_table.sql');
        }
        contacts = [];
    }
}

async function displayContacts() {
    const container = document.getElementById('contacts-list');
    container.innerHTML = '<div class="spinner"></div>';
    
    await loadContacts();
    
    // Check if contacts table exists
    if (contacts.length === 0) {
        // Check if we got an error or just no data
        try {
            const { error } = await supabaseClient.from('contacts').select('contact_id').limit(1);
            if (error && (error.message?.includes('does not exist') || error.code === '42P01')) {
                container.innerHTML = `
                    <div class="text-center" style="padding: 2rem; color: var(--text-tertiary);">
                        <p style="font-size: 1.2rem;">⚠️ טבלת אנשי קשר לא קיימת</p>
                        <p>יש להריץ את קובץ המיגרציה <code>create_contacts_table.sql</code> ב-Supabase</p>
                    </div>
                `;
                return;
            }
        } catch (e) {
            // Ignore - will show empty state
        }
    }
    
    // Populate customer filter
    populateContactCustomerFilter();
    
    // Apply filters and display
    filterContacts();
}

function populateContactCustomerFilter() {
    const select = document.getElementById('filter-contact-customer');
    if (!select) return;
    
    select.innerHTML = '<option value="">כל הלקוחות</option>';
    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.customer_id;
        option.textContent = customer.business_name;
        select.appendChild(option);
    });
}

function filterContacts(preservePage = false) {
    const container = document.getElementById('contacts-list');
    
    const searchQuery = document.getElementById('filter-contact-search')?.value.toLowerCase() || '';
    const customerFilter = document.getElementById('filter-contact-customer')?.value || '';
    const sortBy = document.getElementById('filter-contact-sort')?.value || 'customer';
    
    // Filter contacts
    let filteredContacts = contacts.filter(contact => {
        const matchesSearch = !searchQuery || 
            contact.contact_name?.toLowerCase().includes(searchQuery) ||
            contact.phone?.toLowerCase().includes(searchQuery) ||
            contact.email?.toLowerCase().includes(searchQuery) ||
            contact.role?.toLowerCase().includes(searchQuery);
        
        const matchesCustomer = !customerFilter || contact.customer_id === customerFilter;
        
        return matchesSearch && matchesCustomer;
    });

    if (!preservePage) {
        paginationState.contacts.page = 1;
    }
    
    // Sort contacts
    filteredContacts.sort((a, b) => {
        switch (sortBy) {
            case 'name-asc':
                return (a.contact_name || '').localeCompare(b.contact_name || '', 'he');
            case 'name-desc':
                return (b.contact_name || '').localeCompare(a.contact_name || '', 'he');
            case 'customer':
                return (a.customers?.business_name || 'ת').localeCompare(b.customers?.business_name || 'ת', 'he');
            default:
                return 0;
        }
    });
    
    // Display results
    if (filteredContacts.length === 0) {
        container.innerHTML = `
            <div class="text-center" style="padding: 2rem; color: var(--text-tertiary);">
                <p style="font-size: 1.2rem;">👥 לא נמצאו אנשי קשר</p>
                <p>${contacts.length > 0 ? 'נסה לשנות את הסינון' : 'הוסף אנשי קשר למערכת'}</p>
            </div>
        `;
        return;
    }
    
    // Pagination logic
    const page = paginationState.contacts.page;
    const limit = paginationState.contacts.limit || 10;
    const start = (page - 1) * limit;
    const pagedContacts = filteredContacts.slice(start, start + limit);
    
    container.innerHTML = '';
    
    // Rows per page selector - included in pagination controls at bottom
    
    const countInfo = document.createElement('p');
    countInfo.style.cssText = 'margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem;';
    countInfo.textContent = `מציג ${Math.min(start + 1, filteredContacts.length)}-${Math.min(start + limit, filteredContacts.length)} מתוך ${filteredContacts.length} אנשי קשר`;
    container.appendChild(countInfo);

    if (viewState.contacts === 'table') {
        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-responsive';
        tableContainer.innerHTML = `
            <table class="items-table" style="width: 100%; table-layout: fixed;">
                <colgroup>
                    <col style="width: 15%;"> <!-- Name -->
                    <col style="width: 10%;"> <!-- Role -->
                    <col style="width: 20%;"> <!-- Customer -->
                    <col style="width: 25%;"> <!-- Phone -->
                    <col style="width: 20%;"> <!-- Email -->
                    <col style="width: 10%;"> <!-- Actions -->
                </colgroup>
                <thead>
                    <tr>
                        <th>שם</th>
                        <th>תפקיד</th>
                        <th>לקוח</th>
                        <th>טלפון</th>
                        <th>אימייל</th>
                        <th>פעולות</th>
                    </tr>
                </thead>
                <tbody>
                    ${pagedContacts.map(contact => `
                        <tr>
                            <td><strong>${contact.contact_name}</strong></td>
                            <td>${contact.role || '-'}</td>
                            <td style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${contact.customers?.business_name || ''}">
                                ${contact.customers ? `<span class="badge badge-new" style="cursor: pointer; display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; vertical-align: bottom;" onclick="viewCustomerDetails('${contact.customers.customer_id}')">${contact.customers.business_name}</span>` : '-'}
                            </td>
                            <td>
                                ${contact.phone ? contact.phone.split(',').map(p => {
                                    const fullPhone = p.trim();
                                    // Parse "number (type)" or just "number"
                                    const match = fullPhone.match(/^(.*)\s\((.*)\)$/);
                                    let phone = fullPhone;
                                    let type = '';
                                    if (match) {
                                        phone = match[1];
                                        type = match[2];
                                    }
                                    const cleanPhone = phone.replace(/\D/g, '').replace(/^0/, '972'); // For WhatsApp
                                    const cleanNumber = phone.replace(/[^0-9+]/g, ''); // For tel: link keeping + if exists

                                    const isMobile = phone.trim().startsWith('05');

                                    return `
                                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 2px;">
                                        <div style="display: flex; flex-direction: column; line-height: 1.1;">
                                            <span style="color: var(--text-primary); font-weight: 500;">${phone}</span>
                                            ${type ? `<span style="font-size: 0.75rem; color: var(--text-tertiary);">${type}</span>` : ''}
                                        </div>
                                        <div style="display: flex; gap: 0.5rem;">
                                            <a href="tel:${cleanNumber}" title="התקשר">
                                                <img src="images/call.png" alt="Call" style="width: 16px; height: 16px; vertical-align: middle;">
                                            </a>
                                            ${isMobile ? `
                                            <a href="https://wa.me/${cleanPhone}" target="_blank" title="שלח הודעה בווטסאפ">
                                                <img src="images/whatsapp.png" alt="WhatsApp" style="width: 20px; height: 20px; vertical-align: middle;">
                                            </a>
                                            ` : ''}
                                        </div>
                                        </div>
                                    </div>
                                    `;
                                }).join('') : '-'}
                            </td>
                            <td>
                                ${contact.email ? `
                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                        <a href="mailto:${contact.email}" style="color: var(--primary-color); direction: ltr; text-align: right; display: inline-block;">${contact.email}</a>
                                        <img src="images/copy.png" alt="Copy" style="cursor: pointer; width: 14px; height: 14px;" onclick="copyToClipboard('${contact.email}')" title="העתק אימייל">
                                    </div>
                                ` : '-'}
                            </td>
                            <td>
                                <div style="display: flex; gap: 0.5rem;">
                                    <button class="btn btn-sm btn-primary btn-icon" onclick="viewContactDetails('${contact.contact_id}')" title="פרטים">👁️</button>
                                    <button class="btn btn-sm btn-secondary btn-icon" onclick='editContact(${JSON.stringify(contact).replace(/\'/g, "&apos;")})' title="ערוך">✏️</button>
                                    <button class="btn btn-sm btn-danger btn-icon" onclick="deleteContact('${contact.contact_id}')" title="מחק">🗑️</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        container.appendChild(tableContainer);
    } else {
        const grid = document.createElement('div');
        grid.className = 'deals-grid';
        
        pagedContacts.forEach(contact => {
            const card = document.createElement('div');
            card.className = 'deal-card';
            
            card.innerHTML = `
                <div class="deal-card-header">
                    <div>
                        <div class="deal-card-title">👤 ${contact.contact_name}</div>
                        <div class="deal-card-date">${contact.role || 'ללא תפקיד'}</div>
                    </div>
                    ${contact.customers ? `<span class="badge badge-new">${contact.customers.business_name}</span>` : '<span class="badge badge-pending">ללא לקוח</span>'}
                </div>
                <div class="deal-card-body">
                    <div class="deal-card-info">
                        <span class="deal-card-label">טלפון:</span>
                        <span class="deal-card-value">
                            ${contact.phone ? contact.phone.split(',').map(p => {
                                const fullPhone = p.trim();
                                // Parse "number (type)" or just "number"
                                const match = fullPhone.match(/^(.*)\s\((.*)\)$/);
                                let phone = fullPhone;
                                let type = '';
                                if (match) {
                                    phone = match[1];
                                    type = match[2];
                                }
                                const cleanPhone = phone.replace(/\D/g, '').replace(/^0/, '972'); // For WhatsApp
                                const cleanNumber = phone.replace(/[^0-9+]/g, '');

                                return `
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                                    <div style="display: flex; flex-direction: column; line-height: 1.1;">
                                        <span style="color: var(--text-primary); font-weight: 500;">${phone}</span>
                                        ${type ? `<span style="font-size: 0.75rem; color: var(--text-tertiary);">${type}</span>` : ''}
                                    </div>
                                    <div style="display: flex; gap: 0.5rem;">
                                        <a href="tel:${cleanNumber}" title="התקשר">
                                            <img src="images/call.png" alt="Call" style="width: 16px; height: 16px; vertical-align: middle;">
                                        </a>
                                        <a href="https://wa.me/${cleanPhone}" target="_blank" title="שלח הודעה בווטסאפ">
                                            <img src="images/whatsapp.png" alt="WhatsApp" style="width: 20px; height: 20px; vertical-align: middle;">
                                        </a>
                                    </div>
                                </div>
                                `;
                            }).join('') : '-'}
                        </span>
                    </div>
                    <div class="deal-card-info">
                        <span class="deal-card-label">אימייל:</span>
                        <span class="deal-card-value">
                            ${contact.email ? `
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <a href="mailto:${contact.email}" style="color: var(--primary-color); direction: ltr; text-align: right; display: inline-block;">${contact.email}</a>
                                    <img src="images/copy.png" alt="Copy" style="cursor: pointer; width: 14px; height: 14px;" onclick="copyToClipboard('${contact.email}')" title="העתק אימייל">
                                </div>
                            ` : '-'}
                        </span>
                    </div>
                    ${contact.notes ? `
                    <div class="deal-card-info" style="display: block; margin-top: 0.5rem; background: var(--bg-secondary); padding: 0.5rem; border-radius: 4px;">
                        <span class="deal-card-label" style="display: block; margin-bottom: 0.25rem;">הערות:</span>
                        <span class="deal-card-value" style="font-size: 0.9rem;">${contact.notes}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="deal-card-footer">
                    <button class="btn btn-sm btn-secondary" onclick='editContact(${JSON.stringify(contact).replace(/\'/g, "&apos;")})'>✏️ ערוך</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteContact('${contact.contact_id}')">🗑️ מחק</button>
                </div>
            `;
            grid.appendChild(card);
        });
        container.appendChild(grid);
    }
    
    // Pagination Controls
    container.innerHTML += renderPagination(filteredContacts.length, page, 'contacts');
}

function addContactPhoneInput(fullValue = '') {
    const container = document.getElementById('contact-phones-container');
    if (!container) return;
    
    // Parse "number (type)"
    let number = fullValue;
    let type = 'נייד';
    
    const match = fullValue.match(/^(.*)\s\((.*)\)$/);
    if (match) {
        number = match[1];
        type = match[2];
    }
    
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.gap = '0.5rem';
    div.style.marginBottom = '0.5rem';
    
    // Type Select
    const select = document.createElement('select');
    select.className = 'form-select contact-phone-type';
    select.style.width = '85px';
    select.style.padding = '0.4rem';
    select.style.fontSize = '0.9rem';
    
    ['נייד', 'משרד', 'בית', 'פקס', 'אחר'].forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if (opt === type) option.selected = true;
        select.appendChild(option);
    });
    
    const input = document.createElement('input');
    input.type = 'tel';
    input.className = 'form-input contact-phone-number';
    input.value = number;
    input.placeholder = 'מספר טלפון';
    input.style.flex = '1';
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-danger btn-icon';
    removeBtn.innerHTML = '✕';
    removeBtn.onclick = () => div.remove();
    
    div.appendChild(select);
    div.appendChild(input);
    div.appendChild(removeBtn);
    container.appendChild(div);
}

function openContactModal(contact = null) {
    let modal = document.getElementById('contact-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'contact-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>👤 איש קשר חדש</h2>
                    <button class="modal-close" onclick="closeContactModal()">✕</button>
                </div>
                <form id="contact-form" onsubmit="saveContact(event)">
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label required">שם איש קשר</label>
                            <input type="text" id="contact-name" class="form-input" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">תפקיד</label>
                            <input type="text" id="contact-role" class="form-input" placeholder="מנהל, רכש, מזכירה...">
                        </div>
                        <div class="form-group">
                            <label class="form-label">טלפון</label>
                            <div id="contact-phones-container">
                                <!-- Phone inputs will be added here -->
                            </div>
                            <button type="button" class="btn btn-sm btn-secondary" style="margin-top: 0.5rem;" onclick="addContactPhoneInput()">➕ הוסף מספר נוסף</button>
                        </div>
                        <div class="form-group">
                            <label class="form-label">אימייל</label>
                            <input type="email" id="contact-email" class="form-input">
                        </div>
                        <div class="form-group" style="grid-column: 1 / -1;">
                            <label class="form-label">שייך ללקוח</label>
                            <select id="contact-customer" class="form-select">
                                <option value="">-- ללא לקוח --</option>
                            </select>
                        </div>
                        <div class="form-group" style="grid-column: 1 / -1;">
                            <label class="form-label">הערות</label>
                            <textarea id="contact-notes" class="form-textarea" rows="2"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-primary">💾 שמור</button>
                        <button type="button" class="btn btn-secondary" onclick="closeContactModal()">ביטול</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Populate customer dropdown
    const customerSelect = document.getElementById('contact-customer');
    customerSelect.innerHTML = '<option value="">-- ללא לקוח --</option>';
    customers.forEach(c => {
        const option = document.createElement('option');
        option.value = c.customer_id;
        option.textContent = c.business_name;
        customerSelect.appendChild(option);
    });
    
    // Clear phones container
    const phonesContainer = document.getElementById('contact-phones-container');
    phonesContainer.innerHTML = '';
    
    // Reset or populate form
    if (contact) {
        document.getElementById('contact-name').value = contact.contact_name || '';
        document.getElementById('contact-role').value = contact.role || '';
        document.getElementById('contact-email').value = contact.email || '';
        document.getElementById('contact-customer').value = contact.customer_id || '';
        document.getElementById('contact-notes').value = contact.notes || '';
        document.getElementById('contact-form').dataset.contactId = contact.contact_id;
        document.querySelector('#contact-modal .modal-header h2').textContent = '✏️ ערוך איש קשר';
        
        // Populate phones
        if (contact.phone) {
            const phones = contact.phone.split(',').map(p => p.trim());
            phones.forEach(p => addContactPhoneInput(p));
        } else {
            addContactPhoneInput();
        }
    } else {
        document.getElementById('contact-form').reset();
        phonesContainer.innerHTML = '';
        addContactPhoneInput(); // One empty input
        delete document.getElementById('contact-form').dataset.contactId;
        document.querySelector('#contact-modal .modal-header h2').textContent = '👤 איש קשר חדש';
    }
    
    modal.classList.add('active');
}

function closeContactModal() {
    const modal = document.getElementById('contact-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function editContact(contact) {
    openContactModal(contact);
}

async function saveContact(event) {
    event.preventDefault();
    
    const contactId = document.getElementById('contact-form').dataset.contactId;
    const author = localStorage.getItem('crm_username') || 'משתמש מערכת';
    
    // Collect specific phone numbers
    const phoneRows = document.querySelectorAll('#contact-phones-container > div');
    const phones = Array.from(phoneRows).map(row => {
        const numInput = row.querySelector('.contact-phone-number');
        const typeSelect = row.querySelector('.contact-phone-type');
        
        // Safety check if elements exist (e.g. if structure changed)
        if (!numInput || !typeSelect) return null;
        
        const num = numInput.value.trim();
        const type = typeSelect.value;
        
        if (!num) return null;
        
        // If type is "Other" or default, maybe just save number? 
        // User asked for option to change purpose. Let's save standard format "Number (Type)"
        return `${num} (${type})`;
    }).filter(val => val !== null);

    const phoneString = phones.length > 0 ? phones.join(', ') : null;
    
    const contactData = {
        contact_name: document.getElementById('contact-name').value,
        role: document.getElementById('contact-role').value || null,
        phone: phoneString,
        email: document.getElementById('contact-email').value || null,
        customer_id: document.getElementById('contact-customer').value || null,
        notes: document.getElementById('contact-notes').value || null
    };
    
    try {
        if (contactId) {
            // Update
            const { error } = await supabaseClient
                .from('contacts')
                .update(contactData)
                .eq('contact_id', contactId);
            
            if (error) throw error;
            showAlert('✅ איש הקשר עודכן בהצלחה', 'success');
        } else {
            // Insert
            contactData.created_by = author;
            const { error } = await supabaseClient
                .from('contacts')
                .insert(contactData);
            
            if (error) throw error;
            showAlert('✅ איש הקשר נוסף בהצלחה', 'success');
        }
        
        closeContactModal();
        displayContacts();
        
    } catch (error) {
        console.error('❌ Error saving contact:', error);
        showAlert('שגיאה בשמירת איש הקשר: ' + error.message, 'error');
    }
}



async function switchToEditContact(contactId) {
    closeContactDetailsModal();
    // Try to find it in global contacts first to save a fetch if possible
    let contact = contacts.find(c => c.contact_id === contactId);
    
    if (!contact) {
        // Fetch if not found in memory
        try {
            const { data } = await supabaseClient.from('contacts').select('*').eq('contact_id', contactId).single();
            contact = data;
        } catch (e) {
            console.error('Error fetching contact for edit:', e);
            showAlert('שגיאה בטעינת איש קשר לעריכה', 'error');
            return;
        }
    }
    
    if (contact) {
        // Ensure customer data is attached if missing (editContact might need it for display or logic)
        // Actually editContact uses what is passed to populate form.
        // And it calls loadCustomers() to populate the select.
        // It sets the select value to contact.customer_id.
        // So raw contact object is fine.
        editContact(contact);
    }
}

async function viewContactDetails(contactId) {
    // Create or get modal
    let modal = document.getElementById('contact-details-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'contact-details-modal';
        modal.className = 'modal';
        modal.style.zIndex = '2000'; // Ensure it is on top of other modals
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>👤 פרטי איש קשר</h2>
                    <button class="modal-close" onclick="closeContactDetailsModal()">✕</button>
                </div>
                <div id="contact-details-content">
                    <div class="spinner"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    modal.classList.add('active');
    
    try {
        const { data: contact, error } = await supabaseClient
            .from('contacts')
            .select('*')
            .eq('contact_id', contactId)
            .single();
        
        if (error) throw error;
        
        // Fetch customer details manually to avoid "multiple relationships" ambiguous error
        if (contact.customer_id) {
            const { data: customerData } = await supabaseClient
                .from('customers')
                .select('business_name, city, customer_id')
                .eq('customer_id', contact.customer_id)
                .single();
                
            if (customerData) {
                contact.customers = customerData;
            }
        }
        
        document.getElementById('contact-details-content').innerHTML = `
            <div style="margin-bottom: 2rem;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h3 style="margin: 0; margin-bottom: 0.5rem; color: var(--primary-color);">${contact.contact_name}</h3>
                        <div style="color: var(--text-secondary); margin-bottom: 1.5rem;">${contact.role || 'ללא תפקיד'}</div>
                    </div>
                    <button class="btn btn-sm btn-secondary" onclick="switchToEditContact('${contact.contact_id}')">✏️ ערוך פרטים</button>
                </div>
                
                <div class="form-grid">
                    <div class="deal-card-info">
                        <span class="deal-card-label">טלפון:</span>
                        <span class="deal-card-value">
                            ${contact.phone ? contact.phone.split(',').map(p => {
                                const fullPhone = p.trim();
                                const match = fullPhone.match(/^(.*)\s\((.*)\)$/);
                                let phone = fullPhone;
                                let type = '';
                                if (match) {
                                    phone = match[1];
                                    type = match[2];
                                }
                                const cleanPhone = phone.replace(/\D/g, '').replace(/^0/, '972');
                                const cleanNumber = phone.replace(/[^0-9+]/g, '');

                                const isMobile = phone.trim().startsWith('05');

                                return `
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 2px;">
                                    <div style="display: flex; flex-direction: column; align-items: flex-end; line-height: 1.1;">
                                        <span style="color: var(--text-primary); text-align: right; direction: ltr; display: inline-block;">${phone}</span>
                                        ${type ? `<span style="font-size: 0.75rem; color: var(--text-tertiary);">${type}</span>` : ''}
                                    </div>
                                    <div style="display: flex; gap: 0.5rem;">
                                        <a href="tel:${cleanNumber}" title="התקשר">
                                            <img src="images/call.png" alt="Call" style="width: 16px; height: 16px; vertical-align: middle;">
                                        </a>
                                        ${isMobile ? `
                                        <a href="https://wa.me/${cleanPhone}" target="_blank" title="שלח הודעה בווטסאפ">
                                            <img src="images/whatsapp.png" alt="WhatsApp" style="width: 20px; height: 20px; vertical-align: middle;">
                                        </a>
                                        ` : ''}
                                    </div>
                                </div>
                                `;
                            }).join('') : '-'}
                        </span>
                    </div>
                    
                    <div class="deal-card-info">
                        <span class="deal-card-label">אימייל:</span>
                        <span class="deal-card-value">
                            ${contact.email ? `
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <a href="mailto:${contact.email}" style="color: var(--primary-color); direction: ltr; text-align: right; display: inline-block;">${contact.email}</a>
                                    <img src="images/copy.png" alt="Copy" style="cursor: pointer; width: 14px; height: 14px;" onclick="copyToClipboard('${contact.email}')" title="העתק אימייל">
                                </div>
                            ` : '-'}
                        </span>
                    </div>
                    
                    <div class="deal-card-info">
                        <span class="deal-card-label">לקוח:</span>
                        <span class="deal-card-value">
                            ${contact.customers ? `
                                <span class="badge badge-new" style="cursor: pointer;" onclick="window.returnToContactId = '${contact.contact_id}'; viewCustomerDetails('${contact.customers.customer_id}'); closeContactDetailsModal();">${contact.customers.business_name}</span>
                            ` : '-'}
                        </span>
                    </div>
                </div>
            </div>
            
            <div style="border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
                <h4 style="margin-bottom: 1rem;">📝 הערות</h4>
                
                <div class="notes-list" style="max-height: 300px; overflow-y: auto; margin-bottom: 1.5rem;">
                    ${(() => {
                        const parsedNotes = parseContactNotes(contact.notes);
                        if (parsedNotes.length === 0) return '<p style="color: var(--text-tertiary); text-align: center;">אין הערות</p>';
                        
                        return parsedNotes.map((note, index) => `
                            <div class="note-item" style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                    <span style="font-size: 0.8rem; color: var(--text-tertiary); font-weight: 600;">
                                        ${note.timestamp !== '-' ? note.timestamp : ''} ${note.author !== '-' ? ' • ' + note.author : ''}
                                    </span>
                                    <div id="contact-note-actions-${index}" style="display: flex; gap: 0.5rem;">
                                        <button class="btn btn-sm btn-secondary" onclick="editContactNote('${contact.contact_id}', ${index})" title="ערוך" style="padding: 2px 6px; font-size: 0.8rem;">✏️</button>
                                        <button class="btn btn-sm btn-danger" onclick="deleteContactNote('${contact.contact_id}', ${index})" title="מחק" style="padding: 2px 6px; font-size: 0.8rem;">🗑️</button>
                                    </div>
                                </div>
                                <div id="contact-note-content-${index}" style="white-space: pre-wrap; font-size: 0.95rem; color: var(--text-primary);">${note.content}</div>
                            </div>
                        `).join('');
                    })()}
                </div>
                
                <div class="form-group">
                    <label for="view-contact-new-note" style="display: block; margin-bottom: 0.5rem; font-size: 0.9rem;">הוסף הערה חדשה:</label>
                    <textarea id="view-contact-new-note" class="form-textarea" rows="3" placeholder="הקלד הערה..."></textarea>
                </div>
                
                <button class="btn btn-primary" onclick="addContactNote('${contact.contact_id}')">💾 הוסף הערה</button>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading contact details:', error);
        document.getElementById('contact-details-content').innerHTML = `
            <p style="color: var(--error-color);">שגיאה בטעינת איש קשר</p>
        `;
    }
}

function closeContactDetailsModal() {
    const modal = document.getElementById('contact-details-modal');
    if (modal) modal.classList.remove('active');
    
    // Navigate back to customer if history exists
    if (window.returnToCustomerId) {
        const customerId = window.returnToCustomerId;
        window.returnToCustomerId = null;
        viewCustomerDetails(customerId);
        return;
    }

    // Navigate back to activity if history exists
    if (window.returnToActivityId) {
        const activityId = window.returnToActivityId;
        window.returnToActivityId = null;
        viewActivityDetails(activityId);
    }
}

async function addContactNote(contactId) {
    const newNote = document.getElementById('view-contact-new-note').value;
    if (!newNote || !newNote.trim()) {
        showAlert('אנא הקלד הערה', 'warning');
        return;
    }
    
    try {
        // Fetch current notes first to append
        const { data: currentContact, error: fetchError } = await supabaseClient
            .from('contacts')
            .select('notes')
            .eq('contact_id', contactId)
            .single();
            
        if (fetchError) throw fetchError;
        
        const timestamp = new Date().toLocaleString('he-IL');
        const author = localStorage.getItem('crm_username') || 'משתמש מערכת';
        
        const noteEntry = `[${timestamp} - ${author}]\n${newNote}\n`;
        const updatedNotes = (currentContact.notes || '') + (currentContact.notes ? '\n' : '') + noteEntry;
        
        const { error: updateError } = await supabaseClient
            .from('contacts')
            .update({ notes: updatedNotes })
            .eq('contact_id', contactId);
            
        if (updateError) throw updateError;
        
        showAlert('✅ הערה נוספה בהצלחה', 'success');
        
        // Update local cache
        const contactIndex = contacts.findIndex(c => c.contact_id === contactId);
        if (contactIndex !== -1) {
            contacts[contactIndex].notes = updatedNotes;
        }
        
        // Refresh the view
        viewContactDetails(contactId);

    } catch (error) {
        console.error('Error adding contact note:', error);
        showAlert('שגיאה בהוספת הערה', 'error');
    }
}

// Helper to parse notes string into array
function parseContactNotes(notesStr) {
    if (!notesStr) return [];
    
    // Regex to find blocks starting with [Date - Author]
    const regex = /\[(.*?)\s-\s(.*?)\]\n([\s\S]*?)(?=\n\[.*?\s-\s.*?\]|$)/g;
    const notes = [];
    let match;
    
    // Find all structured matches
    while ((match = regex.exec(notesStr)) !== null) {
        notes.push({
            timestamp: match[1],
            author: match[2],
            content: match[3].trim()
        });
    }
    
    // If no structured matches but text exists, treat as one legacy note
    if (notes.length === 0 && notesStr.trim()) {
        // Double check if it maybe just doesn't follow strict format
        return [{
            timestamp: '-',
            author: 'הערה ישנה',
            content: notesStr.trim(),
            isLegacy: true
        }];
    }
    
    // If we have mixed content (text at start before first match), we could capture it too, but assuming strictly appended log for now.
    
    // Reverse to show newest first
    return notes.reverse();
}

// Helper to reconstruct string from notes array
function stringifyContactNotes(notesArray) {
    // Reverse back to chronological order (Oldest -> Newest) for storage
    const chronological = [...notesArray].reverse();
    
    return chronological.map(note => {
        if (note.isLegacy) return note.content;
        return `[${note.timestamp} - ${note.author}]\n${note.content}\n`;
    }).join('\n');
}

async function deleteContactNote(contactId, index) {
    if (!confirm('האם אתה בטוח שברצונך למחוק הערה זו?')) return;
    
    try {
        const { data: contact } = await supabaseClient.from('contacts').select('notes').eq('contact_id', contactId).single();
        let notes = parseContactNotes(contact.notes);
        
        // Remove at index
        if (index >= 0 && index < notes.length) {
            notes.splice(index, 1);
        }
        
        const newNotesStr = stringifyContactNotes(notes);
        
        await supabaseClient.from('contacts').update({ notes: newNotesStr }).eq('contact_id', contactId);
        
        // Update cache
        const contactIndex = contacts.findIndex(c => c.contact_id === contactId);
        if (contactIndex !== -1) contacts[contactIndex].notes = newNotesStr;
        
        // Refresh
        viewContactDetails(contactId);
        
    } catch (e) {
        console.error('Error deleting note:', e);
        showAlert('שגיאה במחיקת הערה', 'error');
    }
}

function editContactNote(contactId, index) {
    const noteContentDiv = document.getElementById(`contact-note-content-${index}`);
    const noteActionsDiv = document.getElementById(`contact-note-actions-${index}`);
    if (!noteContentDiv) return;
    
    const originalContent = noteContentDiv.innerText;
    
    noteContentDiv.innerHTML = `
        <textarea id="edit-contact-note-input-${index}" class="form-textarea" rows="3" style="width: 100%; margin-bottom: 0.5rem;">${originalContent}</textarea>
        <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-sm btn-primary" onclick="saveContactNoteEdit('${contactId}', ${index})">💾 שמור</button>
            <button class="btn btn-sm btn-secondary" onclick="viewContactDetails('${contactId}')">ביטול</button>
        </div>
    `;
    if (noteActionsDiv) noteActionsDiv.style.display = 'none';
}

async function saveContactNoteEdit(contactId, index) {
    try {
        const newContent = document.getElementById(`edit-contact-note-input-${index}`).value;
        
        const { data: contact } = await supabaseClient.from('contacts').select('notes').eq('contact_id', contactId).single();
        let notes = parseContactNotes(contact.notes);
        
        if (notes[index]) {
            notes[index].content = newContent;
        }
        
        const newNotesStr = stringifyContactNotes(notes);
        
        await supabaseClient.from('contacts').update({ notes: newNotesStr }).eq('contact_id', contactId);
        
        // Update cache
        const contactIndex = contacts.findIndex(c => c.contact_id === contactId);
        if (contactIndex !== -1) contacts[contactIndex].notes = newNotesStr;
        
        viewContactDetails(contactId);
        
    } catch (e) {
        console.error('Error saving edit:', e);
        showAlert('שגיאה בשמירה', 'error');
    }
}

function deleteContact(contactId) {
    showConfirmModal('מחיקת איש קשר', 'האם אתה בטוח שברצונך למחוק איש קשר זה?', async () => {
        try {
            const { error } = await supabaseClient
                .from('contacts')
                .delete()
                .eq('contact_id', contactId);
            
            if (error) throw error;
            
            showAlert('✅ איש הקשר נמחק בהצלחה', 'success');
            displayContacts();
            
        } catch (error) {
            console.error('❌ Error deleting contact:', error);
            showAlert('שגיאה במחיקת איש הקשר: ' + error.message, 'error');
        }
    });
}

async function displayProducts() {
    const container = document.getElementById('products-list');
    container.innerHTML = '<div class="spinner"></div>';
    
    await loadProducts();
    
    // Populate category filter dropdown
    populateCategoryFilter();
    
    // Apply filters and display
    filterProducts();
}

function populateCategoryFilter() {
    const categorySelect = document.getElementById('filter-product-category');
    if (!categorySelect) return;
    
    // Get unique categories
    const categories = [...new Set(products.map(p => p.category).filter(c => c))].sort();
    
    // Keep only the "all" option and add categories
    categorySelect.innerHTML = '<option value="">כל הקטגוריות</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
}

function filterProducts(preservePage = false) {
    const container = document.getElementById('products-list');
    
    // Get filter values
    const searchQuery = document.getElementById('filter-product-search')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('filter-product-category')?.value || '';
    const sortBy = document.getElementById('filter-product-sort')?.value || 'category';
    
    // Filter products
    let filteredProducts = products.filter(product => {
        // Search filter
        const matchesSearch = !searchQuery || 
            product.product_name?.toLowerCase().includes(searchQuery) ||
            product.sku?.toLowerCase().includes(searchQuery) ||
            product.description?.toLowerCase().includes(searchQuery);
        
        // Category filter
        const matchesCategory = !categoryFilter || product.category === categoryFilter;
        
        return matchesSearch && matchesCategory;
    });
    
    // Sort products
    filteredProducts.sort((a, b) => {
        switch (sortBy) {
            case 'name-asc':
                return (a.product_name || '').localeCompare(b.product_name || '', 'he');
            case 'name-desc':
                return (b.product_name || '').localeCompare(a.product_name || '', 'he');
            case 'price-asc':
                return (a.price || 0) - (b.price || 0);
            case 'price-desc':
                return (b.price || 0) - (a.price || 0);
            case 'category':
                const catCompare = (a.category || 'ת').localeCompare(b.category || 'ת', 'he');
                if (catCompare !== 0) return catCompare;
                return (a.product_name || '').localeCompare(b.product_name || '', 'he');
            default:
                return 0;
        }
    });
    
    // Reset page if filtering
    if (!preservePage) {
        paginationState.products.page = 1;
    }

    // Pagination logic
    const page = paginationState.products.page;
    const limit = paginationState.products.limit || 10;
    const start = (page - 1) * limit;
    const pagedProducts = filteredProducts.slice(start, start + limit);
    
    // Display results
    if (filteredProducts.length === 0) {
        container.innerHTML = `
            <div class="text-center" style="padding: 2rem; color: var(--text-tertiary);">
                <p style="font-size: 1.2rem;">📦 לא נמצאו מוצרים</p>
                <p>${products.length > 0 ? 'נסה לשנות את הסינון' : 'הוסף מוצרים למערכת'}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    if (viewState.products === 'table') {
        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-responsive';
        tableContainer.innerHTML = `
            <table class="items-table" style="width: 100%;">
                <thead>
                    <tr>
                        <th style="width: 60px;">תמונה</th>
                        <th>שם המוצר</th>
                        <th>מק"ט</th>
                        <th>קטגוריה</th>
                        <th>מחיר</th>
                        <th>אפשרויות</th>
                        <th>פעולות</th>
                    </tr>
                </thead>
                <tbody>
                    ${pagedProducts.map(product => `
                        <tr>
                            <td>
                                ${product.image_url ? 
                                    `<img src="${product.image_url}" alt="${product.product_name}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; cursor: pointer;" onclick="openImageModal('${product.image_url}', '${product.product_name.replace(/'/g, "\\'")}')" onerror="this.outerHTML='<span style=\\'font-size: 1.5rem;\\'>📦</span>'">` : 
                                    '<span style="font-size: 1.5rem;">📦</span>'}
                            </td>
                            <td><strong>${product.product_name}</strong></td>
                            <td><span class="badge badge-pending" style="font-size: 0.75rem;">${product.sku || '-'}</span></td>
                            <td>${product.category || '-'}</td>
                            <td>₪${product.price ? product.price.toFixed(2) : '0.00'}</td>
                            <td>
                                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                    ${product.requires_color ? '<span class="badge" style="background: var(--bg-secondary); color: var(--text-primary);">🎨 צבע</span>' : ''}
                                    ${product.requires_size ? '<span class="badge" style="background: var(--bg-secondary); color: var(--text-primary);">📏 מידה</span>' : ''}
                                    ${!product.requires_color && !product.requires_size ? '-' : ''}
                                </div>
                            </td>
                            <td>
                                <div style="display: flex; gap: 0.5rem;">
                                    <button class="btn btn-sm btn-secondary btn-icon" onclick='editProduct(${JSON.stringify(product).replace(/'/g, "&apos;")})' title="ערוך">✏️</button>
                                    <button class="btn btn-sm btn-danger btn-icon" onclick="deleteProduct('${product.product_id}')" title="מחק">🗑️</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        container.appendChild(tableContainer);
    } else {
        const grid = document.createElement('div');
        grid.className = 'products-grid';
        
        pagedProducts.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            // Check if product has an image URL
            const imageSection = product.image_url 
                ? `<div class="product-card-image" onclick="openImageModal('${product.image_url}', '${product.product_name.replace(/'/g, "\\'")}')" style="cursor: pointer;">
                       <img src="${product.image_url}" alt="${product.product_name}" onerror="this.parentElement.innerHTML='<span class=\\'product-card-image-placeholder\\'>📦</span>'">
                   </div>`
                : `<div class="product-card-image">
                       <span class="product-card-image-placeholder">📦</span>
                   </div>`;
            
            card.innerHTML = `
                ${imageSection}
                <div class="product-card-content">
                    <div class="product-card-header">
                        <div class="product-card-title">${product.product_name}</div>
                        ${product.sku ? `<span class="badge badge-new" style="font-size: 0.65rem; padding: 2px 5px;">${product.sku}</span>` : ''}
                    </div>
                    <div class="product-card-category">${product.category || 'ללא קטגוריה'}</div>
                    <div class="product-card-price">₪${product.price ? product.price.toFixed(2) : '0.00'}</div>
                    <div class="product-card-meta">
                        ${product.requires_color ? '<span>🎨 צבע</span>' : ''}
                        ${product.requires_size ? '<span>📏 מידה</span>' : ''}
                    </div>
                    <div class="product-card-actions">
                        <button class="btn btn-secondary btn-icon" onclick='editProduct(${JSON.stringify(product).replace(/'/g, "&apos;")})' title="ערוך">
                            ✏️
                        </button>
                        <button class="btn btn-danger btn-icon" onclick="deleteProduct('${product.product_id}')" title="מחק">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
            
            grid.appendChild(card);
        });
        
        container.appendChild(grid);
    }
    
    container.innerHTML += renderPagination(filteredProducts.length, page, 'products');
}

// ============================================
// Product Management
// ============================================

function openProductModal(product = null) {
    const modal = document.getElementById('product-modal');
    const title = document.getElementById('product-modal-title');
    const form = document.getElementById('product-form');
    
    form.reset();
    
    if (product) {
        // Edit mode
        title.textContent = 'ערוך מוצר';
        document.getElementById('edit-product-id').value = product.product_id;
        document.getElementById('product-name').value = product.product_name || '';
        document.getElementById('product-category').value = product.category || '';
        document.getElementById('product-sku').value = product.sku || '';
        document.getElementById('product-price').value = product.price || '';
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-image').value = product.image_url || '';
        document.getElementById('product-requires-color').checked = product.requires_color || false;
        document.getElementById('product-requires-size').checked = product.requires_size || false;
    } else {
        // Create mode
        title.textContent = 'מוצר חדש';
        document.getElementById('edit-product-id').value = '';
    }
    
    modal.classList.add('active');
}

function closeProductModal() {
    document.getElementById('product-modal').classList.remove('active');
}

// Image lightbox modal
function openImageModal(imageUrl, imageName) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('image-lightbox-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'image-lightbox-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 90vw; max-height: 90vh; background: transparent; box-shadow: none; padding: 0; overflow: visible; position: relative;">
                <button onclick="closeImageModal()" style="position: fixed; top: 20px; right: 20px; background: white; border: none; border-radius: 50%; width: 50px; height: 50px; font-size: 1.5rem; cursor: pointer; z-index: 10001; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">✕</button>
                <div id="image-lightbox-content" style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                    <img id="image-lightbox-img" src="" alt="" style="max-width: 100%; max-height: 80vh; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
                    <div id="image-lightbox-title" style="color: white; font-size: 1.1rem; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.5);"></div>
                </div>
            </div>
        `;
        modal.style.background = 'rgba(0,0,0,0.85)';
        modal.onclick = function(e) {
            if (e.target === modal) closeImageModal();
        };
        document.body.appendChild(modal);
    }
    
    // Set image and title
    document.getElementById('image-lightbox-img').src = imageUrl;
    document.getElementById('image-lightbox-img').alt = imageName;
    document.getElementById('image-lightbox-title').textContent = imageName;
    
    // Show modal
    modal.classList.add('active');
}

function closeImageModal() {
    const modal = document.getElementById('image-lightbox-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function editProduct(product) {
    openProductModal(product);
}

async function saveProduct(event) {
    event.preventDefault();
    
    try {
        const productId = document.getElementById('edit-product-id').value;
        const productData = {
            product_name: document.getElementById('product-name').value,
            category: document.getElementById('product-category').value || null,
            sku: document.getElementById('product-sku').value || null,
            price: parseFloat(document.getElementById('product-price').value) || null,
            description: document.getElementById('product-description').value || null,
            image_url: document.getElementById('product-image').value || null,
            requires_color: document.getElementById('product-requires-color').checked,
            requires_size: document.getElementById('product-requires-size').checked,
            active: true
        };
        
        let result;
        if (productId) {
            // Update existing product
            result = await supabaseClient
                .from('products')
                .update(productData)
                .eq('product_id', productId)
                .select()
                .single();
        } else {
            // Create new product
            result = await supabaseClient
                .from('products')
                .insert(productData)
                .select()
                .single();
        }
        
        if (result.error) throw result.error;
        
        // Log the action
        logAction(
            productId ? 'update' : 'create',
            'product',
            result.data.product_id,
            result.data.product_name,
            productId ? 'עדכון פרטי מוצר' : 'הוספת מוצר חדש'
        );
        
        showAlert(productId ? '✅ המוצר עודכן בהצלחה!' : '✅ המוצר נוסף בהצלחה!', 'success');
        
        closeProductModal();
        await loadProducts();
        displayProducts();
        
    } catch (error) {
        console.error('❌ Error saving product:', error);
        
        if (error.code === '23505' || error.status === 409) {
            showAlert('שגיאה: קיים כבר מוצר עם מק"ט זהה במערכת.', 'error');
        } else {
            showAlert('שגיאה בשמירת המוצר: ' + (error.message || 'שגיאה לא ידועה'), 'error');
        }
    }
}

function deleteProduct(productId) {
    showConfirmModal('מחיקת מוצר', 'האם אתה בטוח שברצונך למחוק מוצר זה? פעולה זו אינה ניתנת לביטול.', async () => {
        try {
            const { error } = await supabaseClient
                .from('products')
                .delete()
                .eq('product_id', productId);
            
            if (error) throw error;
            
            // Log the action
            const deletedProduct = products.find(p => p.product_id === productId);
            logAction('delete', 'product', productId, deletedProduct?.product_name || 'מוצר', 'מחיקת מוצר');
            
            showAlert('✅ המוצר נמחק בהצלחה', 'success');
            
            await loadProducts();
            displayProducts();
            
        } catch (error) {
            console.error('❌ Error deleting product:', error);
            showAlert('שגיאה במחיקת המוצר: ' + error.message, 'error');
        }
    });
}

// ============================================
// Deals History Management
// ============================================

async function loadDealsHistory(preservePage = false) {
    const container = document.getElementById('deals-list');
    container.innerHTML = '<div class="spinner"></div>';
    
    try {
        // Get filter values
        const statusFilter = document.getElementById('filter-status')?.value || '';
        const customerFilter = document.getElementById('filter-customer')?.value.toLowerCase() || '';
        const sortFilter = document.getElementById('filter-sort')?.value || 'newest';
        
        // Build query
        let query = supabaseClient
            .from('deals')
            .select(`
                *,
                customers (
                    business_name,
                    contact_name,
                    phone,
                    primary_contact_id
                )
            `);
        
        // Apply status filter
        if (statusFilter) {
            query = query.eq('deal_status', statusFilter);
        }
        
        // Execute query
        const { data: deals, error } = await query;
        
        if (error) throw error;
        
        // Filter by customer name (client-side)
        let filteredDeals = deals || [];
        if (customerFilter) {
            filteredDeals = filteredDeals.filter(deal => 
                deal.customers.business_name.toLowerCase().includes(customerFilter)
            );
        }
        
        if (!preservePage) {
            paginationState.deals.page = 1;
        }
        
        // Sort deals
        filteredDeals.sort((a, b) => {
            switch (sortFilter) {
                case 'newest':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'oldest':
                    return new Date(a.created_at) - new Date(b.created_at);
                case 'highest':
                    return (b.final_amount || 0) - (a.final_amount || 0);
                case 'lowest':
                    return (a.final_amount || 0) - (b.final_amount || 0);
                default:
                    return 0;
            }
        });
        
        // Display deals
        if (filteredDeals.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="padding: 3rem; color: var(--text-tertiary);">
                    <p style="font-size: 1.2rem;">📋 לא נמצאו עסקאות</p>
                    <p>נסה לשנות את הפילטרים או צור עסקה חדשה</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';

        const page = paginationState.deals.page;
        const limit = paginationState.deals.limit || 10;
        const start = (page - 1) * limit;
        const pagedDeals = filteredDeals.slice(start, start + limit);

        if (viewState.deals === 'table') {
            const tableContainer = document.createElement('div');
            tableContainer.className = 'table-responsive';
            tableContainer.innerHTML = `
                <table class="items-table" style="width: 100%;">
                    <thead>
                        <tr>
                            <th>תאריך</th>
                            <th>לקוח</th>
                            <th>איש קשר</th>
                            <th>סטטוס</th>
                            <th>סכום</th>
                            <th>פעולות</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pagedDeals.map(deal => {
                            const statusBadgeClass = {
                                'טיוטה': 'badge-pending',
                                'חדש': 'badge-new',
                                'ממתין': 'badge-pending',
                                'זכייה': 'badge-won',
                                'הפסד': 'badge-lost'
                            }[deal.deal_status] || 'badge-new';
                            
                            const date = new Date(deal.created_at).toLocaleDateString('he-IL', {
                                day: '2-digit',
                                month: '2-digit',
                                year: '2-digit'
                            });

                            const statusDisplay = deal.deal_status === 'זכייה' ? 'נסגר' : (deal.deal_status === 'הפסד' ? 'בוטל' : deal.deal_status);

                            return `
                            <tr>
                                <td>${date}</td>
                                <td><strong>${deal.customers.business_name}</strong></td>
                                <td>
                                    ${deal.customers.primary_contact_id ? 
                                        `<span style="color: var(--primary-color); cursor: pointer; font-weight: 500;" onclick="viewContactDetails('${deal.customers.primary_contact_id}')">${deal.customers.contact_name || 'איש קשר'}</span>` 
                                        : (deal.customers.contact_name || '-')}
                                </td>
                                <td><span class="badge ${statusBadgeClass}">${statusDisplay}</span></td>
                                <td>₪${(deal.final_amount || 0).toFixed(2)}</td>
                                <td>
                                    <div style="display: flex; gap: 0.5rem;">
                                        <button class="btn btn-sm btn-primary btn-icon" onclick="viewDealDetails('${deal.deal_id}')" title="פרטים">👁️</button>
                                        <button class="btn btn-sm btn-secondary btn-icon" onclick="editDeal('${deal.deal_id}')" title="ערוך">✏️</button>
                                        <button class="btn btn-sm btn-secondary btn-icon" onclick="generateQuotePDF('${deal.deal_id}')" title="ייצוא הצעת מחיר (PDF)">📄</button>
                                        <button class="btn btn-sm btn-success btn-icon" onclick="sendDealWhatsApp('${deal.deal_id}', this)" title="שלח ווטסאפ" style="border: 1px solid #25D366; background-color: #25D366; display: inline-flex; align-items: center; justify-content: center;">
                                            <img src="images/whatsappwhite.png" alt="WhatsApp" style="width: 16px; height: 16px;">
                                        </button>
                                        <button class="btn btn-sm btn-danger btn-icon" onclick="deleteDeal('${deal.deal_id}')" title="מחק">🗑️</button>
                                    </div>
                                </td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
            container.appendChild(tableContainer);
        } else {
            const dealsGrid = document.createElement('div');
            dealsGrid.className = 'deals-grid';
            
            pagedDeals.forEach(deal => {
                const card = createDealCard(deal);
                dealsGrid.appendChild(card);
            });
            
            container.appendChild(dealsGrid);
        }
        
        container.innerHTML += renderPagination(filteredDeals.length, page, 'deals');
        
    } catch (error) {
        console.error('❌ Error loading deals:', error);
        container.innerHTML = `
            <div class="alert alert-error">
                שגיאה בטעינת עסקאות: ${error.message}
            </div>
        `;
    }
}

function createDealCard(deal) {
    const card = document.createElement('div');
    card.className = 'deal-card';
    
    const statusBadgeClass = {
        'טיוטה': 'badge-pending',
        'חדש': 'badge-new',
        'ממתין': 'badge-pending',
        'זכייה': 'badge-won',
        'הפסד': 'badge-lost'
    }[deal.deal_status] || 'badge-new';
    
    const date = new Date(deal.created_at).toLocaleDateString('he-IL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    card.innerHTML = `
        <div class="deal-card-header">
            <div>
                <div class="deal-card-title">${deal.customers.business_name}</div>
                <div class="deal-card-date">${date}</div>
            </div>
            <span class="badge ${statusBadgeClass}">${deal.deal_status === 'זכייה' ? 'נסגר' : (deal.deal_status === 'הפסד' ? 'בוטל' : deal.deal_status)}</span>
        </div>
        <div class="deal-card-body">
            <div class="deal-card-info">
                <span class="deal-card-label">איש קשר:</span>
                <span class="deal-card-value">${deal.customers.contact_name || '-'}</span>
            </div>
            <div class="deal-card-info">
                <span class="deal-card-label">טלפון:</span>
                <span class="deal-card-value">
                    ${deal.customers.phone ? `
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="color: var(--text-primary);">${deal.customers.phone}</span>
                            <a href="tel:${deal.customers.phone}" title="התקשר">
                                <img src="images/call.png" alt="Call" style="width: 16px; height: 16px; vertical-align: middle;">
                            </a>
                            <a href="https://wa.me/${deal.customers.phone.replace(/\D/g, '').replace(/^0/, '972')}" target="_blank" title="שלח הודעה בווטסאפ">
                                <img src="images/whatsapp.png" alt="WhatsApp" style="width: 20px; height: 20px; vertical-align: middle;">
                            </a>
                        </div>
                    ` : '-'}
                </span>
            </div>
            ${deal.notes ? `
                <div class="deal-card-info">
                    <span class="deal-card-label">הערות:</span>
                    <span class="deal-card-value">${deal.notes}</span>
                </div>
            ` : ''}
        </div>
        <div class="deal-card-footer">
            <div class="deal-card-amount">₪${(deal.final_amount || 0).toFixed(2)}</div>
            <div class="deal-card-actions">
                <button class="btn btn-primary btn-icon" onclick="viewDealDetails('${deal.deal_id}')" title="צפה בפרטים">
                    👁️
                </button>
                <button class="btn btn-secondary btn-icon" onclick="editDeal('${deal.deal_id}')" title="ערוך">
                    ✏️
                </button>
                <button class="btn btn-danger btn-icon" onclick="deleteDeal('${deal.deal_id}')" title="מחק">
                    🗑️
                </button>
            </div>
        </div>
    `;
    
    return card;
}

async function viewDealDetails(dealId) {
    try {
        // Fetch deal with all related data
        const { data: deal, error: dealError } = await supabaseClient
            .from('deals')
            .select(`
                *,
                customers (
                    business_name,
                    contact_name,
                    phone,
                    email,
                    city
                )
            `)
            .eq('deal_id', dealId)
            .single();
        
        if (dealError) throw dealError;
        
        // Fetch deal items
        const { data: items, error: itemsError } = await supabaseClient
            .from('deal_items')
            .select(`
                *,
                products (
                    product_name,
                    category
                )
            `)
            .eq('deal_id', dealId);
        
        if (itemsError) throw itemsError;
        
        // Display in modal
        const modal = document.getElementById('deal-modal');
        const content = document.getElementById('deal-details-content');
        
        const dateObj = new Date(deal.created_at);
        const date = dateObj.toLocaleDateString('he-IL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const dealDay = String(dateObj.getDate()).padStart(2, '0');
        const dealMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dealYear = dateObj.getFullYear();
        const dealTitle = `הצעת מחיר עבור ${deal.customers.business_name} ${dealDay}.${dealMonth}.${dealYear}`;
        
        // Update modal header title directly
        const modalHeaderTitle = modal.querySelector('.modal-header h2');
        if (modalHeaderTitle) {
            modalHeaderTitle.textContent = dealTitle;
        }

        const statusBadgeClass = {
            'טיוטה': 'badge-pending',
            'חדש': 'badge-new',
            'ממתין': 'badge-pending',
            'זכייה': 'badge-won',
            'הפסד': 'badge-lost'
        }[deal.deal_status] || 'badge-new';
        
        content.innerHTML = `
            <div style="margin-bottom: 2rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <!-- Title removed from here as it is now in header -->
                    <div></div> 
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <button class="btn btn-primary btn-compact" onclick="closeDealModal(); editDeal('${deal.deal_id}')">
                            ✏️ ערוך עסקה
                        </button>
                        <span class="badge ${statusBadgeClass}">${deal.deal_status === 'זכייה' ? 'נסגר' : (deal.deal_status === 'הפסד' ? 'בוטל' : deal.deal_status)}</span>
                    </div>
                </div>
                <p style="color: var(--text-secondary);">נוצרה ב: ${date}</p>
            </div>
            
            <div class="customer-section" style="margin-bottom: 2rem;">
                <h3 style="margin-bottom: 1rem;">פרטי לקוח</h3>
                <div class="customer-details">
                    <p><strong>שם העסק:</strong> ${deal.customers.business_name}</p>
                    <p><strong>איש קשר:</strong> ${deal.customers.contact_name || '-'}</p>
                    <div class="deal-card-info" style="margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; justify-content: flex-start; direction: rtl;">
                        <strong>טלפון:</strong> 
                        ${deal.customers.phone ? `
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span style="color: var(--text-primary); direction: ltr;">${deal.customers.phone}</span>
                                <a href="tel:${deal.customers.phone}" title="התקשר">
                                    <img src="images/call.png" alt="Call" style="width: 16px; height: 16px; vertical-align: middle;">
                                </a>
                                <a href="https://wa.me/${deal.customers.phone.replace(/\D/g, '').replace(/^0/, '972')}" target="_blank" title="שלח הודעה בווטסאפ">
                                    <img src="images/whatsapp.png" alt="WhatsApp" style="width: 20px; height: 20px; vertical-align: middle;">
                                </a>
                            </div>
                        ` : '-'}
                    </div>
                    <div class="deal-card-info" style="margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                        <strong>אימייל:</strong> 
                        ${deal.customers.email ? `
                            <a href="mailto:${deal.customers.email}" style="color: var(--primary-color); direction: ltr; text-align: right; display: inline-block;">${deal.customers.email}</a>
                            <img src="images/copy.png" alt="Copy" style="cursor: pointer; width: 14px; height: 14px;" onclick="copyToClipboard('${deal.customers.email}')" title="העתק אימייל">
                        ` : '-'}
                    </div>
                    <p><strong>כתובת:</strong> ${deal.customers.city || '-'}</p>
                </div>
            </div>
            
            <!-- Payment Terms Section -->
            <div style="margin-bottom: 2rem; background: rgba(37, 99, 235, 0.1); padding: 1rem; border-radius: 8px;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <label style="font-weight: 600;">💳 תנאי תשלום:</label>
                    <select id="deal-payment-terms" class="form-select" style="width: auto; min-width: 200px;" onchange="updateDealPaymentTerms('${deal.deal_id}', this.value)">
                        <option value="שוטף + 30" ${deal.payment_terms === 'שוטף + 30' ? 'selected' : ''}>שוטף + 30</option>
                        <option value="שוטף + 60" ${deal.payment_terms === 'שוטף + 60' ? 'selected' : ''}>שוטף + 60</option>
                        <option value="שוטף + 90" ${deal.payment_terms === 'שוטף + 90' ? 'selected' : ''}>שוטף + 90</option>
                        <option value="שוטף + 120" ${deal.payment_terms === 'שוטף + 120' || !deal.payment_terms ? 'selected' : ''}>שוטף + 120</option>
                        <option value="מזומן" ${deal.payment_terms === 'מזומן' ? 'selected' : ''}>מזומן</option>
                        <option value="אשראי" ${deal.payment_terms === 'אשראי' ? 'selected' : ''}>אשראי</option>
                        <option value="העברה בנקאית" ${deal.payment_terms === 'העברה בנקאית' ? 'selected' : ''}>העברה בנקאית</option>
                    </select>
                </div>
            </div>
            
            ${deal.notes ? `
                <div style="margin-bottom: 2rem;">
                    <h3 style="margin-bottom: 0.5rem;">הערות כלליות</h3>
                    <p style="color: var(--text-secondary);">${deal.notes}</p>
                </div>
            ` : ''}
            
            <div style="margin-bottom: 2rem;">
                <h3 style="margin-bottom: 1rem;">פריטים בעסקה</h3>
                <div class="table-responsive">
                    <table class="items-table" style="min-width: 600px;">
                        <thead>
                            <tr>
                                <th style="width: 50px;">#</th>
                                <th>מוצר</th>
                                <th style="width: 80px;">כמות</th>
                                <th style="width: 110px;">מחיר יח'</th>
                                <th style="width: 100px;">צבע</th>
                                <th style="width: 80px;">מידה</th>
                                <th style="width: 110px;">סה"כ</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map((item, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td><strong>${item.products.product_name}</strong><br>
                                        <small style="color: var(--text-tertiary);">${item.products.category || ''}</small>
                                    </td>
                                    <td>${item.quantity}</td>
                                    <td>₪${item.unit_price.toFixed(2)}</td>
                                    <td>${item.color || '-'}</td>
                                    <td>${item.size || '-'}</td>
                                    <td><strong>₪${item.total_price.toFixed(2)}</strong></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="summary-card">
                <div class="summary-row">
                    <span class="summary-label">סכום ביניים:</span>
                    <span class="summary-value">₪${(deal.total_amount || 0).toFixed(2)}</span>
                </div>
                ${deal.discount_percentage > 0 ? `
                    <div class="summary-row">
                        <span class="summary-label">הנחה (${deal.discount_percentage}%):</span>
                        <span class="summary-value">₪${(deal.discount_amount || 0).toFixed(2)}</span>
                    </div>
                ` : ''}
                <div class="summary-row">
                    <span class="summary-label">מע"מ (18%):</span>
                    <span class="summary-value">₪${((deal.final_amount || 0) * 0.18).toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">סה"כ לתשלום:</span>
                    <span class="summary-value summary-total">₪${((deal.final_amount || 0) * 1.18).toFixed(2)}</span>
                </div>
            </div>
        `;
        
        // Load notes
        loadDealNotes(dealId);
        
        // Store deal ID for adding notes
        document.getElementById('deal-modal').dataset.currentDealId = dealId;
        document.getElementById('deal-modal').dataset.currentCustomerId = deal.customer_id;
        
        // Load saved username if exists
        const savedAuthor = localStorage.getItem('crm_username');
        if (savedAuthor) {
            document.getElementById('note-author').value = savedAuthor;
        }

        // Set default activity date to now + 2 hours
        const now = new Date();
        now.setHours(now.getHours() + 2);
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        
        document.getElementById('activity-date').value = `${year}-${month}-${day}T${hours}:${minutes}`;
        
        setupMentionAutocomplete('new-note-text');

        modal.classList.add('active');
        
    } catch (error) {
        console.error('❌ Error loading deal details:', error);
        showAlert('שגיאה בטעינת פרטי העסקה: ' + error.message, 'error');
    }
}

async function loadDealNotes(dealId) {
    const container = document.getElementById('deal-notes-list');
    container.innerHTML = '<div class="text-center" style="color: var(--text-tertiary);">טוען פעילויות...</div>';
    
    try {
        const { data: notes, error } = await supabaseClient
            .from('activities')
            .select('*')
            .eq('deal_id', dealId)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        if (!notes || notes.length === 0) {
            container.innerHTML = '<div class="text-center" style="color: var(--text-tertiary);">אין פעילויות</div>';
            return;
        }
        
        const typeIcons = {
            'הערה': '📝',
            'שיחה': '📞',
            'פגישה': '📅',
            'מייל': '📧',
            'משימה': '✅'
        };

        container.innerHTML = notes.map(note => {
            const createdDate = new Date(note.created_at).toLocaleString();
            const activityDate = note.activity_date ? new Date(note.activity_date).toLocaleString() : null;
            const icon = typeIcons[note.activity_type] || '📝';
            const editedInfo = note.edited_at ? `<div class="note-edited">עריכה על ידי ${note.edited_by || 'לא ידוע'} ב-${new Date(note.edited_at).toLocaleString()}</div>` : '';
            
            return `
                <div class="note-item">
                    <div class="note-header">
                        <span class="note-author">${icon} ${note.created_by || 'משתמש מערכת'}</span>
                        <span style="font-size: 0.85rem; color: var(--text-tertiary);">${createdDate}</span>
                        <div style="display: flex; gap: 5px;">
                            <button class="btn btn-sm btn-primary" onclick="editNote('${note.activity_id}')" title="ערוך">✏️</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteNote('${note.activity_id}')" title="מחק">🗑️</button>
                        </div>
                    </div>
                    <div class="note-content">
                        ${activityDate ? `<div style="margin-bottom: 5px; color: var(--primary-color); font-weight: 500;">📅 תאריך יעד/פעילות: ${activityDate}</div>` : ''}
                        <strong>${note.activity_type}:</strong> ${formatActivityText(note.description)}
                    </div>
                    ${editedInfo}
                </div>`;
        }).join('');
        
    } catch (error) {
        console.error('❌ Error loading notes:', error);
        container.innerHTML = '<div class="text-center" style="color: var(--error-color);">שגיאה בטעינת פעילויות</div>';
    }
}

async function addDealNote() {
    const noteText = document.getElementById('new-note-text').value.trim();
    const author = document.getElementById('note-author').value.trim() || 'משתמש מערכת';
    const activityType = document.getElementById('activity-type').value;
    const activityDate = document.getElementById('activity-date').value;
    const dealId = document.getElementById('deal-modal').dataset.currentDealId;
    const customerId = document.getElementById('deal-modal').dataset.currentCustomerId;
    
    if (!noteText) {
        showAlert('אנא כתוב תיאור לפעילות', 'warning');
        return;
    }
    
    try {
        // Save author name for future use
        localStorage.setItem('crm_username', author);

        const { error } = await supabaseClient
            .from('activities')
            .insert({
                deal_id: dealId,
                customer_id: customerId,
                activity_type: activityType,
                description: noteText,
                created_by: author,
                activity_date: activityDate ? new Date(activityDate).toISOString() : null
            });
            
        if (error) throw error;
        
        // Clear input and reload notes
        document.getElementById('new-note-text').value = '';
        document.getElementById('activity-date').value = '';
        loadDealNotes(dealId);
        
    } catch (error) {
        console.error('❌ Error adding note:', error);
        showAlert('שגיאה בהוספת פעילות: ' + error.message, 'error');
    }
}
// Delete a note
function deleteNote(activityId) {
    showConfirmModal('מחיקת הערה', 'האם אתה בטוח שברצונך למחוק את ההערה?', async () => {
        try {
            const { error } = await supabaseClient
                .from('activities')
                .delete()
                .eq('activity_id', activityId);
            if (error) throw error;
            showAlert('✅ ההערה נמחקה', 'success');
            // Reload notes for current deal
            const dealId = document.getElementById('deal-modal').dataset.currentDealId;
            loadDealNotes(dealId);
        } catch (err) {
            console.error('❌ Error deleting note:', err);
            showAlert('שגיאה במחיקת ההערה: ' + err.message, 'error');
        }
    });
}

// Edit a note/activity - opens a modal to edit all properties
async function editNote(activityId) {
    // Fetch current note
    const { data: note, error } = await supabaseClient
        .from('activities')
        .select('*')
        .eq('activity_id', activityId)
        .single();
    if (error) {
        console.error('❌ Error fetching note:', error);
        showAlert('שגיאה בטעינת ההערה לעריכה', 'error');
        return;
    }
    
    // Show edit modal
    showEditActivityModal(note);
}

// ============================================
// Activity Notes Logic
// ============================================

async function loadActivityNotes(activityId, containerId = 'activity-notes-list') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '<div class="text-center" style="font-size: 0.8rem; color: var(--text-tertiary);">טוען...</div>';
    
    try {
        const { data: notes, error } = await supabaseClient
            .from('activity_notes')
            .select('*')
            .eq('activity_id', activityId)
            .order('created_at', { ascending: true });
            
        if (error) throw error;
        
        if (!notes || notes.length === 0) {
            container.innerHTML = '<div class="text-center" style="font-size: 0.8rem; color: var(--text-tertiary);">אין הערות</div>';
            return;
        }
        
        container.innerHTML = notes.map(note => {
            // First format mentions, then simple URL linking if needed
            // Since formatActivityText returns HTML with <a> tags, we should be careful.
            // Let's rely on formatActivityText for mentions. If linkify exists, we might lose mentions if it escapes HTML.
            // Assuming formatActivityText is safe for now.
            const formattedContent = formatActivityText(note.content);
            const isEditing = container.dataset.editingId == note.id;
            
            if (isEditing) {
                return `
                <div style="background: var(--bg-primary); padding: 0.5rem; border-radius: 4px; margin-bottom: 0.5rem; border: 1px solid var(--border-color);">
                    <textarea id="edit-note-input-${note.id}" class="form-textarea" rows="3" style="width: 100%; margin-bottom: 0.5rem;">${note.content}</textarea>
                    <div style="display: flex; gap: 0.5rem;">
                        <button onclick="saveActivityNoteEdit(${note.id}, '${activityId}')" class="btn btn-sm btn-primary">💾 שמור</button>
                        <button onclick="cancelActivityNoteEdit('${activityId}')" class="btn btn-sm btn-secondary">ביטול</button>
                    </div>
                </div>`;
            }

            return `
            <div style="background: var(--bg-primary); padding: 0.5rem; border-radius: 4px; margin-bottom: 0.5rem; border: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                     <div style="font-size: 0.9rem; white-space: pre-wrap;">${formattedContent}</div>
                     <div style="display: flex; gap: 0.5rem;">
                        <button onclick="editActivityNote(${note.id}, '${activityId}')" type="button" style="background: none; border: none; cursor: pointer; padding: 0 0.2rem; font-size: 1rem;" title="ערוך">✏️</button>
                        <button onclick="deleteActivityNote(${note.id}, '${activityId}')" type="button" style="color: var(--danger-color); background: none; border: none; cursor: pointer; padding: 0 0.2rem; font-size: 1.1em;" title="מחק">×</button>
                     </div>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-top: 0.25rem;">
                    ${note.created_by} • ${new Date(note.created_at).toLocaleString('he-IL')}
                </div>
            </div>
        `}).join('');
        
    } catch (error) {
        console.error('❌ Error loading activity notes:', error);
        container.innerHTML = '<div class="text-center" style="color: var(--danger-color);">שגיאה בטעינת הערות</div>';
    }
}

function editActivityNote(noteId, activityId) {
    const container = document.getElementById('activity-notes-list') || document.getElementById('view-activity-notes-list');
    if (container) {
        container.dataset.editingId = noteId;
        loadActivityNotes(activityId, container.id);
    }
}

function cancelActivityNoteEdit(activityId) {
    const container = document.getElementById('activity-notes-list') || document.getElementById('view-activity-notes-list');
    if (container) {
        delete container.dataset.editingId;
        loadActivityNotes(activityId, container.id);
    }
}

async function saveActivityNoteEdit(noteId, activityId) {
    try {
        const input = document.getElementById(`edit-note-input-${noteId}`);
        const newContent = input.value.trim();
        
        if (!newContent) {
            showAlert('אנא הזן תוכן להערה', 'warning');
            return;
        }
        
        const { error } = await supabaseClient
            .from('activity_notes')
            .update({ content: newContent })
            .eq('id', noteId);
            
        if (error) throw error;
        
        // Clear editing state and reload
        const container = document.getElementById('activity-notes-list') || document.getElementById('view-activity-notes-list');
        if (container) {
            delete container.dataset.editingId;
            loadActivityNotes(activityId, container.id);
            
            // If we are in the other view, reload that too
            const otherContainerId = container.id === 'activity-notes-list' ? 'view-activity-notes-list' : 'activity-notes-list';
            loadActivityNotes(activityId, otherContainerId);
        }
        
    } catch (error) {
        console.error('❌ Error saving activity note:', error);
        showAlert('שגיאה בשמירת הערה', 'error');
    }
}

function linkify(text) {
    if (!text) return '';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function(url) {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color); text-decoration: underline;">${url}</a>`;
    });
}

async function addActivityNote() {
    const activityId = document.getElementById('edit-activity-id').value;
    const input = document.getElementById('new-activity-note');
    const content = input.value.trim();
    
    if (!content) return;
    
    try {
        await insertActivityNoteToDb(activityId, content);
        input.value = '';
        await loadActivityNotes(activityId, 'activity-notes-list');
    } catch (error) {
        console.error('❌ Error adding activity note:', error);
        showAlert('שגיאה בהוספת הערה', 'error');
    }
}

async function addActivityNoteFromView(activityId) {
    const input = document.getElementById('view-activity-new-note');
    const content = input.value.trim();
    
    if (!content) return;
    
    try {
        await insertActivityNoteToDb(activityId, content);
        input.value = '';
        await loadActivityNotes(activityId, 'view-activity-notes-list');
    } catch (error) {
        console.error('❌ Error adding activity note from view:', error);
        showAlert('שגיאה בהוספת הערה', 'error');
    }
}

async function insertActivityNoteToDb(activityId, content) {
    const performedBy = localStorage.getItem('crm_username') || 'משתמש מערכת';
    const { error } = await supabaseClient.from('activity_notes').insert({
        activity_id: activityId, content, created_by: performedBy
    });
    if (error) throw error;
}

async function deleteActivityNote(noteId, activityId) {
    showConfirmModal('מחיקת הערה', 'האם למחוק את ההערה?', async () => {
        try {
            const { error } = await supabaseClient
                .from('activity_notes')
                .delete()
                .eq('id', noteId);
                
            if (error) throw error;
            
            // Try reload both containers if they exist
            loadActivityNotes(activityId, 'activity-notes-list');
            loadActivityNotes(activityId, 'view-activity-notes-list');
            
        } catch (error) {
            console.error('❌ Error deleting activity note:', error);
            showAlert('שגיאה במחיקת הערה', 'error');
        }
    });
}

// Helper to load contacts for activity dropdown
async function loadCustomerContactsForActivity(customerId, selectId, preselectId = null) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">-- ראשי (ברירת מחדל) --</option>';
    
    if (!customerId) {
        select.disabled = true;
        return;
    }
    
    select.disabled = false;
    
    try {
        const { data: contacts, error } = await supabaseClient
            .from('contacts')
            .select('*')
            .eq('customer_id', customerId)
            .order('contact_name');
            
        if (error) throw error;
        
        if (contacts) {
            contacts.forEach(contact => {
                const option = document.createElement('option');
                option.value = contact.contact_id;
                option.textContent = `${contact.contact_name} ${contact.role ? `(${contact.role})` : ''}`;
                if (preselectId && contact.contact_id === preselectId) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        }
    } catch (err) {
        console.error('Error loading contacts:', err);
    }
}

// Show edit activity modal with all editable fields
function showEditActivityModal(activity) {
    // Create or get modal
    let modal = document.getElementById('edit-activity-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'edit-activity-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 550px;">
                <div class="modal-header">
                    <h2>✏️ עריכת פעילות</h2>
                    <button class="modal-close" onclick="closeEditActivityModal()">✕</button>
                </div>
                <form id="edit-activity-form" onsubmit="saveActivityEdit(event)">
                    <input type="hidden" id="edit-activity-id">
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">סוג פעילות</label>
                            <select id="edit-activity-type" class="form-select">
                                <option value="הערה">📝 הערה</option>
                                <option value="שיחה">📞 שיחה</option>
                                <option value="פגישה">📅 פגישה</option>
                                <option value="מייל">📧 מייל</option>
                                <option value="משימה">✅ משימה</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">תאריך פעילות</label>
                            <input type="datetime-local" id="edit-activity-date" class="form-input">
                        </div>
                        <div class="form-group">
                            <label class="form-label">סטטוס</label>
                            <select id="edit-activity-status" class="form-select">
                                <option value="false">⏳ ממתין לביצוע</option>
                                <option value="true">✅ בוצע</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label class="form-label">תיאור</label>
                        <textarea id="edit-activity-description" class="form-textarea" rows="3" required></textarea>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label class="form-label">קשר לעסקה</label>
                        <select id="edit-activity-deal" class="form-select">
                            <option value="">-- ללא עסקה --</option>
                        </select>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label class="form-label">קשר ללקוח</label>
                        <input type="text" id="edit-activity-customer-search" class="form-input" placeholder="🔍 חפש לקוח..." style="margin-bottom: 0.5rem;" onkeyup="filterEditActivityCustomers(this.value)">
                        <select id="edit-activity-customer" class="form-select" size="5" onchange="loadCustomerContactsForActivity(this.value, 'edit-activity-contact'); populateEditActivityDeals(null, this.value);">
                            <option value="">-- ללא לקוח --</option>
                        </select>
                    </div>

                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label class="form-label">איש קשר</label>
                        <select id="edit-activity-contact" class="form-select">
                            <option value="">-- ראשי (ברירת מחדל) --</option>
                        </select>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label class="form-label">שם העורך</label>
                        <input type="text" id="edit-activity-editor" class="form-input" placeholder="הזן את שמך">
                    </div>
                    
                    <div style="margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                        <h3 style="font-size: 1rem; margin-top: 1.5rem; margin-bottom: 0.5rem; color: var(--text-primary);">💼 עסקאות</h3>
                <div id="edit-activity-deals-list" style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 6px; padding: 1rem; max-height: 250px; overflow-y: auto; margin-bottom: 1.5rem;">
                    <div class="spinner"></div>
                </div>

                <h3 style="font-size: 1rem; margin-top: 1.5rem; margin-bottom: 0.5rem; color: var(--text-primary);">📜 היסטוריית הערות ופעילויות</h3>
                        <div id="activity-notes-list" style="margin-bottom: 1rem; max-height: 150px; overflow-y: auto; background: var(--bg-secondary); padding: 0.5rem; border-radius: 6px; border: 1px solid var(--border-color);">
                            <!-- Notes will be loaded here -->
                        </div>
                        <div style="display: flex; gap: 0.5rem; flex-direction: column;">
                            <textarea id="new-activity-note" class="form-textarea" rows="3" placeholder="הוסף הערה..."></textarea>
                            <button type="button" class="btn btn-secondary" style="align-self: flex-start;" onclick="addActivityNote()">➕ הוסף הערה</button>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="submit" class="btn btn-primary">💾 שמור שינויים</button>
                        <button type="button" class="btn btn-secondary" onclick="closeEditActivityModal()">ביטול</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Populate form with current values
    document.getElementById('edit-activity-id').value = activity.activity_id;
    document.getElementById('edit-activity-type').value = activity.activity_type || 'הערה';
    document.getElementById('edit-activity-status').value = activity.completed ? 'true' : 'false';
    document.getElementById('edit-activity-description').value = activity.description || '';
    
    // Format date for datetime-local input
    if (activity.activity_date) {
        const date = new Date(activity.activity_date);
        const formattedDate = date.toISOString().slice(0, 16);
        document.getElementById('edit-activity-date').value = formattedDate;
    } else {
        document.getElementById('edit-activity-date').value = '';
    }
    
    // Load saved editor name
    const savedEditor = localStorage.getItem('crm_username') || '';
    document.getElementById('edit-activity-editor').value = savedEditor;
    
    // Start populating dropdowns (async)
    populateEditActivityDeals(activity.deal_id, activity.customer_id);
    populateEditActivityCustomers(activity.customer_id);
    
    // Load activity notes
    loadActivityNotes(activity.activity_id);

    // Load customer deals if customer is linked
    // Load customer deals if customer is linked
    if (activity.customer_id) {
        if (typeof loadCustomerDeals === 'function') {
            loadCustomerDeals(activity.customer_id, 'edit-activity-deals-list');
        }
        // Load contacts logic added here
        loadCustomerContactsForActivity(activity.customer_id, 'edit-activity-contact', activity.contact_id);
    } else {
        const dealsList = document.getElementById('edit-activity-deals-list');
        if (dealsList) dealsList.innerHTML = '<p style="text-align:center; color: var(--text-tertiary); padding: 1rem;">אין לקוח מקושר לפעילות זו</p>';
    }
    
    // Initialize Mention Autocomplete
    setupMentionAutocomplete('edit-activity-description');

    modal.classList.add('active');
}

async function populateEditActivityDeals(currentDealId, filterCustomerId = null) {
    const select = document.getElementById('edit-activity-deal');
    if (!select) return;
    select.innerHTML = '<option value="">-- ללא עסקה --</option>';
    
    // If filtering by customer and no customer selected, leave empty
    // But maybe the user wants to pick a deal first?
    // The requirement is "Show only deals linked to the SAME customer".
    // So if filterCustomerId is present, strictly filter.
    // If NOT present, maybe show all? Or clear?
    
    try {
        let query = supabaseClient
            .from('deals')
            .select('deal_id, customers(business_name), created_at')
            .order('created_at', { ascending: false })
            .limit(50);
            
        if (filterCustomerId) {
            query = query.eq('customer_id', filterCustomerId);
        }
            
        const { data: deals, error } = await query;
        
        if (error) throw error;
        
        if (deals) {
            deals.forEach(deal => {
                const date = new Date(deal.created_at).toLocaleDateString('he-IL');
                const option = document.createElement('option');
                option.value = deal.deal_id;
                option.textContent = `${deal.customers?.business_name || 'ללא לקוח'} - ${date}`;
                if (deal.deal_id === currentDealId) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading deals for activity edit:', error);
    }
}

function populateEditActivityCustomers(currentCustomerId) {
    const select = document.getElementById('edit-activity-customer');
    select.innerHTML = '<option value="">-- ללא לקוח --</option>';
    
    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.customer_id;
        option.textContent = customer.business_name;
        if (customer.customer_id === currentCustomerId) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

function filterEditActivityCustomers(searchTerm) {
    const select = document.getElementById('edit-activity-customer');
    // Ensure we keep the currently selected value if possible
    const currentSelected = select.value;
    const lowerTerm = searchTerm.toLowerCase();
    
    select.innerHTML = '<option value="">-- ללא לקוח --</option>';
    
    // Use global customers array
    if (typeof customers !== 'undefined' && customers) {
        customers.forEach(customer => {
            if (customer.business_name.toLowerCase().includes(lowerTerm)) {
                const option = document.createElement('option');
                option.value = customer.customer_id;
                option.textContent = customer.business_name;
                if (customer.customer_id === currentSelected) {
                    option.selected = true;
                }
                select.appendChild(option);
            }
        });
        
        // If current selected is NOT in filtered list but exists (and search term is not empty), maybe we should add it?
        // OR the user is searching for something ELSE, so it's fine to lose selection?
        // Usually fine to lose it if it doesn't match search.
    }
}

function closeEditActivityModal() {
    const modal = document.getElementById('edit-activity-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

async function saveActivityEdit(event) {
    event.preventDefault();
    
    const activityId = document.getElementById('edit-activity-id').value;
    const activityType = document.getElementById('edit-activity-type').value;
    const activityDate = document.getElementById('edit-activity-date').value;
    const description = document.getElementById('edit-activity-description').value;
    const completedStatus = document.getElementById('edit-activity-status').value === 'true';
    const dealId = document.getElementById('edit-activity-deal').value;
    const customerId = document.getElementById('edit-activity-customer').value;
    const contactElement = document.getElementById('edit-activity-contact');
    const contactIdRaw = contactElement ? contactElement.value : '';
    const contactId = contactIdRaw === '' ? null : contactIdRaw;
    
    const editorInput = document.getElementById('edit-activity-editor').value.trim();
    const editor = editorInput || 'משתמש מערכת';
    
    // Save editor name for future use
    if (editorInput) {
        localStorage.setItem('crm_username', editorInput);
    }
    
    try {
        const updateData = {
            activity_type: activityType,
            description: description,
            completed: completedStatus
        };
        
        // Add optional fields only if schema supports them (to avoid 400 errors)
        if (window.crmCapabilities?.editTracking) {
             updateData.edited_at = new Date().toISOString();
             updateData.edited_by = editor;
        }
        
        if (window.crmCapabilities?.contactInActivity) {
             updateData.contact_id = contactId;
        } else if (contactId) {
             // Warn user if they tried to set a contact but capability is missing
             console.warn('Skipping save of contact_id because schema capability is missing');
        }
        
        // Only update activity_date if provided
        if (activityDate) {
            updateData.activity_date = new Date(activityDate).toISOString();
        } else {
            updateData.activity_date = null;
        }
        
        // Update deal and customer linkage
        if (dealId) {
            updateData.deal_id = dealId;
            // Get customer_id from deal
            const { data: deal } = await supabaseClient
                .from('deals')
                .select('customer_id')
                .eq('deal_id', dealId)
                .single();
            if (deal) {
                updateData.customer_id = deal.customer_id;
            }
        } else {
            updateData.deal_id = null;
            updateData.customer_id = customerId || null;
        }
        
        // Attempt 1: Full update (including contact_id and edit tracking)
        const { error: firstAttemptError } = await supabaseClient
            .from('activities')
            .update(updateData)
            .eq('activity_id', activityId);
            
        if (firstAttemptError) {
            console.warn('First update attempt failed (Full data), trying fallback 1 (No contact_id):', firstAttemptError);
            
            // Fallback 1: Remove contact_id
            const fallbackData1 = { ...updateData };
            delete fallbackData1.contact_id;
            
            const { error: secondAttemptError } = await supabaseClient
                .from('activities')
                .update(fallbackData1)
                .eq('activity_id', activityId);
                
            if (secondAttemptError) {
                console.warn('Second update attempt failed (No contact_id), trying fallback 2 (No edit tracking):', secondAttemptError);
                
                // Fallback 2: Remove edit tracking columns as well
                const fallbackData2 = { ...fallbackData1 };
                delete fallbackData2.edited_at;
                delete fallbackData2.edited_by;
                
                const { error: thirdAttemptError } = await supabaseClient
                    .from('activities')
                    .update(fallbackData2)
                    .eq('activity_id', activityId);
                    
                if (thirdAttemptError) {
                    console.error('All update attempts failed.');
                    throw firstAttemptError; // Throw the original error
                } else {
                    showAlert('✅ הפעילות עודכנה (שים לב: נתוני עריכה ואיש קשר לא נשמרו - חסרות עמודות במסד הנתונים)', 'warning');
                }
            } else {
                showAlert('✅ הפעילות עודכנה (אך שיוך איש הקשר נכשל - חסרה עמודת contact_id)', 'warning');
            }
        } else {
            showAlert('✅ הפעילות עודכנה בהצלחה', 'success');
        }

        closeEditActivityModal();

        // If activity was marked as completed, automatically open new activity modal
        if (completedStatus) {
            setTimeout(() => {
                openNewActivityModal({
                    deal_id: dealId,
                    customer_id: customerId
                });
            }, 500);
        }
        
        // Reload notes for current deal
        const currentDealId = document.getElementById('deal-modal').dataset.currentDealId;
        if (currentDealId) {
            loadDealNotes(currentDealId);
        }
        
        // Reload activities tab if visible
        const activitiesTab = document.getElementById('activities-tab');
        if (activitiesTab && !activitiesTab.classList.contains('hidden')) {
            loadActivities();
        }

        // Reload This Week if visible
        const weekTab = document.getElementById('thisweek-tab');
        if (weekTab && !weekTab.classList.contains('hidden')) {
             loadThisWeek();
        }

        // Reload customer history if edit modal is open
        const editCustomerModal = document.getElementById('customer-modal');
        if (editCustomerModal && editCustomerModal.classList.contains('active')) {
             const form = document.getElementById('customer-form');
             if (form && form.dataset.customerId) {
                 loadCustomerNotesHistory(form.dataset.customerId, 'customer-notes-history');
             }
        }

        // Reload customer details history if details modal is open
        const viewCustomerModal = document.getElementById('customer-details-modal');
        if (viewCustomerModal && viewCustomerModal.classList.contains('active')) {
             if (viewCustomerModal.dataset.currentCustomerId) {
                 loadCustomerNotesHistory(viewCustomerModal.dataset.currentCustomerId, 'view-customer-notes-history');
             }
        }
        
    } catch (err) {
        console.error('❌ Error updating activity:', err);
        
        if (err.message && err.message.includes('column') && err.message.includes('does not exist')) {
            showAlert('שגיאה: מסד הנתונים לא מעודכן. אנא הרץ את קובץ המיגרציה add_edit_tracking.sql', 'error');
        } else {
            showAlert('שגיאה בעדכון הפעילות: ' + err.message, 'error');
        }
    }
}

// ============================================
// New Activity Modal (from Activities Tab)
// ============================================

function openNewActivityModal(prefillData = null) {
    // Create or get modal
    let modal = document.getElementById('new-activity-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'new-activity-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 550px;">
                <div class="modal-header">
                    <h2>➕ פעילות חדשה</h2>
                    <button class="modal-close" onclick="closeNewActivityModal()">✕</button>
                </div>
                <form id="new-activity-form" onsubmit="saveNewActivity(event)">
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">סוג פעילות</label>
                            <select id="new-activity-type" class="form-select" required>
                                <option value="שיחה">📞 שיחה</option>
                                <option value="פגישה">📅 פגישה</option>
                                <option value="מייל">📧 מייל</option>
                                <option value="משימה" selected>✅ משימה</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">תאריך פעילות</label>
                            <input type="datetime-local" id="new-activity-date-input" class="form-input">
                        </div>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label class="form-label required">תיאור</label>
                        <textarea id="new-activity-description" class="form-textarea" rows="3" required placeholder="תאר את הפעילות..."></textarea>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label class="form-label">קשר לעסקה</label>
                        <select id="new-activity-deal" class="form-select">
                            <option value="">-- ללא עסקה --</option>
                        </select>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label class="form-label">קשר ללקוח</label>
                        <select id="new-activity-customer" class="form-select">
                            <option value="">-- ללא לקוח --</option>
                        </select>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label class="form-label">נוצר על ידי</label>
                        <input type="text" id="new-activity-author" class="form-input" placeholder="הזן את שמך">
                    </div>
                    
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-primary">💾 שמור פעילות</button>
                        <button type="button" class="btn btn-secondary" onclick="closeNewActivityModal()">ביטול</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Populate deals dropdown
    populateNewActivityDeals();
    
    // Populate customers dropdown
    populateNewActivityCustomers();
    
    // Load saved author name
    const savedAuthor = localStorage.getItem('crm_username') || '';
    document.getElementById('new-activity-author').value = savedAuthor;
    
    // Reset form
    document.getElementById('new-activity-form').reset();
    document.getElementById('new-activity-author').value = savedAuthor;
    
    // Set default date to now + 2 hours
    const now = new Date();
    now.setHours(now.getHours() + 2);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    document.getElementById('new-activity-date-input').value = `${year}-${month}-${day}T${hours}:${minutes}`;

    // Apply prefill data
    if (prefillData) {
        if (prefillData.deal_id) {
             const dealSelect = document.getElementById('new-activity-deal');
             if (dealSelect) dealSelect.value = prefillData.deal_id;
        }
        if (prefillData.customer_id) {
             const customerSelect = document.getElementById('new-activity-customer');
             if (customerSelect) customerSelect.value = prefillData.customer_id;
        }
    }

    // Initialize Mention Autocomplete
    setupMentionAutocomplete('new-activity-description');

    modal.classList.add('active');
}

async function populateNewActivityDeals() {
    const select = document.getElementById('new-activity-deal');
    select.innerHTML = '<option value="">-- ללא עסקה --</option>';
    
    try {
        const { data: deals, error } = await supabaseClient
            .from('deals')
            .select('deal_id, customers(business_name), created_at')
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        deals.forEach(deal => {
            const date = new Date(deal.created_at).toLocaleDateString('he-IL');
            const option = document.createElement('option');
            option.value = deal.deal_id;
            option.textContent = `${deal.customers?.business_name || 'ללא לקוח'} - ${date}`;
            option.dataset.customerId = deal.customer_id;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading deals for activity:', error);
    }
}

function populateNewActivityCustomers() {
    const select = document.getElementById('new-activity-customer');
    select.innerHTML = '<option value="">-- ללא לקוח --</option>';
    
    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.customer_id;
        option.textContent = customer.business_name;
        select.appendChild(option);
    });
}

function closeNewActivityModal() {
    const modal = document.getElementById('new-activity-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

async function saveNewActivity(event) {
    event.preventDefault();
    
    const activityType = document.getElementById('new-activity-type').value;
    const activityDate = document.getElementById('new-activity-date-input').value;
    const description = document.getElementById('new-activity-description').value;
    const dealId = document.getElementById('new-activity-deal').value;
    const customerId = document.getElementById('new-activity-customer').value;
    const authorInput = document.getElementById('new-activity-author').value.trim();
    const author = authorInput || 'משתמש מערכת';
    
    // Save author name for future use
    if (authorInput) {
        localStorage.setItem('crm_username', authorInput);
    }
    
    try {
        const activityData = {
            activity_type: activityType,
            description: description,
            created_by: author,
            activity_date: activityDate ? new Date(activityDate).toISOString() : null,
            completed: false
        };
        
        // Link to deal if selected
        if (dealId) {
            activityData.deal_id = dealId;
            // Get customer_id from deal
            const { data: deal } = await supabaseClient
                .from('deals')
                .select('customer_id')
                .eq('deal_id', dealId)
                .single();
            if (deal) {
                activityData.customer_id = deal.customer_id;
            }
        } else if (customerId) {
            // Only link to customer if no deal selected
            activityData.customer_id = customerId;
        }
        
        const { data: newActivity, error } = await supabaseClient
            .from('activities')
            .insert(activityData)
            .select()
            .single();
        
        if (error) throw error;
        
        // Log the action
        logAction('create', 'activity', newActivity.activity_id, activityData.activity_type, `יצירת פעילות: ${activityData.description || activityData.activity_type}`);
        
        showAlert('✅ הפעילות נוספה בהצלחה', 'success');
        closeNewActivityModal();
        
        // Reload activities
        loadActivities();

        // Reload This Week if visible
        const weekTab = document.getElementById('thisweek-tab');
        if (weekTab && !weekTab.classList.contains('hidden')) {
             loadThisWeek();
        }
        
    } catch (error) {
        console.error('❌ Error saving new activity:', error);
        showAlert('שגיאה בשמירת הפעילות: ' + error.message, 'error');
    }
}


function closeDealModal() {
    document.getElementById('deal-modal').classList.remove('active');
}

// Update payment terms for a deal
async function updateDealPaymentTerms(dealId, paymentTerms) {
    try {
        const { error } = await supabaseClient
            .from('deals')
            .update({ payment_terms: paymentTerms })
            .eq('deal_id', dealId);
        
        if (error) throw error;
        
        showAlert('✅ תנאי התשלום עודכנו', 'success');
        
    } catch (error) {
        console.error('❌ Error updating payment terms:', error);
        showAlert('שגיאה בעדכון תנאי התשלום: ' + error.message, 'error');
    }
}

function deleteDeal(dealId) {
    showConfirmModal('מחיקת עסקה', 'האם אתה בטוח שברצונך למחוק עסקה זו? פעולה זו אינה ניתנת לביטול.', async () => {
        try {
            // Delete deal items first (cascade should handle this, but being explicit)
            const { error: itemsError } = await supabaseClient
                .from('deal_items')
                .delete()
                .eq('deal_id', dealId);
            
            if (itemsError) throw itemsError;
            
            // Delete deal
            const { error: dealError } = await supabaseClient
                .from('deals')
                .delete()
                .eq('deal_id', dealId);
            
            if (dealError) throw dealError;
            
            showAlert('✅ העסקה נמחקה בהצלחה', 'success');
            
            // Reload deals history
            loadDealsHistory();
            
        } catch (error) {
            console.error('❌ Error deleting deal:', error);
            showAlert('שגיאה במחיקת העסקה: ' + error.message, 'error');
        }
    });
}

async function editDeal(dealId) {
    try {
        // Fetch deal with all related data
        const { data: deal, error: dealError } = await supabaseClient
            .from('deals')
            .select(`
                *,
                customers (
                    customer_id,
                    business_name
                )
            `)
            .eq('deal_id', dealId)
            .single();
        
        if (dealError) throw dealError;
        
        // Fetch deal items
        const { data: items, error: itemsError } = await supabaseClient
            .from('deal_items')
            .select(`
                *,
                products (
                    product_id,
                    product_name,
                    price,
                    requires_color,
                    requires_size
                )
            `)
            .eq('deal_id', dealId);
        
        if (itemsError) throw itemsError;
        
        // Switch to deals tab
        const navSelect = document.getElementById('main-navigation');
        if (navSelect) {
            navSelect.value = 'deals';
            // Manually trigger change to update UI
            const event = new Event('change');
            navSelect.dispatchEvent(event);
        } else {
             // Fallback if no dropdown (old code mainly)
             document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
             document.getElementById('deals-tab').classList.remove('hidden');
        }
        
        // Populate form
        document.getElementById('customer-select').value = deal.customer_id;
        const searchInput = document.getElementById('customer-search-input');
        if (searchInput && deal.customers) {
            searchInput.value = deal.customers.business_name;
        }
        document.getElementById('deal-status').value = deal.deal_status;
        document.getElementById('deal-notes').value = deal.notes || '';
        document.getElementById('discount-percentage').value = deal.discount_percentage || 0;
        
        // Clear existing items
        dealItems = [];
        
        // Add items from the deal
        items.forEach(item => {
            const newItem = {
                id: `item-${itemCounter++}`,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                color: item.color || '',
                size: item.size || '',
                requires_color: item.products.requires_color,
                requires_size: item.products.requires_size
            };
            dealItems.push(newItem);
        });
        
        // Render items
        renderDealItems();
        updateEmptyState();
        calculateTotal();
        
        // Store deal ID for update
        document.getElementById('deals-tab').dataset.editDealId = dealId;
        
        // Duplicate switch logic removed as it's redundant/handled above

        showAlert('📝 עריכת עסקה - ערוך את הפרטים ושמור שוב', 'info');
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
    } catch (error) {
        console.error('❌ Error loading deal for edit:', error);
        showAlert('שגיאה בטעינת העסקה לעריכה: ' + error.message, 'error');
    }
}

// ============================================
// Activities Management
// ============================================

function deleteActivity(activityId) {
    showConfirmModal('מחיקת פעילות', 'האם אתה בטוח שברצונך למחוק פעילות זו? פעולה זו אינה ניתנת לביטול.', async () => {
        try {
            const { error } = await supabaseClient
                .from('activities')
                .delete()
                .eq('activity_id', activityId);
            
            if (error) throw error;
            
            showAlert('✅ הפעילות נמחקה בהצלחה', 'success');
            
            // Reload activities
            loadActivities();

            // Reload customer history if edit modal is open
            const editCustomerModal = document.getElementById('customer-modal');
            if (editCustomerModal && editCustomerModal.classList.contains('active')) {
                 const form = document.getElementById('customer-form');
                 if (form && form.dataset.customerId) {
                     loadCustomerNotesHistory(form.dataset.customerId, 'customer-notes-history');
                 }
            }
    
            // Reload customer details history if details modal is open
            const viewCustomerModal = document.getElementById('customer-details-modal');
            if (viewCustomerModal && viewCustomerModal.classList.contains('active')) {
                 if (viewCustomerModal.dataset.currentCustomerId) {
                     loadCustomerNotesHistory(viewCustomerModal.dataset.currentCustomerId, 'view-customer-notes-history');
                 }
            }
            
        } catch (error) {
            console.error('❌ Error deleting activity:', error);
            showAlert('שגיאה במחיקת הפעילות: ' + error.message, 'error');
        }
    });
}

// ============================================
// This Week Tab
// ============================================

const todayDay = new Date().getDay();
let currentWeekOffset = (todayDay === 5 || todayDay === 6) ? 1 : 0; // Friday/Saturday -> Next Week, else Current Week

function getWeekDates(offset = 0) {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    
    // Start of current week (Sunday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek + (offset * 7));
    startOfWeek.setHours(0, 0, 0, 0);
    
    // End of week (Saturday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return { startOfWeek, endOfWeek };
}

function formatDateRange(start, end) {
    const options = { day: 'numeric', month: 'long' };
    const startStr = start.toLocaleDateString('he-IL', options);
    const endStr = end.toLocaleDateString('he-IL', options);
    const year = end.getFullYear();
    return `${startStr} - ${endStr}, ${year}`;
}

function changeWeek(direction) {
    currentWeekOffset += direction;
    loadThisWeek();
}

function goToCurrentWeek() {
    currentWeekOffset = 0;
    loadThisWeek();
}

async function loadThisWeek() {
    const container = document.getElementById('thisweek-list');
    container.innerHTML = '<div class="spinner"></div>';
    
    // Update date range display
    const { startOfWeek, endOfWeek } = getWeekDates(currentWeekOffset);
    const dateRangeDisplay = document.getElementById('thisweek-date-range');
    if (dateRangeDisplay) {
        let weekLabel = '';
        if (currentWeekOffset === 0) {
            weekLabel = 'השבוע: ';
        } else if (currentWeekOffset === -1) {
            weekLabel = 'שבוע שעבר: ';
        } else if (currentWeekOffset === 1) {
            weekLabel = 'שבוע הבא: ';
        } else if (currentWeekOffset < 0) {
            weekLabel = `לפני ${Math.abs(currentWeekOffset)} שבועות: `;
        } else {
            weekLabel = `בעוד ${currentWeekOffset} שבועות: `;
        }
        dateRangeDisplay.innerHTML = `<strong>${weekLabel}</strong>${formatDateRange(startOfWeek, endOfWeek)}`;
    }
    
    try {
        // Populate creator filter if needed
        const creatorSelect = document.getElementById('filter-thisweek-creator');
        if (creatorSelect && creatorSelect.options.length <= 1) {
            const { data: creatorsData } = await supabaseClient
                .from('activities')
                .select('created_by');
                
            if (creatorsData) {
                const creators = [...new Set(creatorsData.map(i => i.created_by).filter(Boolean))].sort();
                creators.forEach(creator => {
                    const option = document.createElement('option');
                    option.value = creator;
                    option.textContent = creator;
                    creatorSelect.appendChild(option);
                });
                
                // Set default to current user if exists in list
                const currentUser = localStorage.getItem('crm_username');
                if (currentUser && creators.includes(currentUser)) {
                    creatorSelect.value = currentUser;
                }
            }
        }

        // Get filter values
        const creatorFilter = document.getElementById('filter-thisweek-creator')?.value || '';
        const typeFilter = document.getElementById('filter-thisweek-type')?.value || '';
        const statusFilter = document.getElementById('filter-thisweek-status')?.value || '';
        const searchFilter = document.getElementById('filter-thisweek-search')?.value.toLowerCase() || '';
        const sortFilter = document.getElementById('filter-thisweek-sort')?.value || 'upcoming';
        
        // Build query for activities in this week
        let query = supabaseClient
            .from('activities')
            .select(`
                *,
                deals (
                    deal_id,
                    deal_status,
                    final_amount,
                    customers (
                        customer_id,
                        business_name,
                        contact_name,
                        phone,
                        email
                    )
                ),
                customers (
                    customer_id,
                    business_name,
                    contact_name,
                    phone,
                    email
                )
            `)
            .neq('activity_type', 'הערה')
            .gte('activity_date', startOfWeek.toISOString())
            .lte('activity_date', endOfWeek.toISOString());
        
        // Apply creator filter
        if (creatorFilter) {
            query = query.eq('created_by', creatorFilter);
        }

        // Apply type filter
        if (typeFilter) {
            query = query.eq('activity_type', typeFilter);
        }
        
        // Apply status filter
        if (statusFilter === 'pending') {
            query = query.or('completed.is.null,completed.eq.false');
        } else if (statusFilter === 'completed') {
            query = query.eq('completed', true);
        }
        
        // Apply sorting
        if (sortFilter === 'activity-date' || sortFilter === 'upcoming') {
            query = query.order('activity_date', { ascending: true });
        } else if (sortFilter === 'customer') {
            query = query.order('activity_date', { ascending: true });
        } else if (sortFilter === 'type') {
            query = query.order('activity_type', { ascending: true });
        }
        
        const { data: activities, error } = await query;
        
        if (error) throw error;
        
        // Filter by search (client-side)
        let filteredActivities = activities || [];
        if (searchFilter) {
            filteredActivities = filteredActivities.filter(activity => {
                const customerName = activity.deals?.customers?.business_name || 
                                    activity.customers?.business_name || '';
                const description = activity.description || '';
                return customerName.toLowerCase().includes(searchFilter) ||
                       description.toLowerCase().includes(searchFilter);
            });
        }
        
        // Sort by customer if needed (client-side)
        if (sortFilter === 'customer') {
            filteredActivities.sort((a, b) => {
                const nameA = a.deals?.customers?.business_name || a.customers?.business_name || '';
                const nameB = b.deals?.customers?.business_name || b.customers?.business_name || '';
                return nameA.localeCompare(nameB, 'he');
            });
        }
        
        if (filteredActivities.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="padding: 3rem; color: var(--text-tertiary);">
                    <p style="font-size: 1.3rem;">📭 אין פעילויות מתוכננות השבוע</p>
                    <p>נסה לשנות את הסינון או הוסף פעילויות חדשות</p>
                </div>
            `;
            return;
        }
        
        // Group activities by day
        const groupedByDay = {};
        const dayNames = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];
        
        filteredActivities.forEach(activity => {
            const activityDate = new Date(activity.activity_date);
            const dateKey = activityDate.toISOString().split('T')[0];
            const dayName = dayNames[activityDate.getDay()];
            const formattedDate = activityDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });
            
            if (!groupedByDay[dateKey]) {
                groupedByDay[dateKey] = {
                    dayName,
                    formattedDate,
                    activities: []
                };
            }
            groupedByDay[dateKey].activities.push(activity);
        });
        
        // Build HTML
        let html = '';
        const sortedDays = Object.keys(groupedByDay).sort();
        const today = new Date().toISOString().split('T')[0];
        
        sortedDays.forEach(dateKey => {
            const dayData = groupedByDay[dateKey];
            const isToday = dateKey === today;
            
            html += `
                <div class="thisweek-day-section" style="margin-bottom: 2rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid ${isToday ? 'var(--primary-color)' : 'var(--border-color)'}; flex-wrap: wrap;">
                        <span style="font-size: 1.1rem; font-weight: 600; color: ${isToday ? 'var(--primary-color)' : 'var(--text-primary)'};">
                            ${dayData.dayName}
                        </span>
                        <span style="color: var(--text-secondary); font-size: 0.9rem;">${dayData.formattedDate}</span>
                        ${isToday ? '<span style="background: var(--primary-color); color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem;">היום</span>' : ''}
                        <span style="background: var(--bg-tertiary); padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; color: var(--text-secondary);">
                            ${dayData.activities.length} פעילויות
                        </span>
                    </div>
                    <div class="deals-grid" style="gap: 1rem;">
            `;
            
            dayData.activities.forEach(activity => {
                const customer = activity.deals?.customers || activity.customers;
                const customerName = customer?.business_name || 'ללא לקוח';
                const contactName = customer?.contact_name || '';
                const phone = customer?.phone || '';
                const dealId = activity.deal_id;
                const dealStatus = activity.deals?.deal_status || '';
                const dealAmount = activity.deals?.final_amount;
                
                const activityTime = new Date(activity.activity_date).toLocaleTimeString('he-IL', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                const typeIcons = {
                    'שיחה': '📞',
                    'פגישה': '📅',
                    'מייל': '📧',
                    'משימה': '✅'
                };
                const icon = typeIcons[activity.activity_type] || '📝';
                
                const isCompleted = activity.completed === true;
                const statusClass = isCompleted ? 'badge-won' : 'badge-pending';
                const statusText = isCompleted ? 'בוצע' : 'ממתין';
                
                html += `
                    <div class="deal-card" style="padding: 1rem; ${isCompleted ? 'opacity: 0.7;' : ''}">
                        <div class="deal-card-header" style="margin-bottom: 0.75rem; padding-bottom: 0.75rem;">
                            <div>
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                                    <span style="font-size: 1.2rem;">${icon}</span>
                                    <span class="deal-card-title" style="font-size: 1rem;">${activity.activity_type}</span>
                                    <span style="color: var(--text-tertiary); font-size: 0.85rem;">⏰ ${activityTime}</span>
                                </div>
                                <div class="deal-card-date" style="font-size: 0.9rem;">
                                    🏢 ${customerName}${contactName ? ` • ${contactName}` : ''}
                                </div>
                            </div>
                            <span class="badge ${statusClass}">${statusText}</span>
                        </div>
                        
                        ${activity.description ? `
                            <div style="margin-bottom: 0.75rem; padding: 0.5rem; background: var(--bg-tertiary); border-radius: 8px; font-size: 0.9rem;">
                                ${formatActivityText(activity.description)}
                            </div>
                        ` : ''}
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                            <div style="display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.8rem;">
                                ${phone ? `
                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                        <span style="color: var(--text-secondary);">📱</span>
                                        <span style="color: var(--text-primary);">${phone}</span>
                                        <a href="tel:${phone}" title="התקשר">
                                            <img src="images/call.png" alt="Call" style="width: 16px; height: 16px; vertical-align: middle;">
                                        </a>
                                        <a href="https://wa.me/${phone.replace(/\D/g, '').replace(/^0/, '972')}" target="_blank" title="שלח הודעה בווטסאפ">
                                            <img src="images/whatsapp.png" alt="WhatsApp" style="width: 20px; height: 20px; vertical-align: middle;">
                                        </a>
                                    </div>
                                ` : ''}
                                ${customer?.email ? `
                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                        <strong>📧</strong> 
                                        <a href="mailto:${customer.email}" style="color: var(--primary-color); direction: ltr; text-align: right; display: inline-block;">${customer.email}</a>
                                        <img src="images/copy.png" alt="Copy" style="cursor: pointer; width: 14px; height: 14px;" onclick="copyToClipboard('${customer.email}')" title="העתק אימייל">
                                    </div>
                                ` : ''}
                                ${dealId ? `<span style="color: var(--primary-color);">💼 עסקה${dealAmount ? ` • ₪${dealAmount.toFixed(0)}` : ''}</span>` : ''}
                            </div>
                            <div style="display: flex; gap: 0.5rem;">
                                ${!isCompleted ? `
                                    <button class="btn btn-success btn-icon" style="width: 32px; height: 32px;" 
                                            onclick="markActivityComplete('${activity.activity_id}')" title="סמן כבוצע">
                                        ✓
                                    </button>
                                ` : ''}
                                ${dealId ? `
                                    <button class="btn btn-primary btn-icon" style="width: 32px; height: 32px;" 
                                            onclick="openDealModal('${dealId}')" title="פתח עסקה">
                                        💼
                                    </button>
                                ` : ''}
                                    <button class="btn btn-info btn-icon" style="width: 32px; height: 32px;" 
                                            onclick="viewActivityDetails('${activity.activity_id}')" title="צפה בפרטים">
                                        👁️
                                    </button>
                                    <button class="btn btn-secondary btn-icon" style="width: 32px; height: 32px;" 
                                            onclick="editActivity('${activity.activity_id}')" title="ערוך">
                                        ✏️
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        // Add summary at top
        const totalActivities = filteredActivities.length;
        const pendingCount = filteredActivities.filter(a => !a.completed).length;
        const completedCount = filteredActivities.filter(a => a.completed === true).length;
        
        const summaryHtml = `
            <div style="display: flex; gap: 0.75rem; margin-bottom: 2rem; flex-wrap: nowrap; justify-content: center;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 0.75rem 1rem; border-radius: 12px; text-align: center; min-width: 90px; flex: 1; max-width: 140px;">
                    <div style="font-size: 1.5rem; font-weight: 700;">${totalActivities}</div>
                    <div style="font-size: 0.75rem; opacity: 0.9;">סה"כ פעילויות</div>
                </div>
                <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 0.75rem 1rem; border-radius: 12px; text-align: center; min-width: 90px; flex: 1; max-width: 140px;">
                    <div style="font-size: 1.5rem; font-weight: 700;">${pendingCount}</div>
                    <div style="font-size: 0.75rem; opacity: 0.9;">ממתינות</div>
                </div>
                <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 0.75rem 1rem; border-radius: 12px; text-align: center; min-width: 90px; flex: 1; max-width: 140px;">
                    <div style="font-size: 1.5rem; font-weight: 700;">${completedCount}</div>
                    <div style="font-size: 0.75rem; opacity: 0.9;">הושלמו</div>
                </div>
            </div>
        `;
        
        container.innerHTML = summaryHtml + html;
        
    } catch (error) {
        console.error('❌ Error loading this week activities:', error);
        container.innerHTML = `
            <div class="alert alert-error">שגיאה בטעינת פעילויות השבוע: ${error.message}</div>
        `;
    }
}

async function markActivityComplete(activityId) {
    try {
        const { data: updatedActivity, error } = await supabaseClient
            .from('activities')
            .update({ 
                completed: true,
                completed_at: new Date().toISOString()
            })
            .eq('activity_id', activityId)
            .select()
            .single();
        
        if (error) throw error;
        
        showAlert('✅ הפעילות סומנה כבוצעה!', 'success');
        loadThisWeek();
        
        // Automatically open new activity modal
        setTimeout(() => {
            openNewActivityModal(updatedActivity);
        }, 500);
        
    } catch (error) {
        console.error('❌ Error marking activity complete:', error);
        showAlert('שגיאה בעדכון הפעילות: ' + error.message, 'error');
    }
}

async function editActivity(activityId) {
    try {
        // Load activity from database
        const { data: activity, error } = await supabaseClient
            .from('activities')
            .select('*')
            .eq('activity_id', activityId)
            .single();
        
        if (error) throw error;
        
        if (!activity) {
            showAlert('הפעילות לא נמצאה', 'error');
            return;
        }
        
        // Open edit modal with the activity data
        showEditActivityModal(activity);
        
    } catch (error) {
        console.error('❌ Error loading activity for edit:', error);
        showAlert('שגיאה בטעינת הפעילות: ' + error.message, 'error');
    }
}

async function viewActivityDetails(activityId) {
    try {
        // Load activity details with relations
        const { data: activity, error } = await supabaseClient
            .from('activities')
            .select(`
                *,
                deals (
                    deal_id,
                    customers (
                        customer_id,
                        business_name,
                        contact_name,
                        phone,
                        email,
                        primary_contact_id
                    )
                ),
                customers (
                    customer_id,
                    business_name,
                    contact_name,
                    phone,
                    email,
                    primary_contact_id
                )
            `)
            .eq('activity_id', activityId)
            .single();
            
        if (error) throw error;
        
        if (!activity) {
            showAlert('הפעילות לא נמצאה', 'error');
            return;
        }

        // Manually fetch linked contact if exists (to avoid 400 error on join)
        let linkedContact = null;
        if (activity.contact_id) {
            const { data: contactData } = await supabaseClient
                .from('contacts')
                .select('contact_id, contact_name, phone, email, role')
                .eq('contact_id', activity.contact_id)
                .single();
            linkedContact = contactData;
        }
        
        let modal = document.getElementById('view-activity-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'view-activity-modal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        
        const typeIcons = {
            'שיחה': '📞',
            'פגישה': '📅',
            'מייל': '📧',
            'משימה': '✅',
            'הערה': '📝'
        };
        const icon = typeIcons[activity.activity_type] || '📝';
        
        // Resolve customer/contact info
        let customerHtml = '-';
        let contactHtml = '-';
        
        const customer = activity.deals?.customers || activity.customers;
        
        if (customer) {
            // Customer Link
            customerHtml = `<span style="color: var(--primary-color); cursor: pointer; font-weight: 500; text-decoration: underline;" onclick="window.returnToActivityId = '${activity.activity_id}'; closeViewActivityModal(); viewCustomerDetails('${customer.customer_id}')">${customer.business_name}</span>`;
            
            // Contact Link
            if (linkedContact) {
                // Use specific linked contact
                 contactHtml = `<span style="color: var(--primary-color); cursor: pointer; font-weight: 500; text-decoration: underline;" onclick="window.returnToActivityId = '${activity.activity_id}'; closeViewActivityModal(); viewContactDetails('${linkedContact.contact_id}')">${linkedContact.contact_name} ${linkedContact.role ? `(${linkedContact.role})` : ''}</span>`;
            } else if (customer.primary_contact_id) {
                // Fallback to primary
                contactHtml = `<span style="color: var(--text-tertiary); cursor: pointer; text-decoration: underline;" title="איש קשר ראשי (לא שויך ספציפית)" onclick="window.returnToActivityId = '${activity.activity_id}'; closeViewActivityModal(); viewContactDetails('${customer.primary_contact_id}')">${customer.contact_name || '-'} (ראשי)</span>`;
            } else {
                contactHtml = customer.contact_name || '-';
            }
        }
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <div style="display: flex; align-items: center; gap: 10px;">
                         <h2>${icon} פרטי פעילות</h2>
                         <button class="btn btn-sm btn-secondary" onclick="closeViewActivityModal(); editActivity('${activity.activity_id}')" title="ערוך פרטים">✏️</button>
                    </div>
                    <button class="modal-close" onclick="closeViewActivityModal()">✕</button>
                </div>
                
                <div class="form-grid">
                    <div class="deal-card-info">
                        <span class="deal-card-label">סוג:</span>
                        <span class="deal-card-value">${activity.activity_type}</span>
                    </div>
                    <div class="deal-card-info">
                        <span class="deal-card-label">תאריך:</span>
                        <span class="deal-card-value">${activity.activity_date ? new Date(activity.activity_date).toLocaleString('he-IL') : '-'}</span>
                    </div>
                    <div class="deal-card-info">
                        <span class="deal-card-label">סטטוס:</span>
                        <span class="deal-card-value">
                            ${activity.completed ? '<span class="badge badge-won">בוצע</span>' : '<span class="badge badge-pending">ממתין</span>'}
                        </span>
                    </div>
                    <div class="deal-card-info">
                        <span class="deal-card-label">נוצר ע"י:</span>
                        <span class="deal-card-value">${activity.created_by || 'מערכת'}</span>
                    </div>
                    
                    <div class="deal-card-info">
                        <span class="deal-card-label">לקוח:</span>
                        <span class="deal-card-value">${customerHtml}</span>
                    </div>
                    <div class="deal-card-info">
                        <span class="deal-card-label">איש קשר:</span>
                        <span class="deal-card-value">${contactHtml}</span>
                    </div>
                    <div class="deal-card-info">
                        <span class="deal-card-label">טלפון:</span>
                        <span class="deal-card-value">
                            ${customer?.phone ? `
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span style="color: var(--text-primary);">${customer.phone}</span>
                                    <a href="tel:${customer.phone}" title="התקשר">
                                        <img src="images/call.png" alt="Call" style="width: 16px; height: 16px; vertical-align: middle;">
                                    </a>
                                    <a href="https://wa.me/${customer.phone.replace(/\D/g, '').replace(/^0/, '972')}" target="_blank" title="שלח הודעה בווטסאפ">
                                        <img src="images/whatsapp.png" alt="WhatsApp" style="width: 20px; height: 20px; vertical-align: middle;">
                                    </a>
                                </div>
                            ` : '-'}
                        </span>
                    </div>
                </div>
                
                <div style="margin-top: 1rem; padding: 1rem; background: var(--bg-tertiary); border-radius: 8px;">
                    <label style="font-weight: 600; display: block; margin-bottom: 0.5rem; color: var(--text-secondary);">תיאור הפעילות:</label>
                    <div style="white-space: pre-wrap;">${formatActivityText(activity.description || '-')}</div>
                </div>
                
                <div style="margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                    <h3 style="font-size: 1rem; margin-bottom: 0.5rem; color: var(--text-primary);">📝 הערות</h3>
                    <div id="view-activity-notes-list" style="margin-bottom: 1rem; max-height: 200px; overflow-y: auto; background: var(--bg-secondary); padding: 0.5rem; border-radius: 6px; border: 1px solid var(--border-color);">
                        <div class="spinner"></div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <textarea id="view-activity-new-note" class="form-textarea" placeholder="הוסף הערה חדשה..." rows="3"></textarea>
                        <div style="display: flex; justify-content: flex-end;">
                            <button type="button" class="btn btn-primary" onclick="addActivityNoteFromView('${activityId}')">💾 הוסף</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
        
        // Load notes
        loadActivityNotes(activityId, 'view-activity-notes-list');

        // Setup Autocomplete for new note
        setupMentionAutocomplete('view-activity-new-note');
        
    } catch (error) {
        console.error('❌ Error viewing activity details:', error);
        showAlert('שגיאה בטעינת פרטי הפעילות', 'error');
    }
}

function closeViewActivityModal() {
    const modal = document.getElementById('view-activity-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Activities view mode: 'cards' or 'table'
let activitiesViewMode = localStorage.getItem('activitiesViewMode') || 'cards';

function setActivitiesView(mode) {
    activitiesViewMode = mode;
    localStorage.setItem('activitiesViewMode', mode);
    
    // Update button styles
    const cardsBtn = document.getElementById('activities-view-cards');
    const tableBtn = document.getElementById('activities-view-table');
    
    if (cardsBtn && tableBtn) {
        if (mode === 'cards') {
            cardsBtn.style.background = 'var(--primary-color)';
            cardsBtn.style.color = 'white';
            tableBtn.style.background = '';
            tableBtn.style.color = '';
        } else {
            tableBtn.style.background = 'var(--primary-color)';
            tableBtn.style.color = 'white';
            cardsBtn.style.background = '';
            cardsBtn.style.color = '';
        }
    }
    
    loadActivities(true);
}

function copyToClipboard(text) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        showAlert('האימייל הועתק ללוח', 'success');
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

async function loadActivities(preservePage = false) {
    const container = document.getElementById('activities-list');
    container.innerHTML = '<div class="spinner"></div>';
    
    try {
        // Get filter values
        const typeFilter = document.getElementById('filter-activity-type')?.value || '';
        const statusFilter = document.getElementById('filter-activity-status')?.value || '';
        const searchFilter = document.getElementById('filter-activity-search')?.value.toLowerCase() || '';
        const creatorFilter = document.getElementById('filter-activity-creator')?.value || '';
        const sortFilter = document.getElementById('filter-activity-sort')?.value || 'upcoming';
        
        // Build query - exclude "הערה" type
        let query = supabaseClient
            .from('activities')
            .select(`
                *,
                deals (
                    deal_id,
                    deal_status,
                    customers (
                        business_name,
                        contact_name,
                        phone,
                        email
                    )
                ),
                customers (
                    customer_id,
                    business_name,
                    contact_name,
                    phone,
                    email
                )
            `)
            .neq('activity_type', 'הערה');
        
        // Apply type filter
        if (typeFilter) {
            query = query.eq('activity_type', typeFilter);
        }
        
        // Apply status filter
        if (statusFilter === 'completed') {
            query = query.eq('completed', true);
        } else if (statusFilter === 'pending') {
            query = query.eq('completed', false);
        }
        
        // Apply creator filter
        if (creatorFilter) {
            query = query.eq('created_by', creatorFilter);
        }
        
        // Execute query
        const { data: activities, error } = await query;
        
        if (error) throw error;
        
        // Populate creator dropdown with unique creators
        const creatorSelect = document.getElementById('filter-activity-creator');
        if (creatorSelect && activities) {
            const currentValue = creatorSelect.value;
            const creators = [...new Set(activities.map(a => a.created_by).filter(Boolean))].sort();
            creatorSelect.innerHTML = '<option value="">הכל</option>';
            creators.forEach(creator => {
                const option = document.createElement('option');
                option.value = creator;
                option.textContent = creator;
                if (creator === currentValue) option.selected = true;
                creatorSelect.appendChild(option);
            });
        }
        
        // Filter by search text (client-side)
        let filteredActivities = activities || [];
        if (searchFilter) {
            filteredActivities = filteredActivities.filter(activity =>
                activity.description?.toLowerCase().includes(searchFilter) ||
                activity.deals?.customers?.business_name?.toLowerCase().includes(searchFilter)
            );
        }
        
        // Sort activities
        filteredActivities.sort((a, b) => {
            switch (sortFilter) {
                case 'newest':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'oldest':
                    return new Date(a.created_at) - new Date(b.created_at);
                case 'activity-date':
                    const dateA = a.activity_date ? new Date(a.activity_date) : new Date(0);
                    const dateB = b.activity_date ? new Date(b.activity_date) : new Date(0);
                    return dateB - dateA;
                case 'upcoming':
                    const upDateA = a.activity_date ? new Date(a.activity_date) : new Date(0);
                    const upDateB = b.activity_date ? new Date(b.activity_date) : new Date(0);
                    return upDateA - upDateB;
                default:
                    return 0;
            }
        });
        
        if (!preservePage) {
            paginationState.activities.page = 1;
        }

        // Display activities
        if (filteredActivities.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="padding: 3rem; color: var(--text-tertiary);">
                    <p style="font-size: 1.2rem;">📋 לא נמצאו פעילויות</p>
                    <p>נסה לשנות את הפילטרים</p>
                </div>
            `;
            return;
        }
        
        const typeIcons = {
            'שיחה': '📞',
            'פגישה': '📅',
            'מייל': '📧',
            'משימה': '✅'
        };
        
        // Update view buttons styling - Sync with viewState
        const cardsBtn = document.getElementById('activities-view-cards');
        const tableBtn = document.getElementById('activities-view-table');
        if (cardsBtn && tableBtn) {
            if (viewState.activities === 'cards') {
                cardsBtn.style.background = 'var(--text-primary)';
                cardsBtn.style.color = 'var(--bg-primary)';
                tableBtn.style.background = 'transparent';
                tableBtn.style.color = 'var(--text-primary)';
            } else {
                tableBtn.style.background = 'var(--text-primary)';
                tableBtn.style.color = 'var(--bg-primary)';
                cardsBtn.style.background = 'transparent';
                cardsBtn.style.color = 'var(--text-primary)';
            }
        }
        
        container.innerHTML = '';

        const page = paginationState.activities.page;
        const limit = paginationState.activities.limit || 10;
        const start = (page - 1) * limit;
        const pagedActivities = filteredActivities.slice(start, start + limit);
        
        // Render based on view mode
        if (viewState.activities === 'table') {
            // Table view
            const table = document.createElement('div');
            table.style.overflowX = 'auto';
            table.innerHTML = `
                <table class="items-table" style="min-width: 800px;">
                    <thead>
                        <tr>
                            <th style="width: 80px;">סוג</th>
                            <th style="width: 80px;">סטטוס</th>
                            <th>תיאור</th>
                            <th style="width: 120px;">לקוח</th>
                            <th style="width: 140px;">תאריך פעילות</th>
                            <th style="width: 100px;">נוצר ע"י</th>
                            <th style="width: 120px;">פעולות</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pagedActivities.map(activity => {
                            const icon = typeIcons[activity.activity_type] || '📝';
                            const activityDate = activity.activity_date 
                                ? new Date(activity.activity_date).toLocaleDateString('he-IL')
                                : '-';
                            
                            let businessName = 'לא משויך';
                            let customerId = null;
                            
                            if (activity.deals?.customers) {
                                businessName = activity.deals.customers.business_name || 'לא משויך';
                                customerId = activity.deals.customers.customer_id;
                            } else if (activity.customers) {
                                businessName = activity.customers.business_name || 'לא משויך';
                                customerId = activity.customers.customer_id;
                            }
                            
                            const rowStyle = activity.completed ? 'opacity: 0.6; background: #f0fdf4;' : '';
                            const textStyle = activity.completed ? 'text-decoration: line-through;' : '';
                            
                            return `
                                <tr style="${rowStyle}">
                                    <td>${icon} ${activity.activity_type}</td>
                                    <td>
                                        ${activity.completed 
                                            ? '<span class="badge badge-won" style="font-size: 0.7rem;">בוצע</span>'
                                            : '<span class="badge badge-pending" style="font-size: 0.7rem;">ממתין</span>'}
                                    </td>
                                    <td style="${textStyle}">${formatActivityText(activity.description || '-')}</td>
                                    <td>
                                        ${customerId 
                                            ? `<a href="javascript:void(0)" onclick="viewCustomerDetails('${customerId}')" style="font-weight: 500;">${businessName}</a>`
                                            : businessName
                                        }
                                    </td>
                                    <td style="color: var(--primary-color);">${activityDate}</td>
                                    <td>${activity.created_by || 'מערכת'}</td>
                                    <td>
                                        <div style="display: flex; gap: 0.25rem; align-items: center; justify-content: flex-start; flex-wrap: nowrap;">
                                            ${activity.deals ? `<button class="btn btn-sm btn-primary" style="padding: 0.3rem 0.5rem; font-size: 0.8rem;" onclick="viewDealDetails('${activity.deal_id}')" title="צפה בעסקה">💼</button>` : ''}
                                            <button class="btn btn-sm btn-info" style="padding: 0.3rem 0.5rem; font-size: 0.8rem;" onclick="viewActivityDetails('${activity.activity_id}')" title="צפה בפרטים">👁️</button>
                                            <button class="btn btn-sm btn-secondary" style="padding: 0.3rem 0.5rem; font-size: 0.8rem;" onclick="editActivity('${activity.activity_id}')" title="ערוך">✏️</button>
                                            <button class="btn btn-sm ${activity.completed ? 'btn-secondary' : 'btn-success'}" 
                                                    style="padding: 0.3rem 0.5rem; font-size: 0.8rem;"
                                                    onclick="toggleActivityCompletion('${activity.activity_id}', ${!activity.completed})" title="${activity.completed ? 'סמן כלא בוצע' : 'סמן כבוצע'}">
                                                ${activity.completed ? '↩️' : '✓'}
                                            </button>
                                            <button class="btn btn-sm btn-danger" style="padding: 0.3rem 0.5rem; font-size: 0.8rem;" onclick="deleteActivity('${activity.activity_id}')" title="מחק">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
            container.appendChild(table);
        } else {
            // Cards view
            const activitiesGrid = document.createElement('div');
            activitiesGrid.className = 'deals-grid';
            
            pagedActivities.forEach(activity => {
                const card = document.createElement('div');
                card.className = 'deal-card';
                
                // Add completed styling
                if (activity.completed) {
                    card.style.opacity = '0.7';
                    card.style.background = 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';
                }
                
                const icon = typeIcons[activity.activity_type] || '📝';
                const createdDate = new Date(activity.created_at).toLocaleString('he-IL', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                const activityDate = activity.activity_date 
                    ? new Date(activity.activity_date).toLocaleString('he-IL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : null;
                
                // Get customer info
                let businessName = 'לא משויך';
                let contactName = '';
                let phone = '';
                let email = '';
                
                if (activity.deals?.customers) {
                    businessName = activity.deals.customers.business_name || 'לא משויך';
                    contactName = activity.deals.customers.contact_name || '';
                    phone = activity.deals.customers.phone || '';
                    email = activity.deals.customers.email || '';
                } else if (activity.customers) {
                    businessName = activity.customers.business_name || 'לא משויך';
                    contactName = activity.customers.contact_name || '';
                    phone = activity.customers.phone || '';
                    email = activity.customers.email || '';
                }
                
                // Format phone for WhatsApp (remove dashes, ensure +972)
                let whatsappLink = '';
                if (phone) {
                    let cleanPhone = phone.replace(/\D/g, '');
                    if (cleanPhone.startsWith('0')) cleanPhone = '972' + cleanPhone.substring(1);
                    whatsappLink = `https://wa.me/${cleanPhone}`;
                }
                
                card.innerHTML = `
                    <div class="deal-card-header" style="padding: 0.5rem 0.75rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1;">
                            <span style="font-size: 1rem;">${icon}</span>
                            <span style="font-weight: 600; font-size: 0.9rem;">${activity.activity_type}</span>
                            ${activity.completed 
                                ? `<span class="badge badge-won" style="font-size: 0.65rem; padding: 2px 6px;">בוצע</span>`
                                : `<span class="badge badge-pending" style="font-size: 0.65rem; padding: 2px 6px;">ממתין</span>`}
                        </div>
                        <div style="display: flex; gap: 0.25rem;">
                            ${activity.deals ? `<button class="btn btn-sm btn-primary" style="padding: 0.2rem 0.4rem; font-size: 0.7rem;" onclick="viewDealDetails('${activity.deal_id}')" title="צפה בעסקה">💼</button>` : ''}
                            <button class="btn btn-sm btn-info" style="padding: 0.2rem 0.4rem; font-size: 0.7rem;" onclick="viewActivityDetails('${activity.activity_id}')" title="צפה בפרטים">👁️</button>
                            <button class="btn btn-sm btn-secondary" style="padding: 0.2rem 0.4rem; font-size: 0.7rem;" onclick="editActivity('${activity.activity_id}')" title="ערוך">✏️</button>
                            <button class="btn btn-sm ${activity.completed ? 'btn-secondary' : 'btn-success'}" 
                                    style="padding: 0.2rem 0.4rem; font-size: 0.7rem;"
                                    onclick="toggleActivityCompletion('${activity.activity_id}', ${!activity.completed})" title="${activity.completed ? 'סמן כלא בוצע' : 'סמן כבוצע'}">
                                ${activity.completed ? '↩️' : '✓'}
                            </button>
                            <button class="btn btn-sm btn-danger" style="padding: 0.2rem 0.4rem; font-size: 0.7rem;" onclick="deleteActivity('${activity.activity_id}')" title="מחק">🗑️</button>
                        </div>
                    </div>
                    <div class="deal-card-body" style="padding: 0.5rem 0.75rem; font-size: 0.85rem;">
                        <div style="margin-bottom: 0.4rem; ${activity.completed ? 'text-decoration: line-through; opacity: 0.7;' : ''}">
                            <strong>תיאור:</strong> ${formatActivityText(activity.description || '-')}
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.25rem 1rem; font-size: 0.8rem; color: var(--text-secondary);">
                            ${activityDate ? `<div><strong>תאריך:</strong> <span style="color: var(--primary-color);">${activityDate}</span></div>` : ''}
                            <div><strong>לקוח:</strong> ${businessName}</div>
                            ${contactName ? `<div><strong>איש קשר:</strong> ${contactName}</div>` : ''}
                            ${email ? `
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <strong>מייל:</strong> 
                                    <a href="mailto:${email}" style="color: var(--primary-color); direction: ltr; text-align: right; display: inline-block;">${email}</a>
                                    <img src="images/copy.png" alt="Copy" style="cursor: pointer; width: 14px; height: 14px;" onclick="copyToClipboard('${email}')" title="העתק אימייל">
                                </div>
                            ` : ''}
                            ${phone ? `
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <strong>טלפון:</strong> 
                                    <a href="tel:${phone}" style="color: var(--text-primary); text-decoration: none;">${phone}</a>
                                    ${whatsappLink ? `<a href="${whatsappLink}" target="_blank" title="שלח הודעה בווטסאפ"><img src="images/whatsapp.png" alt="WhatsApp" style="width: 20px; height: 20px; vertical-align: middle;"></a>` : ''}
                                </div>
                            ` : ''}
                            <div><strong>נוצר:</strong> ${activity.created_by || 'מערכת'}</div>
                            ${activity.completed && activity.completed_at ? `<div><strong>בוצע:</strong> <span style="color: var(--success-color);">${new Date(activity.completed_at).toLocaleDateString('he-IL')}</span></div>` : ''}
                        </div>
                        <div style="font-size: 0.7rem; color: var(--text-tertiary); margin-top: 0.3rem;">נוצר: ${createdDate}</div>
                    </div>
                `;
                
                activitiesGrid.appendChild(card);
            });
            
            container.appendChild(activitiesGrid);
        }

        container.innerHTML += renderPagination(filteredActivities.length, page, 'activities');
        
    } catch (error) {
        console.error('❌ Error loading activities:', error);
        container.innerHTML = `
            <div class="alert alert-error">
                שגיאה בטעינת פעילויות: ${error.message}
            </div>
        `;
    }
}

// Toggle activity completion status
// Toggle activity completion status
async function toggleActivityCompletion(activityId, completed) {
    try {
        const updateData = {
            completed: completed
        };
        
        // If marking as completed, set the timestamp
        if (completed) {
            updateData.completed_at = new Date().toISOString();
        } else {
            updateData.completed_at = null;
        }
        
        const { data: updatedActivity, error } = await supabaseClient
            .from('activities')
            .update(updateData)
            .eq('activity_id', activityId)
            .select()
            .single();
        
        if (error) throw error;
        
        showAlert(completed ? '✅ הפעילות סומנה כבוצעה' : '↩️ הפעילות סומנה כממתינה', 'success');
        
        // Reload activities
        loadActivities();

        // Check for follow-up if completed
        if (completed && updatedActivity) {
            setTimeout(() => {
                openNewActivityModal(updatedActivity);
            }, 500);
        }
        
    } catch (error) {
        console.error('❌ Error toggling activity completion:', error);
        showAlert('שגיאה בעדכון סטטוס הפעילות: ' + error.message, 'error');
    }
}

// ============================================
// PDF Quote Generation
// ============================================

async function generateQuotePDF(specificDealId = null) {
    const dealId = specificDealId || document.getElementById('deal-modal').dataset.currentDealId;
    
    if (!dealId) {
        showAlert('לא נמצאה עסקה פעילה', 'error');
        return;
    }
    
    try {
        showAlert('מייצר הצעת מחיר...', 'info');
        
        // Fetch full deal data
        const { data: deal, error: dealError } = await supabaseClient
            .from('deals')
            .select(`
                *,
                customers (
                    business_name,
                    contact_name,
                    phone,
                    email,
                    city
                )
            `)
            .eq('deal_id', dealId)
            .single();
        
        if (dealError) throw dealError;
        
        // Fetch deal items
        const { data: items, error: itemsError } = await supabaseClient
            .from('deal_items')
            .select(`
                *,
                products (
                    product_name,
                    category
                )
            `)
            .eq('deal_id', dealId);
        
        if (itemsError) throw itemsError;
        
        // Create a hidden container for the quote
        const quoteContainer = document.createElement('div');
        quoteContainer.style.position = 'absolute';
        quoteContainer.style.left = '-9999px';
        quoteContainer.style.width = '900px';
        quoteContainer.style.background = 'white';
        quoteContainer.style.padding = '3rem';
        quoteContainer.style.fontFamily = "'Heebo', sans-serif";
        quoteContainer.style.direction = 'rtl';
        
        const quoteDate = new Date().toLocaleDateString('he-IL');
        const quoteNumber = `Q-${new Date().getFullYear()}-${deal.deal_id.substring(0, 6)}`;
        
        // Get payment terms for this deal
        const paymentTerms = deal.payment_terms || 'שוטף + 120';
        
        // Build the quote HTML with page-break-inside:// This tool call is just for inspection, I will not replace yet.
// I will split this into two steps: View, then Replace.
// But I need to proceed efficiently.
// I'll read the function `renderGlobalSearchResults` first.s
        quoteContainer.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&display=swap');
                
                /* Prevent page breaks inside sections */
                .quote-section {
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
                
                /* Keep table rows together */
                .quote-table tr {
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
                
                /* Keep summary section together */
                .quote-summary {
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
                
                /* Keep terms together */
                .quote-terms {
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
                
                /* Keep footer together */
                .quote-footer {
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
                
                @media print {
                    .quote-section, .quote-summary, .quote-terms, .quote-footer {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                }
            </style>
            
            <!-- Header -->
            <div class="quote-section" style="display: flex; justify-content: space-between; align-items: start; border-bottom: 3px solid #2563eb; padding-bottom: 2rem; margin-bottom: 2rem;">
                <div>
                    <img src="images/logo.png" alt="אנפי ייבוא ושיווק" style="height: 80px; margin-bottom: 1rem;">
                    <p style="color: #64748b; margin: 0.25rem 0;">📍 תל אביב</p>
                    <p style="color: #64748b; margin: 0.25rem 0;">📞 טלפון: 050-6946650</p>
                    <p style="color: #64748b; margin: 0.25rem 0;">✉️ אימייל: anfi@bezeqint.net</p>
                </div>
                
                <div style="text-align: left; direction: ltr;">
                    <h2 style="color: #2563eb; font-size: 1.5rem; margin-bottom: 0.5rem; font-weight: 600;">הצעת מחיר</h2>
                    <p style="color: #64748b; margin: 0.25rem 0;"><strong>תאריך:</strong> ${quoteDate}</p>
                    <p style="color: #64748b; margin: 0.25rem 0;"><strong>תוקף:</strong> 30 יום</p>
                </div>
            </div>
            
            <!-- Customer Information -->
            <div class="quote-section" style="background: #f8fafc; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem;">
                <h3 style="color: #1e293b; margin-bottom: 1rem; font-size: 1.2rem; font-weight: 600;">פרטי לקוח</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                    <p style="color: #475569; margin: 0.25rem 0;"><strong style="color: #1e293b;">שם העסק:</strong> ${deal.customers.business_name}</p>
                    <p style="color: #475569; margin: 0.25rem 0;"><strong style="color: #1e293b;">איש קשר:</strong> ${deal.customers.contact_name || '-'}</p>
                    <p style="color: #475569; margin: 0.25rem 0;"><strong style="color: #1e293b;">טלפון:</strong> ${deal.customers.phone || '-'}</p>
                    <p style="color: #475569; margin: 0.25rem 0;"><strong style="color: #1e293b;">כתובת:</strong> ${deal.customers.city || '-'}</p>
                </div>
            </div>
            
            <!-- Items Table -->
            <div class="quote-section">
                <table class="quote-table" style="width: 100%; border-collapse: collapse; margin-bottom: 2rem;">
                    <thead>
                        <tr style="background: #2563eb; color: white;">
                            <th style="padding: 1rem; text-align: right; font-weight: 600;">#</th>
                            <th style="padding: 1rem; text-align: right; font-weight: 600;">תיאור המוצר</th>
                            <th style="padding: 1rem; text-align: right; font-weight: 600;">כמות</th>
                            <th style="padding: 1rem; text-align: right; font-weight: 600;">מחיר יחידה</th>
                            <th style="padding: 1rem; text-align: right; font-weight: 600;">צבע</th>
                            <th style="padding: 1rem; text-align: right; font-weight: 600;">מידה</th>
                            <th style="padding: 1rem; text-align: right; font-weight: 600;">סה"כ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map((item, index) => `
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 1rem;">${index + 1}</td>
                                <td style="padding: 1rem;"><strong>${item.products.product_name}</strong></td>
                                <td style="padding: 1rem;">${item.quantity}</td>
                                <td style="padding: 1rem;">₪${item.unit_price.toFixed(2)}</td>
                                <td style="padding: 1rem;">${item.color || '-'}</td>
                                <td style="padding: 1rem;">${item.size || '-'}</td>
                                <td style="padding: 1rem;">₪${item.total_price.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <!-- Summary -->
            <div class="quote-summary" style="margin-right: auto; width: 300px;">
                <div style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid #e2e8f0;">
                    <span>סכום ביניים:</span>
                    <span>₪${(deal.total_amount || 0).toFixed(2)}</span>
                </div>
                ${deal.discount_percentage > 0 ? `
                <div style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid #e2e8f0; color: #16a34a;">
                    <span>הנחה (${deal.discount_percentage}%):</span>
                    <span>-₪${(deal.discount_amount || 0).toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid #e2e8f0;">
                    <span>סה"כ לאחר הנחה:</span>
                    <span>₪${(deal.final_amount || 0).toFixed(2)}</span>
                </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid #e2e8f0;">
                    <span>מע"מ (18%):</span>
                    <span>₪${((deal.final_amount || 0) * 0.18).toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-top: 2px solid #2563eb; border-bottom: 2px solid #2563eb; font-size: 1.25rem; font-weight: 700; color: #2563eb; margin-top: 0.5rem;">
                    <span>סה"כ לתשלום:</span>
                    <span>₪${((deal.final_amount || 0) * 1.18).toFixed(2)}</span>
                </div>
            </div>
            
            <!-- Terms and Conditions -->
            <div class="quote-terms" style="margin-top: 3rem; padding-top: 2rem; border-top: 2px solid #e2e8f0;">
                <h3 style="color: #1e293b; margin-bottom: 1rem; font-weight: 600;">תנאים והערות</h3>
                <ul style="list-style-position: inside; color: #475569; line-height: 1.8;">
                    <li>המחירים אינם כוללים מע"מ</li>
                    <li>תוקף ההצעה: 30 יום מתאריך ההנפקה</li>
                    <li>תנאי תשלום: ${paymentTerms}</li>
                    <li>משלוח: עד 7 ימי עסקים</li>
                    ${items.some(item => (item.products.category && item.products.category.includes('מברשות')) || item.products.product_name.includes('מברשת')) ? '<li>עבור מברשות המחיר הינו למטר אחד</li>' : ''}
                </ul>
            </div>
            
            <!-- Footer -->
            <div class="quote-footer" style="margin-top: 3rem; text-align: center; color: #94a3b8; font-size: 0.9rem;">
                <p>תודה על פנייתך! נשמח לעמוד לשירותך בכל שאלה.</p>
            </div>
        `;
        
        document.body.appendChild(quoteContainer);
        
        // Generate PDF using html2canvas and jsPDF
        const canvas = await html2canvas(quoteContainer, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        
        // Save the PDF
        const now = new Date();
        const d = String(now.getDate()).padStart(2, '0');
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const y = now.getFullYear();
        const cleanDate = `${d}${m}${y}`;
        
        const fileName = `הצעת מחיר עבור ${deal.customers.business_name} ${cleanDate}.pdf`;
        
        // Open PDF in new window
        const blob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        const newWindow = window.open(blobUrl, '_blank');
        
        if (!newWindow) {
            // Fallback if popup blocked
            pdf.save(fileName);
            showAlert('החלון החוסם מנע את פתיחת ה-PDF. הקובץ הורד למחשב.', 'warning');
        } else {
             // Optional: Revoke URL after some time to free memory, but might be too early if user hasn't loaded it?
             // Usually browsers handle it fine or we keep it until unload.
             setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        }
        
        // Clean up
        document.body.removeChild(quoteContainer);
        
        showAlert('✅ הצעת המחיר יוצאה בהצלחה!', 'success');
        
    } catch (error) {
        console.error('❌ Error generating PDF:', error);
        showAlert('שגיאה ביצירת הצעת מחיר: ' + error.message, 'error');
    }
}

async function sendDealWhatsApp(specificDealId = null, btnElement = null) {
    const dealId = specificDealId || document.getElementById('deal-modal').dataset.currentDealId;
    if (!dealId) {
        showAlert('לא נמצאה עסקה פעילה', 'error');
        return;
    }

    try {
        // Fetch deal and items
        const { data: deal, error: dealError } = await supabaseClient
            .from('deals')
            .select(`*, customers(business_name, contact_name, phone)`)
            .eq('deal_id', dealId)
            .single();

        if (dealError) throw dealError;

        // Encode and Open
        const phone = deal.customers.phone ? deal.customers.phone.replace(/\D/g, '').replace(/^0/, '972') : '';
        
        if (!phone) {
            if (btnElement) {
                const originalContent = btnElement.innerHTML;
                const originalWidth = btnElement.style.width;
                const originalColor = btnElement.style.color;
                const originalBg = btnElement.style.backgroundColor;
                const originalBorder = btnElement.style.borderColor;
                
                btnElement.innerHTML = 'חסר טלפון';
                btnElement.style.width = 'auto';
                btnElement.style.minWidth = '80px';
                btnElement.style.fontSize = '0.8rem';
                btnElement.style.background = '#ef4444';
                btnElement.style.color = '#ffffff';
                btnElement.style.borderColor = '#ef4444';
                btnElement.style.fontWeight = 'bold';
                
                setTimeout(() => {
                    btnElement.innerHTML = originalContent;
                    btnElement.style.width = originalWidth;
                    btnElement.style.minWidth = '';
                    btnElement.style.fontSize = '';
                    btnElement.style.backgroundColor = originalBg;
                    btnElement.style.borderColor = originalBorder;
                    btnElement.style.color = originalColor;
                    btnElement.style.fontWeight = '';
                }, 3000);
            } else {
                showAlert('לא קיים מספר טלפון לאיש הקשר', 'warning');
            }
            return;
        }

        const url = `https://wa.me/${phone}`;
        window.open(url, '_blank');

    } catch (err) {
        console.error('Error sending WhatsApp:', err);
        showAlert('שגיאה בשליחת הודעה', 'error');
    }
}

// ============================================
// Utility Functions
// ============================================

function resetForm() {
    document.getElementById('customer-select').value = '';
    const searchInput = document.getElementById('customer-search-input');
    if (searchInput) searchInput.value = '';
    document.getElementById('deal-status').value = 'זכייה';
    document.getElementById('deal-notes').value = '';
    document.getElementById('discount-percentage').value = '0';
    
    dealItems = [];
    addDealItem(); // Add one default item
    // renderDealItems(); // Handled by addDealItem
    // updateEmptyState(); // Handled by addDealItem
    // calculateTotal(); // Handled by addDealItem -> renderDealItems
    
    // Clear edit mode
    delete document.getElementById('deals-tab').dataset.editDealId;
}

function showAlert(message, type = 'info') {
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.whiteSpace = 'pre-line';
    
    toastContainer.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        alertDiv.style.transform = 'translateY(-20px)';
        alertDiv.style.transition = 'all 0.3s ease-out';
        setTimeout(() => alertDiv.remove(), 300);
    }, 5000);
}

// ============================================
// Export for debugging
// ============================================

window.CRM = {
    products,
    customers,
    dealItems,
    supabaseClient,
    loadProducts,
    loadCustomers,
    saveDeal,
    resetForm
};

// ============================================
// Audit Log Functions
// ============================================

async function logAction(actionType, entityType, entityId, entityName, description, oldValue = null, newValue = null) {
    try {
        const performedBy = localStorage.getItem('crm_username') || 'משתמש מערכת';
        
        await supabaseClient
            .from('audit_log')
            .insert({
                action_type: actionType,
                entity_type: entityType,
                entity_id: entityId,
                entity_name: entityName,
                description: description,
                old_value: oldValue,
                new_value: newValue,
                performed_by: performedBy
            });
            
    } catch (error) {
        console.error('❌ Error logging action:', error);
        // Don't throw - logging should not break the main operation
    }
}

// Import Functionality
// Import Functionality
async function handleImportFile(event, type) {
    console.log('📂 Import started for:', type);
    const file = event.target.files[0];
    if (!file) {
        console.log('❌ No file selected');
        return;
    }
    
    // Reset input so same file can be selected again if needed
    event.target.value = '';
    
    // Clear existing overlay if any (rare case)
    const existingOverlay = document.getElementById('import-loading-overlay');
    if (existingOverlay) existingOverlay.remove();

    // Indication
    const overlay = document.createElement('div');
    overlay.id = 'import-loading-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);color:white;display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:10000;font-size:1.5rem;font-weight:bold;font-family:Segoe UI, sans-serif;';
    overlay.innerHTML = '<div>⏳ מעבד נתונים...</div><div style="font-size:1rem;margin-top:10px;font-weight:normal;">אנא המתן, פעולה זו עשויה לקחת מספר רגעים</div>';
    document.body.appendChild(overlay);
    
    try {
        if (typeof XLSX === 'undefined') {
            throw new Error('XLSX library not loaded. Please refresh the page.');
        }

        // Add small delay to ensure overlay renders before heavy parsing freezes UI
        await new Promise(r => setTimeout(r, 100));

        const data = await readExcelFile(file);
        console.log(`✅ Loaded CSV/Excel data: ${data.length} rows`);
        if (data.length > 0) {
            console.log('First row headers:', Object.keys(data[0]));
        } else {
            showAlert('הקובץ ריק או לא נקרא בהצלחה', 'warning');
            return;
        }
        
        if (type === 'customers') {
            await processImportCustomers(data);
        } else if (type === 'contacts') {
            await processImportContacts(data);
        }
        
    } catch (error) {
        console.error('Import Error:', error);
        showAlert('שגיאה בייבוא הקובץ: ' + (error.message || error), 'error');
    } finally {
        const overlay = document.getElementById('import-loading-overlay');
        if (overlay) overlay.remove();
    }
}

function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                // Use defval: '' to ensure empty cells are not skipped in CSV but here we want JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                resolve(jsonData);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}

async function processImportCustomers(rows) {
    let createdRequest = 0;
    let updatedRequest = 0;
    let contactsCreated = 0;
    let contactsUpdated = 0;
    
    // Get existing customers to check for updates vs inserts
    // We match by 'business_name'
    const { data: existingCustomers } = await supabaseClient.from('customers').select('customer_id, business_name');
    const existingMap = new Map((existingCustomers || []).map(c => [c.business_name.trim(), c.customer_id]));
    
    for (const rawRow of rows) {
        // Map columns with trim on keys if needed
        const row = {};
        Object.keys(rawRow).forEach(key => {
            row[key.trim()] = rawRow[key];
        });
        
        // Expected headers variations
        const businessName = row['שם עסק'] || row['שם העסק'] || row['Business Name'] || row['שם'];
        
        if (!businessName) continue;
        
        const customerData = {
            business_name: businessName,
            contact_name: row['איש קשר'] || row['שם איש קשר'] || row['Contact Name'] || null,
            phone: row['טלפון'] || row['Phone'] || null,
            email: row['אימייל'] || row['Email'] || null,
            city: row['כתובת'] || row['עיר'] || row['City'] || null,
            customer_type: row['סוג לקוח'] || row['Type'] || null,
            source: row['מקור'] || row['Source'] || null,
            order_number: row['מספר הזמנה'] || row['Order Number'] || null, // Added order_number
            updated_at: new Date().toISOString()
        };
        
        // Optional notes handling if column exists
        if (row['הערות'] || row['Notes']) {
            customerData.notes = row['הערות'] || row['Notes'];
        }
        
        // Clean undefined/null/empty to avoid overwriting existing data with empty values
        Object.keys(customerData).forEach(key => {
            if (customerData[key] === undefined || customerData[key] === null || (typeof customerData[key] === 'string' && customerData[key].trim() === '')) {
                delete customerData[key];
            }
        });

        const existingId = existingMap.get(businessName.trim());
        let currentCustomerId = existingId;
        
        if (existingId) {
            // Update
            const { error } = await supabaseClient.from('customers').update(customerData).eq('customer_id', existingId);
            if (!error) updatedRequest++;
        } else {
            // Insert
            const { data, error } = await supabaseClient.from('customers').insert(customerData).select('customer_id').single();
            if (!error && data) {
                createdRequest++;
                currentCustomerId = data.customer_id;
            }
        }

        // Handle Automatic Contact Creation/Update from Customer Row
        if (currentCustomerId && customerData.contact_name) {
            // Check if this contact already exists for this customer
            const { data: existingContact, error: fetchError } = await supabaseClient
                .from('contacts')
                .select('contact_id')
                .eq('customer_id', currentCustomerId)
                .eq('contact_name', customerData.contact_name)
                .maybeSingle();
            
            if (fetchError) console.error('Error fetching existing contact:', fetchError);

            const contactData = {
                contact_name: customerData.contact_name,
                customer_id: currentCustomerId,
                phone: customerData.phone || null,
                email: customerData.email || null
            };
            
            // Clean contact data
             Object.keys(contactData).forEach(key => {
                if (contactData[key] === undefined || contactData[key] === null || (typeof contactData[key] === 'string' && contactData[key].trim() === '')) {
                    delete contactData[key];
                }
            });

            if (existingContact) {
                // Update existing contact details
                const { error } = await supabaseClient.from('contacts').update(contactData).eq('contact_id', existingContact.contact_id);
                if (!error) contactsUpdated++;
                else console.error('Error updating contact:', error);
            } else {
                // Create new contact
                const { error } = await supabaseClient.from('contacts').insert(contactData);
                if (!error) {
                    contactsCreated++;
                }
                else console.error('Error creating contact:', error);
            }
        }
    }
    
    let message = `הייבוא הושלם: ${createdRequest} לקוחות חדשים, ${updatedRequest} לקוחות עודכנו`;
    if (contactsCreated > 0 || contactsUpdated > 0) {
        message += `\nאנשי קשר: ${contactsCreated} נוצרו, ${contactsUpdated} עודכנו`;
    }
    showAlert(message, 'success');
    await loadCustomers(); // Refresh
    filterCustomers();
    
    await loadContacts();  // Refresh contacts tab as well
    filterContacts();
}


async function processImportContacts(rows) {
    let createdRequest = 0;
    let updatedRequest = 0;
    let skipped = 0;
    
    // We need customers to link
    const { data: customersList } = await supabaseClient.from('customers').select('customer_id, business_name');
    // Normalize names for matching
    const customerMap = new Map((customersList || []).map(c => [c.business_name.trim(), c.customer_id]));
    
    // Existing contacts to check for updates
    // Matching logic for contacts is harder. Name + Customer? Or just Name?
    // Let's match by Name.
    const { data: existingContacts } = await supabaseClient.from('contacts').select('contact_id, contact_name, customer_id');
    
    for (const rawRow of rows) {
        // Normalize keys
        const row = {};
        Object.keys(rawRow).forEach(key => {
            row[key.trim()] = rawRow[key];
        });

        // Headers: 'שם', 'תפקיד', 'טלפון', 'אימייל', 'לקוח'
        const contactName = row['שם'] || row['Name'] || row['Contact Name'];
        if (!contactName) continue;
        
        const customerName = row['לקוח'] || row['Customer'] || row['Business Name'];
        let customerId = null;
        
        if (customerName) {
            customerId = customerMap.get(customerName.trim());
        }
        
        // Match existing: Try to find by contact_name AND customerLink (if provided in excel)
        // If excel doesn't have customer, just match by name? Risky.
        // Let's require customer name for robust matching, OR if no customer in excel, match by name only?
        // Let's iterate existing to find matches.
        
        let existingId = null;
        if (existingContacts) {
             const match = existingContacts.find(c => 
                c.contact_name === contactName && 
                (!customerId || c.customer_id === customerId) // If we know customer, match it.
             );
             if (match) existingId = match.contact_id;
        }

        const contactData = {
            contact_name: contactName,
            role: row['תפקיד'] || row['Role'] || null,
            phone: row['טלפון'] || row['Phone'] || null,
            email: row['אימייל'] || row['Email'] || null,
            notes: row['הערות'] || row['Notes'] || null,
            is_active: true
        };
        
        // Clean undefined/null to avoid overwriting existing data with empty values
        Object.keys(contactData).forEach(key => {
            if (contactData[key] === undefined || contactData[key] === null || contactData[key] === '') {
                delete contactData[key];
            }
        });
        
        if (customerId) {
            contactData.customer_id = customerId;
        }
        
        if (existingId) {
             await supabaseClient.from('contacts').update(contactData).eq('contact_id', existingId);
             updatedRequest++;
        } else {
             // Create new
             await supabaseClient.from('contacts').insert(contactData);
             createdRequest++;
        }
    }
    
    showAlert(`הייבוא הושלם: ${createdRequest} אנשי קשר חדשים, ${updatedRequest} עודכנו`, 'success');
    await loadContacts();
    filterContacts();
}

async function loadAuditLog() {
    const container = document.getElementById('auditlog-list');
    container.innerHTML = '<div class="spinner"></div>';
    
    try {
        // Get filter values
        const actionFilter = document.getElementById('filter-audit-action')?.value || '';
        const entityFilter = document.getElementById('filter-audit-entity')?.value || '';
        const searchFilter = document.getElementById('filter-audit-search')?.value.toLowerCase() || '';
        const dateFilter = document.getElementById('filter-audit-date')?.value || '';
        const performerFilter = document.getElementById('filter-audit-performer')?.value || '';
        
        // Build query
        let query = supabaseClient
            .from('audit_log')
            .select('*')
            .order('created_at', { ascending: false });
        
        // Apply filters
        if (actionFilter) {
            query = query.eq('action_type', actionFilter);
        }
        
        if (entityFilter) {
            query = query.eq('entity_type', entityFilter);
        }
        
        // Apply performer filter
        if (performerFilter) {
            query = query.eq('performed_by', performerFilter);
        }
        
        // Date filter
        if (dateFilter) {
            const now = new Date();
            let startDate;
            
            if (dateFilter === 'today') {
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            } else if (dateFilter === 'week') {
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            } else if (dateFilter === 'month') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }
            
            if (startDate) {
                query = query.gte('created_at', startDate.toISOString());
            }
        }
        
        const { data: logs, error } = await query;
        
        if (error) throw error;
        
        // Populate performer dropdown with unique performers
        const performerSelect = document.getElementById('filter-audit-performer');
        if (performerSelect && logs) {
            const currentValue = performerSelect.value;
            const performers = [...new Set(logs.map(l => l.performed_by).filter(Boolean))].sort();
            performerSelect.innerHTML = '<option value="">הכל</option>';
            performers.forEach(performer => {
                const option = document.createElement('option');
                option.value = performer;
                option.textContent = performer;
                if (performer === currentValue) option.selected = true;
                performerSelect.appendChild(option);
            });
        }
        
        // Filter by search (client-side)
        let filteredLogs = logs || [];
        if (searchFilter) {
            filteredLogs = filteredLogs.filter(log => {
                const name = (log.entity_name || '').toLowerCase();
                const desc = (log.description || '').toLowerCase();
                const performer = (log.performed_by || '').toLowerCase();
                return name.includes(searchFilter) || 
                       desc.includes(searchFilter) || 
                       performer.includes(searchFilter);
            });
        }
        
        if (filteredLogs.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="padding: 3rem; color: var(--text-tertiary);">
                    <p style="font-size: 1.3rem;">📋 אין פעולות להצגה</p>
                    <p>לא נמצאו רשומות ביומן הפעולות${actionFilter || entityFilter || dateFilter ? ' לפי הסינון שנבחר' : ''}</p>
                </div>
            `;
            return;
        }
        
        // Action type icons and labels
        const actionLabels = {
            'create': { icon: '➕', label: 'יצירה', class: 'badge-won' },
            'update': { icon: '✏️', label: 'עדכון', class: 'badge-pending' },
            'delete': { icon: '🗑️', label: 'מחיקה', class: 'badge-lost' }
        };
        
        // Entity type labels
        const entityLabels = {
            'customer': 'לקוח',
            'deal': 'עסקה',
            'product': 'מוצר',
            'activity': 'פעילות',
            'contact': 'איש קשר'
        };
        
        // Build HTML
        let html = `
            <p style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
                מציג ${filteredLogs.length} פעולות אחרונות
            </p>
        `;
        
        // Group by date
        const groupedByDate = {};
        
        const page = paginationState.audit.page;
        const limit = paginationState.audit.limit || 10;
        const start = (page - 1) * limit;
        const pagedLogs = filteredLogs.slice(start, start + limit);

        pagedLogs.forEach(log => {
            const dateKey = new Date(log.created_at).toLocaleDateString('he-IL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            if (!groupedByDate[dateKey]) {
                groupedByDate[dateKey] = [];
            }
            groupedByDate[dateKey].push(log);
        });
        
        Object.keys(groupedByDate).forEach(dateKey => {
            html += `
                <div style="margin-bottom: 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
                        <span style="font-weight: 600; color: var(--text-primary);">${dateKey}</span>
                        <span style="background: var(--bg-tertiary); padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; color: var(--text-secondary);">
                            ${groupedByDate[dateKey].length} פעולות
                        </span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            `;
            
            groupedByDate[dateKey].forEach(log => {
                const action = actionLabels[log.action_type] || { icon: '📌', label: log.action_type, class: 'badge-new' };
                const entity = entityLabels[log.entity_type] || log.entity_type;
                const time = new Date(log.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                
                // Check for detailed item changes
                let itemChangesHtml = '';
                if (log.new_value && log.new_value.itemChanges && log.new_value.itemChanges.length > 0) {
                    itemChangesHtml = `
                        <div style="width: 100%; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed var(--border-color);">
                            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">📋 פירוט שינויים:</div>
                            <div style="display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem;">
                                ${log.new_value.itemChanges.map(change => `
                                    <div style="padding: 0.25rem 0.5rem; background: var(--bg-tertiary); border-radius: 4px; color: var(--text-primary);">
                                        ${change}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }
                
                html += `
                    <div style="display: flex; align-items: flex-start; gap: 1rem; padding: 0.75rem; background: var(--bg-secondary); border-radius: 8px; flex-wrap: wrap;">
                        <span style="font-size: 1.2rem;">${action.icon}</span>
                        <span class="badge ${action.class}" style="font-size: 0.75rem;">${action.label}</span>
                        <span style="background: var(--bg-tertiary); padding: 2px 8px; border-radius: 8px; font-size: 0.8rem; color: var(--text-secondary);">
                            ${entity}
                        </span>
                        <div style="flex: 1; min-width: 200px;">
                            <span style="font-weight: 600; color: var(--text-primary);">${log.entity_name || '-'}</span>
                            ${log.description ? `<span style="color: var(--text-secondary); margin-right: 0.5rem;">• ${log.description}</span>` : ''}
                            ${itemChangesHtml}
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: var(--text-tertiary);">
                            <span>👤 ${log.performed_by}</span>
                            <span>⏰ ${time}</span>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        container.innerHTML += renderPagination(filteredLogs.length, page, 'audit');
        
    } catch (error) {
        console.error('❌ Error loading audit log:', error);
        container.innerHTML = `
            <div class="alert alert-error">שגיאה בטעינת יומן הפעולות: ${error.message}</div>
        `;
    }
}

// ============================================
// Confirmation Modal
// ============================================

function showConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById('confirmation-modal');
    if (!modal) return;
    
    document.getElementById('confirmation-title').textContent = title;
    document.getElementById('confirmation-message').textContent = message;
    
    const confirmBtn = document.getElementById('confirmation-confirm-btn');
    // Remove existing event listeners to prevent duplicates (cloning is a simple way)
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    newConfirmBtn.onclick = () => {
        closeConfirmationModal();
        if (onConfirm) onConfirm();
    };
    
    modal.classList.add('active');
}

function closeConfirmationModal() {
    const modal = document.getElementById('confirmation-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// ============================================
// Reports & Analytics
// ============================================

let chartInstances = {};

async function loadReports() {
    try {
        showAlert('טוען נתונים לדוחות...', 'info');

        // Fetch all deals
        const { data: deals, error: dealsError } = await supabaseClient
            .from('deals')
            .select('*');
            
        if (dealsError) throw dealsError;
        
        // Fetch deal items (simplified query)
        const { data: dealItems, error: itemsError } = await supabaseClient
            .from('deal_items')
            .select(`
                deal_id,
                quantity,
                total_price,
                products (
                    product_name
                )
            `);
            
        if (itemsError) throw itemsError;

        // Calculate Summary Stats
        const wonDeals = deals.filter(d => d.deal_status === 'זכייה');
        const pendingDeals = deals.filter(d => ['חדש', 'ממתין', 'טיוטה'].includes(d.deal_status));
        
        const totalSales = wonDeals.reduce((sum, deal) => sum + (deal.final_amount || 0), 0);
        
        // Fetch Supplier Orders for Procurement Report
        const { data: supplierOrdersData, error: supplierOrdersError } = await supabaseClient
            .from('supplier_orders')
            .select('total_amount, order_status'); // Select only needed fields

        const supplierOrders = supplierOrdersData || [];
        
        const totalSupplierExpenses = supplierOrders
            .filter(o => o.order_status !== 'בוטל')
            .reduce((sum, o) => sum + (o.total_amount || 0), 0);
            
        const totalOrdersCount = supplierOrders.length;
        const openOrdersCount = supplierOrders.filter(o => !['התקבל', 'בוטל'].includes(o.order_status)).length;
        
        // Update DOM for Procurement
        const expensesEl = document.getElementById('report-total-expenses');
        const ordersCountEl = document.getElementById('report-total-supplier-orders');
        const openOrdersEl = document.getElementById('report-open-supplier-orders');
        
        if (expensesEl) expensesEl.textContent = `₪${totalSupplierExpenses.toLocaleString()}`;
        if (ordersCountEl) ordersCountEl.textContent = totalOrdersCount;
        if (openOrdersEl) openOrdersEl.textContent = openOrdersCount;
        
        // Update Summary Cards
        const totalSalesEl = document.getElementById('report-total-sales');
        const wonEl = document.getElementById('report-deals-won');
        const pendingEl = document.getElementById('report-deals-pending');

        if (totalSalesEl) totalSalesEl.textContent = `₪${totalSales.toLocaleString()}`;
        if (wonEl) wonEl.textContent = wonDeals.length;
        if (pendingEl) pendingEl.textContent = pendingDeals.length;

        // --- Render Charts ---

        // 1. Monthly Sales Chart (Current Year)
        renderSalesChart(wonDeals);

        // 2. Deal Status Chart
        renderStatusChart(deals);

        // 3. Customer Types Chart
        // Ensure customers are loaded
        if (typeof customers === 'undefined' || !customers || customers.length === 0) {
            await loadCustomers();
        }
        renderCustomersChart();

        // Load Business Insights
        if (typeof loadBusinessInsights === 'function') {
            loadBusinessInsights(deals, customers, dealItems);
        }

        // 4. Top Products Chart
        // Pass deals map for easy status lookup
        const dealsStatusMap = deals.reduce((acc, deal) => {
            acc[deal.deal_id] = deal.deal_status;
            return acc;
        }, {});
        
        renderProductsChart(dealItems, dealsStatusMap);

        showAlert('✅ הדוחות עודכנו בהצלחה', 'success');

    } catch (error) {
        console.error('❌ Error loading reports:', error);
        showAlert('שגיאה בטעינת דוחות: ' + error.message, 'error');
    }
}


function renderSalesChart(wonDeals) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    
    // Group by month
    const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    const currentYear = new Date().getFullYear();
    const monthlyData = new Array(12).fill(0);

    wonDeals.forEach(deal => {
        const date = new Date(deal.created_at);
        if (date.getFullYear() === currentYear) {
            monthlyData[date.getMonth()] += (deal.final_amount || 0);
        }
    });

    if (chartInstances.sales) chartInstances.sales.destroy();

    chartInstances.sales = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: `מכירות ${currentYear} (₪)`,
                data: monthlyData,
                backgroundColor: '#3b82f6',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function renderStatusChart(deals) {
    const ctx = document.getElementById('statusChart').getContext('2d');
    
    const statusCounts = {};
    deals.forEach(deal => {
        statusCounts[deal.deal_status] = (statusCounts[deal.deal_status] || 0) + 1;
    });

    const labels = Object.keys(statusCounts).map(l => l === 'זכייה' ? 'נסגר' : l);
    const data = Object.values(statusCounts);
    
    const colors = {
        'טיוטה': '#94a3b8',
        'חדש': '#3b82f6',
        'ממתין': '#f59e0b',
        'נסגר': '#10b981', 
        'זכייה': '#10b981', 
        'הפסד': '#ef4444'
    };

    const bgColors = labels.map(label => colors[label] || '#cbd5e1');

    if (chartInstances.status) chartInstances.status.destroy();

    chartInstances.status = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: bgColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function renderCustomersChart() {
    const ctx = document.getElementById('customersChart').getContext('2d');
    
    // Use global customers array
    const typeCounts = {};
    customers.forEach(c => {
        const type = c.customer_type || 'אחר';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const labels = Object.keys(typeCounts);
    const data = Object.values(typeCounts);

    if (chartInstances.customers) chartInstances.customers.destroy();

    chartInstances.customers = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#8b5cf6', '#ec4899', '#f97316', '#06b6d4', '#84cc16', '#64748b'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function renderProductsChart(dealItems, dealsStatusMap) {
    const ctx = document.getElementById('productsChart').getContext('2d');
    
    // Filter only won deals items using the map
    const wonItems = dealItems.filter(item => dealsStatusMap[item.deal_id] === 'זכייה');
    
    const productStats = {};
    
    wonItems.forEach(item => {
        const name = item.products?.product_name || 'מוצר לא ידוע';
        productStats[name] = (productStats[name] || 0) + item.quantity;
    });

    // Sort by quantity desc and take top 5
    const sortedProducts = Object.entries(productStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const labels = sortedProducts.map(p => p[0]);
    const data = sortedProducts.map(p => p[1]);

    if (chartInstances.products) chartInstances.products.destroy();

    chartInstances.products = new Chart(ctx, {
        type: 'bar',
        indexAxis: 'y', // Horizontal bar
        data: {
            labels: labels,
            datasets: [{
                label: 'יחידות שנמכרו',
                data: data,
                backgroundColor: '#6366f1',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { beginAtZero: true }
            }
        }
    });
}

// ============================================
// Export to Excel Functions
// ============================================

function exportToExcel(data, headers, fileName) {
    if (!data || data.length === 0) {
        showAlert('אין נתונים לייצוא', 'warning');
        return;
    }

    try {
        // Map data to headers
        const exportData = data.map(item => {
            const row = {};
            // If headers is an object mapping key -> label
            if (headers && !Array.isArray(headers) && typeof headers === 'object') {
                Object.keys(headers).forEach(key => {
                    // Handle nested properties (e.g., 'customer.name')
                    const value = key.split('.').reduce((obj, k) => (obj || {})[k], item);
                    row[headers[key]] = value !== undefined && value !== null ? value : '';
                });
            } 
            // If headers is just a list of keys, use keys as labels (fallback)
            else {
                return item;
            }
            return row;
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        
        // RTL direction for the sheet
        ws['!cols'] = Object.keys(exportData[0]).map(() => ({ wch: 20 })); // Set default width
        if (!wb.Workbook) wb.Workbook = {};
        if (!wb.Workbook.Views) wb.Workbook.Views = [];
        wb.Workbook.Views[0] = { RTL: true };

        XLSX.utils.book_append_sheet(wb, ws, "ייצוא נתונים");
        
        // Generate filename with date
        const date = new Date().toISOString().split('T')[0];
        const fullFileName = `${fileName}_${date}.xlsx`;
        
        XLSX.writeFile(wb, fullFileName);
        
        showAlert('✅ הקובץ יוצא בהצלחה', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showAlert('שגיאה בייצוא הנתונים: ' + error.message, 'error');
    }
}

async function exportThisWeek() {
    // Re-use logic from loadThisWeek to get data
    // Or just fetch with current filters
    const typeFilter = document.getElementById('filter-thisweek-type')?.value || '';
    const statusFilter = document.getElementById('filter-thisweek-status')?.value || '';
    const creatorFilter = document.getElementById('filter-thisweek-creator')?.value || '';
    const { startOfWeek, endOfWeek } = getWeekDates(currentWeekOffset);
    
    let query = supabaseClient
        .from('activities')
        .select(`
            *,
            deals (
                deal_status,
                customers (business_name)
            ),
            customers (business_name)
        `)
        .neq('activity_type', 'הערה')
        .gte('activity_date', startOfWeek.toISOString())
        .lte('activity_date', endOfWeek.toISOString());
    
    if (typeFilter) query = query.eq('activity_type', typeFilter);
    if (creatorFilter) query = query.eq('created_by', creatorFilter);
    if (statusFilter === 'pending') query = query.or('completed.is.null,completed.eq.false');
    else if (statusFilter === 'completed') query = query.eq('completed', true);
    
    const { data, error } = await query;
    if (error) {
        console.error(error);
        showAlert('שגיאה בטעינת נתונים לייצוא', 'error');
        return;
    }

    const headers = {
        'activity_date': 'תאריך',
        'activity_type': 'סוג',
        'description': 'תיאור',
        'customers.business_name': 'לקוח',
        'deal_id': 'מזהה עסקה', // Simplified
        'created_by': 'נוצר ע"י',
        'completed': 'בוצע'
    };
    
    // Add logic to get customer name correctly from either deal relation or direct customer relation
    const processedData = data.map(item => {
        const customerName = item.deals?.customers?.business_name || item.customers?.business_name || 'כללי';
        return {
            ...item,
            'customers': { business_name: customerName },
             'completed': item.completed ? 'כן' : 'לא',
             'activity_date': new Date(item.activity_date).toLocaleString('he-IL')
        };
    });

    exportToExcel(processedData, headers, 'פעילויות_השבוע');
}

async function exportDeals() {
    const statusFilter = document.getElementById('filter-status')?.value || '';
    
    let query = supabaseClient
        .from('deals')
        .select(`
            *,
            customers (business_name, contact_name, phone)
        `)
        .order('created_at', { ascending: false });

    if (statusFilter) query = query.eq('deal_status', statusFilter);
    
    const { data: deals, error } = await query;
    if (error) {
        console.error(error);
        showAlert('שגיאה בטעינת נתונים לייצוא', 'error');
        return;
    }

    // Client-side filtering for customer name if needed (replicating loadDealsHistory logic)
    const searchFilter = document.getElementById('filter-customer')?.value.toLowerCase();
    let filteredDeals = deals;
    if (searchFilter) {
        filteredDeals = deals.filter(deal => 
            deal.customers?.business_name?.toLowerCase().includes(searchFilter)
        );
    }

    const headers = {
        'created_at': 'תאריך יצירה',
        'customers.business_name': 'שם עסק',
        'customers.contact_name': 'איש קשר',
        'customers.phone': 'טלפון',
        'deal_status': 'סטטוס',
        'final_amount': 'סכום (₪)',
        'notes': 'הערות'
    };
    
    // Add sorting logic if needed, but default is fine
    const processedData = filteredDeals.map(d => ({
        ...d,
        created_at: new Date(d.created_at).toLocaleDateString('he-IL'),
        deal_status: d.deal_status === 'זכייה' ? 'נסגר' : d.deal_status // Align with terminology
    }));

    exportToExcel(processedData, headers, 'היסטוריית_עסקאות');
}

async function exportActivities() {
    const typeFilter = document.getElementById('filter-activity-type')?.value || '';
    const statusFilter = document.getElementById('filter-activity-status')?.value || '';
    const creatorFilter = document.getElementById('filter-activity-creator')?.value || '';
    const searchFilter = document.getElementById('filter-activity-search')?.value.toLowerCase() || '';

    let query = supabaseClient
        .from('activities')
        .select(`
            *,
            customers (business_name),
            deals (deal_id, customers(business_name))
        `)
        .neq('activity_type', 'הערה');

    if (typeFilter) query = query.eq('activity_type', typeFilter);
    if (creatorFilter) query = query.eq('created_by', creatorFilter);
    if (statusFilter === 'pending') query = query.or('completed.is.null,completed.eq.false');
    else if (statusFilter === 'completed') query = query.eq('completed', true);

    const { data, error } = await query;
    if (error) {
        console.error(error);
        showAlert('שגיאה בטעינת נתונים לייצוא', 'error');
        return;
    }

    let filtered = data;
    if (searchFilter) {
        filtered = data.filter(a => a.description?.toLowerCase().includes(searchFilter));
    }

    const headers = {
        'activity_date': 'תאריך',
        'activity_type': 'סוג',
        'customer_name': 'לקוח', // Custom field
        'description': 'תיאור',
        'completed': 'סטטוס',
        'created_by': 'נוצר ע"י'
    };

    const processedData = filtered.map(item => ({
        ...item,
        customer_name: item.customers?.business_name || item.deals?.customers?.business_name || 'כללי',
        activity_date: new Date(item.activity_date).toLocaleString('he-IL'),
        completed: item.completed ? 'בוצע' : 'ממתין'
    }));

    exportToExcel(processedData, headers, 'פעילויות');
}

function exportCustomers() {
    // Customers are already loaded in global variable `customers` usually, but we filter them client side
    // It's safer to re-apply current filters to the global list
    
    // Check if customers loaded
    if (typeof customers === 'undefined' || !customers) {
        showAlert('טוען נתונים...', 'info');
        loadCustomers().then(exportCustomers);
        return;
    }

    const searchInput = document.getElementById('filter-customer-list-search')?.value.toLowerCase() || '';
    const typeFilter = document.getElementById('filter-customer-type')?.value || '';
    const cityFilter = document.getElementById('filter-customer-city')?.value.toLowerCase() || '';
    const sourceFilter = document.getElementById('filter-customer-source')?.value.toLowerCase() || '';

    let filtered = customers.filter(c => {
        const matchesSearch = !searchInput || 
            (c.business_name && c.business_name.toLowerCase().includes(searchInput)) ||
            (c.contact_name && c.contact_name.toLowerCase().includes(searchInput)) ||
            (c.phone && c.phone.includes(searchInput)) ||
            (c.email && c.email.toLowerCase().includes(searchInput));
            
        const matchesType = !typeFilter || c.customer_type === typeFilter;
        const matchesCity = !cityFilter || (c.city && c.city.toLowerCase().includes(cityFilter));
        const matchesSource = !sourceFilter || (c.source && c.source.toLowerCase().includes(sourceFilter));
        
        return matchesSearch && matchesType && matchesCity && matchesSource;
    });

    const headers = {
        'business_name': 'שם עסק',
        'contact_name': 'איש קשר',
        'phone': 'טלפון',
        'email': 'אימייל',
        'city': 'כתובת',
        'customer_type': 'סוג לקוח',
        'source': 'מקור',
        'notes': 'הערות'
    };

    exportToExcel(filtered, headers, 'לקוחות');
}

function exportContacts() {
    // Check if contacts loaded
    if (typeof contacts === 'undefined' || !contacts) {
        showAlert('טוען נתונים...', 'info');
        loadContacts().then(exportContacts);
        return;
    }
    
    const searchInput = document.getElementById('filter-contact-search')?.value.toLowerCase() || '';
    const customerFilter = document.getElementById('filter-contact-customer')?.value || '';

    let filtered = contacts.filter(c => {
        const matchesSearch = !searchInput ||
            (c.contact_name && c.contact_name.toLowerCase().includes(searchInput)) ||
            (c.phone && c.phone.includes(searchInput)) ||
            (c.email && c.email.toLowerCase().includes(searchInput));
        
        const matchesCustomer = !customerFilter || c.customer_id === customerFilter;
        
        return matchesSearch && matchesCustomer;
    });

    const headers = {
        'contact_name': 'שם',
        'role': 'תפקיד',
        'phone': 'טלפון',
        'email': 'אימייל',
        'customer_name': 'לקוח מקושר'
    };

    // Enrich with customer name
    const processedData = filtered.map(c => {
        const cust = customers.find(cus => cus.customer_id === c.customer_id);
        return {
            ...c,
            customer_name: cust ? cust.business_name : ''
        };
    });

    exportToExcel(processedData, headers, 'אנשי_קשר');
}

function exportProducts() {
    if (typeof products === 'undefined' || !products) {
        showAlert('טוען נתונים...', 'info');
        loadProducts().then(exportProducts);
        return;
    }

    const searchInput = document.getElementById('filter-product-search')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('filter-product-category')?.value || '';

    let filtered = products.filter(p => {
        const matchesSearch = !searchInput ||
            (p.product_name && p.product_name.toLowerCase().includes(searchInput)) ||
            (p.sku && p.sku.toLowerCase().includes(searchInput));
        
        const matchesCategory = !categoryFilter || p.category === categoryFilter;
        
        return matchesSearch && matchesCategory;
    });

    const headers = {
        'sku': 'מק"ט',
        'product_name': 'שם מוצר',
        'category': 'קטגוריה',
        'price': 'מחיר'
    };

    exportToExcel(filtered, headers, 'מוצרים');
}

async function exportAuditLog() {
    const actionFilter = document.getElementById('filter-audit-action')?.value || '';
    const entityFilter = document.getElementById('filter-audit-entity')?.value || '';
    const searchFilter = document.getElementById('filter-audit-search')?.value.toLowerCase() || '';
    const performerFilter = document.getElementById('filter-audit-performer')?.value || '';
    const dateFilter = document.getElementById('filter-audit-date')?.value || '';

    let query = supabaseClient
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000); // Reasonable limit for export

    if (actionFilter) query = query.eq('action_type', actionFilter);
    if (entityFilter) query = query.eq('entity_type', entityFilter);
    if (performerFilter) query = query.eq('performed_by', performerFilter);
    
    // Apply date filter logic (simplified for export, ideally redundant with loadAuditLog)
    
    const { data, error } = await query;
    if (error) {
        console.error(error);
        showAlert('שגיאה בטעינת נתונים לייצוא', 'error');
        return;
    }

    let filtered = data;
    if (searchFilter) {
        filtered = data.filter(log => 
            (log.description && log.description.toLowerCase().includes(searchFilter)) ||
            (log.entity_name && log.entity_name.toLowerCase().includes(searchFilter))
        );
    }
    
    // Filter by date if needed (client side for simplicity or replicate getQueryDateRange)
    if (dateFilter) {
        const today = new Date();
        today.setHours(0,0,0,0);
        
        filtered = filtered.filter(log => {
            const logDate = new Date(log.created_at);
            if (dateFilter === 'today') return logDate >= today;
            if (dateFilter === 'week') {
                const weekAgo = new Date(today);
                weekAgo.setDate(today.getDate() - 7);
                return logDate >= weekAgo;
            }
            if (dateFilter === 'month') {
                const monthAgo = new Date(today);
                monthAgo.setMonth(today.getMonth() - 1);
                return logDate >= monthAgo;
            }
            return true;
        });
    }

    const headers = {
        'created_at': 'תאריך',
        'performed_by': 'בוצע ע"י',
        'action_type': 'פעולה',
        'entity_type': 'סוג',
        'entity_name': 'שם',
        'description': 'תיאור'
    };

    const actionMap = {
        'create': 'יצירה',
        'update': 'עדכון',
        'delete': 'מחיקה'
    };
    
    const entityMap = {
        'customer': 'לקוח',
        'deal': 'עסקה',
        'product': 'מוצר',
        'activity': 'פעילות',
        'contact': 'איש קשר'
    };

    const processedData = filtered.map(log => ({
        ...log,
        created_at: new Date(log.created_at).toLocaleString('he-IL'),
        action_type: actionMap[log.action_type] || log.action_type,
        entity_type: entityMap[log.entity_type] || log.entity_type
    }));

    exportToExcel(processedData, headers, 'יומן_פעולות');
}

async function loadCustomerDeals(customerId, containerId = 'view-customer-deals-list') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '<div class="spinner"></div>';
    
    try {
        const { data: deals, error } = await supabaseClient
            .from('deals')
            .select('*, customers(business_name)')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        if (!deals || deals.length === 0) {
            container.innerHTML = '<p style="color: var(--text-tertiary); text-align: center;">אין עסקאות עבור לקוח זה</p>';
            return;
        }
        
        container.innerHTML = deals.map(deal => {
            const dateObj = new Date(deal.created_at);
            const formattedDate = dateObj.toLocaleDateString('he-IL');
            
            // Format title
            const dealDay = String(dateObj.getDate()).padStart(2, '0');
            const dealMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
            const dealYear = dateObj.getFullYear();
            const dealTitle = `הצעת מחיר עבור ${deal.customers?.business_name || 'לקוח'} ${dealDay}.${dealMonth}.${dealYear}`;

            const statusBadgeClass = {
                'טיוטה': 'badge-pending',
                'חדש': 'badge-new',
                'ממתין': 'badge-pending',
                'זכייה': 'badge-won',
                'הפסד': 'badge-lost'
            }[deal.deal_status] || 'badge-new';
            
            const statusDisplay = deal.deal_status === 'זכייה' ? 'נסגר' : (deal.deal_status === 'הפסד' ? 'בוטל' : deal.deal_status);

            return `
                <div style="padding: 0.75rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <div style="font-weight: 600; margin-bottom: 0.25rem;">
                            ${dealTitle}
                        </div>
                        <div style="font-size: 0.85rem; color: var(--text-tertiary);">
                            ${formattedDate} • ₪${(deal.final_amount || 0).toLocaleString()}
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span class="badge ${statusBadgeClass}" style="font-size: 0.75rem;">${statusDisplay}</span>
                        <button class="btn btn-sm btn-primary" onclick="viewDealDetails('${deal.deal_id}'); closeCustomerDetailsModal();" title="צפה בעסקה">👁️</button>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading customer deals:', error);
        container.innerHTML = `<p style="color: var(--error-color);">שגיאה בטעינת עסקאות: ${error.message}</p>`;
    }
}

// ============================================
// Business Insights & Interactive Reports
// ============================================

function loadBusinessInsights(deals, customers, dealItems) {
    const container = document.getElementById('insights-content');
    if (!container) return;

    // Filter won deals for accurate data
    const wonDeals = deals.filter(d => d.deal_status === 'זכייה');
    
    // 1. Calculate Average Deal Size
    const totalRevenue = wonDeals.reduce((sum, d) => sum + (d.final_amount || 0), 0);
    const avgDealSize = wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0;
    
    // 2. Calculate Win Rate (Won / Total Closed) - Considering closed as Won or Lost
    const closedDeals = deals.filter(d => ['זכייה', 'הפסד'].includes(d.deal_status));
    const winRate = closedDeals.length > 0 ? (wonDeals.length / closedDeals.length) * 100 : 0;
    
    // 3. Top Product Category
    const categoryRevenue = {};
    dealItems.forEach(item => {
        // We need product category, but item only has product name from current query
        // This is an estimation or we need full product data.
        // Let's rely on product name for "Top Product" instead of category for now to be safe, 
        // or check if products global is available.
    });

    // 3. Top Customer (by Revenue)
    const customerRevenue = {};
    wonDeals.forEach(deal => {
        if (deal.customer_id) {
            customerRevenue[deal.customer_id] = (customerRevenue[deal.customer_id] || 0) + (deal.final_amount || 0);
        }
    });
    
    let topCustomer = { name: 'אין נתונים', revenue: 0 };
    let topCustomerId = null;
    for (const [custId, revenue] of Object.entries(customerRevenue)) {
        if (revenue > topCustomer.revenue) {
            topCustomer.revenue = revenue;
            topCustomerId = custId;
        }
    }
    
    if (topCustomerId && customers) {
        const cust = customers.find(c => c.customer_id === topCustomerId);
        if (cust) topCustomer.name = cust.business_name;
    }

    // 4. Monthly Growth (This month vs Last month)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const thisMonthRevenue = wonDeals
        .filter(d => {
            const date = new Date(d.created_at);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        })
        .reduce((sum, d) => sum + (d.final_amount || 0), 0);
        
    const lastMonthRevenue = wonDeals
        .filter(d => {
            const date = new Date(d.created_at);
            return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
        })
        .reduce((sum, d) => sum + (d.final_amount || 0), 0);
        
    let growthRate = 0;
    if (lastMonthRevenue > 0) {
        growthRate = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    } else if (thisMonthRevenue > 0) {
        growthRate = 100; // 100% growth from 0
    }

    // Render Insights
    container.innerHTML = `
        <div class="insight-card" style="padding: 1rem; border-right: 3px solid var(--primary-color);">
            <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.25rem;">גודל עסקה ממוצע</div>
            <div style="font-size: 1.25rem; font-weight: 700;">₪${avgDealSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <div style="font-size: 0.8rem; color: var(--text-tertiary);">מתוך ${wonDeals.length} עסקאות שנסגרו</div>
        </div>
        
        <div class="insight-card" style="padding: 1rem; border-right: 3px solid var(--success-color);">
            <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.25rem;">אחוז סגירה (Win Rate)</div>
            <div style="font-size: 1.25rem; font-weight: 700;">${winRate.toFixed(1)}%</div>
            <div style="font-size: 0.8rem; color: var(--text-tertiary);">מתוך ${closedDeals.length} עסקאות שהסתיימו</div>
        </div>
        
        <div class="insight-card" style="padding: 1rem; border-right: 3px solid var(--warning-color);">
            <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.25rem;">לקוח מוביל</div>
            <div style="font-size: 1.1rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${topCustomer.name}</div>
            <div style="font-size: 0.8rem; color: var(--text-tertiary);">הכנסות: ₪${topCustomer.revenue.toLocaleString()}</div>
        </div>
        
        <div class="insight-card" style="padding: 1rem; border-right: 3px solid ${growthRate >= 0 ? 'var(--success-color)' : 'var(--error-color)'};">
            <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.25rem;">צמיחה חודשית</div>
            <div style="font-size: 1.25rem; font-weight: 700; color: ${growthRate >= 0 ? 'var(--success-color)' : 'var(--error-color)'};">
                ${growthRate >= 0 ? '▲' : '▼'} ${Math.abs(growthRate).toFixed(1)}%
            </div>
            <div style="font-size: 0.8rem; color: var(--text-tertiary);">בהשוואה לחודש שעבר</div>
        </div>
    `;
}

async function exportInteractiveReport() {
    showAlert('מייצר דוח אינטראקטיבי...', 'info');
    
    try {
        // Collect current stats and HTML
        const totalSales = document.getElementById('report-total-sales').textContent;
        const wonDeals = document.getElementById('report-deals-won').textContent;
        const pendingDeals = document.getElementById('report-deals-pending').textContent;
        
        // Capture new Supplier Stats
        const totalExpenses = document.getElementById('report-total-expenses')?.textContent || '₪0.00';
        const totalSupplierOrders = document.getElementById('report-total-supplier-orders')?.textContent || '0';
        const openSupplierOrders = document.getElementById('report-open-supplier-orders')?.textContent || '0';

        const insightsHTML = document.getElementById('insights-content').innerHTML;

        // Capture Chart Data (Images) using toDataURL
        // Note: Charts must be rendered for this to work.
        const salesChart = document.getElementById('salesChart');
        const statusChart = document.getElementById('statusChart');
        const customersChart = document.getElementById('customersChart');
        const productsChart = document.getElementById('productsChart');

        const salesImg = salesChart ? salesChart.toDataURL('image/png') : '';
        const statusImg = statusChart ? statusChart.toDataURL('image/png') : '';
        const customersImg = customersChart ? customersChart.toDataURL('image/png') : '';
        const productsImg = productsChart ? productsChart.toDataURL('image/png') : '';

        // Generate full HTML content
        const htmlContent = `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>דוח פעילות עסקי - מערכת CRM</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; max-width: 1200px; margin: 0 auto; padding: 2rem; }
        h1 { text-align: center; color: #2563eb; margin-bottom: 0.5rem; }
        .date { text-align: center; color: #64748b; margin-bottom: 3rem; }
        
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; margin-bottom: 2rem; } /* Reduced margin */
        .card { background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; }
        .card h3 { margin: 0 0 0.5rem 0; font-size: 1rem; color: #64748b; }
        .card .value { font-size: 2rem; font-weight: 800; color: #0f172a; }
        
        .insights-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 3rem; background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .insight-card { padding: 1rem; border-right: 3px solid #e2e8f0; }
        
        .charts-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2rem; }
        .chart-box { background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; }
        .chart-box img { max-width: 100%; height: auto; }
        .chart-box h3 { margin-bottom: 1rem; color: #334155; }
        
        @media print { body { padding: 0; background: white; } .chart-box { box-shadow: none; border: 1px solid #ddd; } }
    </style>
</head>
<body>
    <h1>דוח פעילות ונתונים עסקיים</h1>
    <div class="date">נכון לתאריך: ${new Date().toLocaleDateString('he-IL')} בשעה ${new Date().toLocaleTimeString('he-IL')}</div>

    <div class="summary-grid">
        <div class="card">
            <h3>סה"כ מכירות</h3>
            <div class="value" style="color: #2563eb;">${totalSales}</div>
        </div>
        <div class="card">
            <h3>עסקאות שנסגרו</h3>
            <div class="value" style="color: #10b981;">${wonDeals}</div>
        </div>
        <div class="card">
            <h3>עסקאות בהמתנה</h3>
            <div class="value" style="color: #f59e0b;">${pendingDeals}</div>
        </div>
    </div>
    
    <h3 style="text-align: center; color: #64748b; margin-bottom: 1rem; margin-top: 1rem; border-top: 1px solid #e2e8f0; padding-top: 2rem;">רכש וספקים</h3>
    <div class="summary-grid">
        <div class="card">
            <h3>סה"כ הוצאות רכש</h3>
            <div class="value" style="color: #ef4444;">${totalExpenses}</div>
        </div>
        <div class="card">
            <h3>הזמנות רכש</h3>
            <div class="value" style="color: #8b5cf6;">${totalSupplierOrders}</div>
        </div>
        <div class="card">
            <h3>הזמנות פתוחות</h3>
            <div class="value" style="color: #f59e0b;">${openSupplierOrders}</div>
        </div>
    </div>

    <h2 style="font-size: 1.2rem; margin-bottom: 1rem;">💡 תובנות עסקיות</h2>
    <div class="insights-grid">
        ${insightsHTML}
    </div>

    <h2 style="font-size: 1.2rem; margin-bottom: 1rem;">📊 גרפים ומגמות</h2>
    <div class="charts-grid">
        <div class="chart-box">
            <h3>מכירות חודשיות</h3>
            <img src="${salesImg}" alt="Sales Chart">
        </div>
        <div class="chart-box">
            <h3>סטטוס עסקאות</h3>
            <img src="${statusImg}" alt="Status Chart">
        </div>
        <div class="chart-box">
            <h3>פילוח לקוחות</h3>
            <img src="${customersImg}" alt="Customers Chart">
        </div>
        <div class="chart-box">
            <h3>מוצרים מובילים</h3>
            <img src="${productsImg}" alt="Products Chart">
        </div>
    </div>
    
    <div style="text-align: center; margin-top: 3rem; color: #94a3b8; font-size: 0.9rem;">
        הופק ע"י מערכת ניהול CRM
    </div>
</body>
</html>
        `;

        // Create Blob and Download
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `crm_report_${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showAlert('✅ הדוח יוצא בהצלחה!', 'success');

    } catch (error) {
        console.error('Export Error:', error);
        showAlert('שגיאה ביצוא הדוח: ' + error.message, 'error');
    }
}

function populateCityFilter() {
    const citySelect = document.getElementById('filter-customer-city');
    if (!citySelect) return;

    const currentVal = citySelect.value;
    const cityCounts = {};
    
    customers.forEach(c => {
        const city = c.city ? c.city.trim() : '';
        if (city) {
             cityCounts[city] = (cityCounts[city] || 0) + 1;
        }
    });

    const sortedCities = Object.keys(cityCounts).sort((a, b) => a.localeCompare(b, 'he'));

    let html = '<option value="">כל הערים</option>';
    sortedCities.forEach(city => {
        html += `<option value="${city}">${city} (${cityCounts[city]})</option>`;
    });

    citySelect.innerHTML = html;
    
    if (currentVal && cityCounts[currentVal]) {
        citySelect.value = currentVal;
    }
}

// ============================================
// Global Search Logic
// ============================================

let searchDebounceTimer;

function debounceSearch(event) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        performGlobalSearch();
    }, 500);
}

async function performGlobalSearch() {
    const query = document.getElementById('global-search-input').value.trim().toLowerCase();
    const container = document.getElementById('search-results-container');
    
    if (query.length < 2) {
        container.innerHTML = `
            <div class="text-center" style="padding: 3rem; color: var(--text-tertiary);">
                <p style="font-size: 1.2rem;">הקלד לפחות 2 תווים לחיפוש</p>
            </div>`;
        return;
    }

    container.innerHTML = '<div class="spinner"></div>';
    
    const includeCustomers = document.getElementById('search-customers').checked;
    const includeContacts = document.getElementById('search-contacts').checked;
    const includeDeals = document.getElementById('search-deals').checked;
    const includeActivities = document.getElementById('search-activities').checked;
    const includeProducts = document.getElementById('search-products').checked;

    const results = {
        customers: [],
        contacts: [],
        deals: [],
        activities: [],
        products: []
    };

    const promises = [];

    // 1. Search Customers (Server - DB ILIKE)
    if (includeCustomers) {
        const custPromise = supabaseClient
            .from('customers')
            .select('*')
            .or(`business_name.ilike.%${query}%,contact_name.ilike.%${query}%,phone.ilike.%${query}%,city.ilike.%${query}%,email.ilike.%${query}%`)
            .limit(20)
            .then(({data}) => {
                if (data) results.customers = data;
            });
         promises.push(custPromise);
    }

    // 1.5 Search Contacts
    if (includeContacts) {
        const contPromise = supabaseClient
            .from('contacts')
            .select('*, customers(business_name)')
            .or(`contact_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%,role.ilike.%${query}%`)
            .limit(20)
            .then(({data, error}) => {
                if (error) throw error;
                if (data) results.contacts = data;
            })
            .catch(async (err) => {
                console.warn('Contact search with join failed, trying simple search:', err);
                // Fallback: Simple search without join (in case FK is missing)
                const { data: contacts } = await supabaseClient
                    .from('contacts')
                    .select('*')
                    .or(`contact_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
                    .limit(20);
                
                if (contacts && contacts.length > 0) {
                    // Manually fetch linked customer names since join failed
                    const customerIds = [...new Set(contacts.map(c => c.customer_id).filter(id => id))];
                    
                    if (customerIds.length > 0) {
                        const { data: customers } = await supabaseClient
                            .from('customers')
                            .select('customer_id, business_name')
                            .in('customer_id', customerIds);
                            
                        const custMap = {};
                        if (customers) {
                            customers.forEach(cust => custMap[cust.customer_id] = cust.business_name);
                        }
                        
                        // Attach business_name to contact objects
                        contacts.forEach(c => {
                            if (c.customer_id && custMap[c.customer_id]) {
                                c.customers = { business_name: custMap[c.customer_id] };
                            }
                        });
                    }
                    results.contacts = contacts;
                }
            });
        promises.push(contPromise);
    }

    // 2. Search Products (Server - DB ILIKE)
    if (includeProducts) {
       const prodPromise = supabaseClient
            .from('products')
            .select('*')
            .or(`product_name.ilike.%${query}%,sku.ilike.%${query}%,description.ilike.%${query}%`)
            .limit(20)
            .then(({data}) => {
                if (data) results.products = data;
            });
       promises.push(prodPromise);
    }

    // 3. Search Deals (Server - DB ILIKE with Inner Join)
    // Searches for deals where deal_status matches OR customer business_name matches
    if (includeDeals) {
        const dealPromise = supabaseClient
            .from('deals')
            .select('deal_id, deal_status, created_at, final_amount, customer_id, customers!inner(business_name)')
            .or(`deal_status.ilike.%${query}%,customers.business_name.ilike.%${query}%`)
            .order('created_at', { ascending: false })
            .limit(20)
            .then(({data}) => {
                if (data) results.deals = data;
            });
         promises.push(dealPromise);
    }

    // 4. Search Activities (Server - DB ILIKE)
    // Searches description (notes) and type
    if (includeActivities) {
        const actPromise = supabaseClient
            .from('activities')
            .select('*, customers(business_name), deals(deal_id)')
            .or(`description.ilike.%${query}%,activity_type.ilike.%${query}%`)
            .limit(20)
            .order('activity_date', { ascending: false })
            .then(({data}) => {
                if (data) results.activities = data;
            });
        promises.push(actPromise);
    }

    await Promise.all(promises);
    
    renderGlobalSearchResults(results, query);
}

function renderGlobalSearchResults(results, query) {
    const container = document.getElementById('search-results-container');
    let html = '';
    let foundAny = false;
    
    // Customers
    if (results.customers.length > 0) {
        foundAny = true;
        html += `<h3 style="margin-top: 1rem; color: var(--text-primary);">👥 לקוחות (${results.customers.length})</h3>`;
        html += `<div class="table-responsive"><table class="items-table" style="width:100%">
            <thead><tr><th>שם העסק</th><th>איש קשר</th><th>טלפון</th><th>כתובת</th><th>פעולות</th></tr></thead>
            <tbody>`;
        results.customers.forEach(c => {
             html += `<tr>
                <td><strong>${highlight(c.business_name, query)}</strong></td>
                <td>${highlight(c.contact_name || '-', query)}</td>
                <td>${highlight(c.phone || '-', query)}</td>
                <td>${highlight(c.city || '-', query)}</td>
                <td><button class="btn btn-sm btn-secondary" onclick="viewCustomerDetails('${c.customer_id}')">👁️ צפה</button></td>
             </tr>`;
        });
        html += `</tbody></table></div>`;
    }

    // Contacts
    if (results.contacts && results.contacts.length > 0) {
        foundAny = true;
        html += `<h3 style="margin-top: 2rem; color: var(--text-primary);">👤 אנשי קשר (${results.contacts.length})</h3>`;
        html += `<div class="table-responsive"><table class="items-table" style="width:100%">
            <thead><tr><th>שם קשר</th><th>שם עסק (לקוח)</th><th>טלפון</th><th>אימייל</th><th>תפקיד</th><th>פעולות</th></tr></thead>
            <tbody>`;
        results.contacts.forEach(c => {
             const businessName = c.customers?.business_name || '-';
             
             // Phone formatted link
             let phoneHtml = '-';
             if (c.phone) {
                 const phones = c.phone.split(',');
                 phoneHtml = phones.map(p => {
                     const fullPhone = p.trim();
                     const match = fullPhone.match(/^(.*)\s\((.*)\)$/);
                     let phone = fullPhone;
                     let type = '';
                     if (match) {
                         phone = match[1];
                         type = match[2];
                     }
                     const cleanPhone = phone.replace(/\D/g, '').replace(/^0/, '972');
                     const cleanNumber = phone.replace(/[^0-9+]/g, '');
                     const phoneDisplay = highlight(phone, query);
                     
                     return `
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <div style="display: flex; flex-direction: column; line-height: 1.1;">
                            <span>${phoneDisplay}</span>
                            ${type ? `<span style="font-size: 0.75rem; color: var(--text-tertiary);">${type}</span>` : ''}
                        </div>
                        <a href="https://wa.me/${cleanPhone}" target="_blank" title="שלח וואטסאפ" style="text-decoration: none; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                            <img src="images/whatsapp.png" alt="WhatsApp" style="width: 25px; height: 25px; vertical-align: middle;">
                        </a>
                        <a href="tel:${cleanNumber}" title="חייג" style="text-decoration: none; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                            <img src="images/call.png" alt="Call" style="width: 20px; height: 20px; vertical-align: middle;">
                        </a>
                    </div>`;
                 }).join('');
             }

             // Email formatted link
             const emailDisplay = highlight(c.email || '-', query);
             let emailHtml = emailDisplay;
             if (c.email) {
                 emailHtml = `<a href="mailto:${c.email}" style="color: var(--primary-color); text-decoration: underline;" title="שלח מייל">${emailDisplay}</a>`;
             }

             // Business Name link
             let businessHtml = highlight(businessName, query);
             if (c.customer_id) {
                 businessHtml = `<span onclick="viewCustomerDetails('${c.customer_id}')" style="cursor: pointer; color: var(--primary-color); font-weight: 500; text-decoration: underline;" title="צפה בלקוח">${highlight(businessName, query)}</span>`;
             }

             html += `<tr>
                <td><strong>${highlight(c.contact_name, query)}</strong></td>
                <td>${businessHtml}</td>
                <td>${phoneHtml}</td>
                <td>${emailHtml}</td>
                <td>${highlight(c.role || '-', query)}</td>
                <td><button class="btn btn-sm btn-secondary" onclick="viewContactDetails('${c.contact_id}')">👁️ צפה</button></td>
             </tr>`;
        });
        html += `</tbody></table></div>`;
    }

    // Products
    if (results.products.length > 0) {
        foundAny = true;
        html += `<h3 style="margin-top: 2rem; color: var(--text-primary);">📦 מוצרים (${results.products.length})</h3>`;
        html += `<div class="table-responsive"><table class="items-table" style="width:100%">
            <thead><tr><th>שם המוצר</th><th>מק"ט</th><th>מחיר</th><th>פעולות</th></tr></thead>
            <tbody>`;
        results.products.forEach(p => {
             html += `<tr>
                <td><strong>${highlight(p.product_name, query)}</strong></td>
                <td>${highlight(p.sku || '-', query)}</td>
                <td>₪${p.price}</td>
                <td>-</td>
             </tr>`;
        });
        html += `</tbody></table></div>`;
    }

    // Activities
    if (results.activities.length > 0) {
        foundAny = true;
        html += `<h3 style="margin-top: 2rem; color: var(--text-primary);">📅 פעילויות (${results.activities.length})</h3>`;
        html += `<div class="table-responsive"><table class="items-table" style="width:100%">
            <thead><tr><th>סוג</th><th>תאריך</th><th>לקוח</th><th>תיאור</th><th>פעולות</th></tr></thead>
            <tbody>`;
        results.activities.forEach(a => {
             const date = a.activity_date ? new Date(a.activity_date).toLocaleDateString('he-IL') : '-';
             const client = a.customers?.business_name || '-';
             html += `<tr>
                <td>${a.activity_type}</td>
                <td>${date}</td>
                <td>${client}</td>
                <td>${highlight(a.description || '-', query)}</td>
                <td><button class="btn btn-sm btn-secondary" onclick="editActivity('${a.activity_id}')">✏️ ערוך</button></td>
             </tr>`;
        });
        html += `</tbody></table></div>`;
    }
    
    // Deals
     if (results.deals.length > 0) {
        foundAny = true;
        html += `<h3 style="margin-top: 2rem; color: var(--text-primary);">💼 עסקאות (${results.deals.length})</h3>`;
        html += `<div class="table-responsive"><table class="items-table" style="width:100%">
            <thead><tr><th>לקוח</th><th>תאריך</th><th>סכום</th><th>סטטוס</th><th>פעולות</th></tr></thead>
            <tbody>`;
        results.deals.forEach(d => {
             const date = new Date(d.created_at).toLocaleDateString('he-IL');
             const client = d.customers?.business_name || '-';
             html += `<tr>
                <td><strong>${highlight(client, query)}</strong></td>
                <td>${date}</td>
                <td>₪${d.final_amount || 0}</td>
                <td>${d.deal_status}</td>
                <td><button class="btn btn-sm btn-secondary" onclick="viewDealDetails('${d.deal_id}')">👁️ צפה</button></td>
             </tr>`;
        });
        html += `</tbody></table></div>`;
    }

    if (!foundAny) {
        html = `
            <div class="text-center" style="padding: 3rem; color: var(--text-tertiary);">
                <p style="font-size: 1.2rem;">🚫 לא נמצאו תוצאות עבור "${query}"</p>
            </div>`;
    }

    container.innerHTML = html;
}

function highlight(text, query) {
    if (!text) return '';
    try {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.toString().replace(regex, '<span style="background-color: yellow; color: black;">$1</span>');
    } catch (e) {
        return text;
    }
}

// ============================================
// SUPPLIERS LOGIC
// ============================================



async function loadSuppliers() {
    try {
        const { data, error } = await supabaseClient
            .from('suppliers')
            .select('*')
            .eq('active', true)
            .order('supplier_name');
            
        if (error) {
            if (error.code === '42P01') { // table undefined
                 console.warn('Suppliers table missing');
                 suppliers = [];
                 return;
            }
            throw error;
        }
        
        // Parse extra data (workaround) for all suppliers
        suppliers = (data || []).map(s => {
            let notes = s.notes || '';
            let extraData = {};
            
            if (notes.includes('<<<EXTRA_DATA>>>')) {
                const parts = notes.split('<<<EXTRA_DATA>>>');
                notes = parts[0]; 
                try {
                    extraData = JSON.parse(parts[1]);
                } catch(e) { console.error('Failed to parse extra data', e); }
            }
            
            return {
                ...s,
                website: s.website || extraData.website || '',
                additional_emails: s.additional_emails || extraData.additional_emails || [],
                clean_notes: notes // Use this for display
            };
        });
        
        // Populate filters if needed
        populateSupplierFilters();
        
    } catch (error) {
        console.error('Error loading suppliers:', error);
        showAlert('שגיאה בטעינת ספקים', 'error');
    }
}

function populateSupplierFilters() {
    const categorySelect = document.getElementById('filter-supplier-category');
    if (!categorySelect) return;
    
    // Save current selection
    const current = categorySelect.value;
    
    const categories = [...new Set(suppliers.map(s => s.category).filter(c => c))].sort();
    
    categorySelect.innerHTML = '<option value="">כל הקטגוריות</option>';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        categorySelect.appendChild(opt);
    });
    
    categorySelect.value = current;
    
    // Also populate order modal select
    const orderSelect = document.getElementById('order-supplier-select');
    if (orderSelect) {
         orderSelect.innerHTML = '<option value="">-- בחר ספק --</option>';
         suppliers.forEach(s => {
             const opt = document.createElement('option');
             opt.value = s.supplier_id;
             opt.textContent = s.supplier_name;
             orderSelect.appendChild(opt);
         });
    }
    
    const filterOrderSelect = document.getElementById('filter-supplier-order-supplier');
    if (filterOrderSelect) {
         filterOrderSelect.innerHTML = '<option value="">כל הספקים</option>';
         suppliers.forEach(s => {
             const opt = document.createElement('option');
             opt.value = s.supplier_id;
             opt.textContent = s.supplier_name;
             filterOrderSelect.appendChild(opt);
         });
    }
}

async function filterSuppliers() {
    if (suppliers.length === 0) await loadSuppliers();
    
    const query = document.getElementById('filter-supplier-search')?.value.toLowerCase() || '';
    const category = document.getElementById('filter-supplier-category')?.value || '';
    
    const filtered = suppliers.filter(s => {
        const matchQuery = !query || 
            s.supplier_name.toLowerCase().includes(query) ||
            s.contact_name?.toLowerCase().includes(query) ||
            s.category?.toLowerCase().includes(query);
            
        const matchCategory = !category || s.category === category;
        
        return matchQuery && matchCategory;
    });
    
    renderSuppliersList(filtered);
}

function renderSuppliersList(list) {
    const container = document.getElementById('suppliers-list');
    if (!container) return;
    
    if (list.length === 0) {
        container.innerHTML = `
            <div class="text-center" style="padding: 2rem; color: var(--text-tertiary);">
                <p>לא נמצאו ספקים</p>
            </div>
        `;
        return;
    }
    
    const tableHTML = `
        <div class="table-responsive">
            <table class="items-table" style="width: 100%; min-width: 1600px; table-layout: auto;">
                <thead>
                    <tr>
                        <th style="width: 15%;">שם הספק</th>
                        <th style="width: 10%;">קטגוריה</th>
                        <th style="width: 10%;">איש קשר</th>
                        <th style="width: 10%;">טלפון</th>
                        <th style="width: 20%;">אימייל</th>
                        <th style="width: 20%;">אתר</th>
                        <th style="width: 140px;">פעולות</th>
                    </tr>
                </thead>
                <tbody>
                    ${list.map(s => `
                        <tr>
                            <td style="white-space: nowrap;" title="${s.supplier_name}" dir="auto">
                                <strong>${s.supplier_name}</strong>
                            </td>
                            <td><span class="badge badge-pending">${s.category || '-'}</span></td>
                            <td>${s.contact_name || '-'}</td>
                            <td style="direction: ltr; text-align: right;">${s.phone || '-'}</td>
                            <td style="white-space: nowrap;">
                                ${s.email ? `<a href="mailto:${s.email}">${s.email}</a>` : '-'}
                            </td>
                            <td style="white-space: nowrap;">
                                ${s.website ? `<a href="${s.website.startsWith('http') ? s.website : 'http://' + s.website}" target="_blank">${s.website}</a>` : '-'}
                            </td>
                            <td>
                                <button class="btn btn-sm btn-info" onclick="viewSupplierDetails('${s.supplier_id}')">👁️</button>
                                <button class="btn btn-sm btn-secondary" onclick="openSupplierModal('${s.supplier_id}')">✏️</button>
                                <button class="btn btn-sm btn-danger" onclick="deleteSupplier('${s.supplier_id}')">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = tableHTML;
}

function openSupplierModal(supplierId = null) {
    const modal = document.getElementById('supplier-modal');
    const form = document.getElementById('supplier-form');
    // Reset form
    form.reset();
    document.getElementById('edit-supplier-id').value = '';
    document.getElementById('supplier-name').value = '';
    document.getElementById('supplier-category').value = '';
    document.getElementById('supplier-contact-name').value = '';
    document.getElementById('supplier-phone').value = '';
    document.getElementById('supplier-email').value = '';
    document.getElementById('supplier-website').value = '';
    document.getElementById('supplier-address').value = '';
    document.getElementById('supplier-notes').value = '';
    
    // Reset additional emails
    document.getElementById('supplier-additional-emails-container').innerHTML = '';
    
    if (supplierId) {
        document.getElementById('supplier-modal-title').textContent = 'ערוך ספק';
        const supplier = suppliers.find(s => s.supplier_id === supplierId);
        if (supplier) {
            document.getElementById('edit-supplier-id').value = supplier.supplier_id;
            document.getElementById('supplier-name').value = supplier.supplier_name;
            document.getElementById('supplier-category').value = supplier.category || '';
            document.getElementById('supplier-contact-name').value = supplier.contact_name || '';
            document.getElementById('supplier-phone').value = supplier.phone || '';
            document.getElementById('supplier-email').value = supplier.email || '';
            document.getElementById('supplier-website').value = supplier.website || '';
            document.getElementById('supplier-address').value = supplier.address || '';
            document.getElementById('supplier-address').value = supplier.address || '';
            
            // Handle Extra Data (Workaround for missing columns)
            let notes = supplier.notes || '';
            let extraData = {};
            if (notes.includes('<<<EXTRA_DATA>>>')) {
                const parts = notes.split('<<<EXTRA_DATA>>>');
                notes = parts[0]; // The real notes
                try {
                    extraData = JSON.parse(parts[1]);
                } catch(e) { console.error('Failed to parse extra data', e); }
            }
            
            document.getElementById('supplier-notes').value = notes;
            document.getElementById('supplier-website').value = supplier.website || extraData.website || '';
            
            // Populate additional emails
            const emailsToLoad = supplier.additional_emails || extraData.additional_emails || [];
            if (emailsToLoad && Array.isArray(emailsToLoad)) {
                emailsToLoad.forEach(emailObj => {
                    addSupplierEmailRow(emailObj.email, emailObj.role);
                });
            }
        }
    } else {
        document.getElementById('supplier-modal-title').textContent = 'ספק חדש';
    }
    
    modal.classList.add('active');
}

function closeSupplierModal() {
    document.getElementById('supplier-modal').classList.remove('active');
}

function addSupplierEmailRow(email = '', role = 'כללי') {
    const container = document.getElementById('supplier-additional-emails-container');
    const div = document.createElement('div');
    div.className = 'email-row';
    div.style.display = 'flex';
    div.style.gap = '0.5rem';
    div.style.marginBottom = '0.5rem';
    
    div.innerHTML = `
        <input type="email" class="form-input additional-email-input" value="${email}" placeholder="כתובת מייל נוספת" style="flex: 2;">
        <select class="form-select additional-email-role" style="flex: 1;">
            <option value="כללי" ${role === 'כללי' ? 'selected' : ''}>כללי</option>
            <option value="הזמנות" ${role === 'הזמנות' ? 'selected' : ''}>הזמנות</option>
            <option value="הנהח״ש" ${role === 'הנהח״ש' ? 'selected' : ''}>הנהח״ש</option>
            <option value="הנהלה" ${role === 'הנהלה' ? 'selected' : ''}>הנהלה</option>
            <option value="מחסן" ${role === 'מחסן' ? 'selected' : ''}>מחסן</option>
            <option value="אחר" ${role === 'אחר' ? 'selected' : ''}>אחר</option>
        </select>
        <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">🗑️</button>
    `;
    container.appendChild(div);
}

async function saveSupplier(event) {
    event.preventDefault();
    
    const supplierId = document.getElementById('edit-supplier-id').value;
    const name = document.getElementById('supplier-name').value;
    
    // Collect additional emails
    const additionalEmails = [];
    document.querySelectorAll('#supplier-additional-emails-container .email-row').forEach(row => {
        const email = row.querySelector('.additional-email-input').value;
        const role = row.querySelector('.additional-email-role').value;
        if (email) {
            additionalEmails.push({ email, role });
        }
    });

    const basicData = {
        supplier_name: name,
        category: document.getElementById('supplier-category').value,
        contact_name: document.getElementById('supplier-contact-name').value,
        phone: document.getElementById('supplier-phone').value,
        email: document.getElementById('supplier-email').value,
        address: document.getElementById('supplier-address').value,
        notes: document.getElementById('supplier-notes').value
    };

    const extendedData = {
        ...basicData,
        website: document.getElementById('supplier-website').value,
        additional_emails: additionalEmails
    };
    
    try {
        let result;
        // 1. Try saving with extended data first (Best Case: DB updated)
        if (supplierId) {
             result = await supabaseClient.from('suppliers').update(extendedData).eq('supplier_id', supplierId);
        } else {
             result = await supabaseClient.from('suppliers').insert([extendedData]);
        }
        
        // 2. Fallback: Store extra data in notes if columns missing
        if (result.error) {
            if (result.status === 400 || result.error.code === '42703' || result.error.code === 'PGRST204') { 
                 console.warn('Extended fields failed, using Notes workaround...', result.error);
                 
                 const extraDataPayload = {
                     website: extendedData.website,
                     additional_emails: extendedData.additional_emails
                 };
                 
                 // Append to notes with delimiter
                 const basicDataWithWorkaround = { ...basicData };
                 basicDataWithWorkaround.notes = basicData.notes + '<<<EXTRA_DATA>>>' + JSON.stringify(extraDataPayload);
                 
                 if (supplierId) {
                     result = await supabaseClient.from('suppliers').update(basicDataWithWorkaround).eq('supplier_id', supplierId);
                 } else {
                     result = await supabaseClient.from('suppliers').insert([basicDataWithWorkaround]);
                 }
                 
                 if (result.error) throw result.error;
                 // Success with workaround - don't scare the user, just work.
                 showAlert(supplierId ? 'הספק עודכן בהצלחה' : 'הספק נוצר בהצלחה', 'success');
                 closeSupplierModal();
                 showAlert(supplierId ? 'הספק עודכן בהצלחה' : 'הספק נוצר בהצלחה', 'success');
                 closeSupplierModal();
                 await loadSuppliers();
                 filterSuppliers();
                 return;
            }
            throw result.error;
        }
        
        showAlert(supplierId ? 'הספק עודכן בהצלחה' : 'הספק נוצר בהצלחה', 'success');
        
        closeSupplierModal();
        closeSupplierModal();
        await loadSuppliers(); 
        filterSuppliers(); // Refresh list UI
        
    } catch (e) {
        console.error(e);
        showAlert('שגיאה בשמירת הספק: ' + e.message, 'error');
    }
}

async function viewSupplierDetails(id) {
    const modal = document.getElementById('supplier-details-modal');
    modal.classList.add('active');
    
    const content = document.getElementById('supplier-details-content');
    content.innerHTML = '<div class="spinner"></div>';
    
    try {
        // Find in local memory first (already parsed!)
        let s = suppliers.find(sup => sup.supplier_id === id);
        
        // If not found (rare), fetch
        if (!s) {
            const { data, error } = await supabaseClient
            .from('suppliers')
            .select('*')
            .eq('supplier_id', id)
            .single();
            if (error) throw error;
            s = data; // Note: Won't have parsed fields if we just fetch raw, but fallback below handles it basically or we assume loadSuppliers is correct.
            // Actually, let's just parse it lightly here if needed, or rely on render to filter it.
        }

        // Fetch recent orders
        const { data: orders } = await supabaseClient
            .from('supplier_orders')
            .select('*')
            .eq('supplier_id', id)
            .order('created_at', { ascending: false })
            .limit(5);

        content.innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                <div>
                     <h3>${s.supplier_name}</h3>
                     <p><strong>קטגוריה:</strong> ${s.category || '-'}</p>
                     <p><strong>איש קשר:</strong> ${s.contact_name || '-'}</p>
                     <p><strong>טלפון:</strong> <span style="direction: ltr; display: inline-block;">${s.phone || '-'}</span></p>
                     <p><strong>אימייל:</strong> ${s.email ? `<a href="mailto:${s.email}">${s.email}</a>` : '-'}</p>
                     ${s.website ? `<p><strong>אתר:</strong> <a href="${s.website.startsWith('http') ? s.website : 'http://' + s.website}" target="_blank">${s.website}</a></p>` : ''}
                     <p><strong>כתובת:</strong> ${s.address || '-'}</p>
                     
                     ${s.additional_emails && s.additional_emails.length > 0 ? `
                        <div style="margin-top: 0.5rem; background: #f8f9fa; padding: 0.5rem; border-radius: 4px;">
                            <strong>מיילים נוספים:</strong>
                            <ul style="margin: 0.5rem 0 0 1rem; padding: 0;">
                                ${s.additional_emails.map(e => `<li>${e.email} (${e.role})</li>`).join('')}
                            </ul>
                        </div>
                     ` : ''}
                     
                     <div class="deal-card-info" style="margin-top: 1rem; display: block; white-space: pre-wrap;" dir="auto"><strong>הערות:</strong><br>${s.clean_notes || s.notes || '-'}</div>
                </div>
                <div>
                    <h4>הזמנות אחרונות</h4>
                    ${orders && orders.length > 0 ? `
                        <table class="items-table" style="width:100%">
                            <thead><tr><th>תאריך</th><th>סכום</th><th>סטטוס</th><th>פעולות</th></tr></thead>
                            <tbody>
                                ${orders.map(o => {
                                    let currencySymbol = '₪';
                                    if (s.address && s.address.toLowerCase().includes('china') || 
                                       (s.supplier_name && /[\u4e00-\u9fa5]/.test(s.supplier_name)) ||
                                       (s.supplier_name && s.supplier_name.toLowerCase().includes('china')) ||
                                       (s.supplier_name && s.supplier_name.toLowerCase().includes('qingdao')) ||
                                       (s.email && s.email.endsWith('.cn'))) {
                                        currencySymbol = '$';
                                    }
                                    return `
                                    <tr>
                                        <td>${new Date(o.created_at).toLocaleDateString('he-IL')}</td>
                                        <td>${currencySymbol}${(parseFloat(o.total_amount) || 0).toLocaleString()}</td>
                                        <td><span class="badge ${getStatusBadgeClass(o.order_status)}">${o.order_status}</span></td>
                                        <td>
                                            <button class="btn btn-sm btn-secondary btn-icon" onclick="viewSupplierOrder('${o.order_id}', '${s.supplier_id}')" title="צפה בהזמנה">👁️</button>
                                        </td>
                                    </tr>
                                `}).join('')}
                            </tbody>
                        </table>
                    ` : '<p>אין הזמנות</p>'}
                </div>
            </div>
        `;
        
    } catch (e) {
        console.error(e);
        content.innerHTML = '<p>שגיאה בטעינת פרטים</p>';
    }
}

function closeSupplierDetailsModal() {
    document.getElementById('supplier-details-modal').classList.remove('active');
}

// ============================================
// SUPPLIER ORDERS LOGIC
// ============================================

async function loadSupplierOrders() {
    const container = document.getElementById('supplier-orders-list');
    container.innerHTML = '<div class="spinner"></div>';
    
    try {
        // Build query
        let query = supabaseClient
            .from('supplier_orders')
            .select('*, suppliers(supplier_name, contact_name)')
            .order('created_at', { ascending: false });
            
        // Filters
        const statusFilter = document.getElementById('filter-supplier-order-status')?.value;
        const supplierFilter = document.getElementById('filter-supplier-order-supplier')?.value;
        
        if (statusFilter) query = query.eq('order_status', statusFilter);
        if (supplierFilter) query = query.eq('supplier_id', supplierFilter);
        
        const { data, error } = await query;
        
        if (error) {
             if (error.code === '42P01') { 
                 container.innerHTML = '<div class="text-center">טבלת הזמנות חסרה (רץ מיגרציה)</div>';
                 return;
             }
             throw error;
        }
        
        supplierOrders = data || [];
        renderSupplierOrdersList(supplierOrders);
        
    } catch (e) {
        console.error(e);
        container.innerHTML = '<p class="text-center error">שגיאה בטעינת הזמנות</p>';
    }
}

function renderSupplierOrdersList(list) {
     const container = document.getElementById('supplier-orders-list');
     if (!container) return;
     
     if (list.length === 0) {
         container.innerHTML = '<div class="text-center p-3">לא נמצאו הזמנות</div>';
         return;
     }
     
     container.innerHTML = `
        <div class="table-responsive">
            <table class="items-table" style="width: 100%; min-width: 1000px; table-layout: fixed;">
                <thead>
                    <tr>
                        <th style="width: 120px;">מס׳ הזמנה</th>
                        <th style="width: 25%;">ספק</th>
                        <th style="width: 15%;">תאריך</th>
                        <th style="width: 15%;">צפי הגעה</th>
                        <th style="width: 12%;">סכום</th>
                        <th style="width: 12%;">סטטוס</th>
                        <th style="width: 140px;">פעולות</th>
                    </tr>
                </thead>
                <tbody>
                    ${list.map(o => {
                        let currencySymbol = '₪';
                        const s = o.suppliers;
                        if (s && ((s.address && s.address.toLowerCase().includes('china')) || 
                                 (s.supplier_name && /[\u4e00-\u9fa5]/.test(s.supplier_name)) ||
                                 (s.supplier_name && s.supplier_name.toLowerCase().includes('china')) ||
                                 (s.supplier_name && s.supplier_name.toLowerCase().includes('qingdao')) ||
                                 (s.email && s.email.endsWith('.cn')))) {
                            currencySymbol = '$';
                        }
                        return `
                        <tr>
                            <td><strong>${o.order_number ? '#' + o.order_number : '#' + o.order_id.slice(0, 6).toUpperCase()}</strong></td>
                            <td style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${o.suppliers?.supplier_name || ''}" dir="auto">${o.suppliers?.supplier_name || 'לא ידוע'}</td>
                            <td>${new Date(o.created_at).toLocaleDateString('he-IL')}</td>
                            <td>${o.expected_date ? new Date(o.expected_date).toLocaleDateString('he-IL') : '-'}</td>
                            <td>${currencySymbol}${(parseFloat(o.total_amount) || 0).toLocaleString()}</td>
                            <td><span class="badge ${getStatusBadgeClass(o.order_status)}">${o.order_status}</span></td>
                            <td>
                                <button class="btn btn-sm btn-info" onclick="viewSupplierOrder('${o.order_id}', '${o.supplier_id}')" title="צפה">👁️</button>
                                <button class="btn btn-sm btn-secondary" onclick="openSupplierOrderModal('${o.order_id}')" title="ערוך">✏️</button>
                                <button class="btn btn-sm btn-danger" onclick="deleteSupplierOrder('${o.order_id}')" title="מחק">🗑️</button>
                            </td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        </div>
     `;
}

function getStatusBadgeClass(status) {
    switch(status) {
        case 'חדש': return 'badge-new';
        case 'נשלח': return 'badge-pending';
        case 'התקבל': return 'badge-won';
        case 'בוטל': return 'badge-lost';
        default: return 'badge-pending';
    }
}

// Order Items State (Local to modal)
let currentOrderItems = [];


let isSupplierOrderReadOnly = false;

function viewSupplierOrder(orderId, supplierId) {
    openSupplierOrderModal(orderId, true);
}

async function openSupplierOrderModal(orderId = null, readOnly = false) {
    const modal = document.getElementById('supplier-order-modal');
    isSupplierOrderReadOnly = readOnly;
    currentOrderItems = [];
    document.getElementById('edit-supplier-order-id').value = '';
    
    // UI Adjustments for Read Only
    const title = document.querySelector('#supplier-order-modal h2');
    const saveBtn = document.querySelector('#supplier-order-modal button[type="submit"]');
    const addBtn = document.querySelector('#supplier-order-modal .deal-items-header button');
    const inputs = document.querySelectorAll('#supplier-order-form input, #supplier-order-form select, #supplier-order-form textarea');
    
    // UI Toggle logic
    const editHeader = document.getElementById('supplier-order-edit-header');
    const viewHeader = document.getElementById('supplier-order-view-header');

    // UI Adjustments for Notes
    const notesHistory = document.getElementById('order-notes-history');
    const noteControls = document.getElementById('order-add-note-controls');
    const notesEditor = document.getElementById('order-notes');
    const editDetailsBtn = document.getElementById('btn-edit-order-details');

    if (readOnly) {
        modal.classList.add('read-only-mode');
        title.textContent = 'פרטי הזמנה';
        saveBtn.style.display = 'inline-block'; 
        saveBtn.innerHTML = '💾 שמור שינויים'; 
        if (addBtn) addBtn.style.display = 'none';
        
        // Show edit button
        if (editDetailsBtn) {
            editDetailsBtn.style.display = 'inline-block';
            editDetailsBtn.onclick = () => openSupplierOrderModal(orderId, false);
        }
        
        // Headers
        editHeader.style.display = 'none';
        viewHeader.style.display = 'grid';
        
        // Notes View
        notesHistory.style.display = 'block';
        noteControls.style.display = 'flex';
        notesEditor.style.display = 'none';

        // Add Export PDF Button if not exists
        if (!document.getElementById('btn-export-pdf')) {
            const btn = document.createElement('button');
            btn.id = 'btn-export-pdf';
            btn.type = 'button';
            btn.className = 'btn btn-secondary';
            btn.style.marginRight = '10px';
            btn.innerHTML = '📄 ייצא PDF';
            btn.onclick = () => exportSupplierOrderPDF(orderId);
            const headerActions = document.querySelector('#supplier-order-modal .modal-header');
            if (headerActions) {
                 // Insert before close button or somewhere suitable. 
                 // Actually easier to put it near the edit button logic or append to header
                 // Let's look for a container in header or create one.
                 // The modal header usually contains title and close button. 
                 // We can inject it into the header.
                 headerActions.insertBefore(btn, headerActions.firstChild);
            }
        } else {
             const btn = document.getElementById('btn-export-pdf');
             btn.style.display = 'inline-block';
             btn.onclick = () => exportSupplierOrderPDF(orderId);
        }
        
    } else {
        modal.classList.remove('read-only-mode');
        // ... (existing code)
        
        // Hide Export PDF Button
        const pdfBtn = document.getElementById('btn-export-pdf');
        if (pdfBtn) pdfBtn.style.display = 'none';
        
        title.textContent = orderId ? 'ערוך הזמנה' : 'הזמנה חדשה';
        saveBtn.style.display = 'inline-block';
        saveBtn.innerHTML = '💾 שמור שינויים'; 
        if (addBtn) addBtn.style.display = 'inline-block';
        
        // Hide edit button
        if (editDetailsBtn) editDetailsBtn.style.display = 'none';
        
        // Headers
        editHeader.style.display = 'grid';
        viewHeader.style.display = 'none';
        
        // Notes Edit
        // Notes Edit - NOW USES SAME STRUCTURE AS VIEW MODE
        notesHistory.style.display = 'block'; // Show history in edit mode too
        noteControls.style.display = 'flex';  // Show "Add Note" controls
        notesEditor.style.display = 'none';   // Hide raw textarea (it's internal now)
        
        // Reset disabled state
        inputs.forEach(input => input.disabled = false);
    }

    // Ensure suppliers loaded for dropdown
    if (suppliers.length === 0) await loadSuppliers();
    
    if (orderId) {
        try {
            // Fetch order
            const { data: order, error } = await supabaseClient
                .from('supplier_orders')
                .select('*')
                .eq('order_id', orderId)
                .single();
                
            if (error) throw error;
            
            document.getElementById('edit-supplier-order-id').value = order.order_id;
            
            // Populate Inputs
            document.getElementById('order-supplier-select').value = order.supplier_id;
            document.getElementById('order-status').value = order.order_status;
            document.getElementById('order-expected-date').value = order.expected_date ? order.expected_date.split('T')[0] : '';
            document.getElementById('order-creation-date').value = order.created_at ? order.created_at.split('T')[0] : '';
            document.getElementById('order-notes').value = order.notes || '';
            document.getElementById('order-notes').value = order.notes || '';
            
            // Render Notes History
            renderOrderNotes(order.notes || '');
            
            // Populate View Header (Read Only)
            if (readOnly) {
                const supplierName = suppliers.find(s => s.supplier_id === order.supplier_id)?.supplier_name || 'לא ידוע';
                document.getElementById('view-order-supplier').textContent = supplierName;
                
                // Status Badge logic
                const statusEl = document.getElementById('view-order-status');
                statusEl.textContent = order.order_status;
                statusEl.className = `badge ${getStatusBadgeClass(order.order_status)}`;
                
                document.getElementById('view-order-date').textContent = order.expected_date ? new Date(order.expected_date).toLocaleDateString('he-IL') : '-';
                document.getElementById('view-order-creation-date').textContent = order.created_at ? new Date(order.created_at).toLocaleDateString('he-IL') : '-';
            }
            
            // Fetch items
            const { data: items } = await supabaseClient
                .from('supplier_order_items')
                .select('*')
                .eq('order_id', orderId);
                
            // Fix legacy items where color is inside description
            currentOrderItems = (items || []).map(item => {
                const legacyMatch = item.description && typeof item.description === 'string' 
                    ? item.description.match(/(.*)\s\((.+)\)$/) 
                    : null;
                
                if (!item.color && legacyMatch) {
                    return {
                        ...item,
                        description: legacyMatch[1].trim(),
                        color: legacyMatch[2].trim()
                    };
                }
                return item;
            });
            
        } catch (e) {
            console.error(e);
            showAlert('שגיאה בטעינת הזמנה', 'error');
            return;
        }
    } else {
        // Defaults
        document.getElementById('order-status').value = 'חדש';
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('order-expected-date').value = today;
        document.getElementById('order-creation-date').value = today;
    }
    
    renderSupplierOrderItems();
    modal.classList.add('active');
}

function closeSupplierOrderModal() {
    document.getElementById('supplier-order-modal').classList.remove('active');
}

function renderSupplierOrderItems() {
    const tbody = document.getElementById('supplier-order-items-tbody');
    const emptyState = document.getElementById('supplier-order-empty-state');
    const totalEl = document.getElementById('supplier-order-total');
    
    tbody.innerHTML = '';
    let total = 0;
    
    // Determine currency based on supplier
    const supplierId = document.getElementById('order-supplier-select')?.value;
    let currencySymbol = '₪';
    
    // Attempt to detect if supplier is from abroad (e.g., China)
    // We can check the supplier object if available, or infer from current view
    if (supplierId) {
       const supplier = suppliers.find(s => s.supplier_id == supplierId);
       if (supplier && (
           (supplier.address && supplier.address.toLowerCase().includes('china')) || 
           (supplier.supplier_name && /[\u4e00-\u9fa5]/.test(supplier.supplier_name)) || // Chinese characters
           (supplier.supplier_name && supplier.supplier_name.toLowerCase().includes('china')) ||
           (supplier.supplier_name && supplier.supplier_name.toLowerCase().includes('qingdao')) ||
           (supplier.email && supplier.email.endsWith('.cn'))
       )) {
           currencySymbol = '$';
       }
    }
    
    // Also check for view mode where select might act differently or we use the cached order details if possible
    // But renderSupplierOrderItems relies on UI state primarily.

    if (currentOrderItems.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        currentOrderItems.forEach((item, index) => {
            const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
            total += itemTotal;
            
            const tr = document.createElement('tr');
            
            // Build product options
            let productOptions = '<option value="">בחר מוצר...</option>';
            products.forEach(p => {
                // Exact match by ID is preferred, fallback to name match
                const isSelected = (item.product_id && item.product_id === p.product_id) || 
                                   (!item.product_id && item.description === p.product_name);
                productOptions += `<option value="${p.product_id}" ${isSelected ? 'selected' : ''}>${p.product_name}</option>`;
            });
            productOptions += '<option value="__NEW__" style="font-weight: bold; color: var(--primary-color);">➕ הוסף מוצר חדש...</option>';

            // Build color options
            const stdColors = ['שחור', 'לבן', 'ברונזה', 'כסף', 'טבעי', 'שמפניה'];
            let colorOptions = `<option value="" ${!item.color ? 'selected' : ''}>בחר...</option>`;
            stdColors.forEach(c => colorOptions += `<option value="${c}" ${item.color === c ? 'selected' : ''}>${c}</option>`);
            if (item.color && !stdColors.includes(item.color)) colorOptions += `<option value="${item.color}" selected>${item.color}</option>`;
            colorOptions += `<option value="__OTHER__" style="font-weight: bold; color: var(--primary-color);">➕ צבע חדש...</option>`;

            if (isSupplierOrderReadOnly) {
                // Read Only View - Plain Text
                tr.innerHTML = `
                    <td><span style="font-weight: 500;">${item.description || '-'}</span></td>
                    <td>${item.color || '-'}</td>
                    <td>${item.sku || '-'}</td>
                    <td style="text-align: center;">${item.quantity || 0}</td>
                    <td style="text-align: center;">${item.unit_price || 0}</td>
                    <td style="vertical-align: middle; font-weight: bold; color: var(--primary-dark); text-align: center;">${currencySymbol}${itemTotal.toLocaleString()}</td>
                    <td></td>
                `;
            } else {
                // Edit View - Inputs
                tr.innerHTML = `
                    <td>
                        <select class="form-select table-input" style="width: 100%" onchange="handleProductSelect(${index}, this)">
                            ${productOptions}
                        </select>
                    </td>
                    <td>
                        <select class="form-select table-input" onchange="updateOrderItem(${index}, 'color', this.value)" style="width: 100%">
                            ${colorOptions}
                        </select>
                    </td>
                    <td><input type="text" class="form-input table-input" value="${item.sku || ''}" onchange="updateOrderItem(${index}, 'sku', this.value)" placeholder="מק״ט" style="width: 100%"></td>
                    <td style="text-align: center;"><input type="number" class="form-input table-input" value="${item.quantity || 1}" step="any" onchange="updateOrderItem(${index}, 'quantity', this.value)" style="width: 60px; text-align: center;"></td>
                    <td style="text-align: center;"><input type="number" class="form-input table-input" value="${item.unit_price || 0}" step="0.01" onchange="updateOrderItem(${index}, 'unit_price', this.value)" style="width: 90px; text-align: center;"></td>
                    <td style="vertical-align: middle; font-weight: bold; color: var(--primary-dark); text-align: center;">${currencySymbol}${itemTotal.toLocaleString()}</td>
                    <td style="text-align: center;"><button type="button" class="btn btn-sm btn-danger btn-icon" onclick="removeSupplierOrderItem(${index})" title="הסר">🗑️</button></td>
                `;
            }
            tbody.appendChild(tr);
        });
    }
    
    totalEl.textContent = currencySymbol + total.toLocaleString();
}

async function handleProductSelect(index, selectEl) {
    const value = selectEl.value;
    
    if (value === '__NEW__') {
        // Reset select to previous valid value or empty for now
        selectEl.value = ''; 
        await addNewProductPrompt(index);
        return;
    }
    
    // Find selected product
    // value is string from select, product_id might be int? Supabase IDs are int usually? 
    // If UUID, string is fine. If int, we need Loose Equality or Parse.
    // Assuming product_id is UUID or we use loose equality for safety.
    const product = products.find(p => p.product_id == value);
    
    if (product) {
        currentOrderItems[index].description = product.product_name;
        currentOrderItems[index].sku = product.sku || '';
        currentOrderItems[index].unit_price = product.price || 0;
        currentOrderItems[index].product_id = product.product_id; // Save ID
        renderSupplierOrderItems();
    } else {
        // Cleared selection
        currentOrderItems[index].description = '';
        currentOrderItems[index].product_id = null;
        renderSupplierOrderItems();
    }
}

async function addNewProductPrompt(index) {
    // Save current modal state mostly handled by global vars, but good to know we are in a modal stack
    
    const { value: formValues } = await Swal.fire({
        title: 'הוסף מוצר חדש',
        html:
            '<input id="new-prod-name" class="swal2-input" placeholder="שם המוצר">' +
            '<input id="new-prod-sku" class="swal2-input" placeholder="מק״ט (אופציונלי)">' +
            '<input id="new-prod-price" type="number" step="0.01" class="swal2-input" placeholder="מחיר (אופציונלי)">',
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'שמור והוסף',
        cancelButtonText: 'ביטול',
        preConfirm: () => {
            const name = document.getElementById('new-prod-name').value;
            const sku = document.getElementById('new-prod-sku').value;
            const price = document.getElementById('new-prod-price').value;
            
            if (!name) {
                Swal.showValidationMessage('נא להזין שם מוצר');
            }
            return { name, sku, price };
        }
    });

    if (formValues) {
        try {
            // Save to database
            const { data, error } = await supabaseClient
                .from('products')
                .insert([{
                    product_name: formValues.name,
                    sku: formValues.sku || null,
                    price: parseFloat(formValues.price) || 0,
                    active: true,
                    description: 'נוצר דרך הזמנת רכש' // Optional description
                }])
                .select()
                .single();
                
            if (error) throw error;
            
            // Reload global products
            await loadProducts(); // This refreshes the 'products' array
            
            // Allow time for array update if async
            
            // Update the current line item
            if (data) {
                currentOrderItems[index].description = data.product_name;
                currentOrderItems[index].sku = data.sku || '';
                currentOrderItems[index].unit_price = data.price || 0;
                currentOrderItems[index].product_id = data.product_id; // Save ID
                renderSupplierOrderItems();
                
                showAlert('המוצר נוסף בהצלחה', 'success');
            }
            
        } catch (e) {
            console.error(e);
            showAlert('שגיאה ביצירת מוצר: ' + e.message, 'error');
        }
    }
}

function addSupplierOrderItem() {
    currentOrderItems.push({
        description: '',
        color: '',
        sku: '',
        quantity: 1,
        unit_price: 0
    });
    renderSupplierOrderItems();
}

function removeSupplierOrderItem(index) {
    currentOrderItems.splice(index, 1);
    renderSupplierOrderItems();
}



// CONSTANTS for Notes
const NOTE_SEPARATOR = '\n----------------------------------------\n';

function renderOrderNotes(fullText) {
    const historyDiv = document.getElementById('order-notes-history');
    if (!historyDiv) return;
    
    // Clear current
    historyDiv.innerHTML = '';
    
    if (!fullText) {
        historyDiv.innerHTML = '<div style="color: #888; text-align: center; padding: 1rem;">אין הערות</div>';
        return;
    }

    // Split by separator
    const notes = fullText.split(NOTE_SEPARATOR).map(n => n.trim()).filter(n => n);
    
    notes.forEach((noteText, index) => {
        const noteEl = document.createElement('div');
        noteEl.id = `note-block-${index}`;
        noteEl.style.cssText = 'background: #fff; border: 1px solid #eee; border-radius: 4px; padding: 2px 4px; margin-bottom: 2px; position: relative;';
        
        // Parse Header and Content
        const firstLineBreak = noteText.indexOf('\n');
        let header = noteText;
        let content = '';
        
        if (firstLineBreak !== -1) {
            header = noteText.substring(0, firstLineBreak);
            content = noteText.substring(firstLineBreak + 1);
        } else {
             content = noteText; // Fallback if no newline found, though unexpected for system notes
             header = '';
        }

        // Content
        const contentEl = document.createElement('div');
        
        let html = '';
        if (header) {
             html += `<div style="font-size: 0.85rem; color: #666; margin-bottom: 0px; direction: rtl; text-align: right; padding: 0 5px;">${header}</div>`;
        }
        html += `<div style="white-space: pre-wrap; padding: 0 5px; line-height: 1.2;">${content}</div>`;
        
        contentEl.innerHTML = html;
        noteEl.appendChild(contentEl);
        
        // Actions
        const actionsEl = document.createElement('div');
        actionsEl.style.cssText = 'position: absolute; top: 5px; left: 5px; display: flex; gap: 5px; opacity: 1;'; 
        
        actionsEl.innerHTML = `
            <button type="button" class="btn btn-sm btn-light" style="padding: 1px 4px; font-size: 0.8rem;" onclick="enableInlineEdit(${index})" title="ערוך">✏️</button>
            <button type="button" class="btn btn-sm btn-light" style="padding: 1px 4px; font-size: 0.8rem; color: red;" onclick="deleteOrderNote(${index})" title="מחק">🗑️</button>
        `;
        
        noteEl.appendChild(actionsEl);
        historyDiv.appendChild(noteEl);
    });
}

async function addSupplierOrderNote() {
    const input = document.getElementById('new-order-note-input');
    const text = input.value.trim();
    if (!text) return;
    
    const user = localStorage.getItem('crm_username') || 'משתמש';
    const timestamp = new Date().toLocaleString('he-IL', { hour12: false });
    const newEntry = `📅 ${timestamp} | ${user}:\n${text}`; // Note: Separator added during join/save
    
    await saveNoteChange(newEntry, 'add');
    input.value = '';
}

function enableInlineEdit(index) {
    const editor = document.getElementById('order-notes');
    const fullText = editor.value;
    const notes = fullText.split(NOTE_SEPARATOR).map(n => n.trim()).filter(n => n);
    
    if (!notes[index]) return;

    const block = document.getElementById(`note-block-${index}`);
    if (!block) return;
    
    // Split header and content
    const noteParts = notes[index].split('\n');
    const header = noteParts[0]; // "📅 DATE | USER:"
    const content = noteParts.slice(1).join('\n'); // Everything else is content
    
    // Replace block content with editor
    block.style.padding = '2px';
    block.innerHTML = `
        <div style="font-size: 0.8rem; color: #666; margin-bottom: 1px; direction: rtl; text-align: right; line-height: 1.2;">${header}</div>
        <textarea id="note-edit-area-${index}" class="form-textarea" style="width: 100%; min-height: 100px; margin: 2px 0; padding: 6px; resize: vertical; box-sizing: border-box; line-height: 1.3;" rows="4">${content}</textarea>
        <div style="display: flex; gap: 5px; justify-content: flex-end; padding-left: 2px;">
            <button type="button" class="btn btn-sm btn-primary" onclick="saveInlineNote(${index})" style="padding: 2px 8px;">שמור</button>
            <button type="button" class="btn btn-sm btn-secondary" onclick="cancelInlineEdit()" style="padding: 2px 8px;">ביטול</button>
        </div>
    `;
}

async function saveInlineNote(index) {
    const textarea = document.getElementById(`note-edit-area-${index}`);
    if (!textarea) return;
    
    const editor = document.getElementById('order-notes');
    const fullText = editor.value;
    const notes = fullText.split(NOTE_SEPARATOR).map(n => n.trim()).filter(n => n);
    
    if (!notes[index]) return;
    
    // Reconstruct note: Header + New Content
    // Reconstruct note: Header + New Content
    // We assume the first line is ALWAYS the header generated by the system
    const firstLineBreak = notes[index].indexOf('\n');
    let header = notes[index];
    if (firstLineBreak !== -1) {
        header = notes[index].substring(0, firstLineBreak);
    }
    
    const newContent = textarea.value.trim();
    
    if (newContent) {
        const updatedNote = `${header}\n${newContent}`;
        await saveNoteChange(updatedNote, 'edit', index);
    }
}

function cancelInlineEdit() {
    // Just re-render from current state (discard changes)
    const editor = document.getElementById('order-notes');
    renderOrderNotes(editor.value);
}

async function deleteOrderNote(index) {
    const result = await Swal.fire({
        title: 'מחק הערה?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonText: 'ביטול',
        confirmButtonText: 'מחק'
    });

    if (result.isConfirmed) {
        await saveNoteChange(null, 'delete', index);
    }
}

async function saveNoteChange(content, action, index = null) {
    const editor = document.getElementById('order-notes');
    const orderId = document.getElementById('edit-supplier-order-id').value;
    let fullText = editor.value;
    let notes = fullText.split(NOTE_SEPARATOR).map(n => n.trim()).filter(n => n);
    
    if (action === 'add') {
        notes.push(content);
    } else if (action === 'edit') {
        notes[index] = content;
    } else if (action === 'delete') {
        notes.splice(index, 1);
    }
    
    const updatedFullText = notes.join(NOTE_SEPARATOR);
    
    // Update local state and UI
    editor.value = updatedFullText;
    renderOrderNotes(updatedFullText);
    
    // Save to DB
    try {
        const { error } = await supabaseClient
            .from('supplier_orders')
            .update({ notes: updatedFullText })
            .eq('order_id', orderId);
            
        if (error) throw error;
    } catch (e) {
        console.error(e);
        showAlert('שגיאה בשמירת הערות', 'error');
    }
}

function updateOrderItem(index, field, value) {
    if (field === 'color' && value === '__OTHER__') {
        const custom = prompt('הזן צבע חדש:');
        if (custom && custom.trim()) {
            currentOrderItems[index][field] = custom.trim();
        } else {
            // Do not update if cancelled
        }
    } else {
        currentOrderItems[index][field] = value;
    }
    renderSupplierOrderItems(); // Re-render to update totals
}

async function saveSupplierOrder(event) {
    event.preventDefault();
    
    const orderId = document.getElementById('edit-supplier-order-id').value;
    const author = localStorage.getItem('crm_username') || 'Unknown';
    
    // Prepare Notes: History + New Note
    let finalNotes = document.getElementById('order-notes').value;
    const newNoteInput = document.getElementById('new-order-note-input');
    const newNoteContent = newNoteInput ? newNoteInput.value.trim() : '';

    if (newNoteContent) {
        const now = new Date();
        const timestamp = now.toLocaleDateString('he-IL') + ', ' + now.toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit', second:'2-digit'});
        // Get current user name (assuming simple auth or 'משתמש')
        // Ideally fetch from session or config. Using hardcoded or simple retrieval if available.
        // Looking at other parts of app, 'שחר' is used in example, or we can use generic.
        // Let's use a generic 'משתמש' or try to find where user name is stored if poss.
        // For now, consistent with other parts:
        const userName = sessionStorage.getItem('userName') || 'שחר'; // Fallback or session
        const header = `📅 ${timestamp} | ${userName}:`;
        
        const newNoteEntry = `${header}\n${newNoteContent}`;
        
        if (finalNotes) {
            finalNotes = finalNotes + NOTE_SEPARATOR + newNoteEntry;
        } else {
            finalNotes = newNoteEntry;
        }
    }

    const orderData = {
        supplier_id: document.getElementById('order-supplier-select').value,
        order_status: document.getElementById('order-status').value,
        expected_date: document.getElementById('order-expected-date').value || null,
        created_at: document.getElementById('order-creation-date').value ? new Date(document.getElementById('order-creation-date').value).toISOString() : new Date().toISOString(),
        notes: finalNotes,
        total_amount: parseFloat(document.getElementById('supplier-order-total').textContent.replace(/[^\d.-]/g, ''))
    };
    
    try {
        let savedOrderId = orderId;
        
        if (orderId) {
            // Update Order
            const { error } = await supabaseClient.from('supplier_orders').update(orderData).eq('order_id', orderId);
            if (error) throw error;
            
            // Delete existing items (simple replace strategy)
            await supabaseClient.from('supplier_order_items').delete().eq('order_id', orderId);
        } else {
            // Create Order
            orderData.created_by = author;
            const { data, error } = await supabaseClient.from('supplier_orders').insert(orderData).select().single();
            if (error) throw error;
            savedOrderId = data.order_id;
        }
        
        // Insert Items
        if (currentOrderItems.length > 0) {
            const itemsToInsert = currentOrderItems.map(item => {
                // Combine description and color if color exists, as DB might not have color column
                let dbDescription = item.description;
                if (item.color && item.color.trim()) {
                    dbDescription = `${item.description} (${item.color})`;
                }

                return {
                    order_id: savedOrderId,
                    description: dbDescription,
                    // color: item.color || null, // Removed to avoid 400 error if column doesn't exist
                    sku: item.sku,
                    quantity: parseFloat(item.quantity),
                    unit_price: parseFloat(item.unit_price)
                };
            });
            
            const { error: itemsError } = await supabaseClient.from('supplier_order_items').insert(itemsToInsert);
            if (itemsError) throw itemsError;
        }
        
        showAlert('הזמנה נשמרה בהצלחה', 'success');
        closeSupplierOrderModal();
        loadSupplierOrders();
        
    } catch (e) {
        console.error(e);
        showAlert('שגיאה בשמירת הזמנה', 'error');
    }
}

async function deleteSupplier(supplierId) {
    const result = await Swal.fire({
        title: 'האם אתה בטוח?',
        text: "לא תוכל לשחזר את הספק הזה!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'כן, מחק!',
        cancelButtonText: 'ביטול'
    });

    if (result.isConfirmed) {
        try {
            const { error } = await supabaseClient
                .from('suppliers')
                .delete()
                .eq('supplier_id', supplierId);
            
            if (error) throw error;
            
            showAlert('הספק נמחק בהצלחה', 'success');
            await loadSuppliers();
            filterSuppliers();
        } catch (e) {
            console.error(e);
            showAlert('שגיאה במחיקת הספק: ' + e.message, 'error');
        }
    }
}

async function deleteSupplierOrder(orderId) {
    const result = await Swal.fire({
        title: 'האם אתה בטוח?',
        text: "לא תוכל לשחזר את ההזמנה הזו!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'כן, מחק!',
        cancelButtonText: 'ביטול'
    });
    if (result.isConfirmed) {
        try {
            const { error } = await supabaseClient
                .from('supplier_orders')
                .delete()
                .eq('order_id', orderId);
            
            if (error) throw error;
            
            logAction('delete', 'supplier_order', orderId, 'הזמנה', 'מחיקת הזמנת רכש');
            
            showAlert('ההזמנה נמחקה בהצלחה', 'success');
            await loadSupplierOrders();
        } catch (e) {
            console.error(e);
            showAlert('שגיאה במחיקת ההזמנה: ' + e.message, 'error');
        }
    }
}



async function exportSupplierOrderPDF() {
    // Determine currency logic from total element
    const totalElContent = document.getElementById('supplier-order-total').textContent;
    const isDollar = totalElContent.includes('$');
    const currencySym = isDollar ? '$' : '₪';

    // Get order ID from DOM
    const orderId = document.getElementById('edit-supplier-order-id').value;
    
    
    // Get notes text properly
    const notesContainer = document.getElementById('order-notes-history');
    let notesText = '';
    if (notesContainer) {
        const noteBlocks = notesContainer.querySelectorAll('div[id^="note-block-"]');
        noteBlocks.forEach(block => {
             const clone = block.cloneNode(true);
             const actions = clone.querySelector('div[style*="position: absolute"]');
             if (actions) actions.remove();
             notesText += clone.innerText + '\n\n';
        });
        if (notesText.trim() === '') notesText = notesContainer.innerText; 
    }
    
    // Fix parenthesis direction for PDF by injecting RLM markers
    if (notesText) {
        notesText = '\u200F' + notesText.replace(/\(/g, '\u200F(').replace(/\)/g, '\u200F)');
    }

    // Clone items
    const itemsTbody = document.getElementById('supplier-order-items-tbody');
    // Fetch real Order Number and Creation Date
    let displayOrderId = orderId ? orderId.slice(0, 6).toUpperCase() : '';
    let creationDate = new Date().toLocaleDateString('he-IL'); // Fallback

    try {
        const { data, error } = await supabaseClient
            .from('supplier_orders')
            .select('order_number, created_at')
            .eq('order_id', orderId)
            .single();
            
        if (data) {
            if (data.order_number) displayOrderId = data.order_number;
            if (data.created_at) creationDate = new Date(data.created_at).toLocaleDateString('he-IL');
        }
    } catch (e) {
        console.error('Could not fetch order details for PDF', e);
    }

    // Fix parenthesis direction for PDF by physically swapping them for the render
    // This is a workaround for the visual rendering issue where they appear reversed
    let processedNotes = '';
    if (notesText) {
        processedNotes = notesText.replace(/[()]/g, m => m === '(' ? ')' : '(');
    }

    // Show loading or feedback
    const supplierName = document.getElementById('view-order-supplier').textContent;
    const orderDate = document.getElementById('view-order-date').textContent; // This is expected date
    const orderStatus = document.getElementById('view-order-status').textContent;
    
    // Clone items
    const itemsRows = Array.from(itemsTbody.querySelectorAll('tr')).map(tr => {
       const cells = tr.querySelectorAll('td');
       // Assuming structure: Desc, Color, SKU, Qty, Unit, Total
       return {
           desc: cells[0].innerText,
           color: cells[1].innerText,
           sku: cells[2].innerText,
           qty: cells[3].innerText,
           price: cells[4].innerText,
           total: cells[5].innerText
       };
    });

    const totalText = document.getElementById('supplier-order-total').textContent;

    // Build PDF HTML
    const pdfContent = document.createElement('div');
    pdfContent.style.direction = 'rtl';
    pdfContent.style.fontFamily = 'Arial, Helvetica, sans-serif'; 
    pdfContent.style.fontSize = '13px'; // Increased from 12px
    pdfContent.style.padding = '20px';
    pdfContent.style.background = '#fff';
    pdfContent.style.color = '#333';
    pdfContent.style.width = '100%'; 
    pdfContent.style.textAlign = 'right';
    pdfContent.style.letterSpacing = '0.5px'; // Restored to prevent merged text

    pdfContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px;">
            <div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-bottom: 5px;">
                <h1 style="color: #2563eb; margin: 0; font-size: 22px;">הזמנת רכש</h1>
                <h1 style="color: #2563eb; margin: 0; font-size: 22px; direction: ltr;">#${displayOrderId}</h1>
            </div>
            <p style="margin: 5px 0 0; color: #666; font-size: 11px;">
                הופק ע"י: <span dir="ltr" style="display: inline-block;">CRM</span>&nbsp;מערכת ניהול
            </p>
        </div>

        <table style="width: 100%; border-collapse: separate; border-spacing: 15px 0; margin-bottom: 20px; table-layout: fixed;">
            <tr>
                <td style="width: 50%; vertical-align: top; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                    <h3 style="margin: 0 0 10px; color: #1e40af; font-size: 14px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">פרטי&nbsp;ספק</h3>
                    <div style="font-weight: bold; font-size: 13px; word-wrap: break-word; word-break: break-word; overflow-wrap: anywhere; line-height: 1.4; padding: 2px;" dir="auto">${supplierName}</div>
                </td>
                <td style="width: 50%; vertical-align: top; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                     <h3 style="margin: 0 0 10px; color: #1e40af; font-size: 14px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">פרטי&nbsp;הזמנה</h3>
                    <div style="margin-bottom: 5px;"><strong>תאריך&nbsp;ביצוע:</strong> <span dir="ltr" style="float: left;">${creationDate}</span></div>
                    <div style="margin-bottom: 5px; clear: both;"><strong>תאריך&nbsp;צפי:</strong> <span dir="ltr" style="float: left;">${orderDate}</span></div>
                    <div style="clear: both;"><strong>סטטוס:</strong> ${orderStatus}</div>
                </td>
            </tr>
        </table>

        <h3 style="border-right: 4px solid #2563eb; padding-right: 10px; margin-bottom: 10px; font-size: 16px;">פריטים</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
            <thead>
                <tr style="background: #2563eb; color: white;">
                    <th style="padding: 8px; text-align: right;">מוצר</th>
                    <th style="padding: 8px; text-align: right;">צבע</th>
                    <th style="padding: 8px; text-align: right;">מק"ט</th>
                    <th style="padding: 8px; text-align: center;">כמות</th>
                    <th style="padding: 8px; text-align: center;">מחיר יחידה</th>
                    <th style="padding: 8px; text-align: center;">סה"כ</th>
                </tr>
            </thead>
            <tbody>
                ${itemsRows.map((item, i) => `
                    <tr style="background: ${i % 2 === 0 ? '#fff' : '#f9fafb'}; border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 8px 5px;">${item.desc}</td>
                        <td style="padding: 8px;">${item.color}</td>
                        <td style="padding: 8px;">${item.sku}</td>
                        <td style="padding: 8px; text-align: center;">${item.qty}</td>
                        <td style="padding: 8px; text-align: center;">${item.price}</td>
                        <td style="padding: 8px; text-align: center; font-weight: bold;">${item.total}</td>
                    </tr>
                `).join('')}
                <tr style="background: #eff6ff; border-top: 2px solid #2563eb;">
                    <td colspan="5" style="padding: 10px; text-align: left; font-weight: bold; font-size: 14px;">סה"כ&nbsp;לתשלום:</td>
                    <td style="padding: 10px; text-align: center; font-weight: bold; font-size: 14px; color: #1e40af;">${totalText}</td>
                </tr>
            </tbody>
        </table>

         ${processedNotes.trim() ? `
        <div style="margin-top: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: right;">
            <h3 style="margin: 0 0 10px; color: #4b5563; font-size: 14px;">הערות&nbsp;והיסטוריה</h3>
            <div dir="rtl" style="white-space: pre-wrap; font-size: 11px; color: #666; line-height: 1.5;">${processedNotes}</div>
        </div>
        ` : ''}

        <div style="margin-top: 30px; text-align: center; color: #9ca3af; font-size: 10px;">
            המסמך הופק באופן אוטומטי בתאריך <span dir="ltr">${new Date().toLocaleDateString('he-IL')}</span>
        </div>
    `;

    // Configuration for html2pdf
    const opt = {
        margin: [10, 10, 10, 10], 
        filename: `הזמנת רכש (${creationDate}).pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true }, 
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Use html2pdf to download/open
    if (typeof html2pdf !== 'undefined') {
        html2pdf().set(opt).from(pdfContent).toPdf().get('pdf').then(function(pdf) {
            window.open(pdf.output('bloburl'), '_blank');
        }).catch(err => {
             console.error(err);
             showAlert('שגיאה ביצירת ה-PDF', 'error');
        });
    } else {
        showAlert('ספריית ה-PDF לא נטענה כראוי. אנא רענן את העמוד ונסה שוב.', 'error');
    }
}

// ============================================
// Mention Autocomplete System
// ============================================

let mentionSuggestionsContainer = null;
let currentMentionTextarea = null;
let mentionDebounceTimer = null;
let mentionCursorPosition = 0;

function setupMentionAutocomplete(textareaId) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;

    textarea.addEventListener('input', handleMentionInput);
    textarea.addEventListener('click', () => hideMentionSuggestions());
    textarea.addEventListener('blur', () => setTimeout(hideMentionSuggestions, 200)); // Delay to allow click
}

function handleMentionInput(e) {
    const textarea = e.target;
    currentMentionTextarea = textarea;
    const value = textarea.value;
    const cursor = textarea.selectionStart;
    mentionCursorPosition = cursor;

    // Look for @ symbol before cursor
    // We want the last @ that is not followed by a space (unless it's part of the search query?)
    // Simple logic: Look backwards from cursor to find @
    const textBeforeCursor = value.substring(0, cursor);
    const lastAt = textBeforeCursor.lastIndexOf('@');
    
    if (lastAt !== -1) {
        // Check if @ is at start or preceded by space
        const charBeforeAt = lastAt > 0 ? textBeforeCursor[lastAt - 1] : ' ';
        if (/\s/.test(charBeforeAt)) {
            const query = textBeforeCursor.substring(lastAt + 1);
            // Verify query doesn't contain newlines
            if (!query.includes('\n')) {
                 // Trigger search
                 if (mentionDebounceTimer) clearTimeout(mentionDebounceTimer);
                 mentionDebounceTimer = setTimeout(() => searchMentions(query), 300);
                 return;
            }
        }
    }
    
    hideMentionSuggestions();
}

async function searchMentions(query) {
    if (!currentMentionTextarea) return;

    // Prepare container
    if (!mentionSuggestionsContainer) {
        mentionSuggestionsContainer = document.createElement('div');
        mentionSuggestionsContainer.className = 'mention-suggestions';
        document.body.appendChild(mentionSuggestionsContainer);
    }

    // Determine position (Approximation: bottom of textarea)
    const rect = currentMentionTextarea.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Position below the textarea
    mentionSuggestionsContainer.style.top = (rect.bottom + scrollTop) + 'px';
    mentionSuggestionsContainer.style.left = rect.left + 'px';
    mentionSuggestionsContainer.style.width = rect.width + 'px';
    
    // Fetch Data
    try {
        // Search Deals
        const dealsPromise = supabaseClient
            .from('deals')
            .select('deal_id, deal_status, customers(business_name)')
            .or(`deal_id.textSearch.${query},deal_status.ilike.%${query}%`) // Basic search, might be limited
            .order('created_at', { ascending: false })
            .limit(5);

        // Search Supplier Orders
        const ordersPromise = supabaseClient
            .from('supplier_orders')
            .select('order_id, order_number, suppliers(supplier_name)')
             .or(`order_number.ilike.%${query}%`)
            .order('created_at', { ascending: false })
            .limit(5);
            
        // Note: For richer search (search business name via relation) Supabase postgrest is trickier.
        // We will do a broader search if query is empty or short, or do client side filtering if we have cache?
        // Let's do a tailored query.
        
        let deals = [];
        let orders = [];
        let contacts = [];
        
        // Fetch recent deals/orders if query is empty/short to show suggestions
        // Better: Search Deals join customers
        const { data: dealsData } = await supabaseClient
            .from('deals')
            .select('deal_id, customers!inner(business_name)')
            .ilike('customers.business_name', `%${query}%`)
            .limit(5);
            
        // Also search by Deal ID directly?
        // Merging results is complex in one query.
        
        // Simulating search for both Deal Name (Customer) and Order (Supplier)
        // This is a bit heavy, let's optimize:
        // Load recent active deals and recent active orders (limit 50) and filter in JS
        
        const { data: allDeals } = await supabaseClient
            .from('deals')
            .select('deal_id, deal_status, created_at, customers(business_name)')
            .order('created_at', { ascending: false })
            .limit(20);
            
        const { data: allOrders } = await supabaseClient
            .from('supplier_orders')
            .select('order_id, order_number, created_at, suppliers(supplier_name)')
            .order('created_at', { ascending: false })
            .limit(20);

        let allContacts = [];
        try {
            const { data, error } = await supabaseClient
                .from('contacts')
                .select('contact_id, contact_name, role, customer_id, customers(business_name)')
                .ilike('contact_name', `%${query}%`)
                .limit(5);
            if (error) throw error;
            allContacts = data;
        } catch (contactError) {
            console.error('Error searching contacts:', contactError);
            // Fallback: Try without relation if relation failed
            try {
                 const { data, error } = await supabaseClient
                    .from('contacts')
                    .select('contact_id, contact_name, role, customer_id')
                    .ilike('contact_name', `%${query}%`)
                    .limit(5);
                 if (!error) allContacts = data;
            } catch(e) {}
        }

        // Post-processing: Ensure customer names are present
        // This handles cases where the join failed or we used the fallback
        const contactsMissingCustomer = allContacts.filter(c => !c.customers?.business_name && c.customer_id);
        if (contactsMissingCustomer.length > 0) {
            try {
                const custIds = [...new Set(contactsMissingCustomer.map(c => c.customer_id))];
                const { data: customersData } = await supabaseClient
                    .from('customers')
                    .select('customer_id, business_name')
                    .in('customer_id', custIds);
                
                if (customersData) {
                    const custMap = {};
                    customersData.forEach(c => custMap[c.customer_id] = c.business_name);
                    
                    allContacts.forEach(c => {
                        if ((!c.customers || !c.customers.business_name) && c.customer_id && custMap[c.customer_id]) {
                            c.customers = { business_name: custMap[c.customer_id] };
                        }
                    });
                }
            } catch (err) {
                console.error('Error fetching missing customer names:', err);
            }
        }
            
        const qLower = query.toLowerCase();
        
        deals = (allDeals || []).filter(d => 
            (d.customers?.business_name || '').toLowerCase().includes(qLower) || 
            String(d.deal_id).includes(qLower)
        ).slice(0, 5);
        
        orders = (allOrders || []).filter(o => 
            (o.suppliers?.supplier_name || '').toLowerCase().includes(qLower) || 
            String(o.order_number || o.order_id).toLowerCase().includes(qLower)
        ).slice(0, 5);

        contacts = (allContacts || []);
        
        renderMentionSuggestions(deals, orders, contacts, query);
        
    } catch (e) {
        console.error('Mention search error:', e);
    }
}

function renderMentionSuggestions(deals, orders, contacts, query) {
    if (!mentionSuggestionsContainer) return;
    
    // Check if contacts is array (it might be undefined if called from old code, but we updated caller)
    // Safe check
    const contactsList = Array.isArray(contacts) ? contacts : [];

    if (deals.length === 0 && orders.length === 0 && contactsList.length === 0) {
        hideMentionSuggestions();
        return;
    }
    
    let html = '';
    
    deals.forEach(deal => {
        const date = deal.created_at ? new Date(deal.created_at).toLocaleDateString('he-IL') : '';
        const businessName = deal.customers?.business_name || 'לקוח';
        const dealDisplayName = `הצעת מחיר עבור ${businessName} ${date}`;
        
        html += `
            <div class="mention-item" onclick="insertMention('Deal', '${deal.deal_id}', '${dealDisplayName}')">
                <div class="mention-main">${businessName} <span class="mention-type deal">עסקה</span></div>
                <div class="mention-sub" style="font-size: 0.8rem; color: #64748b;">${dealDisplayName}</div>
            </div>
        `;
    });
    
    orders.forEach(order => {
        const orderNum = order.order_number || order.order_id.slice(0,8);
        html += `
            <div class="mention-item" onclick="insertMention('Order', '${order.order_id}', 'הזמנה: ${order.suppliers?.supplier_name || 'ללא שם'}')">
                <div class="mention-main">${order.suppliers?.supplier_name || 'ספק'} <span class="mention-type order">רכש</span></div>
                <div class="mention-sub">#${orderNum}</div>
            </div>
        `;
    });

    contactsList.forEach(contact => {
        let customerName = '';
        if (contact.customers) {
            if (Array.isArray(contact.customers) && contact.customers.length > 0) {
                 customerName = contact.customers[0].business_name;
            } else if (contact.customers.business_name) {
                 customerName = contact.customers.business_name;
            }
        }
        const role = contact.role ? `(${contact.role})` : '';
        html += `
            <div class="mention-item" onclick="insertMention('Contact', '${contact.contact_id}', '${contact.contact_name}')">
                <div class="mention-main">${contact.contact_name} ${role} <span class="mention-type contact" style="background: #d1fae5; color: #065f46;">איש קשר</span></div>
                <div class="mention-sub">${customerName}</div>
            </div>
        `;
    });
    
    mentionSuggestionsContainer.innerHTML = html;
    mentionSuggestionsContainer.style.display = 'block';
}

function insertMention(type, id, label) {
    if (!currentMentionTextarea) return;
    
    const value = currentMentionTextarea.value;
    const textBefore = value.substring(0, mentionCursorPosition);
    const lastAt = textBefore.lastIndexOf('@');
    const textAfter = value.substring(mentionCursorPosition);
    
    // Construct mentions tag: @[Type:ID|Label]
    const tag = `@[${type}:${id}|${label}] `;
    
    currentMentionTextarea.value = value.substring(0, lastAt) + tag + textAfter;
    
    hideMentionSuggestions();
    currentMentionTextarea.focus();
}

function hideMentionSuggestions() {
    if (mentionSuggestionsContainer) {
        mentionSuggestionsContainer.style.display = 'none';
    }
}

function formatActivityText(text) {
    if (!text) return '';
    
    // First, linkify URLs (simple regex)
    // Avoid replacing URLs that might be inside the mention format if that ever happens (unlikely for now)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    text = text.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color); text-decoration: underline;">${url}</a>`;
    });

    return text.replace(/@\[(Deal|Order|Contact):([^\|]+)\|([^\]]+)\]/g, (match, type, id, label) => {
        let onclick = '';
        let color = '';
        
        if (type === 'Deal') {
            onclick = `viewDealDetails('${id}')`;
            color = '#1e40af'; // Blue-ish
        } else if (type === 'Order') {
            onclick = `viewSupplierOrder('${id}')`;
            color = '#9d174d'; // Pink-ish
        } else if (type === 'Contact') {
            onclick = `viewContactDetails('${id}')`;
            color = '#065f46'; // Green-ish
        }
        
        return `<a href="javascript:void(0)" onclick="${onclick}" style="color: ${color}; font-weight: 500; text-decoration: underline; background: #f1f5f9; padding: 0 4px; border-radius: 4px;">${label}</a>`;
    });
}


// Helper for Autocomplete Links
function viewSupplierOrder(orderId) {
    if (typeof openSupplierOrderModal === 'function') {
        openSupplierOrderModal(orderId, true);
    } else {
        console.error('openSupplierOrderModal not found');
    }
}

// ============================================
// Quick Navigation Logic
// ============================================

const NAV_SECTIONS = [
    { id: 'deals', name: '➕ עסקה חדשה', icon: '➕' },
    { id: 'thisweek', name: '📅 השבוע', icon: '📅' },
    { id: 'history', name: '💼 עסקאות', icon: '💼' },
    { id: 'activities', name: '📝 פעילויות', icon: '📝' },
    { id: 'customers', name: '🏢 לקוחות', icon: '🏢' },
    { id: 'contacts', name: '👤 אנשי קשר', icon: '👤' },
    { id: 'suppliers', name: '🏭 ספקים', icon: '🏭' },
    { id: 'supplier-orders', name: '🚛 הזמנות רכש', icon: '🚛' },
    { id: 'products', name: '📦 מוצרים', icon: '📦' },
    { id: 'auditlog', name: '📋 פעולות', icon: '📋' },
    { id: 'reports', name: '📊 דוחות', icon: '📊' },
    { id: 'search', name: '🔍 חיפוש', icon: '🔍' }
];

function initQuickNav() {
    renderQuickNav();
}

function renderQuickNav() {
    const container = document.getElementById('quick-nav-buttons');
    if (!container) return;
    
    // Default preferences
    const defaultPrefs = ['deals', 'customers', 'thisweek'];
    let prefs = defaultPrefs;
    
    try {
        const saved = localStorage.getItem('quick_nav_prefs');
        if (saved) prefs = JSON.parse(saved);
        // Validate prefs exist in current sections
        prefs = prefs.filter(id => NAV_SECTIONS.some(s => s.id === id));
        if (prefs.length < 3) {
             // Fill missing with defaults if invalid
             const uniqueDefaults = defaultPrefs.filter(d => !prefs.includes(d));
             prefs = [...prefs, ...uniqueDefaults].slice(0, 3);
        }
    } catch(e) {
        console.error('Error loading nav prefs', e);
        prefs = defaultPrefs;
    }
    
    let html = '';
    prefs.forEach(prefId => {
        const section = NAV_SECTIONS.find(s => s.id === prefId);
        if (section) {
            // Strip emoji for clean button text if desired, or keep it. Keeping it matches dropdown.
            html += `
                <button type="button" class="btn btn-secondary" onclick="quickNavigate('${section.id}')" style="justify-content: center; padding: 0.75rem; font-weight: 500; border-radius: 8px; box-shadow: var(--shadow-sm); transition: all 0.2s;">
                    ${section.name}
                </button>
            `;
        }
    });
    
    container.innerHTML = html;
}

function quickNavigate(sectionId) {
    const navSelect = document.getElementById('main-navigation');
    if (navSelect) {
        navSelect.value = sectionId;
        navSelect.dispatchEvent(new Event('change'));
    }
}

async function configureQuickNav() {
    // Current prefs
    let prefs = ['deals', 'customers', 'thisweek']; // fallback
    try {
        const saved = localStorage.getItem('quick_nav_prefs');
        if (saved) prefs = JSON.parse(saved);
    } catch(e) {}
    
    // Build Options HTML
    const buildOptions = (selectedId) => {
        return NAV_SECTIONS.map(s => `
            <option value="${s.id}" ${s.id === selectedId ? 'selected' : ''}>${s.name}</option>
        `).join('');
    };
    
    const { value: formValues } = await Swal.fire({
        title: 'הגדרת ניווט מהיר',
        html: `
            <div style="text-align: right;">
                <label style="display:block; margin-bottom:5px;">כפתור 1:</label>
                <select id="swal-nav-1" class="swal2-input" style="margin: 0 0 15px 0; width: 100%; direction: rtl;">
                    ${buildOptions(prefs[0] || 'deals')}
                </select>
                
                <label style="display:block; margin-bottom:5px;">כפתור 2:</label>
                <select id="swal-nav-2" class="swal2-input" style="margin: 0 0 15px 0; width: 100%; direction: rtl;">
                    ${buildOptions(prefs[1] || 'customers')}
                </select>
                
                <label style="display:block; margin-bottom:5px;">כפתור 3:</label>
                <select id="swal-nav-3" class="swal2-input" style="margin: 0 0 15px 0; width: 100%; direction: rtl;">
                    ${buildOptions(prefs[2] || 'thisweek')}
                </select>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'שמור',
        cancelButtonText: 'ביטול',
        preConfirm: () => {
            return [
                document.getElementById('swal-nav-1').value,
                document.getElementById('swal-nav-2').value,
                document.getElementById('swal-nav-3').value
            ];
        }
    });

    if (formValues) {
        localStorage.setItem('quick_nav_prefs', JSON.stringify(formValues));
        renderQuickNav();
        showAlert('ההגדרות נשמרו בהצלחה', 'success');
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initQuickNav);
