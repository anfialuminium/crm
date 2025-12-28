// ============================================
// CRM System - Accessible Version Logic
// ============================================

// Supabase Configuration (Copied from app.js)
const SUPABASE_URL = 'https://abqracafkjerlcemqnva.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFicXJhY2Fma2plcmxjZW1xbnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDk1NTYsImV4cCI6MjA4MDMyNTU1Nn0.WejWdsYxqC7ESs3C8UkGhWUpnDJ7xD5j4-n9BKRE7rE';

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State
let products = [];
let customers = [];
let currentDealItems = [];
let itemCounter = 0;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    showScreen('main');
});

function formatAccDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    
    // Format: "יום א', 28.12.25"
    const weekday = d.toLocaleDateString('he-IL', { weekday: 'short' });
    const date = d.toLocaleDateString('he-IL', { 
        day: '2-digit', 
        month: '2-digit', 
        year: '2-digit' 
    });
    return `${weekday}, ${date}`;
}

async function loadData() {
    try {
        // Load Products
        const { data: pData, error: pError } = await supabaseClient
            .from('products')
            .select('*')
            .eq('active', true)
            .order('product_name');
        if (pError) throw pError;
        products = pData || [];

        // Load Customers
        const { data: cData, error: cError } = await supabaseClient
            .from('customers')
            .select('*')
            .eq('active', true)
            .order('business_name');
        if (cError) throw cError;
        customers = cData || [];

        setupCustomerSearch();
        console.log('✅ נתונים נטענו בהצלחה');
    } catch (err) {
        console.error('❌ שגיאה בטעינת נתונים:', err);
        alert('שגיאה בתקשורת עם השרת. וודא שיש אינטרנט.');
    }
}

// Navigation
function showScreen(screenId) {
    document.querySelectorAll('.container > div:not(header)').forEach(div => {
        div.classList.add('hidden');
    });
    
    const target = document.getElementById(`screen-${screenId}`);
    if (target) {
        target.classList.remove('hidden');
    }

    if (screenId === 'history') {
        loadAccDeals('acc-deals-list', '');
    }

    if (screenId === 'search') {
        document.getElementById('acc-history-search').value = '';
        loadAccDeals('acc-search-list', '');
        setTimeout(() => document.getElementById('acc-history-search').focus(), 100);
    }

    if (screenId === 'new-deal') {
        resetNewDealForm();
    }
}

// Customer Search Logic
function setupCustomerSearch() {
    const input = document.getElementById('acc-customer-search');
    const results = document.getElementById('acc-customer-results');
    const hiddenId = document.getElementById('acc-customer-id');
    const selectedName = document.getElementById('selected-customer-name');

    input.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if (query.length < 1) {
            results.classList.add('hidden');
            return;
        }

        const filtered = customers.filter(c => 
            c.business_name.toLowerCase().includes(query) || 
            (c.contact_name && c.contact_name.toLowerCase().includes(query))
        ).slice(0, 10);

        results.innerHTML = '';
        if (filtered.length === 0) {
            results.innerHTML = '<div class="search-result-item">לא נמצאו תוצאות</div>';
        } else {
            filtered.forEach(c => {
                const div = document.createElement('div');
                div.className = 'search-result-item';
                div.innerHTML = `<strong>${c.business_name}</strong><br><span style="font-size:0.9rem; color:#666;">👤 ${c.contact_name || ''}</span>`;
                div.onclick = () => {
                    hiddenId.value = c.customer_id;
                    selectedName.textContent = `🎯 נבחר: ${c.business_name}`;
                    selectedName.classList.remove('hidden');
                    input.value = '';
                    results.classList.add('hidden');
                };
                results.appendChild(div);
            });
        }
        results.classList.remove('hidden');
    });

    // Close results on blur
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !results.contains(e.target)) {
            results.classList.add('hidden');
        }
    });
}

// New Deal Logic
function resetNewDealForm() {
    currentDealItems = [];
    itemCounter = 0;
    document.getElementById('acc-customer-id').value = '';
    document.getElementById('acc-customer-search').value = '';
    document.getElementById('selected-customer-name').classList.add('hidden');
    document.getElementById('acc-items-list').innerHTML = '';
    addAccItem();
    updateTotal();
}

