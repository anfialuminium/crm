// ============================================
// CRM System - Main Application Logic
// ============================================

// Supabase Configuration
const SUPABASE_URL = 'https://abqracafkjerlcemqnva.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFicXJhY2Fma2plcmxjZW1xbnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDk1NTYsImV4cCI6MjA4MDMyNTU1Nn0.WejWdsYxqC7ESs3C8UkGhWUpnDJ7xD5j4-n9BKRE7rE';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
let dealItems = [];
let itemCounter = 0;

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
    
    // Update empty state
    updateEmptyState();
    
    console.log('✅ CRM System ready!');
}

// ============================================
// Tab Navigation
// ============================================

function setupTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.add('hidden');
            });
            
            // Show selected tab content
            const tabName = tab.dataset.tab;
            document.getElementById(`${tabName}-tab`).classList.remove('hidden');
            
            // Load data for specific tabs
            if (tabName === 'customers') {
                displayCustomers();
            } else if (tabName === 'products') {
                displayProducts();
            } else if (tabName === 'history') {
                loadDealsHistory();
            } else if (tabName === 'activities') {
                loadActivities();
            } else if (tabName === 'contacts') {
                displayContacts();
            }
        });
    });
}

// ============================================
// Data Loading Functions
// ============================================

async function loadProducts() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('active', true)
            .order('product_name');
        
        if (error) throw error;
        
        products = data || [];
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
            const result = await supabase
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
            const result = await supabase
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
        populateCustomerDropdown();
        
    } catch (error) {
        console.error('❌ Error loading customers:', error);
        showAlert('שגיאה בטעינת לקוחות', 'error');
    }
}

function populateCustomerDropdown() {
    const select = document.getElementById('customer-select');
    select.innerHTML = '<option value="">-- בחר לקוח קיים --</option>';
    
    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.customer_id;
        option.textContent = `${customer.business_name} - ${customer.contact_name || ''} (${customer.phone || ''})`;
        select.appendChild(option);
    });
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
    } else {
        colorCell.textContent = '-';
        colorCell.style.textAlign = 'center';
        colorCell.style.color = 'var(--text-tertiary)';
    }
    
    // Size
    const sizeCell = document.createElement('td');
    if (item.requires_size) {
        const sizeInput = document.createElement('input');
        sizeInput.type = 'text';
        sizeInput.className = 'form-input';
        sizeInput.value = item.size;
        sizeInput.placeholder = 'מידה';
        sizeInput.style.width = '100px';
        sizeInput.addEventListener('input', (e) => {
            item.size = e.target.value;
        });
        sizeCell.appendChild(sizeInput);
    } else {
        sizeCell.textContent = '-';
        sizeCell.style.textAlign = 'center';
        sizeCell.style.color = 'var(--text-tertiary)';
    }
    
    // Total
    const totalCell = document.createElement('td');
    const total = item.quantity * item.unit_price;
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

// ============================================
// Calculations
// ============================================

