const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('/home/augusto/Escritorio/c_eslava_b/js/supabase.js', 'utf8');
const urlMatch = envFile.match(/const SUPABASE_URL = '(.*?)'/);
const keyMatch = envFile.match(/const SUPABASE_ANON_KEY = '(.*?)'/);

if (urlMatch && keyMatch) {
    const supabase = createClient(urlMatch[1], keyMatch[1]);
    
    async function check() {
        const { data, error } = await supabase.from('productos').select('*').limit(1);
        console.log(data, error);
    }
    check();
}