function addAccItem() {
    const id = `item-${itemCounter++}`;
    const item = { id, product_id: '', quantity: '', price: '' };
    currentDealItems.push(item);

    const div = document.createElement('div');
    div.className = 'item-row';
    div.id = id;
    div.innerHTML = `
        <select class="input-big" onchange="updateItemProduct('${id}', this.value)">
            <option value="">מוצר</option>
            ${products.map(p => `<option value="${p.product_id}">${p.product_name}</option>`).join('')}
        </select>
        <div id="size-container-${id}" class="hidden size-field">
            <!-- Dynamically populated by updateItemProduct -->
        </div>
        <div id="color-container-${id}" class="hidden color-field">
            <!-- Dynamically populated by updateItemProduct -->
        </div>
        <input type="number" class="input-big" value="" min="1" oninput="updateItemQty('${id}', this.value)" placeholder="כמות">
        <input type="number" class="input-big" value="" step="0.5" oninput="updateItemPrice('${id}', this.value)" id="price-${id}" placeholder="מחיר">
        <button onclick="removeAccItem('${id}')" class="btn-remove">×</button>
    `;
    document.getElementById('acc-items-list').appendChild(div);
}

function updateItemProduct(id, productId) {
    const item = currentDealItems.find(i => i.id === id);
    if (!item) return;
    
    const product = products.find(p => p.product_id === productId);
    item.product_id = productId;
    item.price = product ? (product.price || 0) : 0;
    
    // Check if size is required
    const sizeContainer = document.getElementById(`size-container-${id}`);
    if (product && product.requires_size) {
        sizeContainer.classList.remove('hidden');
        
        // Check for pull handles (ידית משיכה)
        if (product.product_name.includes('ידית משיכה')) {
            const sizes = ['35/50', '50/70', '70/100', '90/120'];
            sizeContainer.innerHTML = `
                <select class="input-big" onchange="updateItemSize('${id}', this.value)">
                    <option value="">מידה</option>
                    ${sizes.map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>
            `;
            item.size = ''; // Reset size when changing product
        } else {
            sizeContainer.innerHTML = `
                <input type="text" class="input-big" oninput="updateItemSize('${id}', this.value)" placeholder="מידה">
            `;
            item.size = '';
        }
    } else {
        sizeContainer.classList.add('hidden');
        sizeContainer.innerHTML = '';
        item.size = '';
    }

    // Check if color is required (specifically for handles or based on DB)
    const colorContainer = document.getElementById(`color-container-${id}`);
    const isHandle = product && (product.product_name.includes('ידית משיכה בודדת') || product.product_name.includes('ידית משיכה כפולה'));
    
    if (isHandle || (product && product.requires_color)) {
        colorContainer.classList.remove('hidden');
        const colors = ['נירוסטה', 'שחור'];
        colorContainer.innerHTML = `
            <select class="input-big" onchange="updateItemColor('${id}', this.value)">
                <option value="">צבע</option>
                ${colors.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
        `;
        item.color = '';
    } else {
        colorContainer.classList.add('hidden');
        colorContainer.innerHTML = '';
        item.color = '';
    }

    // If quantity is currently empty or 0, set to 1
    if (!item.quantity) {
        item.quantity = 1;
        const qtyInput = document.querySelector(`#${id} input[type="number"][placeholder="כמות"]`);
        if (qtyInput) qtyInput.value = 1;
    }
    
    // Update price input
    const priceInput = document.getElementById(`price-${id}`);
    if (priceInput) priceInput.value = item.price;
    
    updateTotal();
}

function updateItemSize(id, size) {
    const item = currentDealItems.find(i => i.id === id);
    if (item) item.size = size;
}

function updateItemColor(id, color) {
    const item = currentDealItems.find(i => i.id === id);
    if (item) item.color = color;
}

function updateItemQty(id, qty) {
    const item = currentDealItems.find(i => i.id === id);
    if (item) item.quantity = parseFloat(qty) || 0;
    updateTotal();
}

function updateItemPrice(id, price) {
    const item = currentDealItems.find(i => i.id === id);
    if (item) item.price = parseFloat(price) || 0;
    updateTotal();
}

function removeAccItem(id) {
    currentDealItems = currentDealItems.filter(i => i.id !== id);
    document.getElementById(id).remove();
    updateTotal();
}

function updateTotal() {
    const total = currentDealItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    document.getElementById('acc-total-amount').textContent = `₪${total.toFixed(2)}`;
}

