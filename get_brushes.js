const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
async function run() {
    const { data, error } = await supabase.from('products').select('*').ilike('category', '%מברשות%');
    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}
run();
