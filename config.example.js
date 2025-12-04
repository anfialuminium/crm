// ============================================
// Configuration Template
// Copy this file to config.js and update with your values
// ============================================

// Supabase Configuration
// Get these values from: https://app.supabase.com/project/_/settings/api
export const SUPABASE_CONFIG = {
    url: 'https://your-project.supabase.co',
    anonKey: 'your-anon-key-here'
};

// Application Settings
export const APP_CONFIG = {
    // Company Information
    companyName: 'אנפי - ייבוא ושיווק פרזול ואלומיניום',
    companyPhone: '050-1234567',
    companyEmail: 'info@example.com',
    
    // Default Values
    defaultCurrency: '₪',
    defaultTaxRate: 17, // VAT percentage
    
    // Pagination
    itemsPerPage: 20,
    
    // Date Format
    dateFormat: 'DD/MM/YYYY',
    
    // Deal Statuses
    dealStatuses: [
        { value: 'טיוטה', label: 'טיוטה', color: '#94a3b8' },
        { value: 'חדש', label: 'חדש', color: '#3b82f6' },
        { value: 'ממתין', label: 'ממתין', color: '#f59e0b' },
        { value: 'זכייה', label: 'זכייה', color: '#10b981' },
        { value: 'הפסד', label: 'הפסד', color: '#ef4444' }
    ],
    
    // Customer Types
    customerTypes: [
        'חנות',
        'קבלן',
        'מחסן',
        'מפעל',
        'אחר'
    ],
    
    // Lead Sources
    leadSources: [
        'המלצה',
        'אתר',
        'תערוכה',
        'פרסום',
        'לקוח חוזר',
        'אחר'
    ],
    
    // Product Categories
    productCategories: [
        'פרופילים',
        'אביזרים',
        'רשתות',
        'גלגלים',
        'ידיות',
        'מנעולים',
        'אחר'
    ]
};

// Feature Flags
export const FEATURES = {
    enableAuth: false, // Set to true to enable user authentication
    enableNotifications: true,
    enableExport: true,
    enablePrint: true,
    enableEmailQuotes: false, // Requires email service integration
    enableSMS: false, // Requires SMS service integration
    enableAnalytics: true
};

// Email Configuration (if using email features)
export const EMAIL_CONFIG = {
    serviceProvider: 'sendgrid', // or 'emailjs', 'smtp'
    apiKey: 'your-api-key',
    fromEmail: 'noreply@example.com',
    fromName: 'CRM System'
};

// SMS Configuration (if using SMS features)
export const SMS_CONFIG = {
    serviceProvider: 'twilio', // or other provider
    accountSid: 'your-account-sid',
    authToken: 'your-auth-token',
    fromNumber: '+972501234567'
};

// Analytics Configuration
export const ANALYTICS_CONFIG = {
    provider: 'google', // or 'mixpanel', 'amplitude'
    trackingId: 'UA-XXXXXXXXX-X'
};

// UI Customization
export const UI_CONFIG = {
    theme: 'light', // or 'dark'
    primaryColor: '#2563eb',
    secondaryColor: '#8b5cf6',
    
    // Logo
    logoUrl: '/assets/logo.png',
    faviconUrl: '/assets/favicon.ico',
    
    // Language
    language: 'he',
    direction: 'rtl'
};

// Validation Rules
export const VALIDATION = {
    customer: {
        businessName: {
            required: true,
            minLength: 2,
            maxLength: 255
        },
        phone: {
            required: true,
            pattern: /^0\d{1,2}-?\d{7}$/
        },
        email: {
            required: false,
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        }
    },
    product: {
        name: {
            required: true,
            minLength: 2,
            maxLength: 255
        },
        price: {
            required: false,
            min: 0
        }
    },
    deal: {
        minItems: 1,
        maxDiscount: 50 // Maximum discount percentage
    }
};

// Export all configurations
export default {
    SUPABASE_CONFIG,
    APP_CONFIG,
    FEATURES,
    EMAIL_CONFIG,
    SMS_CONFIG,
    ANALYTICS_CONFIG,
    UI_CONFIG,
    VALIDATION
};