async function saveAccDeal() {
    const customerId = document.getElementById('acc-customer-id').value;
    if (!customerId) {
        alert('אנא בחר לקוח תחילה');
        return;
    }

    const validItems = currentDealItems.filter(i => i.product_id);
    if (validItems.length === 0) {
        alert('אנא הוסף לפחות מוצר אחד');
        return;
    }

    try {
        const subtotal = validItems.reduce((sum, i) => sum + (i.quantity * i.price), 0);
        
        // 1. Create Deal
        const { data: deal, error: dError } = await supabaseClient
            .from('deals')
            .insert({
                customer_id: customerId,
                deal_status: 'זכייה',
                total_amount: subtotal,
                final_amount: subtotal,
                discount_percentage: 0,
                discount_amount: 0,
                notes: 'נוצר דרך הממשק הנגיש',
                created_by: 'עופר'
            })
            .select()
            .single();

        if (dError) throw dError;

        // 2. Create Deal Items
        const itemsToInsert = validItems.map(i => ({
            deal_id: deal.deal_id,
            product_id: i.product_id,
            quantity: i.quantity,
            unit_price: i.price,
            size: i.size || null,
            color: i.color || null
        }));

        const { error: iError } = await supabaseClient
            .from('deal_items')
            .insert(itemsToInsert);

        if (iError) throw iError;

        alert('✅ העסקה נשמרה בהצלחה!');
        showScreen('main');
    } catch (err) {
        console.error('❌ שגיאה בשמירת עסקה:', err);
        alert('שגיאה בשמירה. נסה שוב.');
    }
}

// History & Search Logic
async function loadAccDeals(containerId, searchQuery = '') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Convert searchQuery to lower case if it's a string
    const q = (searchQuery || '').toLowerCase();

    try {
        let query = supabaseClient
            .from('deals')
            .select(`
                *,
                customers (business_name)
            `)
            .order('created_at', { ascending: false })
            .limit(50);

        const { data: deals, error } = await query;
        if (error) throw error;

        let filtered = deals || [];
        if (q) {
            filtered = filtered.filter(d => 
                d.customers.business_name.toLowerCase().includes(q)
            );
        }

        if (filtered.length === 0) {
            container.innerHTML = `<div class="text-center" style="padding:40px;"><p>${q ? 'לא נמצאו עסקאות מתאימות' : 'אין עסקאות להצגה'}</p></div>`;
            return;
        }

        container.innerHTML = filtered.map(d => {
            const date = formatAccDate(d.created_at);
            return `
                <div class="deal-card">
                    <div class="deal-info">
                        <h3>${d.customers.business_name}</h3>
                        <p>📅 ${date} | 📝 ${d.deal_status === 'זכייה' ? 'נסגר' : d.deal_status}</p>
                    </div>
                    <div class="deal-amount">
                        ₪${(d.final_amount || 0).toLocaleString()}
                    </div>
                    <button onclick="viewDealDetails('${d.deal_id}')" class="btn-big btn-outline" style="width:auto; margin:0; padding:8px 16px; font-size:1rem;">פרטים</button>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('❌ שגיאה בטעינת היסטוריה:', err);
        container.innerHTML = '<p class="text-center">שגיאה בטעינת הנתונים</p>';
    }
}

async function viewDealDetails(dealId) {
    try {
        const { data: items, error } = await supabaseClient
            .from('deal_items')
            .select(`
                *,
                products (product_name)
            `)
            .eq('deal_id', dealId);

        if (error) throw error;

        let html = '<h2 class="section-title">פרטי עסקה</h2><div style="font-size:1.2rem; margin-top:20px;">';
        items.forEach(item => {
            html += `
                <div style="border-bottom:1px solid #eee; padding:12px 0;">
                    <strong>${item.products.product_name}</strong><br>
                    כמות: ${item.quantity} | מחיר: ₪${item.unit_price} | סה"כ: ₪${(item.quantity * item.unit_price).toFixed(2)}
                </div>
            `;
        });
        html += '</div>';

        const modalBody = document.getElementById('acc-modal-body');
        modalBody.innerHTML = html;
        document.getElementById('acc-modal').classList.add('active');

    } catch (err) {
        console.error('❌ שגיאה בטעינת פרטים:', err);
        alert('שגיאה בטעינת פרטי העסקה');
    }
}

function closeAccModal() {
    document.getElementById('acc-modal').classList.remove('active');
}
