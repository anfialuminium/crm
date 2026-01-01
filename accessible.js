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
let orderColors = []; // Supplier order colors
let globalAccCategories = [];
let isAccDataLoaded = false;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
});

function showAlert(message, type = 'info') {
    const container = document.getElementById('alert-container');
    if (!container) return;
    
    const alertBox = document.createElement('div');
    alertBox.className = `alert-box alert-${type}`;
    alertBox.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="background:none; border:none; color:white; font-size:1.5rem; cursor:pointer; margin-right:15px;">&times;</button>
    `;
    
    container.appendChild(alertBox);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertBox.parentElement) {
            alertBox.style.opacity = '0';
            alertBox.style.transition = 'opacity 0.5s';
            setTimeout(() => alertBox.remove(), 500);
        }
    }, 5000);
}

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
            .order('category', { ascending: true })
            .order('sku', { ascending: true });
        if (pError) throw pError;
        products = (pData || []).map(p => {
            let category = p.category ? p.category.trim() : '';
            const productName = p.product_name ? p.product_name.trim() : '';
            if (!category && (productName.includes('מברשת') || (p.description && p.description.includes('מברשת')))) {
                category = 'מברשות';
            }
            if (category === 'אביזרים') {
                category = 'מוצרים נוספים';
            }
            return { ...p, category: category || 'אחר' };
        });
        
        globalAccCategories = [...new Set(products.map(p => p.category))];

        // Load Customers
        const { data: cData, error: cError } = await supabaseClient
            .from('customers')
            .select('*')
            .eq('active', true)
            .order('business_name');
        if (cError) throw cError;
        customers = cData || [];

        // Load Supplier Order Colors
        const { data: colorData, error: colorError } = await supabaseClient
            .from('product_colors')
            .select('*')
            .eq('active', true)
            .order('color_name');
        if (colorError) throw colorError;
        orderColors = colorData || [];

        setupCustomerSearch();
        
        // --- Logical Sorting ---
        const categoryOrder = {
            'גלגלים': 10,
            'ידיות': 20,
            'מברשות': 30,
            'רשתות': 40,
            'מוצרים נוספים': 50
        };

        const getCategoryScore = (cat) => categoryOrder[cat] || 999;

        // Sort products globally by category score and then Name (Logical Order)
        products.sort((a, b) => {
            const catScoreA = getCategoryScore(a.category);
            const catScoreB = getCategoryScore(b.category);
            if (catScoreA !== catScoreB) return catScoreA - catScoreB;
            
            // Primary sort by Name (more logical for humans: 7000 < 7300 < 9000)
            const nameA = a.product_name || '';
            const nameB = b.product_name || '';
            
            const nameComp = nameA.localeCompare(nameB, 'he', { numeric: true, sensitivity: 'base' });
            if (nameComp !== 0) return nameComp;

            // Fallback to SKU
            const skuA = a.sku || '';
            const skuB = b.sku || '';
            return skuA.localeCompare(skuB, undefined, { numeric: true, sensitivity: 'base' });
        });

        // Re-generate categories based on sorted products
        globalAccCategories = [...new Set(products.map(p => p.category))];
        
        setupAccFilters();
        
        isAccDataLoaded = true;
        console.log('✅ נתונים נטענו בסדר הגיוני');
    } catch (err) {
        console.error('❌ שגיאה בטעינת נתונים:', err);
        showAlert('שגיאה בתקשורת עם השרת. וודא שיש אינטרנט.', 'error');
    }
}

function setupAccFilters() {
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1, currentYear - 2];
    let yearOptions = '<option value="">כל השנים</option>';
    yearOptions += years.map(y => `<option value="${y}">${y}</option>`).join('');
    
    ['acc-history-year', 'acc-search-year'].forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = yearOptions;
            // Default to "All Years" to show THE LATEST deals immediately
            select.value = "";
        }
    });
}

// Navigation
function showScreen(screenId) {
    if (!isAccDataLoaded && screenId !== 'main') {
        showAlert('המערכת מעדכנת נתונים, אנא נסה שוב בעוד רגע...', 'info');
        return;
    }
    document.querySelectorAll('.container > div:not(header)').forEach(div => {
        div.classList.add('hidden');
    });
    
    const target = document.getElementById(`screen-${screenId}`);
    if (target) {
        target.classList.remove('hidden');
    }

    if (screenId === 'history') {
        const m = document.getElementById('acc-history-month')?.value || '';
        const y = document.getElementById('acc-history-year')?.value || '';
        loadAccDeals('acc-deals-list', '', m, y);
    }

    if (screenId === 'search') {
        document.getElementById('acc-history-search').value = '';
        const m = document.getElementById('acc-search-month')?.value || '';
        const y = document.getElementById('acc-search-year')?.value || '';
        loadAccDeals('acc-search-list', '', m, y);
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
    const item = { id, product_id: '', quantity: '', price: '', is_fin_brush: false, is_roll: false, length: 1 };
    currentDealItems.push(item);

    const div = document.createElement('div');
    div.className = 'item-row';
    div.id = id;
    
    // Create categories container
    const categoriesDiv = document.createElement('div');
    categoriesDiv.className = 'acc-category-pills';
    
    globalAccCategories.forEach(cat => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'acc-category-pill';
        pill.textContent = cat;
        pill.onclick = () => {
            categoriesDiv.querySelectorAll('.acc-category-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            updateAccDropdown(id, cat);
        };
        categoriesDiv.appendChild(pill);
    });

    div.innerHTML = `
        <div style="width: 100%;">
            <div id="categories-container-${id}" style="margin-bottom: 20px;"></div>
            <div style="margin-bottom: 12px;">
                <label style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 8px;">בחר מוצר:</label>
                <select class="input-big" id="product-select-${id}" onchange="updateItemProduct('${id}', this.value)">
                    <option value="">בחר קטגוריה קודם</option>
                </select>
            </div>
            <div id="size-container-${id}" class="hidden size-field" style="margin-bottom: 12px;"></div>
            <div id="roll-container-${id}" class="hidden roll-field" style="margin: 12px 0; padding: 16px; background: #fdf2f8; border-radius: 12px; border: 2px solid #fbcfe8;"></div>
            <div id="color-container-${id}" class="hidden color-field" style="margin-bottom: 12px;"></div>
            <div id="fin-container-${id}" class="hidden fin-field" style="margin: 16px 0; padding: 16px; background: #eff6ff; border-radius: 12px; border: 2px solid #bfdbfe;"></div>
            <div style="display: grid; grid-template-columns: 1fr; gap: 20px; margin-top: 20px;">
                <div>
                    <label style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 8px; display: block;">כמות:</label>
                    <div class="stepper-container">
                        <button type="button" class="stepper-btn" onclick="accStepQty('${id}', -1)">-</button>
                        <input type="text" id="qty-${id}" class="stepper-input" value="" inputmode="decimal" dir="ltr" oninput="updateItemQty('${id}', this.value)" placeholder="כמות">
                        <button type="button" class="stepper-btn" onclick="accStepQty('${id}', 1)">+</button>
                    </div>
                </div>
                <div>
                    <label id="price-label-${id}" style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 8px; display: block;">מחיר (₪):</label>
                    <div class="stepper-container">
                        <button type="button" class="stepper-btn" onclick="accStepPrice('${id}', -1)">-</button>
                        <input type="text" class="stepper-input" value="" inputmode="decimal" dir="ltr" oninput="updateItemPrice('${id}', this.value)" id="price-${id}" placeholder="מחיר">
                        <button type="button" class="stepper-btn" onclick="accStepPrice('${id}', 1)">+</button>
                    </div>
                </div>
            </div>
        </div>
        <button onclick="removeAccItem('${id}')" class="btn-remove" style="position: absolute; top: -12px; left: -12px;">×</button>
    `;
    
    document.getElementById('acc-items-list').appendChild(div);
    document.getElementById(`categories-container-${id}`).appendChild(categoriesDiv);
}

function updateAccDropdown(id, category) {
    const select = document.getElementById(`product-select-${id}`);
    const filtered = products.filter(p => p.category === category);
    
    select.innerHTML = `<option value="">בחר ${category}</option>`;
    filtered.forEach(p => {
        const option = document.createElement('option');
        option.value = p.product_id;
        option.textContent = p.product_name;
        select.appendChild(option);
    });
}

function updateItemProduct(id, productId) {
    const item = currentDealItems.find(i => i.id === id);
    if (!item) return;
    
    const product = products.find(p => p.product_id === productId);
    item.product_id = productId;
    item.price = product ? (product.price || 0) : 0;
    item.is_fin_brush = false; // Reset fin option on product change
    
    const isBrush = product && (product.product_name.includes('מברשת') || (product.category && product.category.includes('מברשות')));
    const isMesh = product && !isBrush && (product.product_name.includes('רשת') || (product.category && product.category.includes('רשתות')));

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
        } else if (isMesh) {
            const screenWidths = ['0.50', '0.60', '0.70', '0.80', '0.90', '1.00', '1.10', '1.20', '1.50', '1.80', '2.00', '2.50'];
            sizeContainer.innerHTML = `
                <div style="margin-bottom: 8px;">
                    <label style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 4px; display: block;">רוחב:</label>
                    <select class="input-big" onchange="updateItemSize('${id}', this.value)">
                        <option value="">בחר רוחב</option>
                        ${screenWidths.map(w => `<option value="${w}" ${item.size === w ? 'selected' : ''}>${w}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 4px; display: block;">אורך (מטר):</label>
                    <input type="text" class="input-big" id="size-input-${id}" inputmode="decimal" dir="ltr" oninput="updateItemLength('${id}', this.value)" value="${item.length || 1}" placeholder="אורך">
                </div>
            `;
        } else if (isBrush) {
            let brushSizes = ['רגיל', '12', '15', '20'];
            if (product.product_name.includes('הדבקה')) {
                brushSizes = ['5 מטר', '200 מטר'];
            }
            sizeContainer.innerHTML = `
                <select class="input-big" onchange="updateItemSize('${id}', this.value)">
                    <option value="">מידה</option>
                    ${brushSizes.map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>
            `;
            item.size = '';
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

    // Check if color is required
    const colorContainer = document.getElementById(`color-container-${id}`);
    const isPullHandle = product && product.product_name.includes('ידית משיכה');
    const isRegularHandle = product && product.product_name.includes('ידית') && !isPullHandle;
    
    if (isMesh) {
        colorContainer.classList.remove('hidden');
        colorContainer.innerHTML = `
            <label style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 8px; display: block;">צבע:</label>
            <select class="input-big" onchange="updateItemColor('${id}', this.value)">
                <option value="">בחר צבע</option>
                <option value="שחור" ${item.color === 'שחור' ? 'selected' : ''}>שחור</option>
                <option value="אפור" ${item.color === 'אפור' ? 'selected' : ''}>אפור</option>
            </select>
        `;
    } else if (isPullHandle) {
        colorContainer.classList.remove('hidden');
        const pullColors = ['נירוסטה', 'שחור'];
        colorContainer.innerHTML = `
            <select class="input-big" onchange="updateItemColor('${id}', this.value)">
                <option value="">צבע</option>
                ${pullColors.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
        `;
        item.color = '';
    } else if (isBrush) {
        colorContainer.classList.remove('hidden');
        const brushColors = ['שחור', 'לבן'];
        colorContainer.innerHTML = `
            <select class="input-big" onchange="updateItemColor('${id}', this.value)">
                <option value="">צבע</option>
                ${brushColors.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
        `;
        item.color = '';
    } else if (isRegularHandle || (product && product.requires_color)) {
        colorContainer.classList.remove('hidden');
        colorContainer.innerHTML = `
            <select class="input-big" onchange="updateItemColor('${id}', this.value)">
                <option value="">צבע</option>
                ${orderColors.map(c => `<option value="${c.color_name}">${c.color_name}</option>`).join('')}
            </select>
        `;
        item.color = '';
    } else {
        item.color = '';
    }

    // Check for fin brush option
    const finContainer = document.getElementById(`fin-container-${id}`);
    const canHaveFin = isBrush && product && !product.product_name.includes('אינסרט') && !product.product_name.includes('הדבקה');
    
    if (canHaveFin) {
        finContainer.classList.remove('hidden');
        finContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1.5rem; width: 100%;">
                <input type="checkbox" id="fin-${id}" style="width: 32px; height: 32px; cursor: pointer;" onchange="updateItemFin('${id}', this.checked)">
                <label for="fin-${id}" style="font-size: 1.2rem; font-weight: 700; cursor: pointer; color: #1e40af; margin-bottom: 0;">מברשת סנפיר</label>
            </div>
        `;
        item.is_fin_brush = false;
    } else {
        finContainer.classList.add('hidden');
        finContainer.innerHTML = '';
        item.is_fin_brush = false;
    }

    // Check for mesh roll option
    const rollContainer = document.getElementById(`roll-container-${id}`);
    const isRollableMesh = isMesh && product && !product.product_name.includes('גלילה');
    
    if (isRollableMesh) {
        rollContainer.classList.remove('hidden');
        rollContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1.5rem; width: 100%;">
                <input type="checkbox" id="roll-${id}" style="width: 32px; height: 32px; cursor: pointer;" onchange="updateItemRoll('${id}', this.checked)">
                <label for="roll-${id}" style="font-size: 1.2rem; font-weight: 700; cursor: pointer; color: #9d174d; margin-bottom: 0;">גליל (30 מטר)</label>
            </div>
        `;
        item.is_roll = false;
    } else {
        rollContainer.classList.add('hidden');
        rollContainer.innerHTML = '';
        item.is_roll = false;
    }
    
    // If quantity is currently empty or 0, set to 1
    if (!item.quantity) {
        item.quantity = 1;
        const qtyInput = document.querySelector(`#${id} input[type="number"][placeholder="כמות"]`);
        if (qtyInput) qtyInput.value = 1;
    }
    
    // Update price label if brush
    const priceLabel = document.getElementById(`price-label-${id}`);
    if (priceLabel) {
        priceLabel.textContent = isBrush ? 'מחיר למטר (₪):' : 'מחיר (₪):';
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

function updateItemLength(id, len) {
    const item = currentDealItems.find(i => i.id === id);
    if (item) {
        item.length = parseFloat(len) || 0;
        updateTotal();
    }
}

function updateItemFin(id, isFin) {
    const item = currentDealItems.find(i => i.id === id);
    if (item) item.is_fin_brush = isFin;
}

function updateItemRoll(id, isRoll) {
    const item = currentDealItems.find(i => i.id === id);
    if (item) {
        item.is_roll = isRoll;
        if (isRoll) {
            const qty = parseFloat(item.quantity) || 1;
            item.length = 30;
            const sizeInp = document.getElementById(`size-input-${id}`);
            if (sizeInp) sizeInp.value = (30 * qty).toFixed(2);
        } else {
            item.length = 1; 
            const sizeInp = document.getElementById(`size-input-${id}`);
            if (sizeInp) sizeInp.value = '1';
        }
        updateTotal();
    }
}

function updateItemColor(id, color) {
    const item = currentDealItems.find(i => i.id === id);
    if (item) item.color = color;
}

function updateItemQty(id, qty) {
    const item = currentDealItems.find(i => i.id === id);
    if (item) {
        item.quantity = parseFloat(qty) || 0;
        
        // Update length display if it's a mesh roll
        if (item.is_roll) {
            const sizeInp = document.getElementById(`size-input-${id}`);
            if (sizeInp) {
                const totalRollLength = (30 * item.quantity);
                sizeInp.value = totalRollLength.toFixed(1);
                item.length = totalRollLength;
            }
        }
        
        updateTotal();
    }
}

function accStepQty(id, delta) {
    const input = document.getElementById(`qty-${id}`);
    if (input) {
        const newVal = Math.max(1, (parseFloat(input.value) || 0) + delta);
        input.value = newVal;
        updateItemQty(id, newVal);
    }
}

function accStepPrice(id, delta) {
    const input = document.getElementById(`price-${id}`);
    if (input) {
        const item = currentDealItems.find(i => i.id === id);
        if (!item) return;

        const product = products.find(p => p.product_id === item.product_id);
        const isBrush = product && (
            (product.category && product.category.includes('מברשות')) || 
            (product.product_name && product.product_name.includes('מברשת'))
        );

        const actualStep = isBrush ? 0.01 : 1;
        const currentVal = parseFloat(input.value) || 0;
        const newVal = delta > 0 ? (currentVal + actualStep) : Math.max(0, currentVal - actualStep);
        
        input.value = isBrush ? newVal.toFixed(2) : Math.round(newVal);
        updateItemPrice(id, input.value);
    }
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
    const subtotal = currentDealItems.reduce((sum, i) => {
        const product = products.find(p => p.product_id === i.product_id);
        let multiplier = 1;

        const isBrush = product && (product.product_name.includes('מברשת') || (product.category && product.category.includes('מברשות')));
        const isMesh = product && !isBrush && (product.product_name.includes('רשת') || (product.category && product.category.includes('רשתות')));

        if (isMesh) {
            if (i.is_roll) {
                multiplier = 30;
            } else {
                multiplier = parseFloat(i.length) || 1;
            }
        }
        
        const price = parseFloat(i.price) || 0;
        const qty = parseFloat(i.quantity) || 0;
        return sum + (price * qty * multiplier);
    }, 0);
    
    document.getElementById('acc-total-amount').textContent = `₪${subtotal.toFixed(0)}`;
}

async function saveAccDeal() {
    const customerId = document.getElementById('acc-customer-id').value;
    if (!customerId) {
        showAlert('אנא בחר לקוח תחילה', 'error');
        return;
    }

    const validItems = currentDealItems.filter(i => i.product_id);
    if (currentDealItems.length === 0) {
        showAlert('אנא הוסף לפחות מוצר אחד', 'error');
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
            length: i.length || 1,
            color: i.color || null,
            is_fin_brush: !!i.is_fin_brush,
            is_roll: !!i.is_roll
        }));

        const { error: iError } = await supabaseClient
            .from('deal_items')
            .insert(itemsToInsert);

        if (iError) throw iError;
        
        // 3. Log the action
        const customer = customers.find(c => c.customer_id === customerId);
        const customerName = customer ? customer.business_name : 'לקוח';
        
        // Build items summary for audit log
        const itemsSummary = validItems.map(i => {
            const p = products.find(prod => prod.product_id === i.product_id);
            let name = p ? p.product_name : 'מוצר';
            if (i.is_fin_brush) name += ' (סנפיר)';
            if (i.is_roll) name += ' (גליל)';
            return `${name} - ${i.quantity} יח'`;
        }).join(', ');

        await logAction(
            'create', 
            'deal', 
            deal.deal_id, 
            `עסקה - ${customerName}`, 
            `יצירת עסקה חדשה (ממשק נגיש) בסכום ₪${subtotal.toFixed(0)}. מוצרים: ${itemsSummary}`,
            null,
            {
                customer_id: customerId,
                total_amount: subtotal,
                items_summary: itemsSummary,
                items_count: validItems.length,
                notes: 'נוצר דרך הממשק הנגיש'
            }
        );

        showAlert('✅ העסקה נשמרה בהצלחה!', 'success');
        showScreen('main');
    } catch (err) {
        console.error('❌ שגיאה בשמירת עסקה:', err);
        showAlert('שגיאה בשמירה. נסה שוב.', 'error');
    }
}

// ============================================
// Audit Log & Notifications
// ============================================

async function logAction(actionType, entityType, entityId, entityName, description, oldValue = null, newValue = null) {
    try {
        const performedBy = 'עופר';
        
        const record = {
            action_type: actionType,
            entity_type: entityType,
            entity_id: entityId,
            entity_name: entityName,
            description: description,
            old_value: oldValue,
            new_value: newValue,
            performed_by: performedBy
        };

        await supabaseClient
            .from('audit_log')
            .insert(record);
            
        // Handle Email Notification
        const notifyEmail = localStorage.getItem('crm_notification_email');
        const notifyEnabled = localStorage.getItem('crm_notification_enabled') === 'true';
        const scriptUrl = localStorage.getItem('crm_notification_script_url');
        const myName = localStorage.getItem('crm_notification_myname') || '';

        if (notifyEnabled && notifyEmail && scriptUrl && performedBy !== myName) {
            sendNotificationEmail(record, notifyEmail, scriptUrl);
        }
    } catch (error) {
        console.error('❌ Error logging action:', error);
    }
}

async function sendNotificationEmail(action, email, url) {
    try {
        const actionTranslations = {
            'create': 'יצירת',
            'update': 'עדכון',
            'delete': 'מחיקת',
            'login': 'התחברות',
            'export': 'ייצוּא'
        };

        const entityTranslations = {
            'deal': 'עסקה',
            'customer': 'לקוח',
            'product': 'מוצר',
            'activity': 'פעילות',
            'supplier': 'ספק',
            'supplier_order': 'הזמנת רכש',
            'contact': 'איש קשר'
        };

        const fieldTranslations = {
            'business_name': 'שם העסק',
            'contact_name': 'איש קשר',
            'phone': 'טלפון',
            'email': 'אימייל',
            'city': 'עיר',
            'address': 'כתובת',
            'notes': 'הערות',
            'price': 'מחיר',
            'total_amount': 'סה"כ',
            'final_amount': 'סכום סופי',
            'deal_status': 'סטטוס',
            'description': 'תיאור',
            'quantity': 'כמות',
            'unit_price': 'מחיר יחידה',
            'items_count': 'מספר פריטים',
            'items_summary': 'פירוט מוצרים',
            'is_fin_brush': 'מברשת סנפיר',
            'is_roll': 'גליל',
            'active': 'פעיל'
        };

        const actionHeb = actionTranslations[action.action_type] || action.action_type;
        const entityHeb = entityTranslations[action.entity_type] || action.entity_type;
        const subject = `מערכת ה-CRM: ${actionHeb} ${entityHeb} - ${action.entity_name}`;

        const formatVal = (val) => {
            if (val === null || val === undefined) return '-';
            if (typeof val === 'boolean') return val ? 'כן' : 'לא';
            if (typeof val === 'object') return JSON.stringify(val);
            return val;
        };

        let detailsHtml = '';

        // Handle UPDATE logic (Diff)
        if (action.action_type === 'update' && action.old_value && action.new_value && typeof action.old_value === 'object' && typeof action.new_value === 'object') {
            detailsHtml += '<div style="margin-top: 15px;"><strong>שינויים שבוצעו:</strong><table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px;">';
            detailsHtml += '<tr style="background: #f1f5f9;"><th style="padding: 8px; border: 1px solid #e0e0e0; text-align: right;">שדה</th><th style="padding: 8px; border: 1px solid #e0e0e0; text-align: right;">ערך קודם</th><th style="padding: 8px; border: 1px solid #e0e0e0; text-align: right;">ערך חדש</th></tr>';
            
            const keys = new Set([...Object.keys(action.old_value), ...Object.keys(action.new_value)]);
            let hasChanges = false;
            
            keys.forEach(key => {
                if (['updated_at', 'created_at', 'id', 'customer_id', 'deal_id', 'product_id', 'contact_id', 'activity_id'].some(ignore => key.toLowerCase().includes(ignore))) return;
                
                const oldV = action.old_value[key];
                const newV = action.new_value[key];
                
                if (JSON.stringify(oldV) !== JSON.stringify(newV)) {
                    hasChanges = true;
                    detailsHtml += `<tr>
                        <td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold;">${fieldTranslations[key] || key}</td>
                        <td style="padding: 8px; border: 1px solid #e0e0e0; color: #dc2626; text-decoration: line-through;">${formatVal(oldV)}</td>
                        <td style="padding: 8px; border: 1px solid #e0e0e0; color: #16a34a; font-weight: bold;">${formatVal(newV)}</td>
                    </tr>`;
                }
            });
            
            if (!hasChanges) detailsHtml = '<p style="margin-top: 15px;">בוצע עדכון כללי.</p>';
            else detailsHtml += '</table></div>';
        }
        // Handle DELETE/CREATE logic (Object Details)
        else if ((action.action_type === 'delete' || action.action_type === 'create') && 
                 (action.action_type === 'delete' ? action.old_value : action.new_value) && 
                 typeof (action.action_type === 'delete' ? action.old_value : action.new_value) === 'object') {
            
            const targetObj = action.action_type === 'delete' ? action.old_value : action.new_value;
            detailsHtml += `<div style="margin-top: 15px;"><strong>${action.action_type === 'delete' ? 'פרטי הישות שנמחקה' : 'פרטים'}:</strong><table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px;">`;
            
            Object.keys(targetObj).forEach(key => {
                if (['updated_at', 'created_at', 'id', 'customer_id', 'deal_id', 'product_id', 'contact_id', 'activity_id'].some(ignore => key.toLowerCase().includes(ignore))) return;
                const val = targetObj[key];
                if (val === null || val === undefined || val === '') return;
                
                detailsHtml += `<tr>
                    <td style="padding: 8px; border: 1px solid #e0e0e0; width: 30%; background: #f8fafc; font-weight: bold;">${fieldTranslations[key] || key}</td>
                    <td style="padding: 8px; border: 1px solid #e0e0e0;">${formatVal(val)}</td>
                </tr>`;
            });
            detailsHtml += '</table></div>';
        }
        // Fallback for simple values
        else {
            if (action.new_value) detailsHtml += `<p style="margin: 5px 0;"><strong>ערך חדש:</strong> ${formatVal(action.new_value)}</p>`;
            if (action.old_value) detailsHtml += `<p style="margin: 5px 0;"><strong>ערך קודם:</strong> ${formatVal(action.old_value)}</p>`;
        }

        const htmlBody = `
            <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <div style="background-color: #2563eb; color: white; padding: 25px; text-align: center;">
                    <h2 style="margin: 0; font-size: 26px; letter-spacing: 1px;">עדכון מהממשק הנגיש</h2>
                </div>
                <div style="padding: 30px; background-color: #ffffff;">
                    <p style="font-size: 16px;">המערכת עודכנה בפעולה חדשה על ידי <strong>${action.performed_by}</strong>:</p>
                    
                    <div style="background-color: #f8fafc; border-right: 4px solid #2563eb; padding: 20px; margin: 25px 0; border-radius: 6px;">
                        <p style="margin: 5px 0; font-size: 16px;"><strong>סוג פעולה:</strong> ${actionHeb}</p>
                        <p style="margin: 5px 0; font-size: 16px;"><strong>ישות:</strong> ${entityHeb} (${action.entity_name})</p>
                        <p style="margin: 5px 0; font-size: 16px;"><strong>תיאור:</strong> ${action.description}</p>
                        ${detailsHtml}
                    </div>
                </div>
                <div style="background-color: #f1f5f9; color: #64748b; padding: 20px; text-align: center; font-size: 12px; border-top: 1px solid #e2e8f0; direction: rtl;" dir="rtl">
                    <span style="unicode-bidi: isolate;">המייל נשלח באופן אוטומטי ממערכת ה-CRM</span>
                    <span style="margin: 0 5px;">•</span>
                    <span style="unicode-bidi: isolate; direction: ltr; display: inline-block;">${new Date().toLocaleDateString('he-IL')}</span>
                    <span style="margin: 0 5px;">•</span>
                    <span style="unicode-bidi: isolate; direction: ltr; display: inline-block;">${new Date().toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
            </div>
        `;

        const params = new URLSearchParams({
            action: 'sendNotification',
            email: email,
            subject: subject,
            htmlBody: htmlBody.trim()
        });

        fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });
    } catch (err) {
        console.error('Error sending notification email:', err);
    }
}

