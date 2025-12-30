const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://abqracafkjerlcemqnva.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFicXJhY2Fma2plcmxjZW1xbnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDk1NTYsImV4cCI6MjA4MDMyNTU1Nn0.WejWdsYxqC7ESs3C8UkGhWUpnDJ7xD5j4-n9BKRE7rE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function listProducts() {
    const { data, error } = await supabase.from('products').select('product_id, sku, product_name, category').limit(10);
    if (error) {
        console.error(error);
        return;
    }
    console.table(data);
}

listProducts();
