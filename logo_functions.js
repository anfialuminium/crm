// Logo Management Functions
function loadCustomLogo() {
    const logoUrl = localStorage.getItem('custom_logo_url');
    const headerLogo = document.getElementById('header-logo');
    
    if (logoUrl && headerLogo) {
        headerLogo.src = logoUrl;
        headerLogo.onerror = () => {
            // Fallback to default if custom logo fails to load
            headerLogo.src = 'images/logo.png';
        };
    }
    
    // Load into settings if on settings tab
    const settingsInput = document.getElementById('settings-logo-url');
    if (settingsInput) {
        settingsInput.value = logoUrl || '';
        updateLogoPreview();
    }
}

function updateLogoPreview() {
    const input = document.getElementById('settings-logo-url');
    const preview = document.getElementById('logo-preview');
    const placeholder = document.getElementById('logo-placeholder');
    
    if (!input || !preview || !placeholder) return;
    
    const url = input.value.trim();
    
    if (url) {
        preview.src = url;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
        
        preview.onerror = () => {
            preview.style.display = 'none';
            placeholder.style.display = 'flex';
        };
    } else {
        preview.style.display = 'none';
        placeholder.style.display = 'flex';
    }
}

function saveLogoSettings() {
    const input = document.getElementById('settings-logo-url');
    if (!input) return;
    
    const url = input.value.trim();
    
    if (url) {
        localStorage.setItem('custom_logo_url', url);
    } else {
        localStorage.removeItem('custom_logo_url');
    }
    
    loadCustomLogo();
    showAlert('הלוגו נשמר בהצלחה', 'success');
}