function calculateTotal() {
    const subtotal = dealItems.reduce((sum, item) => {
        return sum + (item.quantity * item.unit_price);
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
            return;
        }
        
        if (dealItems.length === 0) {
            showAlert('אנא הוסף לפחות מוצר אחד', 'warning');
            return;
        }
        
        // Validate required fields for each item
        for (const item of dealItems) {
            if (!item.product_id) {
                showAlert('אנא בחר מוצר לכל השורות', 'warning');
                return;
            }
            
            if (item.requires_color && !item.color) {
                showAlert('אנא הזן צבע למוצרים הדורשים זאת', 'warning');
                return;
            }
            
            if (item.requires_size && !item.size) {
                showAlert('אנא הזן מידה למוצרים הדורשים זאת', 'warning');
                return;
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
            // Update existing deal
            const { data: updatedDeal, error: dealError } = await supabase
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
            const { error: deleteError } = await supabase
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
            
            const { error: itemsError } = await supabase
                .from('deal_items')
                .insert(itemsToInsert);
            
            if (itemsError) throw itemsError;
            
            showAlert('✅ העסקה עודכנה בהצלחה!', 'success');
            
        } else {
            // Insert new deal
            const { data: dealData, error: dealError } = await supabase
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
            
            const { error: itemsError } = await supabase
                .from('deal_items')
                .insert(itemsToInsert);
            
            if (itemsError) throw itemsError;
            
            showAlert('✅ העסקה נשמרה בהצלחה!', 'success');
        }
        
        // Reload deals history to reflect changes
        const currentTab = document.querySelector('.nav-tab.active')?.dataset.tab;
        if (currentTab === 'history') {
            await loadDealsHistory();
        }
        
        // Reset form
        setTimeout(() => {
            resetForm();
        }, 1500);
        
    } catch (error) {
        console.error('❌ Error saving deal:', error);
        showAlert('שגיאה בשמירת העסקה: ' + error.message, 'error');
    }
}

// ============================================
// Customer Management
// ============================================

function openNewCustomerModal() {
    document.getElementById('customer-modal').classList.add('active');
}

function closeCustomerModal() {
    const modal = document.getElementById('customer-modal');
    const form = document.getElementById('customer-form');
    
    modal.classList.remove('active');
    form.reset();
    delete form.dataset.customerId;
    
    // Reset modal title
    document.querySelector('#customer-modal .modal-header h2').textContent = 'לקוח חדש';
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
            result = await supabase
                .from('customers')
                .update(customerData)
                .eq('customer_id', customerId)
                .select()
                .single();
        } else {
            // Create new customer
            result = await supabase
                .from('customers')
                .insert(customerData)
                .select()
                .single();
        }
        
        if (result.error) throw result.error;
        
        const savedCustomer = result.data;
        
        // Create contact if contact details were provided (only for new customers)
        if (!customerId && contactName) {
            try {
                const contactData = {
                    contact_name: contactName,
                    role: contactRole || null,
                    phone: contactPhone || null,
                    email: contactEmail || null,
                    customer_id: savedCustomer.customer_id,
                    created_by: localStorage.getItem('crm_username') || 'משתמש מערכת'
                };
                
                const { data: newContact, error: contactError } = await supabase
                    .from('contacts')
                    .insert(contactData)
                    .select()
                    .single();
                
                if (!contactError && newContact) {
                    // Set as primary contact
                    await supabase
                        .from('customers')
                        .update({ primary_contact_id: newContact.contact_id })
                        .eq('customer_id', savedCustomer.customer_id);
                    
                    console.log('✅ Created primary contact for customer');
                }
            } catch (contactErr) {
                // Contact creation failed - maybe table doesn't exist yet
                console.log('ℹ️ Could not create contact (table may not exist):', contactErr.message);
            }
        }
        
        showAlert(customerId ? '✅ הלקוח עודכן בהצלחה!' : '✅ הלקוח נשמר בהצלחה!', 'success');
        
        // Reload customers and select the new/updated one if on deals tab
        await loadCustomers();
        
        const currentTab = document.querySelector('.nav-tab.active').dataset.tab;
        if (currentTab === 'customers') {
            displayCustomers();
        } else if (!customerId) {
            // Only select if it's a new customer and we're on deals tab
            document.getElementById('customer-select').value = savedCustomer.customer_id;
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
    
    if (customers.length === 0) {
        container.innerHTML = '<p class="text-center" style="padding: 2rem; color: var(--text-tertiary);">אין לקוחות במערכת</p>';
        return;
    }
    
    const grid = document.createElement('div');
    grid.className = 'deals-grid';
    
    customers.forEach(customer => {
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
                    <span class="deal-card-value">${contactPhone}</span>
                </div>
                <div class="deal-card-info">
                    <span class="deal-card-label">אימייל:</span>
                    <span class="deal-card-value">${contactEmail}</span>
                </div>
                <div class="deal-card-info">
                    <span class="deal-card-label">עיר:</span>
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
    
    container.innerHTML = '';
    container.appendChild(grid);
}

// ============================================
// Customer Management
// ============================================

function editCustomer(customer) {
    // Populate the modal with customer data
    document.getElementById('new-business-name').value = customer.business_name || '';
    document.getElementById('new-contact-name').value = customer.contact_name || '';
    const roleField = document.getElementById('new-contact-role');
    if (roleField) roleField.value = '';  // Role is not stored in legacy customer table
    document.getElementById('new-phone').value = customer.phone || '';
    document.getElementById('new-email').value = customer.email || '';
    document.getElementById('new-city').value = customer.city || '';
    document.getElementById('new-customer-type').value = customer.customer_type || '';
    document.getElementById('new-source').value = customer.source || '';
    document.getElementById('new-notes').value = customer.notes || '';
    
    // Store customer ID for update
    document.getElementById('customer-form').dataset.customerId = customer.customer_id;
    
    // Change modal title
    document.querySelector('#customer-modal .modal-header h2').textContent = 'ערוך לקוח';
    
    openNewCustomerModal();
}

async function deleteCustomer(customerId) {
    if (!confirm('האם אתה בטוח שברצונך למחוק לקוח זה? פעולה זו תמחק גם את כל העסקאות הקשורות אליו.')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('customer_id', customerId);
        
        if (error) throw error;
        
        showAlert('✅ הלקוח נמחק בהצלחה', 'success');
        
        await loadCustomers();
        displayCustomers();
        
    } catch (error) {
        console.error('❌ Error deleting customer:', error);
        showAlert('שגיאה במחיקת הלקוח: ' + error.message, 'error');
    }
}

// ============================================
// Customer Details & Notes
// ============================================

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
        const { data: customer, error } = await supabase
            .from('customers')
            .select('*')
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
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3 style="margin: 0; color: var(--primary-color);">${customer.business_name}</h3>
                    ${customer.customer_type ? `<span class="badge ${typeBadgeClass}">${customer.customer_type}</span>` : ''}
                </div>
                <div class="form-grid">
                    <div class="deal-card-info">
                        <span class="deal-card-label">איש קשר:</span>
                        <span class="deal-card-value">${customer.contact_name || '-'}</span>
                    </div>
                    <div class="deal-card-info">
                        <span class="deal-card-label">טלפון:</span>
                        <span class="deal-card-value">${customer.phone || '-'}</span>
                    </div>
                    <div class="deal-card-info">
                        <span class="deal-card-label">אימייל:</span>
                        <span class="deal-card-value">${customer.email || '-'}</span>
                    </div>
                    <div class="deal-card-info">
                        <span class="deal-card-label">עיר:</span>
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
                <h4 style="margin-bottom: 1rem;">⭐ איש קשר מוביל</h4>
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
                        <textarea id="customer-new-note" class="form-textarea" rows="2" 
                                  placeholder="הקלד הערה חדשה..." required></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary">💾 שמור הערה</button>
                </form>
            </div>
            
            <!-- Notes List -->
            <div>
                <h4 style="margin-bottom: 1rem;">📋 הערות קודמות</h4>
                <div id="customer-notes-list">
                    <div class="spinner"></div>
                </div>
            </div>
        `;
        
        // Load contacts for this customer
        loadCustomerContacts(customerId, customer.primary_contact_id);
        
        // Load notes
        loadCustomerNotes(customerId);
        
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
}

async function loadCustomerContacts(customerId, primaryContactId) {
    const select = document.getElementById('customer-primary-contact');
    const container = document.getElementById('customer-contacts-list');
    
    select.innerHTML = '<option value="">-- ללא איש קשר מוביל --</option>';
    container.innerHTML = '<div class="spinner"></div>';
    
    try {
        const { data: customerContacts, error } = await supabase
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
                <div style="display: inline-block; background: var(--bg-secondary); padding: 0.3rem 0.6rem; border-radius: 15px; margin: 0.2rem; font-size: 0.85rem;">
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
        const { error } = await supabase
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
        const { data: notes, error } = await supabase
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
        const { error } = await supabase
            .from('activities')
            .insert({
                customer_id: customerId,
                activity_type: 'הערה',
                description: noteText,
                created_by: author
            });
        
        if (error) throw error;
        
        document.getElementById('customer-new-note').value = '';
        showAlert('✅ ההערה נוספה בהצלחה', 'success');
        loadCustomerNotes(customerId);
        
    } catch (error) {
        console.error('❌ Error adding customer note:', error);
        showAlert('שגיאה בהוספת ההערה: ' + error.message, 'error');
    }
}

async function editCustomerNote(activityId) {
    const newText = prompt('ערוך את ההערה:');
    if (newText === null) return;
    
    const editor = localStorage.getItem('crm_username') || 'משתמש מערכת';
    
    try {
        const { error } = await supabase
            .from('activities')
            .update({
                description: newText,
                edited_at: new Date().toISOString(),
                edited_by: editor
            })
            .eq('activity_id', activityId);
        
        if (error) throw error;
        
        showAlert('✅ ההערה עודכנה בהצלחה', 'success');
        
        const customerId = document.getElementById('customer-details-modal').dataset.currentCustomerId;
        loadCustomerNotes(customerId);
        
    } catch (error) {
        console.error('❌ Error editing customer note:', error);
        showAlert('שגיאה בעריכת ההערה: ' + error.message, 'error');
    }
}

async function deleteCustomerNote(activityId) {
    if (!confirm('האם אתה בטוח שברצונך למחוק הערה זו?')) return;
    
    try {
        const { error } = await supabase
            .from('activities')
            .delete()
            .eq('activity_id', activityId);
        
        if (error) throw error;
        
        showAlert('✅ ההערה נמחקה בהצלחה', 'success');
        
        const customerId = document.getElementById('customer-details-modal').dataset.currentCustomerId;
        loadCustomerNotes(customerId);
        
    } catch (error) {
        console.error('❌ Error deleting customer note:', error);
        showAlert('שגיאה במחיקת ההערה: ' + error.message, 'error');
    }
}

// ============================================
// Contacts Management
// ============================================

async function loadContacts() {
    try {
        // First, try simple query to load contacts
        const { data, error } = await supabase
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
            const { error } = await supabase.from('contacts').select('contact_id').limit(1);
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

function filterContacts() {
    const container = document.getElementById('contacts-list');
    
    const searchQuery = document.getElementById('filter-contact-search')?.value.toLowerCase() || '';
    const customerFilter = document.getElementById('filter-contact-customer')?.value || '';
    const sortBy = document.getElementById('filter-contact-sort')?.value || 'name-asc';
    
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
    
    const grid = document.createElement('div');
    grid.className = 'deals-grid';
    
    filteredContacts.forEach(contact => {
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
                    <span class="deal-card-value">${contact.phone || '-'}</span>
                </div>
                <div class="deal-card-info">
                    <span class="deal-card-label">אימייל:</span>
                    <span class="deal-card-value">${contact.email || '-'}</span>
                </div>
                ${contact.notes ? `
                    <div class="deal-card-info" style="grid-column: 1 / -1;">
                        <span class="deal-card-label">הערות:</span>
                        <span class="deal-card-value">${contact.notes}</span>
                    </div>
                ` : ''}
            </div>
            <div class="deal-card-footer">
                <div class="deal-card-actions" style="margin-right: auto;">
                    <button class="btn btn-secondary btn-icon" onclick='editContact(${JSON.stringify(contact).replace(/'/g, "&apos;")})' title="ערוך">
                        ✏️
                    </button>
                    <button class="btn btn-danger btn-icon" onclick="deleteContact('${contact.contact_id}')" title="מחק">
                        🗑️
                    </button>
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });
    
    container.innerHTML = '';
    
    const countInfo = document.createElement('p');
    countInfo.style.cssText = 'margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem;';
    countInfo.textContent = `מציג ${filteredContacts.length} מתוך ${contacts.length} אנשי קשר`;
    container.appendChild(countInfo);
    
    container.appendChild(grid);
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
                            <input type="tel" id="contact-phone" class="form-input">
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
    
    // Reset or populate form
    if (contact) {
        document.getElementById('contact-name').value = contact.contact_name || '';
        document.getElementById('contact-role').value = contact.role || '';
        document.getElementById('contact-phone').value = contact.phone || '';
        document.getElementById('contact-email').value = contact.email || '';
        document.getElementById('contact-customer').value = contact.customer_id || '';
        document.getElementById('contact-notes').value = contact.notes || '';
        document.getElementById('contact-form').dataset.contactId = contact.contact_id;
        document.querySelector('#contact-modal .modal-header h2').textContent = '✏️ ערוך איש קשר';
    } else {
        document.getElementById('contact-form').reset();
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
    
    const contactData = {
        contact_name: document.getElementById('contact-name').value,
        role: document.getElementById('contact-role').value || null,
        phone: document.getElementById('contact-phone').value || null,
        email: document.getElementById('contact-email').value || null,
        customer_id: document.getElementById('contact-customer').value || null,
        notes: document.getElementById('contact-notes').value || null
    };
    
    try {
        if (contactId) {
            // Update
            const { error } = await supabase
                .from('contacts')
                .update(contactData)
                .eq('contact_id', contactId);
            
            if (error) throw error;
            showAlert('✅ איש הקשר עודכן בהצלחה', 'success');
        } else {
            // Insert
            contactData.created_by = author;
            const { error } = await supabase
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

async function deleteContact(contactId) {
    if (!confirm('האם אתה בטוח שברצונך למחוק איש קשר זה?')) {
        return;
    }
    
    try {
        const { error } = await supabase
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

function filterProducts() {
    const container = document.getElementById('products-list');
    
    // Get filter values
    const searchQuery = document.getElementById('filter-product-search')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('filter-product-category')?.value || '';
    const sortBy = document.getElementById('filter-product-sort')?.value || 'name-asc';
    
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
                return (a.category || 'ת').localeCompare(b.category || 'ת', 'he');
            default:
                return 0;
        }
    });
    
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
    
    const grid = document.createElement('div');
    grid.className = 'products-grid';
    
    filteredProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        // Check if product has an image URL
        const imageSection = product.image_url 
            ? `<div class="product-card-image">
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
    
    container.innerHTML = '';
    
    // Add count info
    const countInfo = document.createElement('p');
    countInfo.style.cssText = 'margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem;';
    countInfo.textContent = `מציג ${filteredProducts.length} מתוך ${products.length} מוצרים`;
    container.appendChild(countInfo);
    
    container.appendChild(grid);
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
            result = await supabase
                .from('products')
                .update(productData)
                .eq('product_id', productId)
                .select()
                .single();
        } else {
            // Create new product
            result = await supabase
                .from('products')
                .insert(productData)
                .select()
                .single();
        }
        
        if (result.error) throw result.error;
        
        showAlert(productId ? '✅ המוצר עודכן בהצלחה!' : '✅ המוצר נוסף בהצלחה!', 'success');
        
        closeProductModal();
        await loadProducts();
        displayProducts();
        
    } catch (error) {
        console.error('❌ Error saving product:', error);
        showAlert('שגיאה בשמירת המוצר: ' + error.message, 'error');
    }
}