// History & Search Logic
async function loadAccDeals(containerId, searchQuery = '', month = '', year = '') {
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
            .order('created_at', { ascending: false });

        // Apply Date Filters
        if (year) {
            const y = parseInt(year);
            if (month) {
                const m = parseInt(month) - 1;
                const startDate = new Date(y, m, 1, 0, 0, 0).toISOString();
                const endDate = new Date(y, m + 1, 0, 23, 59, 59).toISOString();
                query = query.gte('created_at', startDate).lte('created_at', endDate);
            } else {
                const startDate = new Date(y, 0, 1, 0, 0, 0).toISOString();
                const endDate = new Date(y, 11, 31, 23, 59, 59).toISOString();
                query = query.gte('created_at', startDate).lte('created_at', endDate);
            }
        }

        query = query.limit(50);

        const { data: deals, error } = await query;
        if (error) throw error;
        // The original instruction had `if (!deal)` here, but `deals` is an array.
        // Assuming this check was meant for a single deal fetch or a different context.
        // Keeping the original logic for `deals` array.

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
            const parts = [];
            if (item.size) parts.push(`מידה: ${item.size}`);
            if (item.color) parts.push(`צבע: ${item.color}`);
            if (item.is_fin_brush) parts.push('מברשת סנפיר');
            if (item.is_roll) parts.push('גליל');
            const detailsStr = parts.length > 0 ? `<br><span style="color:var(--text-secondary); font-size:1.1rem;">${parts.join(' | ')}</span>` : '';

            html += `
                <div style="border-bottom:1px solid #eee; padding:12px 0;">
                    <strong>${item.products.product_name}</strong>${detailsStr}<br>
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
