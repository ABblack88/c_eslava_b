const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('/home/augusto/Escritorio/c_eslava_b/js/supabase.js', 'utf8');
const urlMatch = envContent.match(/const SUPABASE_URL = ['"]([^'"]+)['"]/);
const keyMatch = envContent.match(/const SUPABASE_KEY = ['"]([^'"]+)['"]/);

if (urlMatch && keyMatch) {
    const supabase = createClient(urlMatch[1], keyMatch[1]);
    async function run() {
        const {data, error} = await supabase.from('servicios').select('*').eq('nombre', 'Evaluación Física');
        console.log(data);
    }
    run();
}