async function deleteProduct(productId) {
    if (!confirm('האם אתה בטוח שברצונך למחוק מוצר זה? פעולה זו אינה ניתנת לביטול.')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('product_id', productId);
        
        if (error) throw error;
        
        showAlert('✅ המוצר נמחק בהצלחה', 'success');
        
        await loadProducts();
        displayProducts();
        
    } catch (error) {
        console.error('❌ Error deleting product:', error);
        showAlert('שגיאה במחיקת המוצר: ' + error.message, 'error');
    }
}

// ============================================
// Deals History Management
// ============================================

async function loadDealsHistory() {
    const container = document.getElementById('deals-list');
    container.innerHTML = '<div class="spinner"></div>';
    
    try {
        // Get filter values
        const statusFilter = document.getElementById('filter-status')?.value || '';
        const customerFilter = document.getElementById('filter-customer')?.value.toLowerCase() || '';
        const sortFilter = document.getElementById('filter-sort')?.value || 'newest';
        
        // Build query
        let query = supabase
            .from('deals')
            .select(`
                *,
                customers (
                    business_name,
                    contact_name,
                    phone
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
        
        const dealsGrid = document.createElement('div');
        dealsGrid.className = 'deals-grid';
        
        filteredDeals.forEach(deal => {
            const card = createDealCard(deal);
            dealsGrid.appendChild(card);
        });
        
        container.innerHTML = '';
        container.appendChild(dealsGrid);
        
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
            <span class="badge ${statusBadgeClass}">${deal.deal_status}</span>
        </div>
        <div class="deal-card-body">
            <div class="deal-card-info">
                <span class="deal-card-label">איש קשר:</span>
                <span class="deal-card-value">${deal.customers.contact_name || '-'}</span>
            </div>
            <div class="deal-card-info">
                <span class="deal-card-label">טלפון:</span>
                <span class="deal-card-value">${deal.customers.phone || '-'}</span>
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
        const { data: deal, error: dealError } = await supabase
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
        const { data: items, error: itemsError } = await supabase
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
        
        const date = new Date(deal.created_at).toLocaleDateString('he-IL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
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
                    <h3>עסקה #${deal.deal_id.substring(0, 8)}</h3>
                    <span class="badge ${statusBadgeClass}">${deal.deal_status}</span>
                </div>
                <p style="color: var(--text-secondary);">נוצרה ב: ${date}</p>
            </div>
            
            <div class="customer-section" style="margin-bottom: 2rem;">
                <h3 style="margin-bottom: 1rem;">פרטי לקוח</h3>
                <div class="customer-details">
                    <p><strong>שם העסק:</strong> ${deal.customers.business_name}</p>
                    <p><strong>איש קשר:</strong> ${deal.customers.contact_name || '-'}</p>
                    <p><strong>טלפון:</strong> ${deal.customers.phone || '-'}</p>
                    <p><strong>אימייל:</strong> ${deal.customers.email || '-'}</p>
                    <p><strong>עיר:</strong> ${deal.customers.city || '-'}</p>
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
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>מוצר</th>
                            <th>כמות</th>
                            <th>מחיר יחידה</th>
                            <th>צבע</th>
                            <th>מידה</th>
                            <th>סה"כ</th>
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
                    <span class="summary-label">סה"כ לתשלום:</span>
                    <span class="summary-value summary-total">₪${(deal.final_amount || 0).toFixed(2)}</span>
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
        const { data: notes, error } = await supabase
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
                        <strong>${note.activity_type}:</strong> ${note.description}
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

        const { error } = await supabase
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
async function deleteNote(activityId) {
    if (!confirm('האם אתה בטוח שברצונך למחוק את ההערה?')) {
        return;
    }
    try {
        const { error } = await supabase
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
}

// Edit a note/activity - opens a modal to edit all properties
async function editNote(activityId) {
    // Fetch current note
    const { data: note, error } = await supabase
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
                        <label class="form-label">או קשר ללקוח (אם אין עסקה)</label>
                        <select id="edit-activity-customer" class="form-select">
                            <option value="">-- ללא לקוח --</option>
                        </select>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label class="form-label">שם העורך</label>
                        <input type="text" id="edit-activity-editor" class="form-input" placeholder="הזן את שמך">
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
    
    // Populate and set deal dropdown
    populateEditActivityDeals(activity.deal_id);
    
    // Populate and set customer dropdown
    populateEditActivityCustomers(activity.customer_id);
    
    modal.classList.add('active');
}

async function populateEditActivityDeals(currentDealId) {
    const select = document.getElementById('edit-activity-deal');
    select.innerHTML = '<option value="">-- ללא עסקה --</option>';
    
    try {
        const { data: deals, error } = await supabase
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
            if (deal.deal_id === currentDealId) {
                option.selected = true;
            }
            select.appendChild(option);
        });
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
    const dealId = document.getElementById('edit-activity-deal').value;
    const customerId = document.getElementById('edit-activity-customer').value;
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
            edited_at: new Date().toISOString(),
            edited_by: editor
        };
        
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
            const { data: deal } = await supabase
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
        
        const { error: updError } = await supabase
            .from('activities')
            .update(updateData)
            .eq('activity_id', activityId);
            
        if (updError) throw updError;
        
        showAlert('✅ הפעילות עודכנה בהצלחה', 'success');
        closeEditActivityModal();
        
        // Reload notes for current deal
        const currentDealId = document.getElementById('deal-modal').dataset.currentDealId;
        if (currentDealId) {
            loadDealNotes(currentDealId);
        }
        
        // Also reload activities tab if visible
        const activitiesTab = document.getElementById('activities-tab');
        if (activitiesTab && !activitiesTab.classList.contains('hidden')) {
            loadActivities();
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

function openNewActivityModal() {
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
                        <label class="form-label">או קשר ללקוח (אם אין עסקה)</label>
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
    
    modal.classList.add('active');
}

async function populateNewActivityDeals() {
    const select = document.getElementById('new-activity-deal');
    select.innerHTML = '<option value="">-- ללא עסקה --</option>';
    
    try {
        const { data: deals, error } = await supabase
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
            const { data: deal } = await supabase
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
        
        const { error } = await supabase
            .from('activities')
            .insert(activityData);
        
        if (error) throw error;
        
        showAlert('✅ הפעילות נוספה בהצלחה', 'success');
        closeNewActivityModal();
        
        // Reload activities
        loadActivities();
        
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
        const { error } = await supabase
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

async function deleteDeal(dealId) {
    if (!confirm('האם אתה בטוח שברצונך למחוק עסקה זו? פעולה זו אינה ניתנת לביטול.')) {
        return;
    }
    
    try {
        // Delete deal items first (cascade should handle this, but being explicit)
        const { error: itemsError } = await supabase
            .from('deal_items')
            .delete()
            .eq('deal_id', dealId);
        
        if (itemsError) throw itemsError;
        
        // Delete deal
        const { error: dealError } = await supabase
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
}

async function editDeal(dealId) {
    try {
        // Fetch deal with all related data
        const { data: deal, error: dealError } = await supabase
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
        const { data: items, error: itemsError } = await supabase
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
        document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        
        const dealsTab = document.querySelector('[data-tab="deals"]');
        dealsTab.classList.add('active');
        document.getElementById('deals-tab').classList.remove('hidden');
        
        // Populate form
        document.getElementById('customer-select').value = deal.customer_id;
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
        
        // Switch to deals tab
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        
        document.querySelector('[data-tab="deals"]').classList.add('active');
        document.getElementById('deals-tab').classList.remove('hidden');

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

async function deleteActivity(activityId) {
    if (!confirm('האם אתה בטוח שברצונך למחוק פעילות זו? פעולה זו אינה ניתנת לביטול.')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('activities')
            .delete()
            .eq('activity_id', activityId);
        
        if (error) throw error;
        
        showAlert('✅ הפעילות נמחקה בהצלחה', 'success');
        
        // Reload activities
        loadActivities();
        
    } catch (error) {
        console.error('❌ Error deleting activity:', error);
        showAlert('שגיאה במחיקת הפעילות: ' + error.message, 'error');
    }
}

async function loadActivities() {
    const container = document.getElementById('activities-list');
    container.innerHTML = '<div class="spinner"></div>';
    
    try {
        // Get filter values
        const typeFilter = document.getElementById('filter-activity-type')?.value || '';
        const statusFilter = document.getElementById('filter-activity-status')?.value || '';
        const searchFilter = document.getElementById('filter-activity-search')?.value.toLowerCase() || '';
        const sortFilter = document.getElementById('filter-activity-sort')?.value || 'activity-date';
        
        // Build query - exclude "הערה" type
        let query = supabase
            .from('activities')
            .select(`
                *,
                deals (
                    deal_id,
                    deal_status,
                    customers (
                        business_name,
                        contact_name
                    )
                ),
                customers (
                    customer_id,
                    business_name,
                    contact_name
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
        
        // Execute query
        const { data: activities, error } = await query;
        
        if (error) throw error;
        
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
                default:
                    return 0;
            }
        });
        
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
        
        const activitiesGrid = document.createElement('div');
        activitiesGrid.className = 'deals-grid';
        
        filteredActivities.forEach(activity => {
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
            
            // Get customer info - first from deal, then from direct customer link
            let businessName = 'לא משויך';
            let contactName = '';
            
            if (activity.deals?.customers) {
                businessName = activity.deals.customers.business_name || 'לא משויך';
                contactName = activity.deals.customers.contact_name || '';
            } else if (activity.customers) {
                businessName = activity.customers.business_name || 'לא משויך';
                contactName = activity.customers.contact_name || '';
            }
            
            const completedBadge = activity.completed 
                ? `<span class="badge badge-won" style="display: block; text-align: center; margin-top: 0.5rem; margin-left: 1rem;">בוצע</span>`
                : `<span class="badge badge-pending" style="display: block; text-align: center; margin-top: 0.5rem; margin-left: 1rem;">ממתין</span>`;
            
            card.innerHTML = `
                <div class="deal-card-header">
                    <div style="display: flex; flex-direction: column; align-items: flex-start; margin-left: 1.5rem;">
                        <div class="deal-card-title" style="margin-bottom: 0;">${icon} ${activity.activity_type}</div>
                        ${completedBadge}
                        <div class="deal-card-date" style="margin-top: 0.5rem;">נוצר ב: ${createdDate}</div>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.3rem; align-items: flex-start;">
                        ${activity.deals ? `<button class="btn btn-sm btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="viewDealDetails('${activity.deal_id}')">👁️</button>` : ''}
                        <button class="btn btn-sm btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="editNote('${activity.activity_id}')">✏️</button>
                        <button class="btn btn-sm ${activity.completed ? 'btn-secondary' : 'btn-success'}" 
                                style="padding: 0.25rem 0.5rem; font-size: 0.75rem;"
                                onclick="toggleActivityCompletion('${activity.activity_id}', ${!activity.completed})">
                            ${activity.completed ? '↩️' : '✓'}
                        </button>
                        <button class="btn btn-sm btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="deleteActivity('${activity.activity_id}')">🗑️</button>
                    </div>
                </div>
                <div class="deal-card-body">
                    <div class="deal-card-info" style="grid-column: 1 / -1;">
                        <span class="deal-card-label">תיאור:</span>
                        <span class="deal-card-value" style="${activity.completed ? 'text-decoration: line-through;' : ''}">${activity.description || '-'}</span>
                    </div>
                    ${activityDate ? `
                        <div class="deal-card-info" style="grid-column: 1 / -1;">
                            <span class="deal-card-label">תאריך יעד/פעילות:</span>
                            <span class="deal-card-value" style="color: var(--primary-color); font-weight: 500;">${activityDate}</span>
                        </div>
                    ` : ''}
                    ${activity.completed && activity.completed_at ? `
                        <div class="deal-card-info" style="grid-column: 1 / -1;">
                            <span class="deal-card-label">בוצע ב:</span>
                            <span class="deal-card-value" style="color: var(--success-color);">${new Date(activity.completed_at).toLocaleString('he-IL')}</span>
                        </div>
                    ` : ''}
                    <div class="deal-card-info">
                        <span class="deal-card-label">לקוח:</span>
                        <span class="deal-card-value">${businessName}</span>
                    </div>
                    ${contactName ? `
                        <div class="deal-card-info">
                            <span class="deal-card-label">איש קשר:</span>
                            <span class="deal-card-value">${contactName}</span>
                        </div>
                    ` : ''}
                    <div class="deal-card-info">
                        <span class="deal-card-label">נוצר על ידי:</span>
                        <span class="deal-card-value">${activity.created_by || 'משתמש מערכת'}</span>
                    </div>
                </div>
            `;
            
            activitiesGrid.appendChild(card);
        });
        
        container.innerHTML = '';
        container.appendChild(activitiesGrid);
        
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
        
        const { error } = await supabase
            .from('activities')
            .update(updateData)
            .eq('activity_id', activityId);
        
        if (error) throw error;
        
        showAlert(completed ? '✅ הפעילות סומנה כבוצעה' : '↩️ הפעילות סומנה כממתינה', 'success');
        
        // Reload activities
        loadActivities();
        
    } catch (error) {
        console.error('❌ Error toggling activity completion:', error);
        showAlert('שגיאה בעדכון סטטוס הפעילות: ' + error.message, 'error');
    }
}

// ============================================
// PDF Quote Generation
// ============================================

async function generateQuotePDF() {
    const dealId = document.getElementById('deal-modal').dataset.currentDealId;
    
    if (!dealId) {
        showAlert('לא נמצאה עסקה פעילה', 'error');
        return;
    }
    
    try {
        showAlert('מייצר הצעת מחיר...', 'info');
        
        // Fetch full deal data
        const { data: deal, error: dealError } = await supabase
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
        const { data: items, error: itemsError } = await supabase
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
        
        // Build the quote HTML with page-break-inside: avoid for sections
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
                    <img src="./logo.png" alt="אנפי ייבוא ושיווק" style="height: 80px; margin-bottom: 1rem;">
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
                    <p style="color: #475569; margin: 0.25rem 0;"><strong style="color: #1e293b;">עיר:</strong> ${deal.customers.city || '-'}</p>
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
                </ul>
            </div>
            
            <!-- Footer -->
            <div class="quote-footer" style="margin-top: 3rem; text-align: center; color: #94a3b8; font-size: 0.9rem;">
                <p>תודה על פנייתך! נשמח לעמוד לשירותך בכל שאלה.</p>
                <p style="margin-top: 1rem;">© ${new Date().getFullYear()} אנפי ייבוא ושיווק פרזול ואלומיניום</p>
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
        const fileName = `הצעת_מחיר_${deal.customers.business_name}_${quoteDate}.pdf`;
        pdf.save(fileName);
        
        // Clean up
        document.body.removeChild(quoteContainer);
        
        showAlert('✅ הצעת המחיר יוצאה בהצלחה!', 'success');
        
    } catch (error) {
        console.error('❌ Error generating PDF:', error);
        showAlert('שגיאה ביצירת הצעת מחיר: ' + error.message, 'error');
    }
}

// ============================================
// Utility Functions
// ============================================

function resetForm() {
    document.getElementById('customer-select').value = '';
    document.getElementById('deal-status').value = 'חדש';
    document.getElementById('deal-notes').value = '';
    document.getElementById('discount-percentage').value = '0';
    
    dealItems = [];
    renderDealItems();
    updateEmptyState();
    calculateTotal();
    
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
    supabase,
    loadProducts,
    loadCustomers,
    saveDeal,
    resetForm
};
